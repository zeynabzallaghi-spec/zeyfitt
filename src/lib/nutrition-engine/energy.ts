/**
 * محاسبه انرژی و درشت‌مغذی‌ها — ماژول مستقل، خالص و مستند.
 *
 * فرمول BMR: Mifflin–St Jeor (1990) — یکی از فرمول‌های شناخته‌شده برآورد
 * سوخت‌وساز پایه برای بزرگسالان سالم:
 *   مردان:   10×وزن(kg) + 6.25×قد(cm) − 5×سن + 5
 *   زنان:    10×وزن(kg) + 6.25×قد(cm) − 5×سن − 161
 *   جنسیت اعلام‌نشده: میانگین دو فرمول (یعنی −78) — روش جایگزین مستند با
 *   عدم‌قطعیت بیشتر که در UI صادقانه اعلام می‌شود.
 *
 * TDEE = BMR × ضریب فعالیت (1.2 تا 1.9 — ضرایب استاندارد جدول فعالیت).
 *
 * هدف کالری:
 *   کاهش وزن تدریجی: TDEE − 500 (حدود ۰٫۵ کیلوگرم در هفته؛ حد محاسباتی
 *   نرم‌افزار: خروجی هرگز از حداکثر BMR×1.1 و 1200 کیلوکالری پایین‌تر نمی‌رود
 *   — این یک قاعده محافظه‌کارانه محاسباتی این نرم‌افزار است، نه کف امن
 *   عمومی و نه تضمین ایمنی شخصی؛ نیاز واقعی هر فرد فقط با متخصص مشخص می‌شود)
 *   عضله‌سازی: TDEE + 300 (مازاد محافظه‌کارانه)
 *   حفظ وزن: TDEE
 *
 * درشت‌مغذی‌ها (محدوده‌های متداول راهنماهای تغذیه ورزشی):
 *   پروتئین: کاهش وزن 2.0 g/kg، عضله‌سازی 1.8، حفظ 1.5
 *   چربی: 30٪ (کاهش)، 27٪ (عضله‌سازی)، 28٪ (حفظ) از انرژی هدف
 *   کربوهیدرات: باقیمانده انرژی ÷ 4
 *
 * همه اعداد گرد می‌شوند (کالری به ۱۰، گرم به ۵) و «تخمین» معرفی می‌شوند،
 * نه اندازه‌گیری دقیق نیاز بدن یا توصیه پزشکی.
 *
 * گروه‌های نیازمند احتیاط:
 *   - زیر ۱۸ سال: هدف کاهش/افزایش خودکار تنظیم نمی‌شود (فقط حفظ وزن) +
 *     راهنمای مشورت با متخصص.
 *   - بارداری/شیردهی: همان سیاست — هیچ محدودیت انرژی خودکار.
 *   - اطلاعات ناقص: هیچ برآورد کالری شخصی ارائه نمی‌شود.
 */

import type {
  ActivityLevelId,
  CalcSnapshot,
  EstimateInfo,
  MacroTargets,
  NutritionGoal,
  TargetsResult,
} from "./types";
import { activityLevelDef } from "./types";

/** گرد کردن به مضرب ۱۰ — برای کالری */
function round10(value: number): number {
  return Math.round(value / 10) * 10;
}

/** گرد کردن به مضرب ۵ — برای گرم */
function round5(value: number): number {
  return Math.round(value / 5) * 5;
}

function missingLabelsOf(estimate: EstimateInfo | null): string[] {
  if (!estimate) return ["سن", "قد", "وزن"];
  const missing: string[] = [];
  if (!estimate.age || estimate.age <= 0) missing.push("سن");
  if (!estimate.heightCm || estimate.heightCm <= 0) missing.push("قد");
  if (!estimate.weightKg || estimate.weightKg <= 0) missing.push("وزن");
  return missing;
}

/**
 * برآورد BMR با Mifflin–St Jeor. جنسیت فقط همین‌جا و فقط برای انتخاب ثابت
 * فرمول استفاده می‌شود؛ «undisclosed» یعنی میانگین دو فرمول.
 */
export function estimateBMR(info: EstimateInfo): number {
  const base = 10 * info.weightKg + 6.25 * info.heightCm - 5 * info.age;
  if (info.gender === "male") return base + 5;
  if (info.gender === "female") return base - 161;
  return base - 78; // میانگین (+5 و −161)
}

/**
 * هدف کالری و درشت‌مغذی‌ها بر اساس هدف تغذیه‌ای و وزن.
 * خروجی خام (بدون گرد نهایی) — برای تست‌پذیری جدا شده است.
 */
export function goalEnergyAdjustment(goal: NutritionGoal): number {
  switch (goal) {
    case "weight_loss":
      return -500;
    case "muscle_gain":
      return 300;
    case "maintain":
      return 0;
  }
}

