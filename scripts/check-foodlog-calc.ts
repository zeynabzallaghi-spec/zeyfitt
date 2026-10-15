/**
 * تست‌های واحد هسته محاسباتی ثبت مصرف واقعی (مرحله ۱۰) — اجرای واقعی با bun:
 *  ۱) تبدیل واحد (گرم/سهم) با حدود معتبر و رد مقادیر نامعتبر
 *  ۲) محاسبه انرژی و درشت‌مغذی از مقادیر ۱۰۰ گرمی + گرد کردن قراردادی
 *  ۳) روز محلی تهران — مرز نیمه‌شب و سازگاری با قرارداد آمار تمرین
 *  ۴) سازگاری لحظه/روز (پنجره ۲۶ ساعت) و رد جابه‌جایی ناخواسته روز
 *  ۵) دنباله روزها برای روند و جمع روزانه (روز خالی ≠ روز صفر)
 *  ۶) اعتبارسنجی تقویمی رشته روز
 *
 * اجرا: bun scripts/check-foodlog-calc.ts
 */

import {
  FOOD_LOG_LIMITS,
  resolveAmountToGrams,
  computeLogNutrition,
  tehranLocalDay,
  tehranInstantFromDayTime,
  tehranTimeLabel,
  instantMatchesLocalDay,
  isValidLocalDay,
  lastNDays,
  aggregateDayTotals,
  FoodLogCalcError,
} from "../src/lib/foodlog/calc";

let pass = 0;
let fail = 0;

function check(name: string, expected: unknown, actual: unknown) {
  const expectedJson = JSON.stringify(expected);
  const actualJson = JSON.stringify(actual);
  if (expectedJson === actualJson) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    console.error(`  ✗ ${name}\n      expected: ${expectedJson}\n      actual:   ${actualJson}`);
  }
}

function checkThrows(name: string, code: string, fn: () => unknown) {
  try {
    fn();
    fail += 1;
    console.error(`  ✗ ${name} — انتظار خطا ${code} داشتیم ولی خطایی پرتاب نشد`);
  } catch (error) {
    if (error instanceof FoodLogCalcError && error.code === code) {
      pass += 1;
      console.log(`  ✓ ${name}`);
    } else {
      fail += 1;
      console.error(`  ✗ ${name} — خطای نادرست: ${String(error)}`);
    }
  }
}

/* ------------------------------ ۱) تبدیل واحد ------------------------------ */

console.log("\n۱) تبدیل واحد و مقدار");

check("گرم معتبر بدون ضریب سهم", { grams: 120, servingGramsUsed: null }, resolveAmountToGrams("g", 120, null));
checkThrows("گرم صفر نامعتبر", "INVALID_AMOUNT", () => resolveAmountToGrams("g", 0, null));
checkThrows("گرم منفی نامعتبر", "INVALID_AMOUNT", () => resolveAmountToGrams("g", -5, null));
checkThrows("گرم نامتناهی نامعتبر", "INVALID_AMOUNT", () => resolveAmountToGrams("g", Number.POSITIVE_INFINITY, null));
checkThrows("گرم بالاتر از سقف", "GRAMS_OUT_OF_RANGE", () =>
  resolveAmountToGrams("g", FOOD_LOG_LIMITS.maxGrams + 1, null)
);
check("گرم روی کف مجاز", { grams: 1, servingGramsUsed: null }, resolveAmountToGrams("g", 1, null));
check("سهم ۰٫۵ × ۶۰ = ۳۰ گرم", { grams: 30, servingGramsUsed: 60 }, resolveAmountToGrams("serving", 0.5, 60));
check("سهم ۲ × ۴۵٫۵ = ۹۱ گرم", { grams: 91, servingGramsUsed: 45.5 }, resolveAmountToGrams("serving", 2, 45.5));
checkThrows("سهم بدون ضریب پشتیبانی نمی‌شود", "SERVING_UNIT_UNSUPPORTED", () =>
  resolveAmountToGrams("serving", 1, null)
);
checkThrows("سهم با ضریب صفر پشتیبانی نمی‌شود", "SERVING_UNIT_UNSUPPORTED", () =>
  resolveAmountToGrams("serving", 1, 0)
);
checkThrows("سهم کمتر از کف", "SERVINGS_OUT_OF_RANGE", () => resolveAmountToGrams("serving", 0.1, 60));
checkThrows("سهم بیشتر از سقف", "SERVINGS_OUT_OF_RANGE", () =>
  resolveAmountToGrams("serving", FOOD_LOG_LIMITS.maxServings + 1, 60)
);

