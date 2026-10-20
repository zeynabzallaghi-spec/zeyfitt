import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireCoach,
} from "@/lib/coaching/server";
import { addCoachExerciseMedia } from "@/lib/coaching/coach-exercises";
import { CoachingError } from "@/lib/coaching/constants";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/coach/exercises/[id]/media — آپلود تصویر/ویدئو حرکت شخصی.
 * multipart با فیلد file؛ امضای بایت + سقف حجم (تصویر ۵MB، ویدئو ۵۰MB)
 * و تعداد (۴ فایل) سمت سرور. فقط مالک حرکت.
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
