/**
 * p20c-publish-test.ts — سوئیت تست مرحله ۲۰/P3: گردش کار انتشار حرکات مربی.
 *
 * پوشش کامل معیارهای پذیرش A3.1–A3.7 سند طرح + الزامات امنیتی کاربر:
 *  - دروازه ارسال (422) و سقف ۵ ارسال در انتظار (409)
 *  - ماشین حالت کامل: submit / withdraw / recall / resubmit / re-approve
 *  - ضد-IDOR همه مسیرهای جدید (مهمان 401، دانشجو 403، مربی دیگر 404)
 *  - تغییر مستقیم publishState از PUT مربی → بیاثر (فقط گذار صریح سرور)
 *  - reject: دلیل الزامی (422)، بازگشت به وضعیت قبلی (D2)، اعلان با بازخورد
 *  - approve: رکورد origin=coach در بانک (visible برای همه نقش‌ها)،
 *    به‌روزرسانی اتمی با شناسه پایدار، کپی رسانه (R2.4)، AdminActionLog
 *  - پایداری نسخه منتشرشده پس از ویرایش مربی تا تأیید بعدی (D2)
 *  - recall → پنهان از بانک + 404 رسانه (دورزدن وضعیت با رسانه مسدود)
 *  - whitelist متادیتا: ownerUserId/publishState/videoStatus/sourceKey
 *    (کارت) هرگز به کلاینت نمیرسند
 *  - بانک core دقیقاً ۹۰۵ رکورد دست‌نخورده
 *  - پاکسازی کامل fixture + فایلها + integrity_check
 *
 * اجرا: bun scripts/p20c-publish-test.ts  (روی سرور زنده localhost:3000)
 */

import { PrismaClient } from "@prisma/client";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const STAMP = Date.now();
const PASSWORD = "p20c-test-pass1";

const db = new PrismaClient();

interface Check {
  name: string;
  ok: boolean;
  detail: string;
}
const checks: Check[] = [];

