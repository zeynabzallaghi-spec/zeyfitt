/**
 * دیکشنری سازنده برنامه‌های اختصاصی مربی — مرحله ۱۶.
 * شامل تب‌های «برنامه‌های تمرینی من» و «برنامه‌های غذایی من» در پنل مربی:
 * فهرست، سازنده روز/حرکت و روز/وعده/غذا، پیش‌نمایش، ارسال و تاریخچه نسخه‌ها.
 * الگو مطابق سایر sectionsها: اینترفیس تایپ‌شده + دو دیکشنری کامل fa/en.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface CoachPlansStrings {
  // تب‌های پنل مربی
  existingTab: string;
  workoutPlansTab: string;
  nutritionPlansTab: string;
  documentTitleWorkout: string;
  documentTitleNutrition: string;

  // سربرگ فهرست
  workoutListTitle: string;
  workoutListIntro: string;
  nutritionListTitle: string;
  nutritionListIntro: string;
  newWorkoutPlan: string;
  newNutritionPlan: string;
  refresh: string;
  loading: string;
  retry: string;
  loadError: string;
  emptyPlansTitle: string;
  emptyWorkoutPlansNote: string;
  emptyNutritionPlansNote: string;

  // کارت برنامه
  goalLabel: string;
  difficultyLabel: string;
  durationLabel: string;
  daysLabel: string;
  exercisesCountLabel: string;
  mealsCountLabel: string;
  itemsCountLabel: string;
  versionLabel: string;
  studentLabel: string;
  lastSentLabel: string;
  neverSent: string;
  updatedAtLabel: string;
  statusDraft: string;
  statusPublished: string;
  statusArchived: string;
  actionPreview: string;
  actionEdit: string;
  actionSend: string;
  actionArchive: string;
  actionDelete: string;
  actionPdf: string;
  deleteConfirmTitle: string;
  deleteConfirmNote: string;
  deleteYes: string;
  deleteNo: string;
  deletedToast: string;
  filterAllTypes: string;
  filterPrivate: string;
  filterSemiPrivate: string;
  filterStudentPlaceholder: string;
  filterCoachPlaceholder: string;
  filterUnassigned: string;
  filterNoType: string;
  archivedNote: string;

  // برچسب‌های کد
  workoutGoalLabel: (code: string) => string;
  nutritionGoalLabel: (code: string) => string;
  difficultyOf: (code: string) => string;

  // فرم پایه
  builderTitleNew: string;
  builderTitleEdit: string;
  daysCount: (n: number) => string;
  basicInfoTitle: string;
  titleLabel: string;
  titlePlaceholder: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  goalSelect: string;
  difficultySelect: string;
  durationInputLabel: string;
  durationUnit: string;
  daysSectionTitle: string;
  addDay: string;
  dayTitleLabel: string;
  dayTitlePlaceholder: string;
  removeDay: string;
  moveUp: string;
  moveDown: string;
  dayNumber: (n: number) => string;
  estMinutesLabel: string;

  // ویرایشگر حرکت
  addExercise: string;
  exercisePickerTitle: string;
  personalExerciseBadge: string;
  exerciseSearchPlaceholder: string;
  noExerciseResults: string;
  selectExercise: string;
  selectedExercise: string;
  removeExercise: string;
  setsLabel: string;
  repsMinLabel: string;
  repsMaxLabel: string;
  restLabel: string;
  restUnit: string;
  suggestedWeightLabel: string;
  suggestedWeightOptional: string;
  exerciseNoteLabel: string;
  exerciseNotePlaceholder: string;
  repsRangeHint: (min: number, max: number) => string;

  // ویرایشگر وعده و غذا
  addMeal: string;
  mealTypeLabel: string;
  addItem: string;
  foodPickerTitle: string;
  foodSearchPlaceholder: string;
  noFoodResults: string;
  selectFood: string;
  amountLabel: string;
  unitLabel: string;
  unitGrams: string;
  unitServing: string;
  removeItem: string;
  mealTotalsLabel: string;
  dayTotalsLabel: string;
  estimateNote: string;
  maxGramsNote: (n: number) => string;

  // ذخیره و پیش‌نمایش
  saveDraft: string;
  saving: string;
  previewTitle: string;
  previewIntro: string;
  close: string;
  draftSavedTitle: string;
  draftSavedNote: string;
  emptyContentWarning: string;
  serverComputeNote: string;
  snapshotNote: string;

  // ارسال
  sendDialogTitle: string;
  sendDialogIntro: string;
  selectStudent: string;
  noActiveStudents: string;
  noActiveStudentsNote: string;
  planSummaryTitle: string;
  sendStudentLabel: string;
  sendConfirmButton: string;
  sending: string;
  sentSuccessTitle: string;
  sentSuccessNote: (v: number) => string;
  resendHint: string;
  unassignedBadge: string;

  // تاریخچه نسخه‌ها
  versionsTitle: string;
  versionN: (n: number) => string;
  versionsEmpty: string;
  versionsIntro: string;
  editAfterSendNote: string;

  // تأیید بایگانی
  archiveConfirmTitle: string;
  archiveConfirmNote: string;
  archiveYes: string;
  archiveNo: string;
  archivedToast: string;

  // خطاهای فرم
  formErrorsTitle: string;
  invalidTitle: string;
  invalidDays: string;
  invalidExercises: string;
  invalidItems: string;
  exerciseNotFound: string;
  foodNotFound: string;
}

const fa: CoachPlansStrings = {
  existingTab: "پروفایل و درخواست‌ها",
  workoutPlansTab: "برنامه‌های تمرینی دانشجویان من",
  nutritionPlansTab: "برنامه‌های غذایی دانشجویان من",
  documentTitleWorkout: "برنامه‌های تمرینی من",
  documentTitleNutrition: "برنامه‌های غذایی من",

  workoutListTitle: "برنامه‌های تمرینی من",
  workoutListIntro:
    "برنامه تمرینی اختصاصی بسازید، پیش‌نویس را ویرایش کنید و نسخه نهایی را برای دانشجوی متصل خود بفرستید. هر ارسال یک نسخه جدید ثبت می‌کند و نسخه‌های قبلی دست‌نخورده می‌مانند.",
  nutritionListTitle: "برنامه‌های غذایی من",
  nutritionListIntro:
    "برنامه غذایی اختصاصی با وعده‌ها و مواد بانک غذا بسازید. همه کالری و درشت‌مغذی‌ها سمت سرور محاسبه می‌شوند و در رابط به‌صورت تخمینی نمایش داده می‌شوند.",
  newWorkoutPlan: "برنامه تمرینی جدید",
  newNutritionPlan: "برنامه غذایی جدید",
  refresh: "بازخوانی",
  loading: "در حال بارگذاری…",
  retry: "تلاش مجدد",
  loadError: "خطا در دریافت اطلاعات",
  emptyPlansTitle: "هنوز برنامه‌ای نساخته‌اید",
  emptyWorkoutPlansNote:
    "با دکمه «برنامه تمرینی جدید» اولین برنامه اختصاصی خود را بسازید؛ روزها و حرکات را از کتابخانه واقعی انتخاب کنید.",
  emptyNutritionPlansNote:
    "با دکمه «برنامه غذایی جدید» اولین برنامه غذایی خود را بسازید؛ وعده‌ها را از بانک مواد غذایی پروژه پر کنید.",

  goalLabel: "هدف",
  difficultyLabel: "سطح",
  durationLabel: "مدت هر جلسه",
  daysLabel: "روز",
  exercisesCountLabel: "حرکت",
  mealsCountLabel: "وعده",
  itemsCountLabel: "قلم",
  versionLabel: "آخرین نسخه ارسال‌شده",
  studentLabel: "دانشجوی دریافت‌کننده",
  lastSentLabel: "آخرین ارسال",
  neverSent: "ارسال نشده",
  updatedAtLabel: "آخرین ویرایش",
  statusDraft: "پیش‌نویس",
  statusPublished: "منتشرشده",
  statusArchived: "بایگانی‌شده",
  actionPreview: "پیش‌نمایش",
  actionEdit: "ویرایش",
  actionSend: "ارسال به دانشجو",
  actionArchive: "بایگانی",
  actionDelete: "حذف",
  actionPdf: "خروجی PDF",
  deleteConfirmTitle: "حذف برنامه؟",
  deleteConfirmNote:
    "این برنامه از فهرست شما حذف میشود. نسخه‌های ارسال‌شده برای دانشجو باقی میمانند و دانشجو همچنان به آنها دسترسی دارد.",
  deleteYes: "بله، حذف کن",
  deleteNo: "انصراف",
  deletedToast: "برنامه حذف شد",
  filterAllTypes: "همه انواع",
  filterPrivate: "خصوصی",
  filterSemiPrivate: "نیمه‌خصوصی",
  filterStudentPlaceholder: "جست‌وجوی نام دانشجو…",
  filterCoachPlaceholder: "جست‌وجوی نام مربی…",
  filterUnassigned: "بدون دانشجو",
  filterNoType: "بدون نوع خدمات",
  archivedNote: "این برنامه بایگانی شده است؛ فقط قابل مشاهده است و ویرایش یا ارسال ندارد.",

  workoutGoalLabel: (code) => {
    switch (code) {
      case "fat_loss": return "چربی‌سوزی";
      case "muscle_gain": return "عضله‌سازی";
      case "strength": return "قدرتی";
      case "maintain": return "حفظ تناسب";
      case "fitness": return "آمادگی عمومی";
      default: return code;
    }
  },
  nutritionGoalLabel: (code) => {
    switch (code) {
      case "weight_loss": return "کاهش وزن";
      case "muscle_gain": return "عضله‌سازی";
      case "maintain": return "حفظ وزن";
      default: return code;
    }
  },
  difficultyOf: (code) => {
    switch (code) {
      case "beginner": return "مبتدی";
      case "intermediate": return "متوسط";
      case "advanced": return "پیشرفته";
      default: return code;
    }
  },

  builderTitleNew: "ساخت برنامه جدید",
  builderTitleEdit: "ویرایش برنامه",
  daysCount: (n) => `${localeNumber(n, "fa")} روز`,
  basicInfoTitle: "اطلاعات پایه",
  titleLabel: "عنوان برنامه",
  titlePlaceholder: "مثلاً: برنامه قدرتی سه‌روزه",
  descriptionLabel: "توضیحات",
  descriptionPlaceholder: "توضیح کوتاه برنامه برای دانشجو (اختیاری)",
  goalSelect: "هدف برنامه",
  difficultySelect: "سطح دشواری",
  durationInputLabel: "مدت تقریبی هر جلسه",
  durationUnit: "دقیقه",
  daysSectionTitle: "روزهای برنامه",
  addDay: "افزودن روز",
  dayTitleLabel: "عنوان روز",
  dayTitlePlaceholder: "مثلاً: پوش — سینه و پشت بازو",
  removeDay: "حذف روز",
  moveUp: "انتقال به بالا",
  moveDown: "انتقال به پایین",
  dayNumber: (n) => `روز ${localeNumber(n, "fa")}`,
  estMinutesLabel: "زمان تقریبی",

  addExercise: "افزودن حرکت",
  personalExerciseBadge: "شخصی",
  exercisePickerTitle: "انتخاب حرکت از کتابخانه",
  exerciseSearchPlaceholder: "جست‌وجوی نام حرکت…",
  noExerciseResults: "حرکتی با این جست‌وجو یافت نشد.",
  selectExercise: "انتخاب",
  selectedExercise: "حرکت انتخاب‌شده",
  removeExercise: "حذف حرکت",
  setsLabel: "ست",
  repsMinLabel: "حداقل تکرار",
  repsMaxLabel: "حداکثر تکرار",
  restLabel: "استراحت",
  restUnit: "ثانیه",
  suggestedWeightLabel: "وزن پیشنهادی (کیلوگرم)",
  suggestedWeightOptional: "اختیاری — فقط نمایشی",
  exerciseNoteLabel: "یادداشت اجرا",
  exerciseNotePlaceholder: "نکته فنی یا اصلاحی برای دانشجو (اختیاری)",
  repsRangeHint: (min, max) => `بازه تکرار: ${localeNumber(min, "fa")} تا ${localeNumber(max, "fa")}`,

  addMeal: "افزودن وعده",
  mealTypeLabel: "نوع وعده",
  addItem: "افزودن ماده غذایی",
  foodPickerTitle: "انتخاب ماده غذایی از بانک",
  foodSearchPlaceholder: "جست‌وجوی نام غذا…",
  noFoodResults: "ماده‌ای با این جست‌وجو یافت نشد.",
  selectFood: "انتخاب",
  amountLabel: "مقدار",
  unitLabel: "واحد",
  unitGrams: "گرم",
  unitServing: "سهم متداول",
  removeItem: "حذف قلم",
  mealTotalsLabel: "جمع وعده",
  dayTotalsLabel: "جمع روز",
  estimateNote:
    "مقادیر کالری و درشت‌مغذی برآورد بانک مواد پروژه‌اند (به‌ازای ۱۰۰ گرم اعلام‌شده) و جایگزین توصیه پزشکی نیستند.",
  maxGramsNote: (n) => `سقف منطقی این ماده در یک وعده ${localeNumber(n, "fa")} گرم است`,

  saveDraft: "ذخیره پیش‌نویس",
  saving: "در حال ذخیره…",
  previewTitle: "پیش‌نمایش برنامه",
  previewIntro: "همین چیزی است که دانشجو پس از ارسال می‌بیند.",
  close: "بستن",
  draftSavedTitle: "پیش‌نویس ذخیره شد",
  draftSavedNote: "می‌توانید بعداً ویرایش کنید و پس از اطمینان، برای دانشجو بفرستید.",
  emptyContentWarning: "برای ذخیره، حداقل یک روز با محتوای معتبر لازم است.",
  serverComputeNote: "مقادیر تغذیه‌ای پس از ذخیره سمت سرور محاسبه و اینجا نمایش داده می‌شوند.",
  snapshotNote: "نام حرکات و مواد از بانک‌های واقعی پروژه ثبت می‌شود؛ داده ناموجود اختراع نمی‌شود.",

  sendDialogTitle: "ارسال برنامه به دانشجو",
  sendDialogIntro:
    "دانشجوی مقصد را از ارتباط‌های فعال خود انتخاب کنید. پس از ارسال، نسخه جدیدی در حساب دانشجو ثبت می‌شود.",
  selectStudent: "انتخاب دانشجو",
  noActiveStudents: "دانشجوی فعالی ندارید",
  noActiveStudentsNote:
    "ارسال برنامه اختصاصی فقط برای دانشجویی ممکن است که ارتباط ACTIVE با شما داشته باشد و اشتراک مؤثر او ویژه (PREMIUM) باشد.",
  planSummaryTitle: "خلاصه برنامه",
  sendStudentLabel: "دانشجوی مقصد",
  sendConfirmButton: "ارسال قطعی",
  sending: "در حال ارسال…",
  sentSuccessTitle: "برنامه ارسال شد",
  sentSuccessNote: (v) => `نسخه ${localeNumber(v, "fa")} در حساب دانشجو ثبت شد.`,
  resendHint:
    "این برنامه قبلاً با همین محتوا ارسال شده است. برای ارسال نسخه جدید، ابتدا محتوا را ویرایش کنید.",
  unassignedBadge: "بدون دانشجو",

  versionsTitle: "نسخه‌های ارسال‌شده",
  versionN: (n) => `نسخه ${localeNumber(n, "fa")}`,
  versionsEmpty: "هنوز نسخه‌ای از این برنامه ارسال نشده است.",
  versionsIntro: "هر ارسال یک نسخه تغییرناپذیر می‌سازد؛ نسخه‌های قبلی برای تاریخچه حفظ می‌شوند.",
  editAfterSendNote:
    "ویرایش این برنامه نسخه‌های ارسال‌شده قبلی را تغییر نمی‌دهد؛ برای اعمال تغییرات، دوباره ارسال کنید تا نسخه جدید ساخته شود.",

  archiveConfirmTitle: "بایگانی این برنامه؟",
  archiveConfirmNote:
    "بایگانی یک‌طرفه است: پس از آن ویرایش و ارسال ممکن نیست. برنامه‌های قبلاً دریافتی دانشجو حفظ می‌شوند.",
  archiveYes: "بله، بایگانی کن",
  archiveNo: "انصراف",
  archivedToast: "برنامه بایگانی شد",

  formErrorsTitle: "اصلاح خطاهای فرم",
  invalidTitle: "عنوان برنامه را وارد کنید (حداقل ۲ کاراکتر).",
  invalidDays: "حداقل یک روز با محتوای معتبر لازم است.",
  invalidExercises: "هر روز باید حداقل یک حرکت معتبر از کتابخانه داشته باشد.",
  invalidItems: "هر وعده باید حداقل یک ماده غذایی معتبر از بانک داشته باشد.",
  exerciseNotFound: "یکی از حرکات در کتابخانه یافت نشد؛ آن را دوباره انتخاب کنید.",
  foodNotFound: "یکی از مواد در بانک غذا یافت نشد؛ آن را دوباره انتخاب کنید.",
};

const en: CoachPlansStrings = {
  existingTab: "Profile & Requests",
  workoutPlansTab: "My Students' Workout Plans",
  nutritionPlansTab: "My Students' Nutrition Plans",
  documentTitleWorkout: "My Workout Plans",
  documentTitleNutrition: "My Nutrition Plans",

  workoutListTitle: "My Workout Plans",
  workoutListIntro:
    "Build custom workout plans, refine the draft, and send the final version to your connected student. Each send creates a new immutable version; previous versions remain intact.",
  nutritionListTitle: "My Nutrition Plans",
  nutritionListIntro:
    "Build custom nutrition plans with meals from the project food bank. All calories and macronutrients are computed server-side and shown as estimates in the UI.",
  newWorkoutPlan: "New Workout Plan",
  newNutritionPlan: "New Nutrition Plan",
  refresh: "Refresh",
  loading: "Loading…",
  retry: "Retry",
  loadError: "Failed to load data",
  emptyPlansTitle: "No plans yet",
  emptyWorkoutPlansNote:
    "Use “New Workout Plan” to build your first custom plan; pick days and exercises from the real library.",
  emptyNutritionPlansNote:
    "Use “New Nutrition Plan” to build your first nutrition plan; fill meals from the project food bank.",

  goalLabel: "Goal",
  difficultyLabel: "Level",
  durationLabel: "Session length",
  daysLabel: "days",
  exercisesCountLabel: "exercises",
  mealsCountLabel: "meals",
  itemsCountLabel: "items",
  versionLabel: "Latest sent version",
  studentLabel: "Recipient student",
  lastSentLabel: "Last sent",
  neverSent: "Not sent",
  updatedAtLabel: "Last edited",
  statusDraft: "Draft",
  statusPublished: "Published",
  statusArchived: "Archived",
  actionPreview: "Preview",
  actionEdit: "Edit",
  actionSend: "Send to student",
  actionArchive: "Archive",
  actionDelete: "Delete",
  actionPdf: "Export PDF",
  deleteConfirmTitle: "Delete this plan?",
  deleteConfirmNote:
    "This plan is removed from your list. Versions already sent to the student remain available to them.",
  deleteYes: "Yes, delete it",
  deleteNo: "Cancel",
  deletedToast: "Plan deleted",
  filterAllTypes: "All types",
  filterPrivate: "Private",
  filterSemiPrivate: "Semi-private",
  filterStudentPlaceholder: "Search student name…",
  filterCoachPlaceholder: "Search coach name…",
  filterUnassigned: "Unassigned",
  filterNoType: "No service type",
  archivedNote: "This plan is archived; it is view-only and can no longer be edited or sent.",

  workoutGoalLabel: (code) => {
    switch (code) {
      case "fat_loss": return "Fat loss";
      case "muscle_gain": return "Muscle gain";
      case "strength": return "Strength";
      case "maintain": return "Maintenance";
      case "fitness": return "General fitness";
      default: return code;
    }
  },
  nutritionGoalLabel: (code) => {
    switch (code) {
      case "weight_loss": return "Weight loss";
      case "muscle_gain": return "Muscle gain";
      case "maintain": return "Maintenance";
      default: return code;
    }
  },
  difficultyOf: (code) => {
    switch (code) {
      case "beginner": return "Beginner";
      case "intermediate": return "Intermediate";
      case "advanced": return "Advanced";
      default: return code;
    }
  },

  builderTitleNew: "Create New Plan",
  builderTitleEdit: "Edit Plan",
  daysCount: (n) => `${localeNumber(n, "en")} days`,
  basicInfoTitle: "Basics",
  titleLabel: "Plan title",
  titlePlaceholder: "e.g. 3-day strength plan",
  descriptionLabel: "Description",
  descriptionPlaceholder: "A short note about this plan for the student (optional)",
  goalSelect: "Plan goal",
  difficultySelect: "Difficulty level",
  durationInputLabel: "Approx. session length",
  durationUnit: "minutes",
  daysSectionTitle: "Plan days",
  addDay: "Add day",
  dayTitleLabel: "Day title",
  dayTitlePlaceholder: "e.g. Push — chest & triceps",
  removeDay: "Remove day",
  moveUp: "Move up",
  moveDown: "Move down",
  dayNumber: (n) => `Day ${localeNumber(n, "en")}`,
  estMinutesLabel: "Estimated time",

  addExercise: "Add exercise",
  personalExerciseBadge: "Personal",
  exercisePickerTitle: "Pick an exercise from the library",
  exerciseSearchPlaceholder: "Search exercises…",
  noExerciseResults: "No exercise matched your search.",
  selectExercise: "Select",
  selectedExercise: "Selected exercise",
  removeExercise: "Remove exercise",
  setsLabel: "Sets",
  repsMinLabel: "Min reps",
  repsMaxLabel: "Max reps",
  restLabel: "Rest",
  restUnit: "sec",
  suggestedWeightLabel: "Suggested weight (kg)",
  suggestedWeightOptional: "Optional — display only",
  exerciseNoteLabel: "Coaching note",
  exerciseNotePlaceholder: "A technique or correction cue for the student (optional)",
  repsRangeHint: (min, max) => `Rep range: ${localeNumber(min, "en")}–${localeNumber(max, "en")}`,

  addMeal: "Add meal",
  mealTypeLabel: "Meal type",
  addItem: "Add food item",
  foodPickerTitle: "Pick a food from the bank",
  foodSearchPlaceholder: "Search foods…",
  noFoodResults: "No food matched your search.",
  selectFood: "Select",
  amountLabel: "Amount",
  unitLabel: "Unit",
  unitGrams: "grams",
  unitServing: "serving",
  removeItem: "Remove item",
  mealTotalsLabel: "Meal totals",
  dayTotalsLabel: "Day totals",
  estimateNote:
    "Calorie and macronutrient values are estimates from the project food bank (per declared 100 g) and are not medical advice.",
  maxGramsNote: (n) => `The sensible cap for this food in one meal is ${localeNumber(n, "en")} g`,

  saveDraft: "Save draft",
  saving: "Saving…",
  previewTitle: "Plan Preview",
  previewIntro: "This is exactly what the student sees after you send it.",
  close: "Close",
  draftSavedTitle: "Draft saved",
  draftSavedNote: "You can keep editing later and send it to the student when ready.",
  emptyContentWarning: "At least one day with valid content is required to save.",
  serverComputeNote: "Nutrition values are computed server-side after saving and shown here.",
  snapshotNote: "Exercise and food names are snapshotted from the real project banks; nothing is invented.",

  sendDialogTitle: "Send Plan to Student",
  sendDialogIntro:
    "Choose the destination student from your active connections. After sending, a new version is recorded in the student's account.",
  selectStudent: "Select student",
  noActiveStudents: "No active students",
  noActiveStudentsNote:
    "Sending a custom plan requires a student with an ACTIVE connection to you and an effective PREMIUM subscription.",
  planSummaryTitle: "Plan summary",
  sendStudentLabel: "Destination student",
  sendConfirmButton: "Send now",
  sending: "Sending…",
  sentSuccessTitle: "Plan sent",
  sentSuccessNote: (v) => `Version ${localeNumber(v, "en")} was recorded in the student's account.`,
  resendHint:
    "This plan was already sent with the same content. Edit the content first to send a new version.",
  unassignedBadge: "No student",

  versionsTitle: "Sent versions",
  versionN: (n) => `Version ${localeNumber(n, "en")}`,
  versionsEmpty: "No version of this plan has been sent yet.",
  versionsIntro: "Each send creates an immutable version; previous versions are kept for history.",
  editAfterSendNote:
    "Editing this plan does not change previously sent versions; send again to create a new version with your changes.",

  archiveConfirmTitle: "Archive this plan?",
  archiveConfirmNote:
    "Archiving is one-way: editing and sending will no longer be possible. Plans already delivered to the student are preserved.",
  archiveYes: "Yes, archive it",
  archiveNo: "Cancel",
  archivedToast: "Plan archived",

  formErrorsTitle: "Fix form errors",
  invalidTitle: "Enter a plan title (at least 2 characters).",
  invalidDays: "At least one day with valid content is required.",
  invalidExercises: "Each day needs at least one valid exercise from the library.",
  invalidItems: "Each meal needs at least one valid food from the bank.",
  exerciseNotFound: "One of the exercises was not found in the library; pick it again.",
  foodNotFound: "One of the foods was not found in the bank; pick it again.",
};

export function coachPlansStrings(locale: Locale): CoachPlansStrings {
  return locale === "en" ? en : fa;
}
