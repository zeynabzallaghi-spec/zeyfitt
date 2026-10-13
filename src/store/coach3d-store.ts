"use client";

/**
 * Store مربی سه‌بعدی — وضعیت پخش، سرعت، نمای دوربین، نمایش عضلات و شمارنده تکرار.
 *
 * شمارنده تکرار توسط موتور انیمیشن و فقط با تکمیل چرخه واقعی حرکت افزایش
 * می‌یابد (نه با فریم و نه با کلیک). runtimeToken هر بار که حرکت عوض یا
 * بازنشانی می‌شود یک واحد بالا می‌رود تا موتور انیمیشن داخل صحنه، زمان
 * محلی خود را با وضعیت جدید همگام کند.
 */

import { create } from "zustand";
import type { CameraView, MuscleGroupId } from "@/lib/fitness3d/types";
import { DEFAULT_EXERCISE_ID } from "@/lib/fitness3d/exercises";

interface Coach3DState {
  /** حرکت انتخاب‌شده فعلی */
  exerciseId: string;
  /** آیا انیمیشن در حال پخش است */
  playing: boolean;
  /** ضریب سرعت انیمیشن (۰٫۵ تا ۲) */
  speed: number;
  /** نمای دوربین — با چرخش دستی کاربر روی «آزاد» می‌رود */
  view: CameraView;
  /** نمایش یا مخفی‌کردن لایه هایلایت عضلات */
  showMuscles: boolean;
  /** عضله‌ای که کاربر برای برجسته‌سازی دستی انتخاب کرده است */
  focusedMuscle: MuscleGroupId | null;
  /** تعداد تکرارهای کامل‌شده (بر اساس چرخه واقعی حرکت) */
  reps: number;
  /** اندیس مرحله فعلی چرخه */
  phaseIndex: number;
  /** نسخه زمان‌بندی — با تغییر حرکت یا بازنشانی افزایش می‌یابد */
  runtimeToken: number;

  setExercise: (id: string) => void;
  togglePlay: () => void;
  /** بازگشت به وضعیت اولیه حرکت — پخش ادامه می‌یابد اگر فعال باشد */
  resetCycle: () => void;
  setSpeed: (speed: number) => void;
  setView: (view: CameraView) => void;
  toggleMuscles: () => void;
  toggleFocus: (muscle: MuscleGroupId) => void;
  /** افزایش تکرارها — فقط توسط موتور انیمیشن فراخوانی می‌شود */
  bumpReps: (count: number) => void;
  setPhase: (index: number) => void;
}

export const useCoach3DStore = create<Coach3DState>((set) => ({
  exerciseId: DEFAULT_EXERCISE_ID,
  playing: false,
  speed: 1,
  view: "front",
  showMuscles: true,
  focusedMuscle: null,
  reps: 0,
  phaseIndex: 0,
  runtimeToken: 0,

  setExercise: (id) =>
    set((s) =>
      s.exerciseId === id
        ? {}
        : {
            exerciseId: id,
            reps: 0,
            phaseIndex: 0,
            runtimeToken: s.runtimeToken + 1,
          }
    ),
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  resetCycle: () =>
    set((s) => ({
      reps: 0,
      phaseIndex: 0,
      runtimeToken: s.runtimeToken + 1,
    })),
  setSpeed: (speed) => set({ speed }),
  setView: (view) => set({ view }),
  toggleMuscles: () => set((s) => ({ showMuscles: !s.showMuscles })),
  toggleFocus: (muscle) =>
    set((s) => ({ focusedMuscle: s.focusedMuscle === muscle ? null : muscle })),
  bumpReps: (count) => set((s) => ({ reps: s.reps + count })),
  setPhase: (index) => set((s) => (s.phaseIndex === index ? {} : { phaseIndex: index })),
}));
