import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  requireCoach,
} from "@/lib/coaching/server";
import { listCoachActiveStudents } from "@/lib/coaching/connections";

/**
 * GET /api/coach/students — فهرست دانشجویان فعال مربی + وضعیت ارتباط.
 * فقط ارتباط‌های ACTIVE خود مربی؛ بدون داده خصوصی دانشجو.
 */
export async function GET() {
  try {
    const coach = await requireCoach();
    const students = await listCoachActiveStudents(coach.id);
    return NextResponse.json({ students });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
