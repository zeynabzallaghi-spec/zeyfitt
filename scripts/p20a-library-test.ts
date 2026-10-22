/**
 * p20a-library-test.ts — سوئیت تست مرحله ۲۰ (زیرمجموعه P0: قرارداد cex-).
 *
 * باگ بازتولیدشده: انتخابگر UI (exercise-picker.tsx) شناسه حرکت شخصی را
 * بدون پیشوند «cex-» منتشر میکرد در حالی که قرارداد سرور (plan-schemas.ts
 * با PERSONAL_EXERCISE_PREFIX) پیشوند میخواهد — نتیجه: درج حرکت شخصی از
 * برنامه‌ساز بی‌صدا شکست میخورد و re-save برنامه حاوی حرکت شخصی 422 میشد.
 *
 * بخش ۱ — واحد: قرارداد واحد شناسه (personal-exercise-id.ts):
 *   idempotent بودن پیشوند، حفظ شناسه بانک عمومی، بازسازی قالب سیم.
 * بخش ۲ — انتها-به-انتها روی سرور زنده با مربی fixture:
 *   قالب خراب قدیمی (بدون پیشوند) → 422؛ قالب اصلاح‌شده (cex-) → 201 با
 *   snapshot درست؛ رگرسیون بانک عمومی؛ چرخه ویرایش (re-save)؛ جداسازی
 *   مالکیت مربی دیگر.
 * پاکسازی کامل fixtureها + integrity_check — بدون باقی‌گذاری داده.
 *
 * اجرا: bun scripts/p20a-library-test.ts
 */

import { PrismaClient } from "@prisma/client";
import {
  PERSONAL_EXERCISE_PREFIX,
  isPersonalExerciseId,
  withPersonalPrefix,
  stripPersonalPrefix,
  storedExerciseIdToWire,
} from "../src/lib/coaching/personal-exercise-id";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const STAMP = Date.now();
const PASSWORD = "p20a-test-pass1";

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

