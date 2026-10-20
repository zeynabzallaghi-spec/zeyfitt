/**
 * اعتبارسنجی بانک حرکات — تست‌های الزامی بخش ۱۰ دستورالعمل مرحله ۵.
 * اجرا: bun scripts/check-library.ts
 * خروجی: نتیجه واقعی هر بررسی؛ هیچ تستی بدون اجرا «موفق» فرض نمی‌شود.
 */

import { EXERCISES as COACH3D_EXERCISES } from "../src/lib/fitness3d/exercises";
import { LIBRARY_MUSCLE_GROUPS } from "../src/lib/exercises/types";
import {
  EXERCISE_LIBRARY,
  EXERCISE_COUNT,
  EXERCISE_CATEGORIES,
  EQUIPMENT_TYPES,
  MOVEMENT_PATTERNS,
  DIFFICULTY_ORDER,
  filterExercises,
  findSimilarExercises,
  getExerciseById,
  normalizeSearchText,
  EMPTY_FILTER,
  hasActiveFilters,
  hasCoach3dAnimation,
  type LibraryExercise,
} from "../src/lib/exercises";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail = "") {
  if (condition) {
    pass++;
    console.log(`  ✅ ${name}`);
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/* ---------------- ۱) تعداد و یکتایی حرکات متمایز ---------------- */
console.log("\n۱) تعداد و یکتایی حرکات");
check("حداقل ۴۰ حرکت در بانک", EXERCISE_COUNT >= 40, `تعداد: ${EXERCISE_COUNT}`);
const ids = EXERCISE_LIBRARY.map((e) => e.id);
check("شناسه‌ها یکتا هستند", new Set(ids).size === ids.length);
const faNames = EXERCISE_LIBRARY.map((e) => e.fa);
check("نام‌های فارسی متمایز هستند", new Set(faNames).size === faNames.length);
const enNames = EXERCISE_LIBRARY.map((e) => e.en.toLowerCase());
check("نام‌های انگلیسی متمایز هستند", new Set(enNames).size === enNames.length);

/* ---------------- ۲) کامل بودن فیلدهای الزامی ---------------- */
console.log("\n۲) کامل بودن فیلدهای الزامی هر رکورد");
const requiredCategories = EXERCISE_CATEGORIES.map((c) => c.id);
const validMuscles = new Set(LIBRARY_MUSCLE_GROUPS.map((m) => m.id));
const validEquipment = new Set(EQUIPMENT_TYPES.map((e) => e.id));
const validPatterns = new Set(MOVEMENT_PATTERNS.map((p) => p.id));

let fieldIssues: string[] = [];
let usedCategories = new Set<string>();
for (const ex of EXERCISE_LIBRARY) {
  const issues: string[] = [];
  if (!ex.fa.trim()) issues.push("fa خالی");
  if (!ex.en.trim()) issues.push("en خالی");
  if (!ex.summary.trim() || ex.summary.length < 30) issues.push("summary کوتاه/خالی");
  if (ex.steps.length < 4) issues.push(`steps کم (${ex.steps.length})`);
  if (ex.steps.some((s) => !s.trim())) issues.push("step خالی");
  if (!ex.breathing.trim() || ex.breathing.length < 20) issues.push("breathing کوتاه/خالی");
  if (ex.mistakes.length < 3) issues.push(`mistakes کم (${ex.mistakes.length})`);
  if (ex.safety.length < 2) issues.push(`safety کم (${ex.safety.length})`);
  if (ex.primaryMuscles.length < 1) issues.push("بدون عضله اصلی");
  if (!requiredCategories.includes(ex.category)) issues.push(`دسته نامعتبر: ${ex.category}`);
  usedCategories.add(ex.category);
  if (!DIFFICULTY_ORDER.includes(ex.difficulty)) issues.push(`سطح نامعتبر: ${ex.difficulty}`);
  if (ex.equipment.length < 1) issues.push("بدون تجهیزات");
  for (const m of [...ex.primaryMuscles, ...ex.secondaryMuscles]) {
    if (!validMuscles.has(m)) issues.push(`عضله نامعتبر: ${m}`);
  }
  for (const e of ex.equipment) {
    if (!validEquipment.has(e)) issues.push(`تجهیزات نامعتبر: ${e}`);
  }
  if (!validPatterns.has(ex.pattern)) issues.push(`الگو نامعتبر: ${ex.pattern}`);
  if (issues.length > 0) fieldIssues.push(`${ex.id}: ${issues.join(" | ")}`);
}
check("همه ۴۸ رکورد فیلدهای کامل دارند", fieldIssues.length === 0, fieldIssues.slice(0, 5).join(" ;; "));
check("هر ۱۱ دسته حداقل یک حرکت دارند", usedCategories.size === requiredCategories.length, `${usedCategories.size} از ${requiredCategories.length}`);

const diffSpread = DIFFICULTY_ORDER.map(
  (d) => `${d}: ${EXERCISE_LIBRARY.filter((e) => e.difficulty === d).length}`
).join(" ، ");
console.log(`  ℹ️  توزیع سطح دشواری — ${diffSpread}`);
check("هر سه سطح دشواری استفاده شده", DIFFICULTY_ORDER.every((d) => EXERCISE_LIBRARY.some((e) => e.difficulty === d)));
const equipSpread = EQUIPMENT_TYPES.map((e) => {
  const n = EXERCISE_LIBRARY.filter((x) => x.equipment.includes(e.id)).length;
  return `${e.fa}: ${n}`;
}).join(" ، ");
console.log(`  ℹ️  توزیع تجهیزات — ${equipSpread}`);
// مرحله ۱۸: واژگان تجهیزات به ۱۴ نوع گسترش یافت (منبع آزاد)؛ رکوردهای ویرایشی
// فقط زیرمجموعه معتبر را استفاده می‌کنند و همه نوع‌ها در بانک کامل دیتابیس پوشش دارند.
check(
  "تجهیزات رکوردهای ویرایشی همگی در واژگان معتبرند",
  EXERCISE_LIBRARY.every((x) => x.equipment.every((e) => validEquipment.has(e)))
);

/* ---------------- ۳) اتصال صحیح به مربی سه‌بعدی ---------------- */
console.log("\n۳) اتصال به مربی سه‌بعدی");
const coach3dIds = new Set(COACH3D_EXERCISES.map((e) => e.id));
const linked = EXERCISE_LIBRARY.filter(hasCoach3dAnimation);
check("دقیقاً ۶ حرکت به مربی سه‌بعدی متصل هستند", linked.length === 6, `متصل: ${linked.length}`);
check(
  "همه coach3dIdها واقعاً در سیستم سه‌بعدی وجود دارند",
  linked.every((ex) => coach3dIds.has(ex.coach3dId!)),
  linked.map((e) => `${e.id}→${e.coach3dId}`).join(" ، ")
);
const expectedLinks: Record<string, string> = {
  "biceps-curl-dumbbell": "biceps-curl",
  "squat-bodyweight": "squat",
  pushup: "push-up",
  "shoulder-press-dumbbell": "shoulder-press",
  lateral: "lateral-raise",
  lunge: "lunge",
};
for (const [libId, coachId] of Object.entries(expectedLinks)) {
  const libEx = libId === "lateral" ? getExerciseById("lateral-raise") : getExerciseById(libId);
  check(`${libId} → ${coachId}`, libEx?.coach3dId === coachId, `یافت‌شده: ${libEx?.coach3dId ?? "ندارد"}`);
}
check(
  "حرکات بدون انیمیشن فیلد coach3dId ندارند",
  EXERCISE_LIBRARY.every((ex) => hasCoach3dAnimation(ex) === (typeof ex.coach3dId === "string" && ex.coach3dId.length > 0))
);

/* ---------------- ۴) جست‌وجوی فارسی و انگلیسی ---------------- */
console.log("\n۴) جست‌وجو");
const qFa = filterExercises({ ...EMPTY_FILTER, query: "پرس" });
console.log(`  ℹ️  جست‌وجوی «پرس» → ${qFa.length} نتیجه: ${qFa.map((e) => e.fa).join(" ، ")}`);
check("جست‌وجوی فارسی «پرس» نتیجه دارد", qFa.length >= 5);
const qEn = filterExercises({ ...EMPTY_FILTER, query: "curl" });
check("جست‌وجوی انگلیسی «curl» نتیجه دارد", qEn.length >= 3, `تعداد: ${qEn.length}`);
const qEnUpper = filterExercises({ ...EMPTY_FILTER, query: "PULL" });
check("جست‌وجوی انگلیسی بی‌توجه به بزرگی حروف", qEnUpper.some((e) => e.id === "pullup"));
const qMixed = filterExercises({ ...EMPTY_FILTER, query: "شنا" });
check("جست‌وجوی «شنا» حداقل ۲ حرکت (معمولی/پایک/الماسی)", qMixed.length >= 2, `تعداد: ${qMixed.length}`);
// پذیرش ی عربی و نیم‌فاصله
const qArabicYa = filterExercises({ ...EMPTY_FILTER, query: "جلو بازو" });
check("نرمال‌سازی متن جست‌وجو کار می‌کند", qArabicYa.length >= 3, `تعداد: ${qArabicYa.length}`);
check("normalizeSearchText نیم‌فاصله فارسی را یکسان می‌کند", normalizeSearchText("جست\u200Cوجو") === normalizeSearchText("جستوجو") && normalizeSearchText("نشر جانب دمبل").includes("نشر"));
const qNothing = filterExercises({ ...EMPTY_FILTER, query: "zzzz" });
check("عبارت بی‌معنی صفر نتیجه می‌دهد", qNothing.length === 0);

/* ---------------- ۵) فیلترهای ترکیبی ---------------- */
console.log("\n۵) فیلترهای ترکیبی");
const only3d = filterExercises({ ...EMPTY_FILTER, only3d: true });
check("فیلتر «فقط سه‌بعدی» دقیقاً ۶ حرکت", only3d.length === 6, `تعداد: ${only3d.length}`);
const chestDumbbell = filterExercises({ ...EMPTY_FILTER, category: "chest", equipment: ["dumbbell"] });
console.log(`  ℹ️  سینه+دمبل → ${chestDumbbell.map((e) => e.id).join(" ، ")}`);
check(
  "ترکیب دسته سینه + تجهیزات دمبل",
  chestDumbbell.length === 1 && chestDumbbell[0].id === "bench-press-dumbbell"
);
const chestBodyweight = filterExercises({ ...EMPTY_FILTER, category: "chest", equipment: ["bodyweight"] });
check(
  "ترکیب دسته سینه + وزن بدن = دو شنا",
  chestBodyweight.length === 2 && chestBodyweight.every((e) => e.id === "pushup" || e.id === "pushup-diamond"),
  chestBodyweight.map((e) => e.id).join(" ، ")
);
const beginnerBodyweight = filterExercises({
  ...EMPTY_FILTER,
  difficulty: "مبتدی",
  equipment: ["bodyweight"],
});
console.log(`  ℹ️  مبتدی+وزن بدن → ${beginnerBodyweight.length} حرکت`);
check(
  "ترکیب سطح مبتدی + وزن بدن سازگار است",
  beginnerBodyweight.length >= 5 &&
    beginnerBodyweight.every((e) => e.difficulty === "مبتدی" && e.equipment.includes("bodyweight"))
);
const muscleTriceps = filterExercises({ ...EMPTY_FILTER, muscles: ["triceps"] });
console.log(`  ℹ️  عضله پشت بازو → ${muscleTriceps.length} حرکت`);
check(
  "فیلتر عضله پشت بازو شامل اصلی و کمکی",
  muscleTriceps.length >= 6 && muscleTriceps.every((e) => [...e.primaryMuscles, ...e.secondaryMuscles].includes("triceps"))
);
const tripleCombo = filterExercises({
  ...EMPTY_FILTER,
  category: "back",
  equipment: ["barbell"],
  difficulty: "پیشرفته",
});
check("ترکیب سه‌گانه پشت+هالتر+پیشرفته = ددلیفت", tripleCombo.length === 1 && tripleCombo[0].id === "deadlift", tripleCombo.map((e) => e.id).join(" ، "));
const patternHinge = filterExercises({ ...EMPTY_FILTER, pattern: "hinge" });
check("فیلتر الگوی هینج نتیجه معتبر دارد", patternHinge.length >= 6 && patternHinge.every((e) => e.pattern === "hinge"), `تعداد: ${patternHinge.length}`);
const comboEmpty = filterExercises({
  ...EMPTY_FILTER,
  category: "calves",
  equipment: ["barbell"],
});
check("ترکیب بی‌نتیجه = آرایه خالی", comboEmpty.length === 0);

/* ---------------- ۶) پاک‌کردن فیلترها ---------------- */
console.log("\n۶) پاک‌کردن فیلترها");
check("فیلتر خالی فعال شمرده نمی‌شود", !hasActiveFilters(EMPTY_FILTER));
check("حالت خالی همه حرکات را می‌دهد", filterExercises(EMPTY_FILTER).length === EXERCISE_COUNT);
const partial = { ...EMPTY_FILTER, category: "chest" as const, query: "پرس" };
check("hasActiveFilters فیلتر فعال را می‌بیند", hasActiveFilters(partial));

/* ---------------- ۷) مرتب‌سازی پیش‌فرض پایدار ---------------- */
console.log("\n۷) مرتب‌سازی پیش‌فرض");
check("اولین حرکت سینه/مبتدی است", EXERCISE_LIBRARY[0].id === "pushup", `اول: ${EXERCISE_LIBRARY[0].id}`);
const run2 = [...EXERCISE_LIBRARY];
check("ترتیب پایدار (اجرای دوباره همان نتیجه)", JSON.stringify(run2.map((e) => e.id)) === JSON.stringify(EXERCISE_LIBRARY.map((e) => e.id)));
const catOrderIdx = EXERCISE_LIBRARY.map((e) => requiredCategories.indexOf(e.category));
let sortedCats = true;
for (let i = 1; i < catOrderIdx.length; i++) {
  if (catOrderIdx[i] < catOrderIdx[i - 1]) sortedCats = false;
}
check("ترتیب دسته‌ها در خروجی صعودی و ثابت است", sortedCats);

/* ---------------- ۸) حرکات مشابه ---------------- */
console.log("\n۸) حرکات مشابه");
const baseCurl = getExerciseById("biceps-curl-dumbbell") as LibraryExercise;
const similarCurl = findSimilarExercises(baseCurl, 3);
console.log(`  ℹ️  مشابه جلو بازو دمبل → ${similarCurl.map((e) => e.id).join(" ، ")}`);
check("مشابه جلو بازو شامل جلو بازو هالتر است", similarCurl.some((e) => e.id === "biceps-curl-barbell"));
check("خود حرکت در مشابه‌ها نیست", similarCurl.every((e) => e.id !== baseCurl.id));
check("همه مشابه‌ها ارتباط واقعی دارند (هم‌دسته یا هم‌عضله)", similarCurl.every((s) => s.category === baseCurl.category || s.primaryMuscles.some((m) => baseCurl.primaryMuscles.includes(m))));
const fullbodyEx = getExerciseById("thruster") as LibraryExercise;
const similarFull = findSimilarExercises(fullbodyEx, 3);
console.log(`  ℹ️  مشابه تراستر → ${similarFull.map((e) => e.id).join(" ، ")}`);
check("مشابه‌ها حداکثر ۳ مورد", similarFull.length <= 3);

/* ---------------- جمع‌بندی ---------------- */
console.log(`\n========== نتیجه: ${pass} موفق، ${fail} ناموفق ==========`);
if (fail > 0) {
  console.log("خطاها:");
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
