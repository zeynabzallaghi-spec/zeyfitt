/**
 * لایه سمت سرورِ ثبت مصرف واقعی غذا — تنها نقطه تماس Prisma با FoodLogEntry
 * (همان الگوی nutrition-storage و workout-session). همه توابع userId را
 * به‌عنوان پارامتر اجباری می‌گیرند و هیچ مسیری برای اعتماد به شناسه ارسالی
 * از مرورگر وجود ندارد. پاسخ «نبودن» و «مالک دیگر» هر دو null است تا API
 * برای هر دو 404 یکسان برگرداند.
 *
 * اصول:
 *  - مقادیر تغذیه‌ای فقط از داده معتبر بانک یا snapshot معتبر قلم برنامه،
 *    سمت سرور محاسبه می‌شوند.
 *  - ویرایش، مقادیر جدید را از snapshot خودِ رکورد (نه بانک زنده) بازمحاسبه
 *    می‌کند تا تاریخچه با تغییر آینده بانک جابه‌جا نشود.
 *  - ارجاع‌های برنامه اختیاری‌اند و حذف برنامه آن‌ها را null می‌کند
 *    (SetNull در اسکیما) — تاریخچه حذف یا بازنویسی نمی‌شود.
 *  - clientRequestId ایدمپوتنسی: ارسال مجدد همان درخواست، همان ثبت را
 *    برمی‌گرداند، نه رکورد تکراری.
 */

import { db } from "@/lib/db";
import type { FoodLogEntry } from "@prisma/client";
import { findFood } from "@/lib/foods";
import { FOOD_LOG_LIMITS, resolveAmountToGrams, computeLogNutrition, instantMatchesLocalDay, lastNDays, FoodLogCalcError } from "./calc";
import type {
  FoodLogEntryClient,
  FoodLogMealType,
  FoodLogSource,
  FoodLogUnit,
  FoodLogDayTotals,
  FoodLogPlanComparison,
  FoodLogTrendPoint,
} from "./types";
import type { CreateFoodLogInput, UpdateFoodLogInput } from "./schema";

/* ------------------------------ تبدیل ردیف ------------------------------ */

type LogRow = FoodLogEntry;

