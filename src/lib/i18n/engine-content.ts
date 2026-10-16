/**
 * نمایش محتوای تولیدشده موتورها به زبان فعلی رابط — بدون بازنویسی داده.
 *
 * اصل: متن‌های ذخیره‌شده (عنوان برنامه، عنوان روز، یادداشت‌ها، هشدارهای
 * محاسباتی) هرگز تغییر نمی‌کنند؛ این ماژول فقط «نمایش» را بر اساس زبان
 * رابط انتخاب می‌کند:
 *  - متن‌های بسته و شناخته‌شده موتور → نگاشت دقیق fa↔en (رفتار فعلی در fa
 *    عیناً حفظ می‌شود: متن ذخیره‌شده عیناً نمایش داده می‌شود)
 *  - الگوهای ترکیبی (عنوان هدف+روزها، تمرکز دسته، اختلاف مکرو) → تجزیه با
 *    الگوی شناخته‌شده هر دو زبان و بازسازی
 *  - متن ناشناخته → همان متن ذخیره‌شده (fallback صادقانه؛ هرگز حذف نمی‌شود)
 *
 * این ماژول خالص و بدون «use client» است تا در سرور هم قابل تست باشد.
 */

import type { Locale } from "./shared";
import { EXERCISE_CATEGORIES } from "@/lib/exercises/types";
import type { PlanGoal, PlanFocus } from "@/lib/plan-engine/types";
import { PLAN_GOAL_LABELS, PLAN_GOAL_LABELS_EN, PLAN_FOCUS_LABELS } from "@/lib/plan-engine/types";
import type { MealType } from "@/lib/nutrition-engine/types";
import { MEAL_TYPE_LABELS, MEAL_TYPE_LABELS_EN, NUTRITION_GOAL_LABELS, NUTRITION_GOAL_LABELS_EN } from "@/lib/nutrition-engine/types";

type Bi = { fa: string; en: string };

/* ------------------------------- برنامه تمرینی ------------------------------- */

/** عنوان برنامه از فیلدهای ساختاریافته ذخیره‌شده — مستقل از متن ذخیره‌شده */
export function planTitleFromFields(
  goal: string,
  daysPerWeek: number,
  focus: string,
  locale: Locale
): string {
  const en = locale === "en";
  const goalLabel =
    (en ? PLAN_GOAL_LABELS_EN[goal as PlanGoal] : PLAN_GOAL_LABELS[goal as PlanGoal]) ?? null;
  if (!goalLabel) return "";
  const days = en ? String(daysPerWeek) : daysPerWeek.toLocaleString("fa-IR");
  if (focus === "all") {
    return en ? `${goalLabel} — ${days} days/week` : `${goalLabel} — ${days} روز در هفته`;
  }
  const focusLabel = planFocusLabel(focus, locale);
  return en
    ? `${goalLabel} — ${days} days/week (${focusLabel})`
    : `${goalLabel} — ${days} روز در هفته (${focusLabel})`;
}

function planFocusLabel(focus: string, locale: Locale): string {
  const en = locale === "en";
  if (focus === "upper" || focus === "lower" || focus === "all") {
    const label = PLAN_FOCUS_LABELS[focus];
    if (focus === "all") return en ? "Full body" : label;
    return en ? (focus === "upper" ? "Upper body" : "Lower body") : label;
  }
  const category = EXERCISE_CATEGORIES.find((c) => c.id === focus);
  if (category) return en ? category.en : category.fa;
  return focus;
}

/** عناوین قالب روزها — نگاشت دقیق (منبع: presets.ts موتور) */
const DAY_TITLE_MAP: Record<string, Bi> = {
  "پوش — سینه، سرشانه و پشت بازو": { fa: "پوش — سینه، سرشانه و پشت بازو", en: "Push — chest, shoulders & triceps" },
  "پول — پشت و جلو بازو": { fa: "پول — پشت و جلو بازو", en: "Pull — back & biceps" },
  "پایین‌تنه — چهارسر، همسترینگ و ساق": { fa: "پایین‌تنه — چهارسر، همسترینگ و ساق", en: "Lower body — quads, hamstrings & calves" },
  "بالاتنه — سینه و پشت": { fa: "بالاتنه — سینه و پشت", en: "Upper body — chest & back" },
  "بالاتنه — سرشانه و بازو": { fa: "بالاتنه — سرشانه و بازو", en: "Upper body — shoulders & arms" },
  "پایین‌تنه — چهارسر و سرینی": { fa: "پایین‌تنه — چهارسر و سرینی", en: "Lower body — quads & glutes" },
  "پایین‌تنه — همسترینگ و مرکزی": { fa: "پایین‌تنه — همسترینگ و مرکزی", en: "Lower body — hamstrings & core" },
  "بازو، سرشانه و مرکزی": { fa: "بازو، سرشانه و مرکزی", en: "Arms, shoulders & core" },
  "تمام بدن — جلسه اول": { fa: "تمام بدن — جلسه اول", en: "Full body — session 1" },
  "تمام بدن — جلسه دوم": { fa: "تمام بدن — جلسه دوم", en: "Full body — session 2" },
  "تمام بدن — جلسه سوم": { fa: "تمام بدن — جلسه سوم", en: "Full body — session 3" },
};

