import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import {
  createCoachNutritionPlan,
  listCoachNutritionPlans,
  assertCoachCanBuildPlans,
} from "@/lib/coaching/plans";
import { createCoachNutritionPlanSchema } from "@/lib/coaching/plan-schemas";

/**
 * POST /api/coach/nutrition-plans — ساخت پیش‌نویس برنامه غذایی اختصاصی.
 * همه مقادیر انرژی/درشت‌مغذی سمت سرور از بانک غذا محاسبه می‌شوند؛ هر عدد
 * تغذیه‌ای ارسالی کلاینت نادیده گرفته می‌شود. واحدهای مجاز: گرم و سهم بانک.
 */
export async function POST(request: Request) {
  try {
    const coach = await requireCoach();
    await assertCoachCanBuildPlans(coach.id, coach.role);
    const body = await readJsonBody(request);
    const input = parseWithSchema(createCoachNutritionPlanSchema, body);
    const plan = await createCoachNutritionPlan(coach.id, input);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/** GET /api/coach/nutrition-plans — فهرست برنامه‌های غذایی مربی (خلاصه) */
export async function GET() {
  try {
    const coach = await requireCoach();
    const plans = await listCoachNutritionPlans(coach.id);
    return NextResponse.json({ plans });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
