/**
 * سرویس اشتراک دانشجو — منبع واحد حقیقت سطح FREE / PREMIUM.
 *
 * قواعد غیرقابل‌نقض:
 *  - هر کاربر حداکثر یک رکورد اشتراک دارد؛ ساخت آن تنبل و با پیشفرض امن
 *    FREE انجام می‌شود (کاربران قدیمی هم بدون داده از دست رفته پوشش می‌گیرند).
 *  - سطح مؤثر همیشه همین‌جا و از دیتابیس محاسبه می‌شود؛ هیچ حافظه فرایندی
 *    یا داده کلاینتی در تصمیم دخالت ندارد.
 *  - انقضای گذشته یا status=cancelled یعنی PREMIUM مؤثر نیست — بدون منطق
 *    ساختگی تمدید؛ رکورد دستنخورده می‌ماند تا وضعیت شفاف بماند.
 *  - اشتراک هیچ ربطی به نقش COACH/ADMIN ندارد (جدا نگه داشته می‌شود).
 */

import { db } from "@/lib/db";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "./constants";

export interface SubscriptionView {
  tier: SubscriptionTier;
  /** active | cancelled */
  status: string;
  /** system | manual — منبع اعطای سطح */
  source: string;
  note: string | null;
  startsAt: string;
  expiresAt: string | null;
  /** سطح مؤثر — پس از اعمال انقضا و وضعیت */
  premium: boolean;
  /** آیا انقضای ثبت‌شده گذشته است (فقط برای نمایش شفاف) */
  expired: boolean;
}

/** خواندن رکورد اشتراک با ساخت تنبل پیش‌فرض امن FREE */
export async function getOrCreateSubscription(userId: string) {
  const existing = await db.studentSubscription.findUnique({
    where: { userId },
  });
  if (existing) return existing;
  return db.studentSubscription.create({
    data: { userId, tier: SUBSCRIPTION_TIERS.FREE, source: "system" },
  });
}

/** سطح مؤثر — فقط از دیتابیس؛ هر بار از نو محاسبه می‌شود */
export async function effectiveSubscription(
  userId: string
): Promise<SubscriptionView> {
  const row = await getOrCreateSubscription(userId);
  const now = new Date();
  const expired =
    row.expiresAt !== null && row.expiresAt.getTime() <= now.getTime();
  const premium =
    row.tier === SUBSCRIPTION_TIERS.PREMIUM &&
    row.status === "active" &&
    !expired;
  return {
    tier: premium ? SUBSCRIPTION_TIERS.PREMIUM : SUBSCRIPTION_TIERS.FREE,
    status: row.status,
    source: row.source,
    note: row.note,
    startsAt: row.startsAt.toISOString(),
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    premium,
    expired,
  };
}

/** بررسی مجوز PREMIUM برای عملیات‌های محدودشده (مثل ارسال درخواست ارتباط) */
export async function hasActivePremium(userId: string): Promise<boolean> {
  return (await effectiveSubscription(userId)).premium;
}
