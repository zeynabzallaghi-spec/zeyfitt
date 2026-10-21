import { NextResponse } from "next/server";
import { coachingErrorResponse, requireUser } from "@/lib/coaching/server";
import { listDirectMessages, sendDirectMessage } from "@/lib/dm";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/dm/threads/[id]/messages — پیام‌های رشته (فقط عضو).
 * POST — ارسال پیام جدید + اعلان گیرنده.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const messages = await listDirectMessages(id, user.id);
    return NextResponse.json({ messages });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const message = await sendDirectMessage(id, user.id, body);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
