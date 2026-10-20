/**
 * شِما و سازنده محتوای برنامه‌های اختصاصی مربی — مرحله ۱۶.
 *
 * قواعد امنیتی ساخت محتوا (هر دو نوع برنامه):
 *  - مربی فقط «شناسه حرکت/غذا + تجویز» می‌فرستد؛ نام‌ها، دسته، شناسه
 *    سه‌بعدی و همه مقادیر تغذیه‌ای همیشه سمت سرور از بانک‌های زنده پروژه
 *    خوانده و snapshot می‌شوند — هیچ داده نمایشی/تغذیه‌ای کلاینت معتبر نیست.
 *  - شناسه حرکت ناموجود، غذا ناموجود، واحد ناسازگار، مقدار خارج از بازه،
 *    روز/وعده خالی و مقادیر منفی همگی با کد پایدار رد می‌شوند.
 *  - هیچ ادعای پزشکی/درمانی در ساختار نیست؛ مقادیر تغذیه‌ای برآورد بانک‌اند
 *    و در نمایش به‌صورت «تخمینی» برچسب می‌خورند.
 */

import { z } from "zod";
import { createHash } from "node:crypto";
import { getExerciseCardById, ensureExerciseBank } from "@/lib/exercises/bank";
import { findFood, FOOD_BANK } from "@/lib/foods";
import { macrosForGrams } from "@/lib/foods/types";
import { getPersonalExerciseForPlan, PERSONAL_EXERCISE_PREFIX } from "./coach-exercises";
import type { MuscleGroupId } from "@/lib/fitness3d/types";
import { CoachingError } from "./constants";

/* ------------------------------ ثابت‌های زمان ------------------------------ */

/**
 * همان فرمول و ثابت‌های موتور برنامه‌ساز (plan-engine) — کپی مقادیر با
 * ارجاع مستند؛ هر تغییری در موتور باید اینجا هم اعمال شود تا برآورد
 * زمان جلسات اختصاصی با برنامه‌های خودکار هم‌روش بماند.
 */
const WORK_SECONDS_PER_SET = 40;
const SETUP_SECONDS_PER_EXERCISE = 60;
const WARMUP_MINUTES = 5;

function estimateExerciseMinutes(sets: number, restSeconds: number): number {
  const totalSeconds = sets * (WORK_SECONDS_PER_SET + restSeconds) + SETUP_SECONDS_PER_EXERCISE;
  return Math.max(1, Math.round(totalSeconds / 60));
}

/* ------------------------------ محدودیت‌ها ------------------------------ */

export const COACH_PLAN_LIMITS = {
  TITLE_MIN: 2,
  TITLE_MAX: 120,
  DESCRIPTION_MAX: 2000,
  /** سقف روز در برنامه تمرینی */
  WORKOUT_DAYS_MAX: 7,
  /** سقف روز در برنامه غذایی (همان بازه برنامه غذایی موجود) */
  NUTRITION_DAYS_MAX: 7,
  /** سقف حرکت در هر روز — هم‌تراز سقف جلسه تمرینی */
  EXERCISES_PER_DAY_MAX: 20,
  /** سقف وعده در هر روز */
  MEALS_PER_DAY_MAX: 8,
  /** سقف قلم غذا در هر وعده */
  ITEMS_PER_MEAL_MAX: 15,
  SETS_MIN: 1,
  SETS_MAX: 30,
  REPS_MIN: 1,
  REPS_MAX: 500,
  REST_MIN: 0,
  REST_MAX: 600,
  NOTE_MAX: 200,
  /** وزن پیشنهادی اختیاری — فقط نمایشی */
  WEIGHT_MAX: 500,
  DURATION_MINUTES_MIN: 10,
  DURATION_MINUTES_MAX: 300,
  GRAMS_MIN: 1,
  GRAMS_MAX: 2000,
  SERVINGS_MIN: 0.25,
  SERVINGS_MAX: 10,
} as const;

/* ------------------------------ انواع محتوا ------------------------------ */

export interface CoachPlanExerciseContent {
  order: number;
  exerciseId: string;
  /** snapshot نام‌ها از بانک زنده هنگام ذخیره — داده کلاینت هرگز */
  faName: string;
  enName: string;
  category: string;
  coach3dId: string | null;
  /** منبع حرکت: بانک عمومی یا حرکت شخصی مربی (مرحله ۱۹.۶) — صادقانه */
  source: "public" | "personal";
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  estimatedMinutes: number;
  note: string | null;
  /** وزن پیشنهادی مربی — فقط نمایشی */
  suggestedWeightKg: number | null;
}

