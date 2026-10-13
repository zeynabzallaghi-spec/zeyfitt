/**
 * موتور انیمیشن پروسیجرال — توابع خالص و مستقل از رندر.
 *
 * چرخه هر حرکت از چند کلیدفریم تشکیل شده است؛ این موتور بین دو کلیدفریم
 * مجاور با میان‌یابی نرم (smoothstep) وضعیت همه مفاصل را محاسبه می‌کند.
 * مفاصلِ ذکرنشده در یک کلیدفریم روی وضعیت پایه (REST_POSE) در نظر گرفته
 * می‌شوند تا انتقال‌ها همیشه پیوسته و بدون پرش باشند.
 */

import type {
  FullPose,
  JointName,
  JointPose,
  JointValue,
  Keyframe,
} from "./types";

/** همه مفاصل قابل کنترل — برای پیمایش کامل در میان‌یابی */
export const ALL_JOINTS: JointName[] = [
  "spine",
  "neck",
  "shoulderL",
  "shoulderR",
  "elbowL",
  "elbowR",
  "wristL",
  "wristR",
  "hipL",
  "hipR",
  "kneeL",
  "kneeR",
  "ankleL",
  "ankleR",
];

/**
 * وضعیت پایه طبیعی بدن (درجه):
 * - بازوها با کمی فاصله طبیعی از تنه (ابداکشن ملایم ±۶°)
 * - بقیه مفاصل خنثی
 */
export const REST_POSE: Record<JointName, JointValue> = {
  spine: [0, 0, 0],
  neck: [0, 0, 0],
  shoulderL: [0, 0, 6],
  shoulderR: [0, 0, -6],
  elbowL: 0,
  elbowR: 0,
  wristL: 0,
  wristR: 0,
  hipL: [0, 0, 0],
  hipR: [0, 0, 0],
  kneeL: 0,
  kneeR: 0,
  ankleL: 0,
  ankleR: 0,
};

/** ارتفاع ریشه (مرکز لگن) در حالت ایستاده بر حسب متر */
export const PELVIS_Y = 1.0;

/** نرمال‌سازی مقدار مفصل به آرایه سه‌تایی */
function asTriple(v: JointValue | undefined, fallback: JointValue): [number, number, number] {
  const src = v ?? fallback;
  if (Array.isArray(src)) return [src[0], src[1], src[2]];
  return [src, 0, 0];
}

function valueOf(kf: Keyframe | undefined, joint: JointName): JointValue {
  const fromKf: JointValue | undefined = kf?.pose?.[joint];
  return fromKf ?? REST_POSE[joint];
}

/** درون‌یابی نرم — شتاب‌گیری و کاهش سرعت در ابتدا و انتهای هر مرحله */
export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** مجموع مدت چرخه بر حسب ثانیه */
export function cycleDuration(cycle: Keyframe[]): number {
  return cycle.reduce((sum, kf) => sum + kf.duration, 0);
}

const ZERO_ROOT = { y: 0, z: 0, rx: 0 } as const;

function rootOf(kf: Keyframe | undefined): Required<NonNullable<Keyframe["root"]>> {
  return {
    y: kf?.root?.y ?? ZERO_ROOT.y,
    z: kf?.root?.z ?? ZERO_ROOT.z,
    rx: kf?.root?.rx ?? ZERO_ROOT.rx,
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * محاسبه وضعیت کامل بدن بین کلیدفریم A و B با پیشرفت t (۰ تا ۱).
 * خروجی خالص است و هیچ حالت سراسری‌ای را تغییر نمی‌دهد.
 */
export function blendKeyframes(a: Keyframe, b: Keyframe, t: number): FullPose {
  const s = smoothstep(t);
  const joints = {} as Record<JointName, [number, number, number]>;
  for (const joint of ALL_JOINTS) {
    const va = asTriple(valueOf(a, joint), REST_POSE[joint]);
    const vb = asTriple(valueOf(b, joint), REST_POSE[joint]);
    joints[joint] = [
      lerp(va[0], vb[0], s),
      lerp(va[1], vb[1], s),
      lerp(va[2], vb[2], s),
    ];
  }
  const ra = rootOf(a);
  const rb = rootOf(b);
  return {
    root: {
      y: lerp(ra.y, rb.y, s),
      z: lerp(ra.z, rb.z, s),
      rx: lerp(ra.rx, rb.rx, s),
    },
    joints,
  };
}

/**
 * یافتن موقعیت زمانی داخل چرخه.
 * خروجی: اندیس کلیدفریم شروع، کلیدفریم پایان، پیشرفت درون مرحله و
 * پیشرفت کل چرخه (۰ تا ۱) برای نوار پیشرفت رابط کاربری.
 */
export function locateInCycle(cycle: Keyframe[], time: number) {
  const total = cycleDuration(cycle);
  const t = Math.min(time, total - 1e-4);
  let acc = 0;
  for (let i = 0; i < cycle.length; i++) {
    const dur = cycle[i].duration;
    if (t < acc + dur || i === cycle.length - 1) {
      const phaseT = dur > 0 ? Math.min(1, (t - acc) / dur) : 1;
      const next = cycle[(i + 1) % cycle.length];
      return {
        fromIndex: i,
        toIndex: (i + 1) % cycle.length,
        phaseT,
        cycleT: total > 0 ? t / total : 0,
        from: cycle[i],
        to: next,
      };
    }
    acc += dur;
  }
  // غیرقابل رسیدن — برای رضایت تایپ‌چک
  const first = cycle[0];
  const next = cycle[1 % cycle.length];
  return {
    fromIndex: 0,
    toIndex: 1 % cycle.length,
    phaseT: 0,
    cycleT: 0,
    from: first,
    to: next,
  };
}

/** وضعیت اولیه چرخه — برای بازگشت به وضعیت شروع حرکت */
export function startPose(cycle: Keyframe[]): FullPose {
  const first = cycle[0];
  const next = cycle[1 % cycle.length];
  return blendKeyframes(first, next, 0);
}
