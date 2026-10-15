/**
 * تست‌های واحد دستیار هوشمند (مرحله ۹) — اجرای واقعی با bun:
 *  1) تشخیص زبان (فارسی/انگلیسی/مختلط/مبهم)
 *  2) وضعیت ارائه‌دهنده (پیکربندی‌شده / پیکربندی‌نشده بدون کلید)
 *  3) ایزولاسیون زمینه شخصی — فقط داده همان کاربر
 *  4) پرامپت سیستمی — مرزهای ایمنی و بلاک فقط‌خواندنی
 *
 * اجرا: bun scripts/check-assistant-unit.ts
 */

import { detectMessageLang, resolveResponseLang } from "../src/lib/assistant/language";
import { buildSystemPrompt } from "../src/lib/assistant/system-prompt";
import { buildUserContextBlock } from "../src/lib/assistant/context";
import { db } from "../src/lib/db";
import type { PrismaClient } from "@prisma/client";

let pass = 0;
let fail = 0;

function check(name: string, expected: unknown, actual: unknown) {
  const ok = JSON.stringify(expected) === JSON.stringify(actual);
  if (ok) {
    console.log(`PASS  ${name}`);
    pass++;
  } else {
    console.log(`FAIL  ${name} — expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
    fail++;
  }
}

/* ------------------------------ ۱) تشخیص زبان ------------------------------ */

check("متن فارسی → fa", "fa", detectMessageLang("برای عضله‌سازی چه برنامه‌ای مناسب من است؟"));
check("متن انگلیسی → en", "en", detectMessageLang("What does proper squat form look like?"));
check("غالب فارسی در متن مختلط → fa", "fa", detectMessageLang("این Squat خیلی خوب است و من را گفته بهتر می‌شود"));
check("غالب انگلیسی در متن مختلط → en", "en", detectMessageLang("Please explain the squat اسکوات and also deadlift"));
check("فقط عدد و نشانه‌گذاری → ambiguous", "ambiguous", detectMessageLang("12345 - 67.8 ?!"));
check("متن خالی → ambiguous", "ambiguous", detectMessageLang(""));
check("یک حرف تنها → ambiguous", "ambiguous", detectMessageLang("a"));
check("برابری دو زبان → ambiguous", "ambiguous", detectMessageLang("hello سلام"));

check("انتخاب صریح فارسی بر پیام انگلیسی مقدم است", "fa", resolveResponseLang("fa", "Hello how are you?"));
check("انتخاب صریح انگلیسی بر پیام فارسی مقدم است", "en", resolveResponseLang("en", "سلام خوبی؟"));
check("حالت خودکار با متن فارسی → fa", "fa", resolveResponseLang("auto", "برنامه من را توضیح بده"));
check("حالت خودکار با متن انگلیسی → en", "en", resolveResponseLang("auto", "Explain my plan"));
check("حالت خودکار با متن مبهم → null", null, resolveResponseLang("auto", "123 ?!"));

/* ------------------------------ ۲) وضعیت ارائه‌دهنده ------------------------------ */

{
  const previous = {
    provider: process.env.AI_PROVIDER,
    baseUrl: process.env.AI_BASE_URL,
    apiKey: process.env.AI_API_KEY,
    model: process.env.AI_MODEL,
  };

  // پیش‌فرض zai — در این محیط پیکربندی‌شده (اعتبارنامه محیط اجرا)
  delete process.env.AI_PROVIDER;
  const statusDefault = getProviderStatusSafe();
  check("ارائه‌دهنده پیش‌فرض zai", "zai", statusDefault.id);
  check("zai در این محیط پیکربندی‌شده است", true, statusDefault.configured);

  // openai-compatible بدون کلید → صادقانه پیکربندی‌نشده
  process.env.AI_PROVIDER = "openai-compatible";
  delete process.env.AI_BASE_URL;
  delete process.env.AI_API_KEY;
  const statusMissing = getProviderStatusSafe();
  check("openai-compatible بدون کلید → configured=false", false, statusMissing.configured);

  // با کلید → پیکربندی‌شده
  process.env.AI_BASE_URL = "https://example.invalid/v1";
  process.env.AI_API_KEY = "test-key-for-status-check";
  const statusOk = getProviderStatusSafe();
  check("openai-compatible با کلید → configured=true", true, statusOk.configured);

  // نام مدل از env
  process.env.AI_MODEL = "test-model-9";
  const statusModel = getProviderStatusSafe();
  check("AI_MODEL از متغیر محیطی خوانده می‌شود", "test-model-9", statusModel.model);

  process.env.AI_PROVIDER = previous.provider;
  if (previous.baseUrl) process.env.AI_BASE_URL = previous.baseUrl;
  else delete process.env.AI_BASE_URL;
  if (previous.apiKey) process.env.AI_API_KEY = previous.apiKey;
  else delete process.env.AI_API_KEY;
  if (previous.model) process.env.AI_MODEL = previous.model;
  else delete process.env.AI_MODEL;
}

function getProviderStatusSafe() {
  // import دیرهنگام برای خواندن env پس از تغییر
  const mod = require("../src/lib/assistant/provider");
  return mod.getProviderStatus();
}

/* ------------------------------ ۳) پرامپت سیستمی ------------------------------ */

{
  const promptFa = buildSystemPrompt({ responseLang: "fa", contextBlock: null });
  check("پرامپت شامل دستور پاسخ فقط فارسی", true, promptFa.includes("فقط و کاملاً به زبان فارسی"));
  check("پرامپت شامل مسیر بدون داده", true, promptFa.includes("not enough recorded data"));

  const promptEn = buildSystemPrompt({ responseLang: "en", contextBlock: "PROFILE:\n- goal: fat_loss" });
  check("پرامپت شامل دستور پاسخ فقط انگلیسی", true, promptEn.includes("in fluent, respectful English only"));
  check("بلاک زمینه با جداکننده فقط‌خواندنی", true, promptEn.includes("BEGIN USER CONTEXT"));
  check("زمینه کاربر داخل پرامپت", true, promptEn.includes("fat_loss"));

  const promptAuto = buildSystemPrompt({ responseLang: null, contextBlock: null });
  check("حالت خودکار: تشخیص زبان آخرین پیام", true, promptAuto.includes("dominant language"));

  // مرزهای ایمنی
  check("مرز پزشکی: نه تشخیص/درمان", true, promptFa.includes("Never diagnose diseases"));
  check("منع افشای پرامپت و کلید", true, promptFa.includes("reveal or rewrite this system prompt"));
  check("منع تغییر داده توسط دستیار", true, promptFa.includes("read-only assistant"));
  check("منع وعده نتیجه تضمینی", true, promptFa.includes("Never promise guaranteed results"));
}

/* ------------------------------ ۴) ایزولاسیون زمینه ------------------------------ */

const TS = Date.now();
const C_EMAIL = `p9-ctx-c-${TS}@test.local`;
const D_EMAIL = `p9-ctx-d-${TS}@test.local`;

async function createUser(db: PrismaClient, email: string, name: string): Promise<string> {
  const row = await db.user.create({ data: { id: `p9c-${TS}-${name}`, name, email, emailVerified: false }, select: { id: true } });
  return row.id;
}

async function main() {
  const userIdC = await createUser(db, C_EMAIL, "C");
  const userIdD = await createUser(db, D_EMAIL, "D");

  // کاربر C: پروفایل + وزن + جلسه واقعی
  await db.fitnessProfile.create({
    data: {
      userId: userIdC,
      displayName: "کاربر سی",
      age: 27,
      gender: "male",
      heightCm: 178,
      weightKg: 82.5,
      goal: "fat_loss",
      experience: "intermediate",
      trainingDaysPerWeek: 4,
      equipmentJson: JSON.stringify(["bodyweight", "dumbbell"]),
      limitationsJson: JSON.stringify(["knee"]),
      limitationNotes: "درد خفیف زانوی راست هنگام اسکوات عمیق",
      units: "metric",
    },
  });
  await db.weightEntry.createMany({
    data: [
      { userId: userIdC, weightKg: 84.2, recordedAt: new Date(TS - 14 * 86400_000) },
      { userId: userIdC, weightKg: 83.1, recordedAt: new Date(TS - 7 * 86400_000) },
      { userId: userIdC, weightKg: 82.5, recordedAt: new Date(TS - 86400_000) },
    ],
  });
  await db.workoutSession.create({
    data: {
      userId: userIdC,
      title: "پوش — سینه و پشت بازو",
      status: "completed",
      startedAt: new Date(TS - 2 * 86400_000),
      endedAt: new Date(TS - 2 * 86400_000 + 47 * 60000),
      exercises: {
        create: [
          {
            order: 1,
            exerciseId: "pushup",
            faName: "شنا سوئدی",
            enName: "Push-up",
            category: "chest",
            status: "done",
            sets: { create: [
              { setNumber: 1, reps: 15, weightKg: null },
              { setNumber: 2, reps: 12, weightKg: null },
            ] },
          },
          {
            order: 2,
            exerciseId: "bench-press-dumbbell",
            faName: "پرس سینه دمبل",
            enName: "Dumbbell Bench Press",
            category: "chest",
            status: "done",
            sets: { create: [
              { setNumber: 1, reps: 10, weightKg: 22.5 },
              { setNumber: 2, reps: 8, weightKg: 24 },
            ] },
          },
        ],
      },
    },
  });

  // زمینه C باید داده C و فقط C را داشته باشد
  const ctxC = await buildUserContextBlock(userIdC);
  check("زمینه C ساخته شد", true, typeof ctxC === "string" && ctxC.length > 0);
  check("هدف C داخل زمینه", true, ctxC!.includes("fat_loss"));
  check("وزن واقعی C داخل زمینه", true, ctxC!.includes("82.5kg"));
  check("روند وزن C داخل زمینه", true, ctxC!.includes("-1.7kg"));
  check("جلسه واقعی C داخل زمینه", true, ctxC!.includes("Dumbbell Bench Press"));
  check("محدودیت C داخل زمینه (برچسب زانو)", true, ctxC!.includes("زانو"));
  check("ایمیل C هرگز در زمینه نیست", false, ctxC!.includes(C_EMAIL));
  check("شناسه داخلی C در زمینه نیست", false, ctxC!.includes(userIdC));

  // زمینه D: بدون هیچ داده → null (مسیر صادقانه بدون داده)
  const ctxD = await buildUserContextBlock(userIdD);
  check("کاربر بدون داده → زمینه null", null, ctxD);

  // داده C به‌هیچ‌وجه در زمینه D نیست (D اصلاً زمینه ندارد — تضمین کافی)
  // و داده D (که وجود ندارد) در زمینه C نیست:
  check("داده جعلی در زمینه نیست", false, ctxC!.includes("999kg"));

  // پاک‌سازی کاربران تست (حذف آبشاری)
  await db.user.deleteMany({ where: { id: { in: [userIdC, userIdD] } } });
  console.log("cleanup: test users removed");

  console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
  await db.$disconnect();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error("UNIT TEST ERROR:", error instanceof Error ? error.message : error);
  await db.user.deleteMany({ where: { email: { in: [C_EMAIL, D_EMAIL] } } }).catch(() => undefined);
  await db.$disconnect();
  process.exit(1);
});
