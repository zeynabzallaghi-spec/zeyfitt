/**
 * p2c-pre-p3-backup.ts — Task 48
 * Pre-P3 preparation: independent DB backup via SQLite VACUUM INTO + health verification.
 *
 * Guarantees (per user's explicit rules):
 *   - No modification/deletion of any existing data, schema, code, or settings.
 *   - No reset of any DB or folder.
 *   - Only NEW files are created under /home/z/my-project/download/.
 *   - Source DB is opened read-only wherever possible; VACUUM INTO only READS the
 *     source and writes the new standalone backup file.
 *   - Backup target is never overwritten (fresh timestamped name; -N suffix fallback).
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SRC_DB = join(ROOT, "db", "custom.db");
const DL_DIR = join(ROOT, "download");

function fail(msg: string): never {
  console.error("FAIL: " + msg);
  process.exit(1);
}

function tehranStamp(): string {
  return new Date()
    .toLocaleString("sv-SE", { timeZone: "Asia/Tehran", hour12: false })
    .replace(" ", "T")
    .replace(/:/g, "-");
}

// ---------- preconditions ----------
if (!existsSync(SRC_DB)) fail("source DB not found at " + SRC_DB);
if (!existsSync(DL_DIR)) mkdirSync(DL_DIR, { recursive: true });

// pick a non-existing backup target (never overwrite/delete anything)
let backupPath = "";
for (let i = 0; i < 100; i++) {
  const suffix = i === 0 ? "" : "-" + i;
  const cand = join(DL_DIR, `pre-p3-backup-${tehranStamp()}${suffix}.db`);
  if (!existsSync(cand)) {
    backupPath = cand;
    break;
  }
}
if (!backupPath) fail("could not pick a fresh backup filename");
const shaPath = backupPath + ".sha256";
const manifestPath = backupPath.replace(/\.db$/, ".manifest.txt");

// ---------- count targets (table names verified against sqlite_master) ----------
const COUNT_TARGETS: Array<[string, string]> = [
  ["users", `SELECT COUNT(*) AS c FROM "user"`],
  ["auth_sessions", `SELECT COUNT(*) AS c FROM "session"`],
  [
    "bank_exercises_total",
    `SELECT COUNT(*) AS c FROM "Exercise"`,
  ],
  [
    "bank_exercises_origin_core",
    `SELECT COUNT(*) AS c FROM "Exercise" WHERE origin = 'core'`,
  ],
  [
    "bank_exercises_origin_other",
    `SELECT COUNT(*) AS c FROM "Exercise" WHERE origin IS NOT 'core'`,
  ],
  ["coach_exercises", `SELECT COUNT(*) AS c FROM "CoachExercise"`],
  ["coach_exercise_folders", `SELECT COUNT(*) AS c FROM "CoachExerciseFolder"`],
  ["exercise_media_bank", `SELECT COUNT(*) AS c FROM "ExerciseMedia"`],
  ["coach_exercise_media", `SELECT COUNT(*) AS c FROM "CoachExerciseMedia"`],
  ["coach_workout_plans", `SELECT COUNT(*) AS c FROM "CoachWorkoutPlan"`],
  ["coach_nutrition_plans", `SELECT COUNT(*) AS c FROM "CoachNutritionPlan"`],
  ["plan_deliveries", `SELECT COUNT(*) AS c FROM "CoachPlanDelivery"`],
  ["student_workout_plans", `SELECT COUNT(*) AS c FROM "WorkoutPlan"`],
  ["student_nutrition_plans", `SELECT COUNT(*) AS c FROM "NutritionPlan"`],
  [
    "coach_student_connections",
    `SELECT COUNT(*) AS c FROM "CoachStudentConnection"`,
  ],
  ["notifications", `SELECT COUNT(*) AS c FROM "Notification"`],
];

type Counts = Record<string, number>;

const openRo = (p: string) => new Database(p, { readonly: true });

function collectCounts(db: Database): Counts {
  const out: Counts = {};
  for (const [label, sql] of COUNT_TARGETS) {
    const row = db.query(sql).get() as Record<string, unknown> | null;
    out[label] = row ? Number(row.c) : -1;
  }
  return out;
}

function collectSchemaObjects(db: Database): Counts {
  const rows = db
    .query(
      "SELECT type, COUNT(*) AS c FROM sqlite_master WHERE type IN ('table','index','view','trigger') GROUP BY type ORDER BY type"
    )
    .all() as Array<{ type: string; c: number }>;
  const out: Counts = {};
  for (const r of rows) out[r.type] = Number(r.c);
  return out;
}

function pragmaRows(db: Database, pragma: string): string[] {
  return (
    db.query(pragma).all() as Array<Record<string, unknown>>
  ).map((r) => String(Object.values(r)[0]));
}

const report: Record<string, unknown> = {};
report.task = "Task 48 — pre-P3 backup + health check (read-only on source data)";
report.generatedAtTehran = tehranStamp();
report.generatedAtUtc = new Date().toISOString();
report.sourceDb = SRC_DB;
report.sourceSizeBytes = statSync(SRC_DB).size;
report.backupPath = backupPath;

// ---------- STEP 1: pre-backup quick_check + counts (read-only) ----------
let src = openRo(SRC_DB);
const quickBefore = pragmaRows(src, "PRAGMA quick_check");
const sqliteVersion = String(
  (src.query("SELECT sqlite_version() AS v").get() as { v: string }).v
);
const countsBefore = collectCounts(src);
const schemaBefore = collectSchemaObjects(src);
const originRows = src
  .query(`SELECT origin, COUNT(*) AS c FROM "Exercise" GROUP BY origin ORDER BY origin`)
  .all() as Array<{ origin: string | null; c: number }>;
const roleRows = src
  .query(`SELECT role, COUNT(*) AS c FROM "user" GROUP BY role ORDER BY role`)
  .all() as Array<{ role: string; c: number }>;
src.close();

report.sqliteEngineVersion = sqliteVersion;
report.exerciseOriginBreakdown = originRows.map((r) => ({
  origin: r.origin,
  count: Number(r.c),
}));
report.userRoleBreakdown = roleRows.map((r) => ({
  role: r.role,
  count: Number(r.c),
}));

// ---------- STEP 2: VACUUM INTO (reads source, writes new file) ----------
try {
  const ro = openRo(SRC_DB);
  ro.run(`VACUUM INTO '${backupPath}'`);
  ro.close();
  report.vacuumMode = "read-only connection";
} catch (roErr) {
  const rw = new Database(SRC_DB);
  try {
    rw.run(`VACUUM INTO '${backupPath}'`);
    report.vacuumMode =
      "read-write connection (readonly attempt failed: " +
      String((roErr as Error).message) +
      ")";
  } finally {
    rw.close();
  }
}
if (!existsSync(backupPath)) fail("VACUUM INTO did not create " + backupPath);
report.backupSizeBytes = statSync(backupPath).size;

// ---------- STEP 3: validate the backup copy (standalone) ----------
const bak = openRo(backupPath);
const bakQuick = pragmaRows(bak, "PRAGMA quick_check");
const integrity = pragmaRows(bak, "PRAGMA integrity_check");
const fkViol = bak.query("PRAGMA foreign_key_check").all() as unknown[];
const countsBackup = collectCounts(bak);
const schemaBackup = collectSchemaObjects(bak);
bak.close();

// ---------- STEP 4: source after backup (fresh read-only connection) ----------
src = openRo(SRC_DB);
const quickAfter = pragmaRows(src, "PRAGMA quick_check");
const countsAfter = collectCounts(src);
const schemaAfter = collectSchemaObjects(src);
src.close();

// ---------- STEP 5: comparison ----------
let countsAllMatch = true;
const comparison = COUNT_TARGETS.map(([label]) => {
  const a = countsBefore[label];
  const b = countsBackup[label] ?? null;
  const c = countsAfter[label] ?? null;
  const match = a === b && a === c;
  if (!match) countsAllMatch = false;
  return { entity: label, sourceBefore: a, backup: b, sourceAfter: c, match };
});

const schemaMatches =
  JSON.stringify(schemaBefore) === JSON.stringify(schemaBackup) &&
  JSON.stringify(schemaBefore) === JSON.stringify(schemaAfter);

report.checks = {
  sourceQuickCheckBefore: quickBefore,
  sourceQuickCheckAfter: quickAfter,
  backupQuickCheck: bakQuick,
  backupIntegrityCheck: integrity,
  backupForeignKeyCheckViolations: fkViol.length,
  backupForeignKeyCheckRows: fkViol,
  schemaObjectsSourceBefore: schemaBefore,
  schemaObjectsBackup: schemaBackup,
  schemaObjectsSourceAfter: schemaAfter,
  schemaObjectsMatch: schemaMatches,
};
report.counts = {
  sourceBefore: countsBefore,
  backup: countsBackup,
  sourceAfter: countsAfter,
};
report.comparison = comparison;
report.allCountsMatch = countsAllMatch;

// ---------- STEP 6: SHA-256 of the backup ----------
const shaHex = createHash("sha256")
  .update(readFileSync(backupPath))
  .digest("hex");
writeFileSync(shaPath, shaHex + "  " + basename(backupPath) + "\n", {
  mode: 0o644,
});
report.sha256 = shaHex;
report.sha256File = shaPath;

// ---------- verdict ----------
const quickOk =
  quickBefore.join("|") === "ok" &&
  quickAfter.join("|") === "ok" &&
  bakQuick.join("|") === "ok";
const integrityOk = integrity.length === 1 && integrity[0] === "ok";
const fkOk = fkViol.length === 0;
const schemaOk = schemaMatches;
const overallPass = quickOk && integrityOk && fkOk && countsAllMatch && schemaOk;

report.verdict = {
  sourceQuickCheckOk: quickOk,
  backupIntegrityOk: integrityOk,
  backupForeignKeyOk: fkOk,
  countsAllMatch,
  schemaObjectsMatch: schemaOk,
  overallPass,
};

// ---------- manifest ----------
const lines: string[] = [];
lines.push("ZEYFITT PRE-P3 BACKUP MANIFEST");
lines.push("=".repeat(60));
lines.push("task: Task 48 (pre-P3 preparation — backup + health check only)");
lines.push("generatedAtTehran: " + report.generatedAtTehran);
lines.push("generatedAtUtc: " + report.generatedAtUtc);
lines.push("method: SQLite VACUUM INTO (standalone, compacted copy)");
lines.push("sqliteEngineVersion: " + sqliteVersion);
lines.push("vacuumMode: " + report.vacuumMode);
lines.push("");
lines.push("sourceDb: " + SRC_DB);
lines.push("sourceSizeBytes: " + report.sourceSizeBytes);
lines.push("");
lines.push("backupFile: " + backupPath);
lines.push("backupSizeBytes: " + report.backupSizeBytes);
lines.push("backupSha256: " + shaHex);
lines.push("sha256File: " + shaPath);
lines.push("");
lines.push("HEALTH CHECKS");
lines.push("sourceQuickCheckBefore: " + quickBefore.join(","));
lines.push("sourceQuickCheckAfter: " + quickAfter.join(","));
lines.push("backupQuickCheck: " + bakQuick.join(","));
lines.push("backupIntegrityCheck: " + integrity.join(","));
lines.push(
  "backupForeignKeyCheck: " + (fkOk ? "ok (0 violations)" : fkViol.length + " violations")
);
lines.push("");
lines.push("ROW COUNTS (sourceBefore / backup / sourceAfter)");
for (const row of comparison) {
  lines.push(
    "  " +
      row.entity.padEnd(28) +
      row.sourceBefore +
      " / " +
      row.backup +
      " / " +
      row.sourceAfter +
      (row.match ? "  [match]" : "  [MISMATCH]")
  );
}
lines.push("");
lines.push("exerciseOriginBreakdown: " + JSON.stringify(report.exerciseOriginBreakdown));
lines.push("userRoleBreakdown: " + JSON.stringify(report.userRoleBreakdown));
lines.push("schemaObjects: " + JSON.stringify(schemaBefore) + (schemaOk ? " (identical in backup & after)" : " (MISMATCH!)"));
lines.push("");
lines.push("allCountsMatch: " + countsAllMatch);
lines.push("overallPass: " + overallPass);
lines.push("");
lines.push("GUARANTEES");
lines.push("- No data was modified or deleted; no reset performed on any DB or folder.");
lines.push("- Only NEW files were created under /home/z/my-project/download/.");
lines.push("- No code, schema, UI, or settings changes were made.");
lines.push("- Source DB was opened read-only" + (report.vacuumMode === "read-only connection" ? " throughout (VACUUM INTO ran on a read-only connection)." : " except the VACUUM INTO execution which only READS the source."));
lines.push("- Git/Push: out of scope per user instruction (not touched).");
writeFileSync(manifestPath, lines.join("\n") + "\n", { mode: 0o644 });
report.manifestFile = manifestPath;

// ---------- output ----------
console.log(JSON.stringify(report, null, 2));
if (!overallPass) process.exit(1);
