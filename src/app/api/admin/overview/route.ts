import { NextResponse } from "next/server";
import { coachingErrorResponse, requireAdmin } from "@/lib/coaching/server";
import { adminOverview } from "@/lib/admin/service";

/**
 * GET /api/admin/overview — شمارش‌های کلی پنل ادمین.
 * فقط نقش ADMIN از دیتابیس تازه (بقیه: 403).
 */
export async function GET() {
  try {
    await requireAdmin();
    const overview = await adminOverview();
    return NextResponse.json({ overview });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}
