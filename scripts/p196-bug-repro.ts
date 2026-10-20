/**
 * p196-bug-repro.ts — بازتولید باگ «ثبت برنامه تمرینی/غذایی» (بخش ۱۴ مرحله ۱۹.۶).
 * اجرا: bun scripts/p196-bug-repro.ts  (سرور dev روی :3000)
 *
 * هدف: ثبت واقعی درخواست POST /api/coach/workout-plans و /api/coach/nutrition-plans
 * با داده معتبر و نامعتبر و ثبت دقیق پاسخ/کد خطا برای یافتن علت ریشه‌ای.
 * فقط کاربر ایزوله p196repro-* ساخته می‌شود و در پایان پاک می‌شود.
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();

const stamp = Date.now();
const PASSWORD = "p196repro-pass1";

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string): Promise<User> {
  const email = `p196repro-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P196 ${name}` }),
  });
  const resText = await res.text();
  if (res.status !== 200) {
    throw new Error(`signup failed for ${name}: ${res.status} body=${resText.slice(0, 300)}`);
  }
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error(`user row missing for ${name}`);
  return { email, cookie: cookie ?? "", userId: row.id };
}

async function api(
  user: User,
  path: string,
  init?: RequestInit
): Promise<{ status: number; contentType: string; bodyText: string }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      cookie: user.cookie,
    },
  });
  const bodyText = await res.text();
  return { status: res.status, contentType: res.headers.get("content-type") ?? "?", bodyText };
}

async function main() {
  console.log("== ساخت fixture مربی (COACH + verified) ==");
  const coach = await createUser("coach");
  await db.user.update({ where: { id: coach.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: { userId: coach.userId, displayName: "مربی تست ۱۹۶", verified: true, published: true },
  });
  console.log("coach:", coach.email);

  // حرکت واقعی از بانک برای payload معتبر
  const ex = await db.exercise.findFirst({
    where: { status: "active" },
    select: { id: true, faName: true, enName: true },
  });
  console.log("exercise in bank:", ex?.id ?? "NONE ⚠️");

  // ---------- ۱) POST برنامه تمرینی با داده معتبر ----------
  const validWorkout = {
    title: "برنامه تست ۱۹.۶",
    description: "تست بازتولید باگ",
    goal: "fitness",
    difficulty: "beginner",
    durationMinutes: 45,
    days: [
      {
        title: "روز اول",
        exercises: [
          {
            exerciseId: ex?.id ?? "unknown-exercise",
            sets: 3,
            repsMin: 10,
            repsMax: 12,
            restSeconds: 90,
            note: null,
            suggestedWeightKg: null,
          },
        ],
      },
    ],
  };
  console.log("\n== ۱) POST /api/coach/workout-plans (معتبر) ==");
  const r1 = await api(coach, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validWorkout),
  });
  console.log("status:", r1.status, "content-type:", r1.contentType);
  console.log("body:", r1.bodyText.slice(0, 600));

  // ---------- ۲) POST برنامه غذایی با داده معتبر ----------
  const foods = await (async () => {
    // بانک غذا فایل TS است — شناسه معتبر از خود سرور با 400 خطای اعتبارسنجی کشف میشود؛
    // ابتدا تلاش با شناسه نمونه رایج
    return ["oats", "chicken_breast", "egg", "rice_cooked", "greek_yogurt"];
  })();
  const validNutrition = {
    title: "برنامه غذایی تست ۱۹.۶",
    description: "",
    goal: "maintain",
    durationDays: 1,
    days: [
      {
        meals: [
          {
            type: "breakfast",
            items: [{ foodId: foods[0], unit: "g", amount: 60 }],
          },
        ],
      },
    ],
  };
  console.log("\n== ۲) POST /api/coach/nutrition-plans (معتبر) ==");
  const r2 = await api(coach, "/api/coach/nutrition-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validNutrition),
  });
  console.log("status:", r2.status, "content-type:", r2.contentType);
  console.log("body:", r2.bodyText.slice(0, 600));

  // ---------- ۳) داده نامعتبر (عنوان کوتاه) ----------
  console.log("\n== ۳) POST /api/coach/workout-plans (عنوان کوتاه) ==");
  const r3 = await api(coach, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...validWorkout, title: "x" }),
  });
  console.log("status:", r3.status, "body:", r3.bodyText.slice(0, 300));

  // ---------- ۴) داده نامعتبر (حرکت خارج از بانک) ----------
  console.log("\n== ۴) POST با حرکت ناموجود در بانک ==");
  const r4 = await api(coach, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...validWorkout,
      days: [
        {
          title: "روز",
          exercises: [{ exerciseId: "nonexistent-id", sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60 }],
        },
      ],
    }),
  });
  console.log("status:", r4.status, "body:", r4.bodyText.slice(0, 300));

  // ---------- ۵) دانشجو غیر PREMIUM برای publish ----------
  // (فقط اگر ساخت draft موفق بود)
  const planId = (() => {
    try {
      const parsed = JSON.parse(r1.bodyText) as { plan?: { id?: string } };
      return parsed.plan?.id ?? null;
    } catch {
      return null;
    }
  })();
  console.log("\nplanId created:", planId);

  console.log("\n== پاک‌سازی ==");
  // رکوردهای برنامه با کاسکید از user حذف میشوند
  await db.user.delete({ where: { id: coach.userId } });
  console.log("coach fixture deleted");
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error("FATAL:", e);
    await db.$disconnect();
    process.exit(1);
  });
