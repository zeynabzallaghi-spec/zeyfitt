/**
 * check-password-reset.ts — تست E2E سطح API برای جریان بازیابی رمز عبور.
 * اجرا: bun scripts/check-password-reset.ts  (سرور dev باید روی :3000 باشد)
 *
 * پوشش:
 *  1. ثبت‌نام کاربر تستی
 *  2. فراموشی رمز → حالت بدون ایمیل → لینک sandbox با توکن
 *  3. ریست رمز با توکن → موفق
 *  4. ورود با رمز قدیمی → 401
 *  5. ورود با رمز جدید → 200 + نشست
 *  6. ابطال نشست‌های قدیمی پس از ریست (revokeSessionsOnPasswordReset)
 *  7. ایمیل ناشناس → پاسخ عمومی بدون لینک (بدون افشای وجود حساب)
 *  8. رمز ضعیف در ریست → 400 PASSWORD_POLICY
 *  9. توکن یک‌بارمصرف: استفاده مجدد → خطا
 *  10. پاک‌سازی کاربر تستی
 */

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const EMAIL = `reset-check-${Date.now()}@example.com`;
const OLD_PASSWORD = "oldpass123";
const NEW_PASSWORD = "newpass456";

let passed = 0;
let failed = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

async function main() {
  console.log(`— بررسی جریان بازیابی رمز روی ${BASE} —`);

  // 1) ثبت‌نام
  const signupRes = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: OLD_PASSWORD, name: "تست بازیابی" }),
  });
  ok("ثبت‌نام کاربر تستی", signupRes.status === 200, `status=${signupRes.status}`);
  const sessionCookie = (signupRes.headers.getSetCookie?.() ?? []).find((c) =>
    c.startsWith("fitcoach.session_token"),
  );
  const oldSessionToken = sessionCookie?.split(";")[0];

  // 2) فراموشی رمز — حالت بدون ایمیل
  const forgotRes = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL.toUpperCase() }), // نرمال‌سازی حروف بزرگ
  });
  const forgot = (await forgotRes.json()) as {
    status: boolean;
    delivery: string;
    resetUrl?: string;
  };
  ok(
    "فراموشی رمز → لینک sandbox",
    forgotRes.status === 200 && forgot.delivery === "sandbox-link" && typeof forgot.resetUrl === "string",
    `status=${forgotRes.status} delivery=${forgot.delivery}`,
  );
  const token = forgot.resetUrl?.match(/token=([^&]+)/)?.[1] ?? "";
  ok("توکن در لینک موجود است", token.length >= 20);

  // 8) رمز ضعیف در ریست → خطای سیاست
  const weakRes = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword: "abcdefgh", token }), // بدون رقم
  });
  const weak = (await weakRes.json()) as { message?: string };
  ok(
    "رمز ضعیف → PASSWORD_POLICY",
    weakRes.status === 400 && weak.message === "PASSWORD_POLICY",
    `status=${weakRes.status} message=${weak.message}`,
  );

  // 3) ریست رمز با رمز مجاز
  const resetRes = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword: NEW_PASSWORD, token }),
  });
  ok("ریست رمز با توکن معتبر", resetRes.status === 200, `status=${resetRes.status}`);

  // 9) توکن یک‌بارمصرف — استفاده مجدد
  const reuseRes = await fetch(`${BASE}/api/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ newPassword: "anotherpass1", token }),
  });
  ok("توکن یک‌بارمصرف است", reuseRes.status === 400, `status=${reuseRes.status}`);

  // 4) ورود با رمز قدیمی
  const oldRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: OLD_PASSWORD }),
  });
  ok("ورود با رمز قدیمی رد می‌شود", oldRes.status === 401, `status=${oldRes.status}`);

  // 5) ورود با رمز جدید
  const newRes = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: NEW_PASSWORD }),
  });
  ok("ورود با رمز جدید موفق", newRes.status === 200, `status=${newRes.status}`);

  // 6) ابطال نشست قدیمی (نشیتی که پیش از ریست ساخته شد)
  if (oldSessionToken) {
    const sessionRes = await fetch(`${BASE}/api/auth/get-session`, {
      headers: { Cookie: oldSessionToken },
    });
    const session = (await sessionRes.json()) as unknown;
    ok("نشست قدیمی پس از ریست باطل شده", sessionRes.status === 200 && session === null, `body=${JSON.stringify(session)}`);
  } else {
    ok("نشست قدیمی پس از ریست باطل شده", false, "کوکی نشست ثبت‌نام یافت نشد");
  }

  // 7) ایمیل ناشناس → پاسخ عمومی بدون لینک
  const unknownRes = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: `nobody-${Date.now()}@example.com` }),
  });
  const unknown = (await unknownRes.json()) as { status: boolean; delivery: string; resetUrl?: string };
  ok(
    "ایمیل ناشناس → پاسخ عمومی بدون لینک",
    unknownRes.status === 200 && unknown.status === true && unknown.delivery === "email" && !unknown.resetUrl,
    `delivery=${unknown.delivery}`,
  );

  // ایمیل نامعتبر → 400
  const invalidRes = await fetch(`${BASE}/api/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "not-an-email" }),
  });
  ok("ایمیل نامعتبر → 400", invalidRes.status === 400, `status=${invalidRes.status}`);

  // 10) پاک‌سازی کاربر تستی (با Prisma — Cascade)
  const { db } = await import("../src/lib/db");
  const deleted = await db.user.deleteMany({ where: { email: EMAIL.toLowerCase() } });
  ok("پاک‌سازی کاربر تستی", deleted.count === 1, `deleted=${deleted.count}`);
  await db.$disconnect();

  console.log(`\nنتیجه: ${passed} سبز، ${failed} قرمز`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("خطای اجرا:", error);
  process.exit(1);
});
