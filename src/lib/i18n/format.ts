/**
 * قالب‌بندی تاریخ و عدد بر اساس زبان رابط — جدا از داده ذخیره‌شده.
 *
 * قاعده الزام پروژه:
 *  - فارسی → تقویم شمسی با Intl fa-IR (دقیقاً همان رفتار فعلی برنامه) و
 *    ارقام فارسی.
 *  - انگلیسی → تقویم گرگوری با locale انگلیسی و ارقام لاتین.
 *
 * تغییر زبان هیچ مقدار ذخیره‌شده یا محاسبه‌ای را تغییر نمی‌دهد؛ فقط
 * «نمایش» قالب‌بندی می‌شود. مقادیر ورودی همیشه همان ISO/string عددی
 * قبلی‌اند.
 */

import type { Locale } from "./shared";

/* ----------------------------- فرمت‌کننده‌ها ----------------------------- */
// استایل‌های فارسی عیناً همان استایل‌های قبلی برنامه‌اند (src/lib/weight.ts
// و سربرگ) تا رگرسیون نمایشی رخ ندهد.

const faDay = new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short" });
const faFull = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const faDateTime = new Intl.DateTimeFormat("fa-IR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const faWeekday = new Intl.DateTimeFormat("fa-IR", { weekday: "long" });

const enDay = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const enFull = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
});
const enDateTime = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const enWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" });

const numberFmt: Record<Locale, Intl.NumberFormat> = {
  fa: new Intl.NumberFormat("fa-IR"),
  en: new Intl.NumberFormat("en-GB"),
};

const decimalFmt: Record<Locale, (digits: number) => Intl.NumberFormat> = {
  fa: (digits) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: digits }),
  en: (digits) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }),
};

/** عدد صحیح با ارقام و جداکننده متناسب با زبان (fa: ارقام فارسی) */
export function localeNumber(value: number, locale: Locale): string {
  return numberFmt[locale].format(value);
}

/** عدد اعشاری با حداکثر «digits» رقم اعشار، متناسب با زبان */
export function localeDecimal(value: number, digits: number, locale: Locale): string {
  return decimalFmt[locale](digits).format(value);
}

/** برچسب کوتاه روز — محور نمودارها (فارسی: شمسی؛ انگلیسی: گرگوری) */
export function localeDayLabel(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return locale === "fa" ? faDay.format(date) : enDay.format(date);
}

/** برچسب کامل تاریخ — تولتیپ و فهرست‌ها */
export function localeFullLabel(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return locale === "fa" ? faFull.format(date) : enFull.format(date);
}

/** تاریخ + ساعت (برای زمان‌های ثبت جلسه، غذا و…) */
export function localeDateTimeLabel(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return locale === "fa" ? faDateTime.format(date) : enDateTime.format(date);
}

/** نام روز هفته */
export function localeWeekdayLabel(iso: string, locale: Locale): string {
  const date = new Date(iso);
  return locale === "fa" ? faWeekday.format(date) : enWeekday.format(date);
}

/** تاریخ امروز به‌صورت کامل — جایگزین locale-aware برای JalaliToday سربرگ */
export function localeTodayFull(locale: Locale): string {
  const date = new Date();
  return locale === "fa" ? faFull.format(date) : enFull.format(date);
}
