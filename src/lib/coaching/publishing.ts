/**
 * گردش کار انتشار حرکات شخصی مربی — مرحله ۲۰/P3 (محور ۳ سند طرح اجرایی).
 *
 * ماشین حالت (واژگان رزروشده فاز ۱۸ — روی CoachExercise.publishState):
 *   none ──submit──▶ pending_review ──approve(ادمین)──▶ published
 *    ▲                    │                                 │
 *    └──reject(با دلیل)──◀┘                  recall(مربی)──▶ recalled ──resubmit──▶ pending_review
 *
 * قواعد قطعی این ماژول:
 *  - همه گذارها با UPDATE شرطی (CAS روی publishState) انجام میشود؛ رقابت
 *    هم‌زمان و درخواست تکراری هرگز دو تصمیم یا دو اعلان نمیسازد (count=0 → 409).
 *  - تغییر publishState از سوی مربی فقط با همین گذارهای صریح ممکن است؛
 *    هیچ مسیر کلاینتی مقدار publishState را مستقیم نمینویسد.
 *  - approve (تصمیم D2): کپی انتشار در Exercise با origin=coach +
 *    ownerUserId (FK واقعی SetNull) + publishState=published +
 *    sourceKey=coach-<id> (idempotent با unique(sourceKey,sourceRef)) —
 *    ویرایش بعدی مربی نسخه عمومی را تا تأیید مجدد تغییر نمیدهد.
 *  - reject (تصمیم D8): ثبت دلیل الزامی؛ بازگشت به وضعیت «قبلی» — اگر رکورد
 *    عمومی منتشرشده‌ای وجود دارد همان published میماند (پایداری نسخه عمومی)
 *    و اگر recalled است همان recalled؛ در نبود رکورد عمومی به none برمی‌گردد.
 *  - recall (مربی): رکورد عمومی recalled و از بانک/برنامه‌ساز پنهان میشود
 *    (نه حذف فیزیکی)؛ snapshot برنامه‌ها و تحویل‌های قبلی دست‌نخورده.
 *  - دروازه ارسال: نام FA/EN معتبر + دسته معتبر + ≥۱ عضله اصلی + توضیح
 *    غیرخالی (تصمیم دروازه سند طرح) + سقف ۵ ارسال در انتظار برای هر مربی.
 *  - رسانه مشارکت (R2.4): در لحظه approve رسانههای مربی به ExerciseMedia
 *    رکورد منتشرشده کپی میشوند (جایگزینی کامل — نسخه عمومی همیشه آینه
 *    آخرین تأیید است)؛ videoStatus فقط داخلی میماند (whitelist فاز ۱۸).
 *  - همه تصمیمهای ادمین در AdminActionLog ثبت میشود؛ اعلان‌ها با
 *    dedupeKey پایدار رویداد صادر میشوند (ضدتکرار در سطح DB).
 */

import { db } from "@/lib/db";
import { CoachingError } from "@/lib/coaching/constants";
import { EXERCISE_CATEGORIES_ALLOWED } from "@/lib/coaching/coach-exercises";
import {
  emitNotification,
  NOTIFICATION_TYPES,
} from "@/lib/notifications/notifications";
import { logAdminAction } from "@/lib/admin/service";
import { refreshExerciseBank } from "@/lib/exercises/bank";
import {
  deleteExerciseMediaFile,
  exerciseMediaSize,
  openExerciseMediaRange,
  saveExerciseMediaFile,
} from "@/lib/coaching/media-storage";

/** سقف ارسال‌های در انتظار بررسی برای هر مربی — سند طرح (پیشنهاد: ۵) */
export const PENDING_REVIEW_CAP_PER_COACH = 5;

/** واژگان وضعیت انتشار — همان رزرو فاز ۱۸ */
export const PUBLISH_STATES = ["none", "pending_review", "published", "recalled"] as const;
export type PublishState = (typeof PUBLISH_STATES)[number];

/** واژگان سطح دشواری بانک — روی CoachExercise هم اعمال میشود (P3) */
const DIFFICULTIES_ALLOWED = ["beginner", "intermediate", "advanced"] as const;

/** کلید منبع رکورد عمومی یک حرکت شخصی — idempotent با unique(sourceKey, sourceRef) */
export function publishedSourceKey(coachExerciseId: string): string {
  return `coach-${coachExerciseId}`;
}

/** شناسه پایدار رکورد عمومی منتشرشده از یک حرکت شخصی */
export function publishedExerciseId(coachExerciseId: string): string {
  return `cexpub-${coachExerciseId}`;
}

