/**
 * هسته سیستم الگوهای حرکتی پارامتری — مرحله ۱۹.
 *
 * معماری: به‌جای یک فایل انیمیشن مستقل برای هر یک از صدها حرکت، هر حرکت
 * به یک «الگوی حرکتی» (MovementProfile) پارامتری متصل می‌شود. هر الگو
 * تابعی خالص است که با پارامترهای ورودی (عمق، عرض پا، نوع قبضه، تک‌دستی/
 * دودستی و…) یک چرخه کلیدفریم کامل می‌سازد. الگوها از داده واقعی حرکت
 * (نام، تجهیزات، عضلات، نوع تمرین) نگاشت می‌شوند و برای هر حرکت، نگاشت
 * صریح و قابل‌نسخه‌بندی در دیتابیس ذخیره می‌شود (animation3dProfileId +
 * animation3dParamsJson).
 *
 * قواعد صداقت:
 *  - تجهیزات فقط وقتی رندر می‌شوند که نمایششان گمراه‌کننده نباشد؛
 *    دستگاه‌ها و کابل‌ها با «نمایش ساده‌شده + یادداشت صادقانه» پوشش
 *    داده می‌شوند (بدون ادعای شبیه‌سازی دقیق دستگاه).
 *  - حرکات ایزومتریک با counterMode="hold" و بدون افزایش شمارنده تکرار.
 *  - زوایا تقریبی و برای آموزش الگوی کلی حرکت‌اند؛ این محدودیت در
 *    honestyNote هر الگو صادقانه ثبت می‌شود.
 */

import type { Keyframe, JointPose, RootPose } from "../types";

export type { Keyframe, JointPose, RootPose };

/** تجهیزات متحرک متصل به بدن — رندر ساده اما صادقانه */
export type HandPropKind =
  | "none"
  | "dumbbells" // دمبل در هر دو دست (رفتار مرحله ۲ — دست‌نخورده)
  | "dumbbell-one" // دمبل تک‌دستی (فقط دست چپ مدل — حرکات تک‌دستی)
  | "kettlebell-one" // کتل‌بل یک‌دستی
  | "plate-hands" // صفحه وزنه با هر دو دست جلوی سینه
  | "handle-cable" // دسته کابل/دستگاه در هر دو دست
  | "ab-wheel" // چرخ شکم در هر دو دست
  | "wrist-bar"; // میله کوتاه مچ (حرکات ساعد)

/** پیاده‌سازی مرکزی متحرک — روی صفحه میانی بدن برای حرکات متقارن دودستی */
export type ImplementKind =
  | "none"
  | "barbell" // هالتر بلند با صفحه
  | "ez-bar" // هالتر خمیده (کوتاه‌تر)
  | "kettlebell-hands" // کتل‌بل دو‌دستی
  | "medball-hands" // توپ پزشکی
  | "band-loop" // کش بین دو دست (نمایش میله نازک)
  | "pull-handle"; // میله بالاکش پهن

/** تجهیزات ثابت صحنه — بدون حرکت، برای درک فضایی حرکت */
export type ScenePropKind =
  | "bench-flat"
  | "bench-incline"
  | "bench-decline"
  | "box"
  | "pullup-bar"
  | "dip-bars"
  | "stability-ball"
  | "machine-seat"
  | "wall";

export type CounterMode = "reps" | "hold";

/** خروجی build هر الگو — همه اجزای مورد نیاز صحنه و شمارنده */
export interface BuiltCycle {
  cycle: Keyframe[];
  /** تعداد تکرار هر چرخه کامل (پیش‌فرض ۱) */
  repsPerCycle?: number;
  /** ارتفاع هدف دوربین برای قاب‌بندی */
  cameraTargetY?: number;
  /** رفتار شمارنده — hold یعنی ایزومتریک/کشش ثابت: شمارنده تکرار افزایش نمی‌یابد */
  counterMode: CounterMode;
  handProp: HandPropKind;
  implement: ImplementKind;
  sceneProps: ScenePropKind[];
  /** یادداشت شفاف فارسی درباره ساده‌سازی نمایش */
  honestyNote?: string;
  honestyNoteEn?: string;
}

/** پارامترهای ورودی الگو — مقادیر از نگاشت دیتابیس می‌آیند */
export type ProfileParams = Record<string, number | string | boolean>;

export interface ProfileParamSpec {
  key: string;
  /** برچسب فارسی پارامتر (برای مستندسازی و گزارش) */
  label: string;
  kind: "number" | "enum";
  min?: number;
  max?: number;
  /** گزینه‌های مجاز enum */
  options?: string[];
  default: number | string;
}

export interface MovementProfile {
  id: string;
  fa: string;
  en: string;
  /** گروه الگو برای گزارش پوشش (squat / hinge / press / …) */
  group: string;
  params: ProfileParamSpec[];
  build(params: ProfileParams): BuiltCycle;
}

/* ------------------------------- ابزارهای سازنده ------------------------------- */

/**
 * کلیدفریم با نام دوزبانه — الگوهای مرحله ۱۹ همیشه هر دو نام را می‌دهند
 * تا رابط فارسی/انگلیسی بدون نقشه نمایشی اضافه کار کند.
 */
export function kf(
  fa: string,
  en: string,
  duration: number,
  opts?: { root?: RootPose; pose?: JointPose; impl?: Keyframe["impl"] },
): Keyframe {
  return { name: fa, nameEn: en, duration, root: opts?.root, pose: opts?.pose, impl: opts?.impl };
}

