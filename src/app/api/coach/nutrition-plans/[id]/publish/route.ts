import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { publishCoachNutritionPlan } from "@/lib/coaching/plans";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const publishSchema = z.object({
  connectionId: z
    .string({ message: "ارتباط معتبر نیست" })
    .trim()
    .min(1)
    .max(64),
});

/**
 * POST /api/coach/nutrition-plans/[id]/publish — ارسال برنامه غذایی به دانشجوی
 * متصل با همان زنجیره مجوز برنامه تمرینی (COACH + تأیید + ACTIVE + PREMIUM).
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(publishSchema, body);
    const delivery = await publishCoachNutritionPlan(
      coach.id,
      coach.role,
      id,
      input.connectionId
    );
    return NextResponse.json(
      {
        delivery: {
          id: delivery.id,
          planId: delivery.planId,
          planKind: delivery.planKind,
          version: delivery.version,
          studentId: delivery.studentId,
          sentAt: delivery.sentAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
