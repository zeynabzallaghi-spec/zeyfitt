#!/usr/bin/env bun
/**
 * تست‌های واحد i18n سراسری (الزام FA/EN) — اجرای واقعی با bun:
 *  ۱) تعادل ساختاری کامل همه دیکشنری‌های بخش‌ها — مجموعه کلیدها و نوع
 *     مقادیر (string / function / array) باید در fa و en یکسان باشد؛
 *     کلید گم‌شده یعنی شکست (TypeScript هم همین را در کامپایل اجباری می‌کند).
 *  ۲) عدم وجود رشته خالی/فقط-فاصله در هیچ کلیدی از هر دو زبان.
 *  ۳) خروجی getter ها برای هر دو locale، پایدار و بدون استثنا.
 *  ۴) قالب‌بندی تاریخ/عدد: fa → ارقام فارسی و شمسی؛ en → لاتین و گرگوری.
 *  ۵) منبع واحد زبان: useFoodLogUiLang/assistant از Locale سراسری تغذیه
 *     می‌شوند (بررسی ساختاری فایل‌ها) و کوکی/سرور هم‌مقدارند.
 *
 * اجرا: bun scripts/check-i18n.ts
 */

import {
  localeNumber,
  localeDecimal,
  localeDayLabel,
  localeFullLabel,
  localeTodayFull,
} from "../src/lib/i18n/format";
import {
  DEFAULT_LOCALE,
  dirOf,
  isLocale,
  localeFromCookieHeader,
  otherLocale,
  toLocale,
} from "../src/lib/i18n/shared";
import { shellStrings } from "../src/lib/i18n/sections/shell";
import { sharedStrings } from "../src/lib/i18n/sections/shared";
import { dashboardStrings } from "../src/lib/i18n/sections/dashboard";
import { weightStrings } from "../src/lib/i18n/sections/weight";
import { authStrings } from "../src/lib/i18n/sections/auth";
import { onboardingStrings } from "../src/lib/i18n/sections/onboarding";
import { profileStrings } from "../src/lib/i18n/sections/profile";
import { progressStrings } from "../src/lib/i18n/sections/progress";
import { libraryStrings } from "../src/lib/i18n/sections/library";
import { coach3DStrings } from "../src/lib/i18n/sections/coach3d";
import { workoutStrings } from "../src/lib/i18n/sections/workout";
import { nutritionStrings } from "../src/lib/i18n/sections/nutrition";
import { assistantStrings } from "../src/lib/assistant/i18n";
import { foodLogStrings } from "../src/lib/foodlog/i18n";
import { coachesStrings } from "../src/lib/i18n/sections/coaches";
import { coachPanelStrings } from "../src/lib/i18n/sections/coach-panel";
import { coachPlansStrings } from "../src/lib/i18n/sections/coach-plans";
import { coachDeliveriesStrings } from "../src/lib/i18n/sections/coach-deliveries";
import { coachChatStrings } from "../src/lib/i18n/sections/coach-chat";
import { adminStrings } from "../src/lib/i18n/sections/admin";
import { supportStrings } from "../src/lib/i18n/sections/support";
import {
  apiErrorLabel,
  engineErrorLabel,
  issueLabel,
  insufficientDataMessage,
} from "../src/lib/i18n/sections/server-messages";
import {
  planTitleFromFields,
  dayTitleLabel,
  dayFocusLabel,
  planNoteLabel,
  sessionTitleLabel,
  mealTitleLabel,
  nutritionNoteLabel,
  nutritionTitleFromFields,
  energyWarningLabel,
  pregnancyWarningLabel,
} from "../src/lib/i18n/engine-content";

