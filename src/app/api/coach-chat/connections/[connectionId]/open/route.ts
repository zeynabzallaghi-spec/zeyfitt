import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import { openConversation } from "@/lib/coaching/chat";

/**
 * POST /api/coach-chat/connections/[connectionId]/open — گشودن گفت‌وگو (مرحله ۱۷).
 *
 * نقطه ورود مکالمه برای یک ارتباط ACTIVE: طرف بودن، وضعیت تازه ارتباط و
 * ماتریس کامل مجوز ارسال همه سمت سرور بررسی میشوند؛ مکالمه تکراری با
 * قید unique(connectionId) ناممکن است و در رقابت همزمان همان رکورد
 * موجود بازگردانده میشود. connectionId کلاینت فقط «انتخاب» است و مالکیتش
 * همینجا بازبینی میشود.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    const user = await requireUser();
    const { connectionId } = await params;
    const conversation = await openConversation(connectionId, user);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
