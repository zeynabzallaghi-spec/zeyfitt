/**
 * auto-recover.ts — خودترمیم پس از بازنشانی سندباکس (توسط predev در هر `bun run dev`)
 *
 * مسیر سریع (وضعیت سالم): دو کوئری سبز — کمتر از یک ثانیه، dev بلافاصله بالا می‌آید.
 * مسیر کند (فقط بعد از reset): bootstrap ادمین + p18 (بانک ۹۰۵ حرکت) + p19 (نگاشت سه‌بعدی).
 * همه مراحل idempotent هستند؛ هرگز خطا پرتاب نمیکند — بالا آمدن dev همیشه در اولویت است
 * (ضمناً در package.json با `|| true` هم محافظت شده).
 *
 * پیشینه: تا امروز ۳ بار reset سندباکس (۰۶:۱۸ دیروز، ۱۱:۵۱ و ۲۱:۲۳ امروز) نقش ادمین و
 * بانک حرکات را پاک کرد — این اسکریپت همان playbook مستند Task 33/36/37 است، خودکار.
 */
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const ADMIN_EMAIL = "mahziar.parvizi@gmail.com"; // حساب مالک پروژه — بازیابی مستند (Task 33/36/37)
const MIN_EXPECTED_EXERCISES = 900; // بانک کامل = ۹۰۵؛ زیر این یعنی reset شده

function runScript(file: string, args: string[] = []): void {
  const r = spawnSync("bun", [file, ...args], {
    encoding: "utf8",
    cwd: process.cwd(),
    timeout: 180_000,
  });
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim();
  if (out) console.log(out.split("\n").slice(-6).join("\n"));
  if (r.status !== 0) console.log(`[auto-recover] warn: ${file} exited ${r.status}`);
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    // 1) نقش ادمین
    const rows = await prisma.$queryRawUnsafe<{ role: string }[]>(
      `SELECT role FROM "User" WHERE email = '${ADMIN_EMAIL}'`
    );
    if (rows[0]?.role !== "ADMIN") {
      console.log(`[auto-recover] admin role missing (${rows[0]?.role ?? "no-user"}) → bootstrap…`);
      runScript("scripts/p195-admin-bootstrap.ts", ["--email", ADMIN_EMAIL, "--confirm"]);
    } else {
      console.log("[auto-recover] admin role ok");
    }

    // 2) بانک حرکات
    const ex = await prisma.$queryRawUnsafe<{ c: number }[]>(
      `SELECT COUNT(*) AS c FROM "Exercise"`
    );
    const count = ex[0]?.c ?? 0;
    if (count < MIN_EXPECTED_EXERCISES) {
      console.log(`[auto-recover] exercise bank incomplete (${count}) → re-import…`);
      runScript("scripts/p18-import-exercises.ts");
      runScript("scripts/p19-import-mapping.ts");
    } else {
      console.log(`[auto-recover] exercise bank ok (${count})`);
    }
  } catch (e) {
    console.log(`[auto-recover] skipped due to error: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().finally(() => process.exit(0));
