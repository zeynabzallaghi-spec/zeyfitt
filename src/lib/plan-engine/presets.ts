/**
 * جداول قواعد موتور برنامه‌سازی — همه اعداد و الگوها در این فایل متمرکزند
 * تا قابل‌توضیح، قابل‌تست و قابل‌تنظیم باشند.
 *
 * تقسیم‌بندی‌ها نمونه‌های استاندارد و متناسب با تعداد روزها هستند؛ موتور
 * سپس آن‌ها را با تجهیزات، محدودیت‌ها و زمان در دسترس کاربر تنظیم می‌کند.
 */

import type {
  Difficulty,
  EquipmentId,
  ExerciseCategoryId,
} from "@/lib/exercises/types";
import type { PlanExperience, PlanFocus, PlanGoal } from "./types";

/* --------------------- نقشه تجهیزات پروفایل → بانک حرکات --------------------- */

/**
 * واژگان تجهیزات پروفایل (مرحله ۳) با واژگان بانک حرکات (مرحله ۵) متفاوت
 * است؛ این نقشه فقط برای مقداردهی اولیه فرم استفاده می‌شود. کتل‌بل در بانک
 * فعلی حرکت معادلی ندارد و صادقانه نادیده گرفته می‌شود (در UI اعلام می‌شود).
 */
export const PROFILE_TO_LIBRARY_EQUIPMENT: Record<string, EquipmentId[]> = {
  free_weights: ["dumbbell", "barbell"],
  machines: ["machine"],
  cables: ["cable"],
  resistance_band: ["band"],
  kettlebell: [],
  bodyweight: ["bodyweight"],
};

/* ------------------------------ قالب روزها ------------------------------ */

/** یک جایگاه حرکت در جلسه — دسته + تعداد حرکت از آن دسته */
export interface DaySlot {
  category: ExerciseCategoryId;
  count: number;
}

/** قالب یک جلسه تمرینی */
export interface DayTemplate {
  title: string;
  focusLabel: string;
  slots: DaySlot[];
}

/** جایگاه‌های پایه هر تمرکز */
type SlotGroupName = "push" | "pull" | "legs" | "upperA" | "upperB" | "lowerA" | "lowerB" | "armCore" | "fullA" | "fullB" | "fullC";

const SLOT_GROUPS: Record<SlotGroupName, DaySlot[]> = {
  push: [
    { category: "chest", count: 2 },
    { category: "shoulders", count: 1 },
    { category: "triceps", count: 1 },
  ],
  pull: [
    { category: "back", count: 2 },
    { category: "biceps", count: 1 },
    { category: "core", count: 1 },
  ],
  legs: [
    { category: "quads", count: 2 },
    { category: "hamstrings", count: 1 },
    { category: "calves", count: 1 },
  ],
  upperA: [
    { category: "chest", count: 2 },
    { category: "back", count: 2 },
    { category: "biceps", count: 1 },
  ],
  upperB: [
    { category: "shoulders", count: 2 },
    { category: "chest", count: 1 },
    { category: "triceps", count: 1 },
    { category: "core", count: 1 },
  ],
  lowerA: [
    { category: "quads", count: 2 },
    { category: "glutes", count: 1 },
    { category: "calves", count: 1 },
  ],
  lowerB: [
    { category: "hamstrings", count: 2 },
    { category: "quads", count: 1 },
    { category: "core", count: 1 },
  ],
  armCore: [
    { category: "biceps", count: 1 },
    { category: "triceps", count: 1 },
    { category: "shoulders", count: 1 },
    { category: "core", count: 1 },
  ],
  fullA: [
    { category: "chest", count: 1 },
    { category: "back", count: 1 },
    { category: "quads", count: 1 },
    { category: "core", count: 1 },
  ],
  fullB: [
    { category: "shoulders", count: 1 },
    { category: "glutes", count: 1 },
    { category: "hamstrings", count: 1 },
    { category: "biceps", count: 1 },
  ],
  fullC: [
    { category: "chest", count: 1 },
    { category: "back", count: 1 },
    { category: "quads", count: 1 },
    { category: "triceps", count: 1 },
  ],
};