const FA_FOCUS_WORDS: Record<string, Bi> = {
  "بالاتنه": { fa: "بالاتنه", en: "Upper body" },
  "پایین‌تنه": { fa: "پایین‌تنه", en: "Lower body" },
  "تمام بدن": { fa: "تمام بدن", en: "Full body" },
};

/** برچسب تمرکز روز — متن ذخیره‌شده → زبان رابط */
export function dayFocusLabel(focusLabel: string, locale: Locale): string {
  if (locale === "fa") {
    // در فارسی متن ذخیره‌شده عیناً نمایش داده می‌شود (رفتار قبل)
    return focusLabel;
  }
  if (FA_FOCUS_WORDS[focusLabel]) return FA_FOCUS_WORDS[focusLabel].en;
  const category = EXERCISE_CATEGORIES.find((c) => c.fa === focusLabel);
  if (category) return category.en;
  return focusLabel;
}

/** عنوان روز — نگاشت دقیق یا تجزیه الگوهای ترکیبی */
export function dayTitleLabel(title: string, locale: Locale): string {
  if (locale === "fa") return title;
  if (DAY_TITLE_MAP[title]) return DAY_TITLE_MAP[title].en;

  // الگوی تمرکز دسته: «تمرکز {cat} — جلسه {n}» / «{cat} focus — session {n}»
  const faFocus = title.match(/^تمرکز (.+) — جلسه ([۰-۹0-9]+)$/);
  if (faFocus) {
    const cat = categoryFaToEn(faFocus[1]);
    return `${cat} focus — session ${faFocus[2]}`;
  }
  // الگوی روز مکمل: «{base} (روز مکمل)» / «{base} (supplementary day)»
  const faFill = title.match(/^(.+) \(روز مکمل\)$/);
  if (faFill) {
    const base = DAY_TITLE_MAP[faFill[1]]?.en ?? faFill[1];
    return `${base} (supplementary day)`;
  }
  return title;
}

function categoryFaToEn(fa: string): string {
  const category = EXERCISE_CATEGORIES.find((c) => c.fa === fa);
  return category ? category.en.toLowerCase() : fa;
}

/** یادداشت‌های ثابت موتور تمرینی — نگاشت دقیق */
const PLAN_NOTE_MAP: Record<string, Bi> = {
  "پیشرفت تدریجی: ابتدا اجرای صحیح و کامل بودن بازه تکرار را هدف بگیرید؛ سپس با حفظ فرم، وزنه یا تکرارها را کم‌کم افزایش دهید. سرعت پیشرفت به اجرای صحیح، توانایی فرد و ریکاوری بستگی دارد.":
    {
      fa: "پیشرفت تدریجی: ابتدا اجرای صحیح و کامل بودن بازه تکرار را هدف بگیرید؛ سپس با حفظ فرم، وزنه یا تکرارها را کم‌کم افزایش دهید. سرعت پیشرفت به اجرای صحیح، توانایی فرد و ریکاوری بستگی دارد.",
      en: "Gradual progress: first aim for correct, full-range execution within the rep range; then gradually increase the weight or reps while keeping form. The pace of progress depends on correct execution, individual ability and recovery.",
    },
  "بین جلسات همان گروه عضلانی حداقل یک روز فاصله بگذارید؛ اگر احساس خستگی ماندگار دارید، یک جلسه را سبک‌تر اجرا کنید.":
    {
      fa: "بین جلسات همان گروه عضلانی حداقل یک روز فاصله بگذارید؛ اگر احساس خستگی ماندگار دارید، یک جلسه را سبک‌تر اجرا کنید.",
      en: "Leave at least one day between sessions for the same muscle group; if you feel persistent fatigue, make one session lighter.",
    },
  "این برنامه بر اساس قوانین تمرینی استاندارد ساخته شده است؛ ادعای تضمین نتیجه یا کاهش چربی موضعی ندارد.":
    {
      fa: "این برنامه بر اساس قوانین تمرینی استاندارد ساخته شده است؛ ادعای تضمین نتیجه یا کاهش چربی موضعی ندارد.",
      en: "This plan is built on standard training principles; it makes no claim of guaranteed results or spot fat reduction.",
    },
};

