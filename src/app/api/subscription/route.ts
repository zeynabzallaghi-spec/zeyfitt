import { NextResponse } from "next/server";
import { CoachingError } from "@/lib/coaching/constants";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import { effectiveSubscription } from "@/lib/coaching/subscription";

/**
 * GET /api/subscription — وضعیت اشتراک دانشجوی فعلی (از نشست سرور).
 * رکورد تنبل با پیشفرض امن FREE ساخته می‌شود؛ سطح مؤثر با انقضای لحظه‌ای.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const subscription = await effectiveSubscription(user.id);
    return NextResponse.json({ subscription });
  } catch (error) {
    if (error instanceof CoachingError && error.status === 401) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    return coachingErrorResponse(error);
  }
}
