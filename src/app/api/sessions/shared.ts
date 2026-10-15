import { NextResponse } from "next/server";
import { SessionError } from "@/lib/session-storage";

/**
 * نگاشت خطاهای دامنه جلسه به پاسخ HTTP — الگوی مشترک همه مسیرهای sessions.
 * NOT_FOUND برای «نبودن» و «مالک دیگر» یکسان است تا هیچ اطلاعاتی درباره
 * وجود داده کاربران دیگر افشا نشود.
 */
export function sessionErrorResponse(error: unknown) {
  if (error instanceof SessionError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "SESSION_CLOSED"
          ? 409
          : 422; // EXERCISE_NOT_IN_BANK | LIMIT_REACHED
    return NextResponse.json(
      { error: error.code, message: error.message },
      { status }
    );
  }
  return null;
}

/** بررسی و خواندن id مسیر — سازگار با الگوی /api/plans/[id] */
export function invalidIdResponse(id: string | undefined) {
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
  }
  return null;
}
