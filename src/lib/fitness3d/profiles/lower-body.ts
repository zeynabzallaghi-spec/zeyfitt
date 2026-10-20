/**
 * الگوهای حرکتی — بخش پایین بدن (مرحله ۱۹).
 * اسکوات، هیپ‌هینج، لانج، پل باسن، پرس پا، خم/صاف‌کردن زانو، ساق، نزدیک‌کننده.
 * همه توابع خالص‌اند و فقط از پارامترها کلیدفریم می‌سازند.
 */

import type { MovementProfile, ProfileParams } from "./core";
import {
  BuiltCycle,
  kf,
  numParam,
  enumParam,
  squatBottom,
  LYING_SUPINE_ROOT,
  LYING_PRONE_ROOT,
  QUADRUPED_ROOT,
  armsForward,
  ARMS_DOWN,
} from "./core";

/* --------------------------------- اسکوات --------------------------------- */

const STANCE_SPEC = { key: "stance", label: "عرض پا", kind: "enum" as const, options: ["narrow", "standard", "wide"], default: "standard" };
const DEPTH_SPEC = { key: "depth", label: "عمق (خمش زانو)", kind: "number" as const, min: 50, max: 120, default: 100 };
const LOAD_SPEC = { key: "load", label: "وضعیت وزنه", kind: "enum" as const, options: ["none", "back", "front", "goblet", "hands", "overhead"], default: "none" };

function loadPose(load: string, depthRatio: number): { pose: import("../types").JointPose; implY?: number; implZ?: number } {
  switch (load) {
    case "back":
      return { pose: { shoulderL: [-30, 0, 55], shoulderR: [-30, 0, -55], elbowL: -95, elbowR: -95 } };
    case "front":
      return { pose: { shoulderL: [-78, 0, 24], shoulderR: [-78, 0, -24], elbowL: -95, elbowR: -95 } };
    case "goblet":
      return { pose: { shoulderL: [-70, 0, 14], shoulderR: [-70, 0, -14], elbowL: -92, elbowR: -92 }, implY: 0.28, implZ: 0.24 };
    case "hands":
      return { pose: ARMS_DOWN };
    case "overhead":
      return { pose: { shoulderL: [-172, 0, 8], shoulderR: [-172, 0, -8], elbowL: -4, elbowR: -4 } };
    default:
      // وزن بدن — دست‌ها رو به جلو برای تعادل
      return { pose: depthRatio > 0.5 ? armsForward(14) : { shoulderL: [-40, 0, 12], shoulderR: [-40, 0, -12], elbowL: -10, elbowR: -10 } };
  }
}

