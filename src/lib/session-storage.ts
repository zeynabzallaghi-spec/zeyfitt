/**
 * لایه سمت سرورِ ثبت جلسات تمرینی — تنها نقطه تماس Prisma با مدل‌های
 * WorkoutSession/WorkoutSessionExercise/WorkoutSetLog.
 *
 * قواعد امنیتی ثابت همه توابع:
 *  - userId همیشه پارامتر اجباری است و از نشست سرور می‌آید؛ هیچ تابعی به
 *    شناسه ارسالی از مرورگر اعتماد نمی‌کند.
 *  - «نبودن رکورد» و «مالک دیگر بودن» پاسخ یکسان می‌دهند تا هیچ اطلاعاتی
 *    درباره وجود داده کاربران دیگر افشا نشود.
 *  - هر نوشتن در ست/حرکت فقط وقتی مجاز است که جلسه status = "in_progress"
 *    باشد؛ پس از پایان یا رهاکردن، ست‌ها بی‌اعتبار می‌شوند (پاسخ 409).
 *
 * نکته SQLite: فهرست‌ها JSON رشته‌ای ذخیره می‌شوند و اینجا marshal می‌شوند.
 */

import { db } from "@/lib/db";
import type {
  WorkoutSession,
  WorkoutSessionExercise,
  WorkoutSetLog,
} from "@prisma/client";
import { getExerciseById } from "@/lib/exercises";
import type { MuscleGroupId } from "@/lib/fitness3d/types";
import {
  computeSessionSummary,
  computeWorkoutStats,
  computeExerciseProgress,
} from "@/lib/workout-session/stats";
import type {
  SessionSummaryClient,
  SessionStatus,
  ExerciseStatus,
  WorkoutSessionClient,
  SetLogInput,
  StartSessionInput,
  FinishSessionInput,
} from "@/lib/workout-session/types";
import { SESSION_EXERCISES_MAX as MAX_SESSION_EXERCISES } from "@/lib/workout-session/types";

/* ------------------------------ خطاهای دامنه ------------------------------ */

export type SessionErrorCode =
  | "NOT_FOUND"
  | "SESSION_CLOSED"
  | "EXERCISE_NOT_IN_BANK"
  | "LIMIT_REACHED";

export class SessionError extends Error {
  code: SessionErrorCode;
  detail?: string;
  constructor(code: SessionErrorCode, message: string, detail?: string) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

/* ------------------------------ تبدیل به کلاینت ------------------------------ */

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function marshalStatus(status: string): SessionStatus {
  return status === "completed" ? "completed" : status === "abandoned" ? "abandoned" : "in_progress";
}

function marshalExerciseStatus(status: string): ExerciseStatus {
  return status === "done" ? "done" : status === "skipped" ? "skipped" : "pending";
}

type SessionRow = WorkoutSession & {
  exercises: (WorkoutSessionExercise & { sets: WorkoutSetLog[] })[];
};

function toClientSession(row: SessionRow): WorkoutSessionClient {
  return {
    id: row.id,
    userId: row.userId,
    planId: row.planId ?? null,
    planDayId: row.planDayId ?? null,
    title: row.title,
    status: marshalStatus(row.status),
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    exercises: row.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ex) => ({
        id: ex.id,
        order: ex.order,
        exerciseId: ex.exerciseId,
        faName: ex.faName,
        enName: ex.enName,
        category: ex.category,
        coach3dId: ex.coach3dId ?? null,
        primaryMuscles: parseJsonArray(ex.primaryMusclesJson) as MuscleGroupId[],
        note: ex.note ?? null,
        targetSets: ex.targetSets ?? null,
        targetRepsMin: ex.targetRepsMin ?? null,
        targetRepsMax: ex.targetRepsMax ?? null,
        restSeconds: ex.restSeconds ?? null,
        status: marshalExerciseStatus(ex.status),
        sets: ex.sets
          .slice()
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => ({
            id: set.id,
            setNumber: set.setNumber,
            reps: set.reps,
            weightKg: set.weightKg ?? null,
            note: set.note ?? null,
            updatedAt: set.updatedAt.toISOString(),
          })),
      })),
  };
}

