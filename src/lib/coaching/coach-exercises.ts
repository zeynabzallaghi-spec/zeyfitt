/**
 * بانک حرکات شخصی مربی — مرحله ۱۹.۶.
 *
 * مرزهای مهم با بانک عمومی (Exercise — ۹۰۵ حرکت):
 *  - کاملاً جدا است؛ هرگز وارد کتابخانه عمومی نمیشود و در هیچ API عمومی
 *    فهرست نمیشود (فقط مالک و مسیرهای مجاز سرور).
 *  - انیمیشن سه‌بعدی ندارد و صادقانه به‌عنوان «بدون ۳بعدی» نمایش داده
 *    میشود — هیچ نگاشت ساختگی ساخته نمیشود.
 *  - برنامه‌های مربی snapshot محتوایی میگیرند (نام‌ها در contentJson کپی
 *    میشوند)؛ حذف حرکت شخصی نسخه‌های ارسال‌شده را نمی‌شکند و از حذف
 *    آبشاری ناخواسته جلوگیری میشود. حرکت استفاده‌شده در برنامه پیش‌نویس
 *    فعلی با هشدار حذف میشود؟ — خیر: حذف مجاز است اما پس از آن ساخت
 *    برنامه جدید با آن شناسه با خطای صریح رد میشود (EXERCISE_NOT_IN_BANK).
 *  - رسانه (تصویر ≤۵MB / ویدئو MP4|WebM ≤۵۰MB) با امضای بایت‌ها تأیید و
 *    خارج از public با نام تصادفی ذخیره میشود؛ خواندن فقط مالک از API.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import {
  CoachingError,
  COACH_EXERCISE_LIMITS,
} from "@/lib/coaching/constants";
import {
  deleteCoachExerciseMediaFile,
  readCoachExerciseMediaFile,
  resolveVerifiedExerciseMediaMime,
  saveCoachExerciseMediaFile,
  sniffCoachExerciseMediaMime,
} from "./media-storage";
import { sanitizeDisplayName } from "./attachments";
import { saveAttachmentFile } from "./attachments";

/* ------------------------------ اعتبارسنجی ------------------------------ */

export const EXERCISE_CATEGORIES_ALLOWED = [
  "chest",
  "back",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "fullbody",
] as const;

const musclesAllowed = [
  "chest",
  "shoulders",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "back",
  "traps",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
  "adductors",
  "lower-back",
  "neck",
] as const;

export const coachExerciseSchema = z.object({
  faName: z.string().trim().min(2, "نام فارسی حداقل ۲ کاراکتر است").max(COACH_EXERCISE_LIMITS.NAME_MAX),
  enName: z.string().trim().min(2, "نام انگلیسی حداقل ۲ کاراکتر است").max(COACH_EXERCISE_LIMITS.NAME_MAX),
  category: z.enum(EXERCISE_CATEGORIES_ALLOWED, { message: "دسته حرکت معتبر نیست" }),
  equipment: z
    .array(z.string().trim().min(1).max(40))
    .max(COACH_EXERCISE_LIMITS.EQUIPMENT_MAX, "حداکثر ۶ تجهیز مجاز است")
    .default([]),
  primaryMuscles: z
    .array(z.enum(musclesAllowed))
    .max(COACH_EXERCISE_LIMITS.MUSCLES_MAX, "حداکثر ۶ عضله اصلی مجاز است")
    .default([]),
  secondaryMuscles: z
    .array(z.enum(musclesAllowed))
    .max(COACH_EXERCISE_LIMITS.MUSCLES_MAX)
    .default([]),
  description: z.string().trim().max(COACH_EXERCISE_LIMITS.DESCRIPTION_MAX).default(""),
  tips: z.string().trim().max(COACH_EXERCISE_LIMITS.TIPS_MAX).default(""),
});

export type CoachExerciseInput = z.infer<typeof coachExerciseSchema>;

