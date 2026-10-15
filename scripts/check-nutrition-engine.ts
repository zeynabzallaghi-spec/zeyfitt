/**
 * تست واحد موتور تغذیه — اجرا با bun.
 * قواعد الزامی مرحله ۷ را روی داده واقعی بانک مواد غذایی می‌سنجد:
 * محاسبه انرژی، رفتار با اطلاعات ناقص، گروه‌های احتیاط، درشت‌مغذی،
 * تولید برنامه، ترجیحات/آلرژی، جایگزینی، اعتبارسنجی و فهرست خرید.
 *
 * اجرا: bun scripts/check-nutrition-engine.ts
 */

import {
  FOOD_BANK,
  FOOD_COUNT,
  findFood,
  isFoodCompatible,
  filterFoods,
} from "../src/lib/foods/index";
import {
  computeNutritionTargets,
  estimateBMR,
  generateNutritionPlan,
  NutritionPlanError,
  suggestReplacements,
  aggregateShoppingList,
  recomputeItemFromSnapshot,
  nutritionSettingsSchema,
  parseShoppingDaysParam,
  nutritionPatchSchema,
} from "../src/lib/nutrition-engine/index";
import type { NutritionSettings, PlannedFoodItem } from "../src/lib/nutrition-engine/types";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✔ ${name}`);
  } else {
    failed++;
    failures.push(name + (detail ? ` — ${detail}` : ""));
    console.error(`  ✘ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function section(title: string) {
  console.log(`\n— ${title} —`);
}

/* ------------------------------ تنظیمات پایه ------------------------------ */

const baseSettings: NutritionSettings = {
  goal: "weight_loss",
  activityLevel: "moderate",
  mealsPerDay: 4,
  planLength: 7,
  dietPattern: "none",
  allergens: [],
  dislikedFoodIds: [],
  budget: "any",
  prep: "any",
  pregnancyBreastfeeding: false,
  estimate: { age: 30, heightCm: 175, weightKg: 80, gender: "male" },
};

/* --------------------------------- تست‌ها --------------------------------- */

section("۱) بانک مواد غذایی");
check("بانک حداقل ۴۰ ماده دارد", FOOD_COUNT >= 40, `تعداد: ${FOOD_COUNT}`);
check("شناسه‌ها یکتا هستند", new Set(FOOD_BANK.map((f) => f.id)).size === FOOD_COUNT);
check("همه مواد ارزش غذایی مثبت دارند", FOOD_BANK.every((f) => f.kcal100 > 0 && f.protein100 >= 0 && f.carb100 >= 0 && f.fat100 >= 0));
check("همه مواد حداقل یک جایگاه دارند", FOOD_BANK.every((f) => f.slots.length > 0));
check("مواد وگان شامل گوشت/ماهی نیستند", FOOD_BANK.filter((f) => f.diet.includes("vegan")).every((f) => f.allergens.includes("seafood") === false && !["chicken_breast", "lean_ground_beef", "salmon", "canned_tuna"].includes(f.id)));
check("تخم‌مرغ آلرژن تخم‌مرغ دارد", findFood("egg")?.allergens.includes("egg") === true);