const SESSION_INCLUDE = {
  exercises: {
    orderBy: { order: "asc" as const },
    include: { sets: { orderBy: { setNumber: "asc" as const } } },
  },
};

/* ------------------------------ خواندن ------------------------------ */

/** جلسه در حال انجام کاربر — برای بازیابی پس از Refresh و ورود مجدد */
export async function findActiveSession(userId: string): Promise<WorkoutSessionClient | null> {
  const row = await db.workoutSession.findFirst({
    where: { userId, status: "in_progress" },
    orderBy: { startedAt: "desc" },
    include: SESSION_INCLUDE,
  });
  return row ? toClientSession(row) : null;
}

/** جزئیات یک جلسه — فقط مالک؛ نبودن/مالک دیگر هر دو null */
export async function findOwnedSession(
  sessionId: string,
  userId: string
): Promise<WorkoutSessionClient | null> {
  const row = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: SESSION_INCLUDE,
  });
  return row ? toClientSession(row) : null;
}

/** خلاصه جلسه (برای داشبورد) */
export async function findOwnedSessionSummary(
  sessionId: string,
  userId: string
): Promise<SessionSummaryClient | null> {
  const row = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: SESSION_INCLUDE,
  });
  return row ? computeSessionSummary(toPlain(row)) : null;
}

/** تبدیل ردیف Prisma به ساختار ورودی خلاصه‌ساز خالص */
function toPlain(row: SessionRow) {
  return {
    id: row.id,
    title: row.title,
    status: marshalStatus(row.status),
    startedAt: row.startedAt.toISOString(),
    endedAt: row.endedAt?.toISOString() ?? null,
    exercises: row.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ex) => ({
        status: marshalExerciseStatus(ex.status),
        sets: ex.sets
          .slice()
          .sort((a, b) => a.setNumber - b.setNumber)
          .map((set) => ({ reps: set.reps, weightKg: set.weightKg ?? null })),
      })),
  };
}

export interface HistoryFilters {
  status?: SessionStatus;
  from?: string;
  to?: string;
  limit?: number;
}

/**
 * تاریخچه جلسات کاربر — خلاصه‌های واقعی محاسبه‌شده از ست‌های ثبت‌شده.
 * بازه پیش‌فرض: یک سال اخیر (مستند در پاسخ آمار)؛ جدیدترین اول.
 */
export async function listOwnedSessionSummaries(
  userId: string,
  filters: HistoryFilters = {}
): Promise<SessionSummaryClient[]> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const where: Record<string, unknown> = { userId };
  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.startedAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }
  const rows = await db.workoutSession.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: limit,
    include: SESSION_INCLUDE,
  });
  return rows.map((row) => computeSessionSummary(toPlain(row)));
}

/* ------------------------------ شروع جلسه ------------------------------ */

/**
 * شروع جلسه واقعی — فقط با اقدام صریح کاربر.
 * اگر جلسه در حال انجامی وجود داشته باشد، همان برگردانده می‌شود (existing=true)
 * تا کلیک دوباره یا ارسال هم‌زمان درخواست، جلسه تکراری نسازد؛ این قید در
 * سطح دیتابیس هم با ایندکس یکتای جزئی تضمین شده است.
 */
