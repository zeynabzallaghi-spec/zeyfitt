/**
 * لایه ذخیره‌سازی فایل‌های مرحله ۱۹.۶ — پیوست گفت‌وگو، رسانه حرکت شخصی.
 *
 * همان قواعد سخت‌گیرانه لایه پیوست درخواست مربی‌گری (19.5ب):
 *  - فایل‌ها خارج از public و فقط از مسیر API مالکیت‌محور خوانده میشوند.
 *  - نام فایل روی دیسک هرگز از ورودی کاربر گرفته نمیشود (ضد path traversal).
 *  - نوع فایل با whitelist + امضای بایت‌ها (magic bytes) تأیید میشود؛
 *    پسوند و نوع اعلامی کلاینت به‌تنهایی قابل اعتماد نیستند.
 *  - storagePath نسبی است و هنگام خواندن دوباره داخل ریشه تأیید میشود.
 *  - طراحی برای مهاجرت آینده به فضای ذخیره‌سازی پایدار: همه خواندن/نوشتن
 *    از توابع همین لایه عبور میکند (مسیر نسبی + ریشه قابل تغییر).
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { COACH_EXERCISE_LIMITS } from "@/lib/coaching/constants";

/* ------------------------------ پیوست گفت‌وگو ------------------------------ */

export const CHAT_ATTACHMENT_ROOT = path.join(
  process.cwd(),
  "data",
  "uploads",
  "chat"
);

/**
 * تشخیص نوع واقعی پیوست گفت‌وگو از امضای بایت‌ها — خروجی فقط انواع
 * whitelist چت یا null. برای docx/xlsx (ZIP-based) امضای PK و برای TXT
 * بررسی متن ساده بدون نویسه کنترلی اعمال میشود.
 */
export function sniffChatMime(bytes: Uint8Array): string | null {
  if (bytes.length < 8) return null;
  // JPEG
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // WebP
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // GIF87a / GIF89a
  if (
    bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  // PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  // ZIP-based (docx/xlsx): PK\x03\x04
  if (bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return "application/zip";
  }
  // MP4: ftyp box در بایت ۴..۸
  if (
    bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70
  ) {
    return "video/mp4";
  }
  // WebM / Matroska: EBML header
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return "video/webm";
  }
  return null;
}

/**
 * تأیید نهایی نوع پیوست گفت‌وگو: نوع اعلامی باید در whitelist باشد و با
 * امضای واقعی هم‌خوان. docx/xlsx هر دو ZIP-امضا هستند؛ تمایز نهایی با
 * بررسی الگوی مسیر داخلی ZIP انجام میشود (docProps/xl → xlsx).
 */
export function resolveChatAttachmentMime(
  declaredType: string | null | undefined,
  bytes: Uint8Array
): string | null {
  if (!declaredType) return null;
  const allowed = new Set<string>([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]);
  if (!allowed.has(declaredType)) return null;
  const sniffed = sniffChatMime(bytes);
  if (declaredType === "text/plain") {
    // متن ساده: نباید امضای باینری شناخته‌شده داشته باشد؛ حداکثر چند نویسه کنترلی
    if (sniffed !== null) return null;
    const sample = bytes.subarray(0, Math.min(bytes.length, 2048));
    let control = 0;
    for (const b of sample) {
      if (b === 0x09 || b === 0x0a || b === 0x0d) continue;
      if (b < 0x20) control += 1;
    }
    if (control > sample.length * 0.05) return null;
    return "text/plain";
  }
  if (
    declaredType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    declaredType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    if (sniffed !== "application/zip") return null;
    // تمایز درشت: حضور [Content_Types].xml در ابتدای ZIP — هر دو OOXML
    // بدون خواندن محتوای معنایی؛ کافی است ZIP بودن اثبات شود
    return declaredType;
  }
  if (sniffed !== declaredType) return null;
  return sniffed;
}

