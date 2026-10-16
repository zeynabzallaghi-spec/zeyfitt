/**
 * لایه سمت سرورِ ذخیره‌سازی برنامه تمرینی — تنها نقطه تماس Prisma با مدل‌های
 * برنامه. همه توابع userId را به‌عنوان پارامتر اجباری می‌گیرند و هیچ مسیری
 * برای اعتماد به شناسه ارسالی از مرورگر وجود ندارد.
 *
 * نکته SQLite: فهرست‌ها JSON رشته‌ای ذخیره می‌شوند و اینجا marshal می‌شوند.
 */

import { db } from "@/lib/db";
import type {
  WorkoutPlan,
  WorkoutPlanDay,
  WorkoutPlanExercise,
} from "@prisma/client";
import { LIBRARY_VERSION } from "@/lib/exercises";
import type {
  GeneratedPlan,
  PlanSettings,
  PlannedDay,
  PlannedExercise,
} from "@/lib/plan-engine/types";
import type { EquipmentId, ExerciseCategoryId } from "@/lib/exercises/types";

/* ------------------------------ تایپ کلاینت ------------------------------ */

export interface PlannedExerciseClient extends PlannedExercise {
  id: string;
  order: number;
}

export interface PlannedDayClient {
  id: string;
  order: number;
  weekday: number | null;
  title: string;
  focusLabel: string;
  estMinutes: number;
  exercises: PlannedExerciseClient[];
}

export interface WorkoutPlanClient {
  id: string;
  userId: string;
  title: string;
  goal: string;
  experience: string;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: EquipmentId[];
  focus: string;
  preferredDays: number[];
  excludedCategories: ExerciseCategoryId[];
  excludedExerciseIds: string[];
  limitationNotes: string | null;
  /** راهنماهای عمومی تولیدشده موتور — ذخیره‌شده در snapshot برنامه */
  notes: string[];
  status: "active" | "archived";
  libraryVersion: string;
  /** زبان تولید محتوای برنامه — رکوردهای قدیمی «fa» */
  contentLocale: string;
  createdAt: string;
  updatedAt: string;
  days: PlannedDayClient[];
}

/** نسخه خلاصه برای فهرست برنامه‌ها — بدون روزها */
export interface WorkoutPlanSummaryClient {
  id: string;
  title: string;
  goal: string;
  experience: string;
  daysPerWeek: number;
  sessionMinutes: number;
  focus: string;
  status: "active" | "archived";
  totalExercises: number;
  /** زبان تولید محتوا — رکوردهای قدیمی «fa» */
  contentLocale: string;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------ JSON helpers ------------------------------ */

function parseJsonArray(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
    return [];
  } catch {
    return [];
  }
}

function marshalStatus(status: string): "active" | "archived" {
  return status === "archived" ? "archived" : "active";
}

function toClientDay(
  day: WorkoutPlanDay & { exercises: WorkoutPlanExercise[] }
): PlannedDayClient {
  return {
    id: day.id,
    order: day.order,
    weekday: day.weekday ?? null,
    title: day.title,
    focusLabel: day.focusLabel,
    estMinutes: day.estMinutes,
    exercises: day.exercises
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((ex) => ({
        id: ex.id,
        order: ex.order,
        exerciseId: ex.exerciseId,
        faName: ex.faName,
        enName: ex.enName,
        category: ex.category as ExerciseCategoryId,
        coach3dId: ex.coach3dId ?? null,
        sets: ex.sets,
        repsMin: ex.repsMin,
        repsMax: ex.repsMax,
        restSeconds: ex.restSeconds,
        estimatedMinutes: ex.estimatedMinutes,
        note: ex.note ?? null,
      })),
  };
}

export function toClientPlan(
  plan: WorkoutPlan & { days: (WorkoutPlanDay & { exercises: WorkoutPlanExercise[] })[] }
): WorkoutPlanClient {
  return {
    id: plan.id,
    userId: plan.userId,
    title: plan.title,
    goal: plan.goal,
    experience: plan.experience,
    daysPerWeek: plan.daysPerWeek,
    sessionMinutes: plan.sessionMinutes,
    equipment: parseJsonArray(plan.equipmentJson) as EquipmentId[],
    focus: plan.focus,
    preferredDays: parseJsonArray(plan.preferredDaysJson).map(Number).filter((n) => Number.isInteger(n)),
    excludedCategories: parseJsonArray(plan.excludedCategoriesJson) as ExerciseCategoryId[],
    excludedExerciseIds: parseJsonArray(plan.excludedExerciseIdsJson),
    limitationNotes: plan.limitationNotes ?? null,
    notes: parseJsonArray(plan.notesJson),
    status: marshalStatus(plan.status),
    libraryVersion: plan.libraryVersion,
    contentLocale: plan.contentLocale === "en" ? "en" : "fa",
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    days: plan.days
      .slice()
      .sort((a, b) => a.order - b.order)
      .map(toClientDay),
  };
}

/* ------------------------------ خواندن ------------------------------ */

