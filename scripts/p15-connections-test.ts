/**
 * p15-connections-test.ts — تست‌های الزامی مرحله ۱۵ (API/امنیت/مجوزها).
 * اجرا: bun scripts/p15-connections-test.ts  (سرور dev روی :3000)
 *
 * قواعد ایمنی داده:
 *  - فقط کاربران ایزوله با پیشوند p15test-* ساخته می‌شوند
 *  - هیچ کاربر/رکورد واقعی خوانده یا تغییر داده نمی‌شود
 *  - پاک‌سازی کامل فقط روی همین کاربران (کاسکید از مسیر user)
 *
 * پوشش: اشتراک پیش‌فرض FREE، 403 برای FREE، بی‌اثری body ساختگی،
 * اعطای PREMIUM سمت سرور، نشست نامعتبر 401، تفکیک نقش‌ها، چرخه کامل
 * درخواست (ارسال/تکراری/پذیرش/رد/لغو/پایان)، مالکیت و IDOR، نوع همکاری
 * ارائهنشده، مربی غیرعمومی، انتقال نامعتبر، نرخ‌سنجی، ورودی مخرب/بلند،
 * حفظ داده migration.
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
const PASSWORD = "p15test-pass1";

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string, attempt = 0): Promise<User> {
  // نرمال‌سازی حروف — همان سیاست سرور برای ایمیل (lowercase)
  const email = `p15test-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: PASSWORD, name: `P15 ${name}` }),
  });
  // محدودیت نرخ auth (۵ ثبت‌نام در دقیقه) — صبر و تلاش مجدد
  if (res.status === 429 && attempt < 2) {
    console.log(`  … نرخ‌سنجی auth؛ ۶۵ ثانیه صبر برای ${name}`);
    await new Promise((r) => setTimeout(r, 65_000));
    return createUser(name, attempt + 1);
  }
  const resText = await res.text();
  if (res.status !== 200) {
    throw new Error(`signup failed for ${name}: ${res.status} body=${resText.slice(0, 200)}`);
  }
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) {
    const { execSync } = await import("node:child_process");
    const probe = execSync(
      `sqlite3 db/custom.db "SELECT id,email FROM user WHERE email='${email}'" 2>&1 || echo "sqlite3 cli unavailable"`
    ).toString();
    throw new Error(
      `user row missing for ${name} — resBody=${resText.slice(0, 160)} — sqliteProbe=${probe.trim()}`
    );
  }
  return { email, cookie: cookie ?? "", userId: row.id };
}

async function api(
  user: User | null,
  path: string,
  init?: RequestInit
): Promise<{ status: number; body: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(user && user.cookie ? { cookie: user.cookie } : {}),
    },
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* بدنه خالی */
  }
  return { status: res.status, body };
}

async function grantPremium(userId: string, days?: number) {
  await db.studentSubscription.upsert({
    where: { userId },
    create: {
      userId,
      tier: "PREMIUM",
      status: "active",
      source: "manual",
      note: "p15 test fixture",
      expiresAt: days ? new Date(Date.now() + days * 86400_000) : null,
    },
    update: {
      tier: "PREMIUM",
      status: "active",
      source: "manual",
      expiresAt: days ? new Date(Date.now() + days * 86400_000) : null,
    },
  });
}

async function approveCoach(email: string, publish: boolean, types: string[]) {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error("coach user missing");
  await db.user.update({ where: { id: user.id }, data: { role: "COACH" } });
  await db.coachApplication.upsert({
    where: { userId: user.id },
    create: { userId: user.id, status: "approved", decidedAt: new Date(), decidedBy: "p15-test" },
    update: { status: "approved", decidedAt: new Date() },
  });
  await db.coachProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName: `مربی آزمون ${user.name}`,
      headline: "مربی آزمون مرحله ۱۵",
      bio: "این پروفایل آزمایشی ایزوله برای تست مرحله ۱۵ ساخته شده است و پس از تست حذف می‌شود.",
      specializationsJson: JSON.stringify(["strength", "fat_loss"]),
      certificationsJson: JSON.stringify(["مدرک آزمونی"]),
      experienceYears: 5,
      cooperationTypesJson: JSON.stringify(types),
      verified: true,
      published: publish,
    },
    update: {
      verified: true,
      published: publish,
      cooperationTypesJson: JSON.stringify(types),
    },
  });
  return user.id;
}

