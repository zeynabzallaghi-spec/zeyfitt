/**
 * اعتبارسنجی ورودی ثبت مصرف واقعی غذا — یک شِما برای فرم کلاینت و سرور
 * (همان الگوی schema موتور تغذیه). اعداد فارسی/عربی نرمال می‌شوند؛
 *
 * نکته امنیتی مهم: هیچ فیلد تغذیه‌ای (kcal/protein/carb/fat/grams محاسبه‌شده)
 * از مرورگر پذیرفته نیست — این مقادیر فقط سمت سرور و بر پایه داده معتبر
 * بانک یا snapshot معتبر قلم برنامه محاسبه می‌شوند. اگر مرورگر چنین فیلدهایی
 * بفرستد، نادیده گرفته می‌شوند (Zod کلیدهای ناشناخته را حذف می‌کند).
 *
 * شناسه کاربر هرگز بخشی از ورودی نیست — فقط از نشست سرور خوانده می‌شود.
 */

import { z } from "zod";
import { FOOD_BANK } from "@/lib/foods";
import { normalizeDigits } from "@/lib/profile";
import { FOOD_LOG_LIMITS, isValidLocalDay } from "./calc";

const FOOD_IDS = FOOD_BANK.map((f) => f.id) as [string, ...string[]];

/** عدد از ارقام فارسی/عربی/لاتین — با اعشار مجاز */
const numberFromDigits = () =>
  z.preprocess((v) => {
    if (typeof v === "string") {
      const cleaned = normalizeDigits(v).trim().replace(/[٫,]/g, ".");
      if (cleaned === "") return undefined;
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? v : parsed;
    }
    return v;
  }, z.number());

export const foodLogUnitSchema = z.enum(["g", "serving"], {
  message: "واحد مقدار معتبر نیست",
});

export const foodLogMealTypeSchema = z.enum(
  ["breakfast", "snack_am", "lunch", "snack_pm", "dinner", "snack_ev"],
  { message: "نوع وعده معتبر نیست" }
);

/** رشته روز محلی YYYY-MM-DD با اعتبارسنجی تقویمی */
export const foodLogLocalDaySchema = z
  .string({ message: "روز را انتخاب کنید" })
  .refine(isValidLocalDay, "روز معتبر نیست");

/** لحظه مصرف — ISO معتبر و در بازه منطقی (۹۰ روز گذشته تا ۱ روز آینده) */
export const foodLogInstantSchema = z
  .string({ message: "زمان مصرف نامعتبر است" })
  .refine((value) => {
    const time = Date.parse(value);
    if (!Number.isFinite(time)) return false;
    const now = Date.now();
    return time <= now + 24 * 60 * 60 * 1000 && time >= now - 90 * 24 * 60 * 60 * 1000;
  }, "زمان مصرف باید در ۹۰ روز گذشته باشد");

/** کلید ایدمپوتنسی — رشته امن کوتاه، تولید آن بر عهده کلاینت است */
export const clientRequestIdSchema = z
  .string()
  .trim()
  .min(8, "کلید درخواست کوتاه است")
  .max(64, "کلید درخواست بلند است")
  .regex(/^[A-Za-z0-9_-]+$/, "کلید درخواست نامعتبر است");

/** مقدار در واحد انتخابی — با حدود منطقی؛ اعتبارسنجی نهایی در هسته محاسبه */
export const foodLogAmountSchema = numberFromDigits().refine(
  (v) => Number.isFinite(v) && v > 0 && v <= Math.max(FOOD_LOG_LIMITS.maxGrams, FOOD_LOG_LIMITS.maxServings),
  "مقدار واردشده معتبر نیست"
);

/** ساخت ثبت جدید — منبع: بانک غذا یا قلم برنامه */
export const createFoodLogSchema = z
  .object({
    source: z.enum(["bank", "plan_item"], { message: "منبع ثبت معتبر نیست" }),
    /** شناسه پایدار بانک — برای source=bank اجباری */
    foodId: z.string().trim().optional(),
    /** شناسه قلم برنامه فعال — برای source=plan_item اجباری */
    planItemId: z.string().trim().optional(),
    unit: foodLogUnitSchema,
    amount: foodLogAmountSchema,
    mealType: foodLogMealTypeSchema,
    consumedAt: foodLogInstantSchema,
    localDay: foodLogLocalDaySchema,
    clientRequestId: clientRequestIdSchema.optional(),
  })
  .refine((data) => data.source === "bank" ? typeof data.foodId === "string" && FOOD_IDS.includes(data.foodId) : true,
    { message: "ماده غذایی انتخاب‌شده در بانک موجود نیست", path: ["foodId"] })
  .refine((data) => data.source === "plan_item" ? typeof data.planItemId === "string" && data.planItemId.length >= 10 : true,
    { message: "قلم برنامه معتبر نیست", path: ["planItemId"] })
  .refine((data) => data.source === "bank" ? data.planItemId === undefined : true,
    { message: "ثبت مستقل از برنامه نباید قلم برنامه داشته باشد", path: ["planItemId"] });

export type CreateFoodLogInput = z.infer<typeof createFoodLogSchema>;

/** ویرایش ثبت — فقط مقدار/واحد/وعده/زمان؛ منبع و ارجاع‌ها تغییر نمی‌کنند */
export const updateFoodLogSchema = z
  .object({
    unit: foodLogUnitSchema.optional(),
    amount: foodLogAmountSchema.optional(),
    mealType: foodLogMealTypeSchema.optional(),
    consumedAt: foodLogInstantSchema.optional(),
    localDay: foodLogLocalDaySchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, "تغییری برای ذخیره ارسال نشده است")
  .refine(
    (data) => (data.consumedAt !== undefined) === (data.localDay !== undefined),
    "زمان و روز باید با هم ارسال شوند"
  );

export type UpdateFoodLogInput = z.infer<typeof updateFoodLogSchema>;

/** پارامتر روز برای GET — YYYY-MM-DD معتبر */
export const foodLogDateParamSchema = z
  .string()
  .refine(isValidLocalDay, "روز معتبر نیست");

/** استخراج نخستین پیام خطا به فارسی — همان الگوی موتور تغذیه */
export function firstFoodLogError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "اطلاعات ارسالی معتبر نیست";
}
