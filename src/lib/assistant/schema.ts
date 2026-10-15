/**
 * اعتبارسنجی ورودی چت دستیار — یک شِما برای کلاینت و سرور.
 * پیام‌های خطا دوزبانه نیستند (کلاینت کد را به زبان رابط ترجمه می‌کند)
 * اما توضیح فارسی برای دیباگ سرور نگه داشته شده است.
 *
 * قواعد:
 *  - متن پیام: ۱ تا سقف مجاز (AI_MAX_MESSAGE_CHARS، پیش‌فرض ۴۰۰۰) پس از
 *    حذف فاصله‌های ابتدا/انتها؛ خالی رد می‌شود.
 *  - انتخاب زبان: auto | fa | en — پیش‌فرض auto.
 */

import { z } from "zod";
import { maxMessageChars } from "./types";

export const sendMessageSchema = z.object({
  content: z
    .string({ message: "متن پیام نامعتبر است" })
    .trim()
    .min(1, "متن پیام خالی است")
    .max(maxMessageChars(), "متن پیام بیش از حد مجاز طولانی است"),
  language: z.enum(["auto", "fa", "en"]).default("auto"),
});

export const retrySchema = z.object({
  language: z.enum(["auto", "fa", "en"]).default("auto"),
});

export function firstAssistantError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "اطلاعات ارسالی معتبر نیست";
}