export function toClientLog(row: LogRow): FoodLogEntryClient {
  return {
    id: row.id,
    consumedAt: row.consumedAt.toISOString(),
    localDay: row.localDay,
    mealType: row.mealType as FoodLogMealType,
    source: row.source as FoodLogSource,
    foodId: row.foodId,
    faName: row.faName,
    enName: row.enName,
    group: row.group,
    unit: row.unit as FoodLogUnit,
    amount: row.amount,
    servingGramsUsed: row.servingGramsUsed,
    grams: row.grams,
    kcal: row.kcal,
    protein: row.protein,
    carb: row.carb,
    fat: row.fat,
    planId: row.planId,
    planMealId: row.planMealId,
    planItemId: row.planItemId,
    planItemGrams: row.planItemGrams,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/* ------------------------------- خطای دامنه ------------------------------- */

/** خطای ثبت غذا با کد قابل‌ترجمه — پیام نمایشی در i18n ساخته می‌شود */
export class FoodLogDomainError extends Error {
  constructor(public readonly code:
    | "FOOD_NOT_FOUND"
    | "PLAN_ITEM_NOT_FOUND"
    | "INVALID_AMOUNT"
    | "GRAMS_OUT_OF_RANGE"
    | "SERVINGS_OUT_OF_RANGE"
    | "SERVING_UNIT_UNSUPPORTED"
    | "DAY_INSTANT_MISMATCH"
    | "DAILY_LIMIT_REACHED") {
    super(code);
    this.name = "FoodLogDomainError";
  }
}

/* ------------------------------ مقادیر پایه ------------------------------ */

interface FoodBasis {
  foodId: string;
  faName: string;
  enName: string;
  group: string;
  per100: { kcal100: number; protein100: number; carb100: number; fat100: number };
  servingGrams: number | null;
  planRefs: {
    planId: string | null;
    planMealId: string | null;
    planItemId: string | null;
    planItemGrams: number | null;
  };
}

/**
 * مبنای محاسبه برای دو منبع ثبت:
 *  - بانک: مقادیر ۱۰۰ گرمی زنده بانک (بانک عمومی و نسخه‌بندی‌شده است)
 *  - قلم برنامه: مقادیر ۱۰۰ گرمی از snapshot خود قلم — بازمحاسبه از
 *    snapshot باعث می‌شود تغییر آینده بانک، تاریخچه ثبت‌های قبلی را تغییر ندهد
 */
async function resolveFoodBasis(
  userId: string,
  input: { source: FoodLogSource; foodId?: string; planItemId?: string }
): Promise<FoodBasis> {
  if (input.source === "bank") {
    const food = findFood(input.foodId ?? "");
    if (!food) throw new FoodLogDomainError("FOOD_NOT_FOUND");
    return {
      foodId: food.id,
      faName: food.fa,
      enName: food.en,
      group: food.group,
      per100: {
        kcal100: food.kcal100,
        protein100: food.protein100,
        carb100: food.carb100,
        fat100: food.fat100,
      },
      servingGrams: food.servingGrams,
      planRefs: { planId: null, planMealId: null, planItemId: null, planItemGrams: null },
    };
  }

  // source === "plan_item" — قلم باید متعلق به برنامه خود کاربر باشد
  const item = await db.nutritionMealItem.findFirst({
    where: { id: input.planItemId ?? "" },
    include: {
      meal: {
        include: {
          day: {
            include: { plan: { select: { id: true, userId: true } } },
          },
        },
      },
    },
  });
  if (!item || item.meal.day.plan.userId !== userId) {
    throw new FoodLogDomainError("PLAN_ITEM_NOT_FOUND");
  }
  // ضریب سهم از بانک با شناسه پایدار — اگر بانک نداشت، سهم پشتیبانی نمی‌شود
  const bankFood = findFood(item.foodId);
  const grams100Base = item.grams > 0 ? item.grams : null;
  if (grams100Base === null) throw new FoodLogDomainError("PLAN_ITEM_NOT_FOUND");
  return {
    foodId: item.foodId,
    faName: item.faName,
    enName: item.enName,
    group: item.group,
    per100: {
      kcal100: (item.kcal / item.grams) * 100,
      protein100: (item.protein / item.grams) * 100,
      carb100: (item.carb / item.grams) * 100,
      fat100: (item.fat / item.grams) * 100,
    },
    servingGrams: bankFood?.servingGrams ?? null,
    planRefs: {
      planId: item.meal.day.plan.id,
      planMealId: item.meal.id,
      planItemId: item.id,
      planItemGrams: item.grams,
    },
  };
}

/* -------------------------------- نوشتن -------------------------------- */

export interface CreateFoodLogResult {
  log: FoodLogEntryClient;
  /** true یعنی این پاسخ از تکراریِ یک درخواست قبلی آمده (idempotent replay) */
  replayed: boolean;
}

/**
 * ساخت ثبت واقعی — فقط با اقدام صریح کاربر. تکرار همان clientRequestId
 * همان ثبت قبلی را برمی‌گرداند (بدون رکورد دوم).
 */
export async function createFoodLog(
  userId: string,
  input: CreateFoodLogInput
): Promise<CreateFoodLogResult> {
  // ایدمپوتنسی — پیش از هر محاسبه‌ای
  if (input.clientRequestId) {
    const existing = await db.foodLogEntry.findFirst({
      where: { userId, clientRequestId: input.clientRequestId },
    });
    if (existing) return { log: toClientLog(existing), replayed: true };
  }

  // سقف ثبت روزانه — ضد سوءاستفاده عملیاتی
  const dayCount = await db.foodLogEntry.count({ where: { userId, localDay: input.localDay } });
  if (dayCount >= FOOD_LOG_LIMITS.maxLogsPerDay) {
    throw new FoodLogDomainError("DAILY_LIMIT_REACHED");
  }

  // روز محلی باید با لحظه مصرف سازگار باشد (مرز ۲۶ ساعت) — جابه‌جایی
  // ناخواسته روز به‌ازای اختلاف منطقه زمانی رد می‌شود
  const timeMs = Date.parse(input.consumedAt);
  if (!instantMatchesLocalDay(timeMs, input.localDay)) {
    throw new FoodLogDomainError("DAY_INSTANT_MISMATCH");
  }

  const basis = await resolveFoodBasis(userId, input);

  // ضریب سهم: برای ثبت از قلم برنامه هم همان بانک با شناسه پایدار ملاک است
  let servingGrams = basis.servingGrams;
  if (input.unit === "serving" && servingGrams === null) {
    throw new FoodLogDomainError("SERVING_UNIT_UNSUPPORTED");
  }

  let grams: number;
  let servingGramsUsed: number | null;
  try {
    const resolved = resolveAmountToGrams(input.unit, input.amount, servingGrams);
    grams = resolved.grams;
    servingGramsUsed = resolved.servingGramsUsed;
  } catch (error) {
    if (error instanceof FoodLogCalcError) {
      throw new FoodLogDomainError(
        error.code === "SERVING_UNIT_UNSUPPORTED"
          ? "SERVING_UNIT_UNSUPPORTED"
          : error.code === "SERVINGS_OUT_OF_RANGE"
            ? "SERVINGS_OUT_OF_RANGE"
            : "INVALID_AMOUNT"
      );
    }
    throw error;
  }

  const nutrition = computeLogNutrition(basis.per100, grams);

  const row = await db.foodLogEntry.create({
    data: {
      userId,
      consumedAt: new Date(timeMs),
      localDay: input.localDay,
      mealType: input.mealType,
      source: input.source,
      foodId: basis.foodId,
      faName: basis.faName,
      enName: basis.enName,
      group: basis.group,
      unit: input.unit,
      amount: input.amount,
      servingGramsUsed,
      grams,
      kcal: nutrition.kcal,
      protein: nutrition.protein,
      carb: nutrition.carb,
      fat: nutrition.fat,
      planId: basis.planRefs.planId,
      planMealId: basis.planRefs.planMealId,
      planItemId: basis.planRefs.planItemId,
      planItemGrams: basis.planRefs.planItemGrams,
      clientRequestId: input.clientRequestId ?? null,
    },
  });
  return { log: toClientLog(row), replayed: false };
}

/** یافتن ثبت متعلق به کاربر — «نبودن» و «مالک دیگر» هر دو null (404 یکسان) */
export async function findOwnedFoodLog(
  logId: string,
  userId: string
): Promise<FoodLogEntry | null> {
  return db.foodLogEntry.findFirst({ where: { id: logId, userId } });
}

/**
 * ویرایش ثبت — بازمحاسبه فقط از snapshot خود رکورد؛ بانک زنده هرگز مبنای
 * تغییر مقادیر تاریخی نیست (ضریب سهمِ تازه فقط هنگام تغییر واحد به «سهم»
 * و تنها اگر رکورد ضریب ذخیره‌شده نداشته باشد، از بانک خوانده می‌شود).
 */
export async function updateFoodLog(
  userId: string,
  logId: string,
  input: UpdateFoodLogInput
): Promise<FoodLogEntryClient | null> {
  const entry = await findOwnedFoodLog(logId, userId);
  if (!entry) return null;

  const patch: Partial<{
    mealType: string;
    consumedAt: Date;
    localDay: string;
    unit: string;
    amount: number;
    servingGramsUsed: number | null;
    grams: number;
    kcal: number;
    protein: number;
    carb: number;
    fat: number;
  }> = {};

  if (input.mealType !== undefined) patch.mealType = input.mealType;

  // زمان و روز — همیشه جفت؛ سازگاری روز/لحظه مثل ساخت
  if (input.consumedAt !== undefined && input.localDay !== undefined) {
    const timeMs = Date.parse(input.consumedAt);
    if (!instantMatchesLocalDay(timeMs, input.localDay)) {
      throw new FoodLogDomainError("DAY_INSTANT_MISMATCH");
    }
    patch.consumedAt = new Date(timeMs);
    patch.localDay = input.localDay;
  }

  if (input.unit !== undefined || input.amount !== undefined) {
    const unit = (input.unit ?? entry.unit) as FoodLogUnit;
    const amount = input.amount ?? entry.amount;
    let servingGrams = entry.servingGramsUsed;
    if (unit === "serving" && servingGrams === null) {
      // تغییر واحد به سهم برای رکوردی که ضریب ذخیره‌شده ندارد — فقط از بانک
      const bankFood = findFood(entry.foodId);
      servingGrams = bankFood?.servingGrams ?? null;
      if (servingGrams === null) {
        throw new FoodLogDomainError("SERVING_UNIT_UNSUPPORTED");
      }
    }
    let resolved;
    try {
      resolved = resolveAmountToGrams(unit, amount, servingGrams);
    } catch (error) {
      if (error instanceof FoodLogCalcError) {
        throw new FoodLogDomainError(
          error.code === "SERVINGS_OUT_OF_RANGE" ? "SERVINGS_OUT_OF_RANGE" : "INVALID_AMOUNT"
        );
      }
      throw error;
    }
    patch.unit = unit;
    patch.amount = amount;
    patch.servingGramsUsed = resolved.servingGramsUsed;
    patch.grams = resolved.grams;

    // بازمحاسبه مقادیر از snapshot خود رکورد — نسبت ۱۰۰ گرمی ثابت می‌ماند
    const per100 = {
      kcal100: (entry.kcal / entry.grams) * 100,
      protein100: (entry.protein / entry.grams) * 100,
      carb100: (entry.carb / entry.grams) * 100,
      fat100: (entry.fat / entry.grams) * 100,
    };
    const nutrition = computeLogNutrition(per100, resolved.grams);
    patch.kcal = nutrition.kcal;
    patch.protein = nutrition.protein;
    patch.carb = nutrition.carb;
    patch.fat = nutrition.fat;
  }

  const updated = await db.foodLogEntry.update({ where: { id: entry.id }, data: patch });
  return toClientLog(updated);
}

/** حذف ثبت — فقط مالک؛ true یعنی حذف شد، false یعنی یافت نشد */
export async function deleteFoodLog(userId: string, logId: string): Promise<boolean> {
  const entry = await findOwnedFoodLog(logId, userId);
  if (!entry) return false;
  await db.foodLogEntry.delete({ where: { id: entry.id } });
  return true;
}

/* -------------------------------- خواندن -------------------------------- */

/** ثبت‌های یک روز — تازه‌ترین اول */
export async function listDayFoodLogs(
  userId: string,
  localDay: string
): Promise<FoodLogEntry[]> {
  return db.foodLogEntry.findMany({
    where: { userId, localDay },
    orderBy: [{ consumedAt: "desc" }, { createdAt: "desc" }],
  });
}

/** جمع روز از ثبت‌های خام — گرد کردن فقط در نمایش (بدون انباشت خطا) */
export function dayTotalsOf(localDay: string, rows: FoodLogEntry[]): FoodLogDayTotals {
  let kcal = 0;
  let protein = 0;
  let carb = 0;
  let fat = 0;
  for (const row of rows) {
    kcal += row.kcal;
    protein += row.protein;
    carb += row.carb;
    fat += row.fat;
  }
  return {
    localDay,
    count: rows.length,
    hasLogs: rows.length > 0,
    kcal,
    protein: Math.round(protein * 10) / 10,
    carb: Math.round(carb * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };
}

/**
 * روند ۷ روزه — روز بدون ثبت hasLogs=false و kcal=null دارد؛ با روزِ
 * «مصرف صفر» یکی گرفته نمی‌شود. فقط از ثبت‌های واقعی پایگاه داده.
 */
export async function buildTrend(
  userId: string,
  localDay: string,
  days = 7
): Promise<FoodLogTrendPoint[]> {
  const dayKeys = lastNDays(localDay, days);
  const rows = await db.foodLogEntry.findMany({
    where: { userId, localDay: { in: dayKeys } },
    select: { localDay: true, kcal: true, protein: true },
  });
  const byDay = new Map<string, { kcal: number; protein: number; count: number }>();
  for (const row of rows) {
    const bucket = byDay.get(row.localDay) ?? { kcal: 0, protein: 0, count: 0 };
    bucket.kcal += row.kcal;
    bucket.protein += row.protein;
    bucket.count += 1;
    byDay.set(row.localDay, bucket);
  }
  return dayKeys.map((day) => {
    const bucket = byDay.get(day);
    if (!bucket) {
      return { localDay: day, count: 0, hasLogs: false, kcal: null, protein: null };
    }
    return {
      localDay: day,
      count: bucket.count,
      hasLogs: true,
      kcal: bucket.kcal,
      protein: Math.round(bucket.protein * 10) / 10,
    };
  });
}

/**
 * مقایسه با برنامه فعال — ارتباط قلم‌ها فقط با شناسه معتبر (planItemId
 * ثبت‌های همان روز). برنامه بدون هدف کالری (حالت احتیاط) مقایسه انرژی
 * ندارد ولی قلم‌هایش همچنان وضعیت ثبت می‌گیرند. نبود برنامه = available:false
 * و هیچ مقداری صفرِ ساختگی نمی‌شود.
 */
export async function buildPlanComparison(
  userId: string,
  localDay: string,
  rows: FoodLogEntry[]
): Promise<FoodLogPlanComparison> {
  const comparison: FoodLogPlanComparison = {
    available: false,
    planId: null,
    planTitle: null,
    targetKcal: null,
    targetProtein: null,
    targetCarb: null,
    targetFat: null,
    items: [],
  };

  const activePlan = await db.nutritionPlan.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    include: {
      days: {
        orderBy: { order: "asc" },
        take: 1,
        include: {
          meals: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
        },
      },
    },
  });
  if (!activePlan) return comparison;

  // هدف‌ها فقط از snapshot محاسبات خود برنامه — بدون محاسبه مجدد و بدون حدس
  let targetKcal: number | null = null;
  let targetProtein: number | null = null;
  let targetCarb: number | null = null;
  let targetFat: number | null = null;
  try {
    const calc = JSON.parse(activePlan.calcJson) as {
      targetKcal?: number | null;
      macros?: { proteinG?: number | null; carbG?: number | null; fatG?: number | null } | null;
    };
    if (typeof calc.targetKcal === "number" && Number.isFinite(calc.targetKcal)) {
      targetKcal = calc.targetKcal;
    }
    if (calc.macros) {
      if (typeof calc.macros.proteinG === "number" && Number.isFinite(calc.macros.proteinG)) {
        targetProtein = calc.macros.proteinG;
      }
      if (typeof calc.macros.carbG === "number" && Number.isFinite(calc.macros.carbG)) {
        targetCarb = calc.macros.carbG;
      }
      if (typeof calc.macros.fatG === "number" && Number.isFinite(calc.macros.fatG)) {
        targetFat = calc.macros.fatG;
      }
    }
  } catch {
    // snapshot خراب — بدون هدف نمایش داده می‌شود، هیچ عددی ساختگی نمی‌شود
  }

  // قلم‌های روز ۱ برنامه (برای برنامه یک‌روزه همان تک‌روز) + وضعیت ثبت همان روز
  const firstDay = activePlan.days[0];
  const loggedByItem = new Map<string, number>();
  for (const row of rows) {
    if (row.planItemId === null) continue;
    loggedByItem.set(row.planItemId, (loggedByItem.get(row.planItemId) ?? 0) + row.grams);
  }

  comparison.available = true;
  comparison.planId = activePlan.id;
  comparison.planTitle = activePlan.title;
  comparison.targetKcal = targetKcal;
  comparison.targetProtein = targetProtein;
  comparison.targetCarb = targetCarb;
  comparison.targetFat = targetFat;
  comparison.items = firstDay
    ? firstDay.meals.flatMap((meal) =>
        meal.items.map((item) => {
          const loggedGrams = loggedByItem.get(item.id) ?? 0;
          return {
            planItemId: item.id,
            planMealId: meal.id,
            faName: item.faName,
            enName: item.enName,
            plannedGrams: item.grams,
            loggedGrams: Math.round(loggedGrams * 10) / 10,
            logged: loggedByItem.has(item.id),
          };
        })
      )
    : [];
  return comparison;
}
