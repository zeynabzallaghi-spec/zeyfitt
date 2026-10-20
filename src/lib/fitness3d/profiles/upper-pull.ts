/**
 * الگوهای حرکتی — کشش بالاتنه و بازو (مرحله ۱۹).
 * پارالل/بارفیکس، بالاکش، رووینگ، پول‌اور، جلو بازو، پشت بازو، ساعد.
 */

import type { MovementProfile, ProfileParams, BuiltCycle, JointPose, RootPose } from "./core";
import {
  kf,
  numParam,
  enumParam,
  ARMS_DOWN,
  ARMS_HANG,
  LYING_SUPINE_ROOT,
  LYING_PRONE_ROOT,
  QUADRUPED_ROOT,
} from "./core";

/* --------------------------------- بارفیکس --------------------------------- */

export const pullUpProfile: MovementProfile = {
  id: "pull-up",
  fa: "بارفیکس و واریانت‌ها",
  en: "Pull-up family",
  group: "pull",
  params: [
    { key: "grip", label: "نوع قبضه", kind: "enum", options: ["pronated", "supinated", "neutral", "wide", "close"], default: "pronated" },
    { key: "assisted", label: "کمکی/وزنه بدن", kind: "enum", options: ["no", "band", "machine"], default: "no" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const grip = enumParam(p, "grip", { key: "grip", label: "", kind: "enum", options: ["pronated", "supinated", "neutral", "wide", "close"], default: "pronated" }, "pronated");
    const assisted = enumParam(p, "assisted", { key: "assisted", label: "", kind: "enum", options: ["no", "band", "machine"], default: "no" }, "no");
    const zGrip = grip === "wide" ? 26 : grip === "close" ? 4 : 10;
    const hang: JointPose = { ...ARMS_HANG, shoulderL: [-175, 0, zGrip], shoulderR: [-175, 0, -zGrip], hipL: [-8, 0, 3], hipR: [-8, 0, -3], kneeL: 14, kneeR: 14 };
    const top: JointPose = {
      shoulderL: [-70, 0, zGrip + 4],
      shoulderR: [-70, 0, -(zGrip + 4)],
      elbowL: -112,
      elbowR: -112,
      hipL: [-14, 0, 3],
      hipR: [-14, 0, -3],
      kneeL: 24,
      kneeR: 24,
      spine: [-4, 0, 0],
    };
    const note =
      assisted === "machine"
        ? "دستگاه بارفیکس کمکی به‌صورت ساده‌شده نمایش داده می‌شود."
        : assisted === "band"
          ? "کش کمکی نمایش داده نمی‌شود."
          : undefined;
    return {
      cycle: [
        kf("آویزان از میله", "Hanging from the bar", 0.9, { root: { y: -0.16 }, pose: hang }),
        kf("کشیدن به بالا", "Pulling up", 1.3, { root: { y: 0.08 }, pose: top }),
        kf("چانه بالای میله", "Chin over the bar", 0.4, { root: { y: 0.08 }, pose: top }),
        kf("پایین آمدن کنترل‌شده", "Controlled lowering", 1.4, { root: { y: -0.16 }, pose: hang }),
      ],
      counterMode: "reps",
      handProp: "none",
      implement: "none",
      sceneProps: ["pullup-bar"],
      honestyNote: note,
      honestyNoteEn: note,
    };
  },
};

/* --------------------------------- بالاکش --------------------------------- */

export const pulldownProfile: MovementProfile = {
  id: "pulldown",
  fa: "بالاکش سیم‌کش (نشسته)",
  en: "Lat pulldown",
  group: "pull",
  params: [
    { key: "grip", label: "نوع قبضه", kind: "enum", options: ["wide", "standard", "close", "reverse"], default: "standard" },
    { key: "variant", label: "نوع", kind: "enum", options: ["pulldown", "straight-arm"], default: "pulldown" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const grip = enumParam(p, "grip", { key: "grip", label: "", kind: "enum", options: ["wide", "standard", "close", "reverse"], default: "standard" }, "standard");
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["pulldown", "straight-arm"], default: "pulldown" }, "pulldown");
    const zGrip = grip === "wide" ? 30 : grip === "close" ? 5 : 14;
    const legs: JointPose = { hipL: [-76, 0, 8], hipR: [-76, 0, -8], kneeL: 84, kneeR: 84, ankleL: 10, ankleR: 10 };
    if (variant === "straight-arm") {
      const up: JointPose = { shoulderL: [-150, 0, 24], shoulderR: [-150, 0, -24], elbowL: -8, elbowR: -8, spine: [10, 0, 0], ...legs };
      const down: JointPose = { shoulderL: [-102, 0, 20], shoulderR: [-102, 0, -20], elbowL: -6, elbowR: -6, spine: [6, 0, 0], ...legs };
      return {
        cycle: [
          kf("بازو کشیده بالا", "Arms extended overhead", 0.9, { root: { y: -0.42 }, pose: up }),
          kf("کشیدن میله به ران", "Pulling the bar to the thighs", 1.3, { root: { y: -0.42 }, pose: down, impl: { y: -0.28, z: 0.3 } }),
          kf("مکث در انقباض زیربغل", "Pause in lat contraction", 0.5, { root: { y: -0.42 }, pose: down, impl: { y: -0.28, z: 0.3 } }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.3, { root: { y: -0.42 }, pose: up, impl: { y: 0.24, z: -0.1 } }),
        ],
        counterMode: "reps",
        handProp: "handle-cable",
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه کابل به‌صورت ساده‌شده نمایش داده می‌شود؛ کابل رندر نمی‌شود.",
        honestyNoteEn: "The cable station is shown in a simplified way; the cable is not rendered.",
      };
    }
    const up: JointPose = { shoulderL: [-160, 0, zGrip], shoulderR: [-160, 0, -zGrip], elbowL: -12, elbowR: -12, spine: [8, 0, 0], ...legs };
    const down: JointPose = { shoulderL: [-92, 0, zGrip], shoulderR: [-92, 0, -zGrip], elbowL: -104, elbowR: -104, spine: [-4, 0, 0], ...legs };
    return {
      cycle: [
        kf("میله در بالای دامنه", "Bar at the top", 0.9, { root: { y: -0.42 }, pose: up, impl: { y: 0.5, z: -0.08 } }),
        kf("کشیدن میله به سینه", "Pulling the bar to the chest", 1.3, { root: { y: -0.42 }, pose: down, impl: { y: 0.24, z: 0.3 } }),
        kf("مکث در انقباض زیربغل", "Pause in lat contraction", 0.5, { root: { y: -0.42 }, pose: down, impl: { y: 0.24, z: 0.3 } }),
        kf("بازگشت کنترل‌شده", "Controlled return", 1.3, { root: { y: -0.42 }, pose: up, impl: { y: 0.5, z: -0.08 } }),
      ],
      counterMode: "reps",
      handProp: "handle-cable",
      implement: "pull-handle",
      sceneProps: ["machine-seat"],
      honestyNote: "دستگاه بالاکش به‌صورت ساده‌شده نمایش داده می‌شود؛ کابل رندر نمی‌شود.",
      honestyNoteEn: "The lat pulldown station is shown in a simplified way; the cable is not rendered.",
    };
  },
};