const GROUP_TITLE: Record<SlotGroupName, { title: string; focusLabel: string }> = {
  push: { title: "پوش — سینه، سرشانه و پشت بازو", focusLabel: "بالاتنه" },
  pull: { title: "پول — پشت و جلو بازو", focusLabel: "بالاتنه" },
  legs: { title: "پایین‌تنه — چهارسر، همسترینگ و ساق", focusLabel: "پایین‌تنه" },
  upperA: { title: "بالاتنه — سینه و پشت", focusLabel: "بالاتنه" },
  upperB: { title: "بالاتنه — سرشانه و بازو", focusLabel: "بالاتنه" },
  lowerA: { title: "پایین‌تنه — چهارسر و سرینی", focusLabel: "پایین‌تنه" },
  lowerB: { title: "پایین‌تنه — همسترینگ و مرکزی", focusLabel: "پایین‌تنه" },
  armCore: { title: "بازو، سرشانه و مرکزی", focusLabel: "بالاتنه" },
  fullA: { title: "تمام بدن — جلسه اول", focusLabel: "تمام بدن" },
  fullB: { title: "تمام بدن — جلسه دوم", focusLabel: "تمام بدن" },
  fullC: { title: "تمام بدن — جلسه سوم", focusLabel: "تمام بدن" },
};

/** دسته‌های بالاتنه و پایین‌تنه — برای تبدیل تمرکزها */
const UPPER_CATEGORIES: ExerciseCategoryId[] = ["chest", "back", "shoulders", "biceps", "triceps", "fullbody"];
const LOWER_CATEGORIES: ExerciseCategoryId[] = ["quads", "hamstrings", "glutes", "calves", "fullbody"];

/** دسته‌های مکمل — برای روزهای مکمل در تمرکز دسته‌خاص */
const SYNERGISTS: Partial<Record<ExerciseCategoryId, ExerciseCategoryId[]>> = {
  chest: ["triceps", "shoulders"],
  back: ["biceps", "shoulders"],
  shoulders: ["triceps", "chest"],
  biceps: ["back", "shoulders"],
  triceps: ["chest", "shoulders"],
  core: ["fullbody"],
  quads: ["glutes", "calves"],
  hamstrings: ["glutes", "calves"],
  glutes: ["hamstrings", "quads"],
  calves: ["quads", "glutes"],
  fullbody: ["core"],
};

/** روزهای مکمل برای تمرکز دسته‌خاص — جایگاه‌های متعادل‌کننده */
const CATEGORY_FILL_DAY: Partial<Record<ExerciseCategoryId, SlotGroupName>> = {
  chest: "pull",
  back: "push",
  shoulders: "pull",
  biceps: "pull",
  triceps: "push",
  core: "fullA",
  quads: "lowerB",
  hamstrings: "lowerA",
  glutes: "lowerB",
  calves: "lowerA",
  fullbody: "fullB",
};

/**
 * ساخت قالب روزها بر اساس تعداد روز، سطح و تمرکز.
 * قانون کلی: برنامه‌های کم‌روز تمام‌بدن؛ ۴ روز بالاتنه/پایین‌تنه؛
 * ۵ و ۶ روز تقسیم‌بندی تفکیکی‌تر. مبتدی‌ها همیشه الگوی ساده‌تر.
 */
export function buildDayTemplates(
  days: number,
  focus: PlanFocus,
  experience: PlanExperience
): DayTemplate[] {
  const beginner = experience === "beginner";

  if (focus === "all") {
    return buildAllFocus(days, beginner);
  }
  if (focus === "upper") {
    return buildBodyHalfFocus(days, "upper");
  }
  if (focus === "lower") {
    return buildBodyHalfFocus(days, "lower");
  }
  return buildCategoryFocus(days, focus, beginner);
}

