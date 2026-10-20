/**
 * منطق خالص جست‌وجو/فیلتر/مشابه‌یابی بانک حرکات — مستقل از منبع داده.
 *
 * این ماژول «داده ندارد» و فقط توابع خالص است؛ هم در سرور (بانک دیتابیس)
 * و هم در کلاینت (store بانک) استفاده می‌شود. نسخه‌های legacy در
 * src/lib/exercises/index.ts روی همین توابع پیاده شده‌اند تا رفتار موجود
 * دقیقاً حفظ شود.
 */

import type {
  Difficulty,
  EquipmentId,
  ExerciseCategoryId,
  LibraryExerciseCard,
  LibraryMuscleId,
  MovementPatternId,
} from "./types";

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

/* ------------------------------ فیلتر کارت‌ها ------------------------------ */

export interface CardFilterState {
  query: string;
  category: ExerciseCategoryId | "all";
  /** عضله هدف — عضله انتخابی باید در اصلی یا کمکی حرکت باشد (OR) */
  muscles: LibraryMuscleId[];
  /** تجهیزات — حرکت باید حداقل یکی از انتخاب‌ها را داشته باشد (OR) */
  equipment: EquipmentId[];
  difficulty: Difficulty | "all";
  pattern: MovementPatternId | "all";
  /** فقط حرکات دارای انیمیشن سه‌بعدی واقعی */
  only3d: boolean;
}

export function hasActiveCardFilters(f: CardFilterState): boolean {
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

function matchesQuery(ex: { fa: string; en: string }, q: string): boolean {
  if (!q) return true;
  return (
    normalizeSearchText(ex.fa).includes(q) ||
    normalizeSearchText(ex.en).includes(q)
  );
}

/** اعمال فیلترها روی فهرست کارت‌ها — خالص و تکرارپذیر */
export function filterCards(
  cards: LibraryExerciseCard[],
  f: CardFilterState
): LibraryExerciseCard[] {
  const q = normalizeSearchText(f.query);
  return cards.filter((ex) => {
    if (!matchesQuery(ex, q)) return false;
    if (f.category !== "all" && ex.category !== f.category) return false;
    if (f.muscles.length > 0) {
      const all = [...ex.primaryMuscles, ...ex.secondaryMuscles];
      if (!f.muscles.some((m) => all.includes(m))) return false;
    }
    if (f.equipment.length > 0 && !f.equipment.some((e) => ex.equipment.includes(e))) return false;
    if (f.difficulty !== "all" && ex.difficulty !== f.difficulty) return false;
    if (f.pattern !== "all" && ex.pattern !== f.pattern) return false;
    if (f.only3d && !ex.has3d) return false;
    return true;
  });
}

/* ------------------------------ حرکات مشابه ------------------------------ */

interface SimilarInput {
  id: string;
  category: ExerciseCategoryId;
  primaryMuscles: LibraryMuscleId[];
  secondaryMuscles: LibraryMuscleId[];
  equipment: EquipmentId[];
  difficulty: Difficulty;
}

function sharedCount<T>(a: T[], b: T[]): number {
  return a.filter((x) => b.includes(x)).length;
}

/**
 * حرکات مشابه — فقط بر اساس ارتباط واقعی: هم‌دسته، هم‌پوشانی عضلات و
 * تجهیزات مشترک. هیچ رابطه ساختگی ساخته نمی‌شود؛ در نبود ارتباط کافی،
 * فهرست کوتاه‌تر خواهد بود.
 */
export function findSimilarOver<T extends SimilarInput>(
  list: T[],
  ex: T,
  count = 3
): T[] {
  const scored = list
    .filter((o) => o.id !== ex.id)
    .map((o) => {
      let score = 0;
      score += sharedCount(o.primaryMuscles, ex.primaryMuscles) * 4;
      score += sharedCount(o.secondaryMuscles, [...ex.primaryMuscles, ...ex.secondaryMuscles]) * 2;
      score += sharedCount(o.equipment, ex.equipment);
      if (o.category === ex.category) score += 6;
      if (o.difficulty === ex.difficulty) score += 1;
      return { o, score };
    });

  return scored
    .filter((s) => s.score >= 4)
    .sort((a, b) => b.score - a.score || a.o.id.localeCompare(b.o.id))
    .slice(0, count)
    .map((s) => s.o);
}