/** نگاشت دسته کتابخانه مربی به واژگان بانک — تنها تفاوت: abs ↔ core */
function toBankCategory(category: string): string {
  return category === "abs" ? "core" : category;
}

/* ------------------------------ گذارهای مربی ------------------------------ */

/**
 * ارسال حرکت شخصی برای بازبینی ادمین.
 * گذارهای مجاز: none | recalled | published → pending_review
 * (از published = درخواست به‌روزرسانی نسخه عمومی — تصمیم D2؛ نسخه عمومی
 * تا تصمیم بعدی پایدار و قابل مشاهده میماند.)
 */
export async function submitCoachExerciseForReview(
  coachId: string,
  exerciseId: string
): Promise<{ publishState: "pending_review"; submittedAt: string }> {
  const exercise = await db.coachExercise.findFirst({
    where: { id: exerciseId, coachId },
    select: {
      id: true,
      faName: true,
      enName: true,
      category: true,
      primaryMusclesJson: true,
      description: true,
      publishState: true,
    },
  });
  if (!exercise) throw new CoachingError(404, "EXERCISE_NOT_FOUND");

  // دروازه حداقل محتوا — سند طرح (نام FA/EN، دسته، ≥۱ عضله اصلی، توضیح)
  const muscles = safeStringArray(exercise.primaryMusclesJson);
  const gateOk =
    exercise.faName.trim().length >= 2 &&
    exercise.enName.trim().length >= 2 &&
    (EXERCISE_CATEGORIES_ALLOWED as readonly string[]).includes(exercise.category) &&
    muscles.length >= 1 &&
    exercise.description.trim().length > 0;
  if (!gateOk) throw new CoachingError(422, "SUBMIT_GATE_INCOMPLETE");

  // سقف ارسال‌های در انتظار — ضد سیل صف ادمین (سند طرح)
  const pendingCount = await db.coachExercise.count({
    where: { coachId, publishState: "pending_review" },
  });
  if (pendingCount >= PENDING_REVIEW_CAP_PER_COACH) {
    throw new CoachingError(409, "PENDING_REVIEW_CAP_REACHED");
  }

  // گذار اتمی — فقط از وضعیتهای مجاز؛ رقابت/تکرار → count=0 → 409
  const submittedAt = new Date();
  const res = await db.coachExercise.updateMany({
    where: {
      id: exerciseId,
      coachId,
      publishState: { in: ["none", "recalled", "published"] },
    },
    data: {
      publishState: "pending_review",
      submittedAt,
      reviewNote: null, // چرخه بازبینی تازه — بازخورد قبلی مربی دیده است
    },
  });
  if (res.count === 0) {
    throw new CoachingError(409, "INVALID_PUBLISH_TRANSITION");
  }

  // اعلان به همه ادمین‌ها — dedupeKey پایدار به‌ازای رویداد ارسال
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  const dedupe = `ex-review-submitted:${exerciseId}:${submittedAt.toISOString()}`;
  for (const admin of admins) {
    await emitNotification({
      userId: admin.id,
      type: NOTIFICATION_TYPES.EXERCISE_REVIEW_SUBMITTED,
      dedupeKey: dedupe,
      payload: {
        coachExerciseId: exerciseId,
        name: exercise.faName,
        nameEn: exercise.enName,
      },
    });
  }
  return { publishState: "pending_review", submittedAt: submittedAt.toISOString() };
}

/**
 * لغو ارسال در انتظار بررسی — گذار: pending_review → none (مربی خودش).
 * هیچ اعلانی صادر نمیشود (اقدام خود مربی است) و هیچ رکورد عمومی ساخته/تغییر
 * نمیکند.
 */
export async function withdrawCoachSubmission(
  coachId: string,
  exerciseId: string
): Promise<{ publishState: "none" }> {
  const res = await db.coachExercise.updateMany({
    where: { id: exerciseId, coachId, publishState: "pending_review" },
    data: { publishState: "none", submittedAt: null, reviewNote: null },
  });
  if (res.count === 0) {
    // «مالک دیگر»، «ناموجود» و «در انتظار نیست» همه 404/409 متمایز:
    // مالکیت جدا بررسی میشود تا پاسخ IDOR یکنواخت بماند
    const owned = await db.coachExercise.findFirst({
      where: { id: exerciseId, coachId },
      select: { id: true },
    });
    if (!owned) throw new CoachingError(404, "EXERCISE_NOT_FOUND");
    throw new CoachingError(409, "INVALID_PUBLISH_TRANSITION");
  }
  return { publishState: "none" };
}

