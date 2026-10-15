/** تحلیل توزیع بانک حرکات برای طراحی موتور برنامه‌سازی — ابزار توسعه */
import { EXERCISE_LIBRARY, EXERCISE_CATEGORIES, EQUIPMENT_TYPES, DIFFICULTY_ORDER } from "../src/lib/exercises/index";

const byEquip = new Map<string, number>();
const byCat = new Map<string, number>();
const byDiff = new Map<string, number>();
const byCatDiff = new Map<string, number>();
for (const ex of EXERCISE_LIBRARY) {
  for (const e of ex.equipment) byEquip.set(e, (byEquip.get(e) ?? 0) + 1);
  byCat.set(ex.category, (byCat.get(ex.category) ?? 0) + 1);
  byDiff.set(ex.difficulty, (byDiff.get(ex.difficulty) ?? 0) + 1);
  const k = `${ex.category}|${ex.difficulty}`;
  byCatDiff.set(k, (byCatDiff.get(k) ?? 0) + 1);
}
console.log("total:", EXERCISE_LIBRARY.length);
console.log("\n-- equipment --");
for (const e of EQUIPMENT_TYPES) console.log(e.id, byEquip.get(e.id) ?? 0);
console.log("\n-- category --");
for (const c of EXERCISE_CATEGORIES) console.log(c.id, byCat.get(c.id) ?? 0);
console.log("\n-- difficulty --");
for (const d of DIFFICULTY_ORDER) console.log(d, byDiff.get(d) ?? 0);
console.log("\n-- category|difficulty --");
for (const c of EXERCISE_CATEGORIES) {
  const row = DIFFICULTY_ORDER.map((d) => `${d}:${byCatDiff.get(`${c.id}|${d}`) ?? 0}`).join(" ");
  console.log(c.id.padEnd(12), row);
}
// bodyweight-only pool
const bw = EXERCISE_LIBRARY.filter((ex) => ex.equipment.every((e) => e === "bodyweight"));
console.log("\nbodyweight-only pool:", bw.length, "=>", bw.map((e) => e.id).join(", "));
const bwBench = EXERCISE_LIBRARY.filter((ex) => ex.equipment.every((e) => e === "bodyweight" || e === "bench"));
console.log("bodyweight+bench pool:", bwBench.length);
const dbPool = EXERCISE_LIBRARY.filter((ex) => ex.equipment.every((e) => e === "bodyweight" || e === "dumbbell"));
console.log("bodyweight+dumbbell pool:", dbPool.length);
const gymPool = EXERCISE_LIBRARY.filter((ex) => ex.equipment.every((e) => ["bodyweight","dumbbell","barbell","cable","machine","bench","bar"].includes(e)));
console.log("full-gym pool:", gymPool.length);
