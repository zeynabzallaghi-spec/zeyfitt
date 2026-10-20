/**
 * p18-import-exercises.ts — import غیرمخرب و idempotent کتابخانه عمومی حرکات.
 *
 * اجرا: bun scripts/p18-import-exercises.ts [--verify-only]
 *
 * قواعد (مطابق مشخصات مرحله ۱۸):
 *  1. رکوردهای ویرایشی ۴۸گانه از فایل‌های TS پروژه خوانده و عیناً (با همان
 *     شناسه پایدار) در DB همگام می‌شوند — sourceKey=editorial.
 *  2. رکوردهای منبع آزاد Free Exercise DB (Unlicense) با شناسه «fbd-<slug>»
 *     import می‌شوند تا با شناسه‌های ویرایشی برخورد نکنند.
 *  3. تکراری‌بودن با نرمال‌سازی نام انگلیسی سنجیده می‌شود؛ رکورد هم‌نام با
 *     رکورد ویرایشی، تکراری شمرده و skip می‌شود (گزارش می‌شود).
 *  4. اجرای دوباره اسکریپت هرگز رکورد تکراری نمی‌سازد (upsert بر اساس
 *     unique(sourceKey, sourceRef)) — فقط دسته import جدید با گزارش ثبت می‌شود.
 *  5. رکورد ناقص/نامعتبر رد می‌شود و دلیلش در گزارش می‌ماند؛ مجوز وجود
 *     LICENSE.md الزامی است و نبود آن کل import را متوقف می‌کند.
 *  6. هیچ رکورد واقعی دیگری (کاربر/برنامه/جلسه/…) دست زده نمی‌شود.
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { translateExerciseName } from "./p18-glossary";
import {
  CHEST_BACK_EXERCISES,
} from "../src/lib/exercises/data-chest-back";
import {
  SHOULDERS_ARMS_EXERCISES,
} from "../src/lib/exercises/data-shoulders-arms";
import {
  CORE_LEGS_EXERCISES,
} from "../src/lib/exercises/data-core-legs";
import {
  GLUTES_CALVES_FULLBODY_EXERCISES,
} from "../src/lib/exercises/data-glutes-calves-fullbody";
import type {
  Difficulty,
  LibraryExercise,
} from "../src/lib/exercises/types";

const db = new PrismaClient();

const DATASET_DIR = path.join(
  process.cwd(),
  "data/exercises/free-exercise-db"
);
const DATASET_FILE = path.join(DATASET_DIR, "exercises.json");
const LICENSE_FILE = path.join(DATASET_DIR, "LICENSE.md");

const SOURCE_KEY = "free-exercise-db";
const SOURCE_LICENSE = "Unlicense";
const EDITORIAL_LICENSE = "proprietary-original";

/** واژگان مجاز لایه DB — خارج از این‌ها رکورد رد می‌شود */
const DIFFICULTY_DB = new Set(["beginner", "intermediate", "advanced"]);
const EXERCISE_TYPES = new Set([
  "strength", "stretching", "plyometrics", "powerlifting",
  "olympic_weightlifting", "strongman", "cardio",
]);

/* ------------------------------ نگاشت واژگان ------------------------------ */

const LEVEL_MAP: Record<string, "beginner" | "intermediate" | "advanced"> = {
  beginner: "beginner",
  novice: "beginner",
  intermediate: "intermediate",
  expert: "advanced",
};

/** واژگان فارسی دشواری بانک → مقدار DB */
const DIFFICULTY_TO_DB: Record<Difficulty, string> = {
  "مبتدی": "beginner",
  "متوسط": "intermediate",
  "پیشرفته": "advanced",
};

const MUSCLE_MAP: Record<string, string> = {
  chest: "chest",
  shoulders: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  abdominals: "abs",
  back: "back",
  lats: "back",
  "middle back": "back",
  "lower back": "lower-back",
  traps: "traps",
  glutes: "glutes",
  abductors: "glutes", // ابداکتورها = سرینی میانی — نگاشت علمی، مستند در PROVENANCE
  quads: "quads",
  quadriceps: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
  adductors: "adductors",
  neck: "neck",
};

