/**
 * p24-cleanup-browser-fixture.ts — پاکسازی کامل فیکسچر مرورگر P2.
 * فقط رکوردهای متعلق به fixtureهای p24-browser-* (کاسکید از user) +
 * فایلهای storage حرکات fixture + رسانه بانک اضافهشده توسط ادمین فیکسچر.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";

const db = new PrismaClient();

async function main() {
  const raw = readFileSync("/home/z/my-project/scratch/p24-browser-fixture.json", "utf-8");
  const fx = JSON.parse(raw) as {
    stamp: number;
    coach: { userId: string; videoExerciseId: string; noVideoExerciseId: string };
    admin: { userId: string; bankExerciseId: string };
  };
  const emails = [
    `p24-browser-coach-${fx.stamp}@test.invalid`,
    `p24-browser-student-${fx.stamp}@test.invalid`,
    `p24-browser-admin-${fx.stamp}@test.invalid`,
  ].map((e) => e.toLowerCase());

  const users = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
  console.log(`cleanup: ${users.length} users`);

  // رسانه بانک اضافهشده توسط ادمین fixture
  const bankMedia = await db.exerciseMedia.findMany({ where: { exerciseId: fx.admin.bankExerciseId } });
  for (const m of bankMedia) {
    if (m.fileName === "bank-fixture.mp4") {
      await db.exerciseMedia.delete({ where: { id: m.id } });
      const abs = path.join(process.cwd(), "data", "uploads", m.storagePath);
      if (existsSync(abs)) unlinkSync(abs);
    }
  }
  const bankVideos = await db.exerciseMedia.count({ where: { exerciseId: fx.admin.bankExerciseId, kind: "video" } });
  if (bankVideos === 0) {
    await db.exercise.updateMany({ where: { id: fx.admin.bankExerciseId, videoStatus: "uploaded" }, data: { videoStatus: "none" } });
  }

  // حرکات شخصی + فایلها
  const coachId = fx.coach.userId;
  const exercises = await db.coachExercise.findMany({
    where: { coachId, id: { in: [fx.coach.videoExerciseId, fx.coach.noVideoExerciseId] } },
    select: { id: true, media: { select: { storagePath: true } } },
  });
  for (const ex of exercises) {
    await db.coachExercise.delete({ where: { id: ex.id } }).catch(() => undefined);
    for (const m of ex.media) {
      const abs = path.join(process.cwd(), "data", "uploads", m.storagePath);
      if (existsSync(abs)) unlinkSync(abs);
    }
  }

  // کاربران (کاسکید)
  for (const u of users) {
    await db.coachProfile.deleteMany({ where: { userId: u.id } });
    await db.studentSubscription.deleteMany({ where: { userId: u.id } });
    await db.assistantConversation.deleteMany({ where: { userId: u.id } });
    await db.notification.deleteMany({ where: { userId: u.id } });
    await db.session.deleteMany({ where: { userId: u.id } });
    await db.account.deleteMany({ where: { userId: u.id } });
    await db.fitnessProfile.deleteMany({ where: { userId: u.id } });
    await db.user.delete({ where: { id: u.id } }).catch(() => undefined);
  }

  const integrity = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  console.log("integrity:", integrity[0]?.integrity_check);
  console.log("CLEANUP DONE");
}

main()
  .catch((e) => {
    console.error("ERROR:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
