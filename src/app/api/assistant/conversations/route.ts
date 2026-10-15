import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { listConversations, createConversation } from "@/lib/assistant/storage";
import { assistantErrorResponse } from "../shared";

/**
 * مسیرهای /api/assistant/conversations — همه با نشست سمت سرور؛ شناسه
 * کاربر هرگز از بدنه درخواست خوانده نمی‌شود.
 *
 * GET  — فهرست مکالمه‌های همان کاربر (جدیدترین فعالیت اول)
 * POST — ساخت مکالمه جدید با اقدام صریح کاربر
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const conversations = await listConversations(session.user.id);
    return NextResponse.json({ conversations });
  } catch (error) {
    const mapped = assistantErrorResponse(error);
    if (mapped) return mapped;
    console.error("[assistant:conversations:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const conversation = await createConversation(session.user.id);
    return NextResponse.json({ conversation }, { status: 201 });
  } catch (error) {
    const mapped = assistantErrorResponse(error);
    if (mapped) return mapped;
    console.error("[assistant:conversations:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
