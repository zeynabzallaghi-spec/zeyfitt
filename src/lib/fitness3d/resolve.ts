/**
 * حل‌کننده صحنه سه‌بعدی — تبدیل داده حرکت به تعریف قابل اجرا (مرحله ۱۹).
 *
 * تنها مسیر مجاز رسیدن از «حرکت بانک» به «صحنه سه‌بعدی»:
 *   ۱) اگر رکورد animation3dProfileId معتبر دارد → چرخه از الگوی پارامتری
 *      ساخته می‌شود (نام/عضلات/دشواری از داده بانک حرکت).
 *   ۲) وگرنه اگر coach3dId دارد (۶ حرکت legacy) → تعریف استاتیک بانک قدیم
 *      برگردانده می‌شود تا رفتار قبلی عیناً حفظ بماند.
 *   ۳) هیچ‌کدام → null (بدون fallback پنهان؛ حرکت بی‌انیمیشن معتبر اعلام
 *      نمی‌شود).
 *
 * خروجی «SceneDefinition» شامل تعریف حرکت (برای موتور انیمیشن و HUD)،
 * رفتار شمارنده و یادداشت شفاف است.
 */

import type { ExerciseDef, MuscleGroupId } from "./types";
import type { Difficulty } from "@/lib/exercises/types";
import { EXERCISES } from "./exercises";
import { buildFromMapping, ProfileResolutionError } from "./profiles/registry";
import type { BuiltCycle, CounterMode, HandPropKind, ImplementKind, ScenePropKind } from "./profiles/core";

/** داده حداقلی مورد نیاز حل‌کننده — از کارت بانک (API) می‌آید */
export interface ResolvableExercise {
  id: string;
  fa: string;
  en: string;
  difficulty: Difficulty;
  primaryMuscles: MuscleGroupId[];
  secondaryMuscles: MuscleGroupId[];
  coach3dId?: string;
  animation3d?: {
    profileId: string;
    params?: Record<string, string | number | boolean> | null;
  } | null;
}

/** تعریف کامل صحنه — مصرف‌کننده: store مربی سه‌بعدی و اجزای UI */
export interface SceneDefinition {
  /** شناسه بانک حرکت (برای store و key) */
  exerciseId: string;
  /** تعریف حرکت برای موتور انیمیشن */
  def: ExerciseDef;
  counterMode: CounterMode;
  handProp: HandPropKind;
  implement: ImplementKind;
  sceneProps: ScenePropKind[];
  honestyNote?: string;
  honestyNoteEn?: string;
  /** منبع حل — legacy یعنی بانک استاتیک ۶ حرکته */
  source: "profile" | "legacy";
  /** شناسه الگوی استفاده‌شده (برای نمایش و گزارش) */
  profileId?: string;
}

const LEGACY_BY_COACH3D_ID = new Map(EXERCISES.map((e) => [e.id, e]));

const DIFFICULTY_SET = new Set(["مبتدی", "متوسط", "پیشرفته"]);

function parseParams(raw: unknown): Record<string, string | number | boolean> | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[k] = v;
    }
  }
  return out;
}

/**
 * حل تعریف صحنه از داده حرکت. خطاهای الگو را به null تبدیل نمی‌کنیم؛
 * نگاشت خراب یعنی داده سرور ایراد دارد و باید صادقانه خطا اعلام شود —
 * اما نگاشت ناموجود (بدون profileId و coach3dId) عادی است و null می‌دهد.
 */
export function resolveScene(ex: ResolvableExercise): SceneDefinition | null {
  // ۱) الگوی پارامتری
  const anim = ex.animation3d;
  if (anim && typeof anim.profileId === "string" && anim.profileId.length > 0) {
    const params = parseParams(anim.params);
    const built: BuiltCycle = buildFromMapping(anim.profileId, params);
    return {
      exerciseId: ex.id,
      def: {
        id: ex.id,
        fa: ex.fa,
        en: ex.en,
        difficulty: DIFFICULTY_SET.has(ex.difficulty) ? ex.difficulty : "مبتدی",
        equipment: [],
        props3d: "none",
        primaryMuscles: ex.primaryMuscles,
        secondaryMuscles: ex.secondaryMuscles,
        jointsInvolved: [],
        startPosition: "",
        steps: [],
        mistakes: [],
        tip: "",
        cycle: built.cycle,
        repsPerCycle: built.repsPerCycle,
        cameraTargetY: built.cameraTargetY,
      },
      counterMode: built.counterMode,
      handProp: built.handProp,
      implement: built.implement,
      sceneProps: built.sceneProps,
      honestyNote: built.honestyNote,
      honestyNoteEn: built.honestyNoteEn,
      source: "profile",
      profileId: anim.profileId,
    };
  }
  // ۲) حرکات legacy — بانک استاتیک (رفتار قبلی، دست‌نخورده)
  if (ex.coach3dId) {
    const legacy = LEGACY_BY_COACH3D_ID.get(ex.coach3dId);
    if (legacy) {
      return {
        exerciseId: ex.id,
        def: legacy,
        counterMode: "reps",
        handProp: legacy.props3d === "dumbbells" ? "dumbbells" : "none",
        implement: "none",
        sceneProps: [],
        source: "legacy",
      };
    }
  }
  return null;
}

export { ProfileResolutionError };
