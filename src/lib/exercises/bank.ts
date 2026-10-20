/**
 * بانک کامل دیتابیس حرکات — لایه سمت سرور (مرحله ۱۸).
 *
 * معماری:
 *  - دیتابیس «منبع حقیقت» بانک عمومی است (۹۰۰+ رکورد)؛ این ماژول با کش
 *    درون‌حافظه (Promise memo) یک‌بار از DB می‌خواند و دسترسی سنکرون
 *    می‌دهد — مصرف‌کننده‌های سنکرون (plan-schemas، session-storage) قبل
 *    از نخستین استفاده `ensureExerciseBank()` را await می‌کنند.
 *  - `EXERCISE_LIBRARY` استاتیک (src/lib/exercises/index.ts) همان ۴۸ رکورد
 *    ویرایشی است و برای موتور برنامه‌ساز خودکار دست‌نخورده باقی می‌ماند؛
 *    این ماژول بانک کامل (شامل همان ۴۸) را می‌دهد.
 *  - خروجی‌ها فقط فیلدهای مجاز (LibraryExerciseCard/Detail) هستند — هیچ
 *    metadata منبع، مجوز یا datasetVersion به کلاینت نمی‌رود (به‌جز
 *    sourceKey خط منبع در جزئیات، برای شفافیت نمایش).
 *  - `refreshExerciseBank()` پس از import در همان فرایند کش را تازه
 *    می‌کند؛ import در فرایند جدا اجرا می‌شود و سرور پس از آن با
 *    ری‌استارت/فرایند جدید بانک تازه را می‌خواند.
 */

import { db } from "@/lib/db";
import type { Exercise } from "@prisma/client";
import {
  EXERCISE_TYPES,
  LIBRARY_MUSCLE_GROUPS,
  type Difficulty,
  type LibraryExerciseCard,
  type LibraryExerciseDetail,
  type LibraryMuscleId,
  type ExerciseTypeId,
  type EquipmentId,
  type ExerciseCategoryId,
  type MovementPatternId,
} from "./types";
import { findSimilarOver } from "./search";
import { maybeSelfHealExerciseBank } from "./self-heal";

/* ------------------------------ نگاشت واژگان ------------------------------ */

const DIFFICULTY_FA: Record<string, Difficulty> = {
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

const EXERCISE_TYPE_SET = new Set(EXERCISE_TYPES.map((t) => t.id));
const LIBRARY_MUSCLE_SET = new Set(LIBRARY_MUSCLE_GROUPS.map((m) => m.id));

function parseJsonArray(s: string | null | undefined): string[] {
  if (!s) return [];
  try {
    const parsed: unknown = JSON.parse(s);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // داده خراب — خالی و صادقانه
  }
  return [];
}

/** اعتبارسنجی واژگان — رکورد دارای شناسه ناشناخته، در دسترس قرار نمی‌گیرد */
function sanitizeMuscles(ids: string[]): LibraryMuscleId[] {
  return ids.filter((id): id is LibraryMuscleId => LIBRARY_MUSCLE_SET.has(id as LibraryMuscleId));
}

function sanitizeEquipment(ids: string[]): EquipmentId[] {
  // واژگان تجهیزات با فیلتر بر اساس رشته‌های شناخته‌شده — افزودنی و آزاد
  return ids.filter((id): id is EquipmentId => /^[a-z_]+$/.test(id));
}

function toCard(ex: Exercise): LibraryExerciseCard | null {
  const difficulty = DIFFICULTY_FA[ex.difficulty];
  if (!difficulty) return null;
  const exerciseType = (EXERCISE_TYPE_SET.has(ex.exerciseType as ExerciseTypeId)
    ? ex.exerciseType
    : "strength") as ExerciseTypeId;
  const primaryMuscles = sanitizeMuscles(parseJsonArray(ex.primaryMusclesJson));
  const secondaryMuscles = sanitizeMuscles(parseJsonArray(ex.secondaryMusclesJson));
  const mistakes = parseJsonArray(ex.mistakesJson);
  const coach3dId = ex.coach3dId ?? undefined;
  // نگاشت پارامتری (مرحله ۱۹) — فقط شناسه الگو + پارامترهای مجاز به کلاینت می‌رود
  let animation3d: LibraryExerciseCard["animation3d"];
  if (ex.animation3dStatus === "ready" && ex.animation3dProfileId) {
    let params: Record<string, string | number | boolean> | null = null;
    if (ex.animation3dParamsJson) {
      try {
        const parsed: unknown = JSON.parse(ex.animation3dParamsJson);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const out: Record<string, string | number | boolean> = {};
          for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
          }
          params = out;
        }
      } catch {
        // داده خراب — نگاشت سالم پارامتری داده نمی‌شود؛ coach3dId legacy معتبر می‌ماند
        params = null;
      }
    }
    animation3d = { profileId: ex.animation3dProfileId, params };
  }
  const has3d =
    ex.animation3dStatus === "ready" &&
    Boolean(coach3dId || (animation3d && animation3d.profileId.length > 0));
  let summaryEn: string | null = null;
  if (ex.enContentJson) {
    try {
      const parsed: unknown = JSON.parse(ex.enContentJson);
      if (parsed && typeof parsed === "object" && typeof (parsed as { summary?: unknown }).summary === "string") {
        summaryEn = (parsed as { summary: string }).summary;
      }
    } catch {
      // داده خراب — نادیده
    }
  }
  return {
    id: ex.id,
    fa: ex.faName ?? ex.enName,
    en: ex.enName,
    category: ex.category as ExerciseCategoryId,
    primaryMuscles,
    secondaryMuscles,
    equipment: sanitizeEquipment(parseJsonArray(ex.equipmentJson)),
    difficulty,
    pattern: ex.pattern as MovementPatternId,
    compound: ex.compound,
    exerciseType,
    has3d,
    coach3dId,
    animation3d,
    contentLocale: ex.contentLocale === "fa" ? "fa" : "en",
    summary: ex.summary ?? "",
    summaryEn,
    mistakesPreview: mistakes.length > 0 ? mistakes[0] : null,
  };
}