/* --------------------------------- رووینگ --------------------------------- */

export const rowProfile: MovementProfile = {
  id: "row",
  fa: "رووینگ (زیربغل)",
  en: "Rowing",
  group: "pull",
  params: [
    { key: "position", label: "وضعیت بدن", kind: "enum", options: ["bent-over", "seated", "supported", "inverted", "one-arm"], default: "bent-over" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["barbell", "dumbbells", "cable", "machine", "band", "none"], default: "barbell" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const position = enumParam(p, "position", { key: "position", label: "", kind: "enum", options: ["bent-over", "seated", "supported", "inverted", "one-arm"], default: "bent-over" }, "bent-over");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["barbell", "dumbbells", "cable", "machine", "band", "none"], default: "barbell" }, "barbell");
    const handProp = load === "dumbbells" ? "dumbbells" : load === "cable" || load === "machine" || load === "band" ? "handle-cable" : "none";
    const implement = load === "barbell" ? "barbell" : load === "band" ? "band-loop" : "none";
    const note =
      position === "seated" || position === "supported" || load === "machine" || load === "cable"
        ? "دستگاه/کابل به‌صورت ساده‌شده نمایش داده می‌شود؛ کابل رندر نمی‌شود."
        : position === "inverted"
          ? "زاویه بدن در حالت خوابیده تقریبی است."
          : undefined;
    const noteEn =
      position === "seated" || position === "supported" || load === "machine" || load === "cable"
        ? "The machine/cable is shown in a simplified way; the cable is not rendered."
        : position === "inverted"
          ? "The lying body angle is approximate."
          : undefined;

    if (position === "seated") {
      const legs: JointPose = { hipL: [-74, 0, 10], hipR: [-74, 0, -10], kneeL: 40, kneeR: 40, ankleL: 8, ankleR: 8 };
      const extended: JointPose = { shoulderL: [-76, 0, 16], shoulderR: [-76, 0, -16], elbowL: -6, elbowR: -6, spine: [12, 0, 0], ...legs };
      const pulled: JointPose = { shoulderL: [-34, 0, 22], shoulderR: [-34, 0, -22], elbowL: -118, elbowR: -118, spine: [-6, 0, 0], ...legs };
      return {
        cycle: [
          kf("دست کشیده", "Arms extended", 0.9, { root: { y: -0.42 }, pose: extended }),
          kf("کشیدن به شکم", "Pulling to the abdomen", 1.2, { root: { y: -0.42 }, pose: pulled }),
          kf("مکث — جمع کردن تیغه‌ها", "Pause — squeezing the blades", 0.5, { root: { y: -0.42 }, pose: pulled }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { root: { y: -0.42 }, pose: extended }),
        ],
        counterMode: "reps",
        handProp,
        implement: implement as BuiltCycle["implement"],
        sceneProps: ["machine-seat"],
        honestyNote: note,
        honestyNoteEn: noteEn,
      };
    }
    if (position === "supported") {
      const lying: RootPose = { y: -0.62, rx: 62 };
      const legs: JointPose = { hipL: [-6, 0, 8], hipR: [-6, 0, -8], kneeL: 36, kneeR: 36, ankleL: 12, ankleR: 12 };
      const down: JointPose = { shoulderL: [-96, 0, 10], shoulderR: [-96, 0, -10], elbowL: -8, elbowR: -8, neck: [-14, 0, 0], ...legs };
      const up: JointPose = { shoulderL: [-60, 0, 14], shoulderR: [-60, 0, -14], elbowL: -108, elbowR: -108, neck: [-10, 0, 0], ...legs };
      return {
        cycle: [
          kf("دست کشیده", "Arms extended", 0.9, { root: lying, pose: down }),
          kf("کشیدن به پهلو", "Pulling to the side", 1.2, { root: lying, pose: up }),
          kf("مکث در انقباض", "Pause in contraction", 0.5, { root: lying, pose: up }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { root: lying, pose: down }),
        ],
        counterMode: "reps",
        handProp,
        implement: implement as BuiltCycle["implement"],
        sceneProps: ["bench-flat"],
        honestyNote: note,
        honestyNoteEn: noteEn,
      };
    }
    if (position === "inverted") {
      const rx = 68;
      const top: JointPose = { neck: [-22, 0, 0], shoulderL: [-88, 0, 11], shoulderR: [-88, 0, -11], elbowL: -5, elbowR: -5, ankleL: 48, ankleR: 48 };
      const bottom: JointPose = { neck: [-24, 0, 0], shoulderL: [-78, 0, 14], shoulderR: [-78, 0, -14], elbowL: -104, elbowR: -104, ankleL: 48, ankleR: 48 };
      return {
        cycle: [
          kf("بدن صاف — دست کشیده", "Straight body — arms extended", 0.9, { root: { y: -0.5, rx }, pose: top }),
          kf("کشیدن سینه به میله", "Pulling the chest up", 1.2, { root: { y: -0.6, rx }, pose: bottom }),
          kf("مکث در انقباض", "Pause in contraction", 0.4, { root: { y: -0.6, rx }, pose: bottom }),
          kf("پایین آمدن کنترل‌شده", "Controlled lowering", 1.3, { root: { y: -0.5, rx }, pose: top }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: [],
        honestyNote: note,
        honestyNoteEn: noteEn,
      };
    }
    if (position === "one-arm") {
      // تک‌دستی با تکیه — دست مدل که حرکت می‌کند: چپ
      const legs: JointPose = { hipL: [0, 0, 6], hipR: [0, 0, -6], kneeL: 8, kneeR: 8 };
      const base: JointPose = { spine: [62, 0, 0], neck: [-30, 0, 0], shoulderL: [0, 0, 6], shoulderR: [-30, 0, -18], elbowR: -50, ...legs };
      const pulled: JointPose = { spine: [50, 0, 0], neck: [-26, 0, 0], shoulderL: [-30, 0, 10], elbowL: -116, shoulderR: [-30, 0, -18], elbowR: -50, ...legs };
      return {
        cycle: [
          kf("دست کشیده رو به زمین", "Arm extended toward the floor", 0.9, { pose: base }),
          kf("کشیدن دمبل به پهلو", "Pulling the dumbbell to the side", 1.2, { pose: pulled }),
          kf("مکث در انقباض", "Pause in contraction", 0.5, { pose: pulled }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { pose: base }),
        ],
        counterMode: "reps",
        handProp: "dumbbell-one",
        implement: "none",
        sceneProps: ["bench-flat"],
        honestyNote: "تکیه دست روی نیمکت به‌صورت ساده نمایش داده می‌شود.",
        honestyNoteEn: "The hand support on the bench is shown in a simplified way.",
      };
    }
    // bent-over — عین الگوی هینج + رووینگ
    const hips: JointPose = { hipL: [-46, 0, 6], hipR: [-46, 0, -6], kneeL: 16, kneeR: 16, ankleL: -6, ankleR: -6 };
    const extended: JointPose = { spine: [60, 0, 0], neck: [-40, 0, 0], shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], elbowL: -4, elbowR: -4, ...hips };
    const pulled: JointPose = { spine: [52, 0, 0], neck: [-36, 0, 0], shoulderL: [-24, 0, 14], shoulderR: [-24, 0, -14], elbowL: -112, elbowR: -112, ...hips };
    return {
      cycle: [
        kf("خم به جلو — دست کشیده", "Hinged — arms extended", 0.9, { pose: extended, impl: implement !== "none" ? { y: -0.62, z: 0.22 } : undefined }),
        kf("کشیدن به شکم", "Pulling to the abdomen", 1.2, { pose: pulled, impl: implement !== "none" ? { y: -0.3, z: 0.14 } : undefined }),
        kf("مکث — جمع کردن تیغه‌ها", "Pause — squeezing the blades", 0.5, { pose: pulled, impl: implement !== "none" ? { y: -0.3, z: 0.14 } : undefined }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { pose: extended, impl: implement !== "none" ? { y: -0.62, z: 0.22 } : undefined }),
      ],
      counterMode: "reps",
      handProp,
      implement: implement as BuiltCycle["implement"],
      sceneProps: [],
      honestyNote: note,
      honestyNoteEn: noteEn,
    };
  },
};

