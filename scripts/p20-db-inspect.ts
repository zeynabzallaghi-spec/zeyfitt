/**
 * p20-db-inspect — بازرسی سریع وضعیت db/custom.db (کاربران، جدول‌ها، بانک حرکات)
 * استفاده: bun scripts/p20-db-inspect.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.$queryRawUnsafe<
    { email: string; name: string | null; role: string; createdAt: string }[]
  >(`SELECT email, name, role, createdAt FROM "User" ORDER BY createdAt ASC`);

  console.log("=== USERS ===");
  for (const u of users) {
    console.log(`${u.email} | role=${u.role} | name=${u.name ?? "-"} | created=${u.createdAt}`);
  }

  const tables = await prisma.$queryRawUnsafe<{ name: string }[]>(
    `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`
  );
  console.log(`\n=== TABLES (${tables.length}) ===`);
  console.log(tables.map((t) => t.name).join(", "));

  const exerciseCount = await prisma.$queryRawUnsafe<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM "Exercise"`
  );
  const profiles = await prisma.$queryRawUnsafe<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM "FitnessProfile"`
  );
  const coachProfiles = await prisma.$queryRawUnsafe<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM "CoachProfile"`
  );
  const connections = await prisma.$queryRawUnsafe<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM "CoachStudentConnection"`
  );
  console.log(`\n=== COUNTS ===`);
  console.log(
    `exercises=${exerciseCount[0]?.c} | fitnessProfiles=${profiles[0]?.c} | coachProfiles=${coachProfiles[0]?.c} | connections=${connections[0]?.c}`
  );
}

main()
  .catch((e) => {
    console.error("INSPECT_FAIL:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
