import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { getBankingInfo, saveBankingInfo } from "@/lib/billing/banking";
import { z } from "zod";

/**
 * GET /api/profile/banking — اطلاعات بانکی خود کاربر.
 * فقط مالک نشست؛ این داده در هیچ API دیگری (مربی/ادمین/عمومی) برنمی‌گردد.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const info = await getBankingInfo(user.id);
    return NextResponse.json({ banking: info });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

/** پاسخ خطای BankingError با کد پایدار و پیام فارسی */
function bankingErrorResponse(error: unknown): NextResponse {
  if (
    error instanceof Error &&
    error.name === "BankingError" &&
    "status" in error &&
    "code" in error
  ) {
    const be = error as unknown as { status: number; code: string; messageFa: string };
    return NextResponse.json(
      { error: be.code, message: be.messageFa },
      { status: be.status }
    );
  }
  return coachingErrorResponseWithSchema(error);
}

const bankingPayloadSchema = z.object({}).passthrough();

/** PUT /api/profile/banking — ذخیره اطلاعات بانکی خود کاربر (اعتبارسنجی سمت سرور) */
export async function PUT(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    parseWithSchema(bankingPayloadSchema, body);
    const info = await saveBankingInfo(user.id, body);
    return NextResponse.json({ banking: info });
  } catch (error) {
    return bankingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
