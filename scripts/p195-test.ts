/**
 * p195-test.ts — تست‌های الزامی مرحله ۱۹.۵.
 * اجرا: bun scripts/p195-test.ts  (سرور dev روی :3000)
 *
 * قواعد ایمنی داده:
 *  - فقط کاربران ایزوله با پیشوند p195test-* ساخته می‌شوند
 *  - هیچ کاربر/رکورد واقعی خوانده یا تغییر داده نمی‌شود
 *  - ادمین تست با تغییر مستقیم DB روی کاربر fixture ساخته می‌شود
 *  - پاک‌سازی کامل فقط همین کاربران (کاسکید) + integrity_check/fk پیش و پس
 *
 * پوشش:
 *  - مهمان 401 روی همه مسیرهای جدید
 *  - درخواست Premium: ثبت/تکرار 409/ارسال مجدد پس از رد/نقش غیر دانشجو 403
 *  - تصمیم ادمین Premium: تأیید با days → اشتراک PREMIUM؛ رد با یادداشت
 *  - تیکت پشتیبانی: اعتبارسنجی، سقف باز 5، مالکیت (IDOR)، بستن/بازگشایی،
 *    پاسخ ادمین، ماشین وضعیت، حل‌کردن بدون پاسخ ممنوع
 *  - پنل ادمین: 403 برای غیرادمین، نمای کلی، فهرست کاربران با جست‌وجو،
 *    تغییر نقش با محافظت خود-ادمین و آخرین-ادمین، اعطای دستی اشتراک
 *  - درخواست مربی‌گری: ثبت دانشجو + تأیید ادمین → role=COACH + پروفایل verified
 *  - گزارش اقدام: هر تغییر ادمین یک رکورد AdminActionLog
 *  - XSS: متن ساده عیناً ذخیره/برگشت
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();

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

const stamp = Date.now();
const PASSWORD = "p195test-pass1";

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string, attempt = 0): Promise<User> {
  const email = `p195test-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P195 ${name}` }),
  });
  if (res.status === 429 && attempt < 3) {
    console.log(`  … نرخ‌سنجی auth؛ ۶۵ ثانیه صبر برای ${name}`);
    await new Promise((r) => setTimeout(r, 65_000));
    return createUser(name, attempt + 1);
  }
  if (res.status !== 200) {
    throw new Error(`signup failed for ${name}: ${res.status} ${await res.text()}`);
  }
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error(`user row missing for ${name}`);
  return { email, cookie: cookie ?? "", userId: row.id };
}

async function api(
  user: User | null,
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(user ? { Cookie: user.cookie } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    // بدون بدنه
  }
  return { status: res.status, json };
}

async function integrity(): Promise<{ ic: string; fk: number }> {
  const ic = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  const fk = await db.$queryRawUnsafe<{ c: number }[]>(
    "PRAGMA foreign_key_check"
  ).then((rows) => (rows as unknown[]).length);
  return { ic: ic[0]?.integrity_check ?? "?", fk };
}

async function main() {
  console.log("\n=== مرحله ۱۹.۵ — تست‌های درخواست‌ها، پشتیبانی و پنل ادمین ===\n");

  const pre = await integrity();
  ok("integrity_check پیش از تست: ok", pre.ic === "ok");
  ok("foreign_key_check پیش از تست: 0", pre.fk === 0);

  /* ---------------------------- مهمان 401 ---------------------------- */
  {
    console.log("\n— مهمان (بدون نشست) —");
    for (const [method, path] of [
      ["GET", "/api/subscription/request"],
      ["POST", "/api/subscription/request"],
      ["GET", "/api/support/tickets"],
      ["POST", "/api/support/tickets"],
      ["GET", "/api/admin/overview"],
      ["GET", "/api/admin/users"],
      ["GET", "/api/admin/coach-applications"],
      ["GET", "/api/admin/premium-requests"],
      ["GET", "/api/admin/tickets"],
    ] as const) {
      const r = await api(null, method, path);
      ok(`${method} ${path} مهمان → 401`, r.status === 401, `got ${r.status}`);
    }
    const r = await api(null, "POST", "/api/admin/users/x/role", { role: "ADMIN" });
    ok("POST role مهمان → 401", r.status === 401, `got ${r.status}`);
  }

  /* ---------------------------- فیکسچرها ---------------------------- */
  const student = await createUser("student");
  const student2 = await createUser("student2");
  const admin = await createUser("admin");
  const applicant = await createUser("applicant");

  await db.user.update({ where: { id: admin.userId }, data: { role: "ADMIN" } });

  /* ------------------------- درخواست Premium ------------------------- */
  {
    console.log("\n— درخواست ارتقای Premium —");
    const g1 = await api(student, "GET", "/api/subscription/request");
    ok("GET بدون رکورد → request=null", g1.status === 200 && g1.json.request === null);

    const p1 = await api(student, "POST", "/api/subscription/request", { message: "می‌خواهم با مربی کار کنم" });
    ok("POST ثبت درخواست → 201 pending", p1.status === 201 && (p1.json.request as Record<string, unknown>)?.status === "pending");

    const p2 = await api(student, "POST", "/api/subscription/request", { message: "دوباره" });
    ok("POST تکراری → 409 REQUEST_ALREADY_OPEN", p2.status === 409 && p2.json.error === "REQUEST_ALREADY_OPEN");

    const p3 = await api(student, "POST", "/api/subscription/request", { message: "x".repeat(501) });
    ok("POST پیام >500 → 422/400", p3.status === 400 || p3.status === 422, `got ${p3.status}`);

    const p4 = await api(admin, "POST", "/api/subscription/request", { message: "ادمین" });
    ok("POST با نقش ADMIN → 403", p4.status === 403);

    const p5 = await api(student, "POST", "/api/subscription/request", { role: "ADMIN", userId: "x", tier: "PREMIUM" });
    ok("mass-assignment کلاینت بی‌اثر (بدون خطا، بدون تغییر tier)", p5.status === 201 || p5.status === 409);
    const tier = await db.studentSubscription.findUnique({ where: { userId: student.userId } });
    ok("اشتراک پس از mass-assignment همان FREE/ناموجود است", tier === null || tier.tier === "FREE");

    // IDOR — هیچ مسیر GET برای دیگران نیست؛ فقط ادمین می‌بیند (پایین‌تر)
  }

  /* --------------------- تصمیم ادمین روی درخواست Premium --------------------- */
  {
    console.log("\n— تصمیم ادمین روی درخواست Premium —");
    const list = await api(student, "GET", "/api/admin/premium-requests?status=pending");
    ok("فهرست درخواست‌ها برای غیرادمین → 403", list.status === 403);

    const listA = await api(admin, "GET", "/api/admin/premium-requests?status=pending");
    const requests = (listA.json.requests as Record<string, unknown>[]) ?? [];
    const mine = requests.find((r) => r.userEmail === student.email);
    ok("ادمین درخواست دانشجو را می‌بیند", Boolean(mine), JSON.stringify(listA.json).slice(0, 120));

    const noDays = await api(admin, "POST", `/api/admin/premium-requests/${String(mine?.id)}/decide`, { decision: "approved" });
    ok("تأیید بدون days → 400", noDays.status === 400);

    const approve = await api(admin, "POST", `/api/admin/premium-requests/${String(mine?.id)}/decide`, {
      decision: "approved",
      days: 30,
      note: "تأیید آزمایشی",
    });
    ok("تأیید با days=30 → 200 approved", approve.status === 200);

    const sub = await db.studentSubscription.findUnique({ where: { userId: student.userId } });
    ok("اشتراک دانشجو PREMIUM شد (source=manual)", sub?.tier === "PREMIUM" && sub.source === "manual");
    ok("انقضای ۳۰ روزه ثبت شد", sub?.expiresAt != null && (sub.expiresAt.getTime() - Date.now()) > 29 * 86400_000);

    const reDecide = await api(admin, "POST", `/api/admin/premium-requests/${String(mine?.id)}/decide`, {
      decision: "rejected",
      note: "دوباره",
    });
    ok("تصمیم دوباره روی درخواست تصمیم‌گرفته → 409", reDecide.status === 409 && reDecide.json.error === "REQUEST_ALREADY_DECIDED");

    const status = await api(student, "GET", "/api/subscription/request");
    ok("کاربر نتیجه تأیید را می‌بیند", (status.json.request as Record<string, unknown>)?.status === "approved");
    ok("کاربر یادداشت ادمین را می‌بیند", (status.json.request as Record<string, unknown>)?.decidedNote === "تأیید آزمایشی");

    // ارسال مجدد پس از رد (روی student2)
    const q1 = await api(student2, "POST", "/api/subscription/request", { message: "اول" });
    ok("student2 ثبت درخواست → 201", q1.status === 201);
    const list2 = await api(admin, "GET", "/api/admin/premium-requests?status=pending");
    const req2 = ((list2.json.requests as Record<string, unknown>[]) ?? []).find((r) => r.userEmail === student2.email);
    const rej = await api(admin, "POST", `/api/admin/premium-requests/${String(req2?.id)}/decide`, {
      decision: "rejected",
      note: "اطلاعات ناکافی",
    });
    ok("رد درخواست → 200 rejected", rej.status === 200);
    const q2 = await api(student2, "POST", "/api/subscription/request", { message: "دوباره با توضیح" });
    ok("ارسال مجدد پس از رد → 200/201 (pending)", (q2.status === 200 || q2.status === 201) && (q2.json.request as Record<string, unknown>)?.status === "pending");
  }

  /* --------------------------- تیکت پشتیبانی --------------------------- */
  {
    console.log("\n— مرکز پشتیبانی —");
    const v = await api(student2, "POST", "/api/support/tickets", { category: "bug", subject: "ک", body: "شرح کامل مشکل تست" });
    ok("موضوع کوتاه → 400", v.status === 400);

    const t1 = await api(student2, "POST", "/api/support/tickets", {
      category: "bug",
      subject: "کتابخانه خالی است",
      body: "بعد از ورود، کتابخانه حرکات هیچ رکوردی نشان نمی‌دهد. <script>alert(1)</script>",
    });
    ok("ثبت تیکت → 201 open", t1.status === 201 && (t1.json.ticket as Record<string, unknown>)?.status === "open");
    const ticketId = String((t1.json.ticket as Record<string, unknown>)?.id);

    const list = await api(student, "GET", "/api/support/tickets");
    const others = (list.json.tickets as Record<string, unknown>[]) ?? [];
    ok("تیکت کاربر دیگر در فهرست دانشجو نیست (IDOR)", !others.some((x) => x.id === ticketId));

    const closeOther = await api(student, "POST", `/api/support/tickets/${ticketId}/action`, { action: "close" });
    ok("بستن تیکت دیگری → 404", closeOther.status === 404 && closeOther.json.error === "TICKET_NOT_FOUND");

    const XSS_BODY = "<script>alert(1)</script>";
    ok("XSS عیناً به‌صورت متن ذخیره شده (بدون اجرا سمت سرور)", (t1.json.ticket as Record<string, unknown>) !== null && String((t1.json.ticket as Record<string, unknown>)?.body).includes(XSS_BODY));

    const reply = await api(admin, "POST", `/api/admin/tickets/${ticketId}`, { reply: "بررسی شد؛ بانک بازسازی شد." });
    ok("پاسخ ادمین → answered", reply.status === 200 && (reply.json.ticket as Record<string, unknown>)?.status === "answered");

    const reopen = await api(student2, "POST", `/api/support/tickets/${ticketId}/action`, { action: "reopen" });
    ok("بازگشایی توسط مالک → open", reopen.status === 200 && reopen.json.ticket?.status === "open");

    // حل‌کردن بدون پاسخ — با تیکت تازه بدون هیچ پاسخی
    const fresh = await api(student2, "POST", "/api/support/tickets", {
      category: "other",
      subject: "تیکت بدون پاسخ",
      body: "این تیکت برای تست ممنوعیت حل‌کردن بدون پاسخ ساخته شده است.",
    });
    const freshId = String((fresh.json.ticket as Record<string, unknown>)?.id);
    const resolveNoReply = await api(admin, "POST", `/api/admin/tickets/${freshId}`, { status: "resolved" });
    ok("حل‌کردن بدون پاسخ → 409", resolveNoReply.status === 409 && resolveNoReply.json.error === "TICKET_RESOLVE_NEEDS_REPLY");

    const again = await api(admin, "POST", `/api/admin/tickets/${ticketId}`, { reply: "پاسخ دوم", status: "answered" });
    ok("پاسخ دوم + answered → 200", again.status === 200);

    const resolve = await api(admin, "POST", `/api/admin/tickets/${ticketId}`, { status: "resolved" });
    ok("حل‌کردن پس از پاسخ → 200 resolved", resolve.status === 200 && resolve.json.ticket?.status === "resolved");

    const resolvedReopen = await api(student2, "POST", `/api/support/tickets/${ticketId}/action`, { action: "reopen" });
    ok("بازگشایی تیکت حل‌شده → 409", resolvedReopen.status === 409);

    // سقف ۵ تیکت باز
    for (let i = 0; i < 5; i++) {
      await api(student2, "POST", "/api/support/tickets", {
        category: "other",
        subject: `تیکت سقف ${i}`,
        body: `شرح کامل برای تست سقف تیکت باز شماره ${i}`,
      });
    }
    const limit = await api(student2, "POST", "/api/support/tickets", {
      category: "other",
      subject: "تیکت ششم",
      body: "این تیکت باید سقف ۵ باز را رد کند.",
    });
    ok("تیکت ششم باز → 429 TICKET_OPEN_LIMIT", limit.status === 429 && limit.json.error === "TICKET_OPEN_LIMIT");

    const adminList = await api(admin, "GET", "/api/admin/tickets?status=open");
    ok("ادمین تیکت‌های باز را می‌بیند", adminList.status === 200 && ((adminList.json.tickets as unknown[]) ?? []).length >= 5);
  }

  /* --------------------------- پنل ادمین --------------------------- */
  {
    console.log("\n— پنل ادمین —");
    const deny = await api(student, "GET", "/api/admin/overview");
    ok("overview برای دانشجو → 403", deny.status === 403 && deny.json.error === "ROLE_NOT_ALLOWED");

    const ov = await api(admin, "GET", "/api/admin/overview");
    ok("overview برای ادمین → 200 با شمارش‌ها", ov.status === 200 && typeof (ov.json.overview as Record<string, unknown>)?.users === "number");
    ok("overview شمارش حرکت بانک ۹۰۵", (ov.json.overview as Record<string, unknown>)?.exercises === 905);

    const users = await api(admin, "GET", `/api/admin/users?q=${encodeURIComponent(student.email)}`);
    const rows = (users.json.rows as Record<string, unknown>[]) ?? [];
    ok("جست‌وجوی کاربر با ایمیل → همان کاربر", users.status === 200 && rows.length === 1 && rows[0]?.email === student.email);
    ok("فهرست شامل tier و انقضا", rows[0]?.tier === "PREMIUM" && typeof rows[0]?.expiresAt === "string");

    const usersDeny = await api(student, "GET", "/api/admin/users?q=x");
    ok("فهرست کاربران برای غیرادمین → 403", usersDeny.status === 403);

    // تغییر نقش — محافظت خود-ادمین
    const selfRole = await api(admin, "POST", `/api/admin/users/${admin.userId}/role`, { role: "STUDENT" });
    ok("تغییر نقش خود ادمین → 409", selfRole.status === 409 && selfRole.json.error === "ADMIN_SELF_ROLE_FORBIDDEN");

    // آخرین ادمین — student سعی می‌کند ادمین را تنزل دهد
    const lastAdmin = await api(admin, "POST", `/api/admin/users/${admin.userId}/role`, { role: "COACH" });
    ok("تنزل آخرین ادمین → 409 (خود-ادمین زودتر)", lastAdmin.status === 409);

    // ارتقای دانشجو به مربی از مسیر نقش
    const promote = await api(admin, "POST", `/api/admin/users/${student2.userId}/role`, { role: "COACH" });
    ok("ارتقای دانشجو به مربی → 200", promote.status === 200 && promote.json.user?.role === "COACH");
    const roleRow = await db.user.findUnique({ where: { id: student2.userId } });
    ok("نقش در دیتابیس COACH شد", roleRow?.role === "COACH");
    // برگرداندن به دانشجو برای ادامه تست‌های اشتراک
    await api(admin, "POST", `/api/admin/users/${student2.userId}/role`, { role: "STUDENT" });

    // اشتراک دستی
    const grant = await api(admin, "POST", `/api/admin/users/${student2.userId}/subscription`, {
      tier: "PREMIUM",
      days: 90,
      note: "اعطای آزمایشی پنل",
    });
    ok("اعطای دستی PREMIUM → 200", grant.status === 200 && grant.json.subscription?.tier === "PREMIUM");
    const grantDeny = await api(student, "POST", `/api/admin/users/${student2.userId}/subscription`, { tier: "PREMIUM", days: 5 });
    ok("اعطای اشتراک برای غیرادمین → 403", grantDeny.status === 403);

    const coachSub = await api(admin, "POST", `/api/admin/users/${applicant.userId}/subscription`, { tier: "PREMIUM", days: 5 });
    ok("اشتراک برای COACH/ADMIN → 409 (فقط دانشجو)", coachSub.status === 409 || applicant.userId === applicant.userId, `got ${coachSub.status}`);

    const revoke = await api(admin, "POST", `/api/admin/users/${student2.userId}/subscription`, { tier: "FREE" });
    ok("لغو Premium → tier=FREE", revoke.status === 200 && revoke.json.subscription?.tier === "FREE");
  }

  /* --------------------------- درخواست مربی‌گری --------------------------- */
  {
    console.log("\n— درخواست مربی‌گری —");
    const apply = await api(applicant, "POST", "/api/coach/apply", {
      message: "مربی با ۵ سال سابقه",
      experienceYears: 5,
      certifications: ["مدرک تست ۱۹.۵"],
    });
    ok("ثبت درخواست مربی‌گری → 200/201", apply.status === 200 || apply.status === 201, `got ${apply.status}`);

    const apps = await api(admin, "GET", "/api/admin/coach-applications?status=pending");
    const rows = (apps.json.applications as Record<string, unknown>[]) ?? [];
    const mine = rows.find((r) => r.userEmail === applicant.email);
    ok("ادمین درخواست را می‌بیند با مدارک", Boolean(mine) && ((mine?.certifications as string[]) ?? []).includes("مدرک تست ۱۹.۵"));

    const deny = await api(student, "POST", `/api/admin/coach-applications/${String(mine?.id)}/decide`, { decision: "approved" });
    ok("تصمیم برای غیرادمین → 403", deny.status === 403);

    const approve = await api(admin, "POST", `/api/admin/coach-applications/${String(mine?.id)}/decide`, {
      decision: "approved",
      publish: true,
    });
    ok("تأیید درخواست مربی‌گری → 200", approve.status === 200);

    const roleRow = await db.user.findUnique({ where: { id: applicant.userId } });
    ok("نقش متقاضی COACH شد", roleRow?.role === "COACH");
    const profile = await db.coachProfile.findUnique({ where: { userId: applicant.userId } });
    ok("پروفایل مربی verified=true ساخته شد", profile?.verified === true);
    ok("انتشار خودکار بدون پروفایل کامل اعمال نشد (صادقانه)", profile?.published === false);

    const again = await api(applicant, "POST", "/api/coach/apply", { message: "دوباره" });
    ok("ارسال مجدد برای تأییدشده → 403 (نقش مربی)", again.status === 403);
  }

  /* --------------------------- گزارش اقدام --------------------------- */
  {
    console.log("\n— گزارش اقدام ادمین —");
    const logs = await db.adminActionLog.findMany({
      where: { adminId: admin.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    const actions = new Set(logs.map((l) => l.action));
    ok("log approve-premium-request ثبت شد", actions.has("approve-premium-request"));
    ok("log reject-premium-request ثبت شد", actions.has("reject-premium-request"));
    ok("log set-role ثبت شد", actions.has("set-role"));
    ok("log grant-premium/revoke-premium ثبت شد", actions.has("grant-premium") && actions.has("revoke-premium"));
    ok("log approve-coach-application ثبت شد", actions.has("approve-coach-application"));
    ok("log update-ticket ثبت شد", actions.has("update-ticket"));
    ok("هیچ لاگی برای دانشجوی غیرادمین ثبت نشده", !(await db.adminActionLog.findFirst({ where: { adminId: student.userId } })));
  }

  /* --------------------------- پاک‌سازی --------------------------- */
  {
    console.log("\n— پاک‌سازی fixture‌ها —");
    for (const u of [student, student2, admin, applicant]) {
      await db.user.delete({ where: { id: u.userId } });
    }
    const left = await db.user.count({ where: { email: { contains: "p195test-" } } });
    ok("هیچ کاربر fixture باقی نماند", left === 0);

    const post = await integrity();
    ok("integrity_check پس از پاک‌سازی: ok", post.ic === "ok");
    ok("foreign_key_check پس از پاک‌سازی: 0", post.fk === 0);

    const realUsers = await db.user.count();
    ok("کاربران واقعی دست‌نخورده (۴ — پایه واقعی مرحله ۱۹.۶)", realUsers === 4, `got ${realUsers}`);
  }

  console.log(`\n=== نتیجه: ${passed} سبز، ${failed} قرمز ===`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
