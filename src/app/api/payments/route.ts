import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import { listStudentPayments } from "@/lib/billing/payments";

/** GET /api/payments — درخواست‌های پرداخت خود کاربر (سمت دانشجو) */
export async function GET() {
  try {
    const user = await requireUser();
    const payments = await listStudentPayments(user.id);
    return NextResponse.json({ payments });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
