import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  lastUnansweredUserMessage,
  findOwnedConversation,
} from "@/lib/assistant/storage";
import { checkChatRateLimit } from "@/lib/assistant/rate-limit";
import { generateReply } from "@/lib/assistant/generate";
import { retrySchema } from "@/lib/assistant/schema";
import { assistantErrorResponse, invalidIdResponse } from "../../../shared";

/**
 * POST /api/assistant/conversations/[id]/retry — تلاش مجدد برای پاسخ.
 *
 * فقط وقتی آخرین پیام مکالمه از کاربر بدون پاسخ باشد (شکست قبلی ارائه‌دهنده)
 * پاسخ دوباره تولید می‌شود؛ پیام کاربر تکراری ساخته نمی‌شود. اگر پاسخ از
 * قبل وجود داشته باشد، عملیات بی‌اثر (noop) و پاسخ موجود برگردانده می‌شود.
 * فراخوانی مدل واقعی است و مشمول همان محدودسازی نرخ.
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

    const conversation = await findOwnedConversation(id, userId);
    if (!conversation) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // انتخاب زبان اختیاری برای تلاش مجدد
    let language: "auto" | "fa" | "en" = "auto";
    let uiLocale: "fa" | "en" | undefined;
    try {
      const body: unknown = await request.json();
      const parsed = retrySchema.safeParse(body);
      if (parsed.success) {
        language = parsed.data.language;
        uiLocale = parsed.data.uiLocale;
      }
    } catch {
      // بدنه خالی مجاز است — پیش‌فرض auto
    }

    const unanswered = await lastUnansweredUserMessage(id, userId);
    if (!unanswered) {
      // پاسخ از قبل ثبت شده — چیزی برای تلاش مجدد نیست
      return NextResponse.json({ noop: true, conversation });
    }

    const rate = await checkChatRateLimit(userId);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", retryAfterSec: rate.retryAfterSec },
        { status: 429 }
      );
    }

    const { assistantMessage } = await generateReply({
      userId,
      conversationId: id,
      language,
      sourceMessageText: unanswered.content,
      uiLocale,
    });

    return NextResponse.json({ assistantMessage }, { status: 201 });
  } catch (error) {
    const mapped = assistantErrorResponse(error);
    if (mapped) return mapped;
    console.error("[assistant:retry:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