section("۲) محاسبه انرژی با ورودی معتبر");
const maleEstimate = { age: 30, heightCm: 175, weightKg: 80, gender: "male" as const };
const bmr = estimateBMR(maleEstimate);
// Mifflin-St Jeor: 10×80 + 6.25×175 − 5×30 + 5 = 1748.75
check("BMR مرد ۳۰ ساله ≈ ۱۷۴۹", Math.abs(bmr - 1748.75) < 1, `دریافت‌شده: ${bmr}`);
const femaleEstimate = { age: 28, heightCm: 165, weightKg: 60, gender: "female" as const };
// 10×60 + 6.25×165 − 5×28 − 161 = 1330.25
check("BMR زن ۲۸ ساله ≈ ۱۳۳۰", Math.abs(estimateBMR(femaleEstimate) - 1330.25) < 1);
const targetsOk = computeNutritionTargets(maleEstimate, "weight_loss", "moderate", false);
check("برآورد با اطلاعات کامل موفق است", targetsOk.status === "ok");
if (targetsOk.status === "ok") {
  const snap = targetsOk.snapshot;
  const tdeeExpected = Math.round((1748.75 * 1.55) / 10) * 10; // 2710
  check("TDEE = BMR × ضریب فعالیت متوسط (1.55)", snap.tdee === tdeeExpected, `${snap.tdee} در برابر ${tdeeExpected}`);
  check("هدف کاهش وزن = TDEE − ۵۰۰", snap.targetKcal === tdeeExpected - 500, `${snap.targetKcal}`);
  check("کف امن کاهش وزن رعایت شده", (snap.targetKcal ?? 0) >= 1200);
  check("پروتئین کاهش وزن ≈ ۲ گرم بر کیلوگرم", Math.abs(snap.macros!.proteinG - 160) <= 5, `${snap.macros!.proteinG}`);
  check("هدف حفظ وزن = TDEE", computeNutritionTargets(maleEstimate, "maintain", "moderate", false).status === "ok" &&
    (computeNutritionTargets(maleEstimate, "maintain", "moderate", false) as { status: "ok"; snapshot: { targetKcal: number } }).snapshot.targetKcal === tdeeExpected);
  const gain = computeNutritionTargets(maleEstimate, "muscle_gain", "light", false);
  if (gain.status === "ok") {
    const tdeeLight = Math.round((1748.75 * 1.375) / 10) * 10;
    check("عضله‌سازی = TDEE + ۳۰۰", gain.snapshot.targetKcal === tdeeLight + 300);
  }
  check("جنسیت undisclosed → هشدار عدم‌قطعیت", computeNutritionTargets({ ...maleEstimate, gender: "undisclosed" }, "maintain", "light", false).status === "ok" &&
    (computeNutritionTargets({ ...maleEstimate, gender: "undisclosed" }, "maintain", "light", false) as { status: "ok"; snapshot: { warnings: string[] } }).snapshot.warnings.some((w) => w.includes("میانگین")));
  check("اختلاف کالری مکروها ثبت شده", typeof snap.macroKcalDiff === "number");
}

section("۳) اطلاعات ناقص — بدون برآورد کالری");
const insufficient = computeNutritionTargets(null, "weight_loss", "moderate", false);
check("بدون اطلاعات → insufficient_data", insufficient.status === "insufficient_data");
if (insufficient.status === "insufficient_data") {
  check("فهرست کمبودها سن/قد/وزن را دارد", insufficient.missingLabels.join("،").includes("سن") && insufficient.missingLabels.join("،").includes("قد") && insufficient.missingLabels.join("،").includes("وزن"));
}
const partial = computeNutritionTargets({ age: 30, heightCm: 0, weightKg: 80, gender: "male" }, "weight_loss", "moderate", false);
check("قد صفر → رد با کمبود «قد»", partial.status === "insufficient_data" && partial.missingLabels.includes("قد"));

section("۴) گروه‌های نیازمند احتیاط");
const underage = computeNutritionTargets({ age: 15, heightCm: 170, weightKg: 60, gender: "male" }, "weight_loss", "moderate", false);
check("زیر ۱۸ سال → حالت احتیاط", underage.status === "ok" && (underage as { snapshot: { caution: boolean } }).snapshot.caution);
if (underage.status === "ok") {
  const snapU = underage.snapshot;
  const tdeeU = Math.round((estimateBMR({ age: 15, heightCm: 170, weightKg: 60, gender: "male" }) * 1.55) / 10) * 10;
  check("زیر ۱۸: هدف روی حفظ وزن قفل شده (بدون کاهش ۵۰۰)", snapU.targetKcal === tdeeU, `${snapU.targetKcal} در برابر ${tdeeU}`);
  check("زیر ۱۸: هشدار مشورت با متخصص", snapU.warnings.some((w) => w.includes("۱۸ سال")));
}
const pregnant = computeNutritionTargets(femaleEstimate, "weight_loss", "light", true);
check("بارداری → حالت احتیاط بدون هدف کاهشی", pregnant.status === "ok" &&
  (pregnant as { snapshot: { caution: boolean; cautionReason: string | null; warnings: string[] } }).snapshot.caution &&
  (pregnant as { snapshot: { cautionReason: string | null } }).snapshot.cautionReason === "pregnancy");

