/**
 * کتابخانه حرکات — لایه داده ساختاریافته و نسخه‌بندی‌شده.
 *
 * تصمیم معماری: داده‌های کتابخانه در فایل‌های TypeScript مستقل از UI نگهداری
 * می‌شوند (نه پایگاه داده)؛ چون کتابخانه عمومی است، همه کاربران محتوای یکسانی
 * می‌بینند، هیچ نوشتن شخصی یا هم‌زمانی وجود ندارد و محتوای آن تحریریه‌ای و
 * کم‌تغییر است. افزودن حرکت جدید = افزودن یک آبجکت به فایل داده، بدون تغییر UI.
 *
 * شناسه‌ها پایدارند (slug انگلیسی) و هرگز نباید تغییر کنند؛ زیرا در
 * برنامه‌ساز تمرینی به آن‌ها ارجاع می‌شود.
 *
 * مرحله ۱۸: این ۴۸ رکورد «ستون ویرایشی» بانک‌اند (sourceKey=editorial) و
 * عیناً در دیتابیس همگام می‌شوند؛ بانک کامل دیتابیس (بانک عمومی گسترده) در
 * src/lib/exercises/bank.ts خوانده می‌شود. موتور برنامه‌ساز خودکار آگاهانه
 * فقط از همین مجموعه ویرایشی استفاده می‌کند تا کیفیت محتوای فارسی برنامه‌های
 * خودکار حفظ شود (تصمیم سندشده در docs/phase18-library-architecture.md).
 */

import type { MuscleGroupId } from "@/lib/fitness3d/types";

/**
 * نسخه فعلی بانک حرکات — با هر تغییر محتوایی افزایش می‌یابد.
 * نسخه ۲.۰.۰ = مرحله ۱۸: بانک مبتنی بر دیتابیس با import منبع آزاد
 * (Free Exercise DB — Unlicense) روی ستون فقرات ۴۸ حرکت ویرایشی.
 */
export const LIBRARY_VERSION = "2.0.0";

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
  | "bar"
  // واژگان افزوده مرحله ۱۸ — برگرفته از منبع آزاد؛ افزودنی و بدون تغییر قبلی‌ها
  | "kettlebell"
  | "medicine_ball"
  | "stability_ball"
  | "foam_roll"
  | "ez_barbell"
  | "other";

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
  // افزوده مرحله ۱۸
  { id: "kettlebell", fa: "کتل‌بل", en: "Kettlebell" },
  { id: "medicine_ball", fa: "توپ پزشکی", en: "Medicine Ball" },
  { id: "stability_ball", fa: "توپ سوئیسی", en: "Stability Ball" },
  { id: "foam_roll", fa: "فوم‌رولر", en: "Foam Roll" },
  { id: "ez_barbell", fa: "هالتر خم (EZ)", en: "EZ Barbell" },
  // «سایر» فقط برای رکوردهایی که منبع نوع تجهیزات را «other» اعلام کرده —
  // بدون هیچ حدس شخصی؛ برچسب صادقانه «سایر تجهیزات»
  { id: "other", fa: "سایر تجهیزات", en: "Other Equipment" },
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
  | "fullbody"
  // افزوده مرحله ۱۸ — حرکات کششی منبع آزاد و موارد نگاشت‌نشده (گزارش می‌شوند)
  | "stretch"
  | "other";

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
  // افزوده مرحله ۱۸
  { id: "stretch", fa: "کشش", en: "Stretch" },
  { id: "other", fa: "سایر", en: "Other" },
];

/* ------------------------------ نوع تمرین ------------------------------ */

/**
 * نوع تمرین — عیناً از دسته‌بندی منبع داده (Free Exercise DB)؛ برای
 * رکوردهای ویرایشی «strength». هیچ نوعی ساخته نمی‌شود.
 */
export type ExerciseTypeId =
  | "strength"
  | "stretching"
  | "plyometrics"
  | "powerlifting"
  | "olympic_weightlifting"
  | "strongman"
  | "cardio";

export interface ExerciseTypeDef {
  id: ExerciseTypeId;
  fa: string;
  en: string;
}

