import { NextResponse } from "next/server";
import { coachingErrorResponse, requireAdmin } from "@/lib/coaching/server";
import { getCoachExerciseMediaForAdminReview } from "@/lib/coaching/publishing";
import { exerciseMediaSize } from "@/lib/coaching/media-storage";
import { mediaStreamResponse } from "@/lib/coaching/media-stream";

type Params = { params: Promise<{ exerciseId: string; mediaId: string }> };

/**
 * GET /api/admin/exercise-reviews/[exerciseId]/media/[mediaId] — پیش‌نمایش
 * استریم رسانه حرکتِ در انتظار بازبینی (مرحله ۲۰/P3). فقط ادمین؛ رسانه باید
 * متعلق به همان حرکتِ در انتظار باشد — پس از تصمیم، مسیر میبندد (404).
 * مهمان 401؛ دانشجو/مربی 403.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { exerciseId, mediaId } = await params;
    const target = await getCoachExerciseMediaForAdminReview(exerciseId, mediaId);
    if (!target) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    const realSize = await exerciseMediaSize(target.storagePath);
    if (realSize === null) {
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

export const dynamic = "force-dynamic";
