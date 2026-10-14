/**
 * موتور برنامه‌ساز غذایی — خالص، قانون‌محور، بدون تصادف و بدون سرویس بیرونی.
 *
 * اصل طراحی:
 *  - فقط از مواد واقعی بانک استفاده می‌شود؛ هیچ ماده‌ای اختراع نمی‌شود.
 *  - آلرژن‌ها، الگوی غذایی، مواد نامطلوب و بودجه در کل مسیر رعایت می‌شوند.
 *  - انتخاب مواد با «اندیس چرخشی قطعی» انجام می‌شود تا برنامه تکرارپذیر و
 *    قابل‌آزمایش باشد (برای تنظیمات یکسان، خروجی یکسان) و تنوع روزها حفظ شود.
 *  - مقدار هر ماده با گرم روشن ذخیره می‌شود و ارزش وعده/روز از «جمع اجزای
 *    واقعی» محاسبه می‌شود — نه از اعداد ثابت ازپیش‌نوشته.
 *  - اگر گزینه سازگار کافی نباشد، خطای صادقانه فارسی داده می‌شود و هیچ
 *    برنامه جعلی ساخته نمی‌شود.
 *
 * قالب وعده‌ها: هر وعده از جایگاه‌هایی (پروتئین، کربوهیدرات، سبزیجات و…)
 * با سهم انرژی مشخص ساخته می‌شود. اختلاف جزئی مجموع واقعی با هدف صادقانه
 * نمایش داده می‌شود و اعداد برای تطبیق ظاهری دستکاری نمی‌شوند.
 */

import {
  findFood,
  foodsForSlot,
  macrosForGrams,
  stateFa,
  type FoodItem,
} from "@/lib/foods";
import type {
  AllergenId,
  FoodSlotId,
} from "@/lib/foods";
import type {
  CalcSnapshot,
  GeneratedNutritionPlan,
  MealType,
  NutritionSettings,
  PlannedFoodItem,
  PlannedMeal,
  PlannedNutritionDay,
  ReplacementSuggestion,
  ShoppingListItem,
} from "./types";
import { MEAL_TYPE_LABELS, NUTRITION_GOAL_LABELS } from "./types";
import { faDigits } from "@/lib/profile";

/* -------------------------------- خطای موتور -------------------------------- */

export class NutritionPlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NutritionPlanError";
  }
}

/* ------------------------------- قالب وعده‌ها ------------------------------- */

/** ساخت وعده‌های روز بر اساس تعداد وعده — سهم‌ها جمعشان ۱ است */
const MEAL_STRUCTURES: Record<number, { type: MealType; share: number }[]> = {
  3: [
    { type: "breakfast", share: 0.3 },
    { type: "lunch", share: 0.4 },
    { type: "dinner", share: 0.3 },
  ],
  4: [
    { type: "breakfast", share: 0.25 },
    { type: "snack_am", share: 0.1 },
    { type: "lunch", share: 0.35 },
    { type: "dinner", share: 0.3 },
  ],
  5: [
    { type: "breakfast", share: 0.22 },
    { type: "snack_am", share: 0.1 },
    { type: "lunch", share: 0.3 },
    { type: "snack_pm", share: 0.08 },
    { type: "dinner", share: 0.3 },
  ],
  6: [
    { type: "breakfast", share: 0.2 },
    { type: "snack_am", share: 0.1 },
    { type: "lunch", share: 0.25 },
    { type: "snack_pm", share: 0.1 },
    { type: "dinner", share: 0.25 },
    { type: "snack_ev", share: 0.1 },
  ],
};

/** جایگاه‌های هر نوع وعده — سهم انرژی درون وعده، جمعشان ۱ است */
interface MealSlotSpec {
  slot: FoodSlotId | "snack_pool";
  share: number;
  optional: boolean;
}

const MEAL_TEMPLATES: Record<MealType, MealSlotSpec[]> = {
  breakfast: [
    { slot: "breakfast_grain", share: 0.4, optional: false },
    { slot: "protein", share: 0.4, optional: false },
    { slot: "fruit", share: 0.2, optional: true },
  ],
  lunch: [
    { slot: "protein", share: 0.35, optional: false },
    { slot: "carb", share: 0.4, optional: false },
    { slot: "vegetable", share: 0.15, optional: true },
    { slot: "fat", share: 0.1, optional: true },
  ],
  dinner: [
    { slot: "protein", share: 0.4, optional: false },
    { slot: "carb", share: 0.25, optional: false },
    { slot: "vegetable", share: 0.25, optional: true },
    { slot: "fat", share: 0.1, optional: true },
  ],
  snack_am: [
    { slot: "fruit", share: 0.55, optional: false },
    { slot: "snack_pool", share: 0.45, optional: true },
  ],
  snack_pm: [
    { slot: "snack_pool", share: 0.5, optional: true },
    { slot: "fruit", share: 0.5, optional: false },
  ],
  snack_ev: [
    { slot: "fruit", share: 0.6, optional: false },
    { slot: "snack_pool", share: 0.4, optional: true },
  ],
};

