/**
 * تایپ‌های موتور تغذیه — مشترک بین کلاینت و سرور.
 *
 * موتور کاملاً قانون‌محور و خالص است (بدون سرویس بیرونی و بدون تصادف)؛
 * برای تنظیمات یکسان همیشه برنامه یکسانی تولید می‌شود تا تست‌پذیر و
 * قابل‌توضیح باشد. هیچ ادعای «هوش مصنوعی» وجود ندارد و همه اعداد «تخمینی»
 * معرفی می‌شوند، نه اندازه‌گیری دقیق نیاز بدن.
 */

import type { AllergenId, DietTag } from "@/lib/foods";

/* ------------------------------ واژگان مشترک ------------------------------ */

/** هدف تغذیه‌ای برنامه — واژگان مستقل از هدف تمرینی پروفایل */
export type NutritionGoal = "weight_loss" | "muscle_gain" | "maintain";

export const NUTRITION_GOAL_LABELS: Record<NutritionGoal, string> = {
  weight_loss: "کاهش وزن تدریجی",
  muscle_gain: "پشتیبانی از عضله‌سازی",
  maintain: "حفظ وزن",
};

/** برچسب انگلیسی هدف تغذیه — فقط برای تولید محتوا با locale="en" */
export const NUTRITION_GOAL_LABELS_EN: Record<NutritionGoal, string> = {
  weight_loss: "Gradual weight loss",
  muscle_gain: "Muscle-gain support",
  maintain: "Weight maintenance",
};

/** الگوی غذایی قابل‌پشتیبانی موتور فعلی */
export type DietPattern = "none" | "vegetarian" | "vegan";

export const DIET_PATTERN_LABELS: Record<DietPattern, string> = {
  none: "معمولی",
  vegetarian: "گیاهخواری",
  vegan: "وگان",
};

/** سطح فعالیت روزانه — ضریب‌های استاندارد Harris–Benedict فعالیت */
export type ActivityLevelId =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export interface ActivityLevelDef {
  id: ActivityLevelId;
  fa: string;
  hint: string;
  factor: number;
}

export const ACTIVITY_LEVELS: ActivityLevelDef[] = [
  { id: "sedentary", fa: "کم‌تحرک", hint: "کار نشسته و بدون ورزش منظم", factor: 1.2 },
  { id: "light", fa: "سبک", hint: "ورزش سبک ۱ تا ۳ روز در هفته", factor: 1.375 },
  { id: "moderate", fa: "متوسط", hint: "ورزش ۳ تا ۵ روز در هفته", factor: 1.55 },
  { id: "active", fa: "فعال", hint: "ورزش ۶ تا ۷ روز در هفته", factor: 1.725 },
  { id: "very_active", fa: "بسیار فعال", hint: "ورزش سنگین یا کار بدنی سنگین", factor: 1.9 },
];

export function activityLevelDef(id: string): ActivityLevelDef | null {
  return ACTIVITY_LEVELS.find((level) => level.id === id) ?? null;
}

/* -------------------------------- ورودی موتور -------------------------------- */

/**
 * اطلاعات برآورد انرژی — یا از پروفایل کاربر می‌آید یا از فرم تغذیه
 * (به‌صورت محلی، بدون تغییر پروفایل). جنسیت فقط برای فرمول Mifflin–St Jeor
 * لازم است؛ «اعلام‌نشده» یعنی میانگین دو فرمول (روش جایگزین مستند).
 */
export interface EstimateInfo {
  age: number;
  heightCm: number;
  weightKg: number;
  gender: "male" | "female" | "undisclosed";
}

/**
 * تنظیمات ساخت برنامه غذایی — ورودی موتور.
 * هیچ فیلد هویتی (userId و…) در این ساختار نیست؛ مالکیت همیشه سمت سرور
 * از نشست تعیین می‌شود.
 */
export interface NutritionSettings {
  goal: NutritionGoal;
  activityLevel: ActivityLevelId;
  /** تعداد وعده‌ها در روز — ۳ تا ۶ */
  mealsPerDay: number;
  /** طول برنامه: ۱ روز یا ۷ روز */
  planLength: 1 | 7;
  dietPattern: DietPattern;
  /** آلرژن‌های حذف‌شده — در کل مسیر تولید و جایگزینی رعایت می‌شود */
  allergens: AllergenId[];
  /** مواد نامطلوب (شناسه پایدار بانک) */
  dislikedFoodIds: string[];
  /** «اقتصادی» یعنی مواد گران حذف شوند */
  budget: "any" | "low";
  /** «ساده» یعنی اولویت با آماده‌سازی سریع */
  prep: "any" | "simple";
  /** بارداری یا شیردهی — در این حالت هدف کالری خودکار تنظیم نمی‌شود */
  pregnancyBreastfeeding: boolean;
  /** اطلاعات برآورد — اگر پروفایل کامل باشد سرور آن را جایگزین می‌کند */
  estimate: EstimateInfo | null;
}

/* ------------------------------ خروجی برآورد انرژی ------------------------------ */