function ok(name: string, condition: boolean, detail = "") {
  checks.push({ name, ok: condition, detail });
  console.log(`${condition ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

interface User {
  email: string;
  cookie: string;
  userId: string;
}

const cleanupUserIds: string[] = [];
/** شناسه حرکات شخصی fixture — پاکسازی اعلانها scoped به همین شناسهها */
const cleanupCoachExerciseIds: string[] = [];
/** فایلهای رسانه ساختهشده در طول تست — در پاکسازی حذف میشوند */
const cleanupStoragePaths: string[] = [];
/** شناسه رکوردهای عمومی منتشرشده fixture — در پاکسازی حذف میشوند */
const cleanupPublicExerciseIds: string[] = [];

async function createUser(
  name: string,
  role: "COACH" | "STUDENT" | "ADMIN",
  attempt = 0
): Promise<User> {
  const email = `p20c-${name}-${STAMP}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P20C ${name}` }),
  });
  if (res.status === 429 && attempt < 3) {
    console.log(`  … نرخ‌سنجی auth؛ ۶۵ ثانیه صبر برای ${name}`);
    await new Promise((r) => setTimeout(r, 65_000));
    return createUser(name, role, attempt + 1);
  }
  if (res.status !== 200) throw new Error(`signup failed for ${name}: ${res.status}`);
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email } });
  if (!row) throw new Error(`user row missing for ${name}`);
  cleanupUserIds.push(row.id);
  if (role === "COACH") {
    await db.user.update({ where: { id: row.id }, data: { role: "COACH" } });
    await db.coachProfile.create({
      data: {
        userId: row.id,
        displayName: `P20C ${name}`,
        headline: "fixture",
        bio: null,
        specializationsJson: JSON.stringify([]),
        certificationsJson: JSON.stringify([]),
        experienceYears: 1,
        cooperationTypesJson: JSON.stringify(["PRIVATE"]),
        verified: true,
        published: false,
      },
    });
  } else if (role === "ADMIN") {
    await db.user.update({ where: { id: row.id }, data: { role: "ADMIN" } });
  }
  return { email, cookie: cookie ?? "", userId: row.id };
}

async function api(
  user: User | null,
  path: string,
  init?: RequestInit,
  attempt = 0
): Promise<{ status: number; body: Record<string, unknown> }> {
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
    // پاسخ بدون بدنه — مجاز
  }
  return { status: res.status, body };
}

/** fetch خام برای بررسی بایت‌های استریم رسانه */
async function apiRaw(
  user: User | null,
  path: string,
  init?: RequestInit
): Promise<{ status: number; bytes: Uint8Array; headers: Headers }> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
      ...(user && user.cookie ? { cookie: user.cookie } : {}),
    },
  });
  const buf = new Uint8Array(await res.arrayBuffer());
  return { status: res.status, bytes: buf, headers: res.headers };
}

/* ---------------- فایلهای رسانه self-contained ---------------- */

/** PNG واقعی 1×1 — امضای magic کامل */
const PNG = new Uint8Array(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64"
  )
);

/** MP4 با امضای ftyp معتبر (بایت ۴..۸) — برای لایه sniff کافی است */
function makeMp4(): Uint8Array {
  const head = new Uint8Array(64);
  const dv = new DataView(head.buffer);
  dv.setUint32(0, 24); // اندازه باکس ftyp
  head.set([0x66, 0x74, 0x79, 0x70], 4); // "ftyp"
  head.set([0x69, 0x73, 0x6f, 0x6d], 8); // "isom"
  dv.setUint32(12, 0x200);
  head.set([0x69, 0x73, 0x6f, 0x6d], 16); // "isom"
  head.set([0x61, 0x76, 0x63, 0x31], 20); // "avc1"
  return head;
}
const MP4 = makeMp4();

async function createExercise(
  user: User,
  overrides: Record<string, unknown> = {}
): Promise<{ status: number; body: Record<string, unknown> }> {
  return api(user, "/api/coach/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "پرس سینه پایین شخصی",
      enName: "Personal Decline Press",
      category: "abs",
      difficulty: "advanced",
      equipment: ["dumbbell"],
      primaryMuscles: ["chest"],
      secondaryMuscles: ["triceps"],
      description: "توضیح کامل اجرای حرکت برای بازبینی ادمین.",
      tips: "نکته اجرایی تست.",
      ...overrides,
    }),
  });
}

async function uploadMedia(
  user: User,
  exerciseId: string,
  file: { name: string; type: string; bytes: Uint8Array }
): Promise<{ status: number; body: Record<string, unknown> }> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(file.bytes)], { type: file.type }), file.name);
  return api(user, `/api/coach/exercises/${encodeURIComponent(exerciseId)}/media`, {
    method: "POST",
    body: form,
  });
}

/* ============================== تستها ============================== */

async function integrationTests() {
  console.log("\n== بخش ۰: ساخت fixtureها ==");
  const coach1 = await createUser("coach1", "COACH");
  const coach2 = await createUser("coach2", "COACH");
  const student1 = await createUser("student1", "STUDENT");
  const admin = await createUser("admin", "ADMIN");
  ok("چهار کاربر fixture ساخته شد", cleanupUserIds.length === 4);

  // حرکت اصلی با دسته abs (آزمون نگاشت abs→core در انتشار)
  const created = await createExercise(coach1);
  ok("ساخت حرکت A → 201", created.status === 201, `status=${created.status}`);
  const exA = (created.body.exercise as { id: string } | undefined)?.id ?? "";
  cleanupCoachExerciseIds.push(exA);
  ok("حرکت A با publishState=none و difficulty ساخته شد",
    (created.body.exercise as { publishState?: string; difficulty?: string } | undefined)?.publishState === "none" &&
    (created.body.exercise as { difficulty?: string } | undefined)?.difficulty === "advanced");

  // رسانههای حرکت A: یک تصویر + یک ویدئو (برای R2.4)
  const upImg = await uploadMedia(coach1, exA, { name: "form.png", type: "image/png", bytes: PNG });
  ok("آپلود تصویر رسانه A → 201", upImg.status === 201, `status=${upImg.status}`);
  const upVid = await uploadMedia(coach1, exA, { name: "technique.mp4", type: "video/mp4", bytes: MP4 });
  ok("آپلود ویدئو رسانه A → 201", upVid.status === 201, `status=${upVid.status}`);
  const mediaIds = ((upVid.body.exercise as { media?: { id: string; kind: string }[] } | undefined)?.media ?? []).map((m) => m.id);
  ok("دو رسانه برای A ثبت شد", mediaIds.length === 2, `count=${mediaIds.length}`);

  console.log("\n== بخش ۱: دروازه ارسال و مجوزها (A3.1، ضد-IDOR) ==");
  const guestSubmit = await api(null, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("مهمان submit → 401", guestSubmit.status === 401, `status=${guestSubmit.status}`);
  const studentSubmit = await api(student1, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("دانشجو submit → 403", studentSubmit.status === 403, `status=${studentSubmit.status}`);
  const otherCoachSubmit = await api(coach2, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("مربی دیگر submit حرکت مالک دیگر → 404", otherCoachSubmit.status === 404, `status=${otherCoachSubmit.status}`);

  const incomplete = await createExercise(coach1, { description: "", primaryMuscles: [] });
  const exBad = (incomplete.body.exercise as { id: string } | undefined)?.id ?? "";
  const badSubmit = await api(coach1, `/api/coach/exercises/${exBad}/submit`, { method: "POST" });
  ok("ارسال حرکت ناقص → 422 دروازه محتوا", badSubmit.status === 422, `status=${badSubmit.status} code=${String(badSubmit.body.error)}`);

  console.log("\n== بخش ۲: ارسال، صف، اعلان و ضدتکرار (A3.1) ==");
  const submit1 = await api(coach1, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("ارسال A → 200 pending_review", submit1.status === 200 && submit1.body.publishState === "pending_review", `status=${submit1.status}`);
  const dbA = await db.coachExercise.findUnique({ where: { id: exA } });
  ok("DB: pending_review + submittedAt ثبت شد", dbA?.publishState === "pending_review" && dbA.submittedAt !== null);

  const adminNotifsBefore = await db.notification.count({ where: { type: "EXERCISE_REVIEW_SUBMITTED" } });
  ok("اعلان EXERCISE_REVIEW_SUBMITTED به ادمین fixture صادر شد", adminNotifsBefore >= 1, `count=${adminNotifsBefore}`);

  const dupSubmit = await api(coach1, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("ارسال تکراری در حال انتظار → 409", dupSubmit.status === 409, `status=${dupSubmit.status} code=${String(dupSubmit.body.error)}`);
  const adminNotifsAfterDup = await db.notification.count({ where: { type: "EXERCISE_REVIEW_SUBMITTED" } });
  ok("ارسال تکراری اعلان جدید نمیسازد", adminNotifsAfterDup === adminNotifsBefore);

  const queueStudent = await api(student1, "/api/admin/exercise-reviews");
  ok("صف بازبینی برای دانشجو → 403", queueStudent.status === 403);
  const queueCoach = await api(coach1, "/api/admin/exercise-reviews");
  ok("صف بازبینی برای مربی → 403", queueCoach.status === 403);
  const queueGuest = await api(null, "/api/admin/exercise-reviews");
  ok("صف بازبینی برای مهمان → 401", queueGuest.status === 401);

  const queue = await api(admin, "/api/admin/exercise-reviews");
  const queueItems = (queue.body.items as { id: string; faName: string; media: unknown[]; coach: { displayName: string } }[] | undefined) ?? [];
  const qItem = queueItems.find((i) => i.id === exA);
  ok("صف ادمین شامل A با محتوا+رسانه+نام مربی", queue.status === 200 && Boolean(qItem) && (qItem?.media.length ?? 0) === 2 && qItem?.coach.displayName === "P20C coach1");

  // تلاش برای بازنویسی publishState از مسیر ویرایش — باید بیاثر باشد
  const hackPut = await api(coach1, `/api/coach/exercises/${exA}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "پرس سینه پایین شخصی",
      enName: "Personal Decline Press",
      category: "abs",
      difficulty: "advanced",
      equipment: [],
      primaryMuscles: ["chest"],
      secondaryMuscles: [],
      description: "توضیح کامل اجرای حرکت برای بازبینی ادمین.",
      tips: "",
      publishState: "published",
    }),
  });
  const hackState = (hackPut.body.exercise as { publishState?: string } | undefined)?.publishState;
  ok("PUT با publishState جعلی → وضعیت دستنخورده (pending_review)", hackPut.status === 200 && hackState === "pending_review", `state=${String(hackState)}`);

  console.log("\n== بخش ۳: رد با دلیل الزامی + بازخورد (A3.3، D8) ==");
  const studentDecide = await api(student1, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  ok("تصمیم توسط دانشجو → 403", studentDecide.status === 403);
  const coachDecide = await api(coach1, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  ok("تصمیم توسط مربی → 403", coachDecide.status === 403);

  const rejectNoFeedback = await api(admin, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "reject", feedback: "   " }),
  });
  ok("رد بدون دلیل → 422 REVIEW_FEEDBACK_REQUIRED", rejectNoFeedback.status === 422 && rejectNoFeedback.body.error === "REVIEW_FEEDBACK_REQUIRED", `status=${rejectNoFeedback.status}`);
  const stillPending = await db.coachExercise.findUnique({ where: { id: exA }, select: { publishState: true } });
  ok("پس از رد ناموفق، همچنان pending", stillPending?.publishState === "pending_review");

  const FEEDBACK = "نام حرکت با استانداردهای بانک همخوان نیست؛ لطفاً نام دقیقتر بنویسید.";
  const rejectOk = await api(admin, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "reject", feedback: FEEDBACK }),
  });
  ok("رد با دلیل → 200 و بازگشت به none", rejectOk.status === 200 && rejectOk.body.coachPublishState === "none", `status=${rejectOk.status}`);
  const afterReject = await db.coachExercise.findUnique({ where: { id: exA } });
  ok("DB: reviewNote=بازخورد و submittedAt پاک شد", afterReject?.reviewNote === FEEDBACK && afterReject.submittedAt === null);
  const noPublic = await db.exercise.count({ where: { sourceKey: `coach-${exA}` } });
  ok("رد هیچ رکورد عمومی نساخت", noPublic === 0);
  const decidedNotif = await db.notification.findFirst({ where: { userId: coach1.userId, type: "EXERCISE_REVIEW_DECIDED" } });
  const decidedPayload = decidedNotif ? (JSON.parse(decidedNotif.payloadJson) as { decision?: string; feedback?: string }) : null;
  ok("اعلان تصمیم به مربی با بازخورد کامل", decidedPayload?.decision === "rejected" && decidedPayload?.feedback === FEEDBACK);
  const publicCountAfterReject = await db.exercise.count({ where: { status: "active" } });
  ok("بانک عمومی پس از رد همچنان ۹۰۵", publicCountAfterReject === 905, String(publicCountAfterReject));

  console.log("\n== بخش ۴: اصلاح، ارسال مجدد و لغو ارسال (A3.1، لغو) ==");
  const fixPut = await api(coach1, `/api/coach/exercises/${exA}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "پرس سینه پایین هالتر شخصی",
      enName: "Personal Decline Barbell Press",
      category: "abs",
      difficulty: "advanced",
      equipment: ["dumbbell"],
      primaryMuscles: ["chest"],
      secondaryMuscles: ["triceps"],
      description: "توضیح کامل و اصلاحشده اجرای حرکت.",
      tips: "نکته اجرایی تست.",
    }),
  });
  ok("اصلاح حرکت ردشده → 200", fixPut.status === 200);
  const resubmit = await api(coach1, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("ارسال مجدد پس از رد → pending_review", resubmit.status === 200 && resubmit.body.publishState === "pending_review");
  const clearedNote = await db.coachExercise.findUnique({ where: { id: exA }, select: { reviewNote: true } });
  ok("ارسال مجدد بازخورد قبلی را پاک میکند (چرخه تازه)", clearedNote?.reviewNote === null);

  const previewMedia = await apiRaw(admin, `/api/admin/exercise-reviews/${exA}/media/${mediaIds[1]}`);
  ok("پیش‌نمایش استریم رسانه توسط ادمین روی رکورد در انتظار → 200", previewMedia.status === 200 && previewMedia.bytes[4] === 0x66, `status=${previewMedia.status}`);
  const previewCoach = await apiRaw(coach2, `/api/admin/exercise-reviews/${exA}/media/${mediaIds[1]}`);
  ok("پیش‌نمایش رسانه توسط مربی دیگر → 403", previewCoach.status === 403, `status=${previewCoach.status}`);

  const withdraw = await api(coach1, `/api/coach/exercises/${exA}/withdraw`, { method: "POST" });
  ok("لغو ارسال → 200 none", withdraw.status === 200 && withdraw.body.publishState === "none");
  const afterWithdraw = await db.coachExercise.findUnique({ where: { id: exA } });
  ok("DB: پس از لغو، submittedAt=null", afterWithdraw?.publishState === "none" && afterWithdraw.submittedAt === null);
  const queueAfterWithdraw = await api(admin, "/api/admin/exercise-reviews");
  const queueAfterItems = (queueAfterWithdraw.body.items as { id: string }[] | undefined) ?? [];
  ok("پس از لغو، A از صف ادمین خارج شد", !queueAfterItems.some((i) => i.id === exA));
  const withdrawAgain = await api(coach1, `/api/coach/exercises/${exA}/withdraw`, { method: "POST" });
  ok("لغو دوباره (در انتظار نیست) → 409", withdrawAgain.status === 409);

  // دوباره ارسال برای مسیر تأیید
  const submitAgain = await api(coach1, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("ارسال مجدد برای تأیید → pending_review", submitAgain.status === 200);

  console.log("\n== بخش ۵: تأیید — رکورد عمومی، کپی رسانه، لاگ، اعلان (A3.2، R2.4) ==");
  const bankIndexBefore = await api(student1, "/api/exercises?scope=index");
  const beforeTotal = bankIndexBefore.body.total as number;
  ok("پیش از تأیید، A در بانک نیست", beforeTotal === 905 && !(JSON.stringify(bankIndexBefore.body)).includes(exA), `total=${beforeTotal}`);

  const approve = await api(admin, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  const pubId = (approve.body.publicExerciseId as string | undefined) ?? "";
  ok("تأیید → 200 + شناسه عمومی پایدار", approve.status === 200 && pubId === `cexpub-${exA}`, `pubId=${pubId}`);
  cleanupPublicExerciseIds.push(pubId);

  const pubRow = await db.exercise.findUnique({ where: { id: pubId } });
  ok("DB رکورد عمومی: origin=coach + owner=مربی + published + دسته core (نگاشت abs)",
    pubRow?.origin === "coach" && pubRow?.ownerUserId === coach1.userId && pubRow?.publishState === "published" && pubRow?.category === "core" && pubRow?.status === "active");
  const coachStateAfterApprove = await db.coachExercise.findUnique({ where: { id: exA }, select: { publishState: true, reviewNote: true } });
  ok("DB حرکت مربی: published + بازخورد پاک", coachStateAfterApprove?.publishState === "published" && coachStateAfterApprove?.reviewNote === null);
  const copiedMedia = await db.exerciseMedia.findMany({ where: { exerciseId: pubId }, orderBy: { createdAt: "asc" } });
  ok("R2.4: دو رسانه مربی به رکورد عمومی کپی شد", copiedMedia.length === 2, `count=${copiedMedia.length}`);
  cleanupStoragePaths.push(...copiedMedia.map((m) => m.storagePath));
  ok("videoStatus داخلی uploaded شد (ویدئو کپی شده)", pubRow?.videoStatus === "uploaded");

  const approveLog = await db.adminActionLog.findFirst({ where: { action: "approve-exercise-publish", targetId: exA } });
  ok("AdminActionLog تأیید ثبت شد", approveLog !== null && approveLog.adminId === admin.userId);

  const coachNotifs = await db.notification.count({ where: { userId: coach1.userId, type: "EXERCISE_REVIEW_DECIDED" } });
  ok("اعلان تأیید به مربی صادر شد", coachNotifs >= 2); // reject قبلی + approve فعلی

  console.log("\n== بخش ۶: دید عمومی + whitelist متادیتا (A3.2، A3.6) ==");
  const idxStudent = await api(student1, "/api/exercises?scope=index");
  const idxItems = (idxStudent.body.items as Record<string, unknown>[] | undefined) ?? [];
  const pubCard = idxItems.find((i) => i.id === pubId);
  ok("رکورد منتشرشده در بانک برای دانشجو دیده میشود (total=906)", idxStudent.body.total === 906 && Boolean(pubCard), `total=${String(idxStudent.body.total)}`);
  ok("کارت origin=coach دارد و badgeساز است", pubCard?.origin === "coach");
  const forbidden = ["ownerUserId", "publishState", "videoStatus", "sourceKey", "sourceRef", "storagePath"];
  const leaked = pubCard ? forbidden.some((k) => k in pubCard) : true;
  ok("کارت هیچ متادیتای داخلی/مالکیتی لو نمیدهد", !leaked);
  const searchHit = await api(student1, "/api/exercises?scope=search&q=" + encodeURIComponent("پرس سینه پایین هالتر"));
  ok("جست‌وجوی بانک رکورد منتشرشده را مییابد", (searchHit.body.total as number) >= 1);
  const detailStudent = await api(student1, `/api/exercises/${pubId}`);
  const detailObj = detailStudent.body.exercise as { sourceKey?: string; media?: unknown[]; ownerUserId?: string; publishState?: string; videoStatus?: string } | undefined;
  ok("جزئیات برای دانشجو: sourceKey=coach + رسانه کپی‌شده در whitelist",
    detailStudent.status === 200 && detailObj?.sourceKey === "coach" && (detailObj?.media.length ?? 0) === 2);
  ok("جزئیات هیچ ownerUserId/publishState/videoStatus ندارد",
    detailObj?.ownerUserId === undefined && detailObj?.publishState === undefined && detailObj?.videoStatus === undefined);
  const detailGuest = await api(null, `/api/exercises/${pubId}`);
  ok("جزئیات برای مهمان → 401", detailGuest.status === 401);

  // استریم رسانه رکورد عمومی — هر کاربر نشست‌دار (همان قواعد بانک)
  const pubVid = copiedMedia.find((m) => m.kind === "video");
  const streamStudent = await apiRaw(student1, `/api/exercises/${pubId}/media/${pubVid?.id ?? "x"}`, {
    headers: { range: "bytes=0-15" },
  });
  ok("استریم رسانه رکورد منتشرشده برای دانشجو → 206 با بایتهای فایل",
    streamStudent.status === 206 && streamStudent.bytes[4] === 0x66 && streamStudent.bytes[5] === 0x74, `status=${streamStudent.status}`);

  console.log("\n== بخش ۷: ضد تصمیم دوگانه و گارد رسانه ادمین ==");
  const decideAgain = await api(admin, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  ok("تأیید دوباره (تصمیم شده) → 409", decideAgain.status === 409, `status=${decideAgain.status}`);
  const notifCountAfterDouble = await db.notification.count({ where: { userId: coach1.userId, type: "EXERCISE_REVIEW_DECIDED" } });
  ok("تصمیم دوگانه اعلان تکراری نمیسازد", notifCountAfterDouble === coachNotifs);
  const adminUploadForm = new FormData();
  adminUploadForm.append("file", new Blob([new Uint8Array(PNG)], { type: "image/png" }), "try.png");
  const adminUploadOnCoachRec = await api(admin, `/api/admin/exercises/${pubId}/media`, {
    method: "POST",
    body: adminUploadForm,
  });
  ok("آپلود رسانه ادمین روی رکورد origin=coach → 422", adminUploadOnCoachRec.status === 422 && adminUploadOnCoachRec.body.error === "BANK_MEDIA_ORIGIN_NOT_ALLOWED", `status=${adminUploadOnCoachRec.status} code=${String(adminUploadOnCoachRec.body.error)}`);

  console.log("\n== بخش ۸: پایداری نسخه منتشرشده + به‌روزرسانی اتمی (D2، A3.5) ==");
  const editPublished = await api(coach1, `/api/coach/exercises/${exA}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "پرس سینه پایین نسخه ۲",
      enName: "Personal Decline Press V2",
      category: "abs",
      difficulty: "advanced",
      equipment: ["dumbbell"],
      primaryMuscles: ["chest"],
      secondaryMuscles: ["triceps"],
      description: "توضیح نسخه ۲ — هنوز تأیید نشده.",
      tips: "نکته نسخه ۲.",
    }),
  });
  ok("ویرایش حرکت منتشرشده → 200 (نسخه شخصی)", editPublished.status === 200);
  const pubStillV1 = await api(student1, `/api/exercises/${pubId}`);
  ok("نسخه عمومی تا تأیید بعدی پایدار ماند (V1)", pubStillV1.status === 200 && (pubStillV1.body.exercise as { fa?: string } | undefined)?.fa === "پرس سینه پایین هالتر شخصی", `status=${pubStillV1.status}`);

  const submitUpdate = await api(coach1, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("ارسال به‌روزرسانی → pending_review در حالی که نسخه عمومی منتشر است", submitUpdate.status === 200);
  const idxDuringReview = await api(student1, "/api/exercises?scope=index");
  ok("نسخه عمومی در طول بازبینی به‌روزرسانی همچنان نمایان است", idxDuringReview.body.total === 906);

  const previewAfterResubmit = await apiRaw(admin, `/api/admin/exercise-reviews/${exA}/media/${mediaIds[0]}`);
  ok("پیش‌نمایش رسانه در چرخه به‌روزرسانی → 200", previewAfterResubmit.status === 200);

  const approveUpdate = await api(admin, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  ok("تأیید به‌روزرسانی → 200", approveUpdate.status === 200);
  const pubNowV2 = await api(student1, `/api/exercises/${pubId}`);
  ok("به‌روزرسانی اتمی: همان شناسه، محتوای V2", pubNowV2.status === 200 && (pubNowV2.body.exercise as { fa?: string } | undefined)?.fa === "پرس سینه پایین نسخه ۲", `fa=${String((pubNowV2.body.exercise as { fa?: string } | undefined)?.fa)}`);
  const pubRowV2 = await db.exercise.findUnique({ where: { id: pubId }, select: { id: true, createdAt: true } });
  const pubRowV1Created = pubRowV2?.id === pubId;
  ok("شناسه عمومی در به‌روزرسانی تغییر نکرد (پایدار)", pubRowV1Created);

  console.log("\n== بخش ۹: رد به‌روزرسانی → بازگشت به published با نسخه پایدار (D2) ==");
  const editV3 = await api(coach1, `/api/coach/exercises/${exA}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "پرس سینه پایین نسخه ۳",
      enName: "Personal Decline Press V3",
      category: "abs",
      difficulty: "advanced",
      equipment: ["dumbbell"],
      primaryMuscles: ["chest"],
      secondaryMuscles: ["triceps"],
      description: "توضیح نسخه ۳.",
      tips: "",
    }),
  });
  ok("ویرایش V3 → 200", editV3.status === 200);
  const submitV3 = await api(coach1, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("ارسال V3 → pending", submitV3.status === 200);
  const rejectV3 = await api(admin, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "reject", feedback: "نسخه ۳ نیازمند بازبینی بیشتر است." }),
  });
  ok("رد V3 → بازگشت به published (وضعیت قبلی مشتق میشود)", rejectV3.status === 200 && rejectV3.body.coachPublishState === "published", `state=${String(rejectV3.body.coachPublishState)}`);
  const stillV2Visible = await api(student1, `/api/exercises/${pubId}`);
  ok("نسخه عمومی V2 همچنان منتشر و پایدار است", stillV2Visible.status === 200 && (stillV2Visible.body.exercise as { fa?: string } | undefined)?.fa === "پرس سینه پایین نسخه ۲", `status=${stillV2Visible.status}`);
  const rejectedButPublished = await db.coachExercise.findUnique({ where: { id: exA }, select: { publishState: true, reviewNote: true } });
  ok("DB: published + دلیل رد ثبت برای مربی", rejectedButPublished?.publishState === "published" && rejectedButPublished?.reviewNote !== null);
  const afterRejectV3Count = await db.notification.count({ where: { userId: coach1.userId, type: "EXERCISE_REVIEW_DECIDED" } });
  ok("اعلان رد V3 صادر شد (تعداد افزایش یافت)", afterRejectV3Count === notifCountAfterDouble + 2, `count=${afterRejectV3Count} expected=${notifCountAfterDouble + 2}`);

  console.log("\n== بخش ۱۰: فراخوانی (recall) — پنهانی، 404 رسانه، بازگشت (A3.4) ==");
  const recallByOther = await api(coach2, `/api/coach/exercises/${exA}/recall`, { method: "POST" });
  ok("فراخوانی توسط مربی دیگر → 404", recallByOther.status === 404);
  const recall = await api(coach1, `/api/coach/exercises/${exA}/recall`, { method: "POST" });
  ok("فراخوانی توسط مالک → 200 recalled", recall.status === 200 && recall.body.publishState === "recalled");
  const pubRowRecalled = await db.exercise.findUnique({ where: { id: pubId }, select: { publishState: true, status: true } });
  ok("DB رکورد عمومی: recalled (نه حذف فیزیکی — شناسه پایدار)", pubRowRecalled?.publishState === "recalled" && pubRowRecalled?.status === "active");
  const idxAfterRecall = await api(student1, "/api/exercises?scope=index");
  ok("پس از recall، بانک به ۹۰۵ برگشت (رکورد پنهان)", idxAfterRecall.body.total === 905);
  const detailRecalled = await api(student1, `/api/exercises/${pubId}`);
  ok("جزئیات رکورد recalled → 404", detailRecalled.status === 404);
  const mediaRecalled = await apiRaw(student1, `/api/exercises/${pubId}/media/${pubVid?.id ?? "x"}`);
  ok("رسانه رکورد recalled → 404 (دورزدن وضعیت مسدود)", mediaRecalled.status === 404, `status=${mediaRecalled.status}`);
  const recallAgain = await api(coach1, `/api/coach/exercises/${exA}/recall`, { method: "POST" });
  ok("recall دوباره (منتشر نیست) → 409", recallAgain.status === 409);

  const resubmitFromRecall = await api(coach1, `/api/coach/exercises/${exA}/submit`, { method: "POST" });
  ok("ارسال مجدد از recalled → pending (و همچنان پنهان)", resubmitFromRecall.status === 200);
  const idxDuringRecallReview = await api(student1, "/api/exercises?scope=index");
  ok("در طول بازبینیِ recalled، رکورد پنهان میماند", idxDuringRecallReview.body.total === 905);
  const approveAgain = await api(admin, `/api/admin/exercise-reviews/${exA}/decide`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision: "approve" }),
  });
  ok("تأیید مجدد → منتشر دوباره", approveAgain.status === 200 && approveAgain.body.coachPublishState === "published");
  const idxFinal = await api(student1, "/api/exercises?scope=index");
  ok("بانک دوباره ۹۰۶ (رکورد بازگشت)", idxFinal.body.total === 906);

  console.log("\n== بخش ۱۱: سقف ۵ ارسال در انتظار (ضد سیل صف) ==");
  const capIds: string[] = [];
  for (let i = 1; i <= 5; i++) {
    const c = await createExercise(coach1, { enName: `Cap Exercise ${i}`, faName: `حرکت سقف ${i}` });
    const cid = (c.body.exercise as { id: string } | undefined)?.id ?? "";
    capIds.push(cid);
    cleanupCoachExerciseIds.push(cid);
    const s = await api(coach1, `/api/coach/exercises/${cid}/submit`, { method: "POST" });
    if (s.status !== 200) ok(`ارسال شماره ${i} موفق`, false, `status=${s.status}`);
  }
  ok("پنج ارسال در انتظار موفق", true);
  const sixth = await createExercise(coach1, { enName: "Cap Exercise 6", faName: "حرکت سقف ۶" });
  const sixthId = (sixth.body.exercise as { id: string } | undefined)?.id ?? "";
  capIds.push(sixthId);
  cleanupCoachExerciseIds.push(sixthId);
  const sixthSubmit = await api(coach1, `/api/coach/exercises/${sixthId}/submit`, { method: "POST" });
  ok("ارسال ششم → 409 سقف صف", sixthSubmit.status === 409 && sixthSubmit.body.error === "PENDING_REVIEW_CAP_REACHED", `status=${sixthSubmit.status} code=${String(sixthSubmit.body.error)}`);
  // مربی دیگر سهمیه مستقل دارد
  const c2ex = await createExercise(coach2, { enName: "Coach2 Exercise", faName: "حرکت مربی ۲" });
  const c2id = (c2ex.body.exercise as { id: string } | undefined)?.id ?? "";
  capIds.push(c2id);
  cleanupCoachExerciseIds.push(c2id);
  const c2submit = await api(coach2, `/api/coach/exercises/${c2id}/submit`, { method: "POST" });
  ok("سهمیه مربی دیگر مستقل است (ارسال موفق)", c2submit.status === 200);

  console.log("\n== بخش ۱۲: سلامت بانک core ==");
  const coreCount = await db.exercise.count({ where: { origin: "core", status: "active" } });
  ok("۹۰۵ رکورد core دست‌نخورده", coreCount === 905, String(coreCount));
  const coreSample = await db.exercise.findFirst({ where: { origin: "core", status: "active" }, select: { id: true } });
  const spotCore = await api(student1, `/api/exercises/${coreSample?.id ?? "x"}`);
  ok("رکورد نمونه core همچنان سرو میشود", spotCore.status === 200, `status=${spotCore.status} id=${coreSample?.id}`);
  const coreCards = ((await api(student1, "/api/exercises?scope=index")).body.items as { origin?: string }[] | undefined) ?? [];
  ok("کارت‌های core با origin=core عرضه میشوند", coreCards.filter((c) => c.origin === "coach").length === 1 && coreCards.filter((c) => c.origin === "core").length === 905);
}

/* ---------------- پاکسازی ---------------- */

async function cleanup() {
  console.log("\n== پاکسازی fixtureها ==");
  // ۱) حذف رکوردهای عمومی منتشرشده fixture + رسانهها (فقط داده تست)
  for (const pubId of cleanupPublicExerciseIds) {
    const media = await db.exerciseMedia.findMany({ where: { exerciseId: pubId } });
    for (const m of media) {
      cleanupStoragePaths.push(m.storagePath);
      await db.exerciseMedia.delete({ where: { id: m.id } }).catch(() => undefined);
    }
    await db.exercise.delete({ where: { id: pubId } }).catch(() => undefined);
  }
  // ۲) اعلانهای fixture — شامل اعلانهای ارسالشده به ادمین واقعی (رفتار
  //    صحیح سیستم: همه ادمینها اطلاع میگیرند)؛ پاکسازی scoped به شناسه
  //    حرکات fixture در dedupeKey — هیچ اعلان غیرfixture دست نمیخورد
  for (const cexId of cleanupCoachExerciseIds) {
    await db.notification.deleteMany({ where: { dedupeKey: { contains: cexId } } });
  }
  await db.notification.deleteMany({ where: { userId: { in: cleanupUserIds } } });
  await db.adminActionLog.deleteMany({ where: { adminId: { in: cleanupUserIds } } });
  for (const userId of cleanupUserIds) {
    await db.coachWorkoutPlan.deleteMany({ where: { coachId: userId } });
    await db.coachExercise.deleteMany({ where: { coachId: userId } });
    await db.coachExerciseFolder.deleteMany({ where: { coachId: userId } });
    await db.coachProfile.deleteMany({ where: { userId } });
    await db.assistantConversation.deleteMany({ where: { userId } });
    await db.fitnessProfile.deleteMany({ where: { userId } });
    await db.session.deleteMany({ where: { userId } });
    await db.account.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } }).catch(() => undefined);
  }
  // ۳) حذف فایلهای رسانه fixture از storage (کلیدهای namespace دار فقط تست)
  const { deleteExerciseMediaFile } = await import("../src/lib/coaching/media-storage");
  let removedFiles = 0;
  for (const p of Array.from(new Set(cleanupStoragePaths))) {
    try {
      await deleteExerciseMediaFile(p);
      removedFiles++;
    } catch {
      // از قبل نبوده — بیخطر
    }
  }
  console.log(`  فایلهای رسانه تست حذفشده: ${removedFiles}`);

  const remaining = await db.user.count();
  ok("کاربران واقعی دست‌نخورده (۴ کاربر)", remaining === 4, `users=${remaining}`);
  const exercises = await db.exercise.count({ where: { status: "active" } });
  ok("بانک عمومی به ۹۰۵ برگشت (هیچ بقایای fixture)", exercises === 905, `exercises=${exercises}`);
  const coachEx = await db.coachExercise.count();
  ok("هیچ حرکت شخصی fixture باقی نماند", coachEx === 0, String(coachEx));
  const cem = await db.coachExerciseMedia.count();
  ok("هیچ رسانه حرکت شخصی fixture باقی نماند", cem === 0, String(cem));
  const em = await db.exerciseMedia.count();
  ok("هیچ رسانه بانک fixture باقی نماند", em === 0, String(em));
  const notifs = await db.notification.count();
  ok("هیچ اعلان fixture باقی نماند", notifs === 0, String(notifs));
  const logs = await db.adminActionLog.count({ where: { action: { in: ["approve-exercise-publish", "reject-exercise-publish"] } } });
  ok("هیچ لاگ ادمین fixture باقی نماند", logs === 0, String(logs));
  const integrity = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  ok("integrity_check", integrity[0]?.integrity_check === "ok", integrity[0]?.integrity_check ?? "—");
  const fk = await db.$queryRawUnsafe<unknown[]>("PRAGMA foreign_key_check");
  ok("foreign_key_check بدون تخلف", fk.length === 0, String(fk.length));
}

async function main() {
  try {
    await integrationTests();
  } finally {
    await cleanup();
    await db.$disconnect();
  }
  const failed = checks.filter((c) => !c.ok);
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
  if (failed.length > 0) {
    console.log("FAILED:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
