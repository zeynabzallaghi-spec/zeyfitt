/**
 * p17-browser-fixture.ts — fixture ایزوله برای آزمون مرورگر مرحله ۱۷.
 * ساخت: مربی تأییدشده + دانشجوی PREMIUM با ارتباط ACTIVE (مسیرهای واقعی
 * مراحل ۱۵). هیچ پیام/مکالمه از پیش ساخته نمیشود — گفت‌وگو از خود UI
 * آغاز میشود تا مسیر واقعی کاربر آزموده شود.
 * اجرا: bun scripts/p17-browser-fixture.ts
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();
const stamp = Date.now();
const PASSWORD = "p17ui-pass123";

interface UiUser {
  email: string;
  password: string;
}

async function signup(name: string): Promise<UiUser> {
  const email = `p17ui-${name}-${stamp}@test.invalid`.toLowerCase();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, name: `UI17 ${name}` }),
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
  const grant = Bun.spawnSync(["bun", "scripts/manage-coaching.ts", "grant-premium", "--email", student.email, "--days", "30", "--note", "p17 UI fixture"]);
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
      bio: "پروفایل آزمایشی برای تست مرورگر مرحله ۱۷ با اطلاعات کامل حرفه‌ای.",
      specializations: ["strength", "nutrition_coaching"],
      certifications: ["NSCA-CSCD"],
      experienceYears: 8,
      cooperationTypes: ["PRIVATE", "SEMI_PRIVATE"],
    }),
  });
  if (prof.status !== 200) throw new Error(`profile save failed: ${prof.status}`);
  const publishRes = await fetch(`${BASE}/api/coach/profile/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: coachCookie },
    body: JSON.stringify({ published: true }),
  });
  console.log("coach profile published:", publishRes.status);

  // دانشجو درخواست ارتباط می‌دهد؛ مربی می‌پذیرد — مسیر واقعی مرحله ۱۵
  const coachRow = (await db.user.findUnique({ where: { email: coach.email } }))!;
  const req = await fetch(`${BASE}/api/coach-connections`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: studentCookie },
    body: JSON.stringify({ coachId: coachRow.id, cooperationType: "PRIVATE", message: "سلام، برای همراهی تمرینی درخواست میدهم." }),
  });
  const reqJson = (await req.json()) as { connection?: { id?: string } };
  if (req.status !== 201 || !reqJson.connection?.id) throw new Error(`connection request failed: ${req.status}`);
  const accept = await fetch(`${BASE}/api/coach/requests/${reqJson.connection.id}/accept`, {
    method: "POST",
    headers: { Cookie: coachCookie },
  });
  if (!accept.status.toString().startsWith("2")) throw new Error(`accept failed: ${accept.status}`);
  console.log("connection ACTIVE:", reqJson.connection.id);

  console.log("\n=== P17 UI FIXTURE READY ===");
  console.log(JSON.stringify({
    coach: coach,
    student: student,
    connectionId: reqJson.connection.id,
    cookiePrefix: "fitcoach.session_token",
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