const EQUIPMENT_MAP: Record<string, string> = {
  barbell: "barbell",
  dumbbell: "dumbbell",
  cable: "cable",
  machine: "machine",
  "body only": "bodyweight",
  bands: "band",
  kettlebells: "kettlebell",
  "medicine ball": "medicine_ball",
  "exercise ball": "stability_ball",
  "foam roll": "foam_roll",
  "e-z curl bar": "ez_barbell",
  other: "other",
};

/** دسته منبع → نوع تمرین (عین واژگان منبع) */
const CATEGORY_TYPE_MAP: Record<string, string> = {
  strength: "strength",
  stretching: "stretching",
  plyometrics: "plyometrics",
  powerlifting: "powerlifting",
  "olympic weightlifting": "olympic_weightlifting",
  strongman: "strongman",
  cardio: "cardio",
};

/** عضله اصلی (پس از نگاشت به واژگان بانک) → دسته بانک (۱۱ دسته) */
const MUSCLE_TO_CATEGORY: Record<string, string> = {
  chest: "chest",
  shoulders: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  forearms: "biceps",
  abs: "core",
  back: "back",
  "lower-back": "back",
  traps: "back",
  glutes: "glutes",
  adductors: "glutes",
  quads: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
  neck: "shoulders",
};

/* ------------------------- قواعد الگوی حرکتی (سندشده) ------------------------- */

const PATTERN_RULES: { re: RegExp; pattern: string }[] = [
  { re: /\b(leg curl|nordic curl|glute ham)\b/i, pattern: "knee-flexion" },
  { re: /\b(leg extension|leg extensions)\b/i, pattern: "knee-extension" },
  { re: /\b(calf raise|calf raises|calf press|heel raise|toe press)\b/i, pattern: "calf" },
  { re: /\b(squat|box jump|jump squat|sissy|cossack|pistol)\b/i, pattern: "squat" },
  { re: /\b(lunge|curtsy)\b/i, pattern: "squat" },
  { re: /\b(deadlift|good morning|hip thrust|glute bridge|bridge|swing|pull.?through|rack pull)\b/i, pattern: "hinge" },
  { re: /\b(crunch|sit.?up|situp|toe touch|heel touch|butt.?up)\b/i, pattern: "spinal-flexion" },
  { re: /\b(plank|hold|carry|hollow|dead bug|bird dog|pallof|vacuum|l.?sit)\b/i, pattern: "core-stability" },
  { re: /\b(fly|flye|crossover|pec deck)\b/i, pattern: "fly" },
  { re: /\b(raise)\b/i, pattern: "raise" },
  { re: /\b(shrug)\b/i, pattern: "raise" },
  { re: /\b(row|pull.?up|pullup|chin.?up|pulldown|pull.?down|pull.?over|face pull|muscle.?up)\b/i, pattern: "pull" },
  { re: /\b(curl)\b/i, pattern: "pull" },
  { re: /\b(press|push.?up|pushup|push.?up|dip|pushdown|push.?down|kick.?back|bench)\b/i, pattern: "push" },
  { re: /\b(clean|snatch|jerk|thruster|turkish get.?up|windmill)\b/i, pattern: "fullbody" },
];

/**
 * استخراج الگوی حرکتی — قواعد کلیدواژه‌ای + force منبع؛ خروجی «other»
 * صادقانه در گزارش شمرده می‌شود.
 */
export function derivePattern(
  name: string,
  force: string | null,
  category: string
): { pattern: string; rule: string } {
  for (const rule of PATTERN_RULES) {
    if (rule.re.test(name)) return { pattern: rule.pattern, rule: `keyword:${rule.re.source.slice(0, 24)}` };
  }
  if (category === "stretching") return { pattern: "stretch", rule: "category:stretching" };
  if (force === "push") return { pattern: "push", rule: "force:push" };
  if (force === "pull") return { pattern: "pull", rule: "force:pull" };
  if (force === "static") return { pattern: "core-stability", rule: "force:static" };
  if (["plyometrics", "cardio", "strongman", "olympic weightlifting"].includes(category)) {
    return { pattern: "fullbody", rule: `category:${category}` };
  }
  return { pattern: "other", rule: "fallback:other" };
}

