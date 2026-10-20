/**
 * سرویس برنامه‌های اختصاصی مربی — مرحله ۱۶.
 *
 * مرجع واحد مجوز و مالکیت (بدون سیستم موازی):
 *  - ساخت/ویرایش پیش‌نویس: نقش COACH از دیتابیس + تأیید معتبر مربی‌گری.
 *  - ارسال (انتشار): همه شروط بالا + ارتباط ACTIVE متعلق به همان جفت +
 *    اشتراک مؤثر PREMIUM دانشجو در لحظه ارسال (سیاست مرحله ۱۵).
 *  - studentId همیشه از ارتباط سمت سرور استخراج می‌شود؛ هر مقدار کلاینتی
 *    نادیده گرفته می‌شود. connectionId کلاینت فقط «انتخاب» است و بازبینی
 *    می‌شود.
 *  - نسخه‌بندی: هر ارسال ردیف تغییرناپذیر CoachPlanDelivery می‌سازد؛
 *    ویرایش بعدی پیش‌نویس هرگز نسخه‌های ارسالشده را تغییر نمی‌دهد و
 *    ارسال مجدد بدون تغییر محتوا 409 می‌گیرد.
 *  - «نبودن» و «مالک دیگر» هر دو 404 تا هیچ وجودی افشا نشود.
 */

import { db } from "@/lib/db";
import {
  CONNECTION_STATUSES,
  CoachingError,
} from "./constants";
import { hasActivePremium } from "./subscription";
import { ensureExerciseBank } from "@/lib/exercises/bank";
import {
  buildNutritionContent,
  buildWorkoutContent,
  contentHashOf,
  parseNutritionContent,
  parsePlanMeta,
  parseWorkoutContent,
} from "./plan-schemas";
import type {
  CoachNutritionContent,
  CoachPlanMeta,
  CoachWorkoutContent,
} from "./plan-schemas";
import { emitNotification, NOTIFICATION_TYPES } from "@/lib/notifications/notifications";
import type {
  CoachNutritionPlan,
  CoachPlanDelivery,
  CoachWorkoutPlan,
} from "@prisma/client";
import type { CreateCoachWorkoutPlanInput, CreateCoachNutritionPlanInput } from "./plan-schemas";

/* ------------------------------ مجوز مربی ------------------------------ */

/**
 * شرط ساخت و ارسال برنامه اختصاصی: نقش COACH (تازه از دیتابیس) + پروفایل
 * تأییدشده. انتشار عمومی پروفایل شرط ارسال نیست (سیاست مستند مرحله ۱۶)؛
 * اگر تأیید مربی‌گری گرفته شود، ساخت و ارسال بلافاصله بسته می‌شود و
 * ارتباطها و برنامه‌های قبلی دست‌نخورده می‌مانند.
 */
export async function assertCoachCanBuildPlans(coachId: string, role: string): Promise<void> {
  if (role !== "COACH") {
    throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  }
  const profile = await db.coachProfile.findUnique({
    where: { userId: coachId },
    select: { verified: true },
  });
  if (!profile?.verified) {
    throw new CoachingError(403, "COACH_NOT_VERIFIED");
  }
}

/* ------------------------------ ارتباط و اشتراک ------------------------------ */

export interface ResolvedConnection {
  connectionId: string;
  studentId: string;
}

/**
 * اعتبارسنجی ارتباط برای ارسال برنامه: وجود + مالکیت مربی + وضعیت ACTIVE.
 * studentId فقط از همین‌جا بیرون می‌آید — کلاینت هرگز دریافت‌کننده را
 * تعیین نمی‌کند.
 */
export async function resolveActiveConnection(
  coachId: string,
  connectionId: string
): Promise<ResolvedConnection> {
  const conn = await db.coachStudentConnection.findUnique({
    where: { id: connectionId },
    select: { id: true, coachId: true, studentId: true, status: true },
  });
  if (!conn || conn.coachId !== coachId || conn.status !== CONNECTION_STATUSES.ACTIVE) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
  return { connectionId: conn.id, studentId: conn.studentId };
}

/** شرط اشتراک دانشجو در لحظه ارسال — سطح مؤثر از دیتابیس */
export async function assertStudentEligibleForNewDelivery(studentId: string): Promise<void> {
  if (!(await hasActivePremium(studentId))) {
    throw new CoachingError(403, "SUBSCRIPTION_REQUIRED");
  }
}

/* ------------------------------ تایپ کلاینت ------------------------------ */

