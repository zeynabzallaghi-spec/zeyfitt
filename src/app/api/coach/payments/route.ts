import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { createPaymentRequest, createPaymentRequestSchema, listCoachPayments } from "@/lib/billing/payments";

/**
 * GET /api/coach/payments — درخواست‌های پرداخت خود مربی.
 * POST — ساخت درخواست پرداخت برای دانشجوی متصل (ارتباط ACTIVE مالک +
 * نوع ارائهشده + لینک https معتبر). وضعیت اولیه PENDING (در انتظار تأیید
 * دانشجو)؛ هیچ درگاهی در این مرحله نیست و لینک به‌تنهایی پرداخت نیست.
 */
export async function GET() {
  try {
    const coach = await requireCoach();
    const payments = await listCoachPayments(coach.id);
    return NextResponse.json({ payments });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export async function POST(request: Request) {
  try {
    const coach = await requireCoach();
    const body = await readJsonBody(request);
    const input = parseWithSchema(createPaymentRequestSchema, body);
    const payment = await createPaymentRequest(coach.id, coach.role, input);
    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