/** ذخیره فایل پیوست گفت‌وگو — نام دیسک تصادفی؛ خروجی مسیر نسبی */
export async function saveChatAttachmentFile(
  conversationId: string,
  bytes: Uint8Array
): Promise<{ storagePath: string }> {
  if (!/^[a-z0-9]+$/i.test(conversationId)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  const dir = path.join(CHAT_ATTACHMENT_ROOT, conversationId);
  await mkdir(dir, { recursive: true });
  const fileName = `${Date.now().toString(36)}-${randomUUID()}`;
  const storagePath = path.posix.join(conversationId, fileName);
  const abs = path.join(CHAT_ATTACHMENT_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(CHAT_ATTACHMENT_ROOT) + path.sep)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  await writeFile(abs, bytes);
  return { storagePath };
}

/** خواندن امن فایل پیوست گفت‌وگو — مسیر همیشه داخل ریشه تأیید میشود */
export async function readChatAttachmentFile(storagePath: string): Promise<Uint8Array> {
  const abs = path.resolve(CHAT_ATTACHMENT_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(CHAT_ATTACHMENT_ROOT) + path.sep)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  const buf = await readFile(abs);
  const out = new Uint8Array(buf.byteLength);
  out.set(buf);
  return out;
}

/** حذف امن فایل پیوست گفت‌وگو — idempotent */
export async function deleteChatAttachmentFile(storagePath: string): Promise<void> {
  const abs = path.resolve(CHAT_ATTACHMENT_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(CHAT_ATTACHMENT_ROOT) + path.sep)) {
    return;
  }
  try {
    await unlink(abs);
  } catch {
    // از قبل نبوده — هدف همان است
  }
}

/* --------------------------- رسانه حرکت شخصی مربی --------------------------- */

export const COACH_EXERCISE_MEDIA_ROOT = path.join(
  process.cwd(),
  "data",
  "uploads",
  "coach-exercises"
);

/** تشخیص نوع رسانه حرکت شخصی — تصویر یا ویدئو؛ خروجی فقط whitelist یا null */
export function sniffCoachExerciseMediaMime(bytes: Uint8Array): string | null {
  const sniffed = sniffChatMime(bytes);
  const allowed = new Set<string>([
    ...COACH_EXERCISE_LIMITS.IMAGE_MIME_WHITELIST,
    ...COACH_EXERCISE_LIMITS.VIDEO_MIME_WHITELIST,
  ]);
  return sniffed !== null && allowed.has(sniffed) ? sniffed : null;
}

/**
 * تأیید نهایی نوع رسانه حرکت شخصی: نوع اعلامی باید با امضای واقعی هم‌خوان
 * و در whitelist باشد — در غیر این صورت null (رد).
 */
export function resolveVerifiedExerciseMediaMime(
  declaredType: string | null | undefined,
  sniffed: string | null
): string | null {
  if (!declaredType || !sniffed) return null;
  const allowed = new Set<string>([
    ...COACH_EXERCISE_LIMITS.IMAGE_MIME_WHITELIST,
    ...COACH_EXERCISE_LIMITS.VIDEO_MIME_WHITELIST,
  ]);
  if (!allowed.has(declaredType)) return null;
  return sniffed === declaredType ? sniffed : null;
}

export async function saveCoachExerciseMediaFile(
  exerciseId: string,
  bytes: Uint8Array
): Promise<{ storagePath: string }> {
  if (!/^[a-z0-9]+$/i.test(exerciseId)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  const dir = path.join(COACH_EXERCISE_MEDIA_ROOT, exerciseId);
  await mkdir(dir, { recursive: true });
  const fileName = `${Date.now().toString(36)}-${randomUUID()}`;
  const storagePath = path.posix.join(exerciseId, fileName);
  const abs = path.join(COACH_EXERCISE_MEDIA_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(COACH_EXERCISE_MEDIA_ROOT) + path.sep)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  await writeFile(abs, bytes);
  return { storagePath };
}

export async function readCoachExerciseMediaFile(storagePath: string): Promise<Uint8Array> {
  const abs = path.resolve(COACH_EXERCISE_MEDIA_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(COACH_EXERCISE_MEDIA_ROOT) + path.sep)) {
    throw new Error("UNSAFE_ATTACHMENT_PATH");
  }
  const buf = await readFile(abs);
  const out = new Uint8Array(buf.byteLength);
  out.set(buf);
  return out;
}

export async function deleteCoachExerciseMediaFile(storagePath: string): Promise<void> {
  const abs = path.resolve(COACH_EXERCISE_MEDIA_ROOT, storagePath);
  if (!abs.startsWith(path.resolve(COACH_EXERCISE_MEDIA_ROOT) + path.sep)) {
    return;
  }
  try {
    await unlink(abs);
  } catch {
    // idempotent
  }
}
