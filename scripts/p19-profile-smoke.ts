/**
 * تست دود همه الگوهای حرکتی — هر الگو با هر ترکیب پارامتر مجاز build می‌شود.
 * هر خطا (الگوی خراب، کلیدفریم نامعتبر، NaN در زوایا) را گزارش می‌کند.
 */
import { ALL_PROFILES } from "../src/lib/fitness3d/profiles/registry";
import { cycleDuration } from "../src/lib/fitness3d/animation";
import type { MovementProfile, ProfileParams } from "../src/lib/fitness3d/profiles/core";

let builds = 0;
let failures = 0;

function checkAngles(obj: unknown, path: string): void {
  if (typeof obj === "number") {
    if (Number.isNaN(obj) || !Number.isFinite(obj)) {
      throw new Error(`NaN/Inf at ${path}`);
    }
    return;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => checkAngles(v, `${path}[${i}]`));
    return;
  }
  if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) checkAngles(v, `${path}.${k}`);
  }
}

function combos(profile: MovementProfile): ProfileParams[] {
  // هر پارامتر: پیش‌فرض + همه گزینه‌های enum + min/max برای عدد
  let acc: ProfileParams[] = [{}];
  for (const spec of profile.params) {
    const values: (string | number)[] = [];
    if (spec.kind === "enum") values.push(...(spec.options ?? []));
    else {
      if (spec.min !== undefined) values.push(spec.min);
      if (spec.max !== undefined) values.push(spec.max);
      if (spec.min !== undefined && spec.max !== undefined) values.push((spec.min + spec.max) / 2);
    }
    if (values.length === 0) values.push(spec.default as string | number);
    const next: ProfileParams[] = [];
    for (const base of acc) {
      for (const v of values) next.push({ ...base, [spec.key]: v });
    }
    acc = next;
  }
  return acc;
}

for (const profile of ALL_PROFILES) {
  const variants = combos(profile);
  for (const params of variants) {
    try {
      const built = profile.build(params);
      builds++;
      if (!built.cycle || built.cycle.length < 2) throw new Error("cycle too short");
      const total = cycleDuration(built.cycle);
      if (!(total > 0) || !Number.isFinite(total)) throw new Error(`bad duration ${total}`);
      if (built.counterMode !== "reps" && built.counterMode !== "hold") throw new Error("bad counterMode");
      checkAngles(built.cycle, `${profile.id}`);
    } catch (err) {
      failures++;
      console.error(`FAIL ${profile.id} ${JSON.stringify(params)}:`, err instanceof Error ? err.message : err);
    }
  }
}

console.log(`\nbuilds=${builds} failures=${failures} profiles=${ALL_PROFILES.length}`);
if (failures > 0) process.exit(1);
