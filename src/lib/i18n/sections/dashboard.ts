/**
 * دیکشنری داشبورد شخصی — متن‌های قابل مشاهده داشبورد (خوشامد، کارت‌های آماری،
 * مسیر شروع، نقشه راه، بنر جلسه و دسترسی سریع).
 *
 * الگو دقیقاً مطابق sections/shell.ts است: اینترفیس تایپ‌شده + دو دیکشنری
 * کامل fa/en + تابع getter. متن‌های فارسی عیناً همان متن‌های قبلی اپ‌اند
 * (با حفظ نیم‌فاصله) و انگلیسی ترجمه طبیعی و کامل است.
 *
 * قالب‌های عددی (stageOf و مانند آن) رشتهٔ قالب‌بندی‌شده می‌گیرند تا
 * قالب‌بندی عدد با ارقام متناسب زبان، در محل فراخوانی انجام شود.
 */

import type { Locale } from "../shared";

export interface DashboardStrings {
  // نشان «ثبت نشده» — داده کاربر هنوز وارد نشده (نشان کارت‌ها + چیپ‌های پروفایل)
  notRecordedBadge: string;
  /** مقدار خالی — جایگزین نمایش عدد جعلی */
  emptyValue: string;
  /** مقدار بارگذاری آمار */
  statsLoadingValue: string;

  // بخش خوشامدگویی
  welcomeBadge: string;
  /** پیش از نام — فارسی: «سلام» */
  welcomeGreetingPrefix: string;
  /** پس از نام — فارسی: «؛» */
  welcomeGreetingSuffix: string;
  /** نام جایگزین وقتی کاربر نامی ثبت نکرده */
  defaultAthlete: string;
  welcomeBack: string;
  welcomeConnected: string;
  goalChipLabel: string;
  experienceChipLabel: string;
  completionChipLabel: string;
  editProfile: string;
  completeProfile: string;
  tryCoach3d: string;
  connectedToServerDb: string;

  // کارت‌های آماری
  statsAria: string;
  statWeightLabel: string;
  kilogramUnit: string;
  centimeterUnit: string;
  statWeightNoteProfileWithLatest: (weight: string, date: string) => string;
  statWeightNoteProfileOnly: string;
  statWeightNoteLatest: (date: string) => string;
  statWeightNoteEmpty: string;
  statHeightLabel: string;
  statHeightNoteSet: string;
  statHeightNoteEmpty: string;
  statGoalLabel: string;
  statGoalNoteSet: string;
  statGoalNoteEmpty: string;
  statSessionsLabel: string;
  statSessionsNoteLoading: string;
  statSessionsNoteZero: string;
  statSessionsNoteSummary: (sets: string, reps: string) => string;

  // بنر جلسه در حال انجام
  activeSessionAria: string;
  activeSessionTitle: (title: string) => string;
  activeSessionNote: string;
  continueSession: string;

  // کارت برنامه امروز + بخش‌های aria
  todayPlanAria: string;
  todayPlanTitle: string;
  journeyAria: string;
  weightTrendAria: string;
  nutritionAria: string;

  // کارت شروع مسیر تناسب اندام
  journeyTitle: string;
  journeySubtitle: string;
  journeyStepProfileTitle: string;
  journeyStepProfileDesc: string;
  journeyStepGoalTitle: string;
  journeyStepGoalDesc: string;
  journeyStepLibraryTitle: string;
  journeyStepLibraryDesc: string;
  journeyStepPlanTitle: string;
  journeyStepPlanDesc: string;
  journeyStepDoThis: string;
  journeyDoneBadge: string;
  journeyPendingBadge: string;
  /** «{done} از {total} گام کامل شد» */
  journeyProgress: (done: string, total: string) => string;
  /** «{value}٪» — علامت درصد متناسب با زبان */
  percentLabel: (value: string) => string;
  journeyProgressAria: string;
  journeyAllDone: string;
  journeySourceNote: string;

  // کارت نقشه راه
  roadmapAria: string;
  roadmapTitle: string;
  roadmapSubtitle: string;
  roadmapCurrentBadge: string;

  // دسترسی سریع
  quickAccessAria: string;
  quickAccessTitle: string;
  quickAccessNote: string;

  // توست‌های شروع جلسه از داشبورد
  toastSessionExists: string;
  toastSessionStarted: string;
}

