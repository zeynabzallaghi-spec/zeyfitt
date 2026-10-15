import { generatePlan } from "../src/lib/plan-engine/engine";
import type { PlanSettings } from "../src/lib/plan-engine/types";

const base: PlanSettings = {
  goal: "muscle_gain",
  experience: "beginner",
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: ["bodyweight", "dumbbell"],
  focus: "all",
  preferredDays: [0, 2, 4],
  excludedCategories: [],
  excludedExerciseIds: [],
  limitationNotes: null,
};

const p = generatePlan(base);
console.log("title:", p.title);
console.log("total:", p.totalExercises);
for (const d of p.days) {
  console.log(`D${d.order} [${d.weekday}] ${d.title} (${d.estMinutes}min):`);
  for (const ex of d.exercises) {
    console.log(`  - ${ex.faName} (${ex.category}) ${ex.sets}x${ex.repsMin}-${ex.repsMax} rest:${ex.restSeconds}s 3d:${ex.coach3dId ?? "-"}`);
  }
}
// variation test
const p2 = generatePlan({ ...base, goal: "strength", experience: "advanced", daysPerWeek: 6, sessionMinutes: 90, equipment: ["bodyweight","dumbbell","barbell","cable","machine","bench","bar"] });
console.log("\nadvanced plan:", p2.title, "days:", p2.days.length, "exercises:", p2.totalExercises);
console.log("D1 first:", p2.days[0].exercises[0]?.faName, p2.days[0].exercises[0]?.sets, "x", p2.days[0].exercises[0]?.repsMin, "-", p2.days[0].exercises[0]?.repsMax, "rest:", p2.days[0].exercises[0]?.restSeconds);
