/**
 * دیکشنری بخش «پیشرفت من» — الگو دقیقاً مطابق sections/shell.ts:
 *   ۱) اینترفیس تایپ‌شده برای تمام متن‌های قابل مشاهده بخش
 *   ۲) دیکشنری فارسی — متن‌ها عیناً همان متن‌های فعلی اپ (بدون بازنویسی، با حفظ نیم‌فاصله)
 *   ۳) دیکشنری انگلیسی — ترجمه طبیعی و کامل
 *   ۴) Record<Locale, X> + تابع getter — کامل‌بودن هر دو دیکشنری اجباری است.
 *
 * نکته اندازه‌های بدن: مقادیر BODY_MEASURES در progress-view.tsx فقط رابطی‌اند
 * (هیچ‌جا ذخیره یا به API فرستاده نمی‌شوند)؛ مقدار فارسی به‌عنوان کلید داده
 * می‌ماند و برچسب نمایشی با measureLabel به زبان رابط ترجمه می‌شود.
 *
 * کارت ثبت وزن (WeightLogCard) و آمار/تاریخچه جلسات (SessionStats/SessionHistory)
 * دیکشنری خودشان را دارند و خارج از محدوده این فایل‌اند.
 */

import type { Locale } from "../shared";

export interface ProgressStrings {
  // aria-label بخش‌های صفحه
  sectionStatsAria: string;
  sectionHistoryAria: string;
  sectionWeightAria: string;
  sectionMeasuresAria: string;
  sectionGuideAria: string;
  // اندازه‌های بدن (حالت «به‌زودی»)
  measuresTitle: string;
  comingSoonBadge: string;
  /** برچسب نمایشی اندازه — مقدار فارسی، کلید نمایشی است؛ داده ذخیره نمی‌شود */
  measureLabel: (value: string) => string;
  measuresNote: string;
  // راهنمای ثبت اطلاعات
  guideTitle: string;
  steps: { title: string; desc: string }[];
  stepActiveBadge: string;
  privacyNote: string;
}

const FA: ProgressStrings = {
  sectionStatsAria: "تحلیل پیشرفت",
  sectionHistoryAria: "تاریخچه جلسات",
  sectionWeightAria: "روند وزن",
  sectionMeasuresAria: "اندازه‌های بدن",
  sectionGuideAria: "راهنمای ثبت اطلاعات",
  measuresTitle: "اندازه‌های بدن",
  comingSoonBadge: "به‌زودی",
  measureLabel: (value) =>
    (
      {
        "قفسه سینه": "قفسه سینه",
        "کمر": "کمر",
        "باسن": "باسن",
        "بازو": "بازو",
        "ران": "ران",
      } as Record<string, string>
    )[value] ?? value,
  measuresNote:
    "ثبت اندازه‌های سانتی‌متری همراه با تاریخ، در مراحل بعدی به تاریخچه وزن اضافه خواهد شد؛ فعلاً هیچ مقداری برای آن‌ها ذخیره نمی‌شود.",
  guideTitle: "چگونه پیشرفت من ساخته می‌شود؟",
  steps: [
    {
      title: "شروع جلسه واقعی",
      desc: "از بخش «برنامه تمرینی» دکمه «شروع تمرین» (روز برنامه یا تمرین آزاد) را بزنید؛ بازدید از برنامه هرگز جلسه حساب نمی‌شود.",
    },
    {
      title: "ثبت ست‌های انجام‌شده",
      desc: "بعد از هر ست واقعی، تکرار و وزنه را ثبت کنید؛ ذخیره در پایگاه داده سرور است و با رفرش از بین نمی‌رود.",
    },
    {
      title: "پایان صریح جلسه",
      desc: "با «تکمیل تمرین» یا «رهاکردن» جلسه بسته می‌شود؛ فقط جلسات تکمیل‌شده در آمار پیشرفت جمع می‌شوند.",
    },
  ],
  stepActiveBadge: "فعال",
  privacyNote:
    "داده‌های این بخش فقط از حساب کاربری شما خوانده می‌شوند؛ داده کاربران دیگر هرگز با اطلاعات شما ترکیب نمی‌شود، تاریخ‌ها با تقویم شمسی نمایش داده می‌شوند و هفته با تقویم رسمی ایران (شنبه تا جمعه) محاسبه می‌شود.",
};

const EN: ProgressStrings = {
  sectionStatsAria: "Progress analysis",
  sectionHistoryAria: "Session history",
  sectionWeightAria: "Weight trend",
  sectionMeasuresAria: "Body measurements",
  sectionGuideAria: "Data logging guide",
  measuresTitle: "Body measurements",
  comingSoonBadge: "Coming soon",
  measureLabel: (value) =>
    (
      {
        "قفسه سینه": "Chest",
        "کمر": "Waist",
        "باسن": "Hips",
        "بازو": "Arm",
        "ران": "Thigh",
      } as Record<string, string>
    )[value] ?? value,
  measuresNote:
    "Logging centimeter measurements with dates will be added to the weight history in later stages; for now, no values are stored for them.",
  guideTitle: "How is my progress built?",
  steps: [
    {
      title: "Start a real session",
      desc: "In the «Workout Plan» section, press the «Start workout» button (a plan day or a free workout); merely viewing the plan never counts as a session.",
    },
    {
      title: "Log completed sets",
      desc: "After each real set, log the reps and the weight; everything is stored in the server database and is not lost on refresh.",
    },
    {
      title: "End the session explicitly",
      desc: "A session is closed with «Finish workout» or «Abandon»; only completed sessions count toward the progress stats.",
    },
  ],
  stepActiveBadge: "Active",
  privacyNote:
    "The data in this section is read only from your own account; other users' data is never combined with yours, dates are displayed in the Gregorian calendar, and the week is calculated using the official Iranian calendar (Saturday to Friday).",
};

const STRINGS: Record<Locale, ProgressStrings> = { fa: FA, en: EN };

export function progressStrings(locale: Locale): ProgressStrings {
  return STRINGS[locale];
}
