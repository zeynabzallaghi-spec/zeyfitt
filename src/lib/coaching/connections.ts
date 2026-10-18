/**
 * سرویس ارتباط دانشجو-مربی — ماشین وضعیت سرورمحور.
 *
 * انتقال‌های مجاز (هر تغییر با شرط مالکیت + وضعیت فعلیِ تازه از دیتابیس):
 *   PENDING -> ACTIVE    پذیرش مربی مالک (با بازبینی مجوز لحظه‌ای)
 *   PENDING -> REJECTED  رد مربی مالک + دلیل اختیاری
 *   PENDING -> CANCELLED لغو دانشجو مالک
 *   ACTIVE  -> ENDED     پایان با اقدام صریح یکی از دو طرف
 *   بقیه وضعیت‌ها ترمینال‌اند و هیچ درخواست کلاینتی تغییرشان نمی‌دهد.
 *
 * امنیت:
 *  - studentId فقط از نشست سرور می‌آید؛ coachId فقط شناسه منبع عمومی است
 *    و مجوزش سمت سرور بازبینی می‌شود.
 *  - «مالک نبودن» و «ناموجود بودن» هر دو 404 تا هیچ وجودی افشا نشود.
 *  - تعارض وضعیت (تغییر بین load و submit) → 409 با وضعیت تازه برای UI.
 *  - قید یکتای partial (یک ارتباط باز به‌ازای هر جفت) در سطح SQLite.
 */

import { db } from "@/lib/db";
import {
  CONNECTION_LIMITS,
  CONNECTION_STATUSES,
  CoachingError,
  type CooperationType,
} from "./constants";
import {
  assertCoachStillEligible,
  coachOffersType,
  requireEligibleCoachForRequest,
} from "./coach";
import { hasActivePremium } from "./subscription";

const OPEN_STATUSES = [
  CONNECTION_STATUSES.PENDING,
  CONNECTION_STATUSES.ACTIVE,
] as const;

/* ------------------------------- محدودسازی نرخ ------------------------------- */

/** سقف ساخت درخواست در پنجره یک ساعت — مبتنی بر دیتابیس (ماندگار) */
export async function assertRequestRateAllowed(studentId: string): Promise<void> {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const created = await db.coachStudentConnection.count({
    where: { studentId, createdAt: { gte: hourAgo } },
  });
  if (created >= CONNECTION_LIMITS.REQUEST_RATE_PER_HOUR) {
    throw new CoachingError(429, "RATE_LIMITED");
  }
}

/** سقف درخواست‌های باز هم‌زمان یک دانشجو در کل سیستم */
export async function assertOpenRequestCap(studentId: string): Promise<void> {
  const open = await db.coachStudentConnection.count({
    where: { studentId, status: CONNECTION_STATUSES.PENDING },
  });
  if (open >= CONNECTION_LIMITS.MAX_OPEN_REQUESTS_PER_STUDENT) {
    throw new CoachingError(409, "TOO_MANY_OPEN_REQUESTS");
  }
}

/* ------------------------------ خواندن‌های دانشجو ------------------------------ */

/** برچسب عمومی مربی داخل ارتباط — فقط نام نمایشی، بدون ایمیل */
export interface ConnectionItem {
  id: string;
  status: string;
  cooperationType: CooperationType;
  message: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  endedAt: string | null;
  endedBy: string | null;
  coach: {
    userId: string;
    displayName: string;
    headline: string | null;
    /** برای آدرس‌دهی صفحه عمومی مربی */
    available: boolean;
  };
}