function toDetail(ex: Exercise, similar: LibraryExerciseCard[]): LibraryExerciseDetail | null {
  const card = toCard(ex);
  if (!card) return null;
  let enContent: LibraryExerciseDetail["enContent"];
  if (ex.enContentJson) {
    try {
      const parsed: unknown = JSON.parse(ex.enContentJson);
      if (parsed && typeof parsed === "object") enContent = parsed as LibraryExerciseDetail["enContent"];
    } catch {
      // داده خراب — نادیده
    }
  }
  return {
    ...card,
    steps: parseJsonArray(ex.stepsJson),
    breathing: ex.breathing,
    mistakes: parseJsonArray(ex.mistakesJson),
    safety: parseJsonArray(ex.safetyJson),
    enContent,
    sourceKey: ex.sourceKey === "editorial" ? "editorial" : "free-exercise-db",
    similar,
  };
}

/* ------------------------------ کش درون‌حافظه ------------------------------ */

interface BankState {
  loaded: boolean;
  cards: LibraryExerciseCard[];
  byId: Map<string, LibraryExerciseCard>;
  rowsById: Map<string, Exercise>;
  total: number;
}

const state: BankState = {
  loaded: false,
  cards: [],
  byId: new Map(),
  rowsById: new Map(),
  total: 0,
};

let loadPromise: Promise<void> | null = null;

/** مرتب‌سازی پیش‌فرض: ویرایشی اول، سپس نام انگلیسی — پایدار و تکرارپذیر */
function defaultSort(a: LibraryExerciseCard, b: LibraryExerciseCard): number {
  if (a.contentLocale !== b.contentLocale) return a.contentLocale === "fa" ? -1 : 1;
  return a.en.localeCompare(b.en, "en");
}

async function loadIntoState(): Promise<void> {
  let rows = await db.exercise.findMany({ where: { status: "active" } });
  // ترمیم خودکار (مرحله ۱۹.۵) — بانک خالی یعنی وضعیت خراب واقعی (مثلاً
  // ریست سندباکس)؛ import رسمی idempotent یک‌بار اجرا و دوباره خوانده می‌شود.
  if (rows.length === 0) {
    const healed = await maybeSelfHealExerciseBank();
    if (healed) {
      rows = await db.exercise.findMany({ where: { status: "active" } });
    }
  }
  const cards: LibraryExerciseCard[] = [];
  const byId = new Map<string, LibraryExerciseCard>();
  const rowsById = new Map<string, Exercise>();
  for (const row of rows) {
    const card = toCard(row);
    if (!card) continue; // رکورد ناقص به کلاینت نمی‌رسد
    cards.push(card);
    byId.set(card.id, card);
    rowsById.set(row.id, row);
  }
  cards.sort(defaultSort);
  state.cards = cards;
  state.byId = byId;
  state.rowsById = rowsById;
  state.total = cards.length;
  state.loaded = true;
}

