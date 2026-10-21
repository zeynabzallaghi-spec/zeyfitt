import { NextResponse } from "next/server";
import { coachingErrorResponse, readJsonBody, requireCoach } from "@/lib/coaching/server";
import { moveCoachExerciseToFolder } from "@/lib/coaching/coach-exercises";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/coach/exercises/[id]/move — جابه‌جایی حرکت شخصی به پوشه.
 * body: { folderId: string | null } — null یعنی بیرون از پوشه‌ها.
 * فقط مالک؛ حرکت/پوشه ناموجود → 404 یکسان.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const body = (await readJsonBody(request)) as { folderId?: unknown };
    const folderId =
      typeof body.folderId === "string" && body.folderId.length > 0 ? body.folderId : null;
    const moved = await moveCoachExerciseToFolder(coach.id, id, folderId);
    if (!moved) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ moved: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
