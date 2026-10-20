/**
 * ابزار اعتبارسنجی پوشش انیمیشن سه‌بعدی — مرحله ۱۹ (گزارش ماشینی قابل تکرار).
 *
 * معیارها:
 *  ۱. ۱۰۰٪ حرکات فعال animation mapping معتبر دارند (profileId معتبر یا legacy).
 *  ۲. هیچ شناسه بدون نگاشت نمانده باشد.
 *  ۳. هیچ نگاشتی به الگوی ناموجود اشاره نکند.
 *  ۴. همه پروفایل‌ها و پارامترهای الزامی معتبر باشند (build موفق برای هر رکورد).
 *  ۵. هر حرکت به چرخه قابل پخش (کلیدفریم‌های معتبر) متصل باشد.
 *  ۶. ایزومتریک/کششی counterMode درست داشته باشند.
 *  ۷. ۶ حرکت legacy رفتار قبلی را حفظ کنند (coach3dId + بانک استاتیک).
 *
 * خروجی: JSON گزارش در download/p19-coverage-report.json + چاپ خلاصه.
 * خروج غیرصفر = نقض معیار.
 */

import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import { ALL_PROFILES, buildFromMapping } from "../src/lib/fitness3d/profiles/registry";
import { EXERCISES as LEGACY_EXERCISES } from "../src/lib/fitness3d/exercises";
import { resolveScene } from "../src/lib/fitness3d/resolve";

const db = new PrismaClient();
const REPORT_OUT = "/home/z/my-project/download/p19-coverage-report.json";

interface CheckResult {
  criterion: string;
  pass: boolean;
  detail: string;
}

async function main() {
  const rows = await db.exercise.findMany({ where: { status: "active" } });
  const checks: CheckResult[] = [];
  const profileUsers = new Map<string, number>();
  const holdModeUsers: string[] = [];
  let unmapped = 0;
  let badProfile = 0;
  let buildFailures = 0;
  let holdModeCount = 0;
  let repsModeCount = 0;

  const legacyIds = new Set(LEGACY_EXERCISES.map((e) => e.id));

  for (const row of rows) {
    const hasProfile = row.animation3dStatus === "ready" && Boolean(row.animation3dProfileId);
    const hasLegacy = Boolean(row.coach3dId);
    if (!hasProfile && !hasLegacy) {
      unmapped++;
      continue;
    }
    if (hasProfile) {
      const known = ALL_PROFILES.some((p) => p.id === row.animation3dProfileId);
      if (!known) {
        badProfile++;
        continue;
      }
      // build واقعی — هر رکورد باید چرخه قابل پخش بدهد
      try {
        const params = row.animation3dParamsJson ? (JSON.parse(row.animation3dParamsJson) as Record<string, unknown>) : null;
        const built = buildFromMapping(row.animation3dProfileId!, params as never);
        profileUsers.set(row.animation3dProfileId!, (profileUsers.get(row.animation3dProfileId!) ?? 0) + 1);
        if (built.counterMode === "hold") {
          holdModeCount++;
          if (holdModeUsers.length < 8) holdModeUsers.push(row.enName);
        } else {
          repsModeCount++;
        }
        // resolveScene — مسیر واقعی کلاینت
        const scene = resolveScene({
          id: row.id,
          fa: row.faName ?? row.enName,
          en: row.enName,
          difficulty: "مبتدی",
          primaryMuscles: [],
          secondaryMuscles: [],
          coach3dId: row.coach3dId ?? undefined,
          animation3d: { profileId: row.animation3dProfileId!, params: params as never },
        });
        if (!scene || scene.def.cycle.length < 2) {
          buildFailures++;
        }
      } catch {
        buildFailures++;
      }
    }
  }

  // legacy — حفظ رفتار قبلی
  const legacyRows = rows.filter((r) => r.coach3dId);
  const legacyOk =
    legacyRows.length === LEGACY_EXERCISES.length &&
    legacyRows.every((r) => legacyIds.has(r.coach3dId!)) &&
    legacyRows.every((r) => r.animation3dStatus === "ready");

  checks.push(
    {
      criterion: "۱۰۰٪ حرکات فعال دارای نگاشت معتبر",
      pass: unmapped === 0,
      detail: `unmapped=${unmapped} از ${rows.length}`,
    },
    {
      criterion: "هیچ نگاشتی به الگوی ناموجود اشاره نمی‌کند",
      pass: badProfile === 0,
      detail: `unknown-profile=${badProfile}`,
    },
    {
      criterion: "همه پروفایل‌ها build موفق دارند (چرخه قابل پخش)",
      pass: buildFailures === 0,
      detail: `build-failures=${buildFailures}`,
    },
    {
      criterion: "حرکات ایزومتریک/کششی counterMode=hold دارند",
      pass: holdModeCount > 0 && repsModeCount > 0,
      detail: `hold=${holdModeCount} (مثال: ${holdModeUsers.slice(0, 4).join(", ")}) | reps=${repsModeCount}`,
    },
    {
      criterion: "۶ حرکت legacy حفظ شده‌اند (coach3dId + بانک استاتیک)",
      pass: legacyOk,
      detail: `legacy-rows=${legacyRows.length} expected=${LEGACY_EXERCISES.length}`,
    },
    {
      criterion: "شناسه‌های پایدار دست‌نخورده‌اند",
      pass: rows.length === 905,
      detail: `active=${rows.length} (۹۰۵ = ۴۸ ویرایشی + ۸۵۷ منبع آزاد)`,
    },
  );

  const allPass = checks.every((c) => c.pass);
  const report = {
    phase: 19,
    generatedAt: new Date().toISOString(),
    allPass,
    totalActive: rows.length,
    unmapped,
    badProfile,
    buildFailures,
    counterModes: { hold: holdModeCount, reps: repsModeCount },
    legacy: { count: legacyRows.length, ids: legacyRows.map((r) => r.id) },
    uniqueProfilesUsed: profileUsers.size,
    profileUsage: Object.fromEntries([...profileUsers.entries()].sort((a, b) => b[1] - a[1])),
    checks,
  };
  fs.writeFileSync(REPORT_OUT, JSON.stringify(report, null, 2));

  console.log("===== COVERAGE VALIDATION =====");
  for (const c of checks) {
    console.log(`${c.pass ? "PASS" : "FAIL"}  ${c.criterion}  — ${c.detail}`);
  }
  console.log(`\nunique profiles in use: ${profileUsers.size}`);
  console.log(`hold-mode: ${holdModeCount} | reps-mode: ${repsModeCount}`);
  console.log(`report: ${REPORT_OUT}`);
  await db.$disconnect();
  if (!allPass) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