/** یادداشت گرم‌کردن — الگوی عددی (۵ دقیقه؛ هم ارقام فارسی هم لاتین) */
const FA_WARMUP_RE = /^هر جلسه با ([۰-۹0-9]+) دقیقه گرم‌کردن سبک \(حرکات کششی پویا و چند تکرار سبک از حرکت اول جلسه\) شروع شود\.$/;
const FA_LIMITATION_RE = /^یادداشت احتیاطی شما در ساخت برنامه لحاظ شد: «(.+)»\. در صورت درد یا سابقه آسیب، پیش از اجرا با پزشک یا فیزیوتراپیست واجد صلاحیت مشورت کنید\.$/;
const EN_LIMITATION_RE = /^Your precautionary note was considered while building this plan: "(.+)". If you feel pain or have an injury history, consult a qualified physician or physiotherapist before executing\.$/;

/** یادداشت برنامه — نگاشت/تجزیه با حفظ متن کاربر */
const PERSIAN_DIGIT_TO_LATIN: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

function toLatinDigits(text: string): string {
  return text.replace(/[۰-۹]/g, (d) => PERSIAN_DIGIT_TO_LATIN[d] ?? d);
}

export function planNoteLabel(note: string, locale: Locale): string {
  if (locale === "fa") return note;
  if (PLAN_NOTE_MAP[note]) return PLAN_NOTE_MAP[note].en;

  const warmup = note.match(FA_WARMUP_RE);
  if (warmup) {
    return `Start each session with ${toLatinDigits(warmup[1])} minutes of light warm-up (dynamic stretches and a few light reps of the session's first exercise).`;
  }
  const limitation = note.match(FA_LIMITATION_RE);
  if (limitation) {
    return `Your precautionary note was considered while building this plan: "${limitation[1]}". If you feel pain or have an injury history, consult a qualified physician or physiotherapist before executing.`;
  }
  const enLimitation = note.match(EN_LIMITATION_RE);
  if (enLimitation) {
    return note; // متن انگلیسی ذخیره‌شده — عیناً
  }
  return note;
}

/** عنوان جلسه — «تمرین آزاد»/«Free workout» یا عنوان روز برنامه */
export function sessionTitleLabel(title: string, locale: Locale): string {
  if (locale === "en") {
    if (title === "تمرین آزاد") return "Free workout";
    return dayTitleLabel(title, locale);
  }
  if (title === "Free workout") return "تمرین آزاد";
  return title;
}

/* ------------------------------- برنامه غذایی ------------------------------- */

/** عنوان وعده — اولویت با type پایدار ذخیره‌شده؛ fallback به متن دقیق */
export function mealTitleLabel(type: string | null | undefined, title: string, locale: Locale): string {
  const en = locale === "en";
  if (type && type in MEAL_TYPE_LABELS) {
    return en
      ? MEAL_TYPE_LABELS_EN[type as MealType]
      : MEAL_TYPE_LABELS[type as MealType];
  }
  if (en) {
    const entry = Object.entries(MEAL_TYPE_LABELS).find(([, fa]) => fa === title);
    if (entry) return MEAL_TYPE_LABELS_EN[entry[0] as MealType];
    const enEntry = Object.entries(MEAL_TYPE_LABELS_EN).find(([, label]) => label === title);
    if (enEntry) return enEntry[1];
  }
  return title;
}

