import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import {
  fromPublicExerciseSchema,
  savePublicExerciseToLibrary,
} from "@/lib/coaching/coach-exercises";

/**
 * POST /api/coach/exercises/from-public — مرحله ۲۰/P1 (R1.2).
 *
 * ذخیره یک حرکت از بانک عمومی به‌عنوان نقطه شروع قابل‌ویرایش در کتابخانه
 * شخصی مربی:
 *  - رکورد جدید کاملاً متعلق به مربی جاری ساخته میشود (coachId سمت سرور)؛
 *    رکورد اصلی بانک عمومی فقط خوانده میشود و هرگز ویرایش/حذف نمیشود.
 *  - عضلات به‌صورت snapshot کپی میشوند (P1.3) — اتصال زنده‌ای به منبع نیست.
 *  - سقف ۳۰۰ کتابخانه شخصی سمت سرور اعمال میشود (409)؛ حرکت ناموجود/
 *    آرشیوشده 404؛ ورودی نامعتبر 422.
 */
export async function POST(request: Request) {
  try {
    const coach = await requireCoach();
    const body = await readJsonBody(request);
    const input = parseWithSchema(fromPublicExerciseSchema, body);
    const exercise = await savePublicExerciseToLibrary(coach.id, coach.role, input);
    return NextResponse.json({ exercise }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
