"use client";

/**
 * فراهم‌کننده زبان رابط — تک منبع زبان برای کل اپ.
 *
 * زبان اولیه از کوکی خوانده و توسط page.tsx (سمت سرور) به‌عنوان prop
 * تزریق می‌شود؛ بنابراین SSR و هیدراتیشن همیشه هم‌زبان‌اند. تغییر زبان
 * هم‌زمان سه کار می‌کند:
 *   ۱) به‌روزرسانی state (رندر مجدد همه بخش‌های مصرف‌کننده)
 *   ۲) نوشتن کوکی یک‌ساله + آینه localStorage (پایداری پس از refresh/ورود مجدد)
 *   ۳) تنظیم lang و dir روی <html> (تغییر فوری جهت کل سند)
 *
 * هیچ زبانی در JSX پراکنده hardcode نمی‌شود؛ کامپوننت‌ها از
 * useLocale/useDir + دیکشنری‌های بخش‌ها (src/lib/i18n/sections/*) مصرف می‌کنند.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  dirOf,
  isLocale,
  localeFromCookieHeader,
  UI_LANG_COOKIE,
  UI_LANG_COOKIE_MAX_AGE,
  UI_LANG_STORAGE_KEY,
  type Dir,
  type Locale,
} from "./shared";

export interface UiLangContextValue {
  locale: Locale;
  dir: Dir;
  /** تغییر زبان رابط — کوکی، localStorage و جهت سند را هم‌زمان به‌روز می‌کند */
  setLocale: (next: Locale) => void;
}

const UiLangContext = createContext<UiLangContextValue | null>(null);

export function UiLangProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof document !== "undefined") {
      document.cookie = `${UI_LANG_COOKIE}=${next}; path=/; max-age=${UI_LANG_COOKIE_MAX_AGE}; SameSite=Lax`;
      try {
        localStorage.setItem(UI_LANG_STORAGE_KEY, next);
      } catch {
        /* localStorage در دسترس نیست — کوکی منبع حقیقت می‌ماند */
      }
      const root = document.documentElement;
      root.lang = next;
      root.dir = dirOf(next);
    }
  }, []);

  // اگر کوکی پاک شده ولی localStorage سالم است، انتخاب کاربر بازیابی می‌شود
  useEffect(() => {
    try {
      const stored = localStorage.getItem(UI_LANG_STORAGE_KEY);
      if (!isLocale(stored) || stored === locale) return;
      if (localeFromCookieHeader(document.cookie) === locale) {
        // همگام‌سازی با منبع بیرونی (localStorage) — الگوی آگاه از store
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocale(stored);
      }
    } catch {
      /* بی‌خطر — کوکی منبع حقیقت است */
    }
    // فقط یک‌بار در mounting — بازیابی انتخاب کاربر از آینه localStorage
  }, []);


  const value = useMemo<UiLangContextValue>(
    () => ({ locale, dir: dirOf(locale), setLocale }),
    [locale, setLocale]
  );

  return <UiLangContext.Provider value={value}>{children}</UiLangContext.Provider>;
}

/** دسترسی به زبان/جهت رابط + تغییردهنده — فقط داخل UiLangProvider */
export function useUiLang(): UiLangContextValue {
  const ctx = useContext(UiLangContext);
  if (!ctx) {
    // نباید رخ دهد؛ به‌عنوان محافظ داده می‌شود تا هرگز کرش خام نداشته باشیم
    return { locale: DEFAULT_LOCALE, dir: dirOf(DEFAULT_LOCALE), setLocale: () => {} };
  }
  return ctx;
}

export function useLocale(): Locale {
  return useUiLang().locale;
}

export function useDir(): Dir {
  return useUiLang().dir;
}

/**
 * تنظیم عنوان سند به‌صورت ترجمه‌شده — الزام دسترسی‌پذیری (عنوان صفحات
 * هم باید دوزبانه باشد). فقط سمت کلاینت اجرا می‌شود.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