export interface CoachExerciseMediaClient {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CoachExerciseClient {
  id: string;
  faName: string;
  enName: string;
  category: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description: string;
  tips: string;
  media: CoachExerciseMediaClient[];
  /** پوشه دستهبندی اختیاری — مرحله ۲۰ */
  folderId: string | null;
  folderName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoachExerciseFolderClient {
  id: string;
  name: string;
  exercisesCount: number;
  createdAt: string;
}

export const FOLDER_NAME_MAX = 60;

export const coachExerciseFolderSchema = z.object({
  name: z.string().trim().min(1, "نام پوشه خالی است").max(FOLDER_NAME_MAX, "نام پوشه طولانی است"),
});

/**
 * پیشوند شناسه حرکت شخصی در snapshot برنامه‌ها — از بانک عمومی جدا میماند.
 * مرحله ۲۰/P0: منبع حقیقت قرارداد ماژول personal-exercise-id.ts است؛
 * این re-export برای سازگاری به عقب واردکنندگان قبلی حفظ شده است.
 */
export { PERSONAL_EXERCISE_PREFIX } from "./personal-exercise-id";

function toClient(row: {
  id: string;
  faName: string;
  enName: string;
  category: string;
  equipmentJson: string;
  primaryMusclesJson: string;
  secondaryMusclesJson: string;
  description: string;
  tips: string;
  createdAt: Date;
  updatedAt: Date;
  folderId?: string | null;
  folder?: { id: string; name: string } | null;
  media?: {
    id: string;
    kind: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: Date;
  }[];
}): CoachExerciseClient {
  const arr = (json: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(json);
      return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
    } catch {
      return [];
    }
  };
  return {
    id: row.id,
    faName: row.faName,
    enName: row.enName,
    category: row.category,
    equipment: arr(row.equipmentJson),
    primaryMuscles: arr(row.primaryMusclesJson),
    secondaryMuscles: arr(row.secondaryMusclesJson),
    description: row.description,
    tips: row.tips,
    media: (row.media ?? []).map((m) => ({
      id: m.id,
      kind: m.kind,
      fileName: m.fileName,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      createdAt: m.createdAt.toISOString(),
    })),
    folderId: row.folderId ?? null,
    folderName: row.folder?.name ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const MEDIA_INCLUDE = {
  media: { orderBy: { createdAt: "asc" as const } },
  folder: { select: { id: true, name: true } },
} as const;

/* ------------------------------ پوشههای حرکات شخصی — مرحله ۲۰ ------------------------------ */

/** فهرست پوشههای خود مربی با شمار حرکات هر پوشه */
export async function listCoachExerciseFolders(
  coachId: string
): Promise<CoachExerciseFolderClient[]> {
  const rows = await db.coachExerciseFolder.findMany({
    where: { coachId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { exercises: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    exercisesCount: r._count.exercises,
    createdAt: r.createdAt.toISOString(),
  }));
}

/** ساخت پوشه — نام تکراری برای همان مربی 409 */
export async function createCoachExerciseFolder(
  coachId: string,
  input: unknown
): Promise<{ ok: true; folder: CoachExerciseFolderClient } | { ok: false; code: "VALIDATION" | "DUPLICATE" }> {
  const parsed = coachExerciseFolderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "VALIDATION" };
  const duplicate = await db.coachExerciseFolder.findFirst({
    where: { coachId, name: parsed.data.name },
    select: { id: true },
  });
  if (duplicate) return { ok: false, code: "DUPLICATE" };
  const row = await db.coachExerciseFolder.create({
    data: { coachId, name: parsed.data.name },
  });
  return {
    ok: true,
    folder: { id: row.id, name: row.name, exercisesCount: 0, createdAt: row.createdAt.toISOString() },
  };
}

/** حذف پوشه — حرکات به «بدون پوشه» برمیگردند (SetNull؛ هیچ حرکتی حذف نمیشود) */
export async function deleteCoachExerciseFolder(
  coachId: string,
  folderId: string
): Promise<boolean> {
  const existing = await db.coachExerciseFolder.findFirst({
    where: { id: folderId, coachId },
    select: { id: true },
  });
  if (!existing) return false;
  await db.coachExerciseFolder.delete({ where: { id: folderId } });
  return true;
}

/** جابهجایی حرکت به پوشه (یا بیرون از پوشهها با folderId=null) — فقط مالک */
export async function moveCoachExerciseToFolder(
  coachId: string,
  exerciseId: string,
  folderId: string | null
): Promise<boolean> {
  const exercise = await db.coachExercise.findFirst({
    where: { id: exerciseId, coachId },
    select: { id: true },
  });
  if (!exercise) return false;
  if (folderId !== null) {
    const folder = await db.coachExerciseFolder.findFirst({
      where: { id: folderId, coachId },
      select: { id: true },
    });
    if (!folder) return false;
  }
  await db.coachExercise.update({
    where: { id: exerciseId },
    data: { folderId },
  });
  return true;
}

/* ------------------------------ خواندن‌ها ------------------------------ */

/** فهرست حرکات شخصی مربی — فقط مالک */
export async function listCoachExercises(coachId: string): Promise<CoachExerciseClient[]> {
  const rows = await db.coachExercise.findMany({
    where: { coachId },
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: MEDIA_INCLUDE,
  });
  return rows.map(toClient);
}

/** خواندن یک حرکت — فقط مالک؛ «مالک دیگر» و «ناموجود» هر دو null */
export async function getCoachExercise(
  coachId: string,
  exerciseId: string
): Promise<CoachExerciseClient | null> {
  const row = await db.coachExercise.findFirst({
    where: { id: exerciseId, coachId },
    include: MEDIA_INCLUDE,
  });
  return row ? toClient(row) : null;
}

/* ------------------------------ نوشتن‌ها ------------------------------ */

export async function createCoachExercise(
  coachId: string,
  role: string,
  input: unknown
): Promise<CoachExerciseClient> {
  if (role !== "COACH") throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  const parsed = coachExerciseSchema.parse(input);
  const row = await db.coachExercise.create({
    data: {
      coachId,
      faName: parsed.faName,
      enName: parsed.enName,
      category: parsed.category,
      equipmentJson: JSON.stringify(parsed.equipment),
      primaryMusclesJson: JSON.stringify(parsed.primaryMuscles),
      secondaryMusclesJson: JSON.stringify(parsed.secondaryMuscles),
      description: parsed.description,
      tips: parsed.tips,
    },
    include: MEDIA_INCLUDE,
  });
  return toClient(row);
}

export async function updateCoachExercise(
  coachId: string,
  exerciseId: string,
  input: unknown
): Promise<CoachExerciseClient | null> {
  const parsed = coachExerciseSchema.parse(input);
  const existing = await db.coachExercise.findFirst({
    where: { id: exerciseId, coachId },
    select: { id: true },
  });
  if (!existing) return null;
  const row = await db.coachExercise.update({
    where: { id: exerciseId },
    data: {
      faName: parsed.faName,
      enName: parsed.enName,
      category: parsed.category,
      equipmentJson: JSON.stringify(parsed.equipment),
      primaryMusclesJson: JSON.stringify(parsed.primaryMuscles),
      secondaryMusclesJson: JSON.stringify(parsed.secondaryMuscles),
      description: parsed.description,
      tips: parsed.tips,
    },
    include: MEDIA_INCLUDE,
  });
  return toClient(row);
}

/**
 * حذف حرکت شخصی — سیاست حفظ یکپارچگی سوابق:
 *  - رکوردهای برنامه که این حرکت را snapshot کرده‌اند دست‌نخورده میمانند
 *    (snapshot محتوایی است؛ هیچ FK‌ای به CoachExercise وجود ندارد).
 *  - رسانه‌های دیسک همراه رکورد پاک میشوند.
 *  - «مالک دیگر» و «ناموجود» هر دو null (ضد IDOR).
 */
export async function deleteCoachExercise(
  coachId: string,
  exerciseId: string
): Promise<boolean | null> {
  const row = await db.coachExercise.findFirst({
    where: { id: exerciseId, coachId },
    select: { id: true, media: { select: { storagePath: true } } },
  });
  if (!row) return null;
  await db.coachExercise.delete({ where: { id: exerciseId } });
  for (const m of row.media) {
    await deleteCoachExerciseMediaFile(m.storagePath);
  }
  return true;
}

/* ------------------------------ رسانه ------------------------------ */

export interface SaveExerciseMediaResult {
  media: CoachExerciseMediaClient;
  exercise: CoachExerciseClient;
}

/** ذخیره رسانه حرکت شخصی — امضای بایت + سقف حجم/تعداد سمت سرور */
export async function addCoachExerciseMedia(
  coachId: string,
  exerciseId: string,
  file: { name: string | null; declaredType: string | null; bytes: Uint8Array }
): Promise<SaveExerciseMediaResult> {
  const exercise = await db.coachExercise.findFirst({
    where: { id: exerciseId, coachId },
    select: { id: true },
  });
  if (!exercise) throw new CoachingError(404, "EXERCISE_NOT_FOUND");

  const count = await db.coachExerciseMedia.count({ where: { exerciseId } });
  if (count >= COACH_EXERCISE_LIMITS.MEDIA_MAX_PER_EXERCISE) {
    throw new CoachingError(409, "EXERCISE_MEDIA_LIMIT");
  }

  const sniffed = sniffCoachExerciseMediaMime(file.bytes);
  const verified = resolveVerifiedExerciseMediaMime(file.declaredType, sniffed);
  if (!verified) {
    throw new CoachingError(415, "FILE_TYPE_NOT_ALLOWED");
  }
  const isVideo = verified.startsWith("video/");
  const maxBytes = isVideo
    ? COACH_EXERCISE_LIMITS.VIDEO_MAX_BYTES
    : COACH_EXERCISE_LIMITS.IMAGE_MAX_BYTES;
  if (file.bytes.byteLength === 0) {
    throw new CoachingError(422, "FILE_EMPTY");
  }
  if (file.bytes.byteLength > maxBytes) {
    throw new CoachingError(413, "FILE_TOO_LARGE");
  }

  const { storagePath } = await saveCoachExerciseMediaFile(exerciseId, file.bytes);
  const kind = isVideo ? "video" : "image";
  try {
    const media = await db.coachExerciseMedia.create({
      data: {
        exerciseId,
        kind,
        fileName: sanitizeDisplayName(file.name),
        mimeType: verified,
        sizeBytes: file.bytes.byteLength,
        storagePath,
      },
    });
    const full = await db.coachExercise.findUnique({
      where: { id: exerciseId },
      include: MEDIA_INCLUDE,
    });
    if (!full) throw new CoachingError(404, "EXERCISE_NOT_FOUND");
    return { media: toClient(full).media.find((m) => m.id === media.id)!, exercise: toClient(full) };
  } catch (error) {
    // رکورد ساخته نشد — فایل یتیم پاک میشود
    await deleteCoachExerciseMediaFile(storagePath);
    throw error;
  }
}

/** خواندن بایت‌های رسانه — فقط مالک حرکت */
export async function readExerciseMediaForOwner(
  coachId: string,
  mediaId: string
): Promise<{ bytes: Uint8Array; mimeType: string; fileName: string } | null> {
  const media = await db.coachExerciseMedia.findUnique({
    where: { id: mediaId },
    include: { exercise: { select: { coachId: true } } },
  });
  if (!media || media.exercise.coachId !== coachId) return null;
  const bytes = await readCoachExerciseMediaFile(media.storagePath);
  return { bytes, mimeType: media.mimeType, fileName: media.fileName };
}

/** حذف رسانه — فقط مالک؛ فایل دیسک هم پاک میشود */
export async function deleteCoachExerciseMedia(
  coachId: string,
  mediaId: string
): Promise<boolean | null> {
  const media = await db.coachExerciseMedia.findUnique({
    where: { id: mediaId },
    include: { exercise: { select: { coachId: true } } },
  });
  if (!media || media.exercise.coachId !== coachId) return null;
  await db.coachExerciseMedia.delete({ where: { id: mediaId } });
  await deleteCoachExerciseMediaFile(media.storagePath);
  return true;
}

/** برای buildWorkoutContent — snapshot حرکت شخصی مالک */
export async function getPersonalExerciseForPlan(
  coachId: string,
  personalId: string
): Promise<{ id: string; fa: string; en: string; category: string } | null> {
  const row = await db.coachExercise.findFirst({
    where: { id: personalId, coachId },
    select: { id: true, faName: true, enName: true, category: true },
  });
  if (!row) return null;
  return { id: row.id, fa: row.faName, en: row.enName, category: row.category };
}

// re-export برای Route Handler — بدون خواندن مستقیم لایه ذخیره از مسیر
export { saveAttachmentFile };
