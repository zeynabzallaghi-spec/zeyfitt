import { NextResponse } from "next/server";
import { z } from "zod";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireAdmin,
} from "@/lib/coaching/server";
import { adminDecideExerciseReview, REVIEW_FEEDBACK_MAX } from "@/lib/coaching/publishing";

type Params = { params: Promise<{ exerciseId: string }> };

const decideSchema = z.object({
  // فقط تأیید/رد — ادمین محتوا را ویرایش نمیکند (تصمیم D8)
  decision: z.enum(["approve", "reject"], { message: "تصمیم معتبر نیست" }),
  // بازخورد رد الزامی است (D8) — در سرویس سنجیده میشود (422)
  feedback: z.string().trim().max(REVIEW_FEEDBACK_MAX).optional().nullable(),
});

/**
 * POST /api/admin/exercise-reviews/[exerciseId]/decide — تصمیم روی ارسال
 * حرکت مربی (مرحله ۲۰/P3). فقط ادمین؛ approve → رکورد origin=coach در بانک
 * (به‌روزرسانی اتمی نسخه عمومی) + اعلان به مربی + AdminActionLog؛
 * reject → ثبت دلیل الزامی + اعلان بازخورد؛ گذار نامعتبر/تکراری → 409.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { exerciseId } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(decideSchema, body);
    const result = await adminDecideExerciseReview(
      admin.id,
      exerciseId,
      input.decision,
      input.feedback ?? null
    );
    return NextResponse.json(result);
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
