/**
 * نقطه دسترسی واحد بانک حرکات — ترکیب فایل‌های داده، مرتب‌سازی پیش‌فرض
 * پایدار، جست‌وجوی نرمال‌شده، فیلترهای ترکیبی و یافتن حرکات مشابه.
 * همه توابع خالص‌اند تا در تست خودکار و UI بدون تفاوت کار کنند.
 */

import type { MuscleGroupId } from "@/lib/fitness3d/types";
import {
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  MOVEMENT_PATTERNS,
  DIFFICULTY_ORDER,
  type Difficulty,
  type EquipmentId,
  type ExerciseCategoryId,
  type LibraryExercise,
  type MovementPatternId,
} from "./types";
import { CHEST_BACK_EXERCISES } from "./data-chest-back";
import { SHOULDERS_ARMS_EXERCISES } from "./data-shoulders-arms";
import { CORE_LEGS_EXERCISES } from "./data-core-legs";
import { GLUTES_CALVES_FULLBODY_EXERCISES } from "./data-glutes-calves-fullbody";

export * from "./types";

/* --------------------------- بانک کامل حرکات --------------------------- */

const ALL_EXERCISES: LibraryExercise[] = [
  ...CHEST_BACK_EXERCISES,
  ...SHOULDERS_ARMS_EXERCISES,
  ...CORE_LEGS_EXERCISES,
  ...GLUTES_CALVES_FULLBODY_EXERCISES,
];

const CATEGORY_ORDER = new Map<ExerciseCategoryId, number>(
  EXERCISE_CATEGORIES.map((c, i) => [c.id, i])
);
const DIFFICULTY_RANK = new Map<Difficulty, number>(
  DIFFICULTY_ORDER.map((d, i) => [d, i])
);

/**
 * مرتب‌سازی پیش‌فرض منطقی و پایدار: دسته (ترتیب ثابت) ← سطح دشواری
 * (مبتدی به پیشرفته) ← نام فارسی. ورودی‌ها تکراری‌پذیرند.
 */
function defaultSort(exercises: LibraryExercise[]): LibraryExercise[] {
  return [...exercises].sort((a, b) => {
    const catDiff = (CATEGORY_ORDER.get(a.category) ?? 99) - (CATEGORY_ORDER.get(b.category) ?? 99);
    if (catDiff !== 0) return catDiff;
    const diffDiff = (DIFFICULTY_RANK.get(a.difficulty) ?? 9) - (DIFFICULTY_RANK.get(b.difficulty) ?? 9);
    if (diffDiff !== 0) return diffDiff;
    return a.fa.localeCompare(b.fa, "fa");
  });
}

/** بانک کامل با مرتب‌سازی پیش‌فرض — منبع اصلی نمایش کتابخانه */
export const EXERCISE_LIBRARY: LibraryExercise[] = defaultSort(ALL_EXERCISES);

/** تعداد حرکات بانک — برای نمایش و تست */
export const EXERCISE_COUNT = EXERCISE_LIBRARY.length;

/** حرکات دارای انیمیشن سه‌بعدی */
export const COACH3D_EXERCISE_IDS = EXERCISE_LIBRARY.flatMap(
  (ex) => (ex.coach3dId ? [ex.coach3dId] : [])
);

/* ------------------------------ دسترسی سریع ------------------------------ */

const BY_ID = new Map(EXERCISE_LIBRARY.map((ex) => [ex.id, ex]));

export function getExerciseById(id: string): LibraryExercise | undefined {
  return BY_ID.get(id);
}

/** آیا این شناسه در مربی سه‌بعدی واقعاً انیمیشن دارد؟ */
export function hasCoach3dAnimation(ex: LibraryExercise): boolean {
  return typeof ex.coach3dId === "string" && ex.coach3dId.length > 0;
}

/* ------------------------------ جست‌وجو ------------------------------ */

/**
 * نرمال‌سازی متن برای جست‌وجوی فارسی/انگلیسی: حروف عربی به فارسی، حذف اعراب،
 * حذف نیم‌فاصله/فاصله اضافی و یکسان‌سازی حروف — از هر دو سمت (بانک و عبارت
 * کاربر) اعمال می‌شود تا «جستجو» و «جست‌وجو» یک نتیجه بدهند.
 */
export function normalizeSearchText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u064A\u0649]/g, "\u06CC") // ي/ى → ی
    .replace(/\u0643/g, "\u06A9") // ك → ک
    .replace(/[\u064B-\u065F\u0670]/g, "") // اعراب
    .replace(/\u200C/g, "") // نیم‌فاصله
    .replace(/\s+/g, " ")
    .trim();
}

