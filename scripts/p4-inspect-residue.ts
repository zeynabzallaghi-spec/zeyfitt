import { Database } from "bun:sqlite";
const db = new Database("/home/z/my-project/db/custom.db", { readonly: true });
console.log("---AdminActionLog rows---");
for (const r of db.prepare(`SELECT * FROM "AdminActionLog"`).all() as any[])
  console.log(JSON.stringify(r));
console.log("---message-like tables---");
for (const r of db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND (name LIKE '%essage%' OR name LIKE '%hat%' OR name LIKE '%Log%' OR name LIKE '%otification%')`).all() as any[])
  console.log(r.name);
console.log("---storagePath references---");
for (const t of ["ExerciseMedia", "CoachExerciseMedia", "ChatMessage", "Message", "Attachment"]) {
  try {
    const cols = (db.prepare(`PRAGMA table_info("${t}")`).all() as any[]).map(c => c.name);
    const pcol = cols.find(c => /path/i.test(c));
    if (pcol) {
      const rows = db.prepare(`SELECT "${pcol}" p FROM "${t}"`).all() as any[];
      console.log(`${t}.${pcol} count=${rows.length}`);
      for (const r of rows) console.log(`  ${r.p}`);
    }
  } catch {}
}
console.log("---media ids from filesystem vs db---");
// all 12 file keys seen on disk
const fsIds = {
  chatConv: "cmvl9k5bv000dqavl822ko9y0",
  bank: "cexpub-cmvl9s5dl0005qa160d0uq3so",
  coach: ["cmvl9s5dl0005qa160d0uq3so","cmvl9s48q0001qa16byoruusl","cmvl9dsnt0001qafusnf2qz3e","cmvl9c2890001qavecrp4mf2c","cmvl9f42o0001qayuk43cysvw","cmvl99sva0001qafc249f0vk6"],
};
console.log(`Exercise with id like cexpub-cmvl9s5dl%:`, db.prepare(`SELECT COUNT(*) c FROM "Exercise" WHERE id LIKE 'cexpub-cmvl9s5dl%'`).get());
console.log(`CoachExercise cmvl9s5dl%:`, db.prepare(`SELECT COUNT(*) c FROM "CoachExercise" WHERE id LIKE 'cmvl9s5dl%'`).get());
db.close();
