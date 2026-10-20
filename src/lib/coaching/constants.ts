/**
 * ثابت‌ها و انواع دامنه مرحله ۱۵ — ارتباط دانشجو و مربی + پلن‌های اشتراک.
 *
 * همه تصمیم‌های مجوزی سمت سرور با همین ثابت‌ها گرفته می‌شود؛ کلاینت فقط
 * برچسب نمایشی می‌گیرد و هرگز مقدار نقش/اشتراک/وضعیت را تعیین نمی‌کند.
 */

/* ------------------------------- نقش کاربر ------------------------------- */

export const USER_ROLES = {
  STUDENT: "STUDENT",
  COACH: "COACH",
  ADMIN: "ADMIN",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/* ---------------------------- نوع همکاری مربی ---------------------------- */

export const COOPERATION_TYPES = {
  SEMI_PRIVATE: "SEMI_PRIVATE",
  PRIVATE: "PRIVATE",
} as const;

export type CooperationType =
  (typeof COOPERATION_TYPES)[keyof typeof COOPERATION_TYPES];

export const COOPERATION_TYPE_VALUES = Object.values(
  COOPERATION_TYPES
) as CooperationType[];

/* ------------------------------- وضعیت ارتباط ------------------------------- */

export const CONNECTION_STATUSES = {
  PENDING: "PENDING",
  ACTIVE: "ACTIVE",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
  ENDED: "ENDED",
} as const;

export type ConnectionStatus =
  (typeof CONNECTION_STATUSES)[keyof typeof CONNECTION_STATUSES];

/* ------------------------------- سطح اشتراک ------------------------------- */

export const SUBSCRIPTION_TIERS = {
  FREE: "FREE",
  PREMIUM: "PREMIUM",
} as const;

export type SubscriptionTier =
  (typeof SUBSCRIPTION_TIERS)[keyof typeof SUBSCRIPTION_TIERS];

/* -------------------------------- تخصص مربی -------------------------------- */

/** کدهای پایدار تخصص — برچسب نمایشی در i18n (sections/shared) */
export const COACH_SPECIALIZATIONS = [
  "strength",
  "hypertrophy",
  "fat_loss",
  "endurance",
  "mobility",
  "rehab",
  "nutrition_coaching",
  "functional",
] as const;

export type CoachSpecialization = (typeof COACH_SPECIALIZATIONS)[number];

/* --------------------------------- سقف‌ها --------------------------------- */

export const CONNECTION_LIMITS = {
  /** سقف کاراکتر پیام معرفی دانشجو */
  MESSAGE_MAX: 500,
  /** سقف کاراکتر دلیل رد مربی */
  REJECTION_REASON_MAX: 200,
  /** حداکثر درخواست باز (PENDING) هم‌زمان یک دانشجو در کل سیستم */
  MAX_OPEN_REQUESTS_PER_STUDENT: 5,
  /** حداکثر درخواست ساخته‌شده یک دانشجو در پنجره یک ساعت (ضد اسپم) */
  REQUEST_RATE_PER_HOUR: 5,
} as const;

export const APPLICATION_LIMITS = {
  MESSAGE_MAX: 1000,
  CERTIFICATIONS_MAX: 10,
  CERTIFICATION_ITEM_MAX: 120,
} as const;

/* ---------- مرحله ۱۹.۵ب — پیوست درخواست مربی‌گری (سند با عنوان) ---------- */

export const ATTACHMENT_LIMITS = {
  /** حداکثر تعداد پیوست به ازای هر درخواست مربی‌گری */
  MAX_PER_APPLICATION: 5,
  /** حداکثر اندازه هر فایل به بایت — ۵ مگابایت */
  SIZE_MAX_BYTES: 5 * 1024 * 1024,
  /** سقف کاراکتر عنوان سند پس از trim */
  TITLE_MAX: 80,
  /** سقف کاراکتر نام فایل نمایشی (نام اصلی برای نمایش — هرگز مسیر دیسک نیست) */
  FILE_NAME_MAX: 120,
  /**
   * انواع مجاز فایل — whitelist سخت‌گیرانه. علاوه بر نوع اعلامی کلاینت،
   * امضای بایت‌ها (magic bytes) سمت سرور بررسی میشود؛ هر دو باید هم‌خوان
   * و در همین فهرست باشند.
   */
  MIME_WHITELIST: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ] as const,
} as const;

/** محتویات مجاز ATTACHMENT_LIMITS.MIME_WHITELIST به صورت Set برای بررسی سریع */
export const ATTACHMENT_MIME_ALLOWED = new Set<string>(
  ATTACHMENT_LIMITS.MIME_WHITELIST
);

export const COACH_PROFILE_LIMITS = {
  DISPLAY_NAME_MAX: 60,
  HEADLINE_MAX: 120,
  BIO_MAX: 2000,
  SPECIALIZATIONS_MAX: 8,
  CERTIFICATIONS_MAX: 10,
  CERTIFICATION_ITEM_MAX: 120,
  EXPERIENCE_YEARS_MAX: 60,
} as const;

