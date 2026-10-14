/**
 * نقطه دسترسی واحد بانک مواد غذایی — ترکیب فایل‌های داده، مرتب‌سازی پایدار،
 * فیلترهای سازگاری (آلرژی، الگوی غذایی، بودجه، مواد نامطلوب) و جست‌وجو.
 * همه توابع خالص‌اند تا در تست خودکار و UI بدون تفاوت کار کنند.
 */

import type {
  AllergenId,
  DietTag,
  FoodGroupId,
  FoodItem,
  FoodSlotId,
} from "./types";
import { FOOD_GROUPS } from "./types";
import { PROTEIN_FOODS } from "./data-proteins";
import { DAIRY_GRAIN_FOODS } from "./data-dairy-grains";
import { PRODUCE_FOODS } from "./data-produce";
import { NUTS_FATS_FOODS } from "./data-nuts-fats";

export * from "./types";

/* ------------------------------ بانک کامل مواد ------------------------------ */

const ALL_FOODS: FoodItem[] = [
  ...PROTEIN_FOODS,
  ...DAIRY_GRAIN_FOODS,
  ...PRODUCE_FOODS,
  ...NUTS_FATS_FOODS,
];

const GROUP_ORDER = new Map<FoodGroupId, number>(FOOD_GROUPS.map((g, i) => [g.id, i]));

/**
 * مرتب‌سازی پایدار: گروه (ترتیب ثابت) ← شناسه. ورودی تکرارپذیر است و
 * ترتیب انتخاب چرخشی موتور را قابل پیش‌بینی می‌کند.
 */
function defaultSort(foods: FoodItem[]): FoodItem[] {
  return [...foods].sort((a, b) => {
    const groupDiff = (GROUP_ORDER.get(a.group) ?? 99) - (GROUP_ORDER.get(b.group) ?? 99);
    if (groupDiff !== 0) return groupDiff;
    return a.id.localeCompare(b.id);
  });
}

/** بانک کامل مواد غذایی — منبع اصلی برنامه‌ساز و انتخاب مواد */
export const FOOD_BANK: FoodItem[] = defaultSort(ALL_FOODS);

/** تعداد مواد بانک — برای نمایش و تست */
export const FOOD_COUNT = FOOD_BANK.length;

/** یافتن ماده با شناسه پایدار — بانک کوچک است، جست‌وجوی خطی کافی و تکرارپذیر است */
export function findFood(id: string): FoodItem | null {
  return FOOD_BANK.find((food) => food.id === id) ?? null;
}

/* ------------------------------ فیلترهای سازگاری ------------------------------ */

export interface FoodFilterOptions {
  /** آلرژن‌های کاربر — مواد دارای این آلرژن‌ها به‌طور کامل حذف می‌شوند */
  allergens: AllergenId[];
  /** الگوی غذایی — vegan فقط گیاهی کامل؛ vegetarian گیاهی + لبنیات/تخم‌مرغ */
  dietPattern: DietTag | "none";
  /** مواد نامطلوب کاربر (شناسه پایدار) */
  dislikedFoodIds: string[];
  /** «اقتصادی» = حذف مواد premium */
  budget: "any" | "low";
  /** «ساده» = ترجیح آماده‌سازی سریع (فیلتر سخت نیست؛ ترتیب انتخاب است) */
  prep: "any" | "simple";
}

/** بررسی سازگاری یک ماده با تنظیمات — هسته مشترک تولید و جایگزینی */
export function isFoodCompatible(food: FoodItem, options: FoodFilterOptions): boolean {
  if (options.allergens.some((a) => food.allergens.includes(a))) return false;
  if (options.dietPattern === "vegan" && !food.diet.includes("vegan")) return false;
  if (options.dietPattern === "vegetarian" && !food.diet.includes("vegetarian")) return false;
  if (options.dislikedFoodIds.includes(food.id)) return false;
  if (options.budget === "low" && food.budget === "premium") return false;
  return true;
}

/**
 * فیلتر بانک بر اساس تنظیمات. اگر prep = «ساده» باشد مواد سریع اول می‌آیند
 * (ترتیب پایدار حفظ می‌شود) — چون موتور با اندیس چرخشی انتخاب می‌کند،
 * این یعنی اولویت انتخاب، نه حذف مواد متوسط.
 */
export function filterFoods(options: FoodFilterOptions): FoodItem[] {
  const compatible = FOOD_BANK.filter((food) => isFoodCompatible(food, options));
  if (options.prep === "simple") {
    return [...compatible].sort((a, b) => {
      if (a.prepTime === b.prepTime) return 0;
      return a.prepTime === "quick" ? -1 : 1;
    });
  }
  return compatible;
}

/** فهرست مواد سازگار برای یک جایگاه مشخص (مثل «protein» یا «fruit») */
export function foodsForSlot(slot: FoodSlotId, options: FoodFilterOptions): FoodItem[] {
  return filterFoods(options).filter((food) => food.slots.includes(slot));
}

/* --------------------------------- برچسب‌ها --------------------------------- */

export function foodGroupFa(group: FoodGroupId): string {
  return FOOD_GROUPS.find((g) => g.id === group)?.fa ?? group;
}

export function allergenFa(allergen: AllergenId): string {
  const def = ALLERGEN_FA.find((a) => a.id === allergen);
  return def?.fa ?? allergen;
}

const ALLERGEN_FA: { id: AllergenId; fa: string }[] = [
  { id: "dairy", fa: "لبنیات" },
  { id: "gluten", fa: "گلوتن" },
  { id: "nuts", fa: "آجیل و مغزها" },
  { id: "seafood", fa: "غذای دریایی" },
  { id: "egg", fa: "تخم‌مرغ" },
  { id: "soy", fa: "سویا" },
];