/* --------------------------------- پول‌اور --------------------------------- */

export const pulloverProfile: MovementProfile = {
  id: "pullover",
  fa: "پول‌اور (باز از بالای سر)",
  en: "Pullover",
  group: "pull",
  params: [
    { key: "position", label: "وضعیت بدن", kind: "enum", options: ["lying", "standing"], default: "lying" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbells", "barbell", "cable"], default: "dumbbells" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const position = enumParam(p, "position", { key: "position", label: "", kind: "enum", options: ["lying", "standing"], default: "lying" }, "lying");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbells", "barbell", "cable"], default: "dumbbells" }, "dumbbells");
    const legs: JointPose = { hipL: [-12, 0, 8], hipR: [-12, 0, -8], kneeL: 56, kneeR: 56, ankleL: 12, ankleR: 12 };
    if (position === "standing") {
      const start: JointPose = { shoulderL: [-160, 0, 12], shoulderR: [-160, 0, -12], elbowL: -10, elbowR: -10 };
      const end: JointPose = { shoulderL: [-20, 0, 10], shoulderR: [-20, 0, -10], elbowL: -8, elbowR: -8, spine: [-6, 0, 0] };
      return {
        cycle: [
          kf("باز از بالای سر", "Arms overhead", 0.9, { pose: start }),
          kf("کشیدن به پایین", "Pulling down", 1.3, { pose: end }),
          kf("مکث در کنار ران", "Pause by the thighs", 0.4, { pose: end }),
          kf("بازگشت به بالای سر", "Return overhead", 1.3, { pose: start }),
        ],
        counterMode: "reps",
        handProp: load === "dumbbells" ? "dumbbells" : load === "cable" ? "handle-cable" : "none",
        implement: load === "barbell" ? "barbell" : "none",
        sceneProps: [],
      };
    }
    const start: JointPose = { shoulderL: [-158, 0, 10], shoulderR: [-158, 0, -10], elbowL: -8, elbowR: -8, ...legs };
    const end: JointPose = { shoulderL: [-24, 0, 8], shoulderR: [-24, 0, -8], elbowL: -8, elbowR: -8, ...legs };
    return {
      cycle: [
        kf("باز از بالای سر (خوابیده)", "Arms overhead (lying)", 0.9, { root: LYING_SUPINE_ROOT, pose: start }),
        kf("کشیدن به بالای سینه", "Pulling over the chest", 1.3, { root: LYING_SUPINE_ROOT, pose: end }),
        kf("مکث", "Pause", 0.4, { root: LYING_SUPINE_ROOT, pose: end }),
        kf("بازگشت پشت سر", "Return behind the head", 1.3, { root: LYING_SUPINE_ROOT, pose: start }),
      ],
      counterMode: "reps",
      handProp: load === "dumbbells" ? "dumbbells" : load === "cable" ? "handle-cable" : "none",
      implement: load === "barbell" ? "barbell" : "none",
      sceneProps: [],
      honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
      honestyNoteEn: "The lying body angle is approximate.",
    };
  },
};

