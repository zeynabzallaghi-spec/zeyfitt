/**
 * دیکشنری خانواده برنامه تمرینی — برنامه‌ساز، جزئیات برنامه، پیش‌نمایش،
 * فرم تنظیمات، رکوردر جلسه واقعی، آمار و تاریخچه.
 *
 * الگو دقیقاً مطابق sections/shell.ts است: اینترفیس تایپ‌شده + دیکشنری
 * کامل فارسی (متن‌ها عیناً همان متن‌های فعلی اپ، با حفظ نیم‌فاصله) +
 * دیکشنری انگلیسی (ترجمه طبیعی و کامل) + Record<Locale, X> + getter.
 *
 * نقشه‌های نمایشی داده‌های پایدار (هدف/سطح برنامه، دسته و تجهیزات بانک
 * حرکات، تمرکز، دشواری و عضله) هم اینجاست؛ داده اصلی بدون تغییر می‌ماند
 * و فقط «نمایش» دوزبانه می‌شود. عنوان برنامه‌ها، یادداشت‌ها، نام حرکات
 * snapshot‌شده و برچسب تمرکزِ ذخیره‌شده «داده»اند و به همان زبان ثبت‌شده
 * نمایش داده می‌شوند.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";
import { EQUIPMENT_TYPES, EXERCISE_CATEGORIES } from "../../exercises/types";
import type { EquipmentId, ExerciseCategoryId } from "../../exercises/types";
import { muscleFa, muscleEn } from "../../fitness3d/muscles";
import type { MuscleGroupId } from "../../fitness3d/types";

/* ------------------------- نقشه‌های نمایشی داده ------------------------- */

const CATEGORY_FA = new Map(EXERCISE_CATEGORIES.map((c) => [c.id, c.fa]));
const CATEGORY_EN = new Map(EXERCISE_CATEGORIES.map((c) => [c.id, c.en]));
const EQUIPMENT_FA = new Map(EQUIPMENT_TYPES.map((e) => [e.id, e.fa]));
const EQUIPMENT_EN = new Map(EQUIPMENT_TYPES.map((e) => [e.id, e.en]));

export interface WorkoutStrings {
  /* ------------------------------ مشترک ------------------------------ */
  cancel: string;
  retry: string;
  refresh: string;
  networkFailed: string;
  deleteAction: string;
  /** برچسب وضعیت جلسه — روی value پایدار */
  statusLabel: (status: "in_progress" | "completed" | "abandoned") => string;
  doneLabel: string;
  skippedLabel: string;
  /** برچسب روزهای هفته به ترتیب برنامه (۰ = شنبه) */
  weekDayLabels: string[];
  /** پیوست فهرست برچسب‌ها با جداکننده متناسب با زبان */
  joinList: (labels: string[]) => string;
  minutesUnit: (n: number) => string;
  kilograms: string;
  /* نقشه‌های نمایشی روی مقدار پایدار */
  planGoalLabel: (value: string) => string;
  planExperienceLabel: (value: string) => string;
  focusName: (focus: string) => string;
  categoryName: (id: string) => string;
  equipmentName: (id: string) => string;
  difficultyName: (value: string) => string;
  muscleName: (id: string) => string;

  /* --------------------------- workout-view --------------------------- */
  statusActive: string;
  statusArchivedPlan: string;
  planSummaryLine: (days: number, exercises: number, goal: string, experience: string) => string;
  viewPlan: string;
  activate: string;
  anotherSessionToast: string;
  planSessionStartedToast: string;
  freeSessionStartedToast: string;
  planSavedToast: string;
  planActivatedToast: string;
  planArchivedToast: string;
  planDeletedToast: string;
  startTrainingAria: string;
  startTrainingTitle: string;
  startTrainingIntro: string;
  busyButton: string;
  freeWorkoutButton: string;
  activeSessionNote: string;
  activePlanAria: string;
  activePlanHeading: (title: string) => string;
  archiveAction: string;
  emptyTitle: string;
  emptyDescription: string;
  createPlan: string;
  noActiveNote: string;
  historyLink: string;
  previousPlansAria: string;
  previousPlansTitle: string;
  newPlan: string;
  planFormAria: string;
  planSettingsTitle: string;
  stepOne: string;
  planPreviewAria: string;
  planPreviewTitle: string;
  stepTwo: string;
  deletePlanTitle: string;
  deletePlanDescription: (title: string) => string;
  deletePlanAction: string;

  /* ---------------------------- plan-detail ---------------------------- */
  setsRepsLine: (sets: number, repsMin: number, repsMax: number) => string;
  restSecondsLine: (seconds: number) => string;
  approxMinutes: (minutes: number) => string;
  exercisesCount: (n: number) => string;
  commonMistake: (mistake: string) => string;
  snapshotWarning: string;
  coach3d: string;
  libraryDetails: string;
  anotherSessionRunning: string;
  starting: string;
  startThisDay: string;
  startDayNote: string;
  daysPerWeekBadge: (n: number) => string;
  minutesPerSession: (n: number) => string;
  cautionNotesLine: (notes: string) => string;
  guidanceTitle: string;

  /* ---------------------------- plan-preview ---------------------------- */
  previewNotSaved: string;
  goalChip: (value: string) => string;
  levelChip: (value: string) => string;
  focusChip: (value: string) => string;
  sessionsExercisesLine: (sessions: number, exercises: number) => string;
  equipmentChip: (ids: string[]) => string;
  freeDay: string;
  setsRepsCompact: (sets: number, repsMin: number, repsMax: number) => string;
  executionGuideTitle: string;
  saving: string;
  saveAndActivate: string;
  backToSettings: string;
  saveActivateNote: string;

  /* ------------------------- plan-settings-form ------------------------- */
  goalSection: string;
  trainingGoalLabel: string;
  experienceLevelLabel: string;
  defaultsNote: string;
  weeklyVolumeSection: string;
  daysPerWeekLabel: string;
  daysChip: (n: number) => string;
  minutesChip: (n: number) => string;
  sessionMinutesLabel: string;
  preferredDaysLabel: (n: number) => string;
  equipmentSection: string;
  equipmentNote: string;
  kettlebellNote: string;
  focusSection: string;
  limitationsSection: string;
  excludedCategoriesLabel: string;
  cautionNotesLabel: string;
  cautionPlaceholder: string;
  medicalDisclaimer: string;
  buildingPreview: string;
  buildPreview: string;

