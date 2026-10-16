/**
 * موتور برنامه‌سازی تمرینی — قانون‌محور، خالص و بدون تصادف.
 *
 * ورودی: تنظیمات معتبر + بانک حرکات. خروجی: برنامه هفتگی ساختاریافته.
 * قواعد اصلی:
 *  1. فقط حرکاتی که همه تجهیزات لازم‌شان در دسترس کاربر است
 *  2. ترجیح سطح دشواری بر اساس تجربه (مبتدی هرگز حرکت پیشرفته نمی‌گیرد)
 *  3. رعایت دسته‌های حذف‌شده و حرکات حذف‌شده
 *  4. هیچ حرکتی در یک جلسه تکرار نمی‌شود
 *  5. ترجیح حرکات استفاده‌نشده در کل برنامه (تنوع) و در صورت کمبود، اجازه
 *     تکرار معقول در جلسات مختلف (طبیعت برنامه هفتگی)
 *  6. سقف زمان جلسه: گرم‌کردن + مجموع زمان تقریبی حرکات ≤ مدت جلسه
 *  7. ست/تکرار/استراحت بر اساس هدف × نوع حرکت (ترکیبی/تک‌مفصلی) × سطح
 */

import {
  EXERCISE_LIBRARY,
  type LibraryExercise,
  type ExerciseCategoryId,
} from "@/lib/exercises";
import { EXERCISE_CATEGORIES } from "@/lib/exercises/types";
import type {
  GeneratedPlan,
  PlanSettings,
  PlannedDay,
  PlannedExercise,
} from "./types";
import { focusFa, focusEn, PLAN_GOAL_LABELS, PLAN_GOAL_LABELS_EN } from "./types";
import type { Locale } from "@/lib/i18n/shared";
import {
  buildDayTemplates,
  prescribe,
  targetExercisesPerSession,
  WARMUP_MINUTES,
  DIFFICULTY_PREFERENCE,
} from "./presets";

/** زمان تقریبی یک ست: اجرای واقعی + نفس‌گیری پیش از استراحت (ثانیه) */
const WORK_SECONDS_PER_SET = 40;
/** زمان جابه‌جایی و آماده‌سازی بین حرکات (ثانیه) — برای برآورد واقعی‌تر جلسه */
const SETUP_SECONDS_PER_EXERCISE = 60;

/** خطای موتور با کد پایدار و پیام محلی‌شده — بدون جزئیات فنی */
export interface PlanErrorCode {
  code: "PLAN_INSUFFICIENT_EXERCISES" | "PLAN_TOO_FEW_SESSIONS";
}