/* -------------------------------- جلو بازو -------------------------------- */

export const curlProfile: MovementProfile = {
  id: "curl",
  fa: "جلو بازو",
  en: "Biceps curl",
  group: "arms",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["standing", "hammer", "incline", "preacher", "concentration", "cable", "barbell", "alternate", "zottman"], default: "standing" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["dumbbells", "barbell", "ez", "cable", "band"], default: "dumbbells" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["standing", "hammer", "incline", "preacher", "concentration", "cable", "barbell", "alternate", "zottman"], default: "standing" }, "standing");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["dumbbells", "barbell", "ez", "cable", "band"], default: "dumbbells" }, "dumbbells");
    const handProp = load === "dumbbells" ? "dumbbells" : load === "cable" || load === "band" ? "handle-cable" : "none";
    const implement = load === "barbell" || load === "ez" ? "barbell" : "none";
    const downImpl = implement !== "none" ? { y: -0.56, z: 0.08 } : undefined;
    const upImpl = implement !== "none" ? { y: -0.16, z: 0.18 } : undefined;

    if (variant === "concentration") {
      const base: JointPose = { spine: [58, 0, 0], neck: [-34, 0, 0], shoulderL: [4, 0, 4], elbowL: -6, shoulderR: [-4, 0, -14], elbowR: -60, hipL: [-30, 0, 10], hipR: [-40, 0, -10], kneeL: 60, kneeR: 60 };
      const up: JointPose = { spine: [52, 0, 0], neck: [-30, 0, 0], shoulderL: [-16, 0, 4], elbowL: -138, shoulderR: [-4, 0, -14], elbowR: -60, hipL: [-30, 0, 10], hipR: [-40, 0, -10], kneeL: 60, kneeR: 60 };
      return {
        cycle: [
          kf("آرنج روی ران — دست پایین", "Elbow on the thigh — arm down", 0.9, { pose: base }),
          kf("جلو بازو نشسته", "Concentration curl up", 1.2, { pose: up }),
          kf("مکث در انقباض", "Pause in contraction", 0.5, { pose: up }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.3, { pose: base }),
        ],
        counterMode: "reps",
        handProp: "dumbbell-one",
        implement: "none",
        sceneProps: ["machine-seat"],
      };
    }
    if (variant === "preacher") {
      const base: JointPose = { spine: [12, 0, 0], shoulderL: [-46, 0, 12], shoulderR: [-46, 0, -12], elbowL: -18, elbowR: -18 };
      const up: JointPose = { spine: [12, 0, 0], shoulderL: [-40, 0, 12], shoulderR: [-40, 0, -12], elbowL: -96, elbowR: -96 };
      return {
        cycle: [
          kf("بازو روی تکیه‌گاه", "Arms on the pad", 0.9, { pose: base, impl: downImpl }),
          kf("جلو بازو", "Curling up", 1.2, { pose: up, impl: upImpl }),
          kf("مکث در انقباض", "Pause in contraction", 0.5, { pose: up, impl: upImpl }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.3, { pose: base, impl: downImpl }),
        ],
        counterMode: "reps",
        handProp,
        implement: implement as BuiltCycle["implement"],
        sceneProps: [],
        honestyNote: "تکیه‌گاه پریچر به‌صورت ساده نمایش داده می‌شود.",
        honestyNoteEn: "The preacher pad is shown in a simplified way.",
      };
    }
    if (variant === "incline") {
      const root: RootPose = { y: -0.46, rx: 52 };
      const legs: JointPose = { hipL: [-8, 0, 8], hipR: [-8, 0, -8], kneeL: 40, kneeR: 40, ankleL: 12, ankleR: 12 };
      const base: JointPose = { shoulderL: [-14, 0, 14], shoulderR: [-14, 0, -14], elbowL: -4, elbowR: -4, ...legs };
      const up: JointPose = { shoulderL: [-24, 0, 16], shoulderR: [-24, 0, -16], elbowL: -138, elbowR: -138, ...legs };
      return {
        cycle: [
          kf("روی نیمکت شیب‌دار — دست پایین", "On incline bench — arms down", 0.9, { root, pose: base }),
          kf("جلو بازو", "Curling up", 1.2, { root, pose: up }),
          kf("مکث در انقباض", "Pause in contraction", 0.5, { root, pose: up }),
          kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.3, { root, pose: base }),
        ],
        counterMode: "reps",
        handProp: "dumbbells",
        implement: "none",
        sceneProps: ["bench-incline"],
      };
    }
    if (variant === "alternate" || variant === "zottman") {
      const base: JointPose = { shoulderL: [0, 0, 8], shoulderR: [0, 0, -8], elbowL: 0, elbowR: 0 };
      const leftUp: JointPose = { shoulderL: [0, 0, 8], elbowL: -140, shoulderR: [0, 0, -8], elbowR: 0, wristL: -8 };
      const rightUp: JointPose = { shoulderR: [0, 0, -8], elbowR: -140, shoulderL: [0, 0, 8], elbowL: 0, wristR: -8 };
      return {
        cycle: [
          kf("دست‌ها کنار بدن", "Arms at the sides", 0.8, { pose: base, impl: downImpl }),
          kf("جلو بازو با دست چپ", "Curling the left arm", 1.1, { pose: leftUp, impl: downImpl }),
          kf("مکث", "Pause", 0.35, { pose: leftUp, impl: downImpl }),
          kf("پایین آوردن دست چپ", "Lowering the left arm", 1.1, { pose: base, impl: downImpl }),
          kf("جلو بازو با دست راست", "Curling the right arm", 1.1, { pose: rightUp, impl: downImpl }),
          kf("مکث", "Pause", 0.35, { pose: rightUp, impl: downImpl }),
          kf("پایین آوردن دست راست", "Lowering the right arm", 1.1, { pose: base, impl: downImpl }),
        ],
        repsPerCycle: 2,
        counterMode: "reps",
        handProp: "dumbbells",
        implement: "none",
        sceneProps: [],
      };
    }
    // standing / hammer / cable / barbell — الگوی مشترک فلکشن آرنج
    const wristTilt = variant === "hammer" ? 0 : -10;
    const zTilt = variant === "cable" ? 10 : 8;
    const top: JointPose = { shoulderL: [0, 0, zTilt], shoulderR: [0, 0, -zTilt], elbowL: -140, elbowR: -140, wristL: wristTilt, wristR: wristTilt };
    const topHold: JointPose = { shoulderL: [0, 0, zTilt], shoulderR: [0, 0, -zTilt], elbowL: -146, elbowR: -146, wristL: wristTilt - 2, wristR: wristTilt - 2 };
    const down: JointPose = { shoulderL: [0, 0, zTilt], shoulderR: [0, 0, -zTilt], elbowL: 0, elbowR: 0, wristL: 0, wristR: 0 };
    return {
      cycle: [
        kf("وضعیت شروع", "Starting position", 0.9, { pose: down, impl: downImpl }),
        kf("بالا آوردن وزنه", "Lifting the weight", 1.1, { pose: top, impl: upImpl }),
        kf("انقباض در بالا", "Contraction at the top", 0.5, { pose: topHold, impl: upImpl }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.3, { pose: down, impl: downImpl }),
      ],
      counterMode: "reps",
      handProp,
      implement: implement as BuiltCycle["implement"],
      sceneProps: [],
    };
  },
};

