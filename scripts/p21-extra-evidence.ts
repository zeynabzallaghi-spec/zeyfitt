/**
 * p21-extra-evidence.ts — فقط‌خواندنی: مدرک‌های تکمیلی ممیزی داده.
 *  ۱) کاربران داخل بکاپ ۱۰:۵۴ (مقایسه ایمیل/نقش با DB فعلی)
 *  ۲) ردپای re-import در جدول ExerciseImportBatch (زمان/شمار)
 *  ۳) آخرین ردیف‌های AdminActionLog (ردپای بازیابی ادمین)
 * اجرا: bun scripts/p21-extra-evidence.ts
 */

import { Database } from "bun:sqlite";

const LIVE = "/home/z/my-project/db/custom.db";
const BACKUP = "/home/z/my-project/backups/custom-20261022-105412.db";

const backup = new Database(BACKUP, { readonly: true, fileMustExist: true });
const live = new Database(LIVE, { readonly: true, fileMustExist: true });

function cols(db: Database, table: string): string[] {
  return db
    .query(`PRAGMA table_info("${table}")`)
    .all()
    .map((r: any) => r.name as string);
}

console.log("== users in BACKUP@10:54 ==");
for (const u of backup
  .query(`SELECT id, email, role, name FROM "user" ORDER BY id`)
  .all()) {
  console.log(`  ${String(u.id).slice(0, 8)}… role=${u.role} email=${u.email} name=${u.name}`);
}

console.log("");
console.log("== ExerciseImportBatch (LIVE, آخرین ردیف‌ها) ==");
const bCols = cols(live, "ExerciseImportBatch").filter((c) =>
  ["id", "createdAt", "status", "totalRows", "importedRows", "source", "note", "filename", "createdBy"].includes(c),
);
if (bCols.length) {
  const rows = live
    .query(
      `SELECT ${bCols.map((c) => `"${c}"`).join(", ")} FROM "ExerciseImportBatch" ORDER BY "createdAt" DESC LIMIT 5`,
    )
    .all();
  console.log(`  batch count total: ${live.query(`SELECT COUNT(*) AS c FROM "ExerciseImportBatch"`).get().c}`);
  for (const r of rows) console.log(`  ${JSON.stringify(r)}`);
} else {
  console.log("  (no usable columns)");
}

console.log("");
console.log("== AdminActionLog (LIVE, آخرین ردیف‌ها) ==");
try {
  const aCols = cols(live, "AdminActionLog").filter((c) =>
    ["id", "createdAt", "action", "type", "actorId", "targetUserId", "meta"].includes(c),
  );
  const rows = live
    .query(
      `SELECT ${aCols.map((c) => `"${c}"`).join(", ")} FROM "AdminActionLog" ORDER BY rowid DESC LIMIT 5`,
    )
    .all();
  for (const r of rows) console.log(`  ${JSON.stringify(r).slice(0, 240)}`);
} catch (e) {
  console.log(`  (unavailable: ${String(e).slice(0, 80)})`);
}

live.close();
backup.close();
