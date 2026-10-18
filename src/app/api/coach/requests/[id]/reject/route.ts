import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { rejectRequestSchema } from "@/lib/coaching/schemas";
import { rejectRequest } from "@/lib/coaching/connections";

/**
 * POST /api/coach/requests/[id]/reject — رد درخواست توسط مربی مالک.
 * دلیل اختیاری با سقف طول؛ وضعیت باید PENDING باشد (وگرنه 409).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const coach = await requireCoach();
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "CONNECTION_NOT_FOUND" }, { status: 404 });
    }
    const body = await readJsonBody(request);
    const input = parseWithSchema(rejectRequestSchema, body);
    const requestItem = await rejectRequest(coach.id, id, input.reason);
    return NextResponse.json({ request: requestItem });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
