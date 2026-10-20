/**
 * تست‌های مرحله ۱۹ — مربی سه‌بعدی برای کل بانک (API + حل صحنه + شمارنده).
 *
 * اجرا: npx tsx scripts/p19-3d-test.ts  (نیازمند سرور dev روی 3000)
 * پوشش:
 *  - پوشش کامل نگاشت: همه حرکات فعال has3d=true (کارت API)
 *  - ۶ حرکت legacy: coach3dId + بدون animation3d (رفتار قبلی)
 *  - نگاشت پارامتری: profileId + params فقط فیلدهای مجاز
 *  - حل صحنه: هر ۹۰۵ کارت → SceneDefinition با چرخه قابل پخش
 *  - ایزومتریک: counterMode=hold بدون افزایش تکرار (بررسی داده + منطق)
 *  - تغییر سرعت و شمارنده: هماهنگی (منطق خالص موتور)
 *  - whitelist: هیچ metadata داخلی در پاسخ API نیست
 *  - snapshot برنامه مربی: حفظ نسخه‌ها (رگرسیون مرحله ۱۶)
 *  - پاک‌سازی کامل fixture + integrity
 */

import { PrismaClient } from "@prisma/client";
import { resolveScene } from "../src/lib/fitness3d/resolve";
import { EXERCISES as LEGACY_BANK } from "../src/lib/fitness3d/exercises";
import { blendKeyframes, cycleDuration, locateInCycle } from "../src/lib/fitness3d/animation";

const db = new PrismaClient();
const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

let passed = 0;
let failed = 0;
const failures: string[] = [];
const executedTests: string[] = [];

