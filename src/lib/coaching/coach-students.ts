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
  content: z.string().trim().min(1, "متن یادداشت خالی است").max(NOTE_LIMITS.MAX, "یادداشت طولانیتر از سقف مجاز است"),
});

export interface CoachNoteClient {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

function toNoteClient(row: { id: string; content: string; createdAt: Date; updatedAt: Date }): CoachNoteClient {
  return {
    id: row.id,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** فهرست همه یادداشتهای خصوصی مربی درباره دانشجو — جدیدترین اول */
export async function listCoachNotes(
  coachId: string,
  studentId: string
): Promise<CoachNoteClient[]> {
  await assertActiveConnection(coachId, studentId);
  const rows = await db.coachStudentNote.findMany({
    where: { coachId, studentId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(toNoteClient);
}

/** یادداشت جدید — هر ذخیره رکورد مستقل (ویرایش یادداشت قبلی پشتیبانی نمیشود؛ تاریخچه حفظ) */
export async function createCoachNote(
  coachId: string,
  studentId: string,
  input: unknown
): Promise<CoachNoteClient> {
  await assertActiveConnection(coachId, studentId);
  const parsed = coachNoteSchema.parse(input);
  const row = await db.coachStudentNote.create({
    data: { coachId, studentId, content: parsed.content },
  });
  return toNoteClient(row);
}

/** حذف یادداشت — فقط رکورد خود مربی درباره همان دانشجو؛ غیرمالک 404 یکسان */
export async function deleteCoachNote(
  coachId: string,
  studentId: string,
  noteId: string
): Promise<boolean> {
  await assertActiveConnection(coachId, studentId);
  const existing = await db.coachStudentNote.findFirst({
    where: { id: noteId, coachId, studentId },
    select: { id: true },
  });
  if (!existing) return false;
  await db.coachStudentNote.delete({ where: { id: noteId } });
  return true;
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
  notes: CoachNoteClient[];
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
  const [studentUser, profile, progress, notes, workouts, nutritions] = await Promise.all([
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
    db.coachStudentNote.findMany({
      where: { coachId, studentId },
      orderBy: { createdAt: "desc" },
      take: 200,
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
    notes: notes.map(toNoteClient),
  };
}
