/**
 * p24-p2-video-test.ts — تست‌های الزامی مرحله ۲۰/P2 (ویدئوهای حرکات).
 * اجرا: bun scripts/p24-p2-video-test.ts  (سرور dev روی :3000)
 *
 * قواعد ایمنی داده (طبق قرارداد پروژه):
 *  - فقط کاربران ایزوله با پیشوند p24test-* ساخته میشوند.
 *  - پاکسازی کامل فقط روی fixtureهای خود همین تست (کاسکید از user) —
 *    هیچ deleteMany سراسری. فایلهای storage فقط کلیدهای fixture پاک میشوند.
 *  - هیچ رکورد بانک عمومی تغییر نمیکند؛ رسانه بانک فقط روی یک رکورد core
 *    اضافه و در پایان حذف میشود (رفتار product واقعی ادمین).
 *
 * پوشش: آپلود معتبر/نامعتبر، سقف حجم سمت سرور، استریم + Range کامل
 * (206/416/HEAD)، دسترسی دانشجوی مجاز R2.1 (برنامه تحویلشده فعال)،
 * ضد-IDOR (دانشجوی بدون برنامه، مربی دیگر، دستکاری شناسه)، حذف رسانه،
 * سازگاری حرکات بدون ویدئو، قرارداد cex- و source، hasVideo غنیسازی،
 * رسانه بانک عمومی (فقط ادمین origin=core، سرو نشست‌دار، videoStatus
 * هرگز به کلاینت)، فایل مفقود روی storage، بدون دسترسی عمومی مهمان.
 */

import { PrismaClient } from "@prisma/client";
import { readFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";

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
const PASSWORD = "p24test-Pass1!";
const MP4_PATH = path.join(process.cwd(), "scratch", "p24", "sample.mp4");
const PNG_PATH = path.join(process.cwd(), "scratch", "p24", "sample.png");

const MP4 = new Uint8Array(readFileSync(MP4_PATH));
const PNG = new Uint8Array(readFileSync(PNG_PATH));

interface User {
  email: string;
  cookie: string;
  userId: string;
}

async function createUser(name: string, attempt = 0): Promise<User> {
  const email = `p24test-${name}-${stamp}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P24 ${name}` }),
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
  method: "GET" | "POST" | "PUT" | "DELETE" | "HEAD",
  path: string,
  body?: unknown,
  extraHeaders: Record<string, string> = {}
): Promise<{ status: number; json: Record<string, unknown>; raw: Response }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(user ? { cookie: user.cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...extraHeaders,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: Record<string, unknown> = {};
  if (method !== "HEAD") {
    const text = await res.text();
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      json = { _nonJson: text.slice(0, 80) };
    }
  }
  return { status: res.status, json, raw: res };
}

/** خواندن بایتها با هدر اختیاری (برای Range) */
async function fetchBytes(
  user: User | null,
  path: string,
  range?: string
): Promise<{ status: number; bytes: Uint8Array; headers: Headers }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      ...(user ? { cookie: user.cookie } : {}),
      ...(range ? { range } : {}),
    },
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  return { status: res.status, bytes: buf, headers: res.headers };
}

async function uploadMedia(
  user: User,
  exerciseId: string,
  file: { name: string; type: string; bytes: Uint8Array }
): Promise<{ status: number; json: Record<string, unknown> }> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file.bytes)], { type: file.type }), file.name);
  const res = await fetch(
    `${BASE}/api/coach/exercises/${encodeURIComponent(exerciseId)}/media`,
    { method: "POST", headers: { cookie: user.cookie }, body: form }
  );
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    json = {};
  }
  return { status: res.status, json };
}

async function makePremium(userId: string) {
  await db.studentSubscription.upsert({
    where: { userId },
    update: { tier: "PREMIUM", status: "active", expiresAt: null },
    create: { userId, tier: "PREMIUM", status: "active", source: "manual", note: "p24 fixture" },
  });
}

async function makeCoachVerified(user: User, name: string) {
  await db.user.update({ where: { id: user.userId }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: {
      userId: user.userId,
      displayName: `P24 Coach ${name}`,
      headline: "تست P2",
      bio: "پروفایل آزمایشی تستهای P2 — کافی برای ساخت و ارسال برنامه.",
      specializationsJson: JSON.stringify(["strength"]),
      cooperationTypesJson: JSON.stringify(["PRIVATE", "SEMI_PRIVATE"]),
      verified: true,
      published: true,
    },
  });
}

