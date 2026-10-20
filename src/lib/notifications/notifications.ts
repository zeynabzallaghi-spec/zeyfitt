/**
 * مرکز اعلان‌ها — مرحله ۱۹.۶.
 *
 * اعلان داخلی مبتنی بر رویدادهای واقعی پروژه (بدون ایمیل/Push — هیچ ادعایی
 * برای کانالی که پیکربندی نشده ثبت نمیشود). قواعد:
 *  - dedupeKey پایدار به‌ازای هر رویداد؛ قید یکتای (userId, dedupeKey) باعث
 *    میشود یک رویداد واحد هرگز دو اعلان نسازد (رقابت همزمانی با P2002
 *    گرفته و بیصدا نادیده گرفته میشود — ضدتکرار در سطح دیتابیس).
 *  - payload فقط شناسه‌های پایدار و متن‌های کوتاه؛ هیچ داده حساسی (بانکی،
 *    مسیر فایل، متن کامل پیام) داخل payload نمیرود.
 *  - emit هرگز جریان اصلی عملیات را نمیشکند: خطای اعلان فقط log سمت سرور است.
 */

import { db } from "@/lib/db";

export const NOTIFICATION_TYPES = {
  MESSAGE_NEW: "MESSAGE_NEW",
  CONNECTION_REQUEST: "CONNECTION_REQUEST",
  CONNECTION_DECIDED: "CONNECTION_DECIDED",
  CONNECTION_CANCELLED: "CONNECTION_CANCELLED",
  COACH_APPLICATION_DECIDED: "COACH_APPLICATION_DECIDED",
  PREMIUM_STATUS: "PREMIUM_STATUS",
  SUPPORT_REPLY: "SUPPORT_REPLY",
  SUPPORT_TICKET_NEW: "SUPPORT_TICKET_NEW",
  PLAN_DELIVERED: "PLAN_DELIVERED",
  PAYMENT_REQUEST: "PAYMENT_REQUEST",
  PAYMENT_STATUS: "PAYMENT_STATUS",
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

export interface NotificationInput {
  userId: string;
  type: NotificationType;
  dedupeKey: string;
  /** فقط شناسه‌های پایدار و متن‌های کوتاه امن — هرگز داده حساس */
  payload?: Record<string, string | number | boolean | null>;
}

/** صدور اعلان — ضدتکرار با قید یکتا؛ شکست اعلان هرگز عملیات اصلی را نمیشکند */
export async function emitNotification(input: NotificationInput): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        dedupeKey: input.dedupeKey,
        payloadJson: JSON.stringify(input.payload ?? {}),
      },
    });
  } catch (error) {
    // تکراری (P2002) → همان رویداد قبلاً اعلان شده — هدف همین است.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return;
    }
    console.error("notification emit failed:", error instanceof Error ? error.name : "unknown");
  }
}

/* ------------------------------ خواندن‌های کاربر ------------------------------ */

export interface NotificationItem {
  id: string;
  type: string;
  /** شناسه‌های مرتبط برای ناوبری — بدون هیچ داده حساس */
  payload: Record<string, string | number | boolean | null>;
  readAt: string | null;
  createdAt: string;
}

/** فهرست اعلان‌های کاربر — جدیدترین اول با سقف امن */
export async function listNotificationsForUser(
  userId: string,
  limit = 50
): Promise<{ items: NotificationItem[]; unreadCount: number }> {
  const [rows, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    items: rows.map((r) => ({
      id: r.id,
      type: r.type,
      payload: safeParse(r.payloadJson),
      readAt: r.readAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
    unreadCount: unread,
  };
}

function safeParse(json: string): Record<string, string | number | boolean | null> {
  try {
    const parsed: unknown = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string | number | boolean | null>;
    }
  } catch {
    // داده خراب — خالی صادقانه
  }
  return {};
}

/** خواندن یک اعلان — فقط مالک؛ «مالک دیگر» و «ناموجود» هر دو null (ضد IDOR) */
export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<boolean | null> {
  const row = await db.notification.findUnique({
    where: { id: notificationId },
    select: { id: true, userId: true, readAt: true },
  });
  if (!row || row.userId !== userId) return null;
  if (row.readAt) return false; // قبلاً خوانده شده — تغییری لازم نیست
  await db.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
  return true;
}

/** علامت‌گذاری همه به‌عنوان خوانده‌شده — فقط اعلان‌های نخوانده خود کاربر */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const res = await db.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return res.count;
}