export const squatProfile: MovementProfile = {
  id: "squat",
  fa: "اسکوات",
  en: "Squat",
  group: "squat",
  params: [STANCE_SPEC, DEPTH_SPEC, LOAD_SPEC],
  build(p: ProfileParams): BuiltCycle {
    const stance = enumParam(p, STANCE_SPEC.key, STANCE_SPEC, "standard");
    const depth = numParam(p, DEPTH_SPEC.key, DEPTH_SPEC, 100);
    const load = enumParam(p, LOAD_SPEC.key, LOAD_SPEC, "none");
    const hipAbd = stance === "wide" ? 14 : stance === "narrow" ? 4 : 8;
    const torso = load === "front" || load === "overhead" ? 8 : 16;
    const bottom = squatBottom(depth, torso, hipAbd);
    const loadTop = loadPose(load, 0);
    const loadBottom = loadPose(load, 1);
    const implement = load === "back" || load === "front" ? "barbell" : load === "goblet" ? "kettlebell-hands" : "none";
    const implFollow: "shoulders" | "chest" | null =
      load === "back" ? "shoulders" : load === "front" ? "chest" : load === "goblet" ? "chest" : null;
    const implAt = (y: number, z: number) => ({ y, z });
    const bottomDrop = 0.36 - (bottom.root.y ?? 0);
    return {
      cycle: [
        kf("وضعیت ایستاده", "Standing", 0.9, {
          pose: loadTop.pose,
          impl: implFollow ? implAt(implFollow === "shoulders" ? 0.42 : 0.3, 0.16) : undefined,
        }),
        kf("پایین آمدن", "Lowering", 1.4, {
          root: bottom.root,
          pose: { ...loadBottom.pose, ...bottom.pose },
          impl: implFollow ? implAt(0.42 - bottomDrop, 0.16) : undefined,
        }),
        kf("توقف در پایین", "Pause at the bottom", 0.5, {
          root: bottom.root,
          pose: { ...loadBottom.pose, ...bottom.pose },
          impl: implFollow ? implAt(0.42 - bottomDrop, 0.16) : undefined,
        }),
        kf("بالا آمدن", "Rising up", 1.4, { root: { y: 0 }, pose: loadTop.pose, impl: implFollow ? implAt(0.42, 0.16) : undefined }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: implFollow ? (implement as BuiltCycle["implement"]) : "none",
      sceneProps: [],
    };
  },
};

/* -------------------------------- هیپ‌هینج -------------------------------- */

export const hingeProfile: MovementProfile = {
  id: "hinge",
  fa: "هیپ‌هینج (لگن‌محور)",
  en: "Hip hinge",
  group: "hinge",
  params: [
    { key: "kneeBend", label: "خمش زانو", kind: "number", min: 0, max: 40, default: 12 },
    { key: "torso", label: "زاویه تنه", kind: "number", min: 30, max: 90, default: 65 },
    { key: "load", label: "وضعیت وزنه", kind: "enum", options: ["none", "barbell", "dumbbells", "kettlebell", "band", "hands"], default: "none" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const kneeBend = numParam(p, "kneeBend", { key: "kneeBend", label: "", kind: "number", min: 0, max: 40, default: 12 }, 12);
    const torso = numParam(p, "torso", { key: "torso", label: "", kind: "number", min: 30, max: 90, default: 65 }, 65);
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["none", "barbell", "dumbbells", "kettlebell", "band", "hands"], default: "none" }, "none");
    const hips = { hipL: [-(torso * 0.75), 0, 6], hipR: [-(torso * 0.75), 0, -6], kneeL: kneeBend, kneeR: kneeBend, ankleL: -6, ankleR: -6 };
    const stand = { hipL: [0, 0, 0], hipR: [0, 0, 0], kneeL: 0, kneeR: 0, ankleL: 0, ankleR: 0 };
    const impl = load === "barbell" ? "barbell" : load === "kettlebell" ? "kettlebell-hands" : load === "band" ? "band-loop" : "none";
    const handProp = load === "dumbbells" ? "dumbbells" : "none";
    const note =
      load === "band"
        ? undefined
        : "اجرای هینج با زوایای تقریبی؛ مسیر وزنه نزدیک ساق پا آموزش داده می‌شود.";
    return {
      cycle: [
        kf("ایستاده", "Standing", 0.9, { pose: stand }),
        kf("هیپ‌هینج به عقب", "Hinging back", 1.5, {
          pose: { spine: [torso, 0, 0], neck: [-torso * 0.7, 0, 0], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], ...hips },
          impl: impl === "none" ? undefined : { y: -0.5, z: 0.12 },
        }),
        kf("توقف در پایین", "Pause at the bottom", 0.5, {
          pose: { spine: [torso, 0, 0], neck: [-torso * 0.7, 0, 0], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], ...hips },
          impl: impl === "none" ? undefined : { y: -0.5, z: 0.12 },
        }),
        kf("عود به ایستادن", "Return to standing", 1.4, {
          pose: stand,
          impl: impl === "none" ? undefined : { y: -0.02, z: 0.05 },
        }),
      ],
      counterMode: "reps",
      handProp,
      implement: impl as BuiltCycle["implement"],
      sceneProps: [],
      honestyNote: note,
    };
  },
};

/* ---------------------------------- لانج ---------------------------------- */

export const lungeProfile: MovementProfile = {
  id: "lunge",
  fa: "لانج و حرکات تک‌پا",
  en: "Lunge / single-leg",
  group: "lunge",
  params: [
    { key: "direction", label: "جهت قدم", kind: "enum", options: ["forward", "back", "side"], default: "forward" },
    { key: "load", label: "وضعیت وزنه", kind: "enum", options: ["none", "dumbbells", "barbell", "kettlebell"], default: "none" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const direction = enumParam(p, "direction", { key: "direction", label: "", kind: "enum", options: ["forward", "back", "side"], default: "forward" }, "forward");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["none", "dumbbells", "barbell", "kettlebell"], default: "none" }, "none");
    const handProp = load === "dumbbells" ? "dumbbells" : "none";
    const impl = load === "barbell" ? "barbell" : load === "kettlebell" ? "kettlebell-hands" : "none";
    const zStep = direction === "side" ? 0 : 0.05;
    const sideAbd = direction === "side" ? 34 : 0;
    const lungeHalf = (side: "R" | "L"): import("../types").Keyframe[] => {
      const front = side;
      const back = side === "R" ? "L" : "R";
      return [
        kf(`لانج با پای ${side === "R" ? "راست" : "چپ"}`, `Lunge with ${side === "R" ? "right" : "left"} leg`, 1.3, {
          root: { y: -0.3, z: zStep },
          pose: {
            spine: [6, 0, 0],
            shoulderL: [0, 0, 10],
            shoulderR: [0, 0, -10],
            elbowL: -10,
            elbowR: -10,
            [`hip${front}`]: [-70 - (direction === "back" ? 0 : 0), 0, direction === "side" ? 0 : 0],
            [`knee${front}`]: 70,
            [`ankle${front}`]: -6,
            [`hip${back}`]: [30, 0, direction === "side" ? -sideAbd : 0],
            [`knee${back}`]: 95,
            [`ankle${back}`]: 45,
          },
          impl: impl !== "none" ? { y: -0.28, z: 0.05 } : undefined,
        }),
        kf("توقف در پایین", "Pause at the bottom", 0.4, {
          root: { y: -0.3, z: zStep },
          pose: {
            spine: [6, 0, 0],
            shoulderL: [0, 0, 10],
            shoulderR: [0, 0, -10],
            elbowL: -10,
            elbowR: -10,
            [`hip${front}`]: [-70, 0, 0],
            [`knee${front}`]: 70,
            [`ankle${front}`]: -6,
            [`hip${back}`]: [30, 0, direction === "side" ? -sideAbd : 0],
            [`knee${back}`]: 95,
            [`ankle${back}`]: 45,
          },
          impl: impl !== "none" ? { y: -0.28, z: 0.05 } : undefined,
        }),
        kf("عود به ایستادن", "Return to standing", 1.0, { root: { y: 0, z: 0 }, impl: impl !== "none" ? { y: -0.02, z: 0.05 } : undefined }),
      ];
    };
    const cycle = [
      kf("ایستادن", "Standing", 0.9),
      ...lungeHalf("R"),
      ...lungeHalf("L"),
    ];
    return {
      cycle,
      repsPerCycle: 2,
      cameraTargetY: 0.9,
      counterMode: "reps",
      handProp,
      implement: impl as BuiltCycle["implement"],
      sceneProps: [],
      honestyNote:
        load === "barbell"
          ? "هالتر روی شانه‌ها به‌صورت ساده نمایش داده می‌شود."
          : undefined,
    };
  },
};

