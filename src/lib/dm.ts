/**
 * گفتگوی آزاد بین هر دو کاربر — مرحله ۲۰ (بخش ۲ مشخصات).
 *
 * مستقل از ارتباط مربی/دانشجو؛ هر کاربر احراز هویتشده میتواند با هر
 * کاربر دیگر گفتگو کند (به‌جز خودش). جفت کاربران مرتب‌شده ذخیره میشود
 * تا هر جفت دقیقاً یک رشته داشته باشد (یکتایی DB ضد رقابت همزمان).
 * شناسه طرف مقابل همیشه سمت سرور معتبر میشود؛ هیچ داده خصوصی (بانکی/
 * تماس) در فهرست افراد نیست — فقط نام و نقش.
 */

import { db } from "@/lib/db";
import { CoachingError } from "@/lib/coaching/constants";

export const DM_BODY_MAX = 4000;
export const DM_TAKE_THREADS = 100;
export const DM_TAKE_MESSAGES = 200;

export interface DirectThreadClient {
  id: string;
  counterpart: { userId: string; displayName: string; role: string };
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface DirectMessageClient {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
}

function orderedPair(a: string, b: string): { userAId: string; userBId: string } {
  return a < b ? { userAId: a, userBId: b } : { userAId: b, userBId: a };
}

/** عضویت کاربر در رشته — بدون آن 404 یکسان (ضد IDOR) */
async function assertMember(threadId: string, userId: string) {
  const thread = await db.directThread.findUnique({ where: { id: threadId } });
  if (!thread || (thread.userAId !== userId && thread.userBId !== userId)) {
    throw new CoachingError(404, "THREAD_NOT_FOUND");
  }
  return thread;
}

/** فهرست رشته‌های من با طرف مقابل، آخرین پیام و شمار نخوانده */
export async function listDirectThreads(userId: string): Promise<DirectThreadClient[]> {
  const threads = await db.directThread.findMany({
    where: { OR: [{ userAId: userId }, { userBId: userId }] },
    orderBy: { lastMessageAt: "desc" },
    take: DM_TAKE_THREADS,
  });
  if (threads.length === 0) return [];

  const counterpartIds = threads.map((t) => (t.userAId === userId ? t.userBId : t.userAId));
  const [counterparts, lastMessages] = await Promise.all([
    db.user.findMany({
      where: { id: { in: counterpartIds } },
      select: { id: true, name: true, role: true },
    }),
    Promise.all(
      threads.map((t) =>
        db.directMessage.findFirst({
          where: { threadId: t.id },
          orderBy: { createdAt: "desc" },
          select: { body: true, createdAt: true },
        })
      )
    ),
  ]);
  const nameById = new Map(counterparts.map((u) => [u.id, u]));

  const unreadCounts = await Promise.all(
    threads.map((t) =>
      db.directMessage.count({
        where: { threadId: t.id, senderId: { not: userId }, readAt: null },
      })
    )
  );

  return threads.map((t, i) => {
    const counterpartId = t.userAId === userId ? t.userBId : t.userAId;
    const u = nameById.get(counterpartId);
    const last = lastMessages[i];
    return {
      id: t.id,
      counterpart: {
        userId: counterpartId,
        displayName: u?.name ?? "—",
        role: u?.role ?? "STUDENT",
      },
      lastMessagePreview: last?.body.slice(0, 120) ?? null,
      lastMessageAt: t.lastMessageAt?.toISOString() ?? null,
      unreadCount: unreadCounts[i],
    };
  });
}

/** یافتن‌یا‌ساختن رشته با کاربر دیگر — هدف باید کاربر واقعی و غیرخود باشد */
export async function findOrCreateDirectThread(
  userId: string,
  targetUserId: string
): Promise<DirectThreadClient> {
  if (targetUserId === userId) {
    throw new CoachingError(400, "SELF_THREAD_FORBIDDEN");
  }
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, role: true },
  });
  if (!target) {
    throw new CoachingError(404, "USER_NOT_FOUND");
  }
  const pair = orderedPair(userId, targetUserId);
  const thread = await db.directThread.upsert({
    where: { userAId_userBId: pair },
    create: pair,
    update: {},
  });
  return {
    id: thread.id,
    counterpart: {
      userId: target.id,
      displayName: target.name,
      role: target.role,
    },
    lastMessagePreview: null,
    lastMessageAt: thread.lastMessageAt?.toISOString() ?? null,
    unreadCount: 0,
  };
}

/** پیام‌های رشته — قدیمی به جدید؛ بازکردن = خواندن نخوانده‌های طرف مقابل */
export async function listDirectMessages(
  threadId: string,
  userId: string
): Promise<DirectMessageClient[]> {
  await assertMember(threadId, userId);
  const now = new Date();
  await db.directMessage.updateMany({
    where: { threadId, senderId: { not: userId }, readAt: null },
    data: { readAt: now },
  });
  const rows = await db.directMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
    take: DM_TAKE_MESSAGES,
  });
  return rows.map((r) => ({
    id: r.id,
    senderId: r.senderId,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** ارسال پیام + به‌روزرسانی lastMessageAt + اعلان گیرنده */
export async function sendDirectMessage(
  threadId: string,
  senderId: string,
  rawBody: unknown
): Promise<DirectMessageClient> {
  const thread = await assertMember(threadId, senderId);
  const body =
    typeof rawBody === "object" && rawBody !== null && typeof (rawBody as { body?: unknown }).body === "string"
      ? (rawBody as { body: string }).body.trim().slice(0, DM_BODY_MAX)
      : "";
  if (body.length === 0) {
    throw new CoachingError(400, "VALIDATION");
  }
  const [msg] = await db.$transaction([
    db.directMessage.create({ data: { threadId, senderId, body } }),
    db.directThread.update({ where: { id: threadId }, data: { lastMessageAt: new Date() } }),
  ]);

  const receiverId = thread.userAId === senderId ? thread.userBId : thread.userAId;
  const sender = await db.user.findUnique({
    where: { id: senderId },
    select: { name: true },
  });
  await db.notification.create({
    data: {
      userId: receiverId,
      type: "DIRECT_MESSAGE",
      dedupeKey: `dm:${msg.id}`,
      payloadJson: JSON.stringify({
        title: sender?.name ?? "—",
        body: body.slice(0, 120),
        threadId,
      }),
    },
  });

  return {
    id: msg.id,
    senderId: msg.senderId,
    body: msg.body,
    createdAt: msg.createdAt.toISOString(),
  };
}

/**
 * جست‌وجوی افراد برای شروع گفتگو — حداقل ۲ حرف؛ فقط نام و نقش.
 * هیچ داده خصوصی (ایمیل/بانکی) برنمی‌گردد؛ خود کاربر حذف میشود.
 */
export async function searchPeople(
  userId: string,
  q: string
): Promise<{ userId: string; displayName: string; role: string }[]> {
  const query = q.trim();
  if (query.length < 2) return [];
  const rows = await db.user.findMany({
    where: {
      id: { not: userId },
      name: { contains: query },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
    take: 20,
  });
  return rows.map((r) => ({ userId: r.id, displayName: r.name, role: r.role }));
}