const FA: DashboardStrings = {
  notRecordedBadge: "ثبت نشده",
  emptyValue: "—",
  statsLoadingValue: "…",

  welcomeBadge: "مرکز مسیر تناسب اندام شما",
  welcomeGreetingPrefix: "سلام",
  welcomeGreetingSuffix: "؛",
  defaultAthlete: "ورزشکار",
  welcomeBack: "خوش برگشتی",
  welcomeConnected:
    "این داشبورد به حساب واقعی شما متصل است؛ همه اطلاعات از پایگاه داده سرور خوانده می‌شود و پس از هر تغییر در پروفایل، بلافاصله به‌روز می‌شود.",
  goalChipLabel: "هدف:",
  experienceChipLabel: "سطح تجربه:",
  completionChipLabel: "تکمیل پروفایل:",
  editProfile: "ویرایش پروفایل",
  completeProfile: "تکمیل پروفایل",
  tryCoach3d: "آشنایی با مربی سه‌بعدی",
  connectedToServerDb: "متصل به پایگاه داده سرور",

  statsAria: "خلاصه آمار شما",
  statWeightLabel: "وزن فعلی",
  kilogramUnit: "کیلوگرم",
  centimeterUnit: "سانتی‌متر",
  statWeightNoteProfileWithLatest: (weight, date) =>
    `وزن پروفایل شما؛ آخرین اندازه‌گیری ثبت‌شده: ${weight} در ${date}`,
  statWeightNoteProfileOnly: "وزن ثبت‌شده در پروفایل شما؛ برای روند تغییرات، وزن دوره‌ای ثبت کنید",
  statWeightNoteLatest: (date) => `آخرین اندازه‌گیری: ${date}`,
  statWeightNoteEmpty: "وزن شما هنوز ثبت نشده است؛ از پروفایل یا کارت روند وزن ثبت کنید",
  statHeightLabel: "قد",
  statHeightNoteSet: "قد ثبت‌شده در پروفایل شما",
  statHeightNoteEmpty: "قد شما هنوز در پروفایل ثبت نشده است",
  statGoalLabel: "هدف تمرینی",
  statGoalNoteSet: "هدف انتخابی شما مبنای برنامه‌های مراحل بعد خواهد بود",
  statGoalNoteEmpty: "هدف تمرینی هنوز انتخاب نشده؛ از پروفایل قابل تنظیم است",
  statSessionsLabel: "جلسات تکمیل‌شده این هفته",
  statSessionsNoteLoading: "در حال خواندن آمار واقعی…",
  statSessionsNoteZero:
    "این هفته هنوز جلسه تکمیل‌شده‌ای ندارید؛ جلسه فقط با «پایان تمرین» صریح تکمیل می‌شود",
  statSessionsNoteSummary: (sets, reps) => `مجموع ${sets} ست و ${reps} تکرار ثبت‌شده واقعی`,

  activeSessionAria: "جلسه در حال انجام",
  activeSessionTitle: (title) => `جلسه در حال انجام: ${title}`,
  activeSessionNote:
    "در پایگاه داده سرور ثبت شده و پس از رفرش هم بازیابی می‌شود — ست‌ها را در رکوردر ثبت کنید.",
  continueSession: "ادامه جلسه",

  todayPlanAria: "برنامه امروز",
  todayPlanTitle: "برنامه امروز",
  journeyAria: "شروع مسیر تناسب اندام",
  weightTrendAria: "روند وزن شما",
  nutritionAria: "برنامه غذایی",

  journeyTitle: "شروع مسیر تناسب اندام",
  journeySubtitle: "وضعیت گام‌ها فقط بر اساس اطلاعات واقعی شماست",
  journeyStepProfileTitle: "تکمیل پروفایل بدنی",
  journeyStepProfileDesc: "قد، وزن، سن و مشخصات اصلی در پایگاه داده سرور",
  journeyStepGoalTitle: "تعیین هدف تناسب اندام",
  journeyStepGoalDesc: "هدف ثبت‌شده مبنای برنامه‌ها و پیشنهادها خواهد بود",
  journeyStepLibraryTitle: "آشنایی با کتابخانه حرکات و مربی سه‌بعدی",
  journeyStepLibraryDesc: "بازدید واقعی هر دو بخش روی همین دستگاه ثبت می‌شود",
  journeyStepPlanTitle: "ساخت برنامه تمرینی شخصی",
  journeyStepPlanDesc:
    "برنامه‌ساز فعال است؛ برنامه مبتنی بر هدف، سطح و تجهیزات شما می‌سازد و ذخیره می‌کند",
  journeyStepDoThis: "انجام این گام",
  journeyDoneBadge: "انجام شد",
  journeyPendingBadge: "در انتظار",
  journeyProgress: (done, total) => `${done} از ${total} گام کامل شد`,
  percentLabel: (value) => `${value}٪`,
  journeyProgressAria: "پیشرفت مسیر شروع",
  journeyAllDone:
    "همه گام‌های آغازین کامل شد — برای شروع، جلسه اول برنامه فعال را اجرا کنید.",
  journeySourceNote:
    "گام‌های ۱ و ۲ از پایگاه داده سرور خوانده می‌شوند؛ گام‌های ۳ و ۴ بر اساس بازدید واقعی شما روی همین دستگاه ثبت می‌شوند.",

  roadmapAria: "نقشه راه توسعه",
  roadmapTitle: "نقشه راه توسعه محصول",
  roadmapSubtitle: "هر مرحله پس از تأیید شما آغاز می‌شود؛ این کارت در نسخه نهایی حذف خواهد شد",
  roadmapCurrentBadge: "جاری",

  quickAccessAria: "دسترسی سریع",
  quickAccessTitle: "دسترسی سریع",
  quickAccessNote: "دسترسی به همه هشت بخش از طریق نوار کناری در دسترس است.",

  toastSessionExists: "جلسه دیگری در حال انجام است؛ همان ادامه یافت",
  toastSessionStarted: "جلسه تمرین شروع شد — رکوردر در بخش برنامه تمرینی آماده است",
};