export async function listStudentConnections(
  studentId: string
): Promise<ConnectionItem[]> {
  const rows = await db.coachStudentConnection.findMany({
    where: { studentId },
    orderBy: { requestedAt: "desc" },
    take: 100,
  });
  const coachIds = [...new Set(rows.map((r) => r.coachId))];
  const coaches = await db.coachProfile.findMany({
    where: { userId: { in: coachIds } },
    select: { userId: true, displayName: true, headline: true, verified: true, published: true },
  });
  const coachMap = new Map(coaches.map((c) => [c.userId, c]));
  return rows.map((row) => {
    const coach = coachMap.get(row.coachId);
    return {
      id: row.id,
      status: row.status,
      cooperationType: row.cooperationType as CooperationType,
      message: row.message,
      rejectionReason: row.rejectionReason,
      requestedAt: row.requestedAt.toISOString(),
      decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
      endedAt: row.endedAt ? row.endedAt.toISOString() : null,
      endedBy: row.endedBy,
      coach: {
        userId: row.coachId,
        displayName: coach?.displayName ?? "—",
        headline: coach?.headline ?? null,
        available:
          (coach?.verified ?? false) && (coach?.published ?? false),
      },
    };
  });
}

/* ------------------------------ ساخت درخواست ------------------------------ */

export async function createConnectionRequest(input: {
  studentId: string;
  studentRole: string;
  coachId: string;
  cooperationType: CooperationType;
  message: string | null;
}): Promise<ConnectionItem> {
  // نقش دانشجو — از دیتابیس؛ مربی/ادمین مصرف‌کننده این قابلیت نیستند
  if (input.studentRole !== "STUDENT") {
    throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  }
  // مجوز اشتراک — سطح مؤثر از دیتابیس (بدون اعتماد به کلاینت)
  if (!(await hasActivePremium(input.studentId))) {
    throw new CoachingError(403, "SUBSCRIPTION_REQUIRED");
  }
  // ضدمغزانه‌سازی نرخ و سقف باز
  await assertRequestRateAllowed(input.studentId);
  await assertOpenRequestCap(input.studentId);
  // مربی باید همان لحظه واجد شرایط و ارائه‌دهنده این نوع همکاری باشد
  await requireEligibleCoachForRequest(input.coachId, input.cooperationType);
  // درخواست باز تکراری به‌ازای همان جفت → تعارض
  const duplicate = await db.coachStudentConnection.findFirst({
    where: {
      studentId: input.studentId,
      coachId: input.coachId,
      status: { in: [...OPEN_STATUSES] },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new CoachingError(409, "CONNECTION_ALREADY_OPEN");
  }

  try {
    const row = await db.coachStudentConnection.create({
      data: {
        studentId: input.studentId,
        coachId: input.coachId,
        status: CONNECTION_STATUSES.PENDING,
        cooperationType: input.cooperationType,
        message: input.message,
      },
    });
    return toConnectionItem(row);
  } catch (error) {
    // رقابت هم‌زمان دو درخواست با ایندکس partial یکتا → تعارض وضعیت
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new CoachingError(409, "CONNECTION_ALREADY_OPEN");
    }
    throw error;
  }
}

function toConnectionItem(row: {
  id: string;
  status: string;
  cooperationType: string;
  message: string | null;
  rejectionReason: string | null;
  requestedAt: Date;
  decidedAt: Date | null;
  endedAt: Date | null;
  endedBy: string | null;
  coachId: string;
}): ConnectionItem {
  return {
    id: row.id,
    status: row.status,
    cooperationType: row.cooperationType as CooperationType,
    message: row.message,
    rejectionReason: row.rejectionReason,
    requestedAt: row.requestedAt.toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    endedAt: row.endedAt ? row.endedAt.toISOString() : null,
    endedBy: row.endedBy,
    coach: { userId: row.coachId, displayName: "—", headline: null, available: false },
  };
}

/* -------------------------------- لغو دانشجو -------------------------------- */

/** لغو درخواست در انتظار — فقط دانشجوی مالک و فقط در وضعیت PENDING */
export async function cancelPendingRequest(
  studentId: string,
  connectionId: string
): Promise<ConnectionItem> {
  const row = await db.coachStudentConnection.findUnique({
    where: { id: connectionId },
  });
  if (!row || row.studentId !== studentId) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
  if (row.status !== CONNECTION_STATUSES.PENDING) {
    throw new CoachingError(409, "INVALID_TRANSITION");
  }
  const updated = await db.coachStudentConnection.update({
    where: { id: connectionId },
    data: {
      status: CONNECTION_STATUSES.CANCELLED,
      endedAt: new Date(),
      endedBy: "student",
    },
  });
  return toConnectionItem(updated);
}

/* ------------------------------ پایان ارتباط ------------------------------ */

/**
 * پایان ارتباط فعال — سیاست صریح: هر دو طرف (دانشجوی مالک یا مربی مالک)
 * می‌توانند ارتباط ACTIVE را خاتمه دهند؛ طرف دیگر از endedBy مشخص می‌شود.
 * تاریخچه هرگز حذف نمی‌شود.
 */
export async function endActiveConnection(
  actor: { id: string; role: string },
  connectionId: string
): Promise<ConnectionItem> {
  const row = await db.coachStudentConnection.findUnique({
    where: { id: connectionId },
  });
  const isOwnerStudent = row !== null && row.studentId === actor.id;
  const isOwnerCoach = row !== null && row.coachId === actor.id;
  if (!row || (!isOwnerStudent && !isOwnerCoach)) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
  if (row.status !== CONNECTION_STATUSES.ACTIVE) {
    throw new CoachingError(409, "INVALID_TRANSITION");
  }
  const updated = await db.coachStudentConnection.update({
    where: { id: connectionId },
    data: {
      status: CONNECTION_STATUSES.ENDED,
      endedAt: new Date(),
      endedBy: isOwnerStudent ? "student" : "coach",
    },
  });
  return toConnectionItem(updated);
}

/* ------------------------------ سمت مربی ------------------------------ */

/** اطلاعات مجاز دانشجو برای تصمیم‌گیری مربی — بدون ایمیل و داده خصوصی */
export interface CoachRequestItem {
  id: string;
  status: string;
  cooperationType: CooperationType;
  message: string | null;
  requestedAt: string;
  decidedAt: string | null;
  student: {
    userId: string;
    displayName: string;
  };
}

export async function listCoachIncomingRequests(
  coachId: string
): Promise<CoachRequestItem[]> {
  const rows = await db.coachStudentConnection.findMany({
    where: { coachId, status: CONNECTION_STATUSES.PENDING },
    orderBy: { requestedAt: "asc" },
    take: 100,
  });
  const studentIds = [...new Set(rows.map((r) => r.studentId))];
  const students = await db.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true },
  });
  const studentMap = new Map(students.map((s) => [s.id, s.name]));
  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    cooperationType: row.cooperationType as CooperationType,
    message: row.message,
    requestedAt: row.requestedAt.toISOString(),
    decidedAt: null,
    student: {
      userId: row.studentId,
      displayName: studentMap.get(row.studentId) ?? "—",
    },
  }));
}

