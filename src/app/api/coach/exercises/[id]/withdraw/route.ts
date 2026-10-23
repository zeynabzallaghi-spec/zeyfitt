import { NextResponse } from "next/server";
import { coachingErrorResponse, requireCoach } from "@/lib/coaching/server";
import { withdrawCoachSubmission } from "@/lib/coaching/publishing";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/coach/exercises/[id]/withdraw — لغو ارسال در انتظار بررسی
 * (مرحله ۲۰/P3). فقط مالک؛ گذار pending_review → none با CAS.
 */
export async function POST(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const result = await withdrawCoachSubmission(coach.id, id);
    return NextResponse.json(result);
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
