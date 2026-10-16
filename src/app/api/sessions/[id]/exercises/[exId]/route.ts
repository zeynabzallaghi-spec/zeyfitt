import { NextResponse } from "next/server";
import { zodIssueCodes } from "@/lib/api-issues";
import { getServerSession } from "@/lib/session";
import { exerciseStatusSchema, firstSessionError } from "@/lib/workout-session/schema";
import { setExerciseStatus } from "@/lib/session-storage";
import { invalidIdResponse, sessionErrorResponse } from "../../../shared";

/**
 * PATCH /api/sessions/[id]/exercises/[exId] — ثبت وضعیت حرکت:
 * pending | done | skipped. ردکردن حرکت با وضعیت صریح ثبت می‌شود تا در
 * خلاصه پایان جلسه و تاریخچه صادقانه تفکیک گردد.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; exId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id, exId } = await context.params;
    const idErr = invalidIdResponse(id) ?? invalidIdResponse(exId);
    if (idErr) return idErr;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = exerciseStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstSessionError(parsed.error), issues: zodIssueCodes(parsed.error) },
        { status: 400 }
      );
    }

    const workoutSession = await setExerciseStatus(
      id,
      session.user.id,
      exId,
      parsed.data.status
    );
    return NextResponse.json({ session: workoutSession });
  } catch (error) {
    const mapped = sessionErrorResponse(error);
    if (mapped) return mapped;
    console.error("[session:exercises:PATCH]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
