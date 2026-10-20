import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { ticketUserActionSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/support/tickets/[id]/action — بستن یا بازگشایی تیکت توسط خود
 * کاربر. فقط مالک تیکت (بقیه و ناموجود: 404 یکسان — بدون افشای وجود).
 *
 * ماشین وضعیت سمت کاربر:
 *   close  — open|answered → closed (پایان مسیر)
 *   reopen — answered → open (بازگشایی پس از پاسخ ادمین)
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(ticketUserActionSchema, body);

    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket || ticket.userId !== user.id) {
      return NextResponse.json({ error: "TICKET_NOT_FOUND" }, { status: 404 });
    }

    if (input.action === "close") {
      if (ticket.status !== "open" && ticket.status !== "answered") {
        return NextResponse.json({ error: "TICKET_INVALID_TRANSITION" }, { status: 409 });
      }
      const row = await db.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "closed", closedAt: new Date() },
      });
      return NextResponse.json({ ticket: { id: row.id, status: row.status } });
    }

    // reopen
    if (ticket.status !== "answered") {
      return NextResponse.json({ error: "TICKET_INVALID_TRANSITION" }, { status: 409 });
    }
    const row = await db.supportTicket.update({
      where: { id: ticket.id },
      data: { status: "open" },
    });
    return NextResponse.json({ ticket: { id: row.id, status: row.status } });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}
