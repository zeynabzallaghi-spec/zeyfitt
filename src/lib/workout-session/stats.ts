/**
 * موتور آمار و تحلیل پیشرفت — ماژول خالص، بدون دسترسی به پایگاه داده و بدون
 * هیچ داده ساختگی. همه ورودی‌ها از رکوردهای واقعی ثبت‌شده کاربر می‌آیند.
 *
 * قواعد حسابداری آمار (مستند و ثابت):
 *  ۱. فقط جلسات با status = "completed" در «جلسات تکمیل‌شده» شمرده می‌شوند؛
 *     جلسه در حال انجام و رهاشده جداگانه گزارش می‌شوند و با تکمیل‌شده جمع نمی‌شوند.
 *  ۲. مدت جلسه فقط از startedAt و endedAt ثبت‌شده محاسبه می‌شود؛ هیچ مدت
 *     تخمینی‌ای ساخته نمی‌شود. جلسه بدون پایان ثبت‌شده مدت ندارد (null).
 *  ۳. ست‌ها و تکرارها فقط از ست‌های واقعاً ثبت‌شده (WorkoutSetLog) جمع می‌شوند؛
 *     مقادیر هدف برنامه (sets/reps تجویزی) هرگز در آمار وارد نمی‌شوند.
 *  ۴. «حجم تمرین» = Σ(تکرار × وزنه) فقط برای ست‌هایی که وزنه خارجی ثبت دارند.
 *     ست‌های وزن بدن (بدون بار خارجی) در حجم وارد نمی‌شوند و وزن بدن کاربر
 *     هرگز با وزنه تمرینی جمع نمی‌شود؛ پس حجم با حرکات وزن بدن مقایسه‌پذیر نیست.
 *  ۵. هفته بر اساس تقویم رسمی ایران است: هفته از شنبه شروع می‌شود و مرز روزها
 *     با زمان رسمی ایران (UTC+3:30 — ایران از ۱۴۰۱ ساعت تابستانی ندارد)
 *     محاسبه می‌شود.
 *  ۶. رکورد شخصی فقط با حداقل دو نقطه داده قابل‌مقایسه تعریف می‌شود و صرفِ
 *     تغییر وزنه پیشرفت قطعی نیست — در UI صادقانه بیان می‌شود.
 *  ۷. بدون داده، خروجی صفر/null است؛ هیچ عددی پر کردن ساخته نمی‌شود.
 */

import type { SessionStatus, SessionSummaryClient } from "./types";

/* ------------------------------ زمان و هفته ------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
/** زمان رسمی ایران: UTC+3:30 (بدون ساعت تابستانی از سال ۲۰۲۲) */
export const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

/** اندیس روز هفته ایران (۰=شنبه … ۶=جمعه) برای یک لحظه زمانی */
export function iranWeekdayIndex(timeMs: number): number {
  const shifted = new Date(timeMs + TEHRAN_OFFSET_MS);
  return (shifted.getUTCDay() + 1) % 7;
}

/**
 * آغاز هفته ایران (شنبه، ساعت ۰۰:۰۰ تهران) به‌صورت UTC millis.
 * روش: شیفت زمان به تهران، صفر کردن ساعت، بازگشت به UTC.
 */
export function startOfIranWeek(timeMs: number): number {
  const shifted = new Date(timeMs + TEHRAN_OFFSET_MS);
  const idx = iranWeekdayIndex(timeMs);
  const startShifted = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  ) - idx * DAY_MS;
  return startShifted - TEHRAN_OFFSET_MS;
}

const jalaliShortFormatter = new Intl.DateTimeFormat("fa-IR", {
  day: "numeric",
  month: "short",
});

/** برچسب کوتاه شمسی هفته (روز آغاز هفته) — روی زمان شیفت‌شده تهران */
export function iranWeekLabel(weekStartMs: number): string {
  return jalaliShortFormatter.format(new Date(weekStartMs + TEHRAN_OFFSET_MS));
}

