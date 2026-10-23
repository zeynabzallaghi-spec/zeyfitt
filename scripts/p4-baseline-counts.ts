import { Database } from "bun:sqlite";
const db = new Database("/home/z/my-project/db/custom.db", { readonly: true });
const q = (sql: string): number => (db.prepare(sql).get() as any).c as number;
const tables = [
  "user", "session", "Exercise", "CoachExercise", "CoachExerciseFolder",
  "ExerciseMedia", "CoachExerciseMedia", "CoachWorkoutPlan", "CoachNutritionPlan",
  "CoachPlanDelivery", "WorkoutPlan", "NutritionPlan", "CoachStudentConnection",
  "Notification", "AdminActionLog", "DirectMessage", "CoachMessage", "CoachMessageAttachment", "AssistantMessage", "ChatBlock",
];
for (const t of tables) {
  try { console.log(`${t}=${q(`SELECT COUNT(*) c FROM "${t}"`)}`); }
  catch { console.log(`${t}=TABLE_MISSING`); }
}
console.log("---exercise origins---");
for (const r of db.prepare(`SELECT origin, publishState, COUNT(*) c FROM "Exercise" GROUP BY origin, publishState`).all() as any[])
  console.log(`origin=${r.origin} publishState=${r.publishState} count=${r.c}`);
console.log("---coach exercise publish states---");
for (const r of db.prepare(`SELECT publishState, COUNT(*) c FROM "CoachExercise" GROUP BY publishState`).all() as any[])
  console.log(`coachEx publishState=${r.publishState} count=${r.c}`);
console.log("---health---");
console.log(`quick_check=${(db.prepare("PRAGMA quick_check").get() as any).quick_check}`);
console.log(`fk_violations=${db.prepare("PRAGMA foreign_key_check").all().length}`);
db.close();
