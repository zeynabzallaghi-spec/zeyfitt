/**
 * دیکشنری نمای مربی سه‌بعدی — حالت‌های بارگذاری صحنه، پشتیبانی WebGL،
 * مرز خطا، کارت شفافیت نسخه اول + زیرمؤلفه‌های UI (فهرست انتخاب حرکت،
 * جزئیات حرکت، پنل عضلات، نوار پخش و HUD صحنه).
 *
 * الگو دقیقاً مطابق sections/shell.ts است: اینترفیس تایپ‌شده + دو دیکشنری
 * کامل fa/en + تابع getter. متن‌های فارسی عیناً همان متن‌های فعلی اپ‌اند
 * (با نیم‌فاصله) و داده لایه سه‌بعدی (fitness3d) دست‌نخورده می‌ماند.
 *
 * داده‌های فارسی لایه سه‌بعدی (نام عضلات، تجهیزات، مفاصل، نام مراحل چرخه و
 * محتوای آموزشی حرکات) «داده» هستند و تغییر نمی‌کنند؛ نقشه‌های نمایشی این
 * فایل روی «شناسه‌های پایدار» یا «مقادیر فارسی داده» ساخته می‌شوند — نسخه
 * فارسی هر نقشه عیناً از تعریف‌های داده (EXERCISES و MUSCLE_GROUPS) خوانده
 * می‌شود تا با بانک همیشه یکسان بماند و انگلیسی ترجمه نمایشی است.
 *
 * پاراگراف‌های کارت شفافیت که بخش ضخیم (bold) دارند به سه قطعه pre/bold/post
 * تقسیم شده‌اند تا ساختار JSX فعلی (اسپن درشت داخل پاراگراف) حفظ شود.
 */

import type { Locale } from "../shared";
import { localeNumber, localeDecimal } from "../format";
import { muscleFa, muscleEn } from "@/lib/fitness3d/muscles";
import { EXERCISES } from "@/lib/fitness3d/exercises";
import type { MuscleGroupId, CameraView } from "@/lib/fitness3d/types";

/** پاراگراف با یک قطعه درشت وسط — برای حفظ ساختار JSX فعلی */
export interface BoldSplitParagraph {
  pre: string;
  bold: string;
  post: string;
}

/**
 * محتوای آموزشی حرکت سه‌بعدی برای نمایش — نسخه فارسی عیناً از داده
 * (src/lib/fitness3d/exercises.ts) خوانده می‌شود و انگلیسی ترجمه نمایشی است.
 */
export interface Exercise3DContent {
  startPosition: string;
  steps: string[];
  mistakes: string[];
  tip: string;
  /** یادداشت شفاف — فقط برای حرکاتی که در داده دارند (بقیه null) */
  honestyNote: string | null;
}

