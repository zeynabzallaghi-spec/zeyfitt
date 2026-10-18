import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { getCoachWorkoutPlan, updateCoachWorkoutPlan } from "@/lib/coaching/plans";
import { createCoachWorkoutPlanSchema } from "@/lib/coaching/plan-schemas";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach/workout-plans/[id] — جزئیات برنامه خود مربی.
 * برنامه مربی دیگر یا ناموجود → 404 یکسان (بدون افشا).
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const plan = await getCoachWorkoutPlan(coach.id, id);
    if (!plan) {
      return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * PUT /api/coach/workout-plans/[id] — ویرایش پیش‌نویس/برنامه منتشرنشده تغییرات.
 * نسخه‌های قبلاً ارسال‌شده هرگز با این عملیات تغییر نمی‌کنند؛ اعمال
 * تغییرات فقط با ارسال مجدد (نسخه جدید) ممکن است.
 */
export async function PUT(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(createCoachWorkoutPlanSchema, body);
    const plan = await updateCoachWorkoutPlan(coach.id, id, input);
    if (!plan) {
      return NextResponse.json({ error: "PLAN_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