export async function startSession(
  userId: string,
  input: StartSessionInput
): Promise<{ session: WorkoutSessionClient; existing: boolean }> {
  // ۱) جلوگیری از جلسه فعال تکراری — پیش از هر ساختنی
  const active = await db.workoutSession.findFirst({
    where: { userId, status: "in_progress" },
    include: SESSION_INCLUDE,
  });
  if (active) {
    return { session: toClientSession(active), existing: true };
  }

  if (input.planDayId) {
    // ۲) شروع از روز برنامه — روز باید متعلق به برنامه‌ای باشد که مالکش همین کاربر است
    const day = await db.workoutPlanDay.findFirst({
      where: { id: input.planDayId },
      include: {
        plan: { select: { id: true, userId: true, title: true } },
        exercises: { orderBy: { order: "asc" } },
      },
    });
    if (!day || day.plan.userId !== userId) {
      throw new SessionError("NOT_FOUND", "روز برنامه یافت نشد یا متعلق به شما نیست");
    }
    if (day.exercises.length === 0) {
      throw new SessionError("EXERCISE_NOT_IN_BANK", "این روز برنامه حرکتی ندارد");
    }
    const created = await db.workoutSession.create({
      data: {
        userId,
        planId: day.plan.id,
        planDayId: day.id,
        title: day.title,
        status: "in_progress",
        startedAt: new Date(),
        exercises: {
          create: day.exercises.map((ex) => ({
            order: ex.order,
            exerciseId: ex.exerciseId,
            faName: ex.faName,
            enName: ex.enName,
            category: ex.category,
            coach3dId: ex.coach3dId,
            primaryMusclesJson: primaryMusclesSnapshot(ex.exerciseId),
            note: ex.note,
            targetSets: ex.sets,
            targetRepsMin: ex.repsMin,
            targetRepsMax: ex.repsMax,
            restSeconds: ex.restSeconds,
            status: "pending",
          })),
        },
      },
      include: SESSION_INCLUDE,
    });
    return { session: toClientSession(created), existing: false };
  }

  // ۳) تمرین آزاد — فقط حرکات واقعی بانک مرحله ۵
  const freeExercises = input.exercises ?? [];
  const missing: string[] = [];
  const resolved = freeExercises.map(({ exerciseId }) => {
    const bank = getExerciseById(exerciseId);
    if (!bank) missing.push(exerciseId);
    return { exerciseId, bank };
  });
  if (missing.length > 0) {
    throw new SessionError(
      "EXERCISE_NOT_IN_BANK",
      "برخی حرکات در بانک حرکات یافت نشد؛ تمرین آزاد فقط با حرکات واقعی کتابخانه ممکن است",
      missing.join(", ")
    );
  }
  if (resolved.length > MAX_SESSION_EXERCISES) {
    throw new SessionError("LIMIT_REACHED", `حداکثر ${MAX_SESSION_EXERCISES} حرکت در یک جلسه مجاز است`);
  }

  try {
    const created = await db.workoutSession.create({
      data: {
        userId,
        title: input.contentLocale === "en" ? "Free workout" : "تمرین آزاد",
        status: "in_progress",
        startedAt: new Date(),
        exercises: {
          create: resolved.map((item, index) => ({
            order: index + 1,
            exerciseId: item.bank!.id,
            faName: item.bank!.fa,
            enName: item.bank!.en,
            category: item.bank!.category,
            coach3dId: item.bank!.coach3dId ?? null,
            primaryMusclesJson: JSON.stringify(item.bank!.primaryMuscles),
            note: null,
            // تمرین آزاد تجویز برنامه ندارد؛ هیچ مقدار ساختگی جای آن را پر نمی‌کند
            targetSets: null,
            targetRepsMin: null,
            targetRepsMax: null,
            restSeconds: null,
            status: "pending",
          })),
        },
      },
      include: SESSION_INCLUDE,
    });
    return { session: toClientSession(created), existing: false };
  } catch (error) {
    // رقابت هم‌زمانی نادر — ایندکس یکتای جزئی؛ جلسه موجود برگردانده می‌شود
    if (String(error).includes("one_active_session_per_user")) {
      const existing = await findActiveSession(userId);
      if (existing) return { session: existing, existing: true };
    }
    throw error;
  }
}

/** snapshot عضلات اصلی از بانک زنده — در نبود حرکت، خالی (شفاف) */
function primaryMusclesSnapshot(exerciseId: string): string {
  const bank = getExerciseById(exerciseId);
  return JSON.stringify(bank?.primaryMuscles ?? []);
}

/* ------------------------------ نوشتن ست‌ها ------------------------------ */

/** یافتن جلسه متعلق به کاربر با کنترل وضعیت — بازگشت خطای دامنه‌ای */
async function requireOwnedOpenSession(sessionId: string, userId: string) {
  const row = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, status: true },
  });
  if (!row) {
    throw new SessionError("NOT_FOUND", "جلسه یافت نشد یا متعلق به شما نیست");
  }
  if (row.status !== "in_progress") {
    throw new SessionError("SESSION_CLOSED", "این جلسه بسته شده است و دیگر قابل تغییر نیست");
  }
  return row;
}

