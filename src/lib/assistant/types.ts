/**
 * تایپ‌ها و ثابت‌های دستیار هوشمند — مرجع مشترک لایه سرور و رابط چت.
 *
 * قواعد ثابت:
 *  - شناسه کاربر همیشه از نشست سمت سرور می‌آید و به مرورگر اعتماد نمی‌شود.
 *  - متن پیام کاربر و پاسخ مدل داده غیرقابل‌اعتمادند؛ هرگز اجرا نمی‌شوند.
 *  - هیچ پاسخ ساختگی یا شبیه‌سازی‌شده‌ای تولید نمی‌شود؛ نبود اتصال واقعی
 *    صادقانه گزارش می‌شود.
 */

/** زبان پیام/پاسخ */
export type AssistantLang = "fa" | "en";

/** انتخاب زبان کاربر در رابط چت — «خودکار» یعنی تشخیص از متن پیام */
export type LangChoice = "auto" | "fa" | "en";

/** نقش فرستنده پیام */
export type MessageRole = "user" | "assistant";

/* ------------------------------ محدودیت‌ها ------------------------------ */

/** حداکثر طول مجاز هر پیام کاربر (قابل تنظیم با AI_MAX_MESSAGE_CHARS) */
export function maxMessageChars(): number {
  const parsed = Number(process.env.AI_MAX_MESSAGE_CHARS);
  if (Number.isInteger(parsed) && parsed >= 10 && parsed <= 32000) return parsed;
  return 4000;
}

/** حداکثر طول عنوان مکالمه (از نخستین پیام کاربر ساخته می‌شود) */
export const CONVERSATION_TITLE_MAX = 48;

/** حداکثر مکالمه‌های نگهداری‌شده در فهرست هر کاربر */
export const CONVERSATIONS_LIST_LIMIT = 100;

/** تعداد پیام‌های اخیری که به مدل ارسال می‌شود — تاریخچه نامحدود هرگز
 *  به مدل فرستاده نمی‌شود (کاهش مصرف و جلوگیری از سرریز زمینه) */
export function historyWindow(): number {
  const parsed = Number(process.env.AI_HISTORY_WINDOW);
  if (Number.isInteger(parsed) && parsed >= 2 && parsed <= 50) return parsed;
  return 16;
}

/** سقف پیام کاربر در دقیقه (محدودسازی نرخ مبتنی بر دیتابیس) */
export function ratePerMinute(): number {
  const parsed = Number(process.env.AI_RATE_PER_MINUTE);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 1000) return parsed;
  return 8;
}

/** سقف پیام کاربر در ۲۴ ساعت */
export function ratePerDay(): number {
  const parsed = Number(process.env.AI_RATE_PER_DAY);
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 10000) return parsed;
  return 150;
}

/* ------------------------------ تایپ‌های کلاینت ------------------------------ */

export interface AssistantMessageClient {
  id: string;
  role: MessageRole;
  content: string;
  lang: AssistantLang | null;
  createdAt: string; // ISO
}

export interface AssistantConversationSummary {
  id: string;
  title: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  messageCount: number;
}

export interface AssistantConversationDetail extends AssistantConversationSummary {
  messages: AssistantMessageClient[];
}

/** وضعیت اتصال ارائه‌دهنده مدل — فقط فیلدهای غیرحساس به مرورگر برمی‌گردد */
export interface AssistantProviderStatusClient {
  id: string; // "zai" | "openai-compatible"
  configured: boolean;
  model: string | null; // نام مدل یا null برای پیش‌فرض ارائه‌دهنده
}

/* ------------------------------ خطاهای دامنه ------------------------------ */

export type AssistantErrorCode =
  | "NOT_FOUND" // مکالمه ناموجود یا متعلق به کاربر دیگر — پاسخ یکسان 404
  | "VALIDATION" // ورودی نامعتبر (خالی/بلند/نوع اشتباه)
  | "LIMIT_REACHED" // سقف مکالمه‌ها
  | "RATE_LIMITED" // سقف نرخ ارسال پیام (429)
  | "AI_NOT_CONFIGURED" // اتصال دستیار پیکربندی نشده
  | "AI_AUTH" // خطای احراز هویت ارائه‌دهنده
  | "AI_RATE_LIMIT" // محدودیت مصرف ارائه‌دهنده
  | "AI_TIMEOUT" // timeout فراخوانی مدل
  | "AI_NETWORK" // قطع اتصال به ارائه‌دهنده
  | "AI_EMPTY_RESPONSE" // پاسخ خالی مدل
  | "AI_PROVIDER" // خطای دیگر ارائه‌دهنده
  | "INTERNAL";

export class AssistantError extends Error {
  code: AssistantErrorCode;
  /** فقط برای سرور — هرگز به کلاینت برگردانده نمی‌شود */
  detail?: string;
  /** پیشنهاد انتظار پیش از تلاش مجدد (ثانیه) برای خطای نرخ */
  retryAfterSec?: number;

  constructor(
    code: AssistantErrorCode,
    message: string,
    options?: { detail?: string; retryAfterSec?: number }
  ) {
    super(message);
    this.code = code;
    this.detail = options?.detail;
    this.retryAfterSec = options?.retryAfterSec;
  }
}
