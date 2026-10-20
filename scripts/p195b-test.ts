/**
 * p195b-test.ts — تست‌های الزامی مرحله ۱۹.۵ب (پیوست درخواست مربی‌گری).
 * اجرا: bun scripts/p195b-test.ts  (سرور dev روی :3000)
 *
 * قواعد ایمنی داده:
 *  - فقط کاربران ایزوله با پیشوند p195btest-* ساخته میشوند
 *  - هیچ کاربر/رکورد واقعی خوانده یا تغییر داده نمیشود
 *  - ادمین تست با تغییر مستقیم DB روی کاربر fixture ساخته میشود
 *  - پاک‌سازی کامل: کاربران fixture (کاسکید) + فایل‌های دیسک پیوست + integrity
 *
 * پوشش:
 *  - مهمان 401 روی مسیرهای پیوست
 *  - بدون درخواست مربی‌گری → 404 NO_APPLICATION
 *  - نقش غیر دانشجو (ادمین) → 403
 *  - بارگذاری سالم PNG/PDF با عنوان → 201 + metadata درست
 *  - عنوان خالی/بلند → 400؛ نوع جعلی (متن به‌جای PNG) → 400؛ نوع خارج whitelist → 400
 *  - حجم بیش از ۵ مگابایت → 413
 *  - دریافت مالک → 200 با Content-Type و محتوای بایت‌به‌بایت درست (sha256)
 *  - IDOR: کاربر دیگر GET/DELETE → 404 یکسان (بدون افشای وجود)
 *  - ادمین میتواند سند را ببیند (200) و در فهرست ادمین metadata می‌بیند
 *  - سقف ۵ سند → سوم... ششم → 409 ATTACHMENT_LIMIT
 *  - حذف توسط مالک در حالت pending → 200 و فایل از دیسک حذف میشود
 *  - رد → ارسال مجدد: اسناد قبلی حفظ میشوند
 *  - پس از تأیید: بارگذاری/حذف مالک → 409 APPLICATION_NOT_EDITABLE
 *  - حذف ادمی پس از تأیید → 200 + AdminActionLog + حذف فایل از دیسک
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();
const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads", "coach-applications");

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

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** PNG حداقلی با امضای واقعی — سرور فقط امضا را بررسی میکند */
function fakePng(size: number): Uint8Array {
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const body = new Uint8Array(Math.max(0, size - sig.length));
  body.fill(0x42);
  const out = new Uint8Array(size);
  out.set(sig, 0);
  out.set(body.subarray(0, size - sig.length), sig.length);
  return out;
}

function fakePdf(): Uint8Array {
  const head = new TextEncoder().encode("%PDF-1.4\n%test-fixture\n");
  const body = new Uint8Array(512);
  body.fill(0x44);
  const out = new Uint8Array(head.length + body.length);
  out.set(head, 0);
  out.set(body, head.length);
  return out;
}

const stamp = Date.now();
const PASSWORD = "p195btest-pass1";

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string, attempt = 0): Promise<User> {
  const email = `p195btest-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P195B ${name}` }),
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

