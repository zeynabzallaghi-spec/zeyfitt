import { NextResponse } from "next/server";
import { zodIssueCodes } from "@/lib/api-issues";
import { getServerSession } from "@/lib/session";
import { addExerciseSchema, firstSessionError } from "@/lib/workout-session/schema";
import { addSessionExercise } from "@/lib/session-storage";
import { invalidIdResponse, sessionErrorResponse } from "../../shared";

/**
 * POST /api/sessions/[id]/exercises — افزودن حرکت واقعی بانک به جلسه باز.
 * برای تمرین آزاد یا افزودن حرکت اضافه به جلسه برنامه؛ حرکت باید در بانک
 * مرحله ۵ وجود داشته باشد (هیچ حرکت ساختگی پذیرفته نمی‌شود).
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    const idErr = invalidIdResponse(id);
    if (idErr) return idErr;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = addExerciseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstSessionError(parsed.error), issues: zodIssueCodes(parsed.error) },
        { status: 400 }
      );
    }

    const workoutSession = await addSessionExercise(id, session.user.id, parsed.data.exerciseId);
    return NextResponse.json({ session: workoutSession }, { status: 201 });
  } catch (error) {
    const mapped = sessionErrorResponse(error);
    if (mapped) return mapped;
    console.error("[session:exercises:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
