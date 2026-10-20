import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireUser,
} from "@/lib/coaching/server";
import { markAllNotificationsRead } from "@/lib/notifications/notifications";

/** POST /api/notifications/read-all — همه اعلان‌های خود کاربر خوانده میشود */
export async function POST() {
  try {
    const user = await requireUser();
    const changed = await markAllNotificationsRead(user.id);
    return NextResponse.json({ ok: true, changed });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
