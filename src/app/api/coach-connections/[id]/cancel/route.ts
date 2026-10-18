import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  requireUser,
} from "@/lib/coaching/server";
import { cancelPendingRequest } from "@/lib/coaching/connections";

/**
 * POST /api/coach-connections/[id]/cancel — لغو درخواست در انتظار توسط
 * دانشجوی مالک. شناسه از مسیر می‌آید؛ مالکیت و وضعیت سمت سرور بررسی
 * می‌شود (غیرواقعی/غیرواقعی-مالک → 404، وضعیت غیر PENDING → 409).
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
    const connection = await cancelPendingRequest(user.id, id);
    return NextResponse.json({ connection });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