  /* --------------------------- active-session --------------------------- */
  savedToServer: string;
  notSaved: string;
  unsavedMark: string;
  repsLabel: string;
  bodyweightLabel: string;
  setRepsAria: (setNumber: number) => string;
  setWeightAria: (setNumber: number) => string;
  deleteSetAria: (setNumber: number) => string;
  repsInvalidSet: (setNumber: number) => string;
  weightRangeSet: (setNumber: number) => string;
  newSetRepsInvalid: string;
  weightRange: string;
  setLoggedToast: (setNumber: number, name: string) => string;
  musclesLine: (list: string) => string;
  planTargetSets: (sets: number) => string;
  planTargetReps: (repsMin: number, repsMax: number) => string;
  suggestedRest: (seconds: number) => string;
  bodyweightNoLoad: string;
  no3d: string;
  guide: string;
  skipAction: string;
  noSetsYet: string;
  repsPlaceholder: string;
  optionalWeightPlaceholder: (unit: string) => string;
  newSetRepsAria: string;
  newSetWeightAria: string;
  logSet: string;
  addSet: (label: string) => string;
  deleteSetDialogTitle: string;
  deleteSetDialogDescription: string;
  deleteSetAction: string;
  sessionClosedTitle: (title: string) => string;
  closedStatusLine: (status: string) => string;
  workoutCompleteToast: string;
  abandonedToast: string;
  recorderAria: string;
  recorderHeading: (title: string) => string;
  finishWorkout: string;
  startedAtLine: (date: string) => string;
  elapsedLine: (minutes: number) => string;
  progressLine: (done: number, total: number, sets: number) => string;
  persistedNote: string;
  saveErrorBanner: string;
  addFromLibrary: string;
  abandonHint: string;
  abandonAction: string;
  finishCompleteTitle: string;
  finishCompleteDesc: string;
  finishAbandonDesc: string;
  summaryTitle: string;
  summaryExercisesLine: (done: number, total: number) => string;
  summarySkippedSuffix: (skipped: number) => string;
  summarySetsLine: (sets: number) => string;
  summaryRepsLine: (reps: number) => string;
  summaryDurationLine: (minutes: number) => string;
  summaryVolumeLine: (volumeKg: number) => string;
  unloggedWarning: (count: number) => string;
  finishNotesPlaceholder: string;
  finishNotesAria: string;
  backToSession: string;
  recording: string;
  completeAction: string;
  abandonConfirmAction: string;
  exerciseAddedToast: string;

  /* ---------------------------- session-stats ---------------------------- */
  statsAria: string;
  statsTitle: string;
  thisWeekTitle: string;
  iranCalendarNote: string;
  emptyWeek: string;
  weekCompletedLabel: string;
  weekSetsLabel: string;
  weekRepsLabel: string;
  weekDurationLabel: string;
  trendTitle: string;
  trendSubtitle: string;
  zeroWeeksNote: string;
  totalsTitle: string;
  emptyTotals: string;
  totalsCompleted: string;
  totalsAbandoned: string;
  totalsSets: string;
  totalsReps: string;
  totalsDuration: string;
  totalsVolume: string;
  volumeExplainer: string;
  singleExerciseTitle: string;
  singleExerciseIntro: string;
  progressReadFailed: string;
  pickerAria: string;
  pickerPlaceholder: string;
  clearPicker: string;
  bestWeightLabel: string;
  insufficientData: string;
  noExternalLoad: string;
  onDate: (date: string) => string;
  bestRepsLabel: string;
  repsUnit: string;
  historyRowLine: (sets: number, reps: number) => string;
  bestWeightSuffix: (weightKg: number) => string;
  bodyweightRowSuffix: string;
  emptyExerciseTrend: string;

  /* ------------------------- add-exercise-dialog ------------------------- */
  addExerciseDescription: string;
  capacityLine: (remaining: number, max: number) => string;
  searchPlaceholder: (count: number) => string;
  /** منبع حرکت در انتخابگر (مرحله ۱۹.۶) — بانک عمومی یا شخصی */
  sourceLabel: (source: "public" | "personal") => string;
  personalEmptyNote: string;
  allCategories: string;
  searchAria: string;
  noResults: string;
  has3d: string;
  addToSessionAria: (name: string) => string;
  addAction: string;

  /* -------------------------- start-free-dialog -------------------------- */
  startFreeTitle: string;
  startFreeDescription: (count: number, max: number) => string;
  freeSearchPlaceholder: string;
  freeSearchAria: string;
  pickAction: string;
  unpickAction: string;
  pickAria: (verb: string, name: string) => string;
  minOneError: string;
  selectedCount: (n: number) => string;

  /* --------------------------- session-history --------------------------- */
  historyTitle: string;
  sessionCount: (n: number) => string;
  filterAll: string;
  detailReadFailed: string;
  noExercisesInSession: string;
  skippedShort: string;
  setLine: (setNumber: number, reps: number) => string;
  setWeightSuffix: (weightKg: number) => string;
  bodyweightSetSuffix: string;
  noSetsLogged: string;
  exercisesFraction: (done: number, total: number) => string;
  setsLine: (sets: number) => string;
  repsLine: (reps: number) => string;
  volumeLine: (volumeKg: number) => string;
  abandonedRowNote: string;
  inProgressRowNote: string;
  computedNote: string;
  emptyAll: string;
  emptyFiltered: (statusLabel: string) => string;
  emptyHowTo: string;
  completedCountNote: (completed: number) => string;
  deleteSessionTitle: string;
  deleteSessionDescription: (title: string, date: string) => string;
  sessionDeletedToast: string;
  deleteSessionAction: string;
}

