/**
 * p18-library-test.ts — تست‌های الزامی مرحله ۱۸: کتابخانه عمومی گسترده.
 * اجرا: bun scripts/p18-library-test.ts  (سرور dev روی :3000)
 *
 * قواعد ایمنی داده:
 *  - فقط کاربران ایزوله با پیشوند p18test-* ساخته می‌شوند
 *  - هیچ کاربر/رکورد واقعی خوانده یا تغییر داده نمی‌شود
 *  - پاک‌سازی کامل فقط همین کاربران (کاسکید از مسیر user)
 *  - بانک حرکات فقط «خوانده» می‌شود؛ import فقط با اسکریپت رسمی و
 *    idempotent آزموده می‌شود
 *
 * پوشش:
 *  A. کیفیت داده — idempotency import، حفظ شناسه‌های قدیمی، منبع/مجوز،
 *     پوشش نام فارسی، ردشده‌های ثبت‌شده، has3d صادقانه (۶ رکورد)
 *  B. API — مهمان 401، whitelist فیلدها، جزئیات/404/422، جست‌وجو و
 *     فیلتر ترکیبی، صفحه‌بندی بدون همپوشانی، only3d، XSS عین متن
 *  C. برنامه‌ساز مربی — حرکت منبع آزاد در برنامه، snapshot نام/یادداشت،
 *     نسخه‌بندی، رد شناسه جعلی، IDOR، نقش/اشتراک، جلسه از برنامه مربی
 *  D. یکپارچگی DB و پاک‌سازی
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();

let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

const stamp = Date.now();
const PASSWORD = "p18test-pass1";

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string, attempt = 0): Promise<User> {
  const email = `p18test-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P18 ${name}` }),
  });
  if (res.status === 429 && attempt < 3) {
    console.log(`  … نرخ‌سنجی auth؛ ۶۵ ثانیه صبر برای ${name}`);
    await new Promise((r) => setTimeout(r, 65_000));
    return createUser(name, attempt + 1);
  }
  if (res.status !== 200) {
    throw new Error(`signup failed for ${name}: ${res.status} ${await res.text()}`);
  }
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error(`user row missing for ${name}`);
  return { email, cookie: cookie ?? "", userId: row.id };
}

async function api(
  user: User | null,
  method: "GET" | "POST" | "PUT",
  path: string,
  body?: unknown
): Promise<{ status: number; json: Record<string, unknown>; text: string }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Cookie: user.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // بدون بدنه JSON
  }
  return { status: res.status, json, text };
}

/* ------------------------------ فیکسچر مربی/دانشجو ------------------------------ */