function buildAllFocus(days: number, beginner: boolean): DayTemplate[] {
  const mk = (name: SlotGroupName): DayTemplate => ({
    ...GROUP_TITLE[name],
    slots: SLOT_GROUPS[name],
  });

  if (beginner) {
    // مبتدی: الگوی تمام‌بدن ساده حتی با ۴+ روز؛ حجم کمتر و ریکاوری بیشتر
    switch (days) {
      case 2:
        return [mk("fullA"), mk("fullB")];
      case 3:
        return [mk("fullA"), mk("fullB"), mk("fullC")];
      case 4:
        return [mk("fullA"), mk("fullB"), mk("fullC"), mk("fullA")];
      case 5:
        return [mk("fullA"), mk("fullB"), mk("fullC"), mk("fullA"), mk("fullB")];
      default:
        return [mk("fullA"), mk("fullB"), mk("fullC"), mk("fullA"), mk("fullB"), mk("fullC")];
    }
  }

  switch (days) {
    case 2:
      return [mk("fullA"), mk("fullB")];
    case 3:
      return [mk("push"), mk("pull"), mk("legs")];
    case 4:
      return [mk("upperA"), mk("lowerA"), mk("upperB"), mk("lowerB")];
    case 5:
      return [mk("push"), mk("pull"), mk("legs"), mk("upperB"), mk("lowerA")];
    default:
      return [mk("push"), mk("pull"), mk("legs"), mk("upperB"), mk("lowerA"), mk("armCore")];
  }
}

/** تمرکز بالاتنه یا پایین‌تنه — روزها از جایگاه‌های همان نیمه چرخش می‌خورند */
function buildBodyHalfFocus(days: number, half: "upper" | "lower"): DayTemplate[] {
  const pool: SlotGroupName[] =
    half === "upper"
      ? ["upperA", "upperB", "push", "pull", "armCore"]
      : ["lowerA", "lowerB", "legs"];
  const out: DayTemplate[] = [];
  for (let i = 0; i < days; i++) {
    const name = pool[i % pool.length];
    // در تمرینات متمرکز، جایگاه‌ها کمی سبک‌تر می‌شوند تا حجم هفتگی معقول بماند
    const slots = SLOT_GROUPS[name].map((slot) =>
      i >= pool.length && slot.count > 1 ? { ...slot, count: slot.count - 1 } : slot
    );
    out.push({ ...GROUP_TITLE[name], slots });
  }
  return out;
}

/**
 * تمرکز روی یک دسته مشخص — حدود نیمی از روزها روی دسته اصلی با دسته‌های
 * مکمل و بقیه روزهای متعادل‌کننده تا ریکاوری دسته اصلی رعایت شود.
 */
function buildCategoryFocus(days: number, category: ExerciseCategoryId, beginner: boolean): DayTemplate[] {
  const out: DayTemplate[] = [];
  const fillDay = CATEGORY_FILL_DAY[category] ?? "fullB";
  const synergists = SYNERGISTS[category] ?? [];

  const mkFocusDay = (index: number): DayTemplate => {
    const slots: DaySlot[] = [{ category, count: 2 }];
    const syn = synergists[index % Math.max(synergists.length, 1)];
    if (syn) slots.push({ category: syn, count: 1 });
    if (!beginner && index % 2 === 1) slots.push({ category, count: 1 });
    return {
      title: `تمرکز ${categoryTitle(category)} — جلسه ${index + 1}`,
      focusLabel: categoryTitle(category),
      slots,
    };
  };

  const mkFillDay = (): DayTemplate => ({
    ...GROUP_TITLE[fillDay],
    slots: SLOT_GROUPS[fillDay],
    title: `${GROUP_TITLE[fillDay].title} (روز مکمل)`,
  });

  for (let i = 0; i < days; i++) {
    out.push(i % 2 === 0 ? mkFocusDay(Math.floor(i / 2)) : mkFillDay());
  }
  return out;
}

