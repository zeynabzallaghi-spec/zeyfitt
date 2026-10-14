/**
 * پاک‌سازی کاربران موقت تست API مرحله ۴ — فقط حساب‌های dbg/p4 حذف می‌شوند.
 * اجرا: bun scripts/cleanup-test-users.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const PREFIXES = ["p4-user-", "dbg", "dbg2-", "dbg3-"];

async function main() {
  const users = await db.user.findMany({ select: { id: true, email: true } });
  let removed = 0;
  for (const user of users) {
    if (PREFIXES.some((prefix) => user.email.startsWith(prefix))) {
      await db.user.delete({ where: { id: user.id } });
      removed += 1;
      console.log("removed:", user.email);
    }
  }
  const remaining = await db.user.findMany({ select: { email: true } });
  console.log(`\nremoved ${removed} users; remaining:`);
  for (const u of remaining) console.log(" -", u.email);
}

main()
  .catch((error) => {
    console.error("cleanup failed:", error instanceof Error ? error.name : "unknown");
    process.exit(1);
  })
  .finally(() => db.$disconnect());
