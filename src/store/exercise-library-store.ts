"use client";

/**
 * Store بانک حرکات کلاینت — کش ایندکس بانک عمومی (مرحله ۱۸).
 *
 * داده از GET /api/exercises?scope=index خوانده می‌شود؛ فقط فیلدهای «کارت»
 * (بدون محتوای سنگین و بدون metadata منبع). یک‌بار در عمر نشست بارگذاری
 * و در حافظه نگه داشته می‌شود (~۹۰۰ رکورد سبک) تا:
 *  - انتخابگرهای حرکت (جلسه، برنامه مربی، نمودار پیشرفت) بدون هیچ
 *    لیست ثابت کامپایل‌شده‌ای از بانک کامل جست‌وجو کنند؛
 *  - «دکمه سه‌بعدی» و قاعده «فقط وزن بدن» بر اساس داده زنده بانک
 *    (نه snapshot کلاینت) تصمیم بگیرند — داده سرور منبع حقیقت است؛
 *  - جزئیات کامل هر حرکت به‌صورت on-demand از /api/exercises/[id] خوانده
 *    شود (حالت‌های loading/error واقعی).
 */

import { create } from "zustand";
import type { LibraryExerciseCard } from "@/lib/exercises/types";

export interface ExerciseLibraryState {
  /** idle → loading → ready | error */
  status: "idle" | "loading" | "ready" | "error";
  items: LibraryExerciseCard[];
  byId: Map<string, LibraryExerciseCard>;
  total: number;
  error: string | null;
  /** بارگذاری یک‌باره — فراخوانی تکراری پس از ready ارزان است */
  load: () => Promise<void>;
  getById: (id: string) => LibraryExerciseCard | undefined;
}

async function fetchIndex(): Promise<{ items: LibraryExerciseCard[]; total: number }> {
  const res = await fetch("/api/exercises?scope=index", { cache: "no-store" });
  if (res.status === 401) throw new Error("UNAUTHENTICATED");
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  const data = (await res.json()) as { items: LibraryExerciseCard[]; total: number };
  if (!Array.isArray(data.items)) throw new Error("MALFORMED");
  //不变量 سرور: در scope=index همیشه total === items.length — هر ناهمخوانی
  // یعنی پاسخ ناقص/خراب و باید خطا اعلام شود نه اینکه کش ناقص بماند
  const total = data.total ?? data.items.length;
  if (total !== data.items.length) throw new Error("PARTIAL_INDEX");
  return { items: data.items, total };
}

export const useExerciseLibraryStore = create<ExerciseLibraryState>((set, get) => ({
  status: "idle",
  items: [],
  byId: new Map(),
  total: 0,
  error: null,
  load: async () => {
    if (get().status === "loading" || get().status === "ready") return;
    set({ status: "loading", error: null });
    try {
      const { items, total } = await fetchIndex();
      const byId = new Map(items.map((ex) => [ex.id, ex]));
      set({ status: "ready", items, byId, total, error: null });
    } catch (err) {
      set({
        status: "error",
        error: err instanceof Error ? err.message : "UNKNOWN",
      });
    }
  },
  getById: (id) => get().byId.get(id),
}));

/**
 * فراخوانی نرم بارگذاری — از هر کامپوننتی (app-root و انتخابگرها) ایمن است؛
 * در حالت خطا تلاش مجدد با فراخوانی دوباره انجام می‌شود.
 */
export function ensureExerciseIndex(): void {
  void useExerciseLibraryStore.getState().load();
}