function categoryTitle(id: ExerciseCategoryId): string {
  // واردات بالا برای جلوگیری از چرخه — برچسب فارسی دسته
  const titles: Record<ExerciseCategoryId, string> = {
    chest: "سینه",
    back: "پشت و زیربغل",
    shoulders: "سرشانه",
    biceps: "جلو بازو",
    triceps: "پشت بازو",
    core: "شکم و مرکزی",
    quads: "چهارسر",
    hamstrings: "همسترینگ",
    glutes: "سرینی",
    calves: "ساق پا",
    fullbody: "تمام بدن",
  };
  return titles[id] ?? id;
}

/** آیا این دسته در نیمه انتخابی مجاز است؟ (برای فیلتر تمرکز بالاتنه/پایین‌تنه) */
export function isCategoryAllowedByFocus(category: ExerciseCategoryId, focus: PlanFocus): boolean {
  if (focus === "all") return true;
  if (focus === "upper") return UPPER_CATEGORIES.includes(category);
  if (focus === "lower") return LOWER_CATEGORIES.includes(category);
  return true; // تمرکز دسته‌خاص در سطح قالب روزها اعمال می‌شود
}

/* --------------------------- ست، تکرار و استراحت --------------------------- */

export interface Prescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
}

const BASE_PRESCRIPTION: Record<PlanGoal, { compound: Prescription; isolation: Prescription }> = {
  muscle_gain: {
    compound: { sets: 4, repsMin: 8, repsMax: 12, restSeconds: 90 },
    isolation: { sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 },
  },
  strength: {
    compound: { sets: 5, repsMin: 3, repsMax: 6, restSeconds: 150 },
    isolation: { sets: 3, repsMin: 8, repsMax: 10, restSeconds: 90 },
  },
  fat_loss: {
    compound: { sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 },
    isolation: { sets: 3, repsMin: 12, repsMax: 20, restSeconds: 45 },
  },
  maintain: {
    compound: { sets: 3, repsMin: 10, repsMax: 12, restSeconds: 75 },
    isolation: { sets: 2, repsMin: 12, repsMax: 15, restSeconds: 60 },
  },
  fitness: {
    compound: { sets: 3, repsMin: 10, repsMax: 12, restSeconds: 75 },
    isolation: { sets: 2, repsMin: 12, repsMax: 15, restSeconds: 60 },
  },
};

/** تعداد حرکت هدف در هر جلسه بر اساس زمان در دسترس (پیش از تنظیم دقیق) */
export function targetExercisesPerSession(sessionMinutes: number): number {
  switch (sessionMinutes) {
    case 30:
      return 3;
    case 45:
      return 4;
    case 60:
      return 6;
    default:
      return 8; // ۹۰ دقیقه
  }
}

/** زمان گرم‌کردن عمومی ابتدای هر جلسه (دقیقه) */
export const WARMUP_MINUTES = 5;

/** تعیین نسخه نهایی تجویز بر اساس سطح تجربه — مبتدی محافظه‌کارانه‌تر */
export function prescribe(goal: PlanGoal, experience: PlanExperience, compound: boolean): Prescription {
  const base = compound ? BASE_PRESCRIPTION[goal].compound : BASE_PRESCRIPTION[goal].isolation;
  if (experience === "beginner") {
    return {
      sets: Math.max(2, base.sets - 1),
      repsMin: base.repsMin,
      repsMax: base.repsMax,
      restSeconds: base.restSeconds,
    };
  }
  return { ...base };
}

/* ---------------------------- ترجیح سطح دشواری ---------------------------- */

/**
 * ترتیب ترجیح سطح حرکات بر اساس تجربه کاربر — حرکات سطح بالاتر فقط برای
 * پر کردن کمبود استفاده می‌شوند (مبتدی هرگز حرکت پیشرفته نمی‌گیرد).
 */
export const DIFFICULTY_PREFERENCE: Record<PlanExperience, Difficulty[]> = {
  beginner: ["مبتدی", "متوسط"],
  intermediate: ["متوسط", "مبتدی", "پیشرفته"],
  advanced: ["پیشرفته", "متوسط", "مبتدی"],
};
