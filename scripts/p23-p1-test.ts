/**
 * p23-p1-test.ts — سوئیت تست مرحله ۲۰/بسته P1 (کتابخانه اختصاصی مربی).
 *
 * پوشش الزامات P1:
 *  - R1.1 جداسازی داده جست‌وجوی کتابخانه شخصی (هر مربی فقط حرکات خودش)
 *  - R1.2 ذخیره حرکت عمومی به کتابخانه شخصی: رکورد مالکِ مربی، بانک عمومی
 *    دست‌نخورده، ثبت منشا (sourceExerciseId)، رفتار ذخیره دوباره (کپی دوم
 *    مستقل — معیار A1.3 سند طرح)، خطاهای دسترسی/ورودی/سقف
 *  - R1.3 سقف ۳۰۰ سمت سرور: پذیرش شماره ۳۰۰، رد ۳۰۱ (409)، مسیرهای مختلف
 *    ساخت، و جلوگیری از عبور در درخواست‌های هم‌زمان (قفل درون‌پردازشی مربی)
 *  - R1.4 snapshot عضلات: کپی عضلات هنگام ذخیره از بانک؛ پایداری snapshot
 *    در برابر تغییر منبع عمومی؛ عضلات snapshot در محتوای برنامه (با پالایش
 *    به ۱۲ گروه سه‌بعدی)؛ چرخه ویرایش برنامه (رگرسیون P0)
 *  - رگرسیون بانک عمومی (۹۰۵) + integrity_check پایانی
 *
 * پاکسازی: فقط fixtureهای خودش (کاربران p23-* + رکوردهای وابسته)؛ رکورد
 * عمومی mutateشده در تست snapshot به مقدار اصلی (با updatedAt) برمی‌گردد.
 *
 * اجرا: bun scripts/p23-p1-test.ts   (سرور زنده روی :3000)
 */

import { PrismaClient } from "@prisma/client";
import { withPersonalPrefix, storedExerciseIdToWire } from "../src/lib/coaching/personal-exercise-id";
import { filterSessionMuscles } from "../src/lib/fitness3d/types";
import { COACH_EXERCISE_LIMITS } from "../src/lib/coaching/constants";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const STAMP = Date.now();
const PASSWORD = "p23-test-pass1";
const CAP = COACH_EXERCISE_LIMITS.LIBRARY_MAX; // 300

const db = new PrismaClient();

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
const checks: Check[] = [];

