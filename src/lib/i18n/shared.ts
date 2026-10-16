/**
 * هسته مشترک زبان رابط — بدون «use client» و بدون وابستگی به React،
 * تا هم در کامپوننت‌های سرور (layout/page برای انتخاب lang و dir اولیه
 * از روی کوکی) و هم در کلاینت قابل استفاده باشد.
 *
 * منبع حقیقت: کوکی «fit-ui-lang» (یک سال، SameSite=Lax) + آینه localStorage.
 * - رفرش صفحه، ورود مجدد و جابه‌جایی بین بخش‌ها زبان را حفظ می‌کند.
 * - سمت سرور هم همان کوکی خوانده می‌شود تا SSR و هیدراتیشن همیشه هم‌زبان
 *   باشند (بدون mismatch و بدون فلش جهت اشتباه).
 * - زبان «داده» (نام حرکات، غذاها، محتوای ثبت‌شده کاربر) از زبان «رابط»
 *   کاملاً جدا است؛ این ماژول فقط زبان رابط را مدیریت می‌کند.
 */

export type Locale = "fa" | "en";
export type Dir = "rtl" | "ltr";

export const UI_LANG_COOKIE = "fit-ui-lang";
export const UI_LANG_STORAGE_KEY = "fit-ui-lang";
export const UI_LANG_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // یک سال

export const LOCALES: readonly Locale[] = ["fa", "en"];

/** زبان پیش‌فرض اپ — فارسی (رفتار فعلی حفظ شده است) */
export const DEFAULT_LOCALE: Locale = "fa";

export function dirOf(locale: Locale): Dir {
  return locale === "fa" ? "rtl" : "ltr";
}

export function otherLocale(locale: Locale): Locale {
  return locale === "fa" ? "en" : "fa";
}

/** بررسی سخت‌گیرانه مقدار — هر چیز دیگری به پیش‌فرض برمی‌گردد */
export function isLocale(value: unknown): value is Locale {
  return value === "fa" || value === "en";
}

export function toLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * خواندن زبان از متن کامل کوکی‌های مرورگر (سمت کلاینت) —
 * بدون وابستگی به next/headers تا در هر جایی قابل استفاده باشد.
 */
export function localeFromCookieHeader(cookieHeader: string | null | undefined): Locale {
  if (!cookieHeader) return DEFAULT_LOCALE;
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${UI_LANG_COOKIE}=(fa|en)(?:;|$)`)
  );
  return match ? (match[1] as Locale) : DEFAULT_LOCALE;
}