async function createActiveConnection(student: User, coach: User): Promise<string> {
  await makePremium(student.userId);
  const sent = await api(student, "POST", "/api/coach-connections", {
    coachId: coach.userId,
    cooperationType: "PRIVATE",
    message: "p24 fixture",
  });
  const connectionId = (sent.json.connection as { id?: string } | undefined)?.id;
  if (sent.status !== 201 || !connectionId) {
    const row = await db.coachStudentConnection.findFirst({
      where: { studentId: student.userId, coachId: coach.userId, status: "PENDING" },
    });
    if (!row) throw new Error(`connection create failed: ${sent.status}`);
    await api(coach, "POST", `/api/coach/requests/${row.id}/accept`);
    return row.id;
  }
  const accepted = await api(coach, "POST", `/api/coach/requests/${connectionId}/accept`);
  if (accepted.status !== 200) throw new Error(`accept failed: ${accepted.status}`);
  return connectionId;
}

async function cleanup(users: User[], coachExerciseIds: string[], bankMediaIds: string[]) {
  // رسانههای بانک fixture — فقط همین شناسهها
  for (const mediaId of bankMediaIds) {
    const row = await db.exerciseMedia.findUnique({ where: { id: mediaId }, select: { storagePath: true, exerciseId: true, kind: true } });
    if (row) {
      await db.exerciseMedia.delete({ where: { id: mediaId } });
      const abs = path.join(process.cwd(), "data", "uploads", row.storagePath);
      try {
        if (existsSync(abs)) unlinkSync(abs);
      } catch { /* idempotent */ }
      const remaining = await db.exerciseMedia.count({ where: { exerciseId: row.exerciseId, kind: "video" } });
      if (remaining === 0 && row.kind === "video") {
        await db.exercise.updateMany({
          where: { id: row.exerciseId, videoStatus: "uploaded" },
          data: { videoStatus: "none" },
        });
      }
    }
  }
  // رسانههای شخصی + حرکات fixture
  const exercises = await db.coachExercise.findMany({
    where: { id: { in: coachExerciseIds } },
    select: { id: true, media: { select: { storagePath: true } } },
  });
  for (const ex of exercises) {
    await db.coachExercise.delete({ where: { id: ex.id } }).catch(() => undefined);
    for (const m of ex.media) {
      const abs = path.join(process.cwd(), "data", "uploads", m.storagePath);
      try {
        if (existsSync(abs)) unlinkSync(abs);
      } catch { /* idempotent */ }
    }
  }
  // کاربران — کاسکید از user
  for (const u of users) {
    await db.coachProfile.deleteMany({ where: { userId: u.userId } });
    await db.studentSubscription.deleteMany({ where: { userId: u.userId } });
    await db.assistantConversation.deleteMany({ where: { userId: u.userId } });
    await db.notification.deleteMany({ where: { userId: u.userId } });
    await db.session.deleteMany({ where: { userId: u.userId } });
    await db.account.deleteMany({ where: { userId: u.userId } });
    await db.fitnessProfile.deleteMany({ where: { userId: u.userId } });
    await db.user.delete({ where: { id: u.userId } }).catch(() => undefined);
  }
}

