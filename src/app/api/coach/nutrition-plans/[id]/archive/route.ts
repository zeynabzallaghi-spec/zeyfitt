import { NextResponse } from "next/server";
import { coachingErrorResponseWithSchema, requireCoach } from "@/lib/coaching/server";
import { archiveCoachNutritionPlan } from "@/lib/coaching/plans";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/coach/nutrition-plans/[id]/archive — بایگانی برنامه غذایی خود مربی.
 * نسخه‌های ارسال‌شده و دسترسی دانشجو دست‌نخورده می‌مانند.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const plan = await archiveCoachNutritionPlan(coach.id, id);
    if (!plan) {
      return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
