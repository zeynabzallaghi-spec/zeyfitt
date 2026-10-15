/**
 * تست واحد موتور برنامه‌سازی — اجرا با bun.
 * همه قواعد مشخص‌شده در دستور مرحله ۶ را روی داده واقعی بانک حرکات می‌سنجد.
 *
 * اجرا: bun scripts/check-plan-engine.ts
 */

import {
  EXERCISE_LIBRARY,
  getExerciseById,
} from "../src/lib/exercises/index";
import { generatePlan, PlanGenerationError } from "../src/lib/plan-engine/engine";
import { planSettingsSchema } from "../src/lib/plan-engine/schema";
import { PROFILE_TO_LIBRARY_EQUIPMENT, prescribe, targetExercisesPerSession } from "../src/lib/plan-engine/presets";
import type { PlanSettings } from "../src/lib/plan-engine/types";

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

const base: PlanSettings = {
  goal: "muscle_gain",
  experience: "beginner",
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: ["bodyweight", "dumbbell"],
  focus: "all",
  preferredDays: [0, 2, 4],
  excludedCategories: [],
  excludedExerciseIds: [],
  limitationNotes: null,
};

const fullGym: PlanSettings = {
  ...base,
  goal: "strength",
  experience: "advanced",
  daysPerWeek: 6,
  sessionMinutes: 90,
  equipment: ["bodyweight", "dumbbell", "barbell", "cable", "machine", "bench", "bar"],
};

console.log("\n── ۱. ساخت برنامه برای تنظیمات پایه (مبتدی ۳ روز) ──");
const p1 = generatePlan(base);
check("تعداد روز = ۳", p1.days.length === 3, `${p1.days.length}`);
check("عنوان فارسی شامل هدف و روز", p1.title.includes("عضله‌سازی") && p1.title.includes("۳ روز"));
check("مجموع حرکات > ۰", p1.totalExercises > 0);

console.log("\n── ۲. حرکات واقعی از بانک مرحله ۵ ──");
const allIds = new Set(EXERCISE_LIBRARY.map((e) => e.id));
const p1Ids = p1.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
check("همه شناسه‌ها در بانک موجودند", p1Ids.every((id) => allIds.has(id)));
const uniqueIds = new Set(p1Ids);
check("شناسه‌ها معتبر و قابل بازیابی‌اند", [...uniqueIds].every((id) => getExerciseById(id) !== undefined));

console.log("\n── ۳. سازگاری تجهیزات ──");
const equipmentSet = new Set(base.equipment);
const p1PoolOk = p1Ids.every((id) => {
  const ex = getExerciseById(id)!;
  return ex.equipment.every((e) => equipmentSet.has(e));
});
check("همه حرکات فقط با تجهیزات در دسترس اجرا می‌شوند", p1PoolOk);

console.log("\n── ۴. پرهیز از تکرار درون یک جلسه ──");
const noDupInDay = p1.days.every((d) => {
  const ids = d.exercises.map((e) => e.exerciseId);
  return new Set(ids).size === ids.length;
});
check("هیچ حرکتی در یک جلسه تکرار نشده", noDupInDay);

console.log("\n── ۵. سقف زمان جلسه ──");
const timeOk = p1.days.every((d) => d.estMinutes <= base.sessionMinutes);
check("زمان تقریبی همه جلسات ≤ مدت تعیین‌شده", timeOk, p1.days.map((d) => d.estMinutes).join(","));
const timeSane = p1.days.every((d) => d.estMinutes >= 15);
check("زمان تقریبی جلسات معقول است (≥۱۵ دقیقه)", timeSane);

console.log("\n── ۶. برنامه‌های متفاوت برای تنظیمات متفاوت ──");
const pFull = generatePlan(fullGym);
check("۶ روز → ۶ جلسه", pFull.days.length === 6, `${pFull.days.length}`);
check("مبتدی ≠ پیشرفته در انتخاب حرکات", JSON.stringify(p1Ids) !== JSON.stringify(pFull.days.flatMap((d) => d.exercises.map((e) => e.exerciseId))));
const p1Strength = generatePlan({ ...base, goal: "strength" });
const firstStrength = p1Strength.days[0].exercises[0];
const firstHypertrophy = p1.days[0].exercises[0];
check("هدف قدرت → ست و استراحت متفاوت از عضله‌سازی", firstStrength.sets >= 4 && firstStrength.restSeconds > firstHypertrophy.restSeconds, `${firstStrength.sets}x rest:${firstStrength.restSeconds} vs ${firstHypertrophy.sets}x rest:${firstHypertrophy.restSeconds}`);

console.log("\n── ۷. تجویز ست/تکرار بر اساس هدف × نوع حرکت × سطح ──");
const begRx = prescribe("muscle_gain", "beginner", true);
const advRx = prescribe("muscle_gain", "advanced", true);
check("مبتدی کمتر ست از پیشرفته", begRx.sets < advRx.sets, `${begRx.sets} vs ${advRx.sets}`);
const strengthRx = prescribe("strength", "advanced", true);
check("قدرت → بازه تکرار کمتر", strengthRx.repsMax <= 6, `${strengthRx.repsMin}-${strengthRx.repsMax}`);
const fatRx = prescribe("fat_loss", "beginner", true);
check("کاهش چربی → بازه تکرار بالاتر", fatRx.repsMax >= 15, `${fatRx.repsMin}-${fatRx.repsMax}`);
check("هدف زمانی جلسات مطابق تنظیم", targetExercisesPerSession(30) === 3 && targetExercisesPerSession(90) === 8);