function ok(name: string, condition: boolean, detail = "") {
  checks.push({ name, ok: condition, detail });
  console.log(`${condition ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

interface User {
  email: string;
  cookie: string;
  userId: string;
}

const cleanupUserIds: string[] = [];

async function createUser(name: string, role: "COACH" | "STUDENT", attempt = 0): Promise<User> {
  const email = `p23-${name}-${STAMP}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P23 ${name}` }),
  });
  if (res.status === 429 && attempt < 3) {
    console.log(`  … نرخ‌سنجی auth؛ ۶۵ ثانیه صبر برای ${name}`);
    await new Promise((r) => setTimeout(r, 65_000));
    return createUser(name, role, attempt + 1);
  }
  if (res.status !== 200) throw new Error(`signup failed for ${name}: ${res.status}`);
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error(`user row missing for ${name}`);
  cleanupUserIds.push(row.id);
  if (role === "COACH") {
    await db.user.update({ where: { id: row.id }, data: { role: "COACH" } });
    await db.coachProfile.create({
      data: {
        userId: row.id,
        displayName: `P23 ${name}`,
        headline: "fixture",
        bio: null,
        specializationsJson: JSON.stringify([]),
        certificationsJson: JSON.stringify([]),
        experienceYears: 1,
        cooperationTypesJson: JSON.stringify(["PRIVATE"]),
        verified: true,
        published: false,
      },
    });
  }
  return { email, cookie: cookie ?? "", userId: row.id };
}

async function api(
  user: User | null,
  path: string,
  init?: RequestInit,
  attempt = 0
): Promise<{ status: number; body: Record<string, unknown> }> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        ...(user && user.cookie ? { cookie: user.cookie } : {}),
      },
    });
  } catch (error) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 8000));
      return api(user, path, init, attempt + 1);
    }
    throw error;
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    // پاسخ بدون بدنه — مجاز
  }
  return { status: res.status, body };
}

/* ---------------- بخش ۱ — واحد (بدون سرور) ---------------- */

function unitTests() {
  console.log("\n== بخش ۱: واحد — سقف، پالایش عضلات، اسکیمای ورودی ==");

  ok("سقف پیش‌فرض کتابخانه ۳۰۰ است", CAP === 300, String(CAP));

  const filtered = filterSessionMuscles(["chest", "adductors", "quads", "lower-back", "neck", "abs"]);
  ok(
    "پالایش عضلات: فقط گروه‌های سه‌بعدی می‌مانند",
    JSON.stringify(filtered) === JSON.stringify(["chest", "quads", "abs"]),
    JSON.stringify(filtered)
  );
  ok("پالایش عضلات: ورودی خالی → خالی", filterSessionMuscles([]).length === 0);
}

/* ---------------- بخش ۲ — انتها-به-انتها (سرور زنده) ---------------- */

interface ContentRow {
  exerciseId: string;
  source?: string;
  faName: string;
  coach3dId: string | null;
  primaryMuscles?: string[];
}

const SHARED_FA = "P23 حرکت مشترک جست‌وجو";
const SHARED_EN = "P23 Shared Search Move";

async function createPersonal(
  user: User,
  overrides: Partial<{ faName: string; enName: string; primaryMuscles: string[] }> = {}
) {
  return api(user, "/api/coach/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: overrides.faName ?? SHARED_FA,
      enName: overrides.enName ?? SHARED_EN,
      category: "quads",
      equipment: [],
      primaryMuscles: overrides.primaryMuscles ?? ["quads"],
      secondaryMuscles: [],
      description: "",
      tips: "",
    }),
  });
}

async function integrationTests() {
  console.log("\n== بخش ۲: انتها-به-انتها (سرور زنده + fixture) ==");

  const coachA = await createUser("coachA", "COACH");
  const coachB = await createUser("coachB", "COACH");
  const student = await createUser("student", "STUDENT");

  /* --- R1.3: cap در پاسخ GET --- */
  const listA0 = await api(coachA, "/api/coach/exercises");
  const capFromServer = Number(listA0.body.cap ?? -1);
  ok("GET شامل cap سرور است (۳۰۰)", listA0.status === 200 && capFromServer === 300, `cap=${capFromServer}`);

  /* --- R1.1: جداسازی داده جست‌وجوی کتابخانه شخصی --- */
  const aSearch = await createPersonal(coachA);
  ok("مربی A حرکت خود را ساخت", aSearch.status === 201, `got ${aSearch.status}`);
  const bSearch = await createPersonal(coachB);
  ok("مربی B حرکت هم‌نام ساخت", bSearch.status === 201, `got ${bSearch.status}`);
  const aId = String((aSearch.body.exercise as { id?: string } | undefined)?.id ?? "");
  const bId = String((bSearch.body.exercise as { id?: string } | undefined)?.id ?? "");

  const listA1 = await api(coachA, "/api/coach/exercises");
  const aItems = (listA1.body.exercises as { id: string }[] | undefined) ?? [];
  const listB1 = await api(coachB, "/api/coach/exercises");
  const bItems = (listB1.body.exercises as { id: string }[] | undefined) ?? [];
  ok(
    "جست‌وجو/فهرست مربی A فقط حرکات خودش را می‌بیند (بدون افشای B)",
    aItems.some((x) => x.id === aId) && !aItems.some((x) => x.id === bId),
    `A count=${aItems.length}`
  );
  ok(
    "جست‌وجو/فهرست مربی B فقط حرکات خودش را می‌بیند (بدون افشای A)",
    bItems.some((x) => x.id === bId) && !bItems.some((x) => x.id === aId),
    `B count=${bItems.length}`
  );

  /* --- R1.2/P1.3: ذخیره از بانک عمومی + snapshot عضلات --- */
  const PUBLIC_ID = "pushup";
  const before = await db.exercise.findUnique({ where: { id: PUBLIC_ID } });
  if (!before) throw new Error("public exercise pushup missing — aborting");
  const saved = await api(coachA, "/api/coach/exercises/from-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseId: PUBLIC_ID }),
  });
  ok("ذخیره حرکت عمومی → 201", saved.status === 201, `got ${saved.status}`);
  const savedEx = saved.body.exercise as
    | { id: string; faName: string; enName: string; category: string; primaryMuscles: string[]; secondaryMuscles: string[]; description: string }
    | undefined;
  const savedRow = await db.coachExercise.findUnique({ where: { id: savedEx?.id ?? "" } });
  ok("منشا ثبت شده (sourceExerciseId=pushup)", savedRow?.sourceExerciseId === PUBLIC_ID, savedRow?.sourceExerciseId ?? "—");
  ok("snapshot نام فارسی/انگلیسی/دسته", savedEx?.faName === "شنا سوئدی" && savedEx?.enName === "Push-up" && savedEx?.category === "chest");
  ok(
    "snapshot عضلات = عضلات منبع",
    JSON.stringify(savedEx?.primaryMuscles) === JSON.stringify(["chest"]) &&
      JSON.stringify(savedEx?.secondaryMuscles) === JSON.stringify(["triceps", "shoulders", "abs"]),
    JSON.stringify(savedEx?.primaryMuscles)
  );
  ok("فیلدهای غیرضروری کپی نشده‌اند (description خالی)", savedEx?.description === "");

  // بانک عمومی بعد از ذخیره عیناً همان است
  const afterSave = await db.exercise.findUnique({ where: { id: PUBLIC_ID } });
  ok(
    "رکورد بانک عمومی پس از ذخیره دست‌نخورده",
    JSON.stringify({ ...afterSave }) === JSON.stringify({ ...before }),
    "full-row compare"
  );

  // ذخیره دوباره → کپی دوم مستقل (A1.3 سند طرح) با منشای ثبت‌شده
  const saved2 = await api(coachA, "/api/coach/exercises/from-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseId: PUBLIC_ID }),
  });
  ok("ذخیره دوباره همان عمومی → کپی دوم مستقل (201)", saved2.status === 201, `got ${saved2.status}`);
  const saved2Ex = saved2.body.exercise as { id: string } | undefined;
  ok("کپی دوم شناسه متفاوت دارد", Boolean(saved2Ex?.id) && saved2Ex?.id !== savedEx?.id);
  const both = await db.coachExercise.findMany({ where: { sourceExerciseId: PUBLIC_ID, coachId: coachA.userId } });
  ok("هر دو کپی منشای یکسان ثبت‌شده‌اند", both.length === 2 && both.every((r) => r.sourceExerciseId === PUBLIC_ID), `rows=${both.length}`);

  // ویرایش یک کپی، کپی دیگر و منبع را تغییر نمیدهد (استقلال کامل)
  const edit1 = await api(coachA, `/api/coach/exercises/${savedEx?.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "شنا سوئدی — نسخه ویرایش‌شده",
      enName: "Push-up (edited)",
      category: "chest",
      equipment: [],
      primaryMuscles: ["chest", "abs"],
      secondaryMuscles: [],
      description: "ویرایش مربی",
      tips: "",
    }),
  });
  ok("ویرایش کپی اول موفق", edit1.status === 200, `got ${edit1.status}`);
  const copy2After = await db.coachExercise.findUnique({ where: { id: saved2Ex?.id ?? "" } });
  ok("کپی دوم پس از ویرایش کپی اول دست‌نخورده", copy2After?.enName === "Push-up", copy2After?.enName ?? "—");

  /* --- P1.3: تغییر منبع عمومی، snapshot شخصی را تغییر نمیدهد ---
   * نسخه بررسی‌شده کپی دوم (پرِستین) است — کپی اول در تست استقلال ویرایش شده
   * بود (رفتار درست محصول: ویرایش مربی سالم است). */
  const origMuscles = before.primaryMusclesJson;
  const origUpdatedAt = before.updatedAt;
  await db.exercise.update({ where: { id: PUBLIC_ID }, data: { primaryMusclesJson: '["back"]' } });
  const pristineAfterSourceChange = await db.coachExercise.findUnique({ where: { id: saved2Ex?.id ?? "" } });
  ok(
    "تغییر منبع عمومی snapshot شخصی را تغییر نمیدهد",
    pristineAfterSourceChange?.primaryMusclesJson === origMuscles,
    pristineAfterSourceChange?.primaryMusclesJson ?? "—"
  );
  // بازگردانی دقیق رکورد منبع (پاکسازی تست — محتوا + updatedAt)
  await db.exercise.update({
    where: { id: PUBLIC_ID },
    data: { primaryMusclesJson: origMuscles, updatedAt: origUpdatedAt },
  });
  const restored = await db.exercise.findUnique({ where: { id: PUBLIC_ID } });
  ok("رکورد منبع دقیقاً به حالت اصلی برگشت", JSON.stringify({ ...restored }) === JSON.stringify({ ...before }));

  /* --- R1.4: snapshot عضلات در محتوای برنامه + پالایش سه‌بعدی + رگرسیون P0 --- */
  const quadsEx = await createPersonal(coachA, {
    faName: "P23 حرکت چهارسر با عضله کتابخانه‌ای",
    enName: "P23 Quads With Library Muscle",
    primaryMuscles: ["quads", "adductors"], // adductors کتابخانه‌ای است و باید پالایش شود
  });
  const quadsId = String((quadsEx.body.exercise as { id?: string } | undefined)?.id ?? "");
  const planRes = await api(coachA, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "P23 برنامه با snapshot عضلات",
      description: "",
      goal: "fitness",
      difficulty: "beginner",
      durationMinutes: 45,
      days: [
        {
          title: "روز اول",
          exercises: [
            { exerciseId: withPersonalPrefix(quadsId), sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60 },
            { exerciseId: PUBLIC_ID, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 },
          ],
        },
      ],
    }),
  });
  ok("برنامه با حرکت شخصی + عمومی ساخته شد (201)", planRes.status === 201, `got ${planRes.status}`);
  const planRows =
    ((planRes.body.plan as { content?: { days?: { exercises?: ContentRow[][] } } } | undefined)?.content?.days?.[0]
      ?.exercises as ContentRow[] | undefined) ?? [];
  ok(
    "محتوای برنامه: عضلات snapshot شخصی با پالایش سه‌بعدی (adductors حذف)",
    JSON.stringify(planRows[0]?.primaryMuscles) === JSON.stringify(["quads"]),
    JSON.stringify(planRows[0]?.primaryMuscles)
  );
  ok(
    "محتوای برنامه: عضلات snapshot عمومی از بانک",
    JSON.stringify(planRows[1]?.primaryMuscles) === JSON.stringify(["chest"]),
    JSON.stringify(planRows[1]?.primaryMuscles)
  );
  ok("رگرسیون P0: سطر شخصی source=personal و شناسه خام", planRows[0]?.source === "personal" && planRows[0]?.exerciseId === quadsId);

  // چرخه ویرایش (re-save) — رگرسیون P0 + پایداری snapshot پس از ویرایش
  const planId = String((planRes.body.plan as { id?: string } | undefined)?.id ?? "");
  const reSaved = await api(coachA, `/api/coach/workout-plans/${planId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "P23 برنامه با snapshot عضلات — ویرایش",
      description: "",
      goal: "fitness",
      difficulty: "beginner",
      durationMinutes: 45,
      days: [
        {
          title: "روز اول",
          exercises: planRows.map((row) => ({
            exerciseId: storedExerciseIdToWire(row),
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 60,
          })),
        },
      ],
    }),
  });
  ok("re-save برنامه (چرخه P0) موفق (200)", reSaved.status === 200, `got ${reSaved.status}`);
  const reRows =
    ((reSaved.body.plan as { content?: { days?: { exercises?: ContentRow[][] } } } | undefined)?.content?.days?.[0]
      ?.exercises as ContentRow[] | undefined) ?? [];
  ok(
    "پس از re-save: عضلات snapshot پایدار مانده‌اند",
    JSON.stringify(reRows[0]?.primaryMuscles) === JSON.stringify(["quads"]) &&
      JSON.stringify(reRows[1]?.primaryMuscles) === JSON.stringify(["chest"]),
    JSON.stringify(reRows[0]?.primaryMuscles)
  );

  /* --- جداسازی مالکیت (ضد-IDOR) --- */
  const stealEdit = await api(coachB, `/api/coach/exercises/${quadsId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "سرقت", enName: "steal", category: "quads",
      equipment: [], primaryMuscles: [], secondaryMuscles: [], description: "", tips: "",
    }),
  });
  ok("ویرایش حرکت شخصی دیگری → 404 (ضد-IDOR)", stealEdit.status === 404, `got ${stealEdit.status}`);
  const bOwnSave = await api(coachB, "/api/coach/exercises/from-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseId: PUBLIC_ID }),
  });
  const bOwnId = String((bOwnSave.body.exercise as { id?: string } | undefined)?.id ?? "");
  const aListAfter = await api(coachA, "/api/coach/exercises");
  const aItems2 = (aListAfter.body.exercises as { id: string }[] | undefined) ?? [];
  ok(
    "from-public برای B رکورد خود B را میسازد (نه A)",
    bOwnSave.status === 201 && !aItems2.some((x) => x.id === bOwnId),
    `got ${bOwnSave.status}`
  );

  /* --- خطاهای ورودی/دسترسی --- */
  const notFound = await api(coachA, "/api/coach/exercises/from-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseId: "does-not-exist-xyz" }),
  });
  ok("حرکت عمومی ناموجود → 404 EXERCISE_NOT_IN_BANK", notFound.status === 404, `got ${notFound.status}`);
  const badBody = await api(coachA, "/api/coach/exercises/from-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wrong: "shape" }),
  });
  ok(
    "ورودی نامعتبر → 400 (قرارداد شِمای پروژه)",
    badBody.status === 400,
    `got ${badBody.status}`
  );
  const studentTry = await api(student, "/api/coach/exercises/from-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseId: PUBLIC_ID }),
  });
  ok("دانشجو → 403 (requireCoach پابرجا)", studentTry.status === 403, `got ${studentTry.status}`);

  /* --- R1.3: سقف ۳۰۰ سمت سرور --- */
  const currentCount = await db.coachExercise.count({ where: { coachId: coachA.userId } });
  const toSeed = CAP - currentCount - 1; // تا درج بعدی دقیقاً حرکت شماره ۳۰۰ باشد
  await db.coachExercise.createMany({
    data: Array.from({ length: toSeed }, (_, i) => ({
      coachId: coachA.userId,
      faName: `P23 سید ${i + 1}`,
      enName: `P23 Seed ${i + 1}`,
      category: "chest",
    })),
  });
  const count300 = await api(coachA, "/api/coach/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "P23 حرکت شماره ۳۰۰", enName: "P23 Number 300", category: "chest",
      equipment: [], primaryMuscles: ["chest"], secondaryMuscles: [], description: "", tips: "",
    }),
  });
  ok("حرکت شماره ۳۰۰ پذیرفته میشود (201)", count300.status === 201, `got ${count300.status}`);
  const count301 = await api(coachA, "/api/coach/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "P23 حرکت شماره ۳۰۱", enName: "P23 Number 301", category: "chest",
      equipment: [], primaryMuscles: ["chest"], secondaryMuscles: [], description: "", tips: "",
    }),
  });
  ok(
    "حرکت شماره ۳۰۱ رد میشود (409 COACH_EXERCISE_CAP_REACHED)",
    count301.status === 409 && count301.body.error === "COACH_EXERCISE_CAP_REACHED",
    `got ${count301.status} ${String(count301.body.error ?? "")}`
  );
  // شناسه واقعی دوم از خود بانک برای مسیر from-public در سقف
  const bankSample = await api(coachA, "/api/exercises?page=1&pageSize=5");
  const secondPublicId =
    ((bankSample.body.items as { id: string }[] | undefined) ?? []).find((x) => x.id !== PUBLIC_ID)?.id ?? "";
  const fp301 = await api(coachA, "/api/coach/exercises/from-public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ exerciseId: secondPublicId }),
  });
  ok(
    `مسیر دوم ساخت (from-public «${secondPublicId}») هم در سقف 409 می‌گیرد`,
    fp301.status === 409 && fp301.body.error === "COACH_EXERCISE_CAP_REACHED",
    `got ${fp301.status} ${String(fp301.body.error ?? "")}`
  );
  const countAtCap = await db.coachExercise.count({ where: { coachId: coachA.userId } });
  ok("شمار دقیقاً روی سقف است (نه بیشتر)", countAtCap === CAP, String(countAtCap));

  /* --- R1.3: درخواست‌های هم‌زمان — هیچ عبوری از سقف --- */
  const seeded = await db.coachExercise.findMany({
    where: { coachId: coachA.userId, enName: { startsWith: "P23 Seed" } },
    select: { id: true },
    take: 4,
  });
  await db.coachExercise.deleteMany({ where: { id: { in: seeded.map((r) => r.id) } } });
  const frees = 4;
  const PARALLEL = 10;
  const results = await Promise.all(
    Array.from({ length: PARALLEL }, () =>
      api(coachA, "/api/coach/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faName: "P23 هم‌زمان", enName: `P23 Concurrent ${Math.random().toString(36).slice(2, 8)}`,
          category: "chest", equipment: [], primaryMuscles: ["chest"], secondaryMuscles: [], description: "", tips: "",
        }),
      })
    )
  );
  const accepted = results.filter((r) => r.status === 201).length;
  const rejected = results.filter((r) => r.status === 409).length;
  ok(
    `هم‌زمانی: دقیقاً ${frees} درخواست از ${PARALLEL} پذیرفته شد`,
    accepted === frees && rejected === PARALLEL - frees,
    `accepted=${accepted} rejected=${rejected}`
  );
  const finalCount = await db.coachExercise.count({ where: { coachId: coachA.userId } });
  ok("پس از هم‌زمانی شمار دقیقاً روی سقف است (بدون عبور)", finalCount === CAP, String(finalCount));

  /* --- رگرسیون بانک عمومی --- */
  const bank = await api(coachA, "/api/exercises?page=1&pageSize=1");
  const total = Number((bank.body as { total?: number }).total ?? -1);
  ok("بانک عمومی ۹۰۵ حرکت (رگرسیون)", total === 905, String(total));
  const bankActive = await db.exercise.count({ where: { status: "active" } });
  ok("بانک عمومی فعال ۹۰۵ (بدون تغییر ساختاری)", bankActive === 905, String(bankActive));
}

