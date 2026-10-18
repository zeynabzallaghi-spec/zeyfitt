import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  requireUser,
} from "@/lib/coaching/server";
import { endActiveConnection } from "@/lib/coaching/connections";

/**
 * POST /api/coach-connections/[id]/end — پایان دادن به ارتباط فعال.
 * سیاست صریح: هر دو طرف مالک (دانشجو یا مربی) مجازند؛ endedBy ثبت می‌شود.
 * وضعیت غیر ACTIVE → 409؛ غیرمالک/ناموجود → 404.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "CONNECTION_NOT_FOUND" }, { status: 404 });
    }
    const connection = await endActiveConnection(user, id);
    return NextResponse.json({ connection });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
