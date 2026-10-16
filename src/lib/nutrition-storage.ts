/**
 * لایه سمت سرورِ ذخیره‌سازی برنامه غذایی — تنها نقطه تماس Prisma با مدل‌های
 * تغذیه (همان الگوی plan-storage مرحله ۶). همه توابع userId را به‌عنوان
 * پارامتر اجباری می‌گیرند و هیچ مسیری برای اعتماد به شناسه ارسالی از
 * مرورگر وجود ندارد. پاسخ «نبودن» و «مالک دیگر» هر دو null است تا API
 * برای هر دو 404 برگرداند.
 *
 * نکته SQLite: فهرست‌ها JSON رشته‌ای ذخیره می‌شوند و اینجا marshal می‌شوند.
 */

import { db } from "@/lib/db";
import type {
  NutritionPlan,
  NutritionPlanDay,
  NutritionMeal,
  NutritionMealItem,
} from "@prisma/client";
import { FOODS_VERSION } from "@/lib/foods";
import {
  NUTRITION_ENGINE_VERSION,
  type CalcSnapshot,
  type DietPattern,
  type EstimateInfo,
  type GeneratedNutritionPlan,
  type NutritionGoal,
  type NutritionSettings,
  type PlannedMeal,
  type ShoppingListItem,
} from "@/lib/nutrition-engine/types";
import { aggregateShoppingList } from "@/lib/nutrition-engine/engine";

/* ------------------------------ تایپ کلاینت ------------------------------ */

export interface NutritionMealItemClient {
  id: string;
  order: number;
  foodId: string;
  faName: string;
  enName: string;
  group: string;
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  servingHint: string;
}

export interface NutritionMealClient extends Omit<PlannedMeal, "items"> {
  id: string;
  items: NutritionMealItemClient[];
}

