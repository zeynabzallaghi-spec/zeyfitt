/**
 * دیکشنری مشترک اجزای کوچک سراسری — نشان‌ها، نوار معرفی بخش و برچسب
 * گزینه‌های پروفایل. الگو دقیقاً مطابق sections/shell.ts است.
 *
 * برچسب گزینه‌ها (هدف، سطح، تجهیزات و…) نقشه نمایشی روی «value»های
 * پایدار src/lib/profile.ts هستند؛ داده اصلی (label فارسی) بدون تغییر
 * می‌ماند و فقط نمایش دوزبانه می‌شود.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface SharedStrings {
  // نشان‌ها
  realBadge: string;
  demoBadge: string;
  stageBadge: (stage: number) => string;
  /** برچسب نمایشی سطح دشواری — مقدار ذخیره‌شده فارسی است و تغییر نمی‌کند */
  difficultyLabel: (value: string) => string;
  // برچسب گزینه‌های پروفایل (نقشه نمایشی روی value پایدار)
  goalLabel: (value: string) => string;
  experienceLabel: (value: string) => string;
  genderLabel: (value: string) => string;
  unitsLabel: (value: string) => string;
  equipmentLabel: (value: string) => string;
  limitationLabel: (value: string) => string;
  dietLabel: (value: string) => string;
  allergyLabel: (value: string) => string;
  /** مقدار ناشناخته — به‌جای نمایش خام داده فنی */
  unknownValue: string;
  // —— مرحله ۱۵: برچسب‌های مشترک اشتراک/مربی ——
  /** برچسب سطح اشتراک — مقدار پایدار FREE | PREMIUM */
  planTierLabel: (value: string) => string;
  /** برچسب نوع همکاری — مقدار پایدار SEMI_PRIVATE | PRIVATE */
  cooperationTypeLabel: (value: string) => string;
  /** توضیح کوتاه نوع همکاری */
  cooperationTypeHint: (value: string) => string;
  /** برچسب تخصص مربی — کد پایدار */
  specializationLabel: (value: string) => string;
  // —— مرحله ۱۸: بانک عمومی حرکات و انتخابگر مشترک ——
  libraryLoadError: string;
  retryButton: string;
  loadingLabel: string;
  categoryGroupAria: string;
  pickerShowing: (visible: number, total: number) => string;
  loadMoreButton: string;
}

const FA: SharedStrings = {
  realBadge: "واقعی",
  demoBadge: "نمونه نمایشی",
  stageBadge: (stage) => `مرحله ${localeNumber(stage, "fa")}`,
  difficultyLabel: (value) =>
    ({ "مبتدی": "مبتدی", "متوسط": "متوسط", "پیشرفته": "پیشرفته" } as Record<string, string>)[value] ?? value,
  goalLabel: (value) =>
    (
      {
        fat_loss: "کاهش چربی",
        muscle_gain: "عضله‌سازی",
        strength: "افزایش قدرت",
        maintain: "حفظ وزن",
        fitness: "بهبود آمادگی جسمانی",
      } as Record<string, string>
    )[value] ?? value,
  experienceLabel: (value) =>
    ({ beginner: "مبتدی", intermediate: "متوسط", advanced: "پیشرفته" } as Record<string, string>)[value] ?? value,
  genderLabel: (value) =>
    ({ male: "مرد", female: "زن", undisclosed: "ترجیح می‌دهم اعلام نکنم" } as Record<string, string>)[value] ?? value,
  unitsLabel: (value) =>
    (
      {
        metric: "متریک — کیلوگرم و سانتی‌متر",
        imperial: "امپریال — پوند و فوت",
      } as Record<string, string>
    )[value] ?? value,
  equipmentLabel: (value) =>
    (
      {
        free_weights: "وزنه آزاد (هالتر و دمبل)",
        machines: "دستگاه‌های باشگاه",
        cables: "سیم‌کش",
        resistance_band: "کش مقاومتی",
        kettlebell: "کتل‌بل",
        bodyweight: "وزن بدن",
      } as Record<string, string>
    )[value] ?? value,
  limitationLabel: (value) =>
    ({ knee: "زانو", lower_back: "کمر", shoulder: "شانه", wrist: "مچ دست", neck: "گردن" } as Record<string, string>)[value] ?? value,
  dietLabel: (value) =>
    (
      {
        none: "بدون رژیم خاص",
        weight_loss: "کاهش وزن",
        bulking: "حجم (عضله‌سازی)",
        keto: "کتوژنیک",
        vegetarian: "گیاهخواری",
        vegan: "وگان",
      } as Record<string, string>
    )[value] ?? value,
  allergyLabel: (value) =>
    ({ dairy: "لبنیات", gluten: "گلوتن", nuts: "آجیل", seafood: "غذای دریایی", egg: "تخم‌مرغ" } as Record<string, string>)[value] ?? value,
  unknownValue: "—",
  planTierLabel: (value) =>
    ({ FREE: "رایگان", PREMIUM: "ویژه" } as Record<string, string>)[value] ?? value,
  cooperationTypeLabel: (value) =>
    ({ SEMI_PRIVATE: "نیمه‌خصوصی", PRIVATE: "خصوصی" } as Record<string, string>)[value] ?? value,
  cooperationTypeHint: (value) =>
    (
      {
        SEMI_PRIVATE:
          "مربی برنامه استانداردشده ارائه میدهد و پیشرفت شما را پایش میکند",
        PRIVATE:
          "همکاری خصوصی با پشتیبانی نزدیکتر؛ تمرین آنلاین زنده در مراحل آینده",
      } as Record<string, string>
    )[value] ?? "",
  specializationLabel: (value) =>
    (
      {
        strength: "قدرت",
        hypertrophy: "عضله‌سازی",
        fat_loss: "کاهش چربی",
        endurance: "استقامت",
        mobility: "تحرک و انعطاف",
        rehab: "توانبخشی و بازگشت به تمرین",
        nutrition_coaching: "مشاوره تغذیه",
        functional: "تمرین کارکردی",
      } as Record<string, string>
    )[value] ?? value,
  // مرحله ۱۸ — بانک عمومی حرکات
  libraryLoadError: "بارگذاری بانک حرکات ناموفق بود؛ اتصال خود را بررسی کنید.",
  retryButton: "تلاش مجدد",
  loadingLabel: "در حال بارگذاری…",
  categoryGroupAria: "فیلتر دسته حرکات",
  pickerShowing: (visible, total) =>
    `نمایش ${localeNumber(visible, "fa")} از ${localeNumber(total, "fa")} حرکت`,
  loadMoreButton: "نمایش بیشتر",
};