/**
 * ثبت یا اصلاح یک ست واقعی (upsert بر اساس حرکت + شماره ست).
 * برای حرکات وزن بدنِ موجود در بانک، وزنه دریافتی نادیده گرفته و null ذخیره
 * می‌شود — ثبت وزنه جعلی برای حرکت بی‌بار مجاز نیست.
 */
export async function upsertSet(
  sessionId: string,
  userId: string,
  payload: SetLogInput
): Promise<WorkoutSessionClient> {
  await requireOwnedOpenSession(sessionId, userId);

  const exRow = await db.workoutSessionExercise.findFirst({
    where: { id: payload.sessionExerciseId, sessionId },
    select: { id: true, exerciseId: true },
  });
  if (!exRow) {
    throw new SessionError("NOT_FOUND", "این حرکت در جلسه فعلی شما یافت نشد");
  }

  // قاعده وزن بدن: اگر حرکت در بانک فقط وزن بدن است، هیچ بار خارجی‌ای ثبت نمی‌شود
  const bank = getExerciseById(exRow.exerciseId);
  const bodyweightOnly =
    bank !== undefined &&
    bank.equipment.length > 0 &&
    bank.equipment.every((e) => e === "bodyweight");
  const weightKg = bodyweightOnly ? null : payload.weightKg;

  const existing = await db.workoutSetLog.findUnique({
    where: {
      sessionExerciseId_setNumber: {
        sessionExerciseId: exRow.id,
        setNumber: payload.setNumber,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await db.workoutSetLog.update({
      where: { id: existing.id },
      data: {
        reps: payload.reps,
        weightKg,
        note: payload.note ?? null,
      },
    });
  } else {
    await db.workoutSetLog.create({
      data: {
        sessionExerciseId: exRow.id,
        setNumber: payload.setNumber,
        reps: payload.reps,
        weightKg,
        note: payload.note ?? null,
      },
    });
  }

  const fresh = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: SESSION_INCLUDE,
  });
  return toClientSession(fresh!);
}

/** حذف یک ست اشتباه — فقط مالک و فقط جلسه باز */
export async function deleteSet(
  sessionId: string,
  userId: string,
  setId: string
): Promise<WorkoutSessionClient> {
  await requireOwnedOpenSession(sessionId, userId);
  const setRow = await db.workoutSetLog.findFirst({
    where: {
      id: setId,
      exercise: { sessionId },
    },
    select: { id: true },
  });
  if (!setRow) {
    throw new SessionError("NOT_FOUND", "ست یافت نشد یا متعلق به جلسه شما نیست");
  }
  await db.workoutSetLog.delete({ where: { id: setRow.id } });
  const fresh = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: SESSION_INCLUDE,
  });
  return toClientSession(fresh!);
}

/* ------------------------------ وضعیت حرکت ------------------------------ */

/** ثبت وضعیت حرکت (انجام/رد/باقی‌مانده) — فقط جلسه باز */
export async function setExerciseStatus(
  sessionId: string,
  userId: string,
  exerciseRowId: string,
  status: ExerciseStatus
): Promise<WorkoutSessionClient> {
  await requireOwnedOpenSession(sessionId, userId);
  const exRow = await db.workoutSessionExercise.findFirst({
    where: { id: exerciseRowId, sessionId },
    select: { id: true },
  });
  if (!exRow) {
    throw new SessionError("NOT_FOUND", "این حرکت در جلسه فعلی شما یافت نشد");
  }
  await db.workoutSessionExercise.update({
    where: { id: exRow.id },
    data: { status },
  });
  const fresh = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: SESSION_INCLUDE,
  });
  return toClientSession(fresh!);
}

/* ------------------------------ افزودن حرکت آزاد ------------------------------ */

