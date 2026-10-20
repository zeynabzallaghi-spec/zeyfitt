/**
 * p17-browser-profiles.ts — تکمیل پروفایل کاربران fixture مرورگر ۱۷ از
 * مسیر رسمی API (معادل onboarding) تا مرورگر مستقیماً به بخش‌های اصلی برسد.
 * اجرا: bun scripts/p17-browser-profiles.ts <coachEmail> <studentEmail>
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();
const PASSWORD = "p17ui-pass123";

async function loginCookie(email: string): Promise<string> {
  const res = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.status.toString().startsWith("2")) throw new Error(`login failed for ${email}: ${res.status}`);
  return (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0] ?? "";
}

async function completeProfile(email: string, displayName: string): Promise<void> {
  const cookie = await loginCookie(email);
  const res = await fetch(`${BASE}/api/profile`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({
      displayName,
      age: 27,
      gender: "undisclosed",
      heightCm: 176,
      weightKg: 74,
      bodyFat: null,
      goal: "strength",
      experience: "intermediate",
      trainingDaysPerWeek: 4,
      sessionMinutes: 60,
      equipment: [],
      limitations: [],
      limitationNotes: null,
      diet: "none",
      allergies: [],
      units: "metric",
    }),
  });
  if (!res.status.toString().startsWith("2")) {
    throw new Error(`profile failed for ${email}: ${res.status} ${await res.text()}`);
  }
  console.log("profile complete:", email);
}

async function main() {
  const [coachEmail, studentEmail] = process.argv.slice(2);
  if (!coachEmail || !studentEmail) throw new Error("usage: p17-browser-profiles.ts <coachEmail> <studentEmail>");
  await completeProfile(coachEmail, "آرمان تست");
  await completeProfile(studentEmail, "سینما تست");
  console.log("done");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