/** پذیرش درخواست — فقط مربی مالک، فقط PENDING، با بازبینی مجوز لحظه‌ای */
export async function acceptRequest(
  coachId: string,
  connectionId: string
): Promise<CoachRequestItem> {
  const row = await db.coachStudentConnection.findUnique({
    where: { id: connectionId },
  });
  if (!row || row.coachId !== coachId) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
  if (row.status !== CONNECTION_STATUSES.PENDING) {
    throw new CoachingError(409, "INVALID_TRANSITION");
  }
  // مجوز مربی باید در لحظه پذیرش هم برقرار باشد (مثلاً انتشار را برنداشته باشد)
  await assertCoachStillEligible(coachId);
  // نوع همکاری هم باید هنوز از انواع ارائهشده مربی باشد
  await assertRequestTypeStillOffered(
    coachId,
    row.cooperationType as CooperationType
  );
  const updated = await db.coachStudentConnection.update({
    where: { id: connectionId },
    data: {
      status: CONNECTION_STATUSES.ACTIVE,
      decidedAt: new Date(),
    },
  });
  const student = await db.user.findUnique({
    where: { id: updated.studentId },
    select: { id: true, name: true },
  });
  return {
    id: updated.id,
    status: updated.status,
    cooperationType: updated.cooperationType as CooperationType,
    message: updated.message,
    requestedAt: updated.requestedAt.toISOString(),
    decidedAt: updated.decidedAt ? updated.decidedAt.toISOString() : null,
    student: {
      userId: updated.studentId,
      displayName: student?.name ?? "—",
    },
  };
}

