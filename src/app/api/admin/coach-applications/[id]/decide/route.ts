import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireAdmin,
} from "@/lib/coaching/server";
import { adminDecisionSchema } from "@/lib/admin/schemas";
import { adminDecideCoachApplication } from "@/lib/admin/service";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/coach-applications/[id]/decide — تصمیم روی درخواست
 * مربی‌گری. تأیید: role=COACH + پروفایل اولیه verified (انتشار فقط با
 * پروفایل کامل). رد: فقط درخواست — هیچ چیز دیگری دست نمی‌خورد.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(adminDecisionSchema, body);
    const result = await adminDecideCoachApplication(admin.id, id, input.decision, {
      note: input.note,
      publish: input.publish,
    });
    return NextResponse.json({ application: result });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}
