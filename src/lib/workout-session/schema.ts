/**
 * اعتبارسنجی عملیات جلسه تمرینی — یک شِما برای فرم کلاینت و سرور.
 * پیام‌ها فارسی‌اند؛ ارقام فارسی/عربی نرمال می‌شوند؛ هیچ فیلد هویتی
 * پذیرفته نمی‌شود (مالکیت همیشه سمت سرور از نشست تعیین می‌شود).
 *
 * قواعد خاص مدل داده:
 *  - تعداد تکرار و وزنه منفی رد می‌شوند.
 *  - وزنه اختیاری است (حرکات وزن بدن و «وزنه نامعلوم») و صفر مجاز است.
 *  - شماره ست باید عدد صحیح در بازه مجاز باشد.
 */

import { z } from "zod";
import { normalizeDigits, faDigits } from "@/lib/profile";
import {
  SET_NUMBER_MIN,
  SET_NUMBER_MAX,
  REPS_MIN,
  REPS_MAX,
  WEIGHT_MIN,
  WEIGHT_MAX,
  SESSION_EXERCISES_MAX,
  NOTES_MAX,
} from "./types";

/* ------------------------------ پیش‌پردازش اعداد ------------------------------ */

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

const weightFromDigits = () =>
  z.preprocess((v) => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "string") {
      const cleaned = normalizeDigits(v).trim().replace(/[٫,]/g, ".");
      if (cleaned === "") return null;
      const parsed = Number(cleaned);
      return Number.isNaN(parsed) ? v : parsed;
    }
    return v;
  }, z.number().nullable());

/* ------------------------------ شروع جلسه ------------------------------ */

const exerciseIdField = z
  .string({ message: "شناسه حرکت معتبر نیست" })
  .trim()
  .min(1, "شناسه حرکت خالی است")
  .max(64, "شناسه حرکت نامعتبر است");

export const startSessionSchema = z
  .object({
    /** زبان تولید عنوان جلسه (تمرین آزاد) — انتخاب صریح کلاینت */
    contentLocale: z.enum(["fa", "en"]).default("fa"),
    /** شروع از روز برنامه ذخیره‌شده کاربر */
    planDayId: z.string().trim().min(1).max(64).optional(),
    /** تمرین آزاد — فقط حرکات واقعی بانک حرکات مرحله ۵ */
    exercises: z
      .array(z.object({ exerciseId: exerciseIdField }))
      .min(1, "برای تمرین آزاد حداقل یک حرکت از کتابخانه انتخاب کنید")
      .max(SESSION_EXERCISES_MAX, `حداکثر ${faDigits(SESSION_EXERCISES_MAX)} حرکت در یک جلسه مجاز است`)
      .optional(),
  })
  .refine(
    (data) => Boolean(data.planDayId) !== Boolean(data.exercises?.length),
    { message: "جلسه باید یا از روز برنامه شروع شود یا فهرست حرکات تمرین آزاد داشته باشد" }
  );

export type StartSessionPayload = z.output<typeof startSessionSchema>;

/* ------------------------------ ثبت ست ------------------------------ */

export const setLogSchema = z.object({
  sessionExerciseId: z
    .string({ message: "شناسه حرکت جلسه معتبر نیست" })
    .trim()
    .min(1)
    .max(64),
  setNumber: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= SET_NUMBER_MIN && v <= SET_NUMBER_MAX,
    { message: `شماره ست باید عددی بین ${faDigits(SET_NUMBER_MIN)} تا ${faDigits(SET_NUMBER_MAX)} باشد`, params: { ck: "SET_NUMBER_RANGE" } }
  ),
  reps: intFromDigits().refine(
    (v) => Number.isInteger(v) && v >= REPS_MIN && v <= REPS_MAX,
    { message: `تعداد تکرار باید عددی بین ${faDigits(REPS_MIN)} تا ${faDigits(REPS_MAX)} باشد`, params: { ck: "REPS_RANGE" } }
  ),
  /** وزنه اختیاری — null یعنی بدون بار خارجی (وزن بدن یا نامعلوم) */
  weightKg: weightFromDigits().refine(
    (v) => v === null || (v >= WEIGHT_MIN && v <= WEIGHT_MAX),
    { message: `وزنه باید بین ${faDigits(WEIGHT_MIN)} تا ${faDigits(WEIGHT_MAX)} کیلوگرم باشد`, params: { ck: "WEIGHT_RANGE" } }
  ),
  note: z.string().trim().max(200, "یادداشت ست حداکثر ۲۰۰ کاراکتر است").nullish(),
});

export type SetLogPayload = z.output<typeof setLogSchema>;

/* ------------------------------ وضعیت حرکت ------------------------------ */

export const exerciseStatusSchema = z.object({
  status: z.enum(["pending", "done", "skipped"], {
    message: "وضعیت حرکت معتبر نیست",
  }),
});

/* ------------------------------ افزودن حرکت آزاد ------------------------------ */

export const addExerciseSchema = z.object({
  exerciseId: exerciseIdField,
});

/* ------------------------------ پایان جلسه ------------------------------ */

export const finishSessionSchema = z.object({
  action: z.enum(["complete", "abandon"], { message: "نوع پایان جلسه معتبر نیست" }),
  notes: z
    .string()
    .trim()
    .max(NOTES_MAX, `یادداشت حداکثر ${faDigits(NOTES_MAX)} کاراکتر است`)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/** زبان تولید عنوان جلسه — با پیش‌فرض امن */
export function contentLocaleOf(value: unknown): "fa" | "en" {
  return value === "en" ? "en" : "fa";
}

export type FinishSessionPayload = z.output<typeof finishSessionSchema>;

/* ------------------------------ پرس‌وجوی تاریخچه ------------------------------ */

export const historyQuerySchema = z.object({
  status: z.enum(["in_progress", "completed", "abandoned"]).optional(),
  /** تاریخ شروع بازه — ISO یا YYYY-MM-DD */
  from: z
    .string()
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), "تاریخ شروع بازه معتبر نیست"),
  /** تاریخ پایان بازه — ISO یا YYYY-MM-DD (شمول تا پایان روز) */
  to: z
    .string()
    .optional()
    .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), "تاریخ پایان بازه معتبر نیست"),
  limit: z
    .string()
    .optional()
    .refine((v) => v === undefined || (/^\d+$/.test(v) && Number(v) >= 1 && Number(v) <= 100), "سقف فهرست باید عددی بین ۱ تا ۱۰۰ باشد"),
});

/** پیام فارسی نخستین خطا برای نمایش در UI و پاسخ API */
export function firstSessionError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "اطلاعات ارسالی معتبر نیست";
}
