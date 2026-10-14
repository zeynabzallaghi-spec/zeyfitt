"use client";

import { create } from "zustand";
import type { ViewId } from "@/lib/nav";

interface AppState {
  /** بخش فعال پنل — ناوبری سمت کلاینت روی مسیر واحد */
  activeView: ViewId;
  /** وضعیت منوی کشویی موبایل */
  mobileNavOpen: boolean;
  /**
   * حرکت انتخاب‌شده دیالوگ کتابخانه — به‌صورت مرکزی نگهداری می‌شود تا از
   * بخش‌های دیگر (مثل برنامه تمرینی) هم بتوان جزئیات یک حرکت مشخص را در
   * کتابخانه باز کرد (deep-link واقعی، نه toast یا ترفند نمایشی).
   */
  librarySelectedId: string | null;
  setActiveView: (view: ViewId) => void;
  setMobileNavOpen: (open: boolean) => void;
  /** باز کردن جزئیات یک حرکت مشخص در دیالوگ کتابخانه */
  openLibraryExercise: (exerciseId: string) => void;
  /** بستن دیالوگ کتابخانه */
  closeLibraryExercise: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: "dashboard",
  mobileNavOpen: false,
  librarySelectedId: null,
  setActiveView: (view) => set({ activeView: view, mobileNavOpen: false }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  openLibraryExercise: (exerciseId) =>
    set({ librarySelectedId: exerciseId, activeView: "library", mobileNavOpen: false }),
  closeLibraryExercise: () => set({ librarySelectedId: null }),
}));