/* ----------------------------- اسکوات بلغاری ----------------------------- */

export const splitSquatProfile: MovementProfile = {
  id: "split-squat",
  fa: "اسکوات پا شکسته (ثابت)",
  en: "Split squat",
  group: "lunge",
  params: [
    { key: "side", label: "پای جلو", kind: "enum", options: ["right", "left", "alternate"], default: "right" },
    { key: "load", label: "وضعیت وزنه", kind: "enum", options: ["none", "dumbbells", "barbell"], default: "none" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const side = enumParam(p, "side", { key: "side", label: "", kind: "enum", options: ["right", "left", "alternate"], default: "right" }, "right");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["none", "dumbbells", "barbell"], default: "none" }, "none");
    const handProp = load === "dumbbells" ? "dumbbells" : "none";
    const impl = load === "barbell" ? "barbell" : "none";
    const half = (s: "R" | "L"): import("../types").Keyframe[] => [
      kf(`پایین آمدن (پای ${s === "R" ? "راست" : "چپ"} جلو)`, `Lowering (${s === "R" ? "right" : "left"} leg forward)`, 1.3, {
        root: { y: -0.3, z: 0.04 },
        pose: {
          spine: [6, 0, 0],
          shoulderL: [0, 0, 10],
          shoulderR: [0, 0, -10],
          elbowL: -10,
          elbowR: -10,
          [`hip${s}`]: [-70, 0, 0],
          [`knee${s}`]: 70,
          [`ankle${s}`]: -6,
          [`hip${s === "R" ? "L" : "R"}`]: [24, 0, 0],
          [`knee${s === "R" ? "L" : "R"}`]: 95,
          [`ankle${s === "R" ? "L" : "R"}`]: 45,
        },
        impl: impl !== "none" ? { y: 0.12, z: 0.02 } : undefined,
      }),
      kf("توقف در پایین", "Pause at the bottom", 0.4, {
        root: { y: -0.3, z: 0.04 },
        pose: {
          spine: [6, 0, 0],
          shoulderL: [0, 0, 10],
          shoulderR: [0, 0, -10],
          elbowL: -10,
          elbowR: -10,
          [`hip${s}`]: [-70, 0, 0],
          [`knee${s}`]: 70,
          [`ankle${s}`]: -6,
          [`hip${s === "R" ? "L" : "R"}`]: [24, 0, 0],
          [`knee${s === "R" ? "L" : "R"}`]: 95,
          [`ankle${s === "R" ? "L" : "R"}`]: 45,
        },
        impl: impl !== "none" ? { y: 0.12, z: 0.02 } : undefined,
      }),
      kf("بالا آمدن", "Rising up", 1.2, { root: { y: 0, z: 0 }, impl: impl !== "none" ? { y: 0.42, z: 0.02 } : undefined }),
    ];
    const cycle =
      side === "alternate"
        ? [kf("آماده شدن", "Ready stance", 0.8), ...half("R"), ...half("L")]
        : [kf("آماده شدن", "Ready stance", 0.8), ...half(side === "right" ? "R" : "L")];
    return {
      cycle,
      repsPerCycle: side === "alternate" ? 2 : 1,
      cameraTargetY: 0.9,
      counterMode: "reps",
      handProp,
      implement: impl as BuiltCycle["implement"],
      sceneProps: ["box"],
    };
  },
};

/* --------------------------------- استپ‌آپ --------------------------------- */

