/**
 * دیکشنری دوزبانه ثبت مصرف واقعی غذا — همان سازوکار دیکشنری دستیار
 * (src/lib/assistant/i18n.ts): یک رابط تایپ‌شده، دو دیکشنری کامل و طبیعی،
 * بدون پراکندن شرط زبان در کامپوننت‌ها. زبان از همان انتخاب کاربر خوانده
 * می‌شود («خودکار» و «فارسی» → فارسی راست‌چین؛ English → انگلیسی چپ‌چین).
 *
 * اصول صادقانگی که در متن‌ها رعایت شده:
 *  - مقادیر «تخمینی»اند، نه اندازه‌گیری آزمایشگاهی.
 *  - «ثبت نشده» به معنی «خورده نشده» نیست.
 *  - آمار ثبت غذا تضمین پایبندی یا نتیجه جسمانی نیست.
 */

import type { UiLang } from "@/lib/assistant/i18n";

export type { UiLang };

export interface FoodLogStrings {
  dir: "rtl" | "ltr";
  langAttr: "fa" | "en";
  // سربرگ بخش
  sectionTitle: string;
  sectionIntro: string;
  estimateNote: string;
  // تاریخ و ناوبری روز
  todayLabel: string;
  dayLabel: (dateLabel: string) => string;
  prevDay: string;
  nextDay: string;
  noFutureDay: string;
  // جمع روز
  totalsTitle: string;
  totalKcal: string;
  totalProtein: string;
  totalCarb: string;
  totalFat: string;
  logsCount: (n: number) => string;
  // مقایسه با برنامه
  comparisonTitle: string;
  comparisonVsTarget: string;
  targetLabel: string;
  loggedLabel: string;
  notLoggedLabel: string;
  notLoggedHint: string;
  differsFromPlan: (logged: string, planned: string) => string;
  noPlanComparison: string;
  comparisonNoTarget: string;
  adherenceDisclaimer: string;
  planItemsTitle: string;
  planned: string;
  // ثبت غذا
  addLog: string;
  addFromPlan: string;
  addFromBank: string;
  logDialogTitle: string;
  logDialogFromPlan: string;
  logDialogFromBank: string;
  searchPlaceholder: string;
  searchNoResults: string;
  groupAll: string;
  amountLabel: string;
  unitGrams: string;
  unitServing: string;
  servingSizeInfo: (grams: string) => string;
  mealTypeLabel: string;
  timeLabel: string;
  realAmountNotice: string;
  previewTotals: string;
  confirmLog: string;
  logging: string;
  cancel: string;
  save: string;
  // فهرست ثبت‌ها
  dayListTitle: string;
  dayListEmptyTitle: string;
  dayListEmptyBody: string;
  editLog: string;
  deleteLog: string;
  loggedAt: (time: string) => string;
  fromPlanItem: string;
  loggedAmount: (grams: string) => string;
  editDialogTitle: string;
  // خطاها و تأییدها
  deleteConfirmTitle: string;
  deleteConfirmBody: (name: string) => string;
  deleteConfirmAction: string;
  deleteCancel: string;
  errorFoodNotFound: string;
  errorPlanItemNotFound: string;
  errorInvalidAmount: string;
  errorGramsRange: (min: string, max: string) => string;
  errorServingsRange: (min: string, max: string) => string;
  errorServingUnsupported: string;
  errorDayMismatch: string;
  errorDailyLimit: (max: string) => string;
  errorNetwork: string;
  errorAuth: string;
  errorValidation: string;
  errorNotFound: string;
  errorInternal: string;
  successLogged: string;
  successUpdated: string;
  successDeleted: string;
  // داشبورد
  dashboardTodayTitle: string;
  dashboardNoLogs: string;
  dashboardNoLogsHint: string;
  dashboardEnergy: string;
  dashboardProtein: string;
  dashboardEntries: string;
  dashboardGoToLog: string;
  // کارت خلاصه برنامه غذایی فعال (داشبورد)
  planCardTitle: string;
  planGoalLine: (goal: string, meals: string) => string;
  planCaution: string;
  planTargetEnergy: (kcal: string) => string;
  planTransparencyNote: string;
  planEmptyBody: string;
  planCreateCta: string;
  planViewMeals: string;
  // دکمه‌های کوتاه
  logShort: string;
  retry: string;
  // ایمنی
  safetyNote: string;
}

