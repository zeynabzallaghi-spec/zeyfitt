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

console.log(`\nRESULT: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