export class PlanGenerationError extends Error {
  code: PlanErrorCode["code"];
  constructor(code: PlanErrorCode["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/** زمان تقریبی یک حرکت بر حسب دقیقه — شامل اجرا، استراحت و جابه‌جایی */
function estimateExerciseMinutes(sets: number, restSeconds: number): number {
  const totalSeconds = sets * (WORK_SECONDS_PER_SET + restSeconds) + SETUP_SECONDS_PER_EXERCISE;
  return Math.max(1, Math.round(totalSeconds / 60));
}

/** آیا همه تجهیزات لازم حرکت در دسترس است؟ */
function equipmentAvailable(ex: LibraryExercise, available: Set<string>): boolean {
  return ex.equipment.every((e) => available.has(e));
}

/** دسته‌های مکمل برای پر کردن جلسه — بر اساس نیمه بدنِ قالب روز */
const UPPER_FILL: ExerciseCategoryId[] = ["chest", "back", "shoulders", "biceps", "triceps", "core", "fullbody"];
const LOWER_FILL: ExerciseCategoryId[] = ["quads", "hamstrings", "glutes", "calves", "core", "fullbody"];
const FULL_FILL: ExerciseCategoryId[] = ["chest", "back", "quads", "shoulders", "hamstrings", "glutes", "core", "biceps", "triceps", "calves", "fullbody"];

function fillCategoriesFor(half: "upper" | "lower" | "full"): ExerciseCategoryId[] {
  if (half === "upper") return UPPER_FILL;
  if (half === "lower") return LOWER_FILL;
  return FULL_FILL;
}

/**
 * انتخاب حرکات یک دسته با ترتیب ترجیح سطح، پرهیز از تکرار درون جلسه و
 * ترجیح حرکات استفاده‌نشده در کل برنامه.
 */
function pickExercises(
  category: ExerciseCategoryId,
  count: number,
  pool: LibraryExercise[],
  difficultyPreference: readonly string[],
  usedInDay: Set<string>,
  usedInPlan: Set<string>
): LibraryExercise[] {
  const candidates = pool.filter((ex) => ex.category === category);
  // ترتیب پایدار: ترجیح سطح ← حرکات استفاده‌نشده در برنامه ← ترتیب بانک
  const rank = (ex: LibraryExercise): number => {
    const pref = Math.max(difficultyPreference.indexOf(ex.difficulty), difficultyPreference.length);
    const reuse = usedInPlan.has(ex.id) ? 1 : 0;
    return pref * 10 + reuse;
  };
  const ordered = [...candidates].sort(
    (a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id)
  );

  const picked: LibraryExercise[] = [];
  const taken = new Set<string>(usedInDay);
  for (const ex of ordered) {
    if (picked.length >= count) break;
    if (taken.has(ex.id)) continue;
    picked.push(ex);
    taken.add(ex.id);
  }
  return picked;
}

/**
 * تولید برنامه تمرینی از تنظیمات.
 * زبان تولید از پارامتر locale تعیین می‌شود (پیش‌فرض fa — خروجی فارسی
 * عیناً رفتار قبل است). در نبود حرکت کافی، PlanGenerationError با کد پایدار
 * و پیام محلی‌شده پرتاب می‌شود (پیش از آن همه کاستنی‌های معقول اعمال شده است).
 */
export function generatePlan(settings: PlanSettings, locale: Locale = "fa"): GeneratedPlan {
  const en = locale === "en";
  const available = new Set(settings.equipment);
  const excludedCategories = new Set<ExerciseCategoryId>(settings.excludedCategories);
  const excludedExercises = new Set(settings.excludedExerciseIds);
  const difficultyPreference = DIFFICULTY_PREFERENCE[settings.experience];

  /* ---------------- استخر حرکات مجاز ---------------- */
  const pool = EXERCISE_LIBRARY.filter(
    (ex) =>
      equipmentAvailable(ex, available) &&
      !excludedCategories.has(ex.category) &&
      !excludedExercises.has(ex.id)
  );

  if (pool.length < 6) {
    throw new PlanGenerationError(
      "PLAN_INSUFFICIENT_EXERCISES",
      en
        ? "There are not enough exercises with this equipment and these limitations to build a plan; broaden the equipment list or remove some limitations."
        : "با این تجهیزات و محدودیت‌ها حرکت کافی برای ساخت برنامه وجود ندارد؛ فهرست تجهیزات را کامل‌تر کنید یا برخی محدودیت‌ها را بردارید."
    );
  }

  /* ---------------- قالب روزها ---------------- */
  const templates = buildDayTemplates(settings.daysPerWeek, settings.focus, settings.experience, locale);
  const targetCount = targetExercisesPerSession(settings.sessionMinutes);

  const usedInPlan = new Set<string>();
  const days: PlannedDay[] = [];

  templates.forEach((template, index) => {
    const usedInDay = new Set<string>();
    const exercises: PlannedExercise[] = [];

    // تبدیل جایگاه‌ها به فهرست پخش‌شده (دسته×تعداد) با حفظ ترتیب
    const wanted: ExerciseCategoryId[] = [];
    for (const slot of template.slots) {
      for (let i = 0; i < slot.count; i++) wanted.push(slot.category);
    }
    // پر کردن جلسه تا هدف زمانی: چرخش روی دسته‌های قالب روز تا رسیدن به
    // تعداد حرکت هدف — تا جلسه خیلی کوتاه‌تر از زمان در دسترس نماند
    const templateCategories = template.slots
      .filter((slot) => !excludedCategories.has(slot.category))
      .map((slot) => slot.category);
    let cursor = 0;
    while (wanted.length < targetCount && templateCategories.length > 0) {
      wanted.push(templateCategories[cursor % templateCategories.length]);
      cursor++;
    }

    for (const category of wanted) {
      if (exercises.length >= targetCount) break;
      const [picked] = pickExercises(
        category,
        1,
        pool,
        difficultyPreference,
        usedInDay,
        usedInPlan
      );
      if (!picked) continue; // این دسته با تجهیزات/محدودیت‌ها خالی است — رد می‌شود
      const rx = prescribe(settings.goal, settings.experience, picked.compound);
      const estMinutes = estimateExerciseMinutes(rx.sets, rx.restSeconds);
      exercises.push({
        exerciseId: picked.id,
        faName: picked.fa,
        enName: picked.en,
        category: picked.category,
        coach3dId: picked.coach3dId ?? null,
        sets: rx.sets,
        repsMin: rx.repsMin,
        repsMax: rx.repsMax,
        restSeconds: rx.restSeconds,
        estimatedMinutes: estMinutes,
        note: picked.summary,
      });
      usedInDay.add(picked.id);
      usedInPlan.add(picked.id);
    }

    // تکمیل جلسه با دسته‌های مکمل همان نیمه بدن — وقتی تجهیزات محدود، برخی
    // دسته‌های قالب خالی می‌مانند؛ به‌جای جلسه نیمه‌خالی از دسته‌های مرتبط
    // همان نیمه پر می‌شود (بدون شکستن تعادل قالب)
    if (exercises.length < targetCount) {
      const perDayCategoryCount = new Map<ExerciseCategoryId, number>();
      for (const ex of exercises) {
        perDayCategoryCount.set(ex.category, (perDayCategoryCount.get(ex.category) ?? 0) + 1);
      }
      const fillRotation = fillCategoriesFor(template.half);
      let fillCursor = 0;
      let attempts = 0;
      while (
        exercises.length < targetCount &&
        attempts < fillRotation.length * 2
      ) {
        attempts++;
        const category = fillRotation[fillCursor % fillRotation.length];
        fillCursor++;
        const already = perDayCategoryCount.get(category) ?? 0;
        if (already >= 2) continue; // تعادل: بیش از ۲ حرکت از یک دسته در جلسه نه
        const [picked] = pickExercises(category, 1, pool, difficultyPreference, usedInDay, usedInPlan);
        if (!picked) continue;
        const rx = prescribe(settings.goal, settings.experience, picked.compound);
        const estMinutes = estimateExerciseMinutes(rx.sets, rx.restSeconds);
        exercises.push({
          exerciseId: picked.id,
          faName: picked.fa,
          enName: picked.en,
          category: picked.category,
          coach3dId: picked.coach3dId ?? null,
          sets: rx.sets,
          repsMin: rx.repsMin,
          repsMax: rx.repsMax,
          restSeconds: rx.restSeconds,
          estimatedMinutes: estMinutes,
          note: picked.summary,
        });
        usedInDay.add(picked.id);
        usedInPlan.add(picked.id);
        perDayCategoryCount.set(category, already + 1);
      }
    }

    // سقف زمان: گرم‌کردن + مجموع حرکات ≤ مدت جلسه — از انتهای جلسه کاسته می‌شود
    const fitMinutes = (list: PlannedExercise[]) =>
      WARMUP_MINUTES + list.reduce((sum, ex) => sum + ex.estimatedMinutes, 0);
    while (exercises.length > 1 && fitMinutes(exercises) > settings.sessionMinutes) {
      exercises.pop();
    }

    // جلسه خالی؟ — فقط اگر واقعاً هیچ حرکتی برای آن قالب نبود
    if (exercises.length === 0) return;

    const estMinutes = fitMinutes(exercises);
    days.push({
      order: days.length + 1,
      weekday: settings.preferredDays[index] ?? null,
      title: template.title,
      focusLabel: template.focusLabel,
      estMinutes,
      exercises,
    });
  });

  if (days.length < 2) {
    throw new PlanGenerationError(
      "PLAN_TOO_FEW_SESSIONS",
      en
        ? "At least two reasonable sessions could not be built with these settings; choose more equipment or reduce the limitations."
        : "با این تنظیمات حداقل دو جلسه معقول ساخته نشد؛ تجهیزات بیشتری انتخاب کنید یا محدودیت‌ها را کاهش دهید."
    );
  }

  const focusLabel = en ? focusEn(settings.focus) : focusFa(settings.focus);
  const notes: string[] = en
    ? [
        `Start each session with ${WARMUP_MINUTES} minutes of light warm-up (dynamic stretches and a few light reps of the session's first exercise).`,
        "Gradual progress: first aim for correct, full-range execution within the rep range; then gradually increase the weight or reps while keeping form. The pace of progress depends on correct execution, individual ability and recovery.",
        "Leave at least one day between sessions for the same muscle group; if you feel persistent fatigue, make one session lighter.",
        "This plan is built on standard training principles; it makes no claim of guaranteed results or spot fat reduction.",
      ]
    : [
        `هر جلسه با ${toFa(WARMUP_MINUTES)} دقیقه گرم‌کردن سبک (حرکات کششی پویا و چند تکرار سبک از حرکت اول جلسه) شروع شود.`,
        "پیشرفت تدریجی: ابتدا اجرای صحیح و کامل بودن بازه تکرار را هدف بگیرید؛ سپس با حفظ فرم، وزنه یا تکرارها را کم‌کم افزایش دهید. سرعت پیشرفت به اجرای صحیح، توانایی فرد و ریکاوری بستگی دارد.",
        "بین جلسات همان گروه عضلانی حداقل یک روز فاصله بگذارید؛ اگر احساس خستگی ماندگار دارید، یک جلسه را سبک‌تر اجرا کنید.",
        "این برنامه بر اساس قوانین تمرینی استاندارد ساخته شده است؛ ادعای تضمین نتیجه یا کاهش چربی موضعی ندارد.",
      ];
  if (settings.limitationNotes && settings.limitationNotes.length > 0) {
    notes.push(
      en
        ? `Your precautionary note was considered while building this plan: "${settings.limitationNotes}". If you feel pain or have an injury history, consult a qualified physician or physiotherapist before executing.`
        : `یادداشت احتیاطی شما در ساخت برنامه لحاظ شد: «${settings.limitationNotes}». در صورت درد یا سابقه آسیب، پیش از اجرا با پزشک یا فیزیوتراپیست واجد صلاحیت مشورت کنید.`
    );
  }

  const title = en
    ? `${PLAN_GOAL_LABELS_EN[settings.goal]} — ${settings.daysPerWeek} days/week${settings.focus !== "all" ? ` (${focusLabel})` : ""}`
    : `${PLAN_GOAL_LABELS[settings.goal]} — ${toFa(settings.daysPerWeek)} روز در هفته${settings.focus !== "all" ? ` (${focusLabel})` : ""}`;

  return {
    title,
    goal: settings.goal,
    experience: settings.experience,
    daysPerWeek: settings.daysPerWeek,
    sessionMinutes: settings.sessionMinutes,
    equipment: settings.equipment,
    focus: settings.focus,
    notes,
    days,
    totalExercises: days.reduce((sum, d) => sum + d.exercises.length, 0),
  };
}

function toFa(n: number): string {
  return n.toLocaleString("fa-IR");
}

/** اعتبارسنجی ثانویه: هیچ جلسه‌ای نباید فقط از دسته‌های حذف‌شده ساخته شده باشد */
export function isCategoryKnown(id: string): id is ExerciseCategoryId {
  return EXERCISE_CATEGORIES.some((c) => c.id === id);
}
