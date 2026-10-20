import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireAdmin,
} from "@/lib/coaching/server";
import { adminDecisionSchema } from "@/lib/admin/schemas";
import { adminDecidePremiumRequest } from "@/lib/admin/service";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/premium-requests/[id]/decide — تصمیم روی درخواست ارتقا.
 * تأیید: اعطای PREMIUM با days (null = بدون انقضا) همان معناشناسی دستی.
 * رد: فقط درخواست با یادداشت شفاف برای کاربر.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(adminDecisionSchema, body);
    if (input.decision === "approved" && input.days === undefined) {
      return NextResponse.json(
        { error: "VALIDATION", message: "days-required" },
        { status: 400 }
      );
    }
    const result = await adminDecidePremiumRequest(admin.id, id, input.decision, {
      note: input.note,
      days: input.days ?? null,
    });
    return NextResponse.json({ request: result });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}
