/**
 * p3-seed-browser-fixture.ts — فیکسچر مرورگر P3 (گردش کار انتشار).
 *
 * میسازد:
 *  - مربی fixture + دو حرکت کامل با رسانه PNG:
 *      · A: ارسال‌شده (pending_review) — برای صف ادمین + badge مربی
 *      · B: تأییدشده (published + رکورد عمومی cexpub-*) — برای badge بانک عمومی
 *  - ادمین fixture برای ورود مرورگر
 * خروجی: scratch/p3-browser-fixture.json
 * پاکسازی: انتهای همین اسکریپت با فلگ --cleanup
 */

import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const STAMP = process.env.P3_SEED_STAMP ?? String(Date.now());
const PASSWORD = "p3-browser-pass1";
const PNG = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  )
);

const db = new PrismaClient();

async function signup(name: string): Promise<{ email: string; password: string; userId: string; cookie: string }> {
  const email = `p3-browser-${name}-${STAMP}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P3 Browser ${name}` }),
  });
  if (res.status !== 200) throw new Error(`signup ${name} failed: ${res.status}`);
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error(`user row missing: ${name}`);
  return { email, password: PASSWORD, userId: row.id, cookie: cookie ?? "" };
}

async function main() {
  const coach = await signup("coach");
  await db.user.update({ where: { id: coach.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: {
      userId: coach.userId,
      displayName: "P3 Browser Coach",
      headline: "fixture",
      bio: null,
      specializationsJson: "[]",
      certificationsJson: "[]",
      experienceYears: 1,
      cooperationTypesJson: JSON.stringify(["PRIVATE"]),
      verified: true,
      published: false,
    },
  });
  // پرش آنبوردینگ برای ورود مستقیم مرورگر
  await db.fitnessProfile.create({
    data: { userId: coach.userId, displayName: "P3 Browser Coach", age: 30, gender: "male", weightKg: 78, heightCm: 178, goal: "strength", experience: "intermediate", trainingDaysPerWeek: 4, sessionMinutes: 60 },
  });
  const admin = await signup("admin");
  await db.user.update({ where: { id: admin.userId }, data: { role: "ADMIN" } });
  await db.fitnessProfile.create({
    data: { userId: admin.userId, displayName: "P3 Browser Admin", age: 35, gender: "male", weightKg: 80, heightCm: 180, goal: "maintain", experience: "intermediate", trainingDaysPerWeek: 3, sessionMinutes: 45 },
  });

  const mkExercise = async (fa: string, en: string) => {
    const res = await fetch(`${BASE}/api/coach/exercises`, {
      method: "POST",
      headers: { cookie: coach.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        faName: fa,
        enName: en,
        category: "chest",
        difficulty: "intermediate",
        equipment: ["dumbbell"],
        primaryMuscles: ["chest"],
        secondaryMuscles: [],
        description: "حرکت فیکسچر مرورگر P3 — توضیح کامل برای بازبینی.",
        tips: "نکته تستی.",
      }),
    });
    if (res.status !== 201) throw new Error(`create exercise failed: ${res.status}`);
    const data = (await res.json()) as { exercise: { id: string } };
    const form = new FormData();
    form.append("file", new Blob([new Uint8Array(PNG)], { type: "image/png" }), "f.png");
    const up = await fetch(`${BASE}/api/coach/exercises/${data.exercise.id}/media`, {
      method: "POST",
      headers: { cookie: coach.cookie },
      body: form,
    });
    if (up.status !== 201) throw new Error(`media upload failed: ${up.status}`);
    return data.exercise.id;
  };

  const exA = await mkExercise("پرس سینه مرورگر A", "Browser Press A");
  const exB = await mkExercise("پرس سینه مرورگر B", "Browser Press B");

  for (const id of [exA, exB]) {
    const s = await fetch(`${BASE}/api/coach/exercises/${id}/submit`, {
      method: "POST",
      headers: { cookie: coach.cookie },
    });
    if (s.status !== 200) throw new Error(`submit ${id} failed: ${s.status}`);
  }
  const d = await fetch(`${BASE}/api/admin/exercise-reviews/${exB}/decide`, {
    method: "POST",
    headers: { cookie: admin.cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  if (d.status !== 200) throw new Error(`approve B failed: ${d.status}`);

  writeFileSync(
    "scratch/p3-browser-fixture.json",
    JSON.stringify({ stamp: STAMP, coach, admin, exA, exB, publishedId: `cexpub-${exB}` }, null, 2)
  );
  console.log("SEEDED:", JSON.stringify({ stamp: STAMP, exA, exB, publishedId: `cexpub-${exB}` }));
  await db.$disconnect();
}

async function cleanup() {
  const fixPath = "scratch/p3-browser-fixture.json";
  if (!existsSync(fixPath)) {
    console.log("no fixture file — nothing to clean");
    return;
  }
  const fix = JSON.parse(readFileSync(fixPath, "utf8")) as {
    coach: { userId: string };
    admin: { userId: string };
    exA: string;
    exB: string;
    publishedId: string;
  };
  const media = await db.exerciseMedia.findMany({ where: { exerciseId: fix.publishedId } });
  for (const m of media) await db.exerciseMedia.delete({ where: { id: m.id } }).catch(() => undefined);
  await db.exercise.delete({ where: { id: fix.publishedId } }).catch(() => undefined);
  await db.notification.deleteMany({ where: { dedupeKey: { contains: fix.exA } } });
  await db.notification.deleteMany({ where: { dedupeKey: { contains: fix.exB } } });
  for (const userId of [fix.coach.userId, fix.admin.userId]) {
    await db.coachExercise.deleteMany({ where: { coachId: userId } });
    await db.coachProfile.deleteMany({ where: { userId } });
    await db.notification.deleteMany({ where: { userId } });
    await db.session.deleteMany({ where: { userId } });
    await db.account.deleteMany({ where: { userId } });
    await db.fitnessProfile.deleteMany({ where: { userId } });
    await db.assistantConversation.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
  const { unlinkSync } = await import("node:fs");
  unlinkSync(fixPath);
  const users = await db.user.count();
  const exercises = await db.exercise.count({ where: { status: "active" } });
  const cex = await db.coachExercise.count();
  const em = await db.exerciseMedia.count();
  console.log(`CLEANED: users=${users} activeExercises=${exercises} coachExercises=${cex} exerciseMedia=${em}`);
  await db.$disconnect();
}

if (process.argv.includes("--cleanup")) {
  cleanup().catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  });
} else {
  main().catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  });
}