const FA: WorkoutStrings = {
  /* ------------------------------ مشترک ------------------------------ */
  cancel: "انصراف",
  retry: "تلاش مجدد",
  refresh: "به‌روزرسانی",
  networkFailed: "ارتباط با سرور برقرار نشد.",
  deleteAction: "حذف",
  statusLabel: (status) =>
    ({ in_progress: "در حال انجام", completed: "تکمیل‌شده", abandoned: "رهاشده" } as Record<string, string>)[status] ?? status,
  doneLabel: "انجام شد",
  skippedLabel: "رد شد",
  weekDayLabels: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"],
  joinList: (labels) => labels.join("، "),
  minutesUnit: (n) => `${localeNumber(n, "fa")} دقیقه`,
  kilograms: "کیلوگرم",
  planGoalLabel: (value) =>
    (
      {
        fat_loss: "کاهش چربی",
        muscle_gain: "عضله‌سازی",
        strength: "افزایش قدرت",
        maintain: "حفظ وزن",
        fitness: "آمادگی جسمانی",
      } as Record<string, string>
    )[value] ?? value,
  planExperienceLabel: (value) =>
    ({ beginner: "مبتدی", intermediate: "متوسط", advanced: "پیشرفته" } as Record<string, string>)[value] ?? value,
  focusName: (focus) =>
    (
      {
        all: "کل بدن",
        upper: "بالاتنه",
        lower: "پایین‌تنه",
      } as Record<string, string>
    )[focus] ?? CATEGORY_FA.get(focus as ExerciseCategoryId) ?? focus,
  categoryName: (id) => CATEGORY_FA.get(id as ExerciseCategoryId) ?? id,
  equipmentName: (id) => EQUIPMENT_FA.get(id as EquipmentId) ?? id,
  difficultyName: (value) =>
    ({ "مبتدی": "مبتدی", "متوسط": "متوسط", "پیشرفته": "پیشرفته" } as Record<string, string>)[value] ?? value,
  muscleName: (id) => muscleFa(id as MuscleGroupId),

  /* --------------------------- workout-view --------------------------- */
  statusActive: "فعال",
  statusArchivedPlan: "بایگانی",
  planSummaryLine: (days, exercises, goal, experience) =>
    `${localeNumber(days, "fa")} روز — ${localeNumber(exercises, "fa")} حرکت — ${goal} — ${experience}`,
  viewPlan: "مشاهده برنامه",
  activate: "فعال‌سازی",
  anotherSessionToast: "جلسه دیگری در حال انجام است؛ همان ادامه یافت",
  planSessionStartedToast: "جلسه تمرین شروع شد — ست‌ها را پس از انجام واقعی ثبت کنید",
  freeSessionStartedToast: "تمرین آزاد شروع شد — ست‌ها را پس از انجام واقعی ثبت کنید",
  planSavedToast: "برنامه تمرینی ذخیره و فعال شد",
  planActivatedToast: "برنامه فعال شد؛ برنامه فعال قبلی بایگانی شد",
  planArchivedToast: "برنامه بایگانی شد",
  planDeletedToast: "برنامه حذف شد",
  startTrainingAria: "شروع تمرین",
  startTrainingTitle: "شروع تمرین",
  startTrainingIntro:
    "جلسه واقعی با اقدام شما ساخته می‌شود؛ ست‌های انجام‌شده را همان‌جا ثبت کنید. بازدید از برنامه هرگز جلسه حساب نمی‌شود.",
  busyButton: "جلسه فعالی دارید",
  freeWorkoutButton: "تمرین آزاد",
  activeSessionNote:
    "یک جلسه در حال انجام دارید؛ تا پایان یا رهاکردن آن، جلسه جدیدی شروع نمی‌شود. رکوردر بالای همین صفحه آماده است.",
  activePlanAria: "برنامه فعال",
  activePlanHeading: (title) => `برنامه فعال: ${title}`,
  archiveAction: "بایگانی",
  emptyTitle: "هنوز برنامه تمرینی نساخته‌اید",
  emptyDescription:
    "برنامه‌ساز بر اساس هدف، سطح تجربه، تجهیزات و روزهای شما — و از بانک ۴۸ حرکتی واقعی — برنامه هفتگی ساختاریافته می‌سازد. تا آن زمان می‌توانید با «تمرین آزاد» جلسه واقعی ثبت کنید.",
  createPlan: "ساخت برنامه شخصی",
  noActiveNote: "برنامه فعالی ندارید؛ یکی از برنامه‌های بایگانی را فعال کنید یا برنامه جدیدی بسازید.",
  historyLink: "تاریخچه و تحلیل پیشرفت",
  previousPlansAria: "برنامه‌های قبلی",
  previousPlansTitle: "برنامه‌های قبلی",
  newPlan: "ساخت برنامه جدید",
  planFormAria: "تنظیمات برنامه جدید",
  planSettingsTitle: "تنظیمات برنامه",
  stepOne: "گام ۱ از ۲",
  planPreviewAria: "پیش‌نمایش برنامه",
  planPreviewTitle: "پیش‌نمایش برنامه",
  stepTwo: "گام ۲ از ۲",
  deletePlanTitle: "حذف برنامه تمرینی",
  deletePlanDescription: (title) =>
    `برنامه «${title}» برای همیشه حذف می‌شود و قابل بازگشت نیست. اگر این برنامه فعال است، پس از حذف برنامه فعالی باقی نمی‌ماند. جلسات واقعی ثبت‌شده شما با حذف برنامه حذف نمی‌شوند.`,
  deletePlanAction: "حذف برنامه",

  /* ---------------------------- plan-detail ---------------------------- */
  setsRepsLine: (sets, repsMin, repsMax) =>
    `${localeNumber(sets, "fa")} ست × ${localeNumber(repsMin, "fa")}–${localeNumber(repsMax, "fa")} تکرار`,
  restSecondsLine: (seconds) => `استراحت ${localeNumber(seconds, "fa")} ثانیه`,
  approxMinutes: (minutes) => `~${localeNumber(minutes, "fa")} دقیقه`,
  exercisesCount: (n) => `${localeNumber(n, "fa")} حرکت`,
  commonMistake: (mistake) => `خطای رایج: ${mistake}`,
  snapshotWarning:
    "این حرکت در نسخه فعلی بانک حرکات یافت نشد؛ اطلاعات از snapshot برنامه نمایش داده می‌شود.",
  coach3d: "مربی سه‌بعدی",
  libraryDetails: "جزئیات در کتابخانه",
  anotherSessionRunning: "جلسه دیگری در حال انجام است",
  starting: "در حال شروع…",
  startThisDay: "شروع تمرین این جلسه",
  startDayNote:
    "شروع تمرین یک جلسه واقعی در سرور می‌سازد؛ بازدید از برنامه هرگز جلسه حساب نمی‌شود.",
  daysPerWeekBadge: (n) => `${localeNumber(n, "fa")} روز در هفته`,
  minutesPerSession: (n) => `~${localeNumber(n, "fa")} دقیقه هر جلسه`,
  cautionNotesLine: (notes) => `یادداشت احتیاطی شما: ${notes}`,
  guidanceTitle: "راهنمای اجرای برنامه",

  /* ---------------------------- plan-preview ---------------------------- */
  previewNotSaved: "پیش‌نمایش — هنوز ذخیره نشده است",
  goalChip: (value) => `هدف: ${FA.planGoalLabel(value)}`,
  levelChip: (value) => `سطح: ${FA.planExperienceLabel(value)}`,
  focusChip: (value) => `تمرکز: ${FA.focusName(value)}`,
  sessionsExercisesLine: (sessions, exercises) =>
    `${localeNumber(sessions, "fa")} جلسه — ${localeNumber(exercises, "fa")} حرکت`,
  equipmentChip: (ids) => `تجهیزات: ${ids.map((id) => FA.equipmentName(id)).join("، ")}`,
  freeDay: "روز آزاد",
  setsRepsCompact: (sets, repsMin, repsMax) =>
    `${localeNumber(sets, "fa")}×${localeNumber(repsMin, "fa")}–${localeNumber(repsMax, "fa")}`,
  executionGuideTitle: "راهنمای اجرا",
  saving: "در حال ذخیره…",
  saveAndActivate: "ذخیره و فعال‌سازی برنامه",
  backToSettings: "بازگشت به تنظیمات",
  saveActivateNote:
    "با ذخیره، این برنامه «فعال» می‌شود و برنامه فعال قبلی (در صورت وجود) به‌صورت خودکار بایگانی می‌گردد.",

  /* ------------------------- plan-settings-form ------------------------- */
  goalSection: "هدف و سطح",
  trainingGoalLabel: "هدف تمرینی",
  experienceLevelLabel: "سطح تجربه",
  defaultsNote:
    "مقادیر پیش‌فرض از پروفایل شما خوانده شده‌اند؛ می‌توانید فقط برای همین برنامه تغییرشان دهید.",
  weeklyVolumeSection: "حجم هفتگی",
  daysPerWeekLabel: "تعداد روز تمرین در هفته",
  daysChip: (n) => `${localeNumber(n, "fa")} روز`,
  minutesChip: (n) => `${localeNumber(n, "fa")} دقیقه`,
  sessionMinutesLabel: "مدت هر جلسه",
  preferredDaysLabel: (n) => `روزهای ترجیحی (اختیاری — حداکثر ${localeNumber(n, "fa")} روز)`,
  equipmentSection: "تجهیزات در دسترس",
  equipmentNote:
    "حرکتی فقط زمانی انتخاب می‌شود که همه تجهیزات لازمش را داشته باشید؛ اگر نیمکت در دسترس دارید حتماً آن را هم انتخاب کنید.",
  kettlebellNote:
    "توجه: کتل‌بل در پروفایل شما ثبت شده اما فعلاً حرکت کتل‌بلی در بانک حرکات موجود نیست و در برنامه لحاظ نمی‌شود.",
  focusSection: "تمرکز برنامه (اختیاری)",
  limitationsSection: "محدودیت‌ها (اختیاری)",
  excludedCategoriesLabel: "دسته‌هایی که نمی‌خواهید در برنامه باشند",
  cautionNotesLabel: "یادداشت احتیاطی (درد، آسیب یا نکته‌ای که مربی باید بداند)",
  cautionPlaceholder: "مثلاً: هنگام اسکوات زانویم اذیت می‌شود",
  medicalDisclaimer:
    "این یادداشت فقط به‌عنوان ورودی احتیاطی در برنامه نمایش داده می‌شود؛ تشخیص پزشکی یا برنامه توان‌بخشی نیست. برای درد یا آسیب با پزشک یا فیزیوتراپیست واجد صلاحیت مشورت کنید.",
  buildingPreview: "در حال ساخت پیش‌نمایش…",
  buildPreview: "ساخت پیش‌نمایش برنامه",

  /* --------------------------- active-session --------------------------- */
  savedToServer: "ذخیره شد در سرور",
  notSaved: "ذخیره نشد",
  unsavedMark: "ذخیره نشده",
  repsLabel: "تکرار",
  bodyweightLabel: "وزن بدن",
  setRepsAria: (setNumber) => `تعداد تکرار ست ${localeNumber(setNumber, "fa")}`,
  setWeightAria: (setNumber) =>
    `وزنه ست ${localeNumber(setNumber, "fa")} به کیلوگرم — خالی یعنی بدون بار خارجی`,
  deleteSetAria: (setNumber) => `حذف ست ${localeNumber(setNumber, "fa")}`,
  repsInvalidSet: (setNumber) => `تعداد تکرار ست ${localeNumber(setNumber, "fa")} معتبر نیست`,
  weightRangeSet: (setNumber) => `وزنه ست ${localeNumber(setNumber, "fa")} باید بین ۰ تا ۵۰۰ کیلوگرم باشد`,
  newSetRepsInvalid: "تعداد تکرار ست جدید معتبر نیست",
  weightRange: "وزنه باید بین ۰ تا ۵۰۰ کیلوگرم باشد",
  setLoggedToast: (setNumber, name) => `ست ${localeNumber(setNumber, "fa")} «${name}» ثبت شد`,
  musclesLine: (list) => `عضلات: ${list}`,
  planTargetSets: (sets) => `هدف برنامه: ${localeNumber(sets, "fa")} ست`,
  planTargetReps: (repsMin, repsMax) => ` × ${localeNumber(repsMin, "fa")}–${localeNumber(repsMax, "fa")} تکرار`,
  suggestedRest: (seconds) => `استراحت پیشنهادی ${localeNumber(seconds, "fa")} ثانیه`,
  bodyweightNoLoad: "وزن بدن — بدون بار خارجی",
  no3d: "نمایش سه‌بعدی در دسترس نیست",
  guide: "راهنما",
  skipAction: "رد کردن",
  noSetsYet: "هنوز ست‌ای از این حرکت ثبت نشده — اولین ست را با دکمه زیر اضافه کنید.",
  repsPlaceholder: "تکرار",
  optionalWeightPlaceholder: (unit) => `${unit} (اختیاری)`,
  newSetRepsAria: "تعداد تکرار ست جدید",
  newSetWeightAria: "وزنه ست جدید به کیلوگرم — خالی یعنی بدون بار خارجی",
  logSet: "ثبت ست",
  addSet: (label) => `افزودن ست ${label}`,
  deleteSetDialogTitle: "حذف ست ثبت‌شده",
  deleteSetDialogDescription:
    "این ست از رکورد جلسه حذف می‌شود. حذف یعنی این ست واقعاً انجام‌نشده حساب خواهد شد.",
  deleteSetAction: "حذف ست",
  sessionClosedTitle: (title) => `جلسه «${title}» بسته شد`,
  closedStatusLine: (status) =>
    `وضعیت: ${status} — تاریخچه و آمار در بخش «پیشرفت من» به‌روز شد.`,
  workoutCompleteToast: "تمرین تکمیل شد و در تاریخچه ثبت گردید",
  abandonedToast: "جلسه به‌عنوان «رهاشده» ثبت شد",
  recorderAria: "جلسه در حال انجام",
  recorderHeading: (title) => `جلسه در حال انجام: ${title}`,
  finishWorkout: "پایان تمرین",
  startedAtLine: (date) => `شروع: ${date}`,
  elapsedLine: (minutes) =>
    `مدت تا این لحظه: ${localeNumber(minutes, "fa")} دقیقه (از زمان شروع ثبت‌شده در سرور)`,
  progressLine: (done, total, sets) =>
    `${localeNumber(done, "fa")} از ${localeNumber(total, "fa")} حرکت — ${localeNumber(sets, "fa")} ست`,
  persistedNote:
    "این جلسه واقعاً در پایگاه داده سرور ثبت شده است؛ با رفرش صفحه یا بستن مرورگر از بین نمی‌رود و دوباره همین‌جا بازیابی می‌شود.",
  saveErrorBanner:
    "ذخیره برخی ست‌ها ناموفق بود؛ داده‌ها حذف نشده و هیچ موفقیتی جعل نشده است. پس از بازگشت اتصال، «تلاش مجدد» را بزنید.",
  addFromLibrary: "افزودن حرکت از کتابخانه",
  abandonHint:
    "اگر امروز ادامه ندادید، جلسه را «رهاکردن» کنید؛ رهاشده با تکمیل‌شده یکی نیست و در تاریخچه و آمار جدا شمرده می‌شود.",
  abandonAction: "رهاکردن جلسه",
  finishCompleteTitle: "پایان و تکمیل تمرین",
  finishCompleteDesc:
    "جلسه با وضعیت «تکمیل‌شده» ثبت می‌شود؛ حتی اگر همه حرکات انجام نشده باشند، موارد ناقص صادقانه در همان حالت می‌مانند.",
  finishAbandonDesc:
    "جلسه با وضعیت «رهاشده» ثبت می‌شود و در آمار «جلسات تکمیل‌شده» شمرده نمی‌شود.",
  summaryTitle: "خلاصه این جلسه",
  summaryExercisesLine: (done, total) =>
    `حرکات: ${localeNumber(done, "fa")} انجام‌شده از ${localeNumber(total, "fa")}`,
  summarySkippedSuffix: (skipped) => ` — ${localeNumber(skipped, "fa")} ردشده`,
  summarySetsLine: (sets) => `ست‌های ثبت‌شده واقعی: ${localeNumber(sets, "fa")}`,
  summaryRepsLine: (reps) => `مجموع تکرارها: ${localeNumber(reps, "fa")}`,
  summaryDurationLine: (minutes) => `مدت تا این لحظه: ${localeNumber(minutes, "fa")} دقیقه`,
  summaryVolumeLine: (volumeKg) =>
    `حجم ثبت‌شده (فقط ست‌های با بار خارجی): ${localeNumber(volumeKg, "fa")} کیلوگرم`,
  unloggedWarning: (count) => `${localeNumber(count, "fa")} حرکت بدون ثبت ست باقی مانده است.`,
  finishNotesPlaceholder: "یادداشت اختیاری درباره این جلسه (حداکثر ۵۰۰ کاراکتر)",
  finishNotesAria: "یادداشت پایان جلسه",
  backToSession: "بازگشت به جلسه",
  recording: "در حال ثبت…",
  completeAction: "تکمیل تمرین",
  abandonConfirmAction: "ثبت به‌عنوان رهاشده",
  exerciseAddedToast: "حرکت به جلسه اضافه شد",

  /* ---------------------------- session-stats ---------------------------- */
  statsAria: "تحلیل پیشرفت تمرینی",
  statsTitle: "تحلیل پیشرفت تمرینی",
  thisWeekTitle: "این هفته (شنبه تا امروز)",
  iranCalendarNote: "محاسبه با تقویم رسمی ایران",
  emptyWeek:
    "این هفته هنوز جلسه تکمیل‌شده‌ای ندارید. جلسه فقط پس از «پایان تمرین» صریح شما تکمیل‌شده حساب می‌شود.",
  weekCompletedLabel: "جلسات تکمیل‌شده",
  weekSetsLabel: "ست‌های ثبت‌شده",
  weekRepsLabel: "مجموع تکرارها",
  weekDurationLabel: "مجموع مدت",
  trendTitle: "روند ۶ هفته اخیر",
  trendSubtitle: "تعداد جلسات تکمیل‌شده در هر هفته",
  zeroWeeksNote: "هفته‌های بدون جلسه صفر واقعی‌اند؛ هیچ داده‌ای پر کردن نشده است.",
  totalsTitle: "مجموع یک سال اخیر",
  emptyTotals:
    "هنوز جلسه تکمیل‌شده‌ای ثبت نشده است؛ با اولین جلسه کامل‌شده، مجموع‌ها و روندها همین‌جا ساخته می‌شوند.",
  totalsCompleted: "تکمیل‌شده",
  totalsAbandoned: "رهاشده",
  totalsSets: "ست‌ها",
  totalsReps: "تکرارها",
  totalsDuration: "مدت کل",
  totalsVolume: "حجم (بار خارجی)",
  volumeExplainer:
    "«حجم تمرین» = مجموع (تکرار × وزنه) فقط برای ست‌های دارای بار خارجی ثبت‌شده؛ ست‌های وزن بدن در آن وارد نمی‌شوند و وزن بدن کاربر هرگز با وزنه تمرینی جمع نمی‌شود. حجم با حرکات وزن بدن مقایسه‌پذیر نیست و جمع وزنه‌های حرکات مختلف سنجه علمی قدرت نیست — این عدد فقط برای پیگیری روند شخصی شماست.",
  singleExerciseTitle: "روند یک حرکت مشخص",
  singleExerciseIntro:
    "مقایسه فقط بین جلسات تکمیل‌شده انجام می‌شود؛ رکورد وزنه فقط با حداقل دو جلسه دارای ثبت وزنه معنا پیدا می‌کند.",
  progressReadFailed: "خواندن روند حرکت ممکن نشد؛ دوباره تلاش کنید.",
  pickerAria: "انتخاب حرکت برای مشاهده روند",
  pickerPlaceholder: "انتخاب حرکت از بانک حرکات",
  clearPicker: "پاک‌کردن",
  bestWeightLabel: "بهترین وزنه ثبت‌شده",
  insufficientData: "داده کافی نیست",
  noExternalLoad: "بدون بار خارجی ثبت شده — فقط تکرار سنجه دارد",
  onDate: (date) => `در ${date}`,
  bestRepsLabel: "بیشترین تکرار یک ست",
  repsUnit: "تکرار",
  historyRowLine: (sets, reps) => `${localeNumber(sets, "fa")} ست — ${localeNumber(reps, "fa")} تکرار`,
  bestWeightSuffix: (weightKg) => ` — بهترین وزنه ${localeNumber(weightKg, "fa")} کیلوگرم`,
  bodyweightRowSuffix: " — وزن بدن",
  emptyExerciseTrend:
    "این حرکت هنوز در هیچ جلسه تکمیل‌شده‌ای ثبت نشده است. حرکات رهاشده یا ناتمام در روند پیشرفت وارد نمی‌شوند.",

  /* ------------------------- add-exercise-dialog ------------------------- */
  addExerciseDescription:
    "فقط حرکات واقعی بانک حرکات قابل انتخاب هستند؛ انتخاب‌ها مستقیماً به جلسه باز شما اضافه می‌شوند.",
  capacityLine: (remaining, max) =>
    ` ظرفیت باقی‌مانده: ${localeNumber(remaining, "fa")} از حداکثر ${localeNumber(max, "fa")} حرکت جلسه.`,
  searchPlaceholder: (count) => `جست‌وجو در ${localeNumber(count, "fa")} حرکت — فارسی یا انگلیسی`,
  sourceLabel: (source) => (source === "public" ? "بانک عمومی" : "حرکات شخصی من"),
  personalEmptyNote: "هنوز حرکت شخصی ندارید؛ از بخش «بانک حرکات شخصی» پنل مربی بسازید.",
  allCategories: "همه دسته‌ها",
  searchAria: "جست‌وجوی حرکت",
  noResults: "حرکتی با این جست‌وجو یافت نشد.",
  has3d: "سه‌بعدی دارد",
  addToSessionAria: (name) => `افزودن ${name} به جلسه`,
  addAction: "افزودن",

  /* -------------------------- start-free-dialog -------------------------- */
  startFreeTitle: "شروع تمرین آزاد",
  startFreeDescription: (count, max) =>
    `حرکات را از بانک ${localeNumber(count, "fa")} حرکتی واقعی انتخاب کنید (حداقل یک حرکت، حداکثر ${localeNumber(max, "fa")}). جلسه فقط با کلیک شما ساخته می‌شود و بلافاصله در سرور ثبت می‌گردد.`,
  freeSearchPlaceholder: "جست‌وجو — فارسی یا انگلیسی",
  freeSearchAria: "جست‌وجوی حرکت برای تمرین آزاد",
  pickAction: "انتخاب",
  unpickAction: "حذف",
  pickAria: (verb, name) => `${verb} ${name}`,
  minOneError: "برای شروع تمرین آزاد حداقل یک حرکت انتخاب کنید.",
  selectedCount: (n) => `${localeNumber(n, "fa")} حرکت انتخاب شده`,

  /* --------------------------- session-history --------------------------- */
  historyTitle: "تاریخچه جلسات تمرین",
  sessionCount: (n) => `${localeNumber(n, "fa")} جلسه`,
  filterAll: "همه",
  detailReadFailed: "خواندن جزئیات ممکن نشد",
  noExercisesInSession: "این جلسه حرکت ثبت‌شده‌ای ندارد.",
  skippedShort: "رد شده",
  setLine: (setNumber, reps) => `ست ${localeNumber(setNumber, "fa")}: ${localeNumber(reps, "fa")} تکرار`,
  setWeightSuffix: (weightKg) => ` × ${localeNumber(weightKg, "fa")} کیلوگرم`,
  bodyweightSetSuffix: " (وزن بدن)",
  noSetsLogged: "بدون ست ثبت‌شده",
  exercisesFraction: (done, total) => `${localeNumber(done, "fa")}/${localeNumber(total, "fa")} حرکت`,
  setsLine: (sets) => `${localeNumber(sets, "fa")} ست`,
  repsLine: (reps) => `${localeNumber(reps, "fa")} تکرار`,
  volumeLine: (volumeKg) => `حجم: ${localeNumber(volumeKg, "fa")} کیلوگرم`,
  abandonedRowNote: "این جلسه رهاشده شده و در آمار «جلسات تکمیل‌شده» شمرده نمی‌شود.",
  inProgressRowNote: "این جلسه هنوز در حال انجام است و در آمار تکمیل‌شده‌ها شمرده نمی‌شود.",
  computedNote: "مقادیر فقط از ست‌های واقعاً ثبت‌شده محاسبه شده‌اند.",
  emptyAll: "هنوز جلسه‌ای ثبت نشده است",
  emptyFiltered: (statusLabel) => `جلسه‌ای با وضعیت «${statusLabel}» ندارید`,
  emptyHowTo:
    "جلسه فقط با اقدام واقعی شما ساخته می‌شود: از بخش «برنامه تمرینی» دکمه «شروع تمرین» را بزنید، ست‌ها را ثبت کنید و جلسه را پایان بدهید. بازدید از برنامه هرگز جلسه حساب نمی‌شود.",
  completedCountNote: (completed) =>
    `${localeNumber(completed, "fa")} جلسه تکمیل‌شده در این فهرست؛ رهاشده و در حال انجام جدا شمرده می‌شوند.`,
  deleteSessionTitle: "حذف جلسه از تاریخچه",
  deleteSessionDescription: (title, date) =>
    `جلسه «${title}» در تاریخ ${date} برای همیشه حذف می‌شود و در آمار پیشرفت هم دیگر شمرده نمی‌شود. این اقدام قابل بازگشت نیست.`,
  sessionDeletedToast: "جلسه حذف شد",
  deleteSessionAction: "حذف جلسه",
};

