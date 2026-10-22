/**
 * p23-cleanup-browser-fixture.ts — پاکسازی fixture مرورگر P1 (فقط خودش).
 * اجرا: bun scripts/p23-cleanup-browser-fixture.ts
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";

const db = new PrismaClient();

async function main() {
  const info = JSON.parse(
    readFileSync("/home/z/my-project/scratch/p23-browser-fixture.json", "utf8")
  ) as { userId: string; email: string };
  const userId = info.userId;
  await db.coachWorkoutPlan.deleteMany({ where: { coachId: userId } });
  await db.coachExercise.deleteMany({ where: { coachId: userId } });
  await db.coachExerciseFolder.deleteMany({ where: { coachId: userId } });
  await db.coachProfile.deleteMany({ where: { userId } });
  await db.assistantConversation.deleteMany({ where: { userId } });
  await db.fitnessProfile.deleteMany({ where: { userId } });
  await db.session.deleteMany({ where: { userId } });
  await db.account.deleteMany({ where: { userId } });
  await db.user.delete({ where: { id: userId } }).catch(() => undefined);
  const users = await db.user.count();
  const coachEx = await db.coachExercise.count();
  console.log(`CLEANED ${info.email} | users=${users} | coachExercises=${coachEx}`);
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
