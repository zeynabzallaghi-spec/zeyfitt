/**
 * helperهای سرور مشترک Route Handlerهای مرحله ۱۵.
 *
 * قانون طلایی: نقش و وضعیت همیشه از دیتابیس بازخوانی می‌شود (نه از داده
 * نشستِ ممکناً قدیمی) — «در تمام APIهای محافظت‌شده، وضعیت فعلی نقش و
 * تأیید مربی از دیتابیس بررسی شود».
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/lib/db";
import { zodIssueCodes } from "@/lib/api-issues";
import type { z } from "zod";
import { CoachingError } from "./constants";
import { firstZodMessage } from "./schemas";

export interface AuthenticatedUser {
  id: string;
  role: string;
}

/** نشست معتبر + بازخوانی تازه نقش از دیتابیس؛ بدون نشست → 401 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new CoachingError(401, "UNAUTHENTICATED");
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  });
  // نشست معتبر ولی کاربر حذف‌شده — همان بی‌اعتباری
  if (!user) {
    throw new CoachingError(401, "UNAUTHENTICATED");
  }
  return user;
}

/** فقط نقش COACH؛ بقیه → 403 (نقش از دیتابیس، هر بار تازه) */
export async function requireCoach(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== "COACH") {
    throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  }
  return user;
}

/** فقط نقش ADMIN؛ بقیه → 403 (نقش از دیتابیس، هر بار تازه — مرحله ۱۹.۵) */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  }
  return user;
}

/** پاسخ استاندارد خطای دامنه */
export function coachingErrorResponse(error: unknown): NextResponse {
  if (error instanceof CoachingError) {
    return NextResponse.json(
      { error: error.code },
      { status: error.status }
    );
  }
  console.error(
    "[coaching]",
    error instanceof Error ? error.name : "unknown",
    // فقط برای تشخیص؛ پیام خطای Prisma فیلد/مدل را میگوید و داده کاربر ندارد
    error instanceof Error && error.name.startsWith("Prisma") ? error.message.slice(0, 400) : ""
  );
  return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
}

/** parse بدنه JSON با پاسخ 400 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new CoachingError(400, "VALIDATION");
  }
}

/** اعتبارسنجی با شِما؛ خطا → 400 VALIDATION همراه issues (الگوی پروژه) */
export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  body: unknown
): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const response = NextResponse.json(
      {
        error: "VALIDATION",
        message: firstZodMessage(parsed.error),
        issues: zodIssueCodes(parsed.error),
      },
      { status: 400 }
    );
    // خطای شِما را با پاسخ آماده پرتاب می‌کنیم تا handler فقط آن را بفرستد
    throw new SchemaValidationError(response, parsed.error);
  }
  return parsed.data;
}

export class SchemaValidationError extends Error {
  constructor(
    public readonly response: NextResponse,
    public readonly zodError: z.ZodError
  ) {
    super("SCHEMA_VALIDATION");
    this.name = "SchemaValidationError";
  }
}

/** تبدیل خطا در handlerهای دارای شِما — 400 شِما جدا از خطای دامنه */
export function coachingErrorResponseWithSchema(
  error: unknown
): NextResponse {
  if (error instanceof SchemaValidationError) {
    return error.response;
  }
  return coachingErrorResponse(error);
}