export interface Coach3DStrings {
  // نشان‌های نوار معرفی
  engineActiveBadge: string;
  stageRoadmapLabel: string;
  // صحنه سه‌بعدی
  sceneAria: string;
  scenePreparing: string;
  scenePreparingHint: string;
  // پشتیبانی WebGL
  webglUnsupportedTitle: string;
  webglUnsupportedBody: string;
  // مرز خطای صحنه
  sceneErrorTitle: string;
  sceneErrorBody: string;
  retryButton: string;
  // پنل موبایل انتخاب حرکت و عضلات
  exercisePanelToggleAria: string;
  exercisePanelToggleLabel: string;
  // کارت شفافیت
  transparencySectionAria: string;
  transparencyTitle: string;
  transparencyProcedural: BoldSplitParagraph;
  transparencyRepCounter: BoldSplitParagraph;
  transparencyMuscleHighlight: string;
  // نام حرکات — داده هر دو نام را دارد؛ انتخاب بر اساس زبان رابط
  exerciseName: (fa: string, en: string) => string;
  /** نام حرکت به زبان مقابل — برای سطر دوم دوزبانه */
  exerciseAltName: (fa: string, en: string) => string;
  // فهرست انتخاب حرکت
  exerciseListAria: string;
  exerciseListTitle: string;
  exerciseCountBadge: (count: number) => string;
  /** جست‌وجوی بانک کامل (مرحله ۱۹) */
  searchPlaceholder: string;
  listLoading: string;
  listError: string;
  listRetry: string;
  searchEmpty: string;
  loadMore: (remaining: string) => string;
  /** واحد زمان نگه‌داشتن برای حرکات ایزومتریک/کششی */
  holdUnit: string;
  // پیش‌نمایش سه‌بعدی در انتخابگر (مرحله ۱۹)
  previewAction: string;
  previewAria: (name: string) => string;
  previewTitle: (name: string) => string;
  previewUnavailable: string;
  previewNoteFa: string;
  previewNoteEn: string;
  // کارت اطلاعات الگو برای حرکات پارامتری
  patternInfoTitle: string;
  counterModeLabel: (hold: boolean) => string;
  contentRefTitle: string;
  contentRefBody: string;
  // جزئیات حرکت
  detailsAria: (name: string) => string;
  guideTitle: (name: string) => string;
  startPositionTitle: string;
  jointsTitle: string;
  targetMusclesLabel: string;
  stepsTitle: string;
  mistakesTitle: string;
  secondaryMusclesSuffix: string;
  // نقشه‌های نمایشی داده لایه سه‌بعدی
  muscleLabel: (id: MuscleGroupId) => string;
  /** فهرست عضلات با جداکننده متناسب با زبان */
  muscleList: (ids: MuscleGroupId[]) => string;
  equipmentLabel: (value: string) => string;
  jointLabel: (value: string) => string;
  /** نام مرحله چرخه — داده فارسی است؛ انگلیسی نقشه نمایشی روی همان مقدار */
  phaseLabel: (name: string) => string;
  /** محتوای آموزشی حرکت به زبان رابط — کلید: شناسه پایدار حرکت */
  exerciseContent: (id: string) => Exercise3DContent;
  // پنل عضلات
  musclePanelAria: string;
  musclePanelTitle: string;
  primaryGroupLabel: string;
  secondaryGroupLabel: string;
  manualHighlightTitle: string;
  manualHighlightHint: string;
  manualPickLabel: string;
  muscleDisclaimer: string;
  // نوار پخش
  playLabel: string;
  pauseLabel: string;
  resetAria: string;
  resetLabel: string;
  speedLabel: string;
  speedAria: string;
  speedValue: (speed: number) => string;
  viewsLabel: string;
  viewButtonLabel: (id: Exclude<CameraView, "free">) => string;
  freeViewBadge: string;
  musclesToggleAria: string;
  // HUD صحنه
  hudTechBadge: string;
  phaseOf: (current: number, total: number) => string;
  repsUnit: string;
  hudSpeedBadge: (speed: number) => string;
}

/* --------------- نقشه‌های نمایشی ساخته‌شده از تعریف‌های داده --------------- */

/** محتوای فارسی هر حرکت — عیناً از داده خوانده می‌شود تا همیشه یکسان بماند */
const FA_CONTENT: Record<string, Exercise3DContent> = Object.fromEntries(
  EXERCISES.map((ex) => [
    ex.id,
    {
      startPosition: ex.startPosition,
      steps: ex.steps,
      mistakes: ex.mistakes,
      tip: ex.tip,
      honestyNote: ex.honestyNote ?? null,
    },
  ])
);

const EMPTY_CONTENT: Exercise3DContent = {
  startPosition: "",
  steps: [],
  mistakes: [],
  tip: "",
  honestyNote: null,
};

/** ترجمه نمایشی نام مراحل چرخه — کلید: مقدار فارسی داده (بدون تغییر داده) */
const EN_PHASE_NAMES: Record<string, string> = {
  "وضعیت شروع": "Starting position",
  "بالا آوردن دمبل": "Lifting the dumbbell",
  "انقباض در بالا": "Contraction at the top",
  "پایین آوردن کنترل‌شده": "Controlled lowering",
  "وضعیت ایستاده": "Standing position",
  "پایین آمدن": "Lowering",
  "توقف در پایین": "Pause at the bottom",
  "بالا آمدن": "Rising up",
  "پلانک — بالای حرکت": "Plank — top of the movement",
  "فشار و بالا آمدن": "Press and rise",
  "نگه‌داشتن در ارتفاع شانه": "Hold at shoulder height",
  "پرس به بالا": "Pressing up",
  "توقف در بالا": "Pause at the top",
  "دمبل کنار بدن": "Dumbbells at your sides",
  "بالا آوردن از طرفین": "Raising to the sides",
  "توقف در ارتفاع شانه": "Pause at shoulder height",
  "ایستادن": "Standing",
  "لانج با پای راست": "Lunge with right leg",
  "عود به ایستادن": "Return to standing",
  "لانج با پای چپ": "Lunge with left leg",
};