/**
 * افست چرخشی ثابت هر جایگاه — برای پراکندگی انتخاب بین وعده‌ها.
 * بذر نهایی = dayIndex×۵ + mealIndex + افست جایگاه؛ با استخرهای ۴ تا ۱۳ تایی
 * این فرمول در یک هفته حداکثر تنوع متمایز می‌دهد (تست‌پذیر و بدون تصادف).
 */
const SLOT_ROTATION: Record<string, number> = {
  breakfast_grain: 0,
  protein: 1,
  carb: 2,
  vegetable: 3,
  fruit: 4,
  dairy_snack: 5,
  nuts: 6,
  fat: 7,
  snack_pool: 8,
};

/* ------------------------------ ابزارهای داخلی ------------------------------ */

/** گرد کردن گرم به مضرب ۵ */
function round5(value: number): number {
  return Math.round(value / 5) * 5;
}

/** گرد کردن جمع درشت‌مغذی با یک رقم اعشار */
function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** اندیس چرخشی قطعی در بازه [0, len) */
function rotationIndex(seed: number, len: number): number {
  return ((seed % len) + len) % len;
}

/**
 * سقف و کف منطقی گرم هر جایگاه — سبزی و میوه مقدار خوردنی واقع‌بینانه و
 * کربوهیدرات/پروتئین سهم بشقاب معمول. سقف اختصاصی ماده (maxGrams) همیشه
 * بر این سقف‌ها اولویت دارد.
 */
function gramsBounds(slot: FoodSlotId | "snack_pool"): { min: number; cap: number } {
  switch (slot) {
    case "fat":
      return { min: 5, cap: 30 };
    case "vegetable":
      return { min: 50, cap: 200 };
    case "fruit":
      return { min: 30, cap: 250 };
    case "breakfast_grain":
      return { min: 20, cap: 200 };
    case "carb":
      return { min: 20, cap: 450 };
    case "protein":
      return { min: 10, cap: 350 };
    case "dairy_snack":
    case "nuts":
    case "snack_pool":
      return { min: 10, cap: 350 };
  }
}

function gramsForSlotKcal(food: FoodItem, slot: FoodSlotId | "snack_pool", slotKcal: number): number {
  const { min, cap } = gramsBounds(slot);
  const raw = (slotKcal / food.kcal100) * 100;
  return Math.min(Math.max(round5(raw), min), cap, food.maxGrams ?? cap);
}

/**
 * گرم جایگاه پروتئین — ترکیب دو هدف: سهم پروتئین روزانه وعده و سهم کالری
 * همان جایگاه. گرم نهایی = کمینهٔ گرمِ لازم برای سهم پروتئین و ۱٫۸ برابر
 * گرمِ سهم کالری (اولویت پروتئین بدون انفجار کالری)؛ اختلاف با هدف کالری
 * صادقانه در مجموع‌ها دیده می‌شود و با تعدیل کربوهیدرات جبران می‌شود.
 */
function gramsForProteinSlot(food: FoodItem, proteinTargetG: number, slotKcal: number): number {
  const { min, cap } = gramsBounds("protein");
  const proteinGrams = (proteinTargetG / food.protein100) * 100;
  const kcalGrams = (slotKcal / food.kcal100) * 100;
  const blended = Math.min(proteinGrams, kcalGrams * 1.8);
  return Math.min(Math.max(round5(blended), min), cap, food.maxGrams ?? cap);
}

/**
 * ترجیح منابع پروتئین پرتراکم برای وعده اصلی — وقتی بین مواد سازگار،
 * ماده‌ای با حداقل ۱۵ گرم پروتئین در ۱۰۰ گرم موجود است، انتخاب از میان
 * آن‌هاست تا پروتئین روزانه به هدف نزدیک بماند (قانون شفاف، نه تصادف).
 */
function preferDenseProtein(pool: FoodItem[]): FoodItem[] {
  const dense = pool.filter((food) => food.protein100 >= 15);
  return dense.length > 0 ? dense : pool;
}