/** یادداشت‌های ثابت موتور تغذیه — نگاشت دقیق */
const NUTRITION_NOTE_MAP: Record<string, Bi> = {
  "برند، رسیدگی و روش پخت می‌تواند مقدار واقعی انرژی و درشت‌مغذی را تغییر دهد؛ همه اعداد تخمینی‌اند.":
    {
      fa: "برند، رسیدگی و روش پخت می‌تواند مقدار واقعی انرژی و درشت‌مغذی را تغییر دهد؛ همه اعداد تخمینی‌اند.",
      en: "Brand, ripeness and cooking method can change the real energy and macronutrient values; all numbers are estimates.",
    },
  "این برنامه یک پیشنهاد عمومی برنامه‌ریزی غذایی است، نه رژیم درمانی یا نسخه پزشکی. اگر بیماری مرتبط با تغذیه دارید با متخصص مشورت کنید.":
    {
      fa: "این برنامه یک پیشنهاد عمومی برنامه‌ریزی غذایی است، نه رژیم درمانی یا نسخه پزشکی. اگر بیماری مرتبط با تغذیه دارید با متخصص مشورت کنید.",
      en: "This plan is a general meal-planning suggestion, not diet therapy or a medical prescription. If you have a nutrition-related condition, consult a specialist.",
    },
  "مواد گران‌قیمت از فهرست حذف شده‌اند تا هزینه خرید پایین‌تر بماند.":
    {
      fa: "مواد گران‌قیمت از فهرست حذف شده‌اند تا هزینه خرید پایین‌تر بماند.",
      en: "Expensive foods have been removed from the list to keep the shopping cost lower.",
    },
  "مواد دارای آلرژن انتخابی شما از کل برنامه حذف شده‌اند؛ با این حال ترکیبات محصولات آماده می‌تواند متفاوت باشد — پیش از مصرف برچسب محصول را بررسی کنید. ایمنی کامل تضمین نمی‌شود.":
    {
      fa: "مواد دارای آلرژن انتخابی شما از کل برنامه حذف شده‌اند؛ با این حال ترکیبات محصولات آماده می‌تواند متفاوت باشد — پیش از مصرف برچسب محصول را بررسی کنید. ایمنی کامل تضمین نمی‌شود.",
      en: "Foods containing your selected allergens have been removed from the whole plan; however, the composition of packaged products can vary — always check the product label before eating. Complete safety cannot be guaranteed.",
    },
  "برنامه وگان بر پایه حبوبات، سویا، غلات، میوه و سبزیجات بانک طراحی شده است؛ پروتئین روزانه ممکن است به مرز پایین محدوده توصیه‌ای نزدیک باشد.":
    {
      fa: "برنامه وگان بر پایه حبوبات، سویا، غلات، میوه و سبزیجات بانک طراحی شده است؛ پروتئین روزانه ممکن است به مرز پایین محدوده توصیه‌ای نزدیک باشد.",
      en: "The vegan plan is built on legumes, soy, grains, fruit and vegetables from the food bank; daily protein may approach the lower edge of the recommended range.",
    },
  "برنامه گیاهی شامل لبنیات و تخم‌مرغ است؛ گوشت و ماهی در هیچ وعده‌ای نیامده است.":
    {
      fa: "برنامه گیاهی شامل لبنیات و تخم‌مرغ است؛ گوشت و ماهی در هیچ وعده‌ای نیامده است.",
      en: "The vegetarian plan includes dairy and eggs; meat and fish are not present in any meal.",
    },
  "برای میان‌وعده‌ها گزینه پروتئینی سازگار با محدودیت‌های شما یافت نشد؛ آن میان‌وعده فقط میوه است. می‌توانید محدودیت‌ها را بازبینی کنید.":
    {
      fa: "برای میان‌وعده‌ها گزینه پروتئینی سازگار با محدودیت‌های شما یافت نشد؛ آن میان‌وعده فقط میوه است. می‌توانید محدودیت‌ها را بازبینی کنید.",
      en: "No protein-compatible snack option was found for your restrictions; that snack is fruit only. You may want to review the restrictions.",
    },
};

/** یادداشت برنامه غذایی — نگاشت دقیق با fallback صادقانه */
export function nutritionNoteLabel(note: string, locale: Locale): string {
  if (locale === "fa") return note;
  if (NUTRITION_NOTE_MAP[note]) return NUTRITION_NOTE_MAP[note].en;
  // متن انگلیسی ذخیره‌شده — عیناً
  if (Object.values(NUTRITION_NOTE_MAP).some((b) => b.en === note)) return note;
  return note;
}

