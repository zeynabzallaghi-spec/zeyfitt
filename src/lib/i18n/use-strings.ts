"use client";

/**
 * قلاب مصرف دیکشنری بخش‌ها — الگوی واحد برای همه بخش‌های اپ:
 *
 *   const t = useStrings(dashboardStrings);
 *   <h1>{t.title}</h1>
 *
 * هر بخش یک فایل دیکشنری در src/lib/i18n/sections دارد: یک اینترفیس
 * تایپ‌شده + دو دیکشنری کامل fa/en + تابع getter بر اساس Locale.
 * چون getter امضای (locale: Locale) => Strings دارد و هر دو دیکشنری
 * اینترفیس را کامل پیاده می‌کنند، از نظر تایپ غیرممکن است کلیدی در یکی
 * از دو زبان جا بماند؛ تست runtime هم تعادل کلیدها را بررسی می‌کند
 * (scripts/check-i18n.ts).
 */

import { useMemo } from "react";
import { useLocale } from "./locale";
import type { Locale } from "./shared";

export function useStrings<T>(get: (locale: Locale) => T): T {
  const locale = useLocale();
  return useMemo(() => get(locale), [get, locale]);
}