export const EXERCISE_TYPES: ExerciseTypeDef[] = [
  { id: "strength", fa: "قدرتی", en: "Strength" },
  { id: "stretching", fa: "کششی", en: "Stretching" },
  { id: "plyometrics", fa: "پلایومتریک", en: "Plyometrics" },
  { id: "powerlifting", fa: "پاورلیفتینگ", en: "Powerlifting" },
  { id: "olympic_weightlifting", fa: "وزنه‌برداری المپیک", en: "Olympic Weightlifting" },
  { id: "strongman", fa: "استرونگمن", en: "Strongman" },
  { id: "cardio", fa: "هوازی", en: "Cardio" },
];

/* --------------------- گروه‌های عضلانی در سطح کتابخانه --------------------- */

/**
 * واژگان عضلات در سطح کتابخانه عمومی — ۱۲ گروه سه‌بعدی + سه گروه
 * «فقط کتابخانه» برگرفته از منبع آزاد. این سه گروه Mesh اختصاصی در مربی
 * سه‌بعدی ندارند و در هایلایت سه‌بعدی ظاهر نمی‌شوند (شفاف و بدون جعل).
 */
export type LibraryMuscleId =
  | MuscleGroupId
  | "adductors"
  | "lower-back"
  | "neck";

export interface LibraryMuscleDef {
  id: LibraryMuscleId;
  fa: string;
  en: string;
  /** آیا در مربی سه‌بعدی هایلایت پذیر است (۱۲ گروه اصلی) */
  in3d: boolean;
}

