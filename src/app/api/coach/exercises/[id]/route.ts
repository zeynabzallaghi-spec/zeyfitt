import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import {
  coachExerciseSchema,
  deleteCoachExercise,
  getCoachExercise,
  updateCoachExercise,
} from "@/lib/coaching/coach-exercises";

type Params = { params: Promise<{ id: string }> };

/** GET — فقط مالک؛ «مالک دیگر» و «ناموجود» هر دو 404 (ضد IDOR) */
export async function GET(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const exercise = await getCoachExercise(coach.id, id);
    if (!exercise) {
      return NextResponse.json({ error: "EXERCISE_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ exercise });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

/** PUT — ویرایش حرکت شخصی مالک؛ snapshotهای برنامهها دستنخورده میمانند */
export async function PUT(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(coachExerciseSchema, body);
    const exercise = await updateCoachExercise(coach.id, id, input);
    if (!exercise) {
      return NextResponse.json({ error: "EXERCISE_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ exercise });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * DELETE — حذف حرکت شخصی؛ سیاست حفظ یکپارچگی سوابق: نسخه‌های ارسالشده
 * (snapshot محتوایی) دست‌نخورده میمانند و هیچ حذف آبشاری رخ نمیدهد.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const result = await deleteCoachExercise(coach.id, id);
    if (result === null) {
      return NextResponse.json({ error: "EXERCISE_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
