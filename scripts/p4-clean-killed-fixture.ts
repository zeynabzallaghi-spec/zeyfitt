import { Database } from "bun:sqlite";
const IDS = [
  "2ltdgzCBXHL5ZCFG5nt4gYOd9cBU5vx6",
  "ZJ2YBwh0zwJrMxg26dcXi5hM9mDrncpi",
  "UnLgZncz2xHBSHrq0XqMZNL3YMNESEYg",
  "I9yjfflpWTah3il4JWDy5sZAFr9NYPYg",
];
const db = new Database("/home/z/my-project/db/custom.db");
db.run("PRAGMA foreign_keys = ON");

// 1) inventory dependent rows referencing these users anywhere
const ph = IDS.map(() => "?").join(",");
const tables = (db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as any[]).map(r => r.name);
for (const t of tables) {
  const cols = (db.prepare(`PRAGMA table_info("${t}")`).all() as any[]).filter(c => /user.*[iI]d$|^[a-z]*UserId$|^userId$|^ownerUserId$|^coachId$|^studentId$|^adminId$/.test(c.name));
  for (const c of cols) {
    try {
      const n = (db.prepare(`SELECT COUNT(*) c FROM "${t}" WHERE "${c.name}" IN (${ph})`).get(...IDS) as any).c;
      if (n > 0) console.log(`dep: ${t}.${c.name} = ${n}`);
    } catch {}
  }
}

// 2) verify these ids are indeed p196test fixtures (safety gate)
const bad = (db.prepare(`SELECT COUNT(*) c FROM "user" WHERE id IN (${ph}) AND email LIKE 'p196test-%@test.invalid'`).get(...IDS) as any).c;
if (bad !== 4) { console.log(`SAFETY_GATE_FAIL: only ${bad}/4 match fixture pattern — aborting`); process.exit(1); }

// 3) delete users (cascades handle dependents per schema)
const r = db.prepare(`DELETE FROM "user" WHERE id IN (${ph}) AND email LIKE 'p196test-%@test.invalid'`).run(...IDS);
console.log(`deleted users: ${r.changes}`);

// 4) verify zero residue + health
const remaining = (db.prepare(`SELECT COUNT(*) c FROM "user" WHERE email LIKE '%p196test-%'`).get() as any).c;
const fk = db.prepare("PRAGMA foreign_key_check").all().length;
const qc = (db.prepare("PRAGMA quick_check").get() as any).quick_check;
console.log(`remaining p196test users=${remaining} | fk_violations=${fk} | quick_check=${qc}`);
db.close();
if (remaining !== 0 || fk !== 0 || qc !== "ok") process.exit(1);
