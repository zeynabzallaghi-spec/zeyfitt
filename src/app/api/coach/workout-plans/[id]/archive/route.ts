import { NextResponse } from "next/server";
import { coachingErrorResponseWithSchema, requireCoach } from "@/lib/coaching/server";
import { archiveCoachWorkoutPlan } from "@/lib/coaching/plans";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/coach/workout-plans/[id]/archive — بایگانی برنامه خود مربی.
 * بایگانی یک‌طرفه است: پس از آن ویرایش و ارسال بسته می‌شود؛ نسخه‌های
 * ارسال‌شده و دسترسی دانشجوی گیرنده دست‌نخورده می‌ماند (تاریخچه حفظ می‌شود).
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const plan = await archiveCoachWorkoutPlan(coach.id, id);
    if (!plan) {
      return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
