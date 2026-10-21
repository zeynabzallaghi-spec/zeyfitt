import { NextResponse } from "next/server";
import { coachingErrorResponse, requireCoach } from "@/lib/coaching/server";
import { deleteCoachNote } from "@/lib/coaching/coach-students";

type Params = { params: Promise<{ id: string; noteId: string }> };

/**
 * DELETE /api/coach/students/[id]/note/[noteId] — حذف یادداشت خصوصی خود مربی.
 * فقط رکورد همان مربی درباره همان دانشجو؛ غیرمالک/ناموجود → 404 یکسان (ضد IDOR).
 */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id, noteId } = await params;
    const deleted = await deleteCoachNote(coach.id, id, noteId);
    if (!deleted) {
      return NextResponse.json({ error: "NOTE_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