/**
 * اطمینان از بارگذاری بانک — همه مسیرهای سروری که به بانک کامل نیاز
 * دارند در نقطه ورود async این را await می‌کنند. فراخوانی تکراری ارزان است.
 */
export async function ensureExerciseBank(): Promise<void> {
  if (state.loaded) return;
  if (!loadPromise) {
    loadPromise = loadIntoState().catch((err) => {
      loadPromise = null;
      throw err;
    });
  }
  await loadPromise;
}

/** تازه‌سازی اجباری کش — پس از import در همان فرایند */
export async function refreshExerciseBank(): Promise<void> {
  state.loaded = false;
  loadPromise = null;
  await ensureExerciseBank();
}

/* ------------------------------ دسترسی‌ها ------------------------------ */

/** بانک کامل (کارت‌ها) — پس از ensureExerciseBank معتبر است */
export function allExercises(): LibraryExerciseCard[] {
  return state.cards;
}

/** تعداد کل بانک فعال */
export function exerciseBankCount(): number {
  return state.total;
}

/** جست‌وجوی کامل (شامل رکوردهای منبع آزاد) — پس از ensure معتبر است */
export function getExerciseCardById(id: string): LibraryExerciseCard | undefined {
  return state.byId.get(id);
}

/**
 * جست‌وجوی کامل برای اعتبارسنجی سروری (plan-schemas / session-storage) —
 * رکورد ویرایشی و منبع آزاد هر دو را می‌دهد؛ آرشیوشده‌ها را نمی‌دهد.
 */
export function findExerciseRow(id: string): Exercise | undefined {
  return state.rowsById.get(id);
}

/** جزئیات کامل با حرکات مشابه — برای API جزئیات */
export function getExerciseDetail(id: string): LibraryExerciseDetail | null {
  const row = state.rowsById.get(id);
  if (!row) return null;
  const card = state.byId.get(id);
  if (!card) return null;
  const similar = findSimilarOver(state.cards, card, 3);
  return toDetail(row, similar);
}

/* ------------------------------ جست‌وجو و فیلتر ------------------------------ */

export interface BankSearchState {
  query: string;
  category: ExerciseCategoryId | "all";
  muscles: LibraryMuscleId[];
  equipment: EquipmentId[];
  difficulty: Difficulty | "all";
  pattern: MovementPatternId | "all";
  type: ExerciseTypeId | "all";
  only3d: boolean;
}

export const EMPTY_BANK_FILTER: BankSearchState = {
  query: "",
  category: "all",
  muscles: [],
  equipment: [],
  difficulty: "all",
  pattern: "all",
  type: "all",
  only3d: false,
};

/**
 * جست‌وجوی بانک کامل — روی کش درون‌حافظه (رکورد ~۱۰۰۰) فیلتر درون‌فرایندی
 * انجام می‌شود؛ نتایج با همان مرتب‌سازی پیش‌فرض و صفحه‌بندی برمی‌گردند.
 */
export function searchExerciseBank(
  f: BankSearchState,
  page: number,
  pageSize: number
): { total: number; items: LibraryExerciseCard[] } {
  const q = normalizeForBank(f.query);
  const matched = state.cards.filter((ex) => {
    if (q) {
      const hay = `${ex.fa} ${ex.en}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.category !== "all" && ex.category !== f.category) return false;
    if (f.muscles.length > 0) {
      const all = [...ex.primaryMuscles, ...ex.secondaryMuscles];
      if (!f.muscles.some((m) => all.includes(m))) return false;
    }
    if (f.equipment.length > 0 && !f.equipment.some((e) => ex.equipment.includes(e))) return false;
    if (f.difficulty !== "all" && ex.difficulty !== f.difficulty) return false;
    if (f.pattern !== "all" && ex.pattern !== f.pattern) return false;
    if (f.type !== "all" && ex.exerciseType !== f.type) return false;
    if (f.only3d && !ex.has3d) return false;
    return true;
  });
  const start = (page - 1) * pageSize;
  return {
    total: matched.length,
    items: matched.slice(start, start + pageSize),
  };
}

/** نرمال‌سازی جست‌وجوی بانک — همان قرارداد بانک استاتیک */
function normalizeForBank(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u064A\u0649]/g, "\u06CC")
    .replace(/\u0643/g, "\u06A9")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u200C/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
