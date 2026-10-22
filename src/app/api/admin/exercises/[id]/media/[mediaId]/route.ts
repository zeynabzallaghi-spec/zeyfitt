import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireAdmin,
} from "@/lib/coaching/server";
import { deleteBankExerciseMedia } from "@/lib/exercises/bank-media";

type Params = { params: Promise<{ id: string; mediaId: string }> };

/**
 * DELETE /api/admin/exercises/[id]/media/[mediaId] — حذف رسانه رکورد بانک.
 * فقط ادمین؛ فایل storage هم پاک میشود؛ «ناموجود» 404.
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { mediaId } = await params;
    const result = await deleteBankExerciseMedia(admin.role, mediaId);
    if (result === null) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
