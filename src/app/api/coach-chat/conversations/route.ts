import { NextResponse } from "next/server";
import { coachingErrorResponse, requireUser } from "@/lib/coaching/server";
import { listConversationsForUser } from "@/lib/coaching/chat";

/**
 * GET /api/coach-chat/conversations — فهرست مکالمه‌های کاربر جاری (مرحله ۱۷).
 *
 * همه ورودی‌ها از نشست سرور میآیند؛ دانشجو فقط مکالمه‌های خودش و مربی فقط
 * مکالمه‌های ارتباطهای خودش را می‌بیند. ورودی ارتباط ACTIVE بدون مکالمه
 * یعنی گفت‌وگو آغاز نشده (با POST /open آغاز میشود) و ورودی‌های تاریخچه‌دار
 * ارتباطهای پایانیافته فقط‌خواندنی‌اند (سیاست حفظ تاریخچه).
 */
export async function GET() {
  try {
    const user = await requireUser();
    const conversations = await listConversationsForUser(user);
    return NextResponse.json({ conversations });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