const FA: FoodLogStrings = {
  dir: "rtl",
  langAttr: "fa",
  sectionTitle: "مصرف واقعی غذا",
  sectionIntro:
    "آنچه واقعاً خورده‌اید را ثبت کنید — مستقل از برنامه غذایی. اگر برنامه فعال داشته باشید، مصرف واقعی با هدف برنامه مقایسه می‌شود.",
  estimateNote: "همه مقادیر انرژی و درشت‌مغذی تخمینی‌اند (میانگین جداول عمومی)؛ اندازه‌گیری آزمایشگاهی نیستند.",
  todayLabel: "امروز",
  dayLabel: (dateLabel) => `روز ${dateLabel}`,
  prevDay: "روز قبل",
  nextDay: "روز بعد",
  noFutureDay: "ثبت برای روزهای آینده معنا ندارد",
  totalsTitle: "جمع روز",
  totalKcal: "کیلوکالری",
  totalProtein: "پروتئین",
  totalCarb: "کربوهیدرات",
  totalFat: "چربی",
  logsCount: (n) => `${n.toLocaleString("fa-IR")} ثبت`,
  comparisonTitle: "مقایسه با برنامه غذایی",
  comparisonVsTarget: "مصرف واقعی در برابر هدف روزانه برنامه",
  targetLabel: "هدف برنامه",
  loggedLabel: "مصرف واقعی",
  notLoggedLabel: "هنوز ثبت نشده",
  notLoggedHint:
    "«ثبت نشده» به معنی نخوردن آن غذا نیست — فقط در این روز برای آن قلم ثبتی وجود ندارد.",
  differsFromPlan: (logged, planned) => `مقدار واقعی ${logged} گرم (برنامه: ${planned} گرم)`,
  noPlanComparison: "برنامه غذایی فعالی ندارید؛ ثبت مصرف واقعی مستقل از برنامه کار می‌کند.",
  comparisonNoTarget:
    "این برنامه در حالت احتیاط است و هدف کالری شخصی ندارد؛ فقط اقلام برنامه نمایش داده می‌شود.",
  adherenceDisclaimer:
    "این مقایسه صرفاً گزارش داده ثبت‌شده است؛ تضمین پایبندی به رژیم یا پیش‌بینی نتیجه جسمانی نیست.",
  planItemsTitle: "اقلام برنامه (روز اول)",
  planned: "پیشنهاد برنامه",
  addLog: "ثبت غذا",
  addFromPlan: "از برنامه",
  addFromBank: "از بانک غذا",
  logDialogTitle: "ثبت مصرف واقعی",
  logDialogFromPlan: "انتخاب از وعده‌های برنامه فعال",
  logDialogFromBank: "جست‌وجو در بانک مواد غذایی",
  searchPlaceholder: "نام غذا (فارسی یا انگلیسی)…",
  searchNoResults: "ماده‌ای با این نام در بانک پیدا نشد. غذاهای خارج از بانک در این مرحله ثبت نمی‌شوند.",
  groupAll: "همه گروه‌ها",
  amountLabel: "مقدار مصرف‌شده",
  unitGrams: "گرم",
  unitServing: "سهم",
  servingSizeInfo: (grams) => `هر سهم ≈ ${grams} گرم`,
  mealTypeLabel: "وعده",
  timeLabel: "زمان مصرف",
  realAmountNotice:
    "مقدار پیشنهادی برنامه به‌عنوان خورده‌شده ثبت نمی‌شود؛ مقدار واقعی را وارد یا تأیید کنید.",
  previewTotals: "تخمین این ثبت:",
  confirmLog: "ثبت مصرف",
  logging: "در حال ثبت…",
  cancel: "انصراف",
  save: "ذخیره تغییر",
  dayListTitle: "غذاهای ثبت‌شده این روز",
  dayListEmptyTitle: "این روز ثبت مصرفی ندارد",
  dayListEmptyBody:
    "هنوز غذایی برای این روز ثبت نشده است. با دکمه «ثبت غذا» آنچه خورده‌اید را اضافه کنید.",
  editLog: "ویرایش",
  deleteLog: "حذف",
  loggedAt: (time) => `ساعت ${time}`,
  fromPlanItem: "از برنامه",
  loggedAmount: (grams) => `${grams} گرم`,
  editDialogTitle: "ویرایش ثبت مصرف",
  deleteConfirmTitle: "حذف این ثبت؟",
  deleteConfirmBody: (name) =>
    `ثبت «${name}» برای همیشه حذف می‌شود و جمع روز و مقایسه با برنامه به‌روز می‌شود.`,
  deleteConfirmAction: "حذف ثبت",
  deleteCancel: "انصراف",
  errorFoodNotFound: "ماده غذایی انتخاب‌شده در بانک موجود نیست.",
  errorPlanItemNotFound: "قلم برنامه در دسترس نیست یا برنامه حذف شده است.",
  errorInvalidAmount: "مقدار واردشده معتبر نیست؛ عددی مثبت وارد کنید.",
  errorGramsRange: (min, max) => `مقدار باید بین ${min} تا ${max} گرم باشد.`,
  errorServingsRange: (min, max) => `تعداد سهم باید بین ${min} تا ${max} باشد.`,
  errorServingUnsupported: "برای این ماده سهم متداول معتبری ثبت نشده؛ با واحد گرم ثبت کنید.",
  errorDayMismatch: "روز انتخابی با زمان مصرف هم‌خوانی ندارد؛ روز یا زمان را اصلاح کنید.",
  errorDailyLimit: (max) => `تعداد ثبت این روز به سقف ${max} رسیده است.`,
  errorNetwork: "ارتباط با سرور برقرار نشد؛ تلاش دوباره همان ثبت را تکرار نمی‌کند.",
  errorAuth: "نشست شما منقضی شده است؛ دوباره وارد شوید.",
  errorValidation: "اطلاعات ارسالی معتبر نیست.",
  errorNotFound: "این ثبت در دسترس نیست یا حذف شده است.",
  errorInternal: "خطای غیرمنتظره سرور؛ لطفاً دوباره تلاش کنید.",
  successLogged: "مصرف واقعی ثبت شد",
  successUpdated: "ثبت به‌روزرسانی شد و جمع روز دوباره محاسبه شد",
  successDeleted: "ثبت حذف شد",
  dashboardTodayTitle: "مصرف واقعی امروز",
  planCardTitle: "برنامه غذایی",
  planGoalLine: (goal, meals) => `هدف: ${goal} — ${meals} وعده در روز`,
  planCaution: "حالت احتیاط — بدون هدف کالری شخصی",
  planTargetEnergy: (kcal) => `هدف انرژی روزانه: ${kcal} کیلوکالری (تخمینی)`,
  planTransparencyNote:
    "این هدف برنامهٔ پیشنهادی است؛ غذای واقعی خورده‌شده در بخش «مصرف واقعی غذا» ثبت و با همین هدف مقایسه می‌شود.",
  planEmptyBody:
    "برنامه غذایی فعالی ندارید. برنامه‌ساز بر اساس پروفایل و آلرژی‌های شما وعده‌ها را با مقدار گرم هر ماده پیشنهاد می‌دهد.",
  planCreateCta: "ساخت برنامه غذایی",
  planViewMeals: "مشاهده وعده‌ها",
  logShort: "ثبت مصرف",
  retry: "تلاش مجدد",
  dashboardNoLogs: "امروز ثبت مصرفی ندارید",
  dashboardNoLogsHint: "آنچه خورده‌اید را در بخش تغذیه ثبت کنید تا جمع واقعی روز دیده شود.",
  dashboardEnergy: "انرژی تخمینی",
  dashboardProtein: "پروتئین",
  dashboardEntries: "ثبت واقعی",
  dashboardGoToLog: "ثبت غذا",
  safetyNote:
    "این ابزار ثبت و برآورد است، نه رژیم درمانی. برای شرایط خاص پزشکی، بارداری، شیردهی یا سن زیر ۱۸ سال با متخصص مشورت کنید.",
};

