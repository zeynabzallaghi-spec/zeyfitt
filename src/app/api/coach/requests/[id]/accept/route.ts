import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  requireCoach,
} from "@/lib/coaching/server";
import { acceptRequest, getFreshRequestForCoach } from "@/lib/coaching/connections";

/**
 * POST /api/coach/requests/[id]/accept — پذیرش درخواست توسط مربی مالک.
 * وضعیت تازه از دیتابیس؛ تعارض (تغییر بین load و submit) → 409 همراه
 * وضعیت فعلی برای به‌روزرسانی UI. مجوز مربی و نوع همکاری لحظه پذیرش
 * دوباره بررسی می‌شود.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const coach = await requireCoach();
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "CONNECTION_NOT_FOUND" }, { status: 404 });
    }
    const request = await acceptRequest(coach.id, id);
    return NextResponse.json({ request });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/** وضعیت تازه درخواست برای مربی مالک — برای همگام‌سازی UI پس از تعارض */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const coach = await requireCoach();
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "CONNECTION_NOT_FOUND" }, { status: 404 });
    }
    const request = await getFreshRequestForCoach(coach.id, id);
    if (!request) {
      return NextResponse.json({ error: "CONNECTION_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ request });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
