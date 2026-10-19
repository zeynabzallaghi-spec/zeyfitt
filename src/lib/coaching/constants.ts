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
  | "SUBSCRIPTION_REQUIRED"
  | "ROLE_NOT_ALLOWED"
  | "COACH_NOT_VERIFIED";

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
