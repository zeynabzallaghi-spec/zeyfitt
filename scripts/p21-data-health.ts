/**
 * p21-data-health.ts — ممیزی سلامت داده، فقط‌خواندنی (دروازه پیش از P1).
 *
 * تضمین‌ها:
 *   - هیچ نوشتنی روی db/custom.db انجام نمیشود (فقط اتصال readonly + snapshot معکوس‌شده در scratch)
 *   - تحلیل «وضعیت فعلی» روی snapshot ایزوله انجام میشود نه فایل زنده
 *   - فایل بکاپ موجود هم فقط با اتصال readonly باز میشود
 *   - مقایسه ردیف‌به‌ردیف (id-level) بین بکاپ و وضعیت فعلی برای کشف حذف/افزوده‌ها
 *
 * اجرا: bun scripts/p21-data-health.ts
 */

import { Database } from "bun:sqlite";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  statSync,
  copyFileSync,
} from "node:fs";

const LIVE = "/home/z/my-project/db/custom.db";
const BACKUP = "/home/z/my-project/backups/custom-20261022-105412.db";
const SCRATCH = "/home/z/my-project/scratch/p21-data-health";
mkdirSync(SCRATCH, { recursive: true });

// جدول‌هایی که مقایسه id-level میشوند (آمار اصلی درخواستی کاربر + برنامه‌های مربی)
const ID_TABLES: Record<string, { table: string; cols: string[] }> = {
  users: { table: "user", cols: ["id", "email", "name", "role"] },
  plans: { table: "WorkoutPlan", cols: ["id", "coachId", "studentId", "title"] },
  coachPrograms: { table: "CoachWorkoutPlan", cols: ["id", "coachId", "title"] },
  coachExercises: { table: "CoachExercise", cols: ["id", "coachId", "name", "source"] },
};

// جدول‌های محتوای کاربر که فقط شمارش میشوند
const COUNT_ONLY = [
  "Exercise",
  "CoachMessage",
  "CoachConversation",
  "DirectMessage",
  "FitnessProfile",
  "CoachProfile",
  "CoachExerciseMedia",
  "CoachExerciseFolder",
  "NutritionPlan",
  "CoachNutritionPlan",
];

function tableCols(db: Database, table: string): string[] {
  return db
    .query(`PRAGMA table_info("${table}")`)
    .all()
    .map((r: any) => r.name as string);
}

function analyze(path: string, label: string) {
  const db = new Database(path, { readonly: true, fileMustExist: true });
  const integrity = db.query("PRAGMA integrity_check").get() as any;
  const fk = db.query("PRAGMA foreign_key_check").all();
  const out: any = {
    label,
    path,
    integrity: integrity?.integrity_check ?? "unknown",
    fkViolations: fk.length,
    counts: {},
    rows: {},
  };

  for (const [key, spec] of Object.entries(ID_TABLES)) {
    const available = tableCols(db, spec.table).filter((c) =>
      spec.cols.includes(c),
    );
    out.counts[key] = db
      .query(`SELECT COUNT(*) AS c FROM "${spec.table}"`)
      .get().c;
    out.rows[key] = db
      .query(
        `SELECT ${available.map((c) => `"${c}"`).join(", ")} FROM "${spec.table}" ORDER BY "id"`,
      )
      .all();
  }

  for (const t of COUNT_ONLY) {
    try {
      out.counts[t] = db.query(`SELECT COUNT(*) AS c FROM "${t}"`).get().c;
    } catch {
      out.counts[t] = "TABLE_MISSING";
    }
  }

  // بقایای fixture های تستی در این دیتابیس
  try {
    out.fixtureUsers = db
      .query(
        `SELECT id, email, name FROM "user"
         WHERE lower(email) LIKE '%p20a%' OR lower(email) LIKE '%fixture%'
            OR lower(email) LIKE '%p196%' OR lower(email) LIKE '%+test%' OR lower(email) LIKE '%test@%'`,
      )
      .all();
  } catch (e) {
    out.fixtureUsers = `ERROR: ${String(e).slice(0, 80)}`;
  }
  try {
    out.personalSourceCoachExercises = db
      .query(`SELECT COUNT(*) AS c FROM "CoachExercise" WHERE source = 'personal'`)
      .get().c;
  } catch {
    out.personalSourceCoachExercises = "COL_MISSING";
  }

  db.close();
  return out;
}

/* ---------- snapshot ایزوله از دیتابیس فعال (بدون نوشتن روی فایل زنده) ---------- */

let snapshotPath = "";
let snapshotMethod = "";

const liveStat = statSync(LIVE);
try {
  const live = new Database(LIVE, { readonly: true, fileMustExist: true });
  const bytes = live.serialize(); // snapshot سازگار نقطه-زمانی، فقط خواندن
  live.close();
  snapshotPath = `${SCRATCH}/live-snapshot.db`;
  writeFileSync(snapshotPath, bytes);
  snapshotMethod = "serialize() readonly → نسخه ایزوله";
} catch (e) {
  // fallback: کپی فایل (با wal/shm در صورت وجود)
  snapshotPath = `${SCRATCH}/live-snapshot-copy.db`;
  copyFileSync(LIVE, snapshotPath);
  for (const ext of ["-wal", "-shm"]) {
    if (existsSync(LIVE + ext)) copyFileSync(LIVE + ext, snapshotPath + ext);
  }
  snapshotMethod = `file-copy fallback (${String(e).slice(0, 60)})`;
}

