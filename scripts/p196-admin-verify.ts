/**
 * p196-admin-verify.ts — تأیید انتها-به-انتها پس از بازنشانی سندباکس.
 *
 * سناریو: سندباکس ریست شد → نقش ادمین از دست رفت و بانک ۹۰۵ حرکتی خالی شد.
 * اقدامات انجام‌شده: bootstrap ادمین + import رسمی p18/p19.
 * این اسکریپت با کاربر آزمایشیِ واقعی (ثبت‌نام عادی) بررسی می‌کند:
 *   ۱) API بانک حرکات با نشست واقعی ۹۰۵ حرکت برمی‌گرداند
 *   ۲) APIهای ادمین برای دانشجو 403 می‌دهند (کنترل نقش سالم است)
 * سپس همه آثار کاربر آزمایشی پاک می‌شود (بدون باقی‌گذاری داده).
 */

const BASE = "http://localhost:3000";
const EMAIL = `p196-verify-${Date.now()}@fixture.local`;
const PASSWORD = "Vr9#tQ2wLp!4zX7k";

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}

const checks: Check[] = [];

function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}: ${detail}`);
}

async function main() {
  // ۱) ثبت‌نام عادی کاربر آزمایشی
  const signUp = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "تست پاکشدنی" }),
  });
  const setCookie = signUp.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  record("sign-up fixture user", signUp.ok, `status=${signUp.status} cookie=${cookie ? "yes" : "no"}`);
  if (!signUp.ok || !cookie) throw new Error("fixture sign-up failed");

  // ۲) بانک حرکات با نشست واقعی
  const exRes = await fetch(`${BASE}/api/exercises?page=1&pageSize=5`, {
    headers: { cookie },
  });
  const exJson = (await exRes.json()) as { total?: number; items?: unknown[] };
  const total = Number(exJson.total ?? -1);
  record(
    "exercise bank serves 905",
    exRes.ok && total === 905,
    `status=${exRes.status} total=${total}`
  );

  // ۳) API ادمین برای دانشجو باید 403 بدهد
  const adminRes = await fetch(`${BASE}/api/admin/overview`, { headers: { cookie } });
  record("admin API denies STUDENT", adminRes.status === 403, `status=${adminRes.status}`);

  // ۴) پاکسازی کاربر آزمایشی و آثارش (FK cascade)
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  try {
    const u = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
    if (u) {
      await db.assistantConversation.deleteMany({ where: { userId: u.id } });
      await db.fitnessProfile.deleteMany({ where: { userId: u.id } });
      await db.session.deleteMany({ where: { userId: u.id } });
      await db.account.deleteMany({ where: { userId: u.id } });
      await db.verification.deleteMany({});
      await db.user.delete({ where: { id: u.id } });
      record("fixture cleanup", true, `user ${u.id.slice(0, 3)}… removed`);
    } else {
      record("fixture cleanup", false, "user not found");
    }
    const remaining = await db.user.count();
    record("real users intact", remaining === 4, `users=${remaining} (1 ADMIN + 3 STUDENT)`);
  } finally {
    await db.$disconnect();
  }

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
