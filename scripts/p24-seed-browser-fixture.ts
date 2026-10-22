/**
 * p24-seed-browser-fixture.ts — فیکسچر کامل مرورگر P2 (دوزبانه، 390px).
 *
 * میسازد:
 *  - مربی fixture با یک حرکت شخصی ویدئودار (MP4 واقعی کوچک) + یک حرکت بدون ویدئو
 *  - ادمین fixture + آپلود ویدئو روی یک رکورد core بانک عمومی
 *  - دانشجوی fixture با ارتباط ACTIVE + اشتراک PREMIUM + برنامه تحویلشده
 *    حاوی همان حرکت شخصی ویدئودار
 * خروجی: scratch/p24-browser-fixture.json با ایمیل/رمز/کوکی هر سه نقش.
 * پاکسازی: scripts/p24-cleanup-browser-fixture.ts (فقط fixtureهای خودش).
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const STAMP = Date.now();
const PASSWORD = "p24-browser-pass1";
const MP4 = new Uint8Array(readFileSync("scratch/p24/sample.mp4"));

const db = new PrismaClient();

interface Role {
  email: string;
  password: string;
  userId: string;
  cookie: string;
}

async function signup(name: string): Promise<Role> {
  const email = `p24-browser-${name}-${STAMP}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P24 Browser ${name}` }),
  });
  if (res.status !== 200) throw new Error(`signup ${name} failed: ${res.status} ${await res.text()}`);
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error(`user row missing: ${name}`);
  return { email, password: PASSWORD, userId: row.id, cookie: cookie ?? "" };
}

async function api(
  user: Role,
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      cookie: user.cookie,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  return { status: res.status, json };
}

async function main() {
  // پاکسازی بقایای اجراهای ناموفق قبلی — فقط کاربران p24-browser-*
  const stale = await db.user.findMany({ where: { email: { startsWith: "p24-browser-" } }, select: { id: true } });
  for (const u of stale) {
    await db.coachProfile.deleteMany({ where: { userId: u.id } });
    await db.studentSubscription.deleteMany({ where: { userId: u.id } });
    await db.session.deleteMany({ where: { userId: u.id } });
    await db.account.deleteMany({ where: { userId: u.id } });
    await db.fitnessProfile.deleteMany({ where: { userId: u.id } });
    await db.notification.deleteMany({ where: { userId: u.id } });
    await db.assistantConversation.deleteMany({ where: { userId: u.id } });
    await db.user.delete({ where: { id: u.id } }).catch(() => undefined);
  }
  if (stale.length > 0) console.log(`pre-cleaned ${stale.length} stale users`);
  const coach = await signup("coach");
  const student = await signup("student");
  const admin = await signup("admin");

  // مربی + ادمین
  await db.user.update({ where: { id: coach.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: {
      userId: coach.userId,
      displayName: "P2 Browser Coach",
      headline: "fixture",
      bio: "پروفایل آزمایشی فیکسچر مرورگر P2 — برای ساخت برنامه و تحویل دانشجو.",
      specializationsJson: JSON.stringify([]),
      certificationsJson: JSON.stringify([]),
      experienceYears: 1,
      cooperationTypesJson: JSON.stringify(["PRIVATE"]),
      verified: true,
      published: true,
    },
  });
  await db.user.update({ where: { id: admin.userId }, data: { role: "ADMIN" } });

  // حرکت شخصی ویدئودار + بدون ویدئو
  const mk = await api(coach, "POST", "/api/coach/exercises", {
    faName: "پرس سینه دمبل فیکسچر",
    enName: "Fixture Dumbbell Press",
    category: "chest",
    equipment: ["dumbbell"],
    primaryMuscles: ["chest"],
    secondaryMuscles: [],
    description: "حرکت فیکسچر مرورگر P2 با ویدئو",
    tips: "",
  });
  const videoExerciseId = (mk.json.exercise as { id?: string }).id;
  if (mk.status !== 201 || !videoExerciseId) throw new Error("exercise create failed");
  const mk2 = await api(coach, "POST", "/api/coach/exercises", {
    faName: "حرکت بدون ویدئو فیکسچر",
    enName: "Fixture No Video Move",
    category: "back",
    equipment: [],
    primaryMuscles: ["back"],
    secondaryMuscles: [],
    description: "",
    tips: "",
  });
  const noVideoExerciseId = (mk2.json.exercise as { id?: string }).id;

  const form = new FormData();
  form.append("file", new Blob([MP4], { type: "video/mp4" }), "browser-fixture.mp4");
  const up = await fetch(`${BASE}/api/coach/exercises/${videoExerciseId}/media`, {
    method: "POST",
    headers: { cookie: coach.cookie },
    body: form,
  });
  if (up.status !== 201) throw new Error(`video upload failed: ${up.status}`);

  // دانشجو: پرش آنبوردینگ + پرمیوم + ارتباط + برنامه تحویلشده
  await db.fitnessProfile.create({
    data: {
      userId: student.userId,
      displayName: "P2 Browser Student",
      age: 28,
      gender: "male",
      weightKg: 75,
      heightCm: 178,
      goal: "strength",
      experience: "intermediate",
      trainingDaysPerWeek: 4,
      sessionMinutes: 60,
      equipmentJson: JSON.stringify(["dumbbell"]),
      limitationsJson: JSON.stringify([]),
    },
  });
  await db.studentSubscription.upsert({
    where: { userId: student.userId },
    update: { tier: "PREMIUM", status: "active", expiresAt: null },
    create: { userId: student.userId, tier: "PREMIUM", status: "active", source: "manual", note: "p24 browser fixture" },
  });
  const conn = await api(student, "POST", "/api/coach-connections", {
    coachId: coach.userId,
    cooperationType: "PRIVATE",
    message: "p24 browser fixture",
  });
  const connectionId = (conn.json.connection as { id?: string } | undefined)?.id;
  if (conn.status !== 201 || !connectionId) {
    throw new Error(`connection failed: ${conn.status} ${JSON.stringify(conn.json).slice(0, 300)}`);
  }
  const acc = await api(coach, "POST", `/api/coach/requests/${connectionId}/accept`);
  if (acc.status !== 200) throw new Error("accept failed");

  const plan = await api(coach, "POST", "/api/coach/workout-plans", {
    title: "برنامه مرورگر P2",
    description: "",
    goal: "strength",
    difficulty: "intermediate",
    durationMinutes: 45,
    days: [
      {
        title: "روز یک",
        exercises: [
          { exerciseId: `cex-${videoExerciseId}`, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60, note: null, suggestedWeightKg: null, source: "personal" },
          { exerciseId: "plank", sets: 3, repsMin: 30, repsMax: 45, restSeconds: 60, note: null, suggestedWeightKg: null, source: "public" },
        ],
      },
    ],
  });
  const planId = (plan.json.plan as { id?: string }).id;
  if (plan.status !== 201 || !planId) throw new Error(`plan failed: ${JSON.stringify(plan.json).slice(0, 200)}`);
  const pub = await api(coach, "POST", `/api/coach/workout-plans/${planId}/publish`, { connectionId });
  if (pub.status !== 201) throw new Error(`publish failed: ${pub.status}`);

  // رسانه بانک روی یک رکورد core (plank) توسط ادمین
  const search = await api(admin, "GET", "/api/exercises?scope=search&q=plank&pageSize=3");
  const items = (search.json.items as { id: string }[]) ?? [];
  const bankId = items[0]?.id;
  if (!bankId) throw new Error("bank target missing");
  const bankForm = new FormData();
  bankForm.append("file", new Blob([MP4], { type: "video/mp4" }), "bank-fixture.mp4");
  const bankUp = await fetch(`${BASE}/api/admin/exercises/${bankId}/media`, {
    method: "POST",
    headers: { cookie: admin.cookie },
    body: bankForm,
  });
  if (bankUp.status !== 201) throw new Error(`bank upload failed: ${bankUp.status}`);

  writeFileSync(
    "/home/z/my-project/scratch/p24-browser-fixture.json",
    JSON.stringify(
      {
        stamp: STAMP,
        coach: { ...coach, videoExerciseId, noVideoExerciseId, planId, connectionId },
        student,
        admin: { ...admin, bankExerciseId: bankId },
      },
      null,
      2
    )
  );
  console.log(`SEEDED coach=${coach.email} student=${student.email} admin=${admin.email}`);
  console.log(`videoExerciseId=${videoExerciseId} bankExerciseId=${bankId} planId=${planId}`);
}

main()
  .catch((err) => {
    console.error("ERROR:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
