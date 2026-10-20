import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import { markNotificationRead } from "@/lib/notifications/notifications";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/notifications/[id]/read — خواندن واقعی یک اعلان (readAt سمت سرور).
 * «مالک دیگر» و «ناموجود» هر دو 404 — ضد IDOR.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await markNotificationRead(user.id, id);
    if (result === null) {
      return NextResponse.json({ error: "NOTIFICATION_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, changed: result });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
