#!/usr/bin/env bun
/**
 * ابزار مدیریتی سمت سرور مرحله ۱۵ — خارج از سطح API.
 *
 * این اسکریپت فقط در محیط سرور با bun اجرا می‌شود و هرگز به‌عنوان
 * endpoint عمومی در دسترس کاربران نیست؛ هیچ مسیر کلاینتی اشتراک یا
 * تأیید مربی را تغییر نمی‌دهد. استفاده:
 *
 *   bun scripts/manage-coaching.ts grant-premium --email u@x.com [--days 30] [--note "..."]
 *   bun scripts/manage-coaching.ts revoke-premium --email u@x.com
 *   bun scripts/manage-coaching.ts approve-coach  --email u@x.com [--publish] [--name "..."]
 *   bun scripts/manage-coaching.ts revoke-coach   --email u@x.com
 *   bun scripts/manage-coaching.ts list
 *
 * ایمنی:
 *  - به‌روزرسانی مشروط (tier فقط در جهت درست تغییر می‌کند؛ revoke هرگز
 *    رکورد را پاک نمی‌کند — وضعیت شفاف می‌ماند)
 *  - approve-coach: role=COACH + درخواست approved + پروفایل اولیه
 *    verified=true و published فقط با پرچم --publish و اگر اطلاعات کامل باشد
 *  - هیچ داده حساسی چاپ نمی‌شود (ایمیل ماسک می‌شود)
 */

import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

interface Args {
  _: string[];
  email?: string;
  days?: string;
  note?: string;
  publish?: boolean;
  name?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--email") args.email = argv[++i];
    else if (a === "--days") args.days = argv[++i];
    else if (a === "--note") args.note = argv[++i];
    else if (a === "--name") args.name = argv[++i];
    else if (a === "--publish") args.publish = true;
    else args._.push(a);
  }
  return args;
}

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "***";
  const head = user.slice(0, 2);
  return `${head}${"*".repeat(Math.max(1, user.length - 2))}@${domain}`;
}

function maskId(id: string): string {
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}

async function findUserByEmail(email: string) {
  const user = await db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    console.error(`ERROR: user not found: ${maskEmail(email)}`);
    process.exit(1);
  }
  return user;
}

async function grantPremium(args: Args) {
  if (!args.email) throw new Error("--email required");
  const user = await findUserByEmail(args.email);
  if (user.role !== "STUDENT") {
    // اشتراک فقط برای دانشجو معنا دارد — با نقش دیگر یکی نمی‌شود
    console.error(`ERROR: subscription is student-scoped (role=${user.role}); refused.`);
    process.exit(1);
  }
  const days = args.days ? Number(args.days) : null;
  if (days !== null && (!Number.isInteger(days) || days <= 0 || days > 3650)) {
    throw new Error("--days must be an integer in 1..3650");
  }
  const expiresAt = days !== null ? new Date(Date.now() + days * 86400_000) : null;
  const row = await db.studentSubscription.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      tier: "PREMIUM",
      status: "active",
      source: "manual",
      note: args.note ?? null,
      startsAt: new Date(),
      expiresAt,
    },
    update: {
      tier: "PREMIUM",
      status: "active",
      source: "manual",
      note: args.note ?? null,
      startsAt: new Date(),
      expiresAt,
    },
  });
  console.log(
    `OK grant-premium user=${maskId(user.id)} tier=${row.tier} expires=${row.expiresAt ? row.expiresAt.toISOString() : "never"}`
  );
}

async function revokePremium(args: Args) {
  if (!args.email) throw new Error("--email required");
  const user = await findUserByEmail(args.email);
  const row = await db.studentSubscription.upsert({
    where: { userId: user.id },
    create: { userId: user.id, tier: "FREE", status: "active", source: "system" },
    update: { tier: "FREE", status: "active", source: "system", note: null, expiresAt: null },
  });
  console.log(`OK revoke-premium user=${maskId(user.id)} tier=${row.tier}`);
}

async function approveCoach(args: Args) {
  if (!args.email) throw new Error("--email required");
  const user = await findUserByEmail(args.email);

  const displayName = args.name ?? user.name;
  await db.user.update({
    where: { id: user.id },
    data: { role: "COACH" },
  });

  const application = await db.coachApplication.upsert({
    where: { userId: user.id },
    create: { userId: user.id, status: "approved", decidedAt: new Date(), decidedBy: "manage-coaching" },
    update: { status: "approved", decidedAt: new Date(), decidedBy: "manage-coaching" },
  });

  const profile = await db.coachProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, displayName, verified: true, published: false },
    update: { verified: true },
  });

  let published = profile.published;
  if (args.publish) {
    const complete =
      displayName.trim().length >= 2 &&
      profile.bio !== null &&
      profile.bio.trim().length >= 20 &&
      (() => {
        try {
          const arr: unknown = JSON.parse(profile.cooperationTypesJson);
          return Array.isArray(arr) && arr.length >= 1;
        } catch {
          return false;
        }
      })();
    if (complete) {
      await db.coachProfile.update({
        where: { userId: user.id },
        data: { published: true },
      });
      published = true;
    } else {
      console.log(
        "NOTE: --publish requested but profile incomplete (needs bio>=20 chars + cooperationTypes) — left unpublished"
      );
    }
  }

  console.log(
    `OK approve-coach user=${maskId(user.id)} role=COACH application=${application.status} verified=true published=${published}`
  );
}

async function revokeCoach(args: Args) {
  if (!args.email) throw new Error("--email required");
  const user = await findUserByEmail(args.email);
  // سیاست: نقش حفظ می‌شود ولی تأیید و انتشار گرفته می‌شود — درخواست جدید
  // مسدود و نمایش عمومی متوقف؛ تاریخچه ارتباط‌ها دست‌نخورده می‌ماند.
  await db.coachProfile.updateMany({
    where: { userId: user.id },
    data: { verified: false, published: false },
  });
  await db.coachApplication.updateMany({
    where: { userId: user.id, status: "approved" },
    data: { status: "rejected", decidedAt: new Date(), decidedBy: "manage-coaching" },
  });
  console.log(`OK revoke-coach user=${maskId(user.id)} verified=false published=false (role kept, history intact)`);
}

async function listAll() {
  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      subscription: true,
      coachProfile: { select: { verified: true, published: true, displayName: true } },
      _count: { select: { studentConnections: true, coachConnections: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`users: ${users.length}`);
  for (const u of users) {
    const sub = u.subscription;
    const subInfo = sub
      ? `${sub.tier}/${sub.status}${sub.expiresAt ? ` exp=${sub.expiresAt.toISOString().slice(0, 10)}` : ""}`
      : "none";
    const coach = u.coachProfile
      ? `coach(v=${u.coachProfile.verified ? 1 : 0},p=${u.coachProfile.published ? 1 : 0})`
      : "";
    console.log(
      `- ${maskEmail(u.email)} role=${u.role} sub=${subInfo} ${coach} conn(s)=${u._count.studentConnections} conn(c)=${u._count.coachConnections}`
    );
  }
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  try {
    switch (cmd) {
      case "grant-premium":
        await grantPremium(args);
        break;
      case "revoke-premium":
        await revokePremium(args);
        break;
      case "approve-coach":
        await approveCoach(args);
        break;
      case "revoke-coach":
        await revokeCoach(args);
        break;
      case "list":
        await listAll();
        break;
      default:
        console.log("commands: grant-premium | revoke-premium | approve-coach | revoke-coach | list");
        process.exit(cmd ? 1 : 0);
    }
  } finally {
    await db.$disconnect();
  }
}

main();
