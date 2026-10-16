/**
 * تایپ‌های سیستم ثبت تمرین واقعی — مشترک بین کلاینت و سرور.
 *
 * اصل اساسی این ماژول: «ثبت واقعیت». یک WorkoutSession فقط با اقدام صریح
 * کاربر ساخته می‌شود، هر ردیف WorkoutSetLog به معنی انجام‌شدن واقعی همان
 * ست است و هیچ مقدار تجویزی برنامه هرگز جای مقدار واقعی کاربر را پر
 * نمی‌کند. مقادیر هدف فقط برای «مقایسه نمایشی» کنار واقعی‌ها نمایش داده
 * می‌شوند و در محاسبات آمار دخالتی ندارند.
 */

import type { MuscleGroupId } from "@/lib/fitness3d/types";

/** وضعیت جلسه — رهاشده با تکمیل‌شده یکی نیست و در تاریخچه متمایز دیده می‌شود */
export type SessionStatus = "in_progress" | "completed" | "abandoned";

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  in_progress: "در حال انجام",
  completed: "تکمیل‌شده",
  abandoned: "رهاشده",
};

/** وضعیت اجرای یک حرکت داخل جلسه */
export type ExerciseStatus = "pending" | "done" | "skipped";

export const EXERCISE_STATUS_LABELS: Record<ExerciseStatus, string> = {
  pending: "باقی‌مانده",
  done: "انجام شد",
  skipped: "رد شد",
};

/** واحد وزنه — پروژه فعلی فقط کیلوگرم است؛ بدون تبدیل بی‌اعتبار */
export const WEIGHT_UNIT = "کیلوگرم";

/* ------------------------------ تایپ کلاینت ------------------------------ */

/** یک ست ثبت‌شده — وجود رکورد یعنی ست واقعاً انجام شده است */
export interface SetLogClient {
  id: string;
  /** شماره ست — از ۱ (برچسب انتخابی کاربر؛ UI پیشنهاد «بعدی» می‌دهد) */
  setNumber: number;
  /** تعداد تکرار واقعی */
  reps: number;
  /** بار خارجی (کیلوگرم) — null یعنی بدون بار خارجی یا نامعلوم */
  weightKg: number | null;
  note: string | null;
  updatedAt: string;
}

/** یک حرکت ثبت‌شده داخل جلسه — با snapshot حداقلی برای مقاومت تاریخچه */
export interface SessionExerciseClient {
  id: string;
  order: number;
  /** شناسه پایدار بانک — ممکن است در نسخه جدید بانک نباشد (snapshot می‌ماند) */
  exerciseId: string;
  faName: string;
  enName: string;
  category: string;
  /** snapshot شناسه مربی سه‌بعدی — فقط برای حرکات واقعاً دارای انیمیشن */
  coach3dId: string | null;
  /** snapshot عضلات اصلی */
  primaryMuscles: MuscleGroupId[];
  note: string | null;
  /** تجویز برنامه — برای تمرین آزاد همه null است */
  targetSets: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  restSeconds: number | null;
  status: ExerciseStatus;
  /** ست‌های ثبت‌شده واقعی — مرتب بر اساس شماره ست */
  sets: SetLogClient[];
}

/** جلسه کامل با حرکات و ست‌ها */
export interface WorkoutSessionClient {
  id: string;
  userId: string;
  planId: string | null;
  planDayId: string | null;
  title: string;
  status: SessionStatus;
  /** زمان واقعی شروع (ISO) */
  startedAt: string;
  /** زمان ثبت پایان — فقط برای جلسات بسته‌شده */
  endedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  exercises: SessionExerciseClient[];
}

/** خلاصه یک جلسه — برای فهرست تاریخچه و داشبورد؛ مجموع‌ها از ست‌های واقعی */
export interface SessionSummaryClient {
  id: string;
  title: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  /** مدت ثبت‌شده به دقیقه — فقط برای جلسات بسته‌شده (از startedAt/endedAt) */
  durationMinutes: number | null;
  /** تعداد حرکات با حداقل یک ست ثبت‌شده یا وضعیت done */
  exercisesDone: number;
  /** تعداد کل حرکات جلسه */
  exercisesTotal: number;
  /** تعداد حرکات ردشده */
  exercisesSkipped: number;
  /** تعداد ست‌های ثبت‌شده واقعی */
  setsCompleted: number;
  /** مجموع تکرارهای ثبت‌شده واقعی */
  repsTotal: number;
  /** حجم ثبت‌شده فقط از ست‌های دارای بار خارجی (kg) — قاعده مستند آمار */
  volumeKg: number;
}

/* ------------------------------ محرک‌های API ------------------------------ */

/** ورودی شروع جلسه — یا روز برنامه (planDayId) یا تمرین آزاد (فهرست حرکات بانک) */
export interface StartSessionInput {
  planDayId?: string;
  exercises?: { exerciseId: string }[];
  /** زبان تولید عنوان جلسه (تمرین آزاد) — پیش‌فرض fa */
  contentLocale?: "fa" | "en";
}

/** ورودی ثبت/اصلاح یک ست — upsert بر اساس (حرکت، شماره ست) */
export interface SetLogInput {
  sessionExerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  note?: string | null;
}

/** ورودی پایان جلسه — پایان و رهاکردن دو اقدام متمایزند */
export interface FinishSessionInput {
  action: "complete" | "abandon";
  notes?: string | null;
}

/* ------------------------------ محدودیت‌های اعتبارسنجی ------------------------------ */
/* همین مقادیر در شِمای Zod سمت سرور هم اعمال می‌شوند؛ UI همان بازه‌ها را می‌گیرد */

export const SET_NUMBER_MIN = 1;
export const SET_NUMBER_MAX = 30;
export const REPS_MIN = 1;
export const REPS_MAX = 500;
export const WEIGHT_MIN = 0;
export const WEIGHT_MAX = 500;
export const SESSION_EXERCISES_MAX = 20;
export const NOTES_MAX = 500;

/* ------------------------------ برچسب‌های کمکی ------------------------------ */

export function sessionStatusFa(status: string): string {
  return SESSION_STATUS_LABELS[status as SessionStatus] ?? status;
}

export function exerciseStatusFa(status: string): string {
  return EXERCISE_STATUS_LABELS[status as ExerciseStatus] ?? status;
}
