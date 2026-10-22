/**
 * p23-seed-browser-fixture.ts — ساخت مربی fixture برای بررسی مرورگر P1.
 * خروجی: ایمیل + کوکی نشست (برای تزریق به مرورگر). پاکسازی آن در
 * scripts/p23-cleanup-browser-fixture.ts با همین شناسه انجام میشود.
 *
 * اجرا: bun scripts/p23-seed-browser-fixture.ts
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "node:fs";

const BASE = process.env.CHECK_BASE ?? "http://localhost:3000";
const STAMP = Date.now();
const EMAIL = `p23-browser-${STAMP}@test.invalid`.toLowerCase();
const PASSWORD = "p23-browser-pass1";

const db = new PrismaClient();

async function main() {
  const res = await fetch(`${BASE}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, name: "P23 Browser Fixture" }),
  });
  if (res.status !== 200) throw new Error(`signup failed: ${res.status}`);
  const cookie = (res.headers.getSetCookie?.() ?? [])
    .find((c) => c.startsWith("fitcoach.session_token"))
    ?.split(";")[0];
  const row = await db.user.findUnique({ where: { email: EMAIL } });
  if (!row) throw new Error("user row missing");
  await db.user.update({ where: { id: row.id }, data: { role: "COACH" } });
  await db.coachProfile.create({
    data: {
      userId: row.id,
      displayName: "P23 Browser Fixture",
      headline: "fixture",
      bio: null,
      specializationsJson: JSON.stringify([]),
      certificationsJson: JSON.stringify([]),
      experienceYears: 1,
      cooperationTypesJson: JSON.stringify(["PRIVATE"]),
      verified: true,
      published: false,
    },
  });
  writeFileSync(
    "/home/z/my-project/scratch/p23-browser-fixture.json",
    JSON.stringify({ email: EMAIL, password: PASSWORD, userId: row.id, cookie: cookie ?? "" }, null, 2)
  );
  console.log(`SEEDED email=${EMAIL}`);
  console.log(`SESSION_COOKIE=${cookie ?? ""}`);
}

main()
  .catch((e) => {
    console.error("FATAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
