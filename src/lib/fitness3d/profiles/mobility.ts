/**
 * الگوهای حرکتی — کشش، تحرک، هوازی، پلایومتریک، المپیک و استرونگمن (مرحله ۱۹).
 * کشش‌های ایزومتریک با counterMode="hold"؛ هوازی/پلایومتریک با نمای ساده و صادقانه.
 */

import type { MovementProfile, ProfileParams, BuiltCycle, JointPose, RootPose } from "./core";
import {
  kf,
  enumParam,
  LYING_SUPINE_ROOT,
  LYING_PRONE_ROOT,
  QUADRUPED_ROOT,
  plankTopPose,
  armsForward,
  ARMS_DOWN,
} from "./core";

/* ------------------------------ کشش‌های ثابت ------------------------------ */

export const staticStretchProfile: MovementProfile = {
  id: "static-stretch",
  fa: "کشش ثابت",
  en: "Static stretch",
  group: "stretch",
  params: [
    { key: "variant", label: "وضعیت کشش", kind: "enum", options: ["standing-quad", "seated-hamstring", "supine-hamstring", "knee-chest", "cobra", "childs-pose", "cat-cow", "standing-side", "chest-door", "neck", "shoulder-cross", "calf-wall", "groin", "pigeon", "lunge-stretch", "wrist", "figure-four", "standing-forward"], default: "seated-hamstring" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["standing-quad", "seated-hamstring", "supine-hamstring", "knee-chest", "cobra", "childs-pose", "cat-cow", "standing-side", "chest-door", "neck", "shoulder-cross", "calf-wall", "groin", "pigeon", "lunge-stretch", "wrist", "figure-four", "standing-forward"], default: "seated-hamstring" }, "seated-hamstring");
    const hold = (fa: string, en: string, root: RootPose | undefined, pose: JointPose, dur = 4.0): import("../types").Keyframe[] => [
      kf(`${fa} — ورود به کشش`, `${en} — easing into the stretch`, 1.2, { root, pose }),
      kf(`نگه‌داشتن ${fa}`, `Holding ${en.toLowerCase()}`, dur, { root, pose }),
      kf(`خروج از ${fa}`, `Exiting ${en.toLowerCase()}`, 1.0, { root, pose }),
    ];
    switch (variant) {
      case "standing-quad":
        return {
          cycle: hold("کشش جلوی ران ایستاده", "Standing quad stretch", { y: -0.04 }, { hipR: [-64, 0, -2], kneeR: 104, ankleR: 20, shoulderR: [-30, 0, -14], elbowR: -92 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: ["wall"],
        };
      case "supine-hamstring":
        return {
          cycle: hold("کشش همسترینگ خوابیده", "Supine hamstring stretch", LYING_SUPINE_ROOT, { hipL: [-72, 0, 3], kneeL: 6, hipR: [-4, 0, -4], kneeR: 4, shoulderL: [-150, 0, 14], shoulderR: [-150, 0, -14], elbowL: -20, elbowR: -20 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "knee-chest":
        return {
          cycle: hold("کشش زانو به سینه", "Knee-to-chest stretch", LYING_SUPINE_ROOT, { hipL: [-108, 0, 4], kneeL: 108, hipR: [-4, 0, -4], kneeR: 4, shoulderL: [-140, 0, 16], shoulderR: [-140, 0, -16], elbowL: -30, elbowR: -30 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "figure-four":
        return {
          cycle: hold("کشش شکل چهار (باسن)", "Figure-four glute stretch", LYING_SUPINE_ROOT, { hipL: [-96, 0, 22], kneeL: 46, hipR: [-84, 0, -8], kneeR: 86, shoulderL: [-142, 0, 16], shoulderR: [-142, 0, -16], elbowL: -30, elbowR: -30 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "cobra":
        return {
          cycle: hold("کشش کبرا", "Cobra stretch", LYING_PRONE_ROOT, { neck: [24, 0, 0], spine: [-26, 0, 0], shoulderL: [-30, 0, 22], shoulderR: [-30, 0, -22], elbowL: -20, elbowR: -20, hipL: [0, 0, 3], hipR: [0, 0, -3], kneeL: 2, kneeR: 2 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "childs-pose":
        return {
          cycle: hold("کشش کودک", "Child's pose", { y: -0.5, rx: 40 }, { neck: [18, 0, 0], spine: [30, 0, 0], shoulderL: [-146, 0, 10], shoulderR: [-146, 0, -10], elbowL: -4, elbowR: -4, hipL: [-96, 0, 4], hipR: [-96, 0, -4], kneeL: 100, kneeR: 100, ankleL: 44, ankleR: 44 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "cat-cow":
        return {
          cycle: [
            kf("گربه — قوز کردن پشت", "Cat — rounding the back", 1.4, { root: QUADRUPED_ROOT, pose: { neck: [20, 0, 0], spine: [24, 0, 0], shoulderL: [-74, 0, 10], shoulderR: [-74, 0, -10], elbowL: -8, elbowR: -8, hipL: [-70, 0, 0], hipR: [-70, 0, 0], kneeL: 84, kneeR: 84 } }),
            kf("نگه‌داشتن گربه", "Holding the cat", 1.6, { root: QUADRUPED_ROOT, pose: { neck: [20, 0, 0], spine: [24, 0, 0], shoulderL: [-74, 0, 10], shoulderR: [-74, 0, -10], elbowL: -8, elbowR: -8, hipL: [-70, 0, 0], hipR: [-70, 0, 0], kneeL: 84, kneeR: 84 } }),
            kf("گاو — فرورفتن پشت", "Cow — arching the back", 1.4, { root: QUADRUPED_ROOT, pose: { neck: [-18, 0, 0], spine: [-18, 0, 0], shoulderL: [-74, 0, 10], shoulderR: [-74, 0, -10], elbowL: -8, elbowR: -8, hipL: [-70, 0, 0], hipR: [-70, 0, 0], kneeL: 84, kneeR: 84 } }),
            kf("نگه‌داشتن گاو", "Holding the cow", 1.6, { root: QUADRUPED_ROOT, pose: { neck: [-18, 0, 0], spine: [-18, 0, 0], shoulderL: [-74, 0, 10], shoulderR: [-74, 0, -10], elbowL: -8, elbowR: -8, hipL: [-70, 0, 0], hipR: [-70, 0, 0], kneeL: 84, kneeR: 84 } }),
          ],
          counterMode: "reps",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "standing-side":
        return {
          cycle: hold("کشش پهلو ایستاده", "Standing side stretch", { y: -0.02 }, { spine: [0, 0, -36], shoulderL: [-168, 0, 10], shoulderR: [-10, 0, -12], elbowL: -4, elbowR: -4 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "chest-door":
        return {
          cycle: hold("کشش سینه روی قاب", "Chest stretch on the frame", { y: -0.02 }, { spine: [10, 0, 0], shoulderL: [-84, 0, 74], shoulderR: [-84, 0, -74], elbowL: -86, elbowR: -86 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: ["wall"],
        };
      case "neck":
        return {
          cycle: hold("کشش گردن", "Neck stretch", undefined, { neck: [-18, 0, -10] }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "shoulder-cross":
        return {
          cycle: hold("کشش شانه (دست روی سینه)", "Cross-body shoulder stretch", undefined, { spine: [14, 0, 0], shoulderL: [-84, 0, 22], elbowL: -20, shoulderR: [-30, 0, -26], elbowR: -90 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "calf-wall":
        return {
          cycle: hold("کشش ساق روی دیوار", "Calf stretch on the wall", undefined, { spine: [24, 0, 0], shoulderL: [-66, 0, 18], shoulderR: [-66, 0, -18], elbowL: -66, elbowR: -66, ankleL: 14, ankleR: -2 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: ["wall"],
        };
      case "groin":
        return {
          cycle: hold("کشش داخل ران", "Groin stretch", { y: -0.5 }, { hipL: [-110, 0, 40], hipR: [-110, 0, -40], kneeL: 108, kneeR: 108, ankleL: 30, ankleR: 30, spine: [26, 0, 0], shoulderL: [-30, 0, 16], shoulderR: [-30, 0, -16], elbowL: -20, elbowR: -20 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "pigeon":
        return {
          cycle: hold("کشش کبوتری", "Pigeon stretch", { y: -0.5, rx: 40 }, { neck: [10, 0, 0], spine: [18, 0, 0], shoulderL: [-120, 0, 10], shoulderR: [-120, 0, -10], elbowL: -10, elbowR: -10, hipL: [-40, 0, 26], kneeL: 92, hipR: [-104, 0, -4], kneeR: 100, ankleR: 44 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "lunge-stretch":
        return {
          cycle: hold("کشش فلکسور لگن در لانج", "Hip flexor stretch in lunge", { y: -0.3, z: 0.04 }, { spine: [-8, 0, 0], shoulderL: [0, 0, 10], shoulderR: [0, 0, -10], elbowL: -6, elbowR: -6, hipR: [-64, 0, 0], kneeR: 64, hipL: [18, 0, 0], kneeL: 100, ankleL: 46 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "wrist":
        return {
          cycle: hold("کشش مچ و ساعد", "Wrist / forearm stretch", undefined, { shoulderL: [-64, 0, 16], elbowL: -12, shoulderR: [-64, 0, -16], elbowR: -12, wristL: 44, wristR: 44 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      case "standing-forward":
        return {
          cycle: hold("خم به جلوی ایستاده", "Standing forward fold", undefined, { spine: [76, 0, 0], neck: [-40, 0, 0], shoulderL: [10, 0, 8], shoulderR: [10, 0, -8], elbowL: -4, elbowR: -4 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
      default:
        // seated-hamstring
        return {
          cycle: hold("کشش همسترینگ نشسته", "Seated hamstring stretch", { y: -0.5 }, { hipL: [-92, 0, 3], kneeL: 6, hipR: [-92, 0, -3], kneeR: 6, ankleL: 0, ankleR: 0, spine: [30, 0, 0], shoulderL: [-20, 0, 14], shoulderR: [-20, 0, -14], elbowL: -8, elbowR: -8 }),
          counterMode: "hold",
          handProp: "none",
          implement: "none",
          sceneProps: [],
        };
    }
  },
};

/* -------------------------- تحرک و کشش پویا -------------------------- */

export const mobilityProfile: MovementProfile = {
  id: "mobility",
  fa: "تحرک و کشش پویا",
  en: "Mobility / dynamic",
  group: "mobility",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["arm-circles", "leg-swing", "hip-circles", "ankle-circles", "torso-twist", "dynamic-chest", "elbow-circles", "worlds", "inchworm", "walkout", "SMR", "band-pull-apart", "dislocate"], default: "arm-circles" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["arm-circles", "leg-swing", "hip-circles", "ankle-circles", "torso-twist", "dynamic-chest", "elbow-circles", "worlds", "inchworm", "walkout", "SMR", "band-pull-apart", "dislocate"], default: "arm-circles" }, "arm-circles");
    if (variant === "leg-swing") {
      const base: JointPose = { hipL: [0, 0, 4], kneeL: 4, hipR: [0, 0, 0], kneeR: 4 };
      const front: JointPose = { ...base, hipR: [-64, 0, 0], kneeR: 6 };
      const back: JointPose = { ...base, hipR: [26, 0, 0], kneeR: 10 };
      return {
        cycle: [
          kf("تاب به جلو", "Swinging forward", 0.8, { pose: front }),
          kf("تاب به عقب", "Swinging back", 0.8, { pose: back }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: ["wall"],
      };
    }
    if (variant === "hip-circles" || variant === "ankle-circles") {
      const isAnkle = variant === "ankle-circles";
      const a: JointPose = isAnkle ? { ankleR: -16, kneeR: 4 } : { spine: [10, 0, 0], hipR: [-14, 0, -14], kneeR: 6 };
      const b: JointPose = isAnkle ? { ankleR: 18, kneeR: 4 } : { spine: [-6, 0, 0], hipR: [12, 0, 14], kneeR: 6 };
      return {
        cycle: [
          kf("چرخش — فاز اول", "Circling — phase one", 0.9, { pose: a }),
          kf("چرخش — فاز دوم", "Circling — phase two", 0.9, { pose: b }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "torso-twist") {
      const left: JointPose = { spine: [6, -40, 0], shoulderL: [-20, 0, 24], shoulderR: [-20, 0, -24], elbowL: -80, elbowR: -80 };
      const right: JointPose = { spine: [6, 40, 0], shoulderL: [-20, 0, 24], shoulderR: [-20, 0, -24], elbowL: -80, elbowR: -80 };
      return {
        cycle: [
          kf("چرخش تنه به چپ", "Twisting the torso left", 0.9, { pose: left }),
          kf("چرخش تنه به راست", "Twisting the torso right", 0.9, { pose: right }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "dynamic-chest") {
      const close: JointPose = { shoulderL: [-88, 0, 8], shoulderR: [-88, 0, -8], elbowL: -80, elbowR: -80 };
      const open: JointPose = { shoulderL: [-84, 0, 78], shoulderR: [-84, 0, -78], elbowL: -12, elbowR: -12 };
      return {
        cycle: [
          kf("باز کردن سینه", "Opening the chest", 0.9, { pose: open }),
          kf("بستن دست‌ها", "Closing the arms", 0.9, { pose: close }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "band-loop",
        sceneProps: [],
      };
    }
    if (variant === "band-pull-apart" || variant === "dislocate") {
      const close: JointPose = variant === "band-pull-apart" ? { shoulderL: [-86, 0, 10], shoulderR: [-86, 0, -10], elbowL: -4, elbowR: -4 } : { shoulderL: [-160, 0, 10], shoulderR: [-160, 0, -10], elbowL: -4, elbowR: -4 };
      const open: JointPose = variant === "band-pull-apart" ? { shoulderL: [-84, 0, 68], shoulderR: [-84, 0, -68], elbowL: -4, elbowR: -4 } : { shoulderL: [-170, 0, 20], shoulderR: [-170, 0, -20], elbowL: -4, elbowR: -4 };
      return {
        cycle: [
          kf("کش در جلو", "Band in front", 0.9, { pose: close, impl: { y: 0.02, z: 0.42 } }),
          kf("باز کردن کش", "Pulling apart", 1.0, { pose: open, impl: { y: 0.12, z: -0.1 } }),
          kf("مکث", "Pause", 0.4, { pose: open, impl: { y: 0.12, z: -0.1 } }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.0, { pose: close, impl: { y: 0.02, z: 0.42 } }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "band-loop",
        sceneProps: [],
        honestyNote: "کش به‌صورت میله نازک بین دو دست نمایش داده می‌شود.",
        honestyNoteEn: "The band is displayed as a thin bar between the hands.",
      };
    }
    if (variant === "inchworm" || variant === "walkout") {
      const stand: JointPose = {};
      const bent: JointPose = { spine: [70, 0, 0], neck: [-36, 0, 0], shoulderL: [-30, 0, 14], shoulderR: [-30, 0, -14], elbowL: -6, elbowR: -6, kneeL: 8, kneeR: 8 };
      const plank = plankTopPose(5);
      return {
        cycle: [
          kf("ایستاده", "Standing", 0.7, { pose: stand }),
          kf("خم به جلو و دست روی زمین", "Hinging and reaching the floor", 1.1, { pose: bent }),
          kf("قدم به جلو تا پلانک", "Walking out to plank", 1.2, { root: { y: -0.56, rx: 68 }, pose: plank }),
          kf("قدم به عقب", "Walking back", 1.2, { pose: bent }),
          kf("ایستادن", "Standing up", 0.9, { pose: stand }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "SMR") {
      // فوم رولر — غلتیدن آهسته روی زمین
      const a: RootPose = { y: -0.5, rx: 44 };
      const b: RootPose = { y: -0.58, rx: 58 };
      return {
        cycle: [
          kf("غلت دادن — فاز اول", "Rolling — phase one", 1.4, { root: a, pose: { shoulderL: [-20, 0, 16], shoulderR: [-20, 0, -16], elbowL: -16, elbowR: -16, hipL: [-8, 0, 4], hipR: [-8, 0, -4], kneeL: 12, kneeR: 12 } }),
          kf("غلت دادن — فاز دوم", "Rolling — phase two", 1.4, { root: b, pose: { shoulderL: [-20, 0, 16], shoulderR: [-20, 0, -16], elbowL: -16, elbowR: -16, hipL: [-8, 0, 4], hipR: [-8, 0, -4], kneeL: 12, kneeR: 12 } }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "فوم رولر رندر نمی‌شود؛ حرکت غلتیدن ساده نمایش داده می‌شود.",
        honestyNoteEn: "The foam roller is not rendered; the rolling motion is shown in a simplified way.",
      };
    }
    if (variant === "elbow-circles") {
      const a: JointPose = { shoulderL: [-80, 0, 26], shoulderR: [-80, 0, -26], elbowL: -70, elbowR: -70 };
      const b: JointPose = { shoulderL: [-96, 0, 40], shoulderR: [-96, 0, -40], elbowL: -46, elbowR: -46 };
      return {
        cycle: [
          kf("چرخش آرنج — فاز اول", "Circling the elbows — phase one", 0.9, { pose: a }),
          kf("چرخش آرنج — فاز دوم", "Circling the elbows — phase two", 0.9, { pose: b }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    // worlds / arm-circles — چرخش کامل بازو
    const front: JointPose = { shoulderL: [-90, 0, 8], shoulderR: [-90, 0, -8], elbowL: -3, elbowR: -3 };
    const top: JointPose = { shoulderL: [-172, 0, 8], shoulderR: [-172, 0, -8], elbowL: -3, elbowR: -3 };
    const back: JointPose = { shoulderL: [8, 0, 12], shoulderR: [8, 0, -12], elbowL: -3, elbowR: -3 };
    return {
      cycle: [
        kf("چرخش بازو — جلو", "Arm circle — front", 0.8, { pose: front }),
        kf("چرخش بازو — بالا", "Arm circle — top", 0.8, { pose: top }),
        kf("چرخش بازو — عقب", "Arm circle — back", 0.8, { pose: back }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: [],
    };
  },
};

/* --------------------------------- هوازی --------------------------------- */

export const cardioProfile: MovementProfile = {
  id: "cardio",
  fa: "حرکات هوازی",
  en: "Cardio",
  group: "cardio",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["jumping-jacks", "high-knees", "march", "shadow-box", "pedal", "rope", "burpee", "step-touch", "bear-crawl"], default: "jumping-jacks" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["jumping-jacks", "high-knees", "march", "shadow-box", "pedal", "rope", "burpee", "step-touch", "bear-crawl"], default: "jumping-jacks" }, "jumping-jacks");
    if (variant === "jumping-jacks") {
      const closed: JointPose = { shoulderL: [0, 0, 10], shoulderR: [0, 0, -10], elbowL: -3, elbowR: -3 };
      const open: JointPose = { shoulderL: [-4, 0, 158], shoulderR: [-4, 0, -158], elbowL: -3, elbowR: -3, hipL: [0, 0, 26], hipR: [0, 0, -26] };
      return {
        cycle: [
          kf("پاها جمع — دست پایین", "Feet together — arms down", 0.45, { pose: closed }),
          kf("پرش باز", "Jumping open", 0.55, { pose: open }),
          kf("پاها باز — دست بالا", "Feet apart — arms up", 0.45, { pose: open }),
          kf("پرش جمع", "Jumping closed", 0.55, { pose: closed }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "high-knees") {
      const base: JointPose = {};
      const k1: JointPose = { hipR: [-78, 0, -3], kneeR: 86, elbowL: -78, shoulderL: [-30, 0, 8] };
      const k2: JointPose = { hipL: [-78, 0, 3], kneeL: 86, elbowR: -78, shoulderR: [-30, 0, -8] };
      return {
        cycle: [
          kf("زانوی راست بالا", "Right knee up", 0.4, { pose: k1, ...(base as object) }),
          kf("تعویض", "Switching", 0.15),
          kf("زانوی چپ بالا", "Left knee up", 0.4, { pose: k2 }),
          kf("تعویض", "Switching", 0.15),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "march") {
      const k1: JointPose = { hipR: [-52, 0, -3], kneeR: 58, shoulderL: [-38, 0, 10], elbowL: -66, shoulderR: [22, 0, -10], elbowR: -14 };
      const k2: JointPose = { hipL: [-52, 0, 3], kneeL: 58, shoulderR: [-38, 0, -10], elbowR: -66, shoulderL: [22, 0, 10], elbowL: -14 };
      return {
        cycle: [
          kf("قدم — پای راست", "Marching — right leg", 0.55, { pose: k1 }),
          kf("تعویض", "Switching", 0.15),
          kf("قدم — پای چپ", "Marching — left leg", 0.55, { pose: k2 }),
          kf("تعویض", "Switching", 0.15),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "دویدن/قدم‌زدن ثابت به‌صورت ساده نمایش داده می‌شود.",
        honestyNoteEn: "Running/marching in place is shown in a simplified way.",
      };
    }
    if (variant === "shadow-box") {
      const guard: JointPose = { shoulderL: [-64, 0, 22], shoulderR: [-64, 0, -22], elbowL: -118, elbowR: -118 };
      const jab: JointPose = { shoulderL: [-86, 0, 12], elbowL: -8, shoulderR: [-64, 0, -22], elbowR: -118 };
      const cross: JointPose = { shoulderR: [-86, 0, -12], elbowR: -8, shoulderL: [-64, 0, 22], elbowL: -118, spine: [0, 22, 0] };
      return {
        cycle: [
          kf("حالت دفاعی", "Guard position", 0.6, { pose: guard }),
          kf("مشت چپ", "Left punch", 0.5, { pose: jab }),
          kf("برگشت", "Retracting", 0.4, { pose: guard }),
          kf("مشت راست", "Right punch", 0.5, { pose: cross }),
          kf("برگشت", "Retracting", 0.4, { pose: guard }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "کیسه بوکس رندر نمی‌شود؛ حرکت مشت ساده نمایش داده می‌شود.",
        honestyNoteEn: "The heavy bag is not rendered; punching is shown in a simplified way.",
      };
    }
    if (variant === "pedal") {
      // دوچرخه ثابت — نشسته، پدال زدن
      const seated: RootPose = { y: -0.44 };
      const p1: JointPose = { hipL: [-72, 0, 6], hipR: [-52, 0, -6], kneeL: 88, kneeR: 62, shoulderL: [-32, 0, 16], shoulderR: [-32, 0, -16], elbowL: -30, elbowR: -30 };
      const p2: JointPose = { hipL: [-52, 0, 6], hipR: [-72, 0, -6], kneeL: 62, kneeR: 88, shoulderL: [-32, 0, 16], shoulderR: [-32, 0, -16], elbowL: -30, elbowR: -30 };
      return {
        cycle: [
          kf("پدال — فاز اول", "Pedaling — phase one", 0.55, { root: seated, pose: p1 }),
          kf("پدال — فاز دوم", "Pedaling — phase two", 0.55, { root: seated, pose: p2 }),
        ],
        counterMode: "reps",
        handProp: "handle-cable",
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دوچرخه رندر نمی‌شود؛ حرکت پدال زدن نشسته ساده نمایش داده می‌شود.",
        honestyNoteEn: "The bike is not rendered; seated pedaling is shown in a simplified way.",
      };
    }
    if (variant === "rope") {
      const base: JointPose = { elbowL: -88, elbowR: -88, shoulderL: [-14, 0, 12], shoulderR: [-14, 0, -12], kneeL: 8, kneeR: 8 };
      const a: JointPose = { ...base, wristL: -30, wristR: 10 };
      const b: JointPose = { ...base, wristL: 10, wristR: -30 };
      return {
        cycle: [
          kf("چرخش طناب — فاز اول", "Rope turn — phase one", 0.4, { pose: a }),
          kf("چرخش طناب — فاز دوم", "Rope turn — phase two", 0.4, { pose: b }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "طناب رندر نمی‌شود؛ چرخش مچ ساده نمایش داده می‌شود.",
        honestyNoteEn: "The rope is not rendered; wrist turning is shown in a simplified way.",
      };
    }
    if (variant === "bear-crawl") {
      const up: JointPose = { ...QUADRUPED_ROOT_pose(), hipL: [-70, 0, 0], hipR: [-70, 0, 0], kneeL: 84, kneeR: 84, neck: [-16, 0, 0] };
      const step1: JointPose = { ...up, hipL: [-54, 0, 0], kneeL: 60 };
      const step2: JointPose = { ...up, hipR: [-54, 0, 0], kneeR: 60 };
      return {
        cycle: [
          kf("چهار دست و پا", "Quadruped", 0.5, { root: { y: -0.5, rx: 68 }, pose: up }),
          kf("قدم دست و پا — فاز اول", "Crawling — phase one", 0.6, { root: { y: -0.5, rx: 68 }, pose: step1 }),
          kf("قدم دست و پا — فاز دوم", "Crawling — phase two", 0.6, { root: { y: -0.5, rx: 68 }, pose: step2 }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "burpee") {
      const stand: JointPose = {};
      const squatDown: JointPose = { spine: [30, 0, 0], shoulderL: [-40, 0, 14], shoulderR: [-40, 0, -14], elbowL: -8, elbowR: -8, hipL: [-74, 0, 8], hipR: [-74, 0, -8], kneeL: 96, kneeR: 96, ankleL: -20, ankleR: -20 };
      const plank = plankTopPose(5);
      return {
        cycle: [
          kf("ایستاده", "Standing", 0.6, { pose: stand }),
          kf("دست روی زمین", "Hands to the floor", 0.8, { root: { y: -0.4, rx: 30 }, pose: squatDown }),
          kf("پرش به پلانک", "Kicking out to plank", 0.7, { root: { y: -0.56, rx: 68 }, pose: plank }),
          kf("برگشت به اسکوات", "Back to the squat", 0.8, { root: { y: -0.4, rx: 30 }, pose: squatDown }),
          kf("ایستادن", "Standing up", 0.7, { pose: stand }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    // step-touch
    const right: JointPose = { hipR: [8, 0, -18], kneeR: 10, shoulderL: [-10, 0, 14], shoulderR: [-10, 0, -14] };
    const left: JointPose = { hipL: [8, 0, 18], kneeL: 10, shoulderL: [-10, 0, 14], shoulderR: [-10, 0, -14] };
    return {
      cycle: [
        kf("قدم به راست", "Stepping right", 0.55, { pose: right }),
        kf("جمع کردن", "Closing in", 0.45, {}),
        kf("قدم به چپ", "Stepping left", 0.55, { pose: left }),
        kf("جمع کردن", "Closing in", 0.45, {}),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: [],
    };
  },
};

function QUADRUPED_ROOT_pose(): JointPose {
  return { shoulderL: [-78, 0, 10], shoulderR: [-78, 0, -10], elbowL: -6, elbowR: -6 };
}

/* ------------------------------- پلایومتریک ------------------------------- */

export const plyoProfile: MovementProfile = {
  id: "plyo",
  fa: "حرکات پرشی و انفجاری",
  en: "Plyometric / explosive",
  group: "plyo",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["vertical-jump", "box-jump", "tuck-jump", "lunge-jump", "bound", "hop", "throw-chest", "throw-overhead", "slam", "sprint"], default: "vertical-jump" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["vertical-jump", "box-jump", "tuck-jump", "lunge-jump", "bound", "hop", "throw-chest", "throw-overhead", "slam", "sprint"], default: "vertical-jump" }, "vertical-jump");
    if (variant === "box-jump") {
      const crouch: JointPose = { spine: [26, 0, 0], shoulderL: [-50, 0, 18], shoulderR: [-50, 0, -18], elbowL: -12, elbowR: -12, hipL: [-76, 0, 8], hipR: [-76, 0, -8], kneeL: 94, kneeR: 94, ankleL: -22, ankleR: -22 };
      const land: JointPose = { spine: [16, 0, 0], shoulderL: [-30, 0, 14], shoulderR: [-30, 0, -14], elbowL: -8, elbowR: -8, hipL: [-80, 0, 8], hipR: [-80, 0, -8], kneeL: 90, kneeR: 90, ankleL: -16, ankleR: -16 };
      return {
        cycle: [
          kf("نشستن برای پرش", "Loading the jump", 0.9, { root: { y: -0.34 }, pose: crouch }),
          kf("پرش روی جعبه", "Jumping onto the box", 0.6, { root: { y: 0.1 }, pose: { ...land, hipL: [-84, 0, 8], hipR: [-84, 0, -8] } }),
          kf("فرود روی جعبه", "Landing on the box", 0.8, { root: { y: 0.24 }, pose: land }),
          kf("پایین آمدن", "Stepping down", 1.1, { root: { y: 0 }, pose: {} }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: ["box"],
      };
    }
    if (variant === "tuck-jump" || variant === "hop") {
      const crouch: JointPose = { spine: [22, 0, 0], shoulderL: [-40, 0, 14], shoulderR: [-40, 0, -14], hipL: [-70, 0, 8], hipR: [-70, 0, -8], kneeL: 88, kneeR: 88, ankleL: -20, ankleR: -20 };
      const air: JointPose = { spine: [12, 0, 0], shoulderL: [-70, 0, 10], shoulderR: [-70, 0, -10], hipL: [-84, 0, 6], hipR: [-84, 0, -6], kneeL: 96, kneeR: 96 };
      return {
        cycle: [
          kf("نشستن", "Loading", 0.7, { root: { y: -0.3 }, pose: crouch }),
          kf("پرش", "Jumping", 0.5, { root: { y: 0.16 }, pose: air }),
          kf("فرود", "Landing", 0.8, { root: { y: -0.12 }, pose: crouch }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "lunge-jump" || variant === "bound") {
      const l1: JointPose = { spine: [8, 0, 0], hipR: [-66, 0, 0], kneeR: 66, ankleR: -6, hipL: [26, 0, 0], kneeL: 92, ankleL: 42, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -70, elbowR: -70 };
      const l2: JointPose = { spine: [8, 0, 0], hipL: [-66, 0, 0], kneeL: 66, ankleL: -6, hipR: [26, 0, 0], kneeR: 92, ankleR: 42, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -70, elbowR: -70 };
      return {
        cycle: [
          kf("پرش با تعویض پا", "Jumping and switching legs", 0.6, { root: { y: 0.1 }, pose: { hipL: [-20, 0, 0], hipR: [-20, 0, 0], kneeL: 30, kneeR: 30 } }),
          kf("فرود — پای راست جلو", "Landing — right leg forward", 0.7, { root: { y: -0.28 }, pose: l1 }),
          kf("پرش با تعویض پا", "Jumping and switching legs", 0.6, { root: { y: 0.1 }, pose: { hipL: [-20, 0, 0], hipR: [-20, 0, 0], kneeL: 30, kneeR: 30 } }),
          kf("فرود — پای چپ جلو", "Landing — left leg forward", 0.7, { root: { y: -0.28 }, pose: l2 }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "throw-chest" || variant === "throw-overhead" || variant === "slam") {
      const isSlam = variant === "slam";
      const load: JointPose = isSlam
        ? { shoulderL: [-158, 0, 14], shoulderR: [-158, 0, -14], elbowL: -30, elbowR: -30, spine: [-10, 0, 0] }
        : variant === "throw-overhead"
          ? { shoulderL: [-162, 0, 14], shoulderR: [-162, 0, -14], elbowL: -20, elbowR: -20, spine: [-8, 0, 0] }
          : { shoulderL: [-62, 0, 26], shoulderR: [-62, 0, -26], elbowL: -92, elbowR: -92 };
      const release: JointPose = isSlam
        ? { shoulderL: [-30, 0, 22], shoulderR: [-30, 0, -22], elbowL: -6, elbowR: -6, spine: [34, 0, 0], hipL: [-30, 0, 6], hipR: [-30, 0, -6], kneeL: 42, kneeR: 42 }
        : variant === "throw-overhead"
          ? { shoulderL: [-176, 0, 12], shoulderR: [-176, 0, -12], elbowL: -4, elbowR: -4, spine: [-16, 0, 0] }
          : { shoulderL: [-84, 0, 30], shoulderR: [-84, 0, -30], elbowL: -8, elbowR: -8, spine: [-8, 0, 0] };
      return {
        cycle: [
          kf("آماده شدن با توپ", "Loading with the ball", 0.8, { pose: load, impl: { y: isSlam ? 0.5 : 0.3, z: 0.16 } }),
          kf("پرتاب/کوبیدن", isSlam ? "Slamming down" : "Releasing the throw", 0.6, { pose: release, impl: { hidden: true } }),
          kf("بازیابی توپ", "Resetting the ball", 0.8, { pose: load, impl: { y: isSlam ? 0.5 : 0.3, z: 0.16 } }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "medball-hands",
        sceneProps: [],
        honestyNote: "مسیر پرواز توپ رندر نمی‌شود؛ لحظه پرتاب با مخفی‌شدن توپ نمایش داده می‌شود.",
        honestyNoteEn: "The ball's flight path is not rendered; the release is shown by hiding the ball.",
      };
    }
    if (variant === "sprint") {
      const s1: JointPose = { hipR: [-64, 0, -3], kneeR: 76, hipL: [22, 0, 3], kneeL: 70, ankleL: 36, shoulderL: [-42, 0, 10], elbowL: -76, shoulderR: [26, 0, -10], elbowR: -20, spine: [14, 0, 0] };
      const s2: JointPose = { hipL: [-64, 0, 3], kneeL: 76, hipR: [22, 0, -3], kneeR: 70, ankleR: 36, shoulderR: [-42, 0, -10], elbowR: -76, shoulderL: [26, 0, 10], elbowL: -20, spine: [14, 0, 0] };
      return {
        cycle: [
          kf("گام دویدن — فاز اول", "Sprint stride — phase one", 0.4, { pose: s1 }),
          kf("تعویض", "Switching", 0.12),
          kf("گام دویدن — فاز دوم", "Sprint stride — phase two", 0.4, { pose: s2 }),
          kf("تعویض", "Switching", 0.12),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "دویدن ثابت ساده نمایش داده می‌شود.",
        honestyNoteEn: "Running in place is shown in a simplified way.",
      };
    }
    // vertical-jump
    const crouch: JointPose = { spine: [24, 0, 0], shoulderL: [-36, 0, 14], shoulderR: [-36, 0, -14], elbowL: -10, elbowR: -10, hipL: [-72, 0, 8], hipR: [-72, 0, -8], kneeL: 90, kneeR: 90, ankleL: -20, ankleR: -20 };
    return {
      cycle: [
        kf("نشستن برای پرش", "Loading the jump", 0.8, { root: { y: -0.32 }, pose: crouch }),
        kf("پرش عمودی", "Vertical jump", 0.55, { root: { y: 0.2 }, pose: {} }),
        kf("فرود", "Landing", 0.8, { root: { y: -0.14 }, pose: crouch }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: [],
    };
  },
};

/* --------------------- المپیک و استرونگمن (ساده‌شده) --------------------- */

export const olympicProfile: MovementProfile = {
  id: "olympic",
  fa: "حرکات المپیک (ساده‌شده)",
  en: "Olympic lifts (simplified)",
  group: "olympic",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["clean", "snatch", "jerk", "high-pull", "swing"], default: "clean" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["clean", "snatch", "jerk", "high-pull", "swing"], default: "clean" }, "clean");
    const top = variant === "snatch"
      ? { shoulderL: [-168, 0, 14], shoulderR: [-168, 0, -14], elbowL: -4, elbowR: -4 }
      : variant === "jerk"
        ? { shoulderL: [-6, 0, 150], shoulderR: [-6, 0, -150], elbowL: -16, elbowR: -16 }
        : { shoulderL: [-40, 0, 34], shoulderR: [-40, 0, -34], elbowL: -86, elbowR: -86 };
    const pull: JointPose = { spine: [48, 0, 0], neck: [-30, 0, 0], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], elbowL: -6, elbowR: -6, hipL: [-42, 0, 6], hipR: [-42, 0, -6], kneeL: 22, kneeR: 22, ankleL: -6, ankleR: -6 };
    const dip: JointPose = { spine: [10, 0, 0], shoulderL: [-26, 0, 40], shoulderR: [-26, 0, -40], elbowL: -70, elbowR: -70, hipL: [-30, 0, 8], hipR: [-30, 0, -8], kneeL: 44, kneeR: 44 };
    if (variant === "jerk") {
      return {
        cycle: [
          kf("نگه‌داشتن روی شانه", "Holding on the shoulders", 0.8, { pose: { shoulderL: [-30, 0, 44], shoulderR: [-30, 0, -44], elbowL: -80, elbowR: -80 }, impl: { y: 0.34, z: 0.1 } }),
          kf("دِیپ کوتاه", "Short dip", 0.5, { root: { y: -0.12 }, pose: dip, impl: { y: 0.3, z: 0.1 } }),
          kf("درایو به بالا", "Driving overhead", 0.7, { root: { y: 0.06 }, pose: { shoulderL: [-6, 0, 150], shoulderR: [-6, 0, -150], elbowL: -16, elbowR: -16 }, impl: { y: 0.62, z: -0.04 } }),
          kf("مکث در بالا", "Pause overhead", 0.5, { pose: { shoulderL: [-6, 0, 150], shoulderR: [-6, 0, -150], elbowL: -16, elbowR: -16 }, impl: { y: 0.62, z: -0.04 } }),
          kf("پایین آوردن به شانه", "Bringing back to the shoulders", 0.9, { pose: { shoulderL: [-30, 0, 44], shoulderR: [-30, 0, -44], elbowL: -80, elbowR: -80 }, impl: { y: 0.34, z: 0.1 } }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "barbell",
        sceneProps: [],
        honestyNote: "اجرای حرکات المپیک ساده‌شده است و تکنیک دقیق زیرچرخش/کچ نمایش داده نمی‌شود.",
        honestyNoteEn: "Olympic lifts are simplified; the precise jerk/ snatch technique is not simulated.",
      };
    }
    if (variant === "swing") {
      const bottom: JointPose = { spine: [54, 0, 0], neck: [-34, 0, 0], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], elbowL: -6, elbowR: -6, hipL: [-40, 0, 6], hipR: [-40, 0, -6], kneeL: 26, kneeR: 26 };
      const topSwing: JointPose = { shoulderL: [-148, 0, 12], shoulderR: [-148, 0, -12], elbowL: -4, elbowR: -4, hipL: [-4, 0, 4], hipR: [-4, 0, -4], kneeL: 4, kneeR: 4 };
      return {
        cycle: [
          kf("تاب به پایین", "Swinging down", 0.8, { pose: bottom, impl: { y: -0.44, z: 0.14 } }),
          kf("تاب به بالا", "Swinging up", 0.9, { pose: topSwing, impl: { y: 0.44, z: 0.06 } }),
          kf("مکث در بالا", "Pause at the top", 0.4, { pose: topSwing, impl: { y: 0.44, z: 0.06 } }),
          kf("تاب برگشتی", "Swinging back down", 0.9, { pose: bottom, impl: { y: -0.44, z: 0.14 } }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "kettlebell-hands",
        sceneProps: [],
      };
    }
    return {
      cycle: [
        kf("شروع از زمین", "Starting from the floor", 0.9, { pose: pull, impl: { y: -0.66, z: 0.18 } }),
        kf("کشش انفجاری", "Explosive pull", 0.7, { pose: { spine: [16, 0, 0], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], elbowL: -20, elbowR: -20, hipL: [-10, 0, 6], hipR: [-10, 0, -6], kneeL: 10, kneeR: 10 }, impl: { y: -0.1, z: 0.12 } }),
        kf("دریافت وزنه", "Catching the weight", 0.7, { root: { y: -0.16 }, pose: top, impl: { y: 0.3, z: 0.1 } }),
        kf("ایستادن با وزنه", "Standing with the weight", 0.8, { pose: top, impl: { y: 0.3, z: 0.1 } }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.0, { pose: pull, impl: { y: -0.66, z: 0.18 } }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "barbell",
      sceneProps: [],
      honestyNote: "اجرای حرکات المپیک ساده‌شده است و تکنیک دقیق زیرچرخش/کچ نمایش داده نمی‌شود.",
      honestyNoteEn: "Olympic lifts are simplified; the precise receiving technique is not simulated.",
    };
  },
};

export const strongmanProfile: MovementProfile = {
  id: "strongman",
  fa: "استرونگمن (ساده‌شده)",
  en: "Strongman (simplified)",
  group: "strongman",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["carry", "load-pick", "drag", "press-log", "sled-push"], default: "carry" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["carry", "load-pick", "drag", "press-log", "sled-push"], default: "carry" }, "carry");
    if (variant === "carry") {
      const k1: JointPose = { hipR: [-38, 0, -3], kneeR: 44, shoulderL: [0, 0, 10], shoulderR: [0, 0, -10], elbowL: -3, elbowR: -3 };
      const k2: JointPose = { hipL: [-38, 0, 3], kneeL: 44, shoulderL: [0, 0, 10], shoulderR: [0, 0, -10], elbowL: -3, elbowR: -3 };
      return {
        cycle: [
          kf("قدم با وزنه — پای راست", "Carrying — right step", 0.7, { pose: k1, impl: { y: -0.56, x: 0 }, ...( {} as object) }),
          kf("تعویض", "Switching", 0.15, { impl: { y: -0.56 } }),
          kf("قدم با وزنه — پای چپ", "Carrying — left step", 0.7, { pose: k2, impl: { y: -0.56 } }),
          kf("تعویض", "Switching", 0.15, { impl: { y: -0.56 } }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "dumbbells",
        implement: "none",
        sceneProps: [],
        honestyNote: "حمل اشیاء سنگین (یراق/سنگ) با دمبل ساده نمایش داده می‌شود.",
        honestyNoteEn: "Carrying implements are represented with simple dumbbells.",
      };
    }
    if (variant === "load-pick") {
      const top: JointPose = { shoulderL: [-96, 0, 20], shoulderR: [-96, 0, -20], elbowL: -70, elbowR: -70 };
      const bottom: JointPose = { spine: [62, 0, 0], neck: [-40, 0, 0], shoulderL: [-6, 0, 10], shoulderR: [-6, 0, -10], elbowL: -10, elbowR: -10, hipL: [-44, 0, 6], hipR: [-44, 0, -6], kneeL: 24, kneeR: 24 };
      return {
        cycle: [
          kf("برداشتن از زمین", "Picking up from the floor", 1.1, { pose: bottom, impl: { y: -0.6, z: 0.2 } }),
          kf("بالا آوردن روی شانه", "Lifting onto the shoulder", 1.0, { pose: top, impl: { y: 0.24, z: 0.2 } }),
          kf("مکث", "Pause", 0.5, { pose: top, impl: { y: 0.24, z: 0.2 } }),
          kf("پایین آوردن", "Lowering down", 1.1, { pose: bottom, impl: { y: -0.6, z: 0.2 } }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "medball-hands",
        sceneProps: ["box"],
        honestyNote: "سنگ/خُمب به‌صورت توپ ساده نمایش داده می‌شود.",
        honestyNoteEn: "The stone/keg is represented as a simple ball.",
      };
    }
    if (variant === "drag" || variant === "sled-push") {
      const lean: JointPose = { spine: [38, 0, 0], neck: [-24, 0, 0], shoulderL: [-84, 0, 16], shoulderR: [-84, 0, -16], elbowL: -20, elbowR: -20 };
      const s1: JointPose = { ...lean, hipR: [-44, 0, -3], kneeR: 50, hipL: [-6, 0, 3], kneeL: 8 };
      const s2: JointPose = { ...lean, hipL: [-44, 0, 3], kneeL: 50, hipR: [-6, 0, -3], kneeR: 8 };
      return {
        cycle: [
          kf("گام با کشش — فاز اول", "Drag step — phase one", 0.6, { pose: s1 }),
          kf("تعویض", "Switching", 0.12),
          kf("گام با کشش — فاز دوم", "Drag step — phase two", 0.6, { pose: s2 }),
          kf("تعویض", "Switching", 0.12),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "handle-cable",
        implement: "none",
        sceneProps: [],
        honestyNote: "سورتمه/زنجیر رندر نمی‌شود؛ الگوی گام کششی ساده نمایش داده می‌شود.",
        honestyNoteEn: "The sled/chain is not rendered; the dragging step pattern is simplified.",
      };
    }
    // press-log
    const up: JointPose = { shoulderL: [-158, 0, 18], shoulderR: [-158, 0, -18], elbowL: -30, elbowR: -30 };
    const rack: JointPose = { shoulderL: [-50, 0, 34], shoulderR: [-50, 0, -34], elbowL: -100, elbowR: -100 };
    return {
      cycle: [
        kf("وزنه روی سینه", "Weight at the chest", 0.8, { pose: rack, impl: { y: 0.18, z: 0.2 } }),
        kf("پرس به بالا", "Pressing overhead", 1.1, { pose: up, impl: { y: 0.56, z: 0.02 } }),
        kf("مکث در بالا", "Pause overhead", 0.5, { pose: up, impl: { y: 0.56, z: 0.02 } }),
        kf("پایین آوردن", "Lowering", 1.1, { pose: rack, impl: { y: 0.18, z: 0.2 } }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "medball-hands",
      sceneProps: [],
      honestyNote: "لَم/logs با توپ ساده نمایش داده می‌شود.",
      honestyNoteEn: "The log is represented as a simple ball.",
    };
  },
};

export const MOBILITY_CARDIO_PROFILES: MovementProfile[] = [
  staticStretchProfile,
  mobilityProfile,
  cardioProfile,
  plyoProfile,
  olympicProfile,
  strongmanProfile,
];
