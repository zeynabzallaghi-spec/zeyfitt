import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireCoach,
} from "@/lib/coaching/server";
import { getCoachStudentDetail } from "@/lib/coaching/coach-students";
import { CoachingError } from "@/lib/coaching/constants";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach/students/[id] — اطلاعات تکمیلی دانشجو (پروفایل مجاز +
 * برنامه‌های اختصاص‌یافته + سابقه واقعی تمرین + یادداشت خصوصی).
 * شرط سخت: ارتباط ACTIVE بین مربی نشست و همان دانشجو — شناسه به‌تنهایی
 * هرگز کافی نیست؛ غیرمجاز و ناموجود هر دو 404.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { id } = await params;
    const detail = await getCoachStudentDetail(coach.id, id);
    return NextResponse.json({ detail });
  } catch (error) {
    if (error instanceof CoachingError && error.status === 404) {
      return NextResponse.json({ error: "CONNECTION_NOT_FOUND" }, { status: 404 });
    }
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