const EN: DashboardStrings = {
  notRecordedBadge: "Not recorded",
  emptyValue: "—",
  statsLoadingValue: "…",

  welcomeBadge: "Your fitness journey hub",
  welcomeGreetingPrefix: "Hello",
  welcomeGreetingSuffix: ",",
  defaultAthlete: "athlete",
  welcomeBack: "welcome back",
  welcomeConnected:
    "This dashboard is connected to your real account; all information is read from the server database and updates immediately after every profile change.",
  goalChipLabel: "Goal:",
  experienceChipLabel: "Experience level:",
  completionChipLabel: "Profile completion:",
  editProfile: "Edit profile",
  completeProfile: "Complete profile",
  tryCoach3d: "Explore the 3D coach",
  connectedToServerDb: "Connected to the server database",

  statsAria: "Your stats summary",
  statWeightLabel: "Current weight",
  kilogramUnit: "kg",
  centimeterUnit: "cm",
  statWeightNoteProfileWithLatest: (weight, date) =>
    `Your profile weight; latest recorded measurement: ${weight} on ${date}`,
  statWeightNoteProfileOnly:
    "Weight recorded in your profile; log periodic weigh-ins to see the trend",
  statWeightNoteLatest: (date) => `Latest measurement: ${date}`,
  statWeightNoteEmpty:
    "Your weight is not recorded yet; add it from your profile or the weight trend card",
  statHeightLabel: "Height",
  statHeightNoteSet: "Height recorded in your profile",
  statHeightNoteEmpty: "Your height is not recorded in your profile yet",
  statGoalLabel: "Training goal",
  statGoalNoteSet: "Your chosen goal will be the basis for the plans of upcoming stages",
  statGoalNoteEmpty: "No training goal chosen yet; set it from your profile",
  statSessionsLabel: "Sessions completed this week",
  statSessionsNoteLoading: "Reading real statistics…",
  statSessionsNoteZero:
    "No completed sessions this week yet; a session only counts when you explicitly finish the workout",
  statSessionsNoteSummary: (sets, reps) => `A real total of ${sets} sets and ${reps} reps recorded`,

  activeSessionAria: "Session in progress",
  activeSessionTitle: (title) => `Session in progress: ${title}`,
  activeSessionNote:
    "Saved in the server database and restored even after a refresh — log your sets in the recorder.",
  continueSession: "Resume session",

  todayPlanAria: "Today's plan",
  todayPlanTitle: "Today's plan",
  journeyAria: "Start your fitness journey",
  weightTrendAria: "Your weight trend",
  nutritionAria: "Nutrition plan",

  journeyTitle: "Start your fitness journey",
  journeySubtitle: "Step status is based only on your real information",
  journeyStepProfileTitle: "Complete your body profile",
  journeyStepProfileDesc: "Height, weight, age and core details in the server database",
  journeyStepGoalTitle: "Set your fitness goal",
  journeyStepGoalDesc: "Your recorded goal will be the basis of plans and suggestions",
  journeyStepLibraryTitle: "Discover the exercise library and 3D coach",
  journeyStepLibraryDesc: "Real visits to both sections are recorded on this device",
  journeyStepPlanTitle: "Build your personal workout plan",
  journeyStepPlanDesc:
    "The plan builder is live; it builds and saves a plan based on your goal, level and equipment",
  journeyStepDoThis: "Do this step",
  journeyDoneBadge: "Done",
  journeyPendingBadge: "Pending",
  journeyProgress: (done, total) => `${done} of ${total} steps completed`,
  percentLabel: (value) => `${value}%`,
  journeyProgressAria: "Getting-started progress",
  journeyAllDone:
    "All getting-started steps are complete — to begin, run the first session of your active plan.",
  journeySourceNote:
    "Steps 1 and 2 are read from the server database; steps 3 and 4 are recorded based on your real visits on this device.",

  roadmapAria: "Development roadmap",
  roadmapTitle: "Product development roadmap",
  roadmapSubtitle:
    "Each stage starts after your approval; this card will be removed in the final version",
  roadmapCurrentBadge: "Current",

  quickAccessAria: "Quick access",
  quickAccessTitle: "Quick access",
  quickAccessNote: "All eight sections are reachable from the sidebar.",

  toastSessionExists: "Another session is already in progress; that one was resumed",
  toastSessionStarted:
    "Workout session started — the recorder is ready in the workout plan section",
};

const STRINGS: Record<Locale, DashboardStrings> = { fa: FA, en: EN };

export function dashboardStrings(locale: Locale): DashboardStrings {
  return STRINGS[locale];
}
