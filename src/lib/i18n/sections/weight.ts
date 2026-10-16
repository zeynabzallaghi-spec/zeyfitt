/**
 * دیکشنری مشترک اجزای وزن و «برنامه امروز» داشبورد — کارت روند وزن، دیالوگ
 * ثبت وزن، نمودار روند و کارت جلسه امروز. هر چهار کامپوننت از همین یک فایل
 * مصرف می‌کنند (گروه‌بندی با کامنت).
 *
 * الگو دقیقاً مطابق sections/shell.ts است: اینترفیس تایپ‌شده + دو دیکشنری
 * کامل fa/en + تابع getter. متن‌های فارسی عیناً همان متن‌های قبلی اپ‌اند
 * (با حفظ نیم‌فاصله) و انگلیسی ترجمه طبیعی و کامل است.
 *
 * قالب‌های عددی (شمارنده‌ها و …) رشتهٔ قالب‌بندی‌شده می‌گیرند تا قالب‌بندی
 * عدد با ارقام متناسب زبان، در محل فراخوانی انجام شود.
 */

import type { Locale } from "../shared";

export interface WeightStrings {
  /* --------------------------- کارت روند وزن --------------------------- */
  trendTitle: string;
  addWeight: string;
  retry: string;
  retryAria: string;
  loadingSr: string;
  emptyTitle: string;
  emptyDescription: string;
  addFirstWeight: string;
  latestWeightLabel: string;
  kilogramUnit: string;
  entriesCountLabel: string;
  recordsUnit: string;
  storedOnServer: string;
  changeFromFirstLabel: string;
  trendDownNote: string;
  trendUpNote: string;
  trendStableNote: string;
  trendNeedsTwoNote: string;
  recentMeasurements: string;
  /** aria دکمه حذف — «حذف اندازه‌گیری {date}» */
  deleteMeasurementAria: (date: string) => string;
  /** مقدار خالی — جایگزین نمایش عدد جعلی */
  emptyValue: string;

  /* --------------------------- دیالوگ ثبت وزن --------------------------- */
  dialogTitle: string;
  dialogDescription: string;
  weightInputLabel: string;
  weightInputPlaceholder: string;
  dateInputLabel: string;
  /** «معادل شمسی: {label}» — نمایش خوانای تاریخ انتخاب‌شده */
  dateEquivalentLabel: (label: string) => string;
  errWeightRequired: string;
  errWeightInvalid: string;
  errWeightRange: string;
  errSubmitFallback: string;
  submitting: string;
  submitButton: string;
  cancelButton: string;
  maxEntriesNote: (count: string) => string;

  /* --------------------------- نمودار روند وزن --------------------------- */
  /** نام سری داده در نمودار */
  chartSeriesName: string;
  /** «وزن ثبت‌شده: {weight} کیلوگرم» — تولتیپ نمودار */
  chartTooltipWeight: (weight: string) => string;

  /* --------------------------- کارت برنامه امروز --------------------------- */
  todayPlanEmptyDescription: string;
  buildPlanButton: string;
  /** «امروز {weekday} — جلسه {order}» */
  todayBadge: (weekday: string, order: string) => string;
  /** «{count} حرکت» */
  exercisesCount: (count: string) => string;
  /** «~{minutes} دقیقه (شامل گرم‌کردن)» */
  estMinutes: (minutes: string) => string;
  /** «و {count} حرکت دیگر…» */
  moreExercises: (count: string) => string;
  continueActiveSession: string;
  startTodayWorkout: string;
  viewFullPlan: string;
  startSessionNote: string;
  /** «امروز جلسه‌ای در برنامه «{title}» نیست.» */
  noSessionToday: (planTitle: string) => string;
  /** با فاصله آغازین — ادامهٔ جملهٔ قبل: « جلسه بعدی {label} است: {title}.» */
  nextSessionIs: (label: string, title: string) => string;
  /** با فاصله آغازین — ادامهٔ جملهٔ قبل وقتی روزهای جلسات تاریخ مشخصی ندارند */
  noFixedDays: string;
  viewWorkoutPlan: string;
  tomorrowLabel: string;
  /** نام روزهای هفته به ترتیب تقویم ایران — اندیس ۰ = شنبه */
  weekdayLabels: readonly string[];
}

