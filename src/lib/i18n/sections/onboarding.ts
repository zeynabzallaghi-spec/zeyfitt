/**
 * دیکشنری راه‌اندازی اولیه پروفایل — فرم چهارمرحله‌ای کاربر تازه‌وارد.
 * الگو دقیقاً مطابق sections/shell.ts است.
 *
 * - برچسب گزینه‌ها (جنسیت/هدف/سطح/تجهیزات/محدودیت‌ها) از نقشه‌های نمایشی
 *   sections/shared.ts روی valueهای پایدار src/lib/profile.ts مصرف می‌شود.
 * - پیام‌های خطای فیلد سرور (شِمای zod در src/lib/profile.ts) بسته‌ای بسته
 *   از رشته‌های فارسی دارند؛ نگاشت فقط نمایشی آن‌ها در serverFieldMessage
 *   انجام می‌شود (نسخه فارسی همان ورودی را عبور می‌دهد) تا هیچ تغییری در
 *   داده، سرور یا منطق اعتبارسنجی داده نشود.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface OnboardingStrings {
  /** عنوان سند صفحه — document.title */
  pageTitle: string;
  // مراحل
  steps: readonly { title: string }[];
  /** شمارنده مراحل — «گام ۲ از ۴» */
  stepOf: (current: number, total: number) => string;
  progressAria: string;
  // گام ۱ — معرفی
  greeting: (name: string) => string;
  introBody: string;
  displayNameLabel: string;
  displayNameHint: string;
  displayNamePlaceholder: string;
  // گام ۲ — مشخصات بدنی
  ageLabel: string;
  ageHint: string;
  agePlaceholder: string;
  genderLabel: string;
  genderHint: string;
  genderAria: string;
  heightLabel: string;
  heightHint: string;
  heightPlaceholder: string;
  weightLabel: string;
  weightHint: string;
  weightPlaceholder: string;
  bodyFatLabel: string;
  bodyFatHint: string;
  bodyFatPlaceholder: string;
  // گام ۳ — هدف و سطح
  goalLabel: string;
  goalAria: string;
  experienceLabel: string;
  experienceAria: string;
  daysLabel: string;
  daysAria: string;
  minutesLabel: string;
  minutesHint: string;
  minutesAria: string;
  selectPlaceholder: string;
  dayUnit: string;
  minuteUnit: string;
  // گام ۴ — تجهیزات و محدودیت‌ها
  equipmentTitle: string;
  equipmentNote: string;
  limitationsTitle: string;
  limitationsNote: string;
  notesLabel: string;
  notesHint: string;
  notesPlaceholder: string;
  privacyNote: string;
  // ناوبری مراحل
  back: string;
  next: string;
  finish: string;
  footerNote: string;
  // اعتبارسنجی سمت کلاینت
  nameLengthError: string;
  goalRequired: string;
  experienceRequired: string;
  /** برچسب فیلدها در پیام‌های اعتبارسنجی (ممکن است با برچسب نمایشی فیلد متفاوت باشد) */
  fieldLabels: { age: string; height: string; weight: string; bodyFat: string; days: string };
  requiredMessage: (label: string) => string;
  integerMessage: (label: string) => string;
  rangeMessage: (label: string, min: number, max: number) => string;
  // خطاهای ارسال
  sessionExpired: string;
  invalidFields: string;
  saveFailed: string;
  networkError: string;
  /** نگاشت نمایشی پیام فیلد سرور — ورودی همان پیام فارسی شِمای zod است */
  serverFieldMessage: (message: string) => string;
}

