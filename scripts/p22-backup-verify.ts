/**
 * p22-backup-verify.ts — اعتبارسنجی کامل بکاپ رسمی + بازیابی آزمایشی ایزوله.
 *
 * استفاده: bun scripts/p22-backup-verify.ts <مسیر-بکاپ.db>
 *
 * تضمین‌ها:
 *   - هیچ نوشتنی روی دیتابیس فعال انجام نمیشود
 *   - اعتبارسنجی ساختاری: integrity_check + foreign_key_check + شمارش جدول‌های مهم (اتصال readonly به خود فایل بکاپ)
 *   - checksum (sha256) و اندازه فایل
 *   - بازیابی آزمایشی: کپی بکاپ در scratch/p22-restore-test/custom.db و باز کردن در حالت
 *     عادی (نه readonly) — شبیه‌سازی واقعی بازیابی — سپس integrity + شمارش‌ها + کوئری نمونه
 *   - ایمیل‌ها در خروجی ماسک میشوند
 */

import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";

const backupPath = process.argv[2];
if (!backupPath) {
  console.error("usage: bun scripts/p22-backup-verify.ts <backup.db>");
  process.exit(2);
}

const COUNT_TABLES = [
  "user",
  "Exercise",
  "WorkoutPlan",
  "CoachWorkoutPlan",
  "NutritionPlan",
  "CoachNutritionPlan",
  "CoachExercise",
  "CoachExerciseFolder",
  "CoachExerciseMedia",
  "CoachMessage",
  "CoachMessageAttachment",
  "CoachConversation",
  "DirectThread",
  "DirectMessage",
  "FitnessProfile",
  "CoachProfile",
  "CoachStudentNote",
  "WorkoutSession",
];

function maskEmail(e: string): string {
  const [local, domain] = e.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

function collectCounts(db: Database): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of COUNT_TABLES) {
    try {
      counts[t] = db.query(`SELECT COUNT(*) AS c FROM "${t}"`).get().c;
    } catch {
      counts[t] = -1;
    }
  }
  return counts;
}

/* ---------- checksum + اندازه ---------- */

const buf = readFileSync(backupPath);
const sha256 = createHash("sha256").update(buf).digest("hex");
const sizeBytes = statSync(backupPath).size;

/* ---------- اعتبارسنجی ساختاری فایل بکاپ (readonly) ---------- */

const db = new Database(backupPath, { readonly: true, fileMustExist: true });
const integrity = (db.query("PRAGMA integrity_check").get() as any)
  .integrity_check;
const fkViolations = db.query("PRAGMA foreign_key_check").all().length;
const counts = collectCounts(db);
const roles = db
  .query(`SELECT role, COUNT(*) AS c FROM "user" GROUP BY role ORDER BY role`)
  .all();
const admins = db
  .query(`SELECT email FROM "user" WHERE role = 'ADMIN'`)
  .all()
  .map((r: any) => maskEmail(r.email));
db.close();

/* ---------- بازیابی آزمایشی ایزوله ---------- */

const RESTORE_DIR = "/home/z/my-project/scratch/p22-restore-test";
rmSync(RESTORE_DIR, { recursive: true, force: true });
mkdirSync(RESTORE_DIR, { recursive: true });
const restoredPath = `${RESTORE_DIR}/custom.db`;
copyFileSync(backupPath, restoredPath);

// باز کردن در حالت عادی (نه readonly) — شبیه‌سازی واقعی بازیابی روی مسیر ایزوله
const r = new Database(restoredPath);
const rIntegrity = (r.query("PRAGMA integrity_check").get() as any)
  .integrity_check;
const rFkViolations = r.query("PRAGMA foreign_key_check").all().length;
const rCounts = collectCounts(r);

function pickCols(d: Database, table: string, candidates: string[]): string[] {
  const have = d
    .query(`PRAGMA table_info("${table}")`)
    .all()
    .map((x: any) => x.name as string);
  return candidates.filter((c) => have.includes(c));
}

// کوئری‌های نمونه واقعی روی نسخه بازیابی‌شده
const exCols = pickCols(r, "Exercise", ["id", "faName", "enName", "category"]);
const sampleExercises = r
  .query(`SELECT ${exCols.join(", ")} FROM "Exercise" LIMIT 3`)
  .all();
const userCols = pickCols(r, "user", ["id", "email", "role"]);
const sampleUsers = r
  .query(`SELECT ${userCols.join(", ")} FROM "user" ORDER BY "id" LIMIT 5`)
  .all()
  .map((u: any) => ({ ...u, email: maskEmail(u.email) }));
r.close();

/* ---------- مقایسه شمارش‌ها: بکاپ در برابر نسخه بازیابی‌شده ---------- */

const countsMatch = COUNT_TABLES.every((t) => counts[t] === rCounts[t]);

/* ---------- جمع‌بندی ---------- */

const healthyState =
  counts.user === 4 && counts.Exercise === 905 && admins.length >= 1;

const verdict =
  integrity === "ok" &&
  rIntegrity === "ok" &&
  fkViolations === 0 &&
  rFkViolations === 0 &&
  countsMatch
    ? "PASS"
    : "FAIL";

console.log("== p22 backup verification ==");
console.log(`file: ${backupPath}`);
console.log(`size: ${sizeBytes} bytes`);
console.log(`sha256: ${sha256}`);
console.log("");
console.log(`backup  integrity_check: ${integrity} | fk_violations: ${fkViolations}`);
console.log(`restore integrity_check: ${rIntegrity} | fk_violations: ${rFkViolations}`);
console.log("");
console.log("-- record counts (backup / restored) --");
for (const t of COUNT_TABLES) {
  console.log(`${t}: ${counts[t]} / ${rCounts[t]}`);
}
console.log("");
console.log(`roles: ${JSON.stringify(roles)}`);
console.log(`admin(s): ${admins.join(", ")}`);
console.log(`healthy-state check (users=4, exercises=905, admin present): ${healthyState ? "YES" : "NO"}`);
console.log("");
console.log(`counts backup==restored: ${countsMatch ? "YES" : "NO"}`);
console.log(`sample exercises (restored, 3 of ${counts.Exercise}):`);
for (const e of sampleExercises) console.log(`  ${JSON.stringify(e)}`);
console.log(`sample users (restored, masked): ${JSON.stringify(sampleUsers)}`);
console.log("");
console.log(`VERDICT: ${verdict}`);

writeFileSync(
  `${RESTORE_DIR}/verify-report.json`,
  JSON.stringify(
    {
      backupPath,
      sizeBytes,
      sha256,
      integrity,
      fkViolations,
      restoreTest: {
        restoredPath,
        integrity: rIntegrity,
        fkViolations: rFkViolations,
        countsMatch,
      },
      counts,
      roles,
      healthyState,
      verdict,
      generatedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(`report: ${RESTORE_DIR}/verify-report.json`);

if (verdict !== "PASS") process.exit(1);
