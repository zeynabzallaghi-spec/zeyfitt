import { NextResponse } from "next/server";
import { AssistantError } from "@/lib/assistant/types";
import { assistantErrorStatus } from "@/lib/assistant/generate";

/**
 * نگاشت خطاهای دامنه دستیار به پاسخ HTTP — الگوی مشترک همه مسیرهای
 * assistant. کد خطا مشخص و بدون stack trace است؛ متن پیام/محتوای مکالمه
 * هرگز در پاسخ خطا برنمی‌گردد.
 */
export function assistantErrorResponse(error: unknown): NextResponse | null {
  if (error instanceof AssistantError) {
    const { status, code, retryAfterSec } = assistantErrorStatus(error);
    return NextResponse.json(
      retryAfterSec !== undefined ? { error: code, retryAfterSec } : { error: code },
      { status }
    );
  }
  return null;
}

/** بررسی و خواندن id مسیر — الگوی /api/sessions/[id] */
export function invalidIdResponse(id: string | undefined) {
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }
  return null;
}