export interface CoachPlanDayContent {
  order: number;
  title: string;
  estMinutes: number;
  exercises: CoachPlanExerciseContent[];
}

export interface CoachWorkoutContent {
  days: CoachPlanDayContent[];
}

export interface CoachMealItemContent {
  order: number;
  foodId: string;
  faName: string;
  enName: string;
  group: string;
  /** مقدار نهایی گرم — پس از تبدیل واحد سمت سرور */
  grams: number;
  /** مقادیر تخمینی بانک برای همین مقدار — محاسبه سمت سرور */
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  servingHint: string;
}

export interface CoachMealContent {
  order: number;
  type: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  items: CoachMealItemContent[];
}

export interface CoachNutritionDayContent {
  order: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  meals: CoachMealContent[];
}

export interface CoachNutritionContent {
  days: CoachNutritionDayContent[];
}

export interface CoachPlanMeta {
  /** فقط workout */
  difficulty?: string;
  /** فقط workout */
  durationMinutes?: number;
  /** فقط nutrition */
  durationDays?: number;
  /** شمارش خلاصه برای فهرست‌ها */
  daysCount: number;
  exercisesCount?: number;
  mealsCount?: number;
  itemsCount?: number;
}

/* ------------------------------ اهداف مجاز ------------------------------ */

export const COACH_WORKOUT_GOALS = [
  "fat_loss",
  "muscle_gain",
  "strength",
  "maintain",
  "fitness",
] as const;

export const COACH_NUTRITION_GOALS = [
  "weight_loss",
  "muscle_gain",
  "maintain",
] as const;

export const COACH_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export const COACH_MEAL_TYPES = [
  "breakfast",
  "snack_am",
  "lunch",
  "snack_pm",
  "dinner",
  "snack_ev",
] as const;

/* ------------------------------ شِمای ورودی تمرینی ------------------------------ */

const intField = (msg: string) => z.number({ message: msg }).int(msg);

const workoutExerciseInput = z
  .object({
    exerciseId: z.string({ message: "شناسه حرکت معتبر نیست" }).trim().min(1).max(64),
    sets: intField("تعداد ست نامعتبر است"),
    repsMin: intField("تعداد تکرار نامعتبر است"),
    repsMax: intField("سقف تکرار نامعتبر است"),
    restSeconds: intField("زمان استراحت نامعتبر است"),
    note: z.string().trim().max(COACH_PLAN_LIMITS.NOTE_MAX).nullish(),
    suggestedWeightKg: z.number().min(0).max(COACH_PLAN_LIMITS.WEIGHT_MAX).nullish(),
  })
  .refine((v) => v.sets >= COACH_PLAN_LIMITS.SETS_MIN && v.sets <= COACH_PLAN_LIMITS.SETS_MAX, {
    message: "تعداد ست باید بین ۱ تا ۳۰ باشد",
  })
  .refine((v) => v.repsMin >= COACH_PLAN_LIMITS.REPS_MIN && v.repsMin <= COACH_PLAN_LIMITS.REPS_MAX, {
    message: "تعداد تکرار باید بین ۱ تا ۵۰۰ باشد",
  })
  .refine((v) => v.repsMax >= v.repsMin && v.repsMax <= COACH_PLAN_LIMITS.REPS_MAX, {
    message: "سقف تکرار باید حداقل برابر کف تکرار باشد",
  })
  .refine((v) => v.restSeconds >= COACH_PLAN_LIMITS.REST_MIN && v.restSeconds <= COACH_PLAN_LIMITS.REST_MAX, {
    message: "زمان استراحت باید بین ۰ تا ۶۰۰ ثانیه باشد",
  });

const workoutDayInput = z.object({
  title: z.string({ message: "عنوان روز نامعتبر است" }).trim().min(1, "عنوان روز خالی است").max(80),
  exercises: z
    .array(workoutExerciseInput)
    .min(1, "هر روز حداقل یک حرکت نیاز دارد")
    .max(COACH_PLAN_LIMITS.EXERCISES_PER_DAY_MAX, `حداکثر ${COACH_PLAN_LIMITS.EXERCISES_PER_DAY_MAX} حرکت در هر روز مجاز است`),
});

