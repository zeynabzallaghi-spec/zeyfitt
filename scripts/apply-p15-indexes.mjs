// اعمال ایندکس‌های partial مرحله ۱۵ — همان الگوی create-session-indexes.sql
// قید دامنه‌ای که Prisma نمی‌تواند بیان کند: حداکثر یک ارتباط «باز»
// (PENDING یا ACTIVE) به‌ازای هر جفت دانشجو-مربی. ارتباطهای بسته‌شده
// (REJECTED/CANCELLED/ENDED) در این قید نیستند تا درخواست جدید ممکن باشد.
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
await p.$executeRawUnsafe(
  `CREATE UNIQUE INDEX IF NOT EXISTS one_open_connection_per_pair ON CoachStudentConnection(studentId, coachId) WHERE status IN ('PENDING','ACTIVE');`
);
const idx = await p.$queryRawUnsafe(
  `SELECT name, sql FROM sqlite_master WHERE name='one_open_connection_per_pair'`
);
console.log("index:", JSON.stringify(idx, null, 2));
const tables = await p.$queryRawUnsafe(
  `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('CoachApplication','CoachProfile','StudentSubscription','CoachStudentConnection') ORDER BY name`
);
console.log("new tables:", tables.map((t) => t.name));
await p.$disconnect();
