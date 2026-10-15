/**
 * محدودسازی نرخ درخواست چت — مبتنی بر پایگاه داده، نه حافظه موقت فرایند.
 *
 * چرا دیتابیس؟ محیط اجرا ماندگاری حافظه فرایند را تضمین نمی‌کند؛ شمارش
 * پیام‌های واقعی کاربر از جدول AssistantMessage هم پس از ری‌استارت سرور
 * معتبر می‌ماند و هم شامل تلاش‌های ناموفق است (پیام کاربر پیش از فراخوانی
 * مدل ذخیره می‌شود) — یعنی سوءاستفاده با تکرار سریع درخواست‌ها مسدود
 * می‌شود.
 *
 * سقف‌ها از متغیر محیطی (AI_RATE_PER_MINUTE / AI_RATE_PER_DAY) خوانده
 * می‌شوند؛ پیش‌فرض ۸ پیام در دقیقه و ۱۵۰ در ۲۴ ساعت.
 */

import { db } from "@/lib/db";
import { ratePerDay, ratePerMinute } from "./types";

export interface RateLimitResult {
  allowed: boolean;
  /** ثانیه‌های پیشنهادی انتظار تا بازنشانه پنجره دقیقه */
  retryAfterSec: number;
}

export async function checkChatRateLimit(userId: string): Promise<RateLimitResult> {
  const now = Date.now();
  const minuteAgo = new Date(now - 60_000);
  const dayAgo = new Date(now - 24 * 60 * 60_000);

  const [perMinute, perDay] = await Promise.all([
    db.assistantMessage.count({
      where: { userId, role: "user", createdAt: { gte: minuteAgo } },
    }),
    db.assistantMessage.count({
      where: { userId, role: "user", createdAt: { gte: dayAgo } },
    }),
  ]);

  if (perMinute >= ratePerMinute()) {
    return { allowed: false, retryAfterSec: Math.max(5, 60 - Math.floor((now - minuteAgo.getTime()) / 1000)) };
  }
  if (perDay >= ratePerDay()) {
    return { allowed: false, retryAfterSec: 3600 };
  }
  return { allowed: true, retryAfterSec: 0 };
}
