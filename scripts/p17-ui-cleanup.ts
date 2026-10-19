/**
 * p17-ui-cleanup.ts — حذف کاربران fixture مرورگر مرحله ۱۷ (کاسکید از مسیر
 * user با Prisma = رعایت FK) + راستی‌آزمایی یکپارچگی.
 */
import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  const users = await db.user.findMany({ where: { email: { contains: "p17ui-" } } });
  console.log("fixture users:", users.length);
  for (const u of users) {
    await db.user.delete({ where: { id: u.id } });
  }
  const left = await db.user.count({ where: { email: { contains: "p17ui-" } } });
  const convs = await db.coachConversation.count();
  const msgs = await db.coachMessage.count();
  const real = await db.user.count({ where: { email: { not: { contains: "p17test" } } && { not: { contains: "p17ui" } } } });
  const ic = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  const fk = await db.$queryRawUnsafe<Record<string, unknown>[]>("PRAGMA foreign_key_check");
  console.log({ left, conversations: convs, messages: msgs, otherUsers: real, integrity: ic[0]?.integrity_check, fkViolations: fk.length });
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
