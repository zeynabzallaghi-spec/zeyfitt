/**
 * لایه ذخیره‌سازی پیوست درخواست مربی‌گری — مرحله ۱۹.۵ب.
 *
 * قواعد امنیتی این لایه:
 *  - فایل‌ها خارج از public و فقط از مسیر API مالکیت‌محور خوانده میشوند
 *    (مالک درخواست یا ادمین) — هرگز فایل استاتیک عمومی نیستند.
 *  - نام فایل روی دیسک هرگز از ورودی کاربر گرفته نمیشود؛ نام اصلی فقط
 *    برای نمایش در metadata ذخیره میشود (ضد path traversal).
 *  - نوع فایل با whitelist + بررسی امضای بایت‌ها (magic bytes) تأیید
 *    میشود؛ نوع اعلامی کلاینت به‌تنهایی قابل اعتماد نیست.
 *  - storagePath در دیتابیس نسبی است و هنگام خواندن دوباره داخل دایرکتوری
 *    ریشه تأیید میشود (دفاع عمقی در برابر دستکاری دیتابیس/ورودی).
 */

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  ATTACHMENT_LIMITS,
  ATTACHMENT_MIME_ALLOWED,
} from "./constants";

/** ریشه ذخیره‌سازی پیوست‌ها — خارج از public، داخل data پروژه */
export const ATTACHMENT_ROOT = path.join(
  process.cwd(),
  "data",
  "uploads",
  "coach-applications"
);

/** حداکثر بایت‌هایی که برای بررسی امضا لازم است */
const SNIFF_HEADER_BYTES = 16;

/**
 * تشخیص نوع واقعی فایل از امضای بایت‌ها — خروجی فقط انواع whitelist
 * یا null (نوع ناشناخته/غیرمجاز).
 */
export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < SNIFF_HEADER_BYTES) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // WebP: "RIFF" ???? "WEBP"
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // PDF: "%PDF-" — از بایت ۰؛ برخی تولیدکننده‌ها فضای خالی ابتدای فایل نمی‌گذارند
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  ) {
    return "application/pdf";
  }
  return null;
}

/**
 * تأیید نهایی نوع فایل: نوع اعلامی کلاینت باید در whitelist باشد و با
 * امضای واقعی بایت‌ها هم‌خوان باشد — در غیر این صورت رد.
 */
export function resolveVerifiedMime(
  declaredType: string | null | undefined,
  bytes: Uint8Array
): string | null {
  if (!declaredType || !ATTACHMENT_MIME_ALLOWED.has(declaredType)) return null;
  const sniffed = sniffMime(bytes);
  if (!sniffed || sniffed !== declaredType) return null;
  return sniffed;
}

/** پاک‌سازی نام نمایشی فایل — بدون کاراکتر کنترلی، کوتاه‌شده، بدون مسیر */
export function sanitizeDisplayName(raw: string | null | undefined): string {
  const base = (raw ?? "file")
    .replace(/[\\/\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s]+/, "");
  const safe = base.length > 0 ? base : "file";
  return safe.slice(0, ATTACHMENT_LIMITS.FILE_NAME_MAX);
}

/**
 * ذخیره فایل پیوست روی دیسک با نام تصادفی امن.
 * خروجی مسیر نسبی نسبت به ریشه پیوست‌ها (برای ستون storagePath).
 */
export async function saveAttachmentFile(
  applicationId: string,
  bytes: Uint8Array
): Promise<{ storagePath: string; sha256: string }> {
  const dir = path.join(ATTACHMENT_ROOT, applicationId);
  // دفاع: applicationId از دیتابیس می‌آید (cuid) — با این حال فقط الگوی امن
  if (!/^[a-z0-9]+$/i.test(applicationId)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  await mkdir(dir, { recursive: true });
  const fileName = `${Date.now().toString(36)}-${randomUUID()}`;
  const storagePath = path.posix.join(applicationId, fileName);
  const abs = path.join(ATTACHMENT_ROOT, storagePath);
  // دفاع عمقی: مسیر نهایی حتماً داخل ریشه باید بماند
  if (!abs.startsWith(ATTACHMENT_ROOT + path.sep)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  await writeFile(abs, bytes);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  return { storagePath, sha256 };
}

/**
 * خواندن فایل پیوست از دیسک — مسیر ذخیره‌شده نسبی است و اینجا دوباره
 * داخل ریشه تأیید میشود (هر مسیر خارج ریشه → خطا، نه خواندن).
 */
export async function readAttachmentFile(
  storagePath: string
): Promise<Uint8Array<ArrayBuffer>> {
  const abs = path.resolve(ATTACHMENT_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(ATTACHMENT_ROOT) + path.sep)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  const buf = await readFile(abs);
  // کپی در Uint8Array با بافر پشتوانه ArrayBuffer — سازگار با BodyInit پاسخ
  const out = new Uint8Array(buf.byteLength);
  out.set(buf);
  return out;
}

/** حذف فایل از دیسک — خطای نبودن فایل نادیده گرفته میشود (idempotent) */
export async function deleteAttachmentFile(storagePath: string): Promise<void> {
  const abs = path.resolve(ATTACHMENT_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(ATTACHMENT_ROOT) + path.sep)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  try {
    await unlink(abs);
  } catch {
    // فایل از قبل نبوده — هدف همان نبود فایل است
  }
}