export const stepUpProfile: MovementProfile = {
  id: "step-up",
  fa: "استپ‌آپ روی جعبه",
  en: "Step-up",
  group: "lunge",
  params: [
    { key: "load", label: "وضعیت وزنه", kind: "enum", options: ["none", "dumbbells", "barbell"], default: "none" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["none", "dumbbells", "barbell"], default: "none" }, "none");
    const handProp = load === "dumbbells" ? "dumbbells" : "none";
    const impl = load === "barbell" ? "barbell" : "none";
    const up = { hipL: [-88, 0, 4], kneeL: 88, ankleL: -4, hipR: [6, 0, 0], kneeR: 8, ankleR: 20 };
    const onBox = { hipL: [-20, 0, 4], kneeL: 24, ankleL: -4, hipR: [12, 0, 0], kneeR: 16, ankleR: 20 };
    return {
      cycle: [
        kf("ایستادن کنار جعبه", "Standing by the box", 0.8, { pose: handProp === "dumbbells" ? {} : ARMS_DOWN }),
        kf("پا روی جعبه", "Foot on the box", 0.9, { pose: up }),
        kf("بالا رفتن", "Stepping up", 1.2, { root: { y: 0.24 }, pose: onBox }),
        kf("پایین آمدن کنترل‌شده", "Controlled step down", 1.3, { root: { y: 0 }, pose: up }),
        kf("عود به ایستادن", "Return to standing", 0.9),
      ],
      counterMode: "reps",
      handProp,
      implement: impl as BuiltCycle["implement"],
      sceneProps: ["box"],
      repsPerCycle: 2,
    };
  },
};

/* -------------------------------- پل باسن -------------------------------- */

export const hipThrustProfile: MovementProfile = {
  id: "hip-thrust",
  fa: "پل باسن / هیپ تراست",
  en: "Glute bridge / hip thrust",
  group: "hinge",
  params: [
    { key: "elevated", label: "بالاتنه بالا (نیمکت)", kind: "enum", options: ["floor", "bench"], default: "floor" },
    { key: "load", label: "وضعیت وزنه", kind: "enum", options: ["none", "barbell", "dumbbell"], default: "none" },
    { key: "singleLeg", label: "تک‌پا", kind: "enum", options: ["no", "yes"], default: "no" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const elevated = enumParam(p, "elevated", { key: "elevated", label: "", kind: "enum", options: ["floor", "bench"], default: "floor" }, "floor");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["none", "barbell", "dumbbell"], default: "none" }, "none");
    const singleLeg = enumParam(p, "singleLeg", { key: "singleLeg", label: "", kind: "enum", options: ["no", "yes"], default: "no" }, "no");
    const benchRoot: import("../types").RootPose = { y: -0.52, rx: 64 };
    const floorRoot: import("../types").RootPose = LYING_SUPINE_ROOT;
    const legs = singleLeg === "yes" ? { hipL: [-70, 0, 2], kneeL: 90, ankleL: 0, hipR: [0, 0, 6], kneeR: 4, ankleR: 0 } : { hipL: [-80, 0, 6], hipR: [-80, 0, -6], kneeL: 92, kneeR: 92, ankleL: 0, ankleR: 0 };
    const legsDown = singleLeg === "yes" ? { hipL: [-12, 0, 2], kneeL: 16, ankleL: 0, hipR: [0, 0, 6], kneeR: 4, ankleR: 0 } : { hipL: [-14, 0, 6], hipR: [-14, 0, -6], kneeL: 18, kneeR: 18, ankleL: 0, ankleR: 0 };
    const poseUp: import("../types").JointPose = {
      shoulderL: [-160, 0, 10],
      shoulderR: [-160, 0, -10],
      elbowL: -4,
      elbowR: -4,
      ...legs,
    };
    const poseDown: import("../types").JointPose = {
      shoulderL: [-150, 0, 10],
      shoulderR: [-150, 0, -10],
      elbowL: -4,
      elbowR: -4,
      ...legsDown,
    };
    return {
      cycle: [
        kf("درازکش — وضعیت شروع", "Supine — start", 0.9, { root: elevated === "bench" ? benchRoot : floorRoot, pose: poseDown }),
        kf("بالا بردن لگن", "Thrusting hips up", 1.2, {
          root: elevated === "bench" ? { y: -0.44, rx: 52 } : { y: -0.62, rx: 74 },
          pose: poseUp,
        }),
        kf("انقباض باسن در بالا", "Glute squeeze at the top", 0.6, {
          root: elevated === "bench" ? { y: -0.44, rx: 52 } : { y: -0.62, rx: 74 },
          pose: poseUp,
        }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { root: elevated === "bench" ? benchRoot : floorRoot, pose: poseDown }),
      ],
      counterMode: "reps",
      handProp: load === "dumbbell" ? "dumbbells" : "none",
      implement: load === "barbell" ? "barbell" : "none",
      sceneProps: elevated === "bench" ? ["bench-flat"] : [],
      honestyNote: "زاویه بدن در حالت خوابیده برای نمایش سه‌بعدی تقریبی است.",
    };
  },
};

/* ------------------------- خم و صاف‌کردن زانو ------------------------- */

