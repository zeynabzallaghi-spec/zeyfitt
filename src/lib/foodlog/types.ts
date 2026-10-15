/**
 * تایپ‌های ثبت مصرف واقعی غذا — قرارداد مشترک سرور و رابط.
 *
 * ثبت مصرف واقعی، مستقل از برنامه غذایی است؛ ارجاع به برنامه اختیاری است
 * و حذف برنامه هرگز تاریخچه را حذف یا بازنویسی نمی‌کند (SetNull در اسکیما).
 * نوع وعده همان enum وعده‌های برنامه غذایی است تا دو سیستم با هم سازگار
 * بمانند و هیچ نگاشت موازی ساخته نشود.
 */

import type { MealType } from "@/lib/nutrition-engine/types";

export type FoodLogMealType = MealType;

/** فهرست ثابت وعده‌ها — ترتیب نمایش در رابط */
export const FOOD_LOG_MEAL_TYPES: FoodLogMealType[] = [
  "breakfast",
  "snack_am",
  "lunch",
  "snack_pm",
  "dinner",
  "snack_ev",
];

/** واحد ثبت مقدار: گرم یا سهم متداول بانک */
export type FoodLogUnit = "g" | "serving";

/** منبع ثبت: بانک غذا یا قلم برنامه غذایی */
export type FoodLogSource = "bank" | "plan_item";

/** یک ثبت مصرف واقعی — همان چیزی که API برمی‌گرداند */
export interface FoodLogEntryClient {
  id: string;
  /** لحظه مصرف به ISO UTC */
  consumedAt: string;
  /** روز محلی YYYY-MM-DD با زمان رسمی ایران — کلید گروه‌بندی روزانه */
  localDay: string;
  mealType: FoodLogMealType;
  source: FoodLogSource;
  foodId: string;
  faName: string;
  enName: string;
  group: string;
  unit: FoodLogUnit;
  /** مقدار در واحد ثبت‌شده (گرم یا تعداد سهم) */
  amount: number;
  /** ضریب تبدیل سهم استفاده‌شده — برای unit=serving؛ تاریخچه مستقل از بانک */
  servingGramsUsed: number | null;
  /** مقدار نهایی گرم پس از تبدیل سمت سرور */
  grams: number;
  /** مقادیر تخمینی محاسبه‌شده سمت سرور — برآورد، نه اندازه‌گیری آزمایشگاهی */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** ارجاع اختیاری برنامه — پس از حذف برنامه null می‌شود (SetNull) */
  planId: string | null;
  planMealId: string | null;
  planItemId: string | null;
  /** مقدار پیشنهادی برنامه هنگام ثبت — برای مقایسه شفاف واقعی/پیشنهادی */
  planItemGrams: number | null;
  createdAt: string;
  updatedAt: string;
}

/** جمع یک روز — از مقادیر خام ثبت‌ها؛ گرد کردن فقط در نمایش انجام می‌شود */
export interface FoodLogDayTotals {
  localDay: string;
  /** تعداد ثبت واقعی — روز بدون ثبت با مصرف صفر یکی نیست */
  count: number;
  hasLogs: boolean;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

/** یک نقطه در روند چندروزه — روز بدون ثبت با روز صفر یکی نیست */
export interface FoodLogTrendPoint {
  localDay: string;
  count: number;
  hasLogs: boolean;
  kcal: number | null;
  protein: number | null;
}

/** مقایسه مصرف واقعی با برنامه فعال — فقط داده معتبر، بدون ادعای پایبندی */
export interface FoodLogPlanComparison {
  /** برنامه فعال وجود دارد و داده هدف معتبر آن خوانده شده است */
  available: boolean;
  planId: string | null;
  planTitle: string | null;
  /** هدف روزانه برنامه از snapshot محاسبات خود برنامه — null یعنی بدون هدف (حالت احتیاط) */
  targetKcal: number | null;
  targetProtein: number | null;
  targetCarb: number | null;
  targetFat: number | null;
  /**
   * قلم‌های برنامه فعال (روز ۱ برای برنامه چندروزه) به‌همراه وضعیت ثبت هر قلم.
   * ارتباط صرفاً با شناسه معتبر ثبت‌های دارای planItemId ساخته می‌شود —
   * تطبیق نام غذا هرگز مبنای ارتباط نیست.
   */
  items: FoodLogPlanItemStatus[];
}

/** وضعیت یک قلم برنامه نسبت به ثبت‌های واقعی همان روز */
export interface FoodLogPlanItemStatus {
  planItemId: string;
  planMealId: string;
  faName: string;
  enName: string;
  /** مقدار پیشنهادی برنامه (گرم) */
  plannedGrams: number;
  /** جمع گرم ثبت‌شده‌های مرتبط با همین قلم در روز انتخابی */
  loggedGrams: number;
  /** آیا حداقل یک ثبت مرتبط دارد — «ثبت نشده» به معنی نخوردن نیست */
  logged: boolean;
}
