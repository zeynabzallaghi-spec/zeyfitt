import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { historyQuerySchema, firstSessionError } from "@/lib/workout-session/schema";
import { listOwnedSessionSummaries } from "@/lib/session-storage";
import type { SessionStatus } from "@/lib/workout-session/types";

/**
 * GET /api/sessions — تاریخچه واقعی جلسات کاربر جاری.
 * پارامترهای اختیاری: status، from، to (ISO)، limit (۱ تا ۱۰۰).
 * خلاصه‌ها از ست‌های واقعاً ثبت‌شده محاسبه می‌شوند؛ هیچ مقداری از برنامه
 * تجویزی در آن‌ها دخالت ندارد.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = {
      status: url.searchParams.get("status") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
    };
    const parsed = historyQuerySchema.safeParse(query);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstSessionError(parsed.error) },
        { status: 400 }
      );
    }

    // «to» به‌صورت YYYY-MM-DD تا پایان همان روز شمول دارد؛ ISO کامل همان لحظه
    let toExclusive: string | undefined;
    if (parsed.data.to) {
      const isDayOnly = /^\d{4}-\d{2}-\d{2}$/.test(parsed.data.to);
      const ms = Date.parse(parsed.data.to) + (isDayOnly ? 24 * 60 * 60 * 1000 - 1 : 0);
      toExclusive = new Date(Math.min(ms, Date.now() + 60_000)).toISOString();
    }

    const sessions = await listOwnedSessionSummaries(session.user.id, {
      status: parsed.data.status as SessionStatus | undefined,
      from: parsed.data.from,
      to: toExclusive,
      limit: parsed.data.limit ? Number(parsed.data.limit) : undefined,
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("[sessions:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
