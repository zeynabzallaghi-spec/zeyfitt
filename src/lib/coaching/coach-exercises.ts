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
import type { MuscleGroupId } from "@/lib/fitness3d/types";
import {
  CoachingError,
  COACH_EXERCISE_LIMITS,
} from "@/lib/coaching/constants";
import {
  deleteExerciseMediaFile,
  resolveVerifiedExerciseMediaMime,
  saveExerciseMediaFile,
  sniffCoachExerciseMediaMime,
} from "./media-storage";
import { sanitizeDisplayName } from "./attachments";
import { saveAttachmentFile } from "./attachments";
import { ensureExerciseBank, findExerciseRow } from "@/lib/exercises/bank";
import { filterSessionMuscles } from "@/lib/fitness3d/types";
import { getExerciseVideoMaxBytes } from "./constants";

/* ------------------------------ سقف کتابخانه شخصی — مرحله ۲۰/P1 (R1.3) ------------------------------ */

/**
 * سقف حرکات شخصی هر مربی — پیش‌فرض ۳۰۰ (تصمیم D7)؛ با متغیر محیطی
 * COACH_EXERCISE_CAP قابل تنظیم. فقط سمت سرور خوانده میشود؛ کلاینت مقدار
 * را از پاسخ GET میگیرد تا هیچ فرضی دوباره تکرار نشود.
 */
export function getCoachExerciseLibraryCap(): number {
  const raw = Number(process.env.COACH_EXERCISE_CAP);
  if (Number.isInteger(raw) && raw >= 1 && raw <= 10_000) return raw;
  return COACH_EXERCISE_LIMITS.LIBRARY_MAX;
}

/** شمار حرکات شخصی مربی — مبنای سقف؛ حرکات مربیان دیگر و بانک عمومی هرگز
 *  در سهمیه مربی اثر ندارند. (وقتی آرشیو D9 در P3 اضافه شود، باید فقط
 *  رکوردهای فعال را بشمارد — کامنت عمدی برای آن بازبینی.) */
export async function countCoachExercises(coachId: string): Promise<number> {
  return db.coachExercise.count({ where: { coachId } });
}

/**
 * قفل درون‌پردازشی ساخت حرکت بهازای هر مربی — همه مسیرهای ساخت (ساخت از
 * صفر، ذخیره از بانک عمومی) باید از این عبور کنند تا «شمارش سپس درج»
 * در رقابت درخواستهای هم‌زمان از سقف عبور نکند. استقرار فعلی پروژه یک
 * سرور تک-پردازشی است؛ اگر معماری چند-پردازشی شود، این قفل باید به سطح
 * DB (INSERT اتمی) منتقل شود — نکته عمدی برای بازبینی P3.
 */
const libraryCreationLocks = new Map<string, Promise<unknown>>();

async function withLibraryCreationLock<T>(coachId: string, fn: () => Promise<T>): Promise<T> {
  const previous = libraryCreationLocks.get(coachId) ?? Promise.resolve();
  const run = previous.catch(() => undefined).then(fn);
  libraryCreationLocks.set(coachId, run);
  try {
    return await run;
  } finally {
    if (libraryCreationLocks.get(coachId) === run) libraryCreationLocks.delete(coachId);
  }
}

/** سنجش سقف داخل قفل — عبور از سقف 409 با کد پایدار دو-زبانه */
async function assertLibraryCapInside(coachId: string): Promise<void> {
  const count = await countCoachExercises(coachId);
  if (count >= getCoachExerciseLibraryCap()) {
    throw new CoachingError(409, "COACH_EXERCISE_CAP_REACHED");
  }
}

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

export const COACH_EXERCISE_DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