/* ------------------------------ خلاصه جلسه ------------------------------ */

/** ورودی خلاصه‌ساز — زیرمجموعه‌ای از ساختار دیتابیس؛ برای تست مستقل خالص است */
export interface SessionSummaryInput {
  id: string;
  title: string;
  status: SessionStatus;
  startedAt: string;
  endedAt: string | null;
  exercises: {
    status: string;
    sets: { reps: number; weightKg: number | null }[];
  }[];
}

/** گرد کردن حجم به ۰٫۱ کیلوگرم برای جلوگیری از خطای اعشار شناور */
function roundVolume(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * خلاصه واقعی یک جلسه از رکوردهایش.
 * تعریف «حرکت انجام‌شده»: حرکتی با وضعیت done یا حداقل یک ست ثبت‌شده واقعی.
 * حرکت ردشده جدا شمرده می‌شود تا در جمع «انجام‌شده» دخالت نکند.
 */
export function computeSessionSummary(session: SessionSummaryInput): SessionSummaryClient {
  let exercisesDone = 0;
  let exercisesSkipped = 0;
  let setsCompleted = 0;
  let repsTotal = 0;
  let volumeKg = 0;

  for (const ex of session.exercises) {
    if (ex.status === "skipped" && ex.sets.length === 0) {
      exercisesSkipped += 1;
    }
    if (ex.status === "done" || ex.sets.length > 0) {
      exercisesDone += 1;
    }
    for (const set of ex.sets) {
      setsCompleted += 1;
      repsTotal += set.reps;
      // قاعده ۴: حجم فقط از ست‌های دارای بار خارجی
      if (set.weightKg !== null) {
        volumeKg += set.reps * set.weightKg;
      }
    }
  }

  const durationMinutes =
    session.endedAt !== null
      ? Math.max(
          0,
          Math.round(
            (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000
          )
        )
      : null;

  return {
    id: session.id,
    title: session.title,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMinutes,
    exercisesDone,
    exercisesTotal: session.exercises.length,
    exercisesSkipped,
    setsCompleted,
    repsTotal,
    volumeKg: roundVolume(volumeKg),
  };
}

/* ------------------------------ آمار کلی ------------------------------ */

export interface WeekBucket {
  /** آغاز هفته (شنبه) به ISO */
  weekStartIso: string;
  label: string;
  completedSessions: number;
}

export interface WorkoutStats {
  /** لحظه تولید آمار — شفافیت درباره «هفته جاری» */
  generatedAt: string;
  weekStartIso: string;
  /** آمار هفته جاری (شنبه تا امروز) — فقط جلسات تکمیل‌شده */
  thisWeek: {
    completedSessions: number;
    setsCompleted: number;
    repsTotal: number;
    durationMinutes: number;
  };
  /** مجموع بازه داده — فقط جلسات تکمیل‌شده؛ رهاشده جداگانه شمرده می‌شود */
  totals: {
    completedSessions: number;
    abandonedSessions: number;
    setsCompleted: number;
    repsTotal: number;
    /** حجم فقط از ست‌های دارای بار خارجی — با حرکات وزن بدن مقایسه‌پذیر نیست */
    volumeKg: number;
    durationMinutes: number;
  };
  /** روند ۶ هفته اخیر — قدیمی‌ترین اول؛ هفته‌های بدون جلسه صفر واقعی‌اند */
  weeklyTrend: WeekBucket[];
  /** آخرین جلسه تکمیل‌شده واقعی یا null */
  lastCompletedSession: SessionSummaryClient | null;
  /** خلاصه جلسه در حال انجام (در صورت وجود) — جدا از آمار تکمیل‌شده‌ها */
  activeSessionSummary: SessionSummaryClient | null;
}

const TREND_WEEKS = 6;

/**
 * آمار پیشرفت از خلاصه‌های واقعی جلسات.
 * ورودی باید شامل جلسات کامل باشد (storage سمت سرور بازه یک سال اخیر را
 * می‌خواند و این را مستند می‌کند)؛ مجموع‌ها فقط از همین داده محاسبه می‌شوند.
 */
export function computeWorkoutStats(
  summaries: SessionSummaryClient[],
  nowMs: number = Date.now()
): WorkoutStats {
  const currentWeekStart = startOfIranWeek(nowMs);

  const totals = {
    completedSessions: 0,
    abandonedSessions: 0,
    setsCompleted: 0,
    repsTotal: 0,
    volumeKg: 0,
    durationMinutes: 0,
  };
  const thisWeek = {
    completedSessions: 0,
    setsCompleted: 0,
    repsTotal: 0,
    durationMinutes: 0,
  };

  // سطل‌های روند — قدیمی‌ترین هفته اول
  const trendStart = currentWeekStart - (TREND_WEEKS - 1) * 7 * DAY_MS;
  const buckets: WeekBucket[] = [];
  for (let i = 0; i < TREND_WEEKS; i++) {
    const startMs = trendStart + i * 7 * DAY_MS;
    buckets.push({
      weekStartIso: new Date(startMs).toISOString(),
      label: iranWeekLabel(startMs),
      completedSessions: 0,
    });
  }

  let lastCompleted: SessionSummaryClient | null = null;
  let active: SessionSummaryClient | null = null;

  for (const s of summaries) {
    if (s.status === "in_progress") {
      // جلسه در حال انجام جدا گزارش می‌شود؛ در هیچ آمار تکمیل‌شده‌ای حساب نمی‌شود
      if (!active || new Date(s.startedAt) > new Date(active.startedAt)) {
        active = s;
      }
      continue;
    }
    if (s.status === "abandoned") {
      totals.abandonedSessions += 1;
      continue;
    }
    if (s.status !== "completed") continue;

    totals.completedSessions += 1;
    totals.setsCompleted += s.setsCompleted;
    totals.repsTotal += s.repsTotal;
    totals.volumeKg += s.volumeKg;
    totals.durationMinutes += s.durationMinutes ?? 0;

    const startedMs = new Date(s.startedAt).getTime();
    if (startedMs >= currentWeekStart && startedMs < currentWeekStart + 7 * DAY_MS) {
      thisWeek.completedSessions += 1;
      thisWeek.setsCompleted += s.setsCompleted;
      thisWeek.repsTotal += s.repsTotal;
      thisWeek.durationMinutes += s.durationMinutes ?? 0;
    }
    const bucketIndex = Math.floor((startedMs - trendStart) / (7 * DAY_MS));
    if (bucketIndex >= 0 && bucketIndex < TREND_WEEKS) {
      buckets[bucketIndex].completedSessions += 1;
    }
    if (!lastCompleted || new Date(s.startedAt) > new Date(lastCompleted.startedAt)) {
      lastCompleted = s;
    }
  }

  return {
    generatedAt: new Date(nowMs).toISOString(),
    weekStartIso: new Date(currentWeekStart).toISOString(),
    thisWeek,
    totals: { ...totals, volumeKg: roundVolume(totals.volumeKg) },
    weeklyTrend: buckets,
    lastCompletedSession: lastCompleted,
    activeSessionSummary: active,
  };
}

/* ------------------------------ روند یک حرکت ------------------------------ */

/** یک سطر تاریخچه یک حرکت مشخص — از جلسات تکمیل‌شده */
export interface ExerciseHistoryRow {
  sessionId: string;
  sessionTitle: string;
  startedAt: string;
  setsCount: number;
  totalReps: number;
  /** بهترین ست از نظر وزنه — null اگر هیچ ست آن جلسه وزنه نداشت */
  bestWeightKg: number | null;
  /** بیشترین تکرار در یک ست */
  bestReps: number | null;
}

export interface ExerciseProgressResult {
  rows: ExerciseHistoryRow[];
  /**
   * رکورد وزنه — فقط با حداقل دو جلسه دارای وزنه تعریف می‌شود (قاعده ۶)؛
   * با یک جلسه، مقدار null است و UI صادقانه «داده کافی نیست» نشان می‌دهد.
   */
  bestWeightKg: number | null;
  bestWeightKgDate: string | null;
  /**
   * رکورد تکرار در یک ست — فقط با حداقل دو جلسه دارای ست ثبت‌شده.
   * برای حرکات وزن بدن تنها سنجه مقایسه‌پذیر همین تکرار است.
   */
  bestReps: number | null;
  bestRepsDate: string | null;
  /** توضیح صادقانه قواعد مقایسه برای نمایش در UI */
  note: string;
}

/** ورودی — جلسات تکمیل‌شده با حرکات واقعی (شناسه پایدار بانک) */
export interface ExerciseProgressInput {
  id: string;
  title: string;
  startedAt: string;
  exercises: {
    exerciseId: string;
    sets: { reps: number; weightKg: number | null }[];
  }[];
}

export function computeExerciseProgress(
  sessions: ExerciseProgressInput[],
  exerciseId: string
): ExerciseProgressResult {
  const rows: ExerciseHistoryRow[] = [];

  for (const session of sessions) {
    const matched = session.exercises.filter((ex) => ex.exerciseId === exerciseId);
    for (const ex of matched) {
      if (ex.sets.length === 0) continue;
      const weights = ex.sets
        .map((s) => s.weightKg)
        .filter((w): w is number => w !== null);
      rows.push({
        sessionId: session.id,
        sessionTitle: session.title,
        startedAt: session.startedAt,
        setsCount: ex.sets.length,
        totalReps: ex.sets.reduce((sum, s) => sum + s.reps, 0),
        bestWeightKg: weights.length > 0 ? roundVolume(Math.max(...weights)) : null,
        bestReps: Math.max(...ex.sets.map((s) => s.reps)),
      });
    }
  }

  // جدیدترین اول
  rows.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const weightRows = rows.filter((r) => r.bestWeightKg !== null);
  const bestWeight =
    weightRows.length >= 2
      ? weightRows.reduce((best, r) => (r.bestWeightKg! > best.bestWeightKg! ? r : best))
      : null;
  const bestReps =
    rows.length >= 2
      ? rows.reduce((best, r) => ((r.bestReps ?? 0) > (best.bestReps ?? 0) ? r : best))
      : null;

  const notes: string[] = [];
  if (rows.length === 0) {
    notes.push("این حرکت هنوز در هیچ جلسه تکمیل‌شده‌ای ثبت نشده است.");
  } else {
    notes.push(
      "مقایسه فقط بین جلسات تکمیل‌شده انجام می‌شود؛ ست‌های رهاشده یا ناتمام در رکورد وارد نمی‌شوند."
    );
    if (weightRows.length === 1) {
      notes.push(
        "برای تعریف رکورد وزنه به حداقل دو جلسه با ثبت وزنه نیاز است؛ تغییر وزنه به‌تنهایی لزوماً پیشرفت قطعی نیست."
      );
    }
    if (rows.every((r) => r.bestWeightKg === null)) {
      notes.push(
        "این حرکت بدون بار خارجی ثبت شده است؛ تنها سنجه مقایسه‌پذیر آن تعداد تکرار است و برای آن حجم تمرینی جعل نمی‌شود."
      );
    }
  }

  return {
    rows,
    bestWeightKg: bestWeight?.bestWeightKg ?? null,
    bestWeightKgDate: bestWeight?.startedAt ?? null,
    bestReps: bestReps?.bestReps ?? null,
    bestRepsDate: bestReps?.startedAt ?? null,
    note: notes.join(" "),
  };
}
