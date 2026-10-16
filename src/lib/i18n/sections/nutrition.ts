/**
 * دیکشنری بخش تغذیه — فهرست برنامه‌ها، فرم تنظیمات، جزئیات برنامه،
 * پیش‌نمایش، فهرست خرید و دیالوگ جایگزینی. الگو دقیقاً مطابق
 * sections/shell.ts است (اینترفیس تایپ‌شده + دو دیکشنری کامل fa/en + getter).
 *
 * قواعد این بخش:
 *  - برچسب گزینه‌های موتور تغذیه (هدف، الگوی غذایی، سطح فعالیت) نقشه نمایشی
 *    روی valueهای پایدار موتور هستند؛ داده موتور تغییر نمی‌کند.
 *  - نام مواد غذایی خودشان فیلد fa/en دارند (بانک مواد) و در کامپوننت‌ها
 *    بر اساس locale انتخاب می‌شوند؛ این دیکشنری فقط برچسب گروه‌ها و
 *    آلرژن‌های بانک را دوزبانه می‌کند.
 *  - متنی که «داده» است (عنوان وعده‌ها، یادداشت‌ها، هشدارهای ذخیره‌شده در
 *    برنامه، برچسب سهم متداول مواد و پیام‌های خطای سرور) عیناً نمایش داده
 *    می‌شود و ترجمه نمی‌شود.
 *  - توابع قالب متن، عدد از پیش قالب‌بندی‌شده می‌گیرند (localeNumber در
 *    کامپوننت با locale صدا زده می‌شود) تا دیکشنری مستقل از locale بماند.
 */

import type { Locale } from "../shared";
import { FOOD_GROUPS, type AllergenId, type FoodGroupId } from "../../foods/types";

/** ارقام فارسی برای برچسب نسخه‌ها — معادل نمایشی faDigits برای رشته نسخه */
const FA_DIGIT_MAP = "۰۱۲۳۴۵۶۷۸۹";
function toFaVersion(value: string): string {
  return value.replace(/[0-9]/g, (d) => FA_DIGIT_MAP[Number(d)] ?? d);
}

export interface NutritionStrings {
  /* ------------------------- واژه‌های مشترک بخش ------------------------- */
  /** واحدها و درشت‌مغذی‌ها — ردیف‌های ماکرو و کارت‌ها */
  kcalUnit: string;
  gramsUnit: string;
  proteinLabel: string;
  carbLabel: string;
  fatLabel: string;
  /** برچسب هدف تغذیه‌ای — نقشه نمایشی روی value پایدار موتور */
  goalLabel: (value: string) => string;
  /** برچسب الگوی غذایی موتور — نقشه نمایشی روی DietPattern */
  dietPatternOption: (value: string) => string;
  /** برچسب آلرژن بانک مواد — ALLERGEN_DEFS فارسی است؛ نقشه نمایشی */
  allergenLabel: (id: AllergenId) => string;
  /** برچسب گروه غذایی بانک — FOOD_GROUPS خودش fa/en دارد */
  groupLabel: (group: FoodGroupId) => string;
  /** نمایش نسخه — فارسی با ارقام فارسی، انگلیسی عیناً */
  versionLabel: (version: string) => string;

  /* ---------------------- فهرست برنامه‌ها (nutrition-view) ---------------------- */
  statusActive: string;
  statusArchived: string;
  /** «{n} وعده در روز» */
  mealsPerDayUnit: (count: string) => string;
  /** «{n} روز» */
  daysShort: (count: string) => string;
  oneDayPlan: string;
  /** «هدف {n} کیلوکالری» */
  targetKcalLabel: (kcal: string) => string;
  cautionMode: string;
  viewPlan: string;
  activate: string;
  delete: string;
  retry: string;
  activePlanSectionAria: string;
  activePlanHeading: string;
  archive: string;
  emptyTitle: string;
  emptyDescription: string;
  createPlan: string;
  noActivePlanNote: string;
  previousPlansAria: string;
  previousPlansHeading: string;
  createNewPlan: string;
  profileNoteBefore: string;
  profileLink: string;
  profileNoteAfter: string;
  settingsFormAria: string;
  settingsHeading: string;
  previewSectionAria: string;
  previewHeading: string;
  deleteDialogTitle: string;
  /** توضیح دیالوگ حذف — «{title}» نام برنامه ذخیره‌شده است */
  deleteDialogDescription: (title: string) => string;
  cancel: string;
  deletePlanConfirm: string;
  savedToast: string;
  activatedToast: string;
  archivedToast: string;
  deletedToast: string;