function matchesQuery(ex: LibraryExercise, q: string): boolean {
  if (!q) return true;
  return (
    normalizeSearchText(ex.fa).includes(q) ||
    normalizeSearchText(ex.en).includes(q)
  );
}

/* ------------------------------- فیلترها ------------------------------- */

export interface LibraryFilterState {
  query: string;
  category: ExerciseCategoryId | "all";
  /** عضله هدف — عضله انتخابی باید در اصلی یا کمکی حرکت باشد (OR) */
  muscles: MuscleGroupId[];
  /** تجهیزات — حرکت باید حداقل یکی از انتخاب‌ها را داشته باشد (OR) */
  equipment: EquipmentId[];
  difficulty: Difficulty | "all";
  pattern: MovementPatternId | "all";
  /** فقط حرکات دارای انیمیشن سه‌بعدی */
  only3d: boolean;
}

export const EMPTY_FILTER: LibraryFilterState = {
  query: "",
  category: "all",
  muscles: [],
  equipment: [],
  difficulty: "all",
  pattern: "all",
  only3d: false,
};

export function hasActiveFilters(f: LibraryFilterState): boolean {
  return (
    f.query.trim() !== "" ||
    f.category !== "all" ||
    f.muscles.length > 0 ||
    f.equipment.length > 0 ||
    f.difficulty !== "all" ||
    f.pattern !== "all" ||
    f.only3d
  );
}

/** اعمال واقعی همه فیلترها روی بانک — خروجی با مرتب‌سازی پیش‌فرض */
export function filterExercises(f: LibraryFilterState): LibraryExercise[] {
  const q = normalizeSearchText(f.query);
  return EXERCISE_LIBRARY.filter((ex) => {
    if (!matchesQuery(ex, q)) return false;
    if (f.category !== "all" && ex.category !== f.category) return false;
    if (f.muscles.length > 0) {
      const allMuscles = [...ex.primaryMuscles, ...ex.secondaryMuscles];
      if (!f.muscles.some((m) => allMuscles.includes(m))) return false;
    }
    if (f.equipment.length > 0 && !f.equipment.some((e) => ex.equipment.includes(e))) {
      return false;
    }
    if (f.difficulty !== "all" && ex.difficulty !== f.difficulty) return false;
    if (f.pattern !== "all" && ex.pattern !== f.pattern) return false;
    if (f.only3d && !hasCoach3dAnimation(ex)) return false;
    return true;
  });
}

/* ----------------------------- حرکات مشابه ----------------------------- */

function sharedCount<T>(a: T[], b: T[]): number {
  return a.filter((x) => b.includes(x)).length;
}

/**
 * حرکات مشابه — فقط بر اساس ارتباط واقعی: هم‌دسته، هم‌پوشانی عضلات و
 * تجهیزات مشترک. هیچ رابطه ساختگی ساخته نمی‌شود؛ در نبود ارتباط کافی،
 * فهرست کوتاه‌تر خواهد بود.
 */
export function findSimilarExercises(
  ex: LibraryExercise,
  count = 3
): LibraryExercise[] {
  const scored = EXERCISE_LIBRARY.filter((o) => o.id !== ex.id).map((o) => {
    let score = 0;
    score += sharedCount(o.primaryMuscles, ex.primaryMuscles) * 4;
    score += sharedCount(o.secondaryMuscles, [...ex.primaryMuscles, ...ex.secondaryMuscles]) * 2;
    score += sharedCount(o.equipment, ex.equipment);
    if (o.category === ex.category) score += 6;
    if (o.difficulty === ex.difficulty) score += 1;
    return { o, score };
  });

  const strong = scored
    .filter((s) => s.score >= 4)
    .sort((a, b) => b.score - a.score || a.o.id.localeCompare(b.o.id))
    .slice(0, count)
    .map((s) => s.o);

  return strong;
}

/* ------------------------------- برچسب‌ها ------------------------------- */

const CATEGORY_MAP = new Map(EXERCISE_CATEGORIES.map((c) => [c.id, c]));

export function categoryFa(id: ExerciseCategoryId): string {
  return CATEGORY_MAP.get(id)?.fa ?? id;
}

export function categoryMonogram(id: ExerciseCategoryId): string {
  return CATEGORY_MAP.get(id)?.monogram ?? "؟";
}

const PATTERN_MAP = new Map(MOVEMENT_PATTERNS.map((p) => [p.id, p]));

export function patternFa(id: MovementPatternId): string {
  return PATTERN_MAP.get(id)?.fa ?? id;
}

const EQUIPMENT_MAP = new Map(EQUIPMENT_TYPES.map((e) => [e.id, e]));

export function equipmentFa(id: EquipmentId): string {
  return EQUIPMENT_MAP.get(id)?.fa ?? id;
}
