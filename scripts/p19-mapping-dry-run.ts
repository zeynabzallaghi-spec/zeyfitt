/**
 * پیش‌نمایش طبقه‌بندی نگاشت (dry-run) — بدون هیچ نوشتنی در دیتابیس.
 * خروجی: شمارش per-profile، شمارش per-basis، فهرست کامل fallback‌ها و
 * نگاشت‌های دستی برای بازبینی دستی کیفیت پیش از import.
 */
import { PrismaClient } from "@prisma/client";
import { classify } from "./p19-mapping-rules";
import { buildFromMapping } from "../src/lib/fitness3d/profiles/registry";

const db = new PrismaClient();

async function main() {
  const rows = await db.exercise.findMany({ where: { status: "active" } });
  const byProfile = new Map<string, number>();
  const byBasis = new Map<string, number>();
  const fallbacks: string[] = [];
  const perProfileUsers = new Map<string, string[]>();
  const buildErrors: string[] = [];
  let legacySkipped = 0;

  for (const row of rows) {
    if (row.coach3dId) {
      legacySkipped++;
      continue;
    }
    let equipment: string[] = [];
    let muscles: string[] = [];
    try {
      const e: unknown = JSON.parse(row.equipmentJson);
      const m: unknown = JSON.parse(row.primaryMusclesJson);
      if (Array.isArray(e)) equipment = e.filter((x): x is string => typeof x === "string");
      if (Array.isArray(m)) muscles = m.filter((x): x is string => typeof x === "string");
    } catch {
      /* نادیده */
    }
    const result = classify({
      id: row.id,
      enName: row.enName,
      category: row.category,
      pattern: row.pattern,
      exerciseType: row.exerciseType,
      equipment,
      primaryMuscles: muscles,
      compound: row.compound,
    });
    byProfile.set(result.profileId, (byProfile.get(result.profileId) ?? 0) + 1);
    const basisKey = result.basis.split("→")[0] ?? result.basis;
    byBasis.set(basisKey, (byBasis.get(basisKey) ?? 0) + 1);
    if (!perProfileUsers.has(result.profileId)) perProfileUsers.set(result.profileId, []);
    perProfileUsers.get(result.profileId)!.push(row.enName);
    if (result.basis.startsWith("fallback:")) fallbacks.push(`${row.id} | ${row.enName} | ${result.basis} | → ${result.profileId}`);
    try {
      buildFromMapping(result.profileId, result.params);
    } catch (err) {
      buildErrors.push(`${row.id} → ${result.profileId}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log(`total=${rows.length} legacy-skipped=${legacySkipped} mapped=${rows.length - legacySkipped}`);
  console.log(`build-errors=${buildErrors.length}`);
  for (const e of buildErrors) console.log("BUILD-ERR:", e);
  console.log("\n=== BY PROFILE ===");
  for (const [p, c] of [...byProfile.entries()].sort((a, b) => b[1] - a[1])) console.log(`${p}: ${c}`);
  console.log("\n=== BY BASIS ===");
  for (const [b, c] of [...byBasis.entries()].sort((a, b) => b[1] - a[1])) console.log(`${b}: ${c}`);
  console.log(`\n=== FALLBACKS (${fallbacks.length}) ===`);
  for (const f of fallbacks) console.log(f);
  console.log("\n=== SAMPLE PER PROFILE (10 largest) ===");
  for (const [p, list] of [...perProfileUsers.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
    console.log(`\n-- ${p} (${list.length}):`);
    console.log(list.slice(0, 18).join(" | "));
  }
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
