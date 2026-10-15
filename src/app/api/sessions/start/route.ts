import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { startSessionSchema, firstSessionError } from "@/lib/workout-session/schema";
import { startSession } from "@/lib/session-storage";
import { sessionErrorResponse } from "../shared";

/**
 * POST /api/sessions/start — شروع جلسه واقعی با اقدام صریح کاربر.
 *  - planDayId: شروع از روز برنامه ذخیره‌شده (مالکیت روز در سرور بررسی می‌شود)
 *  - exercises: تمرین آزاد — فقط حرکات واقعی بانک حرکات
 * اگر جلسه در حال انجامی وجود داشته باشد همان برگردانده می‌شود (existing=true)
 * تا هیچ‌گاه بیش از یک جلسه فعال ساخته نشود.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = startSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstSessionError(parsed.error) },
        { status: 400 }
      );
    }

    const { session: workoutSession, existing } = await startSession(
      session.user.id,
      parsed.data
    );
    return NextResponse.json(
      { session: workoutSession, existing },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    const mapped = sessionErrorResponse(error);
    if (mapped) return mapped;
    console.error("[sessions:start]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
