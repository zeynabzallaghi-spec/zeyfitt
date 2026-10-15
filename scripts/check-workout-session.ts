/**
 * تست‌های موتور آمار ثبت تمرین واقعی — خالص، بدون دیتابیس و بدون داده ساختگی.
 * اجرا: bun scripts/check-workout-session.ts
 */

import {
  computeSessionSummary,
  computeWorkoutStats,
  computeExerciseProgress,
  startOfIranWeek,
  iranWeekdayIndex,
  TEHRAN_OFFSET_MS,
  type SessionSummaryClient,
} from "../src/lib/workout-session/stats";
import type { SetLogClient } from "../src/lib/workout-session/types";

let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail?: string) {
  if (cond) {
    pass++;
    console.log(`  ✔ ${name}`);
  } else {
    fail++;
    console.log(`  ✘ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

/** سازنده ست واقعی برای تست */
function set(setNumber: number, reps: number, weightKg: number | null): SetLogClient {
  return {
    id: `set-${setNumber}-${reps}-${weightKg}`,
    setNumber,
    reps,
    weightKg,
    note: null,
    updatedAt: new Date().toISOString(),
  };
}

/* ----------------------------- ۱) خلاصه جلسه ----------------------------- */

section("۱) خلاصه جلسه — فقط ست‌های واقعی");
{
  const s = computeSessionSummary({
    id: "s1",
    title: "تست",
    status: "completed",
    startedAt: "2026-10-10T10:00:00.000Z",
    endedAt: "2026-10-10T11:10:00.000Z",
    exercises: [
      // انجام‌شده با دو ست بار خارجی + یک ست وزن بدن
      {
        status: "done",
        sets: [set(1, 10, 40), set(2, 8, 50), set(3, 12, null)],
      },
      // ردشده بدون ست
      { status: "skipped", sets: [] },
      // باقی‌مانده ولی یک ست ثبت‌شده (نیمه‌کاره واقعی)
      { status: "pending", sets: [set(1, 15, null)] },
    ],
  });
  check("حرکات انجام‌شده = ۲ (done یا دارای ست)", s.exercisesDone === 2, `${s.exercisesDone}`);
  check("حرکات ردشده = ۱", s.exercisesSkipped === 1, `${s.exercisesSkipped}`);
  check("مجموع کل حرکات = ۳", s.exercisesTotal === 3, `${s.exercisesTotal}`);
  check("ست‌های ثبت‌شده = ۴", s.setsCompleted === 4, `${s.setsCompleted}`);
  check("مجموع تکرار = ۴۵", s.repsTotal === 45, `${s.repsTotal}`);
  // حجم فقط از ست‌های دارای بار خارجی: 10×40 + 8×50 = 800
  check("حجم = ۸۰۰ (وزن بدن حساب نمی‌شود)", s.volumeKg === 800, `${s.volumeKg}`);
  check("مدت = ۷۰ دقیقه از زمان‌های ثبت‌شده", s.durationMinutes === 70, `${s.durationMinutes}`);
}
{
  const s = computeSessionSummary({
    id: "s2",
    title: "بدون پایان",
    status: "in_progress",
    startedAt: "2026-10-10T10:00:00.000Z",
    endedAt: null,
    exercises: [{ status: "pending", sets: [] }],
  });
  check("جلسه بدون پایان ثبت‌شده مدت ندارد (null)", s.durationMinutes === null, `${s.durationMinutes}`);
}
{
  // پایان قبل از شروع (داده نامعتبر) — منفی نمی‌شود
  const s = computeSessionSummary({
    id: "s3",
    title: "ناسازگار",
    status: "completed",
    startedAt: "2026-10-10T12:00:00.000Z",
    endedAt: "2026-10-10T11:00:00.000Z",
    exercises: [],
  });
  check("مدت منفی صفر می‌شود", s.durationMinutes === 0, `${s.durationMinutes}`);
}

/* ----------------------------- ۲) هفته ایران ----------------------------- */

section("۲) هفته رسمی ایران — شروع از شنبه");
{
  // ۲۰۲۶-۱۰-۱۴ چهارشنبه است (به وقت ایران) — شنبه همان هفته ۲۰۲۶-۱۰-۱۰
  const wedMs = Date.UTC(2026, 9, 14, 12, 0, 0);
  check("اندیس روز هفته برای چهارشنبه = ۴", iranWeekdayIndex(wedMs) === 4, `${iranWeekdayIndex(wedMs)}`);
  const weekStart = startOfIranWeek(wedMs);
  check("آغاز هفته شنبه است", iranWeekdayIndex(weekStart) === 0, `${iranWeekdayIndex(weekStart)}`);
  const daysDiff = Math.floor((wedMs - weekStart) / 86400000);
  check("شنبه تا چهارشنبه = ۴ روز", daysDiff === 4, `${daysDiff}`);
  // ۲۰۲۶-۱۰-۱۷ شنبه است (اندیس ۰) و ۲۰۲۶-۱۰-۲۳ جمعه (اندیس ۶) — آخرین روز هفته
  check("شنبه اندیس ۰ دارد", iranWeekdayIndex(Date.UTC(2026, 9, 17, 12, 0, 0)) === 0, `${iranWeekdayIndex(Date.UTC(2026, 9, 17, 12, 0, 0))}`);
  check("جمعه اندیس ۶ دارد", iranWeekdayIndex(Date.UTC(2026, 9, 23, 12, 0, 0)) === 6, `${iranWeekdayIndex(Date.UTC(2026, 9, 23, 12, 0, 0))}`);
}

/* ----------------------------- ۳) آمار کلی ----------------------------- */

section("۳) آمار کلی — فقط تکمیل‌شده‌ها جمع می‌شوند");
{
  const nowMs = Date.UTC(2026, 9, 14, 10, 0, 0); // سه‌شنبه
  const mkSummary = (over: Partial<SessionSummaryClient>): SessionSummaryClient => ({
    id: "x",
    title: "جلسه",
    status: "completed",
    startedAt: "2026-10-14T08:00:00.000Z",
    endedAt: "2026-10-14T09:00:00.000Z",
    durationMinutes: 60,
    exercisesDone: 2,
    exercisesTotal: 2,
    exercisesSkipped: 0,
    setsCompleted: 6,
    repsTotal: 60,
    volumeKg: 500,
    ...over,
  });
  const summaries: SessionSummaryClient[] = [
    mkSummary({ id: "c1" }), // همین هفته
    mkSummary({ id: "c2", startedAt: "2026-10-13T08:00:00.000Z", volumeKg: 250 }), // همین هفته
    mkSummary({
      id: "a1",
      status: "abandoned",
      startedAt: "2026-10-12T08:00:00.000Z",
      setsCompleted: 2,
      repsTotal: 20,
      volumeKg: 100,
    }),
    mkSummary({
      id: "p1",
      status: "in_progress",
      startedAt: "2026-10-14T09:30:00.000Z",
      setsCompleted: 1,
      repsTotal: 10,
      volumeKg: 0,
      durationMinutes: null,
    }),
  ];
  const stats = computeWorkoutStats(summaries, nowMs);
  check("تکمیل‌شده کل = ۲", stats.totals.completedSessions === 2, `${stats.totals.completedSessions}`);
  check("رهاشده جدا شمرده شد = ۱", stats.totals.abandonedSessions === 1, `${stats.totals.abandonedSessions}`);
  check("جلسه در حال انجام در هیچ آماری جمع نشد", !stats.totals || stats.totals.setsCompleted === 12, `${stats.totals.setsCompleted}`);
  check("هفته جاری = ۲ جلسه", stats.thisWeek.completedSessions === 2, `${stats.thisWeek.completedSessions}`);
  check("ست‌های هفته = ۱۲", stats.thisWeek.setsCompleted === 12, `${stats.thisWeek.setsCompleted}`);
  check("حجم هفته شامل رهاشده نیست (۷۵۰)", stats.totals.volumeKg === 750, `${stats.totals.volumeKg}`);
  check("آخرین جلسه تکمیل‌شده درست است", stats.lastCompletedSession?.id === "c1", `${stats.lastCompletedSession?.id}`);
  check("خلاصه جلسه فعال جدا گزارش شد", stats.activeSessionSummary?.id === "p1", `${stats.activeSessionSummary?.id}`);
  check("روند ۶ هفته ساخته شد", stats.weeklyTrend.length === 6, `${stats.weeklyTrend.length}`);
  const lastBucket = stats.weeklyTrend[stats.weeklyTrend.length - 1];
  check("هفته جاری در آخرین سطل روند = ۲", lastBucket.completedSessions === 2, `${lastBucket.completedSessions}`);
}
{
  section("۴) بدون داده — هیچ عددی پر کردن نمی‌شود");
  const stats = computeWorkoutStats([], Date.UTC(2026, 9, 14, 10, 0, 0));
  check("بدون جلسه: تکمیل‌شده = ۰", stats.totals.completedSessions === 0);
  check("بدون جلسه: آخرین جلسه null", stats.lastCompletedSession === null);
  check("بدون جلسه: جلسه فعال null", stats.activeSessionSummary === null);
  check("بدون جلسه: ست‌های هفته = ۰", stats.thisWeek.setsCompleted === 0);
}

/* ----------------------------- ۵) روند یک حرکت ----------------------------- */

section("۵) روند حرکت — رکورد فقط با دو نقطه داده");
{
  const sessions = [
    {
      id: "s1",
      title: "جلسه یک",
      startedAt: "2026-10-01T10:00:00.000Z",
      exercises: [
        { exerciseId: "pushup", sets: [{ reps: 15, weightKg: null }, { reps: 12, weightKg: null }] },
      ],
    },
    {
      id: "s2",
      title: "جلسه دو",
      startedAt: "2026-10-08T10:00:00.000Z",
      exercises: [
        { exerciseId: "pushup", sets: [{ reps: 20, weightKg: null }] },
      ],
    },
  ];
  const p = computeExerciseProgress(sessions, "pushup");
  check("دو سطر تاریخچه", p.rows.length === 2, `${p.rows.length}`);
  check("جدیدترین اول", p.rows[0].startedAt > p.rows[1].startedAt);
  check("رکورد تکرار = ۲۰", p.bestReps === 20, `${p.bestReps}`);
  check("رکورد وزنه null (حرکت بی‌بار)", p.bestWeightKg === null, `${p.bestWeightKg}`);
  check("یادداشت صادقانه حرکت بی‌بار", p.note.includes("بدون بار خارجی"), p.note);
}
{
  const sessions = [
    {
      id: "s1",
      title: "یک جلسه فقط",
      startedAt: "2026-10-08T10:00:00.000Z",
      exercises: [{ exerciseId: "bench", sets: [{ reps: 8, weightKg: 60 }] }],
    },
  ];
  const p = computeExerciseProgress(sessions, "bench");
  check("با یک جلسه رکورد وزنه تعریف نمی‌شود", p.bestWeightKg === null, `${p.bestWeightKg}`);
  check("با یک جلسه رکورد تکرار هم تعریف نمی‌شود", p.bestReps === null, `${p.bestReps}`);
  check("یادداشت نیاز به دو نقطه داده", p.note.includes("دو جلسه"), p.note);
}
{
  const sessions = [
    {
      id: "s1",
      title: "جلسه یک",
      startedAt: "2026-10-01T10:00:00.000Z",
      exercises: [{ exerciseId: "bench", sets: [{ reps: 8, weightKg: 60 }, { reps: 6, weightKg: 70 }] }],
    },
    {
      id: "s2",
      title: "جلسه دو",
      startedAt: "2026-10-08T10:00:00.000Z",
      exercises: [{ exerciseId: "bench", sets: [{ reps: 8, weightKg: 75 }] }],
    },
  ];
  const p = computeExerciseProgress(sessions, "bench");
  check("رکورد وزنه = ۷۵", p.bestWeightKg === 75, `${p.bestWeightKg}`);
  check("تاریخ رکورد = جلسه دوم", p.bestWeightKgDate === "2026-10-08T10:00:00.000Z");
}
{
  const p = computeExerciseProgress([], "bench");
  check("حرکت ثبت‌نشده: هیچ سطری ندارد", p.rows.length === 0);
  check("یادداشت ثبت‌نشده بودن", p.note.includes("ثبت نشده"));
}

/* ----------------------------- نتیجه ----------------------------- */

console.log("\n========================================");
console.log(`نتیجه: ${pass} پاس / ${fail} شکست`);
if (fail > 0) process.exit(1);
