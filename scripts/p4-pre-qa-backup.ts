/**
 * p4-pre-qa-backup.ts — Stage 20 / P4 (Final QA) — Section 1
 * Pre-QA independent DB backup via SQLite VACUUM INTO + health + baseline counts
 * + upload-filesystem snapshot for orphan tracking.
 *
 * Guarantees (per user's P4 rules):
 *   - No reset/wipe/seed of any real DB or data.
 *   - Source DB opened read-only; VACUUM INTO only READS source.
 *   - Never overwrites/deletes an existing backup (fresh timestamped name, -N suffix).
 *   - Does NOT replace the earlier pre-P3 backup (different name prefix).
 *   - Orphan media files are REPORTED, never deleted.
 */
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const SRC_DB = join(ROOT, "db", "custom.db");
const DL_DIR = join(ROOT, "download");
const UPLOADS = join(ROOT, "data", "uploads");

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
if (!existsSync(SRC_DB)) fail("source DB not found at " + SRC_DB);
if (!existsSync(DL_DIR)) mkdirSync(DL_DIR, { recursive: true });

let backupPath = "";
for (let i = 0; i < 100; i++) {
  const suffix = i === 0 ? "" : "-" + i;
  const cand = join(DL_DIR, `pre-p4-qa-backup-${tehranStamp()}${suffix}.db`);
  if (!existsSync(cand)) { backupPath = cand; break; }
}
if (!backupPath) fail("could not pick a fresh backup filename");
const shaPath = backupPath + ".sha256";
const manifestPath = backupPath.replace(/\.db$/, ".manifest.txt");

const COUNT_TARGETS: Array<[string, string]> = [
  ["users", `SELECT COUNT(*) AS c FROM "user"`],
  ["auth_sessions", `SELECT COUNT(*) AS c FROM "session"`],
  ["bank_exercises_total", `SELECT COUNT(*) AS c FROM "Exercise"`],
  ["bank_exercises_origin_core", `SELECT COUNT(*) AS c FROM "Exercise" WHERE origin = 'core'`],
  ["bank_exercises_published", `SELECT COUNT(*) AS c FROM "Exercise" WHERE publishState = 'published'`],
  ["coach_exercises", `SELECT COUNT(*) AS c FROM "CoachExercise"`],
  ["coach_exercise_folders", `SELECT COUNT(*) AS c FROM "CoachExerciseFolder"`],
  ["exercise_media_bank", `SELECT COUNT(*) AS c FROM "ExerciseMedia"`],
  ["coach_exercise_media", `SELECT COUNT(*) AS c FROM "CoachExerciseMedia"`],
  ["coach_workout_plans", `SELECT COUNT(*) AS c FROM "CoachWorkoutPlan"`],
  ["coach_nutrition_plans", `SELECT COUNT(*) AS c FROM "CoachNutritionPlan"`],
  ["plan_deliveries", `SELECT COUNT(*) AS c FROM "CoachPlanDelivery"`],
  ["student_workout_plans", `SELECT COUNT(*) AS c FROM "WorkoutPlan"`],
  ["student_nutrition_plans", `SELECT COUNT(*) AS c FROM "NutritionPlan"`],
  ["coach_student_connections", `SELECT COUNT(*) AS c FROM "CoachStudentConnection"`],
  ["notifications", `SELECT COUNT(*) AS c FROM "Notification"`],
  ["admin_action_logs", `SELECT COUNT(*) AS c FROM "AdminActionLog"`],
  ["direct_messages", `SELECT COUNT(*) AS c FROM "DirectMessage"`],
  ["coach_messages", `SELECT COUNT(*) AS c FROM "CoachMessage"`],
  ["coach_message_attachments", `SELECT COUNT(*) AS c FROM "CoachMessageAttachment"`],
  ["assistant_messages", `SELECT COUNT(*) AS c FROM "AssistantMessage"`],
  ["chat_blocks", `SELECT COUNT(*) AS c FROM "ChatBlock"`],
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
  const rows = db.query(
    "SELECT type, COUNT(*) AS c FROM sqlite_master WHERE type IN ('table','index','view','trigger') GROUP BY type ORDER BY type"
  ).all() as Array<{ type: string; c: number }>;
  const out: Counts = {};
  for (const r of rows) out[r.type] = Number(r.c);
  return out;
}
function pragmaRows(db: Database, pragma: string): string[] {
  return (db.query(pragma).all() as Array<Record<string, unknown>>).map((r) => String(Object.values(r)[0]));
}
function uploadSnapshot(): { fileCount: number; totalBytes: number; files: string[] } {
  const files: string[] = [];
  let totalBytes = 0;
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) { files.push(p.replace(ROOT + "/", "")); totalBytes += statSync(p).size; }
    }
  };
  walk(UPLOADS);
  files.sort();
  return { fileCount: files.length, totalBytes, files };
}

