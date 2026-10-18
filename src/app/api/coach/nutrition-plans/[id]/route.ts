import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { getCoachNutritionPlan, updateCoachNutritionPlan } from "@/lib/coaching/plans";
import { createCoachNutritionPlanSchema } from "@/lib/coaching/plan-schemas";

type Params = { params: Promise<{ id: string }> };

/** GET /api/coach/nutrition-plans/[id] — جزئیات برنامه غذایی خود مربی */
export async function GET(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const plan = await getCoachNutritionPlan(coach.id, id);
    if (!plan) {
      return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * PUT /api/coach/nutrition-plans/[id] — ویرایش با بازمحاسبه کامل سمت سرور.
 * نسخه‌های ارسال‌شده هرگز تغییر نمی‌کنند.
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(createCoachNutritionPlanSchema, body);
    const plan = await updateCoachNutritionPlan(coach.id, id, input);
    if (!plan) {
      return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
