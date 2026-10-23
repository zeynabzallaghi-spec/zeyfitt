/**
 * p2b-final-health.ts — بررسی نهایی فقط‌خواندنی سلامت داده (اصلاحیه Blocker P2).
 * اجرا: bun scripts/p2b-final-health.ts — هیچ نوشتنی انجام نمیشود.
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const integrity = await db.$queryRawUnsafe<{ integrity_check: string }[]>(
    "PRAGMA integrity_check"
  );
  const fk = await db.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check");
  console.log("integrity_check:", integrity[0]?.integrity_check);
  console.log("foreign_key_check violations:", fk.length);

  const [users, byRole, exercises, coachExercises, coachMedia, bankMedia, plans, coachPlans, deliveries] =
    await Promise.all([
      db.user.count(),
      db.user.groupBy({ by: ["role"], _count: { role: true } }),
      db.exercise.count(),
      db.coachExercise.count(),
      db.coachExerciseMedia.count(),
      db.exerciseMedia.count(),
      db.workoutPlan.count(),
      db.coachWorkoutPlan.count(),
      db.coachPlanDelivery.count(),
    ]);
  console.log("users:", users, JSON.stringify(byRole.map((r) => `${r.role}=${r._count.role}`)));
  console.log("exercises:", exercises);
  console.log("CoachExercise:", coachExercises, "| CoachExerciseMedia:", coachMedia, "| ExerciseMedia:", bankMedia);
  console.log("WorkoutPlan:", plans, "| CoachWorkoutPlan:", coachPlans, "| CoachPlanDelivery:", deliveries);

  const residue = await db.user.count({
    where: {
      OR: [
        { email: { startsWith: "p20a-" } },
        { email: { startsWith: "p23-" } },
        { email: { startsWith: "p24test-" } },
        { email: { startsWith: "p196-media-" } },
      ],
    },
  });
  console.log("fixture residue users (p20a/p23/p24test/p196-media):", residue);

  // فایل چت یافت‌شده در data/uploads — وضعیت مرجع دیتابیس آن
  const chatFile = "mvkzs4yr-56706d55-0371-47ce-a275-53a254e74c72";
  const coachAtt = await db.coachMessageAttachment.count({ where: { storagePath: { contains: chatFile } } });
  console.log("chat file DB references (CoachMessageAttachment):", coachAtt);
  const convos = await db.coachConversation.count();
  const directThreads = await db.directThread.count();
  console.log("CoachConversation:", convos, "| DirectThread:", directThreads);

  await db.$disconnect();
}

main().catch((e) => {
  console.error("ERROR:", e instanceof Error ? e.message : e);
  process.exit(1);
});
