"use client";

/**
 * Store مربی سه‌بعدی — وضعیت پخش، سرعت، نمای دوربین، نمایش عضلات و شمارنده.
 *
 * مرحله ۱۹: store یک «تعریف صحنه» کامل نگه می‌دارد (SceneDefinition از
 * resolve.ts). دو مسیر ورود:
 *  - setExercise(id): سازگاری با کدهای فعلی — فقط ۶ حرکت legacy بانک استاتیک.
 *  - setScene(scene): مسیر مرحله ۱۹ — صحنه حل‌شده از نگاشت بانک (۹۰۵ حرکت).
 *
 * شمارنده تکرار توسط موتور انیمیشن و فقط با تکمیل چرخه واقعی حرکت افزایش
 * می‌یابد؛ برای counterMode="hold" (ایزومتریک/کشش ثابت) شمارنده تکرار
 * افزایش نمی‌یابد و زمان نگه‌داشتن در coachRuntime جمع می‌شود.
 * runtimeToken هر بار که صحنه عوض یا بازنشانی می‌شود یک واحد بالا می‌رود.
 */

import { create } from "zustand";
import type { CameraView, MuscleGroupId } from "@/lib/fitness3d/types";
import { DEFAULT_EXERCISE_ID, getExercise } from "@/lib/fitness3d/exercises";
import type { SceneDefinition } from "@/lib/fitness3d/resolve";
import { resolveScene } from "@/lib/fitness3d/resolve";

function sceneFromLegacyId(id: string): SceneDefinition {
  const legacy = getExercise(id);
  return {
    exerciseId: id,
    def: legacy,
    counterMode: "reps",
    handProp: legacy.props3d === "dumbbells" ? "dumbbells" : "none",
    implement: "none",
    sceneProps: [],
    source: "legacy",
  };
}

interface Coach3DState {
  /** حرکت انتخاب‌شده فعلی — شناسه بانک حرکت */
  exerciseId: string;
  /** تعریف کامل صحنه حل‌شده — منبع حقیقت رندر و HUD */
  scene: SceneDefinition;
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
  /** تعداد تکرارهای کامل‌شده (بر اساس چرخه واقعی حرکت — فقط reps mode) */
  reps: number;
  /** اندیس مرحله فعلی چرخه */
  phaseIndex: number;
  /** نسخه زمان‌بندی — با تغییر صحنه یا بازنشانی افزایش می‌یابد */
  runtimeToken: number;

  /** سازگاری قدیم — انتخاب از بانک استاتیک ۶ حرکته */
  setExercise: (id: string) => void;
  /** مسیر مرحله ۱۹ — صحنه حل‌شده از نگاشت بانک (null یعنی بدون انیمیشن معتبر) */
  setScene: (scene: SceneDefinition | null) => void;
  togglePlay: () => void;
  /** بازگشت به وضعیت اولیه حرکت — پخش ادامه می‌یابد اگر فعال باشد */
  resetCycle: () => void;
  setSpeed: (speed: number) => void;
  setView: (view: CameraView) => void;
  toggleMuscles: () => void;
  toggleFocus: (muscle: MuscleGroupId) => void;
  /** افزایش تکرارها — فقط توسط موتور انیمیشن در حالت reps فراخوانی می‌شود */
  bumpReps: (count: number) => void;
  setPhase: (index: number) => void;
}

export const useCoach3DStore = create<Coach3DState>((set) => ({
  exerciseId: DEFAULT_EXERCISE_ID,
  scene: sceneFromLegacyId(DEFAULT_EXERCISE_ID),
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
      s.exerciseId === id && s.scene.source === "legacy"
        ? {}
        : {
            exerciseId: id,
            scene: sceneFromLegacyId(id),
            reps: 0,
            phaseIndex: 0,
            runtimeToken: s.runtimeToken + 1,
          }
    ),
  setScene: (scene) =>
    set((s) => {
      if (!scene) return {};
      if (s.exerciseId === scene.exerciseId && s.scene.profileId === scene.profileId) return {};
      return {
        exerciseId: scene.exerciseId,
        scene,
        reps: 0,
        phaseIndex: 0,
        runtimeToken: s.runtimeToken + 1,
      };
    }),
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

/**
 * راهنمای کوتاه برای نقاط اتصال (کتابخانه/جلسه/برنامه): از کارت بانک یک
 * صحنه حل‌شده می‌سازد و در store می‌گذارد. کارت بدون نگاشت معتبر → false
 * (هیچ انیمیشنی پخش نمی‌شود؛ دکمه ۳بعدی هم با has3d بانک کنترل می‌شود).
 */
export function openBankExerciseIn3d(
  card: { id: string; fa: string; en: string; difficulty: string; primaryMuscles: string[]; secondaryMuscles: string[]; coach3dId?: string; animation3d?: { profileId: string; params: Record<string, string | number | boolean> | null } | null } | null | undefined,
  store: { setScene: (s: SceneDefinition | null) => void },
): boolean {
  if (!card) return false;
  const scene = resolveScene({
    id: card.id,
    fa: card.fa,
    en: card.en,
    difficulty: (card.difficulty === "مبتدی" || card.difficulty === "متوسط" || card.difficulty === "پیشرفته" ? card.difficulty : "مبتدی") as never,
    primaryMuscles: card.primaryMuscles as never,
    secondaryMuscles: card.secondaryMuscles as never,
    coach3dId: card.coach3dId,
    animation3d: card.animation3d,
  });
  if (!scene) return false;
  store.setScene(scene);
  return true;
}
