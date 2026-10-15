/**
 * هسته محاسباتی ثبت مصرف واقعی — توابع خالص و قابل‌تست، بدون وابستگی به
 * Prisma یا UI. قواعد تبدیل واحد و مقدار فقط همین‌جاست تا سرور و رابط
 * همیشه یک رفتار داشته باشند.
 *
 * قواعد صادقانگی:
 *  - مقادیر نهایی «تخمینی»اند (میانگین جداول عمومی)، نه اندازه‌گیری آزمایشگاهی.
 *  - هیچ فرضی درباره وزن بخش خوراکی، روغن پخت یا روش پخت وجود ندارد؛
 *    فقط داده معتبر بانک یا snapshot معتبر قلم برنامه مبنای محاسبه است.
 *  - گرد کردن در محاسبه جمع روزانه انجام نمی‌شود؛ جمع از مقادیر خام است و
 *    گرد کردن فقط در نمایش رخ می‌دهد (بدون انباشت خطای گرد کردن).
 */

import type { FoodItem } from "@/lib/foods";

/* ------------------------------- حدود مجاز ------------------------------- */

/** سقف و کف منطقی مقدار — مقادیر خارج از این حدود رد می‌شوند */
export const FOOD_LOG_LIMITS = {
  /** حداقل گرم برای یک ثبت واقعی */
  minGrams: 1,
  /** حداکثر گرم یک ثبت — بیش از آن برای یک مورد غذا نامعقول است */
  maxGrams: 2000,
  /** حداقل سهم قابل ثبت */
  minServings: 0.25,
  /** حداکثر سهم قابل ثبت */
  maxServings: 10,
  /** حداکثر ثبت در یک روز — سقف عملیاتی ضد سوءاستفاده */
  maxLogsPerDay: 60,
} as const;

/** بررسی عدد معتبر: متناهی، مثبت — صفر و منفی نامعتبر است */
export function isValidPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/* ------------------------------- تبدیل واحد ------------------------------- */

export interface ResolvedAmount {
  grams: number;
  servingGramsUsed: number | null;
}

/**
 * تبدیل مقدار ثبت‌شده به گرم.
 *  - unit = "g" → همان مقدار (با اعتبارسنجی حدود)
 *  - unit = "serving" → amount × servingGrams (ضریب معتبر اجباری)
 *
 * اگر ضریب سهم در دسترس یا معتبر نباشد، انتخاب «سهم» از ابتدا مجاز نیست —
 * این تابع خطا پر می‌کند و لایه API آن را به پیام شفاف تبدیل می‌کند.
 * هیچ مقدار پیش‌فرض ساختگی جای ضریب واقعی نمی‌نشیند.
 */
export function resolveAmountToGrams(
  unit: "g" | "serving",
  amount: number,
  servingGrams: number | null | undefined
): ResolvedAmount {
  if (!isValidPositiveNumber(amount)) {
    throw new FoodLogCalcError("INVALID_AMOUNT");
  }
  if (unit === "g") {
    if (amount < FOOD_LOG_LIMITS.minGrams || amount > FOOD_LOG_LIMITS.maxGrams) {
      throw new FoodLogCalcError("GRAMS_OUT_OF_RANGE");
    }
    return { grams: amount, servingGramsUsed: null };
  }
  // unit === "serving"
  if (
    !isValidPositiveNumber(servingGrams) ||
    servingGrams < FOOD_LOG_LIMITS.minGrams ||
    servingGrams > FOOD_LOG_LIMITS.maxGrams
  ) {
    // بانک داده سهم معتبری برای این ماده ندارد — انتخاب سهم باید مسدود شود
    throw new FoodLogCalcError("SERVING_UNIT_UNSUPPORTED");
  }
  if (amount < FOOD_LOG_LIMITS.minServings || amount > FOOD_LOG_LIMITS.maxServings) {
    throw new FoodLogCalcError("SERVINGS_OUT_OF_RANGE");
  }
  const grams = Math.round(amount * servingGrams * 10) / 10;
  if (grams < FOOD_LOG_LIMITS.minGrams || grams > FOOD_LOG_LIMITS.maxGrams) {
    throw new FoodLogCalcError("GRAMS_OUT_OF_RANGE");
  }
  return { grams, servingGramsUsed: servingGrams };
}

/** خطای محاسبه با کد قابل‌ترجمه — پیام نمایشی در لایه i18n ساخته می‌شود */
export class FoodLogCalcError extends Error {
  constructor(public readonly code:
    | "INVALID_AMOUNT"
    | "GRAMS_OUT_OF_RANGE"
    | "SERVINGS_OUT_OF_RANGE"
    | "SERVING_UNIT_UNSUPPORTED"
    | "MISSING_FOOD_DATA") {
    super(code);
    this.name = "FoodLogCalcError";
  }
}

/* ------------------------------- محاسبه تغذیه ------------------------------- */

export interface LogNutrition {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

/** مقادیر درشت‌مغذی به‌ازای ۱۰۰ گرم — از بانک یا snapshot معتبر */
export interface Per100Values {
  kcal100: number;
  protein100: number;
  carb100: number;
  fat100: number;
}

/**
 * محاسبه مقادیر تخمینی یک ثبت از مقادیر ۱۰۰ گرمی معتبر.
 * خروجی: kcal صحیح، مکروها با یک اعشار — همان قرارداد macrosForGrams بانک.
 * هر مقدار ۱۰۰ نامعتبر (منفی/صفر کل/نامتناهی) خطاست، نه صفرِ ساختگی.
 */
export function computeLogNutrition(per100: Per100Values, grams: number): LogNutrition {
  const values = [per100.kcal100, per100.protein100, per100.carb100, per100.fat100];
  if (values.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0)) {
    throw new FoodLogCalcError("MISSING_FOOD_DATA");
  }
  if (!isValidPositiveNumber(grams)) {
    throw new FoodLogCalcError("INVALID_AMOUNT");
  }
  const factor = grams / 100;
  return {
    kcal: Math.round(per100.kcal100 * factor),
    protein: Math.round(per100.protein100 * factor * 10) / 10,
    carb: Math.round(per100.carb100 * factor * 10) / 10,
    fat: Math.round(per100.fat100 * factor * 10) / 10,
  };
}

