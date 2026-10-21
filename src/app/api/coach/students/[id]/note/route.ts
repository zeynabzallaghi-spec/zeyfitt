import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { coachNoteSchema, createCoachNote, listCoachNotes } from "@/lib/coaching/coach-students";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach/students/[id]/note — همه یادداشتهای خصوصی مربی درباره دانشجو
 * (جدیدترین اول). PUT — ایجاد یادداشت جدید (هر ذخیره رکورد مستقل).
 * هر دو فقط برای مربی مالک ارتباط ACTIVE؛ یادداشت‌ها برای دانشجو، مربی
 * دیگر یا عمومی هرگز برگردانده نمیشوند.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const notes = await listCoachNotes(coach.id, id);
    return NextResponse.json({ notes });
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
    const note = await createCoachNote(coach.id, id, input);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