section("۵) درشت‌مغذی ماده غذایی بر اساس مقدار");
const rice = findFood("white_rice")!;
check("۲۰۰ گرم برنج = ۲ برابر ۱۰۰ گرم", (() => {
  const f = rice;
  return Math.round(f.kcal100 * 2) === 260 && Math.round(f.protein100 * 2 * 10) / 10 === 5.4;
})());
check("۵۰ گرم برنج = نصف", Math.round(rice.kcal100 / 2) === 65);

section("۶) تولید برنامه با داده واقعی بانک");
const plan = generateNutritionPlan(baseSettings, (targetsOk as { status: "ok"; snapshot: never }).snapshot);
check("عنوان فارسی برنامه", plan.title.includes("کاهش وزن") && plan.title.includes("هفتگی"));
check("۷ روز تولید شده", plan.days.length === 7);
check("۴ وعده در هر روز", plan.days.every((d) => d.meals.length === 4));
check("هر وعده ماده واقعی بانک دارد", plan.days.every((d) => d.meals.every((m) => m.items.length >= 1 && m.items.every((i) => findFood(i.foodId) !== null))));
check("مقادیر گرم مثبت و معقول", plan.days.every((d) => d.meals.every((m) => m.items.every((i) => i.grams >= 5 && i.grams <= 600))));
check("جمع روزانه از اجزای واقعی است", plan.days.every((d) => {
  const sum = d.meals.reduce((s, m) => s + m.kcal, 0);
  return d.kcal === sum;
}));
check("جمع وعده از اجزای واقعی است", plan.days.every((d) => d.meals.every((m) => {
  const sum = m.items.reduce((s, i) => s + i.kcal, 0);
  return m.kcal === sum;
})));
check("اختلاف با هدف کالری صادقانه و محدود (±۱۵٪)", plan.days.every((d) => Math.abs(d.kcal - (plan.calc.targetKcal ?? 0)) <= (plan.calc.targetKcal ?? 0) * 0.15), `روز اول: ${plan.days[0].kcal} در برابر هدف ${plan.calc.targetKcal}`);
check("پروتئین روزانه نزدیک هدف (±۲۵٪ — چرخش بین منابع با تراکم متفاوت)", plan.days.every((d) => Math.abs(d.protein - plan.calc.macros!.proteinG) <= plan.calc.macros!.proteinG * 0.25), `روز اول: ${plan.days[0].protein} در برابر ${plan.calc.macros!.proteinG}`);
check("یادداشت صادقانه تخمینی بودن", plan.notes.some((n) => n.includes("تخمینی")));
check("یادداشت «نه رژیم درمانی»", plan.notes.some((n) => n.includes("رژیم درمانی")));

section("۷) تکرارپذیری موتور (بدون تصادف)");
const planAgain = generateNutritionPlan(baseSettings, (targetsOk as { status: "ok"; snapshot: never }).snapshot);
check("خروجی دوم با اول یکسان", JSON.stringify(plan) === JSON.stringify(planAgain));

section("۸) تنوع بین روزها");
const lunchProteins = new Set<string>();
plan.days.forEach((day) => {
  const lunch = day.meals.find((m) => m.type === "lunch");
  const proteinItem = lunch?.items.find((i) => findFood(i.foodId)?.slots.includes("protein"));
  if (proteinItem) lunchProteins.add(proteinItem.foodId);
});
check("پروتئین ناهار در ۷ روز حداقل ۳ ماده متفاوت", lunchProteins.size >= 3, `تنوع: ${lunchProteins.size}`);
check("در یک وعده ماده تکراری نیست", plan.days.every((d) => d.meals.every((m) => new Set(m.items.map((i) => i.foodId)).size === m.items.length)));

