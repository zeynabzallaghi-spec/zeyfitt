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

/**
 * گروه‌های عضلانی که به snapshot جلسه/برنامه می‌روند — همان ۱۲ گروه
 * سه‌بعدی. گروه‌های کتابخانه‌ای (مرحله ۱۸: adductors/lower-back/neck)
 * Mesh سه‌بعدی ندارند و صادقانه حذف می‌شوند — منبع واحد این فهرست همین‌جاست
 * (مرحله ۲۰/P1-R1.4: مسیر snapshot عضلات برنامه و جلسه از همین تغذیه میشود).
 */
export const SESSION_MUSCLE_GROUPS: readonly MuscleGroupId[] = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "back",
  "traps",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
] as const;

/**
 * پالایش عضلات به گروه‌های سه‌بعدی جلسه — ورودی میتواند هر واژگان بانک
 * (۱۵ گروه) باشد؛ خروجی فقط عضلاتی که snapshot جلسه معنادار می‌شوند.
 */
export function filterSessionMuscles(muscles: readonly string[]): MuscleGroupId[] {
  return muscles.filter((m): m is MuscleGroupId =>
    (SESSION_MUSCLE_GROUPS as readonly string[]).includes(m)
  );
}

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
 * number[] = آرایه محاسبه‌شده الگوها — موتور انیمیشن نرمال‌سازی می‌کند
 * (طول کامل سه‌تایی الزامی است؛ زوایای الگوها همیشه سه جزء دارند)
 */
export type JointValue = number | number[];

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

/**
 * وضعیت پیاده‌سازی (تجهیز متحرک) در فضای ریشه بدن — مرحله ۱۹.
 * مختصات نسبت به لگن: y بالا/پایین، z جلو/عقب. rx/rz چرخش ظاهری.
 * برای حرکات دو‌دستی متقارن، پیاده‌سازی روی صفحه میانی بدن می‌ماند.
 */
export interface ImplementPose {
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  rz?: number;
  /** مخفی‌کردن پیاده‌سازی در این مرحله (مثلاً پرتاب که از دست خارج می‌شود) */
  hidden?: boolean;
}

/** یک کلیدفریم از چرخه حرکت */
export interface Keyframe {
  /** نام مرحله برای نمایش در رابط کاربری (فارسی) */
  name: string;
  /** نام نمایشی انگلیسی مرحله — پروفایل‌های مرحله ۱۹ (برای دوزبانگی) */
  nameEn?: string;
  /** مدت این مرحله بر حسب ثانیه در سرعت ۱× */
  duration: number;
  root?: RootPose;
  pose?: JointPose;
  /** وضعیت پیاده‌سازی متحرک — ذکرنشده یعنی همان وضعیت مرحله قبل/پایه */
  impl?: ImplementPose;
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
  /** وضعیت پیاده‌سازی متحرک — مرحله ۱۹ */
  impl: Required<Omit<ImplementPose, "hidden">> & { hidden: boolean };
}

/** نماهای از پیش تعریف‌شده دوربین + حالت آزاد پس از چرخش دستی */
export type CameraView = "front" | "side" | "back" | "free";
