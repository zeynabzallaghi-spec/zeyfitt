/**
 * پاک‌سازی کاربران موقت تست API/مرورگر — فقط حساب‌های dbg/p4/p6 حذف می‌شوند؛ حساب‌های واقعی و نمایشی دست‌نخورده می‌مانند.
 * اجرا: bun scripts/cleanup-test-users.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const PREFIXES = ["p4-user-", "p6-user-", "p6-browser-", "p6-so-", "p6-dbg-", "p7-", "p8-user-", "p8-browser-", "p9-user-", "p9-browser-", "p9-ctx-", "p9-f1-", "p9-f2-", "p9-f3-", "p9-diag", "p9-dup", "p9-fix", "p10-", "p11-", "p12-", "oom-probe", "dbg", "dbg2-", "dbg3-"];

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
