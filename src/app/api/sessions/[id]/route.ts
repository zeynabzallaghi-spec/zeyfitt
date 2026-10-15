import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { findOwnedSession, deleteOwnedSession } from "@/lib/session-storage";
import { invalidIdResponse } from "../shared";

/**
 * مسیرهای /api/sessions/[id] — همه عملیات با بررسی مالکیت سمت سرور.
 * «یافت نشد» و «مالک دیگر» پاسخ یکسان 404 می‌گیرند تا هیچ اطلاعاتی
 * درباره وجود جلسات کاربران دیگر افشا نشود.
 */

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/sessions/[id] — جزئیات کامل جلسه متعلق به کاربر جاری */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    const idErr = invalidIdResponse(id);
    if (idErr) return idErr;
    const workoutSession = await findOwnedSession(id, session.user.id);
    if (!workoutSession) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ session: workoutSession });
  } catch (error) {
    console.error("[session:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/** DELETE /api/sessions/[id] — حذف جلسه (UI پیش از آن تأیید جداگانه می‌گیرد) */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    const idErr = invalidIdResponse(id);
    if (idErr) return idErr;
    const deleted = await deleteOwnedSession(id, session.user.id);
    if (!deleted) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[session:DELETE]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
