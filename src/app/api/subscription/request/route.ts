import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { premiumRequestSchema } from "@/lib/admin/schemas";
import { db } from "@/lib/db";
import { USER_ROLES } from "@/lib/coaching/constants";

/**
 * GET /api/subscription/request — وضعیت درخواست ارتقای خود کاربر.
 * بدون رکورد → { request: null }؛ هیچ‌کس درخواست دیگران را نمی‌بیند.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const row = await db.premiumUpgradeRequest.findUnique({
      where: { userId: user.id },
    });
    return NextResponse.json({
      request: row
        ? {
            status: row.status,
            message: row.message,
            decidedNote: row.decidedNote,
            decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
            createdAt: row.createdAt.toISOString(),
          }
        : null,
      role: user.role,
    });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

/**
 * POST /api/subscription/request — ثبت/ارسال مجدد درخواست ارتقا.
 * فقط STUDENT (اشتراک هیچ ارتباطی به COACH/ADMIN ندارد). درخواست pending
 * یا approved تکرارپذیر نیست (409)؛ ردشده قابل ویرایش و ارسال مجدد است.
 * تصمیم فقط با پنل ادمین سمت سرور گرفته می‌شود — این مسیر tier را تغییر
 * نمی‌دهد.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== USER_ROLES.STUDENT) {
      return NextResponse.json({ error: "ROLE_NOT_ALLOWED" }, { status: 403 });
    }
    const body = await readJsonBody(request);
    const input = parseWithSchema(premiumRequestSchema, body);

    const existing = await db.premiumUpgradeRequest.findUnique({
      where: { userId: user.id },
    });
    if (existing && existing.status !== "rejected") {
      return NextResponse.json({ error: "REQUEST_ALREADY_OPEN" }, { status: 409 });
    }

    const row = existing
      ? await db.premiumUpgradeRequest.update({
          where: { userId: user.id },
          data: {
            status: "pending",
            message: input.message ?? null,
            decidedAt: null,
            decidedBy: null,
            decidedNote: null,
          },
        })
      : await db.premiumUpgradeRequest.create({
          data: {
            userId: user.id,
            message: input.message ?? null,
          },
        });

    return NextResponse.json(
      {
        request: {
          status: row.status,
          message: row.message,
          decidedNote: row.decidedNote,
          decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: existing ? 200 : 201 }
    );
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}
