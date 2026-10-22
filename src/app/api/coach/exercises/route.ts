import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import {
  coachExerciseSchema,
  createCoachExercise,
  getCoachExerciseLibraryCap,
  listCoachExercises,
} from "@/lib/coaching/coach-exercises";

/**
 * GET /api/coach/exercises — بانک حرکات شخصی خود مربی (کاملاً جدا از بانک عمومی).
 * پاسخ شامل `cap` (سقف کتابخانه، مرحله ۲۰/P1-R1.3) است تا نشان سهمیه بدون
 * حدس کلاینت ساخته شود؛ جست‌وجو/فیلترها کلاینت‌محورند و فهرست فقط مالک است.
 * POST — ساخت حرکت شخصی؛ هرگز وارد کتابخانه عمومی نمیشود؛ سقف سمت سرور.
 */
export async function GET() {
  try {
    const coach = await requireCoach();
    const exercises = await listCoachExercises(coach.id);
    return NextResponse.json({ exercises, cap: getCoachExerciseLibraryCap() });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export async function POST(request: Request) {
  try {
    const coach = await requireCoach();
    const body = await readJsonBody(request);
    const input = parseWithSchema(coachExerciseSchema, body);
    const exercise = await createCoachExercise(coach.id, coach.role, input);
    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
