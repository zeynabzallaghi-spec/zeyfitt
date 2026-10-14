// بررسی مستقیم پایگاه داده — تست ماندگاری و هش رمز عبور
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

try {
  const users = await db.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
  });
  console.log("کاربران:", JSON.stringify(users, null, 2));

  const profiles = await db.fitnessProfile.findMany({
    select: {
      displayName: true,
      age: true,
      weightKg: true,
      goal: true,
      equipmentJson: true,
      units: true,
    },
  });
  console.log("پروفایل‌ها:", JSON.stringify(profiles, null, 2));

  const sessions = await db.session.findMany({
    select: { id: true, userId: true, expiresAt: true },
  });
  console.log("نشست‌های فعال:", sessions.length);

  const accounts = await db.account.findMany({
    select: { providerId: true, password: true, userId: true },
  });
  console.log(
    "حساب‌ها (هش رمز):",
    accounts.map((a) => ({
      providerId: a.providerId,
      hashPrefix: a.password?.slice(0, 7),
      hashLength: a.password?.length,
      isBcrypt: a.password?.startsWith("$2"),
      isPlainText: !a.password?.startsWith("$2"),
    }))
  );
} finally {
  await db.$disconnect();
}
