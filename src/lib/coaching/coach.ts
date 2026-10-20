/**
 * سرویس مربی — پروفایل عمومی، شرایط مجازبودن و اعتبارسنجی انتشار.
 *
 * مرجع واحد شرایط مربی (بدون سیستم موازی):
 *   نقش COACH (از دیتابیس، هر بار از نو) + verified + published +
 *   حداقل اطلاعات عمومی + ارائه نوع همکاری درخواستی.
 * از دست رفتن هر یک از این شروط فقط «درخواست جدید» و «نمایش عمومی» را
 * می‌بندد؛ ارتباطهای قبلی و تاریخچه دست‌نخورده می‌مانند (سیاست مستند).
 */

import { db } from "@/lib/db";
import {
  COOPERATION_TYPES,
  COOPERATION_TYPE_VALUES,
  COACH_SPECIALIZATIONS,
  CoachingError,
  type CooperationType,
  type CoachSpecialization,
} from "./constants";

/* ------------------------------ marshal helpers ------------------------------ */

export function parseCooperationTypes(json: string): CooperationType[] {
  try {
    const arr: unknown = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (v): v is CooperationType =>
        typeof v === "string" &&
        (COOPERATION_TYPE_VALUES as readonly string[]).includes(v)
    );
  } catch {
    return [];
  }
}

export function parseSpecializations(json: string): CoachSpecialization[] {
  try {
    const arr: unknown = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (v): v is CoachSpecialization =>
        typeof v === "string" &&
        (COACH_SPECIALIZATIONS as readonly string[]).includes(v)
    );
  } catch {
    return [];
  }
}

export function parseStringArray(json: string): string[] {
  try {
    const arr: unknown = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter((v): v is string => typeof v === "string");
  } catch {
    return [];
  }
}

/* ------------------------------ نمای عمومی مربی ------------------------------ */

/** اطلاعات عمومی منتشرشده — بدون ایمیل، شناسه نشست یا داده خصوصی */
export interface PublicCoach {
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  specializations: CoachSpecialization[];
  certifications: string[];
  experienceYears: number | null;
  cooperationTypes: CooperationType[];
  /** تعرفه عمومی (۱۹.۶) — فقط در مسیرهای عمومی فهرست/جزئیات پر میشود */
  tariff?: {
    privatePriceIrr: number | null;
    privatePriceUsd: number | null;
    semiPrivatePriceIrr: number | null;
    semiPrivatePriceUsd: number | null;
  } | null;
}

interface CoachProfileRow {
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  specializationsJson: string;
  certificationsJson: string;
  experienceYears: number | null;
  cooperationTypesJson: string;
}

export function toPublicCoach(row: CoachProfileRow): PublicCoach {
  return {
    userId: row.userId,
    displayName: row.displayName,
    headline: row.headline,
    bio: row.bio,
    specializations: parseSpecializations(row.specializationsJson),
    certifications: parseStringArray(row.certificationsJson),
    experienceYears: row.experienceYears,
    cooperationTypes: parseCooperationTypes(row.cooperationTypesJson),
  };
}

/* --------------------------- اعتبارسنجی انتشار --------------------------- */

/** حداقل اطلاعات لازم برای مجاز بودن انتشار عمومی پروفایل مربی */
export function profileValidForPublishing(row: CoachProfileRow): boolean {
  const types = parseCooperationTypes(row.cooperationTypesJson);
  return (
    row.displayName.trim().length >= 2 &&
    row.bio !== null &&
    row.bio.trim().length >= 20 &&
    types.length >= 1
  );
}

/* ------------------------------ شرایط مربی ------------------------------ */

export interface CoachEligibility {
  /** نقش COACH در دیتابیس (هر بار از نو) */
  isCoachRole: boolean;
  /** وجود پروفایل مربی */
  hasProfile: boolean;
  verified: boolean;
  published: boolean;
  /** حداقل اطلاعات عمومی کامل است */
  profileValid: boolean;
  /** جمع شرایط دریافت درخواست جدید */
  canReceiveNewRequests: boolean;
}

export async function coachEligibility(
  coachUserId: string
): Promise<{ user: { id: string; role: string } | null; profile: CoachProfileRow | null; eligibility: CoachEligibility }> {
  const user = await db.user.findUnique({
    where: { id: coachUserId },
    select: { id: true, role: true },
  });
  const profile = await db.coachProfile.findUnique({
    where: { userId: coachUserId },
  });
  const hasProfile = profile !== null;
  const verified = profile?.verified ?? false;
  const published = profile?.published ?? false;
  const profileValid = profile !== null && profileValidForPublishing(profile);
  const eligibility: CoachEligibility = {
    isCoachRole: user?.role === "COACH",
    hasProfile,
    verified,
    published,
    profileValid,
    canReceiveNewRequests:
      user?.role === "COACH" && verified && published && profileValid,
  };
  return { user, profile, eligibility };
}

