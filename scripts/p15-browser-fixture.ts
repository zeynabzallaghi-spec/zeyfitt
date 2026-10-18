/**
 * p15-browser-fixture.ts — fixture ایزوله برای آزمون مرورگر مرحله ۱۵.
 * ساخت: دانشجوی FREE، دانشجوی PREMIUM، مربی تأییدشده+منتشرشده.
 * اعطای PREMIUM و تأیید مربی «از طریق ابزار مدیریتی رسمی» انجام می‌شود
 * تا همان مسیر عملیاتی ادمین آزموده شود؛ پر کردن جزئیات پروفایل مربی
 * در همین اسکریپت (معادل فرم UI مربی) انجام می‌شود.
 * اجرا: bun scripts/p15-browser-fixture.ts
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();
const stamp = Date.now();
const PASSWORD = "p15ui-pass123";

interface UiUser {
  email: string;
  password: string;
}

async function signup(name: string): Promise<UiUser> {
  const email = `p15ui-${name}-${stamp}@test.invalid`.toLowerCase();
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: PASSWORD, name: `UI ${name}` }),
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

async function main() {
  const free = await signup("free");
  const prem = await signup("prem");
  const coach = await signup("coach");

  // ابزار مدیریتی رسمی — grant-premium
  const grant = Bun.spawnSync([
    "bun",
    "scripts/manage-coaching.ts",
    "grant-premium",
    "--email",
    prem.email,
    "--days",
    "30",
    "--note",
    "p15 UI fixture",
  ]);
  console.log("manage-coaching grant-premium:", grant.stdout.toString().trim() || grant.stderr.toString().trim());

  // ابزار مدیریتی رسمی — approve-coach (بدون --publish؛ پروفایل هنوز ناقص است)
  const approve = Bun.spawnSync([
    "bun",
    "scripts/manage-coaching.ts",
    "approve-coach",
    "--email",
    coach.email,
    "--name",
    "مربی آزمون UI",
  ]);
  console.log("manage-coaching approve-coach:", approve.stdout.toString().trim() || approve.stderr.toString().trim());

  // پر کردن پروفایل حرفه‌ای (معادل فرم پنل مربی) و انتشار از مسیر API مالک‌محور
  const row = await db.user.findUnique({ where: { email: coach.email } });
  if (!row) throw new Error("coach row missing");
  await db.coachProfile.update({
    where: { userId: row.id },
    data: {
      headline: "مربی قدرت و تغذیه",
      bio: "معرفی آزمایشی با طول کافی برای انتشار عمومی پروفایل مربی آزمون UI مرحله ۱۵.",
      specializationsJson: JSON.stringify(["strength", "nutrition_coaching"]),
      certificationsJson: JSON.stringify(["گواهی مربیگری آزمون"]),
      experienceYears: 6,
      cooperationTypesJson: JSON.stringify(["SEMI_PRIVATE", "PRIVATE"]),
    },
  });

  // انتشار از طریق API مالک‌محور (نه مستقیم در DB) — نشست مربی لازم است
  const login = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: coach.email, password: PASSWORD }),
  });
  const cookie = (login.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const publishRes = await fetch(`${BASE}/api/coach/profile/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie ?? "" },
    body: JSON.stringify({ published: true }),
  });
  console.log("coach publish via API:", publishRes.status, (await publishRes.text()).slice(0, 120));

  const listRes = await fetch(`${BASE}/api/coaches`);
  const list = (await listRes.json()) as { coaches: { userId: string }[] };
  const listed = list.coaches?.some((c) => c.userId === row.id);
  console.log("coach visible in public list:", listed);

  console.log("\nFIXTURE_OK");
  console.log(JSON.stringify({ stamp, free, prem, coach, password: PASSWORD, coachUserId: row.id }));
  await db.$disconnect();
}

main().catch(async (e) => {
  console.error("FATAL", e);
  await db.$disconnect();
  process.exit(1);
});
