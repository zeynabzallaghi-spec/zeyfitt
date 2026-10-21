import { NextResponse } from "next/server";
import { coachingErrorResponse, readJsonBody, requireCoach } from "@/lib/coaching/server";
import {
  createCoachExerciseFolder,
  listCoachExerciseFolders,
} from "@/lib/coaching/coach-exercises";

/**
 * GET /api/coach/exercises/folders — پوشه‌های خود مربی با شمار حرکات.
 * POST — ساخت پوشه (نام تکراری → 409).
 */
export async function GET() {
  try {
    const coach = await requireCoach();
    const folders = await listCoachExerciseFolders(coach.id);
    return NextResponse.json({ folders });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const coach = await requireCoach();
    const body = await readJsonBody(request);
    const result = await createCoachExerciseFolder(coach.id, body);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.code === "DUPLICATE" ? "FOLDER_DUPLICATE" : "VALIDATION" },
        { status: result.code === "DUPLICATE" ? 409 : 400 }
      );
    }
    return NextResponse.json({ folder: result.folder }, { status: 201 });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