export const legExtensionProfile: MovementProfile = {
  id: "leg-extension",
  fa: "صاف‌کردن زانو (دستگاه/نشسته)",
  en: "Knee extension (machine/seated)",
  group: "knee-extension",
  params: [],
  build(): BuiltCycle {
    const seated: import("../types").RootPose = { y: -0.42 };
    const down = { hipL: [-80, 0, 4], hipR: [-80, 0, -4], kneeL: 88, kneeR: 88, ankleL: 12, ankleR: 12, spine: [4, 0, 0] };
    const up = { hipL: [-80, 0, 4], hipR: [-80, 0, -4], kneeL: 4, kneeR: 4, ankleL: -8, ankleR: -8, spine: [4, 0, 0] };
    return {
      cycle: [
        kf("نشسته — زانو خم", "Seated — knees bent", 0.9, { root: seated, pose: { ...down, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 } }),
        kf("صاف‌کردن زانو", "Extending the knee", 1.2, { root: seated, pose: { ...up, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 } }),
        kf("مکث در بالا", "Pause at the top", 0.4, { root: seated, pose: { ...up, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 } }),
        kf("پایین آوردن کنترل‌شده", "Controlled return", 1.2, { root: seated, pose: { ...down, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 } }),
      ],
      counterMode: "reps",
      handProp: "handle-cable",
      implement: "none",
      sceneProps: ["machine-seat"],
      honestyNote: "دستگاه به‌صورت ساده‌شده نمایش داده می‌شود؛ مکانیزم بازوی دستگاه شبیه‌سازی نمی‌شود.",
      honestyNoteEn: "The machine is shown in a simplified way; the machine arm mechanism is not simulated.",
    };
  },
};

