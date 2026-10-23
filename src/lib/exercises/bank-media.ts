/**
 * رسانه حرکات بانک عمومی — مرحله ۲۰/P2 (R2.3).
 *
 * قواعد ثابت این مسیر:
 *  - فقط رکوردهای origin=core و status=active رسانه میگیرند (آپلود فقط
 *    ادمین). ویدئو برای مشارکت مربی (origin=coach) در P3 با گردش کار
 *    انتشار میآید — اینجا عمداً دور زده نمیشود.
 *  - اعتبارسنجی همان قواعد رسانه حرکت شخصی: whitelist MIME + امضای
 *    بایتها (پسوند/نوع اعلامی بهتنهایی کافی نیست) + سقف حجم (تصویر
 *    ۵MB ثابت، ویدئو ۵۰MB پیشفرض قابل تنظیم) + سقف ۴ فایل به ازای حرکت.
 *  - ذخیره فقط از لایه storage-provider (namespace «bank-exercises»).
 *  - خواندن: هر کاربر دارای نشست معتبر (همان قواعد دید بانک عمومی) از
 *    مسیر استریم؛ مهمان 401. هیچ فایلی عمومی/بدون احراز هویت نیست.
 *  - videoStatus رکورد: آپلود ویدئو → uploaded؛ حذف آخرین ویدئو → none.
 *    این فیلد طبق قرارداد فاز ۱۸ هرگز در خروجی کلاینت نیست (whitelist).
 *  - رکورد بانک هرگز حذف نمیشود؛ حذف فقط رسانه است.
 */

import { db } from "@/lib/db";
import {
  CoachingError,
  COACH_EXERCISE_LIMITS,
  getExerciseVideoMaxBytes,
} from "@/lib/coaching/constants";
import {
  deleteExerciseMediaFile,
  resolveVerifiedExerciseMediaMime,
  saveExerciseMediaFile,
  sniffCoachExerciseMediaMime,
} from "@/lib/coaching/media-storage";
import { sanitizeDisplayName } from "@/lib/coaching/attachments";

export interface BankExerciseMediaClient {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/** خروجی whitelist فهرست رسانه — بدون storagePath و بدون وضعیت داخلی رکورد */
function toClient(row: {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}): BankExerciseMediaClient {
  return {
    id: row.id,
    kind: row.kind,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt.toISOString(),
  };
}

/** فهرست رسانههای یک رکورد بانک — برای دیالوگ جزئیات کتابخانه */
export async function listBankExerciseMedia(
  exerciseId: string
): Promise<BankExerciseMediaClient[]> {
  const rows = await db.exerciseMedia.findMany({
    where: { exerciseId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toClient);
}

/**
 * آپلود رسانه روی رکورد بانک — فقط ادمین؛ فقط origin=core فعال.
 * کد خطاها با مسیر مربی همخوان است تا UI/پیامها یکدست بمانند.
 */
export async function addBankExerciseMedia(
  role: string,
  exerciseId: string,
  file: { name: string | null; declaredType: string | null; bytes: Uint8Array }
): Promise<BankExerciseMediaClient> {
  if (role !== "ADMIN") throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  const exercise = await db.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, origin: true, status: true, videoStatus: true },
  });
  if (!exercise || exercise.status !== "active") {
    throw new CoachingError(404, "EXERCISE_NOT_IN_BANK");
  }
  // ویدئوی مشارکت مربی در P3 — این مسیر فقط رکوردهای پایه (core)
  if (exercise.origin !== "core") {
    throw new CoachingError(422, "BANK_MEDIA_ORIGIN_NOT_ALLOWED");
  }

  const count = await db.exerciseMedia.count({ where: { exerciseId } });
  if (count >= COACH_EXERCISE_LIMITS.MEDIA_MAX_PER_EXERCISE) {
    throw new CoachingError(409, "EXERCISE_MEDIA_LIMIT");
  }

