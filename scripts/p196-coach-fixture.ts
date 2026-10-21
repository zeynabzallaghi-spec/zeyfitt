/**
 * p196-coach-fixture.ts — ساخت/پاکسازی مربی آزمایشی برای تست مرورگر پروفایل.
 *
 * ساخت: bun scripts/p196-coach-fixture.ts --create
 *   ثبت‌نام عادی + ارتقای نقش به COACH + ساخت CoachProfile آزمایشی
 *   (نقش و پروفایل مستقیماً از مسیر تست تجهیز می‌شوند — هدف فقط تست UI است)
 * پاکسازی: bun scripts/p196-coach-fixture.ts --cleanup
 *   حذف کامل کاربر و همه آثارش
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const EMAIL = "p196-coach-fixture@fixture.local";
const PASSWORD = "Fx9#kQ2wLp!4zX7k";

async function create() {
  const res = await fetch("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "مربی تستی" }),
  });
  if (!res.ok) throw new Error(`sign-up failed: ${res.status} ${await res.text()}`);
  const user = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!user) throw new Error("user row not found after sign-up");
  await db.user.update({ where: { id: user.id }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: {
      userId: user.id,
      displayName: "مربی تستی",
      headline: "تست بازتولید باگ ذخیره پروفایل",
      bio: null,
      specializationsJson: JSON.stringify([]),
      certificationsJson: JSON.stringify([]),
      experienceYears: 3,
      cooperationTypesJson: JSON.stringify(["PRIVATE"]),
      verified: true,
      published: false,
    },
  });
  console.log(`OK fixture coach created: id=${user.id} email=${EMAIL} password=${PASSWORD}`);
}

async function cleanup() {
  const user = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (!user) {
    console.log("OK cleanup: fixture already absent");
    return;
  }
  await db.coachProfile.deleteMany({ where: { userId: user.id } });
  await db.assistantConversation.deleteMany({ where: { userId: user.id } });
  await db.fitnessProfile.deleteMany({ where: { userId: user.id } });
  await db.notification.deleteMany({ where: { userId: user.id } });
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.account.deleteMany({ where: { userId: user.id } });
  await db.user.delete({ where: { id: user.id } });
  console.log(`OK fixture coach removed: id=${user.id}`);
}

const mode = process.argv.includes("--create") ? "create" : process.argv.includes("--cleanup") ? "cleanup" : null;
if (!mode) {
  console.error("usage: bun scripts/p196-coach-fixture.ts --create | --cleanup");
  process.exit(1);
}
(mode === "create" ? create : cleanup)()
  .catch((err) => {
    console.error("ERROR:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