/**
 * بررسی دسترس‌پذیری مربی برای درخواست جدید.
 *  - ناموجود یا غیرعمومی → 404 (بدون افشای وجود مربی منتشرنشده)
 *  - نوع همکاری ارائهنشده → 422 با کد پایدار
 */
export async function requireEligibleCoachForRequest(
  coachUserId: string,
  cooperationType: CooperationType
): Promise<PublicCoach> {
  const { user, profile, eligibility } = await coachEligibility(coachUserId);
  if (!user || !profile || !eligibility.canReceiveNewRequests) {
    throw new CoachingError(404, "COACH_UNAVAILABLE");
  }
  const types = parseCooperationTypes(profile.cooperationTypesJson);
  if (!types.includes(cooperationType)) {
    throw new CoachingError(422, "COOPERATION_TYPE_NOT_OFFERED");
  }
  return toPublicCoach(profile);
}

/* ------------------------------ فهرست عمومی ------------------------------ */

/** فهرست عمومی مربیان — فقط تأییدشده + منتشرشده + اطلاعات معتبر */
export async function listPublicCoaches(): Promise<PublicCoach[]> {
  const rows = await db.coachProfile.findMany({
    where: { verified: true, published: true },
    orderBy: { updatedAt: "desc" },
  });
  const valid = rows.filter(profileValidForPublishing);
  // تعرفه عمومی هر مربی (مرحله ۱۹.۶) — فقط مبالغ؛ هیچ داده بانکیای اینجا نیست
  const tariffs = await db.coachTariff.findMany({
    where: { coachId: { in: valid.map((r) => r.userId) } },
    select: {
      coachId: true,
      privatePriceIrr: true,
      privatePriceUsd: true,
      semiPrivatePriceIrr: true,
      semiPrivatePriceUsd: true,
    },
  });
  const tariffByCoach = new Map(tariffs.map((t) => [t.coachId, t]));
  return valid.map((row) => {
    const t = tariffByCoach.get(row.userId) ?? null;
    return {
      ...toPublicCoach(row),
      tariff: t
        ? {
            privatePriceIrr: t.privatePriceIrr ?? null,
            privatePriceUsd: t.privatePriceUsd ?? null,
            semiPrivatePriceIrr: t.semiPrivatePriceIrr ?? null,
            semiPrivatePriceUsd: t.semiPrivatePriceUsd ?? null,
          }
        : null,
    };
  });
}

export async function getPublicCoach(
  coachUserId: string
): Promise<PublicCoach | null> {
  const row = await db.coachProfile.findUnique({
    where: { userId: coachUserId },
  });
  if (!row || !row.verified || !row.published || !profileValidForPublishing(row)) {
    return null;
  }
  const t = await db.coachTariff.findUnique({
    where: { coachId: coachUserId },
    select: {
      privatePriceIrr: true,
      privatePriceUsd: true,
      semiPrivatePriceIrr: true,
      semiPrivatePriceUsd: true,
    },
  });
  return {
    ...toPublicCoach(row),
    tariff: t
      ? {
          privatePriceIrr: t.privatePriceIrr ?? null,
          privatePriceUsd: t.privatePriceUsd ?? null,
          semiPrivatePriceIrr: t.semiPrivatePriceIrr ?? null,
          semiPrivatePriceUsd: t.semiPrivatePriceUsd ?? null,
        }
      : null,
  };
}

/* ------------------------------ پذیرش درخواست ------------------------------ */

/** برای پذیرش درخواست، مربی باید همان لحظه همچنان واجد شرایط باشد */
export async function assertCoachStillEligible(coachUserId: string): Promise<void> {
  const { eligibility } = await coachEligibility(coachUserId);
  if (!eligibility.canReceiveNewRequests) {
    // تاییدیه لحظه پذیرش: مربی دیگر واجد شرایط نیست (مثلاً انتشار را برداشته)
    throw new CoachingError(409, "COACH_NO_LONGER_ELIGIBLE");
  }
}

/** نوع همکاری فقط از انواع واقعاً ارائهشده مربی — برای پذیرش هم دوباره چک می‌شود */
export function coachOffersType(
  profile: CoachProfileRow,
  type: CooperationType
): boolean {
  return parseCooperationTypes(profile.cooperationTypesJson).includes(type);
}

export { COOPERATION_TYPES };
