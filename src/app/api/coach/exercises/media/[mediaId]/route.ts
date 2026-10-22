import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import {
  deleteCoachExerciseMedia,
  getExerciseMediaForOwner,
  getExerciseMediaForStudent,
} from "@/lib/coaching/coach-exercises";
import { exerciseMediaSize } from "@/lib/coaching/media-storage";
import { mediaStreamResponse } from "@/lib/coaching/media-stream";
import { CoachingError } from "@/lib/coaching/constants";

type Params = { params: Promise<{ mediaId: string }> };

/**
 * GET /api/coach/exercises/media/[mediaId] — سرو استریم رسانه حرکت شخصی.
 * مرحله ۲۰/P2 (R2.0 + R2.1) — بازنویسی کامل مسیر ۱۹.۶:
 *  - استریم واقعی با Range بومی (206/416) و HEAD — بدون بافر کامل (R2.0).
 *  - مجوز نقش‌آگاه قبل از هر خواندنی از فایل:
 *      · مربی مالک حرکت → مجاز؛
 *      · دانشجو → فقط اگر حرکت در یک برنامه تمرینی تحویلشدهٔ فعالِ همان
 *        مربی به او وجود داشته باشد (R2.1 — بررسی CoachPlanDelivery)؛
 *      · بقیه (مربی دیگر، ادمین، ناشناس) و ناموجود → 404 یکسان (ضد IDOR).
 *  - دانستن شناسه رسانه/URL هیچ دسترسیای نمیسازد.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { mediaId } = await params;

    let target: Awaited<ReturnType<typeof getExerciseMediaForOwner>> = null;
    if (user.role === "COACH") {
      // مربی فقط رسانه حرکت خودش (ادمین/مربی دیگر همان 404 — معماری فعلی)
      target = await getExerciseMediaForOwner(user.id, mediaId);
    } else if (user.role === "STUDENT") {
      target = await getExerciseMediaForStudent(user.id, mediaId);
    }
    if (!target) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }

    // اندازه واقعی فایل از storage — رکورد DB بهعنوان منبع اندازه اعتماد نمیشود
    const realSize = await exerciseMediaSize(target.storagePath);
    if (realSize === null) {
      // رکورد هست اما فایل روی storage نیست — پاسخ امن 404 (بدون افشای مسیر)
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    return await mediaStreamResponse(
      {
        mimeType: target.mimeType,
        fileName: target.fileName,
        storagePath: target.storagePath,
        realSize,
      },
      request.headers.get("range"),
      false
    );
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

/** HEAD — همان مجوز و هدرها بدون بدنه؛ برای پلیر و GET شرطی */
export async function HEAD(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { mediaId } = await params;

    let target: Awaited<ReturnType<typeof getExerciseMediaForOwner>> = null;
    if (user.role === "COACH") {
      target = await getExerciseMediaForOwner(user.id, mediaId);
    } else if (user.role === "STUDENT") {
      target = await getExerciseMediaForStudent(user.id, mediaId);
    }
    if (!target) {
      return new NextResponse(null, { status: 404 });
    }
    const realSize = await exerciseMediaSize(target.storagePath);
    if (realSize === null) {
      return new NextResponse(null, { status: 404 });
    }
    return await mediaStreamResponse(
      {
        mimeType: target.mimeType,
        fileName: target.fileName,
        storagePath: target.storagePath,
        realSize,
      },
      request.headers.get("range"),
      true
    );
  } catch (error) {
    if (error instanceof CoachingError && error.status === 401) {
      return new NextResponse(null, { status: 401 });
    }
    return new NextResponse(null, { status: 500 });
  }
}

/** DELETE — حذف رسانه؛ فقط مربی مالک (دانشجو هرگز؛ «مالک دیگر» و ناموجود 404) */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    if (user.role !== "COACH") {
      // نقش غیرمربی: 403 برای دانشجو — مستقل از وجود رسانه (ضد IDOR)
      if (user.role === "STUDENT") {
        throw new CoachingError(403, "ROLE_NOT_ALLOWED");
      }
      throw new CoachingError(404, "MEDIA_NOT_FOUND");
    }
    const { mediaId } = await params;
    const result = await deleteCoachExerciseMedia(user.id, mediaId);
    if (result === null) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
