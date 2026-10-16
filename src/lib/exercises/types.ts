/**
 * کتابخانه حرکات — لایه داده ساختاریافته و نسخه‌بندی‌شده.
 *
 * تصمیم معماری: داده‌های کتابخانه در فایل‌های TypeScript مستقل از UI نگهداری
 * می‌شوند (نه پایگاه داده)؛ چون کتابخانه عمومی است، همه کاربران محتوای یکسانی
 * می‌بینند، هیچ نوشتن شخصی یا هم‌زمانی وجود ندارد و محتوای آن تحریریه‌ای و
 * کم‌تغییر است. افزودن حرکت جدید = افزودن یک آبجکت به فایل داده، بدون تغییر UI.
 *
 * شناسه‌ها پایدارند (slug انگلیسی) و هرگز نباید تغییر کنند؛ زیرا در
 * برنامه‌ساز تمرینی آینده به آن‌ها ارجاع خواهد شد.
 */

import type { MuscleGroupId } from "@/lib/fitness3d/types";

/** نسخه فعلی بانک حرکات — با هر تغییر محتوایی افزایش می‌یابد */
export const LIBRARY_VERSION = "1.0.0";

/** سطح دشواری — واژگان مشترک با سیستم مربی سه‌بعدی */
export type Difficulty = "مبتدی" | "متوسط" | "پیشرفته";

export const DIFFICULTY_ORDER: Difficulty[] = ["مبتدی", "متوسط", "پیشرفته"];

/* ----------------------------- دسته‌بندی حرکات ----------------------------- */

export type ExerciseCategoryId =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "fullbody";

export interface ExerciseCategoryDef {
  id: ExerciseCategoryId;
  fa: string;
  en: string;
  /** حروف اختصاری کوتاه برای گرافیک یکپارچه کارت (جایگزین تصویر) */
  monogram: string;
}

/** ترتیب دسته‌ها هم ترتیب نمایش فیلتر و هم ترتیب مرتب‌سازی پیش‌فرض است */
export const EXERCISE_CATEGORIES: ExerciseCategoryDef[] = [
  { id: "chest", fa: "سینه", en: "Chest", monogram: "CH" },
  { id: "back", fa: "پشت و زیربغل", en: "Back", monogram: "BK" },
  { id: "shoulders", fa: "سرشانه", en: "Shoulders", monogram: "SH" },
  { id: "biceps", fa: "جلو بازو", en: "Biceps", monogram: "BI" },
  { id: "triceps", fa: "پشت بازو", en: "Triceps", monogram: "TR" },
  { id: "core", fa: "شکم و عضلات مرکزی", en: "Core", monogram: "AB" },
  { id: "quads", fa: "چهارسر ران", en: "Quadriceps", monogram: "QD" },
  { id: "hamstrings", fa: "همسترینگ", en: "Hamstrings", monogram: "HS" },
  { id: "glutes", fa: "سرینی", en: "Glutes", monogram: "GL" },
  { id: "calves", fa: "ساق پا", en: "Calves", monogram: "CF" },
  { id: "fullbody", fa: "حرکات ترکیبی تمام بدن", en: "Full Body", monogram: "FB" },
];

/* -------------------------------- تجهیزات -------------------------------- */

export type EquipmentId =
  | "bodyweight"
  | "dumbbell"
  | "barbell"
  | "cable"
  | "machine"
  | "band"
  | "bench"
  | "bar";

export interface EquipmentDef {
  id: EquipmentId;
  fa: string;
  en: string;
}

export const EQUIPMENT_TYPES: EquipmentDef[] = [
  { id: "bodyweight", fa: "وزن بدن", en: "Bodyweight" },
  { id: "dumbbell", fa: "دمبل", en: "Dumbbell" },
  { id: "barbell", fa: "هالتر", en: "Barbell" },
  { id: "cable", fa: "سیم‌کش", en: "Cable" },
  { id: "machine", fa: "دستگاه بدنسازی", en: "Machine" },
  { id: "band", fa: "کش مقاومتی", en: "Resistance Band" },
  { id: "bench", fa: "نیمکت", en: "Bench" },
  { id: "bar", fa: "میله بارفیکس", en: "Pull-up Bar" },
];