/** ترجمه نمایشی تجهیزات — کلید: مقدار فارسی داده */
const EN_EQUIPMENT_LABELS: Record<string, string> = {
  "یک جفت دمبل": "Pair of dumbbells",
  "وزن بدن": "Bodyweight",
};

/** ترجمه نمایشی مفاصل و بخش‌های درگیر — کلید: مقدار فارسی داده */
const EN_JOINT_LABELS: Record<string, string> = {
  "آرنج": "Elbow",
  "ساعد": "Forearm",
  "شانه (تثبیت‌کننده)": "Shoulder (stabilizer)",
  "زانو": "Knee",
  "لگن": "Hips",
  "مچ پا": "Ankle",
  "ستون فقرات": "Spine",
  "شانه": "Shoulder",
  "مرکزی بدن": "Core",
  "ستون فقرات (تثبیت)": "Spine (stabilization)",
  "کتف": "Shoulder blades",
};

/** محتوای آموزشی انگلیسی هر حرکت — کلید: شناسه پایدار حرکت */
const EN_CONTENT: Record<string, Exercise3DContent> = {
  "biceps-curl": {
    startPosition:
      "Stand with feet shoulder-width apart, a dumbbell in each hand and palms facing forward. Arms at your sides with elbows fixed close to the torso.",
    steps: [
      "Stand holding the dumbbells firmly at your sides; shoulders back and down.",
      "Keep your elbows fixed and raise the dumbbell toward your shoulder by contracting the biceps.",
      "Pause for a moment at the top and feel the muscle contraction.",
      "Lower the dumbbell slowly and under control (about twice the lifting time) back to the starting position.",
    ],
    mistakes: [
      "Swinging the body and using lower-back momentum to lift the weight",
      "Elbows drifting forward during the movement",
      "Dropping the weight quickly during the lowering phase",
    ],
    tip: "Breathing: exhale while lifting the weight and inhale while lowering it. Control the speed of the lowering phase; most of the growth stimulus is in that phase.",
    honestyNote: null,
  },
  squat: {
    startPosition:
      "Stand with feet shoulder-width apart or slightly wider, toes turned slightly outward. Chest open, gaze forward and arms held forward for balance.",
    steps: [
      "Stand and brace your core.",
      "As you bend your knees, drive your hips back and down, as if sitting into a chair.",
      "Go down until your thighs are at least parallel to the floor while keeping your lower-back form intact.",
      "Press the floor with your whole foot, focus on the heels, and return to standing.",
    ],
    mistakes: [
      "Heels lifting off the floor",
      "Excessive lower-back arch or chest rounding at the bottom of the movement",
      "Knees not tracking over the toes (knees collapsing inward)",
    ],
    tip: "Throughout the movement keep your body weight over your whole foot (focusing on the heels) and guide your knees in line with your toes.",
    honestyNote: null,
  },
  "push-up": {
    startPosition:
      "In a plank position, hands on the floor slightly wider than shoulder-width and the body in a straight line from head to heels. Gaze slightly forward.",
    steps: [
      "Get into a plank position; hands under the shoulders and core braced.",
      "Bend your elbows and lower your whole body together until the chest is near the floor.",
      "Pause briefly at the bottom; elbows about 45 degrees to the torso.",
      "Press the floor and return the body as one unit to the plank position.",
    ],
    mistakes: [
      "Hips sagging toward the floor or lifting too high",
      "Elbows flaring outward (90 degrees to the torso)",
      "The whole body not moving together (head or hips leading with a delay)",
    ],
    tip: "The body should move up and down like a flat board. If your form breaks down, perform it on your knees until the technique is solid.",
    honestyNote:
      "The body angle in the lying position is approximate for 3D display; this version focuses on understanding the overall movement pattern.",
  },
  "shoulder-press": {
    startPosition:
      "Stand with feet shoulder-width apart, dumbbells at shoulder height beside your head. Elbows slightly ahead of the torso line and palms facing forward.",
    steps: [
      "Hold the dumbbells at shoulder height; brace your core and glutes.",
      "Press the dumbbells upward and slightly inward (toward each other).",
      "Do not lock the elbows out at the top of the movement; pause briefly.",
      "Lower the dumbbells with control back to shoulder height.",
    ],
    mistakes: [
      "Excessive lower-back arch with the chest poking out",
      "Pressing the weight forward instead of along a vertical path",
      "Lowering quickly and slamming the weight at the bottom",
    ],
    tip: "The weight path should be vertical and close to the body. If your lower back arches, brace your abs harder or train with a lighter weight.",
    honestyNote: null,
  },
  "lateral-raise": {
    startPosition:
      "Stand with dumbbells at your sides and slightly in front of the thighs. Elbows slightly bent and fixed, chest open and no body swinging.",
    steps: [
      "Stand holding the dumbbells beside your thighs; keep the elbows slightly bent.",
      "Raise your arms out to the sides up to shoulder height; keep the elbow above the wrist.",
      "Pause briefly at the top and feel the shoulder blades.",
      "Return your arms slowly and under control to the starting position.",
    ],
    mistakes: [
      "Raising the arms above shoulder level by swinging",
      "Using a heavy weight and relying on body momentum",
      "Shoulders rising toward the ears (traps taking over from the shoulders)",
    ],
    tip: "This exercise is performed with a light weight and clean technique; imagine pouring water from pitchers at your sides so the wrists stay slightly tilted.",
    honestyNote: null,
  },
  lunge: {
    startPosition:
      "Stand with feet hip-width apart and hands on your hips or at your sides. Gaze forward and torso upright.",
    steps: [
      "Take a long step forward and keep the torso upright.",
      "Bend the front knee and lower the body straight down; the back knee comes close to the floor.",
      "Pause briefly at the bottom; the front knee must not travel past the toes.",
      "Press through the front foot to rise back to standing; then repeat with the other leg.",
    ],
    mistakes: [
      "A short step with the front knee passing the toe line",
      "Torso hunching forward",
      "Uneven reps between the legs",
    ],
    tip: "Take long steps and shift your body weight onto the front leg at the bottom. In this version, each cycle includes one lunge with the right leg and one lunge with the left leg.",
    honestyNote: null,
  },
};

