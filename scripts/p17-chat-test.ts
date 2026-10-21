/**
 * p17-chat-test.ts — تست‌های الزامی مرحله ۱۷: پیام‌رسانی خصوصی مربی-دانشجو.
 * اجرا: bun scripts/p17-chat-test.ts  (سرور dev روی :3000)
 *
 * قواعد ایمنی داده:
 *  - فقط کاربران ایزوله با پیشوند p17test-* ساخته میشوند
 *  - هیچ کاربر/رکورد واقعی خوانده یا تغییر داده نمیشود
 *  - پاک‌سازی کامل فقط همین کاربران (کاسکید از مسیر user) + راستی‌آزمایی
 *    integrity_check و foreign_key_check پیش و پس از پاک‌سازی
 *
 * پوشش (مطابق مشخصات):
 *  - مهمان 401، تفکیک نقش، IDOR چهارجهته، نشست و مالکیت مکالمه
 *  - senderId/readAt/زمان جعلی کلاینت بی‌اثر؛ mass assignment حذف میشود
 *  - اعتبارسنجی محتوا (خالی/فقط فاصله/بلند/غیر رشته‌ای) با Zod
 *  - ترتیب پایدار پیام‌ها با seq، صفحه‌بندی before/after بدون تکرار
 *  - polling از نقطه seq — فقط پیام‌های جدید
 *  - خوانده‌شدن فقط توسط گیرنده از مسیر سرور؛ شمار خوانده‌نشده در فهرست
 *  - نرخ‌سنجی دیتابیسی ارسال (429)
 *  - انقضای اشتراک → مسدودی ارسال در هر دو جهت + حفظ تاریخچه + بازیابی
 *  - پایان ارتباط → مسدودی ارسال + تاریخچه فقط‌خواندنی
 *  - تغییر نقش/تأیید مربی در دیتابیس → اثر فوری در APIهای محافظت‌شده
 *  - هم‌زمانی دو ارسال/دو گشودن — بدون خرابی و بدون رکورد تکراری
 *  - XSS به‌صورت متن ساده ذخیره و عیناً برگردانده میشود (escape سمت UI)
 *  - پایداری: پیام در دیتابیس واقعی نوشته و پس از آن از API خوانده میشود
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
const PASSWORD = "p17test-pass1";

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string, attempt = 0): Promise<User> {
  const email = `p17test-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P17 ${name}` }),
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
  method: "GET" | "POST" | "PUT",
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

/* ------------------------------ فیکسچرها ------------------------------ */