export function computeMacroTargets(
  goal: NutritionGoal,
  targetKcal: number,
  weightKg: number
): MacroTargets & { diff: number } {
  const proteinPerKg = goal === "weight_loss" ? 2.0 : goal === "muscle_gain" ? 1.8 : 1.5;
  const fatShare = goal === "weight_loss" ? 0.3 : goal === "muscle_gain" ? 0.27 : 0.28;

  const proteinG = round5(proteinPerKg * weightKg);
  const fatG = round5((targetKcal * fatShare) / 9);
  const remaining = targetKcal - proteinG * 4 - fatG * 9;
  const carbG = Math.max(round5(remaining / 4), 0);

  const diff = proteinG * 4 + carbG * 4 + fatG * 9 - targetKcal;
  return { proteinG, carbG, fatG, diff };
}

/**
 * برآورد کامل انرژی و درشت‌مغذی‌ها.
 * اگر اطلاعات ناقص باشد هیچ عددی تولید نمی‌شود (فقط فهرست کمبودها).
 * اگر کاربر در گروه احتیاط باشد (زیر ۱۸ سال یا باردار/شیرده)، هدف کالری
 * روی «حفظ وزن» قفل می‌شود و هشدار مشورت با متخصص تولید می‌شود.
 */
export function computeNutritionTargets(
  estimate: EstimateInfo | null,
  goal: NutritionGoal,
  activityLevel: ActivityLevelId,
  pregnancyBreastfeeding: boolean
): TargetsResult {
  const missing = missingLabelsOf(estimate);
  if (missing.length > 0 || !estimate) {
    return { status: "insufficient_data", missingLabels: missing };
  }

  const level = activityLevelDef(activityLevel);
  if (!level) {
    return { status: "insufficient_data", missingLabels: ["سطح فعالیت روزانه"] };
  }

  const warnings: string[] = [
    "همه اعداد این بخش «تخمین» بر پایه فرمول‌های عمومی‌اند، نه اندازه‌گیری دقیق نیاز بدن شما.",
  ];

  const underage = estimate.age < 18;
  const caution = underage || pregnancyBreastfeeding;
  const effectiveGoal: NutritionGoal = caution ? "maintain" : goal;

  if (underage) {
    warnings.push(
      "سن کمتر از ۱۸ سال: هدف کاهش وزن یا محدودیت انرژی به‌صورت خودکار تنظیم نمی‌شود؛ برای برنامه اختصاصی حتماً با متخصص تغذیه مشورت کنید."
    );
  }
  if (pregnancyBreastfeeding) {
    warnings.push(
      "در بارداری یا شیردهی نیاز تغذیه‌ای خاص است؛ این ابزار هدف کالری کاهشی/افزایشی برای شما تنظیم نمی‌کند و برنامه فعلی جایگزین نظر متخصص نیست."
    );
  }
  if (estimate.gender === "undisclosed") {
    warnings.push(
      "جنسیت اعلام‌نشده: برای فرمول، میانگین دو فرمول مردان و زنان استفاده شد؛ عدم‌قطعیت برآورد بالاتر است."
    );
  }

  const bmrRaw = estimateBMR(estimate);
  const bmr = round10(bmrRaw);
  const tdee = round10(bmrRaw * level.factor);

  let targetKcal = tdee;
  if (effectiveGoal === "weight_loss") {
    // حد محاسباتی نرم‌افزار: خروجی هرگز از حداکثر BMR×1.1 و 1200 کیلوکالری
    // پایین‌تر نمی‌رود — قاعده محافظه‌کارانه محاسباتی، نه تضمین ایمنی شخصی
    const floor = Math.max(Math.ceil((bmrRaw * 1.1) / 10) * 10, 1200);
    targetKcal = Math.max(round10(tdee - 500), floor);
  } else if (effectiveGoal === "muscle_gain") {
    targetKcal = round10(tdee + 300);
  }

  const macrosWithDiff = computeMacroTargets(effectiveGoal, targetKcal, estimate.weightKg);
  const macros: MacroTargets = {
    proteinG: macrosWithDiff.proteinG,
    carbG: macrosWithDiff.carbG,
    fatG: macrosWithDiff.fatG,
  };

  if (Math.abs(macrosWithDiff.diff) > 30) {
    warnings.push(
      `جمع انرژی درشت‌مغذی‌ها ${macrosWithDiff.diff > 0 ? "بیشتر" : "کمتر"} از هدف کالری است (اختلاف حدود ${Math.abs(macrosWithDiff.diff)} کیلوکالری ناشی از گرد کردن و محدوده‌های استاندارد).`
    );
  }

  return {
    status: "ok",
    snapshot: {
      formula: "Mifflin-St Jeor",
      bmr,
      tdee,
      targetKcal,
      activityFactor: level.factor,
      macros,
      genderUsed: estimate.gender,
      macroKcalDiff: macrosWithDiff.diff,
      warnings,
      caution,
      cautionReason: underage ? "underage" : pregnancyBreastfeeding ? "pregnancy" : null,
    },
  };
}
