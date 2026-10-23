import { NextResponse } from "next/server";
import { coachingErrorResponse, requireCoach } from "@/lib/coaching/server";
import { submitCoachExerciseForReview } from "@/lib/coaching/publishing";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/coach/exercises/[id]/submit — ارسال حرکت شخصی برای بازبینی ادمین
 * (مرحله ۲۰/P3). فقط مالک؛ دروازه حداقل محتوا (422) و سقف ارسال‌های در
 * انتظار (409) سمت سرور اعمال میشود. publishState هرگز از بدنه درخواست
 * خوانده نمیشود — گذار فقط با همین اکشن صریح ممکن است.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const result = await submitCoachExerciseForReview(coach.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
