import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
await p.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS one_active_session_per_user ON WorkoutSession(userId) WHERE status = 'in_progress';`);
const idx = await p.$queryRawUnsafe(`SELECT name, sql FROM sqlite_master WHERE name='one_active_session_per_user'`);
console.log("index:", JSON.stringify(idx));
const tables = await p.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'Workout%' ORDER BY name`);
console.log("tables:", tables.map(t=>t.name));
await p.$disconnect();