const FA: OnboardingStrings = {
  pageTitle: "راه‌اندازی اولیه | AI Fitness Coach",
  steps: [
    { title: "معرفی" },
    { title: "مشخصات بدنی" },
    { title: "هدف و سطح" },
    { title: "تجهیزات و محدودیت‌ها" },
  ],
  stepOf: (current, total) =>
    `گام ${localeNumber(current, "fa")} از ${localeNumber(total, "fa")}`,
  progressAria: "پیشرفت راه‌اندازی پروفایل",
  greeting: (name) => `سلام ${name || " 👋"}`,
  introBody:
    "حساب کاربری شما ساخته شد. برای اینکه مربی بتواند در مراحل بعدی برنامه تمرینی و غذایی متناسب با بدن و هدف شما بسازد، چند اطلاعات پایه لازم داریم؛ همه این اطلاعات محرمانه است و فقط روی حساب خودتان ذخیره می‌شود.",
  displayNameLabel: "نام نمایشی",
  displayNameHint: "همین نام در داشبورد نمایش داده می‌شود",
  displayNamePlaceholder: "مثلاً علی",
  ageLabel: "سن",
  ageHint: "سال",
  agePlaceholder: "مثلاً ۲۷",
  genderLabel: "جنسیت",
  genderHint: "اختیاری — برای فرمول‌های آینده",
  genderAria: "انتخاب جنسیت",
  heightLabel: "قد",
  heightHint: "سانتی‌متر",
  heightPlaceholder: "مثلاً ۱۷۸",
  weightLabel: "وزن",
  weightHint: "کیلوگرم",
  weightPlaceholder: "مثلاً ۷۵٫۵",
  bodyFatLabel: "درصد چربی بدن",
  bodyFatHint: "اختیاری — در صورت اطلاع",
  bodyFatPlaceholder: "مثلاً ۱۸",
  goalLabel: "هدف تمرینی",
  goalAria: "انتخاب هدف تمرینی",
  experienceLabel: "سطح تجربه",
  experienceAria: "انتخاب سطح تجربه",
  daysLabel: "روزهای تمرین در هفته",
  daysAria: "انتخاب روزهای تمرین",
  minutesLabel: "مدت هر جلسه",
  minutesHint: "اختیاری",
  minutesAria: "انتخاب مدت جلسه",
  selectPlaceholder: "انتخاب کنید",
  dayUnit: "روز",
  minuteUnit: "دقیقه",
  equipmentTitle: "تجهیزات در دسترس",
  equipmentNote: "(برنامه‌ساز فقط حرکات قابل اجرا پیشنهاد می‌دهد)",
  limitationsTitle: "محدودیت‌های حرکتی یا آسیب‌ها",
  limitationsNote: "(اختیاری)",
  notesLabel: "توضیح بیشتر",
  notesHint: "اختیاری",
  notesPlaceholder: "مثلاً: هنگام اسکات عمیق، درد خفیف زانوی راست…",
  privacyNote:
    "این اطلاعات محرمانه تلقی می‌شود، فقط روی حساب شما ذخیره می‌شود و جایگزین تشخیص پزشکی نیست.",
  back: "بازگشت",
  next: "ادامه",
  finish: "ثبت و پایان راه‌اندازی",
  footerNote: "بعداً می‌توانید همه این اطلاعات را از بخش «پروفایل و تنظیمات» ویرایش کنید.",
  nameLengthError: "نام نمایشی باید بین ۲ تا ۶۰ کاراکتر باشد.",
  goalRequired: "هدف تمرینی را انتخاب کنید.",
  experienceRequired: "سطح تجربه را انتخاب کنید.",
  fieldLabels: {
    age: "سن",
    height: "قد (سانتی‌متر)",
    weight: "وزن (کیلوگرم)",
    bodyFat: "درصد چربی بدن",
    days: "روزهای تمرین در هفته",
  },
  requiredMessage: (label) => `${label} را وارد کنید.`,
  integerMessage: (label) => `${label} باید عدد صحیح باشد.`,
  rangeMessage: (label, min, max) =>
    `${label} باید بین ${localeNumber(min, "fa")} و ${localeNumber(max, "fa")} باشد.`,
  sessionExpired: "نشست شما منقضی شده است؛ لطفاً دوباره وارد شوید.",
  invalidFields: "اطلاعات واردشده معتبر نیست؛ فیلدها را بررسی کنید.",
  saveFailed: "ذخیره اطلاعات انجام نشد؛ لطفاً دوباره تلاش کنید.",
  networkError: "ارتباط با سرور برقرار نشد؛ اتصال اینترنت خود را بررسی کنید.",
  serverFieldMessage: (message) => message,
};