/* ------------------------------ الگوی حرکتی ------------------------------ */

export type MovementPatternId =
  | "push"
  | "pull"
  | "squat"
  | "hinge"
  | "fly"
  | "raise"
  | "knee-extension"
  | "knee-flexion"
  | "calf"
  | "core-stability"
  | "spinal-flexion"
  | "fullbody";

export interface MovementPatternDef {
  id: MovementPatternId;
  fa: string;
  en: string;
}

export const MOVEMENT_PATTERNS: MovementPatternDef[] = [
  { id: "push", fa: "فشاری (پوش)", en: "Push" },
  { id: "pull", fa: "کششی (پول)", en: "Pull" },
  { id: "squat", fa: "اسکوات", en: "Squat" },
  { id: "hinge", fa: "لولای مفصل ران (هینج)", en: "Hip Hinge" },
  { id: "fly", fa: "جمع‌کردن افقی (فای)", en: "Fly" },
  { id: "raise", fa: "نشر (بلندکردن جانبی)", en: "Lateral Raise" },
  { id: "knee-extension", fa: "اکستنشن زانو", en: "Knee Extension" },
  { id: "knee-flexion", fa: "فلکشن زانو", en: "Knee Flexion" },
  { id: "calf", fa: "بلندشدن ساق (پلانتارفلکشن)", en: "Calf Raise" },
  { id: "core-stability", fa: "تثبیت مرکزی", en: "Core Stability" },
  { id: "spinal-flexion", fa: "فلکشن تنه", en: "Spinal Flexion" },
  { id: "fullbody", fa: "ترکیبی تمام بدن", en: "Full Body" },
];

/* ------------------------------ رکورد حرکت ------------------------------ */

/**
 * رکورد کامل یک حرکت در کتابخانه — همه فیلدها اجباری‌اند مگر coach3dId
 * که فقط برای حرکات دارای انیمیشن سه‌بعدی مقدار دارد.
 */
export interface LibraryExercise {
  /** شناسه یکتا و پایدار — پس از انتشار هرگز تغییر نمی‌کند */
  id: string;
  /** نام فارسی */
  fa: string;
  /** نام انگلیسی (برای جست‌وجو و نمایش) */
  en: string;
  /** دسته اصلی */
  category: ExerciseCategoryId;
  /** عضلات اصلی هدف — همان واژگان ۱۲ گروهی مربی سه‌بعدی */
  primaryMuscles: MuscleGroupId[];
  /** عضلات کمکی — ممکن است خالی باشد */
  secondaryMuscles: MuscleGroupId[];
  /** تجهیزات موردنیاز — اگر حرکت با چند تجهیزات قابل اجراست همه ذکر می‌شوند */
  equipment: EquipmentId[];
  difficulty: Difficulty;
  /** الگوی حرکتی غالب */
  pattern: MovementPatternId;
  /** ترکیبی (چندمفصلی) یا تک‌مفصلی */
  compound: boolean;
  /**
   * شناسه حرکت مرتبط در سیستم مربی سه‌بعدی — فقط اگر انیمیشن اختصاصی
   * وجود دارد. نبودِ این فیلد یعنی «نمایش سه‌بعدی در دسترس نیست» و هیچ
   * انیمیشن جایگزینی نباید برای آن پخش شود.
   */
  coach3dId?: string;
  /** توضیح کوتاه یک‌ جمله‌ای برای کارت */
  summary: string;
  /** مراحل اجرای صحیح — ترتیبی و مشخص */
  steps: string[];
  /** روش تنفس */
  breathing: string;
  /** اشتباهات رایج */
  mistakes: string[];
  /** نکات ایمنی و اصلاحات متداول — مختصر و کاربردی، بدون ادعای پزشکی */
  safety: string[];
  /** ترجمه نمایشی محتوای آموزشی به انگلیسی — داده اصلی (فیلدهای فارسی) دست‌نخورده می‌ماند */
  enContent?: {
    summary: string;
    steps: string[];
    breathing: string;
    mistakes: string[];
    safety: string[];
  };
}
