import { NextResponse } from "next/server";
import { coachingErrorResponse, requireCoach } from "@/lib/coaching/server";
import { recallCoachExercise } from "@/lib/coaching/publishing";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/coach/exercises/[id]/recall — فراخوانی حرکت منتشرشده
 * (مرحله ۲۰/P3). فقط مالک؛ رکورد عمومی recalled و از بانک/برنامه‌ساز
 * پنهان میشود (نه حذف فیزیکی)؛ snapshot برنامه‌ها دست‌نخورده میماند.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const result = await recallCoachExercise(coach.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
