import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getProviderStatus } from "@/lib/assistant/provider";

/**
 * GET /api/assistant/status — وضعیت واقعی اتصال مدل زبانی.
 * فقط فیلدهای غیرحساس (شناسه ارائه‌دهنده، پیکربندی‌بودن، نام مدل) برگردانده
 * می‌شود؛ کلید و نشانی سرویس هرگز به مرورگر نمی‌رود. رابط چت با همین پاسخ
 * تصمیم می‌گیرد حالت «فعال» یا «پیکربندی‌نشده + راهنما» نشان دهد — بدون
 * هیچ ادعای اتصال ساختگی.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const provider = getProviderStatus();
    return NextResponse.json({ provider });
  } catch (error) {
    console.error("[assistant:status]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
