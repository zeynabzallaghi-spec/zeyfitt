/**
 * تایپ‌های موتور برنامه‌سازی تمرینی — مشترک بین کلاینت و سرور.
 *
 * موتور کاملاً قانون‌محور و خالص است (بدون فراخوانی خارجی و بدون تصادف)؛
 * برای تنظیمات یکسان همیشه برنامه یکسانی تولید می‌شود تا تست‌پذیر و
 * قابل‌توضیح باشد. هیچ ادعای «هوش مصنوعی» ندارد.
 */

import type {
  Difficulty,
  EquipmentId,
  ExerciseCategoryId,
} from "@/lib/exercises/types";
import { EXERCISE_CATEGORIES } from "@/lib/exercises/types";

/** هدف تمرینی — همان واژگان پروفایل */
export type PlanGoal = "fat_loss" | "muscle_gain" | "strength" | "maintain" | "fitness";

/** سطح تجربه — همان واژگان پروفایل */
export type PlanExperience = "beginner" | "intermediate" | "advanced";

/** تمرکز برنامه — کل بدن، بالاتنه، پایین‌تنه یا یک دسته مشخص از بانک */
export type PlanFocus = "all" | "upper" | "lower" | ExerciseCategoryId;

/**
 * تنظیمات ساخت برنامه — ورودی موتور.
 * هیچ فیلد هویتی (userId و…) در این ساختار نیست؛ مالکیت همیشه سمت سرور
 * از نشست تعیین می‌شود.
 */
export interface PlanSettings {
  goal: PlanGoal;
  experience: PlanExperience;
  /** ۲ تا ۶ روز در هفته */
  daysPerWeek: number;
  /** مدت هر جلسه — ۳۰ | ۴۵ | ۶۰ | ۹۰ دقیقه */
  sessionMinutes: number;
  /** تجهیزات واقعاً در دسترس (واژگان بانک حرکات) — حرکتی فقط وقتی انتخاب
   *  می‌شود که همه تجهیزات لازمش در همین فهرست باشد */
  equipment: EquipmentId[];
  /** تمرکز اختیاری برنامه */
  focus: PlanFocus;
  /** روزهای ترجیحی هفته — ۰=شنبه تا ۶=جمعه؛ خالی یعنی بدون ترجیح */
  preferredDays: number[];
  /** دسته‌هایی که کاربر نمی‌خواهد در برنامه باشند */
  excludedCategories: ExerciseCategoryId[];
  /** حرکات مشخصی که کاربر انجام نمی‌دهد (شناسه پایدار بانک) */
  excludedExerciseIds: string[];
  /** یادداشت احتیاطی کاربر — فقط به‌عنوان هشدار نمایش داده می‌شود؛ تشخیص پزشکی نیست */
  limitationNotes: string | null;
}

/* ------------------------------ خروجی موتور ------------------------------ */

/** یک حرکت برنامه‌ریزی‌شده داخل جلسه */
export interface PlannedExercise {
  /** شناسه پایدار در بانک حرکات */
  exerciseId: string;
  faName: string;
  enName: string;
  category: ExerciseCategoryId;
  /** شناسه مربی سه‌بعدی — null یعنی واقعاً بدون انیمیشن؛ هیچ جایگزینی ساخته نمی‌شود */
  coach3dId: string | null;
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  estimatedMinutes: number;
  /** یادداشت کوتاه اجرا — از معرفی حرکت بانک (در بازیابی از snapshot ممکن است null باشد) */
  note: string | null;
}

/** یک جلسه تمرینی در هفته */
export interface PlannedDay {
  /** ترتیب جلسه در هفته — از ۱ */
  order: number;
  /** روز هفته ۰=شنبه تا ۶=جمعه؛ null یعنی بدون روز مشخص */
  weekday: number | null;
  title: string;
  focusLabel: string;
  estMinutes: number;
  exercises: PlannedExercise[];
}

/** برنامه کامل تولیدشده — بدون شناسه دیتابیس؛ قبل از ذخیره فقط پیش‌نمایش است */
export interface GeneratedPlan {
  title: string;
  goal: PlanGoal;
  experience: PlanExperience;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: EquipmentId[];
  focus: PlanFocus;
  /** راهنمای عمومی: گرم‌کردن، پیشرفت تدریجی و توصیه‌های محتاطانه */
  notes: string[];
  days: PlannedDay[];
  /** مجموع حرکات برنامه */
  totalExercises: number;
}

/* ------------------------------ برچسب‌های فارسی ------------------------------ */

export const PLAN_GOAL_LABELS: Record<PlanGoal, string> = {
  fat_loss: "کاهش چربی",
  muscle_gain: "عضله‌سازی",
  strength: "افزایش قدرت",
  maintain: "حفظ وزن",
  fitness: "آمادگی جسمانی",
};

/** برچسب انگلیسی هدف — فقط برای تولید محتوا با locale="en" */
export const PLAN_GOAL_LABELS_EN: Record<PlanGoal, string> = {
  fat_loss: "Fat loss",
  muscle_gain: "Muscle gain",
  strength: "Strength",
  maintain: "Maintenance",
  fitness: "General fitness",
};

export const PLAN_EXPERIENCE_LABELS: Record<PlanExperience, string> = {
  beginner: "مبتدی",
  intermediate: "متوسط",
  advanced: "پیشرفته",
};

export const PLAN_FOCUS_LABELS: Record<Exclude<PlanFocus, ExerciseCategoryId>, string> = {
  all: "کل بدن",
  upper: "بالاتنه",
  lower: "پایین‌تنه",
};

export function focusFa(focus: PlanFocus): string {
  if (focus === "all" || focus === "upper" || focus === "lower") {
    return PLAN_FOCUS_LABELS[focus];
  }
  return EXERCISE_CATEGORIES.find((c) => c.id === focus)?.fa ?? focus;
}

/** برچسب انگلیسی تمرکز — فقط برای تولید محتوا با locale="en" */
export function focusEn(focus: PlanFocus): string {
  if (focus === "all") return "Full body";
  if (focus === "upper") return "Upper body";
  if (focus === "lower") return "Lower body";
  return EXERCISE_CATEGORIES.find((c) => c.id === focus)?.en ?? focus;
}

/** تایپ Difficulty باز export می‌شود تا UI و تست‌ها یک منبع داشته باشند */
export type { Difficulty, EquipmentId, ExerciseCategoryId };
