/**
 * الگوهای حرکتی — مرکزی بدن و شکم (مرحله ۱۹).
 * کرانچ، سیت‌آپ، بالابردن پا، پلانک (ایزومتریک)، رول‌اوت، ددباگ، چرخش تنه.
 */

import type { MovementProfile, ProfileParams, BuiltCycle, JointPose, RootPose, ScenePropKind } from "./core";
import {
  kf,
  enumParam,
  LYING_SUPINE_ROOT,
  LYING_PRONE_ROOT,
  QUADRUPED_ROOT,
  FOREARM_PLANK_TOP,
  plankTopPose,
} from "./core";

/* --------------------------------- کرانچ --------------------------------- */

export const crunchProfile: MovementProfile = {
  id: "crunch",
  fa: "کرانچ و سیت‌آپ",
  en: "Crunch / sit-up",
  group: "core",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["crunch", "situp", "decline", "reverse", "cable", "twist", "bicycle", "toes-touch", "heel-touch", "frog"], default: "crunch" },
    { key: "ball", label: "توپ سوئیسی", kind: "enum", options: ["no", "yes"], default: "no" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["crunch", "situp", "decline", "reverse", "cable", "twist", "bicycle", "toes-touch", "heel-touch", "frog"], default: "crunch" }, "crunch");
    const ball = enumParam(p, "ball", { key: "ball", label: "", kind: "enum", options: ["no", "yes"], default: "no" }, "no");
    const legs: JointPose = { hipL: [-38, 0, 8], hipR: [-38, 0, -8], kneeL: 78, kneeR: 78, ankleL: 0, ankleR: 0 };
    const legsLong: JointPose = { hipL: [-6, 0, 4], hipR: [-6, 0, -4], kneeL: 4, kneeR: 4, ankleL: 0, ankleR: 0 };

    if (variant === "reverse") {
      const start: JointPose = { hipL: [-80, 0, 6], hipR: [-80, 0, -6], kneeL: 90, kneeR: 90, ankleL: 0, ankleR: 0, shoulderL: [-150, 0, 14], shoulderR: [-150, 0, -14], elbowL: -20, elbowR: -20 };
      const end: JointPose = { hipL: [-104, 0, 6], hipR: [-104, 0, -6], kneeL: 92, kneeR: 92, ankleL: 0, ankleR: 0, shoulderL: [-150, 0, 14], shoulderR: [-150, 0, -14], elbowL: -20, elbowR: -20 };
      return {
        cycle: [
          kf("زانو بالای لگن", "Knees over the hips", 0.9, { root: LYING_SUPINE_ROOT, pose: start }),
          kf("جمع کردن زانو به سینه", "Curling the knees to the chest", 1.2, { root: LYING_SUPINE_ROOT, pose: end }),
          kf("مکث در انقباض شکم", "Pause in ab contraction", 0.4, { root: LYING_SUPINE_ROOT, pose: end }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { root: LYING_SUPINE_ROOT, pose: start }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
        honestyNoteEn: "The lying body angle is approximate.",
      };
    }
    if (variant === "bicycle") {
      const start: JointPose = { hipL: [-84, 0, 6], hipR: [-84, 0, -6], kneeL: 92, kneeR: 92, ankleL: 0, ankleR: 0, shoulderL: [-120, 0, 10], shoulderR: [-120, 0, -10], elbowL: -100, elbowR: -100, spine: [22, 0, 0] };
      const phaseA: JointPose = { hipL: [-92, 0, 6], hipR: [-70, 0, -6], kneeL: 40, kneeR: 96, ankleL: 0, ankleR: 0, shoulderL: [-120, 0, 10], shoulderR: [-120, 0, -10], elbowL: -100, elbowR: -100, spine: [22, -16, 0] };
      const phaseB: JointPose = { hipL: [-70, 0, 6], hipR: [-92, 0, -6], kneeL: 96, kneeR: 40, ankleL: 0, ankleR: 0, shoulderL: [-120, 0, 10], shoulderR: [-120, 0, -10], elbowL: -100, elbowR: -100, spine: [22, 16, 0] };
      return {
        cycle: [
          kf("شروع پدال پا", "Starting the pedal", 0.8, { root: LYING_SUPINE_ROOT, pose: start }),
          kf("چرخش به چپ", "Twisting to the left", 1.0, { root: LYING_SUPINE_ROOT, pose: phaseA }),
          kf("مرکز", "Center", 0.4, { root: LYING_SUPINE_ROOT, pose: start }),
          kf("چرخش به راست", "Twisting to the right", 1.0, { root: LYING_SUPINE_ROOT, pose: phaseB }),
          kf("مرکز", "Center", 0.4, { root: LYING_SUPINE_ROOT, pose: start }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
        honestyNoteEn: "The lying body angle is approximate.",
      };
    }
    if (variant === "twist") {
      const start: JointPose = { hipL: [-70, 0, 10], hipR: [-70, 0, -10], kneeL: 84, kneeR: 84, ankleL: 0, ankleR: 0, shoulderL: [-78, 0, 30], shoulderR: [-78, 0, -30], elbowL: -88, elbowR: -88, spine: [30, 0, 0] };
      const left: JointPose = { ...start, spine: [30, -34, 0] };
      const right: JointPose = { ...start, spine: [30, 34, 0] };
      return {
        cycle: [
          kf("نشسته — دست‌ها جلو", "Seated — hands front", 0.8, { root: { y: -0.6, rx: 62 }, pose: start, impl: { y: 0.16, z: 0.34 } }),
          kf("چرخش به چپ", "Twisting to the left", 0.9, { root: { y: -0.6, rx: 62 }, pose: left, impl: { y: 0.16, z: 0.34 } }),
          kf("مرکز", "Center", 0.4, { root: { y: -0.6, rx: 62 }, pose: start, impl: { y: 0.16, z: 0.34 } }),
          kf("چرخش به راست", "Twisting to the right", 0.9, { root: { y: -0.6, rx: 62 }, pose: right, impl: { y: 0.16, z: 0.34 } }),
          kf("مرکز", "Center", 0.4, { root: { y: -0.6, rx: 62 }, pose: start, impl: { y: 0.16, z: 0.34 } }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "medball-hands",
        sceneProps: [],
        honestyNote: "زاویه بدن در حالت نشسته تقریبی است.",
        honestyNoteEn: "The seated body angle is approximate.",
      };
    }
    if (variant === "toes-touch" || variant === "heel-touch" || variant === "frog") {
      const start: JointPose = variant === "frog"
        ? { hipL: [-60, 0, 26], hipR: [-60, 0, -26], kneeL: 96, kneeR: 96, ankleL: 0, ankleR: 0, shoulderL: [-160, 0, 10], shoulderR: [-160, 0, -10], elbowL: -8, elbowR: -8 }
        : { hipL: [-88, 0, 6], hipR: [-88, 0, -6], kneeL: 6, kneeR: 6, ankleL: 0, ankleR: 0, shoulderL: [-160, 0, 10], shoulderR: [-160, 0, -10], elbowL: -8, elbowR: -8 };
      const crunch: JointPose = { ...start, spine: [26, 0, 0], neck: [-10, 0, 0] };
      return {
        cycle: [
          kf("خوابیده — دست‌ها بالا", "Lying — arms up", 0.8, { root: LYING_SUPINE_ROOT, pose: start }),
          kf("بالا آمدن تنه", "Raising the torso", 1.0, { root: LYING_SUPINE_ROOT, pose: crunch }),
          kf("مکث در انقباض", "Pause in contraction", 0.4, { root: LYING_SUPINE_ROOT, pose: crunch }),
          kf("پایین آمدن کنترل‌شده", "Controlled lowering", 1.0, { root: LYING_SUPINE_ROOT, pose: start }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
        honestyNoteEn: "The lying body angle is approximate.",
      };
    }
    // crunch / situp / decline / cable — فلکشن ستون فقرات
    const decline = variant === "decline";
    const root: RootPose = decline ? { y: -0.7, rx: 76 } : ball ? { y: -0.66, rx: 66 } : LYING_SUPINE_ROOT;
    const useLegs = variant === "situp" || variant === "cable" ? legsLong : legs;
    const startPose: JointPose = {
      shoulderL: [-150, 0, 14],
      shoulderR: [-150, 0, -14],
      elbowL: -20,
      elbowR: -20,
      ...useLegs,
      ...(decline ? { hipL: [-6, 0, 6], hipR: [-6, 0, -6], kneeL: 8, kneeR: 8, ankleL: 22, ankleR: 22 } : {}),
    };
    const endPose: JointPose = {
      shoulderL: [-128, 0, 14],
      shoulderR: [-128, 0, -14],
      elbowL: -24,
      elbowR: -24,
      spine: [34, 0, 0],
      neck: [-8, 0, 0],
      ...useLegs,
      ...(decline ? { hipL: [-6, 0, 6], hipR: [-6, 0, -6], kneeL: 8, kneeR: 8, ankleL: 22, ankleR: 22 } : {}),
    };
    const handProp = variant === "cable" ? "handle-cable" : "none";
    return {
      cycle: [
        kf("خوابیده — وضعیت شروع", "Lying — start", 0.9, { root, pose: startPose }),
        kf("بالا آمدن تنه", "Raising the torso", 1.2, { root, pose: endPose }),
        kf("انقباض شکم در بالا", "Ab squeeze at the top", 0.5, { root, pose: endPose }),
        kf("پایین آمدن کنترل‌شده", "Controlled lowering", 1.2, { root, pose: startPose }),
      ],
      counterMode: "reps",
      handProp,
      implement: "none",
      sceneProps: ball ? (["stability-ball"] as ScenePropKind[]) : decline ? (["bench-decline"] as ScenePropKind[]) : [],
      honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
      honestyNoteEn: "The lying body angle is approximate.",
    };
  },
};

/* ------------------------------- بالابردن پا ------------------------------- */

export const legRaiseProfile: MovementProfile = {
  id: "leg-raise",
  fa: "بالابردن پا",
  en: "Leg raise",
  group: "core",
  params: [
    { key: "position", label: "وضعیت بدن", kind: "enum", options: ["lying", "hanging", "incline", "captains", "lying-side"], default: "lying" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const position = enumParam(p, "position", { key: "position", label: "", kind: "enum", options: ["lying", "hanging", "incline", "captains", "lying-side"], default: "lying" }, "lying");
    if (position === "hanging") {
      const hang: JointPose = { shoulderL: [-175, 0, 8], shoulderR: [-175, 0, -8], elbowL: 0, elbowR: 0, hipL: [-6, 0, 3], hipR: [-6, 0, -3], kneeL: 10, kneeR: 10 };
      const raised: JointPose = { shoulderL: [-175, 0, 8], shoulderR: [-175, 0, -8], elbowL: 0, elbowR: 0, hipL: [-92, 0, 3], hipR: [-92, 0, -3], kneeL: 12, kneeR: 12 };
      return {
        cycle: [
          kf("آویزان — پا پایین", "Hanging — legs down", 0.9, { root: { y: -0.16 }, pose: hang }),
          kf("بالا بردن پاها", "Raising the legs", 1.3, { root: { y: -0.16 }, pose: raised }),
          kf("مکث در بالا", "Pause at the top", 0.4, { root: { y: -0.16 }, pose: raised }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.4, { root: { y: -0.16 }, pose: hang }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: ["pullup-bar"],
      };
    }
    if (position === "captains") {
      const seated: RootPose = { y: -0.36 };
      const down: JointPose = { hipL: [-12, 0, 6], hipR: [-12, 0, -6], kneeL: 14, kneeR: 14, shoulderL: [-22, 0, 20], shoulderR: [-22, 0, -20], elbowL: -70, elbowR: -70 };
      const up: JointPose = { hipL: [-84, 0, 6], hipR: [-84, 0, -6], kneeL: 78, kneeR: 78, shoulderL: [-22, 0, 20], shoulderR: [-22, 0, -20], elbowL: -70, elbowR: -70 };
      return {
        cycle: [
          kf("پاها پایین", "Legs down", 0.9, { root: seated, pose: down }),
          kf("بالا بردن زانوها", "Raising the knees", 1.2, { root: seated, pose: up }),
          kf("مکث", "Pause", 0.4, { root: seated, pose: up }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { root: seated, pose: down }),
        ],
        counterMode: "reps",
        handProp: "handle-cable",
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه صندلی کاپیتان به‌صورت ساده‌شده نمایش داده می‌شود.",
        honestyNoteEn: "The captain's chair station is shown in a simplified way.",
      };
    }
    if (position === "lying-side") {
      const start: JointPose = { hipL: [-4, 0, 2], kneeL: 4, hipR: [-4, 0, 0], kneeR: 4, neck: [-14, 0, 0], shoulderL: [-100, 0, 40], shoulderR: [-40, 0, -20], elbowL: -96, elbowR: -30 };
      const up: JointPose = { hipL: [-4, 0, 2], kneeL: 4, hipR: [-4, 0, -26], kneeR: 4, neck: [-14, 0, 0], shoulderL: [-100, 0, 40], shoulderR: [-40, 0, -20], elbowL: -96, elbowR: -30 };
      return {
        cycle: [
          kf("خوابیده به پهلو", "Lying on the side", 0.9, { root: LYING_SUPINE_ROOT, pose: start }),
          kf("بالا بردن پا", "Raising the leg", 1.1, { root: LYING_SUPINE_ROOT, pose: up }),
          kf("مکث", "Pause", 0.4, { root: LYING_SUPINE_ROOT, pose: up }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.1, { root: LYING_SUPINE_ROOT, pose: start }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "نمایش خوابیدن به پهلو تقریبی است.",
        honestyNoteEn: "The side-lying display is approximate.",
      };
    }
    // lying / incline
    const incline = position === "incline";
    const root: RootPose = incline ? { y: -0.66, rx: 70 } : LYING_SUPINE_ROOT;
    const legsDown: JointPose = { hipL: [-6, 0, 4], hipR: [-6, 0, -4], kneeL: 6, kneeR: 6, ankleL: 0, ankleR: 0, shoulderL: [-150, 0, 14], shoulderR: [-150, 0, -14], elbowL: -20, elbowR: -20 };
    const legsUp: JointPose = { hipL: [-88, 0, 4], hipR: [-88, 0, -4], kneeL: 8, kneeR: 8, ankleL: 0, ankleR: 0, shoulderL: [-150, 0, 14], shoulderR: [-150, 0, -14], elbowL: -20, elbowR: -20 };
    return {
      cycle: [
        kf("پاها پایین", "Legs down", 0.9, { root, pose: legsDown }),
        kf("بالا بردن پاها", "Raising the legs", 1.3, { root, pose: legsUp }),
        kf("مکث در بالا", "Pause at the top", 0.4, { root, pose: legsUp }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.4, { root, pose: legsDown }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: incline ? (["bench-incline"] as ScenePropKind[]) : [],
      honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
      honestyNoteEn: "The lying body angle is approximate.",
    };
  },
};

/* -------------------------------- پلانک‌ها -------------------------------- */

export const plankProfile: MovementProfile = {
  id: "plank",
  fa: "پلانک و نگه‌داشتن‌های مرکزی",
  en: "Plank & core holds",
  group: "core-stability",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["straight", "forearm", "side", "hollow", "superman", "v-sit", "wall-sit", "dead-hang"], default: "straight" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["straight", "forearm", "side", "hollow", "superman", "v-sit", "wall-sit", "dead-hang"], default: "straight" }, "straight");
    const hold = (nameFa: string, nameEn: string, root: RootPose | undefined, pose: JointPose, dur = 3.2): import("../types").Keyframe[] => [
      kf(`${nameFa} — آماده شدن`, `${nameEn} — getting into position`, 1.0, { root, pose }),
      kf(`نگه‌داشتن ${nameFa}`, `Holding ${nameEn.toLowerCase()}`, dur, { root, pose }),
    ];

    if (variant === "forearm") {
      return {
        cycle: hold("پلانک ساعد", "Forearm plank", { y: -0.56, rx: 68 }, FOREARM_PLANK_TOP, 3.4),
        counterMode: "hold",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "این حرکت ایزومتریک است؛ شمارنده تکرار افزایش نمی‌یابد و زمان نگه‌داشتن نمایش داده می‌شود.",
        honestyNoteEn: "This is an isometric hold; the rep counter stays still and hold time is displayed.",
      };
    }
    if (variant === "side") {
      const pose: JointPose = {
        neck: [-16, 0, 0],
        shoulderL: [-58, 0, 44],
        shoulderR: [-30, 0, -16],
        elbowL: -92,
        elbowR: -24,
        hipL: [4, 0, 2],
        hipR: [4, 0, -6],
        kneeL: 6,
        kneeR: 6,
        ankleL: 34,
        ankleR: 40,
      };
      return {
        cycle: hold("پلانک پهلو", "Side plank", { y: -0.5, rx: 68 }, pose, 3.4),
        counterMode: "hold",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "نمایش خوابیدن به پهلو و این حالت ایزومتریک تقریبی است؛ شمارنده تکرار افزایش نمی‌یابد.",
        honestyNoteEn: "The side-lying display is approximate and the hold is isometric; no reps are counted.",
      };
    }
    if (variant === "hollow") {
      const pose: JointPose = {
        shoulderL: [-168, 0, 8],
        shoulderR: [-168, 0, -8],
        elbowL: -4,
        elbowR: -4,
        hipL: [-22, 0, 3],
        hipR: [-22, 0, -3],
        kneeL: 8,
        kneeR: 8,
        ankleL: 0,
        ankleR: 0,
        spine: [14, 0, 0],
      };
      return {
        cycle: hold("هالو هولد", "Hollow hold", { y: -0.72, rx: 90 }, pose, 3.2),
        counterMode: "hold",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "این حرکت ایزومتریک است؛ شمارنده تکرار افزایش نمی‌یابد.",
        honestyNoteEn: "This is an isometric hold; no reps are counted.",
      };
    }
    if (variant === "superman") {
      const pose: JointPose = {
        neck: [10, 0, 0],
        shoulderL: [-164, 0, 10],
        shoulderR: [-164, 0, -10],
        elbowL: -4,
        elbowR: -4,
        hipL: [-10, 0, 3],
        hipR: [-10, 0, -3],
        kneeL: 6,
        kneeR: 6,
        ankleL: 0,
        ankleR: 0,
        spine: [-16, 0, 0],
      };
      return {
        cycle: hold("سوپرمن (پرون)", "Superman (prone)", { y: -0.74, rx: -90 }, pose, 3.0),
        counterMode: "hold",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "این حرکت ایزومتریک است؛ شمارنده تکرار افزایش نمی‌یابد.",
        honestyNoteEn: "This is an isometric hold; no reps are counted.",
      };
    }
    if (variant === "v-sit") {
      const pose: JointPose = {
        shoulderL: [-78, 0, 8],
        shoulderR: [-78, 0, -8],
        elbowL: -4,
        elbowR: -4,
        hipL: [-78, 0, 3],
        hipR: [-78, 0, -3],
        kneeL: 4,
        kneeR: 4,
        ankleL: 0,
        ankleR: 0,
        spine: [12, 0, 0],
      };
      return {
        cycle: hold("نشست V", "V-sit hold", { y: -0.6, rx: 58 }, pose, 3.0),
        counterMode: "hold",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "این حرکت ایزومتریک است؛ شمارنده تکرار افزایش نمی‌یابد.",
        honestyNoteEn: "This is an isometric hold; no reps are counted.",
      };
    }
    if (variant === "wall-sit") {
      const pose: JointPose = {
        shoulderL: [-64, 0, 12],
        shoulderR: [-64, 0, -12],
        elbowL: -74,
        elbowR: -74,
        hipL: [-82, 0, 8],
        hipR: [-82, 0, -8],
        kneeL: 92,
        kneeR: 92,
        ankleL: -12,
        ankleR: -12,
      };
      return {
        cycle: hold("نشست به دیوار", "Wall sit", { y: -0.4 }, pose, 3.4),
        counterMode: "hold",
        handProp: "none",
        implement: "none",
        sceneProps: ["wall"],
        honestyNote: "دیوار به‌صورت صفحه ساده نمایش داده می‌شود؛ این حرکت ایزومتریک است و شمارنده تکرار افزایش نمی‌یابد.",
        honestyNoteEn: "The wall is a simple plane; this is an isometric hold and no reps are counted.",
      };
    }
    if (variant === "dead-hang") {
      const pose: JointPose = {
        shoulderL: [-175, 0, 8],
        shoulderR: [-175, 0, -8],
        elbowL: 0,
        elbowR: 0,
        hipL: [-4, 0, 3],
        hipR: [-4, 0, -3],
        kneeL: 8,
        kneeR: 8,
      };
      return {
        cycle: hold("آویزان از میله", "Dead hang", { y: -0.16 }, pose, 3.2),
        counterMode: "hold",
        handProp: "none",
        implement: "none",
        sceneProps: ["pullup-bar"],
        honestyNote: "این حرکت ایزومتریک است؛ شمارنده تکرار افزایش نمی‌یابد.",
        honestyNoteEn: "This is an isometric hold; no reps are counted.",
      };
    }
    // straight plank — عین وضعیت فعلی شنا (سازگاری با مدل)
    const pose = plankTopPose(5);
    return {
      cycle: hold("پلانک", "Plank", { y: -0.56, rx: 68 }, pose, 3.2),
      counterMode: "hold",
      handProp: "none",
      implement: "none",
      sceneProps: [],
      honestyNote: "زاویه بدن در حالت خوابیده تقریبی است؛ این حرکت ایزومتریک است و شمارنده تکرار افزایش نمی‌یابد.",
      honestyNoteEn: "The lying body angle is approximate; this is an isometric hold and no reps are counted.",
    };
  },
};

/* -------------------------------- رول‌اوت -------------------------------- */

export const rolloutProfile: MovementProfile = {
  id: "rollout",
  fa: "رول‌اوت (چرخ شکم)",
  en: "Ab rollout",
  group: "core-stability",
  params: [
    { key: "position", label: "وضعیت", kind: "enum", options: ["knees", "standing", "ball"], default: "knees" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const position = enumParam(p, "position", { key: "position", label: "", kind: "enum", options: ["knees", "standing", "ball"], default: "knees" }, "knees");
    const kneesRoot: RootPose = { y: -0.42, rx: 52 };
    const start: JointPose = { neck: [-14, 0, 0], shoulderL: [-72, 0, 10], shoulderR: [-72, 0, -10], elbowL: -14, elbowR: -14, hipL: [-58, 0, 3], hipR: [-58, 0, -3], kneeL: 88, kneeR: 88, ankleL: 40, ankleR: 40 };
    const extended: JointPose = { neck: [-10, 0, 0], shoulderL: [-128, 0, 10], shoulderR: [-128, 0, -10], elbowL: -8, elbowR: -8, hipL: [-16, 0, 3], hipR: [-16, 0, -3], kneeL: 88, kneeR: 88, ankleL: 40, ankleR: 40 };
    const sceneProps: ScenePropKind[] = position === "ball" ? ["stability-ball"] : [];
    return {
      cycle: [
        kf("زانو زده — چرخ نزدیک", "Kneeling — wheel close", 0.9, { root: kneesRoot, pose: start, impl: { y: -0.14, z: 0.42 } }),
        kf("غلت دادن به جلو", "Rolling forward", 1.4, { root: { y: -0.36, rx: 30 }, pose: extended, impl: { y: -0.5, z: 0.86 } }),
        kf("مکث در دامنه", "Pause at the end range", 0.5, { root: { y: -0.36, rx: 30 }, pose: extended, impl: { y: -0.5, z: 0.86 } }),
        kf("غلت دادن به عقب", "Rolling back", 1.4, { root: kneesRoot, pose: start, impl: { y: -0.14, z: 0.42 } }),
      ],
      counterMode: "reps",
      handProp: position === "ball" ? "none" : "ab-wheel",
      implement: "none",
      sceneProps,
      honestyNote: "حرکت چرخ و مسیر غلتش تقریبی است.",
      honestyNoteEn: "The wheel motion and its path are approximate.",
    };
  },
};

/* --------------------------- ددباگ / بردداگ --------------------------- */

export const deadBugProfile: MovementProfile = {
  id: "dead-bug",
  fa: "ددباگ و بردداگ",
  en: "Dead bug / bird dog",
  group: "core-stability",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["dead-bug", "bird-dog"], default: "dead-bug" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["dead-bug", "bird-dog"], default: "dead-bug" }, "dead-bug");
    if (variant === "bird-dog") {
      const base: JointPose = { neck: [-16, 0, 0], shoulderL: [-78, 0, 10], shoulderR: [-78, 0, -10], elbowL: -6, elbowR: -6, hipL: [-70, 0, 0], hipR: [-70, 0, 0], kneeL: 84, kneeR: 84 };
      const extendL: JointPose = { neck: [-16, 0, 0], shoulderL: [-150, 0, 10], elbowL: -4, shoulderR: [-78, 0, -10], elbowR: -6, hipR: [-26, 0, 0], kneeR: 8, hipL: [-70, 0, 0], kneeL: 84 };
      const extendR: JointPose = { neck: [-16, 0, 0], shoulderR: [-150, 0, -10], elbowR: -4, shoulderL: [-78, 0, 10], elbowL: -6, hipL: [-26, 0, 0], kneeL: 8, hipR: [-70, 0, 0], kneeR: 84 };
      return {
        cycle: [
          kf("چهار دست و پا — مرکز", "Quadruped — center", 0.8, { root: QUADRUPED_ROOT, pose: base }),
          kf("کشیدن دست چپ و پای راست", "Extending left arm and right leg", 1.1, { root: QUADRUPED_ROOT, pose: extendL }),
          kf("مکث", "Pause", 0.5, { root: QUADRUPED_ROOT, pose: extendL }),
          kf("مرکز", "Center", 0.6, { root: QUADRUPED_ROOT, pose: base }),
          kf("کشیدن دست راست و پای چپ", "Extending right arm and left leg", 1.1, { root: QUADRUPED_ROOT, pose: extendR }),
          kf("مکث", "Pause", 0.5, { root: QUADRUPED_ROOT, pose: extendR }),
          kf("مرکز", "Center", 0.6, { root: QUADRUPED_ROOT, pose: base }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    const armsUp: JointPose = { shoulderL: [-160, 0, 6], shoulderR: [-160, 0, -6], elbowL: -4, elbowR: -4, hipL: [-84, 0, 3], hipR: [-84, 0, -3], kneeL: 90, kneeR: 90 };
    const extendL: JointPose = { shoulderL: [-158, 0, 6], elbowL: -4, shoulderR: [-160, 0, -6], elbowR: -4, hipR: [-18, 0, -3], kneeR: 8, hipL: [-84, 0, 3], kneeL: 90 };
    const extendR: JointPose = { shoulderR: [-158, 0, -6], elbowR: -4, shoulderL: [-160, 0, 6], elbowL: -4, hipL: [-18, 0, 3], kneeL: 8, hipR: [-84, 0, -3], kneeR: 90 };
    return {
      cycle: [
        kf("خوابیده — دست و پا بالا", "Lying — arms and legs up", 0.8, { root: LYING_SUPINE_ROOT, pose: armsUp }),
        kf("کشیدن دست چپ و پای راست", "Extending left arm and right leg", 1.1, { root: LYING_SUPINE_ROOT, pose: extendL }),
        kf("مرکز", "Center", 0.5, { root: LYING_SUPINE_ROOT, pose: armsUp }),
        kf("کشیدن دست راست و پای چپ", "Extending right arm and left leg", 1.1, { root: LYING_SUPINE_ROOT, pose: extendR }),
        kf("مرکز", "Center", 0.5, { root: LYING_SUPINE_ROOT, pose: armsUp }),
      ],
      repsPerCycle: 2,
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: [],
      honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
      honestyNoteEn: "The lying body angle is approximate.",
    };
  },
};

/* ------------------------------ خم جانبی تنه ------------------------------ */

export const sideBendProfile: MovementProfile = {
  id: "side-bend",
  fa: "خم جانبی تنه",
  en: "Side bend",
  group: "core",
  params: [
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbell", "barbell", "cable", "none"], default: "dumbbell" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbell", "barbell", "cable", "none"], default: "dumbbell" }, "dumbbell");
    const upright: JointPose = { spine: [0, 0, 0], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], elbowL: -2, elbowR: -2 };
    const bend: JointPose = { spine: [0, 0, -34], neck: [0, 0, 8], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], elbowL: -2, elbowR: -2 };
    return {
      cycle: [
        kf("ایستاده صاف", "Standing tall", 0.9, { pose: upright, impl: load !== "none" ? { y: -0.55, x: 0.24 } : undefined }),
        kf("خم شدن به سمت وزنه", "Bending toward the weight", 1.1, { pose: bend, impl: load !== "none" ? { y: -0.62, x: 0.3 } : undefined }),
        kf("مکث در کشش", "Pause in the stretch", 0.4, { pose: bend, impl: load !== "none" ? { y: -0.62, x: 0.3 } : undefined }),
        kf("عود به مرکز", "Returning to center", 1.1, { pose: upright, impl: load !== "none" ? { y: -0.55, x: 0.24 } : undefined }),
      ],
      counterMode: "reps",
      handProp: load === "dumbbell" ? "dumbbell-one" : load === "cable" ? "handle-cable" : "none",
      implement: load === "barbell" ? "barbell" : "none",
      sceneProps: [],
    };
  },
};

/* --------------------------- مارپیچ/دراگ و بقیه --------------------------- */

export const coreMiscProfile: MovementProfile = {
  id: "core-misc",
  fa: "حرکات مرکزی متفرقه",
  en: "Misc core",
  group: "core",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["mountain-climber", "flutter-kick", "scissor", "hip-raise-bar", "v-up", "windshield", "press-out"], default: "mountain-climber" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["mountain-climber", "flutter-kick", "scissor", "hip-raise-bar", "v-up", "windshield", "press-out"], default: "mountain-climber" }, "mountain-climber");
    if (variant === "press-out") {
      // پرس ضددوران (پالوف) — باز کردن دست‌ها از سینه به جلو با نگه‌داشتن مرکز
      const inPose: JointPose = { shoulderL: [-58, 0, 22], shoulderR: [-58, 0, -22], elbowL: -112, elbowR: -112 };
      const outPose: JointPose = { shoulderL: [-84, 0, 10], shoulderR: [-84, 0, -10], elbowL: -6, elbowR: -6 };
      return {
        cycle: [
          kf("دست‌ها نزدیک سینه", "Hands at the chest", 0.8, { pose: inPose }),
          kf("پرس به جلو", "Pressing out", 1.1, { pose: outPose }),
          kf("مکث ضددوران", "Anti-rotation pause", 0.7, { pose: outPose }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.1, { pose: inPose }),
        ],
        counterMode: "reps",
        handProp: "handle-cable",
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه کابل به‌صورت ساده‌شده نمایش داده می‌شود؛ کابل رندر نمی‌شود.",
        honestyNoteEn: "The cable station is shown in a simplified way; the cable is not rendered.",
      };
    }
    if (variant === "mountain-climber") {
      const top: JointPose = plankTopPose(5);
      const l1: JointPose = { ...top, hipL: [-96, 0, 4], kneeL: 96, hipR: [-4, 0, -4], kneeR: 6 };
      const l2: JointPose = { ...top, hipR: [-96, 0, -4], kneeR: 96, hipL: [-4, 0, 4], kneeL: 6 };
      return {
        cycle: [
          kf("پلانک", "Plank", 0.5, { root: { y: -0.56, rx: 68 }, pose: top }),
          kf("زانوی چپ جلو", "Left knee forward", 0.45, { root: { y: -0.56, rx: 68 }, pose: l1 }),
          kf("تعویض", "Switching", 0.2, { root: { y: -0.56, rx: 68 }, pose: top }),
          kf("زانوی راست جلو", "Right knee forward", 0.45, { root: { y: -0.56, rx: 68 }, pose: l2 }),
          kf("تعویض", "Switching", 0.2, { root: { y: -0.56, rx: 68 }, pose: top }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "v-up") {
      const start: JointPose = { shoulderL: [-168, 0, 8], shoulderR: [-168, 0, -8], elbowL: -4, elbowR: -4, hipL: [-8, 0, 3], hipR: [-8, 0, -3], kneeL: 6, kneeR: 6 };
      const end: JointPose = { shoulderL: [-104, 0, 8], shoulderR: [-104, 0, -8], elbowL: -6, elbowR: -6, hipL: [-86, 0, 3], hipR: [-86, 0, -3], kneeL: 8, kneeR: 8, spine: [18, 0, 0] };
      return {
        cycle: [
          kf("خوابیده — دست و پا باز", "Lying — arms and legs open", 0.8, { root: LYING_SUPINE_ROOT, pose: start }),
          kf("جمع کردن V", "Folding into the V", 1.1, { root: LYING_SUPINE_ROOT, pose: end }),
          kf("مکث", "Pause", 0.4, { root: LYING_SUPINE_ROOT, pose: end }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.1, { root: LYING_SUPINE_ROOT, pose: start }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
        honestyNoteEn: "The lying body angle is approximate.",
      };
    }
    if (variant === "hip-raise-bar") {
      const start: JointPose = { shoulderL: [-175, 0, 8], shoulderR: [-175, 0, -8], elbowL: 0, elbowR: 0, hipL: [-12, 0, 3], hipR: [-12, 0, -3], kneeL: 12, kneeR: 12 };
      const end: JointPose = { shoulderL: [-175, 0, 8], shoulderR: [-175, 0, -8], elbowL: 0, elbowR: 0, hipL: [-88, 0, 3], hipR: [-88, 0, -3], kneeL: 14, kneeR: 14 };
      return {
        cycle: [
          kf("آویزان — پا پایین", "Hanging — legs down", 0.8, { root: { y: -0.16 }, pose: start }),
          kf("بالا بردن لگن", "Raising the hips", 1.2, { root: { y: -0.16 }, pose: end }),
          kf("مکث", "Pause", 0.4, { root: { y: -0.16 }, pose: end }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.3, { root: { y: -0.16 }, pose: start }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: ["pullup-bar"],
      };
    }
    // flutter/scissor/windshield — پاها متناوب در حالت خوابیده
    const down: JointPose = { shoulderL: [-150, 0, 14], shoulderR: [-150, 0, -14], elbowL: -20, elbowR: -20, hipL: [-16, 0, 3], hipR: [-16, 0, -3], kneeL: 6, kneeR: 6 };
    const upA: JointPose = { ...down, hipL: [-46, 0, 3], hipR: [-10, 0, -3], kneeL: 8, kneeR: 6 };
    const upB: JointPose = { ...down, hipR: [-46, 0, -3], hipL: [-10, 0, 3], kneeR: 8, kneeL: 6 };
    return {
      cycle: [
        kf("خوابیده — پاها بالا", "Lying — legs up", 0.7, { root: LYING_SUPINE_ROOT, pose: down }),
        kf("تکان پا — فاز اول", "Leg beat — phase one", 0.55, { root: LYING_SUPINE_ROOT, pose: upA }),
        kf("تکان پا — فاز دوم", "Leg beat — phase two", 0.55, { root: LYING_SUPINE_ROOT, pose: upB }),
      ],
      repsPerCycle: 2,
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: [],
      honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
      honestyNoteEn: "The lying body angle is approximate.",
    };
  },
};

export const CORE_PROFILES: MovementProfile[] = [
  crunchProfile,
  legRaiseProfile,
  plankProfile,
  rolloutProfile,
  deadBugProfile,
  sideBendProfile,
  coreMiscProfile,
];
