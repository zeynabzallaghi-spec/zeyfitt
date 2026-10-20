import { NextResponse } from "next/server";
import { coachingErrorResponse, requireAdmin } from "@/lib/coaching/server";
import { adminCoachApplications } from "@/lib/admin/service";

/**
 * GET /api/admin/coach-applications?status=pending — درخواست‌های مربی‌گری.
 * فقط ADMIN. خروجی بدون شناسه‌های حساس کاربر (email فقط برای ادمین).
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const rows = await adminCoachApplications(
      status && ["pending", "approved", "rejected"].includes(status) ? status : undefined
    );
    return NextResponse.json({ applications: rows });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}