const EN: OnboardingStrings = {
  pageTitle: "Initial setup | AI Fitness Coach",
  steps: [
    { title: "Intro" },
    { title: "Body metrics" },
    { title: "Goal & level" },
    { title: "Equipment & limitations" },
  ],
  stepOf: (current, total) => `Step ${current} of ${total}`,
  progressAria: "Profile setup progress",
  greeting: (name) => `Hello ${name || "👋"}`,
  introBody:
    "Your account has been created. So the coach can build workout and nutrition plans tailored to your body and goal in the later stages, we need a few basics; all of this information is confidential and stored only on your own account.",
  displayNameLabel: "Display name",
  displayNameHint: "This is the name shown on your dashboard",
  displayNamePlaceholder: "e.g. Ali",
  ageLabel: "Age",
  ageHint: "Years",
  agePlaceholder: "e.g. 27",
  genderLabel: "Gender",
  genderHint: "Optional — for future formulas",
  genderAria: "Select gender",
  heightLabel: "Height",
  heightHint: "Centimeters",
  heightPlaceholder: "e.g. 178",
  weightLabel: "Weight",
  weightHint: "Kilograms",
  weightPlaceholder: "e.g. 75.5",
  bodyFatLabel: "Body fat percentage",
  bodyFatHint: "Optional — if known",
  bodyFatPlaceholder: "e.g. 18",
  goalLabel: "Training goal",
  goalAria: "Select training goal",
  experienceLabel: "Experience level",
  experienceAria: "Select experience level",
  daysLabel: "Training days per week",
  daysAria: "Select training days",
  minutesLabel: "Session length",
  minutesHint: "Optional",
  minutesAria: "Select session length",
  selectPlaceholder: "Select",
  dayUnit: "days",
  minuteUnit: "minutes",
  equipmentTitle: "Available equipment",
  equipmentNote: "(the planner only suggests exercises you can actually perform)",
  limitationsTitle: "Movement limitations or injuries",
  limitationsNote: "(optional)",
  notesLabel: "More details",
  notesHint: "Optional",
  notesPlaceholder: "e.g.: Mild pain in my right knee during deep squats…",
  privacyNote:
    "This information is treated as confidential, stored only on your account, and is not a substitute for medical diagnosis.",
  back: "Back",
  next: "Continue",
  finish: "Save and finish setup",
  footerNote: 'You can edit all of this information later from the "Profile & settings" section.',
  nameLengthError: "Display name must be between 2 and 60 characters.",
  goalRequired: "Select a training goal.",
  experienceRequired: "Select an experience level.",
  fieldLabels: {
    age: "Age",
    height: "Height (cm)",
    weight: "Weight (kg)",
    bodyFat: "Body fat percentage",
    days: "Training days per week",
  },
  requiredMessage: (label) => `Enter ${label}.`,
  integerMessage: (label) => `${label} must be a whole number.`,
  rangeMessage: (label, min, max) => `${label} must be between ${min} and ${max}.`,
  sessionExpired: "Your session has expired; please sign in again.",
  invalidFields: "The entered information is not valid; please check the fields.",
  saveFailed: "Saving your information failed; please try again.",
  networkError: "Could not reach the server; please check your internet connection.",
  serverFieldMessage: (message) =>
    (
      {
        "نام نمایشی را وارد کنید": "Enter a display name",
        "نام نمایشی باید حداقل ۲ کاراکتر باشد": "Display name must be at least 2 characters",
        "نام نمایشی حداکثر ۶۰ کاراکتر است": "Display name must be at most 60 characters",
        "سن را وارد کنید": "Enter your age",
        "سن باید حداقل ۱۰ باشد": "Age must be at least 10",
        "سن باید حداکثر ۹۰ باشد": "Age must be at most 90",
        "قد (سانتی‌متر) را وارد کنید": "Enter your height in centimeters",
        "قد (سانتی‌متر) باید حداقل ۱۰۰ باشد": "Height must be at least 100 centimeters",
        "قد (سانتی‌متر) باید حداکثر ۲۵۰ باشد": "Height must be at most 250 centimeters",
        "وزن (کیلوگرم) را وارد کنید": "Enter your weight in kilograms",
        "وزن (کیلوگرم) باید حداقل ۲۵ باشد": "Weight must be at least 25 kilograms",
        "وزن (کیلوگرم) باید حداکثر ۳۰۰ باشد": "Weight must be at most 300 kilograms",
        "درصد چربی بدن باید عدد معتبر باشد": "Body fat percentage must be a valid number",
        "درصد چربی بدن باید حداقل ۱ باشد": "Body fat percentage must be at least 1",
        "درصد چربی بدن باید حداکثر ۷۰ باشد": "Body fat percentage must be at most 70",
        "هدف تمرینی را انتخاب کنید": "Select a training goal",
        "سطح تجربه را انتخاب کنید": "Select an experience level",
        "روزهای تمرین در هفته را وارد کنید": "Enter your training days per week",
        "روزهای تمرین در هفته باید حداقل ۱ باشد": "Training days per week must be at least 1",
        "روزهای تمرین در هفته باید حداکثر ۷ باشد": "Training days per week must be at most 7",
        "مدت هر جلسه باید عدد معتبر باشد": "Session length must be a valid number",
        "مدت هر جلسه باید حداقل ۱۵ باشد": "Session length must be at least 15 minutes",
        "مدت هر جلسه باید حداکثر ۱۸۰ باشد": "Session length must be at most 180 minutes",
        "فهرست تجهیزات بسیار طولانی است": "The equipment list is too long",
        "فهرست محدودیت‌ها بسیار طولانی است": "The limitations list is too long",
        "توضیحات حداکثر ۵۰۰ کاراکتر است": "Notes must be at most 500 characters",
        "فهرست آلرژی‌ها بسیار طولانی است": "The allergies list is too long",
      } as Record<string, string>
    )[message] ?? "The entered information is not valid; please check the fields.",
};

const STRINGS: Record<Locale, OnboardingStrings> = { fa: FA, en: EN };

export function onboardingStrings(locale: Locale): OnboardingStrings {
  return STRINGS[locale];
}