/* ---------------- پاکسازی ---------------- */

async function cleanup() {
  console.log("\n== پاکسازی fixtureها ==");
  for (const userId of cleanupUserIds) {
    await db.coachWorkoutPlan.deleteMany({ where: { coachId: userId } });
    await db.coachExercise.deleteMany({ where: { coachId: userId } });
    await db.coachExerciseFolder.deleteMany({ where: { coachId: userId } });
    await db.coachProfile.deleteMany({ where: { userId } });
    await db.assistantConversation.deleteMany({ where: { userId } });
    await db.fitnessProfile.deleteMany({ where: { userId } });
    await db.session.deleteMany({ where: { userId } });
    await db.account.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
  const remaining = await db.user.count();
  ok("کاربران واقعی دست‌نخورده", remaining === 4, `users=${remaining} (1 ADMIN + 3 STUDENT)`);
  const coachEx = await db.coachExercise.count();
  ok("کتابخانه شخصی خالی برگشت (بدون باقی‌گذاری fixture)", coachEx === 0, String(coachEx));
  const integrity = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  ok("integrity_check", integrity[0]?.integrity_check === "ok", integrity[0]?.integrity_check ?? "—");
}

async function main() {
  unitTests();
  try {
    await integrationTests();
  } finally {
    await cleanup();
    await db.$disconnect();
  }
  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) {
    console.log("FAILED:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