/** ۱۲ گروه سه‌بعدی (همان ترتیب) + ۳ گروه کتابخانه‌ای در انتها */
export const LIBRARY_MUSCLE_GROUPS: LibraryMuscleDef[] = [
  { id: "chest", fa: "سینه", en: "Chest", in3d: true },
  { id: "shoulders", fa: "سرشانه", en: "Shoulders", in3d: true },
  { id: "biceps", fa: "جلو بازو", en: "Biceps", in3d: true },
  { id: "triceps", fa: "پشت بازو", en: "Triceps", in3d: true },
  { id: "forearms", fa: "ساعد", en: "Forearms", in3d: true },
  { id: "abs", fa: "شکم", en: "Abs", in3d: true },
  { id: "back", fa: "زیربغل و پشت", en: "Back", in3d: true },
  { id: "traps", fa: "ذوزنقه‌ای (کول)", en: "Traps", in3d: true },
  { id: "glutes", fa: "سرینی", en: "Glutes", in3d: true },
  { id: "quads", fa: "چهارسر ران", en: "Quadriceps", in3d: true },
  { id: "hamstrings", fa: "همسترینگ", en: "Hamstrings", in3d: true },
  { id: "calves", fa: "ساق پا", en: "Calves", in3d: true },
  { id: "adductors", fa: "داخل ران", en: "Adductors", in3d: false },
  { id: "lower-back", fa: "کمر (راست‌کننده ستون)", en: "Lower Back", in3d: false },
  { id: "neck", fa: "گردن", en: "Neck", in3d: false },
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
  /** عضلات اصلی هدف — واژگان کتابخانه (۱۲ گروه سه‌بعدی + ۳ گروه کتابخانه‌ای) */
  primaryMuscles: LibraryMuscleId[];
  /** عضلات کمکی — ممکن است خالی باشد */
  secondaryMuscles: LibraryMuscleId[];
  /** تجهیزات موردنیاز — اگر حرکت با چند تجهیزات قابل اجراست همه ذکر می‌شوند */
  equipment: EquipmentId[];
  difficulty: Difficulty;
  /** الگوی حرکتی غالب */
  pattern: MovementPatternId;
  /** ترکیبی (چندمفصلی) یا تک‌مفصلی */
  compound: boolean;
  /**
   * نوع تمرین — برای ۴۸ رکورد ویرایشی «strength»؛ برای رکوردهای منبع
   * آزاد عیناً دسته منبع. نبود فیلد در رکوردهای قدیمی همان strength است.
   */
  exerciseType?: ExerciseTypeId;
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

/* ------------------- انواع لایه API (بانک کامل دیتابیس) ------------------- */

/**
 * رکورد خلاصه (کارت) برای فهرست/جست‌وجوی بانک کامل — فقط فیلدهای مجاز؛
 * metadata منبع، مجوز و داده‌های داخلی هرگز در این لایه برنمی‌گردند.
 * `compound` برای رکوردهایی که منبع ساختار حرکت را مشخص نکرده null است
 * (به‌جای حدس) — نمایشگر باید در این حالت «نوع تمرین» را نشان دهد.
 */
/**
 * نگاشت انیمیشن سه‌بعدی پارامتری (مرحله ۱۹) — شناسه الگوی حرکتی +
 * پارامترهای مجاز. این نگاشت از داده سرور می‌آید و کلاینت فقط از همین
 * مسیر صحنه می‌سازد؛ هیچ حدس سمت کلاینت مجاز نیست.
 */
export interface Animation3dMapping {
  profileId: string;
  params: Record<string, string | number | boolean> | null;
}

export interface LibraryExerciseCard {
  id: string;
  fa: string;
  en: string;
  category: ExerciseCategoryId;
  primaryMuscles: LibraryMuscleId[];
  secondaryMuscles: LibraryMuscleId[];
  equipment: EquipmentId[];
  difficulty: Difficulty;
  pattern: MovementPatternId;
  compound: boolean | null;
  exerciseType: ExerciseTypeId;
  /** انیمیشن سه‌بعدی واقعاً موجود است (مبنای مجاز نمایش دکمه ۳بعدی) */
  has3d: boolean;
  /** فقط برای has3d legacy (۶ حرکت ویرایشی) — شناسه بانک استاتیک مربی سه‌بعدی */
  coach3dId?: string;
  /** فقط برای has3d پارامتری — نگاشت به الگوی حرکتی (مرحله ۱۹) */
  animation3d?: Animation3dMapping;
  /** زبان محتوای آموزشی رکورد (fa = ویرایشی، en = متن منبع) */
  contentLocale: "fa" | "en";
  summary: string;
  /** خلاصه انگلیسی نمایشی — فقط رکوردهای ویرایشی فارسی (enContent) */
  summaryEn: string | null;
  /** نخستین اشتباه رایج (برای پیش‌نمایش ردیف‌ها) — نبود یعنی منبع ندارد */
  mistakesPreview: string | null;
}

/** رکورد کامل جزئیات — شامل محتوای آموزشی + خط منبع برای نمایش شفاف */
export interface LibraryExerciseDetail extends LibraryExerciseCard {
  steps: string[];
  breathing: string | null;
  mistakes: string[];
  safety: string[];
  /** ترجمه نمایشی انگلیسی — فقط برای رکوردهای ویرایشی فارسی */
  enContent?: {
    summary: string;
    steps: string[];
    breathing: string;
    mistakes: string[];
    safety: string[];
  };
  /** خط منبع برای نمایش شفاف — «editorial» یعنی محتوای ویرایشی خود پروژه */
  sourceKey: "editorial" | "free-exercise-db";
  /** حرکات مشابه بر اساس ارتباط واقعی عضلات/تجهیزات/دسته */
  similar: LibraryExerciseCard[];
  /**
   * رسانه رکورد بانک — مرحله ۲۰/P2 (R2.3). فقط فیلدهای whitelist؛
   * بایتها فقط از مسیر استریم احرازنشست‌دار سرو میشوند. نبود فیلد =
   * رسانهای ثبت نشده (نمایش صادقانه «بدون ویدئو»).
   */
  media?: ExerciseMediaClientInfo[];
}

/** فیلدهای مجاز نمایشی رسانه — آینه whitelist سرور (بدون storagePath) */
export interface ExerciseMediaClientInfo {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/** حروف اختصاری کوتاه دسته برای گرافیک یکپارچه کارت — خالص و مشترک */
const CATEGORY_MONOGRAM = new Map(EXERCISE_CATEGORIES.map((c) => [c.id, c.monogram]));

export function categoryMonogram(id: ExerciseCategoryId): string {
  return CATEGORY_MONOGRAM.get(id) ?? "؟";
}
