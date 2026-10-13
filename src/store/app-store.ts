"use client";

import { create } from "zustand";
import type { ViewId } from "@/lib/nav";

interface AppState {
  /** بخش فعال پنل — ناوبری سمت کلاینت روی مسیر واحد */
  activeView: ViewId;
  /** وضعیت منوی کشویی موبایل */
  mobileNavOpen: boolean;
  setActiveView: (view: ViewId) => void;
  setMobileNavOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeView: "dashboard",
  mobileNavOpen: false,
  setActiveView: (view) => set({ activeView: view, mobileNavOpen: false }),
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
}));
