/**
 * تشخیص زبان پیام — مشترک بین سرور (تعیین زبان پاسخ مدل) و کلاینت
 * (جهت‌دهی نمایش هر پیام). تشخیص هرگز به ترجمه یا بازنویسی پیام کاربر
 * نمی‌انجامد؛ فقط زبان غالب متن را برمی‌گرداند.
 *
 * الگوریتم: شمارش حروف خط عربی/فارسی در برابر حروف لاتین پس از حذف
 * اعداد، نشانه‌گذاری‌ها، نشانی‌ها و بلاک‌های کد. غالب واقعی تعیین‌کننده
 * است؛ در برابری یا کمبود شواهد، «مبهم» اعلام می‌شود تا دستیار صادقانه
 * بپرسد (هیچ‌گاه زبانی حدس زده و تحمیل نمی‌شود).
 */

import type { AssistantLang } from "./types";

/** حروف خط عربی/فارسی (شامل فارسی، عربی، اردو و اشکال presentation) */
const ARABIC_SCRIPT = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
/** حروف لاتین */
const LATIN = /[A-Za-z\u00C0-\u024F]/g;

/** بخش‌هایی که در تشخیص زبان باید نادیده گرفته شوند */
const IGNORED_SPANS = [
  /```[\s\S]*?```/g, // بلاک کد
  /`[^`\n]*`/g, // کد درون‌خطی
  /https?:\/\/\S+/g, // نشانی وب
  /www\.\S+/g,
  /\S+@\S+\.\S+/g, // ایمیل
  /[#>*_~\-]+/g, // نشانه‌گذاری Markdown
  /\d[\d.,:/-]*/g, // اعداد و واحدهای عددی
  /[\u200c\s]+/g, // نیم‌فاصله و فاصله
];

function stripIgnored(text: string): string {
  let out = text;
  for (const pattern of IGNORED_SPANS) {
    out = out.replace(pattern, " ");
  }
  return out;
}

export type DetectedLang = AssistantLang | "ambiguous";

/**
 * زبان غالب پیام را تشخیص می‌دهد.
 * - «fa» / «en»: زبان غالب با شواهد کافی
 * - «ambiguous»: متن بدون حرف معنادار، برابری دو زبان یا شواهد اندک
 */
export function detectMessageLang(text: string): DetectedLang {
  const clean = stripIgnored(text ?? "");
  const arabicCount = (clean.match(ARABIC_SCRIPT) ?? []).length;
  const latinCount = (clean.match(LATIN) ?? []).length;
  const total = arabicCount + latinCount;

  // بدون شواهد کافی — زبان تحمیل نمی‌شود
  if (total < 2 || arabicCount === latinCount) return "ambiguous";

  // نسبت غالبیت حداقل ۲ به ۱ تا تشخیص معتبر باشد
  if (arabicCount >= latinCount * 2) return "fa";
  if (latinCount >= arabicCount * 2) return "en";

  return "ambiguous";
}

/**
 * تعیین زبان پاسخ بر اساس انتخاب کاربر و متن پیام.
 * - انتخاب صریح کاربر بر تشخیص خودکار اولویت دارد.
 * - در حالت «خودکار» زبان غالب پیام تعیین‌کننده است؛ اگر مبهم باشد null
 *   برمی‌گردد تا دستیار با یک سؤال کوتاه زبان را روشن کند.
 */
export function resolveResponseLang(
  choice: "auto" | AssistantLang,
  messageText: string
): AssistantLang | null {
  if (choice === "fa" || choice === "en") return choice;
  const detected = detectMessageLang(messageText);
  return detected === "ambiguous" ? null : detected;
}