/* ---------------------------------- فارسی ---------------------------------- */

const FA: Coach3DStrings = {
  engineActiveBadge: "موتور سه‌بعدی فعال",
  stageRoadmapLabel: "مرحله ۲ از نقشه راه",
  sceneAria: "صحنه سه‌بعدی مربی",
  scenePreparing: "در حال آماده‌سازی صحنه سه‌بعدی…",
  scenePreparingHint:
    "بارگذاری موتور WebGL برای اولین بار ممکن است چند لحظه طول بکشد",
  webglUnsupportedTitle: "مرورگر شما WebGL را پشتیبانی نمی‌کند",
  webglUnsupportedBody:
    "برای نمایش مربی سه‌بعدی، مرورگر نیاز به WebGL دارد. لطفاً از نسخه به‌روز کروم، فایرفاکس یا سافاری استفاده کنید یا شتاب‌دهی سخت‌افزاری مرورگر را فعال کنید.",
  sceneErrorTitle: "خطا در اجرای صحنه سه‌بعدی",
  sceneErrorBody:
    "رندر WebGL با مشکل مواجه شد. صفحه را دوباره بارگذاری کنید یا مرورگر خود را به‌روزرسانی کنید. بقیه بخش‌های برنامه بدون مشکل کار می‌کنند.",
  retryButton: "تلاش مجدد",
  exercisePanelToggleAria: "باز و بسته کردن پنل انتخاب حرکت و عضلات",
  exercisePanelToggleLabel: "انتخاب حرکت و عضلات",
  transparencySectionAria: "وضعیت شفاف مربی سه‌بعدی",
  transparencyTitle: "وضعیت فنی این نسخه — شفاف",
  transparencyProcedural: {
    pre: "مدل بدن ",
    bold: "پروسیجرال",
    post: " (ساخته‌شده از هندسه‌های متناسب با مفاصل متصل) است؛ در مراحل بعد ممکن است با مدل GLB دارای اسکلت استاندارد و انیمیشن‌های حرفه‌ای جایگزین شود. ساختار داده حرکات برای همین جایگزینی طراحی شده است.",
  },
  transparencyRepCounter: {
    pre: "شمارنده تکرار با ",
    bold: "تکمیل چرخه واقعی حرکت",
    post: " افزایش می‌یابد (نه با فریم یا کلیک)؛ در لانج هر چرخه شامل دو لانج چپ و راست است. زوایای اجرای شنا و لانج تقریبی و برای آموزش الگوی حرکت است.",
  },
  transparencyMuscleHighlight:
    "هایلایت عضلات نمایش گرافیکی «عضلات هدف» است و ادعای شبیه‌سازی علمی یا اندازه‌گیری EMG ندارد. انیمیشن همه حرکات بانک با الگوهای حرکتی پارامتری از داده واقعی هر حرکت (نام، تجهیزات، عضلات، نوع تمرین) ساخته می‌شود و زوایا تقریبی‌اند.",
  // نام حرکات — داده دوزبانه است؛ فارسی نام اصلی را نشان می‌دهد
  exerciseName: (fa) => fa,
  exerciseAltName: (_fa, en) => en,
  // فهرست انتخاب حرکت
  exerciseListAria: "انتخاب حرکت",
  exerciseListTitle: "انتخاب حرکت",
  exerciseCountBadge: (count) => `${localeNumber(count, "fa")} حرکت قابل اجرا`,
  searchPlaceholder: "جست‌وجوی حرکت (فارسی یا انگلیسی)…",
  listLoading: "در حال بارگذاری بانک حرکات…",
  listError: "بارگذاری بانک حرکات ناموفق بود.",
  listRetry: "تلاش مجدد",
  searchEmpty: "حرکتی با این عبارت پیدا نشد.",
  loadMore: (remaining) => `نمایش بیشتر (${remaining} حرکت دیگر)`,
  holdUnit: "زمان نگه‌داشتن",
  // پیش‌نمایش سه‌بعدی در انتخابگر
  previewAction: "نمایش ۳بعدی",
  previewAria: (name) => `مشاهده ${name} در مربی سه‌بعدی`,
  previewTitle: (name) => `پیش‌نمایش سه‌بعدی — ${name}`,
  previewUnavailable:
    "برای این حرکت انیمیشن سه‌بعدی معتبری در دسترس نیست.",
  previewNoteFa:
    "انیمیشن از الگوی حرکتی پارامتری همان حرکت ساخته می‌شود؛ زوایا تقریبی و برای آموزش الگوی کلی است. کنترل کامل پخش در نمای مربی سه‌بعدی در دسترس است.",
  previewNoteEn:
    "The animation is generated from the exercise's parametric movement profile; angles are approximate and meant to teach the overall pattern. Full playback controls are available in the 3D coach view.",
  // جزئیات حرکت
  // کارت اطلاعات الگو
  patternInfoTitle: "الگوی حرکتی سه‌بعدی",
  counterModeLabel: (hold) =>
    hold
      ? "این حرکت ایزومتریک/کششی است؛ به‌جای شمارنده تکرار، زمان نگه‌داشتن نمایش داده می‌شود."
      : "شمارنده تکرار با تکمیل چرخه واقعی حرکت افزایش می‌یابد.",
  contentRefTitle: "راهنمای اجرا",
  contentRefBody:
    "شرح کامل اجرا، تنفس و اشتباهات رایج این حرکت در جزئیات کتابخانه حرکات (دکمه راهنما) نمایش داده می‌شود.",
  detailsAria: (name) => `جزئیات حرکت ${name}`,
  guideTitle: (name) => `راهنمای اجرای ${name}`,
  startPositionTitle: "وضعیت شروع",
  jointsTitle: "مفاصل و بخش‌های درگیر",
  targetMusclesLabel: "عضلات هدف",
  stepsTitle: "مراحل اجرا",
  mistakesTitle: "اشتباهات رایج",
  secondaryMusclesSuffix: "(کمکی)",
  // نقشه‌های نمایشی — فارسی عیناً از داده
  muscleLabel: (id) => muscleFa(id),
  muscleList: (ids) => ids.map((id) => muscleFa(id)).join("، "),
  equipmentLabel: (value) => value,
  jointLabel: (value) => value,
  phaseLabel: (name) => name,
  exerciseContent: (id) => FA_CONTENT[id] ?? EMPTY_CONTENT,
  // پنل عضلات
  musclePanelAria: "عضلات درگیر",
  musclePanelTitle: "عضلات درگیر",
  primaryGroupLabel: "اصلی",
  secondaryGroupLabel: "کمکی",
  manualHighlightTitle: "برجسته‌سازی دستی روی مدل",
  manualHighlightHint: "برای دیدن ناحیه هر گروه روی بدن، روی آن ضربه بزنید.",
  manualPickLabel: "انتخاب دستی",
  muscleDisclaimer:
    "هایلایت عضلات نمایش گرافیکی «عضله هدف تمرین» است و شبیه‌سازی علمی یا اندازه‌گیری فعالیت الکتریکی عضله (EMG) محسوب نمی‌شود.",
  // نوار پخش
  playLabel: "شروع حرکت",
  pauseLabel: "توقف",
  resetAria: "بازگشت به وضعیت اولیه حرکت",
  resetLabel: "بازنشانی",
  speedLabel: "سرعت",
  speedAria: "سرعت انیمیشن",
  speedValue: (speed) => `${localeDecimal(speed, 2, "fa")}×`,
  viewsLabel: "نما:",
  viewButtonLabel: (id) =>
    (({ front: "روبه‌رو", side: "پهلو", back: "پشت" }) as Record<string, string>)[id] ?? id,
  freeViewBadge: "چرخش آزاد",
  musclesToggleAria: "نمایش عضلات هدف روی مدل",
  // HUD صحنه
  hudTechBadge: "مدل پروسیجرال Three.js",
  phaseOf: (current, total) =>
    `(${localeNumber(current, "fa")} از ${localeNumber(total, "fa")})`,
  repsUnit: "تکرار کامل",
  hudSpeedBadge: (speed) => `سرعت ${localeDecimal(speed, 2, "fa")}×`,
};