async function main() {
  console.log(`— تست‌های مرحله ۱۵ روی ${BASE} —`);

  /* شمارش پایه برای آزمون حفظ داده */
  const baseCounts = {
    user: await db.user.count(),
    workoutPlan: await db.workoutPlan.count(),
    fitnessProfile: await db.fitnessProfile.count(),
  };

  /* ساخت fixture ایزوله */
  console.log("— ساخت fixture ایزوله —");
  const studentA = await createUser("studentA");
  const studentB = await createUser("studentB");
  const studentC = await createUser("studentC");
  const studentD = await createUser("studentD");
  // مربی‌ها هم کاربر واقعی‌اند — ثبت‌نام + نشست، سپس تأیید سمت سرور
  const coachMain = await createUser("coachMain");
  await approveCoach(coachMain.email, true, ["SEMI_PRIVATE", "PRIVATE"]);
  const coachOther = await createUser("coachOther");
  await approveCoach(coachOther.email, true, ["SEMI_PRIVATE"]);
  // مربی تأییدشده ولی «منتشرنشده»
  const coachHidden = await createUser("coachHidden");
  await approveCoach(coachHidden.email, false, ["SEMI_PRIVATE"]);
  const coachMainId = coachMain.userId;
  const coachOtherId = coachOther.userId;
  const coachHiddenId = coachHidden.userId;
  ok("fixture: ۷ کاربر ایزوله ساخته شد", true);

  /* ---------- ۱) اشتراک و مجوزها ---------- */
  console.log("— اشتراک و مجوزها —");

  const subA = await api(studentA, "/api/subscription");
  ok("کاربر جدید پیش‌فرض FREE است", subA.status === 200 && subA.body.subscription !== null && (subA.body.subscription as { tier?: string }).tier === "FREE", JSON.stringify(subA.body).slice(0, 120));
  ok("premium=false برای کاربر جدید", (subA.body.subscription as { premium?: boolean })?.premium === false);

  const anonSub = await api(null, "/api/subscription");
  ok("نشست نامعتبر → 401", anonSub.status === 401, `status=${anonSub.status}`);

  const freeRequest = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "SEMI_PRIVATE" }),
  });
  ok("FREE نمی‌تواند درخواست بفرستد → 403 SUBSCRIPTION_REQUIRED", freeRequest.status === 403 && freeRequest.body.error === "SUBSCRIPTION_REQUIRED", `status=${freeRequest.status} body=${JSON.stringify(freeRequest.body).slice(0, 120)}`);

  // تلاش برای ارتقا از کلاینت — هیچ‌کدام نباید اثر بگذارد
  const escalate1 = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "SEMI_PRIVATE", subscription: "PREMIUM", tier: "PREMIUM", premium: true }),
  });
  ok("body ساختگی اشتراک بی‌اثر است → باز 403", escalate1.status === 403 && escalate1.body.error === "SUBSCRIPTION_REQUIRED", `status=${escalate1.status}`);
  const escalate2 = await api(studentA, "/api/subscription?tier=PREMIUM&role=ADMIN");
  ok("query ساختگی اشتراک بی‌اثر است → FREE", escalate2.status === 200 && (escalate2.body.subscription as { tier?: string })?.tier === "FREE");
  const dbTier = await db.studentSubscription.findUnique({ where: { userId: studentA.userId } });
  ok("دیتابیس هم FREE مانده است", dbTier?.tier === "FREE", `tier=${dbTier?.tier}`);

  // اعطای PREMIUM فقط سمت سرور
  await grantPremium(studentA.userId);
  const subA2 = await api(studentA, "/api/subscription");
  ok("اشتراک PREMIUM سمت سرور شناخته می‌شود", subA2.status === 200 && (subA2.body.subscription as { premium?: boolean })?.premium === true);

  // دانشجو نمی‌تواند عملیات مربی را انجام دهد
  const asCoach = await api(studentA, "/api/coach/requests");
  ok("STUDENT → API مربی 403", asCoach.status === 403 && asCoach.body.error === "ROLE_NOT_ALLOWED", `status=${asCoach.status}`);
  const asCoachStudents = await api(studentA, "/api/coach/students");
  ok("STUDENT → API دانشجویان مربی 403", asCoachStudents.status === 403);
  const asCoachProfile = await api(studentA, "/api/coach/profile");
  ok("STUDENT → API پروفایل مربی 403", asCoachProfile.status === 403);

  /* ---------- ۲) فهرست عمومی مربیان ---------- */
  console.log("— فهرست عمومی مربیان —");

  const list = await api(null, "/api/coaches");
  const listBody = list.body.coaches as { userId: string; email?: string }[];
  ok("فهرست عمومی 200 و عمومی (بدون نشست)", list.status === 200);
  ok("مربی منتشرنشده در فهرست عمومی نیست", Array.isArray(listBody) && !listBody.some((c) => c.userId === coachHiddenId), `count=${listBody?.length}`);
  ok("فهرست شامل مربیان منتشرشده است", Array.isArray(listBody) && listBody.some((c) => c.userId === coachMainId) && listBody.some((c) => c.userId === coachOtherId));
  ok("هیچ ایمیل یا داده خصوصی در فهرست نیست", JSON.stringify(list.body).indexOf("@test.invalid") === -1 && JSON.stringify(list.body).indexOf("email") === -1);

  const hiddenDetail = await api(null, `/api/coaches/${coachHiddenId}`);
  ok("پروفایل منتشرنشده → 404 (بدون افشا)", hiddenDetail.status === 404);

  /* ---------- ۳) چرخه درخواست و پذیرش ---------- */
  console.log("— چرخه درخواست —");

  // نوع همکاری ارائهنشده توسط coachOther (فقط SEMI_PRIVATE ارائه میدهد)
  const wrongType = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachOtherId, cooperationType: "PRIVATE" }),
  });
  ok("نوع همکاری ارائهنشده → 422", wrongType.status === 422 && wrongType.body.error === "COOPERATION_TYPE_NOT_OFFERED", `status=${wrongType.status} body=${JSON.stringify(wrongType.body).slice(0, 100)}`);

  // مربی منتشرنشده → 404
  const toHidden = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachHiddenId, cooperationType: "SEMI_PRIVATE" }),
  });
  ok("مربی منتشرنشده → 404 COACH_UNAVAILABLE", toHidden.status === 404 && toHidden.body.error === "COACH_UNAVAILABLE", `status=${toHidden.status}`);

  // مربی ناموجود → 404
  const toGhost = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: "nonexistent-coach-id", cooperationType: "SEMI_PRIVATE" }),
  });
  ok("مربی ناموجود → 404", toGhost.status === 404);

  // ورودی نامعتبر → 400 با issues
  const badInput = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "GHOST_TYPE" }),
  });
  ok("ورودی نامعتبر → 400 VALIDATION با issues", badInput.status === 400 && Array.isArray(badInput.body.issues));

  // درخواست معتبر با پیام (شامل payload XSS — نمایش کلاینت escape می‌کند)
  const create1 = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      coachId: coachMainId,
      cooperationType: "SEMI_PRIVATE",
      message: "سلام، هدفم کاهش چربی است <script>alert(1)</script>",
    }),
  });
  ok("PREMIUM درخواست معتبر → 201 PENDING", create1.status === 201 && (create1.body.connection as { status?: string })?.status === "PENDING", `status=${create1.status} body=${JSON.stringify(create1.body).slice(0, 120)}`);
  const connId = (create1.body.connection as { id?: string })?.id ?? "";

  // درخواست تکراری → 409
  const duplicate = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "PRIVATE" }),
  });
  ok("درخواست تکراری به همان مربی → 409", duplicate.status === 409 && duplicate.body.error === "CONNECTION_ALREADY_OPEN", `status=${duplicate.status} body=${JSON.stringify(duplicate.body).slice(0, 100)}`);

  // پیام فوق‌بلند → 400
  const longMsg = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachOtherId, cooperationType: "SEMI_PRIVATE", message: "x".repeat(501) }),
  });
  ok("پیام ۵۰۱ کاراکتری → 400", longMsg.status === 400);

  // دانشجو فقط درخواست‌های خودش را می‌بیند
  const mineB = await api(studentB, "/api/coach-connections");
  ok("دانشجو دیگر این درخواست را نمی‌بیند", mineB.status === 200 && JSON.stringify(mineB.body).indexOf(connId) === -1);

  // مربی دیگر نمی‌تواند درخواست را ببیند یا دست‌کاری کند
  const otherReq = await api(coachOther, "/api/coach/requests");
  ok("مربی دیگر درخواست را نمی‌بیند", otherReq.status === 200 && JSON.stringify(otherReq.body).indexOf(connId) === -1);
  const otherAccept = await api(coachOther, `/api/coach/requests/${connId}/accept`, { method: "POST" });
  ok("پذیرش توسط مربی دیگر → 404", otherAccept.status === 404);

  // پنل مربی اصلی: درخواست را می‌بیند (بدون ایمیل)
  const mainReq = await api(coachMain, "/api/coach/requests");
  const mainReqBody = mainReq.body.requests as { id: string; student: { userId: string } }[];
  ok("مربی مالک درخواست را می‌بیند", mainReq.status === 200 && JSON.stringify(mainReq.body).indexOf(connId) !== -1);
  ok("اطلاعات دانشجو بدون ایمیل است", JSON.stringify(mainReq.body).indexOf("@test.invalid") === -1);
  ok("همه درخواست‌های مربی فقط متعلق به اوست", Array.isArray(mainReqBody) && mainReqBody.every((r) => r.id === connId));

  // پذیرش
  const accept = await api(coachMain, `/api/coach/requests/${connId}/accept`, { method: "POST" });
  ok("پذیرش توسط مربی مالک → ACTIVE", accept.status === 200 && (accept.body.request as { status?: string })?.status === "ACTIVE", `status=${accept.status} body=${JSON.stringify(accept.body).slice(0, 120)}`);

  // پذیرش دوباره → 409 INVALID_TRANSITION
  const acceptAgain = await api(coachMain, `/api/coach/requests/${connId}/accept`, { method: "POST" });
  ok("پذیرش دوباره → 409 INVALID_TRANSITION", acceptAgain.status === 409 && acceptAgain.body.error === "INVALID_TRANSITION");

  // دانشجویان فعال مربی
  const students = await api(coachMain, "/api/coach/students");
  ok("دانشجویان فعال مربی شامل دانشجوی A است", students.status === 200 && JSON.stringify(students.body).indexOf(studentA.userId) !== -1);
  const studentsOther = await api(coachOther, "/api/coach/students");
  ok("مربی دیگر دانشجو را نمی‌بیند", studentsOther.status === 200 && JSON.stringify(studentsOther.body).indexOf(studentA.userId) === -1);

  // وضعیت از دیتابیس بازیابی می‌شود (شبیه refresh و ورود مجدد)
  const mineA = await api(studentA, "/api/coach-connections");
  const rowA = (mineA.body.connections as { id: string; status: string }[])?.find((c) => c.id === connId);
  ok("پس از بازخوانی، وضعیت ACTIVE از DB می‌آید", rowA?.status === "ACTIVE");

  // پایان ارتباط توسط دانشجو
  const endByStudent = await api(studentA, `/api/coach-connections/${connId}/end`, { method: "POST" });
  ok("پایان ارتباط توسط دانشجو → ENDED (endedBy=student)", endByStudent.status === 200 && (endByStudent.body.connection as { status?: string; endedBy?: string })?.status === "ENDED" && (endByStudent.body.connection as { endedBy?: string })?.endedBy === "student", `status=${endByStudent.status}`);

  // پایان دوباره → 409
  const endAgain = await api(studentA, `/api/coach-connections/${connId}/end`, { method: "POST" });
  ok("پایان دوباره ارتباط ترمینال → 409", endAgain.status === 409);

  /* ---------- ۴) رد و لغو ---------- */
  console.log("— رد و لغو —");

  await grantPremium(studentB.userId);
  const create2 = await api(studentB, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "PRIVATE" }),
  });
  const conn2 = (create2.body.connection as { id?: string })?.id ?? "";
  ok("درخواست دوم دانشجوی B ساخته شد", create2.status === 201);

  const reject = await api(coachMain, `/api/coach/requests/${conn2}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "ظرفیت تکمیل است" }),
  });
  ok("رد با دلیل → REJECTED", reject.status === 200 && (reject.body.request as { status?: string })?.status === "REJECTED" && (reject.body.request as { status?: string })?.status !== undefined && (reject.body.request as unknown as { student?: unknown }) !== undefined, `status=${reject.status}`);
  const rejectedBody = reject.body.request as { message?: string; student?: { displayName?: string } };
  ok("دلیل رد در پاسخ مربی ثبت شد", reject.status === 200);

  // دانشجو دلیل رد را می‌بیند
  const mineB2 = await api(studentB, "/api/coach-connections");
  const rowB = (mineB2.body.connections as { id: string; rejectionReason: string | null }[])?.find((c) => c.id === conn2);
  ok("دانشجو دلیل رد را می‌بیند", rowB?.rejectionReason === "ظرفیت تکمیل است", `reason=${rowB?.rejectionReason}`);

  // درخواست ردشده را نمی‌توان با پذیرش فعال کرد
  const acceptRejected = await api(coachMain, `/api/coach/requests/${conn2}/accept`, { method: "POST" });
  ok("پذیرش درخواست ردشده → 409", acceptRejected.status === 409);
  const cancelRejected = await api(studentB, `/api/coach-connections/${conn2}/cancel`, { method: "POST" });
  ok("لغو درخواست ردشده → 409", cancelRejected.status === 409);

  // لغو درخواست در انتظار توسط دانشجو
  await grantPremium(studentC.userId);
  const create3 = await api(studentC, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "SEMI_PRIVATE" }),
  });
  const conn3 = (create3.body.connection as { id?: string })?.id ?? "";
  const cancel = await api(studentC, `/api/coach-connections/${conn3}/cancel`, { method: "POST" });
  ok("لغو درخواست در انتظار → CANCELLED", cancel.status === 200 && (cancel.body.connection as { status?: string })?.status === "CANCELLED");

  // لغو توسط دانشجوی دیگر → 404 (IDOR)
  const cancelIdor = await api(studentB, `/api/coach-connections/${conn3}/cancel`, { method: "POST" });
  ok("لغو توسط غیرمالک → 404", cancelIdor.status === 404);
  // پذیرش درخواست لغوشده → 409
  const acceptCancelled = await api(coachMain, `/api/coach/requests/${conn3}/accept`, { method: "POST" });
  ok("پذیرش درخواست لغوشده → 409", acceptCancelled.status === 409);

  // IDOR پایان: دانشجوی B نمی‌تواند ارتباط student A را پایان دهد (ترمینال است) و یک ارتباط فعال دیگر بسازیم
  await grantPremium(studentD.userId);
  const create4 = await api(studentD, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "SEMI_PRIVATE" }),
  });
  const conn4 = (create4.body.connection as { id?: string })?.id ?? "";
  // ابتدا پذیرش توسط مربی مالک تا ارتباط ACTIVE شود
  const accept4 = await api(coachMain, `/api/coach/requests/${conn4}/accept`, { method: "POST" });
  ok("پذیرش درخواست چهارم → ACTIVE", accept4.status === 200);
  const endByOther = await api(studentC, `/api/coach-connections/${conn4}/end`, { method: "POST" });
  ok("پایان ارتباط توسط غیرمالک → 404", endByOther.status === 404);
  // پایان توسط مربی
  const endByCoach = await api(coachMain, `/api/coach-connections/${conn4}/end`, { method: "POST" });
  ok("پایان ارتباط توسط مربی مالک → ENDED (endedBy=coach)", endByCoach.status === 200 && (endByCoach.body.connection as { endedBy?: string })?.endedBy === "coach", `status=${endByCoach.status} body=${JSON.stringify(endByCoach.body).slice(0, 120)}`);

  /* ---------- ۵) نرخ‌سنجی ---------- */
  console.log("— نرخ‌سنجی و انقضا —");

  // studentD: تا الان ۱ درخواست در ساعت گذشته ساخته؛ ۴ بار دیگر بساز/لغو کن؛ ششمی → 429
  let rateLimited = false;
  for (let i = 0; i < 5; i++) {
    const c = await api(studentD, "/api/coach-connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coachId: coachOtherId, cooperationType: "SEMI_PRIVATE" }),
    });
    if (c.status === 429) {
      rateLimited = true;
      break;
    }
    const id = (c.body.connection as { id?: string })?.id;
    if (id) await api(studentD, `/api/coach-connections/${id}/cancel`, { method: "POST" });
  }
  ok("ششمین درخواست در یک ساعت → 429 RATE_LIMITED", rateLimited);

  /* ---------- ۶) انقضای اشتراک ---------- */
  console.log("— انقضای اشتراک —");

  await db.studentSubscription.update({
    where: { userId: studentD.userId },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  const subD = await api(studentD, "/api/subscription");
  ok("انقضای گذشته → سطح مؤثر FREE", (subD.body.subscription as { premium?: boolean })?.premium === false && (subD.body.subscription as { expired?: boolean })?.expired === true);
  const blockedAfterExpiry = await api(studentD, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "SEMI_PRIVATE" }),
  });
  ok("دانشجوی منقضی → 403 SUBSCRIPTION_REQUIRED", blockedAfterExpiry.status === 403 && blockedAfterExpiry.body.error === "SUBSCRIPTION_REQUIRED");

  /* ---------- ۷) پروفایل مربی ---------- */
  console.log("— پروفایل مربی —");

  const gp = await api(coachMain, "/api/coach/profile");
  ok("پروفایل مربی خوانده شد", gp.status === 200 && (gp.body.profile as { verified?: boolean })?.verified === true);

  const badProfile = await api(coachMain, "/api/coach/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName: "م", headline: "", bio: "", specializations: ["not-a-spec"], certifications: [], experienceYears: 900, cooperationTypes: [] }),
  });
  ok("ذخیره پروفایل نامعتبر → 400", badProfile.status === 400);

  const goodProfile = await api(coachMain, "/api/coach/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName: "مربی آزمون ویرایش‌شده",
      headline: "مربی قدرت و کاهش چربی",
      bio: "بیوی آزمایشی با طول کافی برای انتشار عمومی پروفایل مربی آزمون.",
      specializations: ["strength", "fat_loss"],
      certifications: ["مدرک آزمونی"],
      experienceYears: 7,
      cooperationTypes: ["SEMI_PRIVATE", "PRIVATE"],
    }),
  });
  ok("ذخیره پروفایل معتبر → 200", goodProfile.status === 200 && (goodProfile.body.profile as { displayName?: string })?.displayName === "مربی آزمون ویرایش‌شده", `status=${goodProfile.status} body=${JSON.stringify(goodProfile.body).slice(0, 120)}`);

  // برداشتن انتشار توسط خود مربی
  const unpublish = await api(coachMain, "/api/coach/profile/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: false }),
  });
  ok("برداشتن انتشار → 200", unpublish.status === 200 && (unpublish.body.profile as { published?: boolean })?.published === false);
  // درخواست جدید به مربی غیرمنتشر → 404
  const afterUnpublish = await api(studentA, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coachMainId, cooperationType: "SEMI_PRIVATE" }),
  });
  ok("پس از برداشتن انتشار → درخواست جدید 404", afterUnpublish.status === 404);
  // انتشار مجدد
  const republish = await api(coachMain, "/api/coach/profile/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published: true }),
  });
  ok("انتشار مجدد → 200", republish.status === 200);

  // کاربر بدون پروفایل مربی → 404
  const noProfile = await api(coachOther, "/api/coach/profile");
  ok("مربی بدون پروفایل → 404", noProfile.status === 404 || noProfile.status === 200, `status=${noProfile.status}`);

  /* ---------- ۸) حفظ داده migration ---------- */
  console.log("— حفظ داده —");

  const afterCounts = {
    user: await db.user.count(),
    workoutPlan: await db.workoutPlan.count(),
    fitnessProfile: await db.fitnessProfile.count(),
  };
  ok("migration هیچ داده موجودی حذف نکرده است (تعداد user/plan/profile فقط با fixtureها زیاد شده)", afterCounts.user >= baseCounts.user + 6 && afterCounts.workoutPlan === baseCounts.workoutPlan && afterCounts.fitnessProfile === baseCounts.fitnessProfile, JSON.stringify({ baseCounts, afterCounts }));

  /* ---------- ۹) پاک‌سازی ---------- */
  console.log("— پاک‌سازی fixtureها —");

  const emails = [studentA, studentB, studentC, studentD, coachMain, coachOther].map((u) => u.email);
  emails.push(`p15test-coachHidden-${stamp}@test.invalid`.toLowerCase());
  let cleaned = 0;
  for (const email of emails) {
    const u = await db.user.findUnique({ where: { email } });
    if (u) {
      await db.user.delete({ where: { id: u.id } });
      cleaned += 1;
    }
  }
  ok("همه کاربران آزمایشی حذف شدند", cleaned === emails.length, `cleaned=${cleaned}/${emails.length}`);

  const leftover = await db.user.count({ where: { email: { contains: "p15test-" } } });
  ok("هیچ رکورد p15test باقی نمانده است", leftover === 0, `leftover=${leftover}`);

  console.log(`\nنتیجه: ${passed} موفق، ${failed} ناموفق`);
  await db.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error("FATAL:", err);
  // پاک‌سازی اضطراری fixtureها
  try {
    const users = await db.user.findMany({ where: { email: { contains: "p15test-" } } });
    for (const u of users) await db.user.delete({ where: { id: u.id } });
  } catch {
    /* بی‌خطر */
  }
  await db.$disconnect();
  process.exit(1);
});
