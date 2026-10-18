/**
 * دیکشنری بخش «برنامه‌های اختصاصی مربی» در حساب دانشجو — مرحله ۱۶.
 * فهرست برنامه‌های تمرینی/غذایی دریافتی، جزئیات روزها و حرکات/وعده‌ها،
 * شروع جلسه از برنامه مربی، ثبت مصرف از قلم برنامه و پیام‌های شفاف
 * وضعیت ارتباط/اشتراک. دو دیکشنری کامل fa/en با اینترفیس تایپ‌شده.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface CoachDeliveriesStrings {
  title: string;
  titleEn: string;
  intro: string;
  introEn: string;
  documentTitle: string;
  refresh: string;
  loading: string;
  retry: string;
  loadError: string;

  // تب‌ها
  workoutTab: string;
  nutritionTab: string;

  // حالت خالی
  emptyTitle: string;
  emptyNote: string;
  emptyWorkoutNote: string;
  emptyNutritionNote: string;

  // کارت برنامه
  coachLabel: string;
  sentAtLabel: string;
  versionLabel: (n: number) => string;
  goalLabel: string;
  daysCount: (n: number) => string;
  exercisesCount: (n: number) => string;
  mealsCount: (n: number) => string;
  viewDetails: string;
  close: string;
  latestVersionBadge: string;

  // منبع برنامه — شفافیت نسبت به برنامه خودکار
  sourceLabel: string;
  sourceCoachPlan: string;
  sourceCoachPlanNote: string;

  // وضعیت ارتباط و اشتراک
  connectionEndedBanner: string;
  connectionEndedNote: string;
  historyKeptNote: string;

  // جزئیات تمرینی
  workoutDaysTitle: string;
  dayN: (n: number) => string;
  estMinutesLabel: string;
  exercisesLabel: string;
  setsRepsLabel: (sets: number, min: number, max: number) => string;
  restLabel: (sec: number) => string;
  suggestedWeightLabel: (kg: number) => string;
  noteLabel: string;
  startWorkout: string;
  startWorkoutDay: (n: number) => string;
  startingSession: string;
  sessionStartedTitle: string;
  sessionResumedTitle: string;
  sessionStartFailed: string;
  sessionActiveOther: string;

  // جزئیات غذایی
  nutritionDaysTitle: string;
  mealsLabel: string;
  gramsLabel: (n: number) => string;
  kcalLabel: string;
  macrosLabel: string;
  estimateBadge: string;
  nutritionEstimateNote: string;
  logThisItem: string;
  loggingFood: string;
  foodLoggedTitle: string;
  foodLoggedNote: string;
  foodLogFailed: string;
  dailyLimitNote: string;
  plannedAmountLabel: string;

  // برچسب‌های هدف
  workoutGoalOf: (code: string) => string;
  nutritionGoalOf: (code: string) => string;
}

const fa: CoachDeliveriesStrings = {
  title: "برنامه‌های اختصاصی مربی",
  titleEn: "Coach Custom Plans",
  intro:
    "برنامه‌هایی که مربی شما به‌طور اختصاصی برایتان ساخته و ارسال کرده است؛ متمایز از برنامه‌هایی که خودتان با موتور خودکار ساخته‌اید.",
  introEn:
    "Plans your coach built and sent specifically for you — separate from the plans you generate with the automatic engine.",
  documentTitle: "برنامه‌های اختصاصی مربی",
  refresh: "بازخوانی",
  loading: "در حال بارگذاری…",
  retry: "تلاش مجدد",
  loadError: "خطا در دریافت برنامه‌ها",

  workoutTab: "تمرینی",
  nutritionTab: "غذایی",

  emptyTitle: "هنوز برنامه اختصاصی دریافت نکرده‌اید",
  emptyNote:
    "پس از آنکه مربی برای شما برنامه‌ای ارسال کند، همین‌جا نمایش داده می‌شود. دریافت برنامه اختصاصی به ارتباط ACTIVE و اشتراک ویژه نیاز دارد.",
  emptyWorkoutNote: "هیچ برنامه تمرینی اختصاصی دریافت نکرده‌اید.",
  emptyNutritionNote: "هیچ برنامه غذایی اختصاصی دریافت نکرده‌اید.",

  coachLabel: "مربی",
  sentAtLabel: "تاریخ ارسال",
  versionLabel: (n) => `نسخه ${localeNumber(n, "fa")}`,
  goalLabel: "هدف",
  daysCount: (n) => `${localeNumber(n, "fa")} روز`,
  exercisesCount: (n) => `${localeNumber(n, "fa")} حرکت`,
  mealsCount: (n) => `${localeNumber(n, "fa")} وعده`,
  viewDetails: "مشاهده جزئیات",
  close: "بستن",
  latestVersionBadge: "جدیدترین نسخه",

  sourceLabel: "منبع",
  sourceCoachPlan: "برنامه اختصاصی مربی",
  sourceCoachPlanNote:
    "این برنامه توسط مربی شما ساخته و ارسال شده است، نه توسط موتور خودکار؛ مسئولیت فنی محتوا با مربی شماست.",

  connectionEndedBanner: "ارتباط با این مربی فعال نیست",
  connectionEndedNote:
    "ارتباط این برنامه پایان یافته یا لغو شده است؛ ارسال برنامه جدید ممکن نیست، اما تاریخچه برنامه‌های دریافتی قبلی حفظ شده و همچنان قابل مشاهده است.",
  historyKeptNote: "برنامه‌های قبلاً دریافتی حتی پس از انقضای اشتراک یا پایان ارتباط پاک نمی‌شوند.",

  workoutDaysTitle: "روزهای تمرین",
  dayN: (n) => `روز ${localeNumber(n, "fa")}`,
  estMinutesLabel: "زمان تقریبی",
  exercisesLabel: "حرکات",
  setsRepsLabel: (sets, min, max) =>
    `${localeNumber(sets, "fa")} ست × ${localeNumber(min, "fa")}–${localeNumber(max, "fa")} تکرار`,
  restLabel: (sec) => `استراحت ${localeNumber(sec, "fa")} ثانیه`,
  suggestedWeightLabel: (kg) => `وزن پیشنهادی مربی: ${localeNumber(kg, "fa")} کیلوگرم`,
  noteLabel: "یادداشت مربی",
  startWorkout: "شروع تمرین",
  startWorkoutDay: (n) => `شروع تمرین روز ${localeNumber(n, "fa")}`,
  startingSession: "در حال شروع…",
  sessionStartedTitle: "جلسه تمرین شروع شد",
  sessionResumedTitle: "جلسه فعال شما باز شد",
  sessionStartFailed: "شروع جلسه ناموفق بود",
  sessionActiveOther:
    "یک جلسه در حال انجام دارید؛ برای شروع تمرین از برنامه مربی، ابتدا همان جلسه را تمام یا رها کنید.",

  nutritionDaysTitle: "روزهای برنامه غذایی",
  mealsLabel: "وعده‌ها",
  gramsLabel: (n) => `${localeNumber(n, "fa")} گرم`,
  kcalLabel: "کالری",
  macrosLabel: "درشت‌مغذی‌ها",
  estimateBadge: "تخمینی",
  nutritionEstimateNote:
    "کالری و درشت‌مغذی‌ها برآورد بانک مواد پروژه‌اند؛ برای دقت بیشتر مقدار واقعی مصرف را ثبت کنید. هیچ ادعای درمانی وجود ندارد.",
  logThisItem: "ثبت مصرف",
  loggingFood: "در حال ثبت…",
  foodLoggedTitle: "مصرف ثبت شد",
  foodLoggedNote: "این ثبت در بخش تغذیه و تحلیل پیشرفت شما دیده می‌شود.",
  foodLogFailed: "ثبت مصرف ناموفق بود",
  dailyLimitNote: "سقف ثبت مصرف روزانه پر شده است.",
  plannedAmountLabel: "مقدار برنامه",

  workoutGoalOf: (code) => {
    switch (code) {
      case "fat_loss": return "چربی‌سوزی";
      case "muscle_gain": return "عضله‌سازی";
      case "strength": return "قدرتی";
      case "maintain": return "حفظ تناسب";
      case "fitness": return "آمادگی عمومی";
      default: return code;
    }
  },
  nutritionGoalOf: (code) => {
    switch (code) {
      case "weight_loss": return "کاهش وزن";
      case "muscle_gain": return "عضله‌سازی";
      case "maintain": return "حفظ وزن";
      default: return code;
    }
  },
};

const en: CoachDeliveriesStrings = {
  title: "Coach Custom Plans",
  titleEn: "Coach Custom Plans",
  intro:
    "Plans your coach built and sent specifically for you — separate from the plans you generate with the automatic engine.",
  introEn:
    "Plans your coach built and sent specifically for you — separate from the plans you generate with the automatic engine.",
  documentTitle: "Coach Custom Plans",
  refresh: "Refresh",
  loading: "Loading…",
  retry: "Retry",
  loadError: "Failed to load plans",

  workoutTab: "Workout",
  nutritionTab: "Nutrition",

  emptyTitle: "No custom plan received yet",
  emptyNote:
    "When your coach sends you a plan, it will appear here. Receiving custom plans requires an ACTIVE connection and a PREMIUM subscription.",
  emptyWorkoutNote: "You have not received any custom workout plans.",
  emptyNutritionNote: "You have not received any custom nutrition plans.",

  coachLabel: "Coach",
  sentAtLabel: "Sent on",
  versionLabel: (n) => `Version ${localeNumber(n, "en")}`,
  goalLabel: "Goal",
  daysCount: (n) => `${localeNumber(n, "en")} days`,
  exercisesCount: (n) => `${localeNumber(n, "en")} exercises`,
  mealsCount: (n) => `${localeNumber(n, "en")} meals`,
  viewDetails: "View details",
  close: "Close",
  latestVersionBadge: "Latest",

  sourceLabel: "Source",
  sourceCoachPlan: "Coach custom plan",
  sourceCoachPlanNote:
    "This plan was built and sent by your coach, not by the automatic engine; content responsibility rests with your coach.",

  connectionEndedBanner: "This coach connection is no longer active",
  connectionEndedNote:
    "This plan's connection has ended or was cancelled; new plans cannot be sent, but your previously received plans are preserved and remain viewable.",
  historyKeptNote: "Previously received plans are never deleted, even after subscription expiry or connection end.",

  workoutDaysTitle: "Workout days",
  dayN: (n) => `Day ${localeNumber(n, "en")}`,
  estMinutesLabel: "Estimated time",
  exercisesLabel: "Exercises",
  setsRepsLabel: (sets, min, max) =>
    `${localeNumber(sets, "en")} sets × ${localeNumber(min, "en")}–${localeNumber(max, "en")} reps`,
  restLabel: (sec) => `${localeNumber(sec, "en")}s rest`,
  suggestedWeightLabel: (kg) => `Coach suggested weight: ${localeNumber(kg, "en")} kg`,
  noteLabel: "Coach note",
  startWorkout: "Start workout",
  startWorkoutDay: (n) => `Start day ${localeNumber(n, "en")} workout`,
  startingSession: "Starting…",
  sessionStartedTitle: "Workout session started",
  sessionResumedTitle: "Your active session was reopened",
  sessionStartFailed: "Could not start the session",
  sessionActiveOther:
    "You already have a session in progress; finish or abandon it before starting a coach-plan workout.",

  nutritionDaysTitle: "Nutrition days",
  mealsLabel: "Meals",
  gramsLabel: (n) => `${localeNumber(n, "en")} g`,
  kcalLabel: "Calories",
  macrosLabel: "Macros",
  estimateBadge: "Estimate",
  nutritionEstimateNote:
    "Calories and macros are estimates from the project food bank; log your actual intake for better accuracy. No medical claims are made.",
  logThisItem: "Log intake",
  loggingFood: "Logging…",
  foodLoggedTitle: "Intake logged",
  foodLoggedNote: "This entry appears in your nutrition section and progress analysis.",
  foodLogFailed: "Could not log intake",
  dailyLimitNote: "Your daily intake log limit has been reached.",
  plannedAmountLabel: "Planned amount",

  workoutGoalOf: (code) => {
    switch (code) {
      case "fat_loss": return "Fat loss";
      case "muscle_gain": return "Muscle gain";
      case "strength": return "Strength";
      case "maintain": return "Maintenance";
      case "fitness": return "General fitness";
      default: return code;
    }
  },
  nutritionGoalOf: (code) => {
    switch (code) {
      case "weight_loss": return "Weight loss";
      case "muscle_gain": return "Muscle gain";
      case "maintain": return "Maintenance";
      default: return code;
    }
  },
};

export function coachDeliveriesStrings(locale: Locale): CoachDeliveriesStrings {
  return locale === "en" ? en : fa;
}
