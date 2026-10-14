import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { nutritionPatchSchema } from "@/lib/nutrition-engine/schema";
import {
  findFood,
  isFoodCompatible,
  macrosForGrams,
  type AllergenId,
} from "@/lib/foods";
import { recomputeItemFromSnapshot } from "@/lib/nutrition-engine/engine";
import {
  findOwnedNutritionPlan,
  updateOwnedNutritionPlanStatus,
  deleteOwnedNutritionPlan,
  toClientPlan,
} from "@/lib/nutrition-storage";

type SessionPlanRow = NonNullable<
  Awaited<ReturnType<typeof findPlanRowOwned>>
>;

async function findPlanRowOwned(planId: string, userId: string) {
  return db.nutritionPlan.findFirst({
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
}

/**
 * GET /api/nutrition/[id] — جزئیات برنامه؛ «نبودن» و «مالک دیگر» هر دو 404.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await params;
    const plan = await findOwnedNutritionPlan(id, session.user.id);
    if (!plan) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[nutrition:GET:id]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * PATCH /api/nutrition/[id] — چهار عمل مجاز:
 *  - title: تغییر عنوان
 *  - status: فعال‌سازی/بایگانی
 *  - update_item: تغییر مقدار یک ماده + محاسبه مجدد وعده (از snapshot خود ماده)
 *  - replace_item: جایگزینی ماده با ماده سازگار بانک + محاسبه مجدد وعده
 * سازگاری جایگزین با تنظیمات ذخیره‌شده برنامه (آلرژی/الگو/نامطلوب/بودجه)
 * دوباره بررسی می‌شود.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const userId = session.user.id;
    const { id } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = nutritionPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: parsed.error.issues[0]?.message ?? "درخواست نامعتبر است" },
        { status: 400 }
      );
    }
    const patch = parsed.data;

    if (patch.action === "title" || patch.action === "status") {
      const updated = await updateOwnedNutritionPlanStatus(id, userId, {
        ...(patch.action === "title" ? { title: patch.title } : {}),
        ...(patch.action === "status" ? { status: patch.status } : {}),
      });
      if (!updated) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ plan: updated });
    }

    /* --------------------- تغییر مقدار یا جایگزینی ماده --------------------- */

    const row = await findPlanRowOwned(id, userId);
    if (!row) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const day = row.days.find((d) => d.order === patch.dayOrder);
    const meal = day?.meals.find((m) => m.order === patch.mealOrder);
    const item = meal?.items.find((i) => i.order === patch.itemOrder);
    if (!day || !meal || !item) {
      return NextResponse.json(
        { error: "ITEM_NOT_FOUND", message: "روز، وعده یا ماده مورد نظر در این برنامه یافت نشد." },
        { status: 422 }
      );
    }

    if (patch.action === "update_item") {
      // مقادیر هر ۱۰۰ گرم از snapshot خود رکورد — تغییر بانک، برنامه ذخیره‌شده را تغییر نمی‌دهد
      const newValues = recomputeItemFromSnapshot(
        { grams: item.grams, kcal: item.kcal, protein: item.protein, carb: item.carb, fat: item.fat },
        patch.grams
      );

      const updated = await db.$transaction(async (tx) => {
        await tx.nutritionMealItem.update({
          where: { id: item.id },
          data: newValues,
        });
        const items = await tx.nutritionMealItem.findMany({ where: { mealId: meal.id } });
        const totals = {
          kcal: items.reduce((sum, i) => sum + (i.id === item.id ? newValues.kcal : i.kcal), 0),
          protein: round1(items.reduce((sum, i) => sum + (i.id === item.id ? newValues.protein : i.protein), 0)),
          carb: round1(items.reduce((sum, i) => sum + (i.id === item.id ? newValues.carb : i.carb), 0)),
          fat: round1(items.reduce((sum, i) => sum + (i.id === item.id ? newValues.fat : i.fat), 0)),
        };
        await tx.nutritionMeal.update({ where: { id: meal.id }, data: totals });
        return tx.nutritionPlan.findUniqueOrThrow({
          where: { id: row.id },
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

      return NextResponse.json({ plan: toClientPlan(updated) });
    }

    /* ------------------------------ replace_item ------------------------------ */

    const newFood = findFood(patch.newFoodId);
    if (!newFood) {
      return NextResponse.json(
        { error: "FOOD_NOT_FOUND", message: "ماده جایگزین در بانک مواد غذایی یافت نشد." },
        { status: 422 }
      );
    }

    // سازگاری با تنظیمات ذخیره‌شده برنامه — همان قواعد مسیر تولید
    const compatible = isFoodCompatible(newFood, {
      allergens: parseJsonArraySafe(row.allergensJson) as AllergenId[],
      dietPattern: toDietTag(row.dietPattern),
      dislikedFoodIds: parseJsonArraySafe(row.dislikedFoodIdsJson),
      budget: row.budget === "low" ? "low" : "any",
      prep: "any",
    });
    if (!compatible) {
      return NextResponse.json(
        {
          error: "INCOMPATIBLE_FOOD",
          message: `«${newFood.fa}» با محدودیت‌های این برنامه (آلرژی، الگوی غذایی یا مواد نامطلوب) سازگار نیست.`,
        },
        { status: 422 }
      );
    }

    // گرم پیشنهادی برای نزدیک شدن انرژی به ماده قبلی (گرد به ۵) با سقف منطقی
    const grams = Math.min(
      Math.max(Math.round(((item.kcal / newFood.kcal100) * 100) / 5) * 5, 10),
      newFood.maxGrams ?? 600
    );
    const macros = macrosForGrams(newFood, grams);

    const updated = await db.$transaction(async (tx) => {
      await tx.nutritionMealItem.update({
        where: { id: item.id },
        data: {
          foodId: newFood.id,
          faName: newFood.fa,
          enName: newFood.en,
          group: newFood.group,
          grams,
          kcal: macros.kcal,
          protein: macros.protein,
          carb: macros.carb,
          fat: macros.fat,
          servingHint: newFood.servingLabel,
        },
      });
      const items = await tx.nutritionMealItem.findMany({ where: { mealId: meal.id } });
      const totals = {
        kcal: items.reduce((sum, i) => sum + (i.id === item.id ? macros.kcal : i.kcal), 0),
        protein: round1(items.reduce((sum, i) => sum + (i.id === item.id ? macros.protein : i.protein), 0)),
        carb: round1(items.reduce((sum, i) => sum + (i.id === item.id ? macros.carb : i.carb), 0)),
        fat: round1(items.reduce((sum, i) => sum + (i.id === item.id ? macros.fat : i.fat), 0)),
      };
      await tx.nutritionMeal.update({ where: { id: meal.id }, data: totals });
      return tx.nutritionPlan.findUniqueOrThrow({
        where: { id: row.id },
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

    return NextResponse.json({ plan: toClientPlan(updated) });
  } catch (error) {
    console.error("[nutrition:PATCH]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * DELETE /api/nutrition/[id] — حذف برنامه؛ فقط مالک.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await params;
    const deleted = await deleteOwnedNutritionPlan(id, session.user.id);
    if (!deleted) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[nutrition:DELETE]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/* --------------------------------- helpers --------------------------------- */

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function parseJsonArraySafe(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function toDietTag(pattern: string): "none" | "vegetarian" | "vegan" {
  return pattern === "vegan" ? "vegan" : pattern === "vegetarian" ? "vegetarian" : "none";
}

// نوع استفاده‌شده برای تایپ ایمن خروجی findPlanRowOwned
export type { SessionPlanRow };