async function createUser(name: string, role: "COACH" | "STUDENT", attempt = 0): Promise<User> {
  const email = `p20a-${name}-${STAMP}@test.invalid`.toLowerCase();
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email, password: PASSWORD, name: `P20A ${name}` }),
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
    // تجهیز نقش فقط برای fixture تست — همان الگوی p196-coach-fixture؛
    // ساخت برنامه به پروفایل تأییدشده هم نیاز دارد (assertCoachCanBuildPlans)
    await db.user.update({ where: { id: row.id }, data: { role: "COACH" } });
    await db.coachProfile.create({
      data: {
        userId: row.id,
        displayName: `P20A ${name}`,
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

/* ---------------- بخش ۱ — واحد: قرارداد واحد شناسه ---------------- */

function contractUnitTests() {
  console.log("\n== بخش ۱: واحد — قرارداد شناسه حرکت شخصی ==");

  ok("PREFIX ثابت cex- است", PERSONAL_EXERCISE_PREFIX === "cex-", PERSONAL_EXERCISE_PREFIX);

  ok("افزودن پیشوند به شناسه خام", withPersonalPrefix("abc123") === "cex-abc123", withPersonalPrefix("abc123"));
  ok("پیشوند دوبار اضافه نمیشود (idempotent)", withPersonalPrefix("cex-abc123") === "cex-abc123", withPersonalPrefix("cex-abc123"));
  ok("حذف پیشوند از قالب سیم", stripPersonalPrefix("cex-abc123") === "abc123", stripPersonalPrefix("cex-abc123"));
  ok("شناسه بانک عمومی دست نخورده (strip)", stripPersonalPrefix("pullup") === "pullup");
  ok("شناسه بدون خط تیره personal تشخیص داده نمیشود", isPersonalExerciseId("cexabc") === false);
  ok("تشخیص personal درست", isPersonalExerciseId("cex-abc123") === true && isPersonalExerciseId("fbd-x") === false);

  // بازسازی قالب سیم از سطر ذخیره‌شده — همان قاعده formFromDetail
  ok("toWire: سطر personal → پیشوند", storedExerciseIdToWire({ exerciseId: "abc123", source: "personal" }) === "cex-abc123");
  ok("toWire: سطر public → خام", storedExerciseIdToWire({ exerciseId: "pullup", source: "public" }) === "pullup");
  ok("toWire: داده قدیمی بدون source → خام", storedExerciseIdToWire({ exerciseId: "pullup" }) === "pullup");
  ok("toWire: idempotent برای داده پیشونددار", storedExerciseIdToWire({ exerciseId: "cex-abc123", source: "personal" }) === "cex-abc123");
  const roundtrip = stripPersonalPrefix(withPersonalPrefix("xyz"));
  ok("roundtrip strip∘with = identity", roundtrip === "xyz", roundtrip);
}

/* ---------------- بخش ۲ — انتها-به-انتها روی سرور زنده ---------------- */

interface ContentRow {
  exerciseId: string;
  source?: string;
  faName: string;
  coach3dId: string | null;
}

async function integrationTests() {
  console.log("\n== بخش ۲: انتها-به-انتها (سرور زنده + fixture) ==");

  const coach = await createUser("coach", "COACH");
  const coach2 = await createUser("coach2", "COACH");

  // ساخت حرکت شخصی برای مربی اول
  const exCreate = await api(coach, "/api/coach/exercises", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      faName: "جلو پا دستگاهی شخصی",
      enName: "My Leg Extension",
      category: "quads",
      equipment: ["machine"],
      primaryMuscles: ["quads"],
      secondaryMuscles: [],
      description: "توضیح تست",
      tips: "نکته تست",
    }),
  });
  ok("ساخت حرکت شخصی fixture", exCreate.status === 201, `got ${exCreate.status}`);
  const personalId = String((exCreate.body.exercise as { id?: string } | undefined)?.id ?? "");
  if (!personalId) throw new Error("personal exercise id missing — aborting integration part");

  // یک حرکت عمومی از بانک برای رگرسیون
  const bank = await api(coach, "/api/exercises?page=1&pageSize=1");
  const publicId = String((bank.body.items as { id: string }[] | undefined)?.[0]?.id ?? "");
  ok("بانک عمومی پاسخ می‌دهد", Boolean(publicId), `sample id=${publicId.slice(0, 12)}…`);

  // [بازتولید باگ] قالب قدیمی UI: شناسه خام بدون پیشوند → قرارداد سرور آن را
  // حرکت عمومی می‌پندارد و در بانک عمومی نیست → 422 (در UI قدیمی همین‌جا
  // بی‌صدا هیچ سطری درج نمیشد)
  const oldBroken = await api(coach, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "P20A قالب خراب قدیمی",
      description: "",
      goal: "fitness",
      difficulty: "beginner",
      durationMinutes: 30,
      days: [{ title: "روز", exercises: [{ exerciseId: personalId, sets: 3, repsMin: 10, repsMax: 12, restSeconds: 60 }] }],
    }),
  });
  ok(
    "قالب خراب قدیمی (شناسه خام) توسط سرور رد میشود (422)",
    oldBroken.status === 422,
    `got ${oldBroken.status}`
  );

  // [قالب اصلاح‌شده] همان خروجی انتخابگر پس از رفع: cex-<id>
  const fixedPick = await api(coach, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "P20A قالب اصلاح‌شده",
      description: "",
      goal: "fitness",
      difficulty: "beginner",
      durationMinutes: 45,
      days: [
        {
          title: "روز اول",
          exercises: [
            { exerciseId: withPersonalPrefix(personalId), sets: 4, repsMin: 8, repsMax: 12, restSeconds: 90 },
            { exerciseId: publicId, sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60 },
          ],
        },
      ],
    }),
  });
  ok("قالب اصلاح‌شده (cex-) پذیرفته میشود (201)", fixedPick.status === 201, `got ${fixedPick.status}`);
  const fixedPlanId = String((fixedPick.body.plan as { id?: string } | undefined)?.id ?? "");
  const fixedRows =
    ((fixedPick.body.plan as { content?: { days?: { exercises?: ContentRow[][] } } } | undefined)?.content?.days?.[0]
      ?.exercises as ContentRow[] | undefined) ?? [];
  ok("سطر شخصی: شناسه ذخیره‌شده خام است (بدون پیشوند در DB)", fixedRows[0]?.exerciseId === personalId, fixedRows[0]?.exerciseId ?? "—");
  ok("سطر شخصی: source=personal", fixedRows[0]?.source === "personal");
  ok("سطر شخصی: بدون نگاشت سه‌بعدی (صادقانه)", fixedRows[0]?.coach3dId === null);
  ok("سطر عمومی: source=public و دست‌نخورده", fixedRows[1]?.exerciseId === publicId && fixedRows[1]?.source === "public");
  ok("snapshot نام حرکت شخصی درست", fixedRows[0]?.faName === "جلو پا دستگاهی شخصی");

  // [چرخه ویرایش — نیمه دوم باگ] بارگذاری جزئیات و بازارسال با همان قاعده
  // formFromDetail (storedExerciseIdToWire) — پیش از رفع این مسیر 422 میشد
  if (!fixedPlanId) {
    ok("re-save برنامه حاوی حرکت شخصی پس از رفع موفق است", false, "plan id missing (مرحله قبل شکست خورد)");
  } else {
  const detail = await api(coach, `/api/coach/workout-plans/${fixedPlanId}`);
  const detailRows =
    ((detail.body.plan as { content?: { days?: { exercises?: ContentRow[][] } } } | undefined)?.content?.days?.[0]
      ?.exercises as ContentRow[] | undefined) ?? [];
  const reSaved = await api(coach, `/api/coach/workout-plans/${fixedPlanId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "P20A قالب اصلاح‌شده — ویرایش",
      description: "",
      goal: "fitness",
      difficulty: "beginner",
      durationMinutes: 45,
      days: [
        {
          title: "روز اول",
          exercises: detailRows.map((row) => ({
            exerciseId: storedExerciseIdToWire(row),
            sets: 4,
            repsMin: 8,
            repsMax: 12,
            restSeconds: 90,
          })),
        },
      ],
    }),
  });
  ok("re-save برنامه حاوی حرکت شخصی پس از رفع موفق است", reSaved.status === 200, `got ${reSaved.status}`);
  const reRows =
    ((reSaved.body.plan as { content?: { days?: { exercises?: ContentRow[][] } } } | undefined)?.content?.days?.[0]
      ?.exercises as ContentRow[] | undefined) ?? [];
  ok("پس از re-save: منبع شخصی حفظ شده", reRows[0]?.source === "personal" && reRows[0]?.exerciseId === personalId);
  ok("پس از re-save: منبع عمومی حفظ شده", reRows[1]?.source === "public" && reRows[1]?.exerciseId === publicId);
  }

  // [جداسازی] حرکت شخصی مربی دیگر حتی با پیشوند درست قابل استفاده نیست
  const steal = await api(coach2, "/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: "P20A تلاش سرقت",
      description: "",
      goal: "fitness",
      difficulty: "beginner",
      durationMinutes: 30,
      days: [{ title: "روز", exercises: [{ exerciseId: withPersonalPrefix(personalId), sets: 3, repsMin: 10, repsMax: 10, restSeconds: 60 }] }],
    }),
  });
  ok("حرکت شخصی مربی دیگر 422 (ضد-IDOR پابرجا)", steal.status === 422, `got ${steal.status}`);

  // بانک عمومی دست‌نخورده
  const bankCount = await db.exercise.count({ where: { status: "active" } });
  ok("بانک عمومی ۹۰۵ حرکت دست‌نخورده", bankCount === 905, String(bankCount));
}

/* ---------------- پاکسازی ---------------- */

async function cleanup() {
  console.log("\n== پاکسازی fixtureها ==");
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
  const remaining = await db.user.count();
  ok("کاربران واقعی دست‌نخورده", remaining === 4, `users=${remaining} (1 ADMIN + 3 STUDENT)`);
  const integrity = await db.$queryRawUnsafe<{ integrity_check: string }[]>("PRAGMA integrity_check");
  ok("integrity_check", integrity[0]?.integrity_check === "ok", integrity[0]?.integrity_check ?? "—");
}

async function main() {
  contractUnitTests();
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
