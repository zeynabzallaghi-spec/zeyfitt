/**
 * خواندن همگام زبان فعلی رابط — برای لایه‌های غیر-React (هوک‌های fetch و
 * توابع کمکی) که نمی‌توانند useLocale مصرف کنند.
 *
 * منبع حقیقت همان کوکی «fit-ui-lang» است که setLocale هر بار به‌روز می‌کند؛
 * بنابراین این خواندن همیشه هم‌ارز state فعلی provider است. در محیط بدون
 * سند (SSR/تست) پیش‌فرض fa برمی‌گردد.
 */

import { DEFAULT_LOCALE, localeFromCookieHeader, type Locale } from "./shared";

export function currentUiLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  try {
    return localeFromCookieHeader(document.cookie);
  } catch {
    return DEFAULT_LOCALE;
  }
}