/**
 * فراخوانی حرکت منتشرشده — گذار: published → recalled (مربی خودش).
 * رکورد عمومی هم recalled میشود و از بانک/برنامه‌ساز/جست‌وجو پنهان میشود
 * (نه حذف فیزیکی — شناسه پایدار میماند؛ تصمیم A3.4).
 */
export async function recallCoachExercise(
  coachId: string,
  exerciseId: string
): Promise<{ publishState: "recalled" }> {
  const owned = await db.coachExercise.findFirst({
    where: { id: exerciseId, coachId },
    select: { id: true },
  });
  if (!owned) throw new CoachingError(404, "EXERCISE_NOT_FOUND");

  const res = await db.coachExercise.updateMany({
    where: { id: exerciseId, coachId, publishState: "published" },
    data: { publishState: "recalled" },
  });
  if (res.count === 0) {
    throw new CoachingError(409, "INVALID_PUBLISH_TRANSITION");
  }
  // رکورد عمومی (اگر وجود دارد) پنهان میشود — snapshotهای قبلی دست‌نخورده
  await db.exercise.updateMany({
    where: { sourceKey: publishedSourceKey(exerciseId) },
    data: { publishState: "recalled" },
  });
  await refreshExerciseBank();
  return { publishState: "recalled" };
}

/* ------------------------------ صف و تصمیم ادمین ------------------------------ */

export interface ExerciseReviewQueueItem {
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
  submittedAt: string;
  coach: { userId: string; displayName: string };
  media: {
    id: string;
    kind: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    createdAt: string;
  }[];
}