  /* ---------------------- فرم تنظیمات (settings-form) ---------------------- */
  ketoNote: string;
  estimateSectionAria: string;
  estimateHeading: string;
  ageLabel: string;
  heightLabel: string;
  weightLabel: string;
  yearsUnit: string;
  cmUnit: string;
  kgUnit: string;
  estimateFromProfileNote: string;
  estimateMissingNote: string;
  ageInputLabel: string;
  heightInputLabel: string;
  weightInputLabel: string;
  agePlaceholder: string;
  heightPlaceholder: string;
  weightPlaceholder: string;
  activityFieldLabel: string;
  /** گزینه سطح فعالیت — نقشه نمایشی روی id موتور؛ ناشناخته → fallback داده موتور */
  activityOption: (id: string, fallback: string) => string;
  underageWarning: string;
  pregnancyTitle: string;
  pregnancyHint: string;
  goalSectionAria: string;
  goalSectionHeading: string;
  goalFieldLabel: string;
  dietPatternFieldLabel: string;
  mealsPerDayFieldLabel: string;
  /** «{n} وعده» */
  mealsOption: (count: string) => string;
  planLengthFieldLabel: string;
  planLengthWeekly: string;
  planLengthDaily: string;
  prefsSectionAria: string;
  allergiesHeading: string;
  allergiesHint: string;
  /** «مواد نامطلوب (اختیاری) — از {count} ماده بانک:» */
  dislikedLabel: (count: string) => string;
  budgetFieldLabel: string;
  budgetAny: string;
  budgetLow: string;
  prepFieldLabel: string;
  prepAny: string;
  prepSimple: string;
  medicalDisclaimer: string;
  missingEstimateError: string;
  invalidInfoError: string;
  buildPreviewButton: string;
  previewBeforeSaveHint: string;

  /* ---------------------- جزئیات برنامه (plan-detail) ---------------------- */
  planSummaryAria: string;
  goalPrefix: string;
  /** «{n} روز با تنوع» */
  daysWithVariety: (count: string) => string;
  shoppingListButton: string;
  dailyKcalTargetCard: string;
  planDaysAvgCard: string;
  proteinTargetCard: string;
  bmrTdeeCard: string;
  approxWord: string;
  /** اختلاف میانگین با هدف — {word} همان approxWord است (منطق فعلی حفظ شده) */
  kcalDiffNote: (word: string, kcal: string) => string;
  cautionNote: string;
  engineNote: (engineVersion: string, foodsVersion: string) => string;
  mealsSectionAria: string;
  /** «روز {n}» */
  dayLabel: (order: string) => string;
  dayPlanLabel: string;
  servingPrefix: string;
  amountButton: string;
  swapButton: string;
  notesSectionAria: string;
  importantNotesHeading: string;
  /** «تغییر مقدار «{name}»» */
  gramsDialogTitle: (name: string) => string;
  gramsDialogHint: (current: string) => string;
  gramsInputAria: string;
  gramsInvalid: string;
  previewAfterSaveLabel: string;
  saveChangeButton: string;
  patchFailedToast: string;
  networkToast: string;
  gramsUpdatedToast: string;
  replacedToast: string;

  /* ---------------------- پیش‌نمایش برنامه (plan-preview) ---------------------- */
  estimateSummaryAria: string;
  estimateSummaryHeading: string;
  /** مقدمه حالت احتیاط — ادامه جمله از هشدارهای موتور (داده) می‌آید */
  cautionIntro: string;
  bmrCard: string;
  tdeeCard: string;
  /** «ضریب فعالیت {n}» */
  activityFactorLabel: (factor: string) => string;
  planTargetCard: string;
  kcalPerDayUnit: string;
  formulaNote: string;
  /** جمع انرژی درشت‌مغذی‌ها — ادامه formulaNote با فاصله آغازین */
  macroDiffSuffix: (kcal: string) => string;
  weeklyPlanName: string;
  oneDayPlanName: string;
  /** «الگوی {label} — » */
  patternPrefix: (label: string) => string;
  /** جمله موتور و بانک مواد — «از بانک {count} ماده واقعی…» */
  engineFoodCountNote: (count: string) => string;
  savePlanButton: string;
  backToSettingsButton: string;

  /* ---------------------- فهرست خرید (shopping-dialog) ---------------------- */
  shoppingTitle: string;
  shoppingDescription: string;
  planDaysLabel: string;
  /** «محاسبه برای {count} روز انتخابی» */
  calcForDaysButton: (count: string) => string;
  computingLabel: string;
  emptyShoppingNote: string;
  loadFailedToast: string;
  approxAmountsNote: string;
  closeButton: string;

