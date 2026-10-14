"use client";

import { create } from "zustand";

/**
 * پیگیری واقعی «مسیر شروع تناسب اندام» — گام‌های ۳ و ۴ مسیر (آشنایی با
 * کتابخانه حرکات و مربی سه‌بعدی، مراجعه به برنامه تمرینی) با ثبت واقعی
 * بازدید کاربر مشخص می‌شوند؛ هرگز پیش‌دستی «انجام‌شده» علامت نمی‌خورند.
 *
 * محل ذخیره: localStorage کلاینت به تفکیک userId — این داده فقط راهنمای
 * رابط کاربری است و جایگزین داده سرور (پروفایل/تاریخچه) نیست؛ در گزارش
 * تحویل به‌صورت شفاف اعلام شده است.
 */

const STORAGE_PREFIX = "fitcoach:journey:";

/** گام‌هایی که با بازدید واقعی تکمیل می‌شوند */
export type JourneyVisitKey = "coach3d" | "library" | "workout";

interface JourneyState {
  /** بازدیدهای ثبت‌شده کاربر جاری (کلیدها: coach3d/library/workout) */
  visited: Partial<Record<JourneyVisitKey, boolean>>;
  /** شناسه کاربری که داده فعلی به او تعلق دارد — برای جداسازی حساب‌ها */
  userId: string | null;
  /** ثبت بازدید واقعی یک بخش برای کاربر جاری */
  markVisited: (userId: string, key: JourneyVisitKey) => void;
  /** پاک‌سازی وضعیت هنگام خروج/تعویض حساب */
  resetJourney: () => void;
}

function readStoredVisits(userId: string): Partial<Record<JourneyVisitKey, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const valid: Partial<Record<JourneyVisitKey, boolean>> = {};
      for (const key of ["coach3d", "library", "workout"] as const) {
        if (record[key] === true) valid[key] = true;
      }
      return valid;
    }
    return {};
  } catch {
    return {};
  }
}

function persistVisits(userId: string, visited: Partial<Record<JourneyVisitKey, boolean>>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(visited));
  } catch {
    // حافظه محلی در دسترس نیست (مثلاً حالت ناشناس سخت‌گیرانه) — بازدید فقط در همین نشست معتبر می‌ماند
  }
}

export const useJourneyStore = create<JourneyState>((set, get) => ({
  visited: {},
  userId: null,

  markVisited: (userId, key) => {
    // تعویض حساب: داده حساب قبلی نباید به حساب جدید نسبت داده شود
    if (get().userId !== userId) {
      const fresh = readStoredVisits(userId);
      set({ userId, visited: fresh });
    }
    if (get().visited[key]) return;
    const next = { ...get().visited, [key]: true };
    persistVisits(userId, next);
    set({ visited: next });
  },

  resetJourney: () => set({ visited: {}, userId: null }),
}));

/** خواندن بدون subscribe — برای دکمه‌های یک‌باره */
export function isJourneyVisited(userId: string, key: JourneyVisitKey): boolean {
  const state = useJourneyStore.getState();
  if (state.userId !== userId) return Object.keys(readStoredVisits(userId)).includes(key);
  return Boolean(state.visited[key]);
}