export interface MacroTargets {
  /** پروتئین روزانه (گرم) */
  proteinG: number;
  /** کربوهیدرات روزانه (گرم) */
  carbG: number;
  /** چربی روزانه (گرم) */
  fatG: number;
}

/** snapshot کامل محاسبات — برای شفافیت و بازتولید در برنامه ذخیره می‌شود */
export interface CalcSnapshot {
  formula: "Mifflin-St Jeor";
  /** BMR تخمینی (کیلوکالری) — فقط در حالت قابل‌برآورد */
  bmr: number | null;
  /** TDEE تخمینی = BMR × ضریب فعالیت */
  tdee: number | null;
  /** هدف کالری روزانه — در حالت احتیاط null است */
  targetKcal: number | null;
  /** ضریب فعالیت استفاده‌شده */
  activityFactor: number;
  /** اهداف درشت‌مغذی — در حالت احتیاط null است */
  macros: MacroTargets | null;
  /** جنسیت مؤثر در فرمول (اگر undisclosed باشد میانگین دو فرمول استفاده شده) */
  genderUsed: "male" | "female" | "undisclosed";
  /** اختلاف جمع انرژی درشت‌مغذی‌ها با هدف کالری (گرد شدن) — شفاف نمایش داده می‌شود */
  macroKcalDiff: number | null;
  /** هشدارهای صادقانه برآورد */
  warnings: string[];
  /** حالت احتیاط: برآورد کالری شخصی ارائه نمی‌شود (زیر ۱۸ سال / بارداری) */
  caution: boolean;
  /** دلیل احتیاط */
  cautionReason: "underage" | "pregnancy" | null;
}

export type TargetsResult =
  | { status: "ok"; snapshot: CalcSnapshot }
  | { status: "insufficient_data"; missingLabels: string[] };

/* ------------------------------- خروجی موتور برنامه ------------------------------- */

/** یک ماده غذایی داخل وعده — با مقدار روشن و ارزش تخمینی همان مقدار */
export interface PlannedFoodItem {
  /** شناسه پایدار در بانک مواد غذایی */
  foodId: string;
  faName: string;
  enName: string;
  group: string;
  /** مقدار به گرم — واحد همیشه «گرم» است تا جمع‌پذیری فهرست خرید معتبر باشد */
  grams: number;
  /** ارزش تخمینی همان مقدار (نه ۱۰۰ گرم) */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** برچسب سهم متداول بانک — فقط برای راهنمای بصری */
  servingHint: string;
}

export type MealType = "breakfast" | "snack_am" | "lunch" | "snack_pm" | "dinner" | "snack_ev";

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "صبحانه",
  snack_am: "میان‌وعده صبح",
  lunch: "ناهار",
  snack_pm: "میان‌وعده عصر",
  dinner: "شام",
  snack_ev: "میان‌وعده شب",
};

/** برچسب انگلیسی وعده‌ها — فقط برای تولید محتوا با locale="en" */
export const MEAL_TYPE_LABELS_EN: Record<MealType, string> = {
  breakfast: "Breakfast",
  snack_am: "Morning snack",
  lunch: "Lunch",
  snack_pm: "Afternoon snack",
  dinner: "Dinner",
  snack_ev: "Evening snack",
};

/** یک وعده — مجموع از مقادیر واقعی اجزا محاسبه شده، نه عدد ثابت */
export interface PlannedMeal {
  order: number;
  type: MealType;
  title: string;
  items: PlannedFoodItem[];
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

/** یک روز برنامه */
export interface PlannedNutritionDay {
  order: number;
  meals: PlannedMeal[];
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
}

/** برنامه کامل تولیدشده — بدون شناسه دیتابیس؛ پیش از ذخیره فقط پیش‌نمایش است */
export interface GeneratedNutritionPlan {
  title: string;
  goal: NutritionGoal;
  dietPattern: DietPattern;
  mealsPerDay: number;
  planLength: 1 | 7;
  calc: CalcSnapshot;
  /** یادداشت‌های عمومی برنامه — محدودیت‌ها و راهنماهای صادقانه */
  notes: string[];
  days: PlannedNutritionDay[];
}

/* ------------------------------ فهرست خرید و جایگزینی ------------------------------ */

/** یک قلم فهرست خرید — تجمیع هم‌شناسه‌ها با واحد سازگار (گرم) */
export interface ShoppingListItem {
  foodId: string;
  faName: string;
  group: string;
  groupFa: string;
  totalGrams: number;
  /** ≈ چند سهم متداول بانک */
  servingHint: string;
}

/** پیشنهاد جایگزینی — با اختلاف صادقانه نسبت به ماده اصلی */
export interface ReplacementSuggestion {
  foodId: string;
  faName: string;
  enName: string;
  /** گرم پیشنهادی برای هم‌انرژی‌شدن تقریبی با ماده اصلی (گرد به ۵) */
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  /** اختلاف کالری با ماده اصلی در همان مقدار پیشنهادی (ممکن است صفر نباشد) */
  kcalDiff: number;
  proteinDiff: number;
}

/** نسخه موتور — در برنامه ذخیره می‌شود تا تغییر آینده منطق شفاف بماند */
export const NUTRITION_ENGINE_VERSION = "1.0.0";
