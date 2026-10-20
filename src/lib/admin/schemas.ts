/**
 * شِماهای Zod لایه ادمین — مرحله ۱۹.۵.
 * همه ورودی کلاینتی قبل از رسیدن به دیتابیس از این‌ها می‌گذرد؛
 * کلیدهای ناشناخته حذف می‌شوند و هیچ فیلدی بدون شِما قبول نیست.
 */

import { z } from "zod";

/* ------------------------------ کاربر عمومی ------------------------------ */

/** POST /api/subscription/request — درخواست ارتقای FREE → PREMIUM */
export const premiumRequestSchema = z.object({
  message: z.string().trim().max(500).optional(),
});

/** POST /api/support/tickets — تیکت جدید پشتیبانی */
export const TICKET_CATEGORIES = [
  "bug",
  "account",
  "subscription",
  "coach",
  "other",
] as const;
export type TicketCategoryId = (typeof TICKET_CATEGORIES)[number];

export const ticketCreateSchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  subject: z.string().trim().min(3).max(80),
  body: z.string().trim().min(10).max(2000),
});

/** POST /api/support/tickets/[id]/close — بستن/بازگشایی توسط خود کاربر */
export const ticketUserActionSchema = z.object({
  action: z.enum(["close", "reopen"]),
});

/* ------------------------------ ادمین ------------------------------ */

/** POST /api/admin/users/[id]/role */
export const adminRoleSchema = z.object({
  role: z.enum(["STUDENT", "COACH", "ADMIN"]),
});

/** POST /api/admin/users/[id]/subscription — اعطا/لغو PREMIUM */
export const adminSubscriptionSchema = z.object({
  tier: z.enum(["FREE", "PREMIUM"]),
  // فقط برای PREMIUM: null یعنی بدون انقضا؛ عدد روز 1..3650
  days: z.number().int().min(1).max(3650).nullable().optional(),
  note: z.string().trim().max(200).optional(),
});

/** POST /api/admin/coach-applications/[id]/decide و premium-requests/[id]/decide */
export const adminDecisionSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  note: z.string().trim().max(300).optional(),
  // برای تأیید درخواست Premium — روزهای اعطا؛ null یعنی بدون انقضا
  days: z.number().int().min(1).max(3650).nullable().optional(),
  // برای تأیید درخواست مربی‌گری — انتشار عمومی پروفایل (فقط اگر کامل باشد)
  publish: z.boolean().optional(),
});

/** POST /api/admin/tickets/[id] — پاسخ و/یا تغییر وضعیت */
export const adminTicketUpdateSchema = z.object({
  reply: z.string().trim().min(1).max(2000).optional(),
  status: z.enum(["open", "answered", "resolved", "closed"]).optional(),
});

/** GET /api/admin/users — جست‌وجو و فیلتر */
export const adminUsersQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  role: z.enum(["STUDENT", "COACH", "ADMIN"]).optional(),
});
