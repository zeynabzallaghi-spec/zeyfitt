/**
 * الگوهای حرکتی — بخش بالاتنه: پرس و نشر (مرحله ۱۹).
 * شنا، پرس سینه، پرس سرشانه، دیپ، فای، نشر جانب/جلو/خم، شراگ، چرخش شانه.
 */

import type { MovementProfile, ProfileParams } from "./core";
import type { BuiltCycle, JointPose, Keyframe, RootPose } from "./core";
import {
  kf,
  numParam,
  enumParam,
  ARMS_PRESS_RACK,
  ARMS_PRESS_TOP,
  ARMS_DOWN,
  armsSide,
  LYING_SUPINE_ROOT,
  plankTopPose,
} from "./core";

/* ---------------------------------- شنا ---------------------------------- */

export const pushUpProfile: MovementProfile = {
  id: "push-up",
  fa: "شنا و واریانت‌ها",
  en: "Push-up family",
  group: "push",
  params: [
    { key: "angle", label: "زاویه بدن", kind: "enum", options: ["floor", "incline", "decline", "knee"], default: "floor" },
    { key: "width", label: "عرض دست", kind: "enum", options: ["standard", "wide", "narrow", "diamond"], default: "standard" },
    { key: "singleArm", label: "تک‌دستی", kind: "enum", options: ["no", "yes"], default: "no" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const angle = enumParam(p, "angle", { key: "angle", label: "", kind: "enum", options: ["floor", "incline", "decline", "knee"], default: "floor" }, "floor");
    const singleArm = enumParam(p, "singleArm", { key: "singleArm", label: "", kind: "enum", options: ["no", "yes"], default: "no" }, "no");
    // پایین آمدن بسته به عرض دست — دیاموند آرنج جمع‌تر
    const elbowFlare = singleArm === "yes" ? 8 : 15;
    const topY = angle === "incline" ? -0.4 : angle === "decline" ? -0.62 : -0.56;
    const bottomY = angle === "incline" ? -0.52 : angle === "decline" ? -0.78 : -0.74;
    const rx = angle === "knee" ? 60 : 68;
    const kneePose: JointPose = angle === "knee" ? { hipL: [-72, 0, 2], hipR: [-72, 0, -2], kneeL: 78, kneeR: 78, ankleL: 20, ankleR: 20 } : { ankleL: 48, ankleR: 48 };
    const top: JointPose = { ...plankTopPose(5), ...kneePose, ...(singleArm === "yes" ? { shoulderR: [-80, 0, -6] } : {}) };
    const bottom: JointPose = {
      neck: [-26, 0, 0],
      shoulderL: [-102, 0, 11 + elbowFlare],
      shoulderR: [-102, 0, -(11 + elbowFlare)],
      elbowL: -88,
      elbowR: singleArm === "yes" ? -18 : -88,
      ...kneePose,
    };
    const note =
      angle === "incline"
        ? "شیب بالاتنه (دست روی جعبه) با جعبه ثابت نمایش داده می‌شود."
        : angle === "decline"
          ? "پایین‌تنه روی جعبه ثابت نمایش داده می‌شود."
          : "زاویه بدن در حالت خوابیده برای نمایش سه‌بعدی تقریبی است.";
    return {
      cycle: [
        kf("پلانک — بالای حرکت", "Plank — top of the movement", 0.9, { root: { y: topY, rx }, pose: top }),
        kf("پایین آمدن", "Lowering", 1.2, { root: { y: bottomY, rx }, pose: bottom }),
        kf("توقف در پایین", "Pause at the bottom", 0.4, { root: { y: bottomY, rx }, pose: bottom }),
        kf("فشار و بالا آمدن", "Pressing up", 1.2, { root: { y: topY, rx }, pose: top }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: angle === "incline" || angle === "decline" ? ["box"] : [],
      honestyNote: note,
    };
  },
};

/* -------------------------------- پرس سینه -------------------------------- */

export const benchPressProfile: MovementProfile = {
  id: "bench-press",
  fa: "پرس سینه (نیمکت)",
  en: "Bench press",
  group: "push",
  params: [
    { key: "angle", label: "زاویه نیمکت", kind: "enum", options: ["flat", "incline", "decline"], default: "flat" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["barbell", "dumbbells", "machine"], default: "barbell" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const angle = enumParam(p, "angle", { key: "angle", label: "", kind: "enum", options: ["flat", "incline", "decline"], default: "flat" }, "flat");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["barbell", "dumbbells", "machine"], default: "barbell" }, "barbell");
    const rootY = angle === "incline" ? -0.44 : angle === "decline" ? -0.72 : -0.7;
    const rx = angle === "incline" ? 52 : 86;
    const rack: JointPose = {
      shoulderL: [-74, 0, 34],
      shoulderR: [-74, 0, -34],
      elbowL: -92,
      elbowR: -92,
      hipL: [-10, 0, 8],
      hipR: [-10, 0, -8],
      kneeL: 62,
      kneeR: 62,
      ankleL: 14,
      ankleR: 14,
    };
    const bottom: JointPose = {
      shoulderL: [-74, 0, 48],
      shoulderR: [-74, 0, -48],
      elbowL: -12,
      elbowR: -12,
      hipL: [-10, 0, 8],
      hipR: [-10, 0, -8],
      kneeL: 62,
      kneeR: 62,
      ankleL: 14,
      ankleR: 14,
    };
    const top: JointPose = {
      shoulderL: [-72, 0, 30],
      shoulderR: [-72, 0, -30],
      elbowL: -8,
      elbowR: -8,
      hipL: [-10, 0, 8],
      hipR: [-10, 0, -8],
      kneeL: 62,
      kneeR: 62,
      ankleL: 14,
      ankleR: 14,
    };
    return {
      cycle: [
        kf("آماده روی نیمکت", "Set-up on the bench", 0.9, { root: { y: rootY, rx }, pose: rack }),
        kf("پایین آوردن وزنه", "Lowering the weight", 1.3, { root: { y: rootY, rx }, pose: bottom }),
        kf("توقف در پایین سینه", "Pause at the chest", 0.4, { root: { y: rootY, rx }, pose: bottom }),
        kf("پرس به بالا", "Pressing up", 1.2, { root: { y: rootY, rx }, pose: top }),
      ],
      counterMode: "reps",
      handProp: load === "dumbbells" ? "dumbbells" : "none",
      implement: load === "barbell" ? "barbell" : "none",
      sceneProps: [angle === "incline" ? "bench-incline" : angle === "decline" ? "bench-decline" : "bench-flat"],
      honestyNote:
        load === "machine"
          ? "دستگاه پرس سینه به‌صورت ساده‌شده نمایش داده می‌شود."
          : "زاویه بدن روی نیمکت و مسیر وزنه تقریبی است.",
      honestyNoteEn: load === "machine"
        ? "The chest press machine is shown in a simplified way."
        : "Body angle on the bench and the weight path are approximate.",
    };
  },
};

/* ------------------------------ پرس سرشانه ------------------------------ */

export const overheadPressProfile: MovementProfile = {
  id: "overhead-press",
  fa: "پرس سرشانه",
  en: "Overhead press",
  group: "push",
  params: [
    { key: "position", label: "وضعیت بدن", kind: "enum", options: ["standing", "seated"], default: "standing" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbells", "barbell", "kettlebell", "machine", "band"], default: "dumbbells" },
    { key: "alternating", label: "یک‌دستی متناوب", kind: "enum", options: ["no", "yes"], default: "no" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const position = enumParam(p, "position", { key: "position", label: "", kind: "enum", options: ["standing", "seated"], default: "standing" }, "standing");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbells", "barbell", "kettlebell", "machine", "band"], default: "dumbbells" }, "dumbbells");
    const alternating = enumParam(p, "alternating", { key: "alternating", label: "", kind: "enum", options: ["no", "yes"], default: "no" }, "no");
    const seatedRoot: RootPose | undefined = position === "seated" ? { y: -0.42 } : undefined;
    const legsSeated: JointPose = { hipL: [-78, 0, 8], hipR: [-78, 0, -8], kneeL: 82, kneeR: 82, ankleL: 10, ankleR: 10 };
    const legsStanding: JointPose = {};
    const legs = position === "seated" ? legsSeated : legsStanding;

    if (alternating === "yes") {
      const rackL: JointPose = { shoulderL: [-15, 0, 72], elbowL: -145, shoulderR: [-15, 0, -72], elbowR: -145, ...legs };
      const topL: JointPose = { shoulderL: [-5, 0, 148], elbowL: -18, shoulderR: [-15, 0, -72], elbowR: -145, ...legs };
      const rackR: JointPose = { shoulderR: [-15, 0, -72], elbowR: -145, shoulderL: [-15, 0, 72], elbowL: -145, ...legs };
      const topR: JointPose = { shoulderR: [-5, 0, -148], elbowR: -18, shoulderL: [-15, 0, 72], elbowL: -145, ...legs };
      return {
        cycle: [
          kf("نگه‌داشتن در ارتفاع شانه", "Hold at shoulder height", 0.8, { root: seatedRoot, pose: rackL }),
          kf("پرس با دست چپ", "Pressing with the left arm", 1.1, { root: seatedRoot, pose: topL }),
          kf("مکث در بالا", "Pause at the top", 0.35, { root: seatedRoot, pose: topL }),
          kf("پایین آوردن دست چپ", "Lowering the left arm", 1.0, { root: seatedRoot, pose: rackL }),
          kf("پرس با دست راست", "Pressing with the right arm", 1.1, { root: seatedRoot, pose: topR }),
          kf("مکث در بالا", "Pause at the top", 0.35, { root: seatedRoot, pose: topR }),
          kf("پایین آوردن دست راست", "Lowering the right arm", 1.0, { root: seatedRoot, pose: rackR }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: load === "kettlebell" ? "kettlebell-one" : "dumbbells",
        implement: "none",
        sceneProps: position === "seated" ? ["machine-seat"] : [],
        honestyNote: load === "machine" ? "دستگاه به‌صورت ساده‌شده نمایش داده می‌شود." : undefined,
        honestyNoteEn: load === "machine" ? "The machine is shown in a simplified way." : undefined,
      };
    }
    return {
      cycle: [
        kf("نگه‌داشتن در ارتفاع شانه", "Hold at shoulder height", 0.9, { root: seatedRoot, pose: { ...ARMS_PRESS_RACK, ...legs } }),
        kf("پرس به بالا", "Pressing up", 1.1, { root: seatedRoot, pose: { ...ARMS_PRESS_TOP, ...legs } }),
        kf("توقف در بالا", "Pause at the top", 0.4, { root: seatedRoot, pose: { ...ARMS_PRESS_TOP, ...legs } }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.1, { root: seatedRoot, pose: { ...ARMS_PRESS_RACK, ...legs } }),
      ],
      counterMode: "reps",
      handProp: load === "kettlebell" ? "kettlebell-one" : load === "machine" || load === "band" ? "handle-cable" : "dumbbells",
      implement: load === "barbell" ? "barbell" : "none",
      sceneProps: position === "seated" ? ["machine-seat"] : [],
      honestyNote:
        load === "machine"
          ? "دستگاه پرس سرشانه به‌صورت ساده‌شده نمایش داده می‌شود."
          : load === "band"
            ? "کش به‌صورت میله نازک بین دو دست نمایش داده می‌شود."
            : undefined,
      honestyNoteEn:
        load === "machine"
          ? "The shoulder press machine is shown in a simplified way."
          : load === "band"
            ? "The band is displayed as a thin bar between the hands."
            : undefined,
    };
  },
};

/* ---------------------------------- دیپ ---------------------------------- */

export const dipProfile: MovementProfile = {
  id: "dip",
  fa: "دیپ (پارالل)",
  en: "Dip",
  group: "push",
  params: [
    { key: "lean", label: "خم تنه", kind: "enum", options: ["upright", "chest-lean"], default: "upright" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const lean = enumParam(p, "lean", { key: "lean", label: "", kind: "enum", options: ["upright", "chest-lean"], default: "upright" }, "upright");
    const spineDeg = lean === "chest-lean" ? 22 : 6;
    const top: JointPose = {
      spine: [spineDeg, 0, 0],
      shoulderL: [-8, 0, 10],
      shoulderR: [-8, 0, -10],
      elbowL: -6,
      elbowR: -6,
      hipL: [-18, 0, 3],
      hipR: [-18, 0, -3],
      kneeL: 56,
      kneeR: 56,
      ankleL: 30,
      ankleR: 30,
    };
    const bottom: JointPose = {
      spine: [spineDeg + 4, 0, 0],
      shoulderL: [-32, 0, 22],
      shoulderR: [-32, 0, -22],
      elbowL: -86,
      elbowR: -86,
      hipL: [-22, 0, 3],
      hipR: [-22, 0, -3],
      kneeL: 62,
      kneeR: 62,
      ankleL: 34,
      ankleR: 34,
    };
    return {
      cycle: [
        kf("بالای پارالل", "Top of the dip", 0.9, { root: { y: -0.34 }, pose: top }),
        kf("پایین آمدن", "Lowering", 1.3, { root: { y: -0.52 }, pose: bottom }),
        kf("توقف در پایین", "Pause at the bottom", 0.4, { root: { y: -0.52 }, pose: bottom }),
        kf("فشار به بالا", "Pressing up", 1.2, { root: { y: -0.34 }, pose: top }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: ["dip-bars"],
      honestyNote: "بارهای اضافه (وزنه کمری) نمایش داده نمی‌شوند.",
      honestyNoteEn: "Added loads (weight plates on a belt) are not displayed.",
    };
  },
};

/* ---------------------------------- فای ---------------------------------- */

export const flyProfile: MovementProfile = {
  id: "fly",
  fa: "فای (باز و بسته کردن بازو)",
  en: "Fly",
  group: "fly",
  params: [
    { key: "position", label: "وضعیت بدن", kind: "enum", options: ["floor", "bench", "incline", "standing", "cable", "reverse"], default: "floor" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbells", "cable", "machine", "band"], default: "dumbbells" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const position = enumParam(p, "position", { key: "position", label: "", kind: "enum", options: ["floor", "bench", "incline", "standing", "cable", "reverse"], default: "floor" }, "floor");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbells", "cable", "machine", "band"], default: "dumbbells" }, "dumbbells");
    const lying = position === "floor" || position === "bench";
    const rootPose: RootPose | undefined = lying
      ? { y: position === "bench" ? -0.7 : LYING_SUPINE_ROOT.y, rx: position === "bench" ? 86 : LYING_SUPINE_ROOT.rx }
      : undefined;
    const legsLying: JointPose = { hipL: [-10, 0, 8], hipR: [-10, 0, -8], kneeL: 60, kneeR: 60, ankleL: 14, ankleR: 14 };
    const openLying: JointPose = { shoulderL: [-88, 0, 84], shoulderR: [-88, 0, -84], elbowL: -32, elbowR: -32, ...legsLying };
    const closeLying: JointPose = { shoulderL: [-80, 0, 16], shoulderR: [-80, 0, -16], elbowL: -26, elbowR: -26, ...legsLying };
    if (lying) {
      return {
        cycle: [
          kf("باز — وضعیت شروع", "Open — start", 0.9, { root: rootPose, pose: openLying }),
          kf("جمع کردن بازوها", "Closing the arms", 1.3, { root: rootPose, pose: closeLying }),
          kf("انقباض سینه در بالا", "Chest squeeze at the top", 0.5, { root: rootPose, pose: closeLying }),
          kf("باز کردن کنترل‌شده", "Controlled opening", 1.3, { root: rootPose, pose: openLying }),
        ],
        counterMode: "reps",
        handProp: load === "dumbbells" ? "dumbbells" : "handle-cable",
        implement: "none",
        sceneProps: position === "bench" ? ["bench-flat"] : [],
        honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
        honestyNoteEn: "The lying body angle is approximate.",
      };
    }
    // ایستاده/کابل/معکوس (rear delt)
    const isReverse = position === "reverse";
    const spineDeg = isReverse ? 55 : 0;
    const open: JointPose = isReverse
      ? { spine: [spineDeg, 0, 0], shoulderL: [30, 0, 74], shoulderR: [30, 0, -74], elbowL: -18, elbowR: -18 }
      : { shoulderL: [-70, 0, 70], shoulderR: [-70, 0, -70], elbowL: -22, elbowR: -22 };
    const close: JointPose = isReverse
      ? { spine: [spineDeg, 0, 0], shoulderL: [10, 0, 16], shoulderR: [10, 0, -16], elbowL: -16, elbowR: -16 }
      : { shoulderL: [-78, 0, 14], shoulderR: [-78, 0, -14], elbowL: -18, elbowR: -18 };
    return {
      cycle: [
        kf(isReverse ? "خم به جلو — باز" : "ایستاده — باز", isReverse ? "Hinged — open" : "Standing — open", 0.9, { pose: open }),
        kf(isReverse ? "جمع کردن از طرفین" : "جمع کردن دست‌ها", isReverse ? "Squeezing the rear delts" : "Closing the hands", 1.2, { pose: close }),
        kf("مکث در انقباض", "Pause in contraction", 0.5, { pose: close }),
        kf("باز کردن کنترل‌شده", "Controlled opening", 1.2, { pose: open }),
      ],
      counterMode: "reps",
      handProp: load === "dumbbells" ? "dumbbells" : "handle-cable",
      implement: "none",
      sceneProps: position === "cable" ? ["machine-seat"] : [],
      honestyNote:
        position === "cable"
          ? "دستگاه کابل به‌صورت ساده‌شده نمایش داده می‌شود؛ کابل‌ها رندر نمی‌شوند."
          : load === "machine"
            ? "دستگاه فای به‌صورت ساده‌شده نمایش داده می‌شود."
            : undefined,
      honestyNoteEn:
        position === "cable"
          ? "The cable station is shown in a simplified way; cables are not rendered."
          : load === "machine"
            ? "The fly machine is shown in a simplified way."
            : undefined,
    };
  },
};

/* ------------------------------- نشر جانب/جلو ------------------------------- */

export const raiseProfile: MovementProfile = {
  id: "raise",
  fa: "نشر جانب / جلو",
  en: "Lateral / front raise",
  group: "raise",
  params: [
    { key: "direction", label: "جهت نشر", kind: "enum", options: ["lateral", "front", "lean-lateral"], default: "lateral" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbells", "plate", "cable", "band", "barbell"], default: "dumbbells" },
    { key: "alternating", label: "متناوب", kind: "enum", options: ["no", "yes"], default: "no" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const direction = enumParam(p, "direction", { key: "direction", label: "", kind: "enum", options: ["lateral", "front", "lean-lateral"], default: "lateral" }, "lateral");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbells", "plate", "cable", "band", "barbell"], default: "dumbbells" }, "dumbbells");
    const alternating = enumParam(p, "alternating", { key: "alternating", label: "", kind: "enum", options: ["no", "yes"], default: "no" }, "no");
    const handProp = load === "dumbbells" ? "dumbbells" : load === "cable" || load === "band" ? "handle-cable" : "none";
    const implement = load === "plate" ? "medball-hands" : load === "barbell" ? "barbell" : "none";
    if (direction === "front") {
      return {
        cycle: [
          kf("دست‌ها جلوی ران", "Hands in front of the thighs", 0.9, { pose: ARMS_DOWN }),
          kf("بالا بردن از جلو", "Raising to the front", 1.2, { pose: { shoulderL: [-88, 0, 8], shoulderR: [-88, 0, -8], elbowL: -4, elbowR: -4 }, impl: implement !== "none" ? { y: -0.02, z: 0.52 } : undefined }),
          kf("مکث در ارتفاع شانه", "Pause at shoulder height", 0.5, { pose: { shoulderL: [-88, 0, 8], shoulderR: [-88, 0, -8], elbowL: -4, elbowR: -4 }, impl: implement !== "none" ? { y: -0.02, z: 0.52 } : undefined }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { pose: ARMS_DOWN, impl: implement !== "none" ? { y: -0.55, z: 0.16 } : undefined }),
        ],
        counterMode: "reps",
        handProp,
        implement: implement as BuiltCycle["implement"],
        sceneProps: [],
      };
    }
    if (direction === "lean-lateral") {
      const spineLean: JointPose = { spine: [0, 0, 22] };
      return {
        cycle: [
          kf("خم به طرفین — دست پایین", "Leaning — arm down", 0.9, { pose: { ...ARMS_DOWN, ...spineLean } }),
          kf("نشر از طرف مقابل", "Raising to the opposite side", 1.2, { pose: { shoulderL: [-10, 0, 86], elbowL: -14, shoulderR: [-6, 0, -30], elbowR: -8, spine: [0, 0, 22] } }),
          kf("مکث در ارتفاع شانه", "Pause at shoulder height", 0.5, { pose: { shoulderL: [-10, 0, 88], elbowL: -14, shoulderR: [-6, 0, -30], elbowR: -8, spine: [0, 0, 22] } }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { pose: { ...ARMS_DOWN, ...spineLean } }),
        ],
        counterMode: "reps",
        handProp,
        implement: "none",
        sceneProps: [],
      };
    }
    if (alternating === "yes") {
      const down: JointPose = { shoulderL: [0, 0, 10], shoulderR: [0, 0, -10], elbowL: -8, elbowR: -8 };
      const leftUp: JointPose = { shoulderL: [-10, 0, 88], shoulderR: [0, 0, -10], elbowL: -15, elbowR: -8, wristL: -6 };
      const rightUp: JointPose = { shoulderR: [-10, 0, -88], shoulderL: [0, 0, 10], elbowR: -15, elbowL: -8, wristR: -6 };
      return {
        cycle: [
          kf("دمبل کنار بدن", "Dumbbells at the sides", 0.8, { pose: down }),
          kf("نشر با دست چپ", "Raising the left arm", 1.1, { pose: leftUp }),
          kf("مکث", "Pause", 0.4, { pose: leftUp }),
          kf("پایین آوردن دست چپ", "Lowering the left arm", 1.0, { pose: { ...down, wristL: 0 } }),
          kf("نشر با دست راست", "Raising the right arm", 1.1, { pose: rightUp }),
          kf("مکث", "Pause", 0.4, { pose: rightUp }),
          kf("پایین آوردن دست راست", "Lowering the right arm", 1.0, { pose: down }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "dumbbells",
        implement: "none",
        sceneProps: [],
      };
    }
    // lateral — عین الگوی حرکت فعلی lateral-raise
    return {
      cycle: [
        kf("دست‌ها کنار بدن", "Arms at the sides", 0.9, { pose: armsSide(10, 8) }),
        kf("بالا آوردن از طرفین", "Raising to the sides", 1.2, { pose: armsSide(88, 15) }),
        kf("توقف در ارتفاع شانه", "Pause at shoulder height", 0.5, { pose: armsSide(90, 15) }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { pose: armsSide(10, 8) }),
      ],
      counterMode: "reps",
      handProp,
      implement: "none",
      sceneProps: [],
    };
  },
};

/* ---------------------------------- شراگ ---------------------------------- */

export const shrugProfile: MovementProfile = {
  id: "shrug",
  fa: "شراگ (حرکت کول)",
  en: "Shrug",
  group: "raise",
  params: [
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbells", "barbell", "machine", "none"], default: "dumbbells" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbells", "barbell", "machine", "none"], default: "dumbbells" }, "dumbbells");
    // بالا رفتن شانه‌ها با خمش خفیف ستون فقرات — نمایانگر کول
    const up: JointPose = { spine: [-4, 0, 0], neck: [6, 0, 0], shoulderL: [4, 0, 8], shoulderR: [4, 0, -8], elbowL: -2, elbowR: -2 };
    const down: JointPose = { spine: [2, 0, 0], neck: [-2, 0, 0], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], elbowL: -2, elbowR: -2 };
    return {
      cycle: [
        kf("ایستاده — شانه‌ها پایین", "Standing — shoulders down", 0.9, { pose: down, impl: load === "barbell" ? { y: -0.56, z: 0.06 } : undefined }),
        kf("بالا بردن شانه‌ها", "Raising the shoulders", 1.0, { pose: up, impl: load === "barbell" ? { y: -0.54, z: 0.06 } : undefined }),
        kf("مکث در انقباض کول", "Pause in trap contraction", 0.6, { pose: up, impl: load === "barbell" ? { y: -0.54, z: 0.06 } : undefined }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.0, { pose: down, impl: load === "barbell" ? { y: -0.56, z: 0.06 } : undefined }),
      ],
      counterMode: "reps",
      handProp: load === "dumbbells" ? "dumbbells" : load === "machine" ? "handle-cable" : "none",
      implement: load === "barbell" ? "barbell" : "none",
      sceneProps: load === "machine" ? ["machine-seat"] : [],
      honestyNote: load === "machine" ? "دستگاه شراگ به‌صورت ساده‌شده نمایش داده می‌شود." : undefined,
      honestyNoteEn: load === "machine" ? "The shrug machine is shown in a simplified way." : undefined,
    };
  },
};

/* ----------------------------- چرخش خارجی شانه ----------------------------- */

export const shoulderRotationProfile: MovementProfile = {
  id: "shoulder-rotation",
  fa: "چرخش شانه (داخلی/خارجی)",
  en: "Shoulder rotation",
  group: "raise",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["external", "face-pull", "raise-overhead"], default: "external" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbells", "cable", "band"], default: "cable" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["external", "face-pull", "raise-overhead"], default: "external" }, "external");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbells", "cable", "band"], default: "cable" }, "cable");
    const handProp = load === "dumbbells" ? "dumbbells" : "handle-cable";
    if (variant === "face-pull") {
      const start: JointPose = { shoulderL: [-92, 0, 62], shoulderR: [-92, 0, -62], elbowL: -12, elbowR: -12 };
      const pulled: JointPose = { shoulderL: [-70, 0, 62], shoulderR: [-70, 0, -62], elbowL: -102, elbowR: -102, spine: [-6, 0, 0] };
      return {
        cycle: [
          kf("بازو کشیده", "Arms extended", 0.9, { pose: start }),
          kf("کشیدن به سمت صورت", "Pulling to the face", 1.2, { pose: pulled }),
          kf("مکث در انقباض", "Pause in contraction", 0.5, { pose: pulled }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { pose: start }),
        ],
        counterMode: "reps",
        handProp,
        implement: "pull-handle",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه کابل به‌صورت ساده‌شده نمایش داده می‌شود؛ کابل رندر نمی‌شود.",
        honestyNoteEn: "The cable station is shown in a simplified way; the cable is not rendered.",
      };
    }
    if (variant === "raise-overhead") {
      const start: JointPose = { shoulderL: [-90, 0, 24], shoulderR: [-90, 0, -24], elbowL: -6, elbowR: -6 };
      const top: JointPose = { shoulderL: [-170, 0, 16], shoulderR: [-170, 0, -16], elbowL: -4, elbowR: -4 };
      return {
        cycle: [
          kf("بازو در ارتفاع شانه", "Arms at shoulder height", 0.9, { pose: start }),
          kf("بالا بردن بالای سر", "Raising overhead", 1.2, { pose: top }),
          kf("مکث", "Pause", 0.4, { pose: top }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { pose: start }),
        ],
        counterMode: "reps",
        handProp,
        implement: "none",
        sceneProps: [],
      };
    }
    // external rotation — بازو در کنار بدن، ساعد چرخان
    const start: JointPose = { shoulderL: [0, 0, 4], shoulderR: [0, 0, -4], elbowL: -90, elbowR: -90 };
    const rotated: JointPose = { shoulderL: [0, -34, 4], shoulderR: [0, 34, -4], elbowL: -90, elbowR: -90 };
    return {
      cycle: [
        kf("ساعد رو به داخل", "Forearm pointing inward", 0.9, { pose: start }),
        kf("چرخش خارجی شانه", "Externally rotating the shoulder", 1.2, { pose: rotated }),
        kf("مکث در انتهای دامنه", "Pause at end range", 0.5, { pose: rotated }),
        kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { pose: start }),
      ],
      counterMode: "reps",
      handProp,
      implement: "none",
      sceneProps: [],
    };
  },
};

/* ------------------------------ پرس زمین/لندماین ------------------------------ */

export const floorPressProfile: MovementProfile = {
  id: "floor-press",
  fa: "پرس خوابیده روی زمین",
  en: "Floor press",
  group: "push",
  params: [
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbells", "barbell", "kettlebell"], default: "dumbbells" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbells", "barbell", "kettlebell"], default: "dumbbells" }, "dumbbells");
    const legs: JointPose = { hipL: [-16, 0, 8], hipR: [-16, 0, -8], kneeL: 50, kneeR: 50, ankleL: 12, ankleR: 12 };
    const top: JointPose = { shoulderL: [-74, 0, 26], shoulderR: [-74, 0, -26], elbowL: -8, elbowR: -8, ...legs };
    const bottom: JointPose = { shoulderL: [-70, 0, 40], shoulderR: [-70, 0, -40], elbowL: -20, elbowR: -20, ...legs };
    return {
      cycle: [
        kf("خوابیده — وزنه بالا", "Lying — weight up", 0.9, { root: LYING_SUPINE_ROOT, pose: top }),
        kf("پایین آوردن تا زمین", "Lowering toward the floor", 1.3, { root: LYING_SUPINE_ROOT, pose: bottom }),
        kf("مکث — آرنج روی زمین", "Pause — elbow on the floor", 0.4, { root: LYING_SUPINE_ROOT, pose: bottom }),
        kf("پرس به بالا", "Pressing up", 1.2, { root: LYING_SUPINE_ROOT, pose: top }),
      ],
      counterMode: "reps",
      handProp: load === "kettlebell" ? "kettlebell-one" : "dumbbells",
      implement: load === "barbell" ? "barbell" : "none",
      sceneProps: [],
      honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
      honestyNoteEn: "The lying body angle is approximate.",
    };
  },
};

export const PUSH_PROFILES: MovementProfile[] = [
  pushUpProfile,
  benchPressProfile,
  overheadPressProfile,
  dipProfile,
  flyProfile,
  raiseProfile,
  shrugProfile,
  shoulderRotationProfile,
  floorPressProfile,
];