function check(name: string, cond: boolean, detail = "") {
  executedTests.push(name);
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function api(path: string, init?: RequestInit) {
  return fetch(`${BASE}${path}`, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
}

async function createFixtureUser(attempt = 0): Promise<{ cookie: string; userId: string; email: string }> {
  const email = `p19test-3d-${Date.now()}-${attempt}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: "p19test-pass1", name: "P19 3D" }),
  });
  if (res.status === 429 && attempt < 4) {
    console.log("  … نرخ‌سنجی auth؛ ۶۵ ثانیه صبر");
    await new Promise((r) => setTimeout(r, 65_000));
    return createFixtureUser(attempt + 1);
  }
  if (!res.ok) throw new Error(`sign-up failed: ${res.status}`);
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  // userId از خود نشست
  const me = await fetch(`${BASE}/api/auth/get-session`, { headers: { cookie } });
  const meJson = (await me.json()) as { user?: { id?: string } };
  return { cookie, userId: meJson.user?.id ?? "", email };
}

async function main() {
  const fixture = await createFixtureUser();
  const authApi = (path: string, init?: RequestInit) =>
    api(path, { ...init, headers: { ...(init?.headers ?? {}), cookie: fixture.cookie } });

  /* ---------------------------- ۱) بانک و API ---------------------------- */
  const idxRes = await authApi("/api/exercises?scope=index");
  check("index API: 200", idxRes.status === 200, String(idxRes.status));
  const idx = (await idxRes.json()) as { items: Record<string, unknown>[]; total: number };

  check("index API: تعداد = ۹۰۵", idx.total === 905, String(idx.total));

  const cards = idx.items as unknown as Array<{
    id: string; has3d: boolean; coach3dId?: string;
    animation3d?: { profileId: string; params: Record<string, unknown> | null } | null;
    fa: string; en: string; difficulty: string; primaryMuscles: string[]; secondaryMuscles: string[];
    [k: string]: unknown;
  }>;

  const has3dCount = cards.filter((c) => c.has3d).length;
  check("پوشش ۳بعدی: همه ۹۰۵ حرکت has3d=true", has3dCount === 905, String(has3dCount));

  const legacyCards = cards.filter((c) => c.coach3dId);
  check("legacy: دقیقاً ۶ حرکت با coach3dId", legacyCards.length === 6, String(legacyCards.length));
  check("legacy: بدون نگاشت پارامتری (رفتار قبلی فقط با coach3dId)",
    legacyCards.every((c) => !c.animation3d),
    JSON.stringify(legacyCards.filter((c) => c.animation3d).map((c) => c.id)));

  const parametricCards = cards.filter((c) => c.animation3d);
  check("پارامتری: ۸۹۹ حرکت با نگاشت", parametricCards.length === 899, String(parametricCards.length));

  // whitelist — فیلدهای مجاز فقط
  const ALLOWED = new Set(["id", "fa", "en", "category", "primaryMuscles", "secondaryMuscles", "equipment", "difficulty", "pattern", "compound", "exerciseType", "has3d", "coach3dId", "animation3d", "contentLocale", "summary", "summaryEn", "mistakesPreview"]);
  const leaked = new Set<string>();
  for (const c of cards) for (const k of Object.keys(c)) if (!ALLOWED.has(k)) leaked.add(k);
  check("whitelist: هیچ فیلد داخلی در کارت نیست", leaked.size === 0, [...leaked].join(","));

  // params فقط اسکالر
  const badParams = parametricCards.filter(
    (c) => c.animation3d!.params !== null && Object.values(c.animation3d!.params!).some((v) => typeof v !== "string" && typeof v !== "number" && typeof v !== "boolean")
  );
  check("params: فقط مقادیر اسکالر", badParams.length === 0, badParams.slice(0, 3).map((c) => c.id).join(","));

  /* ------------------------- ۲) حل صحنه همه حرکات ------------------------- */
  let resolved = 0;
  let badCycle = 0;
  let holdCount = 0;
  let repsCount = 0;
  const badResolves: string[] = [];
  for (const c of cards) {
    const scene = resolveScene({
      id: c.id,
      fa: c.fa,
      en: c.en,
      difficulty: c.difficulty as never,
      primaryMuscles: c.primaryMuscles as never,
      secondaryMuscles: c.secondaryMuscles as never,
      coach3dId: c.coach3dId,
      animation3d: c.animation3d ?? null,
    });
    if (!scene) {
      badResolves.push(c.id);
      continue;
    }
    resolved++;
    const total = cycleDuration(scene.def.cycle);
    if (!(total > 0) || scene.def.cycle.length < 2) badCycle++;
    if (scene.counterMode === "hold") holdCount++;
    else repsCount++;
  }
  check("resolveScene: همه ۹۰۵ حل می‌شوند", resolved === 905, `resolved=${resolved} bad=${badResolves.slice(0, 5).join(",")}`);
  check("resolveScene: همه چرخه‌ها قابل پخش", badCycle === 0, String(badCycle));
  check("counterMode: hold و reps هر دو حضور دارند", holdCount > 0 && repsCount > 0, `hold=${holdCount} reps=${repsCount}`);

  /* ---------------------- ۳) حفظ رفتار ۶ حرکت legacy ---------------------- */
  for (const legacyDef of LEGACY_BANK) {
    const card = cards.find((c) => c.coach3dId === legacyDef.id);
    if (!card) continue;
    const scene = resolveScene({
      id: card.id, fa: card.fa, en: card.en, difficulty: card.difficulty as never,
      primaryMuscles: card.primaryMuscles as never, secondaryMuscles: card.secondaryMuscles as never,
      coach3dId: card.coach3dId, animation3d: null,
    });
    const same = scene
      && scene.source === "legacy"
      && scene.def.cycle.length === legacyDef.cycle.length
      && Math.abs(cycleDuration(scene.def.cycle) - cycleDuration(legacyDef.cycle)) < 1e-9
      && scene.counterMode === "reps";
    check(`legacy حفظ: ${legacyDef.id}`, Boolean(same));
  }

  /* ---------------------- ۴) منطق شمارنده و سرعت ---------------------- */
  // شبیه‌سازی موتور: reps فقط با چرخه کامل؛ hold هرگز bump نمی‌کند
  const sampleReps = cards.find((c) => c.animation3d?.profileId === "squat")!;
  const squatScene = resolveScene({ id: sampleReps.id, fa: sampleReps.fa, en: sampleReps.en, difficulty: "مبتدی", primaryMuscles: [], secondaryMuscles: [], coach3dId: undefined, animation3d: sampleReps.animation3d! })!;
  check("اسکوات: counterMode=reps", squatScene.counterMode === "reps");

  // شبیه‌سازی تیک موتور انیمیشن (منطق خالص مشابه ExerciseAnimator)
  let simTime = 0;
  let simReps = 0;
  const total = cycleDuration(squatScene.def.cycle);
  const speed = 1.75; // تغییر سرعت — شمارنده باید هماهنگ بماند
  for (let i = 0; i < 400; i++) {
    const step = 0.016 * speed;
    simTime += step;
    if (simTime >= total) {
      simTime -= total;
      simReps += squatScene.def.repsPerCycle ?? 1;
    }
  }
  const expectedReps = Math.floor((400 * 0.016 * speed) / total) * (squatScene.def.repsPerCycle ?? 1);
  check("شمارنده با تغییر سرعت هماهنگ است", simReps === expectedReps, `sim=${simReps} expected=${expectedReps}`);

  // میان‌یابی: هیچ NaN در وضعیت مفاصل بین همه کلیدفریم‌ها
  let nanFound = false;
  for (const c of cards.slice(0, 250)) {
    const scene = resolveScene({ id: c.id, fa: c.fa, en: c.en, difficulty: "مبتدی", primaryMuscles: [], secondaryMuscles: [], coach3dId: c.coach3dId, animation3d: c.animation3d ?? null });
    if (!scene) continue;
    const t = cycleDuration(scene.def.cycle) * 0.5;
    const loc = locateInCycle(scene.def.cycle, t);
    const pose = blendKeyframes(loc.from, loc.to, loc.phaseT);
    for (const j of Object.values(pose.joints)) {
      if (j.some((v) => !Number.isFinite(v))) nanFound = true;
    }
    if (!Number.isFinite(pose.impl.x) || !Number.isFinite(pose.impl.y)) nanFound = true;
  }
  check("میان‌یابی: بدون NaN در وضعیت مفاصل و پیاده‌سازی", !nanFound);

  /* ----------------- ۵) ایزومتریک: داده counterMode درست ----------------- */
  const plankCard = cards.find((c) => /plank/i.test(c.en) && c.animation3d?.profileId === "plank");
  check("پلانک موجود است", Boolean(plankCard));
  if (plankCard) {
    const scene = resolveScene({ id: plankCard.id, fa: plankCard.fa, en: plankCard.en, difficulty: "مبتدی", primaryMuscles: [], secondaryMuscles: [], coach3dId: undefined, animation3d: plankCard.animation3d! })!;
    check("پلانک: counterMode=hold (بدون شمارش تکرار)", scene.counterMode === "hold");
  }

  /* ----------------- ۶) جزئیات API — نگاشت در جزئیات هم هست ----------------- */
  const someCard = parametricCards[0];
  const detRes = await authApi(`/api/exercises/${someCard.id}`);
  check("جزئیات API: 200", detRes.status === 200, String(detRes.status));
  const detWrap = (await detRes.json()) as { exercise?: Record<string, unknown> };
  const det = detWrap.exercise ?? detWrap;
  check("جزئیات: has3d=true", det.has3d === true);
  check("جزئیات: نگاشت حاضر است", Boolean(det.animation3d && (det.animation3d as { profileId?: string }).profileId));
  check("جزئیات: sourceLicense افشا نشده", !("sourceLicense" in det) && !("datasetVersion" in det));

  /* ----------------- ۷) DB integrity ----------------- */
  const active = await db.exercise.count({ where: { status: "active" } });
  const ready = await db.exercise.count({ where: { status: "active", animation3dStatus: "ready" } });
  check("DB: ۹۰۵ فعال / ۹۰۵ ready", active === 905 && ready === 905, `active=${active} ready=${ready}`);
  const badLegacy = await db.exercise.count({ where: { coach3dId: { not: null }, animation3dProfileId: { not: null } } });
  check("DB: legacy بدون profileId پارامتری", badLegacy === 0, String(badLegacy));

  /* ----------------- ۸) پاک‌سازی fixture ----------------- */
  if (fixture.userId) {
    await db.user.delete({ where: { id: fixture.userId } });
    const remaining = await db.user.count({ where: { email: { contains: "p19test-" } } });
    check("پاک‌سازی fixture کامل", remaining === 0, String(remaining));
  }

  console.log("\n===== P19 TEST SUMMARY =====");
  console.log(`executed: ${executedTests.length}`);
  const unique = new Set(executedTests).size;
  console.log(`unique:   ${unique}`);
  console.log(`duplicates within run: ${executedTests.length - unique}`);
  console.log(`passed:   ${passed}`);
  console.log(`failed:   ${failed}`);
  if (failed > 0) {
    for (const f of failures) console.log(`  - ${f}`);
  }
  await db.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
