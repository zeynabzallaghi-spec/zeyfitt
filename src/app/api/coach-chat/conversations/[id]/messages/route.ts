import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { listMessages, sendMessage } from "@/lib/coaching/chat";
import { messagesQuerySchema, sendMessageSchema } from "@/lib/coaching/chat-schemas";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach-chat/conversations/[id]/messages — پیام‌های یک مکالمه مجاز.
 *
 * فقط طرف مکالمه (غیرطرف و ناموجود: 404 یکسان). صفحه‌بندی با مکان‌یاب
 * پایدار seq: بدون پارامتر = آخرین صفحه؛ before = صفحه قدیمی‌تر؛ after =
 * فقط پیام‌های جدیدتر (polling). واکشی موفق، پیام‌های خوانده‌نشده طرف
 * مقابل را سمت سرور خوانده‌شده ثبت میکند (تنها مسیر تغییر readAt).
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const url = new URL(request.url);
    const rawQuery = {
      before: url.searchParams.get("before") ?? undefined,
      after: url.searchParams.get("after") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };
    const query = parseWithSchema(messagesQuerySchema, rawQuery);
    const page = await listMessages(id, user, query);
    return NextResponse.json(page);
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * POST /api/coach-chat/conversations/[id]/messages — ارسال پیام متنی.
 *
 * فقط محتوای پیام از بدنه پذیرفته میشود؛ senderId/readAt/زمان و هر فیلد
 * دیگری که کلاینت بفرستد حذف میشود و senderId همیشه از نشست سرور
 * استخراج میگردد. ماتریس کامل مجوز، نرخ‌سنجی دیتابیسی و نوشتن seq در
 * تراکنش در لایه سرویس انجام میشود (401/403/404/422/429 معنادار).
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(sendMessageSchema, body);
    const message = await sendMessage(id, user, input.content);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
