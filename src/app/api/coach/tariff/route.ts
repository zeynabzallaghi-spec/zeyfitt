import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { coachTariffSchema, getCoachTariff, saveCoachTariff } from "@/lib/billing/payments";

/**
 * GET /api/coach/tariff — تعرفه خود مربی (مبالغ؛ هیچ داده بانکیای اینجا نیست).
 * PUT — ذخیره تعرفه‌های خصوصی/نیمه‌خصوصی به ریال و دلار؛ null یعنی ثبت نشده
 * (هرگز صفر یا رایگان تفسیر نمیشود).
 */
export async function GET() {
  try {
    const coach = await requireCoach();
    const tariff = await getCoachTariff(coach.id);
    return NextResponse.json({ tariff });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export async function PUT(request: Request) {
  try {
    const coach = await requireCoach();
    const body = await readJsonBody(request);
    const input = parseWithSchema(coachTariffSchema, body);
    const tariff = await saveCoachTariff(coach.id, coach.role, input);
    return NextResponse.json({ tariff });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
