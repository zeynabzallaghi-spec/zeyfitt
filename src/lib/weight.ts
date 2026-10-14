import { z } from "zod";
import type { weightEntry as DbWeightEntry } from "@prisma/client";
import { normalizeDigits } from "./profile";

/**
 * لایه مشترک اندازه‌گیری وزن — بین فرم کلاینت و اعتبارسنجی سرور یکسان است.
 * هر رکورد متعلق به یک کاربر مشخص است و شناسه آن همیشه سمت سرور از نشست
 * خوانده می‌شود؛ شناسه ارسالی از مرورگر هرگز ملاک مالکیت نیست.
 */

/* ------------------------------- اعتبارسنجی ------------------------------- */

/** پیش‌پردازش عدد وزن: پذیرش ارقام فارسی/عربی و ٫ و ، */
function toWeightNumber(value: unknown): unknown {
  if (typeof value === "string") {
    const cleaned = normalizeDigits(value).trim().replace(/[٫,]/g, ".");
    if (cleaned === "") return undefined;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

/** پیش‌پردازش تاریخ: ناموجود/خالی → امروز؛ پذیرش فرمت YYYY-MM-DD */
function toRecordedDate(value: unknown): unknown {
  if (value === undefined || value === null || value === "") return new Date();
  if (typeof value === "string") {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed;
  }
  return value;
}

export const weightEntryPayloadSchema = z.object({
  weightKg: z.preprocess(
    toWeightNumber,
    z
      .number({ message: "وزن را وارد کنید" })
      .min(25, "وزن باید حداقل ۲۵ کیلوگرم باشد")
      .max(300, "وزن باید حداکثر ۳۰۰ کیلوگرم باشد")
  ),
  /** تاریخ ثبت — پیش‌فرض امروز (UTC). تاریخ آینده پذیرفته نمی‌شود. */
  recordedAt: z.preprocess(
    toRecordedDate,
    z
      .date({ message: "تاریخ ثبت معتبر نیست" })
      .refine(
        (date) => date.getTime() <= Date.now() + 60_000,
        "تاریخ ثبت نمی‌تواند در آینده باشد"
      )
      .refine(
        (date) => Date.now() - date.getTime() <= 1000 * 60 * 60 * 24 * 366 * 2,
        "تاریخ ثبت نمی‌تواند قدیمی‌تر از دو سال باشد"
      )
  ),
});

export type WeightEntryPayload = z.output<typeof weightEntryPayloadSchema>;

/* ------------------------------ تایپ کلاینت ------------------------------ */

export interface WeightEntryClient {
  id: string;
  weightKg: number;
  /** تاریخ ISO رکورد (ابتدای روز UTC) */
  recordedAt: string;
  createdAt: string;
}

/* --------------------------- تبدیل ردیف دیتابیس --------------------------- */

export function toClientWeightEntry(row: DbWeightEntry): WeightEntryClient {
  return {
    id: row.id,
    weightKg: row.weightKg,
    recordedAt: row.recordedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

/* --------------------------- کمکی‌های نمایش --------------------------- */

const jalaliDayFormatter = new Intl.DateTimeFormat("fa-IR", {
  day: "numeric",
  month: "short",
});

const jalaliFullFormatter = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** برچسب کوتاه روز (برای محور نمودار) */
export function jalaliDayLabel(iso: string): string {
  return jalaliDayFormatter.format(new Date(iso));
}

/** برچسب کامل شمسی (برای تولتیپ و فهرست) */
export function jalaliFullLabel(iso: string): string {
  return jalaliFullFormatter.format(new Date(iso));
}

/**
 * داده نمودار روند وزن — صعودی بر اساس تاریخ، حداکثر N نقطه آخر.
 * بدون هیچ داده ساختگی؛ خروجی خالی یعنی «هنوز داده‌ای وجود ندارد».
 */
export function toWeightChartData(
  entries: WeightEntryClient[],
  maxPoints = 12
): { date: string; label: string; weight: number }[] {
  return [...entries]
    .sort(
      (a, b) =>
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    )
    .slice(-maxPoints)
    .map((entry) => ({
      date: entry.recordedAt,
      label: jalaliDayLabel(entry.recordedAt),
      weight: entry.weightKg,
    }));
}

/** آخرین اندازه‌گیری (جدیدترین بر اساس recordedAt) یا null */
export function latestWeightEntry(
  entries: WeightEntryClient[]
): WeightEntryClient | null {
  if (entries.length === 0) return null;
  return [...entries].sort(
    (a, b) =>
      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
  )[0];
}

/**
 * خلاصه روند: مقایسه آخرین اندازه‌گیری با اولین اندازه‌گیری در بازه اخیر.
 * فقط با داده واقعی محاسبه می‌شود؛ بدون داده خروجی null است.
 */
export function weightTrendSummary(entries: WeightEntryClient[]): {
  diff: number;
  direction: "up" | "down" | "stable";
} | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort(
    (a, b) =>
      new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const diff = Number((last.weightKg - first.weightKg).toFixed(1));
  if (Math.abs(diff) < 0.15) return { diff, direction: "stable" };
  return { diff, direction: diff > 0 ? "up" : "down" };
}