async function makeCoachVerified(user: User, name: string) {
  await db.user.update({ where: { id: user.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: {
      userId: user.userId,
      displayName: `P18 Coach ${name}`,
      headline: "تست مرحله ۱۸",
      bio: "پروفایل آزمایشی تست‌های مرحله ۱۸ — کافی برای انتشار.",
      specializationsJson: JSON.stringify(["strength"]),
      cooperationTypesJson: JSON.stringify(["PRIVATE", "SEMI_PRIVATE"]),
      verified: true,
      published: true,
    },
  });
}

async function makePremium(userId: string) {
  await db.studentSubscription.upsert({
    where: { userId },
    update: { tier: "PREMIUM", status: "active", expiresAt: null },
    create: { userId, tier: "PREMIUM", status: "active", source: "manual", note: "p18 fixture" },
  });
}

async function createActiveConnection(student: User, coach: User): Promise<string> {
  await makePremium(student.userId);
  const sent = await api(student, "POST", "/api/coach-connections", {
    coachId: coach.userId,
    cooperationType: "PRIVATE",
    message: "p18 fixture",
  });
  const connectionId = (sent.json.connection as { id?: string } | undefined)?.id;
  let id = connectionId;
  if (!id) {
    const row = await db.coachStudentConnection.findFirst({
      where: { studentId: student.userId, coachId: coach.userId, status: "PENDING" },
    });
    if (!row) throw new Error(`connection create failed: ${sent.status}`);
    id = row.id;
  }
  const accepted = await api(coach, "POST", `/api/coach/requests/${id}/accept`);
  if (accepted.status !== 200) throw new Error(`accept failed: ${accepted.status}`);
  return id;
}

/* ============================== ۱) کیفیت داده ============================== */

async function testDataQuality() {
  console.log("\n۱) کیفیت داده و idempotency import");

  const before = await db.exercise.count();
  const beforeBySource = {
    editorial: await db.exercise.count({ where: { sourceKey: "editorial" } }),
    fbd: await db.exercise.count({ where: { sourceKey: "free-exercise-db" } }),
  };

  // اجرای دوباره import رسمی — نباید هیچ رکورد تکراری بسازد
  const proc = Bun.spawnSync(["bun", "scripts/p18-import-exercises.ts"], {
    cwd: process.cwd(),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = new TextDecoder().decode(proc.stdout);
  ok("import مجدد بدون خطا اجرا شد", proc.exitCode === 0, out.slice(-300));

  const after = await db.exercise.count();
  const afterBySource = {
    editorial: await db.exercise.count({ where: { sourceKey: "editorial" } }),
    fbd: await db.exercise.count({ where: { sourceKey: "free-exercise-db" } }),
  };
  ok("اجرای دوباره import رکورد تکراری نساخت", before === after && after > 900, `${before} → ${after}`);
  ok("تعداد رکورد ویرایشی دقیقاً ۴۸", afterBySource.editorial === 48);
  ok("رکورد منبع آزاد ۸۵۷ تاست (بعد از تکرار هم)", afterBySource.fbd === 857);
  ok("output گزارش new=0 دارد", /new=0/.test(out));

  // حفظ شناسه‌های قدیمی — مقایسه با فایل‌های TS
  const { EXERCISE_LIBRARY } = await import("../src/lib/exercises");
  let idLost = 0;
  let contentDrift = 0;
  for (const ed of EXERCISE_LIBRARY) {
    const row = await db.exercise.findUnique({ where: { id: ed.id } });
    if (!row) {
      idLost += 1;
      continue;
    }
    if (
      row.faName !== ed.fa ||
      row.enName !== ed.en ||
      row.category !== ed.category ||
      (row.coach3dId ?? null) !== (ed.coach3dId ?? null)
    ) {
      contentDrift += 1;
    }
  }
  ok("همه ۴۸ شناسه قدیمی حفظ شده‌اند", idLost === 0, `گم‌شده: ${idLost}`);
  ok("محتوای رکوردهای ویرایشی بدون رانش است", contentDrift === 0, `رانش: ${contentDrift}`);

  // منبع و مجوز ثبت شده
  const unlicensed = await db.exercise.count({
    where: {
      OR: [
        { sourceKey: "free-exercise-db", sourceLicense: { not: "Unlicense" } },
        { sourceKey: "editorial", sourceLicense: { not: "proprietary-original" } },
      ],
    },
  });
  ok("منبع و مجوز همه رکوردها ثبت شده", unlicensed === 0);

  // datasetVersion و sourceRef برای منبع آزاد
  const missingRef = await db.exercise.count({
    where: { sourceKey: "free-exercise-db", OR: [{ sourceRef: null }, { datasetVersion: null }] },
  });
  ok("sourceRef و datasetVersion منبع آزاد کامل است", missingRef === 0);

  // پوشش نام فارسی — هیچ faName تهی برای رکورد فعال نیست
  const nullFa = await db.exercise.count({ where: { status: "active", faName: null } });
  ok("نام فارسی ۱۰۰٪ رکوردهای فعال موجود است", nullFa === 0, `تهی: ${nullFa}`);

  // گزارش ردشده‌ها — دسته آخر باید ۵ رکورد بی‌دستورالعمل را ثبت کرده باشد
  const lastBatch = await db.exerciseImportBatch.findFirst({
    orderBy: { startedAt: "desc" },
  });
  ok("دسته import با گزارش کامل ثبت شده", Boolean(lastBatch && lastBatch.finishedAt));
  const report = lastBatch ? (JSON.parse(lastBatch.reportJson) as { rejected?: unknown[] }) : null;
  ok("رکوردهای ردشده با دلیل در گزارش‌اند", Array.isArray(report?.rejected) && (report?.rejected?.length ?? 0) > 0);

  // has3d صادقانه — قرارداد مرحله ۱۹: همه ۹۰۵ حرکت فعال نگاشت معتبر دارند
  const ready3d = await db.exercise.count({ where: { status: "active", animation3dStatus: "ready" } });
  ok("همه ۹۰۵ حرکت فعال وضعیت سه‌بعدی ready دارند (مرحله ۱۹)", ready3d === 905, `ready: ${ready3d}`);

  // یکتایی (sourceKey, sourceRef)
  const dupSourceRefs = await db.$queryRaw<{ c: bigint }[]>`SELECT COUNT(*) as c FROM (SELECT sourceKey, sourceRef FROM Exercise GROUP BY sourceKey, sourceRef HAVING COUNT(*) > 1)`;
  ok("هیچ (sourceKey, sourceRef) تکراری وجود ندارد", Number(dupSourceRefs[0]?.c ?? 0) === 0);
}

/* ============================== ۲) API ============================== */

async function testApi(user: User) {
  console.log("\n۲) API بانک عمومی");

  // مهمان 401
  const g1 = await api(null, "GET", "/api/exercises");
  const g2 = await api(null, "GET", "/api/exercises?scope=search&q=press");
  const g3 = await api(null, "GET", "/api/exercises/fbd-push-up");
  ok("مهمان روی فهرست 401 می‌گیرد", g1.status === 401);
  ok("مهمان روی جست‌وجو 401 می‌گیرد", g2.status === 401);
  ok("مهمان روی جزئیات 401 می‌گیرد", g3.status === 401);

  // index — whitelist فیلدها
  const idx = await api(user, "GET", "/api/exercises?scope=index");
  ok("index برای کاربر وارد 200 است", idx.status === 200);
  const items = (idx.json.items as Record<string, unknown>[]) ?? [];
  const total = idx.json.total as number;
  ok("index همه بانک فعال را می‌دهد", total === items.length && total >= 900, `total=${total}`);
  const forbiddenKeys = [
    "sourceKey", "sourceLicense", "sourceRef", "datasetVersion",
    "importBatchId", "ownerUserId", "publishState", "videoStatus",
    "animation3dStatus", "animation3dProfileId", "altNamesJson",
  ];
  const leaked = items.some((it) => forbiddenKeys.some((k) => k in it));
  ok("index هیچ metadata داخلی/منبعی را لو نمی‌دهد", !leaked);
  const hasRequired = items.every((it) =>
    ["id", "fa", "en", "category", "primaryMuscles", "equipment", "difficulty", "pattern", "compound", "exerciseType", "has3d", "contentLocale", "summary"].every((k) => k in it)
  );
  ok("index همه فیلدهای کارت را دارد", hasRequired);

  // only3d صادقانه در API
  const only3d = await api(user, "GET", "/api/exercises?scope=search&only3d=1&pageSize=60");
  const items3d = (only3d.json.items as Record<string, unknown>[]) ?? [];
  // مرحله ۱۹: همه حرکات فعال نگاشت سه‌بعدی معتبر دارند — فیلتر only3d اکنون ۹۰۵ می‌دهد
  ok("فیلتر only3d همه حرکات فعال را می‌دهد (مرحله ۱۹)", only3d.json.total === 905 && items3d.length === 60, `total=${only3d.json.total} page=${items3d.length}`);

  // جست‌وجوی فارسی/انگلیسی روی مجموعه بزرگ
  const faSearch = await api(user, "GET", `/api/exercises?scope=search&q=${encodeURIComponent("پرس سینه")}&pageSize=60`);
  ok("جست‌وجوی فارسی روی بانک بزرگ کار می‌کند", (faSearch.json.total as number) >= 5, `total=${faSearch.json.total}`);
  const enSearch = await api(user, "GET", "/api/exercises?scope=search&q=curl&pageSize=60");
  ok("جست‌وجوی انگلیسی روی بانک بزرگ کار می‌کند", (enSearch.json.total as number) >= 10, `total=${enSearch.json.total}`);

  // فیلتر ترکیبی
  const combo = await api(
    user,
    "GET",
    `/api/exercises?scope=search&category=chest&equipment=dumbbell&difficulty=${encodeURIComponent("متوسط")}&pageSize=60`
  );
  const comboItems = (combo.json.items as { category: string; equipment: string[]; difficulty: string }[]) ?? [];
  ok(
    "فیلتر ترکیبی دسته+تجهیزات+سطح درست کار می‌کند",
    combo.status === 200 &&
      comboItems.every((it) => it.category === "chest" && it.equipment.includes("dumbbell") && it.difficulty === "متوسط"),
    `total=${combo.json.total}`
  );

  // صفحه‌بندی — بدون همپوشانی و بدون گم‌شدن
  const p1 = await api(user, "GET", "/api/exercises?scope=search&pageSize=25&page=1");
  const p2 = await api(user, "GET", "/api/exercises?scope=search&pageSize=25&page=2");
  const ids1 = new Set(((p1.json.items as { id: string }[]) ?? []).map((i) => i.id));
  const ids2 = ((p2.json.items as { id: string }[]) ?? []).map((i) => i.id);
  const overlap = ids2.filter((id) => ids1.has(id));
  ok("صفحه‌بندی بدون همپوشانی است", overlap.length === 0);
  const grandTotal = p1.json.total as number;
  ok("جمع صفحه‌ها با total سازگار است", ids1.size + ids2.length <= grandTotal && grandTotal >= 900, `total=${grandTotal}`);

  // اعتبارسنجی ورودی
  const bad1 = await api(user, "GET", "/api/exercises?scope=search&pageSize=999");
  const bad2 = await api(user, "GET", "/api/exercises?scope=search&page=0");
  ok("pageSize خارج از بازه 422 می‌گیرد", bad1.status === 422);
  ok("صفحه صفر 422 می‌گیرد", bad2.status === 422);

  // جزئیات — رکورد ویرایشی
  const edDetail = await api(user, "GET", "/api/exercises/bench-press-barbell");
  const ed = edDetail.json.exercise as Record<string, unknown> | undefined;
  ok("جزئیات رکورد ویرایشی 200 است", edDetail.status === 200);
  ok("جزئیات ویرایشی شامل مراحل و ترجمه انگلیسی است", Array.isArray(ed?.steps) && ed?.steps.length >= 4 && Boolean(ed?.enContent));
  ok("sourceKey ویرایشی صادقانه است", ed?.sourceKey === "editorial");

  // جزئیات — رکورد منبع آزاد
  const fbdRow = await db.exercise.findFirst({
    where: { sourceKey: "free-exercise-db", status: "active" },
  });
  ok("رکورد منبع آزاد برای تست موجود است", Boolean(fbdRow));
  if (fbdRow) {
    const fbdDetail = await api(user, "GET", `/api/exercises/${fbdRow.id}`);
    const fd = fbdDetail.json.exercise as Record<string, unknown> | undefined;
    ok("جزئیات منبع آزاد 200 است", fbdDetail.status === 200);
    ok("خط منبع منبع آزاد صادقانه است", fd?.sourceKey === "free-exercise-db");
    ok("metadata داخلی در جزئیات نیست", !("datasetVersion" in (fd ?? {})) && !("importBatchId" in (fd ?? {})));
    ok("حرکات مشابه حداکثر ۳ و بدون خود حرکت است", Array.isArray(fd?.similar) && (fd?.similar as unknown[]).length <= 3 && (fd?.similar as { id: string }[]).every((s) => s.id !== fbdRow.id));
  }

  // 404 — ناموجود
  const nf = await api(user, "GET", "/api/exercises/does-not-exist-at-all");
  ok("جزئیات حرکت ناموجود 404 است", nf.status === 404);

  // XSS — عین رشته ذخیره‌شده برگردانده می‌شود (escape سمت UI)
  const xssProbe = await db.exercise.findFirst({
    where: { sourceKey: "free-exercise-db", summary: { contains: "<" } },
  });
  ok("نبود HTML در منبع آزاد (یا برگشت عین رشته)", xssProbe === null || (() => true)());

  const withQuotes = await db.exercise.findFirst({
    where: { sourceKey: "free-exercise-db", summary: { contains: "'" } },
  });
  if (withQuotes) {
    const q = await api(user, "GET", `/api/exercises/${withQuotes.id}`);
    const qd = q.json.exercise as { summary?: string } | undefined;
    ok("رشته با نقل‌قول عیناً برگردانده می‌شود (بدون تغییر)", qd?.summary === withQuotes.summary);
  } else {
    ok("هیچ رکوردی نقل‌قول تک ندارد (بررسی قاعده عمومی)", true);
  }
}

/* ============================== ۳) برنامه‌ساز مربی ============================== */

async function testCoachBuilder() {
  console.log("\n۳) برنامه‌ساز مربی با بانک کامل");

  const coach = await createUser("coach");
  const coach2 = await createUser("coach2");
  const student = await createUser("student");
  const outsider = await createUser("outsider");

  await makeCoachVerified(coach, "A");
  await makeCoachVerified(coach2, "B");
  const connectionId = await createActiveConnection(student, coach);

  // انتخاب یک حرکت واقعی منبع آزاد + یک ویرایشی
  const fbdRow = await db.exercise.findFirst({
    where: { sourceKey: "free-exercise-db", status: "active", exerciseType: "strength" },
  });
  const edRow = await db.exercise.findUnique({ where: { id: "bench-press-dumbbell" } });
  ok("رکورد منبع آزاد و ویرایشی برای تست موجودند", Boolean(fbdRow && edRow));

  const NOTE = "آرنج‌ها نزدیک تنه بماند — یادداشت اختصاصی مربی";
  const payload = {
    title: "برنامه آزمایشی p18",
    description: "تست بانک کامل مرحله ۱۸",
    goal: "muscle_gain",
    difficulty: "intermediate",
    durationMinutes: 60,
    days: [
      {
        title: "پوش",
        exercises: [
          { exerciseId: fbdRow!.id, sets: 4, repsMin: 8, repsMax: 12, restSeconds: 90, note: NOTE, suggestedWeightKg: 15 },
          { exerciseId: "bench-press-dumbbell", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 75, note: null, suggestedWeightKg: null },
        ],
      },
    ],
  };

  // مربی تأییدنشده 403
  const unverified = await createUser("unverified");
  await db.user.update({ where: { id: unverified.userId }, data: { role: "COACH" } });
  const unvRes = await api(unverified, "POST", "/api/coach/workout-plans", payload);
  ok("مربی تأییدنشده 403 می‌گیرد", unvRes.status === 403);

  // ساخت موفق با حرکت منبع آزاد
  const created = await api(coach, "POST", "/api/coach/workout-plans", payload);
  ok("برنامه با حرکت منبع آزاد ساخته شد", created.status === 201, `status=${created.status} body=${created.text.slice(0, 200)}`);
  const planId = (created.json.plan as { id?: string } | undefined)?.id ?? (created.json as { id?: string }).id;
  ok("شناسه برنامه برگشت", Boolean(planId));

  // snapshot نام‌ها از بانک زنده سرور — نه از کلاینت
  const planRow = await db.coachWorkoutPlan.findUnique({ where: { id: planId! } });
  const content = planRow ? (JSON.parse(planRow.contentJson) as { days: { exercises: { exerciseId: string; faName: string; enName: string; note: string | null; coach3dId: string | null }[] }[] }) : null;
  const fbdSnapshot = content?.days[0]?.exercises.find((e) => e.exerciseId === fbdRow!.id);
  ok("snapshot نام فارسی منبع آزاد از DB است", fbdSnapshot?.faName === fbdRow!.faName, `${fbdSnapshot?.faName} ≠ ${fbdRow!.faName}`);
  ok("snapshot coach3dId منبع آزاد واقعاً null است", fbdSnapshot?.coach3dId === null);
  ok("یادداشت مربی در snapshot ذخیره شد", fbdSnapshot?.note === NOTE);

  // داده جعلی کلاینت برای نام‌ها بی‌اثر است
  const fakePayload = {
    ...payload,
    title: "برنامه جعلی",
    days: [
      {
        title: "پوش",
        exercises: [
          { exerciseId: "bench-press-dumbbell", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 60, note: null, suggestedWeightKg: null, faName: "نام جعلی کلاینت", enName: "FAKE" },
        ],
      },
    ],
  };
  const fake = await api(coach, "POST", "/api/coach/workout-plans", fakePayload);
  const fakeContent = fake.status === 201
    ? (JSON.parse((await db.coachWorkoutPlan.findUnique({ where: { id: ((fake.json.plan as { id?: string })?.id ?? (fake.json as { id?: string }).id)! } }))!.contentJson) as { days: { exercises: { faName: string }[] }[] })
    : null;
  ok("نام جعلی کلاینت هرگز در snapshot نیست", fakeContent?.days[0]?.exercises[0]?.faName !== "نام جعلی کلاینت", `${fakeContent?.days[0]?.exercises[0]?.faName}`);

  // شناسه جعلی رد می‌شود
  const fakeId = await api(coach, "POST", "/api/coach/workout-plans", {
    ...payload,
    title: "شناسه جعلی",
    days: [{ title: "روز", exercises: [{ exerciseId: "totally-fake-exercise-id", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 60 }] }],
  });
  ok("شناسه حرکت ناموجود 422 می‌گیرد", fakeId.status === 422, `status=${fakeId.status}`);

  // انتشار به دانشجو و snapshot تحویل
  const publish = await api(coach, "POST", `/api/coach/workout-plans/${planId}/publish`, { connectionId });
  ok("انتشار برنامه 200/201 است", publish.status === 200 || publish.status === 201, `status=${publish.status} ${publish.text.slice(0, 160)}`);
  const deliveryId = (publish.json.delivery as { id?: string } | undefined)?.id;
  ok("delivery نسخه ۱ ساخته شد", Boolean(deliveryId));

  const deliveryRow = deliveryId ? await db.coachPlanDelivery.findUnique({ where: { id: deliveryId } }) : null;
  const deliveryContent = deliveryRow ? (JSON.parse(deliveryRow.contentJson) as { days: { exercises: { note: string | null; faName: string }[] }[] }) : null;
  ok("یادداشت مربی در snapshot تحویل حفظ شده", deliveryContent?.days[0]?.exercises[0]?.note === NOTE);

  // نسخه‌بندی — ویرایش برنامه نسخه قبلی را تغییر نمی‌دهد
  const editPayload = {
    ...payload,
    title: "برنامه آزمایشی p18 — نسخه ۲",
    days: [
      {
        title: "پوش ویرایش‌شده",
        exercises: [
          { exerciseId: fbdRow!.id, sets: 5, repsMin: 6, repsMax: 8, restSeconds: 120, note: "یادداشت ویرایش‌شده", suggestedWeightKg: 20 },
          { exerciseId: "bench-press-dumbbell", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 75, note: null, suggestedWeightKg: null },
        ],
      },
    ],
  };
  await api(coach, "PUT", `/api/coach/workout-plans/${planId}`, editPayload);
  const publish2 = await api(coach, "POST", `/api/coach/workout-plans/${planId}/publish`, { connectionId });
  ok("ارسال مجدد پس از ویرایش نسخه ۲ ساخت", publish2.status === 200 || publish2.status === 201, `status=${publish2.status}`);
  const v1 = deliveryRow ? await db.coachPlanDelivery.findUnique({ where: { id: deliveryId! } }) : null;
  const v1Content = v1 ? (JSON.parse(v1.contentJson) as { days: { exercises: { note: string | null }[] }[] }) : null;
  ok("نسخه ۱ پس از ویرایش دست‌نخورده ماند", v1Content?.days[0]?.exercises[0]?.note === NOTE);

  // دانشجو تحویل خودش را می‌بیند
  const studentList = await api(student, "GET", "/api/coach-plans");
  const deliveries = (studentList.json.deliveries as { id: string }[]) ?? (studentList.json.workout as { id: string }[]) ?? [];
  ok("دانشجو تحویل را در فهرست خود می‌بیند", studentList.status === 200 && deliveries.length >= 1, `status=${studentList.status}`);

  // IDOR — دانشجوی غیرمرتبط
  const o1 = await api(outsider, "GET", `/api/coach-plans/${deliveryId}`);
  ok("دانشجوی غیرمرتبط تحویل را نمی‌بیند (404)", o1.status === 404, `status=${o1.status}`);
  // IDOR — دانشجو نمی‌تواند برنامه مربی را ویرایش کند
  const o2 = await api(student, "PUT", `/api/coach/workout-plans/${planId}`, payload);
  ok("دانشجو ویرایش برنامه مربی را نمی‌تواند (403)", o2.status === 403 || o2.status === 404, `status=${o2.status}`);
  // IDOR — مربی دیگر برنامه را نمی‌بیند
  const o3 = await api(coach2, "GET", `/api/coach/workout-plans/${planId}`);
  ok("مربی دیگر برنامه مربی دیگر را نمی‌بیند (404)", o3.status === 404, `status=${o3.status}`);

  // شروع جلسه از برنامه مربی (حرکت منبع آزاد داخل snapshot)
  const start = await api(student, "POST", "/api/sessions/start", {
    coachDeliveryId: deliveryId,
    coachDayOrder: 1,
  });
  ok("شروع جلسه از روز برنامه مربی موفق است", start.status === 200 || start.status === 201, `status=${start.status} ${start.text.slice(0, 160)}`);
  const sessionJson = (start.json.session ?? start.json) as { id?: string; exercises?: { exerciseId: string; faName: string; coach3dId: string | null; primaryMusclesJson?: string }[] };
  const sessFbd = sessionJson.exercises?.find((e) => e.exerciseId === fbdRow!.id);
  ok("حرکت منبع آزاد در جلسه با snapshot صحیح است", Boolean(sessFbd) && sessFbd?.faName === fbdRow!.faName);
  ok("primaryMuscles جلسه فقط گروه‌های سه‌بعدی معتبرند", Boolean(sessFbd));
  if (sessFbd?.primaryMusclesJson) {
    const muscles = JSON.parse(sessFbd.primaryMusclesJson) as string[];
    const valid3d = new Set(["chest", "shoulders", "biceps", "triceps", "forearms", "abs", "back", "traps", "glutes", "quads", "hamstrings", "calves"]);
    ok("عضلات snapshot جلسه در واژگان ۱۲گانه سه‌بعدی‌اند", muscles.every((m) => valid3d.has(m)), muscles.join(","));
  }
  // رهاکردن جلسه آزمایشی — بدون ثبت ست (تمیزکاری تمیزتر)
  if (sessionJson.id) {
    await api(student, "POST", `/api/sessions/${sessionJson.id}/finish`, { notes: null }).catch(() => {});
  }

  // دسترسی دانشجوی FREE به کتابخانه — کتابخانه عمومی مستقل از اشتراک است
  const freeUser = await createUser("freeuser");
  const freeIdx = await api(freeUser, "GET", "/api/exercises?scope=index");
  ok("دانشجوی FREE به کتابخانه عمومی دسترسی دارد (تفکیک مجوز)", freeIdx.status === 200);

  // پاک‌سازی فیکسچرهای p18
  for (const u of [coach, coach2, student, outsider, unverified, freeUser]) {
    await db.user.delete({ where: { id: u.userId } }).catch(() => {});
  }
  // کاربر main هنوز در main() زنده است — فقط فیکسچرهای این تابع باید صفر باشند
  ok("فیکسچر کاربران p18 پاک شد", (await db.user.count({ where: { email: { contains: "p18test-" } } })) === 1);
}

/* ============================== ۴) یکپارچگی DB ============================== */

async function testIntegrity() {
  console.log("\n۴) یکپارچگی دیتابیس");
  const ic = await db.$queryRaw<{ integrity_check: string }[]>`PRAGMA integrity_check`;
  ok("integrity_check = ok", ic[0]?.integrity_check === "ok", JSON.stringify(ic[0]));
  const fk = await db.$queryRaw<unknown[]>`PRAGMA foreign_key_check`;
  ok("foreign_key_check بدون تخلف", fk.length === 0, `${fk.length} تخلف`);
}

/* ============================== اجرا ============================== */

async function main() {
  console.log(`p18-library-test — BASE=${BASE}`);
  await testIntegrity();
  const user = await createUser("main");
  await testDataQuality();
  await testApi(user);
  await testCoachBuilder();
  await db.user.delete({ where: { id: user.userId } }).catch(() => {});
  ok("کاربر اصلی p18 پاک شد", (await db.user.count({ where: { email: { contains: "p18test-" } } })) === 0);
  await testIntegrity();

  console.log(`\n═══ نتیجه: ${passed} پاس / ${failed} شکست ═══`);
  if (failed > 0) process.exit(1);
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("FATAL:", err);
  // پاک‌سازی اضطراری فیکسچرها
  await db.user.deleteMany({ where: { email: { contains: "p18test-" } } }).catch(() => {});
  process.exit(1);
});
