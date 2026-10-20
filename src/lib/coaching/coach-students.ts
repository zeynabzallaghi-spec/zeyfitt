/**
 * اطلاعات تکمیلی دانشجو برای مربی — مرحله ۱۹.۶ (بخش ۹).
 *
 * مرزهای مجوز (سمت سرور، بدون استثنا):
 *  - همه داده‌ها فقط برای مربیِ مالک یک ارتباط «ACTIVE» با همان دانشجو.
 *  - شناسه دانشجو به‌تنهایی هرگز کافی نیست؛ هر خواندن ارتباط ACTIVE را
 *    در همان لحظه از دیتابیس بازبینی میکند.
 *  - پروفایل نمایش‌داده‌شده فقط فیلدهای مجاز حرفه‌ای است؛ اطلاعات خصوصی
 *    (بانکی، تماس خصوصی و…) هرگز به مربی نمیرسد.
 *  - یادداشت خصوصی فقط برای مربی مالک — دانشجو/مربی دیگر/عمومی هیچ.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { CoachingError } from "@/lib/coaching/constants";
import { listCoachPlanDeliveriesForStudent } from "./plans";
import { computeProfileStatus, toClientProfile } from "@/lib/profile";
import type { FitnessProfileClient } from "@/lib/profile";

/* ------------------------------ یادداشت خصوصی ------------------------------ */

export const NOTE_LIMITS = { MAX: 4000 } as const;

export const coachNoteSchema = z.object({
  content: z.string().trim().max(NOTE_LIMITS.MAX, "یادداشت طولانیتر از سقف مجاز است"),
});

export interface CoachNoteClient {
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** خواندن یادداشت — فقط مربی مالک ارتباط ACTIVE با این دانشجو */
export async function getCoachNote(
  coachId: string,
  studentId: string
): Promise<CoachNoteClient | null> {
  await assertActiveConnection(coachId, studentId);
  const row = await db.coachStudentNote.findUnique({
    where: { coachId_studentId: { coachId, studentId } },
  });
  if (!row) return null;
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** نوشتن/ویرایش یادداشت — upsert با تأیید ارتباط ACTIVE در همان لحظه */
export async function saveCoachNote(
  coachId: string,
  studentId: string,
  input: unknown
): Promise<CoachNoteClient> {
  await assertActiveConnection(coachId, studentId);
  const parsed = coachNoteSchema.parse(input);
  const row = await db.coachStudentNote.upsert({
    where: { coachId_studentId: { coachId, studentId } },
    create: { coachId, studentId, content: parsed.content },
    update: { content: parsed.content },
  });
  return {
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** اتصال ACTIVE بین مربی و دانشجو — بدون آن هیچ داده‌ای برنمی‌گردد */
async function assertActiveConnection(coachId: string, studentId: string): Promise<void> {
  const conn = await db.coachStudentConnection.findFirst({
    where: { coachId, studentId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!conn) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
}

/* ------------------------------ اطلاعات تکمیلی ------------------------------ */

export interface CoachStudentDetail {
  student: {
    userId: string;
    displayName: string;
    /** فقط فیلدهای مجاز پروفایل حرفه‌ای — بدون هیچ داده خصوصی/بانکی */
    profile: FitnessProfileClient | null;
    profileCompleted: boolean;
  };
  connection: {
    id: string;
    cooperationType: string;
    startedAt: string | null;
  };
  plans: {
    workout: Awaited<ReturnType<typeof listCoachPlanDeliveriesForStudent>>;
    nutrition: Awaited<ReturnType<typeof listCoachPlanDeliveriesForStudent>>;
  };
  /** سابقه واقعی تمرین — شمارش/آخرین جلسه از رکوردهای واقعی جلسات */
  progress: {
    sessionsCount: number;
    lastSessionAt: string | null;
  };
  note: CoachNoteClient | null;
}

/**
 * نمای کامل اطلاعات تکمیلی دانشجو — فقط برای مربی مالک ارتباط ACTIVE.
 * هیچ داده بانکی/تماس خصوصی اینجا نیست؛ پروفایل از toClientProfile (فیلد
 * whitelist) میآید.
 */
export async function getCoachStudentDetail(
  coachId: string,
  studentId: string
): Promise<CoachStudentDetail> {
  const conn = await db.coachStudentConnection.findFirst({
    where: { coachId, studentId, status: "ACTIVE" },
    select: { id: true, cooperationType: true, decidedAt: true, requestedAt: true },
  });
  if (!conn) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
  const [studentUser, profile, progress, note, workouts, nutritions] = await Promise.all([
    db.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true },
    }),
    db.fitnessProfile.findUnique({ where: { userId: studentId } }),
    db.workoutSession.aggregate({
      where: { userId: studentId, status: "completed" },
      _count: { _all: true },
      _max: { endedAt: true },
    }),
    db.coachStudentNote.findUnique({
      where: { coachId_studentId: { coachId, studentId } },
    }),
    listCoachPlanDeliveriesForStudent(coachId, studentId, "workout"),
    listCoachPlanDeliveriesForStudent(coachId, studentId, "nutrition"),
  ]);
  if (!studentUser) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
  const profileClient = profile ? toClientProfile(profile) : null;
  return {
    student: {
      userId: studentUser.id,
      displayName: studentUser.name,
      profile: profileClient,
      profileCompleted: profile ? computeProfileStatus(profile).complete : false,
    },
    connection: {
      id: conn.id,
      cooperationType: conn.cooperationType,
      startedAt: (conn.decidedAt ?? conn.requestedAt).toISOString(),
    },
    plans: { workout: workouts, nutrition: nutritions },
    progress: {
      sessionsCount: progress._count._all,
      lastSessionAt: progress._max.endedAt?.toISOString() ?? null,
    },
    note: note
      ? {
          content: note.content,
          createdAt: note.createdAt.toISOString(),
          updatedAt: note.updatedAt.toISOString(),
        }
      : null,
  };
}
