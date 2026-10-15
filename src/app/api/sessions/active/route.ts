import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { findActiveSession } from "@/lib/session-storage";

/**
 * GET /api/sessions/active — جلسه در حال انجام کاربر جاری (یا null).
 * برای بازیابی وضعیت پس از Refresh، خروج ناخواسته و ورود مجدد استفاده می‌شود.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const active = await findActiveSession(session.user.id);
    return NextResponse.json({ session: active });
  } catch (error) {
    console.error("[sessions:active]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
