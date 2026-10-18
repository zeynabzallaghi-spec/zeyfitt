import { NextResponse } from "next/server";
import { listPublicCoaches } from "@/lib/coaching/coach";

/**
 * GET /api/coaches — فهرست عمومی مربیان.
 * فقط مربیان تأییدشده + منتشرشده + دارای اطلاعات کامل؛ بدون ایمیل یا
 * داده خصوصی. مسیر عمومی است (مهمان هم فهرست را می‌بیند)؛ درخواست
 * ارتباط در مسیر جداگانه با احراز هویت کنترل می‌شود.
 */
export async function GET() {
  try {
    const coaches = await listPublicCoaches();
    return NextResponse.json({ coaches });
  } catch (error) {
    console.error("[coaches:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
