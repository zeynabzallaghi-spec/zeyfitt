/**
 * دیکشنری بخش پروفایل و تنظیمات — الگو دقیقاً مطابق sections/shell.ts:
 *   ۱) اینترفیس تایپ‌شده برای تمام متن‌های قابل مشاهده بخش
 *   ۲) دیکشنری فارسی — متن‌ها عیناً همان متن‌های فعلی اپ (بدون بازنویسی، با حفظ نیم‌فاصله)
 *   ۳) دیکشنری انگلیسی — ترجمه طبیعی و کامل
 *   ۴) Record<Locale, X> + تابع getter — کامل‌بودن هر دو دیکشنری اجباری است.
 *
 * برچسب گزینه‌ها (هدف، سطح، جنسیت، تجهیزات و…) از دیکشنری مشترک
 * sections/shared.ts روی valueهای پایدار src/lib/profile.ts نمایش داده می‌شود؛
 * داده اصلی همان label فارسی src/lib/profile.ts می‌ماند و تغییر نمی‌کند.
 *
 * نکته پیام‌های اعتبارسنجی: متن خطاهای Zod از شِمای مشترک src/lib/profile.ts
 * می‌آید (خارج از محدوده این مهاجرت)؛ فقط پیام‌های پیرامونیِ خود این نما
 * (عنوان/توضیح توست‌ها و پیام‌های جایگزین) دوزبانه شده‌اند.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface ProfileStrings {
  // حالت بارگذاری
  loadingProfile: string;
  // حالت خالی — بدون پروفایل
  emptyNoProfile: string;
  refreshStatus: string;
  // بنر شفافیت — وضعیت ذخیره‌سازی واقعی (بولد وسط جمله جدا شده است)
  bannerPrefix: string;
  bannerServerDb: string;
  bannerSuffix: string;
  profileCompletePrefix: string;
  // پیام‌های ذخیره/اعتبارسنجی/حذف
  invalidInfoFallback: string;
  clientValidationTitle: string;
  clientValidationDescFallback: string;
  savedTitle: string;
  savedDesc: string;
  sessionExpiredTitle: string;
  sessionExpiredDesc: string;
  serverValidationTitle: string;
  serverValidationDescFallback: string;
  saveFailedTitle: string;
  saveFailedDesc: string;
  networkErrorTitle: string;
  networkErrorDesc: string;
  resetTitle: string;
  resetDesc: string;
  deleteFailedTitle: string;
  deleteFailedDesc: string;
  // عنوان بخش‌ها
  sectionBasic: string;
  sectionGoal: string;
  sectionEquipment: string;
  sectionLimitations: string;
  sectionDiet: string;
  sectionAccount: string;
  // اشتراک دانشجو — مرحله ۱۵
  sectionSubscription: string;
  subscriptionFreeNote: string;
  subscriptionPremiumNote: string;
  subscriptionExpiredNote: string;
  subscriptionSourceManual: string;
  subscriptionExpiresOn: string;
  subscriptionNoExpiry: string;
  // فیلدهای اطلاعات پایه
  labelDisplayName: string;
  placeholderDisplayName: string;
  labelAge: string;
  hintYear: string;
  placeholderAge: string;
  labelGender: string;
  hintOptional: string;
  ariaGender: string;
  selectPlaceholder: string;
  labelUnits: string;
  ariaUnits: string;
  labelHeight: string;
  hintCm: string;
  placeholderHeight: string;
  labelWeight: string;
  hintKg: string;
  placeholderWeight: string;
  labelBodyFat: string;
  hintIfKnown: string;
  placeholderBodyFat: string;
  // هدف و سطح
  labelGoal: string;
  ariaGoal: string;
  labelExperience: string;
  ariaExperience: string;
  labelDaysPerWeek: string;
  ariaDays: string;
  daysPerWeekItem: (day: number) => string;
  labelSessionMinutes: string;
  ariaSessionMinutes: string;
  minutesItem: (minutes: number) => string;
  // تجهیزات / محدودیت‌ها
  equipmentNote: string;
  labelLimitationNotes: string;
  placeholderLimitationNotes: string;
  limitationsNote: string;
  // ترجیحات غذایی
  labelDiet: string;
  ariaDiet: string;
  labelAllergies: string;
  allergyHint: string;
  dietNote: string;
  // حساب کاربری و امنیت
  labelEmail: string;
  hintEmailLocked: string;
  labelMemberSince: string;
  hintCalendar: string;
  buttonSignOut: string;
  buttonDeleteAccount: string;
  deleteDialogTitle: string;
  deleteDialogDesc: string;
  deleteConfirm: string;
  deleteCancel: string;
  securityNote: string;
  // دکمه‌های عملیات
  saveIdle: string;
  saveSaving: string;
  buttonReset: string;
  footerStorageNote: string;
}

const FA: ProfileStrings = {
  loadingProfile: "در حال بارگذاری پروفایل از سرور…",
  emptyNoProfile:
    "هنوز پروفایلی ثبت نشده است. برای ثبت اطلاعات بدنی، راه‌اندازی را آغاز کنید.",
  refreshStatus: "به‌روزرسانی وضعیت",
  bannerPrefix: "این فرم به ",
  bannerServerDb: "پایگاه داده سرور",
  bannerSuffix:
    " متصل است؛ تغییرات پس از ذخیره دائمی می‌شود و پس از بستن مرورگر باقی می‌ماند. رمز عبور حساب شما به‌صورت هش bcrypt نگهداری می‌شود و اطلاعات سلامت شما محرمانه تلقی می‌شود.",
  profileCompletePrefix: "پروفایل کامل است — آخرین به‌روزرسانی: ",
  invalidInfoFallback: "اطلاعات واردشده معتبر نیست.",
  clientValidationTitle: "اعتبارسنجی ناموفق",
  clientValidationDescFallback: "فیلدهای مشخص‌شده را بررسی کنید.",
  savedTitle: "پروفایل ذخیره شد",
  savedDesc: "اطلاعات شما روی سرور و در پایگاه داده ثبت شد.",
  sessionExpiredTitle: "نشست منقضی شده",
  sessionExpiredDesc: "لطفاً دوباره وارد حساب خود شوید.",
  serverValidationTitle: "اعتبارسنجی سرور ناموفق",
  serverValidationDescFallback: "فیلدها را بررسی و دوباره تلاش کنید.",
  saveFailedTitle: "ذخیره انجام نشد",
  saveFailedDesc: "خطای غیرمنتظره در سرور رخ داد؛ لطفاً دوباره تلاش کنید.",
  networkErrorTitle: "ارتباط برقرار نشد",
  networkErrorDesc: "اتصال اینترنت خود را بررسی و دوباره تلاش کنید.",
  resetTitle: "فرم بازنشانی شد",
  resetDesc: "مقادیر به آخرین نسخه ذخیره‌شده روی سرور بازگشت.",
  deleteFailedTitle: "حذف حساب انجام نشد",
  deleteFailedDesc: "خطای غیرمنتظره رخ داد؛ لطفاً دوباره تلاش کنید.",
  sectionBasic: "اطلاعات پایه",
  sectionGoal: "هدف و سطح تمرینی",
  sectionEquipment: "تجهیزات در دسترس",
  sectionLimitations: "محدودیت‌های حرکتی و آسیب‌ها",
  sectionDiet: "ترجیحات غذایی",
  sectionAccount: "حساب کاربری و امنیت",
  sectionSubscription: "اشتراک من",
  subscriptionFreeNote: "شما روی پلن رایگان هستید؛ امکانات پایه شامل دستیار هوشمند، برنامه‌ساز و کتابخانه حرکات فعال است.",
  subscriptionPremiumNote: "اشتراک ویژه شما فعال است؛ ارسال درخواست ارتباط با مربی برای شما باز است.",
  subscriptionExpiredNote: "اشتراک ویژه شما منقضی شده است؛ سطح فعلی شما رایگان است.",
  subscriptionSourceManual: "اعطای دستی توسط مدیریت — بدون درگاه پرداخت در این مرحله",
  subscriptionExpiresOn: "تاریخ انقضا",
  subscriptionNoExpiry: "بدون تاریخ انقضای مشخص",
  labelDisplayName: "نام نمایشی",
  placeholderDisplayName: "مثلاً علی",
  labelAge: "سن",
  hintYear: "سال",
  placeholderAge: "مثلاً ۲۷",
  labelGender: "جنسیت",
  hintOptional: "اختیاری",
  ariaGender: "انتخاب جنسیت",
  selectPlaceholder: "انتخاب کنید",
  labelUnits: "واحد اندازه‌گیری",
  ariaUnits: "انتخاب واحد اندازه‌گیری",
  labelHeight: "قد",
  hintCm: "سانتی‌متر",
  placeholderHeight: "مثلاً ۱۷۸",
  labelWeight: "وزن",
  hintKg: "کیلوگرم",
  placeholderWeight: "مثلاً ۷۵٫۵",
  labelBodyFat: "درصد چربی بدن",
  hintIfKnown: "در صورت اطلاع",
  placeholderBodyFat: "مثلاً ۱۸",
  labelGoal: "هدف تمرینی",
  ariaGoal: "انتخاب هدف تمرینی",
  labelExperience: "سطح تجربه",
  ariaExperience: "انتخاب سطح تجربه",
  labelDaysPerWeek: "روزهای تمرین در هفته",
  ariaDays: "انتخاب روزهای تمرین",
  daysPerWeekItem: (day) => `${localeNumber(day, "fa")} روز`,
  labelSessionMinutes: "مدت هر جلسه",
  ariaSessionMinutes: "انتخاب مدت جلسه",
  minutesItem: (minutes) => `${localeNumber(minutes, "fa")} دقیقه`,
  equipmentNote:
    "برنامه‌ساز فقط حرکاتی را پیشنهاد می‌دهد که با تجهیزات شما قابل اجرا باشند.",
  labelLimitationNotes: "توضیح بیشتر",
  placeholderLimitationNotes: "مثلاً: هنگام اسکات عمیق، درد خفیف زانوی راست...",
  limitationsNote:
    "این بخش محرمانه است، جایگزین تشخیص پزشکی نیست؛ در صورت آسیب جدی با پزشک مشورت کنید.",
  labelDiet: "رژیم غذایی انتخابی",
  ariaDiet: "انتخاب رژیم غذایی",
  labelAllergies: "آلرژی‌های غذایی",
  allergyHint: "(اختیاری)",
  dietNote:
    "در مرحله برنامه غذایی، مواد غذایی دارای آلرژی برای شما هشدار می‌گیرند.",
  labelEmail: "ایمیل حساب",
  hintEmailLocked: "غیرقابل ویرایش در این نسخه",
  labelMemberSince: "عضویت از",
  hintCalendar: "تاریخ شمسی",
  buttonSignOut: "خروج از حساب",
  buttonDeleteAccount: "حذف کامل حساب",
  deleteDialogTitle: "حذف کامل حساب کاربری؟",
  deleteDialogDesc:
    "با تأیید، حساب شما به‌همراه پروفایل تناسب اندام و همه اطلاعات وابسته به‌صورت کامل از پایگاه داده حذف می‌شود و این عملیات قابل بازگشت نیست. برای ادامه، دکمه تأیید را بزنید.",
  deleteConfirm: "بله، حسابم را حذف کن",
  deleteCancel: "انصراف",
  securityNote:
    "رمز عبور شما با bcrypt هش می‌شود، نشست با کوکی امن HttpOnly نگهداری می‌شود و با خروج یا حذف حساب، نشست‌ها ابطال می‌شوند.",
  saveIdle: "ذخیره روی سرور",
  saveSaving: "در حال ذخیره…",
  buttonReset: "بازگرداندن به نسخه ذخیره‌شده",
  footerStorageNote: "ذخیره‌سازی دائمی در پایگاه داده سرور",
};

const EN: ProfileStrings = {
  loadingProfile: "Loading your profile from the server…",
  emptyNoProfile:
    "No profile has been saved yet. Start the setup to enter your body metrics.",
  refreshStatus: "Refresh status",
  bannerPrefix: "This form is connected to the ",
  bannerServerDb: "server database",
  bannerSuffix:
    "; your changes become permanent once saved and survive closing the browser. Your account password is stored as a bcrypt hash, and your health information is treated as confidential.",
  profileCompletePrefix: "Profile complete — last updated: ",
  invalidInfoFallback: "The entered information is not valid.",
  clientValidationTitle: "Validation failed",
  clientValidationDescFallback: "Please check the highlighted fields.",
  savedTitle: "Profile saved",
  savedDesc: "Your information has been saved to the server database.",
  sessionExpiredTitle: "Session expired",
  sessionExpiredDesc: "Please sign in to your account again.",
  serverValidationTitle: "Server validation failed",
  serverValidationDescFallback: "Please review the fields and try again.",
  saveFailedTitle: "Save failed",
  saveFailedDesc: "An unexpected server error occurred; please try again.",
  networkErrorTitle: "Connection failed",
  networkErrorDesc: "Check your internet connection and try again.",
  resetTitle: "Form reset",
  resetDesc: "Values were restored to the last version saved on the server.",
  deleteFailedTitle: "Account deletion failed",
  deleteFailedDesc: "An unexpected error occurred; please try again.",
  sectionBasic: "Basic information",
  sectionGoal: "Goal & training level",
  sectionEquipment: "Available equipment",
  sectionLimitations: "Movement limitations & injuries",
  sectionDiet: "Dietary preferences",
  sectionAccount: "Account & security",
  sectionSubscription: "My subscription",
  subscriptionFreeNote: "You are on the Free plan; base features including the AI assistant, plan builders, and the exercise library are active.",
  subscriptionPremiumNote: "Your Premium subscription is active; sending coach connection requests is unlocked for you.",
  subscriptionExpiredNote: "Your Premium subscription has expired; your current tier is Free.",
  subscriptionSourceManual: "Manually granted by the administration — no payment gateway in this stage",
  subscriptionExpiresOn: "Expires on",
  subscriptionNoExpiry: "No specific expiry date",
  labelDisplayName: "Display name",
  placeholderDisplayName: "e.g. Ali",
  labelAge: "Age",
  hintYear: "years",
  placeholderAge: "e.g. 27",
  labelGender: "Gender",
  hintOptional: "optional",
  ariaGender: "Select gender",
  selectPlaceholder: "Select",
  labelUnits: "Measurement units",
  ariaUnits: "Select measurement units",
  labelHeight: "Height",
  hintCm: "centimeters",
  placeholderHeight: "e.g. 178",
  labelWeight: "Weight",
  hintKg: "kilograms",
  placeholderWeight: "e.g. 75.5",
  labelBodyFat: "Body fat percentage",
  hintIfKnown: "if known",
  placeholderBodyFat: "e.g. 18",
  labelGoal: "Training goal",
  ariaGoal: "Select training goal",
  labelExperience: "Experience level",
  ariaExperience: "Select experience level",
  labelDaysPerWeek: "Training days per week",
  ariaDays: "Select training days",
  daysPerWeekItem: (day) => `${day} ${day === 1 ? "day" : "days"}`,
  labelSessionMinutes: "Session duration",
  ariaSessionMinutes: "Select session duration",
  minutesItem: (minutes) => `${minutes} minutes`,
  equipmentNote:
    "The plan builder only suggests exercises that can be performed with your available equipment.",
  labelLimitationNotes: "More details",
  placeholderLimitationNotes: "e.g.: Mild pain in my right knee during deep squats...",
  limitationsNote:
    "This section is confidential and is not a substitute for medical diagnosis; consult a physician for any serious injury.",
  labelDiet: "Chosen diet",
  ariaDiet: "Select diet",
  labelAllergies: "Food allergies",
  allergyHint: "(optional)",
  dietNote:
    "In the nutrition plan, foods containing your allergens will be flagged with a warning.",
  labelEmail: "Account email",
  hintEmailLocked: "not editable in this version",
  labelMemberSince: "Member since",
  hintCalendar: "Gregorian date",
  buttonSignOut: "Sign out",
  buttonDeleteAccount: "Delete account permanently",
  deleteDialogTitle: "Delete your account permanently?",
  deleteDialogDesc:
    "By confirming, your account — along with your fitness profile and all related data — will be completely removed from the database, and this action cannot be undone. To continue, press the confirm button.",
  deleteConfirm: "Yes, delete my account",
  deleteCancel: "Cancel",
  securityNote:
    "Your password is hashed with bcrypt, your session is kept in a secure HttpOnly cookie, and signing out or deleting your account revokes all sessions.",
  saveIdle: "Save to server",
  saveSaving: "Saving…",
  buttonReset: "Revert to saved version",
  footerStorageNote: "Permanent storage in the server database",
};

const STRINGS: Record<Locale, ProfileStrings> = { fa: FA, en: EN };

export function profileStrings(locale: Locale): ProfileStrings {
  return STRINGS[locale];
}
