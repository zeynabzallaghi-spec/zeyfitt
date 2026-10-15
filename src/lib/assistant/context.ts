/**
 * سازنده زمینه شخصی‌سازی‌شده — سمت سرور و فقط پس از تأیید نشست فراخوانی
 * می‌شود. داده‌های همان کاربرِ احراز‌هویت‌شده و فقط به حداقل لازم برای پاسخ
 * خوانده می‌شود؛ داده غیرمرتبط (ایمیل، هش رمز، شناسه‌های داخلی و …) هرگز
 * وارد زمینه مدل نمی‌شود.
 *
 * قواعد صداقت:
 *  - برنامه و تمرینِ انجام‌شده جدا گزارش می‌شوند؛ وجود برنامه به معنی
 *    اجرای آن نیست.
 *  - مقادیر تغذیه «تخمینی» معرفی می‌شوند، نه اندازه‌گیری دقیق.
 *  - نبود داده صادقانه اعلام می‌شود (بلاک خالی یا پیام «ثبت نشده»).
 *  - اعداد و واحدها عیناً همان ثبت‌شده‌اند؛ هیچ مقداری ساخته نمی‌شود.
 */

import { db } from "@/lib/db";
import {
  GOAL_OPTIONS,
  EXPERIENCE_OPTIONS,
  EQUIPMENT_OPTIONS,
  LIMITATION_OPTIONS,
  DIET_OPTIONS,
  ALLERGY_OPTIONS,
  labelOf,
} from "@/lib/profile";
import type { CalcSnapshot } from "@/lib/nutrition-engine/types";

/** حداکثر جلسات تکمیل‌شده اخیر در زمینه */
const RECENT_SESSIONS = 5;
/** حداکثر اندازه‌گیری وزن در زمینه */
const RECENT_WEIGHTS = 8;
/** سقف نرم طول بلاک زمینه (نویسه) — جلوگیری از سرریز زمینه مدل */
const CONTEXT_SOFT_MAX = 2600;

function shortDate(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function cut(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** خواندن پروفایل — فقط فیلدهای مرتبط با مربی‌گری */
function profileSection(row: {
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: string | null;
  experience: string | null;
  trainingDaysPerWeek: number | null;
  sessionMinutes: number | null;
  equipmentJson: string;
  limitationsJson: string;
  limitationNotes: string | null;
  diet: string | null;
  allergiesJson: string;
  units: string;
} | null): string[] {
  if (!row) return ["- profile: not created yet"];

  const lines: string[] = [];
  const parse = (value: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  };

  const basics: string[] = [];
  if (row.age !== null) basics.push(`age=${row.age}`);
  if (row.gender) basics.push(`gender=${row.gender}`);
  if (row.heightCm !== null) basics.push(`height=${row.heightCm}cm`);
  if (row.weightKg !== null) basics.push(`weight=${row.weightKg}kg`);
  if (basics.length > 0) lines.push(`- profile: ${basics.join(", ")}`);

  if (row.goal) lines.push(`- goal: ${row.goal} (${labelOf(GOAL_OPTIONS, row.goal)})`);
  if (row.experience) lines.push(`- experience: ${row.experience} (${labelOf(EXPERIENCE_OPTIONS, row.experience)})`);
  if (row.trainingDaysPerWeek) lines.push(`- training days/week: ${row.trainingDaysPerWeek}`);
  if (row.sessionMinutes) lines.push(`- session minutes: ${row.sessionMinutes}`);

  const equipment = parse(row.equipmentJson).map((code) => labelOf(EQUIPMENT_OPTIONS, code));
  if (equipment.length > 0) lines.push(`- equipment: ${equipment.join(", ")}`);

  const limitations = parse(row.limitationsJson).map((code) => labelOf(LIMITATION_OPTIONS, code));
  if (limitations.length > 0) lines.push(`- movement limitations: ${limitations.join(", ")}`);
  if (row.limitationNotes) lines.push(`- limitation notes: ${cut(row.limitationNotes, 200)}`);

  if (row.diet) lines.push(`- diet pattern: ${row.diet} (${labelOf(DIET_OPTIONS, row.diet)})`);
  const allergies = parse(row.allergiesJson).map((code) => labelOf(ALLERGY_OPTIONS, code));
  if (allergies.length > 0) lines.push(`- allergies: ${allergies.join(", ")}`);

  return lines.length > 0 ? lines : ["- profile: created but empty"];
}

/** برنامه تمرینی فعال — برنامه است، نه تمرین انجام‌شده */
async function planSection(userId: string): Promise<string[]> {
  const plan = await db.workoutPlan.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: {
      title: true,
      goal: true,
      daysPerWeek: true,
      days: {
        orderBy: { order: "asc" },
        select: {
          title: true,
          exercises: {
            orderBy: { order: "asc" },
            select: { faName: true, enName: true, sets: true, repsMin: true, repsMax: true },
          },
        },
      },
    },
  });
  if (!plan) return ["- active workout plan: none"];

  const lines = [`- active workout plan: «${plan.title}» (${plan.daysPerWeek} days/week, goal=${plan.goal}) — PLANNED, not necessarily performed:`];
  for (const day of plan.days.slice(0, 6)) {
    const exSummary = day.exercises
      .slice(0, 8)
      .map((ex) => `${ex.enName} / ${ex.faName} ${ex.sets}×${ex.repsMin}-${ex.repsMax}`)
      .join("؛ ");
    lines.push(`  · Day «${day.title}»: ${cut(exSummary, 300)}`);
  }
  return lines;
}