/* -------------------------------- پشت بازو -------------------------------- */

export const tricepsProfile: MovementProfile = {
  id: "triceps",
  fa: "پشت بازو",
  en: "Triceps extension",
  group: "arms",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["pushdown", "skullcrusher", "kickback", "overhead", "bench-dip", "cable-overhead"], default: "pushdown" },
    { key: "load", label: "تجهیز", kind: "enum", options: ["cable", "dumbbells", "barbell", "ez", "band", "none"], default: "cable" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["pushdown", "skullcrusher", "kickback", "overhead", "bench-dip", "cable-overhead"], default: "pushdown" }, "pushdown");
    const load = enumParam(p, "load", { key: "load", label: "", kind: "enum", options: ["cable", "dumbbells", "barbell", "ez", "band", "none"], default: "cable" }, "cable");
    const handProp = load === "dumbbells" ? "dumbbells" : load === "cable" || load === "band" ? "handle-cable" : "none";
    const implement = load === "barbell" || load === "ez" ? "barbell" : "none";

    if (variant === "pushdown") {
      const up: JointPose = { shoulderL: [-10, 0, 14], shoulderR: [-10, 0, -14], elbowL: -96, elbowR: -96 };
      const down: JointPose = { shoulderL: [-8, 0, 12], shoulderR: [-8, 0, -12], elbowL: -6, elbowR: -6 };
      return {
        cycle: [
          kf("ساعد رو به بالا", "Forearms up", 0.9, { pose: up }),
          kf("پایین آوردن دسته", "Pushing the handle down", 1.1, { pose: down }),
          kf("انقباض پشت بازو", "Triceps contraction", 0.5, { pose: down }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { pose: up }),
        ],
        counterMode: "reps",
        handProp,
        implement: "none",
        sceneProps: ["machine-seat"],
        honestyNote: "دستگاه کابل به‌صورت ساده‌شده نمایش داده می‌شود؛ کابل رندر نمی‌شود.",
        honestyNoteEn: "The cable station is shown in a simplified way; the cable is not rendered.",
      };
    }
    if (variant === "skullcrusher") {
      const legs: JointPose = { hipL: [-12, 0, 8], hipR: [-12, 0, -8], kneeL: 56, kneeR: 56, ankleL: 12, ankleR: 12 };
      const top: JointPose = { shoulderL: [-152, 0, 12], shoulderR: [-152, 0, -12], elbowL: -10, elbowR: -10, ...legs };
      const bottom: JointPose = { shoulderL: [-118, 0, 14], shoulderR: [-118, 0, -14], elbowL: -86, elbowR: -86, ...legs };
      return {
        cycle: [
          kf("وزنه بالای سر", "Weight overhead", 0.9, { root: LYING_SUPINE_ROOT, pose: top, impl: implement !== "none" ? { y: 0.42, z: -0.34 } : undefined }),
          kf("خم کردن آرنج به پیشانی", "Bending the elbows toward the head", 1.2, { root: LYING_SUPINE_ROOT, pose: bottom, impl: implement !== "none" ? { y: 0.3, z: -0.02 } : undefined }),
          kf("مکث در پایین", "Pause at the bottom", 0.4, { root: LYING_SUPINE_ROOT, pose: bottom, impl: implement !== "none" ? { y: 0.3, z: -0.02 } : undefined }),
          kf("باز کردن آرنج", "Extending the elbows", 1.2, { root: LYING_SUPINE_ROOT, pose: top, impl: implement !== "none" ? { y: 0.42, z: -0.34 } : undefined }),
        ],
        counterMode: "reps",
        handProp,
        implement: implement as BuiltCycle["implement"],
        sceneProps: [],
        honestyNote: "زاویه بدن در حالت خوابیده تقریبی است.",
        honestyNoteEn: "The lying body angle is approximate.",
      };
    }
    if (variant === "kickback") {
      const base: JointPose = { spine: [64, 0, 0], neck: [-42, 0, 0], shoulderL: [-10, 0, 6], elbowL: -96, shoulderR: [-4, 0, -10], elbowR: -8, hipL: [-40, 0, 8], hipR: [-46, 0, -8], kneeL: 30, kneeR: 34 };
      const extended: JointPose = { spine: [64, 0, 0], neck: [-42, 0, 0], shoulderL: [-18, 0, 6], elbowL: -4, shoulderR: [-4, 0, -10], elbowR: -8, hipL: [-40, 0, 8], hipR: [-46, 0, -8], kneeL: 30, kneeR: 34 };
      return {
        cycle: [
          kf("خم به جلو — آرنج خم", "Hinged — elbow bent", 0.9, { pose: base }),
          kf("باز کردن آرنج به عقب", "Extending the arm back", 1.1, { pose: extended }),
          kf("انقباض پشت بازو", "Triceps contraction", 0.5, { pose: extended }),
          kf("بازگشت کنترل‌شده", "Controlled return", 1.2, { pose: base }),
        ],
        counterMode: "reps",
        handProp: "dumbbell-one",
        implement: "none",
        sceneProps: ["bench-flat"],
      };
    }
    if (variant === "bench-dip") {
      const top: JointPose = { shoulderL: [-16, 0, 8], shoulderR: [-16, 0, -8], elbowL: -8, elbowR: -8, hipL: [-16, 0, 4], hipR: [-16, 0, -4], kneeL: 30, kneeR: 30, ankleL: 40, ankleR: 40 };
      const bottom: JointPose = { shoulderL: [-48, 0, 16], shoulderR: [-48, 0, -16], elbowL: -88, elbowR: -88, hipL: [-14, 0, 4], hipR: [-14, 0, -4], kneeL: 28, kneeR: 28, ankleL: 42, ankleR: 42 };
      return {
        cycle: [
          kf("بالای دیپ نیمکت", "Top of the bench dip", 0.9, { root: { y: -0.44 }, pose: top }),
          kf("پایین آمدن", "Lowering", 1.2, { root: { y: -0.6 }, pose: bottom }),
          kf("توقف در پایین", "Pause at the bottom", 0.4, { root: { y: -0.6 }, pose: bottom }),
          kf("فشار به بالا", "Pressing up", 1.2, { root: { y: -0.44 }, pose: top }),
        ],
        counterMode: "reps",
        handProp: "none",
        implement: "none",
        sceneProps: ["bench-flat"],
      };
    }
    // overhead (ایستاده/نشسته)
    const up: JointPose = { shoulderL: [-158, 0, 16], shoulderR: [-158, 0, -16], elbowL: -102, elbowR: -102 };
    const top: JointPose = { shoulderL: [-164, 0, 14], shoulderR: [-164, 0, -14], elbowL: -6, elbowR: -6 };
    return {
      cycle: [
        kf("آرنج خم بالای سر", "Elbows bent overhead", 0.9, { pose: up, impl: implement !== "none" ? { y: 0.2, z: -0.18 } : undefined }),
        kf("باز کردن آرنج بالای سر", "Extending overhead", 1.2, { pose: top, impl: implement !== "none" ? { y: 0.56, z: -0.1 } : undefined }),
        kf("مکث در بالا", "Pause at the top", 0.4, { pose: top, impl: implement !== "none" ? { y: 0.56, z: -0.1 } : undefined }),
        kf("خم کردن کنترل‌شده", "Controlled flexing", 1.3, { pose: up, impl: implement !== "none" ? { y: 0.2, z: -0.18 } : undefined }),
      ],
      counterMode: "reps",
      handProp: load === "dumbbells" ? "dumbbells" : load === "cable" ? "handle-cable" : "none",
      implement: implement as BuiltCycle["implement"],
      sceneProps: [],
    };
  },
};

