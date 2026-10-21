/**
 * p20-db-backup — بکاپ امن و همگام از db/custom.db با VACUUM INTO (از مسیر Prisma)
 * استفاده: bun scripts/p20-db-backup.ts [پیشوند-نام-فایل]
 * خروجی: backups/<prefix>-<timestamp>.db + آمار سلامت (integrity + شمارش‌ها)
 *
 * VACUUM INTO یک statement اتمی است: خروجی آن همیشه snapshot سازگار و سالم است
 * حتی اگر هم‌زمان سرور در حال نوشتن باشد — امن‌ترین مسیر بدون وابستگی اضافه.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const prefix = process.argv[2] ?? "final-state";
const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const dest = `backups/${prefix}-${ts}.db`;

async function main() {
  await prisma.$executeRawUnsafe(`VACUUM INTO '${dest}'`);

  const count = async (table: string): Promise<number> => {
    const rows = await prisma.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(*) AS c FROM "${table}"`
    );
    return rows[0]?.c ?? -1;
  };

  const integrity = await prisma.$queryRawUnsafe<{ integrity_check: string }[]>(
    "PRAGMA integrity_check"
  );

  const stats = {
    users: await count("User"),
    admins: await count("User"),
    coaches: await count("User"),
    exercises: await count("Exercise"),
    workoutPlans: await count("WorkoutPlan"),
    nutritionPlans: await count("NutritionPlan"),
    messages: await count("CoachMessage"),
    directMessages: await count("DirectMessage"),
    directThreads: await count("DirectThread"),
    coachNotes: await count("CoachStudentNote"),
    folders: await count("CoachExerciseFolder"),
  };

  const adminRows = await prisma.$queryRawUnsafe<{ c: number }[]>(
    "SELECT COUNT(*) AS c FROM \"User\" WHERE role='ADMIN'"
  );
  const coachRows = await prisma.$queryRawUnsafe<{ c: number }[]>(
    "SELECT COUNT(*) AS c FROM \"User\" WHERE role='COACH'"
  );

  console.log(`BACKUP_OK: ${dest}`);
  console.log(`integrity=${integrity[0]?.integrity_check ?? "unknown"}`);
  console.log(
    `users=${stats.users} | admins=${adminRows[0]?.c ?? "?"} | coaches=${coachRows[0]?.c ?? "?"} | exercises=${stats.exercises} | workoutPlans=${stats.workoutPlans} | nutritionPlans=${stats.nutritionPlans} | messages=${stats.messages} | directMessages=${stats.directMessages} | coachNotes=${stats.coachNotes} | folders=${stats.folders}`
  );
}

main()
  .catch((e) => {
    console.error("BACKUP_FAIL:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
