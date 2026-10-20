/**
 * import نگاشت انیمیشن سه‌بعدی — مرحله ۱۹ (idempotent، غیرمخرب).
 *
 * قواعد:
 *  - فقط رکوردهای active بدون coach3dId (۶ حرکت legacy دست‌نخورده می‌مانند).
 *  - برای هر رکورد: classify → buildFromMapping (اعتبارسنجی) → نوشتن
 *    animation3dProfileId + animation3dParamsJson + animation3dStatus="ready".
 *  - اجرای مجدد بدون تغییر = صفر UPDATE (idempotency اثباتی در گزارش).
 *  - هر رکوردی که classify نتواند نگاشت بدهد → رها می‌شود و در گزارش
 *    «needs-mapping» ثبت می‌شود (بدون ادعای پوشش).
 *  - هیچ رکورد کاربر/برنامه/جلسه دست زده نمی‌شود.
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import { classify } from "./p19-mapping-rules";
import { buildFromMapping } from "../src/lib/fitness3d/profiles/registry";

const db = new PrismaClient();
const REPORT_OUT = "/home/z/my-project/download/p19-mapping-report.json";

async function main() {
  const rows = await db.exercise.findMany({ where: { status: "active" } });
  let legacySkipped = 0;
  let accepted = 0;
  let updated = 0;
  let unchanged = 0;
  let needsMapping = 0;
  let legacyNormalized = 0;

  // نرمال‌سازی legacy — مرحله ۱۹: ۶ حرکت قدیمی فقط با coach3dId به بانک
  // استاتیک وصل می‌مانند (رفتار قبلی عیناً حفظ می‌شود). مقدار
  // animation3dProfileId که import مرحله ۱۸ به‌صورت همان coach3dId نوشته
  // بود پاک می‌شود تا هیچ‌گاه به‌عنوان الگوی پارامتری تفسیر نشود.
  for (const row of rows) {
    if (!row.coach3dId) continue;
    // مرحله ۱۹.۵ — legacy همیشه «ready» است: سه‌بعدی آن از بانک استاتیک
    // سرو می‌شود، پس import مجدد مرحله ۱۸ (که رکورد را با پیشفرض none
    // می‌سازد) نباید آن را از دست‌رس خارج کند. profileId/params همیشه
    // پاک می‌ماند تا هیچ‌گاه به‌عنوان الگوی پارامتری تفسیر نشود.
    if (
      row.animation3dProfileId !== null ||
      row.animation3dParamsJson !== null ||
      row.animation3dStatus !== "ready"
    ) {
      await db.exercise.update({
        where: { id: row.id },
        data: {
          animation3dProfileId: null,
          animation3dParamsJson: null,
          animation3dStatus: "ready",
        },
      });
      legacyNormalized++;
    }
    legacySkipped++;
  }
  const buildErrors: { id: string; error: string }[] = [];
  const byProfile = new Map<string, number>();
  const byBasis = new Map<string, number>();
  const unmapped: { id: string; name: string }[] = [];

  for (const row of rows) {
    if (row.coach3dId) continue; // legacy — در بالا نرمال و رد شد
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
    // اعتبارسنجی قبل از نوشتن — الگو باید واقعاً build شود
    try {
      buildFromMapping(result.profileId, result.params);
    } catch (err) {
      buildErrors.push({ id: row.id, error: err instanceof Error ? err.message : String(err) });
      needsMapping++;
      unmapped.push({ id: row.id, name: row.enName });
      continue;
    }
    const paramsJson = JSON.stringify(result.params);
    const nextStatus = "ready";
    if (row.animation3dProfileId === result.profileId && row.animation3dParamsJson === paramsJson && row.animation3dStatus === nextStatus) {
      unchanged++;
    } else if (row.animation3dProfileId !== null || row.animation3dParamsJson !== null) {
      await db.exercise.update({
        where: { id: row.id },
        data: {
          animation3dProfileId: result.profileId,
          animation3dParamsJson: paramsJson,
          animation3dStatus: nextStatus,
        },
      });
      updated++;
    } else {
      await db.exercise.update({
        where: { id: row.id },
        data: {
          animation3dProfileId: result.profileId,
          animation3dParamsJson: paramsJson,
          animation3dStatus: nextStatus,
        },
      });
      accepted++;
    }
    byProfile.set(result.profileId, (byProfile.get(result.profileId) ?? 0) + 1);
    byBasis.set(result.basis, (byBasis.get(result.basis) ?? 0) + 1);
  }

  // تأیید نهایی — شمارش از خود DB
  const readyCount = await db.exercise.count({ where: { status: "active", animation3dStatus: "ready" } });
  const totalCount = await db.exercise.count({ where: { status: "active" } });

  const report = {
    phase: 19,
    generatedAt: new Date().toISOString(),
    totalActive: totalCount,
    legacyPreserved: legacySkipped,
    legacyNormalized,
    mapped: { accepted, updated, unchanged },
    needsMapping,
    buildErrors,
    unmapped,
    coverageReady: readyCount,
    readyBreakdown: {
      legacyCoach3d: legacySkipped,
      parametricProfile: readyCount - legacySkipped,
    },
    byProfile: Object.fromEntries([...byProfile.entries()].sort((a, b) => b[1] - a[1])),
    byBasis: Object.fromEntries([...byBasis.entries()].sort((a, b) => b[1] - a[1])),
  };
  fs.writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2));

  console.log("===== MAPPING IMPORT REPORT =====");
  console.log(`total active      : ${totalCount}`);
  console.log(`legacy preserved  : ${legacySkipped} (coach3dId — دست‌نخورده)`);
  console.log(`legacy normalized : ${legacyNormalized} (profileId پاک شد)`);
  console.log(`accepted (new)    : ${accepted}`);
  console.log(`updated (re-run)  : ${updated}`);
  console.log(`unchanged         : ${unchanged}`);
  console.log(`needs-mapping     : ${needsMapping}`);
  console.log(`build errors      : ${buildErrors.length}`);
  console.log(`DB ready total    : ${readyCount}/${totalCount}`);
  console.log(`report file       : ${REPORT_OUT}`);
  if (buildErrors.length > 0) {
    for (const e of buildErrors) console.log(`  BUILD-ERR ${e.id}: ${e.error}`);
  }
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
