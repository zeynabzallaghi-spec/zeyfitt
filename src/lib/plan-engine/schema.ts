/**
 * اعتبارسنجی تنظیمات برنامه — یک شِما برای فرم کلاینت و سرور.
 * پیام‌ها فارسی‌اند؛ اعداد فارسی/عربی نرمال می‌شوند؛ هیچ فیلد هویتی
 * پذیرفته نمی‌شود (مالکیت فقط از نشست).
 */

import { z } from "zod";
import {
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  type EquipmentId,
  type ExerciseCategoryId,
} from "@/lib/exercises/types";
import { normalizeDigits, faDigits } from "@/lib/profile";

const EQUIPMENT_IDS = EQUIPMENT_TYPES.map((e) => e.id) as [EquipmentId, ...EquipmentId[]];
const CATEGORY_IDS = EXERCISE_CATEGORIES.map((c) => c.id) as [
  ExerciseCategoryId,
  ...ExerciseCategoryId[]
];

/** شناسه تمرکز: all | upper | lower | شناسه دسته معتبر */
const FOCUS_IDS = ["all", "upper", "lower", ...EXERCISE_CATEGORIES.map((c) => c.id)] as const;

/** شِمای عنوان برنامه — برای PATCH عنوان ذخیره‌شده */
export const planTitleSchema = z
  .string({ message: "عنوان برنامه را وارد کنید" })
  .trim()
  .min(2, "عنوان برنامه باید حداقل ۲ کاراکتر باشد")
  .max(80, "عنوان برنامه حداکثر ۸۰ کاراکتر است");

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

export const planSettingsSchema = z.object({
  goal: z.enum(["fat_loss", "muscle_gain", "strength", "maintain", "fitness"], {
    message: "هدف تمرینی را انتخاب کنید",
  }),
  experience: z.enum(["beginner", "intermediate", "advanced"], {
    message: "سطح تجربه را انتخاب کنید",
  }),
  daysPerWeek: intFromDigits()
    .refine((v) => v >= 2 && v <= 6, "تعداد روزهای تمرین باید بین ۲ تا ۶ روز باشد"),
  sessionMinutes: intFromDigits()
    .refine(
      (v) => v === 30 || v === 45 || v === 60 || v === 90,
      "مدت جلسه باید یکی از مقادیر ۳۰، ۴۵، ۶۰ یا ۹۰ دقیقه باشد"
    ),
  equipment: z
    .array(z.enum(EQUIPMENT_IDS))
    .min(1, "حداقل یک نوع تجهیزات در دسترس را انتخاب کنید")
    .max(EQUIPMENT_IDS.length, "فهرست تجهیزات نامعتبر است"),
  focus: z.enum(FOCUS_IDS).default("all"),
  preferredDays: z
    .array(intFromDigits().refine((v) => Number.isInteger(v) && v >= 0 && v <= 6, "روز هفته نامعتبر است"))
    .max(6, "حداکثر ۶ روز ترجیحی قابل انتخاب است")
    .default([])
    .refine((days) => new Set(days).size === days.length, "روزهای ترجیحی تکراری هستند"),
  excludedCategories: z
    .array(z.enum(CATEGORY_IDS))
    .max(CATEGORY_IDS.length - 1, "نمی‌توان همه دسته‌های حرکتی را حذف کرد")
    .default([]),
  excludedExerciseIds: z
    .array(z.string().trim().min(1).max(64))
    .max(48, "فهرست حرکات حذف‌شده بسیار طولانی است")
    .default([]),
  limitationNotes: z
    .string()
    .trim()
    .max(500, "توضیحات حداکثر ۵۰۰ کاراکتر است")
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type PlanSettingsPayload = z.output<typeof planSettingsSchema>;
export type PlanSettingsInput = z.input<typeof planSettingsSchema>;

/** تبدیل آرایه preferredDays خروجی preprocess به عدد صحیح (نوع‌دهی امن) */
export function normalizedPreferredDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [];
  return days
    .map((d) => (typeof d === "number" ? d : Number(normalizeDigits(String(d)))))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
}

/** پیام فارسی نخستین خطا برای نمایش در UI و پاسخ API */
export function firstPlanSettingsError(error: z.ZodError): string {
  return error.issues[0]?.message ?? `اطلاعات برنامه معتبر نیست (${faDigits(error.issues.length)} خطا)`;
}
