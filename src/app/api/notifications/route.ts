import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import { listNotificationsForUser } from "@/lib/notifications/notifications";

/**
 * GET /api/notifications — فهرست اعلان‌های خود کاربر + شمارش خوانده‌نشده.
 * فقط اعلان‌های مالک نشست؛ هیچ شناسه کلاینتی پذیرفته نمیشود.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const data = await listNotificationsForUser(user.id);
    return NextResponse.json(data);
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
