import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { createCoachWorkoutPlan, listCoachWorkoutPlans, assertCoachCanBuildPlans } from "@/lib/coaching/plans";
import { createCoachWorkoutPlanSchema } from "@/lib/coaching/plan-schemas";

/**
 * POST /api/coach/workout-plans — ساخت پیش‌نویس برنامه تمرینی اختصاصی.
 * مجوز: نقش COACH از دیتابیس + تأیید معتبر مربی‌گری.
 * نام‌ها و snapshot حرکات سمت سرور از بانک زنده ساخته می‌شود.
 */
export async function POST(request: Request) {
  try {
    const coach = await requireCoach();
    await assertCoachCanBuildPlans(coach.id, coach.role);
    const body = await readJsonBody(request);
    const input = parseWithSchema(createCoachWorkoutPlanSchema, body);
    const plan = await createCoachWorkoutPlan(coach.id, input);
    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * GET /api/coach/workout-plans — فهرست برنامه‌های تمرینی مربی (خلاصه).
 * فقط برنامه‌های خود مربی؛ نام دانشجوی اختصاص‌یافته از رابطه واقعی.
 */
export async function GET() {
  try {
    const coach = await requireCoach();
    const plans = await listCoachWorkoutPlans(coach.id);
    return NextResponse.json({ plans });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
