/**
 * استخراج نام‌های بانک برای طراحی الگوهای حرکتی (ابزار مرحله ۱۹).
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const rows = await db.exercise.findMany({
    where: { status: "active" },
    select: {
      id: true,
      enName: true,
      equipmentJson: true,
      exerciseType: true,
      category: true,
      primaryMusclesJson: true,
      pattern: true,
      sourceKey: true,
    },
    orderBy: { enName: "asc" },
  });
  for (const r of rows) {
    let equip: string[] = [];
    let mus: string[] = [];
    try {
      const e: unknown = JSON.parse(r.equipmentJson);
      const m: unknown = JSON.parse(r.primaryMusclesJson);
      if (Array.isArray(e)) equip = e.filter((x): x is string => typeof x === "string");
      if (Array.isArray(m)) mus = m.filter((x): x is string => typeof x === "string");
    } catch {
      /* نمایشی */
    }
    console.log(
      `${r.id}\t${r.enName}\t${r.category}\t${r.pattern}\t${r.exerciseType}\t${equip.join("+")}\t${mus.join("+")}`,
    );
  }
  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
