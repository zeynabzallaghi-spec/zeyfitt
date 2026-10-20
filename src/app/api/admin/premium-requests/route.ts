import { NextResponse } from "next/server";
import { coachingErrorResponse, requireAdmin } from "@/lib/coaching/server";
import { adminPremiumRequests } from "@/lib/admin/service";

/**
 * GET /api/admin/premium-requests?status=pending — درخواست‌های ارتقا.
 * فقط ADMIN.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? undefined;
    const rows = await adminPremiumRequests(
      status && ["pending", "approved", "rejected"].includes(status) ? status : undefined
    );
    return NextResponse.json({ requests: rows });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}
