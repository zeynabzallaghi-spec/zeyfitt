import { NextResponse } from "next/server";
import { coachingErrorResponse, requireUser } from "@/lib/coaching/server";
import { listDirectMessages } from "@/lib/dm";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/dm/threads/[id]/read — علامت‌گذاری نخوانده‌های رشته به‌عنوان
 * خوانده‌شده (فقط عضو؛ همان منطق خواندن در GET messages).
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    await listDirectMessages(id, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