function safeStringArray(json: string): string[] {
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** صف بازبینی ادمین — همه ارسال‌های در انتظار با پیش‌نمایش کامل محتوا+رسانه */
export async function listExerciseReviewQueue(): Promise<ExerciseReviewQueueItem[]> {
  const rows = await db.coachExercise.findMany({
    where: { publishState: "pending_review" },
    orderBy: { submittedAt: "asc" },
    take: 100,
    include: {
      media: { orderBy: { createdAt: "asc" } },
      coach: {
        select: { id: true, name: true, coachProfile: { select: { displayName: true } } },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    faName: r.faName,
    enName: r.enName,
    category: r.category,
    difficulty: r.difficulty,
    equipment: safeStringArray(r.equipmentJson),
    primaryMuscles: safeStringArray(r.primaryMusclesJson),
    secondaryMuscles: safeStringArray(r.secondaryMusclesJson),
    description: r.description,
    tips: r.tips,
    submittedAt: (r.submittedAt ?? r.updatedAt).toISOString(),
    coach: {
      userId: r.coach.id,
      displayName: r.coach.coachProfile?.displayName ?? r.coach.name,
    },
    media: r.media.map((m) => ({
      id: m.id,
      kind: m.kind,
      fileName: m.fileName,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      createdAt: m.createdAt.toISOString(),
    })),
  }));
}

/** متادیتای رسانه برای پیش‌نمایش ادمین — فقط رسانه حرکتِ در انتظار بررسی */
export async function getCoachExerciseMediaForAdminReview(
  exerciseId: string,
  mediaId: string
): Promise<{ mimeType: string; fileName: string; storagePath: string } | null> {
  const media = await db.coachExerciseMedia.findUnique({
    where: { id: mediaId },
    select: {
      mimeType: true,
      fileName: true,
      storagePath: true,
      exercise: { select: { id: true, publishState: true } },
    },
  });
  if (!media) return null;
  if (media.exercise.id !== exerciseId) return null;
  // پیش‌نمایش بازبینی فقط برای رکورد در انتظار — پس از تصمیم، مسیر میبندد
  if (media.exercise.publishState !== "pending_review") return null;
  return { mimeType: media.mimeType, fileName: media.fileName, storagePath: media.storagePath };
}

/** حداکثر طول بازخورد رد — محافظ ورودی؛ متن کامل به مربی نمایش داده میشود */
export const REVIEW_FEEDBACK_MAX = 1000;

/** خواندن بایت‌های رسانه از provider (یک‌باره، سقف ۴ فایل × ۵۰MB) — R2.4 */
async function readMediaThroughProvider(storagePath: string): Promise<Uint8Array> {
  const size = await exerciseMediaSize(storagePath);
  if (size === null || size <= 0) throw new Error("MEDIA_FILE_MISSING");
  const stream = await openExerciseMediaRange(storagePath, 0, size - 1);
  if (!stream) throw new Error("MEDIA_FILE_MISSING");
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/**
 * تصمیم ادمین روی ارسال در انتظار — approve | reject.
 *
 * approve (یک تراکنش DB + عملیات فایل داخل آن):
 *  1) CAS روی CoachExercise (pending_review → published) — ضد تصمیم دوگانه
 *  2) upsert رکورد عمومی با unique(sourceKey, sourceRef) — به‌روزرسانی اتمی
 *     نسخه منتشرشده (D2)؛ شناسه/منشأ/مالکیت پایدار
 *  3) کپی رسانههای مربی به ExerciseMedia (جایگزینی کامل — R2.4)
 *  4) videoStatus فقط داخلی (whitelist هرگز نمیشکند)
 * شکست هر گام → rollback کامل DB (رسانه دیسکی یتیمِ احتمالی بی‌ضرر است).
 *
 * reject: دلیل الزامی (422)؛ بازگشت به وضعیت «قبلی» (none/recalled/published
 * طبق وجود و وضعیت رکورد عمومی — پایداری نسخه منتشرشده طبق D2).
 */
export async function adminDecideExerciseReview(
  adminId: string,
  coachExerciseId: string,
  decision: "approve" | "reject",
  feedbackRaw: string | null
): Promise<{
  decision: "approve" | "reject";
  coachPublishState: PublishState;
  publicExerciseId: string | null;
}> {
  const feedback = (feedbackRaw ?? "").trim().slice(0, REVIEW_FEEDBACK_MAX);
  if (decision === "reject" && feedback.length === 0) {
    throw new CoachingError(422, "REVIEW_FEEDBACK_REQUIRED");
  }

  const exercise = await db.coachExercise.findUnique({
    where: { id: coachExerciseId },
    include: { media: { orderBy: { createdAt: "asc" } } },
  });
  if (!exercise) throw new CoachingError(404, "EXERCISE_NOT_FOUND");
  if (exercise.publishState !== "pending_review") {
    // تصمیم تکراری/هم‌زمان — وضعیت دیگر قابل تصمیم‌گیری نیست
    throw new CoachingError(409, "REVIEW_ALREADY_DECIDED");
  }
  if (exercise.difficulty && !(DIFFICULTIES_ALLOWED as readonly string[]).includes(exercise.difficulty)) {
    throw new CoachingError(422, "SUBMIT_GATE_INCOMPLETE");
  }

  const sourceKey = publishedSourceKey(exercise.id);
  const pubId = publishedExerciseId(exercise.id);

  if (decision === "approve") {
    // رکورد عمومی فعلی (برای مسیر recalled → published دوباره) — پیش از تراکنش
    const existingPublic = await db.exercise.findUnique({
      where: { sourceKey_sourceRef: { sourceKey, sourceRef: exercise.id } },
      select: { id: true, videoStatus: true },
    });

    await db.$transaction(async (tx) => {
      // 1) CAS — فقط یک فراخوان برنده میشود
      const cas = await tx.coachExercise.updateMany({
        where: { id: exercise.id, publishState: "pending_review" },
        data: { publishState: "published", reviewNote: null, submittedAt: null },
      });
      if (cas.count === 0) {
        throw new CoachingError(409, "REVIEW_ALREADY_DECIDED");
      }

      // 2) upsert رکورد عمومی — کپی انتشار (محتوای مربی؛ بدون هیچ حدس محتوایی)
      const contentData = {
        faName: exercise.faName,
        enName: exercise.enName,
        category: toBankCategory(exercise.category),
        equipmentJson: exercise.equipmentJson,
        primaryMusclesJson: exercise.primaryMusclesJson,
        secondaryMusclesJson: exercise.secondaryMusclesJson,
        difficulty: exercise.difficulty,
        // نگاشت صادقانه به واژگان بانک — فیلد بدون داده معتبر خالی میماند
        summary: exercise.description,
        stepsJson: "[]",
        breathing: null,
        mistakesJson: "[]",
        safetyJson: "[]",
        enContentJson: null,
        contentLocale: "fa",
        status: "active",
        origin: "coach",
        ownerUserId: exercise.coachId,
        publishState: "published",
        pattern: "other",
        compound: null,
        exerciseType: "strength",
        altNamesJson: "[]",
      } as const;

      await tx.exercise.upsert({
        where: { sourceKey_sourceRef: { sourceKey, sourceRef: exercise.id } },
        create: {
          id: pubId,
          sourceKey,
          sourceRef: exercise.id,
          sourceLicense: "proprietary-original",
          datasetVersion: null,
          importBatchId: null,
          coach3dId: null,
          animation3dStatus: "none",
          animation3dProfileId: null,
          animation3dParamsJson: null,
          videoStatus: "none",
          ...contentData,
        },
        update: { ...contentData },
      });

      // 3) کپی رسانه (R2.4) — جایگزینی کامل: رسانههای قبلی رکورد عمومی
      // (همه کپیهای دورههای تأیید قبلی) حذف و رسانه فعلی کپی میشود.
      // رکوردهای origin=coach هرگز رسانه آپلود ادمین ندارند (مسیر bank-media
      // فقط core) → حذف کامل بیخطر و دقیق است.
      const oldMedia = await tx.exerciseMedia.findMany({
        where: { exerciseId: existingPublic?.id ?? pubId },
        select: { id: true, storagePath: true },
      });
      for (const m of oldMedia) {
        await tx.exerciseMedia.delete({ where: { id: m.id } });
        await deleteExerciseMediaFile(m.storagePath);
      }
      let hasVideo = false;
      for (const m of exercise.media) {
        const bytes = await readMediaThroughProvider(m.storagePath);
        const { storagePath } = await saveExerciseMediaFile("bank-exercises", pubId, bytes);
        await tx.exerciseMedia.create({
          data: {
            exerciseId: pubId,
            kind: m.kind,
            fileName: m.fileName,
            mimeType: m.mimeType,
            sizeBytes: m.sizeBytes,
            storagePath,
          },
        });
        if (m.kind === "video") hasVideo = true;
      }

      // 4) videoStatus فقط داخلی — هم‌معنا با رکوردهای core (bank-media)
      await tx.exercise.update({
        where: { id: pubId },
        data: { videoStatus: hasVideo ? "uploaded" : "none" },
      });
    });

    await logAdminAction(adminId, "approve-exercise-publish", "coach-exercise", exercise.id, {
      exerciseId: pubId,
      coachId: exercise.coachId,
      feedback: feedback.length > 0 ? feedback : null,
    });
    await emitNotification({
      userId: exercise.coachId,
      type: NOTIFICATION_TYPES.EXERCISE_REVIEW_DECIDED,
      dedupeKey: `ex-review-decided:${exercise.id}:approved:${new Date().toISOString()}`,
      payload: {
        coachExerciseId: exercise.id,
        decision: "approved",
        name: exercise.faName,
        nameEn: exercise.enName,
        exerciseId: pubId,
      },
    });
    // کش بانک در همان فرایند تازه میشود — رکورد فوراً در کتابخانه/برنامه‌ساز
    await refreshExerciseBank();
    return {
      decision: "approve",
      coachPublishState: "published",
      publicExerciseId: pubId,
    };
  }

  // ------------------------------ reject ------------------------------
  const existingPublic = await db.exercise.findUnique({
    where: { sourceKey_sourceRef: { sourceKey, sourceRef: exercise.id } },
    select: { publishState: true },
  });
  // بازگشت به وضعیت «قبلی» — پایداری نسخه منتشرشده (D2): رکورد عمومی
  // منتشرشده همان میماند؛ recalled هم recalled میماند؛ نبود رکورد → none
  const previousState: PublishState =
    existingPublic === null
      ? "none"
      : existingPublic.publishState === "published"
        ? "published"
        : "recalled";

  const cas = await db.coachExercise.updateMany({
    where: { id: exercise.id, publishState: "pending_review" },
    data: {
      publishState: previousState,
      reviewNote: feedback,
      submittedAt: null,
    },
  });
  if (cas.count === 0) {
    throw new CoachingError(409, "REVIEW_ALREADY_DECIDED");
  }

  await logAdminAction(adminId, "reject-exercise-publish", "coach-exercise", exercise.id, {
    coachId: exercise.coachId,
    feedback,
    restoredState: previousState,
  });
  await emitNotification({
    userId: exercise.coachId,
    type: NOTIFICATION_TYPES.EXERCISE_REVIEW_DECIDED,
    dedupeKey: `ex-review-decided:${exercise.id}:rejected:${new Date().toISOString()}`,
    payload: {
      coachExerciseId: exercise.id,
      decision: "rejected",
      name: exercise.faName,
      nameEn: exercise.enName,
      feedback,
    },
  });
  return {
    decision: "reject",
    coachPublishState: previousState,
    publicExerciseId: existingPublic ? pubId : null,
  };
}
