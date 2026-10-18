import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { publishCoachWorkoutPlan } from "@/lib/coaching/plans";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const publishSchema = z.object({
  /** ارتباط ACTIVE انتخاب‌شده — studentId همیشه سمت سرور از آن استخراج می‌شود */
  connectionId: z
    .string({ message: "ارتباط معتبر نیست" })
    .trim()
    .min(1)
    .max(64),
});

/**
 * POST /api/coach/workout-plans/[id]/publish — ارسال برنامه به دانشجوی متصل.
 * همه مجوزها سمت سرور: COACH + تأیید + ارتباط ACTIVE متعلق به مربی +
 * اشتراک مؤثر PREMIUM دانشجو. نسخه جدید تغییرناپذیر ثبت می‌شود؛
 * ارسال بدون تغییر محتوا 409 می‌گیرد.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(publishSchema, body);
    const delivery = await publishCoachWorkoutPlan(
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