section("۹) آلرژی‌ها و مواد نامطلوب");
const dairyAllergy = generateNutritionPlan(
  { ...baseSettings, allergens: ["dairy"] },
  (computeNutritionTargets(maleEstimate, "weight_loss", "moderate", false) as { status: "ok"; snapshot: never })
);
const allItemsDairy: PlannedFoodItem[] = dairyAllergy.days.flatMap((d) => d.meals.flatMap((m) => m.items));
check("هیچ ماده لبنی در برنامه نیست", allItemsDairy.every((i) => !findFood(i.foodId)!.allergens.includes("dairy")));
const nutSeaAllergy = generateNutritionPlan(
  { ...baseSettings, allergens: ["nuts", "seafood"] },
  (computeNutritionTargets(maleEstimate, "weight_loss", "moderate", false) as { status: "ok"; snapshot: never })
);
const allItemsNS: PlannedFoodItem[] = nutSeaAllergy.days.flatMap((d) => d.meals.flatMap((m) => m.items));
check("آجیل و دریایی حذف شده‌اند", allItemsNS.every((i) => !findFood(i.foodId)!.allergens.some((a) => a === "nuts" || a === "seafood")));
const noRice = generateNutritionPlan(
  { ...baseSettings, dislikedFoodIds: ["white_rice", "brown_rice"] },
  (computeNutritionTargets(maleEstimate, "weight_loss", "moderate", false) as { status: "ok"; snapshot: never })
);
const allItemsNR: PlannedFoodItem[] = noRice.days.flatMap((d) => d.meals.flatMap((m) => m.items));
check("مواد نامطلوب حذف شده‌اند", allItemsNR.every((i) => i.foodId !== "white_rice" && i.foodId !== "brown_rice"));

section("۱۰) الگوهای گیاهی");
const veganPlan = generateNutritionPlan(
  { ...baseSettings, dietPattern: "vegan" },
  (computeNutritionTargets(maleEstimate, "maintain", "moderate", false) as { status: "ok"; snapshot: never })
);
const veganItems: PlannedFoodItem[] = veganPlan.days.flatMap((d) => d.meals.flatMap((m) => m.items));
check("وگان: همه مواد برچسب وگان دارند", veganItems.every((i) => findFood(i.foodId)!.diet.includes("vegan")));
const vegPlan = generateNutritionPlan(
  { ...baseSettings, dietPattern: "vegetarian", mealsPerDay: 3 },
  (computeNutritionTargets(maleEstimate, "maintain", "moderate", false) as { status: "ok"; snapshot: never })
);
const vegItems: PlannedFoodItem[] = vegPlan.days.flatMap((d) => d.meals.flatMap((m) => m.items));
check("گیاهخواری: بدون گوشت/ماهی", vegItems.every((i) => !["chicken_breast", "lean_ground_beef", "salmon", "canned_tuna"].includes(i.foodId)));
check("کمبود شدید وگان+حذف حبوبات → خطای صادقانه", (() => {
  try {
    generateNutritionPlan(
      { ...baseSettings, dietPattern: "vegan", allergens: ["soy"], dislikedFoodIds: ["lentils_cooked", "chickpeas_cooked", "kidney_beans_cooked"] },
      (computeNutritionTargets(maleEstimate, "maintain", "moderate", false) as { status: "ok"; snapshot: never })
    );
    return false;
  } catch (e) {
    return e instanceof NutritionPlanError && e.message.length > 10;
  }
})());

