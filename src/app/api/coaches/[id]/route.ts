import { NextResponse } from "next/server";
import { getPublicCoach } from "@/lib/coaching/coach";

/**
 * GET /api/coaches/[id] — پروفایل عمومی یک مربی.
 * مربی غیرعمومی/تأییدنشده/ناقص = ناموجود (404) — بدون افشای وجود رکورد.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const coach = await getPublicCoach(id);
    if (!coach) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ coach });
  } catch (error) {
    console.error("[coaches:GET:id]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