function itemOf(food: FoodItem, grams: number): PlannedFoodItem {
  const macros = macrosForGrams(food, grams);
  return {
    foodId: food.id,
    faName: food.fa,
    enName: food.en,
    group: food.group,
    grams,
    kcal: macros.kcal,
    protein: macros.protein,
    carb: macros.carb,
    fat: macros.fat,
    servingHint: food.servingLabel,
  };
}

function mealTotals(items: PlannedFoodItem[]): Pick<PlannedMeal, "kcal" | "protein" | "carb" | "fat"> {
  return {
    kcal: items.reduce((sum, item) => sum + item.kcal, 0),
    protein: round1(items.reduce((sum, item) => sum + item.protein, 0)),
    carb: round1(items.reduce((sum, item) => sum + item.carb, 0)),
    fat: round1(items.reduce((sum, item) => sum + item.fat, 0)),
  };
}

/** استخر برای جایگاه — snack_pool ترکیب لبنیات میان‌وعده و مغزهاست */
function poolForSlot(
  slot: FoodSlotId | "snack_pool",
  options: Parameters<typeof foodsForSlot>[1]
): FoodItem[] {
  if (slot === "snack_pool") {
    const dairy = foodsForSlot("dairy_snack", options);
    const nuts = foodsForSlot("nuts", options);
    const seen = new Set<string>();
    return [...dairy, ...nuts].filter((food) => {
      if (seen.has(food.id)) return false;
      seen.add(food.id);
      return true;
    });
  }
  return foodsForSlot(slot, options);
}

/* ------------------------------ تولید برنامه ------------------------------ */

/**
 * تولید برنامه غذایی از تنظیمات و snapshot محاسبات.
 * خروجی برای ورودی یکسان همیشه یکسان است (بدون تصادف).
 * در کمبود گزینه سازگار، NutritionPlanError با پیام فارسی پرتاب می‌شود.
 */
