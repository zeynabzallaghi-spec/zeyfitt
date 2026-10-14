import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/session";

/**
 * DELETE /api/account — حذف کامل حساب کاربر جاری.
 * به‌دلیل onDelete: Cascade همه داده‌های وابسته (نشست‌ها، حساب‌های احراز هویت،
 * پروفایل تناسب اندام) نیز حذف می‌شوند.
 */
export async function DELETE() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    await db.user.delete({ where: { id: session.user.id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[account:DELETE]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