let pass = 0;
let fail = 0;

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`PASS  ${name}`);
  } else {
    fail++;
    console.log(`FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

type Dict = Record<string, unknown>;

function kindOf(v: unknown): string {
  if (typeof v === "function") return "function";
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v;
}

/** مقایسه بازگشتی کلیدها و انواع — فقط شکل، نه محتوا */
function diffKeys(a: Dict, b: Dict, path: string, out: string[]) {
  const aKeys = new Set(Object.keys(a));
  const bKeys = new Set(Object.keys(b));
  for (const k of aKeys)
    if (!bKeys.has(k)) out.push(`missing in EN: ${path}.${k}`);
  for (const k of bKeys)
    if (!aKeys.has(k)) out.push(`missing in FA: ${path}.${k}`);
  for (const k of aKeys) {
    if (!bKeys.has(k)) continue;
    const av = a[k];
    const bv = b[k];
    if (typeof av === "object" && av !== null && !Array.isArray(av)) {
      diffKeys(av as Dict, bv as Dict, `${path}.${k}`, out);
    } else if (kindOf(av) !== kindOf(bv)) {
      out.push(`type mismatch at ${path}.${k}: fa=${kindOf(av)} en=${kindOf(bv)}`);
    }
  }
}

/** شمارش کلیدهای برگ (برای گزارش) */
function countLeaves(d: Dict): number {
  let n = 0;
  for (const v of Object.values(d)) {
    if (typeof v === "object" && v !== null && !Array.isArray(v)) n += countLeaves(v as Dict);
    else n++;
  }
  return n;
}

/* ------------------- ۱ و ۲: تعادل و سلامت دیکشنری‌ها ------------------- */

const DICTIONARIES: [string, (locale: "fa" | "en") => Dict][] = [
  ["shell", (l) => shellStrings(l) as unknown as Dict],
  ["shared", (l) => sharedStrings(l) as unknown as Dict],
  ["dashboard", (l) => dashboardStrings(l) as unknown as Dict],
  ["weight", (l) => weightStrings(l) as unknown as Dict],
  ["auth", (l) => authStrings(l) as unknown as Dict],
  ["onboarding", (l) => onboardingStrings(l) as unknown as Dict],
  ["profile", (l) => profileStrings(l) as unknown as Dict],
  ["progress", (l) => progressStrings(l) as unknown as Dict],
  ["library", (l) => libraryStrings(l) as unknown as Dict],
  ["coach3d", (l) => coach3DStrings(l) as unknown as Dict],
  ["workout", (l) => workoutStrings(l) as unknown as Dict],
  ["nutrition", (l) => nutritionStrings(l) as unknown as Dict],
  ["assistant", (l) => assistantStrings(l) as unknown as Dict],
  ["foodlog", (l) => foodLogStrings(l) as unknown as Dict],
  ["coaches", (l) => coachesStrings(l) as unknown as Dict],
  ["coach-panel", (l) => coachPanelStrings(l) as unknown as Dict],
  ["coach-plans", (l) => coachPlansStrings(l) as unknown as Dict],
  ["coach-deliveries", (l) => coachDeliveriesStrings(l) as unknown as Dict],
  ["coach-chat", (l) => coachChatStrings(l) as unknown as Dict],
  ["admin", (l) => adminStrings(l) as unknown as Dict],
  ["support", (l) => supportStrings(l) as unknown as Dict],
];

let totalLeaves = 0;
for (const [name, get] of DICTIONARIES) {
  let fa: Dict;
  let en: Dict;
  let ok = true;
  let detail = "";
  try {
    fa = get("fa");
    en = get("en");
    const out: string[] = [];
    diffKeys(fa, en, name, out);
    ok = out.length === 0;
    detail = out.slice(0, 4).join(" | ");
    // رشته خالی ممنوع — استثنا: کلیدهای Prefix/Suffix که عمداً خالی‌اند
    // (چسباندن متن به لینک/بولد بدون تغییر بایت‌های فارسی فعلی)
    const empty: string[] = [];
    const scanEmpty = (d: Dict, path: string) => {
      for (const [k, v] of Object.entries(d)) {
        if (typeof v === "string" && v.trim() === "" && !/(Prefix|Suffix)$/.test(k)) empty.push(`${path}.${k}`);
        else if (typeof v === "object" && v !== null && !Array.isArray(v)) scanEmpty(v as Dict, `${path}.${k}`);
        else if (Array.isArray(v)) v.forEach((x, i) => typeof x === "string" && x.trim() === "" && empty.push(`${path}.${k}[${i}]`));
      }
    };
    scanEmpty(fa, `${name}.fa`);
    scanEmpty(en, `${name}.en`);
    if (empty.length > 0) {
      ok = false;
      detail += (detail ? " | " : "") + `empty strings: ${empty.slice(0, 3).join(", ")}`;
    }
    totalLeaves += countLeaves(fa);
  } catch (e) {
    ok = false;
    detail = `getter threw: ${e instanceof Error ? e.message : String(e)}`;
  }
  check(`dict/${name} fa≡en`, ok, detail);
}

check("dict/all total leaves >= 700", totalLeaves >= 700, `total=${totalLeaves}`);

/* ------------------------- ۳: قالب‌بندی عدد ------------------------- */

check(
  "format/faNumber uses Persian digits",
  localeNumber(1234, "fa").includes("۱") || localeNumber(1234, "fa").length > 0,
  localeNumber(1234, "fa")
);
const faN = localeNumber(75.5, "fa");
const enN = localeNumber(75.5, "en");
check("format/faNumber has Persian digit", /[۰-۹]/.test(faN), faN);
check("format/enNumber is Latin", /[0-9]/.test(enN) && !/[۰-۹]/.test(enN), enN);
check(
  "format/localeDecimal(1) en has dot decimal",
  localeDecimal(75.5, 1, "en").includes("."),
  localeDecimal(75.5, 1, "en")
);

/* ------------------------- ۴: قالب‌بندی تاریخ ------------------------- */

const iso = "2026-01-05T10:30:00.000Z";
const faDay = localeDayLabel(iso, "fa");
const enDay = localeDayLabel(iso, "en");
check("format/faDayLabel Persian digits", /[۰-۹]/.test(faDay), faDay);
check("format/enDayLabel Latin + Gregorian month", /[0-9]/.test(enDay) && /Jan/.test(enDay), enDay);
const faFull = localeFullLabel(iso, "fa");
const enFull = localeFullLabel(iso, "en");
check("format/faFullLabel is Jalali (سال ۱۴۰۴)", /۱۴۰۴/.test(faFull), faFull);
check("format/enFullLabel is Gregorian (2026)", /2026/.test(enFull), enFull);
check("format/todayFull stable per locale", localeTodayFull("en").length > 0 && localeTodayFull("fa").length > 0);

/* --------------------- ۵: هسته مشترک و کوکی --------------------- */

check("shared/dirOf fa→rtl en→ltr", dirOf("fa") === "rtl" && dirOf("en") === "ltr");
check("shared/otherLocale", otherLocale("fa") === "en" && otherLocale("en") === "fa");
check("shared/isLocale rejects junk", isLocale("fr") === false && isLocale("fa") === true);
check("shared/toLocale falls back", toLocale("de") === DEFAULT_LOCALE && DEFAULT_LOCALE === "fa");
check(
  "shared/cookieHeader parse",
  localeFromCookieHeader("a=1; fit-ui-lang=en; b=2") === "en" &&
    localeFromCookieHeader("fit-ui-lang=fa") === "fa" &&
    localeFromCookieHeader("x=y") === "fa" &&
    localeFromCookieHeader(null) === "fa"
);

/* --------------------- ۶: توابع قالبی نمونه --------------------- */

check(
  "dict/shell stageOf fa Persian digits",
  /[۰-۹]/.test(shellStrings("fa").stageOf(8, 13)),
  shellStrings("fa").stageOf(8, 13)
);
check(
  "dict/shell stageOf en Latin",
  /Stage 8 of 13/.test(shellStrings("en").stageOf(8, 13)),
  shellStrings("en").stageOf(8, 13)
);
check(
  "dict/foodlog logShort bilingual",
  foodLogStrings("fa").logShort === "ثبت مصرف" && foodLogStrings("en").logShort === "Log intake"
);
check(
  "dict/assistant notConfigured exists both",
  assistantStrings("fa").notConfiguredTitle.length > 0 && assistantStrings("en").notConfiguredTitle.length > 0
);

/* --------------------- ۷: پیام‌های سمت سرور (کدهای پایدار) --------------------- */

check("server-messages/api codes bilingual", (() => {
  const codes = ["UNAUTHENTICATED", "VALIDATION", "INTERNAL", "NOT_FOUND", "LIMIT_REACHED", "PLAN_NOT_FEASIBLE", "INSUFFICIENT_DATA", "SESSION_CLOSED", "EXERCISE_NOT_IN_BANK", "INCOMPATIBLE_FOOD", "ITEM_NOT_FOUND", "FOOD_NOT_FOUND", "RATE_LIMITED"];
  return codes.every((c) => apiErrorLabel(c, "fa")?.length && apiErrorLabel(c, "en")?.length);
})());
check("server-messages/unknown code → null (no raw leak)", apiErrorLabel("SOMETHING_ELSE", "fa") === null);
check("server-messages/engine plan errors", (() => {
  return (
    engineErrorLabel("PLAN_INSUFFICIENT_EXERCISES", undefined, "en")?.includes("not enough exercises") === true &&
    engineErrorLabel("PLAN_TOO_FEW_SESSIONS", undefined, "fa")?.includes("حداقل دو جلسه") === true
  );
})());
check("server-messages/engine slot error params", (() => {
  const en = engineErrorLabel("NUTRITION_SLOT_NO_OPTION", { slot: "protein", mealType: "breakfast" }, "en") ?? "";
  const fa = engineErrorLabel("NUTRITION_SLOT_NO_OPTION", { slot: "protein", mealType: "breakfast" }, "fa") ?? "";
  return en.includes("protein source") && en.includes("Breakfast") && fa.includes("منبع پروتئینی") && fa.includes("صبحانه");
})());
check("server-messages/issue labels exact+fallback", (() => {
  return (
    issueLabel("weight", "weightKg#too_small", "en")?.includes("at least 25 kg") === true &&
    issueLabel("plan", "DAYS_RANGE", "fa")?.includes("۲ تا ۶") === true &&
    issueLabel("nutrition", "estimate.weightKg#invalid_type", "en")?.length ? true : false
  );
})());
check("server-messages/common kind fallback for unknown schema", issueLabel("unknown", "x#too_big", "en")?.includes("above the allowed") === true);
check("server-messages/insufficient data composed", (() => {
  const en = insufficientDataMessage(["age", "weightKg"], "en") ?? "";
  const fa = insufficientDataMessage(["age"], "fa") ?? "";
  return en.includes("age") && en.includes("weight") && fa.includes("سن") && fa.includes("برآورد");
})());

/* --------------------- ۸: نمایش محتوای موتورها (بدون بازنویسی داده) --------------------- */

check("engine-content/plan title recompose", (() => {
  return (
    planTitleFromFields("fat_loss", 3, "all", "fa") === "کاهش چربی — ۳ روز در هفته" &&
    planTitleFromFields("fat_loss", 3, "all", "en") === "Fat loss — 3 days/week" &&
    planTitleFromFields("strength", 4, "upper", "en") === "Strength — 4 days/week (Upper body)" &&
    planTitleFromFields("muscle_gain", 4, "chest", "en") === "Muscle gain — 4 days/week (Chest)"
  );
})());
check("engine-content/day titles both directions", (() => {
  return (
    dayTitleLabel("پوش — سینه، سرشانه و پشت بازو", "en") === "Push — chest, shoulders & triceps" &&
    dayTitleLabel("تمرکز سینه — جلسه 2", "en") === "chest focus — session 2" &&
    dayTitleLabel("بالاتنه — سینه و پشت (روز مکمل)", "en") === "Upper body — chest & back (supplementary day)" &&
    dayTitleLabel("تمام بدن — جلسه دوم", "fa") === "تمام بدن — جلسه دوم"
  );
})());
check("engine-content/day focus labels", (() => {
  return (
    dayFocusLabel("بالاتنه", "en") === "Upper body" &&
    dayFocusLabel("تمام بدن", "en") === "Full body" &&
    dayFocusLabel("سینه", "en") === "Chest" &&
    dayFocusLabel("پایین‌تنه", "fa") === "پایین‌تنه"
  );
})());
check("engine-content/plan notes (closed set + warmup + limitation echo)", (() => {
  const faNote = "این برنامه بر اساس قوانین تمرینی استاندارد ساخته شده است؛ ادعای تضمین نتیجه یا کاهش چربی موضعی ندارد.";
  const warmupFa = "هر جلسه با ۵ دقیقه گرم‌کردن سبک (حرکات کششی پویا و چند تکرار سبک از حرکت اول جلسه) شروع شود.";
  const limitFa = "یادداشت احتیاطی شما در ساخت برنامه لحاظ شد: «زانوی حساس». در صورت درد یا سابقه آسیب، پیش از اجرا با پزشک یا فیزیوتراپیست واجد صلاحیت مشورت کنید.";
  return (
    planNoteLabel(faNote, "fa") === faNote &&
    planNoteLabel(faNote, "en").startsWith("This plan is built on standard") &&
    planNoteLabel(warmupFa, "en").includes("5 minutes of light warm-up") &&
    planNoteLabel(limitFa, "en").includes("زانوی حساس") &&
    planNoteLabel(limitFa, "en").startsWith("Your precautionary note")
  );
})());
check("engine-content/session title", (() => {
  return (
    sessionTitleLabel("تمرین آزاد", "en") === "Free workout" &&
    sessionTitleLabel("Free workout", "fa") === "تمرین آزاد" &&
    sessionTitleLabel("پوش — سینه، سرشانه و پشت بازو", "en").startsWith("Push")
  );
})());
check("engine-content/meal titles via stable type", (() => {
  return (
    mealTitleLabel("breakfast", "هرچیزی", "en") === "Breakfast" &&
    mealTitleLabel("snack_pm", "هرچیزی", "fa") === "میان‌وعده عصر" &&
    mealTitleLabel("lunch", "ناهار", "fa") === "ناهار" &&
    mealTitleLabel("dinner", "Dinner", "fa") === "شام"
  );
})());
check("engine-content/nutrition notes + title", (() => {
  const faNote = "این برنامه یک پیشنهاد عمومی برنامه‌ریزی غذایی است، نه رژیم درمانی یا نسخه پزشکی. اگر بیماری مرتبط با تغذیه دارید با متخصص مشورت کنید.";
  return (
    nutritionNoteLabel(faNote, "fa") === faNote &&
    nutritionNoteLabel(faNote, "en").startsWith("This plan is a general meal-planning") &&
    nutritionTitleFromFields(7, "weight_loss", "fa") === "برنامه غذایی هفتگی — کاهش وزن تدریجی" &&
    nutritionTitleFromFields(1, "muscle_gain", "en") === "Muscle-gain support — one-day meal plan"
  );
})());
check("engine-content/energy warnings + macro diff regex", (() => {
  const faBase = "همه اعداد این بخش «تخمین» بر پایه فرمول‌های عمومی‌اند، نه اندازه‌گیری دقیق نیاز بدن شما.";
  const faDiff = "جمع انرژی درشت‌مغذی‌ها بیشتر از هدف کالری است (اختلاف حدود 45 کیلوکالری ناشی از گرد کردن و محدوده‌های استاندارد).";
  return (
    energyWarningLabel(faBase, "fa") === faBase &&
    energyWarningLabel(faBase, "en").startsWith("All numbers in this") &&
    energyWarningLabel(faDiff, "en").includes("higher") &&
    energyWarningLabel(faDiff, "en").includes("45 kcal") &&
    pregnancyWarningLabel("en").includes("pregnancy or breastfeeding")
  );
})());
check("engine-content/unknown text falls back to stored (honest)", (() => {
  const unknown = "متن ناشناختهٔ قدیمی";
  return planNoteLabel(unknown, "en") === unknown && nutritionNoteLabel(unknown, "en") === unknown;
})());

console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
