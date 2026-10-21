import { NextResponse } from "next/server";
import { coachingErrorResponse, requireCoach } from "@/lib/coaching/server";
import { deleteCoachExerciseFolder } from "@/lib/coaching/coach-exercises";

type Params = { params: Promise<{ folderId: string }> };

/**
 * DELETE /api/coach/exercises/folders/[folderId] — حذف پوشه خود مربی.
 * حرکات پوشه حذف نمیشوند — به «بدون پوشه» برمی‌گردند (SetNull).
 * غیرمالک/ناموجود → 404 یکسان (ضد IDOR).
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { folderId } = await params;
    const deleted = await deleteCoachExerciseFolder(coach.id, folderId);
    if (!deleted) {
      return NextResponse.json({ error: "FOLDER_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
