import { NextResponse } from "next/server";
import { coachingErrorResponse, requireAdmin } from "@/lib/coaching/server";
import { listExerciseReviewQueue } from "@/lib/coaching/publishing";

/**
 * GET /api/admin/exercise-reviews — صف بازبینی حرکات (مرحله ۲۰/P3).
 * فقط ادمین؛ همه ارسال‌های در انتظار با پیش‌نمایش کامل محتوا + رسانه.
 * هیچ متادیتای خصوصی دیگری (ایمیل/بانکی/مسیر فایل) برنمی‌گردد.
 */
export async function GET() {
  try {
    await requireAdmin();
    const items = await listExerciseReviewQueue();
    return NextResponse.json({ items, count: items.length });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