export const legCurlProfile: MovementProfile = {
  id: "leg-curl",
  fa: "خم‌کردن زانو (دستگاه/درازکش)",
  en: "Leg curl (machine/lying)",
  group: "knee-flexion",
  params: [
    { key: "position", label: "وضعیت بدن", kind: "enum", options: ["lying", "seated", "standing"], default: "lying" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const position = enumParam(p, "position", { key: "position", label: "", kind: "enum", options: ["lying", "seated", "standing"], default: "lying" }, "lying");
    if (position === "seated") {
      const seated: import("../types").RootPose = { y: -0.42 };
      const straight = { hipL: [-78, 0, 4], hipR: [-78, 0, -4], kneeL: 6, kneeR: 6, ankleL: 0, ankleR: 0 };
      const curled = { hipL: [-78, 0, 4], hipR: [-78, 0, -4], kneeL: 92, kneeR: 92, ankleL: 24, ankleR: 24 };
      return {
        cycle: [
          kf("نشسته — پا صاف", "Seated — legs straight", 0.9, { root: seated, pose: { ...straight, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 } }),
          kf("خم‌کردن زانو", "Curling the knee", 1.2, { root: seated, pose: { ...curled, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 } }),
          kf("مکث در انقباض", "Pause in contraction", 0.4, { root: seated, pose: { ...curled, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 } }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { root: seated, pose: { ...straight, shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 } }),
        ],
        counterMode: "reps",
        handProp: "handle-cable",
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه به‌صورت ساده‌شده نمایش داده می‌شود.",
        honestyNoteEn: "The machine is shown in a simplified way.",
      };
    }
    if (position === "standing") {
      const straight = { hipL: [0, 0, 0], kneeL: 4, ankleL: 0, hipR: [-8, 0, -2], kneeR: 4, ankleR: 0 };
      const curled = { hipL: [0, 0, 0], kneeL: 4, ankleL: 0, hipR: [-4, 0, -2], kneeR: 96, ankleR: 26 };
      return {
        cycle: [
          kf("ایستاده — پای تکیه", "Standing — support leg", 0.8, { pose: straight }),
          kf("خم‌کردن زانو به عقب", "Curling the knee back", 1.2, { pose: curled }),
          kf("مکث در انقباض", "Pause in contraction", 0.4, { pose: curled }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { pose: straight }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه ایستاده به‌صورت ساده‌شده نمایش داده می‌شود.",
        honestyNoteEn: "The standing machine is shown in a simplified way.",
      };
    }
    // lying
    const straight = { hipL: [0, 0, 4], hipR: [0, 0, -4], kneeL: 6, kneeR: 6, ankleL: 0, ankleR: 0 };
    const curled = { hipL: [4, 0, 4], hipR: [4, 0, -4], kneeL: 96, kneeR: 96, ankleL: 26, ankleR: 26 };
    return {
      cycle: [
        kf("درازکش به شکم — پا صاف", "Prone — legs straight", 0.9, { root: LYING_PRONE_ROOT, pose: { neck: [-20, 0, 0], shoulderL: [-60, 0, 12], shoulderR: [-60, 0, -12], elbowL: -80, elbowR: -80, ...straight } }),
        kf("خم‌کردن زانو", "Curling the knee", 1.2, { root: LYING_PRONE_ROOT, pose: { neck: [-20, 0, 0], shoulderL: [-60, 0, 12], shoulderR: [-60, 0, -12], elbowL: -80, elbowR: -80, ...curled } }),
        kf("مکث در انقباض", "Pause in contraction", 0.4, { root: LYING_PRONE_ROOT, pose: { neck: [-20, 0, 0], shoulderL: [-60, 0, 12], shoulderR: [-60, 0, -12], elbowL: -80, elbowR: -80, ...curled } }),
        kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { root: LYING_PRONE_ROOT, pose: { neck: [-20, 0, 0], shoulderL: [-60, 0, 12], shoulderR: [-60, 0, -12], elbowL: -80, elbowR: -80, ...straight } }),
      ],
      counterMode: "reps",
      handProp: "handle-cable",
      implement: "none",
      sceneProps: [],
      honestyNote: "دستگاه به‌صورت ساده‌شده نمایش داده می‌شود؛ لبه‌های غلتک رندر نمی‌شوند.",
      honestyNoteEn: "The machine is shown in a simplified way; roller pads are not rendered.",
    };
  },
};

/* ---------------------------------- ساق ---------------------------------- */

export const calfRaiseProfile: MovementProfile = {
  id: "calf-raise",
  fa: "حرکات ساق پا",
  en: "Calf raise",
  group: "calf",
  params: [
    { key: "position", label: "وضعیت بدن", kind: "enum", options: ["standing", "seated", "donkey"], default: "standing" },
    { key: "load", label: "وضعیت وزنه", kind: "enum", options: ["none", "dumbbells", "barbell", "machine"], default: "none" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const position = enumParam(p, "position", { key: "position", label: "", kind: "enum", options: ["standing", "seated", "donkey"], default: "standing" }, "standing");
    const load = enumParam(p, "load", { key: "load", label: "وضعیت وزنه", kind: "enum", options: ["none", "dumbbells", "barbell", "machine"], default: "none" }, "none");
    const handProp = load === "dumbbells" ? "dumbbells" : "none";
    const impl = load === "barbell" ? "barbell" : "none";
    if (position === "seated") {
      const seated: import("../types").RootPose = { y: -0.42 };
      const down = { hipL: [-84, 0, 4], hipR: [-84, 0, -4], kneeL: 90, kneeR: 90, ankleL: 18, ankleR: 18 };
      const up = { hipL: [-84, 0, 4], hipR: [-84, 0, -4], kneeL: 90, kneeR: 90, ankleL: -14, ankleR: -14 };
      return {
        cycle: [
          kf("نشسته — پاشنه پایین", "Seated — heels down", 0.9, { root: seated, pose: { ...down, shoulderL: [-28, 0, 10], shoulderR: [-28, 0, -10], elbowL: -20, elbowR: -20 } }),
          kf("بالا بردن پاشنه", "Raising the heels", 1.1, { root: seated, pose: { ...up, shoulderL: [-28, 0, 10], shoulderR: [-28, 0, -10], elbowL: -20, elbowR: -20 } }),
          kf("مکث در انقباض ساق", "Pause in calf contraction", 0.5, { root: seated, pose: { ...up, shoulderL: [-28, 0, 10], shoulderR: [-28, 0, -10], elbowL: -20, elbowR: -20 } }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.1, { root: seated, pose: { ...down, shoulderL: [-28, 0, 10], shoulderR: [-28, 0, -10], elbowL: -20, elbowR: -20 } }),
        ],
        counterMode: "reps",
        handProp,
        implement: impl as BuiltCycle["implement"],
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه ساق به‌صورت ساده‌شده نمایش داده می‌شود.",
        honestyNoteEn: "The calf machine is shown in a simplified way.",
      };
    }
    // standing / donkey — پلانتارفلکشن با بالا آمدن پاشنه
    const down = { ankleL: 16, ankleR: 16, kneeL: 2, kneeR: 2 };
    const up = { ankleL: -22, ankleR: -22, kneeL: 0, kneeR: 0 };
    const rootDonkey = position === "donkey" ? { y: -0.28, rx: 30 } : { y: 0.014 };
    return {
      cycle: [
        kf("پاشنه پایین", "Heels down", 0.9, { root: rootDonkey, pose: down, ...(impl !== "none" ? { impl: { y: -0.52, z: 0.08 } } : {}) }),
        kf("بالا آوردن پاشنه", "Raising the heels", 1.1, { root: rootDonkey, pose: up, ...(impl !== "none" ? { impl: { y: -0.54, z: 0.08 } } : {}) }),
        kf("مکث در انقباض ساق", "Pause in calf contraction", 0.5, { root: rootDonkey, pose: up, ...(impl !== "none" ? { impl: { y: -0.54, z: 0.08 } } : {}) }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.1, { root: rootDonkey, pose: down, ...(impl !== "none" ? { impl: { y: -0.52, z: 0.08 } } : {}) }),
      ],
      counterMode: "reps",
      handProp,
      implement: impl as BuiltCycle["implement"],
      sceneProps: position === "donkey" ? [] : [],
      honestyNote:
        load === "machine"
          ? "دستگاه ساق ایستاده به‌صورت ساده‌شده نمایش داده می‌شود."
          : undefined,
      honestyNoteEn: load === "machine" ? "The standing calf machine is shown in a simplified way." : undefined,
    };
  },
};

/* ---------------------------- نزدیک/دورکننده ران ---------------------------- */

export const hipAdductionProfile: MovementProfile = {
  id: "hip-adduction",
  fa: "نزدیک‌کننده/دورکننده ران",
  en: "Hip adduction / abduction",
  group: "hinge",
  params: [
    { key: "motion", label: "نوع حرکت", kind: "enum", options: ["adduction", "abduction", "standing"], default: "adduction" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const motion = enumParam(p, "motion", { key: "motion", label: "", kind: "enum", options: ["adduction", "abduction", "standing"], default: "adduction" }, "adduction");
    if (motion === "standing") {
      const base = { hipL: [0, 0, 4], kneeL: 4, hipR: [0, 0, 0], kneeR: 4 };
      const out = { hipL: [0, 0, 4], kneeL: 4, hipR: [10, 0, -26], kneeR: 4 };
      return {
        cycle: [
          kf("ایستاده — پا نزدیک", "Standing — leg in", 0.9, { pose: base }),
          kf("دور کردن پا", "Moving the leg out", 1.2, { pose: out }),
          kf("مکث", "Pause", 0.4, { pose: out }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { pose: base }),
        ],
        counterMode: "reps",
        handProp: "handle-cable",
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه به‌صورت ساده‌شده نمایش داده می‌شود.",
        honestyNoteEn: "The machine is shown in a simplified way.",
      };
    }
    const seated: import("../types").RootPose = { y: -0.42 };
    const wide = { hipL: [-70, 0, 30], hipR: [-70, 0, -30], kneeL: 76, kneeR: 76 };
    const narrow = { hipL: [-70, 0, 6], hipR: [-70, 0, -6], kneeL: 76, kneeR: 76 };
    const closing = motion === "adduction";
    return {
      cycle: [
        kf(closing ? "نشسته — پاها باز" : "نشسته — پاها نزدیک", closing ? "Seated — legs wide" : "Seated — legs together", 0.9, {
          root: seated,
          pose: { ...(closing ? wide : narrow), shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 },
        }),
        kf(closing ? "جمع کردن پاها" : "باز کردن پاها", closing ? "Squeezing the legs" : "Opening the legs", 1.2, {
          root: seated,
          pose: { ...(closing ? narrow : wide), shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 },
        }),
        kf("مکث", "Pause", 0.4, {
          root: seated,
          pose: { ...(closing ? narrow : wide), shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 },
        }),
        kf("بازگشت کنترل‌شده", "Controlled return", 1.2, {
          root: seated,
          pose: { ...(closing ? wide : narrow), shoulderL: [-30, 0, 10], shoulderR: [-30, 0, -10], elbowL: -20, elbowR: -20 },
        }),
      ],
      counterMode: "reps",
      handProp: "handle-cable",
      implement: "none",
      sceneProps: ["machine-seat"],
      honestyNote: "دستگاه نزدیک/دورکننده به‌صورت ساده‌شده نمایش داده می‌شود.",
      honestyNoteEn: "The adduction machine is shown in a simplified way.",
    };
  },
};

/* ------------------------------ حرکات گلوت ------------------------------ */

export const gluteKickbackProfile: MovementProfile = {
  id: "glute-kickback",
  fa: "حرکات باسن چهار دست‌وپا / کیک‌بک",
  en: "Quadruped glute / kickback",
  group: "hinge",
  params: [
    { key: "motion", label: "نوع حرکت", kind: "enum", options: ["kickback", "raise", "fire-hydrant"], default: "kickback" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["none", "ankle", "cable"], default: "none" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const motion = enumParam(p, "motion", { key: "motion", label: "", kind: "enum", options: ["kickback", "raise", "fire-hydrant"], default: "kickback" }, "kickback");
    const base = { hipL: [-70, 0, 0], hipR: [-70, 0, 0], kneeL: 84, kneeR: 84, neck: [-16, 0, 0], shoulderL: [-78, 0, 10], shoulderR: [-78, 0, -10], elbowL: -6, elbowR: -6 };
    const ext = motion === "kickback"
      ? { hipL: [-70, 0, 0], kneeL: 84, hipR: [-10, 0, 0], kneeR: 18, neck: [-16, 0, 0], shoulderL: [-78, 0, 10], shoulderR: [-78, 0, -10], elbowL: -6, elbowR: -6 }
      : motion === "raise"
        ? { hipL: [-70, 0, 0], kneeL: 84, hipR: [-24, 0, 0], kneeR: 6, neck: [-16, 0, 0], shoulderL: [-78, 0, 10], shoulderR: [-78, 0, -10], elbowL: -6, elbowR: -6 }
        : { hipL: [-70, 0, 0], kneeL: 84, hipR: [-70, 0, -38], kneeR: 84, neck: [-16, 0, 0], shoulderL: [-78, 0, 10], shoulderR: [-78, 0, -10], elbowL: -6, elbowR: -6 };
    const side = motion === "fire-hydrant" ? "R" : "L";
    return {
      cycle: [
        kf("چهار دست و پا", "Quadruped position", 0.9, { root: QUADRUPED_ROOT, pose: base }),
        kf(`حرکت با پای ${side === "R" ? "راست" : "چپ"}`, `Moving the ${side === "R" ? "right" : "left"} leg`, 1.2, { root: QUADRUPED_ROOT, pose: ext }),
        kf("مکث در انقباض", "Pause in contraction", 0.5, { root: QUADRUPED_ROOT, pose: ext }),
        kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { root: QUADRUPED_ROOT, pose: base }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: [],
    };
  },
};

/* ------------------------ پرس پا و هاک اسکوات ------------------------ */

export const legPressProfile: MovementProfile = {
  id: "leg-press",
  fa: "پرس پا (دستگاه)",
  en: "Leg press (machine)",
  group: "squat",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["leg-press", "hack-squat"], default: "leg-press" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["leg-press", "hack-squat"], default: "leg-press" }, "leg-press");
    if (variant === "hack-squat") {
      const bottom = squatBottom(105, 10, 8);
      return {
        cycle: [
          kf("ایستاده در دستگاه", "Standing in the machine", 0.9, { pose: { shoulderL: [-70, 0, 22], shoulderR: [-70, 0, -22], elbowL: -88, elbowR: -88 } }),
          kf("پایین آمدن کنترل‌شده", "Controlled lowering", 1.4, { root: bottom.root, pose: { ...bottom.pose, shoulderL: [-70, 0, 22], shoulderR: [-70, 0, -22], elbowL: -88, elbowR: -88 } }),
          kf("توقف در پایین", "Pause at the bottom", 0.5, { root: bottom.root, pose: { ...bottom.pose, shoulderL: [-70, 0, 22], shoulderR: [-70, 0, -22], elbowL: -88, elbowR: -88 } }),
          kf("فشار و بالا آمدن", "Pressing up", 1.4, { root: { y: 0 }, pose: { shoulderL: [-70, 0, 22], shoulderR: [-70, 0, -22], elbowL: -88, elbowR: -88 } }),
        ],
        counterMode: "reps",
        handProp: "handle-cable",
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه هاک اسکوات به‌صورت ساده‌شده نمایش داده می‌شود؛ ریل حرکت رندر نمی‌شود.",
        honestyNoteEn: "The hack squat machine is shown in a simplified way; the sled rails are not rendered.",
      };
    }
    const seated: import("../types").RootPose = { y: -0.5, rx: 52 };
    const tucked = { hipL: [-95, 0, 8], hipR: [-95, 0, -8], kneeL: 95, kneeR: 95, ankleL: 14, ankleR: 14 };
    const extended = { hipL: [-108, 0, 8], hipR: [-108, 0, -8], kneeL: 10, kneeR: 10, ankleL: -6, ankleR: -6 };
    return {
      cycle: [
        kf("نشسته — زانو خم", "Seated — knees bent", 0.9, { root: seated, pose: { ...tucked, shoulderL: [-40, 0, 16], shoulderR: [-40, 0, -16], elbowL: -70, elbowR: -70 } }),
        kf("فشار پا", "Pressing the feet", 1.3, { root: seated, pose: { ...extended, shoulderL: [-40, 0, 16], shoulderR: [-40, 0, -16], elbowL: -70, elbowR: -70 } }),
        kf("مکث در بالا", "Pause at the top", 0.4, { root: seated, pose: { ...extended, shoulderL: [-40, 0, 16], shoulderR: [-40, 0, -16], elbowL: -70, elbowR: -70 } }),
        kf("پایین آوردن کنترل‌شده", "Controlled return", 1.3, { root: seated, pose: { ...tucked, shoulderL: [-40, 0, 16], shoulderR: [-40, 0, -16], elbowL: -70, elbowR: -70 } }),
      ],
      counterMode: "reps",
      handProp: "handle-cable",
      implement: "none",
      sceneProps: ["machine-seat"],
      honestyNote: "دستگاه پرس پا به‌صورت ساده‌شده نمایش داده می‌شود؛ زاویه بدن و ریل تقریبی است.",
      honestyNoteEn: "The leg press machine is shown in a simplified way; body angle and sled are approximate.",
    };
  },
};

export const LOWER_BODY_PROFILES: MovementProfile[] = [
  squatProfile,
  hingeProfile,
  lungeProfile,
  splitSquatProfile,
  stepUpProfile,
  hipThrustProfile,
  legExtensionProfile,
  legCurlProfile,
  calfRaiseProfile,
  hipAdductionProfile,
  gluteKickbackProfile,
  legPressProfile,
];