export const createCoachWorkoutPlanSchema = z.object({
  title: z.string().trim().min(COACH_PLAN_LIMITS.TITLE_MIN, "عنوان حداقل ۲ کاراکتر است").max(COACH_PLAN_LIMITS.TITLE_MAX),
  description: z.string().trim().max(COACH_PLAN_LIMITS.DESCRIPTION_MAX).default(""),
  goal: z.enum(COACH_WORKOUT_GOALS, { message: "هدف برنامه معتبر نیست" }),
  difficulty: z.enum(COACH_DIFFICULTIES, { message: "سطح دشواری معتبر نیست" }),
  durationMinutes: intField("مدت جلسه نامعتبر است").refine(
    (v) => v >= COACH_PLAN_LIMITS.DURATION_MINUTES_MIN && v <= COACH_PLAN_LIMITS.DURATION_MINUTES_MAX,
    { message: "مدت جلسه باید بین ۱۰ تا ۳۰۰ دقیقه باشد" }
  ),
  days: z
    .array(workoutDayInput)
    .min(1, "برنامه حداقل یک روز تمرین نیاز دارد")
    .max(COACH_PLAN_LIMITS.WORKOUT_DAYS_MAX, `حداکثر ${COACH_PLAN_LIMITS.WORKOUT_DAYS_MAX} روز مجاز است`),
});

export type CreateCoachWorkoutPlanInput = z.infer<typeof createCoachWorkoutPlanSchema>;

/* ------------------------------ شِمای ورودی غذایی ------------------------------ */

const FOOD_IDS = FOOD_BANK.map((f) => f.id) as [string, ...string[]];

const mealItemInput = z.object({
  foodId: z.string({ message: "شناسه غذا معتبر نیست" }).trim().min(1).max(64),
  unit: z.enum(["g", "serving"], { message: "واحد مقدار معتبر نیست" }),
  amount: z.number({ message: "مقدار نامعتبر است" }).refine((v) => Number.isFinite(v) && v > 0, {
    message: "مقدار باید عددی مثبت باشد",
  }),
});

const mealInput = z.object({
  type: z.enum(COACH_MEAL_TYPES, { message: "نوع وعده معتبر نیست" }),
  items: z
    .array(mealItemInput)
    .min(1, "هر وعده حداقل یک ماده غذایی نیاز دارد")
    .max(COACH_PLAN_LIMITS.ITEMS_PER_MEAL_MAX, `حداکثر ${COACH_PLAN_LIMITS.ITEMS_PER_MEAL_MAX} ماده در هر وعده مجاز است`),
});

const nutritionDayInput = z.object({
  meals: z
    .array(mealInput)
    .min(1, "هر روز حداقل یک وعده نیاز دارد")
    .max(COACH_PLAN_LIMITS.MEALS_PER_DAY_MAX, `حداکثر ${COACH_PLAN_LIMITS.MEALS_PER_DAY_MAX} وعده در هر روز مجاز است`),
});

export const createCoachNutritionPlanSchema = z
  .object({
    title: z.string().trim().min(COACH_PLAN_LIMITS.TITLE_MIN, "عنوان حداقل ۲ کاراکتر است").max(COACH_PLAN_LIMITS.TITLE_MAX),
    description: z.string().trim().max(COACH_PLAN_LIMITS.DESCRIPTION_MAX).default(""),
    goal: z.enum(COACH_NUTRITION_GOALS, { message: "هدف برنامه معتبر نیست" }),
    durationDays: intField("بازه زمانی نامعتبر است").refine(
      (v) => v >= 1 && v <= COACH_PLAN_LIMITS.NUTRITION_DAYS_MAX,
      { message: "بازه زمانی باید بین ۱ تا ۷ روز باشد" }
    ),
    days: z
      .array(nutritionDayInput)
      .min(1, "برنامه حداقل یک روز نیاز دارد")
      .max(COACH_PLAN_LIMITS.NUTRITION_DAYS_MAX, `حداکثر ${COACH_PLAN_LIMITS.NUTRITION_DAYS_MAX} روز مجاز است`),
  })
  .refine((v) => v.days.length === v.durationDays, {
    message: "تعداد روزهای برنامه باید با بازه زمانی انتخابی برابر باشد",
  });