export interface CoachPlanListItem {
  id: string;
  kind: "workout" | "nutrition";
  title: string;
  description: string;
  goal: string;
  status: "draft" | "published" | "archived";
  currentVersion: number;
  meta: CoachPlanMeta;
  assignedStudent: { userId: string; displayName: string } | null;
  firstSentAt: string | null;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoachPlanDetail extends CoachPlanListItem {
  content: CoachWorkoutContent | CoachNutritionContent;
}

function studentNameOf(
  studentId: string | null,
  names: Map<string, string>
): { userId: string; displayName: string } | null {
  if (!studentId) return null;
  return { userId: studentId, displayName: names.get(studentId) ?? "—" };
}

async function studentNamesOf(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (unique.length === 0) return new Map();
  const rows = await db.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.id, r.name]));
}

/* ------------------------------ برنامه تمرینی مربی ------------------------------ */

function workoutListItem(
  plan: CoachWorkoutPlan,
  names: Map<string, string>
): CoachPlanListItem {
  return {
    id: plan.id,
    kind: "workout",
    title: plan.title,
    description: plan.description,
    goal: plan.goal,
    status: plan.status === "archived" ? "archived" : plan.status === "published" ? "published" : "draft",
    currentVersion: plan.currentVersion,
    meta: metaOfWorkout(plan),
    assignedStudent: studentNameOf(plan.studentId, names),
    firstSentAt: plan.firstSentAt?.toISOString() ?? null,
    lastSentAt: plan.lastSentAt?.toISOString() ?? null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function metaOfWorkout(plan: CoachWorkoutPlan): CoachPlanMeta {
  const content = parseWorkoutContent(plan.contentJson);
  return {
    daysCount: content.days.length,
    exercisesCount: content.days.reduce((s, d) => s + d.exercises.length, 0),
    difficulty: plan.difficulty,
    durationMinutes: plan.durationMinutes,
  };
}

function metaOfNutrition(plan: CoachNutritionPlan): CoachPlanMeta {
  const content = parseNutritionContent(plan.contentJson);
  return {
    daysCount: content.days.length,
    mealsCount: content.days.reduce((s, d) => s + d.meals.length, 0),
    itemsCount: content.days.reduce(
      (s, d) => s + d.meals.reduce((ms, m) => ms + m.items.length, 0),
      0
    ),
    durationDays: plan.durationDays,
  };
}

export async function createCoachWorkoutPlan(
  coachId: string,
  input: CreateCoachWorkoutPlanInput
): Promise<CoachPlanDetail> {
  // بانک کامل (ویرایشی + منبع آزاد) برای snapshot حرکات — مرحله ۱۸
  await ensureExerciseBank();
  const content = await buildWorkoutContent(coachId, input);
  const row = await db.coachWorkoutPlan.create({
    data: {
      coachId,
      title: input.title,
      description: input.description,
      goal: input.goal,
      difficulty: input.difficulty,
      durationMinutes: input.durationMinutes,
      contentJson: JSON.stringify(content),
      contentHash: contentHashOf(content),
      status: "draft",
    },
  });
  return getCoachWorkoutPlan(coachId, row.id) as Promise<CoachPlanDetail>;
}

export async function listCoachWorkoutPlans(coachId: string): Promise<CoachPlanListItem[]> {
  const plans = await db.coachWorkoutPlan.findMany({
    where: { coachId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  const names = await studentNamesOf(plans.map((p) => p.studentId));
  return plans.map((p) => workoutListItem(p, names));
}

export async function getCoachWorkoutPlan(
  coachId: string,
  planId: string
): Promise<CoachPlanDetail | null> {
  const plan = await db.coachWorkoutPlan.findFirst({
    where: { id: planId, coachId },
  });
  if (!plan) return null;
  const names = await studentNamesOf(plan.studentId ? [plan.studentId] : []);
  return {
    ...workoutListItem(plan, names),
    meta: metaOfWorkout(plan),
    content: parseWorkoutContent(plan.contentJson),
  };
}

/** ویرایش پیش‌نویس — بایگانی‌شده قابل ویرایش نیست؛ نسخه‌های ارسالشده دست‌نخورده می‌مانند */
export async function updateCoachWorkoutPlan(
  coachId: string,
  planId: string,
  input: CreateCoachWorkoutPlanInput
): Promise<CoachPlanDetail | null> {
  const existing = await db.coachWorkoutPlan.findFirst({
    where: { id: planId, coachId },
    select: { id: true, status: true },
  });
  if (!existing) return null;
  if (existing.status === "archived") {
    throw new CoachingError(409, "PLAN_ARCHIVED");
  }
  await ensureExerciseBank();
  const content = await buildWorkoutContent(coachId, input);
  await db.coachWorkoutPlan.update({
    where: { id: planId },
    data: {
      title: input.title,
      description: input.description,
      goal: input.goal,
      difficulty: input.difficulty,
      durationMinutes: input.durationMinutes,
      contentJson: JSON.stringify(content),
      contentHash: contentHashOf(content),
    },
  });
  return getCoachWorkoutPlan(coachId, planId);
}

export async function archiveCoachWorkoutPlan(
  coachId: string,
  planId: string
): Promise<CoachPlanListItem | null> {
  const existing = await db.coachWorkoutPlan.findFirst({
    where: { id: planId, coachId },
    select: { id: true },
  });
  if (!existing) return null;
  await db.coachWorkoutPlan.update({
    where: { id: planId },
    data: { status: "archived" },
  });
  const plan = await db.coachWorkoutPlan.findUnique({ where: { id: planId } });
  if (!plan) return null;
  const names = await studentNamesOf(plan.studentId ? [plan.studentId] : []);
  return workoutListItem(plan, names);
}

/**
 * ارسال برنامه تمرینی به دانشجوی متصل — قلب مجوز مرحله ۱۶.
 * هم‌زمانی: نسخه بعدی درون تراکنش محاسبه و با قید یکتای (planId, version)
 * محافظت می‌شود؛ رقابت دو ارسال هم‌زمان با P2002 به 409 ترجمه می‌شود.
 */
export async function publishCoachWorkoutPlan(
  coachId: string,
  role: string,
  planId: string,
  connectionId: string
): Promise<CoachPlanDelivery> {
  await assertCoachCanBuildPlans(coachId, role);

  const plan = await db.coachWorkoutPlan.findFirst({ where: { id: planId, coachId } });
  if (!plan) throw new CoachingError(404, "PLAN_NOT_FOUND");
  if (plan.status === "archived") throw new CoachingError(409, "PLAN_ARCHIVED");
  if (parseWorkoutContent(plan.contentJson).days.length === 0) {
    throw new CoachingError(422, "PLAN_CONTENT_EMPTY");
  }

  const conn = await resolveActiveConnection(coachId, connectionId);
  if (plan.studentId && plan.studentId !== conn.studentId) {
    throw new CoachingError(409, "STUDENT_MISMATCH");
  }
  await assertStudentEligibleForNewDelivery(conn.studentId);

  // ارسال مجدد بدون هیچ تغییری → تعارض (نمایش شفاف به‌جای نسخه تکراری)
  const latest = await db.coachPlanDelivery.findFirst({
    where: { planId, planKind: "workout" },
    orderBy: { version: "desc" },
    select: { version: true, contentJson: true },
  });
  if (latest && latest.contentJson === plan.contentJson) {
    throw new CoachingError(409, "PLAN_ALREADY_SENT");
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const fresh = await tx.coachWorkoutPlan.findUnique({ where: { id: planId } });
      if (!fresh || fresh.coachId !== coachId || fresh.status === "archived") {
        throw new CoachingError(409, "PLAN_STATE_CHANGED");
      }
      // چک تکراری داخل تراکنش — مسابقه دو ارسال هم‌زمان با محتوای یکسان
      // را کامل می‌بندد (برای مربی و دانشجو 409 شفاف، نه نسخه تکراری)
      const latestInTx = await tx.coachPlanDelivery.findFirst({
        where: { planId, planKind: "workout" },
        orderBy: { version: "desc" },
        select: { contentJson: true },
      });
      if (latestInTx && latestInTx.contentJson === fresh.contentJson) {
        throw new CoachingError(409, "PLAN_ALREADY_SENT");
      }
      const version = fresh.currentVersion + 1;
      const delivery = await tx.coachPlanDelivery.create({
        data: {
          planKind: "workout",
          planId,
          version,
          coachId,
          studentId: conn.studentId,
          connectionId: conn.connectionId,
          title: fresh.title,
          description: fresh.description,
          goal: fresh.goal,
          metaJson: JSON.stringify({
            difficulty: fresh.difficulty,
            durationMinutes: fresh.durationMinutes,
            daysCount: parseWorkoutContent(fresh.contentJson).days.length,
            exercisesCount: parseWorkoutContent(fresh.contentJson).days.reduce(
              (s, d) => s + d.exercises.length,
              0
            ),
          } satisfies CoachPlanMeta),
          contentJson: fresh.contentJson,
        },
      });
      await tx.coachWorkoutPlan.update({
        where: { id: planId },
        data: {
          studentId: conn.studentId,
          connectionId: conn.connectionId,
          status: "published",
          currentVersion: version,
          firstSentAt: fresh.firstSentAt ?? new Date(),
          lastSentAt: new Date(),
        },
      });
      return delivery;
    });
    // اعلان تحویل برنامه — شکستش هرگز ارسال را نمیشکند
    await emitNotification({
      userId: conn.studentId,
      type: NOTIFICATION_TYPES.PLAN_DELIVERED,
      dedupeKey: `plan-delivered:${result.id}`,
      payload: { deliveryId: result.id, planKind: "workout", coachId },
    });
    return result;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new CoachingError(409, "PLAN_ALREADY_SENT");
    }
    throw error;
  }
}

/* ------------------------------ برنامه غذایی مربی ------------------------------ */

function nutritionListItem(
  plan: CoachNutritionPlan,
  names: Map<string, string>
): CoachPlanListItem {
  return {
    id: plan.id,
    kind: "nutrition",
    title: plan.title,
    description: plan.description,
    goal: plan.goal,
    status: plan.status === "archived" ? "archived" : plan.status === "published" ? "published" : "draft",
    currentVersion: plan.currentVersion,
    meta: metaOfNutrition(plan),
    assignedStudent: studentNameOf(plan.studentId, names),
    firstSentAt: plan.firstSentAt?.toISOString() ?? null,
    lastSentAt: plan.lastSentAt?.toISOString() ?? null,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

export async function createCoachNutritionPlan(
  coachId: string,
  input: CreateCoachNutritionPlanInput
): Promise<CoachPlanDetail> {
  const content = buildNutritionContent(input);
  const row = await db.coachNutritionPlan.create({
    data: {
      coachId,
      title: input.title,
      description: input.description,
      goal: input.goal,
      durationDays: input.durationDays,
      contentJson: JSON.stringify(content),
      contentHash: contentHashOf(content),
      status: "draft",
    },
  });
  return getCoachNutritionPlan(coachId, row.id) as Promise<CoachPlanDetail>;
}

export async function listCoachNutritionPlans(coachId: string): Promise<CoachPlanListItem[]> {
  const plans = await db.coachNutritionPlan.findMany({
    where: { coachId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  const names = await studentNamesOf(plans.map((p) => p.studentId));
  return plans.map((p) => nutritionListItem(p, names));
}

export async function getCoachNutritionPlan(
  coachId: string,
  planId: string
): Promise<CoachPlanDetail | null> {
  const plan = await db.coachNutritionPlan.findFirst({
    where: { id: planId, coachId },
  });
  if (!plan) return null;
  const names = await studentNamesOf(plan.studentId ? [plan.studentId] : []);
  return {
    ...nutritionListItem(plan, names),
    content: parseNutritionContent(plan.contentJson),
  };
}

export async function updateCoachNutritionPlan(
  coachId: string,
  planId: string,
  input: CreateCoachNutritionPlanInput
): Promise<CoachPlanDetail | null> {
  const existing = await db.coachNutritionPlan.findFirst({
    where: { id: planId, coachId },
    select: { id: true, status: true },
  });
  if (!existing) return null;
  if (existing.status === "archived") {
    throw new CoachingError(409, "PLAN_ARCHIVED");
  }
  const content = buildNutritionContent(input);
  await db.coachNutritionPlan.update({
    where: { id: planId },
    data: {
      title: input.title,
      description: input.description,
      goal: input.goal,
      durationDays: input.durationDays,
      contentJson: JSON.stringify(content),
      contentHash: contentHashOf(content),
    },
  });
  return getCoachNutritionPlan(coachId, planId);
}

export async function archiveCoachNutritionPlan(
  coachId: string,
  planId: string
): Promise<CoachPlanListItem | null> {
  const existing = await db.coachNutritionPlan.findFirst({
    where: { id: planId, coachId },
    select: { id: true },
  });
  if (!existing) return null;
  await db.coachNutritionPlan.update({
    where: { id: planId },
    data: { status: "archived" },
  });
  const plan = await db.coachNutritionPlan.findUnique({ where: { id: planId } });
  if (!plan) return null;
  const names = await studentNamesOf(plan.studentId ? [plan.studentId] : []);
  return nutritionListItem(plan, names);
}

export async function publishCoachNutritionPlan(
  coachId: string,
  role: string,
  planId: string,
  connectionId: string
): Promise<CoachPlanDelivery> {
  await assertCoachCanBuildPlans(coachId, role);

  const plan = await db.coachNutritionPlan.findFirst({ where: { id: planId, coachId } });
  if (!plan) throw new CoachingError(404, "PLAN_NOT_FOUND");
  if (plan.status === "archived") throw new CoachingError(409, "PLAN_ARCHIVED");
  if (parseNutritionContent(plan.contentJson).days.length === 0) {
    throw new CoachingError(422, "PLAN_CONTENT_EMPTY");
  }

  const conn = await resolveActiveConnection(coachId, connectionId);
  if (plan.studentId && plan.studentId !== conn.studentId) {
    throw new CoachingError(409, "STUDENT_MISMATCH");
  }
  await assertStudentEligibleForNewDelivery(conn.studentId);

  const latest = await db.coachPlanDelivery.findFirst({
    where: { planId, planKind: "nutrition" },
    orderBy: { version: "desc" },
    select: { version: true, contentJson: true },
  });
  if (latest && latest.contentJson === plan.contentJson) {
    throw new CoachingError(409, "PLAN_ALREADY_SENT");
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const fresh = await tx.coachNutritionPlan.findUnique({ where: { id: planId } });
      if (!fresh || fresh.coachId !== coachId || fresh.status === "archived") {
        throw new CoachingError(409, "PLAN_STATE_CHANGED");
      }
      // چک تکراری داخل تراکنش — همان محافظت مسابقه هم‌زمانی
      const latestInTx = await tx.coachPlanDelivery.findFirst({
        where: { planId, planKind: "nutrition" },
        orderBy: { version: "desc" },
        select: { contentJson: true },
      });
      if (latestInTx && latestInTx.contentJson === fresh.contentJson) {
        throw new CoachingError(409, "PLAN_ALREADY_SENT");
      }
      const version = fresh.currentVersion + 1;
      const delivery = await tx.coachPlanDelivery.create({
        data: {
          planKind: "nutrition",
          planId,
          version,
          coachId,
          studentId: conn.studentId,
          connectionId: conn.connectionId,
          title: fresh.title,
          description: fresh.description,
          goal: fresh.goal,
          metaJson: JSON.stringify({
            durationDays: fresh.durationDays,
            daysCount: parseNutritionContent(fresh.contentJson).days.length,
            mealsCount: parseNutritionContent(fresh.contentJson).days.reduce(
              (s, d) => s + d.meals.length,
              0
            ),
            itemsCount: parseNutritionContent(fresh.contentJson).days.reduce(
              (s, d) => s + d.meals.reduce((ms, m) => ms + m.items.length, 0),
              0
            ),
          } satisfies CoachPlanMeta),
          contentJson: fresh.contentJson,
        },
      });
      await tx.coachNutritionPlan.update({
        where: { id: planId },
        data: {
          studentId: conn.studentId,
          connectionId: conn.connectionId,
          status: "published",
          currentVersion: version,
          firstSentAt: fresh.firstSentAt ?? new Date(),
          lastSentAt: new Date(),
        },
      });
      return delivery;
    });
    // اعلان تحویل برنامه غذایی — شکستش هرگز ارسال را نمیشکند
    await emitNotification({
      userId: conn.studentId,
      type: NOTIFICATION_TYPES.PLAN_DELIVERED,
      dedupeKey: `plan-delivered:${result.id}`,
      payload: { deliveryId: result.id, planKind: "nutrition", coachId },
    });
    return result;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new CoachingError(409, "PLAN_ALREADY_SENT");
    }
    throw error;
  }
}

/* ------------------------------ نسخه‌های ارسال‌شده ------------------------------ */

/** فهرست نسخه‌های یک برنامه برای مربی مالک — جدیدترین اول */
export async function listCoachPlanDeliveries(
  coachId: string,
  planKind: "workout" | "nutrition",
  planId: string
): Promise<CoachPlanDelivery[]> {
  return db.coachPlanDelivery.findMany({
    where: { coachId, planKind, planId },
    orderBy: { version: "desc" },
    take: 50,
  });
}

/**
 * فهرست نسخه‌های ارسال‌شده یک مربی به یک دانشجوی مشخص — برای صفحه
 * «اطلاعات تکمیلی دانشجو» (مرحله ۱۹.۶). مالکیت مربی + جفت واقعی
 * coachId/studentId در همان کوئری اعمال میشود؛ نشت برنامه مربیان دیگر
 * ناممکن است.
 */
export async function listCoachPlanDeliveriesForStudent(
  coachId: string,
  studentId: string,
  planKind: "workout" | "nutrition"
): Promise<DeliveryListItem[]> {
  const rows = await db.coachPlanDelivery.findMany({
    where: { coachId, studentId, planKind },
    orderBy: { sentAt: "desc" },
    take: 100,
  });
  const names = await coachNamesOf(rows.map((r) => r.coachId));
  return rows.map((r) => toDeliveryItem(r, names));
}

/* ------------------------------ سمت دانشجو ------------------------------ */

export interface DeliveryListItem {
  id: string;
  planKind: "workout" | "nutrition";
  version: number;
  title: string;
  description: string;
  goal: string;
  meta: CoachPlanMeta;
  sentAt: string;
  coach: { userId: string; displayName: string };
}

export interface DeliveryDetail extends DeliveryListItem {
  content: CoachWorkoutContent | CoachNutritionContent;
  /** وضعیت فعلی ارتباط مبنا — برای پیام شفاف پایان ارتباط */
  connectionStatus: string | null;
}

async function coachNamesOf(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((v): v is string => Boolean(v)))];
  if (unique.length === 0) return new Map();
  const rows = await db.coachProfile.findMany({
    where: { userId: { in: unique } },
    select: { userId: true, displayName: true },
  });
  return new Map(rows.map((r) => [r.userId, r.displayName]));
}

function toDeliveryItem(
  row: CoachPlanDelivery,
  coachNames: Map<string, string>
): DeliveryListItem {
  return {
    id: row.id,
    planKind: row.planKind === "nutrition" ? "nutrition" : "workout",
    version: row.version,
    title: row.title,
    description: row.description,
    goal: row.goal,
    meta: parsePlanMeta(row.metaJson),
    sentAt: row.sentAt.toISOString(),
    coach: {
      userId: row.coachId,
      displayName: coachNames.get(row.coachId) ?? "—",
    },
  };
}

/** فهرست برنامه‌های اختصاصی دریافتی دانشجو — فقط ارسال‌شده‌های خودش */
export async function listStudentDeliveries(
  studentId: string,
  kind?: "workout" | "nutrition"
): Promise<DeliveryListItem[]> {
  const rows = await db.coachPlanDelivery.findMany({
    where: { studentId, ...(kind ? { planKind: kind } : {}) },
    orderBy: { sentAt: "desc" },
    take: 200,
  });
  const names = await coachNamesOf(rows.map((r) => r.coachId));
  return rows.map((r) => toDeliveryItem(r, names));
}

/**
 * جزئیات یک نسخه ارسال‌شده — فقط دانشجوی گیرنده یا مربی مالک.
 * «مالک دیگر» و «نبودن» هر دو null (پاسخ 404 یکسان) تا هیچ افشایی نباشد.
 */
export async function getDeliveryForUser(
  deliveryId: string,
  user: { id: string }
): Promise<DeliveryDetail | null> {
  const row = await db.coachPlanDelivery.findUnique({ where: { id: deliveryId } });
  if (!row) return null;
  const isStudent = row.studentId === user.id;
  const isCoach = row.coachId === user.id;
  if (!isStudent && !isCoach) return null;
  const names = await coachNamesOf([row.coachId]);
  const conn = await db.coachStudentConnection.findUnique({
    where: { id: row.connectionId },
    select: { status: true },
  });
  return {
    ...toDeliveryItem(row, names),
    content:
      row.planKind === "nutrition"
        ? parseNutritionContent(row.contentJson)
        : parseWorkoutContent(row.contentJson),
    connectionStatus: conn?.status ?? null,
  };
}

/**
 * نسخه ارسال‌شده برای شروع جلسه — فقط دانشجوی گیرنده و فقط تمرینی.
 * برنامه‌های قبلی پس از پایان ارتباط هم قابل اجرا می‌مانند (سیاست شفاف:
 * تاریخچه حفظ می‌شود)؛ این تابع عمداً وضعیت ارتباط را چک نمی‌کند.
 */
export async function getWorkoutDeliveryForStudent(
  deliveryId: string,
  studentId: string
): Promise<(CoachPlanDelivery & { content: CoachWorkoutContent }) | null> {
  const row = await db.coachPlanDelivery.findUnique({ where: { id: deliveryId } });
  if (!row || row.studentId !== studentId || row.planKind !== "workout") return null;
  return { ...row, content: parseWorkoutContent(row.contentJson) };
}