const EN: SharedStrings = {
  realBadge: "Real",
  demoBadge: "Demo sample",
  stageBadge: (stage) => `Stage ${stage}`,
  difficultyLabel: (value) =>
    ({ "مبتدی": "Beginner", "متوسط": "Intermediate", "پیشرفته": "Advanced" } as Record<string, string>)[value] ?? value,
  goalLabel: (value) =>
    (
      {
        fat_loss: "Fat loss",
        muscle_gain: "Muscle gain",
        strength: "Strength gain",
        maintain: "Maintain weight",
        fitness: "General fitness",
      } as Record<string, string>
    )[value] ?? value,
  experienceLabel: (value) =>
    ({ beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as Record<string, string>)[value] ?? value,
  genderLabel: (value) =>
    ({ male: "Male", female: "Female", undisclosed: "Prefer not to say" } as Record<string, string>)[value] ?? value,
  unitsLabel: (value) =>
    (
      {
        metric: "Metric — kilograms and centimeters",
        imperial: "Imperial — pounds and feet",
      } as Record<string, string>
    )[value] ?? value,
  equipmentLabel: (value) =>
    (
      {
        free_weights: "Free weights (barbell and dumbbell)",
        machines: "Gym machines",
        cables: "Cables",
        resistance_band: "Resistance bands",
        kettlebell: "Kettlebell",
        bodyweight: "Bodyweight",
      } as Record<string, string>
    )[value] ?? value,
  limitationLabel: (value) =>
    ({ knee: "Knee", lower_back: "Lower back", shoulder: "Shoulder", wrist: "Wrist", neck: "Neck" } as Record<string, string>)[value] ?? value,
  dietLabel: (value) =>
    (
      {
        none: "No specific diet",
        weight_loss: "Weight loss",
        bulking: "Bulking (muscle gain)",
        keto: "Ketogenic",
        vegetarian: "Vegetarian",
        vegan: "Vegan",
      } as Record<string, string>
    )[value] ?? value,
  allergyLabel: (value) =>
    ({ dairy: "Dairy", gluten: "Gluten", nuts: "Nuts", seafood: "Seafood", egg: "Egg" } as Record<string, string>)[value] ?? value,
  unknownValue: "—",
  planTierLabel: (value) =>
    ({ FREE: "Free", PREMIUM: "Premium" } as Record<string, string>)[value] ?? value,
  cooperationTypeLabel: (value) =>
    ({ SEMI_PRIVATE: "Semi-private", PRIVATE: "Private" } as Record<string, string>)[value] ?? value,
  cooperationTypeHint: (value) =>
    (
      {
        SEMI_PRIVATE:
          "The coach provides standardized plans and monitors your progress",
        PRIVATE:
          "Private cooperation with closer support; live online sessions in later stages",
      } as Record<string, string>
    )[value] ?? "",
  specializationLabel: (value) =>
    (
      {
        strength: "Strength",
        hypertrophy: "Hypertrophy",
        fat_loss: "Fat loss",
        endurance: "Endurance",
        mobility: "Mobility and flexibility",
        rehab: "Rehab and return to training",
        nutrition_coaching: "Nutrition coaching",
        functional: "Functional training",
      } as Record<string, string>
    )[value] ?? value,
  // Phase 18 — public exercise library
  libraryLoadError: "Loading the exercise library failed; check your connection.",
  retryButton: "Retry",
  loadingLabel: "Loading…",
  categoryGroupAria: "Filter exercises by category",
  pickerShowing: (visible, total) =>
    `Showing ${localeNumber(visible, "en")} of ${localeNumber(total, "en")} exercises`,
  loadMoreButton: "Load more",
};

const STRINGS: Record<Locale, SharedStrings> = { fa: FA, en: EN };

export function sharedStrings(locale: Locale): SharedStrings {
  return STRINGS[locale];
}
