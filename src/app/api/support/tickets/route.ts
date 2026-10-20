import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { ticketCreateSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";
import { emitNotification, NOTIFICATION_TYPES } from "@/lib/notifications/notifications";

/**
 * GET /api/support/tickets — تیکت‌های خود کاربر (۵۰ تای آخر، جدیدترین اول).
 * هیچ‌کس تیکت کاربر دیگر را نمی‌بیند — فیلتر userId همیشه از نشست سرور.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      tickets: rows.map((r) => ({
        id: r.id,
        category: r.category,
        subject: r.subject,
        body: r.body,
        status: r.status,
        reply: r.reply,
        repliedAt: r.repliedAt ? r.repliedAt.toISOString() : null,
        closedAt: r.closedAt ? r.closedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * POST /api/support/tickets — ثبت تیکت جدید. userId از نشست سرور می‌آید؛
 * هیچ فیلد دیگری از کلاینت معتبر نیست. سقف باز ۵ تیکت هم‌زمان — پس از آن
 * باید یکی را ببندد (ضد هرزنویسی).
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = parseWithSchema(ticketCreateSchema, body);

    const openCount = await db.supportTicket.count({
      where: { userId: user.id, status: { in: ["open", "answered"] } },
    });
    if (openCount >= 5) {
      return NextResponse.json({ error: "TICKET_OPEN_LIMIT" }, { status: 429 });
    }

    const row = await db.supportTicket.create({
      data: {
        userId: user.id,
        category: input.category,
        subject: input.subject,
        body: input.body,
      },
    });
    // اعلان به همه ادمین‌ها — هر ادمین یک اعلان یکتا (dedupeKey به‌ازای ادمین)
    const admins = await db.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    for (const admin of admins) {
      await emitNotification({
        userId: admin.id,
        type: NOTIFICATION_TYPES.SUPPORT_TICKET_NEW,
        dedupeKey: `ticket-new:${row.id}:${admin.id}`,
        payload: { ticketId: row.id, category: row.category, fromUserId: user.id },
      });
    }
    return NextResponse.json(
      {
        ticket: {
          id: row.id,
          category: row.category,
          subject: row.subject,
          body: row.body,
          status: row.status,
          reply: null,
          repliedAt: null,
          closedAt: null,
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}