export interface NutritionPlanDayClient {
  id: string;
  order: number;
  meals: NutritionMealClient[];
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

export interface NutritionPlanClient {
  id: string;
  userId: string;
  title: string;
  goal: NutritionGoal;
  activityLevel: string;
  dietPattern: DietPattern;
  mealsPerDay: number;
  planLength: number;
  allergens: string[];
  dislikedFoodIds: string[];
  budget: "any" | "low";
  prep: "any" | "simple";
  estimate: EstimateInfo | null;
  calc: CalcSnapshot;
  caution: boolean;
  notes: string[];
  status: "active" | "archived";
  engineVersion: string;
  foodsVersion: string;
  /** زبان تولید محتوای برنامه — رکوردهای قدیمی «fa» */
  contentLocale: string;
  createdAt: string;
  updatedAt: string;
  days: NutritionPlanDayClient[];
}

/** نسخه خلاصه برای فهرست برنامه‌ها — بدون روزها */
export interface NutritionPlanSummaryClient {
  id: string;
  title: string;
  goal: string;
  dietPattern: string;
  mealsPerDay: number;
  planLength: number;
  targetKcal: number | null;
  status: "active" | "archived";
  caution: boolean;
  /** زبان تولید محتوا — رکوردهای قدیمی «fa» */
  contentLocale: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ JSON helpers ------------------------------ */

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function parseJsonObject<T>(value: string, fallback: T): T {
  try {
    const parsed: unknown = JSON.parse(value);
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function marshalStatus(status: string): "active" | "archived" {
  return status === "archived" ? "archived" : "active";
}

/* ------------------------------- تبدیل ردیف ------------------------------- */

type PlanRowWithDays = NutritionPlan & {
  days: (NutritionPlanDay & {
    meals: (NutritionMeal & { items: NutritionMealItem[] })[];
  })[];
};

export function toClientPlan(plan: PlanRowWithDays): NutritionPlanClient {
  return {
    id: plan.id,
    userId: plan.userId,
    title: plan.title,
    goal: plan.goal as NutritionGoal,
    activityLevel: plan.activityLevel,
    dietPattern: plan.dietPattern as DietPattern,
    mealsPerDay: plan.mealsPerDay,
    planLength: plan.planLength,
    allergens: parseJsonArray(plan.allergensJson),
    dislikedFoodIds: parseJsonArray(plan.dislikedFoodIdsJson),
    budget: plan.budget === "low" ? "low" : "any",
    prep: plan.prep === "simple" ? "simple" : "any",
    estimate: parseJsonObject<EstimateInfo | null>(plan.estimateJson, null),
    calc: parseJsonObject<CalcSnapshot>(plan.calcJson, {
      formula: "Mifflin-St Jeor",
      bmr: null,
      tdee: null,
      targetKcal: null,
      activityFactor: 1.2,
      macros: null,
      genderUsed: "undisclosed",
      macroKcalDiff: null,
      warnings: [],
      caution: plan.caution,
      cautionReason: null,
    }),
    caution: plan.caution,
    notes: parseJsonArray(plan.notesJson ?? "[]"),
    status: marshalStatus(plan.status),
    engineVersion: plan.engineVersion,
    foodsVersion: plan.foodsVersion,
    contentLocale: plan.contentLocale === "en" ? "en" : "fa",
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    days: plan.days
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((day) => {
        const meals = day.meals
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((meal) => ({
            id: meal.id,
            order: meal.order,
            type: meal.type as PlannedMeal["type"],
            title: meal.title,
            items: meal.items
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((item) => ({
                id: item.id,
                order: item.order,
                foodId: item.foodId,
                faName: item.faName,
                enName: item.enName,
                group: item.group,
                grams: item.grams,
                kcal: item.kcal,
                protein: item.protein,
                carb: item.carb,
                fat: item.fat,
                servingHint: item.servingHint,
              })),
            kcal: meal.kcal,
            protein: meal.protein,
            carb: meal.carb,
            fat: meal.fat,
          }));
        return {
          id: day.id,
          order: day.order,
          meals,
          kcal: meals.reduce((sum, meal) => sum + meal.kcal, 0),
          protein:
            Math.round(meals.reduce((sum, meal) => sum + meal.protein, 0) * 10) / 10,
          carb: Math.round(meals.reduce((sum, meal) => sum + meal.carb, 0) * 10) / 10,
          fat: Math.round(meals.reduce((sum, meal) => sum + meal.fat, 0) * 10) / 10,
        };
      }),
  };
}

/* ------------------------------ تنظیمات → JSON ------------------------------ */

export function marshalPlanColumns(settings: NutritionSettings): {
  goal: string;
  activityLevel: string;
  dietPattern: string;
  mealsPerDay: number;
  planLength: number;
  allergensJson: string;
  dislikedFoodIdsJson: string;
  budget: string;
  prep: string;
  estimateJson: string;
} {
  return {
    goal: settings.goal,
    activityLevel: settings.activityLevel,
    dietPattern: settings.dietPattern,
    mealsPerDay: settings.mealsPerDay,
    planLength: settings.planLength,
    allergensJson: JSON.stringify(settings.allergens),
    dislikedFoodIdsJson: JSON.stringify(settings.dislikedFoodIds),
    budget: settings.budget,
    prep: settings.prep,
    estimateJson: JSON.stringify(settings.estimate),
  };
}

/** یادداشت‌های عمومی برنامه (notesJson) از خروجی موتور */
export function marshalNotes(plan: GeneratedNutritionPlan): string {
  return JSON.stringify(plan.notes);
}

/* -------------------------------- خواندن -------------------------------- */

/** فهرست برنامه‌های غذایی کاربر (خلاصه) — تازه‌ترین اول */
export async function listUserNutritionPlans(
  userId: string
): Promise<NutritionPlanSummaryClient[]> {
  const plans = await db.nutritionPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return plans.map((plan) => {
    const calc = parseJsonObject<CalcSnapshot>(plan.calcJson, {
      formula: "Mifflin-St Jeor",
      bmr: null,
      tdee: null,
      targetKcal: null,
      activityFactor: 1.2,
      macros: null,
      genderUsed: "undisclosed",
      macroKcalDiff: null,
      warnings: [],
      caution: plan.caution,
      cautionReason: null,
    });
    return {
      id: plan.id,
      title: plan.title,
      goal: plan.goal,
      dietPattern: plan.dietPattern,
      mealsPerDay: plan.mealsPerDay,
      planLength: plan.planLength,
      targetKcal: calc.targetKcal,
      status: marshalStatus(plan.status),
      caution: plan.caution,
      contentLocale: plan.contentLocale === "en" ? "en" : "fa",
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString(),
    } satisfies NutritionPlanSummaryClient;
  });
}

/**
 * جزئیات برنامه غذایی — فقط اگر متعلق به userId باشد؛ در غیر این صورت null.
 * پاسخ API برای «نبودن» و «مالک دیگر» یکسان است (404).
 */
export async function findOwnedNutritionPlan(
  planId: string,
  userId: string
): Promise<NutritionPlanClient | null> {
  const plan = await db.nutritionPlan.findFirst({
    where: { id: planId, userId },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: {
          meals: {
            orderBy: { order: "asc" },
            include: { items: { orderBy: { order: "asc" } } },
          },
        },
      },
    },
  });
  return plan ? toClientPlan(plan) : null;
}

/* -------------------------------- نوشتن -------------------------------- */

/**
 * ذخیره برنامه تولیدشده موتور — در یک تراکنش؛ فعال‌سازی برنامه جدید،
 * بقیه برنامه‌های فعال همان کاربر را بایگانی می‌کند (حداکثر یک برنامه فعال).
 */
export async function saveGeneratedNutritionPlan(
  userId: string,
  settings: NutritionSettings,
  plan: GeneratedNutritionPlan,
  contentLocale: "fa" | "en" = "fa"
): Promise<NutritionPlanClient> {
  const saved = await db.$transaction(async (tx) => {
    await tx.nutritionPlan.updateMany({
      where: { userId, status: "active" },
      data: { status: "archived" },
    });

    return tx.nutritionPlan.create({
      data: {
        userId,
        title: plan.title,
        ...marshalPlanColumns(settings),
        calcJson: JSON.stringify(plan.calc),
        notesJson: marshalNotes(plan),
        caution: plan.calc.caution,
        status: "active",
        engineVersion: NUTRITION_ENGINE_VERSION,
        foodsVersion: FOODS_VERSION,
        contentLocale,
        days: {
          create: plan.days.map((day) => ({
            order: day.order,
            meals: {
              create: day.meals.map((meal) => ({
                order: meal.order,
                type: meal.type,
                title: meal.title,
                kcal: meal.kcal,
                protein: meal.protein,
                carb: meal.carb,
                fat: meal.fat,
                items: {
                  create: meal.items.map((item, index) => ({
                    order: index + 1,
                    foodId: item.foodId,
                    faName: item.faName,
                    enName: item.enName,
                    group: item.group,
                    grams: item.grams,
                    kcal: item.kcal,
                    protein: item.protein,
                    carb: item.carb,
                    fat: item.fat,
                    servingHint: item.servingHint,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: {
            meals: {
              orderBy: { order: "asc" },
              include: { items: { orderBy: { order: "asc" } } },
            },
          },
        },
      },
    });
  });
  return toClientPlan(saved);
}

/** تغییر فیلدهای مجاز — عنوان و وضعیت. فعال‌سازی بقیه را بایگانی می‌کند. */
export async function updateOwnedNutritionPlanStatus(
  planId: string,
  userId: string,
  data: { title?: string; status?: "active" | "archived" }
): Promise<NutritionPlanClient | null> {
  const existing = await db.nutritionPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });
  if (!existing) return null;

  const updated = await db.$transaction(async (tx) => {
    if (data.status === "active") {
      await tx.nutritionPlan.updateMany({
        where: { userId, status: "active", id: { not: planId } },
        data: { status: "archived" },
      });
    }
    return tx.nutritionPlan.update({
      where: { id: planId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: {
        days: {
          orderBy: { order: "asc" },
          include: {
            meals: {
              orderBy: { order: "asc" },
              include: { items: { orderBy: { order: "asc" } } },
            },
          },
        },
      },
    });
  });
  return toClientPlan(updated);
}

/** حذف برنامه — فقط مالک؛ true یعنی حذف شد، false یعنی یافت نشد */
export async function deleteOwnedNutritionPlan(
  planId: string,
  userId: string
): Promise<boolean> {
  const existing = await db.nutritionPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await db.nutritionPlan.delete({ where: { id: existing.id } });
  return true;
}

/* ------------------------------ فهرست خرید ------------------------------ */

/**
 * فهرست خرید از روزهای انتخابی برنامه — مالکیت پیش‌تر بررسی شده و
 * تجمیع از snapshot خود رکوردها انجام می‌شود (بدون خواندن بانک زنده).
 */
export function buildShoppingList(
  plan: NutritionPlanClient,
  dayOrders: number[]
): ShoppingListItem[] {
  const days = plan.days.filter((day) => dayOrders.includes(day.order));
  return aggregateShoppingList(days);
}