/** جلسات واقعی ثبت‌شده — فقط تکمیل‌شده‌ها آمار اصلی‌اند؛ در حال انجام جدا */
async function sessionsSection(userId: string): Promise<string[]> {
  const sessions = await db.workoutSession.findMany({
    where: { userId },
    orderBy: { startedAt: "desc" },
    take: RECENT_SESSIONS + 2,
    select: {
      title: true,
      status: true,
      startedAt: true,
      endedAt: true,
      exercises: {
        select: {
          status: true,
          faName: true,
          enName: true,
          sets: { select: { reps: true, weightKg: true } },
        },
      },
    },
  });

  if (sessions.length === 0) return ["- real logged workouts: none yet"];

  const lines: string[] = [];
  const inProgress = sessions.find((s) => s.status === "in_progress");
  if (inProgress) {
    lines.push(`  · IN PROGRESS now: «${inProgress.title}» started ${shortDate(inProgress.startedAt.toISOString())} (not finished yet)`);
  }

  const completed = sessions.filter((s) => s.status === "completed").slice(0, RECENT_SESSIONS);
  if (completed.length === 0) {
    lines.push("- real completed workouts: none yet (only completed sessions count as real training)");
    return lines;
  }

  lines.push(`- real completed workouts (latest ${completed.length}):`);
  for (const s of completed) {
    const sets = s.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
    const reps = s.exercises.reduce((acc, ex) => acc + ex.sets.reduce((a, st) => a + st.reps, 0), 0);
    const minutes =
      s.endedAt !== null
        ? Math.max(0, Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000))
        : null;
    const names = s.exercises
      .filter((ex) => ex.sets.length > 0 || ex.status === "done")
      .slice(0, 6)
      .map((ex) => ex.enName)
      .join(", ");
    lines.push(
      `  · ${shortDate(s.startedAt.toISOString())} «${s.title}» — ${sets} sets, ${reps} total reps${minutes !== null ? `, ${minutes} min` : ""}, exercises: ${cut(names, 200)}`
    );
  }
  return lines;
}