const EN: WorkoutStrings = {
  /* ------------------------------ مشترک ------------------------------ */
  cancel: "Cancel",
  retry: "Try again",
  refresh: "Refresh",
  networkFailed: "Could not reach the server.",
  deleteAction: "Delete",
  statusLabel: (status) =>
    ({ in_progress: "In progress", completed: "Completed", abandoned: "Abandoned" } as Record<string, string>)[status] ?? status,
  doneLabel: "Done",
  skippedLabel: "Skipped",
  weekDayLabels: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  joinList: (labels) => labels.join(", "),
  minutesUnit: (n) => `${n} minutes`,
  kilograms: "kg",
  planGoalLabel: (value) =>
    (
      {
        fat_loss: "Fat loss",
        muscle_gain: "Muscle gain",
        strength: "Strength gain",
        maintain: "Maintain weight",
        fitness: "Fitness",
      } as Record<string, string>
    )[value] ?? value,
  planExperienceLabel: (value) =>
    ({ beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" } as Record<string, string>)[value] ?? value,
  focusName: (focus) =>
    (
      {
        all: "Full body",
        upper: "Upper body",
        lower: "Lower body",
      } as Record<string, string>
    )[focus] ?? CATEGORY_EN.get(focus as ExerciseCategoryId) ?? focus,
  categoryName: (id) => CATEGORY_EN.get(id as ExerciseCategoryId) ?? id,
  equipmentName: (id) => EQUIPMENT_EN.get(id as EquipmentId) ?? id,
  difficultyName: (value) =>
    ({ "مبتدی": "Beginner", "متوسط": "Intermediate", "پیشرفته": "Advanced" } as Record<string, string>)[value] ?? value,
  muscleName: (id) => muscleEn(id as MuscleGroupId),

  /* --------------------------- workout-view --------------------------- */
  statusActive: "Active",
  statusArchivedPlan: "Archived",
  planSummaryLine: (days, exercises, goal, experience) =>
    `${days} days — ${exercises} exercises — ${goal} — ${experience}`,
  viewPlan: "View plan",
  activate: "Activate",
  anotherSessionToast: "Another session is already in progress; that one was resumed",
  planSessionStartedToast: "Workout session started — log each set after you actually do it",
  freeSessionStartedToast: "Free workout started — log each set after you actually do it",
  planSavedToast: "Workout plan saved and activated",
  planActivatedToast: "Plan activated; the previous active plan was archived",
  planArchivedToast: "Plan archived",
  planDeletedToast: "Plan deleted",
  startTrainingAria: "Start training",
  startTrainingTitle: "Start training",
  startTrainingIntro:
    "A real session is created by your own action; log completed sets right there. Visiting a plan never counts as a session.",
  busyButton: "Session in progress",
  freeWorkoutButton: "Free workout",
  activeSessionNote:
    "You have a session in progress; no new session starts until you finish or abandon it. The recorder at the top of this page is ready.",
  activePlanAria: "Active plan",
  activePlanHeading: (title) => `Active plan: ${title}`,
  archiveAction: "Archive",
  emptyTitle: "You haven't created a workout plan yet",
  emptyDescription:
    "The plan builder creates a structured weekly plan from your goal, experience level, equipment and days — drawing on a real bank of 48 exercises. Until then, you can log real sessions with “Free workout”.",
  createPlan: "Create your plan",
  noActiveNote: "You have no active plan; activate one of the archived plans or create a new one.",
  historyLink: "History and progress analysis",
  previousPlansAria: "Previous plans",
  previousPlansTitle: "Previous plans",
  newPlan: "Create a new plan",
  planFormAria: "New plan settings",
  planSettingsTitle: "Plan settings",
  stepOne: "Step 1 of 2",
  planPreviewAria: "Plan preview",
  planPreviewTitle: "Plan preview",
  stepTwo: "Step 2 of 2",
  deletePlanTitle: "Delete workout plan",
  deletePlanDescription: (title) =>
    `The plan “${title}” will be deleted permanently and cannot be restored. If this plan is active, no active plan will remain after deletion. Your logged real sessions are not deleted with the plan.`,
  deletePlanAction: "Delete plan",

  /* ---------------------------- plan-detail ---------------------------- */
  setsRepsLine: (sets, repsMin, repsMax) => `${sets} sets × ${repsMin}–${repsMax} reps`,
  restSecondsLine: (seconds) => `Rest ${seconds} seconds`,
  approxMinutes: (minutes) => `~${minutes} min`,
  exercisesCount: (n) => `${n} ${n === 1 ? "exercise" : "exercises"}`,
  commonMistake: (mistake) => `Common mistake: ${mistake}`,
  snapshotWarning:
    "This exercise was not found in the current exercise bank; its details are shown from the plan's snapshot.",
  coach3d: "3D coach",
  libraryDetails: "Details in library",
  anotherSessionRunning: "Another session is in progress",
  starting: "Starting…",
  startThisDay: "Start this workout",
  startDayNote:
    "Starting a workout creates a real session on the server; visiting a plan never counts as a session.",
  daysPerWeekBadge: (n) => `${n} days per week`,
  minutesPerSession: (n) => `~${n} min per session`,
  cautionNotesLine: (notes) => `Your caution note: ${notes}`,
  guidanceTitle: "How to follow the plan",

  /* ---------------------------- plan-preview ---------------------------- */
  previewNotSaved: "Preview — not saved yet",
  goalChip: (value) => `Goal: ${EN.planGoalLabel(value)}`,
  levelChip: (value) => `Level: ${EN.planExperienceLabel(value)}`,
  focusChip: (value) => `Focus: ${EN.focusName(value)}`,
  sessionsExercisesLine: (sessions, exercises) => `${sessions} sessions — ${exercises} exercises`,
  equipmentChip: (ids) => `Equipment: ${ids.map((id) => EN.equipmentName(id)).join(", ")}`,
  freeDay: "Free day",
  setsRepsCompact: (sets, repsMin, repsMax) => `${sets}×${repsMin}–${repsMax}`,
  executionGuideTitle: "Execution guide",
  saving: "Saving…",
  saveAndActivate: "Save and activate plan",
  backToSettings: "Back to settings",
  saveActivateNote:
    "When saved, this plan becomes “active” and the previous active plan (if any) is archived automatically.",

  /* ------------------------- plan-settings-form ------------------------- */
  goalSection: "Goal & level",
  trainingGoalLabel: "Training goal",
  experienceLevelLabel: "Experience level",
  defaultsNote:
    "Defaults come from your profile; you can change them for this plan only.",
  weeklyVolumeSection: "Weekly volume",
  daysPerWeekLabel: "Training days per week",
  daysChip: (n) => `${n} days`,
  minutesChip: (n) => `${n} minutes`,
  sessionMinutesLabel: "Session duration",
  preferredDaysLabel: (n) => `Preferred days (optional — up to ${n} days)`,
  equipmentSection: "Available equipment",
  equipmentNote:
    "An exercise is only selected if you have all of its required equipment; if you have a bench, make sure to select it too.",
  kettlebellNote:
    "Note: a kettlebell is registered in your profile, but the exercise bank has no kettlebell exercises yet, so they are not included in the plan.",
  focusSection: "Plan focus (optional)",
  limitationsSection: "Limitations (optional)",
  excludedCategoriesLabel: "Categories you don't want in the plan",
  cautionNotesLabel: "Caution note (pain, injury, or anything your coach should know)",
  cautionPlaceholder: "e.g., my knee bothers me during squats",
  medicalDisclaimer:
    "This note is only shown in the plan as a caution input; it is not a medical diagnosis or a rehabilitation program. For pain or injury, consult a physician or licensed physiotherapist.",
  buildingPreview: "Building preview…",
  buildPreview: "Build plan preview",

  /* --------------------------- active-session --------------------------- */
  savedToServer: "Saved to server",
  notSaved: "Not saved",
  unsavedMark: "Unsaved",
  repsLabel: "Reps",
  bodyweightLabel: "Bodyweight",
  setRepsAria: (setNumber) => `Reps for set ${setNumber}`,
  setWeightAria: (setNumber) =>
    `Weight for set ${setNumber} in kilograms — empty means no external load`,
  deleteSetAria: (setNumber) => `Delete set ${setNumber}`,
  repsInvalidSet: (setNumber) => `Reps for set ${setNumber} are not valid`,
  weightRangeSet: (setNumber) => `Weight for set ${setNumber} must be between 0 and 500 kilograms`,
  newSetRepsInvalid: "Reps for the new set are not valid",
  weightRange: "Weight must be between 0 and 500 kilograms",
  setLoggedToast: (setNumber, name) => `Set ${setNumber} of “${name}” logged`,
  musclesLine: (list) => `Muscles: ${list}`,
  planTargetSets: (sets) => `Plan target: ${sets} sets`,
  planTargetReps: (repsMin, repsMax) => ` × ${repsMin}–${repsMax} reps`,
  suggestedRest: (seconds) => `Suggested rest ${seconds} seconds`,
  bodyweightNoLoad: "Bodyweight — no external load",
  no3d: "3D view not available",
  guide: "Guide",
  skipAction: "Skip",
  noSetsYet: "No set of this exercise has been logged yet — add the first set with the button below.",
  repsPlaceholder: "Reps",
  optionalWeightPlaceholder: (unit) => `${unit} (optional)`,
  newSetRepsAria: "Reps for the new set",
  newSetWeightAria: "Weight for the new set in kilograms — empty means no external load",
  logSet: "Log set",
  addSet: (label) => `Add set ${label}`,
  deleteSetDialogTitle: "Delete logged set",
  deleteSetDialogDescription:
    "This set will be removed from the session record. Deleting means this set will count as not actually performed.",
  deleteSetAction: "Delete set",
  sessionClosedTitle: (title) => `Session “${title}” is closed`,
  closedStatusLine: (status) =>
    `Status: ${status} — history and stats in the “My progress” section have been updated.`,
  workoutCompleteToast: "Workout completed and recorded in history",
  abandonedToast: "Session was recorded as “abandoned”",
  recorderAria: "Session in progress",
  recorderHeading: (title) => `Session in progress: ${title}`,
  finishWorkout: "Finish workout",
  startedAtLine: (date) => `Started: ${date}`,
  elapsedLine: (minutes) =>
    `Elapsed so far: ${minutes} minutes (from the start time recorded on the server)`,
  progressLine: (done, total, sets) => `${done} of ${total} exercises — ${sets} sets`,
  persistedNote:
    "This session is really stored in the server database; refreshing the page or closing the browser will not lose it — it is restored right here.",
  saveErrorBanner:
    "Saving some sets failed; nothing was deleted and no success was faked. Once the connection is back, press “Try again”.",
  addFromLibrary: "Add exercise from library",
  abandonHint:
    "If you are not continuing today, “abandon” the session; abandoned is not the same as completed and is counted separately in history and stats.",
  abandonAction: "Abandon session",
  finishCompleteTitle: "Finish and complete workout",
  finishCompleteDesc:
    "The session is recorded with “completed” status; even if not all exercises were done, incomplete items honestly stay as they are.",
  finishAbandonDesc:
    "The session is recorded with “abandoned” status and is not counted in the “completed sessions” statistics.",
  summaryTitle: "This session's summary",
  summaryExercisesLine: (done, total) => `Exercises: ${done} done of ${total}`,
  summarySkippedSuffix: (skipped) => ` — ${skipped} skipped`,
  summarySetsLine: (sets) => `Sets actually logged: ${sets}`,
  summaryRepsLine: (reps) => `Total reps: ${reps}`,
  summaryDurationLine: (minutes) => `Elapsed so far: ${minutes} minutes`,
  summaryVolumeLine: (volumeKg) => `Recorded volume (external-load sets only): ${volumeKg} kg`,
  unloggedWarning: (count) => `${count} exercises remain without any logged set.`,
  finishNotesPlaceholder: "Optional note about this session (up to 500 characters)",
  finishNotesAria: "End-of-session note",
  backToSession: "Back to session",
  recording: "Recording…",
  completeAction: "Complete workout",
  abandonConfirmAction: "Record as abandoned",
  exerciseAddedToast: "Exercise added to the session",

  /* ---------------------------- session-stats ---------------------------- */
  statsAria: "Workout progress analysis",
  statsTitle: "Workout progress analysis",
  thisWeekTitle: "This week (Saturday to today)",
  iranCalendarNote: "Computed with the official Iranian calendar",
  emptyWeek:
    "You have no completed sessions this week yet. A session only counts as completed after your explicit “Finish workout”.",
  weekCompletedLabel: "Completed sessions",
  weekSetsLabel: "Sets logged",
  weekRepsLabel: "Total reps",
  weekDurationLabel: "Total duration",
  trendTitle: "Last 6 weeks trend",
  trendSubtitle: "Completed sessions per week",
  zeroWeeksNote: "Weeks without sessions are real zeros; no data has been filled in.",
  totalsTitle: "Totals for the last year",
  emptyTotals:
    "No completed session has been recorded yet; with your first completed session, totals and trends will appear here.",
  totalsCompleted: "Completed",
  totalsAbandoned: "Abandoned",
  totalsSets: "Sets",
  totalsReps: "Reps",
  totalsDuration: "Total duration",
  totalsVolume: "Volume (external load)",
  volumeExplainer:
    "“Training volume” = the sum of (reps × weight) only for logged sets with external load; bodyweight sets are not included and your bodyweight is never added to training weight. Volume is not comparable with bodyweight exercises, and summing weights across different exercises is not a scientific measure of strength — this number is only for tracking your personal trend.",
  singleExerciseTitle: "Trend for a specific exercise",
  singleExerciseIntro:
    "Comparison is only made between completed sessions; a weight record only becomes meaningful with at least two sessions that logged weight.",
  progressReadFailed: "Could not read the exercise trend; please try again.",
  pickerAria: "Choose an exercise to view its trend",
  pickerPlaceholder: "Choose an exercise from the bank",
  clearPicker: "Clear",
  bestWeightLabel: "Best weight logged",
  insufficientData: "Not enough data",
  noExternalLoad: "No external load logged — only reps are measured",
  onDate: (date) => `On ${date}`,
  bestRepsLabel: "Most reps in one set",
  repsUnit: "reps",
  historyRowLine: (sets, reps) => `${sets} sets — ${reps} reps`,
  bestWeightSuffix: (weightKg) => ` — best weight ${weightKg} kg`,
  bodyweightRowSuffix: " — bodyweight",
  emptyExerciseTrend:
    "This exercise has not been logged in any completed session yet. Abandoned or unfinished exercises are not included in the progress trend.",

  /* ------------------------- add-exercise-dialog ------------------------- */
  addExerciseDescription:
    "Only real exercises from the exercise bank can be selected; selections are added directly to your open session.",
  capacityLine: (remaining, max) =>
    ` Remaining capacity: ${remaining} of a maximum of ${max} session exercises.`,
  searchPlaceholder: (count) => `Search ${count} exercises — Persian or English`,
  sourceLabel: (source) => (source === "public" ? "Public bank" : "My personal exercises"),
  personalEmptyNote: "No personal exercises yet; create some in the coach panel’s exercise bank.",
  allCategories: "All categories",
  searchAria: "Search exercises",
  noResults: "No exercise matched this search.",
  has3d: "3D available",
  addToSessionAria: (name) => `Add ${name} to session`,
  addAction: "Add",

  /* -------------------------- start-free-dialog -------------------------- */
  startFreeTitle: "Start free workout",
  startFreeDescription: (count, max) =>
    `Choose exercises from the real bank of ${count} exercises (at least one, at most ${max}). The session is created only by your click and is immediately recorded on the server.`,
  freeSearchPlaceholder: "Search — Persian or English",
  freeSearchAria: "Search exercises for the free workout",
  pickAction: "Select",
  unpickAction: "Remove",
  pickAria: (verb, name) => `${verb} ${name}`,
  minOneError: "Select at least one exercise to start the free workout.",
  selectedCount: (n) => `${n} exercises selected`,

  /* --------------------------- session-history --------------------------- */
  historyTitle: "Workout session history",
  sessionCount: (n) => `${n} sessions`,
  filterAll: "All",
  detailReadFailed: "Could not read details",
  noExercisesInSession: "This session has no logged exercises.",
  skippedShort: "Skipped",
  setLine: (setNumber, reps) => `Set ${setNumber}: ${reps} reps`,
  setWeightSuffix: (weightKg) => ` × ${weightKg} kg`,
  bodyweightSetSuffix: " (bodyweight)",
  noSetsLogged: "No sets logged",
  exercisesFraction: (done, total) => `${done}/${total} exercises`,
  setsLine: (sets) => `${sets} sets`,
  repsLine: (reps) => `${reps} reps`,
  volumeLine: (volumeKg) => `Volume: ${volumeKg} kg`,
  abandonedRowNote: "This session was abandoned and is not counted in the “completed sessions” statistics.",
  inProgressRowNote: "This session is still in progress and is not counted in the completed statistics.",
  computedNote: "Values are computed only from sets that were actually logged.",
  emptyAll: "No session has been recorded yet",
  emptyFiltered: (statusLabel) => `You have no sessions with “${statusLabel}” status`,
  emptyHowTo:
    "A session is created only by your real action: in the “Workout plan” section, press “Start training”, log your sets, and finish the session. Visiting a plan never counts as a session.",
  completedCountNote: (completed) =>
    `${completed} completed sessions in this list; abandoned and in-progress ones are counted separately.`,
  deleteSessionTitle: "Delete session from history",
  deleteSessionDescription: (title, date) =>
    `The session “${title}” on ${date} will be deleted permanently and will no longer count in progress statistics. This action cannot be undone.`,
  sessionDeletedToast: "Session deleted",
  deleteSessionAction: "Delete session",
};

const STRINGS: Record<Locale, WorkoutStrings> = { fa: FA, en: EN };

export function workoutStrings(locale: Locale): WorkoutStrings {
  return STRINGS[locale];
}