async function jsonApi(
  user: User | null,
  method: "GET" | "POST" | "DELETE",
  path_: string,
  body?: unknown
): Promise<{ status: number; json: Record<string, unknown> }> {
  const res = await fetch(`${BASE}${path_}`, {
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

async function upload(
  user: User,
  title: string,
  bytes: Uint8Array,
  fileName: string,
  mime: string
): Promise<{ status: number; json: Record<string, unknown> }> {
  const form = new FormData();
  form.set("title", title);
  form.set("file", new File([bytes], fileName, { type: mime }));
  const res = await fetch(`${BASE}/api/coach/apply/attachments`, {
    method: "POST",
    headers: { Cookie: user.cookie },
    body: form,
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    // بدون بدنه
  }
  return { status: res.status, json };
}

async function download(
  user: User | null,
  attachmentId: string
): Promise<{ status: number; bytes: Uint8Array; contentType: string }> {
  const res = await fetch(`${BASE}/api/coach/apply/attachments/${encodeURIComponent(attachmentId)}`, {
    method: "GET",
    headers: user ? { Cookie: user.cookie } : {},
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  return { status: res.status, bytes: buf, contentType: res.headers.get("content-type") ?? "" };
}

async function integrity(): Promise<{ ic: string; fk: number }> {
  const ic = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  const fk = await db.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check");
  return { ic: ic[0]?.integrity_check ?? "?", fk: fk.length };
}

async function main() {
  console.log("\n=== مرحله ۱۹.۵ب — تست پیوست درخواست مربی‌گری ===\n");

  const pre = await integrity();
  ok("integrity_check پیش از تست: ok", pre.ic === "ok");
  ok("foreign_key_check پیش از تست: 0", pre.fk === 0);

  /* ---------------------------- مهمان 401 ---------------------------- */
  {
    console.log("\n— مهمان (بدون نشست) —");
    const form = new FormData();
    form.set("title", "x");
    form.set("file", new File([fakePng(64)], "a.png", { type: "image/png" }));
    const up = await fetch(`${BASE}/api/coach/apply/attachments`, { method: "POST", body: form });
    ok("POST پیوست مهمان → 401", up.status === 401, `got ${up.status}`);
    const get = await jsonApi(null, "GET", "/api/coach/apply/attachments/clx-fake-id");
    ok("GET پیوست مهمان → 401", get.status === 401, `got ${get.status}`);
    const del = await jsonApi(null, "DELETE", "/api/coach/apply/attachments/clx-fake-id");
    ok("DELETE پیوست مهمان → 401", del.status === 401, `got ${del.status}`);
  }

  /* ---------------------------- fixture‌ها ---------------------------- */
  const student = await createUser("student");
  const student2 = await createUser("other");
  const admin = await createUser("admin");
  await db.user.update({ where: { id: admin.userId }, data: { role: "ADMIN" } });
  console.log(`\n— fixtureها: ${student.email} / ${student2.email} / ${admin.email} —`);

  /* ---------------------------- بدون درخواست ---------------------------- */
  {
    console.log("\n— بارگذاری بدون درخواست مربی‌گری —");
    const up = await upload(student, "مدرک", fakePng(128), "cert.png", "image/png");
    ok("بدون درخواست → 404 NO_APPLICATION", up.status === 404 && up.json.error === "NO_APPLICATION", `got ${up.status} ${JSON.stringify(up.json)}`);
  }

  /* ---------------------------- ثبت درخواست ---------------------------- */
  {
    console.log("\n— ثبت درخواست و بارگذاری سالم —");
    const apply = await jsonApi(student, "POST", "/api/coach/apply", {
      message: "متقاضی تست پیوست",
      experienceYears: 3,
      certifications: ["مدرک الف"],
    });
    ok("ثبت درخواست → 201", apply.status === 201, `got ${apply.status}`);

    const roleGate = await upload(admin, "مدرک ادمین", fakePng(64), "a.png", "image/png");
    ok("بارگذاری توسط ادمین (غیر دانشجو) → 403", roleGate.status === 403, `got ${roleGate.status}`);

    const png = fakePng(2048);
    const up = await upload(student, "مدرک مربی‌گری سطح ۲", png, "cert level2.png", "image/png");
    const att = up.json.attachment as Record<string, unknown> | undefined;
    ok("بارگذاری PNG با عنوان → 201", up.status === 201, `got ${up.status} ${JSON.stringify(up.json)}`);
    ok("metadata: title درست", att?.title === "مدرک مربی‌گری سطح ۲");
    ok("metadata: mimeType درست", att?.mimeType === "image/png");
    ok("metadata: sizeBytes درست", att?.sizeBytes === 2048);
    ok("metadata: مسیر دیسک افشا نشده", att != null && !("storagePath" in att));

    // دریافت مالک — بایت‌به‌بایت
    const dl = await download(student, String(att?.id));
    ok("دریافت مالک → 200", dl.status === 200, `got ${dl.status}`);
    ok("Content-Type درست", dl.contentType.startsWith("image/png"));
    ok("محتوا بایت‌به‌بایت درست (sha256)", sha256(dl.bytes) === sha256(png));

    // ادمین می‌بیند
    const dlAdmin = await download(admin, String(att?.id));
    ok("دریافت توسط ادمین → 200", dlAdmin.status === 200 && sha256(dlAdmin.bytes) === sha256(png));

    // IDOR
    const dlOther = await download(student2, String(att?.id));
    ok("دریافت توسط کاربر دیگر → 404 (بدون افشا)", dlOther.status === 404);
    const delOther = await jsonApi(student2, "DELETE", `/api/coach/apply/attachments/${String(att?.id)}`);
    ok("حذف توسط کاربر دیگر → 404", delOther.status === 404);
  }

  /* ---------------------------- اعتبارسنجی ورودی ---------------------------- */
  {
    console.log("\n— اعتبارسنجی عنوان/نوع/حجم —");
    const emptyTitle = await upload(student, "   ", fakePng(64), "a.png", "image/png");
    ok("عنوان خالی → 400", emptyTitle.status === 400, `got ${emptyTitle.status}`);
    const longTitle = await upload(student, "ط".repeat(81), fakePng(64), "a.png", "image/png");
    ok("عنوان ۸۱ کاراکتر → 400", longTitle.status === 400, `got ${longTitle.status}`);

    const fakeType = await upload(student, "جعلی", new TextEncoder().encode("hello world this is text"), "fake.png", "image/png");
    ok("متن با ادعای PNG → 400 FILE_TYPE_NOT_ALLOWED", fakeType.status === 400 && fakeType.json.error === "FILE_TYPE_NOT_ALLOWED", `got ${fakeType.status} ${JSON.stringify(fakeType.json)}`);

    const txtType = await upload(student, "متن", new TextEncoder().encode("plain text"), "note.txt", "text/plain");
    ok("text/plain خارج whitelist → 400", txtType.status === 400 && txtType.json.error === "FILE_TYPE_NOT_ALLOWED", `got ${txtType.status}`);

    const exeClaim = await upload(student, "اجرایی", fakePng(64), "evil.png", "application/x-msdownload");
    ok("نوع اعلامی غیرمجاز → 400", exeClaim.status === 400, `got ${exeClaim.status}`);

    const big = fakePng(5 * 1024 * 1024 + 1);
    const tooBig = await upload(student, "سنگین", big, "big.png", "image/png");
    ok("بیش از ۵ مگابایت → 413 FILE_TOO_LARGE", tooBig.status === 413 && tooBig.json.error === "FILE_TOO_LARGE", `got ${tooBig.status} ${JSON.stringify(tooBig.json)}`);

    const pdf = fakePdf();
    const pdfUp = await upload(student, "رضایت‌نامه کاری", pdf, "letter.pdf", "application/pdf");
    ok("بارگذاری PDF با عنوان → 201", pdfUp.status === 201, `got ${pdfUp.status} ${JSON.stringify(pdfUp.json)}`);
    const pdfDl = await download(student, String((pdfUp.json.attachment as Record<string, unknown>)?.id));
    ok("دریافت PDF بایت‌به‌بایت", pdfDl.status === 200 && sha256(pdfDl.bytes) === sha256(pdf));
  }

  /* ---------------------------- مالک حذف میکند ---------------------------- */
  {
    console.log("\n— حذف توسط مالک در حالت pending —");
    const app = await db.coachApplication.findUnique({
      where: { userId: student.userId },
      include: { attachments: true },
    });
    const before = app?.attachments.length ?? 0;
    const target = app?.attachments[0];
    ok("درخواست با اسناد موجود", Boolean(app) && before > 0);
    if (target) {
      const del = await jsonApi(student, "DELETE", `/api/coach/apply/attachments/${target.id}`);
      ok("حذف مالک → 200", del.status === 200 && del.json.deleted === true, `got ${del.status}`);
      const gone = !existsSync(path.join(UPLOAD_ROOT, target.storagePath));
      ok("فایل از دیسک حذف شد", gone);
      const again = await download(student, target.id);
      ok("دریافت پس از حذف → 404", again.status === 404);
    }
  }

  /* ---------------------------- سقف ۵ سند ---------------------------- */
  {
    console.log("\n— سقف تعداد پیوست —");
    const app = await db.coachApplication.findUnique({
      where: { userId: student.userId },
      include: { attachments: true },
    });
    const current = app?.attachments.length ?? 0;
    for (let i = current; i < 5; i += 1) {
      const up = await upload(student, `سند شماره ${i + 1}`, fakePng(128 + i), `doc-${i}.png`, "image/png");
      if (up.status !== 201) {
        ok(`بارگذاری سند ${i + 1} → 201`, false, `got ${up.status}`);
      }
    }
    ok("۵ سند بارگذاری شد", (await db.coachApplicationAttachment.count({ where: { applicationId: app!.id } })) === 5);
    const sixth = await upload(student, "ششم", fakePng(64), "six.png", "image/png");
    ok("ششمین سند → 409 ATTACHMENT_LIMIT", sixth.status === 409 && sixth.json.error === "ATTACHMENT_LIMIT", `got ${sixth.status} ${JSON.stringify(sixth.json)}`);
  }

  /* ---------------------------- فهرست ادمین ---------------------------- */
  let applicationId = "";
  {
    console.log("\n— فهرست ادمین با metadata اسناد —");
    const apps = await jsonApi(admin, "GET", "/api/admin/coach-applications?status=pending");
    const rows = (apps.json.applications as Record<string, unknown>[]) ?? [];
    const mine = rows.find((r) => r.userEmail === student.email);
    ok("ادمین درخواست را می‌بیند", Boolean(mine));
    const atts = (mine?.attachments as Record<string, unknown>[]) ?? [];
    applicationId = String(mine?.id ?? "");
    ok("فهرست شامل ۵ سند با عنوان", atts.length === 5 && atts.every((a) => typeof a.title === "string" && typeof a.id === "string"));
    ok("فهرست مسیر دیسک را افشا نمیکند", atts.every((a) => !("storagePath" in a)));
  }

  /* ---------------------------- رد و ارسال مجدد ---------------------------- */
  {
    console.log("\n— رد، ارسال مجدد و حفظ اسناد —");
    const reject = await jsonApi(admin, "POST", `/api/admin/coach-applications/${applicationId}/decide`, {
      decision: "rejected",
      note: "سند سطح ۲ ناقص است",
    });
    ok("رد درخواست → 200", reject.status === 200, `got ${reject.status}`);

    // پس از رد: مالک هنوز میتواند سند اضافه/حذف کند
    const afterReject = await upload(student, "سند تکمیلی پس از رد", fakePng(96), "extra.png", "image/png");
    ok("بارگذاری پس از رد (درخواست rejected) → 409 سقف پر", afterReject.status === 409, `got ${afterReject.status}`);

    const app = await db.coachApplication.findUnique({ where: { userId: student.userId } });
    const count = await db.coachApplicationAttachment.count({ where: { applicationId: app!.id } });
    // حذف یکی برای باز شدن ظرفیت
    const first = await db.coachApplicationAttachment.findFirst({ where: { applicationId: app!.id }, orderBy: { createdAt: "asc" as const } });
    const del = await jsonApi(student, "DELETE", `/api/coach/apply/attachments/${first!.id}`);
    ok("حذف مالک در حالت rejected → 200", del.status === 200, `got ${del.status}`);

    const resubmit = await jsonApi(student, "POST", "/api/coach/apply", {
      message: "ارسال مجدد با سند تکمیلی",
      experienceYears: 4,
    });
    ok("ارسال مجدد پس از رد → 200/201", resubmit.status === 200 || resubmit.status === 201, `got ${resubmit.status}`);
    const afterCount = await db.coachApplicationAttachment.count({ where: { applicationId: app!.id } });
    ok("اسناد قبلی پس از ارسال مجدد حفظ شدند", afterCount === count - 1, `before=${count} after=${afterCount}`);

    const upAgain = await upload(student, "سند پس از ارسال مجدد", fakePng(80), "new.png", "image/png");
    ok("بارگذاری پس از ارسال مجدد → 201", upAgain.status === 201, `got ${upAgain.status}`);
  }

  /* ---------------------------- تأیید و قفل ---------------------------- */
  {
    console.log("\n— تأیید، قفل مدارک و حذف ادمین —");
    const approve = await jsonApi(admin, "POST", `/api/admin/coach-applications/${applicationId}/decide`, {
      decision: "approved",
      publish: false,
    });
    ok("تأیید درخواست → 200", approve.status === 200, `got ${approve.status}`);

    const app = await db.coachApplication.findUnique({ where: { userId: student.userId } });
    const remain = await db.coachApplicationAttachment.findMany({ where: { applicationId: app!.id } });
    ok("اسناد پس از تأیید حفظ شدند (تاریخچه)", remain.length > 0);

    const up = await upload(student, "پس از تأیید", fakePng(64), "late.png", "image/png");
    // متقاضی اکنون COACH است — دروازه نقش (403) پیش از قفل درخواست پاسخ میدهد
    ok("بارگذاری پس از تأیید → 403 ROLE_NOT_ALLOWED (نقش مربی)", up.status === 403 && up.json.error === "ROLE_NOT_ALLOWED", `got ${up.status} ${JSON.stringify(up.json)}`);

    const delOwner = await jsonApi(student, "DELETE", `/api/coach/apply/attachments/${remain[0].id}`);
    ok("حذف مالک پس از تأیید → 409", delOwner.status === 409, `got ${delOwner.status}`);

    const target = remain.find((r) => existsSync(path.join(UPLOAD_ROOT, r.storagePath))) ?? remain[0];
    const delAdmin = await jsonApi(admin, "DELETE", `/api/coach/apply/attachments/${target.id}`);
    ok("حذف ادمین پس از تأیید → 200", delAdmin.status === 200, `got ${delAdmin.status}`);
    ok("فایل سند حذف‌شده از دیسک پاک شد", !existsSync(path.join(UPLOAD_ROOT, target.storagePath)));

    const log = await db.adminActionLog.findFirst({
      where: { adminId: admin.userId, action: "delete-coach-application-attachment", targetId: target.id },
    });
    ok("AdminActionLog حذف سند ثبت شد", Boolean(log));

    const role = await db.user.findUnique({ where: { id: student.userId }, select: { role: true } });
    ok("نقش متقاضی COACH شد", role?.role === "COACH");
  }

  /* ---------------------------- پاک‌سازی ---------------------------- */
  {
    console.log("\n— پاک‌سازی fixture‌ها و فایل‌های دیسک —");
    if (applicationId) {
      await rm(path.join(UPLOAD_ROOT, applicationId), { recursive: true, force: true });
    }
    for (const u of [student, student2, admin]) {
      await db.user.delete({ where: { id: u.userId } });
    }
    const left = await db.user.count({ where: { email: { contains: "p195btest-" } } });
    ok("هیچ کاربر fixture باقی نماند", left === 0);
    ok("پوشه پیوست fixture از دیسک حذف شد", !existsSync(path.join(UPLOAD_ROOT, applicationId)));

    const post = await integrity();
    ok("integrity_check پس از پاک‌سازی: ok", post.ic === "ok");
    ok("foreign_key_check پس از پاک‌سازی: 0", post.fk === 0);

    const realUsers = await db.user.count();
    ok("کاربران واقعی دست‌نخورده (۵)", realUsers === 5, `got ${realUsers}`);
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    ok("ادمین واقعی (mahziar) حفظ شده — ۱ ادمین", admins === 1, `got ${admins}`);
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