/** فهرست برنامه‌های کاربر (خلاصه) — تازه‌ترین اول */
export async function listUserPlans(userId: string): Promise<WorkoutPlanSummaryClient[]> {
  const plans = await db.workoutPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { days: { select: { id: true } } },
    take: 50,
  });
  const withCounts = await Promise.all(
    plans.map(async (plan) => {
      const totalExercises = await db.workoutPlanExercise.count({
        where: { day: { planId: plan.id } },
      });
      return {
        id: plan.id,
        title: plan.title,
        goal: plan.goal,
        experience: plan.experience,
        daysPerWeek: plan.daysPerWeek,
        sessionMinutes: plan.sessionMinutes,
        focus: plan.focus,
        status: marshalStatus(plan.status),
        totalExercises,
        contentLocale: plan.contentLocale === "en" ? "en" : "fa",
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      } satisfies WorkoutPlanSummaryClient;
    })
  );
  return withCounts;
}

/**
 * جزئیات برنامه — فقط اگر متعلق به userId باشد؛ در غیر این صورت null
 * (پاسخ API برای «نبودن» و «مالک دیگر» یکسان است).
 */
export async function findOwnedPlan(
  planId: string,
  userId: string
): Promise<WorkoutPlanClient | null> {
  const plan = await db.workoutPlan.findFirst({
    where: { id: planId, userId },
    include: {
      days: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { order: "asc" } } },
      },
    },
  });
  return plan ? toClientPlan(plan) : null;
}

/** برنامه فعال کاربر — برای داشبورد و نمایش پیش‌فرض */
export async function findActivePlanId(userId: string): Promise<string | null> {
  const plan = await db.workoutPlan.findFirst({
    where: { userId, status: "active" },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  return plan?.id ?? null;
}

/* ------------------------------ نوشتن ------------------------------ */

/**
 * ذخیره برنامه تولیدشده موتور — در یک تراکنش؛ فعال‌سازی برنامه جدید،
 * بقیه برنامه‌های فعال همان کاربر را بایگانی می‌کند (حداکثر یک برنامه فعال).
 */
export async function saveGeneratedPlan(
  userId: string,
  settings: PlanSettings,
  plan: GeneratedPlan,
  contentLocale: "fa" | "en" = "fa"
): Promise<WorkoutPlanClient> {
  const saved = await db.$transaction(async (tx) => {
    await tx.workoutPlan.updateMany({
      where: { userId, status: "active" },
      data: { status: "archived" },
    });

    return tx.workoutPlan.create({
      data: {
        userId,
        title: plan.title,
        goal: plan.goal,
        experience: plan.experience,
        daysPerWeek: plan.daysPerWeek,
        sessionMinutes: plan.sessionMinutes,
        equipmentJson: JSON.stringify(settings.equipment),
        focus: plan.focus,
        preferredDaysJson: JSON.stringify(settings.preferredDays),
        excludedCategoriesJson: JSON.stringify(settings.excludedCategories),
        excludedExerciseIdsJson: JSON.stringify(settings.excludedExerciseIds),
        limitationNotes: settings.limitationNotes,
        notesJson: JSON.stringify(plan.notes),
        status: "active",
        libraryVersion: LIBRARY_VERSION,
        contentLocale,
        days: {
          create: plan.days.map((day) => ({
            order: day.order,
            weekday: day.weekday,
            title: day.title,
            focusLabel: day.focusLabel,
            estMinutes: day.estMinutes,
            exercises: {
              create: day.exercises.map((ex, index) => ({
                order: index + 1,
                exerciseId: ex.exerciseId,
                faName: ex.faName,
                enName: ex.enName,
                category: ex.category,
                coach3dId: ex.coach3dId,
                sets: ex.sets,
                repsMin: ex.repsMin,
                repsMax: ex.repsMax,
                restSeconds: ex.restSeconds,
                estimatedMinutes: ex.estimatedMinutes,
                note: ex.note,
              })),
            },
          })),
        },
      },
      include: {
        days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
      },
    });
  });
  return toClientPlan(saved);
}

/** تغییر فیلدهای مجاز — عنوان و وضعیت. فعال‌سازی بقیه را بایگانی می‌کند. */
export async function updateOwnedPlan(
  planId: string,
  userId: string,
  data: { title?: string; status?: "active" | "archived" }
): Promise<WorkoutPlanClient | null> {
  const existing = await db.workoutPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });
  if (!existing) return null;

  const updated = await db.$transaction(async (tx) => {
    if (data.status === "active") {
      await tx.workoutPlan.updateMany({
        where: { userId, status: "active", id: { not: planId } },
        data: { status: "archived" },
      });
    }
    return tx.workoutPlan.update({
      where: { id: planId },
      data: {
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
      include: {
        days: { orderBy: { order: "asc" }, include: { exercises: { orderBy: { order: "asc" } } } },
      },
    });
  });
  return toClientPlan(updated);
}

/** حذف برنامه — فقط مالک؛ خروجی true یعنی حذف شد، false یعنی یافت نشد */
export async function deleteOwnedPlan(planId: string, userId: string): Promise<boolean> {
  const existing = await db.workoutPlan.findFirst({
    where: { id: planId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await db.workoutPlan.delete({ where: { id: existing.id } });
  return true;
}
