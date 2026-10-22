import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireCoach,
  requireUser,
} from "@/lib/coaching/server";
import {
  addCoachExerciseMedia,
  listPersonalExerciseMediaForStudent,
} from "@/lib/coaching/coach-exercises";
import { getCoachExercise } from "@/lib/coaching/coach-exercises";
import { CoachingError } from "@/lib/coaching/constants";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach/exercises/[id]/media — فهرست رسانههای یک حرکت شخصی.
 * مرحله ۲۰/P2 (R2.1/R2.2): مربی مالک → فهرست کامل؛ دانشجوی مجاز (حرکت در
 * برنامه تحویلشدهٔ فعال همان مربی) → فهرست کامل؛ بقیه و ناموجود → 404
 * یکسان (ضد IDOR). خروجی فقط فیلدهای whitelist — storagePath هرگز
 * نمیرسد؛ بایتها فقط از مسیر استریم /media/[mediaId].
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    if (user.role === "COACH") {
      const exercise = await getCoachExercise(user.id, id);
      if (!exercise) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ media: exercise.media });
    }
    if (user.role === "STUDENT") {
      const media = await listPersonalExerciseMediaForStudent(user.id, id);
      if (!media) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ media });
    }
    // ادمین و سایر نقشها: بدون دسترسی خاص به رسانههای مربی (معماری فعلی)
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

/**
 * POST /api/coach/exercises/[id]/media — آپلود تصویر/ویدئو حرکت شخصی.
 * multipart با فیلد file؛ امضای بایت + سقف حجم (تصویر ۵MB، ویدئو ۵۰MB
 * قابلتنظیم با EXERCISE_VIDEO_MAX_MB) و تعداد (۴ فایل) سمت سرور.
 * فقط مالک حرکت.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new CoachingError(400, "VALIDATION");
    }
    const form = await request.formData().catch(() => {
      throw new CoachingError(400, "VALIDATION");
    });
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new CoachingError(400, "VALIDATION");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await addCoachExerciseMedia(coach.id, id, {
      name: file.name,
      declaredType: file.type,
      bytes,
    });
    return NextResponse.json(
      { media: result.media, exercise: result.exercise },
      { status: 201 }
    );
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