/** رد درخواست — فقط مربی مالک، فقط PENDING + دلیل اختیاری محدود */
export async function rejectRequest(
  coachId: string,
  connectionId: string,
  reason: string | null
): Promise<CoachRequestItem> {
  const row = await db.coachStudentConnection.findUnique({
    where: { id: connectionId },
  });
  if (!row || row.coachId !== coachId) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
  if (row.status !== CONNECTION_STATUSES.PENDING) {
    throw new CoachingError(409, "INVALID_TRANSITION");
  }
  const updated = await db.coachStudentConnection.update({
    where: { id: connectionId },
    data: {
      status: CONNECTION_STATUSES.REJECTED,
      decidedAt: new Date(),
      rejectionReason: reason,
    },
  });
  const student = await db.user.findUnique({
    where: { id: updated.studentId },
    select: { id: true, name: true },
  });
  return {
    id: updated.id,
    status: updated.status,
    cooperationType: updated.cooperationType as CooperationType,
    message: updated.message,
    requestedAt: updated.requestedAt.toISOString(),
    decidedAt: updated.decidedAt ? updated.decidedAt.toISOString() : null,
    student: {
      userId: updated.studentId,
      displayName: student?.name ?? "—",
    },
  };
}

/** فهرست دانشجویان فعال مربی + وضعیت هر ارتباط */
export interface CoachStudentItem {
  connectionId: string;
  cooperationType: CooperationType;
  activeSince: string;
  student: {
    userId: string;
    displayName: string;
  };
}

export async function listCoachActiveStudents(
  coachId: string
): Promise<CoachStudentItem[]> {
  const rows = await db.coachStudentConnection.findMany({
    where: { coachId, status: CONNECTION_STATUSES.ACTIVE },
    orderBy: { decidedAt: "desc" },
    take: 200,
  });
  const studentIds = [...new Set(rows.map((r) => r.studentId))];
  const students = await db.user.findMany({
    where: { id: { in: studentIds } },
    select: { id: true, name: true },
  });
  const studentMap = new Map(students.map((s) => [s.id, s.name]));
  return rows.map((row) => ({
    connectionId: row.id,
    cooperationType: row.cooperationType as CooperationType,
    activeSince: (row.decidedAt ?? row.requestedAt).toISOString(),
    student: {
      userId: row.studentId,
      displayName: studentMap.get(row.studentId) ?? "—",
    },
  }));
}

/** بازخوانی یک درخواست برای مربی مالک — پاسخ 409 با وضعیت تازه در تعارض */
export async function getFreshRequestForCoach(
  coachId: string,
  connectionId: string
): Promise<CoachRequestItem | null> {
  const row = await db.coachStudentConnection.findUnique({
    where: { id: connectionId },
  });
  if (!row || row.coachId !== coachId) return null;
  const student = await db.user.findUnique({
    where: { id: row.studentId },
    select: { id: true, name: true },
  });
  return {
    id: row.id,
    status: row.status,
    cooperationType: row.cooperationType as CooperationType,
    message: row.message,
    requestedAt: row.requestedAt.toISOString(),
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    student: { userId: row.studentId, displayName: student?.name ?? "—" },
  };
}

/* ------------------------------ ابزار مشترک ------------------------------ */

/** آیا این درخواست واقعاً از نوع ارائهشده مربی است — برای بازبینی پذیرش */
export async function assertRequestTypeStillOffered(
  coachId: string,
  cooperationType: CooperationType
): Promise<void> {
  const profile = await db.coachProfile.findUnique({
    where: { userId: coachId },
  });
  if (!profile || !coachOffersType(profile, cooperationType)) {
    throw new CoachingError(409, "COOPERATION_TYPE_NOT_OFFERED");
  }
}
