import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { finishSessionSchema, firstSessionError } from "@/lib/workout-session/schema";
import { finishSession } from "@/lib/session-storage";
import { invalidIdResponse, sessionErrorResponse } from "../../shared";

/**
 * POST /api/sessions/[id]/finish — پایان صریح جلسه با اقدام کاربر.
 *  - action=complete: جلسه تکمیل‌شده (حتی ناقص — موارد ناقص صادقانه می‌مانند)
 *  - action=abandon: جلسه رهاشده — در تاریخچه با تکمیل‌شده یکی نیست
 * پس از پایان، ست‌های جلسه دیگر قابل تغییر نیستند (409).
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

    const parsed = finishSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstSessionError(parsed.error) },
        { status: 400 }
      );
    }

    const workoutSession = await finishSession(id, session.user.id, parsed.data);
    return NextResponse.json({ session: workoutSession });
  } catch (error) {
    const mapped = sessionErrorResponse(error);
    if (mapped) return mapped;
    console.error("[session:finish]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