export type CreateCoachNutritionPlanInput = z.infer<typeof createCoachNutritionPlanSchema>;

/* ------------------------------ سازنده محتوای تمرینی ------------------------------ */

/**
 * ساخت snapshot محتوای تمرینی از ورودی مربی — نام‌ها فقط از بانکهای زنده؛
 * شناسه ناموجود کل برنامه را رد میکند (بدون اختراع داده).
 *
 * دو منبع (مرحله ۱۹.۶):
 *  - بانک عمومی: شناسه خام (مثل pullup) — همان رفتار قبلی، عیناً.
 *  - بانک شخصی مربی: شناسه با پیشوند cex- — فقط حرکت خود مربی؛ بدون
 *    نگاشت سه‌بعدی (coach3dId همیشه null — صادقانه).
 */
export async function buildWorkoutContent(
  coachId: string,
  input: CreateCoachWorkoutPlanInput
): Promise<CoachWorkoutContent> {
  await ensureExerciseBank();
  const personalCache = new Map<string, Awaited<ReturnType<typeof getPersonalExerciseForPlan>>>();
  const days: CoachPlanDayContent[] = [];
  for (let dayIndex = 0; dayIndex < input.days.length; dayIndex += 1) {
    const day = input.days[dayIndex];
    const exercises: CoachPlanExerciseContent[] = [];
    for (let exIndex = 0; exIndex < day.exercises.length; exIndex += 1) {
      const ex = day.exercises[exIndex];
      let card: { id: string; fa: string; en: string; category: string } | null;
      let coach3dId: string | null = null;
      let source: "public" | "personal" = "public";
      if (ex.exerciseId.startsWith(PERSONAL_EXERCISE_PREFIX)) {
        const personalId = ex.exerciseId.slice(PERSONAL_EXERCISE_PREFIX.length);
        let personal = personalCache.get(personalId);
        if (personal === undefined) {
          personal = await getPersonalExerciseForPlan(coachId, personalId);
          personalCache.set(personalId, personal);
        }
        card = personal;
        source = "personal";
      } else {
        const bank = getExerciseCardById(ex.exerciseId);
        card = bank
          ? { id: bank.id, fa: bank.fa, en: bank.en, category: bank.category }
          : null;
        coach3dId = bank?.coach3dId ?? null;
      }
      if (!card) {
        throw new CoachingError(422, "EXERCISE_NOT_IN_BANK");
      }
      exercises.push({
        order: exIndex + 1,
        exerciseId: card.id,
        faName: card.fa,
        enName: card.en,
        category: card.category,
        coach3dId,
        source,
        sets: ex.sets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        restSeconds: ex.restSeconds,
        estimatedMinutes: estimateExerciseMinutes(ex.sets, ex.restSeconds),
        note: ex.note && ex.note.length > 0 ? ex.note : null,
        suggestedWeightKg:
          typeof ex.suggestedWeightKg === "number" && ex.suggestedWeightKg > 0
            ? ex.suggestedWeightKg
            : null,
      });
    }
    const estMinutes =
      WARMUP_MINUTES + exercises.reduce((sum, ex) => sum + ex.estimatedMinutes, 0);
    days.push({
      order: dayIndex + 1,
      title: day.title,
      estMinutes,
      exercises,
    });
  }
  return { days };
}

/* ------------------------------ سازنده محتوای غذایی ------------------------------ */

