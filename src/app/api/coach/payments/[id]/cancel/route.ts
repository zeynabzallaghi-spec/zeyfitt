import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireCoach,
} from "@/lib/coaching/server";
import { cancelPaymentByCoach } from "@/lib/billing/payments";

type Params = { params: Promise<{ id: string }> };

/** POST /api/coach/payments/[id]/cancel — لغو درخواست پرداخت توسط مربی مالک */
export async function POST(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const payment = await cancelPaymentByCoach(coach.id, id);
    return NextResponse.json({ payment });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
