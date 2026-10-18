/**
 * شِماهای Zod ورودی APIهای مرحله ۱۵ — سقف طول/نوع همه ورودی‌های آزاد.
 * هیچ فیلدی از کلاینت نقش، اشتراک، مالکیت یا وضعیت تعیین نمی‌کند.
 */

import { z } from "zod";
import {
  APPLICATION_LIMITS,
  CONNECTION_LIMITS,
  COACH_PROFILE_LIMITS,
  COOPERATION_TYPE_VALUES,
} from "./constants";

export const cooperationTypeSchema = z.enum(
  COOPERATION_TYPE_VALUES as [string, ...string[]]
);

/** POST /api/coach-connections — ساخت درخواست ارتباط */
export const createConnectionRequestSchema = z.object({
  coachId: z.string().trim().min(1).max(64),
  cooperationType: cooperationTypeSchema,
  message: z
    .string()
    .trim()
    .max(CONNECTION_LIMITS.MESSAGE_MAX)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/** POST /api/coach/requests/[id]/reject */
export const rejectRequestSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(CONNECTION_LIMITS.REJECTION_REASON_MAX)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/** PUT /api/coach/profile */
export const coachProfileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2)
    .max(COACH_PROFILE_LIMITS.DISPLAY_NAME_MAX),
  headline: z.string().trim().max(COACH_PROFILE_LIMITS.HEADLINE_MAX),
  bio: z.string().trim().max(COACH_PROFILE_LIMITS.BIO_MAX),
  specializations: z
    .array(z.string())
    .max(COACH_PROFILE_LIMITS.SPECIALIZATIONS_MAX),
  certifications: z
    .array(z.string().trim().min(1).max(COACH_PROFILE_LIMITS.CERTIFICATION_ITEM_MAX))
    .max(COACH_PROFILE_LIMITS.CERTIFICATIONS_MAX),
  experienceYears: z
    .number()
    .int()
    .min(0)
    .max(COACH_PROFILE_LIMITS.EXPERIENCE_YEARS_MAX)
    .nullable(),
  cooperationTypes: z
    .array(cooperationTypeSchema)
    .min(1)
    .max(2),
});

/** POST /api/coach/profile/publish */
export const coachPublishSchema = z.object({
  published: z.boolean(),
});

/** POST /api/coach/apply */
export const coachApplySchema = z.object({
  message: z.string().trim().max(APPLICATION_LIMITS.MESSAGE_MAX).optional(),
  experienceYears: z
    .number()
    .int()
    .min(0)
    .max(APPLICATION_LIMITS.MESSAGE_MAX && COACH_PROFILE_LIMITS.EXPERIENCE_YEARS_MAX)
    .nullable()
    .optional(),
  certifications: z
    .array(z.string().trim().min(1).max(APPLICATION_LIMITS.CERTIFICATION_ITEM_MAX))
    .max(APPLICATION_LIMITS.CERTIFICATIONS_MAX)
    .optional(),
});

/** تبدیل خطای اول Zod به کد پایدار برای server-messages */
export function firstZodMessage(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "VALIDATION";
  const ck = (issue as { params?: { ck?: unknown } }).params?.ck;
  if (typeof ck === "string" && ck.length > 0) return ck;
  return issue.message;
}