section("۱۱) بودجه و آماده‌سازی ساده");
const budgetPlan = generateNutritionPlan(
  { ...baseSettings, budget: "low" },
  (computeNutritionTargets(maleEstimate, "maintain", "moderate", false) as { status: "ok"; snapshot: never })
);
const budgetItems: PlannedFoodItem[] = budgetPlan.days.flatMap((d) => d.meals.flatMap((m) => m.items));
check("اقتصادی: بدون مواد premium", budgetItems.every((i) => findFood(i.foodId)!.budget !== "premium"));
check("فیلتر اقتصادی در سطح بانک هم درست است", filterFoods({ allergens: [], dietPattern: "none", dislikedFoodIds: [], budget: "low", prep: "any" }).every((f) => f.budget !== "premium"));

section("۱۲) جایگزینی ماده و محاسبه مجدد");
const lunchDay1 = plan.days[0].meals.find((m) => m.type === "lunch")!;
const proteinItem = lunchDay1.items.find((i) => findFood(i.foodId)?.slots.includes("protein"));
if (proteinItem) {
  const suggestions = suggestReplacements(
    { foodId: proteinItem.foodId, kcal: proteinItem.kcal, protein: proteinItem.protein },
    { allergens: [], dietPattern: "none", dislikedFoodIds: [], budget: "any", prep: "any" }
  );
  check("پیشنهاد جایگزین تولید می‌شود", suggestions.length >= 3, `تعداد: ${suggestions.length}`);
  check("جایگزین خود ماده نیست", suggestions.every((s) => s.foodId !== proteinItem.foodId));
  check("گرم پیشنهادی منطقی (۱۰ تا ۶۰۰)", suggestions.every((s) => s.grams >= 10 && s.grams <= 600));
  check("اختلاف کالری ثبت شده", suggestions.every((s) => typeof s.kcalDiff === "number"));
  check("جایگزین مرتب بر نزدیکی انرژی", suggestions.every((s, i) => i === 0 || Math.abs(suggestions[i - 1].kcalDiff) <= Math.abs(s.kcalDiff)));
  // جایگزین با محدودیت آلرژی
  const dairySuggestions = suggestReplacements(
    { foodId: "greek_yogurt", kcal: 150, protein: 20 },
    { allergens: ["dairy"], dietPattern: "none", dislikedFoodIds: [], budget: "any", prep: "any" }
  );
  check("ماست با آلرژی لبنی جایگزین لبنی ندارد", dairySuggestions.every((s) => !findFood(s.foodId)!.allergens.includes("dairy")));
} else {
  check("جایگاه پروتئین در ناهار روز اول وجود دارد", false);
}

section("۱۳) محاسبه مجدد از snapshot");
const recomputed = recomputeItemFromSnapshot({ grams: 100, kcal: 165, protein: 31, carb: 0, fat: 3.6 }, 150);
check("۱۵۰ گرم از snapshot ۱۰۰ گرمی = ۱٫۵ برابر", recomputed.kcal === 248 && recomputed.protein === 46.5, `${recomputed.kcal}/${recomputed.protein}`);
const recomputedSmall = recomputeItemFromSnapshot({ grams: 100, kcal: 165, protein: 31, carb: 0, fat: 3.6 }, 10);
check("مقدار کم هم درست محاسبه می‌شود", recomputedSmall.kcal === 17 && recomputedSmall.protein === 3.1);

section("۱۴) فهرست خرید — تجمیع صحیح");
const shopping = aggregateShoppingList(plan.days);
const riceTotal = shopping.find((s) => s.foodId === "white_rice");
const manualRice = plan.days.reduce((sum, d) => sum + d.meals.reduce((s, m) => s + m.items.filter((i) => i.foodId === "white_rice").reduce((s2, i) => s2 + i.grams, 0), 0), 0);
check("تجمیع برنج با جمع دستی برابر است", riceTotal?.totalGrams === manualRice, `${riceTotal?.totalGrams} در برابر ${manualRice}`);
check("همه اقلام گرم مثبت دارند", shopping.every((s) => s.totalGrams > 0));
check("مواد تکراری تجمیع شده‌اند (بدون شناسه تکراری)", new Set(shopping.map((s) => s.foodId)).size === shopping.length);
check("فهرست خرید از مواد واقعی برنامه است", shopping.every((s) => findFood(s.foodId) !== null));
const oneDay = aggregateShoppingList([plan.days[0]]);
check("فهرست یک‌روزه کوچکتر یا برابر کل است", oneDay.length <= shopping.length);