/** روند وزن — فقط اندازه‌گیری‌های واقعی تاریخ‌دار */
async function weightSection(userId: string): Promise<string[]> {
  const entries = await db.weightEntry.findMany({
    where: { userId },
    orderBy: { recordedAt: "desc" },
    take: RECENT_WEIGHTS,
    select: { weightKg: true, recordedAt: true },
  });
  if (entries.length === 0) return ["- weight history: no measurements recorded yet"];

  const sorted = [...entries].reverse(); // قدیمی → جدید
  const points = sorted.map((e) => `${shortDate(e.recordedAt.toISOString())}=${e.weightKg}kg`);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const diff = Number((last.weightKg - first.weightKg).toFixed(1));
  const direction = Math.abs(diff) < 0.15 ? "stable" : diff > 0 ? "up" : "down";
  return [
    `- weight history (real measurements, oldest→latest): ${points.join(", ")} — overall change ${diff >= 0 ? "+" : ""}${diff}kg (${direction})`,
  ];
}

/** برنامه غذایی فعال — مقادیر تخمینی نرم‌افزار */
async function nutritionSection(userId: string): Promise<string[]> {
  const plan = await db.nutritionPlan.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { title: true, goal: true, mealsPerDay: true, caution: true, calcJson: true },
  });
  if (!plan) return ["- active nutrition plan: none"];

  let calc: CalcSnapshot | null = null;
  try {
    const parsed: unknown = JSON.parse(plan.calcJson);
    if (parsed && typeof parsed === "object") calc = parsed as CalcSnapshot;
  } catch {
    calc = null;
  }

  const lines = [`- active nutrition plan: «${plan.title}» (goal=${plan.goal}, ${plan.mealsPerDay} meals/day)`];
  if (plan.caution) {
    lines.push("  · caution mode: no personal calorie target provided by the software (under 18 / pregnancy)");
  } else if (calc?.targetKcal != null) {
    const macros = calc.macros;
    lines.push(
      `  · software ESTIMATES (not exact measurements): target ${calc.targetKcal} kcal/day` +
        (macros ? `, protein ${macros.proteinG}g, carb ${macros.carbG}g, fat ${macros.fatG}g` : "")
    );
  } else {
    lines.push("  · calorie target: not available (insufficient profile data)");
  }
  return lines;
}

/**
 * ساخت بلاک زمینه شخصی کاربر — هرگز شامل داده کاربران دیگر یا فیلدهای
 * حساس حساب نیست. اگر هیچ داده‌ای ثبت نشده باشد null برمی‌گردد تا پرامپت
 * مسیر «بدون داده» را دنبال کند.
 */
export async function buildUserContextBlock(userId: string): Promise<string | null> {
  const [profileRow, planLines, sessionLines, weightLines, nutritionLines] = await Promise.all([
    db.fitnessProfile.findUnique({
      where: { userId },
      select: {
        age: true,
        gender: true,
        heightCm: true,
        weightKg: true,
        goal: true,
        experience: true,
        trainingDaysPerWeek: true,
        sessionMinutes: true,
        equipmentJson: true,
        limitationsJson: true,
        limitationNotes: true,
        diet: true,
        allergiesJson: true,
        units: true,
      },
    }),
    planSection(userId),
    sessionsSection(userId),
    weightSection(userId),
    nutritionSection(userId),
  ]);

  const profileLines = profileSection(profileRow);
  const sections: string[] = [
    "PROFILE:",
    ...profileLines,
    "",
    ...planLines,
    ...sessionLines,
    ...weightLines,
    ...nutritionLines,
  ];

  const block = sections.join("\n").trim();
  if (!block) return null;

  // اگر هیچ داده واقعی ثبت نشده باشد، زمینه لازم نیست — مسیر صادقانه «بدون داده»
  const hasProfileData = profileLines.some(
    (line) => line.startsWith("- profile:") && !line.includes("not created yet") && !line.includes("created but empty")
  );
  const hasRealData =
    hasProfileData ||
    block.includes("active workout plan: «") ||
    block.includes("  · ") ||
    block.includes("weight history (real") ||
    block.includes("active nutrition plan: «");

  if (!hasRealData) return null;

  return cut(block, CONTEXT_SOFT_MAX);
}