/* ---------- بررسی مستقیم زنده (فقط quick_check روی اتصال readonly) ---------- */

let liveDirectCheck = "skipped";
try {
  const live = new Database(LIVE, { readonly: true, fileMustExist: true });
  liveDirectCheck = (live.query("PRAGMA quick_check").get() as any).quick_check;
  live.close();
} catch (e) {
  liveDirectCheck = `unavailable: ${String(e).slice(0, 60)}`;
}

/* ---------- تحلیل هر دو دیتابیس ---------- */

const live = analyze(snapshotPath, "LIVE (snapshot)");
const backup = analyze(BACKUP, "BACKUP (10:54)");

/* ---------- مقایسه id-level ---------- */

function diff(label: string, backupRows: any[], liveRows: any[]) {
  const b = new Map(backupRows.map((r) => [r.id, r]));
  const l = new Map(liveRows.map((r) => [r.id, r]));
  const deleted = [...b.keys()].filter((id) => !l.has(id)); // در بکاپ هست، در فعلی نیست
  const added = [...l.keys()].filter((id) => !b.has(id)); // در فعلی هست، در بکاپ نیست
  return { label, backupCount: b.size, liveCount: l.size, deleted, added };
}

const diffs = Object.keys(ID_TABLES).map((k) =>
  diff(k, backup.rows[k], live.rows[k]),
);

/* ---------- گزارش ---------- */

const report = {
  generatedAt: new Date().toISOString(),
  liveFile: { path: LIVE, mtime: liveStat.mtime.toISOString(), sizeBytes: liveStat.size },
  backupFile: { path: BACKUP, mtime: statSync(BACKUP).mtime.toISOString(), sizeBytes: statSync(BACKUP).size },
  snapshotMethod,
  liveDirectQuickCheck: liveDirectCheck,
  live: { integrity: live.integrity, fkViolations: live.fkViolations, counts: live.counts, fixtureUsers: live.fixtureUsers, personalSourceCoachExercises: live.personalSourceCoachExercises },
  backup: { integrity: backup.integrity, fkViolations: backup.fkViolations, counts: backup.counts },
  idLevelDiff: diffs,
  liveUsersDetail: live.rows.users,
  liveCoachExercisesDetail: live.rows.coachExercises,
  deletedRowsDetail: diffs.map((d) => ({
    label: d.label,
    rows: d.deleted.map((id) => backup.rows[d.label].find((r: any) => r.id === id)),
  })),
  addedRowsDetail: diffs.map((d) => ({
    label: d.label,
    rows: d.added.map((id) => live.rows[d.label].find((r: any) => r.id === id)),
  })),
};

writeFileSync(`${SCRATCH}/report.json`, JSON.stringify(report, null, 2));

/* ---------- خروجی متنی فشرده ---------- */

console.log("== p21 data health (READ-ONLY) ==");
console.log(`live mtime: ${report.liveFile.mtime} | backup mtime: ${report.backupFile.mtime}`);
console.log(`snapshot method: ${snapshotMethod}`);
console.log(`live direct quick_check: ${liveDirectCheck}`);
console.log("");
console.log(`LIVE  integrity_check: ${live.integrity} | fk_violations: ${live.fkViolations}`);
console.log(`BACKUP integrity_check: ${backup.integrity} | fk_violations: ${backup.fkViolations}`);
console.log("");
console.log("-- counts (LIVE vs BACKUP@10:54) --");
for (const k of Object.keys(ID_TABLES)) {
  console.log(`${k}: live=${live.counts[k]} backup=${backup.counts[k]}`);
}
for (const t of COUNT_ONLY) {
  console.log(`${t}: live=${live.counts[t]} backup=${backup.counts[t]}`);
}
console.log("");
console.log("-- id-level diff (backup → live) --");
for (const d of diffs) {
  console.log(`${d.label}: deleted=${d.deleted.length} added=${d.added.length}`);
  if (d.deleted.length) console.log(`  DELETED ids: ${d.deleted.join(", ")}`);
  if (d.added.length) console.log(`  ADDED ids: ${d.added.join(", ")}`);
}
console.log("");
console.log(`fixture-remnant users in LIVE: ${JSON.stringify(live.fixtureUsers)}`);
console.log(`CoachExercise source=personal in LIVE: ${live.personalSourceCoachExercises}`);
console.log("");
console.log("-- users in LIVE --");
for (const u of live.rows.users) {
  console.log(`  ${u.id.slice(0, 8)}… role=${u.role} email=${u.email} name=${u.name}`);
}
console.log("");
console.log(`full JSON: ${SCRATCH}/report.json`);