/* --------------------- مرحله ۱۷ — پیام‌رسانی خصوصی --------------------- */

export const CHAT_LIMITS = {
  /** سقف کاراکتر محتوای هر پیام (متن ساده) */
  CONTENT_MAX: 2000,
  /** حداقل کاراکتر معتبر پس از trim — پیام خالی/فقط فاصله رد میشود */
  CONTENT_MIN: 1,
  /** حداکثر پیام ارسالی هر کاربر در پنجره یک دقیقه — شمارش دیتابیسی */
  SEND_RATE_PER_MINUTE: 20,
  /** اندازه پیشفرض صفحه پیام */
  PAGE_DEFAULT: 30,
  /** حداکثر اندازه صفحه پیام در یک درخواست */
  PAGE_MAX: 100,
  /** حداکثر رکورد فهرست مکالمه‌ها در یک درخواست */
  LIST_MAX: 100,
  /** سقف کاراکتر پیش‌نمایش آخرین پیام در فهرست مکالمه‌ها */
  PREVIEW_MAX: 120,
} as const;

/**
 * دلایل مسدود بودن ارسال پیام — کدهای پایدار برای نمایش شفاف؛ ترجمه در
 * دیکشنری server-messages. «خواندن تاریخچه» هرگز با این دلایل بسته
 * نمیشود (سیاست حفظ تاریخچه پروژه)؛ فقط ارسال جدید مشروط است.
 */
export type ChatBlockReason =
  | "CONNECTION_NOT_ACTIVE"
  | "CONNECTION_CLOSED"
  | "SUBSCRIPTION_REQUIRED"
  | "ROLE_NOT_ALLOWED"
  | "COACH_NOT_VERIFIED"
  | "CHAT_BLOCKED";

/* ---------------- مرحله ۱۹.۶ — پیوست گفت‌وگو، تعرفه/پرداخت، حرکات شخصی ---------------- */

export const CHAT_ATTACHMENT_LIMITS = {
  /** حداکثر مجموع بایتهای پیوست در هر ارسال — ۲۰ مگابایت (سمت سرور) */
  TOTAL_MAX_BYTES: 20 * 1024 * 1024,
  /** حداکثر فایل در هر ارسال */
  MAX_FILES: 3,
  /** سقف کاراکتر نام فایل نمایشی (هرگز مسیر دیسک نیست) */
  FILE_NAME_MAX: 120,
  /**
   * انواع مجاز — تصاویر و فایلهای مستند. ویدئو در این مرحله عمداً مجاز نیست
   * (زیرساخت پخش امن/Range کامل هنوز تامین نشده — ادعای ناصادقانه نمیسازیم).
   * امضای بایتها سمت سرور راستیآزمایی میشود؛ پسوند هرگز کافی نیست.
   */
  MIME_WHITELIST: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  ] as const,
} as const;

export const CHAT_ATTACHMENT_MIME_ALLOWED = new Set<string>(
  CHAT_ATTACHMENT_LIMITS.MIME_WHITELIST
);

export const PAYMENT_LIMITS = {
  /** سقف مبلغ به واحد اصلی ارز — محافظ ورودی */
  AMOUNT_MAX: 10_000_000_000,
  AMOUNT_MIN: 1,
  /** سقف کاراکتر توضیح پرداخت */
  DESCRIPTION_MAX: 500,
  /** سقف کاراکتر لینک پرداخت خارجی */
  EXTERNAL_LINK_MAX: 1000,
  CURRENCIES: ["IRR", "USD"] as const,
} as const;

export const COACH_EXERCISE_LIMITS = {
  NAME_MAX: 80,
  DESCRIPTION_MAX: 2000,
  TIPS_MAX: 1000,
  MUSCLES_MAX: 6,
  EQUIPMENT_MAX: 6,
  /** سقف فایل رسانه به‌ازای هر حرکت شخصی */
  MEDIA_MAX_PER_EXERCISE: 4,
  /** تصویر — ۵ مگابایت */
  IMAGE_MAX_BYTES: 5 * 1024 * 1024,
  /** ویدئو — ۵۰ مگابایت (فقط MP4/WebM با امضای بایت) */
  VIDEO_MAX_BYTES: 50 * 1024 * 1024,
  IMAGE_MIME_WHITELIST: ["image/jpeg", "image/png", "image/webp"] as const,
  VIDEO_MIME_WHITELIST: ["video/mp4", "video/webm"] as const,
} as const;

/* --------------------------- خطای دامنه با وضعیت HTTP --------------------------- */

/**
 * خطای معنادار دامنه — هر Route Handler آن را به پاسخ HTTP با کد پایدار
 * ترجمه می‌کند: 401/403/404/409/422/429 مطابق قرارداد پروژه.
 */
export class CoachingError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string
  ) {
    super(code);
    this.name = "CoachingError";
  }
}
