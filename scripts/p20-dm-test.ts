/**
 * p20-dm-test.ts — تست گفتگوی آزاد (مرحله ۲۰، بخش ۲).
 * دو کاربر fixture: جست‌وجوی افراد، شروع رشته، ارسال/خواندن پیام،
 * شمار نخوانده، اعلان گیرنده، 404 ضد IDOR. همه آثار پاک میشود.
 */

const BASE = "http://localhost:3000";
const STAMP = Date.now();

interface Check { name: string; ok: boolean; detail: string }
const checks: Check[] = [];
function record(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}: ${detail}`);
}

async function signUp(name: string): Promise<{ cookie: string; userId: string }> {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `p20dm-${name}-${STAMP}@test.invalid`,
      password: "Qw9#tR2wLp!6zX7k",
      name: `کاربر ${name} ${STAMP}`,
    }),
  });
  if (!res.ok) throw new Error(`sign-up ${name} failed: ${res.status}`);
  const cookie = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  const u = await db.user.findFirst({
    where: { email: { contains: `p20dm-${name}-${STAMP}` } },
    select: { id: true },
  });
  await db.$disconnect();
  if (!u) throw new Error(`user ${name} not found`);
  return { cookie, userId: u.id };
}

async function api(cookie: string, url: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${url}`, { ...init, headers: { cookie, ...(init?.headers ?? {}) } });
  const body = (await res.json().catch(() => ({}))) as unknown;
  return { status: res.status, body };
}

async function main() {
  const a = await signUp("a");
  const b = await signUp("b");

  // ۱) جست‌وجوی افراد
  const search = await api(a.cookie, `/api/dm/users?q=${encodeURIComponent(`کاربر b ${STAMP}`)}`);
  const people = (search.body as { people?: { userId: string }[] }).people ?? [];
  record("people search finds B", search.status === 200 && people.some((p) => p.userId === b.userId), `status=${search.status} found=${people.length}`);
  const shortQ = await api(a.cookie, `/api/dm/users?q=${encodeURIComponent("ک")}`);
  record("short query returns empty", shortQ.status === 200 && ((shortQ.body as { people?: unknown[] }).people ?? []).length === 0, `status=${shortQ.status}`);

  // ۲) شروع رشته + جلوگیری از خود
  const self = await api(a.cookie, "/api/dm/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: a.userId }) });
  record("self thread forbidden", self.status === 400, `status=${self.status}`);
  const open = await api(a.cookie, "/api/dm/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: b.userId }) });
  const threadId = (open.body as { thread?: { id: string } }).thread?.id;
  record("open thread A→B", open.status === 201 && !!threadId, `status=${open.status} id=${threadId ?? "-"}`);
  const open2 = await api(b.cookie, "/api/dm/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: a.userId }) });
  const threadId2 = (open2.body as { thread?: { id: string } }).thread?.id;
  record("find-or-create same thread", threadId2 === threadId, `same=${threadId2 === threadId}`);

  if (threadId) {
    // ۳) ارسال و خواندن
    const send = await api(a.cookie, `/api/dm/threads/${threadId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "سلام، این پیام آزمایشی است" }) });
    record("send message", send.status === 201, `status=${send.status}`);
    const emptySend = await api(a.cookie, `/api/dm/threads/${threadId}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ body: "   " }) });
    record("empty body rejected", emptySend.status === 400, `status=${emptySend.status}`);

    const listB = await api(b.cookie, `/api/dm/threads/${threadId}/messages`);
    const msgs = (listB.body as { messages?: { body: string }[] }).messages ?? [];
    record("B reads messages + marks read", listB.status === 200 && msgs.some((m) => m.body === "سلام، این پیام آزمایشی است"), `status=${listB.status} count=${msgs.length}`);

    // ۴) شمار نخوانده: B خوانده → برای B صفر، برای A هم صفر (A فرستنده)
    const threadsB = await api(b.cookie, "/api/dm/threads");
    const unreadB = ((threadsB.body as { threads?: { unreadCount: number }[] }).threads ?? []).find(() => true)?.unreadCount;
    record("unread cleared after read", unreadB === 0, `unread=${unreadB}`);

    // ۵) اعلان گیرنده
    const { PrismaClient } = await import("@prisma/client");
    const db = new PrismaClient();
    const notif = await db.notification.findFirst({ where: { userId: b.userId, type: "DIRECT_MESSAGE" } });
    await db.$disconnect();
    record("receiver got DM notification", !!notif, `exists=${!!notif}`);

    // ۶) ضد IDOR: کاربر ثالث 404
    const c = await signUp("c");
    const intruder = await api(c.cookie, `/api/dm/threads/${threadId}/messages`);
    record("non-member 404 (IDOR safe)", intruder.status === 404, `status=${intruder.status}`);
  }

  // ۷) پاکسازی کامل fixtureها
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();
  for (const id of [a.userId, b.userId, ...(((await db.user.findMany({ where: { email: { contains: `p20dm-` } }, select: { id: true } })) ?? []).map((u) => u.id))]) {
    await db.directThread.deleteMany({ where: { OR: [{ userAId: id }, { userBId: id }] } });
    await db.notification.deleteMany({ where: { userId: id } });
    await db.fitnessProfile.deleteMany({ where: { userId: id } });
    await db.assistantConversation.deleteMany({ where: { userId: id } });
    await db.session.deleteMany({ where: { userId: id } });
    await db.account.deleteMany({ where: { userId: id } });
    await db.user.deleteMany({ where: { id } });
  }
  await db.$disconnect();
  console.log("cleanup done");

  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