const FA: WeightStrings = {
  /* --------------------------- کارت روند وزن --------------------------- */
  trendTitle: "روند وزن شما",
  addWeight: "ثبت وزن",
  retry: "تلاش مجدد",
  retryAria: "تلاش مجدد برای خواندن تاریخچه وزن",
  loadingSr: "در حال خواندن تاریخچه وزن از سرور…",
  emptyTitle: "هنوز اندازه‌گیری وزنی ثبت نکرده‌اید",
  emptyDescription:
    "اولین وزن خود را ثبت کنید؛ نمودار روند، تغییر وزن و خلاصه اندازه‌گیری‌ها فقط با داده واقعی و تاریخ‌دار شما رسم می‌شود.",
  addFirstWeight: "ثبت اولین وزن",
  latestWeightLabel: "آخرین وزن ثبت‌شده",
  kilogramUnit: "کیلوگرم",
  entriesCountLabel: "تعداد اندازه‌گیری",
  recordsUnit: "رکورد",
  storedOnServer: "ذخیره‌شده روی سرور",
  changeFromFirstLabel: "تغییر از اولین ثبت",
  trendDownNote: "کاهش وزن نسبت به اولین اندازه‌گیری",
  trendUpNote: "افزایش وزن نسبت به اولین اندازه‌گیری",
  trendStableNote: "تغییر معناداری ندارد",
  trendNeedsTwoNote: "با ثبت حداقل دو اندازه‌گیری محاسبه می‌شود",
  recentMeasurements: "اندازه‌گیری‌های اخیر",
  deleteMeasurementAria: (date) => `حذف اندازه‌گیری ${date}`,
  emptyValue: "—",

  /* --------------------------- دیالوگ ثبت وزن --------------------------- */
  dialogTitle: "ثبت اندازه‌گیری وزن",
  dialogDescription:
    "وزن امروز یا یک تاریخ گذشته را ثبت کنید؛ روند نمودار فقط با اندازه‌گیری‌های تاریخ‌دار شما ساخته می‌شود.",
  weightInputLabel: "وزن (کیلوگرم)",
  weightInputPlaceholder: "مثلاً ۷۵٫۵",
  dateInputLabel: "تاریخ ثبت",
  dateEquivalentLabel: (label) => `معادل شمسی: ${label}`,
  errWeightRequired: "وزن را وارد کنید",
  errWeightInvalid: "وزن باید عدد معتبر باشد",
  errWeightRange: "وزن باید بین ۲۵ تا ۳۰۰ کیلوگرم باشد",
  errSubmitFallback: "ثبت انجام نشد؛ دوباره تلاش کنید.",
  submitting: "در حال ثبت…",
  submitButton: "ثبت روی سرور",
  cancelButton: "انصراف",
  maxEntriesNote: (count) => `حداکثر ${count} اندازه‌گیری برای هر حساب نگهداری می‌شود.`,

  /* --------------------------- نمودار روند وزن --------------------------- */
  chartSeriesName: "وزن",
  chartTooltipWeight: (weight) => `وزن ثبت‌شده: ${weight} کیلوگرم`,

  /* --------------------------- کارت برنامه امروز --------------------------- */
  todayPlanEmptyDescription:
    "با برنامه‌ساز تمرینی، برنامه‌ای واقعاً بر اساس هدف، سطح و تجهیزات شما ساخته و در پایگاه داده ذخیره می‌شود. تا آن زمان اینجا برنامه‌ای نمایش داده نمی‌شود.",
  buildPlanButton: "ساخت برنامه شخصی",
  todayBadge: (weekday, order) => `امروز ${weekday} — جلسه ${order}`,
  exercisesCount: (count) => `${count} حرکت`,
  estMinutes: (minutes) => `~${minutes} دقیقه (شامل گرم‌کردن)`,
  moreExercises: (count) => `و ${count} حرکت دیگر…`,
  continueActiveSession: "ادامه جلسه در حال انجام",
  startTodayWorkout: "شروع تمرین امروز",
  viewFullPlan: "مشاهده برنامه کامل",
  startSessionNote:
    "شروع تمرین یک جلسه واقعی در سرور می‌سازد؛ ست‌های انجام‌شده را در رکوردر ثبت می‌کنید.",
  noSessionToday: (planTitle) => `امروز جلسه‌ای در برنامه «${planTitle}» نیست.`,
  nextSessionIs: (label, title) => ` جلسه بعدی ${label} است: ${title}.`,
  noFixedDays:
    " روزهای جلسات در این برنامه تاریخ مشخصی ندارند؛ ترتیب جلسات در صفحه برنامه تمرینی آمده است.",
  viewWorkoutPlan: "مشاهده برنامه تمرینی",
  tomorrowLabel: "فردا",
  weekdayLabels: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"],
};