/** خواندن پارامتر عددی با اعتبارسنجی بازه — خارج از بازه به پیش‌فرض می‌افتد */
export function numParam(
  params: ProfileParams,
  key: string,
  spec: ProfileParamSpec,
  fallback: number,
): number {
  const v = params[key];
  if (typeof v !== "number" || Number.isNaN(v)) return fallback;
  if (spec.min !== undefined && v < spec.min) return fallback;
  if (spec.max !== undefined && v > spec.max) return fallback;
  return v;
}

/** خواندن پارامتر enum — مقدار ناشناخته به پیش‌فرض می‌افتد */
export function enumParam(
  params: ProfileParams,
  key: string,
  spec: ProfileParamSpec,
  fallback: string,
): string {
  const v = params[key];
  if (typeof v !== "string") return fallback;
  if (spec.options && !spec.options.includes(v)) return fallback;
  return v;
}

/* --------------------------- وضعیت‌های پایه مشترک --------------------------- */

/** بازوها آویزان با فاصله طبیعی — وضعیت ایستاده استاندارد */
export const ARMS_DOWN: JointPose = {};

/** بازوها مستقیم رو به جلو (۹۰ درجه فلکشن شانه) */
export function armsForward(zTilt = 6): JointPose {
  return { shoulderL: [-90, 0, zTilt], shoulderR: [-90, 0, -zTilt], elbowL: 0, elbowR: 0 };
}

/** بازوها کشیده به بالا (بالای سر) */
export function armsOverhead(deg = 165, zTilt = 10): JointPose {
  return { shoulderL: [-deg, 0, zTilt], shoulderR: [-deg, 0, -zTilt], elbowL: 0, elbowR: 0 };
}

/** ابداکشن شانه به ارتفاع مشخص (نشر جانب) */
export function armsSide(deg: number, elbowBend = 12): JointPose {
  return {
    shoulderL: [-8, 0, deg],
    shoulderR: [-8, 0, -deg],
    elbowL: -elbowBend,
    elbowR: -elbowBend,
  };
}

/** دست‌ها در ارتفاع شانه آماده پرس */
export const ARMS_PRESS_RACK: JointPose = {
  shoulderL: [-15, 0, 72],
  shoulderR: [-15, 0, -72],
  elbowL: -145,
  elbowR: -145,
};
export const ARMS_PRESS_TOP: JointPose = {
  shoulderL: [-5, 0, 148],
  shoulderR: [-5, 0, -148],
  elbowL: -18,
  elbowR: -18,
};

/** آویزان از میله — فلکشن کامل شانه */
export const ARMS_HANG: JointPose = {
  shoulderL: [-175, 0, 8],
  shoulderR: [-175, 0, -8],
  elbowL: 0,
  elbowR: 0,
};

/** اسکوات پایین با عمق قابل تنظیم (خمش زانو بر حسب درجه) */
export function squatBottom(
  kneeDeg: number,
  torsoLean = 16,
  hipAbd = 8,
): { pose: JointPose; root: RootPose } {
  // نسبت تقریبی ارتفاع لگن به خمش زانو — برای عمق‌های ۵۰ تا ۱۲۰ درجه
  const depth = Math.min(0.44, Math.max(0.1, (kneeDeg / 100) * 0.36));
  return {
    root: { y: -depth },
    pose: {
      spine: [torsoLean, 0, 0],
      neck: [-torsoLean * 0.85, 0, 0],
      shoulderL: [-42, 0, 14],
      shoulderR: [-42, 0, -14],
      elbowL: -12,
      elbowR: -12,
      hipL: [-kneeDeg * 0.78, 0, hipAbd],
      hipR: [-kneeDeg * 0.78, 0, -hipAbd],
      kneeL: kneeDeg,
      kneeR: kneeDeg,
      ankleL: -kneeDeg * 0.22,
      ankleR: -kneeDeg * 0.22,
    },
  };
}

/** حالت درازکش به پشت (ساین) — چرخش ریشه روی زمین */
export const LYING_SUPINE_ROOT: RootPose = { y: -0.82, rx: 90 };
/** حالت درازکش به شکم (پرون) */
export const LYING_PRONE_ROOT: RootPose = { y: -0.78, rx: -90 };
/** حالت چهار دست و پا */
export const QUADRUPED_ROOT: RootPose = { y: -0.62, rx: 72 };

/** وضعیت پلانک بالای حرکت — بازوهای عمود زیر شانه (عین حرکت فعلی شنا) */
export function plankTopPose(elbowDeg = 5): JointPose {
  return {
    neck: [-22, 0, 0],
    shoulderL: [-88, 0, 11],
    shoulderR: [-88, 0, -11],
    elbowL: -elbowDeg,
    elbowR: -elbowDeg,
    ankleL: 48,
    ankleR: 48,
  };
}

/** پلانک روی ساعد — آرنج ۹۰ خم */
export const FOREARM_PLANK_TOP: JointPose = {
  neck: [-22, 0, 0],
  shoulderL: [-78, 0, 11],
  shoulderR: [-78, 0, -11],
  elbowL: -90,
  elbowR: -90,
  ankleL: 48,
  ankleR: 48,
};

/** جمع‌کردن پاها از حالت باز */
export function legsTogether(): JointPose {
  return { hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0, kneeR: 0, ankleL: 0, ankleR: 0 };
}
