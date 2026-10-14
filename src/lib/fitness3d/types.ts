/**
 * تایپ‌های مشترک سیستم مربی سه‌بعدی.
 *
 * معماری: داده‌های حرکات کاملاً از رندر جدا هستند تا بعداً بتوان مدل
 * پروسیجرال را با یک مدل GLB دارای اسکلت استاندارد جایگزین کرد بدون
 * آنکه ساختار داده حرکات تغییر کند.
 */

import type { Difficulty } from "@/lib/exercises/types";

/** شناسه گروه‌های عضلانی — قابل توسعه برای عضلات بیشتر */
export type MuscleGroupId =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "back"
  | "traps"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

/** نام مفاصل قابل کنترل مدل پروسیجرال */
export type JointName =
  | "spine"
  | "neck"
  | "shoulderL"
  | "shoulderR"
  | "elbowL"
  | "elbowR"
  | "wristL"
  | "wristR"
  | "hipL"
  | "hipR"
  | "kneeL"
  | "kneeR"
  | "ankleL"
  | "ankleR";

/**
 * مقدار زاویه مفصل بر حسب درجه.
 * عدد تنها = چرخش حول محور X (مفاصل لولایی: آرنج، زانو، مچ پا و مچ دست)
 * آرایه سه‌تایی = اویلر XYZ کامل (مفاصل گویا: شانه، لگن، ستون فقرات و گردن)
 */
export type JointValue = number | [number, number, number];

/** وضعیت مفاصل در یک کلیدفریم — مفاصل ذکرنشده روی وضعیت پایه می‌مانند */
export type JointPose = Partial<Record<JointName, JointValue>>;

/** جابه‌جایی و چرخش ریشه بدن (برای حرکاتی مثل شنا، اسکوات و لانج) */
export interface RootPose {
  /** تغییر ارتفاع ریشه (لگن) بر حسب متر نسبت به حالت ایستاده */
  y?: number;
  /** جابه‌جایی عمقی (محور Z؛ مثبت = به سمت جلو) بر حسب متر */
  z?: number;
  /** چرخش کل بدن حول محور X بر حسب درجه (برای خوابیدن روی زمین در حرکت شنا) */
  rx?: number;
}

/** یک کلیدفریم از چرخه حرکت */
export interface Keyframe {
  /** نام مرحله برای نمایش در رابط کاربری (فارسی) */
  name: string;
  /** مدت این مرحله بر حسب ثانیه در سرعت ۱× */
  duration: number;
  root?: RootPose;
  pose?: JointPose;
}

/** تعریف کامل یک حرکت — قابل توسعه برای ۴۰+ حرکت آینده */
export interface ExerciseDef {
  id: string;
  fa: string;
  en: string;
  difficulty: Difficulty;
  /** تجهیزات لازم — برچسب فارسی */
  equipment: string[];
  /** آیا دمبل در صحنه سه‌بعدی نمایش داده شود */
  props3d: "none" | "dumbbells";
  primaryMuscles: MuscleGroupId[];
  secondaryMuscles: MuscleGroupId[];
  /** مفاصل و بخش‌های بدن درگیر — برچسب فارسی */
  jointsInvolved: string[];
  startPosition: string;
  steps: string[];
  mistakes: string[];
  /** نکته مربیگری کوتاه */
  tip: string;
  /** چرخه کامل حرکت — اجرای یک دور کامل = یک تکرار (یا repsPerCycle تکرار) */
  cycle: Keyframe[];
  /** تعداد تکرار هر چرخه کامل (لانج چپ + راست در یک چرخه = ۲) */
  repsPerCycle?: number;
  /** ارتفاع هدف دوربین برای قاب‌بندی بهتر این حرکت */
  cameraTargetY?: number;
  /** یادداشت شفاف درباره محدودیت اجرای پروسیجرال این حرکت */
  honestyNote?: string;
}

/** وضعیت کامل و نرمال‌شده همه مفاصل — خروجی موتور انیمیشن */
export interface FullPose {
  root: Required<RootPose>;
  joints: Record<JointName, [number, number, number]>;
}

/** نماهای از پیش تعریف‌شده دوربین + حالت آزاد پس از چرخش دستی */
export type CameraView = "front" | "side" | "back" | "free";
