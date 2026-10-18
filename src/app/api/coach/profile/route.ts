import { NextResponse } from "next/server";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireCoach,
} from "@/lib/coaching/server";
import { coachProfileUpdateSchema } from "@/lib/coaching/schemas";
import { db } from "@/lib/db";
import {
  COACH_SPECIALIZATIONS,
  type CoachSpecialization,
} from "@/lib/coaching/constants";
import { profileValidForPublishing, toPublicCoach } from "@/lib/coaching/coach";

/**
 * GET /api/coach/profile — پروفایل حرفه‌ای خود مربی + وضعیت تأیید/انتشار.
 * نقش COACH از دیتابیس؛ بدون پروفایل → 404.
 */
export async function GET() {
  try {
    const coach = await requireCoach();
    const row = await db.coachProfile.findUnique({
      where: { userId: coach.id },
    });
    if (!row) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({
      profile: {
        ...toPublicCoach(row),
        verified: row.verified,
        published: row.published,
        canPublish: row.verified && profileValidForPublishing(row),
      },
    });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * PUT /api/coach/profile — ویرایش پروفایل حرفه‌ای توسط خود مربی.
 * verified هرگز از این مسیر تغییر نمی‌کند. اگر پروفایل منتشرشده باشد و
 * اطلاعات جدید حداقل لازم را نداشته باشد، انتشار صادقانه خاموش می‌شود.
 */
export async function PUT(request: Request) {
  try {
    const coach = await requireCoach();
    const row = await db.coachProfile.findUnique({
      where: { userId: coach.id },
    });
    if (!row) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const body = await readJsonBody(request);
    const input = parseWithSchema(coachProfileUpdateSchema, body);

    // پاک‌سازی تخصص‌ها به کدهای شناخته‌شده — بدون mass assignment
    const specializations: CoachSpecialization[] = input.specializations.filter(
      (v): v is CoachSpecialization =>
        (COACH_SPECIALIZATIONS as readonly string[]).includes(v)
    );

    const updated = await db.coachProfile.update({
      where: { userId: coach.id },
      data: {
        displayName: input.displayName,
        headline: input.headline.length > 0 ? input.headline : null,
        bio: input.bio.length > 0 ? input.bio : null,
        specializationsJson: JSON.stringify(specializations),
        certificationsJson: JSON.stringify(input.certifications),
        experienceYears: input.experienceYears,
        cooperationTypesJson: JSON.stringify(input.cooperationTypes),
      },
    });

    // سیاست انتشار: پروفایل منتشرشده با اطلاعات ناقص دیگر عمومی نمی‌ماند
    let published = updated.published;
    if (published && !profileValidForPublishing(updated)) {
      const reverted = await db.coachProfile.update({
        where: { userId: coach.id },
        data: { published: false },
      });
      published = reverted.published;
    }

    return NextResponse.json({
      profile: {
        ...toPublicCoach(updated),
        verified: updated.verified,
        published,
        canPublish: updated.verified && profileValidForPublishing(updated),
      },
    });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