const report: Record<string, unknown> = {};
report.task = "Stage 20 / P4 — pre-QA backup + health + baseline (read-only on source data)";
report.generatedAtTehran = tehranStamp();
report.generatedAtUtc = new Date().toISOString();
report.sourceDb = SRC_DB;
report.sourceSizeBytes = statSync(SRC_DB).size;
report.sourceMtimeUtc = statSync(SRC_DB).mtime.toISOString();
report.backupPath = backupPath;

// STEP 1: pre-backup quick_check + counts
let src = openRo(SRC_DB);
const quickBefore = pragmaRows(src, "PRAGMA quick_check");
const sqliteVersion = String((src.query("SELECT sqlite_version() AS v").get() as { v: string }).v);
const countsBefore = collectCounts(src);
const schemaBefore = collectSchemaObjects(src);
const originRows = src.query(`SELECT origin, publishState, COUNT(*) AS c FROM "Exercise" GROUP BY origin, publishState ORDER BY origin`).all() as any[];
const roleRows = src.query(`SELECT role, COUNT(*) AS c FROM "user" GROUP BY role ORDER BY role`).all() as any[];
const cexStates = src.query(`SELECT publishState, COUNT(*) AS c FROM "CoachExercise" GROUP BY publishState`).all() as any[];
src.close();
report.sqliteEngineVersion = sqliteVersion;
report.exerciseBreakdown = originRows.map((r) => ({ origin: r.origin, publishState: r.publishState, count: Number(r.c) }));
report.userRoleBreakdown = roleRows.map((r) => ({ role: r.role, count: Number(r.c) }));
report.coachExercisePublishBreakdown = cexStates.map((r) => ({ publishState: r.publishState, count: Number(r.c) }));

// upload fs snapshot BEFORE tests
const uploadsBeforeSnap = uploadSnapshot();
report.uploadsBefore = uploadsBeforeSnap;

// STEP 2: VACUUM INTO
const ro = openRo(SRC_DB);
ro.run(`VACUUM INTO '${backupPath}'`);
ro.close();
report.vacuumMode = "read-only connection";
if (!existsSync(backupPath)) fail("VACUUM INTO did not create " + backupPath);
report.backupSizeBytes = statSync(backupPath).size;

// STEP 3: validate backup
const bak = openRo(backupPath);
const bakQuick = pragmaRows(bak, "PRAGMA quick_check");
const integrity = pragmaRows(bak, "PRAGMA integrity_check");
const fkViol = bak.query("PRAGMA foreign_key_check").all() as unknown[];
const countsBackup = collectCounts(bak);
const schemaBackup = collectSchemaObjects(bak);
bak.close();

// STEP 4: source after backup
src = openRo(SRC_DB);
const quickAfter = pragmaRows(src, "PRAGMA quick_check");
const countsAfter = collectCounts(src);
const schemaAfter = collectSchemaObjects(src);
src.close();

