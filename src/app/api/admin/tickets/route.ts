import { NextResponse } from "next/server";
import { coachingErrorResponse, requireAdmin } from "@/lib/coaching/server";
import { adminTickets } from "@/lib/admin/service";

/**
 * GET /api/admin/tickets?status=open — تیکت‌های پشتیبانی همه کاربران.
 * فقط ADMIN.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const rows = await adminTickets(
      status && ["open", "answered", "resolved", "closed"].includes(status)
        ? status
        : undefined
    );
    return NextResponse.json({ tickets: rows });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}
