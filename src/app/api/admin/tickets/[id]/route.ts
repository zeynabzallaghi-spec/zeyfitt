import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireAdmin,
} from "@/lib/coaching/server";
import { adminTicketUpdateSchema } from "@/lib/admin/schemas";
import { adminUpdateTicket } from "@/lib/admin/service";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/tickets/[id] — پاسخ ادمین و/یا انتقال وضعیت تیکت.
 * ماشین وضعیت سمت سرور اعتبارسنجی می‌شود؛ حل‌کردن بدون پاسخ غیرمجاز است.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(adminTicketUpdateSchema, body);
    if (!input.reply && !input.status) {
      return NextResponse.json(
        { error: "VALIDATION", message: "empty-update" },
        { status: 400 }
      );
    }
    const row = await adminUpdateTicket(admin.id, id, input);
    return NextResponse.json({ ticket: row });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}