async function main() {
  console.log("\n──── P2 — زیرساخت ویدئوهای حرکات ────\n");

  // ---------- فیکسچرها ----------
  const coachA = await createUser("coachA");
  const coachB = await createUser("coachB");
  const studentA = await createUser("studentA");
  const studentB = await createUser("studentB");
  const admin = await createUser("admin");
  await db.user.update({ where: { id: admin.userId }, data: { role: "ADMIN" } });
  await makeCoachVerified(coachA, "A");
  await makeCoachVerified(coachB, "B");
  ok("فیکسچر: ۵ کاربر ایزوله", true, "coachA/coachB/studentA/studentB/admin");

  const coachExerciseIds: string[] = [];
  const bankMediaIds: string[] = [];
  const users = [coachA, coachB, studentA, studentB, admin];

  try {
    // ---------- ۱) آپلود و اعتبارسنجی ----------
    console.log("\n── ۱) آپلود و اعتبارسنجی فایل ──");
    const created = await api(coachA, "POST", "/api/coach/exercises", {
      faName: "حرکت تست P2",
      enName: "P2 Test Move",
      category: "chest",
      equipment: ["dumbbell"],
      primaryMuscles: ["chest"],
      secondaryMuscles: [],
      description: "تست",
      tips: "",
    });
    const exA = (created.json.exercise as { id?: string } | undefined)?.id;
    ok("ساخت حرکت شخصی مربی A", created.status === 201 && !!exA, `status=${created.status}`);
    if (!exA) throw new Error("exercise create failed");
    coachExerciseIds.push(exA);

    const upVid = await uploadMedia(coachA, exA, { name: "form.mp4", type: "video/mp4", bytes: MP4 });
    const upVidMedia = (upVid.json.media as { id?: string; kind?: string } | undefined) ?? {};
    ok("آپلود ویدئوی MP4 معتبر → 201 با kind=video", upVid.status === 201 && upVidMedia.kind === "video", `status=${upVid.status}`);
    const mediaId = upVidMedia.id;
    if (!mediaId) throw new Error("video media id missing");

    const upFake = await uploadMedia(coachA, exA, { name: "fake.mp4", type: "video/mp4", bytes: PNG });
    ok("فایل با پسوند جعلی (PNG به نام mp4) → 415", upFake.status === 415, `status=${upFake.status}`);

    const upEmpty = await uploadMedia(coachA, exA, { name: "empty.mp4", type: "video/mp4", bytes: new Uint8Array(0) });
    ok("فایل خالی → 422", upEmpty.status === 422, `status=${upEmpty.status}`);

    // سقف حجم سمت سرور — ویدئوی بزرگتر از ۵۰MB (۵۰MB+۱ بایت با امضای معتبر)
    const oversize = new Uint8Array(50 * 1024 * 1024 + 1);
    oversize.set(MP4.subarray(0, Math.min(MP4.length, oversize.length)));
    const upBig = await uploadMedia(coachA, exA, { name: "big.mp4", type: "video/mp4", bytes: oversize });
    ok("فایل بزرگتر از سقف ۵۰MB → 413 (سمت سرور)", upBig.status === 413, `status=${upBig.status}`);

    const upOther = await uploadMedia(coachB, exA, { name: "x.mp4", type: "video/mp4", bytes: MP4 });
    ok("آپلود روی حرکت مربی دیگر → 404", upOther.status === 404, `status=${upOther.status}`);

    // ---------- ۲) استریم + Range + HEAD ----------
    console.log("\n── ۲) استریم و Range (R2.0) ──");
    const list = await api(coachA, "GET", `/api/coach/exercises/${exA}/media`);
    const listMedia = (list.json.media as { id?: string }[] | undefined) ?? [];
    ok("GET فهرست رسانه مربی مالک", list.status === 200 && listMedia.some((m) => m.id === mediaId), `status=${list.status}`);

    const full = await fetchBytes(coachA, `/api/coach/exercises/media/${mediaId}`);
    ok("GET کامل → 200 با اندازه درست", full.status === 200 && full.bytes.length === MP4.length, `status=${full.status} len=${full.bytes.length}/${MP4.length}`);
    ok("هدر Accept-Ranges: bytes", full.headers.get("accept-ranges") === "bytes");
    ok("بایت اول MP4 (امضای ftyp)", full.bytes[4] === 0x66 && full.bytes[5] === 0x74);

    const r1 = await fetchBytes(coachA, `/api/coach/exercises/media/${mediaId}`, "bytes=0-1023");
    ok("Range 0-1023 → 206 با ۱۰۲۴ بایت", r1.status === 206 && r1.bytes.length === 1024, `status=${r1.status} len=${r1.bytes.length}`);
    ok(
      "Content-Range صحیح",
      r1.headers.get("content-range") === `bytes 0-1023/${MP4.length}`,
      r1.headers.get("content-range") ?? "-"
    );
    ok("بایتهای بازه = بایتهای فایل کامل", r1.bytes.every((b, i) => b === full.bytes[i]));

    const r2 = await fetchBytes(coachA, `/api/coach/exercises/media/${mediaId}`, "bytes=10-");
    ok("بازه باز bytes=10- → 206 تا انتها", r2.status === 206 && r2.bytes.length === MP4.length - 10, `len=${r2.bytes.length}`);

    const r3 = await fetchBytes(coachA, `/api/coach/exercises/media/${mediaId}`, "bytes=-100");
    ok("suffix bytes=-100 → 206 صد بایت آخر", r3.status === 206 && r3.bytes.length === 100 && r3.bytes.every((b, i) => b === full.bytes[MP4.length - 100 + i]), `len=${r3.bytes.length}`);

    const r4 = await fetchBytes(coachA, `/api/coach/exercises/media/${mediaId}`, `bytes=${MP4.length}-`);
    ok("شروع خارج از فایل → 416 با bytes */total", r4.status === 416 && r4.headers.get("content-range") === `bytes */${MP4.length}`, `status=${r4.status}`);

    const r5 = await fetchBytes(coachA, `/api/coach/exercises/media/${mediaId}`, "bytes=abc");
    ok("Range خراب → نادیده (200 کامل)", r5.status === 200 && r5.bytes.length === MP4.length, `status=${r5.status}`);

    const head = await fetch(`${BASE}/api/coach/exercises/media/${mediaId}`, {
      method: "HEAD",
      headers: { cookie: coachA.cookie },
    });
    const headBody = new Uint8Array(await head.arrayBuffer());
    ok("HEAD → 200 بدون بدنه با Content-Length", head.status === 200 && headBody.length === 0 && head.headers.get("content-length") === String(MP4.length), `status=${head.status} cl=${head.headers.get("content-length")}`);

    // ---------- ۳) مجوزها و ضد-IDOR ----------
    console.log("\n── ۳) مجوزها و ضد-IDOR ──");
    const anon = await fetchBytes(null, `/api/coach/exercises/media/${mediaId}`);
    ok("مهمان → 401 (هیچ فایلی عمومی نیست)", anon.status === 401, `status=${anon.status}`);

    const otherCoach = await fetchBytes(coachB, `/api/coach/exercises/media/${mediaId}`);
    ok("مربی دیگر → 404", otherCoach.status === 404, `status=${otherCoach.status}`);

    const noDeliveryStudent = await fetchBytes(studentB, `/api/coach/exercises/media/${mediaId}`);
    ok("دانشجوی بدون برنامه → 404 (R2.1)", noDeliveryStudent.status === 404, `status=${noDeliveryStudent.status}`);

    const tampered = await fetchBytes(coachA, `/api/coach/exercises/media/cuid-jamed-12345`);
    ok("شناسه دستکاری‌شده → 404", tampered.status === 404, `status=${tampered.status}`);

    const adminRead = await fetchBytes(admin, `/api/coach/exercises/media/${mediaId}`);
    ok("ادمین دسترسی ویژه به رسانه مربی ندارد → 404 (معماری فعلی)", adminRead.status === 404, `status=${adminRead.status}`);

    const delByStudent = await api(studentA, "DELETE", `/api/coach/exercises/media/${mediaId}`);
    ok("حذف رسانه توسط دانشجو → 403", delByStudent.status === 403, `status=${delByStudent.status}`);
    const delByOtherCoach = await api(coachB, "DELETE", `/api/coach/exercises/media/${mediaId}`);
    ok("حذف رسانه توسط مربی دیگر → 404", delByOtherCoach.status === 404, `status=${delByOtherCoach.status}`);

    // ---------- ۴) دانشجوی مجاز (R2.1) ----------
    console.log("\n── ۴) دسترسی دانشجوی مجاز و hasVideo ──");
    const connectionId = await createActiveConnection(studentA, coachA);

    // حرکت دوم بدون ویدئو — سازگاری
    const created2 = await api(coachA, "POST", "/api/coach/exercises", {
      faName: "حرکت بدون ویدئو",
      enName: "No Video Move",
      category: "back",
      equipment: [],
      primaryMuscles: ["back"],
      secondaryMuscles: [],
      description: "",
      tips: "",
    });
    const exB = (created2.json.exercise as { id?: string } | undefined)?.id;
    ok("ساخت حرکت دوم (بدون ویدئو)", created2.status === 201 && !!exB, `status=${created2.status}`);
    if (!exB) throw new Error("exercise2 create failed");
    coachExerciseIds.push(exB);

    // برنامه با هر دو حرکت شخصی (قرارداد cex-) + یک عمومی
    const plan = await api(coachA, "POST", "/api/coach/workout-plans", {
      title: "برنامه P2",
      description: "",
      goal: "strength",
      difficulty: "intermediate",
      durationMinutes: 45,
      days: [
        {
          title: "روز یک",
          exercises: [
            { exerciseId: `cex-${exA}`, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60, note: null, suggestedWeightKg: null, source: "personal" },
            { exerciseId: `cex-${exB}`, sets: 3, repsMin: 8, repsMax: 12, restSeconds: 60, note: null, suggestedWeightKg: null, source: "personal" },
            { exerciseId: "plank", sets: 3, repsMin: 30, repsMax: 45, restSeconds: 60, note: null, suggestedWeightKg: null, source: "public" },
          ],
        },
      ],
    });
    const planId = (plan.json.plan as { id?: string } | undefined)?.id;
    ok("ساخت برنامه با cex- + عمومی (رگرسیون P0/P1)", plan.status === 201 && !!planId, `status=${plan.status}`);
    if (!planId) throw new Error("plan create failed");

    const pub = await api(coachA, "POST", `/api/coach/workout-plans/${planId}/publish`, { connectionId });
    const deliveryId = (pub.json.delivery as { id?: string } | undefined)?.id;
    ok("ارسال برنامه به دانشجوی متصل", pub.status === 201 && !!deliveryId, `status=${pub.status}`);
    if (!deliveryId) throw new Error("publish failed");

    const stuMedia = await api(studentA, "GET", `/api/coach/exercises/${exA}/media`);
    const stuMediaList = (stuMedia.json.media as { id?: string }[] | undefined) ?? [];
    ok("دانشجوی مجاز → فهرست رسانه 200 (R2.1)", stuMedia.status === 200 && stuMediaList.some((m) => m.id === mediaId), `status=${stuMedia.status}`);

    const stuBytes = await fetchBytes(studentA, `/api/coach/exercises/media/${mediaId}`, "bytes=0-99");
    ok("دانشجوی مجاز → استریم 206", stuBytes.status === 206 && stuBytes.bytes.length === 100, `status=${stuBytes.status}`);

    const stuBBytes = await fetchBytes(studentB, `/api/coach/exercises/media/${mediaId}`);
    ok("دانشجوی بیبرنامه همچنان 404", stuBBytes.status === 404, `status=${stuBBytes.status}`);

    // جزئیات تحویل — hasVideo فقط برای حرکت ویدئودار
    const detail = await api(studentA, "GET", `/api/coach-plans/${deliveryId}`);
    const detailContent = (detail.json.delivery as { content?: { days?: { exercises?: { exerciseId?: string; source?: string; hasVideo?: boolean }[] }[] } } | undefined)?.content;
    const rows = detailContent?.days?.[0]?.exercises ?? [];
    const rowA = rows.find((r) => r.exerciseId === exA);
    const rowB = rows.find((r) => r.exerciseId === exB);
    const rowPub = rows.find((r) => r.exerciseId === "plank");
    ok("ردیف شخصی ویدئودار → hasVideo=true", rowA?.source === "personal" && rowA?.hasVideo === true, JSON.stringify(rowA)?.slice(0, 120));
    ok("ردیف شخصی بدون ویدئو → hasVideo تعریفنشده", rowB?.source === "personal" && rowB?.hasVideo !== true, JSON.stringify(rowB)?.slice(0, 120));
    ok("ردیف عمومی → بدون hasVideo و source=public", rowPub?.source === "public" && rowPub?.hasVideo !== true);
    ok("snapshot حفظ: exerciseId شخصی خام (بدون cex-)", rows.some((r) => r.exerciseId === exA));

    // پیش‌نمایش مربی هم hasVideo میگیرد
    const coachDetail = await api(coachA, "GET", `/api/coach/workout-plans/${planId}`);
    const coachRows = ((coachDetail.json.plan as { content?: { days?: { exercises?: { exerciseId?: string; hasVideo?: boolean }[] }[] } } | undefined)?.content?.days?.[0]?.exercises) ?? [];
    ok("پیش‌نمایش مربی → hasVideo=true روی همان ردیف", coachRows.find((r) => r.exerciseId === exA)?.hasVideo === true);

    // ---------- ۵) حذف نرم تحویل → قطع دسترسی ----------
    console.log("\n── ۵) حذف نرم برنامه → قطع دسترسی دانشجو ──");
    const softDel = await api(studentA, "DELETE", `/api/coach-plans/${deliveryId}`);
    if (softDel.status === 200 || softDel.status === 404) {
      // مسیر رسمی حذف نرم — پس از آن دانشجو نباید رسانه ببیند
      const afterDel = await fetchBytes(studentA, `/api/coach/exercises/media/${mediaId}`);
      ok("پس از حذف نرم توسط دانشجو → رسانه 404", afterDel.status === 404, `status=${afterDel.status}`);
      const afterDelList = await api(studentA, "GET", `/api/coach/exercises/${exA}/media`);
      ok("پس از حذف نرم → فهرست رسانه 404", afterDelList.status === 404, `status=${afterDelList.status}`);
      // بازگردانی برای ادامه تست‌ها
      await db.coachPlanDelivery.update({
        where: { id: deliveryId },
        data: { studentDeletedAt: null },
      });
    } else {
      ok("حذف نرم تحویل در دسترس است", false, `status=${softDel.status}`);
    }

    // ---------- ۶) فایل مفقود روی storage ----------
    console.log("\n── ۶) فایل مفقود روی storage ──");
    const mediaRow = await db.coachExerciseMedia.findUnique({ where: { id: mediaId }, select: { storagePath: true } });
    if (!mediaRow) throw new Error("media row missing");
    const absPath = path.join(process.cwd(), "data", "uploads", mediaRow.storagePath);
    ok("فایل واقعاً خارج از public در data/uploads ذخیره شده", existsSync(absPath) && absPath.includes(path.join("data", "uploads")), absPath);
    ok("کلید storage namespace دار (coach-exercises/…)", mediaRow.storagePath.startsWith("coach-exercises/"), mediaRow.storagePath);
    unlinkSync(absPath);
    const missing = await fetchBytes(coachA, `/api/coach/exercises/media/${mediaId}`);
    ok("فایل حذفشده → 404 امن (بدون 500)", missing.status === 404, `status=${missing.status}`);

    // ---------- ۷) رسانه بانک عمومی (R2.3) ----------
    console.log("\n── ۷) رسانه بانک عمومی (فقط ادمین، origin=core) ──");
    const bankSearch = await api(admin, "GET", "/api/exercises?scope=search&q=plank&pageSize=5");
    const bankItems = (bankSearch.json.items as { id?: string; origin?: string }[] | undefined) ?? [];
    const bankTarget = bankItems[0]?.id;
    ok("بانک عمومی در دسترس (جست‌وجو)", bankSearch.status === 200 && !!bankTarget, `status=${bankSearch.status} n=${bankItems.length}`);
    if (!bankTarget) throw new Error("bank target missing");

    const bankByCoach = await fetch(`${BASE}/api/admin/exercises/${encodeURIComponent(bankTarget)}/media`, {
      method: "POST",
      headers: { cookie: coachA.cookie, "Content-Type": "application/json" },
      body: "{}",
    });
    ok("آپلود رسانه بانک توسط مربی → 403", bankByCoach.status === 403, `status=${bankByCoach.status}`);

    const bankByAdmin = await (async () => {
      const form = new FormData();
      form.append("file", new Blob([new Uint8Array(MP4)], { type: "video/mp4" }), "bank-form.mp4");
      const res = await fetch(`${BASE}/api/admin/exercises/${encodeURIComponent(bankTarget)}/media`, {
        method: "POST",
        headers: { cookie: admin.cookie },
        body: form,
      });
      return { status: res.status, body: (await res.json().catch(() => ({}))) as { media?: { id?: string; kind?: string } } };
    })();
    const bankMediaId = bankByAdmin.body.media?.id;
    ok("آپلود ویدئو روی رکورد core توسط ادمین → 201", bankByAdmin.status === 201 && !!bankMediaId, `status=${bankByAdmin.status}`);
    if (bankMediaId) bankMediaIds.push(bankMediaId);
    ok("پاسخ آپلود بدون نشت videoStatus/storagePath", !("videoStatus" in bankByAdmin.body) && !("storagePath" in (bankByAdmin.body.media ?? {})));

    // videoStatus داخلی آپدیت شده اما در هیچ پاسخی نیست
    const bankRow = await db.exercise.findUnique({ where: { id: bankTarget }, select: { videoStatus: true } });
    ok("videoStatus رکورد = uploaded (فقط داخلی)", bankRow?.videoStatus === "uploaded", bankRow?.videoStatus ?? "-");
    const bankDetail = await api(studentA, "GET", `/api/exercises/${bankTarget}`);
    const detailStr = JSON.stringify(bankDetail.json);
    ok("جزئیات بانک: media دارد اما videoStatus هرگز به کلاینت نمیرسد", bankDetail.status === 200 && detailStr.includes('"media"') && !detailStr.includes("videoStatus"), `hasMedia=${detailStr.includes('"media"')}`);

    const bankBytesAnon = await fetchBytes(null, `/api/exercises/${bankTarget}/media/${bankMediaId}`);
    ok("رسانه بانک برای مهمان → 401", bankBytesAnon.status === 401, `status=${bankBytesAnon.status}`);

    const bankBytesStu = await fetchBytes(studentA, `/api/exercises/${bankTarget}/media/${bankMediaId}`, "bytes=0-499");
    ok("رسانه بانک برای کاربر واردشده → 206 (قاعده دید بانک)", bankBytesStu.status === 206 && bankBytesStu.bytes.length === 500, `status=${bankBytesStu.status}`);

    const bankListAnon = await api(null, "GET", `/api/exercises/${bankTarget}/media`);
    ok("فهرست رسانه بانک برای مهمان → 401", bankListAnon.status === 401, `status=${bankListAnon.status}`);

    const bankMissing = await fetchBytes(admin, `/api/exercises/${bankTarget}/media/not-a-real-media-id`);
    ok("رسانه بانک ناموجود → 404", bankMissing.status === 404, `status=${bankMissing.status}`);

    // ---------- ۸) رگرسیون بانک و کتابخانه ----------
    console.log("\n── ۸) رگرسیون ──");
    const bankIndex = await api(coachA, "GET", "/api/exercises?scope=index");
    const bankCount = (bankIndex.json.items as unknown[] | undefined)?.length ?? 0;
    ok("بانک ۹۰۵ حرکتی دست‌نخورده", bankIndex.status === 200 && bankCount >= 900, `count=${bankCount}`);

    const myLibrary = await api(coachA, "GET", "/api/coach/exercises");
    ok("کتابخانه شخصی مربی سالم (رگرسیون P1)", myLibrary.status === 200 && Array.isArray(myLibrary.json.exercises));

    const planResave = await api(coachA, "PUT", `/api/coach/workout-plans/${planId}`, {
      title: "برنامه P2 ویرایش",
      description: "",
      goal: "strength",
      difficulty: "intermediate",
      durationMinutes: 45,
      days: [
        {
          title: "روز یک",
          exercises: [
            { exerciseId: `cex-${exA}`, sets: 4, repsMin: 8, repsMax: 12, restSeconds: 60, note: null, suggestedWeightKg: null, source: "personal" },
          ],
        },
      ],
    });
    ok("ویرایش مجدد برنامه با cex- (رگرسیون P0 re-save)", planResave.status === 200, `status=${planResave.status}`);
  } finally {
    // ---------- پاکسازی ----------
    console.log("\n── پاکسازی fixture ──");
    await cleanup(users, coachExerciseIds, bankMediaIds);
    const integrity = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
    const exCount = await db.coachExercise.count();
    const mediaCount = await db.coachExerciseMedia.count();
    const bankMediaCount = await db.exerciseMedia.count();
    ok("integrity_check = ok", integrity[0]?.integrity_check === "ok");
    ok("هیچ رسانهای از fixture باقی نماند", mediaCount === 0 && bankMediaCount === 0, `coach=${mediaCount} bank=${bankMediaCount}`);
    ok("حرکات شخصی fixture پاک شد", exCount === 0, `count=${exCount}`);
    await db.$disconnect();
  }

  console.log(`\n${passed}/${passed + failed} checks passed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