/* ------------------------------ ۲) محاسبه تغذیه ------------------------------ */

console.log("\n۲) محاسبه انرژی و درشت‌مغذی");

// ۱۵۰ گرم از ماده‌ای با ۱۰۰ کیلوکالری و ۱۰ گرم پروتئین در ۱۰۰ گرم
const nutrition = computeLogNutrition(
  { kcal100: 100, protein100: 10, carb100: 20.5, fat100: 3.3 },
  150
);
check("kcal = ۱۵۰", 150, nutrition.kcal);
check("protein = ۱۵", 15, nutrition.protein);
check("carb = ۳۰٫۸ (یک اعشار)", 30.8, nutrition.carb);
check("fat = ۴٫۹ (یک اعشار — ۳٫۳×۱٫۵=۴٫۹۴۹۹…)", 4.9, nutrition.fat);

checkThrows("kcal100 منفی خطاست نه صفر", "MISSING_FOOD_DATA", () =>
  computeLogNutrition({ kcal100: -1, protein100: 10, carb100: 0, fat100: 0 }, 100)
);
checkThrows("grams نامعتبر خطا می‌دهد", "INVALID_AMOUNT", () =>
  computeLogNutrition({ kcal100: 100, protein100: 10, carb100: 0, fat100: 0 }, 0)
);
checkThrows("grams نامتناهی خطا می‌دهد", "INVALID_AMOUNT", () =>
  computeLogNutrition({ kcal100: 100, protein100: 10, carb100: 0, fat100: 0 }, Number.NaN)
);

/* ------------------------------ ۳) روز محلی تهران ------------------------------ */

console.log("\n۳) روز محلی تهران (مرز نیمه‌شب)");

// ۲۰:۲۹ UTC = ۲۳:۵۹ تهران → همان روز
check("۲۳:۵۹ تهران → همان روز", "2026-01-15", tehranLocalDay(Date.parse("2026-01-15T20:29:00Z")));
// ۲۰:۳۰ UTC = ۰۰:۰۰ تهران → روز بعد
check("۰۰:۰۰ تهران → روز بعد", "2026-01-16", tehranLocalDay(Date.parse("2026-01-15T20:30:00Z")));
// ۲۰:۳۱ UTC = ۰۰:۰۱ تهران → روز بعد
check("۰۰:۰۱ تهران → روز بعد", "2026-01-16", tehranLocalDay(Date.parse("2026-01-15T20:31:00Z")));
// ساعت صبح: ۰۴:۳۰ UTC = ۰۸:۰۰ تهران
check("۰۸:۰۰ تهران → همان روز", "2026-01-15", tehranLocalDay(Date.parse("2026-01-15T04:30:00Z")));

/* ------------------------------ ۴) سازگاری لحظه/روز ------------------------------ */

console.log("\n۴) سازگاری لحظه و روز (پنجره ۲۶ ساعت)");

check(
  "لحظه درون روز پذیرفته می‌شود",
  true,
  instantMatchesLocalDay(Date.parse("2026-01-15T04:30:00Z"), "2026-01-15")
);
check(
  "لحظه نیمه‌شب تهران در روز تهران پذیرفته می‌شود",
  true,
  instantMatchesLocalDay(Date.parse("2026-01-15T20:30:00Z"), "2026-01-16")
);
check(
  "اختلاف بیش از ۲۶ ساعت رد می‌شود",
  false,
  instantMatchesLocalDay(Date.parse("2026-01-15T12:00:00Z"), "2026-01-18")
);
check("روز بدشکل رد می‌شود", false, instantMatchesLocalDay(Date.parse("2026-01-15T12:00:00Z"), "20260115"));
check("ماه ۱۳ رد می‌شود", false, instantMatchesLocalDay(Date.parse("2026-01-15T12:00:00Z"), "2026-13-01"));

