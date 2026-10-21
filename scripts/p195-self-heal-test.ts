/**
 * p195-self-heal-test.ts — تست ایزوله ترمیم خودکار بانک (مرحله ۱۹.۵).
 *
 * روش: کپی کامل دیتابیس واقعی → خالی‌کردن جدول Exercise فقط در کپی →
 * اجرای ensureExerciseBank با DATABASE_URL روی کپی → راستی‌آزمایی اینکه
 * import خودکار ۹۰۵ رکورد را در کپی بازگردانده است.
 * دیتابیس واقعی هرگز لمس نمیشود.
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const REAL_DB = "/home/z/my-project/db/custom.db";
const COPY_DB = `/home/z/my-project/db/selfheal-test-${Date.now()}.db`;

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

async function main() {
  console.log("\n=== تست ایزوله self-heal بانک حرکات ===\n");

  // ۱) کپی کامل با SQLite backup semantics (فایل ساده کافی است — سرور در حال نوشتن هم journal-safe است برای این تست چون copy-file بدون WAL)
  fs.copyFileSync(REAL_DB, COPY_DB);
  console.log(`  … کپی ساخته شد: ${path.basename(COPY_DB)}`);

  // ۲) خالی‌کردن جدول Exercise فقط در کپی
  const copy = new PrismaClient({ datasources: { db: { url: `file:${COPY_DB}` } } });
  await copy.$executeRawUnsafe("PRAGMA foreign_keys=OFF");
  await copy.$executeRawUnsafe("DELETE FROM Exercise");
  await copy.$executeRawUnsafe("PRAGMA foreign_keys=ON");
  const emptyCount = await copy.exercise.count();
  ok("جدول Exercise در کپی خالی شد", emptyCount === 0, `count=${emptyCount}`);
  const usersInCopy = await copy.user.count();
  ok("کاربران در کپی حفظ شدند (۶ — پایه واقعی مرحله ۲۰)", usersInCopy === 6, `count=${usersInCopy}`);
  await copy.$disconnect();

  // ۳) اجرای ensureExerciseBank در فرایند جدا با DATABASE_URL کپی
  const probe = `
    process.env.DATABASE_URL = "file:${COPY_DB}";
    process.env.EXERCISE_BANK_SELF_HEAL = "1";
    import("/home/z/my-project/src/lib/exercises/bank.ts").then(async (bank) => {
      await bank.ensureExerciseBank();
      console.log("HEAL_COUNT=" + bank.exerciseBankCount());
      process.exit(0);
    }).catch((e) => { console.error("HEAL_ERR=" + e.message); process.exit(1); });
  `;
  fs.writeFileSync("/home/z/my-project/scripts/p195-self-heal-probe.mts", probe);
  const proc = Bun.spawnSync(["bun", "run", "/home/z/my-project/scripts/p195-self-heal-probe.mts"], {
    cwd: "/home/z/my-project",
    env: { ...process.env, DATABASE_URL: `file:${COPY_DB}`, EXERCISE_BANK_SELF_HEAL: "1" },
    timeout: 180_000,
  });
  const out = proc.stdout.toString() + proc.stderr.toString();
  const m = out.match(/HEAL_COUNT=(\d+)/);
  const healed = m ? Number(m[1]) : 0;
  ok("self-heal بانک را بازگرداند (۹۰۵)", healed === 905, `healed=${healed} out=${out.slice(0, 300)}`);

  // ۴) راستی‌آزمایی مستقل روی کپی
  const copy2 = new PrismaClient({ datasources: { db: { url: `file:${COPY_DB}` } } });
  const total = await copy2.exercise.count({ where: { status: "active" } });
  const ready = await copy2.exercise.count({ where: { status: "active", animation3dStatus: "ready" } });
  ok("کپی پس از self-heal: ۹۰۵ رکورد فعال", total === 905, `total=${total}`);
  ok("کپی پس از self-heal: ۹۰۵ ready (نگاشت کامل)", ready === 905, `ready=${ready}`);
  const batch = await copy2.exerciseImportBatch.findFirst({ orderBy: { startedAt: "desc" } });
  ok("دسته import خودکار با گزارش ثبت شد", batch != null);
  const ic = await copy2.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  ok("integrity کپی پس از self-heal: ok", ic[0]?.integrity_check === "ok");
  await copy2.$disconnect();

  // ۵) دیتابیس واقعی دست‌نخورده
  const real = new PrismaClient();
  const realTotal = await real.exercise.count({ where: { status: "active" } });
  const realUsers = await real.user.count();
  ok("دیتابیس واقعی دست‌نخورده ماند (۹۰۵ حرکت، ۶ کاربر)", realTotal === 905 && realUsers === 6, `total=${realTotal} users=${realUsers}`);
  await real.$disconnect();

  // ۶) پاک‌سازی فایل‌های تست
  fs.rmSync(COPY_DB, { force: true });
  fs.rmSync(COPY_DB + "-journal", { force: true });
  fs.rmSync("/home/z/my-project/scripts/p195-self-heal-probe.mts", { force: true });
  console.log("  … فایل‌های تست ایزوله پاک شدند");

  console.log(`\n=== نتیجه: ${passed} سبز، ${failed} قرمز ===`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
