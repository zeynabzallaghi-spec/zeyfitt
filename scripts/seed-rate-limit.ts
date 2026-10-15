/**
 * ابزار تست نرخ — درج N پیام کاربر واقعی‌نما در یک دقیقه اخیر برای یک
 * مکالمه، صرفاً برای فعال‌سازی آستانه محدودسازی نرخ در تست API (مرحله ۹).
 * این ابزار هیچ پاسخی جعل نمی‌کند؛ فقط پیام‌های user برای شمارش نرخ تزریق
 * می‌کند و در پایان تست به‌همراه مکالمه حذف می‌شود.
 *
 * اجرا: bun scripts/seed-rate-limit.ts <conversationId> <userId> <count>
 */

import { db } from "../src/lib/db";

async function main() {
  const [, , conversationId, userId, countArg] = process.argv;
  const count = Number(countArg);
  if (!conversationId || !userId || !Number.isInteger(count) || count < 1 || count > 200) {
    console.error("usage: bun scripts/seed-rate-limit.ts <conversationId> <userId> <count>");
    process.exit(1);
  }
  const now = Date.now();
  const data = Array.from({ length: count }, (_, i) => ({
    conversationId,
    userId,
    role: "user",
    content: `[rate-limit-seed ${i}]`,
    lang: null,
    createdAt: new Date(now - (count - i) * 500), // همه در آخرین ثانیه‌ها
  }));
  await db.assistantMessage.createMany({ data });
  console.log(`seeded ${count} rate-limit user messages for conversation ${conversationId}`);
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error("SEED ERROR:", error instanceof Error ? error.message : error);
  await db.$disconnect();
  process.exit(1);
});