const EN: WeightStrings = {
  /* --------------------------- کارت روند وزن --------------------------- */
  trendTitle: "Your weight trend",
  addWeight: "Log weight",
  retry: "Try again",
  retryAria: "Retry loading weight history",
  loadingSr: "Loading weight history from the server…",
  emptyTitle: "No weight measurements recorded yet",
  emptyDescription:
    "Record your first weigh-in; the trend chart, weight change and measurement summary are drawn only from your real, dated data.",
  addFirstWeight: "Log first weight",
  latestWeightLabel: "Latest recorded weight",
  kilogramUnit: "kg",
  entriesCountLabel: "Measurement count",
  recordsUnit: "records",
  storedOnServer: "Stored on the server",
  changeFromFirstLabel: "Change since first entry",
  trendDownNote: "Weight loss since the first measurement",
  trendUpNote: "Weight gain since the first measurement",
  trendStableNote: "No meaningful change",
  trendNeedsTwoNote: "Calculated after at least two measurements are recorded",
  recentMeasurements: "Recent measurements",
  deleteMeasurementAria: (date) => `Delete measurement ${date}`,
  emptyValue: "—",

  /* --------------------------- دیالوگ ثبت وزن --------------------------- */
  dialogTitle: "Log a weight measurement",
  dialogDescription:
    "Record today's weight or a past date; the chart trend is built only from your dated measurements.",
  weightInputLabel: "Weight (kilograms)",
  weightInputPlaceholder: "e.g. 75.5",
  dateInputLabel: "Record date",
  dateEquivalentLabel: (label) => `Selected date: ${label}`,
  errWeightRequired: "Enter your weight",
  errWeightInvalid: "Weight must be a valid number",
  errWeightRange: "Weight must be between 25 and 300 kilograms",
  errSubmitFallback: "Could not save; please try again.",
  submitting: "Saving…",
  submitButton: "Save to server",
  cancelButton: "Cancel",
  maxEntriesNote: (count) => `Up to ${count} measurements are kept per account.`,

  /* --------------------------- نمودار روند وزن --------------------------- */
  chartSeriesName: "Weight",
  chartTooltipWeight: (weight) => `Recorded weight: ${weight} kg`,

  /* --------------------------- کارت برنامه امروز --------------------------- */
  todayPlanEmptyDescription:
    "With the workout plan builder, a plan is genuinely built from your goal, level and equipment and saved to the database. Until then, no plan is shown here.",
  buildPlanButton: "Build a personal plan",
  todayBadge: (weekday, order) => `Today ${weekday} — Session ${order}`,
  exercisesCount: (count) => `${count} exercises`,
  estMinutes: (minutes) => `~${minutes} min (including warm-up)`,
  moreExercises: (count) => `and ${count} more…`,
  continueActiveSession: "Resume active session",
  startTodayWorkout: "Start today's workout",
  viewFullPlan: "View full plan",
  startSessionNote:
    "Starting a workout creates a real session on the server; you log completed sets in the recorder.",
  noSessionToday: (planTitle) => `No session in the "${planTitle}" plan today.`,
  nextSessionIs: (label, title) => ` Next session is ${label}: ${title}.`,
  noFixedDays:
    " Session days in this plan have no fixed dates; the session order is listed in the workout plan page.",
  viewWorkoutPlan: "View workout plan",
  tomorrowLabel: "Tomorrow",
  weekdayLabels: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
};

const STRINGS: Record<Locale, WeightStrings> = { fa: FA, en: EN };

export function weightStrings(locale: Locale): WeightStrings {
  return STRINGS[locale];
}
