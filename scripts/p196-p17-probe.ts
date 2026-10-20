/**
 * p196-p17-probe.ts — پروب تشخیصی برای ۳ تست قرمز p17 پس از تغییرات ۱۹.۶.
 * فقط کاربر ایزوله p196probe-* میسازد و در پایان پاک میکند.
 */
import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const db = new PrismaClient();
const stamp = Date.now();
const PASSWORD = "p196probe-pass1";

interface User { email: string; cookie: string; userId: string }

async function createUser(name: string): Promise<User> {
  const email = `p196probe-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P196 ${name}` }),
  });
  if (res.status !== 200) throw new Error(`signup ${name}: ${res.status}`);
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error("row missing");
  return { email, cookie: cookie ?? "", userId: row.id };
}

async function api(user: User, method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      cookie: user.cookie,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: Record<string, unknown> = {};
  try { json = await res.json() as Record<string, unknown>; } catch { /* */ }
  return { status: res.status, json };
}

async function main() {
  const student = await createUser("student");
  const coach = await createUser("coach");
  await db.user.update({ where: { id: coach.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: { userId: coach.userId, displayName: "پروب ۱۹۶", bio: "بیوگرافی معتبر برای تست با حداقل طول لازم.", verified: true, published: true, cooperationTypesJson: JSON.stringify(["PRIVATE"]) },
  });
  await db.studentSubscription.create({ data: { userId: student.userId, tier: "PREMIUM", status: "active", source: "manual", note: "probe" } });

  const conn = await api(student, "POST", "/api/coach-connections", { coachId: coach.userId, cooperationType: "PRIVATE" });
  const connectionId = String((conn.json.connection as { id?: string } | undefined)?.id ?? "");
  console.log("connection:", conn.status, connectionId);
  await api(coach, "POST", `/api/coach/requests/${connectionId}/accept`);

  // ۱) پایان ارتباط از مسیر ۱۵
  const end = await api(student, "POST", `/api/coach-connections/${connectionId}/end`);
  console.log("\n[1] end:", end.status, JSON.stringify(end.json).slice(0, 200));

  const connRow = await db.coachStudentConnection.findUnique({ where: { id: connectionId } });
  console.log("    connection status in DB:", connRow?.status);
  const convRow = await db.coachConversation.findUnique({ where: { connectionId } });
  console.log("    conversation exists:", Boolean(convRow), convRow?.id);

  // ۲) ارسال پس از پایان
  if (convRow) {
    const sendS = await api(student, "POST", `/api/coach-chat/conversations/${convRow.id}/messages`, { content: "پس از پایان" });
    console.log("\n[2] student send after END:", sendS.status, JSON.stringify(sendS.json).slice(0, 300));
    const sendC = await api(coach, "POST", `/api/coach-chat/conversations/${convRow.id}/messages`, { content: "مربی پس از پایان" });
    console.log("    coach send after END:", sendC.status, JSON.stringify(sendC.json).slice(0, 300));
  }

  // ۳) فهرست مکالمات دانشجو
  const list = await api(student, "GET", "/api/coach-chat/conversations");
  const entry = ((list.json.conversations ?? []) as Array<Record<string, unknown>>).find((x) => x.connectionId === connectionId);
  console.log("\n[3] list entry:", JSON.stringify(entry, null, 2)?.slice(0, 500));

  // پاک‌سازی
  await db.user.delete({ where: { id: student.userId } });
  await db.user.delete({ where: { id: coach.userId } });
  console.log("\ncleanup done");
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
