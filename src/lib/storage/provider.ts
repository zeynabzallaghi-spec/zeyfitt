/**
 * لایه storage-provider قابل‌تعویض — مرحله ۲۰/P2 (تصمیم D4).
 *
 * چرا این لایه وجود دارد: سندباکس توسعه گاهی ریست میشود و فایلهای محلی
 * از بین میروند. همه خواندن/نوشتن رسانه حرکات باید از یک مرز واحد عبور
 * کند تا انتقال آینده به سرویس پایدار (S3-compatible و مانند آن) فقط با
 * افزودن یک provider انجام شود — بدون تغییر API، مدل داده یا UI.
 *
 * وضعیت صادقانه (قرارداد گزارش کاربر):
 *  - provider فعلی فقط «local» است: دیسک پروژه (data/uploads). با ریست
 *    سندباکس از بین میرود؛ با ریاستارت پروسه میماند. هیچ ادعای پایداری
 *    تولیدی نمیشود.
 *  - driver «external» در این مرحله «طراحی شده اما پیکربندی نشده» است:
 *    انتخاب آن خطای صریح STORAGE_NOT_CONFIGURED میدهد — هیچ provider
 *    ساختگی یا نیمهکاره‌ای که کار نکند ارائه نشده است. فعالسازی آن به
 *    تصمیم و اعتبارنامه کاربر (سرویس خارجی) نیاز دارد.
 *  - مسیر ذخیرهسازی هرگز به scratch/ یا مسیر موقت نمیرود؛ کلیدها
 *    نسبی هستند و هنگام هر خواندن داخل ریشه تأیید میشوند (ضد path
 *    traversal). نام فایل کاربر هرگز مسیر دیسک نمیشود.
 *
 * محدوده: در این مرحله فقط رسانه حرکات (شخصی مربی + بانک عمومی) از این
 * لایه عبور میکند؛ پیوست گفتوگوی مرحله ۱۹.۶ روی توابع قبلی خودش میماند
 * (بدون ریسک رفتاری) و مهاجرت آن به provider بعداً انجام میشود.
 */

import path from "node:path";
import { CoachingError } from "@/lib/coaching/constants";

/** namespaceهای مجاز کلید — هر provider باید فقط این پیشوندها را بپذیرد */
export const STORAGE_NAMESPACES = [
  "coach-exercises",
  "bank-exercises",
] as const;

export type StorageNamespace = (typeof STORAGE_NAMESPACES)[number];

export function isStorageNamespace(value: string): value is StorageNamespace {
  return (STORAGE_NAMESPACES as readonly string[]).includes(value);
}

export interface StorageProvider {
  /** شناسه driver برای لاگ و تست — مقدار پایدار */
  readonly driver: "local" | "external";
  /**
   * وضعیت صادقانه ماندگاری — هرگز برای provider محلی مقدار
   * «external-service» گزارش نمیشود و برعکس.
   */
  readonly durability: "local-dev-disk" | "external-service";
  /** ذخیره بایتهای کامل — کلید نسبی namespace-safe */
  put(storagePath: string, bytes: Uint8Array): Promise<void>;
  /**
   * بازکردن جریان بایتها برای بازه [start, endInclusive] — پخش استریم
   * بدون خواندن کل فایل در حافظه. فایل مفقود → null (پاسخ امن 404).
   */
  openRange(
    storagePath: string,
    start: number,
    endInclusive: number
  ): Promise<ReadableStream<Uint8Array> | null>;
  /** اندازه فایل به بایت — مفقود → null */
  sizeOf(storagePath: string): Promise<number | null>;
  /** حذف فایل — idempotent؛ نبودن خطا نیست */
  delete(storagePath: string): Promise<void>;
}

/** اعتبارسنجی کلید نسبی: namespace مجاز + بدون path traversal */
export function assertSafeStoragePath(storagePath: string): void {
  if (!storagePath || storagePath.length > 512) {
    throw new CoachingError(500, "UNSAFE_STORAGE_PATH");
  }
  const parts = storagePath.split("/");
  if (parts.length < 3 || !isStorageNamespace(parts[0])) {
    throw new CoachingError(500, "UNSAFE_STORAGE_PATH");
  }
  for (const part of parts) {
    // هر جزء: بدون ".." / "." / خالی / نویسه کنترلی — کلیدها همیشه
    // از الگوی داخلی سرور ساخته میشوند نه ورودی کاربر
    if (
      part.length === 0 ||
      part === "." ||
      part === ".." ||
      /[\0\r\n\\]/.test(part)
    ) {
      throw new CoachingError(500, "UNSAFE_STORAGE_PATH");
    }
  }
}

/** driver فعال از env — پیشفرض local؛ انتخاب external بدون پیکربندی → خطای صریح */
export function storageDriverName(): "local" | "external" {
  const raw = (process.env.STORAGE_DRIVER ?? "local").trim().toLowerCase();
  return raw === "external" ? "external" : "local";
}

/**
 * provider فعال — در این مرحله فقط local پیادهسازی شده است. انتخاب
 * external عمداً خطای صریح میدهد (نه fallback بیصدای محلی) تا هیچ
 * ادعای پایداری ساختگیای شکل نگیرد؛ افزودن provider خارجی واقعی بعداً
 * فقط در همین تابع انجام میشود.
 */
export function getStorageProvider(): StorageProvider {
  if (storageDriverName() === "external") {
    throw new CoachingError(500, "STORAGE_NOT_CONFIGURED");
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- افزودن provider آینده فقط همین‌جا تغییر میکند
  const { localStorageProvider } = require("./local-provider") as {
    localStorageProvider: StorageProvider;
  };
  return localStorageProvider;
}

/** توضیح وضعیت پایداری برای گزارش/مستندات — مقدار پایدار و قابل تست */
export function storageDurabilityStatus(): {
  driver: "local" | "external";
  configured: boolean;
  durable: false | "external-configured";
  note: string;
} {
  const driver = storageDriverName();
  if (driver === "external") {
    return {
      driver,
      configured: false,
      durable: false,
      note: "STORAGE_DRIVER=external انتخاب شده اما هیچ سرویس خارجی پیکربندی نشده — آپلود با STORAGE_NOT_CONFIGURED رد میشود",
    };
  }
  return {
    driver: "local",
    configured: true,
    durable: false,
    note: "ذخیرهسازی محلی توسعه (data/uploads) — با ریاستارت پروسه میماند، با ریست سندباکس از بین میرود؛ انتقال به سرویس پایدار نیازمند تصمیم و اعتبارنامه کاربر است",
  };
}

/** helper مشترک: ساخت کلید تصادفی امن برای یک رسانه جدید */
export function buildMediaStorageKey(
  namespace: StorageNamespace,
  ownerEntityId: string,
  fileStem: string
): string {
  // خط تیره در شناسه موجودیت مجاز است (fbd-push-up، cexpub-*) — نویسههای
  // مسیر (`/` و `.`) مسدودند و assertSafeStoragePath دفاع دوم است.
  if (!/^[a-z0-9-]+$/i.test(ownerEntityId) || !/^[a-z0-9-]+$/i.test(fileStem)) {
    throw new CoachingError(500, "UNSAFE_STORAGE_PATH");
  }
  const key = path.posix.join(namespace, ownerEntityId, fileStem);
  assertSafeStoragePath(key);
  return key;
}
