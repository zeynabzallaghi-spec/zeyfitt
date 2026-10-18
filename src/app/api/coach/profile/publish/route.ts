import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { coachPublishSchema } from "@/lib/coaching/schemas";
import { db } from "@/lib/db";
import { profileValidForPublishing } from "@/lib/coaching/coach";
import { CoachingError } from "@/lib/coaching/constants";

/**
 * POST /api/coach/profile/publish — تغییر انتشار عمومی توسط خود مربی.
 * شرایط سمت سرور: verified + حداقل اطلاعات کامل. publish=true بدون شرط →
 * 422 PROFILE_INCOMPLETE؛ مربی تأییدنشده → 403 NOT_VERIFIED.
 */
export async function POST(request: Request) {
  try {
    const coach = await requireCoach();
    const row = await db.coachProfile.findUnique({
      where: { userId: coach.id },
    });
    if (!row) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const body = await readJsonBody(request);
    const input = parseWithSchema(coachPublishSchema, body);

    if (input.published) {
      if (!row.verified) {
        throw new CoachingError(403, "NOT_VERIFIED");
      }
      if (!profileValidForPublishing(row)) {
        throw new CoachingError(422, "PROFILE_INCOMPLETE");
      }
    }

    const updated = await db.coachProfile.update({
      where: { userId: coach.id },
      data: { published: input.published },
    });

    return NextResponse.json({
      profile: {
        published: updated.published,
        verified: updated.verified,
        canPublish: updated.verified && profileValidForPublishing(updated),
      },
    });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
