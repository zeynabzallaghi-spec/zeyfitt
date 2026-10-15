import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  findOwnedConversation,
  deleteOwnedConversation,
} from "@/lib/assistant/storage";
import { assistantErrorResponse, invalidIdResponse } from "../../shared";

/**
 * مسیرهای /api/assistant/conversations/[id] — «یافت نشد» و «مالک دیگر»
 * هر دو پاسخ یکسان 404 می‌گیرند تا هیچ اطلاعاتی درباره مکالمه کاربران
 * دیگر افشا نشود.
 *
 * GET    — مکالمه با همه پیام‌ها (ترتیب ثبت)
 * DELETE — حذف مکالمه و پیام‌هایش (UI پیش از آن تأیید جداگانه می‌گیرد)
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    const idErr = invalidIdResponse(id);
    if (idErr) return idErr;

    const conversation = await findOwnedConversation(id, session.user.id);
    if (!conversation) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ conversation });
  } catch (error) {
    const mapped = assistantErrorResponse(error);
    if (mapped) return mapped;
    console.error("[assistant:conversation:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    const idErr = invalidIdResponse(id);
    if (idErr) return idErr;

    const deleted = await deleteOwnedConversation(id, session.user.id);
    if (!deleted) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const mapped = assistantErrorResponse(error);
    if (mapped) return mapped;
    console.error("[assistant:conversation:DELETE]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