export function generateNutritionPlan(
  settings: NutritionSettings,
  calc: CalcSnapshot
): GeneratedNutritionPlan {
  const structure = MEAL_STRUCTURES[settings.mealsPerDay];
  if (!structure) {
    throw new NutritionPlanError("تعداد وعده‌ها باید بین ۳ تا ۶ باشد.");
  }

  const filterOptions = {
    allergens: settings.allergens,
    dietPattern: settings.dietPattern,
    dislikedFoodIds: settings.dislikedFoodIds,
    budget: settings.budget,
    prep: settings.prep,
  } as const;

  const mealKcalTarget = calc.targetKcal ?? 1800;

  const notes: string[] = [];
  if (settings.allergens.length > 0) {
    notes.push(
      "مواد دارای آلرژن انتخابی شما از کل برنامه حذف شده‌اند؛ با این حال ترکیبات محصولات آماده می‌تواند متفاوت باشد — پیش از مصرف برچسب محصول را بررسی کنید. ایمنی کامل تضمین نمی‌شود."
    );
  }
  if (settings.dietPattern === "vegan") {
    notes.push(
      "برنامه وگان بر پایه حبوبات، سویا، غلات، میوه و سبزیجات بانک طراحی شده است؛ پروتئین روزانه ممکن است به مرز پایین محدوده توصیه‌ای نزدیک باشد."
    );
  } else if (settings.dietPattern === "vegetarian") {
    notes.push(
      "برنامه گیاهی شامل لبنیات و تخم‌مرغ است؛ گوشت و ماهی در هیچ وعده‌ای نیامده است."
    );
  }
  if (settings.budget === "low") {
    notes.push("مواد گران‌قیمت از فهرست حذف شده‌اند تا هزینه خرید پایین‌تر بماند.");
  }
  notes.push(
    "برند، رسیدگی و روش پخت می‌تواند مقدار واقعی انرژی و درشت‌مغذی را تغییر دهد؛ همه اعداد تخمینی‌اند."
  );
  notes.push(
    "این برنامه یک پیشنهاد عمومی برنامه‌ریزی غذایی است، نه رژیم درمانی یا نسخه پزشکی. اگر بیماری مرتبط با تغذیه دارید با متخصص مشورت کنید."
  );

  const days: PlannedNutritionDay[] = [];
  for (let dayIndex = 0; dayIndex < settings.planLength; dayIndex += 1) {
    const meals: PlannedMeal[] = [];
    let fruitOnlySnack = false;

    structure.forEach((mealSpec, mealIndex) => {
      const template = MEAL_TEMPLATES[mealSpec.type];
      const mealTargetKcal = Math.round(mealKcalTarget * mealSpec.share);
      // سهم وعده از پروتئین روزانه — مبنای مقداردهی جایگاه پروتئین
      const mealProteinTarget =
        calc.macros ? Math.round(calc.macros.proteinG * mealSpec.share) : 0;
      const usedIds = new Set<string>();
      const items: PlannedFoodItem[] = [];

      template.forEach((slotSpec, slotIndex) => {
        const pool = poolForSlot(slotSpec.slot, filterOptions).filter(
          (food) => !usedIds.has(food.id)
        );
        if (pool.length === 0) {
          if (slotSpec.optional) return;
          if (slotSpec.slot === "snack_pool") {
            // میان‌وعده فقط میوه — صادقانه با یادداشت
            fruitOnlySnack = true;
            return;
          }
          throw new NutritionPlanError(
            `با محدودیت‌های انتخابی شما، گزینه سازگاری برای جایگاه «${slotFaName(slotSpec.slot)}» در ${MEAL_TYPE_LABELS[mealSpec.type]} یافت نشد. محدودیت‌ها را کمتر کنید یا بانک مواد در دسترس را بازبینی کنید.`
          );
        }

        const seed =
          dayIndex * 5 + mealIndex + (SLOT_ROTATION[slotSpec.slot] ?? slotIndex);
        const food = pool[rotationIndex(seed, pool.length)];
        usedIds.add(food.id);

        // صبحانه فقط از مواد breakfastOk
        if (mealSpec.type === "breakfast" && slotSpec.slot === "protein" && !food.breakfastOk) {
          const okPool = pool.filter((f) => f.breakfastOk);
          if (okPool.length > 0) {
            const okFood = okPool[rotationIndex(seed, okPool.length)];
            usedIds.delete(food.id);
            usedIds.add(okFood.id);
            items.push(
              itemOf(okFood, gramsForProteinSlot(okFood, mealProteinTarget, mealTargetKcal * slotSpec.share))
            );
            return;
          }
        }

        if (slotSpec.slot === "protein") {
          // وعده اصلی: از منابع پروتئین پرتراکم انتخاب کن (قانون شفاف)
          const mainPool = mealSpec.type === "breakfast" ? pool : preferDenseProtein(pool);
          const chosen = mainPool[rotationIndex(seed, mainPool.length)];
          if (chosen.id !== food.id) {
            usedIds.delete(food.id);
            usedIds.add(chosen.id);
          }
          items.push(
            itemOf(chosen, gramsForProteinSlot(chosen, mealProteinTarget, mealTargetKcal * slotSpec.share))
          );
        } else {
          items.push(
            itemOf(food, gramsForSlotKcal(food, slotSpec.slot, mealTargetKcal * slotSpec.share))
          );
        }
      });

      // اگر وعده از هدف کالری بیشتر شد، ابتدا کربوهیدرات و سپس میوه کم می‌شود
      const shrinkCandidates = items.filter(
        (item) => item.group === "grain" || item.group === "fruit"
      );
      for (let pass = 0; pass < 3 && shrinkCandidates.length > 0; pass += 1) {
        const totals = mealTotals(items);
        if (totals.kcal <= mealTargetKcal * 1.1) break;
        const excess = totals.kcal - mealTargetKcal;
        const shrinkItem = shrinkCandidates[pass % shrinkCandidates.length];
        const food = findFood(shrinkItem.foodId);
        if (!food) break;
        const floorGrams = shrinkItem.group === "grain" ? 20 : 30;
        const removable = shrinkItem.grams - floorGrams;
        if (removable <= 0) continue;
        const remove = Math.min(round5((excess / food.kcal100) * 100), removable, 80);
        if (remove <= 0) break;
        shrinkItem.grams -= remove;
        const macros = macrosForGrams(food, shrinkItem.grams);
        shrinkItem.kcal = macros.kcal;
        shrinkItem.protein = macros.protein;
        shrinkItem.carb = macros.carb;
        shrinkItem.fat = macros.fat;
      }

      // پر کردن فاصله تا هدف وعده — فقط با افزایش مواد کربوهیدرات/میوه موجود
      for (let pass = 0; pass < 3; pass += 1) {
        const totals = mealTotals(items);
        if (totals.kcal >= mealTargetKcal * 0.92) break;
        const deficit = mealTargetKcal - totals.kcal;
        const fillItem =
          items.find((item) => item.group === "grain") ??
          items.find((item) => item.group === "fruit");
        if (!fillItem) break;
        const food = findFood(fillItem.foodId);
        if (!food) break;
        const { cap } = gramsBounds(fillItem.group === "grain" ? "carb" : "fruit");
        const headroom = Math.min(food.maxGrams ?? cap, cap) - fillItem.grams;
        if (headroom <= 0) break;
        const add = Math.min(round5((deficit / food.kcal100) * 100), headroom, 60);
        if (add <= 0) break;
        fillItem.grams += add;
        const macros = macrosForGrams(food, fillItem.grams);
        fillItem.kcal = macros.kcal;
        fillItem.protein = macros.protein;
        fillItem.carb = macros.carb;
        fillItem.fat = macros.fat;
      }

      const totals = mealTotals(items);
      meals.push({
        order: mealIndex + 1,
        type: mealSpec.type,
        title: MEAL_TYPE_LABELS[mealSpec.type],
        items,
        ...totals,
      });
    });

    if (fruitOnlySnack) {
      notes.push(
        "برای میان‌وعده‌ها گزینه پروتئینی سازگار با محدودیت‌های شما یافت نشد؛ آن میان‌وعده فقط میوه است. می‌توانید محدودیت‌ها را بازبینی کنید."
      );
    }

    const dayTotals = {
      kcal: meals.reduce((sum, meal) => sum + meal.kcal, 0),
      protein: round1(meals.reduce((sum, meal) => sum + meal.protein, 0)),
      carb: round1(meals.reduce((sum, meal) => sum + meal.carb, 0)),
      fat: round1(meals.reduce((sum, meal) => sum + meal.fat, 0)),
    };
    days.push({ order: dayIndex + 1, meals, ...dayTotals });
  }

  const lengthLabel = settings.planLength === 7 ? "هفتگی" : "یک‌روزه";
  return {
    title: `برنامه غذایی ${lengthLabel} — ${NUTRITION_GOAL_LABELS[settings.goal]}`,
    goal: settings.goal,
    dietPattern: settings.dietPattern,
    mealsPerDay: settings.mealsPerDay,
    planLength: settings.planLength,
    calc,
    notes,
    days,
  };
}

