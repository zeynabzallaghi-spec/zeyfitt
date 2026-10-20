import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { coachNoteSchema, getCoachNote, saveCoachNote } from "@/lib/coaching/coach-students";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach/students/[id]/note — یادداشت خصوصی مربی درباره دانشجو.
 * PUT — نوشتن/ویرایش. هر دو فقط برای مربی مالک ارتباط ACTIVE؛ یادداشت
 * برای دانشجو، مربی دیگر یا عمومی هرگز برگردانده نمیشود.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const note = await getCoachNote(coach.id, id);
    return NextResponse.json({ note });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(coachNoteSchema, body);
    const note = await saveCoachNote(coach.id, id, input);
    return NextResponse.json({ note });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
