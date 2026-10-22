/**
 * p20a-verify-saved-plan.ts — اثبات ذخیره برنامه از مسیر UI مرورگر (P0).
 * برنامه‌ای که در تست مرورگر با حرکت شخصی ذخیره شد را از DB میخواند:
 * سطر حرکت شخصی باید شناسه خام + source=personal داشته باشد (قرارداد).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const plan = await db.coachWorkoutPlan.findFirst({
  where: { title: "تست P0 حرکت شخصی" },
  select: { id: true, title: true, status: true, contentJson: true },
});
if (!plan) {
  console.log("PLAN NOT FOUND");
  process.exit(1);
}
const content = JSON.parse(plan.contentJson) as {
  days: { exercises: { exerciseId: string; source: string; faName: string }[][] }[];
};
const rows = content.days.flatMap((d) => d.exercises);
console.log("plan:", plan.id, "status:", plan.status);
console.log("rows:", JSON.stringify(rows, null, 2));
const personalRow = rows.find((r) => r.source === "personal");
const ok =
  personalRow &&
  !personalRow.exerciseId.startsWith("cex-") &&
  personalRow.faName === "حرکت شخصی نمایشی";
console.log(ok ? "VERDICT: PASS — personal row stored raw + source=personal" : "VERDICT: FAIL");
await db.$disconnect();
process.exit(ok ? 0 : 1);