  /* ---------------------- دیالوگ جایگزینی (replace-dialog) ---------------------- */
  replaceDialogTitle: (name: string) => string;
  replaceDialogDescription: (grams: string) => string;
  noSuggestionNote: string;
  currentFoodPrefix: string;
  /** « ({group} — {kcal} کیلوکالری)» */
  currentFoodMeta: (group: string, kcal: string) => string;
  /** «(انرژی {diff} نسبت به فعلی)» — علامت داخل {diff} می‌آید */
  kcalDiffLabel: (diff: string) => string;
  replaceConfirmButton: string;
}

const FA: NutritionStrings = {
  /* ------------------------- واژه‌های مشترک بخش ------------------------- */
  kcalUnit: "کیلوکالری",
  gramsUnit: "گرم",
  proteinLabel: "پروتئین",
  carbLabel: "کربوهیدرات",
  fatLabel: "چربی",
  goalLabel: (value) =>
    (
      {
        weight_loss: "کاهش وزن تدریجی",
        muscle_gain: "پشتیبانی از عضله‌سازی",
        maintain: "حفظ وزن",
      } as Record<string, string>
    )[value] ?? value,
  dietPatternOption: (value) =>
    ({ none: "معمولی", vegetarian: "گیاهخواری", vegan: "وگان" } as Record<string, string>)[value] ?? value,
  allergenLabel: (id) =>
    (
      {
        dairy: "لبنیات",
        gluten: "گلوتن",
        nuts: "آجیل و مغزها",
        seafood: "غذای دریایی",
        egg: "تخم‌مرغ",
        soy: "سویا",
      } as Record<AllergenId, string>
    )[id] ?? id,
  groupLabel: (group) => FOOD_GROUPS.find((g) => g.id === group)?.fa ?? group,
  versionLabel: (version) => toFaVersion(version),

  /* ---------------------- فهرست برنامه‌ها (nutrition-view) ---------------------- */
  statusActive: "فعال",
  statusArchived: "بایگانی",
  mealsPerDayUnit: (count) => `${count} وعده در روز`,
  daysShort: (count) => `${count} روز`,
  oneDayPlan: "یک‌روزه",
  targetKcalLabel: (kcal) => `هدف ${kcal} کیلوکالری`,
  cautionMode: "حالت احتیاط",
  viewPlan: "مشاهده برنامه",
  activate: "فعال‌سازی",
  delete: "حذف",
  retry: "تلاش مجدد",
  activePlanSectionAria: "برنامه غذایی فعال",
  activePlanHeading: "برنامه فعال",
  archive: "بایگانی",
  emptyTitle: "هنوز برنامه غذایی نساخته‌اید",
  emptyDescription:
    "برنامه‌ساز تغذیه بر اساس هدف، سطح فعالیت، الگوی غذایی و آلرژی‌های شما — و از بانک مواد غذایی واقعی — برنامه وعده‌ها را با مقدار گرم هر ماده می‌سازد. تنظیمات را پر کنید، پیش‌نمایش را ببینید و ذخیره کنید.",
  createPlan: "ساخت برنامه غذایی",
  noActivePlanNote: "برنامه فعالی ندارید؛ یکی از برنامه‌های بایگانی را فعال کنید یا برنامه جدیدی بسازید.",
  previousPlansAria: "برنامه‌های قبلی",
  previousPlansHeading: "برنامه‌های قبلی",
  createNewPlan: "ساخت برنامه جدید",
  profileNoteBefore: "اطلاعات پایه (سن، قد، وزن، آلرژی‌ها) از ",
  profileLink: "پروفایل",
  profileNoteAfter: " خوانده می‌شود؛ اطلاعات گمشده را همین فرم می‌پرسد.",
  settingsFormAria: "تنظیمات برنامه غذایی جدید",
  settingsHeading: "تنظیمات برنامه غذایی",
  previewSectionAria: "پیش‌نمایش برنامه غذایی",
  previewHeading: "پیش‌نمایش برنامه",
  deleteDialogTitle: "حذف برنامه غذایی",
  deleteDialogDescription: (title) =>
    `برنامه «${title}» برای همیشه حذف می‌شود و قابل بازگشت نیست. اگر این برنامه فعال است، پس از حذف برنامه فعالی باقی نمی‌ماند.`,
  cancel: "انصراف",
  deletePlanConfirm: "حذف برنامه",
  savedToast: "برنامه غذایی ذخیره و فعال شد",
  activatedToast: "برنامه فعال شد؛ برنامه فعال قبلی بایگانی شد",
  archivedToast: "برنامه بایگانی شد",
  deletedToast: "برنامه حذف شد",

  /* ---------------------- فرم تنظیمات (settings-form) ---------------------- */
  ketoNote: "الگوی کتوژنیک در موتور فعلی پشتیبانی نمی‌شود؛ برنامه با الگوی معمولی ساخته می‌شود.",
  estimateSectionAria: "اطلاعات برآورد",
  estimateHeading: "اطلاعات برآورد انرژی",
  ageLabel: "سن",
  heightLabel: "قد",
  weightLabel: "وزن",
  yearsUnit: "سال",
  cmUnit: "سانتی‌متر",
  kgUnit: "کیلوگرم",
  estimateFromProfileNote:
    "از پروفایل شما خوانده شد. برای اصلاح، پروفایل را ویرایش کنید — این فرم پروفایل را تغییر نمی‌دهد.",
  estimateMissingNote:
    "این اطلاعات در پروفایل شما ثبت نشده است. برای برآورد کالری همین‌جا وارد کنید؛ فقط برای همین برنامه استفاده می‌شود و پروفایل تغییر نمی‌کند.",
  ageInputLabel: "سن (سال)",
  heightInputLabel: "قد (سانتی‌متر)",
  weightInputLabel: "وزن (کیلوگرم)",
  agePlaceholder: "مثلاً ۳۰",
  heightPlaceholder: "مثلاً ۱۷۵",
  weightPlaceholder: "مثلاً ۷۵",
  activityFieldLabel: "سطح فعالیت روزانه (خارج از تمرین)",
  activityOption: (id, fallback) =>
    (
      {
        sedentary: "کم‌تحرک — کار نشسته و بدون ورزش منظم",
        light: "سبک — ورزش سبک ۱ تا ۳ روز در هفته",
        moderate: "متوسط — ورزش ۳ تا ۵ روز در هفته",
        active: "فعال — ورزش ۶ تا ۷ روز در هفته",
        very_active: "بسیار فعال — ورزش سنگین یا کار بدنی سنگین",
      } as Record<string, string>
    )[id] ?? fallback,
  underageWarning:
    "سن کمتر از ۱۸ سال: هدف کاهش یا افزایش وزن خودکار تنظیم نمی‌شود و برنامه با هدف حفظ وزن ساخته خواهد شد. برای برنامه اختصاصی با متخصص تغذیه مشورت کنید.",
  pregnancyTitle: "بارداری یا شیردهی",
  pregnancyHint: "در این حالت هدف کالری کاهشی/افزایشی خودکار تنظیم نمی‌شود.",
  goalSectionAria: "هدف و ساختار برنامه",
  goalSectionHeading: "هدف و ساختار برنامه",
  goalFieldLabel: "هدف تغذیه‌ای",
  dietPatternFieldLabel: "الگوی غذایی",
  mealsPerDayFieldLabel: "تعداد وعده در روز",
  mealsOption: (count) => `${count} وعده`,
  planLengthFieldLabel: "طول برنامه",
  planLengthWeekly: "هفتگی — ۷ روز با تنوع",
  planLengthDaily: "یک‌روزه — الگوی تکراری",
  prefsSectionAria: "ترجیحات و محدودیت‌ها",
  allergiesHeading: "آلرژی‌ها و ترجیحات",
  allergiesHint: "آلرژی‌ها — مواد دارای این آلرژن‌ها به‌طور کامل حذف می‌شوند:",
  dislikedLabel: (count) => `مواد نامطلوب (اختیاری) — از ${count} ماده بانک:`,
  budgetFieldLabel: "بودجه",
  budgetAny: "بدون محدودیت",
  budgetLow: "اقتصادی — مواد گران حذف شود",
  prepFieldLabel: "آماده‌سازی غذا",
  prepAny: "بدون اولویت",
  prepSimple: "ساده و سریع",
  medicalDisclaimer:
    "اگر بیماری مرتبط با تغذیه، اختلال خوردن یا نیاز درمانی دارید، این ابزار برای شما مناسب نیست؛ لطفاً با پزشک یا متخصص تغذیه مشورت کنید.",
  missingEstimateError:
    "برای برآورد کالری، سن، قد و وزن لازم است — این مقادیر فقط برای همین برنامه استفاده می‌شوند و پروفایل شما تغییر نمی‌کند.",
  invalidInfoError: "اطلاعات معتبر نیست.",
  buildPreviewButton: "ساخت پیش‌نمایش برنامه",
  previewBeforeSaveHint: "پیش‌نمایش قبل از ذخیره نمایش داده می‌شود",

  /* ---------------------- جزئیات برنامه (plan-detail) ---------------------- */
  planSummaryAria: "خلاصه برنامه غذایی",
  goalPrefix: "هدف: ",
  daysWithVariety: (count) => `${count} روز با تنوع`,
  shoppingListButton: "فهرست خرید",
  dailyKcalTargetCard: "هدف کالری روزانه",
  planDaysAvgCard: "میانگین روزهای برنامه",
  proteinTargetCard: "پروتئین هدف",
  bmrTdeeCard: "BMR / TDEE تخمینی",
  approxWord: "حدود",
  kcalDiffNote: (word, kcal) =>
    `میانگین انرژی روزهای برنامه با هدف ${word} ${kcal} کیلوکالری اختلاف دارد — نتیجه واقعی اجزای برنامه است و برای تطبیق ظاهری دستکاری نشده است.`,
  cautionNote:
    "این برنامه در حالت احتیاط و بر پایه حفظ وزن ساخته شده است؛ برای تغییر هدف با متخصص مشورت کنید.",
  engineNote: (engineVersion, foodsVersion) =>
    `محاسبات با موتور قانون‌محور نسخه ${engineVersion} و بانک مواد نسخه ${foodsVersion} تولید شده است.`,
  mealsSectionAria: "وعده‌های برنامه",
  dayLabel: (order) => `روز ${order}`,
  dayPlanLabel: "برنامه روز",
  servingPrefix: "سهم متداول: ",
  amountButton: "مقدار",
  swapButton: "جایگزین",
  notesSectionAria: "یادداشت‌ها",
  importantNotesHeading: "یادداشت‌های مهم",
  gramsDialogTitle: (name) => `تغییر مقدار «${name}»`,
  gramsDialogHint: (current) =>
    `مقدار فعلی: ${current} گرم. مقدار جدید را وارد کنید و نتیجه را پیش از ذخیره ببینید.`,
  gramsInputAria: "مقدار جدید به گرم",
  gramsInvalid: "مقدار باید عددی بین ۱۰ تا ۱۵۰۰ گرم باشد.",
  previewAfterSaveLabel: "پیش‌نمایش پس از ذخیره:",
  saveChangeButton: "ذخیره تغییر",
  patchFailedToast: "تغییر ممکن نشد؛ دوباره تلاش کنید.",
  networkToast: "ارتباط با سرور برقرار نشد.",
  gramsUpdatedToast: "مقدار به‌روزرسانی و مجموع‌ها دوباره محاسبه شد",
  replacedToast: "ماده جایگزین شد و مجموع‌ها دوباره محاسبه شد",

  /* ---------------------- پیش‌نمایش برنامه (plan-preview) ---------------------- */
  estimateSummaryAria: "خلاصه برآورد",
  estimateSummaryHeading: "خلاصه برآورد انرژی (تخمینی)",
  cautionIntro:
    "حالت احتیاط: برای شما هدف کالری کاهشی/افزایشی خودکار تنظیم نمی‌شود و برنامه بر پایه حفظ وزن ساخته شده است. ",
  bmrCard: "BMR پایه",
  tdeeCard: "TDEE روزانه",
  activityFactorLabel: (factor) => `ضریب فعالیت ${factor}`,
  planTargetCard: "هدف برنامه",
  kcalPerDayUnit: "کیلوکالری در روز",
  formulaNote:
    "فرمول: Mifflin–St Jeor برای سوخت‌وساز پایه × ضریب سطح فعالیت؛ همه اعداد تخمین‌اند، نه اندازه‌گیری دقیق نیاز بدن یا توصیه پزشکی.",
  macroDiffSuffix: (kcal) =>
    ` جمع انرژی درشت‌مغذی‌ها با هدف حدود ${kcal} کیلوکالری اختلاف دارد (گرد کردن و محدوده‌های استاندارد).`,
  weeklyPlanName: "برنامه هفتگی",
  oneDayPlanName: "برنامه یک‌روزه",
  patternPrefix: (label) => `الگوی ${label} — `,
  engineFoodCountNote: (count) =>
    `موتور قانون‌محور از بانک ${count} ماده واقعی انتخاب کرده است؛ هیچ ادعای هوش مصنوعی وجود ندارد.`,
  savePlanButton: "تأیید و ذخیره برنامه",
  backToSettingsButton: "بازگشت به تنظیمات",

  /* ---------------------- فهرست خرید (shopping-dialog) ---------------------- */
  shoppingTitle: "فهرست خرید",
  shoppingDescription:
    "مواد لازم از برنامه ذخیره‌شده شما تجمیع شده است. برای برنامه چندروزه می‌توانید بازه را انتخاب کنید. تیک خریداری‌شده‌ها فقط در همین صفحه نگه داشته می‌شود.",
  planDaysLabel: "روزهای برنامه:",
  calcForDaysButton: (count) => `محاسبه برای ${count} روز انتخابی`,
  computingLabel: "در حال محاسبه…",
  emptyShoppingNote: "برای روزهای انتخابی ماده‌ای یافت نشد.",
  loadFailedToast: "ساخت فهرست خرید ممکن نشد.",
  approxAmountsNote:
    "مقادیر تقریبی و برای آشپزی کافی‌اند؛ مواد مشترک چند روز یک‌جا تجمیع شده‌اند.",
  closeButton: "بستن",

  /* ---------------------- دیالوگ جایگزینی (replace-dialog) ---------------------- */
  replaceDialogTitle: (name) => `جایگزینی «${name}»`,
  replaceDialogDescription: (grams) =>
    `پیشنهادها فقط از مواد سازگار با محدودیت‌های این برنامه (آلرژی، الگوی غذایی، مواد نامطلوب و بودجه) انتخاب شده‌اند. مقدار پیشنهادی برای نزدیک‌شدن انرژی به مقدار فعلی (${grams} گرم) تنظیم شده است؛ هیچ دو ماده‌ای «معادل کامل» نیستند و اختلاف درشت‌مغذی‌ها را ببینید.`,
  noSuggestionNote:
    "با محدودیت‌های این برنامه، گزینه جایگزین مناسبی یافت نشد. می‌توانید به‌جای جایگزینی، مقدار را تغییر دهید یا تنظیمات محدودیت را بازبینی کنید.",
  currentFoodPrefix: "ماده فعلی: ",
  currentFoodMeta: (group, kcal) => ` (${group} — ${kcal} کیلوکالری)`,
  kcalDiffLabel: (diff) => `(انرژی ${diff} نسبت به فعلی)`,
  replaceConfirmButton: "جایگزینی و محاسبه مجدد",
};