/** هشدارهای محاسباتی برآورد — نگاشت دقیق */
const ENERGY_WARNING_MAP: Record<string, Bi> = {
  "همه اعداد این بخش «تخمین» بر پایه فرمول‌های عمومی‌اند، نه اندازه‌گیری دقیق نیاز بدن شما.":
    {
      fa: "همه اعداد این بخش «تخمین» بر پایه فرمول‌های عمومی‌اند، نه اندازه‌گیری دقیق نیاز بدن شما.",
      en: "All numbers in this “estimate” section are based on general formulas, not an exact measurement of your body's needs.",
    },
  "سن کمتر از ۱۸ سال: هدف کاهش وزن یا محدودیت انرژی به‌صورت خودکار تنظیم نمی‌شود؛ برای برنامه اختصاصی حتماً با متخصص تغذیه مشورت کنید.":
    {
      fa: "سن کمتر از ۱۸ سال: هدف کاهش وزن یا محدودیت انرژی به‌صورت خودکار تنظیم نمی‌شود؛ برای برنامه اختصاصی حتماً با متخصص تغذیه مشورت کنید.",
      en: "Age under 18: the weight-loss goal or energy restriction is not applied automatically; for a personal plan, be sure to consult a nutrition specialist.",
    },
  "در بارداری یا شیردهی نیاز تغذیه‌ای خاص است؛ این ابزار هدف کالری کاهشی/افزایشی برای شما تنظیم نمی‌کند و برنامه فعلی جایگزین نظر متخصص نیست.":
    {
      fa: "در بارداری یا شیردهی نیاز تغذیه‌ای خاص است؛ این ابزار هدف کالری کاهشی/افزایشی برای شما تنظیم نمی‌کند و برنامه فعلی جایگزین نظر متخصص نیست.",
      en: "During pregnancy or breastfeeding, nutritional needs are special; this tool does not set a deficit/surplus calorie goal for you, and the current plan is not a substitute for specialist advice.",
    },
  "جنسیت اعلام‌نشده: برای فرمول، میانگین دو فرمول مردان و زنان استفاده شد؛ عدم‌قطعیت برآورد بالاتر است.":
    {
      fa: "جنسیت اعلام‌نشده: برای فرمول، میانگین دو فرمول مردان و زنان استفاده شد؛ عدم‌قطعیت برآورد بالاتر است.",
      en: "Gender undisclosed: the average of the male and female formulas was used; the estimate uncertainty is higher.",
    },
};

const FA_MACRO_DIFF_RE = /^جمع انرژی درشت‌مغذی‌ها (بیشتر|کمتر) از هدف کالری است \(اختلاف حدود ([۰-۹0-9]+) کیلوکالری ناشی از گرد کردن و محدوده‌های استاندارد\)\.$/;
const EN_MACRO_DIFF_RE = /^The macronutrient energy total is (higher|lower) than the calorie target \(a difference of about (\d+) kcal due to rounding and standard ranges\)\.$/;

/** هشدار محاسباتی — نگاشت دقیق یا تجزیه الگوی اختلاف مکرو */
export function energyWarningLabel(warning: string, locale: Locale): string {
  if (locale === "fa") return warning;
  if (ENERGY_WARNING_MAP[warning]) return ENERGY_WARNING_MAP[warning].en;

  const faDiff = warning.match(FA_MACRO_DIFF_RE);
  if (faDiff) {
    const dir = faDiff[1] === "بیشتر" ? "higher" : "lower";
    return `The macronutrient energy total is ${dir} than the calorie target (a difference of about ${faDiff[2]} kcal due to rounding and standard ranges).`;
  }
  const enDiff = warning.match(EN_MACRO_DIFF_RE);
  if (enDiff) return warning; // انگلیسی ذخیره‌شده — عیناً
  return warning;
}

/** برچسب پایدار هشدار بارداری/شیردهی — مستقل از متن ذخیره‌شده (جایگزین جست‌وجوی متنی) */
export function pregnancyWarningLabel(locale: Locale): string {
  const key = "در بارداری یا شیردهی نیاز تغذیه‌ای خاص است؛ این ابزار هدف کالری کاهشی/افزایشی برای شما تنظیم نمی‌کند و برنامه فعلی جایگزین نظر متخصص نیست.";
  return locale === "en" ? ENERGY_WARNING_MAP[key].en : key;
}

/** عنوان برنامه غذایی از فیلدهای ساختاریافته — مستقل از متن ذخیره‌شده */
export function nutritionTitleFromFields(
  planLength: number,
  goal: string,
  locale: Locale
): string {
  const en = locale === "en";
  const effectiveGoal = goal;
  const goalLabel =
    (en ? NUTRITION_GOAL_LABELS_EN[effectiveGoal as keyof typeof NUTRITION_GOAL_LABELS_EN] : NUTRITION_GOAL_LABELS[effectiveGoal as keyof typeof NUTRITION_GOAL_LABELS]) ?? null;
  if (!goalLabel) return "";
  const lengthLabel = en
    ? planLength === 7 ? "weekly" : "one-day"
    : planLength === 7 ? "هفتگی" : "یک‌روزه";
  return en
    ? `${goalLabel} — ${lengthLabel} meal plan`
    : `برنامه غذایی ${lengthLabel} — ${goalLabel}`;
}
