import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { coachApplySchema } from "@/lib/coaching/schemas";
import { db } from "@/lib/db";
import { USER_ROLES } from "@/lib/coaching/constants";

/**
 * GET /api/coach/apply — وضعیت درخواست مربی‌گری خود کاربر.
 * هیچ‌کس وضعیت دیگران را نمی‌بیند؛ بدون رکورد → { application: null }.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const row = await db.coachApplication.findUnique({
      where: { userId: user.id },
    });
    return NextResponse.json({
      application: row
        ? {
            status: row.status,
            decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
            createdAt: row.createdAt.toISOString(),
          }
        : null,
      role: user.role,
    });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * POST /api/coach/apply — ثبت/به‌روزرسانی درخواست مربی‌گری.
 * مربی و ادمین نیازی به درخواست ندارند (403). کاربر عادی می‌تواند
 * درخواست ردشده را ویرایش و دوباره pending کند؛ تصمیم فقط با ابزار
 * مدیریتی سمت سرور است — هیچ مسیر API عمومی وضعیت را تأیید نمی‌کند.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role !== USER_ROLES.STUDENT) {
      return NextResponse.json({ error: "ROLE_NOT_ALLOWED" }, { status: 403 });
    }
    const body = await readJsonBody(request);
    const input = parseWithSchema(coachApplySchema, body);

    const existing = await db.coachApplication.findUnique({
      where: { userId: user.id },
    });
    // درخواست در انتظار یا تأییدشده قابل ارسال مجدد نیست
    if (existing && existing.status !== "rejected") {
      return NextResponse.json({ error: "APPLICATION_ALREADY_OPEN" }, { status: 409 });
    }

    const row = existing
      ? await db.coachApplication.update({
          where: { userId: user.id },
          data: {
            status: "pending",
            message: input.message ?? null,
            experienceYears: input.experienceYears ?? null,
            certificationsJson: JSON.stringify(input.certifications ?? []),
            decidedAt: null,
            decidedBy: null,
          },
        })
      : await db.coachApplication.create({
          data: {
            userId: user.id,
            message: input.message ?? null,
            experienceYears: input.experienceYears ?? null,
            certificationsJson: JSON.stringify(input.certifications ?? []),
          },
        });

    return NextResponse.json(
      {
        application: {
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
