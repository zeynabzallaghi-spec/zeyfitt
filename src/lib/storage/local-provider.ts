/**
 * Provider محلی storage — مرحله ۲۰/P2 (تصمیم D4).
 *
 * پیادهسازی «local» از interface اعلامشده در provider.ts:
 *  - ریشهٔ دیسک: `data/uploads` (خارج از public/ و خارج از هر مسیر
 *    موقت/scratch) — فایلها فقط از مسیر API مالکیتمحور خوانده میشوند و
 *    هیچ فایلی عمومی/استاتیک نیست.
 *  - کلیدها نسبی و namespace دار هستند (coach-exercises/… و
 *    bank-exercises/…)، همیشه سمت سرور ساخته میشوند و نام فایل کاربر
 *    هرگز مسیر دیسک نمیشود. هر عملیات کلید را دوباره اعتبارسنجی میکند
 *    (assertSafeStoragePath + بقای مسیر مطلق داخل ریشه — ضد path
 *    traversal).
 *  - استریم واقعی با createReadStream و بازه [start, endInclusive] —
 *    هیچ خواندن کامل فایلی در حافظه انجام نمیشود؛ فایل مفقود → null
 *    (پاسخ امن 404 در لایه بالاتر، بدون افشای مسیر).
 *  - وضعیت صادقانه ماندگاری: «local-dev-disk» — با ریاستارت پروسه
 *    فایلها میمانند؛ این provider هیچ ادعای پایداری تولیدی نمیکند.
 *    انتقال به سرویس پایدار فقط با افزودن provider جدید در همان
 *    getStorageProvider انجام میشود؛ این فایل و هیچ مصرفکنندهای
 *    تغییر نمیکنند.
 */

import { createReadStream } from "node:fs";
import { mkdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { CoachingError } from "@/lib/coaching/constants";
import { assertSafeStoragePath, type StorageProvider } from "./provider";

/** ریشهٔ ذخیرهسازی محلی — ثابت؛ خارج از public/ */
const STORAGE_ROOT = path.join(process.cwd(), "data", "uploads");

/**
 * مسیر مطلق امن برای یک کلید نسبی: اعتبارسنجی قرارداد کلید + اثبات
 * اینکه مسیر نهایی داخل ریشه میماند (دفاع دوم پس از assertSafeStoragePath).
 */
function resolveSafeAbsolute(storagePath: string): string {
  assertSafeStoragePath(storagePath);
  const abs = path.resolve(STORAGE_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(STORAGE_ROOT) + path.sep)) {
    throw new CoachingError(500, "UNSAFE_STORAGE_PATH");
  }
  return abs;
}

export const localStorageProvider: StorageProvider = {
  driver: "local",
  durability: "local-dev-disk",

  /** ذخیره بایتهای کامل — دایرکتوری namespace در صورت نیاز ساخته میشود */
  async put(storagePath: string, bytes: Uint8Array): Promise<void> {
    const abs = resolveSafeAbsolute(storagePath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, bytes);
  },

  /**
   * بازکردن جریان بایتها برای بازه [start, endInclusive] — فایل مفقود
   * یا خالی → null؛ start خارج از فایل → null (پاسخ امن 404).
   */
  async openRange(
    storagePath: string,
    start: number,
    endInclusive: number
  ): Promise<ReadableStream<Uint8Array> | null> {
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(endInclusive) ||
      start < 0 ||
      endInclusive < start
    ) {
      // نقض invariant داخلی — لایه بالاتر بازه را قبل از فراخوانی سنجیده است
      throw new CoachingError(500, "INVALID_RANGE");
    }
    const abs = resolveSafeAbsolute(storagePath);
    let size: number;
    try {
      size = (await stat(abs)).size;
    } catch {
      return null; // فایل مفقود — 404 امن
    }
    if (size === 0 || start >= size) return null;
    const nodeStream = createReadStream(abs, {
      start,
      end: Math.min(endInclusive, size - 1),
    });
    // خطای میانی (مثلاً حذف فایل حین استریم) نباید پروسه را بیندازد
    nodeStream.on("error", () => nodeStream.destroy());
    return Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;
  },

  /** اندازه فایل به بایت — مفقود → null */
  async sizeOf(storagePath: string): Promise<number | null> {
    const abs = resolveSafeAbsolute(storagePath);
    try {
      return (await stat(abs)).size;
    } catch {
      return null;
    }
  },

  /** حذف فایل — idempotent؛ نبودن خطا نیست */
  async delete(storagePath: string): Promise<void> {
    const abs = resolveSafeAbsolute(storagePath);
    try {
      await unlink(abs);
    } catch {
      // از قبل نبوده — هدف همان است
    }
  },
};