async function makeCoachVerified(user: User, name: string) {
  await db.user.update({ where: { id: user.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: {
      userId: user.userId,
      displayName: `P17 Coach ${name}`,
      headline: "تست مرحله ۱۷",
      bio: "پروفایل آزمایشی تست‌های مرحله ۱۷ — کافی برای انتشار.",
      specializationsJson: JSON.stringify(["strength"]),
      cooperationTypesJson: JSON.stringify(["PRIVATE", "SEMI_PRIVATE"]),
      verified: true,
      published: true,
    },
  });
}

async function makePremium(userId: string) {
  await db.studentSubscription.upsert({
    where: { userId },
    update: { tier: "PREMIUM", status: "active", expiresAt: null },
    create: { userId, tier: "PREMIUM", status: "active", source: "manual", note: "p17 fixture" },
  });
}

/** ارتباط ACTIVE واقعی از مسیر رسمی مرحله ۱۵ — دانشجو درخواست، مربی میپذیرد */
async function makeActiveConnection(student: User, coach: User): Promise<string> {
  const created = await api(student, "POST", "/api/coach-connections", {
    coachId: coach.userId,
    cooperationType: "PRIVATE",
    message: "درخواست آزمایشی مرحله ۱۷",
  });
  if (created.status !== 201) {
    throw new Error(`connection create failed: ${created.status} ${JSON.stringify(created.json)}`);
  }
  const connectionId = created.json.connection
    ? ((created.json.connection as { id: string }).id)
    : ((created.json as { id?: string }).id as string);
  const accepted = await api(coach, "POST", `/api/coach/requests/${connectionId}/accept`);
  if (accepted.status !== 200 && accepted.status !== 201) {
    throw new Error(`accept failed: ${accepted.status} ${JSON.stringify(accepted.json)}`);
  }
  return connectionId;
}

/* ------------------------------ اجرا ------------------------------ */

async function main() {
  console.log("\n=== مرحله ۱۷ — پیام‌رسانی خصوصی مربی-دانشجو ===\n");

  /* ---------------- ساخت فیکسچرها ---------------- */
  console.log("— ساخت فیکسچرهای ایزوله —");
  const coachA = await createUser("coachA");
  const coachB = await createUser("coachB");
  const studentA = await createUser("studentA");
  const studentB = await createUser("studentB");
  const studentC = await createUser("studentC");
  const studentD = await createUser("studentD");
  ok("۶ کاربر ایزوله ساخته شد", true);

  await makeCoachVerified(coachA, "A");
  await makeCoachVerified(coachB, "B");
  await makePremium(studentA.userId);
  await makePremium(studentB.userId);
  await makePremium(studentC.userId);
  await makePremium(studentD.userId);
  ok("پروفایل مربیان تأییدشده + اشتراک دانشجویان", true);

  const connA = await makeActiveConnection(studentA, coachA); // مکالمه اصلی
  const connB = await makeActiveConnection(studentB, coachB); // برای IDOR
  const connC = await makeActiveConnection(studentC, coachA); // برای انقضای اشتراک
  const connD = await makeActiveConnection(studentD, coachB); // برای نرخ‌سنجی
  ok("۴ ارتباط ACTIVE از مسیر رسمی مرحله ۱۵", Boolean(connA && connB && connC && connD));

  /* ---------------- ۱) احراز هویت ---------------- */
  console.log("\n— احراز هویت و دسترسی مهمان —");
  {
    const g1 = await api(null, "GET", "/api/coach-chat/conversations");
    ok("مهمان: فهرست مکالمه 401", g1.status === 401 && g1.json.error === "UNAUTHENTICATED");
    const g2 = await api(null, "POST", `/api/coach-chat/connections/${connA}/open`);
    ok("مهمان: گشودن مکالمه 401", g2.status === 401);
    const g3 = await api(null, "GET", `/api/coach-chat/conversations/x/messages`);
    ok("مهمان: پیام‌ها 401", g3.status === 401);
    const g4 = await api(null, "POST", `/api/coach-chat/conversations/x/messages`, { content: "hi" });
    ok("مهمان: ارسال 401", g4.status === 401);
    const bad = await api(studentA, "GET", "/api/coach-chat/conversations", undefined);
    ok("نشست معتبر: فهرست 200", bad.status === 200);
  }

  /* ---------------- ۲) فهرست مکالمه‌ها قبل از آغاز ---------------- */
  console.log("\n— فهرست مکالمه‌ها: ورودی مجازی ارتباط ACTIVE —");
  {
    const s = await api(studentA, "GET", "/api/coach-chat/conversations");
    const list = (s.json.conversations ?? []) as Array<Record<string, unknown>>;
    const own = list.find((c) => c.connectionId === connA);
    ok("دانشجو: ارتباط ACTIVE در فهرست است", Boolean(own));
    ok("ورودی بدون مکالمه: conversationId=null", own?.conversationId === null);
    ok("canSend=true از سرور", own?.canSend === true);
    ok("نام نمایشی مربی از پروفایل", Boolean(own?.counterpart) && (own?.counterpart as { displayName: string })?.displayName === "P17 Coach A");
    const coachIds = list.map((c) => (c.counterpart as { userId: string }).userId);
    ok("دانشجو فقط مکالمه‌های خودش (بدون مربی B)", !coachIds.includes(coachB.userId));

    const c = await api(coachA, "GET", "/api/coach-chat/conversations");
    const clist = (c.json.conversations ?? []) as Array<Record<string, unknown>>;
    const cOwn = clist.find((x) => x.connectionId === connA);
    ok("مربی: ارتباط ACTIVE خودش در فهرست", Boolean(cOwn));
    ok("مربی: هر دو ارتباط فعال خودش (A و C)", clist.some((x) => x.connectionId === connA) && clist.some((x) => x.connectionId === connC));
    ok("مربی: ارتباط مربی دیگر در فهرست نیست", clist.every((x) => x.connectionId !== connB && x.connectionId !== connD));

    const b = await api(coachB, "GET", "/api/coach-chat/conversations");
    const blist = (b.json.conversations ?? []) as Array<Record<string, unknown>>;
    ok("مربی B: فقط ارتباط خودش با studentB", blist.every((x) => x.connectionId !== connA && x.connectionId !== connC));
  }

  /* ---------------- ۳) IDOR گشودن ---------------- */
  console.log("\n— IDOR: گشودن مکالمه دیگران —");
  {
    const byB = await api(coachB, "POST", `/api/coach-chat/connections/${connA}/open`);
    ok("مربی B روی ارتباط مربی A: 404", byB.status === 404);
    const bySb = await api(studentB, "POST", `/api/coach-chat/connections/${connA}/open`);
    ok("دانشجوی B روی ارتباط مربی A: 404", bySb.status === 404);
    const fake = await api(studentA, "POST", "/api/coach-chat/connections/nonexistent-id/open");
    ok("connectionId ناموجود: 404", fake.status === 404);
  }

  /* ---------------- ۴) گشودن مکالمه + ضدتکرار ---------------- */
  console.log("\n— گشودن مکالمه و یکتایی —");
  let conversationId = "";
  {
    const open1 = await api(studentA, "POST", `/api/coach-chat/connections/${connA}/open`);
    ok("گشودن توسط دانشجو: 201", open1.status === 201);
    conversationId = ((open1.json.conversation ?? {}) as { conversationId?: string }).conversationId ?? "";
    ok("conversationId برگردانده شد", conversationId.length > 0);
    const conv = (open1.json.conversation ?? {}) as Record<string, unknown>;
    ok("counterpart مربی است", (conv.counterpart as { userId: string })?.userId === coachA.userId);
    ok("canSend=true", conv.canSend === true && conv.blockReason === null);

    const open2 = await api(coachA, "POST", `/api/coach-chat/connections/${connA}/open`);
    const conversationId2 = ((open2.json.conversation ?? {}) as { conversationId?: string }).conversationId ?? "";
    ok("گشودن توسط مربی: 201", open2.status === 201);
    ok("همان مکالمه — بدون تکرار", conversationId2 === conversationId);
    const rowCount = await db.coachConversation.count({ where: { connectionId: connA } });
    ok("دقیقاً یک رکورد مکالمه در دیتابیس", rowCount === 1);

    // دانشجوی FREE نه — studentB با مربی خودش: گشودن سالم
    const openB = await api(studentB, "POST", `/api/coach-chat/connections/${connB}/open`);
    ok("گشودن مکالمه جفت B: 201", openB.status === 201);
  }

  /* ---------------- ۵) اعتبارسنجی محتوا ---------------- */
  console.log("\n— اعتبارسنجی محتوای پیام —");
  {
    const empty = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: "" });
    ok("پیام خالی: 400", empty.status === 400);
    const ws = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: "      " });
    ok("پیام فقط فاصله: 400", ws.status === 400);
    const long = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: "ا".repeat(2001) });
    ok("پیام ۲۰۰۱ کاراکتری: 400", long.status === 400);
    const max = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: "ا".repeat(2000) });
    ok("پیام ۲۰۰۰ کاراکتری: 201", max.status === 201);
    const nonStr = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: 42 });
    ok("محتوای غیر رشته‌ای: 400", nonStr.status === 400);
    const noBody = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`);
    ok("بدنه نامعتبر: 400", noBody.status === 400);
  }

  /* ---------------- ۶) جعل فرستنده و mass assignment ---------------- */
  console.log("\n— بی‌اثری senderId/readAt جعلی —");
  {
    const spoof = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, {
      content: "پیام با فرستنده جعلی",
      senderId: coachA.userId,
      readAt: new Date().toISOString(),
      createdAt: "1999-01-01T00:00:00.000Z",
      seq: 99999,
      conversationId: "fake-conv",
    });
    ok("ارسال با فیلدهای جعلی: 201", spoof.status === 201);
    const msg = (spoof.json.message ?? {}) as Record<string, unknown>;
    ok("senderId واقعی از نشست (studentA)", msg.senderId === studentA.userId);
    ok("readAt ساختگی نادیده گرفته شد", msg.readAt === null);
    const created = new Date(msg.createdAt as string).getTime();
    ok("createdAt ساختگی نادیده گرفته شد (زمان سرور)", Math.abs(Date.now() - created) < 60_000);
    ok("seq ساختگی نادیده گرفته شد", (msg.seq as number) !== 99999);
    const stored = await db.coachMessage.findUnique({ where: { id: msg.id as string } });
    ok("رکورد دیتابیس با senderId واقعی", stored?.senderId === studentA.userId && stored.conversationId === conversationId);
  }

  /* ---------------- ۷) ترتیب، پایداری، صفحه‌بندی ---------------- */
  console.log("\n— ترتیب پایدار و صفحه‌بندی —");
  {
    // پیام‌های مرحله قبل: seq1=اولین، seq2=۲۰۰۰ کاراکتری، seq3=جعلی‌ساز
    const texts = ["یکی", "دو", "سه", "چهار", "پنج"];
    for (const text of texts) {
      const r = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: text });
      if (r.status !== 201) throw new Error(`send failed: ${r.status}`);
    }
    const page = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages`);
    ok("مربی: واکشی پیام‌ها 200", page.status === 200);
    const msgs = (page.json.messages ?? []) as Array<Record<string, unknown>>;
    const seqs = msgs.map((m) => m.seq as number);
    ok("ترتیب صعودی seq", seqs.every((v, i) => i === 0 || v > seqs[i - 1]));
    ok("آخرین پیام «پنج» است", msgs[msgs.length - 1]?.content === "پنج");
    const times = msgs.map((m) => new Date(m.createdAt as string).getTime());
    ok("زمان‌ها نزول‌ناپذیر", times.every((v, i) => i === 0 || v >= times[i - 1]));
    ok("hasMoreOlder=false (کمتر از صفحه)", page.json.hasMoreOlder === false);

    // صفحه‌بندی قدیمی‌تر
    const page2 = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages?limit=3`);
    const msgs2 = (page2.json.messages ?? []) as Array<Record<string, unknown>>;
    ok("صفحه آخر با limit=3: سه پیام", msgs2.length === 3);
    ok("سه پیام آخر صحیح", msgs2.map((m) => m.content).join(",") === "سه,چهار,پنج");
    const beforeSeq = msgs2[0].seq as number;
    const page3 = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages?before=${beforeSeq}&limit=2`);
    const msgs3 = (page3.json.messages ?? []) as Array<Record<string, unknown>>;
    ok("صفحه قدیمی‌تر: بدون همپوشانی", msgs3.every((m) => (m.seq as number) < beforeSeq));
    ok("صفحه قدیمی‌تر مرتب صعودی", msgs3.every((v, i, arr) => i === 0 || (v.seq as number) > (arr[i - 1].seq as number)));
    ok("hasMoreOlder=true وقتی قدیمی‌تر هست", page3.json.hasMoreOlder === true);

    // polling از نقطه seq
    const lastSeq = msgs[msgs.length - 1].seq as number;
    const poll1 = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages?after=${lastSeq}`);
    ok("polling به‌روز: خالی", ((poll1.json.messages ?? []) as unknown[]).length === 0);
    const newMsg = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: "پیام جدید polling" });
    ok("پیام جدید برای polling: 201", newMsg.status === 201);
    const poll2 = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages?after=${lastSeq}`);
    const polled = (poll2.json.messages ?? []) as Array<Record<string, unknown>>;
    ok("polling: فقط پیام جدید", polled.length === 1 && polled[0].content === "پیام جدید polling");
    ok("polling: بدون تکرار قدیمی‌ها", polled.every((m) => (m.seq as number) > lastSeq));

    // پایداری: رکورد واقعی در دیتابیس + بازخوانی کامل
    const dbCount = await db.coachMessage.count({ where: { conversationId } });
    const refetch = await api(studentA, "GET", `/api/coach-chat/conversations/${conversationId}/messages`);
    const refetched = (refetch.json.messages ?? []) as Array<Record<string, unknown>>;
    ok("تعداد رکورد دیتابیس == تعداد API", dbCount === refetched.length);
    ok("پیام پس از واکشی مجدد میماند (پایداری)", refetched.some((m) => m.content === "پیام جدید polling"));

    // پارامترهای نامعتبر
    const badCur = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages?before=abc`);
    ok("مکان‌یاب غیرعددی: 400", badCur.status === 400);
    const bothCur = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages?before=2&after=3`);
    ok("هر دو مکان‌یاب همزمان: 400", bothCur.status === 400);
    const bigLimit = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages?limit=1000`);
    ok("limit بیش از سقف: 400", bigLimit.status === 400);
  }

  /* ---------------- ۸) XSS ---------------- */
  console.log("\n— XSS و محتوای مخرب —");
  {
    const xss = await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, {
      content: `<script>alert('xss')</script> & <img src=x onerror=alert(1)>`,
    });
    ok("ارسال payload XSS: 201 (متن ساده)", xss.status === 201);
    const got = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages?limit=1`);
    const last = ((got.json.messages ?? []) as Array<Record<string, unknown>>)[0];
    ok("محتوا عیناً به‌صورت رشته برگشته (بدون تفسیر)", last?.content === `<script>alert('xss')</script> & <img src=x onerror=alert(1)>`);
  }

  /* ---------------- ۹) خوانده‌شدن ---------------- */
  console.log("\n— وضعیت خوانده‌شدن —");
  {
    // studentA دو پیام میفرستد؛ coachA نخوانده
    await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: "خوانده‌نشده یک" });
    await api(studentA, "POST", `/api/coach-chat/conversations/${conversationId}/messages`, { content: "خوانده‌نشده دو" });

    const cList = await api(coachA, "GET", "/api/coach-chat/conversations");
    const cEntry = ((cList.json.conversations ?? []) as Array<Record<string, unknown>>).find((x) => x.connectionId === connA);
    ok("فهرست مربی: دو پیام خوانده‌نشده", cEntry?.unreadCount === 2);
    const sList = await api(studentA, "GET", "/api/coach-chat/conversations");
    const sEntry = ((sList.json.conversations ?? []) as Array<Record<string, unknown>>).find((x) => x.connectionId === connA);
    ok("فهرست دانشجو: خوانده‌نشده خودش صفر", sEntry?.unreadCount === 0);

    // مربی میخواند → readAt فقط برای پیام‌های دانشجو ثبت میشود
    const read = await api(coachA, "GET", `/api/coach-chat/conversations/${conversationId}/messages`);
    ok("واکشی مربی: 200", read.status === 200);
    const unreadRows = await db.coachMessage.count({
      where: { conversationId, senderId: studentA.userId, readAt: null },
    });
    ok("همه پیام‌های دانشجو خوانده‌شده شد (سمت سرور)", unreadRows === 0);
    const cList2 = await api(coachA, "GET", "/api/coach-chat/conversations");
    const cEntry2 = ((cList2.json.conversations ?? []) as Array<Record<string, unknown>>).find((x) => x.connectionId === connA);
    ok("فهرست مربی پس از خواندن: صفر", cEntry2?.unreadCount === 0);
    const seen = await api(studentA, "GET", `/api/coach-chat/conversations/${conversationId}/messages`);
    const seenMsgs = (seen.json.messages ?? []) as Array<Record<string, unknown>>;
    const mine = seenMsgs.filter((m) => m.senderId === studentA.userId);
    ok("دانشجو «دیده شد» را میبیند (readAt ثبت‌شده)", mine.length > 0 && mine.every((m) => m.readAt !== null));
  }

  /* ---------------- ۱۰) نرخ‌سنجی ارسال ---------------- */
  console.log("\n— نرخ‌سنجی دیتابیسی —");
  {
    const dConv = await api(studentD, "POST", `/api/coach-chat/connections/${connD}/open`);
    const dId = ((dConv.json.conversation ?? {}) as { conversationId?: string }).conversationId ?? "";
    ok("مکالمه جفت D گشوده شد", dConv.status === 201 && dId.length > 0);
    let sentOk = 0;
    let got429 = 0;
    for (let i = 0; i < 21; i += 1) {
      const r = await api(studentD, "POST", `/api/coach-chat/conversations/${dId}/messages`, { content: `n${i}` });
      if (r.status === 201) sentOk += 1;
      if (r.status === 429) got429 += 1;
    }
    ok("۲۰ پیام اول مجاز", sentOk === 20, `sentOk=${sentOk}`);
    ok("پیام ۲۱ام: 429 RATE_LIMITED", got429 === 1);
    const dbCount = await db.coachMessage.count({ where: { senderId: studentD.userId } });
    ok("دقیقاً ۲۰ رکورد ذخیره شده", dbCount === 20, `count=${dbCount}`);
  }

  /* ---------------- ۱۱) هم‌زمانی ---------------- */
  console.log("\n— هم‌زمانی: دو ارسال و دو گشودن —");
  {
    const cConv = await api(studentB, "POST", `/api/coach-chat/connections/${connB}/open`);
    const cId = ((cConv.json.conversation ?? {}) as { conversationId?: string }).conversationId ?? "";
    const before = await db.coachMessage.count({ where: { conversationId: cId } });
    const [p1, p2] = await Promise.all([
      api(studentB, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "همزمان الف" }),
      api(studentB, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "همزمان ب" }),
    ]);
    ok("هر دو ارسال همزمان: 201", p1.status === 201 && p2.status === 201);
    const after = await db.coachMessage.count({ where: { conversationId: cId } });
    ok("هر دو ذخیره شدند", after === before + 2);
    const seqs = await db.coachMessage.findMany({
      where: { conversationId: cId },
      orderBy: { seq: "asc" },
      select: { seq: true },
    });
    const unique = new Set(seqs.map((s) => s.seq)).size;
    ok("seq یکتا و پیوسته (بدون خرابی)", unique === seqs.length);

    // دو گشودن همزمان — همان مکالمه
    const [o1, o2] = await Promise.all([
      api(coachA, "POST", `/api/coach-chat/connections/${connC}/open`),
      api(studentC, "POST", `/api/coach-chat/connections/${connC}/open`),
    ]);
    const id1 = ((o1.json.conversation ?? {}) as { conversationId?: string }).conversationId ?? "";
    const id2 = ((o2.json.conversation ?? {}) as { conversationId?: string }).conversationId ?? "";
    ok("دو گشودن همزمان: 201/201", o1.status === 201 && o2.status === 201);
    ok("هر دو یک مکالمه", id1 === id2 && id1.length > 0);
    const convCount = await db.coachConversation.count({ where: { connectionId: connC } });
    ok("بدون رکورد تکراری مکالمه", convCount === 1);
  }

  /* ---------------- ۱۲) انقضای اشتراک ---------------- */
  console.log("\n— انقضای اشتراک دانشجو (سیاست مرحله ۱۵/۱۶) —");
  {
    const cId = await db.coachConversation.findUnique({ where: { connectionId: connC } });
    ok("مکالمه connC موجود", Boolean(cId));
    // ارسال سالم قبل از انقضا
    const pre = await api(studentC, "POST", `/api/coach-chat/conversations/${cId?.id}/messages`, { content: "قبل از انقضا" });
    ok("ارسال قبل از انقضا: 201", pre.status === 201);

    // انقضا با گذشته گذاشتن expiresAt — سطح مؤثر FREE میشود
    await db.studentSubscription.update({
      where: { userId: studentC.userId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    const blockedS = await api(studentC, "POST", `/api/coach-chat/conversations/${cId?.id}/messages`, { content: "پس از انقضا" });
    ok("ارسال دانشجوی منقضی: 403 SUBSCRIPTION_REQUIRED", blockedS.status === 403 && blockedS.json.error === "SUBSCRIPTION_REQUIRED");
    const blockedC = await api(coachA, "POST", `/api/coach-chat/conversations/${cId?.id}/messages`, { content: "مربی به دانشجوی منقضی" });
    ok("ارسال مربی به دانشجوی منقضی: 403 SUBSCRIPTION_REQUIRED", blockedC.status === 403 && blockedC.json.error === "SUBSCRIPTION_REQUIRED");

    // قرارداد مرحله ۱۹.۶: مکالمه موجود همیشه باز میشود (تاریخچه فقطخواندنی)؛
    // ارسال طبق blockReason مسدود میماند — مکالمه جدید برای غیرمجاز ساخته نمیشود
    const reopen = await api(studentC, "POST", `/api/coach-chat/connections/${connC}/open`);
    const reopenView = (reopen.json.conversation ?? {}) as { canSend?: boolean; blockReason?: string | null };
    ok(
      "گشودن با اشتراک منقضی: 201 فقطخواندنی (canSend=false)",
      reopen.status === 201 && reopenView.canSend === false && reopenView.blockReason === "SUBSCRIPTION_REQUIRED"
    );

    // تاریخچه حفظ میشود — فقط‌خواندنی
    const history = await api(studentC, "GET", `/api/coach-chat/conversations/${cId?.id}/messages`);
    const histMsgs = (history.json.messages ?? []) as Array<Record<string, unknown>>;
    ok("تاریخچه پس از انقضا قابل خواندن", history.status === 200 && histMsgs.some((m) => m.content === "قبل از انقضا"));
    const historyC = await api(coachA, "GET", `/api/coach-chat/conversations/${cId?.id}/messages`);
    ok("تاریخچه برای مربی هم حفظ شده", historyC.status === 200);

    // فهرست: canSend=false با blockReason شفاف
    const sList = await api(studentC, "GET", "/api/coach-chat/conversations");
    const sEntry = ((sList.json.conversations ?? []) as Array<Record<string, unknown>>).find((x) => x.connectionId === connC);
    ok("فهرست دانشجوی منقضی: canSend=false", sEntry?.canSend === false && sEntry?.blockReason === "SUBSCRIPTION_REQUIRED");

    // بازیابی اشتراک → ارسال دوباره باز میشود
    await db.studentSubscription.update({
      where: { userId: studentC.userId },
      data: { expiresAt: null },
    });
    const recovered = await api(studentC, "POST", `/api/coach-chat/conversations/${cId?.id}/messages`, { content: "بازیابی شد" });
    ok("پس از تمدید: ارسال 201", recovered.status === 201);
  }

  /* ---------------- ۱۳) پایان ارتباط ---------------- */
  console.log("\n— پایان ارتباط (سیاست شفاف) —");
  {
    const cId = (await db.coachConversation.findUnique({ where: { connectionId: connC } }))?.id ?? "";
    // پایان از مسیر رسمی مرحله ۱۵ توسط دانشجو
    const ended = await api(studentC, "POST", `/api/coach-connections/${connC}/end`);
    ok("پایان ارتباط از مسیر مرحله ۱۵: 200", ended.status === 200);

    const blockedS = await api(studentC, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "پس از پایان" });
    ok("ارسال دانشجو پس از پایان: 403 CONNECTION_CLOSED", blockedS.status === 403 && blockedS.json.error === "CONNECTION_CLOSED");
    const blockedC = await api(coachA, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "مربی پس از پایان" });
    ok("ارسال مربی پس از پایان: 403 CONNECTION_CLOSED", blockedC.status === 403 && blockedC.json.error === "CONNECTION_CLOSED");

    const history = await api(studentC, "GET", `/api/coach-chat/conversations/${cId}/messages`);
    const histMsgs = (history.json.messages ?? []) as Array<Record<string, unknown>>;
    ok("تاریخچه پس از پایان حفظ شده", history.status === 200 && histMsgs.some((m) => m.content === "بازیابی شد"));
    const histC = await api(coachA, "GET", `/api/coach-chat/conversations/${cId}/messages`);
    ok("تاریخچه برای مربی پس از پایان حفظ شده", histC.status === 200);

    const sList = await api(studentC, "GET", "/api/coach-chat/conversations");
    const sEntry = ((sList.json.conversations ?? []) as Array<Record<string, unknown>>).find((x) => x.connectionId === connC);
    ok("فهرست: وضعیت ENDED با canSend=false", sEntry?.connectionStatus === "ENDED" && sEntry?.blockReason === "CONNECTION_CLOSED");
  }

  /* ---------------- ۱۴) تغییر نقش و تأیید مربی — اثر فوری ---------------- */
  console.log("\n— تغییر نقش/تأیید مربی در دیتابیس —");
  {
    const cId = (await db.coachConversation.findUnique({ where: { connectionId: connB } }))?.id ?? "";

    // تأیید مربی‌گری گرفته شود → ارسال مربی فوراً مسدود
    await db.coachProfile.update({ where: { userId: coachB.userId }, data: { verified: false } });
    const blockedCoach = await api(coachB, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "تأیید برداشته شد" });
    ok("مربی بدون تأیید: 403 COACH_NOT_VERIFIED", blockedCoach.status === 403 && blockedCoach.json.error === "COACH_NOT_VERIFIED");
    // دانشجوی همان جفت همچنان میتواند بفرستد (خطای مربی مانع دانشجو نیست)
    const studentOk = await api(studentB, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "دانشجو مستقل از تأیید مربی" });
    ok("دانشجوی همان جفت: 201", studentOk.status === 201);
    await db.coachProfile.update({ where: { userId: coachB.userId }, data: { verified: true } });
    const restored = await api(coachB, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "تأیید برگشت" });
    ok("پس از بازگشت تأیید: 201", restored.status === 201);

    // نقش مربی به STUDENT برگردد → ارسال مسدود، خواندن تاریخچه باز
    await db.user.update({ where: { id: coachB.userId }, data: { role: "STUDENT" } });
    const roleBlocked = await api(coachB, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "نقش برداشته شد" });
    ok("مربی بدون نقش COACH: 403 ROLE_NOT_ALLOWED", roleBlocked.status === 403 && roleBlocked.json.error === "ROLE_NOT_ALLOWED");
    const hist = await api(coachB, "GET", `/api/coach-chat/conversations/${cId}/messages`);
    ok("خواندن تاریخچه برای طرف سابق: 200", hist.status === 200);
    await db.user.update({ where: { id: coachB.userId }, data: { role: "COACH" } });
    const roleRestored = await api(coachB, "POST", `/api/coach-chat/conversations/${cId}/messages`, { content: "نقش برگشت" });
    ok("پس از بازگشت نقش: 201", roleRestored.status === 201);
  }

  /* ---------------- ۱۵) رگرسیون سبک مسیرهای قبلی ---------------- */
  console.log("\n— رگرسیون سبک مراحل ۱۵/۱۶ —");
  {
    const sub = await api(studentA, "GET", "/api/subscription");
    ok("GET /api/subscription سالم", sub.status === 200);
    const conns = await api(studentA, "GET", "/api/coach-connections");
    ok("GET /api/coach-connections سالم", conns.status === 200);
    const coachReqs = await api(coachA, "GET", "/api/coach/requests");
    ok("GET /api/coach/requests سالم", coachReqs.status === 200);
    const students = await api(coachA, "GET", "/api/coach/students");
    ok("GET /api/coach/students سالم", students.status === 200);
    const deliveries = await api(studentA, "GET", "/api/coach-plans");
    ok("GET /api/coach-plans سالم", deliveries.status === 200);
    const session = await api(studentA, "GET", "/api/sessions");
    ok("GET /api/sessions سالم", session.status === 200);
    const foods = await api(studentA, "GET", `/api/food-logs?date=${new Date().toISOString().slice(0, 10)}`);
    ok("GET /api/food-logs سالم", foods.status === 200);
    const coaches = await api(studentA, "GET", "/api/coaches");
    ok("GET /api/coaches سالم", coaches.status === 200);
  }

  /* ---------------- ۱۶) یکپارچگی و پاک‌سازی ---------------- */
  console.log("\n— یکپارچگی دیتابیس و پاک‌سازی ایزوله —");
  {
    const ic1 = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
    const fk1 = await db.$queryRawUnsafe<Record<string, unknown>[]>("PRAGMA foreign_key_check");
    ok("integrity_check قبل از پاک‌سازی: ok", ic1[0]?.integrity_check === "ok");
    ok("foreign_key_check قبل از پاک‌سازی: ۰ تخلف", fk1.length === 0);

    for (const u of [coachA, coachB, studentA, studentB, studentC, studentD]) {
      await db.user.delete({ where: { id: u.userId } });
    }
    const remaining = await db.user.count({ where: { email: { contains: "p17test-" } } });
    ok("همه کاربران p17test حذف شدند", remaining === 0);
    const convLeft = await db.coachConversation.count();
    const msgLeft = await db.coachMessage.count();
    // به‌روزرسانی مرحله ۲۰: مکالمه واقعی کاربران (مثلاً مورتزا↔عارف) اکنون
    // مجاز است — فقط نباید ردیف p17test باقی مانده باشد؛ فهرست کاربران
    // واقعی سمت بالا خوانده و مقایسه میشود
    const convOwners = await db.coachConversation.findMany({
      select: { connection: { select: { coach: { select: { email: true } }, student: { select: { email: true } } } } },
    });
    const fixtureConvs = convOwners.filter(
      (c) =>
        c.connection.coach.email.includes("p17test") ||
        c.connection.student.email.includes("p17test")
    );
    ok("هیچ مکالمه آزمایشی p17test باقی نماند", fixtureConvs.length === 0, `left=${fixtureConvs.length} (real convs=${convLeft})`);
    const realUsers = await db.user.count({ where: { email: { not: { contains: "p17test" } } } });
    // به‌روزرسانی مرحله ۲۰: پایه واقعی ۶ کاربر است (۴ پایه + morteza مربی +
    // aref دانشجو — حسابهای واقعی خود کاربر که پس از ۱۹.۶ ساخته شدند)
    ok("کاربران واقعی دست‌نخورده (۶ کاربر پایه — شامل حساب واقعی مالک)", realUsers === 6, `count=${realUsers}`);

    const ic2 = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
    const fk2 = await db.$queryRawUnsafe<Record<string, unknown>[]>("PRAGMA foreign_key_check");
    ok("integrity_check پس از پاک‌سازی: ok", ic2[0]?.integrity_check === "ok");
    ok("foreign_key_check پس از پاک‌سازی: ۰ تخلف", fk2.length === 0);
  }

  console.log(`\n=== نتیجه: ${passed} سبز، ${failed} سرخ ===`);
  if (failed > 0) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL:", err);
    process.exit(1);
  });