/* ------------------------------ ابزارها ------------------------------ */

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(id: string): string {
  return id
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function summaryFromInstructions(instructions: string[]): string {
  if (!instructions || instructions.length === 0) return "";
  const first = instructions[0].replace(/\s+/g, " ").trim();
  return first.length > 240 ? `${first.slice(0, 237).trimEnd()}…` : first;
}

/* ------------------------------ import ------------------------------ */

interface ImportReport {
  editorial: { total: number; synced: number; created: number };
  source: {
    total: number; accepted: number; updated: number;
    duplicates: number; rejected: number;
    faNameCoverage: number;
    patternFallback: string[];
    nearDuplicates: { source: string; editorial: string; jaccard: number }[];
  };
  rejected: { name: string; reason: string }[];
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");

  // گیت مجوز — نبود LICENSE کل import را متوقف می‌کند
  if (!fs.existsSync(LICENSE_FILE)) {
    console.error("FATAL: LICENSE.md of the dataset is missing — import aborted");
    process.exit(1);
  }
  const licenseText = fs.readFileSync(LICENSE_FILE, "utf8");
  if (!/unlicense|public domain/i.test(licenseText)) {
    console.error("FATAL: dataset license is not Unlicense — import aborted");
    process.exit(1);
  }
  if (!fs.existsSync(DATASET_FILE)) {
    console.error(`FATAL: dataset file missing: ${DATASET_FILE}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(DATASET_FILE, "utf8")) as Array<{
    id: string; name: string; force: string | null; level: string | null;
    mechanic: string | null; equipment: string | null;
    primaryMuscles: string[]; secondaryMuscles: string[];
    instructions: string[]; category: string;
  }>;

  const datasetVersion = `main-2026-10-20-${createHash("sha256")
    .update(fs.readFileSync(DATASET_FILE))
    .digest("hex")
    .slice(0, 8)}`;

  const report: ImportReport = {
    editorial: { total: 0, synced: 0, created: 0 },
    source: {
      total: raw.length, accepted: 0, updated: 0, duplicates: 0, rejected: 0,
      faNameCoverage: 0, patternFallback: [], nearDuplicates: [],
    },
    rejected: [],
  };

  if (verifyOnly) {
    // حالت راستی‌آزمایی بدون نوشتن — فقط شمارش خروجی موردانتظار
    console.log(`verify-only: dataset records=${raw.length}, datasetVersion=${datasetVersion}`);
    process.exit(0);
  }

  console.log(`dataset: ${raw.length} records, version=${datasetVersion}`);

  /* ---------------- بخش ۱: همگام‌سازی رکوردهای ویرایشی ۴۸گانه ---------------- */

  const editorialAll: LibraryExercise[] = [
    ...CHEST_BACK_EXERCISES,
    ...SHOULDERS_ARMS_EXERCISES,
    ...CORE_LEGS_EXERCISES,
    ...GLUTES_CALVES_FULLBODY_EXERCISES,
  ];
  report.editorial.total = editorialAll.length;
  const editorialNameSet = new Set<string>();
  const editorialIdSet = new Set<string>();

  for (const ex of editorialAll) {
    editorialNameSet.add(normalizeName(ex.en));
    editorialIdSet.add(ex.id);

    const difficultyDb = DIFFICULTY_TO_DB[ex.difficulty];
    if (!difficultyDb) throw new Error(`editorial difficulty unmapped: ${ex.id}`);

    const row = {
      id: ex.id,
      faName: ex.fa,
      enName: ex.en,
      altNamesJson: "[]",
      category: ex.category,
      primaryMusclesJson: JSON.stringify(ex.primaryMuscles),
      secondaryMusclesJson: JSON.stringify(ex.secondaryMuscles),
      equipmentJson: JSON.stringify(ex.equipment),
      difficulty: difficultyDb,
      pattern: ex.pattern,
      compound: ex.compound,
      exerciseType: "strength",
      summary: ex.summary,
      stepsJson: JSON.stringify(ex.steps),
      breathing: ex.breathing,
      mistakesJson: JSON.stringify(ex.mistakes),
      safetyJson: JSON.stringify(ex.safety),
      enContentJson: ex.enContent ? JSON.stringify(ex.enContent) : null,
      contentLocale: "fa",
      sourceKey: "editorial",
      sourceLicense: EDITORIAL_LICENSE,
      sourceRef: ex.id,
      datasetVersion: null,
      status: "active",
      coach3dId: ex.coach3dId ?? null,
      // مرحله ۱۹: وضعیت و نگاشت سه‌بعدی دیگر توسط import کتابخانه بازنویسی
      // نمی‌شود — مالک این ستون‌ها import نگاشت مرحله ۱۹ است تا اجرای مجدد
      // این اسکریپت، نگاشت‌های پارامتری را پاک نکند (۶ حرکت legacy با
      // coach3dId حل می‌شوند و profileId آن‌ها باید null بماند).
    };

    const existing = await db.exercise.findUnique({ where: { id: ex.id } });
    if (existing) {
      await db.exercise.update({ where: { id: ex.id }, data: row });
      report.editorial.synced += 1;
    } else {
      await db.exercise.create({ data: row });
      report.editorial.created += 1;
    }
  }
  console.log(
    `editorial: total=${report.editorial.total} created=${report.editorial.created} synced=${report.editorial.synced}`
  );

  /* ---------------- بخش ۲: import منبع آزاد ---------------- */

  const batch = await db.exerciseImportBatch.create({
    data: { sourceKey: SOURCE_KEY, datasetVersion, license: SOURCE_LICENSE },
  });

  let faCovered = 0;

  for (const rec of raw) {
    const name = (rec.name ?? "").trim();
    const reason = validateSourceRecord(rec, name);
    if (reason) {
      report.rejected.push({ name: name || rec.id, reason });
      continue;
    }

    // تکراری‌سنجی با رکوردهای ویرایشی — رکورد هم‌نام skip می‌شود
    if (editorialNameSet.has(normalizeName(name))) {
      report.source.duplicates += 1;
      continue;
    }

    // ایدمپوتنسی: کلید پایدار (sourceKey, sourceRef)
    const stableId = `fbd-${slugify(rec.id)}`;
    const existing = await db.exercise.findUnique({
      where: { sourceKey_sourceRef: { sourceKey: SOURCE_KEY, sourceRef: rec.id } },
    });

    // شناسه پایدار — هرگز نباید به یک رکورد ویرایشی برخورد کند
    if (existing && editorialIdSet.has(existing.id)) {
      report.rejected.push({ name, reason: "stable-id collision with editorial record" });
      continue;
    }

    const level = LEVEL_MAP[rec.level ?? ""] ?? null;
    if (!level) {
      report.rejected.push({ name, reason: `unmapped level: ${rec.level}` });
      continue;
    }

    const muscles = [
      ...new Set((rec.primaryMuscles ?? []).map((m) => MUSCLE_MAP[m]).filter(Boolean)),
    ];
    const secondary = [
      ...new Set(
        (rec.secondaryMuscles ?? [])
          .map((m) => MUSCLE_MAP[m])
          .filter((m): m is string => Boolean(m) && !muscles.includes(m))
      ),
    ];
    if (muscles.length === 0) {
      report.rejected.push({ name, reason: "no mappable primary muscle" });
      continue;
    }

    const equipment = rec.equipment
      ? [EQUIPMENT_MAP[rec.equipment]].filter(Boolean)
      : rec.category === "stretching" || rec.equipment === null
        ? ["bodyweight"]
        : [];
    if (equipment.length === 0) {
      report.rejected.push({ name, reason: `unmapped equipment: ${rec.equipment}` });
      continue;
    }

    const exerciseType = CATEGORY_TYPE_MAP[rec.category];
    if (!exerciseType || !EXERCISE_TYPES.has(exerciseType)) {
      report.rejected.push({ name, reason: `unmapped category: ${rec.category}` });
      continue;
    }

    const category = MUSCLE_TO_CATEGORY[muscles[0]];
    if (!category) {
      report.rejected.push({ name, reason: `no category for muscle: ${muscles[0]}` });
      continue;
    }

    const { pattern, rule } = derivePattern(name, rec.force, rec.category);
    if (pattern === "other") report.source.patternFallback.push(`${name} (${rule})`);

    const tr = translateExerciseName(name);
    if (tr.fa) faCovered += 1;
    const summary = summaryFromInstructions(rec.instructions);

    const row = {
      id: stableId,
      faName: tr.fa,
      enName: name,
      altNamesJson: "[]",
      category,
      primaryMusclesJson: JSON.stringify(muscles),
      secondaryMusclesJson: JSON.stringify(secondary),
      equipmentJson: JSON.stringify(equipment),
      difficulty: level,
      pattern,
      compound: rec.mechanic === "compound" ? true : rec.mechanic === "isolation" ? false : null,
      exerciseType,
      summary,
      stepsJson: JSON.stringify(rec.instructions.map((s) => s.replace(/\s+/g, " ").trim())),
      breathing: null, // منبع داده‌ای ندارد — هیچ مقدار ساختگی نوشته نمی‌شود
      mistakesJson: "[]",
      safetyJson: "[]",
      enContentJson: null,
      contentLocale: "en",
      sourceKey: SOURCE_KEY,
      sourceLicense: SOURCE_LICENSE,
      sourceRef: rec.id,
      datasetVersion,
      status: "active",
      coach3dId: null,
      animation3dStatus: "none",
      animation3dProfileId: null,
    };

    if (existing) {
      await db.exercise.update({ where: { id: existing.id }, data: row });
      report.source.updated += 1;
    } else {
      await db.exercise.create({ data: { ...row, importBatchId: batch.id } });
      report.source.accepted += 1;
    }
  }

  /* ---------------- بخش ۳: تشخیص نزدیک‌تکراری‌ها (شفافیت) ---------------- */

  const editorialTokens = [...editorialNameSet].map((n) => new Set(n.split(" ")));
  for (const rec of raw) {
    const tokens = new Set(normalizeName(rec.name).split(" "));
    if (tokens.size === 0) continue;
    let best: { j: number; name: string } | null = null;
    editorialNameSet.forEach((en) => {
      const other = new Set(en.split(" "));
      const inter = [...tokens].filter((t) => other.has(t)).length;
      const j = inter / (tokens.size + other.size - inter);
      if (!best || j > best.j) best = { j, name: en };
    });
    if (best && (best as { j: number }).j >= 0.8) {
      report.source.nearDuplicates.push({
        source: rec.name,
        editorial: [...editorialAll.find((e) => normalizeName(e.en) === (best as { name: string }).name)?.en ?? ""].join(""),
        jaccard: Math.round((best as { j: number }).j * 100) / 100,
      });
    }
  }

  report.source.faNameCoverage = Math.round((faCovered / Math.max(1, report.source.accepted + report.source.updated)) * 100);
  report.source.patternFallback = report.source.patternFallback.slice(0, 50);
  report.source.nearDuplicates = report.source.nearDuplicates.slice(0, 40);

  await db.exerciseImportBatch.update({
    where: { id: batch.id },
    data: {
      finishedAt: new Date(),
      accepted: report.source.accepted,
      duplicates: report.source.duplicates,
      rejected: report.rejected.length,
      updated: report.source.updated,
      reportJson: JSON.stringify(report),
    },
  });

  console.log("\n===== IMPORT REPORT =====");
  console.log(`editorial  : total=${report.editorial.total} created=${report.editorial.created} synced=${report.editorial.synced}`);
  console.log(`source     : total=${report.source.total} new=${report.source.accepted} updated=${report.source.updated} duplicates=${report.source.duplicates} rejected=${report.rejected.length}`);
  console.log(`faName     : ${report.source.faNameCoverage}% coverage`);
  console.log(`pattern other fallback: ${report.source.patternFallback.length > 0 ? report.source.patternFallback.length : 0}`);
  console.log(`near-duplicates (kept, real variants): ${report.source.nearDuplicates.length}`);
  if (report.rejected.length > 0) {
    console.log(`REJECTED records:`);
    for (const r of report.rejected) console.log(`  - ${r.name}: ${r.reason}`);
  }

  const total = await db.exercise.count({ where: { status: "active" } });
  console.log(`\ndatabase: active exercises now = ${total}`);
  console.log(`batch id: ${batch.id}`);

  await db.$disconnect();
}

function validateSourceRecord(
  rec: {
    id?: string; name?: string; level?: string | null; category?: string;
    primaryMuscles?: string[]; instructions?: string[];
  },
  name: string
): string | null {
  if (!rec.id || typeof rec.id !== "string" || rec.id.length === 0) return "missing id";
  if (!name || name.length < 2) return "missing/short name";
  if (!rec.level) return "missing level";
  if (!rec.category) return "missing category";
  if (!Array.isArray(rec.instructions) || rec.instructions.length === 0) return "no instructions";
  if (!Array.isArray(rec.primaryMuscles) || rec.primaryMuscles.length === 0) return "no primary muscles";
  return null;
}

main().catch((err) => {
  console.error("FATAL: import failed:", err);
  process.exit(1);
});