/** افزودن حرکت واقعی بانک به جلسه باز (تمرین آزاد یا تکمیل جلسه برنامه) */
export async function addSessionExercise(
  sessionId: string,
  userId: string,
  exerciseId: string
): Promise<WorkoutSessionClient> {
  await requireOwnedOpenSession(sessionId, userId);

  const bank = getExerciseById(exerciseId);
  if (!bank) {
    throw new SessionError("EXERCISE_NOT_IN_BANK", "این حرکت در بانک حرکات یافت نشد");
  }

  const count = await db.workoutSessionExercise.count({ where: { sessionId } });
  if (count >= MAX_SESSION_EXERCISES) {
    throw new SessionError("LIMIT_REACHED", `حداکثر ${MAX_SESSION_EXERCISES} حرکت در یک جلسه مجاز است`);
  }

  const maxOrder = await db.workoutSessionExercise.findFirst({
    where: { sessionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.workoutSessionExercise.create({
    data: {
      sessionId,
      order: (maxOrder?.order ?? 0) + 1,
      exerciseId: bank.id,
      faName: bank.fa,
      enName: bank.en,
      category: bank.category,
      coach3dId: bank.coach3dId ?? null,
      primaryMusclesJson: JSON.stringify(bank.primaryMuscles),
      note: null,
      targetSets: null,
      targetRepsMin: null,
      targetRepsMax: null,
      restSeconds: null,
      status: "pending",
    },
  });

  const fresh = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: SESSION_INCLUDE,
  });
  return toClientSession(fresh!);
}

/* ------------------------------ پایان جلسه ------------------------------ */

/**
 * پایان صریح جلسه — «تکمیل» و «رهاکردن» دو اقدام متمایزند و پس از هیچ‌کدام
 * ست‌ها قابل تغییر نیستند. جلسه ناقص صادقانه با همان وضعیت ثبت می‌شود.
 */
export async function finishSession(
  sessionId: string,
  userId: string,
  input: FinishSessionInput
): Promise<WorkoutSessionClient> {
  await requireOwnedOpenSession(sessionId, userId);
  await db.workoutSession.update({
    where: { id: sessionId },
    data: {
      status: input.action === "complete" ? "completed" : "abandoned",
      endedAt: new Date(),
      notes: input.notes ?? null,
    },
  });
  const fresh = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    include: SESSION_INCLUDE,
  });
  return toClientSession(fresh!);
}

/* ------------------------------ حذف جلسه ------------------------------ */

/** حذف جلسه — فقط مالک؛ UI تأیید جداگانه می‌گیرد */
export async function deleteOwnedSession(sessionId: string, userId: string): Promise<boolean> {
  const row = await db.workoutSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  });
  if (!row) return false;
  await db.workoutSession.delete({ where: { id: row.id } });
  return true;
}

/* ------------------------------ آمار ------------------------------ */

const STATS_WINDOW_DAYS = 365;
const STATS_MAX_SESSIONS = 200;

/**
 * آمار پیشرفت از جلسات واقعی — بازه یک سال اخیر و حداکثر ۲۰۰ جلسه
 * (مستند؛ داده قدیمی‌تر در آمار «مجموع» وارد نمی‌شود).
 */
export async function getWorkoutStats(userId: string) {
  const since = new Date(Date.now() - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db.workoutSession.findMany({
    where: { userId, startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
    take: STATS_MAX_SESSIONS,
    include: SESSION_INCLUDE,
  });
  const summaries = rows
    .map((row) => computeSessionSummary(toPlain(row)))
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
  return computeWorkoutStats(summaries);
}

/** روند یک حرکت مشخص از جلسات تکمیل‌شده واقعی */
export async function getExerciseProgress(userId: string, exerciseId: string) {
  const since = new Date(Date.now() - STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db.workoutSession.findMany({
    where: { userId, status: "completed", startedAt: { gte: since } },
    orderBy: { startedAt: "desc" },
    take: STATS_MAX_SESSIONS,
    include: {
      exercises: {
        where: { exerciseId },
        include: { sets: { orderBy: { setNumber: "asc" } } },
      },
    },
  });
  return computeExerciseProgress(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      startedAt: row.startedAt.toISOString(),
      exercises: row.exercises.map((ex) => ({
        exerciseId: ex.exerciseId,
        sets: ex.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg ?? null })),
      })),
    })),
    exerciseId
  );
}
