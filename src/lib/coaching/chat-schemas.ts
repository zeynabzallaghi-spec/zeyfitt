/**
 * شِمای ورودی پیام‌رسانی خصوصی — مرحله ۱۷.
 *
 * قواعد:
 *  - فقط «محتوای متنی پیام» از کلاینت پذیرفته میشود؛ senderId، زمان ارسال،
 *    readAt و هر فیلد مجوزی دیگری هرگز از بدنه درخواست نمیآید (کلیدهای
 *    ناشناخته توسط Zod حذف میشوند — همان الگوی شِماهای مراحل ۱۵ و ۱۶).
 *  - محتوا پس از trim باید حداقل یک کاراکتر و حداکثر CONTENT_MAX باشد.
 *  - مکان‌یاب‌های صفحه‌بندی (before/after) شناسه پایدار seq پیام‌اند؛
 *    هر دو همزمان نامعتبرند.
 */

import { z } from "zod";
import { CHAT_LIMITS } from "./constants";

export const sendMessageSchema = z.object({
  content: z
    .string()
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(CHAT_LIMITS.CONTENT_MIN)
        .max(CHAT_LIMITS.CONTENT_MAX)
    ),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

const seqCursor = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const messagesQuerySchema = z
  .object({
    /** صفحه‌بندی قدیمی‌تر — پیام‌های با seq کمتر از این مقدار */
    before: seqCursor.optional(),
    /** polling پیام‌های جدید — پیام‌های با seq بیشتر از این مقدار */
    after: seqCursor.optional(),
    limit: z.coerce.number().int().min(1).max(CHAT_LIMITS.PAGE_MAX).optional(),
  })
  .refine((v) => !(v.before !== undefined && v.after !== undefined), {
    message: "CURSORS_EXCLUSIVE",
  });

export type MessagesQuery = z.infer<typeof messagesQuerySchema>;
