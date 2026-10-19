/**
 * p16-browser-fixture.ts — fixture ایزوله برای آزمون مرورگر مرحله ۱۶.
 * ساخت: مربی تأییدشده + دانشجوی PREMIUM با ارتباط ACTIVE + یک برنامه
 * تمرینی و یک برنامه غذایی «ارسال‌شده» با نسخه ۱ (از مسیر API واقعی).
 * اجرا: bun scripts/p16-browser-fixture.ts
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();
const stamp = Date.now();
const PASSWORD = "p16ui-pass123";

interface UiUser {
  email: string;
  password: string;
}

async function signup(name: string): Promise<UiUser> {
  const email = `p16ui-${name}-${stamp}@test.invalid`.toLowerCase();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, name: `UI16 ${name}` }),
    });
    if (res.status === 200) return { email, password: PASSWORD };
    if (res.status === 429) {
      console.log(`  … نرخ‌سنجی؛ ۶۵ ثانیه صبر (${name})`);
      await new Promise((r) => setTimeout(r, 65_000));
      continue;
    }
    throw new Error(`signup failed for ${name}: ${res.status}`);
  }
  throw new Error(`signup rate-limited for ${name}`);
}

async function loginCookie(user: UiUser): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (!res.status.toString().startsWith("2")) throw new Error(`login failed for ${user.email}`);
  return (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0] ?? "";
}

async function main() {
  const coach = await signup("coach");
  const student = await signup("student");

  // ابزار مدیریتی رسمی — همان مسیر عملیاتی ادمین
  const grant = Bun.spawnSync(["bun", "scripts/manage-coaching.ts", "grant-premium", "--email", student.email, "--days", "30", "--note", "p16 UI fixture"]);
  console.log("grant-premium:", (grant.stdout.toString() + grant.stderr.toString()).trim().split("\n")[0]);
  const approve = Bun.spawnSync(["bun", "scripts/manage-coaching.ts", "approve-coach", "--email", coach.email, "--publish"]);
  console.log("approve-coach:", (approve.stdout.toString() + approve.stderr.toString()).trim().split("\n")[0]);

  const coachCookie = await loginCookie(coach);
  const studentCookie = await loginCookie(student);

  // پروفایل حرفه‌ای مربی از مسیر API مالک‌محور (معادل فرم UI) + انتشار
  const prof = await fetch(`${BASE}/api/coach/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: coachCookie },
    body: JSON.stringify({
      displayName: "مربی آرمان تست",
      headline: "مربی قدرتی و تغذیه",
      bio: "پروفایل آزمایشی برای تست مرورگر مرحله ۱۶ با اطلاعات کامل حرفه‌ای.",
      specializations: ["strength", "nutrition_coaching"],
      certifications: ["NSCA-CSCD"],
      experienceYears: 8,
      cooperationTypes: ["PRIVATE", "SEMI_PRIVATE"],
    }),
  });
  if (prof.status !== 200) throw new Error(`profile save failed: ${prof.status}`);
  const publishRes = await fetch(`${BASE}/api/coach/profile/publish`, {
    method: "POST",
    headers: { Cookie: coachCookie },
    body: JSON.stringify({ published: true }),
  });
  console.log("coach profile published:", publishRes.status);

  // دانشجو درخواست ارتباط می‌دهد؛ مربی می‌پذیرد — مسیر واقعی مرحله ۱۵
  const req = await fetch(`${BASE}/api/coach-connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ coachId: (await db.coachProfile.findUnique({ where: { userId: (await db.user.findUnique({ where: { email: coach.email } }))!.id } }))!.userId, cooperationType: "PRIVATE", message: "برای تست مرورگر p16" }),
  });
  const reqJson = (await req.json()) as { connection?: { id?: string } };
  if (req.status !== 201 || !reqJson.connection?.id) throw new Error(`connection request failed: ${req.status}`);
  const accept = await fetch(`${BASE}/api/coach/requests/${reqJson.connection.id}/accept`, {
    method: "POST",
    headers: { Cookie: coachCookie },
  });
  if (!accept.status.toString().startsWith("2")) throw new Error(`accept failed: ${accept.status}`);
  console.log("connection ACTIVE");

  const coachUser = (await db.user.findUnique({ where: { email: coach.email } }))!;

  // برنامه تمرینی — ساخت و ارسال از API واقعی
  const wp = await fetch(`${BASE}/api/coach/workout-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: coachCookie },
    body: JSON.stringify({
      title: "برنامه قدرتی اختصاصی",
      description: "برنامه سه‌روزه قدرتی با تمرکز بالاتنه",
      goal: "strength",
      difficulty: "intermediate",
      durationMinutes: 60,
      days: [
        {
          title: "پوش — سینه و پشت بازو",
          exercises: [
            { exerciseId: "bench-press-dumbbell", sets: 4, repsMin: 8, repsMax: 10, restSeconds: 90, note: "آرنج‌ها ۴۵ درجه", suggestedWeightKg: 20 },
            { exerciseId: "pushup", sets: 3, repsMin: 12, repsMax: 15, restSeconds: 60, note: null, suggestedWeightKg: null },
          ],
        },
        {
          title: "پول — پشت و جلو بازو",
          exercises: [
            { exerciseId: "plank", sets: 3, repsMin: 30, repsMax: 45, restSeconds: 45, note: "بدن صاف", suggestedWeightKg: null },
          ],
        },
      ],
    }),
  });
  const wpJson = (await wp.json()) as { plan?: { id?: string } };
  if (wp.status !== 201) throw new Error(`workout plan failed: ${wp.status}`);
  const conn = await db.coachStudentConnection.findFirst({ where: { coachId: coachUser.id, status: "ACTIVE" } });
  if (!conn) throw new Error("no active connection");
  const pubW = await fetch(`${BASE}/api/coach/workout-plans/${wpJson.plan!.id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: coachCookie },
    body: JSON.stringify({ connectionId: conn.id }),
  });
  if (pubW.status !== 201) throw new Error(`workout publish failed: ${pubW.status}`);
  console.log("workout plan sent (v1)");

  // برنامه غذایی — ساخت و ارسال
  const np = await fetch(`${BASE}/api/coach/nutrition-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: coachCookie },
    body: JSON.stringify({
      title: "برنامه تغذیه کاهش وزن",
      description: "کالری متعادل با پروتئین کافی",
      goal: "weight_loss",
      durationDays: 1,
      days: [
        {
          meals: [
            { type: "breakfast", items: [{ foodId: "egg", unit: "g", amount: 100 }, { foodId: "oats", unit: "g", amount: 60 }] },
            { type: "lunch", items: [{ foodId: "salmon", unit: "g", amount: 150 }, { foodId: "spinach", unit: "g", amount: 100 }] },
          ],
        },
      ],
    }),
  });
  const npJson = (await np.json()) as { plan?: { id?: string } };
  if (np.status !== 201) throw new Error(`nutrition plan failed: ${np.status}`);
  const pubN = await fetch(`${BASE}/api/coach/nutrition-plans/${npJson.plan!.id}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: coachCookie },
    body: JSON.stringify({ connectionId: conn.id }),
  });
  if (pubN.status !== 201) throw new Error(`nutrition publish failed: ${pubN.status}`);
  console.log("nutrition plan sent (v1)");

  console.log("\n=== FIXTURE READY ===");
  console.log(JSON.stringify({
    coach: { email: coach.email, password: coach.password },
    student: { email: student.email, password: student.password },
    stamp,
  }, null, 2));
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