/* ------------------------------ ۵) ساخت لحظه از روز+ساعت ------------------------------ */

console.log("\n۵) ساخت لحظه از روز و ساعت تهران");

const instant = tehranInstantFromDayTime("2026-01-15", "08:00");
check("۰۸:۰۰ تهران = ۰۴:۳۰ UTC", "2026-01-15T04:30:00.000Z", new Date(instant).toISOString());
check("رفت‌وبرگشت: روز همان می‌ماند", "2026-01-15", tehranLocalDay(instant));
check("رفت‌وبرگشت: ساعت همان می‌ماند", "08:00", tehranTimeLabel(instant));
// مرز نیمه‌شب: ۰۰:۰۰ تهران
const midnight = tehranInstantFromDayTime("2026-01-15", "00:00");
check("۰۰:۰۰ تهران → ۲۰:۳۰ روز قبل UTC", "2026-01-14T20:30:00.000Z", new Date(midnight).toISOString());
check("ولی روز محلی همان ۱۵ ژانویه می‌ماند", "2026-01-15", tehranLocalDay(midnight));
check("ساعت بدشکل → NaN", true, Number.isNaN(tehranInstantFromDayTime("2026-01-15", "8am")));

/* ------------------------------ ۶) دنباله روزها و جمع ------------------------------ */

console.log("\n۶) دنباله روزها و جمع روزانه");

check(
  "۷ روز منتهی به امروز",
  ["2026-01-09", "2026-01-10", "2026-01-11", "2026-01-12", "2026-01-13", "2026-01-14", "2026-01-15"],
  lastNDays("2026-01-15", 7)
);
check(
  "عبور از مرز ماه",
  ["2026-01-30", "2026-01-31", "2026-02-01"],
  lastNDays("2026-02-01", 3)
);

const totals = aggregateDayTotals("2026-01-15", [
  { kcal: 150, protein: 15, carb: 30.8, fat: 5 },
  { kcal: 240, protein: 12.3, carb: 40, fat: 8.6 },
]);
check("جمع kcal خام", 390, totals.kcal);
check("جمع protein با گرد نمایش", 27.3, totals.protein);
check("جمع carb با گرد نمایش", 70.8, totals.carb);
check("جمع fat با گرد نمایش", 13.6, totals.fat);
check("hasLogs برای روز پرمحتوا true", true, totals.hasLogs);

const emptyTotals = aggregateDayTotals("2026-01-16", []);
check("روز خالی: count = ۰", 0, emptyTotals.count);
check("روز خالی: hasLogs = false (با روز صفر یکی نیست)", false, emptyTotals.hasLogs);
check("روز خالی: kcal = ۰ (بدون ادعای مصرف)", 0, emptyTotals.kcal);

/* ------------------------------ ۷) اعتبارسنجی تقویمی ------------------------------ */

console.log("\n۷) اعتبارسنجی تقویمی روز محلی");

check("تاریخ معتبر", true, isValidLocalDay("2026-01-15"));
check("سال کبیسه معتبر", true, isValidLocalDay("2024-02-29"));
check("۳۰ فوریه نامعتبر", false, isValidLocalDay("2026-02-30"));
check("ماه صفر نامعتبر", false, isValidLocalDay("2026-00-10"));
check("فرمت بدون خط تیره نامعتبر", false, isValidLocalDay("20260115"));
check("ورودی غیر رشته نامعتبر", false, isValidLocalDay(20260115));

/* --------------------------------- نتیجه --------------------------------- */

console.log(`\nنتیجه: ${pass} موفق / ${fail} شکست`);
if (fail > 0) process.exit(1);
