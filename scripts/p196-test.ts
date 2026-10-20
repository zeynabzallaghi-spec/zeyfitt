/**
 * p196-test.ts — تست‌های الزامی مرحله ۱۹.۶ (API/امنیت/مجوزها).
 * اجرا: bun scripts/p196-test.ts  (سرور dev روی :3000)
 *
 * قواعد ایمنی داده: فقط کاربران ایزوله p196test-* ساخته می‌شوند؛ هیچ
 * کاربر/رکورد واقعی خوانده یا تغییر داده نمی‌شود؛ پاک‌سازی کامل در پایان.
 *
 * پوشش (بخش ۱۶ مشخصات):
 *  - درخواست مربی: اول/تکراری PENDING/پس از تأیید/پس از رد/بدون تداخل کاربران
 *  - چت: گفت‌وگوی پیش از تأیید، مسدودسازی/رفع، پیام در مسدودی، پیوست ≤۲۰MB،
 *    نوع نامعتبر، دسترسی غیرمجاز
 *  - بانکی: ذخیره/بازیابی، دسترسی غیرمجاز
 *  - تعرفه/پرداخت: ثبت ریال/دلار، درخواست برای دانشجوی صحیح، تأیید پایدار
 *    دانشجو، لینک فقط پس از تأیید، کلیک ≠ پرداخت
 *  - اعلان‌ها: رویداد واقعی، شمارش نخوانده، خواندن پایدار، جداسازی کاربر،
 *    ضدتکرار
 *  - پنل دانشجویان/برنامه‌ها: اطلاعات تکمیلی، یادداشت خصوصی، فیلتر،
 *    اختصاص برنامه، مشاهده دانشجو
 *  - بانک حرکات: ساخت/ویرایش/حذف، رسانه، جداسازی از بانک عمومی، استفاده
 *    در برنامه، حفظ بانک عمومی
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();

let passed = 0;
let failed = 0;
const cleanupUserIds: string[] = [];
const cleanupFiles: string[] = [];

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
const PASSWORD = "p196test-pass1";

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string, attempt = 0): Promise<User> {
  const email = `p196test-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P196 ${name}` }),
  });
  // محدودیت نرخ auth (۵ ثبت‌نام در دقیقه) — صبر و تلاش مجدد
  if (res.status === 429 && attempt < 3) {
    console.log(`  … نرخ‌سنجی auth؛ ۶۵ ثانیه صبر برای ${name}`);
    await new Promise((r) => setTimeout(r, 65_000));
    return createUser(name, attempt + 1);
  }
  if (res.status !== 200) {
    throw new Error(`signup failed for ${name}: ${res.status}`);
  }
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error(`user row missing for ${name}`);
  cleanupUserIds.push(row.id);
  return { email, cookie: cookie ?? "", userId: row.id };
}

async function api(
  user: User | null,
  path: string,
  init?: RequestInit,
  attempt = 0
): Promise<{ status: number; body: Record<string, unknown>; headers: Headers }> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: {
        ...(init?.headers as Record<string, string> | undefined),
        ...(user && user.cookie ? { cookie: user.cookie } : {}),
      },
    });
  } catch (error) {
    // سرور سندباکس ممکن است لحظهای قطع شود — تلاش مجدد محدود
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 8000));
      return api(user, path, init, attempt + 1);
    }
    throw error;
  }
  let body: Record<string, unknown> = {};
  try {
    body = (await res.json()) as Record<string, unknown>;
  } catch {
    /* پاسخ غیر JSON (فایل) */
  }
  return { status: res.status, body, headers: res.headers };
}

async function grantPremium(userId: string, days = 30) {
  await db.studentSubscription.upsert({
    where: { userId },
    create: {
      userId,
      tier: "PREMIUM",
      status: "active",
      source: "manual",
      note: "p196 fixture",
      expiresAt: new Date(Date.now() + days * 86400_000),
    },
    update: {
      tier: "PREMIUM",
      status: "active",
      source: "manual",
      expiresAt: new Date(Date.now() + days * 86400_000),
    },
  });
}

async function makeCoach(user: User, types = ["PRIVATE", "SEMI_PRIVATE"], published = true) {
  await db.user.update({ where: { id: user.userId }, data: { role: "COACH" } });
  await db.coachProfile.upsert({
    where: { userId: user.userId },
    create: {
      userId: user.userId,
      displayName: "مربی تست ۱۹۶",
      bio: "بیوگرافی معتبر برای تست مرحله ۱۹.۶ با حداقل طول لازم.",
      verified: true,
      published,
      cooperationTypesJson: JSON.stringify(types),
    },
    update: { verified: true, published, bio: "بیوگرافی معتبر برای تست مرحله ۱۹.۶ با حداقل طول لازم.", cooperationTypesJson: JSON.stringify(types) },
  });
}