/* ---------------------------------- انگلیسی ---------------------------------- */

const EN: Coach3DStrings = {
  engineActiveBadge: "3D engine active",
  stageRoadmapLabel: "Stage 2 of the roadmap",
  sceneAria: "Coach 3D scene",
  scenePreparing: "Preparing the 3D scene…",
  scenePreparingHint:
    "Loading the WebGL engine for the first time may take a few moments",
  webglUnsupportedTitle: "Your browser does not support WebGL",
  webglUnsupportedBody:
    "The 3D coach requires WebGL. Please use an up-to-date version of Chrome, Firefox, or Safari, or enable hardware acceleration in your browser.",
  sceneErrorTitle: "Error running the 3D scene",
  sceneErrorBody:
    "WebGL rendering failed. Reload the page or update your browser. The rest of the app keeps working normally.",
  retryButton: "Try again",
  exercisePanelToggleAria: "Toggle the exercise and muscle selection panel",
  exercisePanelToggleLabel: "Choose exercise and muscles",
  transparencySectionAria: "3D coach transparency status",
  transparencyTitle: "Technical status of this version — transparency",
  transparencyProcedural: {
    pre: "The body model is ",
    bold: "procedural",
    post: " (built from proportionally-scaled geometry with connected joints); in later stages it may be replaced with a rigged GLB model with a standard skeleton and professional animations. The exercise data structure is designed for exactly that replacement.",
  },
  transparencyRepCounter: {
    pre: "The rep counter increments with ",
    bold: "each completed exercise cycle",
    post: " (not per frame or click); in the lunge, each cycle includes one left and one right lunge. Push-up and lunge joint angles are approximate and meant to teach the movement pattern.",
  },
  transparencyMuscleHighlight:
    "The muscle highlight is a graphic representation of the \"target muscles\" and makes no claim of scientific simulation or EMG measurement. Every exercise in the bank is animated through parametric movement profiles derived from its real data (name, equipment, muscles, exercise type); joint angles are approximate.",
  // Exercise names — data is bilingual; English shows the English name
  exerciseName: (_fa, en) => en || _fa,
  exerciseAltName: (fa) => fa,
  // Exercise list
  exerciseListAria: "Choose exercise",
  exerciseListTitle: "Choose exercise",
  exerciseCountBadge: (count) => `${count} playable exercises`,
  searchPlaceholder: "Search exercises (English or Persian)…",
  listLoading: "Loading the exercise bank…",
  listError: "Failed to load the exercise bank.",
  listRetry: "Try again",
  searchEmpty: "No exercises match this query.",
  loadMore: (remaining) => `Load more (${remaining} remaining)`,
  holdUnit: "hold time",
  // 3D preview in picker
  previewAction: "3D preview",
  previewAria: (name) => `View ${name} in the 3D coach`,
  previewTitle: (name) => `3D preview — ${name}`,
  previewUnavailable:
    "No valid 3D animation is available for this exercise.",
  previewNoteFa:
    "انیمیشن از الگوی حرکتی پارامتری همان حرکت ساخته می‌شود؛ زوایا تقریبی و برای آموزش الگوی کلی است. کنترل کامل پخش در نمای مربی سه‌بعدی در دسترس است.",
  previewNoteEn:
    "The animation is generated from the exercise's parametric movement profile; angles are approximate and meant to teach the overall pattern. Full playback controls are available in the 3D coach view.",
  // Exercise details
  // Profile info card
  patternInfoTitle: "3D movement profile",
  counterModeLabel: (hold) =>
    hold
      ? "This is an isometric/stretch pattern; hold time is displayed instead of a rep counter."
      : "The rep counter increments with each completed exercise cycle.",
  contentRefTitle: "Execution guide",
  contentRefBody:
    "Full execution steps, breathing and common mistakes are shown in the exercise library details (guide button).",
  detailsAria: (name) => `Exercise details: ${name}`,
  guideTitle: (name) => `How to perform ${name}`,
  startPositionTitle: "Starting position",
  jointsTitle: "Joints and body parts involved",
  targetMusclesLabel: "Target muscles",
  stepsTitle: "Execution steps",
  mistakesTitle: "Common mistakes",
  secondaryMusclesSuffix: "(secondary)",
  // Display maps — English translations over stable data keys
  muscleLabel: (id) => muscleEn(id),
  muscleList: (ids) => ids.map((id) => muscleEn(id)).join(", "),
  equipmentLabel: (value) => EN_EQUIPMENT_LABELS[value] ?? value,
  jointLabel: (value) => EN_JOINT_LABELS[value] ?? value,
  phaseLabel: (name) => EN_PHASE_NAMES[name] ?? name,
  exerciseContent: (id) => EN_CONTENT[id] ?? FA_CONTENT[id] ?? EMPTY_CONTENT,
  // Muscle panel
  musclePanelAria: "Engaged muscles",
  musclePanelTitle: "Engaged muscles",
  primaryGroupLabel: "Primary",
  secondaryGroupLabel: "Secondary",
  manualHighlightTitle: "Manual highlight on the model",
  manualHighlightHint: "Tap a group to see its area on the body.",
  manualPickLabel: "Manual pick",
  muscleDisclaimer:
    "The muscle highlight is a graphic representation of the exercise's \"target muscle\" and is not a scientific simulation or a measurement of the muscle's electrical activity (EMG).",
  // Playback bar
  playLabel: "Start exercise",
  pauseLabel: "Pause",
  resetAria: "Return the exercise to its starting position",
  resetLabel: "Reset",
  speedLabel: "Speed",
  speedAria: "Animation speed",
  speedValue: (speed) => `${localeDecimal(speed, 2, "en")}×`,
  viewsLabel: "View:",
  viewButtonLabel: (id) =>
    (({ front: "Front", side: "Side", back: "Back" }) as Record<string, string>)[id] ?? id,
  freeViewBadge: "Free rotation",
  musclesToggleAria: "Show target muscles on the model",
  // Scene HUD
  hudTechBadge: "Procedural Three.js model",
  phaseOf: (current, total) => `(${current} of ${total})`,
  repsUnit: "full reps",
  hudSpeedBadge: (speed) => `Speed ${localeDecimal(speed, 2, "en")}×`,
};

const STRINGS: Record<Locale, Coach3DStrings> = { fa: FA, en: EN };

export function coach3DStrings(locale: Locale): Coach3DStrings {
  return STRINGS[locale];
}
