"use client";

/**
 * زبان رابط بخش‌های دوزبانه ثبت مصرف واقعی — همان انتخاب کاربر که برای
 * رابط دستیار ذخیره شده است (یک منبع واحد، بدون شرط زبان پراکنده).
 * «خودکار» و «فارسی» → فارسی راست‌چین؛ English → انگلیسی چپ‌چین.
 *
 * پیاده‌سازی با useSyncExternalStore: منبع واقعی localStorage است و
 * تغییر آن (حتی از تب دیگر) بی‌درنگ منعکس می‌شود؛ بدون setState در effect.
 */

import { useSyncExternalStore } from "react";

const LANG_STORAGE_KEY = "fitcoach.assistant.lang";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

function getSnapshot(): "fa" | "en" {
  return window.localStorage.getItem(LANG_STORAGE_KEY) === "en" ? "en" : "fa";
}

function getServerSnapshot(): "fa" | "en" {
  return "fa";
}

export function useFoodLogUiLang(): "fa" | "en" {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
