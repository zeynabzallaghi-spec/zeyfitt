/**
 * دیکشنری پوسته اپ — سربرگ، نوار کناری، پاورقی و منوی کاربر.
 *
 * الگوی مرجع برای همه دیکشنری‌های بخش‌ها (الزام مدیریت متمرکز ترجمه‌ها):
 *   ۱) یک اینترفیس تایپ‌شده برای تمام متن‌های قابل مشاهده بخش
 *   ۲) دیکشنری فارسی — متن‌ها عیناً همان متن‌های فعلی اپ (بدون بازنویسی)
 *   ۳) دیکشنری انگلیسی — ترجمه طبیعی و کامل، نه ترجمه ماشینی
 *   ۴) Record<Locale, X> + تابع getter — TypeScript کامل‌بودن هر دو
 *      دیکشنری را اجباری می‌کند؛ کلید ناقص یعنی خطای کامپایل.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface ShellStrings {
  // سربرگ
  openNavMenu: string;
  accountMenuAria: string;
  profileAndSettings: string;
  signOut: string;
  /** عنوان سند پنل — «{بخش} | AI Fitness Coach» */
  documentTitle: (section: string) => string;
  // نوار کناری
  sidebarAria: string;
  mainNavMenuAria: string;
  navAria: string;
  sectionsLabel: string;
  tagline: string;
  // کارت وضعیت توسعه
  devStatusTitle: string;
  stageOf: (current: number, total: number) => string;
  overallProgressAria: string;
  statusForStage: (stage: number) => string;
  devGenericStatus: string;
  nextStageNote: string;
  // پاورقی
  footerBrand: string;
  footerStageNote: string;
  // کلید تغییر زبان
  langSwitchAria: string;
  langSwitchTitle: string;
}

const FA: ShellStrings = {
  openNavMenu: "باز کردن منوی ناوبری",
  accountMenuAria: "منوی حساب کاربری",
  profileAndSettings: "پروفایل و تنظیمات",
  signOut: "خروج از حساب",
  documentTitle: (section) => `${section} | AI Fitness Coach`,
  sidebarAria: "نوار کناری",
  mainNavMenuAria: "منوی ناوبری اصلی",
  navAria: "ناوبری اصلی",
  sectionsLabel: "بخش‌های پنل",
  tagline: "مربی هوشمند تناسب اندام",
  devStatusTitle: "وضعیت توسعه",
  stageOf: (current, total) => `مرحله ${localeNumber(current, "fa")} از ${localeNumber(total, "fa")}`,
  overallProgressAria: "پیشرفت کل مراحل توسعه",
  statusForStage: (stage) =>
    (
      {
        3: "حساب کاربری، ورود امن و ذخیره‌سازی دائمی پروفایل با پایگاه داده واقعی فعال است.",
        4: "داشبورد شخصی به داده واقعی حساب شما متصل شد؛ روند وزن با ثبت اندازه‌گیری فعال است.",
        7: "سیستم تغذیه فعال شد: برآورد انرژی، برنامه وعده‌ها با جایگزینی و فهرست خرید.",
        8: "دستیار هوشمند با اتصال واقعی به مدل زبانی فعال شد: چت دوزبانه فارسی/انگلیسی با مکالمه‌های ذخیره‌شده و پاسخ بر اساس داده واقعی حساب شما.",
      } as Record<number, string>
    )[stage] ?? "",
  devGenericStatus: "محصول در حال توسعه است.",
  nextStageNote: " مرحله بعد پس از تأیید شما آغاز می‌شود.",
  footerBrand: " — مربی هوشمند تناسب اندام",
  footerStageNote:
    "محصول در فاز توسعه است؛ هر مرحله پس از تأیید شما تکمیل می‌شود",
  langSwitchAria: "انتخاب زبان رابط",
  langSwitchTitle: "زبان رابط: فارسی / English",
};

const EN: ShellStrings = {
  openNavMenu: "Open navigation menu",
  accountMenuAria: "Account menu",
  profileAndSettings: "Profile & settings",
  signOut: "Sign out",
  documentTitle: (section) => `${section} | AI Fitness Coach`,
  sidebarAria: "Sidebar",
  mainNavMenuAria: "Main navigation menu",
  navAria: "Main navigation",
  sectionsLabel: "Panel sections",
  tagline: "Smart fitness coach",
  devStatusTitle: "Development status",
  stageOf: (current, total) => `Stage ${current} of ${total}`,
  overallProgressAria: "Overall development progress",
  statusForStage: (stage) =>
    (
      {
        3: "Account, secure sign-in and permanent profile storage with a real database are live.",
        4: "The personal dashboard is connected to your real account data; weight trends work with real measurements.",
        7: "The nutrition system is live: energy estimation, meal plans with swaps, and a shopping list.",
        8: "The AI assistant is live with a real language-model connection: bilingual Persian/English chat with saved conversations and answers based on your real account data.",
      } as Record<number, string>
    )[stage] ?? "",
  devGenericStatus: "The product is under active development.",
  nextStageNote: " The next stage starts after your approval.",
  footerBrand: " — Smart Fitness Coach",
  footerStageNote:
    "The product is in development; every stage is completed after your approval",
  langSwitchAria: "Interface language",
  langSwitchTitle: "Interface language: فارسی / English",
};

const STRINGS: Record<Locale, ShellStrings> = { fa: FA, en: EN };

export function shellStrings(locale: Locale): ShellStrings {
  return STRINGS[locale];
}
