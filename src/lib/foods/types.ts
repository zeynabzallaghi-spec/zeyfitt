/**
 * بانک مواد غذایی — لایه داده ساختاریافته و نسخه‌بندی‌شده.
 *
 * تصمیم معماری (همان الگوی بانک حرکات مرحله ۵): داده‌ها در فایل‌های
 * TypeScript مستقل از UI نگهداری می‌شوند، نه پایگاه داده؛ چون بانک عمومی
 * است، همه کاربران محتوای یکسانی می‌بینند و نوشتن شخصی وجود ندارد.
 * افزودن ماده غذایی جدید = افزودن یک آبجکت به فایل داده، بدون تغییر UI.
 *
 * منبع داده: مقادیر «تخمینی» بر پایه جداول معتبر ترکیب مواد غذایی
 * (USDA FoodData Central و میانگین جداول متداول مواد غذایی ایرانی).
 * این اعداد میانگین‌اند، نه تحلیل آزمایشگاهی؛ برند و روش پخت مقدار واقعی
 * را تغییر می‌دهد و این محدودیت در UI اعلام می‌شود.
 *
 * شناسه‌ها پایدارند (slug انگلیسی) و هرگز نباید تغییر کنند؛ زیرا در
 * برنامه‌ساز تغذیه به آن‌ها ارجاع و در برنامه‌های ذخیره‌شده snapshot
 * می‌شوند.
 */

/** نسخه فعلی بانک مواد غذایی — با هر تغییر محتوایی افزایش می‌یابد */
export const FOODS_VERSION = "1.0.0";

/* ------------------------------- گروه‌های غذایی ------------------------------- */

export type FoodGroupId =
  | "protein"
  | "dairy"
  | "grain"
  | "vegetable"
  | "fruit"
  | "nuts_fats";

export interface FoodGroupDef {
  id: FoodGroupId;
  fa: string;
  en: string;
}

/** ترتیب گروه‌ها هم ترتیب نمایش فهرست خرید و هم مرتب‌سازی پایدار است */
export const FOOD_GROUPS: FoodGroupDef[] = [
  { id: "protein", fa: "منابع پروتئینی", en: "Protein" },
  { id: "dairy", fa: "لبنیات", en: "Dairy" },
  { id: "grain", fa: "غلات، نان و نشاسته‌ای‌ها", en: "Grains & Starches" },
  { id: "vegetable", fa: "سبزیجات", en: "Vegetables" },
  { id: "fruit", fa: "میوه‌ها", en: "Fruits" },
  { id: "nuts_fats", fa: "مغزها و چربی‌ها", en: "Nuts & Fats" },
];

/* ---------------------------------- آلرژن‌ها ---------------------------------- */

export type AllergenId = "dairy" | "gluten" | "nuts" | "seafood" | "egg" | "soy";

export const ALLERGEN_DEFS: { id: AllergenId; fa: string }[] = [
  { id: "dairy", fa: "لبنیات" },
  { id: "gluten", fa: "گلوتن" },
  { id: "nuts", fa: "آجیل و مغزها" },
  { id: "seafood", fa: "غذای دریایی" },
  { id: "egg", fa: "تخم‌مرغ" },
  { id: "soy", fa: "سویا" },
];

/* ------------------------------ نقش در چیدمان وعده ------------------------------ */

/**
 * نقش ماده غذایی در قالب وعده‌ها. هر وعده از چند «جایگاه» ساخته می‌شود و
 * موتور برای هر جایگاه از میان مواد سازگار یکی را انتخاب می‌کند.
 */
export type FoodSlotId =
  | "breakfast_grain" // نان/جو دوسر برای صبحانه
  | "protein" // منبع پروتئینی اصلی
  | "carb" // منبع کربوهیدرات (برنج، سیب‌زمینی، حبوبات و…)
  | "vegetable"
  | "fruit"
  | "dairy_snack" // شیر و ماست برای میان‌وعده
  | "nuts" // مغزها برای میان‌وعده
  | "fat"; // چربی پخت (روغن و…)

/* --------------------------------- سایر ویژگی‌ها --------------------------------- */

/** وضعیت ماده غذایی که مقادیر به آن تعلق دارد — صادقانه اعلام می‌شود */
export type FoodState = "raw" | "cooked" | "prepared";

/** سطح قیمت نسبی — برای فیلتر «اقتصادی» فقط premium حذف می‌شود */
export type BudgetLevel = "low" | "medium" | "premium";

export type DietTag = "vegetarian" | "vegan";

export type PrepTime = "quick" | "medium";

/**
 * یک ماده غذایی بانک. مقادیر درشت‌مغذی برای ۱۰۰ گرم از «همان state»
 * اعلام‌شده است؛ هیچ عددی اختراع نشده و همه از جداول عمومی آمده‌اند.
 */
export interface FoodItem {
  /** شناسه پایدار — هرگز تغییر نمی‌کند */
  id: string;
  fa: string;
  en: string;
  group: FoodGroupId;
  /** انرژی تخمینی در ۱۰۰ گرم (کیلوکالری) */
  kcal100: number;
  protein100: number;
  carb100: number;
  fat100: number;
  state: FoodState;
  /** اندازه سهم متداول — برچسب فارسی مثل «۱ عدد متوسط» */
  servingLabel: string;
  /** وزن تقریبی سهم متداول (گرم) */
  servingGrams: number;
  /** جایگاه‌هایی که این ماده می‌تواند در برنامه پر کند */
  slots: FoodSlotId[];
  /** برای صبحانه مناسب است (مرغ/گوشت/ماهی برای صبحانه انتخاب نمی‌شوند) */
  breakfastOk: boolean;
  allergens: AllergenId[];
  diet: DietTag[];
  budget: BudgetLevel;
  prepTime: PrepTime;
  /** سقف منطقی گرم در یک وعده — مثل حداکثر ۳ عدد تخم‌مرغ */
  maxGrams?: number;
}

/* ------------------------------ محاسبات پرکاربرد ------------------------------ */

export interface FoodMacros {
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

/** ارزش تخمینی مقدار مشخص (گرم) از ماده غذایی — خروجی با یک رقم اعشار */
export function macrosForGrams(food: FoodItem, grams: number): FoodMacros {
  const factor = grams / 100;
  return {
    kcal: Math.round(food.kcal100 * factor),
    protein: Math.round(food.protein100 * factor * 10) / 10,
    carb: Math.round(food.carb100 * factor * 10) / 10,
    fat: Math.round(food.fat100 * factor * 10) / 10,
  };
}

/** برچسب فارسی وضعیت ماده غذایی */
export function stateFa(state: FoodState): string {
  switch (state) {
    case "raw":
      return "خام";
    case "cooked":
      return "پخته";
    case "prepared":
      return "آماده مصرف";
  }
}
