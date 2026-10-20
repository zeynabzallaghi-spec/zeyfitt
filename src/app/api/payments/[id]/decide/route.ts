import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { decidePaymentByStudent } from "@/lib/billing/payments";
import { z } from "zod";

type Params = { params: Promise<{ id: string }> };

const decideSchema = z.object({
  decision: z.enum(["confirm", "decline"], { message: "تصمیم معتبر نیست" }),
});

/**
 * POST /api/payments/[id]/decide — تأیید یا رد دانشجو؛ ثبت پایدار سمت سرور
 * (نه چک‌باکس ظاهری). فقط دانشجوی همان درخواست و فقط در PENDING.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(decideSchema, body);
    const payment = await decidePaymentByStudent(user.id, id, input.decision);
    return NextResponse.json({ payment });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
