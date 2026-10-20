/**
 * p195-admin-bootstrap.ts — تعریف امن اولین ادمین (مرحله ۱۹.۵).
 *
 * روش واقعی ورود به پنل مدیریت:
 *   ۱) مدیر آینده در خود سایت ثبت‌نام معمولی می‌کند (مثل هر کاربر دیگر).
 *   ۲) اپراتور همین اسکریپت را روی سرور با ایمیل همان حساب اجرا می‌کند.
 *   ۳) پس از ورود معمولی، «پنل مدیریت» در منوی همان کاربر ظاهر می‌شود.
 *
 * قواعد امنیتی:
 *  - هیچ رمز پیش‌فرض یا حساب مدیر عمومی ساخته نمی‌شود؛ فقط ارتقای یک
 *    حساب واقعیِ موجود (ثبت‌نام‌شده از مسیر عادی با رمز خود کاربر).
 *  - بدون --confirm هیچ تغییری انجام نمیشود؛ بدون --email خطا می‌دهد.
 *  - تغییر در AdminActionLog ثبت می‌شود (action=bootstrap-admin).
 *  - --revoke: تنزل به STUDENT با محافظت «آخرین ادمین» (تأیید --confirm).
 *
 * اجرا: bun scripts/p195-admin-bootstrap.ts --email u@x.com --confirm
 *       bun scripts/p195-admin-bootstrap.ts --email u@x.com --revoke --confirm
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function maskId(id: string): string {
  return id.length <= 6 ? "***" : `${id.slice(0, 3)}…${id.slice(-3)}`;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg("--email");
  const confirm = process.argv.includes("--confirm");
  const revoke = process.argv.includes("--revoke");

  if (!email) {
    console.error("ERROR: --email required (example: --email admin@example.com)");
    process.exit(1);
  }
  if (!confirm) {
    console.error("ERROR: this command changes a real user role — re-run with --confirm");
    process.exit(1);
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, role: true },
  });
  if (!user) {
    console.error(`ERROR: no user found with email=${email} — the account must register normally in the app first`);
    process.exit(1);
  }

  if (revoke) {
    if (user.role !== "ADMIN") {
      console.log(`OK revoke-admin: user=${maskId(user.id)} already role=${user.role} (no change)`);
      return;
    }
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) {
      console.error("ERROR: cannot revoke the last remaining admin");
      process.exit(1);
    }
    await db.user.update({ where: { id: user.id }, data: { role: "STUDENT" } });
    await db.adminActionLog.create({
      data: {
        adminId: user.id,
        action: "revoke-admin",
        targetType: "user",
        targetId: user.id,
        metaJson: JSON.stringify({ via: "p195-admin-bootstrap" }),
      },
    });
    console.log(`OK revoke-admin user=${maskId(user.id)} role=STUDENT`);
    return;
  }

  if (user.role === "ADMIN") {
    console.log(`OK bootstrap-admin: user=${maskId(user.id)} already role=ADMIN (no change, idempotent)`);
    return;
  }

  const from = user.role;
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  await db.adminActionLog.create({
    data: {
      adminId: user.id,
      action: "bootstrap-admin",
      targetType: "user",
      targetId: user.id,
      metaJson: JSON.stringify({ from, via: "p195-admin-bootstrap" }),
    },
  });
  console.log(`OK bootstrap-admin user=${maskId(user.id)} role=${from} → ADMIN`);
  console.log("بعد از ورود معمولی، «پنل مدیریت» در منوی این حساب ظاهر می‌شود.");
}

main()
  .catch((err) => {
    console.error("ERROR:", err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