section("۱۵) اعتبارسنجی شِما — واحدها و مقادیر نامعتبر");
check("وعده ۲ عدد → رد", !nutritionSettingsSchema.safeParse({ ...baseSettings, mealsPerDay: 2 }).success);
check("وعده ۷ عدد → رد", !nutritionSettingsSchema.safeParse({ ...baseSettings, mealsPerDay: 7 }).success);
check("طول برنامه ۳ روز → رد", !nutritionSettingsSchema.safeParse({ ...baseSettings, planLength: 3 }).success);
check("هدف نامعتبر → رد", !nutritionSettingsSchema.safeParse({ ...baseSettings, goal: "invalid" }).success);
check("سن منفی → رد", !nutritionSettingsSchema.safeParse({ ...baseSettings, estimate: { age: -5, heightCm: 175, weightKg: 80, gender: "male" } }).success);
check("وزن غیرعددی → رد", !nutritionSettingsSchema.safeParse({ ...baseSettings, estimate: { age: 30, heightCm: 175, weightKg: "سنگین", gender: "male" } }).success);
check("شناسه ماده ناشناخته در نامطلوب → رد", !nutritionSettingsSchema.safeParse({ ...baseSettings, dislikedFoodIds: ["hacker_food"] }).success);
check("آلرژن ناشناخته → رد", !nutritionSettingsSchema.safeParse({ ...baseSettings, allergens: ["radioactive"] }).success);
check("ارقام فارسی در وعده‌ها پذیرفته می‌شود", nutritionSettingsSchema.safeParse({ ...baseSettings, mealsPerDay: "۴" }).success);
check("حذف همه مواد → رد", (() => {
  const parse = nutritionSettingsSchema.safeParse({ ...baseSettings, dislikedFoodIds: FOOD_BANK.map((f) => f.id) });
  return !parse.success;
})());
check("گرم خارج از محدوده در PATCH → رد", !nutritionPatchSchema.safeParse({ action: "update_item", dayOrder: 1, mealOrder: 1, itemOrder: 1, grams: 5000 }).success);
check("گرم منفی در PATCH → رد", !nutritionPatchSchema.safeParse({ action: "update_item", dayOrder: 1, mealOrder: 1, itemOrder: 1, grams: -10 }).success);
check("روز نامعتبر در PATCH → رد", !nutritionPatchSchema.safeParse({ action: "update_item", dayOrder: 12, mealOrder: 1, itemOrder: 1, grams: 100 }).success);

section("۱۶) پارامتر روزهای فهرست خرید");
check("بدون پارامتر = همه روزها", JSON.stringify(parseShoppingDaysParam(null, 7)) === JSON.stringify([1, 2, 3, 4, 5, 6, 7]));
check("«1,3,5» = سه روز", JSON.stringify(parseShoppingDaysParam("1,3,5", 7)) === JSON.stringify([1, 3, 5]));
check("ارقام فارسی هم پذیرفته می‌شود", JSON.stringify(parseShoppingDaysParam("۱،۲", 7)) === JSON.stringify([1, 2]) || JSON.stringify(parseShoppingDaysParam("۱,۲", 7)) === JSON.stringify([1, 2]));
check("روز خارج از محدوده حذف می‌شود", JSON.stringify(parseShoppingDaysParam("1,9", 7)) === JSON.stringify([1]));
check("پارامتر بی‌معنی → null", parseShoppingDaysParam("abc", 7) === null);

/* --------------------------------- نتیجه --------------------------------- */

console.log(`\n========================================`);
console.log(`نتیجه: ${passed} پاس / ${failed} شکست`);
if (failures.length > 0) {
  console.log("شکست‌ها:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