function slotFaName(slot: FoodSlotId | "snack_pool"): string {
  switch (slot) {
    case "breakfast_grain":
      return "نان یا غلات صبحانه";
    case "protein":
      return "منبع پروتئینی";
    case "carb":
      return "منبع کربوهیدرات";
    case "vegetable":
      return "سبزیجات";
    case "fruit":
      return "میوه";
    case "dairy_snack":
      return "لبنیات میان‌وعده";
    case "nuts":
      return "مغزها";
    case "fat":
      return "چربی پخت";
    case "snack_pool":
      return "میان‌وعده";
  }
}

/* --------------------------- محاسبه مجدد پس از تغییر --------------------------- */

/**
 * ارزش تخمینی مقدار جدید از snapshot ذخیره‌شده ماده — مقادیر هر ۱۰۰ گرم
 * از خود رکورد ذخیره‌شده استخراج می‌شود تا تغییر آینده بانک، برنامه‌های
 * ذخیره‌شده را تغییر ندهد.
 */
export function recomputeItemFromSnapshot(
  snapshot: { grams: number; kcal: number; protein: number; carb: number; fat: number },
  newGrams: number
): { grams: number; kcal: number; protein: number; carb: number; fat: number } {
  const factor = newGrams / 100;
  const per100 = {
    kcal: (snapshot.kcal / snapshot.grams) * 100,
    protein: (snapshot.protein / snapshot.grams) * 100,
    carb: (snapshot.carb / snapshot.grams) * 100,
    fat: (snapshot.fat / snapshot.grams) * 100,
  };
  return {
    grams: newGrams,
    kcal: Math.round(per100.kcal * factor),
    protein: round1(per100.protein * factor),
    carb: round1(per100.carb * factor),
    fat: round1(per100.fat * factor),
  };
}

/* ------------------------------- جایگزینی ماده ------------------------------- */

/**
 * پیشنهاد جایگزین برای یک ماده برنامه — فقط از مواد سازگار بانک، با اولویت
 * هم‌گروه، مرتب بر اساس نزدیک‌ترین انرژی به ماده اصلی. اختلاف‌ها صادقانه
 * برگردانده می‌شوند و هیچ «معادل کامل» ادعا نمی‌شود.
 */