const EN: NutritionStrings = {
  /* ------------------------- واژه‌های مشترک بخش ------------------------- */
  kcalUnit: "kcal",
  gramsUnit: "g",
  proteinLabel: "Protein",
  carbLabel: "Carbs",
  fatLabel: "Fat",
  goalLabel: (value) =>
    (
      {
        weight_loss: "Gradual weight loss",
        muscle_gain: "Muscle-gain support",
        maintain: "Maintain weight",
      } as Record<string, string>
    )[value] ?? value,
  dietPatternOption: (value) =>
    ({ none: "Regular", vegetarian: "Vegetarian", vegan: "Vegan" } as Record<string, string>)[value] ?? value,
  allergenLabel: (id) =>
    (
      {
        dairy: "Dairy",
        gluten: "Gluten",
        nuts: "Nuts",
        seafood: "Seafood",
        egg: "Egg",
        soy: "Soy",
      } as Record<AllergenId, string>
    )[id] ?? id,
  groupLabel: (group) => FOOD_GROUPS.find((g) => g.id === group)?.en ?? group,
  versionLabel: (version) => version,

  /* ---------------------- فهرست برنامه‌ها (nutrition-view) ---------------------- */
  statusActive: "Active",
  statusArchived: "Archived",
  mealsPerDayUnit: (count) => `${count} meals per day`,
  daysShort: (count) => `${count} days`,
  oneDayPlan: "One-day plan",
  targetKcalLabel: (kcal) => `Target ${kcal} kcal`,
  cautionMode: "Caution mode",
  viewPlan: "View plan",
  activate: "Activate",
  delete: "Delete",
  retry: "Try again",
  activePlanSectionAria: "Active nutrition plan",
  activePlanHeading: "Active plan",
  archive: "Archive",
  emptyTitle: "You haven't created a nutrition plan yet",
  emptyDescription:
    "Based on your goal, activity level, diet pattern and allergies — and drawn from the real food bank — the plan builder creates your meals with the gram amount of every food. Fill in the settings, review the preview and save.",
  createPlan: "Create a nutrition plan",
  noActivePlanNote:
    "You have no active plan; activate one of the archived plans or create a new one.",
  previousPlansAria: "Previous plans",
  previousPlansHeading: "Previous plans",
  createNewPlan: "Create a new plan",
  profileNoteBefore: "Basic info (age, height, weight, allergies) is read from your ",
  profileLink: "profile",
  profileNoteAfter: "; the form below asks for anything missing.",
  settingsFormAria: "New nutrition plan settings",
  settingsHeading: "Nutrition plan settings",
  previewSectionAria: "Nutrition plan preview",
  previewHeading: "Plan preview",
  deleteDialogTitle: "Delete nutrition plan",
  deleteDialogDescription: (title) =>
    `The plan "${title}" will be deleted permanently and cannot be restored. If this is the active plan, no active plan will remain after deletion.`,
  cancel: "Cancel",
  deletePlanConfirm: "Delete plan",
  savedToast: "Nutrition plan saved and activated",
  activatedToast: "Plan activated; the previous active plan was archived",
  archivedToast: "Plan archived",
  deletedToast: "Plan deleted",

  /* ---------------------- فرم تنظیمات (settings-form) ---------------------- */
  ketoNote:
    "The ketogenic pattern isn't supported by the current engine; the plan is built with the regular pattern.",
  estimateSectionAria: "Estimate info",
  estimateHeading: "Energy estimate info",
  ageLabel: "Age",
  heightLabel: "Height",
  weightLabel: "Weight",
  yearsUnit: "years",
  cmUnit: "cm",
  kgUnit: "kg",
  estimateFromProfileNote:
    "Read from your profile. To correct it, edit your profile — this form does not modify your profile.",
  estimateMissingNote:
    "This information isn't in your profile yet. Enter it here for the calorie estimate; it is used only for this plan and your profile stays unchanged.",
  ageInputLabel: "Age (years)",
  heightInputLabel: "Height (centimeters)",
  weightInputLabel: "Weight (kilograms)",
  agePlaceholder: "e.g. 30",
  heightPlaceholder: "e.g. 175",
  weightPlaceholder: "e.g. 75",
  activityFieldLabel: "Daily activity level (outside workouts)",
  activityOption: (id, fallback) =>
    (
      {
        sedentary: "Sedentary — seated work and no regular exercise",
        light: "Light — light exercise 1–3 days a week",
        moderate: "Moderate — exercise 3–5 days a week",
        active: "Active — exercise 6–7 days a week",
        very_active: "Very active — hard training or heavy physical work",
      } as Record<string, string>
    )[id] ?? fallback,
  underageWarning:
    "Under 18: weight-loss or weight-gain targets are not set automatically and the plan will be built with a maintain-weight goal. For a tailored plan, consult a registered dietitian.",
  pregnancyTitle: "Pregnancy or breastfeeding",
  pregnancyHint: "In this case, no automatic calorie-deficit/surplus target is set.",
  goalSectionAria: "Goal and plan structure",
  goalSectionHeading: "Goal and plan structure",
  goalFieldLabel: "Nutrition goal",
  dietPatternFieldLabel: "Diet pattern",
  mealsPerDayFieldLabel: "Meals per day",
  mealsOption: (count) => `${count} meals`,
  planLengthFieldLabel: "Plan length",
  planLengthWeekly: "Weekly — 7 days with variety",
  planLengthDaily: "One-day — repeating pattern",
  prefsSectionAria: "Preferences and restrictions",
  allergiesHeading: "Allergies and preferences",
  allergiesHint: "Allergies — foods containing these allergens are removed completely:",
  dislikedLabel: (count) => `Disliked foods (optional) — out of ${count} bank foods:`,
  budgetFieldLabel: "Budget",
  budgetAny: "No restriction",
  budgetLow: "Budget-friendly — exclude expensive foods",
  prepFieldLabel: "Meal prep",
  prepAny: "No preference",
  prepSimple: "Simple and quick",
  medicalDisclaimer:
    "If you have a nutrition-related condition, an eating disorder, or medical needs, this tool is not right for you; please consult a doctor or registered dietitian.",
  missingEstimateError:
    "Age, height and weight are required for the calorie estimate — these values are used only for this plan and your profile is not changed.",
  invalidInfoError: "The information provided is not valid.",
  buildPreviewButton: "Build plan preview",
  previewBeforeSaveHint: "A preview is shown before saving",

  /* ---------------------- جزئیات برنامه (plan-detail) ---------------------- */
  planSummaryAria: "Nutrition plan summary",
  goalPrefix: "Goal: ",
  daysWithVariety: (count) => `${count} days with variety`,
  shoppingListButton: "Shopping list",
  dailyKcalTargetCard: "Daily calorie target",
  planDaysAvgCard: "Plan-days average",
  proteinTargetCard: "Protein target",
  bmrTdeeCard: "Estimated BMR / TDEE",
  approxWord: "about",
  kcalDiffNote: (word, kcal) =>
    `The average energy of the plan days differs from the target by ${word} ${kcal} kcal — this is the real result of the plan's components and has not been adjusted to look closer.`,
  cautionNote:
    "This plan was built in caution mode on a maintain-weight basis; consult a professional to change the goal.",
  engineNote: (engineVersion, foodsVersion) =>
    `Calculations were produced by rule-based engine version ${engineVersion} and food bank version ${foodsVersion}.`,
  mealsSectionAria: "Plan meals",
  dayLabel: (order) => `Day ${order}`,
  dayPlanLabel: "Day plan",
  servingPrefix: "Typical serving: ",
  amountButton: "Amount",
  swapButton: "Swap",
  notesSectionAria: "Notes",
  importantNotesHeading: "Important notes",
  gramsDialogTitle: (name) => `Change amount of "${name}"`,
  gramsDialogHint: (current) =>
    `Current amount: ${current} g. Enter the new amount and see the result before saving.`,
  gramsInputAria: "New amount in grams",
  gramsInvalid: "The amount must be a number between 10 and 1500 grams.",
  previewAfterSaveLabel: "Preview after saving:",
  saveChangeButton: "Save change",
  patchFailedToast: "The change failed; please try again.",
  networkToast: "Could not reach the server.",
  gramsUpdatedToast: "Amount updated and totals recalculated",
  replacedToast: "Food replaced and totals recalculated",

  /* ---------------------- پیش‌نمایش برنامه (plan-preview) ---------------------- */
  estimateSummaryAria: "Estimate summary",
  estimateSummaryHeading: "Energy estimate summary (approximate)",
  cautionIntro:
    "Caution mode: no automatic weight-loss/weight-gain calorie target is set for you and the plan is built on a maintain-weight basis. ",
  bmrCard: "Basal BMR",
  tdeeCard: "Daily TDEE",
  activityFactorLabel: (factor) => `Activity factor ${factor}`,
  planTargetCard: "Plan target",
  kcalPerDayUnit: "kcal per day",
  formulaNote:
    "Formula: Mifflin–St Jeor for basal metabolic rate × activity-level factor; all numbers are estimates, not an exact measurement of your body's needs or medical advice.",
  macroDiffSuffix: (kcal) =>
    ` The total macro energy differs from the target by about ${kcal} kcal (rounding and standard ranges).`,
  weeklyPlanName: "Weekly plan",
  oneDayPlanName: "One-day plan",
  patternPrefix: (label) => `${label} pattern — `,
  engineFoodCountNote: (count) =>
    `The rule-based engine selected from ${count} real foods in the bank; no artificial intelligence is claimed.`,
  savePlanButton: "Confirm and save plan",
  backToSettingsButton: "Back to settings",

  /* ---------------------- فهرست خرید (shopping-dialog) ---------------------- */
  shoppingTitle: "Shopping list",
  shoppingDescription:
    "The ingredients from your saved plan have been combined. For multi-day plans you can choose the range. Purchased checkmarks are kept only on this page.",
  planDaysLabel: "Plan days:",
  calcForDaysButton: (count) => `Calculate for ${count} selected days`,
  computingLabel: "Calculating…",
  emptyShoppingNote: "No foods were found for the selected days.",
  loadFailedToast: "The shopping list could not be built.",
  approxAmountsNote:
    "Amounts are approximate and adequate for cooking; foods shared across several days are combined in one place.",
  closeButton: "Close",

  /* ---------------------- دیالوگ جایگزینی (replace-dialog) ---------------------- */
  replaceDialogTitle: (name) => `Replace "${name}"`,
  replaceDialogDescription: (grams) =>
    `Suggestions are selected only from foods compatible with this plan's restrictions (allergies, diet pattern, disliked foods and budget). The suggested amount is adjusted to bring the energy close to the current amount (${grams} g); no two foods are a "perfect equivalent", so check the macronutrient differences.`,
  noSuggestionNote:
    "With this plan's restrictions, no suitable replacement was found. Instead of swapping, you can change the amount or review the restriction settings.",
  currentFoodPrefix: "Current food: ",
  currentFoodMeta: (group, kcal) => ` (${group} — ${kcal} kcal)`,
  kcalDiffLabel: (diff) => `(${diff} kcal vs. current)`,
  replaceConfirmButton: "Replace and recalculate",
};

const STRINGS: Record<Locale, NutritionStrings> = { fa: FA, en: EN };

export function nutritionStrings(locale: Locale): NutritionStrings {
  return STRINGS[locale];
}