function buildMealItem(
  item: z.infer<typeof mealItemInput>,
  order: number
): CoachMealItemContent {
  const food = findFood(item.foodId);
  if (!food) {
    throw new CoachingError(422, "FOOD_NOT_IN_BANK");
  }
  let grams: number;
  if (item.unit === "g") {
    grams = Math.round(item.amount);
    if (grams < COACH_PLAN_LIMITS.GRAMS_MIN || grams > COACH_PLAN_LIMITS.GRAMS_MAX) {
      throw new CoachingError(422, "AMOUNT_OUT_OF_RANGE");
    }
  } else {
    if (
      item.amount < COACH_PLAN_LIMITS.SERVINGS_MIN ||
      item.amount > COACH_PLAN_LIMITS.SERVINGS_MAX
    ) {
      throw new CoachingError(422, "AMOUNT_OUT_OF_RANGE");
    }
    grams = Math.round(item.amount * food.servingGrams);
    if (grams < COACH_PLAN_LIMITS.GRAMS_MIN) {
      throw new CoachingError(422, "AMOUNT_OUT_OF_RANGE");
    }
  }
  // سقف منطقی سهم بانک برای یک وعده — حفظ محدودیت‌های ایمنی موجود
  const maxGrams = Math.min(food.maxGrams ?? COACH_PLAN_LIMITS.GRAMS_MAX, COACH_PLAN_LIMITS.GRAMS_MAX);
  if (grams > maxGrams) {
    throw new CoachingError(422, "AMOUNT_OUT_OF_RANGE");
  }
  const macros = macrosForGrams(food, grams);
  return {
    order,
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

/** ساخت snapshot محتوای غذایی — همه مقادیر تغذیه‌ای سمت سرور محاسبه می‌شوند */
export function buildNutritionContent(input: CreateCoachNutritionPlanInput): CoachNutritionContent {
  const days: CoachNutritionDayContent[] = input.days.map((day, dayIndex) => {
    const meals: CoachMealContent[] = day.meals.map((meal, mealIndex) => {
      const items = meal.items.map((item, itemIndex) => buildMealItem(item, itemIndex + 1));
      const totals = items.reduce(
        (acc, it) => ({
          kcal: acc.kcal + it.kcal,
          protein: Math.round((acc.protein + it.protein) * 10) / 10,
          carb: Math.round((acc.carb + it.carb) * 10) / 10,
          fat: Math.round((acc.fat + it.fat) * 10) / 10,
        }),
        { kcal: 0, protein: 0, carb: 0, fat: 0 }
      );
      return {
        order: mealIndex + 1,
        type: meal.type,
        kcal: totals.kcal,
        protein: totals.protein,
        carb: totals.carb,
        fat: totals.fat,
        items,
      };
    });
    const dayTotals = meals.reduce(
      (acc, m) => ({
        kcal: acc.kcal + m.kcal,
        protein: Math.round((acc.protein + m.protein) * 10) / 10,
        carb: Math.round((acc.carb + m.carb) * 10) / 10,
        fat: Math.round((acc.fat + m.fat) * 10) / 10,
      }),
      { kcal: 0, protein: 0, carb: 0, fat: 0 }
    );
    return {
      order: dayIndex + 1,
      kcal: dayTotals.kcal,
      protein: dayTotals.protein,
      carb: dayTotals.carb,
      fat: dayTotals.fat,
      meals,
    };
  });
  return { days };
}

/* ------------------------------ ابزار مشترک ------------------------------ */

/** خواندن امن محتوای ذخیره‌شده — داده خراب هرگز کل مسیر را نمی‌شکند */
export function parseWorkoutContent(json: string): CoachWorkoutContent {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as CoachWorkoutContent).days)) {
      return parsed as CoachWorkoutContent;
    }
  } catch {
    // داده خراب — خالی و صادقانه
  }
  return { days: [] };
}

export function parseNutritionContent(json: string): CoachNutritionContent {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object" && Array.isArray((parsed as CoachNutritionContent).days)) {
      return parsed as CoachNutritionContent;
    }
  } catch {
    // داده خراب — خالی و صادقانه
  }
  return { days: [] };
}

export function parsePlanMeta(json: string): CoachPlanMeta {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object") {
      return parsed as CoachPlanMeta;
    }
  } catch {
    // داده خراب — خالی و صادقانه
  }
  return { daysCount: 0 };
}

/** اثر انگشت محتوا برای جلوگیری از ارسال مجدد بدون تغییر */
export function contentHashOf(content: unknown): string {
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

/** عضلات اصلی حرکت برای snapshot جلسه — از بانک زنده؛ نبود یعنی آرایه خالی */
export function primaryMusclesOf(exerciseId: string): MuscleGroupId[] {
  const card = getExerciseCardById(exerciseId);
  if (!card) return [];
  // فقط گروه‌های سه‌بعدی (۱۲ گروه) به snapshot جلسه می‌روند؛ گروه‌های
  // کتابخانه‌ای (مرحله ۱۸) Mesh سه‌بعدی ندارند و صادقانه حذف می‌شوند
  return card.primaryMuscles.filter((m): m is MuscleGroupId =>
    ["chest", "shoulders", "biceps", "triceps", "forearms", "abs", "back", "traps", "glutes", "quads", "hamstrings", "calves"].includes(m)
  );
}