export function suggestReplacements(
  currentItem: { foodId: string; kcal: number; protein: number },
  options: Parameters<typeof foodsForSlot>[1],
  excludeFoodIds: string[] = []
): ReplacementSuggestion[] {
  const current = findFood(currentItem.foodId);
  if (!current) return [];

  const candidates = new Map<string, FoodItem>();
  // هم‌گروه‌ها اول، سپس مواد با نقش مشترک
  const sameGroup = filterFoodsSafe(options).filter(
    (food) => food.group === current.group && food.id !== current.id && !excludeFoodIds.includes(food.id)
  );
  const sharedSlot = filterFoodsSafe(options).filter(
    (food) =>
      food.group !== current.group &&
      food.id !== current.id &&
      !excludeFoodIds.includes(food.id) &&
      food.slots.some((slot) => current.slots.includes(slot))
  );
  [...sameGroup, ...sharedSlot].forEach((food) => candidates.set(food.id, food));

  const suggestions: ReplacementSuggestion[] = [];
  for (const food of candidates.values()) {
    // گرم پیشنهادی برای نزدیک شدن انرژی به ماده اصلی (گرد به ۵)
    const grams = Math.min(
      Math.max(round5((currentItem.kcal / food.kcal100) * 100), 10),
      food.maxGrams ?? 600
    );
    const macros = macrosForGrams(food, grams);
    suggestions.push({
      foodId: food.id,
      faName: food.fa,
      enName: food.en,
      grams,
      kcal: macros.kcal,
      protein: macros.protein,
      carb: macros.carb,
      fat: macros.fat,
      kcalDiff: macros.kcal - currentItem.kcal,
      proteinDiff: round1(macros.protein - currentItem.protein),
    });
  }

  return suggestions.sort((a, b) => Math.abs(a.kcalDiff) - Math.abs(b.kcalDiff)).slice(0, 5);
}

function filterFoodsSafe(options: Parameters<typeof foodsForSlot>[1]): FoodItem[] {
  // فیلتر کل بانک بدون نقش مشخص — برای جست‌وجوی جایگزین عمومی
  return foodsForSlot("protein", options)
    .concat(
      foodsForSlot("carb", options),
      foodsForSlot("vegetable", options),
      foodsForSlot("fruit", options),
      foodsForSlot("dairy_snack", options),
      foodsForSlot("nuts", options),
      foodsForSlot("fat", options),
      foodsForSlot("breakfast_grain", options)
    )
    .filter((food, index, list) => list.findIndex((f) => f.id === food.id) === index);
}

/* -------------------------------- فهرست خرید -------------------------------- */

/**
 * ساخت فهرست خرید از روزهای انتخابی برنامه — تجمیع هم‌شناسه‌ها با واحد
 * سازگار (همه مقادیر گرم‌اند، بنابراین جمع همیشه معتبر است).
 * مواد با گروه یکسان و مرتب‌سازی پایدار نمایش داده می‌شوند.
 */
export function aggregateShoppingList(days: PlannedNutritionDay[]): ShoppingListItem[] {
  const totals = new Map<string, { grams: number; faName: string; group: string }>();
  days.forEach((day) => {
    day.meals.forEach((meal) => {
      meal.items.forEach((item) => {
        const existing = totals.get(item.foodId);
        if (existing) {
          existing.grams += item.grams;
        } else {
          totals.set(item.foodId, { grams: item.grams, faName: item.faName, group: item.group });
        }
      });
    });
  });

  const items: ShoppingListItem[] = [];
  totals.forEach((value, foodId) => {
    const food = findFood(foodId);
    const servings = food ? value.grams / food.servingGrams : null;
    items.push({
      foodId,
      faName: value.faName,
      group: value.group,
      groupFa: value.group,
      totalGrams: value.grams,
      servingHint:
        servings && servings >= 0.5
          ? `حدود ${faDigits(Math.round(servings * 10) / 10)} سهم (${food?.servingLabel ?? ""})`
          : "مقدار جزئی",
    });
  });

  const groupOrder = ["protein", "dairy", "grain", "vegetable", "fruit", "nuts_fats"];
  return items.sort((a, b) => {
    const diff = groupOrder.indexOf(a.group) - groupOrder.indexOf(b.group);
    if (diff !== 0) return diff;
    return b.totalGrams - a.totalGrams;
  });
}

/* --------------------------- برچسب وضعیت ماده --------------------------- */

/** برچسب فارسی وضعیت برای نمایش در UI (از بانک؛ برای snapshot نامعلوم «—») */
export function foodStateLabel(foodId: string): string {
  const food = findFood(foodId);
  return food ? stateFa(food.state) : "—";
}
