/**
 * ممیزی ماشینی پوشش فعلی مربی سه‌بعدی — مرحله ۱۹ (گزارش پیش از پیاده‌سازی).
 *
 * خروجی: تعداد کل/فعال، وضعیت سه‌بعدی، الگوهای حرکتی، انواع تمرین،
 * تجهیزات، دسته‌ها، و لیست ۶ حرکت ready فعلی.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const total = await db.exercise.count();
  const active = await db.exercise.count({ where: { status: "active" } });
  const by3d = await db.exercise.groupBy({ by: ["animation3dStatus"], _count: { _all: true } });
  const coach3d = await db.exercise.findMany({
    where: { coach3dId: { not: null } },
    select: { id: true, coach3dId: true, animation3dStatus: true, enName: true, sourceKey: true },
  });
  const byPattern = await db.exercise.groupBy({
    by: ["pattern"],
    where: { status: "active" },
    _count: { _all: true },
    orderBy: { _count: { pattern: "desc" } },
  });
  const byType = await db.exercise.groupBy({
    by: ["exerciseType"],
    where: { status: "active" },
    _count: { _all: true },
    orderBy: { _count: { exerciseType: "desc" } },
  });
  const byCat = await db.exercise.groupBy({
    by: ["category"],
    where: { status: "active" },
    _count: { _all: true },
    orderBy: { _count: { category: "desc" } },
  });
  const bySource = await db.exercise.groupBy({
    by: ["sourceKey"],
    where: { status: "active" },
    _count: { _all: true },
  });

  const rows = await db.exercise.findMany({
    where: { status: "active" },
    select: { equipmentJson: true, exerciseType: true },
  });
  const equipCount = new Map<string, number>();
  for (const r of rows) {
    try {
      const arr: unknown = JSON.parse(r.equipmentJson);
      if (Array.isArray(arr)) {
        for (const e of arr) {
          if (typeof e === "string") equipCount.set(e, (equipCount.get(e) ?? 0) + 1);
        }
      }
    } catch {
      /* بی‌اهمیت برای ممیزی */
    }
  }
  const equipment = [...equipCount.entries()].sort((a, b) => b[1] - a[1]);

  console.log(JSON.stringify(
    { total, active, by3d, coach3d, byPattern, byType, byCat, bySource, equipment },
    null,
    1,
  ));
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
