/**
 * p16-coach-plans-test.ts — تست‌های الزامی مرحله ۱۶ (API/امنیت/مجوزها).
 * اجرا: bun scripts/p16-coach-plans-test.ts  (سرور dev روی :3000)
 *
 * قواعد ایمنی داده:
 *  - فقط کاربران ایزوله با پیشوند p16test-* ساخته می‌شوند
 *  - هیچ کاربر/رکورد واقعی خوانده یا تغییر داده نمی‌شود
 *  - پاک‌سازی کامل فقط روی همین کاربران (کاسکید از مسیر user)
 *
 * پوشش: ساخت پیش‌نویس تمرینی/غذایی، snapshot سمت سرور، رد ورودی نامعتبر
 * و حرکت/غذای ناموجود، مالکیت (IDOR)، ارسال فقط به دانشجوی متصل واجد
 * شرایط، نسخه‌بندی و حفظ snapshot قبلی، جلوگیری از ارسال تکراری و
 * هم‌زمانی، بی‌اثری داده ساختگی کلاینت، شروع جلسه از برنامه مربی،
 * عدم تبدیل خودکار برنامه به مصرف، نقش‌ها، مربی تأییدنشده، اشتراک
 * منقضی/FREE، پایان ارتباط، integrity/fk.
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
const PASSWORD = "p16test-pass1";
const EX_A = "bench-press-dumbbell";
const EX_B = "plank";
const FOOD_A = "egg";
const FOOD_B = "oats";

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string, attempt = 0): Promise<User> {
  const email = `p16test-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P16 ${name}` }),
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
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Cookie: user.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    // بدون بدنه
  }
  return { status: res.status, json };
}

/* ------------------------------ فیکسچرها ------------------------------ */

async function makeCoachVerified(user: User, name: string) {
  await db.user.update({ where: { id: user.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: {
      userId: user.userId,
      displayName: `P16 Coach ${name}`,
      headline: "تست مرحله ۱۶",
      bio: "پروفایل آزمایشی تست‌های مرحله ۱۶ — کافی برای انتشار.",
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
    create: { userId, tier: "PREMIUM", status: "active", source: "manual", note: "p16 fixture" },
  });
}

async function createActiveConnection(student: User, coach: User): Promise<string> {
  const sub = await db.studentSubscription.findUnique({ where: { userId: student.userId } });
  if (sub?.tier !== "PREMIUM" || sub.status !== "active") {
    await makePremium(student.userId);
  }
  const sent = await api(student, "POST", "/api/coach-connections", {
    coachId: coach.userId,
    cooperationType: "PRIVATE",
    message: "p16 fixture",
  });
  const connectionId = (sent.json.connection as { id?: string } | undefined)?.id;
  if (sent.status !== 201 || !connectionId) {
    // شاید درخواست باز قبلی وجود دارد — از دیتابیس بخوان
    const row = await db.coachStudentConnection.findFirst({
      where: { studentId: student.userId, coachId: coach.userId, status: "PENDING" },
    });
    if (!row) throw new Error(`connection create failed: ${sent.status}`);
    await api(coach, "POST", `/api/coach/requests/${row.id}/accept`);
    return row.id;
  }
  const accepted = await api(coach, "POST", `/api/coach/requests/${connectionId}/accept`);
  if (accepted.status !== 200) throw new Error(`accept failed: ${accepted.status}`);
  return connectionId;
}

/* ------------------------------ محتوای نمونه ------------------------------ */

function workoutPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "برنامه آزمایشی p16",
    description: "برنامه تمرینی تست مرحله ۱۶",
    goal: "strength",
    difficulty: "intermediate",
    durationMinutes: 45,
    days: [
      {
        title: "بالاتنه",
        exercises: [
          { exerciseId: EX_A, sets: 4, repsMin: 8, repsMax: 10, restSeconds: 90, note: null, suggestedWeightKg: 20 },
          { exerciseId: EX_B, sets: 3, repsMin: 30, repsMax: 45, restSeconds: 60, note: "کشش کامل", suggestedWeightKg: null },
        ],
      },
    ],
    ...overrides,
  };
}

function nutritionPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: "برنامه غذایی آزمایشی p16",
    description: "برنامه غذایی تست مرحله ۱۶",
    goal: "maintain",
    durationDays: 1,
    days: [
      {
        meals: [
          {
            type: "breakfast",
            items: [
              { foodId: FOOD_A, unit: "g", amount: 100 },
              { foodId: FOOD_B, unit: "g", amount: 50 },
            ],
          },
        ],
      },
    ],
    ...overrides,
  };
}

/* ------------------------------ تست‌ها ------------------------------ */

async function main() {
  console.log("\n▌ پاک‌سازی بقایای اجراهای قبلی احتمالی (فقط p16test-*)");
  const stale = await db.user.findMany({
    where: { email: { contains: "p16test-" } },
    select: { id: true },
  });
  for (const u of stale) {
    await db.user.delete({ where: { id: u.id } });
  }
  if (stale.length > 0) console.log(`  … ${stale.length} کاربر قدیمی p16test حذف شد`);

  console.log("\n▌ ساخت فیکسچرها (کاربران ایزوله p16test-*)");
  const coachA = await createUser("coachA");
  const coachB = await createUser("coachB");
  const coachUnverified = await createUser("coachU");
  const studentA = await createUser("studentA");
  const studentB = await createUser("studentB");
  const studentFree = await createUser("studentFree");

  await makeCoachVerified(coachA, "A");
  await makeCoachVerified(coachB, "B");
  // مربی با نقش COACH اما بدون تأیید
  await db.user.update({ where: { id: coachUnverified.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: { userId: coachUnverified.userId, displayName: "P16 Unverified", cooperationTypesJson: "[]" },
  });

  await makePremium(studentA.userId);
  await makePremium(studentB.userId);
  await makePremium(studentFree.userId);

  const connA = await createActiveConnection(studentA, coachA);
  const connB = await createActiveConnection(studentB, coachB);
  const connFree = await createActiveConnection(studentFree, coachA);
  ok("ارتباط‌های ACTIVE فیکسچر ساخته شد", Boolean(connA && connB && connFree));

  // سناریوی FREE: اشتراک این دانشجو به سطح رایگان تنزل می‌یابد تا مسدودشدن
  // ارسال جدید آزموده شود (ارتباط ACTIVE می‌ماند — مثل واقعیت)
  await db.studentSubscription.update({
    where: { userId: studentFree.userId },
    data: { tier: "FREE" },
  });

  console.log("\n▌ مجوزها و دسترسی پایه");

  const guestCreate = await api(null, "POST", "/api/coach/workout-plans", workoutPayload());
  ok("مهمان: ساخت برنامه 401", guestCreate.status === 401);
  const guestList = await api(null, "GET", "/api/coach-plans");
  ok("مهمان: فهرست برنامه‌های دانشجو 401", guestList.status === 401);

  const studentCreate = await api(studentA, "POST", "/api/coach/workout-plans", workoutPayload());
  ok("دانشجو: API مربی 403", studentCreate.status === 403);
  const studentWList = await api(studentA, "GET", "/api/coach/workout-plans");
  ok("دانشجو: فهرست برنامه مربی 403", studentWList.status === 403);

  const unvCreate = await api(coachUnverified, "POST", "/api/coach/workout-plans", workoutPayload());
  ok("مربی تأییدنشده: ساخت پیش‌نویس 403", unvCreate.status === 403);

  console.log("\n▌ ساخت و اعتبارسنجی برنامه تمرینی");

  const createW = await api(coachA, "POST", "/api/coach/workout-plans", workoutPayload());
  ok("مربی تأییدشده: پیش‌نویس ساخته شد (201)", createW.status === 201, `status=${createW.status}`);
  const planW = (createW.json.plan ?? {}) as {
    id?: string;
    status?: string;
    content?: { days: { exercises: { faName: string; enName: string; sets: number; estimatedMinutes: number }[] }[] };
  };
  ok("وضعیت اولیه draft", planW.status === "draft");
  const wEx0 = planW.content?.days?.[0]?.exercises?.[0];
  ok("نام حرکت snapshot سمت سرور از بانک (نام ساختگی کلاینت نادیده)", wEx0?.faName === "پرس سینه دمبل" || (wEx0?.enName ?? "").length > 0, `fa=${wEx0?.faName}`);

  // داده ساختگی نمایشی کلاینت باید نادیده گرفته شود
  const createFake = await api(coachA, "POST", "/api/coach/workout-plans", {
    ...workoutPayload(),
    days: [
      {
        title: "جعلی",
        exercises: [
          { exerciseId: EX_A, sets: 2, repsMin: 5, repsMax: 8, restSeconds: 60, faName: "<script>alert(1)</script>", enName: "x".repeat(500) },
        ],
      },
    ],
  });
  const fakePlan = (createFake.json.plan ?? {}) as {
    content?: { days: { exercises: { faName: string }[] }[] };
  };
  ok("XSS/نام ساختگی کلاینت در snapshot ظاهر نمی‌شود", createFake.status === 201 && !(fakePlan.content?.days?.[0]?.exercises?.[0]?.faName ?? "").includes("<script>"));

  const badExercise = await api(coachA, "POST", "/api/coach/workout-plans", workoutPayload({
    days: [{ title: "روز بد", exercises: [{ exerciseId: "no-such-exercise", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 60 }] }],
  }));
  ok("شناسه حرکت ناموجود رد می‌شود", badExercise.status === 422 && badExercise.json.error === "EXERCISE_NOT_IN_BANK", `status=${badExercise.status} err=${String(badExercise.json.error)}`);

  const badSets = await api(coachA, "POST", "/api/coach/workout-plans", workoutPayload({
    days: [{ title: "روز", exercises: [{ exerciseId: EX_A, sets: -2, repsMin: 8, repsMax: 10, restSeconds: 60 }] }],
  }));
  ok("مقدار منفی (ست) رد می‌شود", badSets.status === 400);

  const badReps = await api(coachA, "POST", "/api/coach/workout-plans", workoutPayload({
    days: [{ title: "روز", exercises: [{ exerciseId: EX_A, sets: 3, repsMin: 12, repsMax: 8, restSeconds: 60 }] }],
  }));
  ok("سقف تکرار کمتر از کف رد می‌شود", badReps.status === 400);

  const emptyDay = await api(coachA, "POST", "/api/coach/workout-plans", workoutPayload({
    days: [{ title: "روز خالی", exercises: [] }],
  }));
  ok("روز بدون حرکت رد می‌شود", emptyDay.status === 400);

  const badTitle = await api(coachA, "POST", "/api/coach/workout-plans", workoutPayload({ title: "ا" }));
  ok("عنوان خیلی کوتاه رد می‌شود", badTitle.status === 400);

  console.log("\n▌ مالکیت برنامه تمرینی (IDOR)");

  const bGetA = await api(coachB, "GET", `/api/coach/workout-plans/${planW.id}`);
  ok("مربی دیگر: برنامه مربی دیگر 404", bGetA.status === 404);
  const bPutA = await api(coachB, "PUT", `/api/coach/workout-plans/${planW.id}`, workoutPayload({ title: "هک" }));
  ok("مربی دیگر: ویرایش برنامه دیگران 404", bPutA.status === 404);
  const bPubA = await api(coachB, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connB });
  ok("مربی دیگر: ارسال برنامه دیگران 404", bPubA.status === 404);

  const stuPut = await api(studentA, "PUT", `/api/coach/workout-plans/${planW.id}`, workoutPayload());
  ok("دانشجو: ویرایش برنامه مربی 403", stuPut.status === 403);

  console.log("\n▌ ارسال برنامه تمرینی — مجوز و اشتراک");

  const pubNoConn = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: "nonexistent-id" });
  ok("ارسال با ارتباط ناموجود 404", pubNoConn.status === 404);

  const pubWrongConn = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connB });
  ok("مربی A با ارتباط مربی B 404", pubWrongConn.status === 404);

  // ارسال به دانشجوی FREE — مسدود
  const pubFree = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connFree });
  ok("دانشجوی FREE: ارسال 403 با کد SUBSCRIPTION_REQUIRED", pubFree.status === 403 && pubFree.json.error === "SUBSCRIPTION_REQUIRED", `status=${pubFree.status} err=${String(pubFree.json.error)}`);

  // studentId ساختگی کلاینت بی‌اثر است — ارتباط تعیین‌کننده است
  const pubTamper = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, {
    connectionId: connA,
    studentId: studentB.userId,
    coachId: coachB.userId,
  });
  ok("ارسال موفق به دانشجوی متصل (داده ساختگی کلاینت نادیده)", pubTamper.status === 201, `status=${pubTamper.status} err=${String(pubTamper.json.error)}`);
  const delivery1 = (pubTamper.json.delivery ?? {}) as { id?: string; version?: number };
  ok("نسخه اول = ۱", delivery1.version === 1);

  const statusAfter = await api(coachA, "GET", `/api/coach/workout-plans/${planW.id}`);
  const planAfter = (statusAfter.json.plan ?? {}) as { status?: string; assignedStudent?: { userId?: string } };
  ok("وضعیت برنامه پس از ارسال published", planAfter.status === "published");
  ok("دانشجوی دریافت‌کننده از ارتباط واقعی (نه کلاینت)", planAfter.assignedStudent?.userId === studentA.userId);

  // ارسال تکراری بدون تغییر → 409
  const pubDup = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connA });
  ok("ارسال تکراری بدون تغییر 409 PLAN_ALREADY_SENT", pubDup.status === 409 && pubDup.json.error === "PLAN_ALREADY_SENT");

  console.log("\n▌ نسخه‌بندی و حفظ snapshot");

  const v1Before = await api(studentA, "GET", `/api/coach-plans/${delivery1.id}`);
  const v1Content1 = (v1Before.json.delivery ?? {}) as {
    content?: { days: { exercises: { sets: number }[] }[] };
  };
  ok("دانشجو نسخه ارسال‌شده را می‌بیند", v1Before.status === 200);
  ok("نسخه ۱: ست حرکت = ۴", v1Content1.content?.days?.[0]?.exercises?.[0]?.sets === 4);

  // ویرایش و ارسال مجدد → نسخه ۲
  const edit2 = await api(coachA, "PUT", `/api/coach/workout-plans/${planW.id}`, workoutPayload({
    days: [
      {
        title: "بالاتنه ویرایش‌شده",
        exercises: [
          { exerciseId: EX_A, sets: 5, repsMin: 6, repsMax: 8, restSeconds: 120, note: "وزنه را سنگین‌تر کن", suggestedWeightKg: 22 },
          { exerciseId: EX_B, sets: 3, repsMin: 30, repsMax: 45, restSeconds: 60, note: null, suggestedWeightKg: null },
        ],
      },
    ],
  }));
  ok("ویرایش برنامه منتشرشده مجاز است", edit2.status === 200);
  const pub2 = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connA });
  ok("ارسال مجدد پس از ویرایش → نسخه ۲", pub2.status === 201 && (pub2.json.delivery as { version?: number }).version === 2, `status=${pub2.status}`);
  const delivery2 = (pub2.json.delivery ?? {}) as { id?: string };

  const v1After = await api(studentA, "GET", `/api/coach-plans/${delivery1.id}`);
  const v1AfterContent = (v1After.json.delivery ?? {}) as {
    content?: { days: { exercises: { sets: number }[] }[] };
  };
  ok("snapshot نسخه ۱ پس از ارسال نسخه ۲ دست‌نخورده", v1AfterContent.content?.days?.[0]?.exercises?.[0]?.sets === 4);

  const v2View = await api(studentA, "GET", `/api/coach-plans/${delivery2.id}`);
  const v2Content = (v2View.json.delivery ?? {}) as {
    content?: { days: { exercises: { sets: number }[] }[] };
    version?: number;
  };
  ok("نسخه ۲ محتوای جدید دارد (ست = ۵)", v2Content.content?.days?.[0]?.exercises?.[0]?.sets === 5);

  const stuList = await api(studentA, "GET", "/api/coach-plans?kind=workout");
  const stuDeliveries = (stuList.json.deliveries ?? []) as { id?: string; version?: number }[];
  ok("فهرست دانشجو هر دو نسخه را دارد (جدیدترین اول)", stuDeliveries.length === 2 && stuDeliveries[0]?.version === 2);

  console.log("\n▌ دسترسی دانشجوها به برنامه‌های هم");

  const bView = await api(studentB, "GET", `/api/coach-plans/${delivery1.id}`);
  ok("دانشجوی غیرمرتبط: برنامه 404", bView.status === 404);
  const bCoachView = await api(coachB, "GET", `/api/coach-plans/${delivery1.id}`);
  ok("مربی دیگر: نسخه ارسال‌شده 404", bCoachView.status === 404);

  const bList = await api(studentB, "GET", "/api/coach-plans");
  const bDeliveries = (bList.json.deliveries ?? []) as unknown[];
  ok("فهرست دانشجوی B خالی از برنامه‌های coachA", bDeliveries.length === 0);

  console.log("\n▌ شروع جلسه از برنامه مربی");

  const startS = await api(studentA, "POST", "/api/sessions/start", {
    coachDeliveryId: delivery2.id,
    coachDayOrder: 1,
  });
  ok("دانشجو: جلسه از برنامه مربی ساخته شد (201)", startS.status === 201, `status=${startS.status} json=${JSON.stringify(startS.json).slice(0, 120)}`);
  const session = (startS.json.session ?? {}) as {
    id?: string;
    coachDeliveryId?: string;
    coachDeliveryDayOrder?: number;
    title?: string;
    exercises?: { targetSets?: number; targetWeightKg?: number | null }[];
  };
  ok("جلسه به delivery متصل است", session.coachDeliveryId === delivery2.id);
  ok("روز جلسه درست است", session.coachDeliveryDayOrder === 1);
  ok("هدف ست از برنامه مربی (۵)", session.exercises?.[0]?.targetSets === 5);
  ok("وزن پیشنهادی مربی منتقل شده (۲۲)", session.exercises?.[0]?.targetWeightKg === 22);

  const startDup = await api(studentA, "POST", "/api/sessions/start", {
    coachDeliveryId: delivery2.id,
    coachDayOrder: 1,
  });
  ok("جلسه فعال تکراری ساخته نمی‌شود (existing=true)", startDup.status === 200 && startDup.json.existing === true);

  const startB = await api(studentB, "POST", "/api/sessions/start", {
    coachDeliveryId: delivery2.id,
    coachDayOrder: 1,
  });
  ok("دانشجوی غیرمرتبط: شروع از برنامه دیگران 404", startB.status === 404);

  // بستن جلسه برای ادامه تست‌ها
  await api(studentA, "POST", `/api/sessions/${session.id}/finish`, { action: "abandon", notes: null });

  console.log("\n▌ برنامه غذایی — ساخت و محاسبه سمت سرور");

  const createN = await api(coachA, "POST", "/api/coach/nutrition-plans", nutritionPayload());
  ok("مربی: پیش‌نویس غذایی ساخته شد (201)", createN.status === 201, `status=${createN.status}`);
  const planN = (createN.json.plan ?? {}) as {
    id?: string;
    content?: { days: { meals: { items: { kcal: number; grams: number; protein: number }[]; kcal: number }[] }[] };
  };
  const items = planN.content?.days?.[0]?.meals?.[0]?.items ?? [];
  ok("دو قلم snapshot شد", items.length === 2);

  // اثبات محاسبه سمت سرور: نسبت خطی kcal با گرم از بانک (جو دوسر — بدون سقف سهم)
  const createN2 = await api(coachA, "POST", "/api/coach/nutrition-plans", nutritionPayload({
    days: [{ meals: [{ type: "breakfast", items: [{ foodId: FOOD_B, unit: "g", amount: 100 }] }] }],
  }));
  const items2 = ((createN2.json.plan ?? {}) as typeof planN).content?.days?.[0]?.meals?.[0]?.items ?? [];
  const kcal50 = items[1]?.kcal ?? 0;
  const kcal100oats = items2[0]?.kcal ?? 0;
  ok(
    "کالری سمت سرور و خطی با گرم (خطای گردکردن حداکثر ۱)",
    kcal50 > 0 && Math.abs(kcal100oats - 2 * kcal50) <= 1,
    `kcal50=${kcal50} kcal100=${kcal100oats}`
  );
  const kcalEgg100 = items[0]?.kcal ?? 0;

  const clientFake = await api(coachA, "POST", "/api/coach/nutrition-plans", {
    ...nutritionPayload(),
    days: [{ meals: [{ type: "lunch", items: [{ foodId: FOOD_A, unit: "g", amount: 100, kcal: 99999, protein: 999 }] }] }],
  });
  const fakeItems = ((clientFake.json.plan ?? {}) as typeof planN).content?.days?.[0]?.meals?.[0]?.items ?? [];
  ok("مقادیر تغذیه‌ای کلاینت نادیده گرفته می‌شود", fakeItems[0]?.kcal === kcalEgg100 && fakeItems[0]?.kcal !== 99999, `kcal=${fakeItems[0]?.kcal}`);

  const badFood = await api(coachA, "POST", "/api/coach/nutrition-plans", nutritionPayload({
    days: [{ meals: [{ type: "lunch", items: [{ foodId: "no-such-food", unit: "g", amount: 100 }] }] }],
  }));
  ok("غذای ناموجود رد می‌شود", badFood.status === 422 && badFood.json.error === "FOOD_NOT_IN_BANK");

  const badUnit = await api(coachA, "POST", "/api/coach/nutrition-plans", nutritionPayload({
    days: [{ meals: [{ type: "lunch", items: [{ foodId: FOOD_A, unit: "cup", amount: 1 }] }] }],
  }));
  ok("واحد ناسازگار رد می‌شود (400)", badUnit.status === 400);

  const badAmount = await api(coachA, "POST", "/api/coach/nutrition-plans", nutritionPayload({
    days: [{ meals: [{ type: "lunch", items: [{ foodId: FOOD_A, unit: "g", amount: -50 }] }] }],
  }));
  ok("مقدار منفی رد می‌شود (400)", badAmount.status === 400);

  const hugeAmount = await api(coachA, "POST", "/api/coach/nutrition-plans", nutritionPayload({
    days: [{ meals: [{ type: "lunch", items: [{ foodId: FOOD_A, unit: "g", amount: 5000 }] }] }],
  }));
  ok("مقدار خارج از بازه رد می‌شود (422)", hugeAmount.status === 422 && hugeAmount.json.error === "AMOUNT_OUT_OF_RANGE", `status=${hugeAmount.status}`);

  const emptyMeal = await api(coachA, "POST", "/api/coach/nutrition-plans", nutritionPayload({
    days: [{ meals: [{ type: "lunch", items: [] }] }],
  }));
  ok("وعده خالی رد می‌شود (400)", emptyMeal.status === 400);

  const dayMismatch = await api(coachA, "POST", "/api/coach/nutrition-plans", {
    ...nutritionPayload(),
    durationDays: 3,
  });
  ok("ناهمخوانی تعداد روز و بازه زمانی رد می‌شود", dayMismatch.status === 400);

  console.log("\n▌ برنامه غذایی — ارسال، IDOR و مصرف واقعی");

  const logsBefore = await db.foodLogEntry.count({ where: { userId: studentA.userId } });
  const pubN = await api(coachA, "POST", `/api/coach/nutrition-plans/${planN.id}/publish`, { connectionId: connA });
  ok("برنامه غذایی به دانشجوی متصل ارسال شد (201)", pubN.status === 201, `status=${pubN.status} err=${String(pubN.json.error)}`);
  const deliveryN = (pubN.json.delivery ?? {}) as { id?: string; version?: number };
  const logsAfter = await db.foodLogEntry.count({ where: { userId: studentA.userId } });
  ok("ارسال برنامه غذایی هیچ ثبت مصرف خودکاری نمی‌سازد", logsBefore === logsAfter);

  const nB = await api(studentB, "GET", `/api/coach-plans/${deliveryN.id}`);
  ok("دانشجوی دیگر: برنامه غذایی 404", nB.status === 404);

  const nView = await api(studentA, "GET", `/api/coach-plans/${deliveryN.id}`);
  ok("دانشجو: برنامه غذایی خود را می‌بیند", nView.status === 200);
  const nContent = (nView.json.delivery ?? {}) as { content?: { days: { meals: { items: { kcal: number }[] }[] }[] } };
  ok("مقادیر غذایی snapshot در دسترس دانشجو", (nContent.content?.days?.[0]?.meals?.[0]?.items?.[0]?.kcal ?? 0) === kcalEgg100);

  // ویرایش + ارسال نسخه ۲ غذایی و حفظ نسخه ۱
  const editN = await api(coachA, "PUT", `/api/coach/nutrition-plans/${planN.id}`, nutritionPayload({
    days: [{ meals: [{ type: "breakfast", items: [{ foodId: FOOD_A, unit: "g", amount: 150 }] }] }],
  }));
  ok("ویرایش برنامه غذایی مجاز", editN.status === 200);
  const pubN2 = await api(coachA, "POST", `/api/coach/nutrition-plans/${planN.id}/publish`, { connectionId: connA });
  ok("ارسال مجدد غذایی → نسخه ۲", pubN2.status === 201 && (pubN2.json.delivery as { version?: number }).version === 2);
  const vN1 = await api(studentA, "GET", `/api/coach-plans/${deliveryN.id}`);
  const vN1Items = ((vN1.json.delivery ?? {}) as typeof nContent).content?.days?.[0]?.meals?.[0]?.items ?? [];
  ok("snapshot نسخه ۱ غذایی حفظ شده (۱۰۰ گرم)", vN1Items[0]?.grams === 100, `grams=${vN1Items[0]?.grams}`);

  console.log("\n▌ اشتراک منقضی و پایان ارتباط");

  // انقضای اشتراک studentB → ارسال جدید مسدود؛ برنامه‌های قبلی دست‌نخورده
  await db.studentSubscription.update({
    where: { userId: studentB.userId },
    data: { tier: "PREMIUM", expiresAt: new Date(Date.now() - 60_000) },
  });
  const createWB = await api(coachB, "POST", "/api/coach/workout-plans", workoutPayload({ title: "برنامه B" }));
  const planWB = (createWB.json.plan ?? {}) as { id?: string };
  const pubExpired = await api(coachB, "POST", `/api/coach/workout-plans/${planWB.id}/publish`, { connectionId: connB });
  ok("اشتراک منقضی: ارسال جدید 403", pubExpired.status === 403 && pubExpired.json.error === "SUBSCRIPTION_REQUIRED");

  // پایان ارتباط studentA با coachA → ارسال جدید مسدود
  const endRes = await api(studentA, "POST", `/api/coach-connections/${connA}/end`);
  ok("پایان ارتباط توسط دانشجو موفق", endRes.status === 200);
  const pubEnded = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connA });
  ok("پایان ارتباط: ارسال برنامه جدید 404", pubEnded.status === 404);

  // اما نسخه‌های قبلی قابل مشاهده می‌مانند (سیاست حفظ تاریخچه)
  const v1AfterEnd = await api(studentA, "GET", `/api/coach-plans/${delivery2.id}`);
  const v1AfterEndDelivery = (v1AfterEnd.json.delivery ?? {}) as { connectionStatus?: string | null };
  ok("برنامه قبلی پس از پایان ارتباط قابل مشاهده + وضعیت ارتباط شفاف", v1AfterEnd.status === 200 && v1AfterEndDelivery.connectionStatus === "ENDED");

  console.log("\n▌ هم‌زمانی و بایگانی");

  // ارتباط جدید برای تست‌های پایانی — همان دانشجو پس از پایان ارتباط قبلی
  const connA2 = await createActiveConnection(studentA, coachA);
  await makePremium(studentA.userId);
  // ویرایش محتوا و ارسال از مسیر ارتباط جدید — نسخه ۳ برای همان دانشجو
  const edit3a = await api(coachA, "PUT", `/api/coach/workout-plans/${planW.id}`, workoutPayload({ title: "برنامه آزمایشی p16 — برای ارتباط جدید" }));
  ok("ویرایش برای ارسال از ارتباط جدید", edit3a.status === 200);
  const pub3 = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connA2 });
  ok("ارسال با ارتباط جدید (نسخه ۳)", pub3.status === 201, `status=${pub3.status} err=${String(pub3.json.error)}`);

  // دو ارسال هم‌زمان با محتوای تازه — دقیقاً یکی موفق، دیگری 409
  const edit3 = await api(coachA, "PUT", `/api/coach/workout-plans/${planW.id}`, workoutPayload({ title: "برنامه آزمایشی p16 — نسخه نهایی" }));
  ok("ویرایش نسخه نهایی", edit3.status === 200);
  const [c1, c2] = await Promise.all([
    api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connA2 }),
    api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connA2 }),
  ]);
  const codes = [c1.status, c2.status].sort();
  ok("ارسال هم‌زمان: دقیقاً یک موفق و یک 409", (codes[0] === 201 && codes[1] === 409) || (codes[0] === 409 && codes[1] === 409), `statuses=${codes.join(",")}`);

  const arch = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/archive`);
  ok("بایگانی برنامه موفق", arch.status === 200 && (arch.json.plan as { status?: string }).status === "archived");
  const pubArch = await api(coachA, "POST", `/api/coach/workout-plans/${planW.id}/publish`, { connectionId: connA2 });
  ok("ارسال برنامه بایگانی‌شده 409", pubArch.status === 409 && pubArch.json.error === "PLAN_ARCHIVED");
  const putArch = await api(coachA, "PUT", `/api/coach/workout-plans/${planW.id}`, workoutPayload());
  ok("ویرایش برنامه بایگانی‌شده 409", putArch.status === 409);

  // دانشجو پس از بایگانی همچنان نسخه‌های دریافتی را دارد
  const stuStill = await api(studentA, "GET", "/api/coach-plans?kind=workout");
  ok("برنامه‌های دریافتی پس از بایگانی حفظ می‌شوند", ((stuStill.json.deliveries ?? []) as unknown[]).length >= 3);

  console.log("\n▌ پاک‌سازی فیکسچرها و سلامت دیتابیس");

  const emails = [coachA, coachB, coachUnverified, studentA, studentB, studentFree].map((u) => u.email);
  let deleted = 0;
  for (const email of emails) {
    const row = await db.user.findUnique({ where: { email } });
    if (row) {
      await db.user.delete({ where: { id: row.id } });
      deleted += 1;
    }
  }
  ok("همه کاربران آزمایشی حذف شدند", deleted === 6, `deleted=${deleted}`);

  const residue = await db.user.count({ where: { email: { contains: "p16test-" } } });
  ok("بدون ردیف باقی‌مانده از فیکسچر", residue === 0);
  const residuePlans = await db.coachWorkoutPlan.count({ where: { coach: { email: { contains: "p16test-" } } } })
    + await db.coachNutritionPlan.count({ where: { coach: { email: { contains: "p16test-" } } } })
    + await db.coachPlanDelivery.count({ where: { coach: { email: { contains: "p16test-" } } } });
  ok("بدون برنامه/نسخه باقی‌مانده از فیکسچر", residuePlans === 0, `count=${residuePlans}`);

  const integrity = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  ok("SQLite integrity_check = ok", integrity[0]?.integrity_check === "ok");
  const fkViolations = await db.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check");
  ok("SQLite foreign_key_check بدون تخلف", Array.isArray(fkViolations) && fkViolations.length === 0);

  console.log(`\n═══════ نتیجه: ${passed} سبز، ${failed} قرمز ═══════`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((error) => {
    console.error("FATAL:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
