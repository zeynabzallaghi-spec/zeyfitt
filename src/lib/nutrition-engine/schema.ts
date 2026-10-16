/**
 * اعتبارسنجی تنظیمات برنامه غذایی — یک شِما برای فرم کلاینت و سرور.
 * پیام‌ها فارسی‌اند؛ اعداد فارسی/عربی نرمال می‌شوند؛ هیچ فیلد هویتی
 * پذیرفته نمی‌شود (مالکیت فقط از نشست). مقادیر منفی، واحدهای نامعتبر و
 * ساختارهای ناقص رد می‌شوند.
 */

import { z } from "zod";
import { ALLERGEN_DEFS, FOOD_BANK, type AllergenId } from "@/lib/foods";
import { normalizeDigits, faDigits } from "@/lib/profile";
import type { Locale } from "@/lib/i18n/shared";

const ALLERGEN_IDS = ALLERGEN_DEFS.map((a) => a.id) as [AllergenId, ...AllergenId[]];
const FOOD_IDS = FOOD_BANK.map((f) => f.id) as [string, ...string[]];

const intFromDigits = () =>
  z.preprocess((v) => {
    if (typeof v === "string") {
      const cleaned = normalizeDigits(v).trim();
      if (cleaned === "") return undefined;
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? v : parsed;
    }
    return v;
  }, z.number());

export const nutritionTitleSchema = z
  .string({ message: "عنوان برنامه را وارد کنید" })
  .trim()
  .min(2, "عنوان برنامه باید حداقل ۲ کاراکتر باشد")
  .max(80, "عنوان برنامه حداکثر ۸۰ کاراکتر است");

export const nutritionSettingsSchema = z.object({
  /** زبان تولید محتوای برنامه — انتخاب صریح کلاینت (زبان رابط کاربر) */
  contentLocale: z.enum(["fa", "en"]).default("fa"),
  goal: z.enum(["weight_loss", "muscle_gain", "maintain"], {
    message: "هدف تغذیه‌ای را انتخاب کنید",
  }),
  activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"], {
    message: "سطح فعالیت روزانه را انتخاب کنید",
  }),
  mealsPerDay: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= 3 && v <= 6,
    { message: "تعداد وعده‌ها باید بین ۳ تا ۶ باشد", params: { ck: "MEALS_COUNT_RANGE" } }
  ),
  planLength: intFromDigits().refine(
    (v) => v === 1 || v === 7,
    { message: "طول برنامه باید ۱ روز یا ۷ روز باشد", params: { ck: "PLAN_LENGTH_VALUE" } }
  ),
  dietPattern: z.enum(["none", "vegetarian", "vegan"], {
    message: "الگوی غذایی را انتخاب کنید",
  }),
  allergens: z
    .array(z.enum(ALLERGEN_IDS))
    .max(ALLERGEN_IDS.length, "فهرست آلرژی‌ها نامعتبر است")
    .default([]),
  dislikedFoodIds: z
    .array(z.enum(FOOD_IDS))
    .max(FOOD_BANK.length - 1, "نمی‌توان همه مواد غذایی را حذف کرد")
    .default([]),
  budget: z.enum(["any", "low"]).default("any"),
  prep: z.enum(["any", "simple"]).default("any"),
  pregnancyBreastfeeding: z.boolean().default(false),
  estimate: z
    .object({
      age: intFromDigits().refine(
        (v) => v >= 10 && v <= 90,
        { message: "سن باید بین ۱۰ تا ۹۰ باشد", params: { ck: "ESTIMATE_AGE_RANGE" } }
      ),
      heightCm: intFromDigits().refine(
        (v) => v >= 100 && v <= 250,
        { message: "قد باید بین ۱۰۰ تا ۲۵۰ سانتی‌متر باشد", params: { ck: "ESTIMATE_HEIGHT_RANGE" } }
      ),
      weightKg: intFromDigits().refine(
        (v) => v >= 25 && v <= 300,
        { message: "وزن باید بین ۲۵ تا ۳۰۰ کیلوگرم باشد", params: { ck: "ESTIMATE_WEIGHT_RANGE" } }
      ),
      gender: z.enum(["male", "female", "undisclosed"]).default("undisclosed"),
    })
    .nullable()
    .default(null),
});

/** زبان تولید محتوا از تنظیمات — با پیش‌فرض امن */
export function contentLocaleOf(value: unknown): Locale {
  return value === "en" ? "en" : "fa";
}

export type NutritionSettingsPayload = z.output<typeof nutritionSettingsSchema>;
export type NutritionSettingsInput = z.input<typeof nutritionSettingsSchema>;

/** پیام فارسی نخستین خطا برای نمایش در UI و پاسخ API */
export function firstNutritionSettingsError(error: z.ZodError): string {
  return (
    error.issues[0]?.message ??
    `اطلاعات برنامه غذایی معتبر نیست (${faDigits(error.issues.length)} خطا)`
  );
}

/* ------------------------- اعتبارسنجی تغییرات وعده‌ها ------------------------- */

/** تغییر مقدار یک ماده — گرم ۱۰ تا ۱۵۰۰، بدون مقدار منفی/غیرعددی */
export const updateItemSchema = z.object({
  action: z.literal("update_item"),
  dayOrder: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= 1 && v <= 7,
    { message: "روز نامعتبر است", params: { ck: "DAY_ORDER_RANGE" } }
  ),
  mealOrder: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= 1 && v <= 6,
    { message: "وعده نامعتبر است", params: { ck: "MEAL_ORDER_RANGE" } }
  ),
  itemOrder: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= 1 && v <= 12,
    { message: "ماده نامعتبر است", params: { ck: "ITEM_ORDER_RANGE" } }
  ),
  grams: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= 10 && v <= 1500,
    { message: "مقدار باید بین ۱۰ تا ۱۵۰۰ گرم باشد", params: { ck: "GRAMS_RANGE" } }
  ),
});

/** جایگزینی یک ماده — شناسه باید در بانک موجود باشد */
export const replaceItemSchema = z.object({
  action: z.literal("replace_item"),
  dayOrder: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= 1 && v <= 7,
    { message: "روز نامعتبر است", params: { ck: "DAY_ORDER_RANGE" } }
  ),
  mealOrder: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= 1 && v <= 6,
    { message: "وعده نامعتبر است", params: { ck: "MEAL_ORDER_RANGE" } }
  ),
  itemOrder: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= 1 && v <= 12,
    { message: "ماده نامعتبر است", params: { ck: "ITEM_ORDER_RANGE" } }
  ),
  newFoodId: z.enum(FOOD_IDS, { message: "ماده جایگزین در بانک مواد غذایی یافت نشد" }),
});

export const nutritionPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("title"), title: nutritionTitleSchema }),
  z.object({ action: z.literal("status"), status: z.enum(["active", "archived"]) }),
  updateItemSchema,
  replaceItemSchema,
]);

export type NutritionPatchPayload = z.output<typeof nutritionPatchSchema>;

/** پارامتر فهرست خرید — روزهای انتخابی برنامه (مثل «1,3,5» یا خالی=همه) */
export function parseShoppingDaysParam(param: string | null, maxDays: number): number[] | null {
  if (!param || param.trim() === "" || param === "all") {
    return Array.from({ length: maxDays }, (_, i) => i + 1);
  }
  const days = param
    .split(",")
    .map((d) => Number(normalizeDigits(d.trim())))
    .filter((d) => Number.isInteger(d) && d >= 1 && d <= maxDays);
  if (days.length === 0) return null;
  return [...new Set(days)].sort((a, b) => a - b);
}