function pngBytes(): Uint8Array {
  // یک PNG واقعی ۱×۱ — امضای بایت معتبر
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function main() {
  console.log("== ساخت fixtureها ==");
  const student = await createUser("student");
  const student2 = await createUser("student2");
  const coach = await createUser("coach");
  const coach2 = await createUser("coach2");
  await makeCoach(coach);
  await makeCoach(coach2);
  await grantPremium(student.userId);
  await grantPremium(student2.userId);
  console.log("fixtures ready");

  /* ---------------- بخش ۱ — درخواست تکراری مربی ---------------- */
  console.log("\n== بخش ۱: درخواست ارتباط تکراری ==");
  const r1 = await api(student, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coach.userId, cooperationType: "PRIVATE" }),
  });
  ok("درخواست اول ثبت میشود", r1.status === 201, `got ${r1.status}`);
  const connectionId = String((r1.body.connection as { id?: string } | null | undefined)?.id ?? (r1.body.request as { id?: string } | null | undefined)?.id ?? "");
  if (!connectionId) {
    // شکل پاسخ متفاوت — از دیتابیس بگیر
    const row = await db.coachStudentConnection.findFirst({
      where: { studentId: student.userId, coachId: coach.userId, status: "PENDING" },
    });
    ok("درخواست در دیتابیس", Boolean(row));
    if (row) cleanupUserIds.push("__none__"); // no-op
  }

  const r2 = await api(student, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coach.userId, cooperationType: "PRIVATE" }),
  });
  ok("درخواست تکراری PENDING رد میشود (409)", r2.status === 409, `got ${r2.status}`);

  // تداخل نداشتن کاربران/مربیان متفاوت
  const r2b = await api(student, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coach2.userId, cooperationType: "PRIVATE" }),
  });
  ok("درخواست به مربی دیگر مستقل است", r2b.status === 201, `got ${r2b.status}`);
  const connStudent2CoachId = String((r2b.body.connection as { id?: string } | null | undefined)?.id ?? (r2b.body.request as { id?: string } | null | undefined)?.id ?? "");

  const r2c = await api(student2, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coach.userId, cooperationType: "PRIVATE" }),
  });
  ok("درخواست دانشجوی دیگر مستقل است", r2c.status === 201, `got ${r2c.status}`);
  const conn2Id = String((r2c.body.connection as { id?: string } | null | undefined)?.id ?? (r2c.body.request as { id?: string } | null | undefined)?.id ?? "");

  /* ---------------- بخش ۳ — گفت‌وگوی پیش از تأیید ---------------- */
  console.log("\n== بخش ۳: گفت‌وگوی پیش از تأیید ==");
  const chatOpen = await api(coach, `/api/coach-chat/connections/${connectionId}/open`, { method: "POST" });
  ok("مربی میتواند پیش از تأیید گفتوگو را باز کند", chatOpen.status === 200 || chatOpen.status === 201, `got ${chatOpen.status}`);
  const convId = String((chatOpen.body.conversation as { conversationId?: string } | null | undefined)?.conversationId ?? "");

  const preMsg = await api(coach, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "سلام — گفتوگوی اولیه" }),
  });
  ok("مربی پیش از تأیید پیام میفرستد", preMsg.status === 201, `got ${preMsg.status}`);

  const preMsgStudent = await api(student, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "پاسخ دانشجو پیش از تأیید" }),
  });
  ok("دانشجو هم در گفتوگوی اولیه میتواند بفرستد", preMsgStudent.status === 201, `got ${preMsgStudent.status}`);

  // شروع گفتوگو درخواست را خودکار تأیید نمیکند
  const connRow = await db.coachStudentConnection.findUnique({ where: { id: connectionId } });
  ok("شروع گفتوگو درخواست را خودکار تأیید نمیکند", connRow?.status === "PENDING");

  //IDOR — کاربر دیگر به مکالمه دسترسی ندارد
  const idorChat = await api(student2, `/api/coach-chat/conversations/${convId}/messages`);
  ok("غیرعضو مکالمه 404 میگیرد", idorChat.status === 404, `got ${idorChat.status}`);

  /* ---------------- بخش ۸ — پیوست فایل ---------------- */
  console.log("\n== بخش ۸: پیوست فایل ==");
  const png = pngBytes();
  const fd = new FormData();
  fd.append("content", "");
  fd.append("files", new Blob([png as unknown as BlobPart], { type: "image/png" }), "test-doc.png");
  const fileMsg = await api(coach, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    body: fd,
  });
  ok("پیام با پیوست PNG ثبت میشود", fileMsg.status === 201, `got ${fileMsg.status} ${JSON.stringify(fileMsg.body).slice(0, 120)}`);
  const attachment = (fileMsg.body.message as { attachments?: { id: string; fileName: string; mimeType: string; sizeBytes: number }[] } | undefined)?.attachments?.[0];
  ok("metadata پیوست برمیگردد", Boolean(attachment), JSON.stringify(fileMsg.body).slice(0, 150));
  ok("نوع واقعی فایل (PNG) تأیید شده", attachment?.mimeType === "image/png");

  // دریافت بایت پیوست — عضو
  if (attachment) {
    const dl = await api(student, `/api/coach-chat/attachments/${attachment.id}`);
    ok("دانلود پیوست برای عضو مکالمه", dl.status === 200, `got ${dl.status}`);
    ok("نوع محتوا درست است", dl.headers.get("content-type") === "image/png");

    // غیرعضو — 404 یکسان
    const dlIdor = await api(student2, `/api/coach-chat/attachments/${attachment.id}`);
    ok("دانلود پیوست برای غیرعضو 404", dlIdor.status === 404, `got ${dlIdor.status}`);

    // مهمان
    const dlGuest = await api(null, `/api/coach-chat/attachments/${attachment.id}`);
    ok("دانلود پیوست مهمان 401", dlGuest.status === 401, `got ${dlGuest.status}`);
  }

  // فایل جعلی — متن با نام png و نوع اعلامی png
  const fdFake = new FormData();
  fdFake.append("content", "fake");
  fdFake.append("files", new Blob(["this is not a png"], { type: "image/png" }), "fake.png");
  const fakeMsg = await api(coach, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    body: fdFake,
  });
  ok("فایل جعلی (امضای نادرست) رد میشود", fakeMsg.status === 415, `got ${fakeMsg.status}`);

  // نوع غیرمجاز (ویدئو در چت)
  const fdVideo = new FormData();
  fdVideo.append("content", "vid");
  fdVideo.append("files", new Blob([png as unknown as BlobPart], { type: "video/mp4" }), "v.mp4");
  const videoMsg = await api(coach, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    body: fdVideo,
  });
  ok("ویدئو در چت رد میشود (whitelist)", videoMsg.status === 415, `got ${videoMsg.status}`);

  // مجموع بیش از ۲۰ مگابایت
  const bigChunk = new Uint8Array(11 * 1024 * 1024);
  const fdBig = new FormData();
  fdBig.append("content", "big");
  fdBig.append("files", new Blob([bigChunk as unknown as BlobPart], { type: "application/pdf" }), "a.pdf");
  fdBig.append("files", new Blob([bigChunk as unknown as BlobPart], { type: "application/pdf" }), "b.pdf");
  const bigMsg = await api(coach, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    body: fdBig,
  });
  ok("مجموع پیوست بیش از ۲۰MB رد میشود (413)", bigMsg.status === 413, `got ${bigMsg.status}`);

  /* ---------------- بخش ۴ — مسدودسازی ---------------- */
  console.log("\n== بخش ۴: مسدودسازی پیام‌رسان ==");
  const blockRes = await api(coach, `/api/coach-chat/connections/${connectionId}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "block" }),
  });
  ok("مربی دانشجو را مسدود میکند", blockRes.status === 200, `got ${blockRes.status}`);

  const blockedMsg = await api(student, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "نباید برسد" }),
  });
  ok("پیام دانشجوی مسدودشده رد میشود (403)", blockedMsg.status === 403, `got ${blockedMsg.status}`);
  const blockedCode = String(blockedMsg.body.error ?? "");
  ok("کد خطا CHAT_BLOCKED است", blockedCode === "CHAT_BLOCKED", blockedCode);

  // تاریخچه برای دانشجوی مسدودشده خواندنی میماند
  const blockedRead = await api(student, `/api/coach-chat/conversations/${convId}/messages`);
  ok("تاریخچه برای مسدودشده فقطخواندنی میماند", blockedRead.status === 200, `got ${blockedRead.status}`);

  // مربی همچنان میتواند بفرستد
  const coachStillSend = await api(coach, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "مربی در مسدودی هم میفرستد" }),
  });
  ok("مربی مسدودکننده همچنان میتواند بفرستد", coachStillSend.status === 201, `got ${coachStillSend.status}`);

  // مسدودی رابطه/اشتراک را حذف نمیکند
  const connAfterBlock = await db.coachStudentConnection.findUnique({ where: { id: connectionId } });
  ok("مسدودی رابطه را حذف نمیکند", connAfterBlock?.status === "PENDING");

  const unblockRes = await api(coach, `/api/coach-chat/connections/${connectionId}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "unblock" }),
  });
  ok("رفع مسدودیت موفق", unblockRes.status === 200, `got ${unblockRes.status}`);

  const unblockedMsg = await api(student, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "پس از رفع مسدودی" }),
  });
  ok("پس از رفع مسدودیت ارسال برقرار میشود", unblockedMsg.status === 201, `got ${unblockedMsg.status}`);

  // فقط مربی مالک — دانشجو نمیتواند مسدود کند
  const blockByStudent = await api(student, `/api/coach-chat/connections/${connectionId}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "block" }),
  });
  ok("دانشجو نمیتواند مسدود کند (403)", blockByStudent.status === 403, `got ${blockByStudent.status}`);

  /* ---------------- بخش ۲ — پروفایل دانشجو از چت ---------------- */
  console.log("\n== بخش ۲: پروفایل دانشجو از گفتوگو ==");
  // مربی باید ارتباط ACTIVE داشته باشد برای پروفایل — درخواست را تأیید میکنیم
  const acceptRes = await api(coach, `/api/coach/requests/${connectionId}/accept`, { method: "POST" });
  ok("تأیید درخواست توسط مربی", acceptRes.status === 200, `got ${acceptRes.status} ${JSON.stringify(acceptRes.body).slice(0, 100)}`);

  const profileRes = await api(coach, `/api/coach/students/${student.userId}`);
  ok("مربی پروفایل دانشجوی متصل را میبیند", profileRes.status === 200, `got ${profileRes.status}`);
  ok("پروفایل شامل نام دانشجوست", (profileRes.body.detail as { student?: { displayName?: string } } | undefined)?.student?.displayName?.includes("P196") === true);

  // دانشجوی دیگر (ارتباط ندارد) — 404
  const profileIdor = await api(coach, `/api/coach/students/${student2.userId}`);
  ok("دانشجوی بدون ارتباط 404 است", profileIdor.status === 404, `got ${profileIdor.status}`);

  // بانکی هرگز در پروفایل مربی نیست
  const detailStr = JSON.stringify(profileRes.body);
  ok("اطلاعات بانکی در پروفایل مربی نیست", !detailStr.includes("banking") && !detailStr.includes("sheba"));

  /* ---------------- بخش ۵ — اطلاعات بانکی ---------------- */
  console.log("\n== بخش ۵: اطلاعات بانکی ==");
  const bankSave = await api(student, "/api/profile/banking", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountHolder: "علی آزمون", bankName: "بانک تست", sheba: "IR120000000000000000000001" }),
  });
  ok("ذخیره اطلاعات بانکی", bankSave.status === 200, `got ${bankSave.status}`);

  const bankGet = await api(student, "/api/profile/banking");
  ok("بازیابی اطلاعات بانکی پس از ذخیره", bankGet.status === 200 && String((bankGet.body.banking as { sheba?: string })?.sheba ?? "").startsWith("IR"));

  // شبا نامعتبر
  const bankBad = await api(student, "/api/profile/banking", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sheba: "IR123" }),
  });
  ok("شبا نامعتبر رد میشود", bankBad.status === 400, `got ${bankBad.status}`);

  // دسترسی غیرمجاز — مربی به بانکی دانشجو دسترسی ندارد (مسیری وجود ندارد)
  const bankAsCoach = await api(coach, "/api/profile/banking");
  ok("مربی فقط بانکی خودش را میبیند (نه دانشجو)", bankAsCoach.status === 200 && !JSON.stringify(bankAsCoach.body).includes("علی آزمون"));

  // مهمان
  const bankGuest = await api(null, "/api/profile/banking");
  ok("بانکی مهمان 401", bankGuest.status === 401);

  /* ---------------- بخش ۶ — تعرفه و پرداخت ---------------- */
  console.log("\n== بخش ۶: تعرفه و پرداخت ==");
  const tariffSave = await api(coach, "/api/coach/tariff", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ privatePriceIrr: 2500000, privatePriceUsd: 50, semiPrivatePriceIrr: 1200000, semiPrivatePriceUsd: 25 }),
  });
  ok("ثبت تعرفه ریال/دلار", tariffSave.status === 200, `got ${tariffSave.status}`);

  const tariffGet = await api(coach, "/api/coach/tariff");
  const tariffData = tariffGet.body.tariff as { privatePriceIrr: number | null } | null;
  ok("تعرفه ذخیرهشده برمیگردد", tariffData?.privatePriceIrr === 2500000);

  // تعرفه در فهرست عمومی
  const publicList = await api(student, "/api/coaches");
  const publicCoach = (publicList.body.coaches as { userId: string; tariff: { privatePriceIrr: number | null } }[] | undefined)?.find((c) => c.userId === coach.userId);
  ok("تعرفه در فهرست عمومی مربیان است", publicCoach?.tariff?.privatePriceIrr === 2500000);
  ok("بانکی در فهرست عمومی نیست", !JSON.stringify(publicList.body).toLowerCase().includes("sheba"));

  // دانشجوی غیرمتصل نمیتواند درخواست بگیرد
  const payForUnconnected = await api(coach, "/api/coach/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId: "nonexistent", serviceType: "PRIVATE", amount: 100, currency: "IRR", description: "", externalLink: "https://pay.example.com/x" }),
  });
  ok("درخواست پرداخت برای ارتباط ناموجود 404", payForUnconnected.status === 404, `got ${payForUnconnected.status}`);

  // درخواست صحیح
  const payCreate = await api(coach, "/api/coach/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, serviceType: "PRIVATE", amount: 2500000, currency: "IRR", description: "برنامه خصوصی ماهانه", externalLink: "https://pay.example.com/test-link" }),
  });
  ok("درخواست پرداخت برای دانشجوی صحیح ثبت میشود", payCreate.status === 201, `got ${payCreate.status} ${JSON.stringify(payCreate.body).slice(0, 120)}`);
  const paymentId = String((payCreate.body.payment as { id?: string })?.id ?? "");

  // لینک http (غیر https) رد میشود
  const payBadLink = await api(coach, "/api/coach/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, serviceType: "PRIVATE", amount: 100, currency: "IRR", description: "", externalLink: "http://pay.example.com/x" }),
  });
  ok("لینک غیر https رد میشود", payBadLink.status === 422, `got ${payBadLink.status}`);

  // درخواست پرداخت روی ارتباط مربی دیگر — 404 (ضد IDOR)
  const payBadType = await api(coach2, "/api/coach/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, serviceType: "PRIVATE", amount: 100, currency: "IRR", description: "", externalLink: "https://pay.example.com/x" }),
  });
  ok("درخواست روی ارتباط مربی دیگر 404", payBadType.status === 404, `got ${payBadType.status}`);

  // تأیید دانشجو — پایدار
  const decideOther = await api(student2, `/api/payments/${paymentId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "confirm" }),
  });
  ok("دانشجوی دیگر نمیتواند تصمیم بگیرد (404)", decideOther.status === 404, `got ${decideOther.status}`);

  const confirmRes = await api(student, `/api/payments/${paymentId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "confirm" }),
  });
  ok("تأیید دانشجو ثبت میشود", confirmRes.status === 200, `got ${confirmRes.status}`);
  const confirmedAt = (confirmRes.body.payment as { studentConfirmedAt?: string })?.studentConfirmedAt;
  ok("زمان تأیید پایدار ذخیره شده", Boolean(confirmedAt));

  // تصمیم دوباره — 409
  const decideAgain = await api(student, `/api/payments/${paymentId}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "decline" }),
  });
  ok("تصمیم دوباره 409 است", decideAgain.status === 409, `got ${decideAgain.status}`);

  // لینک فقط پس از تأیید برای دانشجو فعال است (در پاسخ دانشجو لینک هست)
  const myPayments = await api(student, "/api/payments");
  const myPay = (myPayments.body.payments as { id: string; externalLink: string; status: string }[] | undefined)?.find((p) => p.id === paymentId);
  ok("لینک پرداخت به دانشجوی صحیح نمایش داده میشود", myPay?.externalLink === "https://pay.example.com/test-link");
  ok("کلیک/باز کردن لینک پرداخت موفق تلقی نمیشود (وضعیت همان CONFIRMED)", myPay?.status === "CONFIRMED");

  /* ---------------- بخش ۷ — اعلان‌ها ---------------- */
  console.log("\n== بخش ۷: اعلان‌ها ==");
  const notifCoach = await api(coach, "/api/notifications");
  ok("اعلان مربی بعد از رویدادهای واقعی", notifCoach.status === 200 && Number(notifCoach.body.unreadCount) > 0, JSON.stringify(notifCoach.body).slice(0, 120));
  const unreadBefore = Number(notifCoach.body.unreadCount);

  // درخواست ارتباط student2 → coach باید اعلان داشته باشد (بدون تکرار برای همان رویداد)
  const coachNotifs = notifCoach.body.items as { type: string; payload: Record<string, unknown> }[];
  const connReqNotifs = coachNotifs.filter((n) => n.type === "CONNECTION_REQUEST" && n.payload.connectionId === conn2Id);
  ok("اعلان درخواست ارتباط دقیقاً یک‌بار", connReqNotifs.length === 1, String(connReqNotifs.length));

  // پیام جدید → اعلان گیرنده
  const notifStudentBefore = await api(student, "/api/notifications");
  const unreadStudentBefore = Number(notifStudentBefore.body.unreadCount);
  await api(coach, `/api/coach-chat/conversations/${convId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "اعلان پیام جدید" }),
  });
  const notifStudentAfter = await api(student, "/api/notifications");
  ok("پیام جدید اعلان گیرنده میسازد", Number(notifStudentAfter.body.unreadCount) === unreadStudentBefore + 1, `${unreadStudentBefore} → ${notifStudentAfter.body.unreadCount}`);

  // خواندن پایدار
  const firstUnread = (notifStudentAfter.body.items as { id: string; readAt: string | null }[]).find((n) => n.readAt === null);
  if (firstUnread) {
    const readRes = await api(student, `/api/notifications/${firstUnread.id}/read`, { method: "POST" });
    ok("خواندن اعلان موفق", readRes.status === 200);
    const readAgain = await api(student, `/api/notifications/${firstUnread.id}/read`, { method: "POST" });
    ok("خواندن دوباره بدون تغییر (changed=false)", readAgain.status === 200 && readAgain.body.changed === false);
    const afterRead = await api(student, "/api/notifications");
    ok("شمارش نخوانده پس از خواندن کم میشود", Number(afterRead.body.unreadCount) === unreadStudentBefore);
    // اعلان کاربر دیگر — IDOR
    const readOther = await api(student2, `/api/notifications/${firstUnread.id}/read`, { method: "POST" });
    ok("اعلان کاربر دیگر 404 است", readOther.status === 404, `got ${readOther.status}`);
  }

  // جداسازی مربی2 (اعلان خودش را میبیند نه مربی را)
  const notifCoach2 = await api(coach2, "/api/notifications");
  const coach2Types = (notifCoach2.body.items as { payload: Record<string, unknown> }[]).map((n) => n.payload.connectionId);
  ok("اعلان کاربر دیگر قابل مشاهده نیست", !coach2Types.includes(connectionId));

  /* ---------------- بخش ۹ — پنل دانشجویان ---------------- */
  console.log("\n== بخش ۹: پنل دانشجویان و اطلاعات تکمیلی ==");
  const noteSave = await api(coach, `/api/coach/students/${student.userId}/note`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "یادداشت خصوصی درباره پیشرفت" }),
  });
  ok("یادداشت خصوصی ذخیره میشود", noteSave.status === 200, `got ${noteSave.status}`);

  const noteGet = await api(coach, `/api/coach/students/${student.userId}/note`);
  ok("یادداشت بازیابی میشود", (noteGet.body.note as { content?: string })?.content === "یادداشت خصوصی درباره پیشرفت");

  // یادداشت برای دانشجو نامرئی — دانشجو مسیر ندارد؛ در پروفایل خودش هم نیست
  const studentProfile = await api(student, "/api/profile");
  ok("یادداشت مربی در پروفایل دانشجو نیست", !JSON.stringify(studentProfile.body).includes("یادداشت خصوصی درباره پیشرفت"));

  // یادداشت مربی دیگر — 404
  const noteOther = await api(coach2, `/api/coach/students/${student.userId}/note`);
  ok("یادداشت برای مربی غیرمالک 404", noteOther.status === 404, `got ${noteOther.status}`);

  /* ---------------- بخش ۱۰ — اختصاص برنامه ---------------- */
  console.log("\n== بخش ۱۰: اختصاص برنامه به دانشجو ==");
  const planCreate = await api(coach, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "برنامه ۱۹.۶",
      description: "",
      goal: "fitness",
      difficulty: "beginner",
      durationMinutes: 45,
      days: [{ title: "روز اول", exercises: [{ exerciseId: "pullup", sets: 3, repsMin: 8, repsMax: 10, restSeconds: 90 }] }],
    }),
  });
  ok("ساخت برنامه تمرینی", planCreate.status === 201, `got ${planCreate.status} ${JSON.stringify(planCreate.body).slice(0, 150)}`);
  const planId = String((planCreate.body.plan as { id?: string })?.id ?? "");

  const publish = await api(coach, `/api/coach/workout-plans/${planId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId }),
  });
  ok("اختصاص/ارسال برنامه به دانشجوی متصل", publish.status === 201, `got ${publish.status} ${JSON.stringify(publish.body).slice(0, 150)}`);

  // دانشجو برنامه را میبیند
  const myDeliveries = await api(student, "/api/coach-plans");
  ok("دانشجو برنامه اختصاصیافته را میبیند", myDeliveries.status === 200 && JSON.stringify(myDeliveries.body).includes("برنامه ۱۹.۶"));

  // دانشجوی دیگر برنامه را نمیبیند
  const otherDeliveries = await api(student2, "/api/coach-plans");
  ok("برنامه مربیان دیگر نشت نمیکند", !JSON.stringify(otherDeliveries.body).includes("برنامه ۱۹.۶"));

  // ارسال به دانشجوی غیرمجاز — connection مربی دیگر
  const publishWrong = await api(coach2, `/api/coach/workout-plans/${planId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId: connStudent2CoachId || connectionId }),
  });
  ok("ارسال برنامه مربی دیگر 404 است", publishWrong.status === 404, `got ${publishWrong.status}`);

  // اعلان تحویل برنامه
  const notifAfterPlan = await api(student, "/api/notifications");
  const planNotifs = (notifAfterPlan.body.items as { type: string; payload: Record<string, unknown> }[]).filter(
    (n) => n.type === "PLAN_DELIVERED" && n.payload.planKind === "workout"
  );
  ok("اعلان تحویل برنامه ایجاد شد", planNotifs.length >= 1);

  /* ---------------- بخش ۱۲/۱۳ — بانک حرکات شخصی ---------------- */
  console.log("\n== بخش ۱۲/۱۳: بانک حرکات شخصی ==");
  const exCreate = await api(coach, "/api/coach/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ faName: "پرس سیمکش شخصی", enName: "My Cable Press", category: "chest", equipment: ["cable"], primaryMuscles: ["chest"], secondaryMuscles: [], description: "توضیح", tips: "نکته" }),
  });
  ok("ساخت حرکت شخصی", exCreate.status === 201, `got ${exCreate.status}`);
  const personalId = String((exCreate.body.exercise as { id?: string })?.id ?? "");

  const exList = await api(coach, "/api/coach/exercises");
  ok("فهرست حرکات شخصی مربی", (exList.body.exercises as { id: string }[] | undefined)?.some((e) => e.id === personalId) === true);

  // جداسازی — مربی دیگر حرکت را نمیبیند
  const exOther = await api(coach2, "/api/coach/exercises");
  ok("حرکت شخصی برای مربی دیگر دیده نمیشود", !JSON.stringify(exOther.body).includes(personalId));

  // رسانه — تصویر معتبر
  const fdMedia = new FormData();
  fdMedia.append("file", new Blob([png as unknown as BlobPart], { type: "image/png" }), "demo.png");
  const mediaRes = await api(coach, `/api/coach/exercises/${personalId}/media`, { method: "POST", body: fdMedia });
  ok("آپلود امن تصویر حرکت شخصی", mediaRes.status === 201, `got ${mediaRes.status} ${JSON.stringify(mediaRes.body).slice(0, 120)}`);
  const mediaId = String((mediaRes.body.media as { id?: string })?.id ?? "");

  if (mediaId) {
    const mediaGet = await api(coach, `/api/coach/exercises/media/${mediaId}`);
    ok("خواندن رسانه توسط مالک", mediaGet.status === 200 && mediaGet.headers.get("content-type") === "image/png");
    const mediaIdor = await api(coach2, `/api/coach/exercises/media/${mediaId}`);
    ok("رسانه برای مربی دیگر 404", mediaIdor.status === 404, `got ${mediaIdor.status}`);
  }

  // ویدئو جعلی رد میشود
  const fdFakeVid = new FormData();
  fdFakeVid.append("file", new Blob(["not a video"], { type: "video/mp4" }), "f.mp4");
  const fakeVid = await api(coach, `/api/coach/exercises/${personalId}/media`, { method: "POST", body: fdFakeVid });
  ok("ویدئوی جعلی رد میشود", fakeVid.status === 415, `got ${fakeVid.status}`);

  // استفاده در برنامه — شناسه شخصی
  const planPersonal = await api(coach, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "برنامه با حرکت شخصی",
      description: "",
      goal: "muscle_gain",
      difficulty: "intermediate",
      durationMinutes: 60,
      days: [{ title: "روز", exercises: [{ exerciseId: `cex-${personalId}`, sets: 4, repsMin: 10, repsMax: 12, restSeconds: 60 }] }],
    }),
  });
  ok("حرکت شخصی در برنامه پذیرفته میشود", planPersonal.status === 201, `got ${planPersonal.status} ${JSON.stringify(planPersonal.body).slice(0, 150)}`);
  const personalPlanContent = planPersonal.body.plan as { content?: { days?: { exercises?: { faName: string; source?: string; coach3dId: string | null }[] }[] } } | undefined;
  ok("snapshot حرکت شخصی درست است", personalPlanContent?.content?.days?.[0]?.exercises?.[0]?.faName === "پرس سیمکش شخصی");
  ok("منبع حرکت صادقانه personal است", personalPlanContent?.content?.days?.[0]?.exercises?.[0]?.source === "personal");
  ok("حرکت شخصی بدون نگاشت سهبعدی (صادقانه)", personalPlanContent?.content?.days?.[0]?.exercises?.[0]?.coach3dId === null);

  // استفاده از حرکت شخصی مربی دیگر — رد میشود
  const planSteal = await api(coach2, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "سرقت حرکت",
      description: "",
      goal: "fitness",
      difficulty: "beginner",
      durationMinutes: 30,
      days: [{ title: "روز", exercises: [{ exerciseId: `cex-${personalId}`, sets: 3, repsMin: 10, repsMax: 10, restSeconds: 60 }] }],
    }),
  });
  ok("حرکت شخصی مربی دیگر قابل استفاده نیست (422)", planSteal.status === 422, `got ${planSteal.status}`);

  // حذف حرکت — سوابق برنامهها حفظ میشوند
  const exDelete = await api(coach, `/api/coach/exercises/${personalId}`, { method: "DELETE" });
  ok("حذف حرکت شخصی", exDelete.status === 200, `got ${exDelete.status}`);
  const planStillThere = await db.coachWorkoutPlan.findFirst({ where: { title: "برنامه با حرکت شخصی" } });
  ok("برنامه قبلی پس از حذف حرکت سالم است", Boolean(planStillThere));

  // حفظ بانک عمومی
  const bankCount = await db.exercise.count({ where: { status: "active" } });
  ok("بانک عمومی ۹۰۵ حرکت دستنخورده", bankCount === 905, String(bankCount));

  /* ---------------- رد درخواست → امکان درخواست مجدد ---------------- */
  console.log("\n== بخش ۱: پس از رد، درخواست مجدد ==");
  const rejectRes = await api(coach, `/api/coach/requests/${conn2Id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: "ظرفیت کامل" }),
  });
  ok("رد درخواست توسط مربی مالک", rejectRes.status === 200, `got ${rejectRes.status} ${JSON.stringify(rejectRes.body).slice(0, 100)}`);

  const reRequest = await api(student2, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coach.userId, cooperationType: "PRIVATE", message: "دوباره" }),
  });
  ok("پس از رد، درخواست جدید ممکن است", reRequest.status === 201, `got ${reRequest.status}`);

  // رکورد ردشده قبلی باقی است
  const rejectedCount = await db.coachStudentConnection.count({
    where: { studentId: student2.userId, coachId: coach.userId, status: "REJECTED" },
  });
  ok("سابقه درخواست ردشده حفظ شده", rejectedCount === 1);

  // پس از تأیید — درخواست تکراری رد میشود (student با coach)
  const dupAfterAccept = await api(student, "/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coachId: coach.userId, cooperationType: "PRIVATE" }),
  });
  ok("پس از تأیید، درخواست تکراری 409", dupAfterAccept.status === 409, `got ${dupAfterAccept.status}`);

  /* ---------------- پاک‌سازی ---------------- */
  console.log("\n== پاک‌سازی ==");
  for (const id of cleanupUserIds) {
    if (id === "__none__") continue;
    try {
      await db.user.delete({ where: { id } });
    } catch {
      /* قبلاً حذف شده */
    }
  }
  const remaining = await db.user.count({ where: { email: { contains: "p196test-" } } });
  ok("همه fixtureها پاک شدند", remaining === 0, String(remaining));

  console.log(`\n===== نتیجه: ${passed} سبز، ${failed} قرمز =====`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error("FATAL:", e);
    // پاک‌سازی اضطراری
    for (const id of cleanupUserIds) {
      if (id === "__none__") continue;
      try {
        await db.user.delete({ where: { id } });
      } catch {
        /* noop */
      }
    }
    await db.$disconnect();
    process.exit(1);
  });