export const coachExerciseSchema = z.object({
  faName: z.string().trim().min(2, "نام فارسی حداقل ۲ کاراکتر است").max(COACH_EXERCISE_LIMITS.NAME_MAX),
  enName: z.string().trim().min(2, "نام انگلیسی حداقل ۲ کاراکتر است").max(COACH_EXERCISE_LIMITS.NAME_MAX),
  category: z.enum(EXERCISE_CATEGORIES_ALLOWED, { message: "دسته حرکت معتبر نیست" }),
  // سطح دشواری — واژگان بانک؛ پیش‌فرض intermediate (P3: برای نمایش دقیق
  // رکورد منتشرشده؛ مقدار معتبر شرط نمایش کارت بانک است)
  difficulty: z.enum(COACH_EXERCISE_DIFFICULTIES, { message: "سطح دشواری معتبر نیست" }).default("intermediate"),
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
  difficulty: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description: string;
  tips: string;
  media: CoachExerciseMediaClient[];
  /** پوشه دستهبندی اختیاری — مرحله ۲۰ */
  folderId: string | null;
  folderName: string | null;
  /** گردش کار انتشار — مرحله ۲۰/P3 (فقط مالک این را میبیند) */
  publishState: string;
  submittedAt: string | null;
  reviewNote: string | null;
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
  difficulty: string;
  equipmentJson: string;
  primaryMusclesJson: string;
  secondaryMusclesJson: string;
  description: string;
  tips: string;
  publishState: string;
  submittedAt: Date | null;
  reviewNote: string | null;
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
    difficulty: row.difficulty,
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
    publishState: row.publishState,
    submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
    reviewNote: row.reviewNote,
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

/** فهرست حرکات شخصی مربی — فقط مالک. سقف فهرست با سقف کتابخانه هم‌تراز
 *  است (مرحله ۲۰/P1) تا کل کتابخانه قابل مشاهده و جست‌وجوی کلاینت‌محور باشد. */
export async function listCoachExercises(coachId: string): Promise<CoachExerciseClient[]> {
  const rows = await db.coachExercise.findMany({
    where: { coachId },
    orderBy: { updatedAt: "desc" },
    take: getCoachExerciseLibraryCap(),
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
  // سقف ۳۰۰ داخل قفل درون‌پردازشی مربی سنجیده میشود تا درخواستهای
  // هم‌زمان نتوانند از سقف عبور کنند (مرحله ۲۰/P1-R1.3)
  return withLibraryCreationLock(coachId, async () => {
    await assertLibraryCapInside(coachId);
    const row = await db.coachExercise.create({
      data: {
        coachId,
        faName: parsed.faName,
        enName: parsed.enName,
        category: parsed.category,
        difficulty: parsed.difficulty,
        equipmentJson: JSON.stringify(parsed.equipment),
        primaryMusclesJson: JSON.stringify(parsed.primaryMuscles),
        secondaryMusclesJson: JSON.stringify(parsed.secondaryMuscles),
        description: parsed.description,
        tips: parsed.tips,
      },
      include: MEDIA_INCLUDE,
    });
    return toClient(row);
  });
}

/* ------------------- ذخیره حرکت عمومی در کتابخانه شخصی — مرحله ۲۰/P1 (R1.2) ------------------- */

export const fromPublicExerciseSchema = z.object({
  exerciseId: z.string({ message: "شناسه حرکت معتبر نیست" }).trim().min(1).max(64),
});

/**
 * ذخیره یک حرکت بانک عمومی به‌عنوان نقطه شروع قابل‌ویرایش در کتابخانه شخصی.
 *
 * تضمینهای این مسیر:
 *  - رکورد بانک عمومی فقط خوانده میشود؛ هیچ نوشتنی روی Exercise انجام
 *    نمیشود (ذخیره دوباره همان حرکت → کپی دوم مستقل طبق A1.3 سند طرح؛
 *    منشا با sourceExerciseId ثبت میشود تا رفتار آزمون‌پذیر و شفاف بماند).
 *  - snapshot عضلات (P1.3/R1.4): equipmentJson/primaryMusclesJson/
 *    secondaryMusclesJson عیناً از رکورد منبع کپی میشوند — تغییر بعدی
 *    منبع هرگز رکورد شخصی را تغییر نمیدهد (سطر کاملاً جدا است).
 *  - فیلدهای غیرضروری منبع (datasetVersion، sourceRef، محتوای آموزشی و…)
 *    کپی نمیشوند؛ توضیح/نکات خالی میمانند تا مربی خودش بنویسد.
 *  - سقف ۳۰۰ داخل قفل مربی سنجیده میشود؛ مالکیت با coachId سطر ساخته میشود.
 */
export async function savePublicExerciseToLibrary(
  coachId: string,
  role: string,
  input: unknown
): Promise<CoachExerciseClient> {
  if (role !== "COACH") throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  const parsed = fromPublicExerciseSchema.parse(input);
  await ensureExerciseBank();
  // فقط رکورد فعال بانک؛ آرشیوشده و ناموجود هر دو 404 (شفاف، بدون افشا)
  const source = findExerciseRow(parsed.exerciseId);
  if (!source) throw new CoachingError(404, "EXERCISE_NOT_IN_BANK");
  return withLibraryCreationLock(coachId, async () => {
    await assertLibraryCapInside(coachId);
    const row = await db.coachExercise.create({
      data: {
        coachId,
        faName: source.faName && source.faName.trim().length >= 2 ? source.faName : source.enName,
        enName: source.enName,
        category: source.category === "core" ? "abs" : source.category,
        difficulty: "intermediate",
        equipmentJson: source.equipmentJson,
        primaryMusclesJson: source.primaryMusclesJson,
        secondaryMusclesJson: source.secondaryMusclesJson,
        description: "",
        tips: "",
        sourceExerciseId: source.id,
      },
      include: MEDIA_INCLUDE,
    });
    return toClient(row);
  });
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
      difficulty: parsed.difficulty,
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
    await deleteExerciseMediaFile(m.storagePath);
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

  // مرحله ۲۰/P2 (D4): ذخیره فقط از لایه storage-provider — کلید namespace دار
  const { storagePath } = await saveExerciseMediaFile("coach-exercises", exerciseId, file.bytes);
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
    await deleteExerciseMediaFile(storagePath);
    throw error;
  }
}

/**
 * متادیتای رسانه برای سرو استریم — مرحله ۲۰/P2: بایتها اینجا خوانده
 * نمیشوند؛ مسیر رسانه با استریم provider پخش میکند (R2.0 — بدون بافر کامل).
 * فقط مالک حرکت؛ «مالک دیگر» و «ناموجود» هر دو null (ضد IDOR).
 */
export async function getExerciseMediaForOwner(
  coachId: string,
  mediaId: string
): Promise<{
  id: string;
  mimeType: string;
  fileName: string;
  storagePath: string;
  declaredSize: number;
} | null> {
  const media = await db.coachExerciseMedia.findUnique({
    where: { id: mediaId },
    include: { exercise: { select: { coachId: true } } },
  });
  if (!media || media.exercise.coachId !== coachId) return null;
  return {
    id: media.id,
    mimeType: media.mimeType,
    fileName: media.fileName,
    storagePath: media.storagePath,
    declaredSize: media.sizeBytes,
  };
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
  await deleteExerciseMediaFile(media.storagePath);
  return true;
}

/* ------------- دسترسی دانشجوی مجاز به رسانه حرکت شخصی — R2.1 (P2) ------------- */

/**
 * آیا این حرکت شخصی مربی در یک برنامه تمرینی تحویلشدهٔ فعالِ همین مربی
 * به این دانشجو وجود دارد؟ (R2.1 — بررسی سمت سرور از روی CoachPlanDelivery)
 *
 * «فعال» در این مرحله یعنی: حذف نرم نشده (studentDeletedAt = null).
 * محتوای تحویل snapshot است و شناسهٔ حرکت شخصی در ردیفهای source=personal
 * خام ذخیره میشود (بدون پیشوند cex-) — جستوجوی پیشرفته با contains روی
 * شناسه داخل کوتیشن (هیچ شناسهٔ دیگری نمیتواند همین زیررشته را بسازد چون
 * cuid و مقدار JSON دقیق مقایسه میشود) و سپس اثبات دقیق با parse JSON.
 */
export async function studentHasPersonalExerciseAccess(
  studentId: string,
  coachId: string,
  personalExerciseId: string
): Promise<boolean> {
  const candidates = await db.coachPlanDelivery.findMany({
    where: {
      studentId,
      coachId,
      planKind: "workout",
      studentDeletedAt: null,
      contentJson: { contains: `"exerciseId":"${personalExerciseId}"` },
    },
    select: { contentJson: true },
    orderBy: { sentAt: "desc" },
    take: 20,
  });
  for (const row of candidates) {
    try {
      const parsed: unknown = JSON.parse(row.contentJson);
      const days = (parsed as { days?: unknown }).days;
      if (!Array.isArray(days)) continue;
      for (const day of days) {
        const exercises = (day as { exercises?: unknown }).exercises;
        if (!Array.isArray(exercises)) continue;
        for (const ex of exercises) {
          if (
            (ex as { exerciseId?: unknown }).exerciseId === personalExerciseId &&
            (ex as { source?: unknown }).source === "personal"
          ) {
            return true;
          }
        }
      }
    } catch {
      // JSON خراب — ردیف بعدی
    }
  }
  return false;
}

/**
 * فهرست رسانههای یک حرکت شخصی برای دانشجوی مجاز (R2.1) — فقط خروجی
 * whitelist؛ storagePath هرگز به کلاینت نمیرسد.
 */
export async function listPersonalExerciseMediaForStudent(
  studentId: string,
  personalExerciseId: string
): Promise<CoachExerciseMediaClient[] | null> {
  const exercise = await db.coachExercise.findUnique({
    where: { id: personalExerciseId },
    select: { id: true, coachId: true },
  });
  if (!exercise) return null;
  const allowed = await studentHasPersonalExerciseAccess(
    studentId,
    exercise.coachId,
    personalExerciseId
  );
  if (!allowed) return null;
  const rows = await db.coachExerciseMedia.findMany({
    where: { exerciseId: personalExerciseId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((m) => ({
    id: m.id,
    kind: m.kind,
    fileName: m.fileName,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    createdAt: m.createdAt.toISOString(),
  }));
}

/**
 * متادیتای رسانه برای دانشجوی مجاز — مسیر سرو استریم؛ مجوز R2.1 سمت
 * سرور قبل از هر خواندنی از فایل اعمال میشود.
 */
export async function getExerciseMediaForStudent(
  studentId: string,
  mediaId: string
): Promise<{
  id: string;
  mimeType: string;
  fileName: string;
  storagePath: string;
  declaredSize: number;
} | null> {
  const media = await db.coachExerciseMedia.findUnique({
    where: { id: mediaId },
    include: { exercise: { select: { id: true, coachId: true } } },
  });
  if (!media) return null;
  const allowed = await studentHasPersonalExerciseAccess(
    studentId,
    media.exercise.coachId,
    media.exercise.id
  );
  if (!allowed) return null;
  return {
    id: media.id,
    mimeType: media.mimeType,
    fileName: media.fileName,
    storagePath: media.storagePath,
    declaredSize: media.sizeBytes,
  };
}

/**
 * برای buildWorkoutContent — snapshot حرکت شخصی مالک.
 * مرحله ۲۰/P1 (R1.4): عضلات اصلی (۱۲ گروه سه‌بعدی) هم از رکورد شخصی
 * برمی‌گردد تا در محتوای برنامه snapshot شود و جلسه/پیشرفت عضلات خالی نماند.
 */
export async function getPersonalExerciseForPlan(
  coachId: string,
  personalId: string
): Promise<{ id: string; fa: string; en: string; category: string; primaryMuscles: MuscleGroupId[] } | null> {
  const row = await db.coachExercise.findFirst({
    where: { id: personalId, coachId },
    select: { id: true, faName: true, enName: true, category: true, primaryMusclesJson: true },
  });
  if (!row) return null;
  let parsedMuscles: string[] = [];
  try {
    const value: unknown = JSON.parse(row.primaryMusclesJson);
    if (Array.isArray(value)) parsedMuscles = value.filter((m): m is string => typeof m === "string");
  } catch {
    // JSON خراب — آرایه خالی صادقانه
  }
  return {
    id: row.id,
    fa: row.faName,
    en: row.enName,
    category: row.category,
    primaryMuscles: filterSessionMuscles(parsedMuscles),
  };
}

// re-export برای Route Handler — بدون خواندن مستقیم لایه ذخیره از مسیر
export { saveAttachmentFile };