/** مقادیر ۱۰۰ گرمی یک ماده بانک — پل مشترک بانک به هسته محاسبه */
export function per100OfBankFood(food: FoodItem): Per100Values {
  return {
    kcal100: food.kcal100,
    protein100: food.protein100,
    carb100: food.carb100,
    fat100: food.fat100,
  };
}

/* ------------------------------- زمان و روز ------------------------------- */

/**
 * روز محلی به‌صورت YYYY-MM-DD با زمان رسمی ایران (UTC+3:30 ثابت —
 * همان قرارداد آمار جلسات تمرین در src/lib/workout-session/stats.ts).
 * مرز روز مستقل از منطقه زمانی مرورگر است و با تغییر آن جابه‌جا نمی‌شود.
 */
export function tehranLocalDay(timeMs: number): string {
  const shifted = new Date(timeMs + TEHRAN_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** زمان رسمی ایران: UTC+3:30 (بدون ساعت تابستانی از سال ۲۰۲۲) */
export const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

/** الگوی روز محلی — YYYY-MM-DD واقعی (مثلاً 2026-02-30 نامعتبر است) */
const LOCAL_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** اعتبارسنجی ساختاری + تقویمی رشته روز محلی */
export function isValidLocalDay(value: unknown): value is string {
  if (typeof value !== "string" || !LOCAL_DAY_PATTERN.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * بررسی نزدیکی لحظه مصرف به روز ادعاشده — از جلوگیریِ جابه‌جایی ناخواسته
 * روز به‌ازای اختلاف منطقه زمانی. اختلاف مجاز: ۲۶ ساعت (بیشترین اختلاف
 * منطقی بین دو منطقه زمانی + حاشیه امن). خارج از آن رد می‌شود.
 */
export function instantMatchesLocalDay(timeMs: number, localDay: string): boolean {
  if (!isValidLocalDay(localDay)) return false;
  const claimed = Date.parse(`${localDay}T00:00:00Z`);
  if (!Number.isFinite(claimed)) return false;
  const diff = Math.abs(timeMs - claimed);
  return diff <= 26 * 60 * 60 * 1000;
}

/**
 * لحظه پیش‌فرض ثبت «همین حالا» برای یک روز محلی — استفاده UI هنگام ثبت
 * از برنامه (کاربر زمان خاصی انتخاب نکرده است): الان، در صورت نیاز محدود
 * به همان روز تهران.
 */
export function defaultInstantForToday(nowMs: number): number {
  return nowMs;
}

/**
 * ساخت لحظه UTC از روز محلی + ساعت محلی تهران.
 * Tehran = UTC+3:30 → UTC = زمان محلی − ۳:۳۰.
 * این تابع تضمین می‌کند «روز انتخابی کاربر» با localDay محاسبه‌شده سرور
 * دقیقاً یکی باشد، فارغ از منطقه زمانی مرورگر.
 */
export function tehranInstantFromDayTime(localDay: string, hhmm: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return Number.NaN;
  const base = Date.parse(`${localDay}T${match[1]}:${match[2]}:00Z`);
  if (!Number.isFinite(base)) return Number.NaN;
  return base - TEHRAN_OFFSET_MS;
}

/** ساعت محلی تهران (HH:mm) از یک لحظه — برای نمایش و ویرایش */
export function tehranTimeLabel(timeMs: number): string {
  const shifted = new Date(timeMs + TEHRAN_OFFSET_MS);
  const h = String(shifted.getUTCHours()).padStart(2, "0");
  const m = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** روزهای محلی n روز منتهی به localDay (شامل خودش) — برای روند چندروزه */
export function lastNDays(localDay: string, n: number): string[] {
  // رشته روز، خودش روز تقویمی است؛ دنباله روزها روی مبنای UTC ساخته می‌شود
  const base = Date.parse(`${localDay}T00:00:00Z`);
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const shifted = new Date(base - i * 24 * 60 * 60 * 1000);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
    const d = String(shifted.getUTCDate()).padStart(2, "0");
    days.push(`${y}-${m}-${d}`);
  }
  return days;
}

/* ------------------------------- جمع روزانه ------------------------------- */

/**
 * جمع خام یک روز از ثبت‌ها — بدون گرد کردن اضافه؛ مقادیر ذخیره‌شده هر ثبت
 * دقیقاً همان خروجی computeLogNutrition است و جمع فقط یک بار در نمایش
 * گرد می‌شود (kcal صحیح می‌ماند، مکروها یک اعشار نمایش داده می‌شوند).
 */
export function aggregateDayTotals(
  localDay: string,
  logs: { kcal: number; protein: number; carb: number; fat: number }[]
): { localDay: string; count: number; hasLogs: boolean; kcal: number; protein: number; carb: number; fat: number } {
  let kcal = 0;
  let protein = 0;
  let carb = 0;
  let fat = 0;
  for (const log of logs) {
    kcal += log.kcal;
    protein += log.protein;
    carb += log.carb;
    fat += log.fat;
  }
  return {
    localDay,
    count: logs.length,
    hasLogs: logs.length > 0,
    kcal,
    protein: Math.round(protein * 10) / 10,
    carb: Math.round(carb * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}
