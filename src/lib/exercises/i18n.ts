/**
 * دسترسی‌های نمایشی دوزبانه به بانک حرکات — لایه جدا از داده.
 *
 * قاعده: داده اصلی بانک (فیلدهای فارسی + نام انگلیسی موجود) دست‌نخورده
 * می‌ماند؛ این توابع فقط «نمایش» را بر اساس زبان رابط انتخاب می‌کنند.
 * هیچ منطق فیلتر/جست‌وجو از این مسیر عبور نمی‌کند (جست‌وجو همیشه روی
 * هر دو نام در src/lib/exercises/index.ts انجام می‌شود).
 */

import type { LibraryExercise } from "./types";
import type { Locale } from "@/lib/i18n/shared";

/** نام حرکت به زبان رابط — فارسی: نام اصلی؛ انگلیسی: نام انگلیسی موجود */
export function exerciseName(ex: LibraryExercise, locale: Locale): string {
  return locale === "fa" ? ex.fa : ex.en || ex.fa;
}

export interface ExerciseDisplayContent {
  summary: string;
  steps: string[];
  breathing: string;
  mistakes: string[];
  safety: string[];
}

/**
 * محتوای آموزشی حرکت به زبان رابط — انگلیسی فقط اگر ترجمه نمایشی
 * (enContent) برای همان حرکت موجود باشد؛ در غیر این صورت همان محتوای
 * فارسی اصلی نمایش داده می‌شود (هیچ رشته‌ای ساخته یا تغییر نمی‌کند).
 */
export function exerciseContent(
  ex: LibraryExercise,
  locale: Locale
): ExerciseDisplayContent {
  if (locale === "en" && ex.enContent) return ex.enContent;
  return {
    summary: ex.summary,
    steps: ex.steps,
    breathing: ex.breathing,
    mistakes: ex.mistakes,
    safety: ex.safety,
  };
}