  // ترتیب خطاها: خالی → نوع → حجم (پیام روشنتر برای کاربر)
  if (file.bytes.byteLength === 0) {
    throw new CoachingError(422, "FILE_EMPTY");
  }
  const sniffed = sniffCoachExerciseMediaMime(file.bytes);
  const verified = resolveVerifiedExerciseMediaMime(file.declaredType, sniffed);
  if (!verified) {
    throw new CoachingError(415, "FILE_TYPE_NOT_ALLOWED");
  }
  const isVideo = verified.startsWith("video/");
  const maxBytes = isVideo
    ? getExerciseVideoMaxBytes()
    : COACH_EXERCISE_LIMITS.IMAGE_MAX_BYTES;
  if (file.bytes.byteLength > maxBytes) {
    throw new CoachingError(413, "FILE_TOO_LARGE");
  }

  const { storagePath } = await saveExerciseMediaFile(
    "bank-exercises",
    exerciseId,
    file.bytes
  );
  const kind = isVideo ? "video" : "image";
  try {
    const media = await db.exerciseMedia.create({
      data: {
        exerciseId,
        kind,
        fileName: sanitizeDisplayName(file.name),
        mimeType: verified,
        sizeBytes: file.bytes.byteLength,
        storagePath,
      },
    });
    // videoStatus فقط داخلی — هرگز به کلاینت نمیرسد (قرارداد فاز ۱۸)
    if (isVideo && exercise.videoStatus !== "uploaded") {
      await db.exercise.update({
        where: { id: exerciseId },
        data: { videoStatus: "uploaded" },
      });
    }
    return toClient(media);
  } catch (error) {
    // رکورد ساخته نشد — فایل یتیم پاک میشود
    await deleteExerciseMediaFile(storagePath);
    throw error;
  }
}

/**
 * حذف رسانه رکورد بانک — فقط ادمین؛ فایل storage هم پاک میشود.
 * پس از حذف آخرین ویدئو، videoStatus به none برمیگردد.
 * رسانه رکوردهای origin=coach با این مسیر حذف نمیشود — مالکیت رسانهٔ
 * مشارکت مربی با گردش کار انتشار است (کپی دوباره در تأیید بعدی؛ P3).
 */
export async function deleteBankExerciseMedia(
  role: string,
  mediaId: string
): Promise<boolean | null> {
  if (role !== "ADMIN") throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  const media = await db.exerciseMedia.findUnique({
    where: { id: mediaId },
    select: {
      id: true,
      exerciseId: true,
      kind: true,
      storagePath: true,
      exercise: { select: { origin: true } },
    },
  });
  if (!media) return null;
  if (media.exercise.origin !== "core") {
    throw new CoachingError(422, "BANK_MEDIA_ORIGIN_NOT_ALLOWED");
  }
  await db.exerciseMedia.delete({ where: { id: mediaId } });
  await deleteExerciseMediaFile(media.storagePath);
  if (media.kind === "video") {
    const remaining = await db.exerciseMedia.count({
      where: { exerciseId: media.exerciseId, kind: "video" },
    });
    if (remaining === 0) {
      await db.exercise.update({
        where: { id: media.exerciseId },
        data: { videoStatus: "none" },
      });
    }
  }
  return true;
}

/**
 * متادیتای رسانه برای سرو استریم — با قاعده دید بانک (P3):
 * رکورد باید status=active و (origin=core یا publishState=published) باشد؛
 * رسانه هرگز راهی برای دورزدن وضعیت انتشار فراهم نمیکند — رکورد
 * فراخوانی‌شده (recalled) یا نامرئی → null (پاسخ امن 404).
 */
export async function getBankExerciseMediaForStream(
  mediaId: string
): Promise<{
  mimeType: string;
  fileName: string;
  storagePath: string;
} | null> {
  const media = await db.exerciseMedia.findUnique({
    where: { id: mediaId },
    select: {
      mimeType: true,
      fileName: true,
      storagePath: true,
      exercise: { select: { status: true, origin: true, publishState: true } },
    },
  });
  if (!media || media.exercise.status !== "active") return null;
  if (media.exercise.origin !== "core" && media.exercise.publishState !== "published") {
    return null;
  }
  return {
    mimeType: media.mimeType,
    fileName: media.fileName,
    storagePath: media.storagePath,
  };
}
