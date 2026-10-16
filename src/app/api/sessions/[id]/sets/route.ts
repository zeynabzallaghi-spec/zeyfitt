import { NextResponse } from "next/server";
import { zodIssueCodes } from "@/lib/api-issues";
import { getServerSession } from "@/lib/session";
import { setLogSchema, firstSessionError } from "@/lib/workout-session/schema";
import { upsertSet } from "@/lib/session-storage";
import { invalidIdResponse, sessionErrorResponse } from "../../shared";

/**
 * POST /api/sessions/[id]/sets — ثبت یا اصلاح یک ست واقعی (upsert بر اساس
 * حرکت + شماره ست). اعتبارسنجی سمت سرور: تکرار منفی، وزنه منفی، شماره ست
 * نامعتبر و مقادیر خارج از بازه رد می‌شوند. برای حرکات وزن بدنِ بانک، وزنه
 * دریافتی نادیده گرفته می‌شود و null ذخیره می‌گردد (بدون جعل بار خارجی).
 * جلسه بسته‌شده هیچ ست جدیدی نمی‌پذیرد (409 SESSION_CLOSED).
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

    const parsed = setLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstSessionError(parsed.error), issues: zodIssueCodes(parsed.error) },
        { status: 400 }
      );
    }

    const workoutSession = await upsertSet(id, session.user.id, parsed.data);
    return NextResponse.json({ session: workoutSession }, { status: 201 });
  } catch (error) {
    const mapped = sessionErrorResponse(error);
    if (mapped) return mapped;
    console.error("[session:sets:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