const EN: FoodLogStrings = {
  dir: "ltr",
  langAttr: "en",
  sectionTitle: "Real food intake",
  sectionIntro:
    "Log what you actually ate — independent of any nutrition plan. If you have an active plan, your real intake is compared with its targets.",
  estimateNote:
    "All energy and macro values are estimates (public reference tables), not lab measurements.",
  todayLabel: "Today",
  dayLabel: (dateLabel) => `Day ${dateLabel}`,
  prevDay: "Previous day",
  nextDay: "Next day",
  noFutureDay: "Logging for future days is not meaningful",
  totalsTitle: "Daily totals",
  totalKcal: "kcal",
  totalProtein: "Protein",
  totalCarb: "Carbs",
  totalFat: "Fat",
  logsCount: (n) => `${n.toLocaleString("en-US")} ${n === 1 ? "entry" : "entries"}`,
  comparisonTitle: "Comparison with your plan",
  comparisonVsTarget: "Real intake versus the plan's daily target",
  targetLabel: "Plan target",
  loggedLabel: "Real intake",
  notLoggedLabel: "Not logged yet",
  notLoggedHint:
    "“Not logged” does not mean the food was skipped — it only means no entry exists for it on this day.",
  differsFromPlan: (logged, planned) => `Real amount ${logged} g (plan: ${planned} g)`,
  noPlanComparison:
    "You have no active nutrition plan; real-intake logging works independently of plans.",
  comparisonNoTarget:
    "This plan is in caution mode without a personal calorie target; only its items are listed.",
  adherenceDisclaimer:
    "This comparison only reports the data you logged; it is not an adherence guarantee or a prediction of physical results.",
  planItemsTitle: "Plan items (day 1)",
  planned: "Plan serving",
  addLog: "Log food",
  addFromPlan: "From plan",
  addFromBank: "From food bank",
  logDialogTitle: "Log real intake",
  logDialogFromPlan: "Pick from your active plan's meals",
  logDialogFromBank: "Search the food bank",
  searchPlaceholder: "Food name (Persian or English)…",
  searchNoResults:
    "No food with this name exists in the bank. Foods outside the bank cannot be logged in this phase.",
  groupAll: "All groups",
  amountLabel: "Consumed amount",
  unitGrams: "grams",
  unitServing: "serving",
  servingSizeInfo: (grams) => `1 serving ≈ ${grams} g`,
  mealTypeLabel: "Meal",
  timeLabel: "Consumption time",
  realAmountNotice:
    "The plan's suggested amount is never recorded as eaten; enter or confirm the real amount.",
  previewTotals: "Estimated for this entry:",
  confirmLog: "Log intake",
  logging: "Logging…",
  cancel: "Cancel",
  save: "Save changes",
  dayListTitle: "Foods logged on this day",
  dayListEmptyTitle: "No entries for this day",
  dayListEmptyBody:
    "Nothing has been logged for this day yet. Use “Log food” to add what you ate.",
  editLog: "Edit",
  deleteLog: "Delete",
  loggedAt: (time) => `at ${time}`,
  fromPlanItem: "From plan",
  loggedAmount: (grams) => `${grams} g`,
  editDialogTitle: "Edit intake entry",
  deleteConfirmTitle: "Delete this entry?",
  deleteConfirmBody: (name) =>
    `The entry “${name}” will be permanently deleted, and the daily totals and plan comparison will update.`,
  deleteConfirmAction: "Delete entry",
  deleteCancel: "Cancel",
  errorFoodNotFound: "The selected food does not exist in the bank.",
  errorPlanItemNotFound: "The plan item is unavailable, or the plan was deleted.",
  errorInvalidAmount: "The entered amount is not valid; enter a positive number.",
  errorGramsRange: (min, max) => `The amount must be between ${min} and ${max} grams.`,
  errorServingsRange: (min, max) => `Servings must be between ${min} and ${max}.`,
  errorServingUnsupported: "No common serving size exists for this food; log it in grams.",
  errorDayMismatch: "The selected day does not match the consumption time; fix the day or time.",
  errorDailyLimit: (max) => `This day reached its limit of ${max} entries.`,
  errorNetwork: "Could not reach the server; retrying does not duplicate the entry.",
  errorAuth: "Your session has expired; please sign in again.",
  errorValidation: "The submitted data is not valid.",
  errorNotFound: "This entry is unavailable or has been deleted.",
  errorInternal: "Unexpected server error; please try again.",
  successLogged: "Real intake logged",
  successUpdated: "Entry updated and daily totals recomputed",
  successDeleted: "Entry deleted",
  dashboardTodayTitle: "Today's real intake",
  planCardTitle: "Nutrition plan",
  planGoalLine: (goal, meals) => `Goal: ${goal} — ${meals} meals per day`,
  planCaution: "Caution mode — no personal calorie target",
  planTargetEnergy: (kcal) => `Daily energy target: ${kcal} kcal (estimated)`,
  planTransparencyNote:
    "This is the suggested plan's target; real food intake is logged in the \"Real food intake\" section and compared against it.",
  planEmptyBody:
    "You have no active nutrition plan. The plan builder suggests meals with per-item gram amounts based on your profile and allergies.",
  planCreateCta: "Create a nutrition plan",
  planViewMeals: "View meals",
  logShort: "Log intake",
  retry: "Retry",
  dashboardNoLogs: "No intake logged today",
  dashboardNoLogsHint: "Log what you eat in the nutrition section to see real daily totals.",
  dashboardEnergy: "Estimated energy",
  dashboardProtein: "Protein",
  dashboardEntries: "Real entries",
  dashboardGoToLog: "Log food",
  safetyNote:
    "This tool records and estimates; it is not diet therapy. For specific medical conditions, pregnancy, breastfeeding, or being under 18, consult a professional.",
};

const STRINGS: Record<UiLang, FoodLogStrings> = { fa: FA, en: EN };

export function foodLogStrings(lang: UiLang): FoodLogStrings {
  return STRINGS[lang];
}

/** برچسب دوزبانه نوع وعده — از همان enum وعده‌های برنامه (بدون نگاشت موازی) */
export function mealTypeLabel(type: string, lang: UiLang): string {
  const faLabels: Record<string, string> = {
    breakfast: "صبحانه",
    snack_am: "میان‌وعده صبح",
    lunch: "ناهار",
    snack_pm: "میان‌وعده عصر",
    dinner: "شام",
    snack_ev: "میان‌وعده شب",
  };
  const enLabels: Record<string, string> = {
    breakfast: "Breakfast",
    snack_am: "Morning snack",
    lunch: "Lunch",
    snack_pm: "Afternoon snack",
    dinner: "Dinner",
    snack_ev: "Evening snack",
  };
  return (lang === "en" ? enLabels[type] : faLabels[type]) ?? type;
}
