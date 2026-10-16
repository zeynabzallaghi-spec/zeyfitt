import { NextResponse } from "next/server";
import { zodIssueCodes } from "@/lib/api-issues";
import { getServerSession } from "@/lib/session";
import { appendUserMessage, findOwnedConversation } from "@/lib/assistant/storage";
import { checkChatRateLimit } from "@/lib/assistant/rate-limit";
import { generateReply } from "@/lib/assistant/generate";
import { sendMessageSchema, firstAssistantError } from "@/lib/assistant/schema";
import { detectMessageLang } from "@/lib/assistant/language";
import { AssistantError } from "@/lib/assistant/types";
import { assistantErrorResponse, invalidIdResponse } from "../../../shared";

/**
 * POST /api/assistant/conversations/[id]/messages — ارسال پیام و پاسخ واقعی مدل.
 *
 * ترتیب تضمین‌شده:
 *  1. نشست سمت سرور → 401 برای مهمان
 *  2. اعتبارسنجی Zod (خالی/بلند/نامعتبر → 400)
 *  3. مالکیت مکالمه (ناموجود/غیرخودی → 404 یکسان)
 *  4. محدودسازی نرخ مبتنی بر دیتابیس (→ 429 با retryAfterSec)
 *  5. ذخیره پیام کاربر — پیش از فراخوانی مدل؛ شکست مدل متن کاربر را
 *     از بین نمی‌برد
 *  6. فراخوانی واقعی مدل و ذخیره پاسخ — بدون هیچ پاسخ ساختگی
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const userId = session.user.id;

    const { id } = await context.params;
    const idErr = invalidIdResponse(id);
    if (idErr) return idErr;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstAssistantError(parsed.error), issues: zodIssueCodes(parsed.error) },
        { status: 400 }
      );
    }

    // مالکیت — قبل از هر نوشتن
    const conversation = await findOwnedConversation(id, userId);
    if (!conversation) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const rate = await checkChatRateLimit(userId);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", retryAfterSec: rate.retryAfterSec },
        { status: 429 }
      );
    }

    // زبان خودِ پیام کاربر برای جهت‌دهی نمایش (نه ترجمه)
    const messageLang = detectMessageLang(parsed.data.content);
    const userMessage = await appendUserMessage(
      id,
      userId,
      parsed.data.content,
      messageLang === "ambiguous" ? null : messageLang
    );

    // فراخوانی واقعی مدل — در شکست، خطای امن برمی‌گردد و پیام کاربر می‌ماند
    const { assistantMessage } = await generateReply({
      userId,
      conversationId: id,
      language: parsed.data.language,
      sourceMessageText: parsed.data.content,
      uiLocale: parsed.data.uiLocale,
    });

    return NextResponse.json({ userMessage, assistantMessage }, { status: 201 });
  } catch (error) {
    const mapped = assistantErrorResponse(error);
    if (mapped) return mapped;
    if (error instanceof AssistantError) {
      // نباید به اینجا برسد (assistantErrorResponse نگاشت می‌کند) — محض احتیاط
      return NextResponse.json({ error: error.code }, { status: 502 });
    }
    console.error("[assistant:messages:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
