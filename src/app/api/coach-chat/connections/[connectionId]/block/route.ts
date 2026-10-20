import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import {
  blockStudentInConversation,
  conversationBlockState,
  unblockStudentInConversation,
} from "@/lib/coaching/chat";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach-chat/connections/[id]/block — وضعیت مسدودی برای مربی مالک.
 * POST body { action: "block" | "unblock" } — مسدودی سمت سرور اعمال میشود؛
 * تاریخچه/رابطه/اشتراک دست‌نخورده میماند. فقط مربی مالک ارتباط.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { connectionId: id } = await params;
    const state = await conversationBlockState(id, user);
    return NextResponse.json(state);
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { connectionId: id } = await params;
    const body = (await request.json().catch(() => null)) as { action?: string } | null;
    if (!body || (body.action !== "block" && body.action !== "unblock")) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
    const state =
      body.action === "block"
        ? await blockStudentInConversation(id, user)
        : await unblockStudentInConversation(id, user);
    const fresh = await conversationBlockState(id, user);
    return NextResponse.json({ ...state, ...fresh });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