// STEP 5: comparison
let countsAllMatch = true;
const comparison = COUNT_TARGETS.map(([label]) => {
  const a = countsBefore[label], b = countsBackup[label] ?? null, c = countsAfter[label] ?? null;
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
  schemaObjectsMatch: schemaMatches,
};
report.counts = { sourceBefore: countsBefore, backup: countsBackup, sourceAfter: countsAfter };
report.comparison = comparison;
report.allCountsMatch = countsAllMatch;

// STEP 6: SHA-256
const shaHex = createHash("sha256").update(readFileSync(backupPath)).digest("hex");
writeFileSync(shaPath, shaHex + "  " + basename(backupPath) + "\n", { mode: 0o644 });
report.sha256 = shaHex;
report.sha256File = shaPath;

const quickOk = quickBefore.join("|") === "ok" && quickAfter.join("|") === "ok" && bakQuick.join("|") === "ok";
const integrityOk = integrity.length === 1 && integrity[0] === "ok";
const fkOk = fkViol.length === 0;
const overallPass = quickOk && integrityOk && fkOk && countsAllMatch && schemaMatches;
report.verdict = {
  sourceQuickCheckOk: quickOk, backupIntegrityOk: integrityOk, backupForeignKeyOk: fkOk,
  countsAllMatch, schemaObjectsMatch: schemaMatches, overallPass,
};

const lines: string[] = [];
lines.push("ZEYFITT PRE-P4-QA BACKUP MANIFEST");
lines.push("=".repeat(60));
lines.push("task: Stage 20 / P4 final QA — pre-test protection backup (read-only)");
lines.push("generatedAtTehran: " + report.generatedAtTehran);
lines.push("generatedAtUtc: " + report.generatedAtUtc);
lines.push("sourceDb: " + SRC_DB);
lines.push("sourceSizeBytes: " + report.sourceSizeBytes);
lines.push("sqliteEngine: " + sqliteVersion + " (VACUUM INTO on read-only connection)");
lines.push("backupPath: " + backupPath);
lines.push("backupSizeBytes: " + report.backupSizeBytes);
lines.push("sha256: " + shaHex);
lines.push("quick_check(source before/after): " + quickBefore.join(",") + " / " + quickAfter.join(","));
lines.push("integrity_check(backup): " + integrity.join(","));
lines.push("foreign_key_check violations: " + fkViol.length);
lines.push("allCountsMatch(three-way): " + countsAllMatch);
lines.push("schemaObjectsMatch: " + schemaMatches);
lines.push("verdict: " + (overallPass ? "PASS" : "FAIL"));
lines.push("");
lines.push("BASELINE COUNTS (source before tests):");
for (const [k, v] of Object.entries(countsBefore)) lines.push(`  ${k} = ${v}`);
lines.push("");
lines.push("UPLOADS SNAPSHOT BEFORE TESTS: " + uploadsBeforeSnap.fileCount + " files, " + uploadsBeforeSnap.totalBytes + " bytes");
for (const f of uploadsBeforeSnap.files) lines.push("  " + f);
lines.push("");
lines.push("NOTE: earlier backup download/pre-p3-backup-2026-10-23T19-14-37.db (sha256 de3b981f...) belongs to");
lines.push("Task 48 and is intentionally NOT replaced by this file.");
writeFileSync(manifestPath, lines.join("\n") + "\n", { mode: 0o644 });
report.manifestPath = manifestPath;

console.log(JSON.stringify({
  backupPath, backupSizeBytes: report.backupSizeBytes, sha256: shaHex,
  quickBefore, bakQuick, integrity, fkViolations: fkViol.length,
  allCountsMatch: countsAllMatch, schemaObjectsMatch: schemaMatches, overallPass,
  uploadsBefore: { fileCount: uploadsBeforeSnap.fileCount, totalBytes: uploadsBeforeSnap.totalBytes },
  baselineCounts: countsBefore,
  manifestPath,
}, null, 2));
if (!overallPass) process.exit(1);
