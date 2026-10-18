import { NextResponse } from "next/server";
import { coachingErrorResponse, requireUser } from "@/lib/coaching/server";
import { listStudentDeliveries } from "@/lib/coaching/plans";

/**
 * GET /api/coach-plans?kind=workout|nutrition — برنامه‌های اختصاصی دریافتی
 * دانشجو. studentId فقط از نشست سرور؛ دانشجو فقط ارسال‌شده‌های خودش را
 * می‌بیند (فیلتر kind اختیاری).
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const kindParam = url.searchParams.get("kind");
    const kind = kindParam === "workout" || kindParam === "nutrition" ? kindParam : undefined;
    const deliveries = await listStudentDeliveries(user.id, kind);
    return NextResponse.json({ deliveries });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
