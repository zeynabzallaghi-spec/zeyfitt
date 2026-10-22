/**
 * p20a-seed-fixture-profile.ts — کاشت FitnessProfile برای مربی fixture
 * (پرش از آنبوردینگ در تست مرورگر P0 — فقط رکورد fixture آزمایشی).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const email = "p196-coach-fixture@fixture.local";

const u = await db.user.findUnique({ where: { email }, select: { id: true } });
if (!u) {
  console.log("NO USER");
  process.exit(1);
}
await db.fitnessProfile.upsert({
  where: { userId: u.id },
  update: {},
  create: {
    userId: u.id,
    displayName: "مربی تستی",
    age: 30,
    gender: "male",
    heightCm: 180,
    weightKg: 80,
    goal: "fitness",
    experience: "intermediate",
    trainingDaysPerWeek: 3,
  },
});
console.log("PROFILE OK", u.id);
await db.$disconnect();