console.log("\n── ۸. مبتدی هرگز حرکت پیشرفته نمی‌گیرد ──");
const allP1 = p1Ids.map((id) => getExerciseById(id)!);
check("بدون حرکت پیشرفته در برنامه مبتدی", allP1.every((e) => e.difficulty !== "پیشرفته"), allP1.filter((e) => e.difficulty === "پیشرفته").map((e) => e.id).join(","));

console.log("\n── ۹. رعایت محدودیت‌ها ──");
const pExcl = generatePlan({ ...base, excludedCategories: ["chest", "biceps"] });
check("دسته حذف‌شده غایب است", pExcl.days.every((d) => d.exercises.every((e) => e.category !== "chest" && e.category !== "biceps")));
const pExclEx = generatePlan({ ...base, excludedExerciseIds: ["pushup", "squat-bodyweight"] });
const pExclExIds = pExclEx.days.flatMap((d) => d.exercises.map((e) => e.exerciseId));
check("حرکت حذف‌شده غایب است", !pExclExIds.includes("pushup") && !pExclExIds.includes("squat-bodyweight"));
const pNoChest = generatePlan({ ...base, excludedExerciseIds: ["pushup", "pushup-diamond", "pushup-pike"], daysPerWeek: 2 });

console.log("\n── ۱۰. روزهای ترجیحی ──");
check("روزهای ترجیحی در جلسات اعمال شده", p1.days.every((d, i) => d.weekday === base.preferredDays[i]), p1.days.map((d) => d.weekday).join(","));
const pNoDays = generatePlan({ ...base, preferredDays: [] });
check("بدون ترجیح → weekday خالی", pNoDays.days.every((d) => d.weekday === null));

console.log("\n── ۱۱. انیمیشن سه‌بعدی صادقانه ──");
const p3d = p1.days.flatMap((d) => d.exercises);
const coachIds = new Set(EXERCISE_LIBRARY.filter((e) => e.coach3dId).map((e) => e.coach3dId));
check("coach3dId فقط برای ۶ حرکت متصل غیر-null است", p3d.every((e) => (e.coach3dId === null) || coachIds.has(e.coach3dId)));
const p3dMatches = p3d.filter((e) => e.coach3dId !== null).every((e) => getExerciseById(e.exerciseId)!.coach3dId === e.coach3dId);
check("شناسه سه‌بعدی با بانک دقیقاً مطابق است", p3dMatches);
const has3dCount = p3d.filter((e) => e.coach3dId !== null).length;
console.log(`  (این برنامه ${has3dCount} حرکت سه‌بعدی‌دار دارد)`);
check("در برنامه مبتدی حتماً حرکت سه‌بعدی‌دار هم هست (اسکوات/شنا/لانج پول دارند)", has3dCount > 0);

console.log("\n── ۱۲. نقشه تجهیزات پروفایل ──");
check("free_weights → دمبل+هالتر", JSON.stringify(PROFILE_TO_LIBRARY_EQUIPMENT.free_weights) === JSON.stringify(["dumbbell", "barbell"]));
check("kettlebell → خالی (شفاف، بدون جعل)", Array.isArray(PROFILE_TO_LIBRARY_EQUIPMENT.kettlebell) && PROFILE_TO_LIBRARY_EQUIPMENT.kettlebell.length === 0);

console.log("\n── ۱۳. اعتبارسنجی شِما ──");
const bad1 = planSettingsSchema.safeParse({ ...base, daysPerWeek: 1 });
check("۱ روز رد می‌شود", !bad1.success);
const bad2 = planSettingsSchema.safeParse({ ...base, sessionMinutes: 50 });
check("۵۰ دقیقه رد می‌شود", !bad2.success);
const bad3 = planSettingsSchema.safeParse({ ...base, equipment: [] });
check("تجهیزات خالی رد می‌شود", !bad3.success);
const bad4 = planSettingsSchema.safeParse({ ...base, preferredDays: [0, 0] });
check("روز تکراری رد می‌شود", !bad4.success);
const okFa = planSettingsSchema.safeParse({ ...base, daysPerWeek: "۳" });
check("رقم فارسی ۳ پذیرفته می‌شود", okFa.success);
const bad5 = planSettingsSchema.safeParse({ ...base, focus: "unknown" });
check("تمرکز نامعتبر رد می‌شود", !bad5.success);

console.log("\n── ۱۴. پایداری و تکرارپذیری ──");
const p1again = generatePlan(base);
check("تنظیمات یکسان → برنامه یکسان (بدون تصادف)", JSON.stringify(p1) === JSON.stringify(p1again));

console.log("\n── ۱۵. خطای موتور در کمبود شدید ──");
let threwWithMessage = false;
try {
  // فقط کش (۱ حرکت در بانک)
  generatePlan({ ...base, equipment: ["band"], excludedCategories: ["chest", "back", "shoulders", "biceps", "triceps", "core", "quads", "hamstrings", "glutes", "calves"] });
} catch (error) {
  threwWithMessage = error instanceof PlanGenerationError && /فارسی|حرکت کافی|جلسه/.test(error.message);
}
check("کمبود شدید → PlanGenerationError با پیام فارسی", threwWithMessage);

console.log(`\n═══ نتیجه: ${passed} پاس / ${failed} شکست ═══`);
if (failed > 0) {
  console.error("شکست‌ها:", failures);
  process.exit(1);
}