/* -------------------------------- ساعد و مچ -------------------------------- */

export const wristProfile: MovementProfile = {
  id: "wrist",
  fa: "حرکات مچ و ساعد",
  en: "Wrist / forearm",
  group: "arms",
  params: [
    { key: "variant", label: "نوع", kind: "enum", options: ["curl", "reverse", "rotation", "grip"], default: "curl" },
  ],
  build(p: ProfileParams): BuiltCycle {
    const variant = enumParam(p, "variant", { key: "variant", label: "", kind: "enum", options: ["curl", "reverse", "rotation", "grip"], default: "curl" }, "curl");
    if (variant === "grip") {
      return {
        cycle: [
          kf("دست باز", "Hand open", 0.8, { pose: { shoulderL: [-8, 0, 6], shoulderR: [-8, 0, -6], elbowL: -80, elbowR: -80 } }),
          kf("فشار دادن قبضه", "Squeezing the grip", 0.9, { pose: { shoulderL: [-8, 0, 6], shoulderR: [-8, 0, -6], elbowL: -80, elbowR: -80, wristL: -22, wristR: -22 } }),
          kf("نگه‌داشتن انقباض", "Holding the contraction", 0.6, { pose: { shoulderL: [-8, 0, 6], shoulderR: [-8, 0, -6], elbowL: -80, elbowR: -80, wristL: -20, wristR: -20 } }),
          kf("باز کردن کنترل‌شده", "Controlled release", 1.0, { pose: { shoulderL: [-8, 0, 6], shoulderR: [-8, 0, -6], elbowL: -80, elbowR: -80 } }),
        ],
        counterMode: "reps",
        handProp: "wrist-bar",
        implement: "none",
        sceneProps: [],
      };
    }
    if (variant === "rotation") {
      const a: JointPose = { shoulderL: [-24, 0, 10], shoulderR: [-24, 0, -10], elbowL: -90, elbowR: -90, wristL: -60, wristR: -60 };
      const b: JointPose = { shoulderL: [-24, 0, 10], shoulderR: [-24, 0, -10], elbowL: -90, elbowR: -90, wristL: 30, wristR: 30 };
      return {
        cycle: [
          kf("مچ رو به داخل", "Wrist rotated inward", 0.9, { pose: a }),
          kf("چرخش ساعد", "Rotating the forearm", 1.1, { pose: b }),
          kf("مکث", "Pause", 0.4, { pose: b }),
          kf("چرخش برگشتی", "Rotating back", 1.1, { pose: a }),
        ],
        counterMode: "reps",
        handProp: "wrist-bar",
        implement: "none",
        sceneProps: [],
      };
    }
    // curl / reverse — ساعد روی ران، فلکشن/اکستنشن مچ
    const seated: RootPose = { y: -0.42 };
    const legs: JointPose = { hipL: [-80, 0, 6], hipR: [-80, 0, -6], kneeL: 86, kneeR: 86, ankleL: 8, ankleR: 8 };
    const down: JointPose = { spine: [30, 0, 0], shoulderL: [-14, 0, 8], shoulderR: [-14, 0, -8], elbowL: -96, elbowR: -96, wristL: 38, wristR: 38, ...legs };
    const up: JointPose = { spine: [30, 0, 0], shoulderL: [-14, 0, 8], shoulderR: [-14, 0, -8], elbowL: -96, elbowR: -96, wristL: -30, wristR: -30, ...legs };
    return {
      cycle: [
        kf("مچ پایین", "Wrist down", 0.9, { root: seated, pose: down }),
        kf("بالا آوردن مچ", "Curling the wrist up", 1.1, { root: seated, pose: up }),
        kf("مکث در انقباض", "Pause in contraction", 0.5, { root: seated, pose: up }),
        kf("پایین آوردن کنترل‌شده", "Controlled lowering", 1.2, { root: seated, pose: down }),
      ],
      counterMode: "reps",
      handProp: "wrist-bar",
      implement: "none",
      sceneProps: ["machine-seat"],
    };
  },
};

export const PULL_ARM_PROFILES: MovementProfile[] = [
  pullUpProfile,
  pulldownProfile,
  rowProfile,
  pulloverProfile,
  curlProfile,
  tricepsProfile,
  wristProfile,
];
