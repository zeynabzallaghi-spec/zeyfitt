"use client";

/**
 * سیگنال سبک همگام‌سازی ثبت مصرف واقعی — وقتی از جای دیگری (مثل دکمه
 * «ثبت مصرف» روی قلم برنامه) ثبت ساخته می‌شود، بخش مصرف واقعی با خواندن
 * مجدد از سرور به‌روز می‌شود. هیچ داده‌ای اینجا ذخیره نمی‌شود؛ پایگاه
 * داده سرور تنها مرجع است.
 */

import { create } from "zustand";

interface FoodLogSyncState {
  /** هر تغییر = سیگنال بازخوانی از سرور */
  revision: number;
  bump: () => void;
}

export const useFoodLogSync = create<FoodLogSyncState>((set) => ({
  revision: 0,
  bump: () => set((state) => ({ revision: state.revision + 1 })),
}));
