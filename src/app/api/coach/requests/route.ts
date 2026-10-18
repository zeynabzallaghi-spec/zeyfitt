import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  requireCoach,
} from "@/lib/coaching/server";
import { listCoachIncomingRequests } from "@/lib/coaching/connections";

/**
 * GET /api/coach/requests — درخواست‌های دریافتی در انتظار بررسی مربی.
 * فقط نقش COACH (از دیتابیس)؛ فقط درخواست‌های خود مربی؛ اطلاعات دانشجو
 * محدود به نام نمایشی است (بدون ایمیل یا داده خصوصی).
 */
export async function GET() {
  try {
    const coach = await requireCoach();
    const requests = await listCoachIncomingRequests(coach.id);
    return NextResponse.json({ requests });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
