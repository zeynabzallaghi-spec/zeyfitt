import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { deleteSet } from "@/lib/session-storage";
import { invalidIdResponse, sessionErrorResponse } from "../../../shared";

/**
 * DELETE /api/sessions/[id]/sets/[setId] — حذف ورودی اشتباه یک ست.
 * فقط مالک جلسه باز؛ پس از پایان جلسه حذف ست هم بی‌اعتبار است (409).
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; setId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id, setId } = await context.params;
    const idErr = invalidIdResponse(id) ?? invalidIdResponse(setId);
    if (idErr) return idErr;

    const workoutSession = await deleteSet(id, session.user.id, setId);
    return NextResponse.json({ session: workoutSession });
  } catch (error) {
    const mapped = sessionErrorResponse(error);
    if (mapped) return mapped;
    console.error("[session:sets:DELETE]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
