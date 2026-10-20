/**
 * تعرفه‌های مربی و درخواست پرداخت — مرحله ۱۹.۶.
 *
 * مرزهای داده‌ای (طبق مشخصات):
 *  - تعرفه داده «عمومی» مربی است (نمایش در فهرست/جزئیات عمومی) اما
 *    اطلاعات بانکی خصوصی هرگز اینجا نیست و از این لایه عبور نمیکند.
 *  - قیمت null یعنی «تعرفه ثبت نشده» — هرگز صفر یا رایگان تفسیر نمیشود.
 *  - درخواست پرداخت مبلغ/واحد را در لحظه ساخت کپی میکند؛ تغییر بعدی تعرفه
 *    رکوردهای قبلی را تغییر نمیدهد (تعرفهٔ فعلی و مبلغ درخواست قبلی هرگز
 *    با هم اشتباه گرفته نمیشوند).
 *  - گردش کار: مربی درخواست میسازد (PENDING) → دانشجو تأیید (CONFIRMED —
 *    لینک فعال) یا رد (DECLINED) میکند → مربی میتواند لغو کند (CANCELLED).
 *    هیچ مسیری وضعیت «پرداخت موفق» نمیسازد؛ کلیک/باز کردن لینک بیاثر است
 *    تا درگاه واقعی در مرحله بعد متصل شود.
 *  - مجوزها همیشه سمت سرور با نقش/مالکیت تازه از دیتابیس.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { CoachingError, PAYMENT_LIMITS } from "@/lib/coaching/constants";
import { emitNotification, NOTIFICATION_TYPES } from "@/lib/notifications/notifications";

/* ------------------------------ تعرفه‌ها ------------------------------ */

const priceField = z
  .number({ message: "قیمت نامعتبر است" })
  .int("قیمت باید عدد صحیح باشد")
  .min(0, "قیمت نمیتواند منفی باشد")
  .max(PAYMENT_LIMITS.AMOUNT_MAX, "قیمت خارج از بازه مجاز است")
  .nullish();

export const coachTariffSchema = z.object({
  privatePriceIrr: priceField,
  privatePriceUsd: priceField,
  semiPrivatePriceIrr: priceField,
  semiPrivatePriceUsd: priceField,
});

export type CoachTariffInput = z.infer<typeof coachTariffSchema>;

export interface CoachTariffClient {
  privatePriceIrr: number | null;
  privatePriceUsd: number | null;
  semiPrivatePriceIrr: number | null;
  semiPrivatePriceUsd: number | null;
  updatedAt: string;
}

const TARIFF_SELECT = {
  privatePriceIrr: true,
  privatePriceUsd: true,
  semiPrivatePriceIrr: true,
  semiPrivatePriceUsd: true,
  updatedAt: true,
} as const;

function toTariffClient(row: {
  privatePriceIrr: number | null;
  privatePriceUsd: number | null;
  semiPrivatePriceIrr: number | null;
  semiPrivatePriceUsd: number | null;
  updatedAt: Date;
}): CoachTariffClient {
  return {
    privatePriceIrr: row.privatePriceIrr ?? null,
    privatePriceUsd: row.privatePriceUsd ?? null,
    semiPrivatePriceIrr: row.semiPrivatePriceIrr ?? null,
    semiPrivatePriceUsd: row.semiPrivatePriceUsd ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** خواندن تعرفه مربی — عمومی (فقط مبالغ؛ هیچ داده بانکیای اینجا نیست) */
export async function getCoachTariff(coachId: string): Promise<CoachTariffClient | null> {
  const row = await db.coachTariff.findUnique({
    where: { coachId },
    select: TARIFF_SELECT,
  });
  return row ? toTariffClient(row) : null;
}

/** ذخیره تعرفه — فقط خود مربی با نقش تازه از دیتابیس */
export async function saveCoachTariff(
  coachId: string,
  role: string,
  input: unknown
): Promise<CoachTariffClient> {
  if (role !== "COACH") {
    throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  }
  const parsed = coachTariffSchema.parse(input);
  const data = {
    privatePriceIrr: parsed.privatePriceIrr ?? null,
    privatePriceUsd: parsed.privatePriceUsd ?? null,
    semiPrivatePriceIrr: parsed.semiPrivatePriceIrr ?? null,
    semiPrivatePriceUsd: parsed.semiPrivatePriceUsd ?? null,
  };
  const row = await db.coachTariff.upsert({
    where: { coachId },
    create: { coachId, ...data },
    update: data,
    select: TARIFF_SELECT,
  });
  return toTariffClient(row);
}

/** تعرفه‌های چند مربی برای فهرست عمومی — map بر اساس coachId */
export async function tariffsOfCoaches(
  coachIds: string[]
): Promise<Map<string, CoachTariffClient>> {
  if (coachIds.length === 0) return new Map();
  const rows = await db.coachTariff.findMany({
    where: { coachId: { in: coachIds } },
    select: { coachId: true, ...TARIFF_SELECT },
  });
  return new Map(rows.map((r) => [r.coachId, toTariffClient(r)]));
}

/* ------------------------------ درخواست پرداخت ------------------------------ */

export const PAYMENT_STATUSES = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
} as const;

export const PAYMENT_SERVICE_TYPES = ["PRIVATE", "SEMI_PRIVATE"] as const;
export type PaymentServiceType = (typeof PAYMENT_SERVICE_TYPES)[number];

/** لینک امن: فقط https، بدون نویسه کنترلی/فاصله — هیچ تولید لینک ساختگی */
function assertSafeExternalLink(link: string): void {
  if (link.length > PAYMENT_LIMITS.EXTERNAL_LINK_MAX) {
    throw new CoachingError(422, "PAYMENT_LINK_TOO_LONG");
  }
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    throw new CoachingError(422, "PAYMENT_LINK_INVALID");
  }
  if (url.protocol !== "https:") {
    throw new CoachingError(422, "PAYMENT_LINK_INVALID");
  }
  // جلوگیری از تزریق نویسه کنترلی در هدرها/رندر
  if (new RegExp("[\\u0000-\\u001f\\u007f]").test(link)) {
    throw new CoachingError(422, "PAYMENT_LINK_INVALID");
  }
}

export const createPaymentRequestSchema = z.object({
  connectionId: z.string().trim().min(1).max(64),
  serviceType: z.enum(PAYMENT_SERVICE_TYPES, { message: "نوع خدمات معتبر نیست" }),
  amount: z
    .number({ message: "مبلغ نامعتبر است" })
    .int("مبلغ باید عدد صحیح باشد")
    .min(PAYMENT_LIMITS.AMOUNT_MIN, "مبلغ باید مثبت باشد")
    .max(PAYMENT_LIMITS.AMOUNT_MAX, "مبلغ خارج از بازه مجاز است"),
  currency: z.enum(PAYMENT_LIMITS.CURRENCIES, { message: "واحد پول معتبر نیست" }),
  description: z.string().trim().max(PAYMENT_LIMITS.DESCRIPTION_MAX).default(""),
  externalLink: z.string().trim().min(1, "لینک پرداخت الزامی است"),
});

export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;

export interface PaymentRequestClient {
  id: string;
  status: string;
  serviceType: string;
  amount: number;
  currency: string;
  description: string;
  /** لینک فقط برای دانشجوی همان درخواست یا مربی مالک برمیگردد */
  externalLink: string;
  studentConfirmedAt: string | null;
  studentDeclinedAt: string | null;
  createdAt: string;
  coach: { userId: string; displayName: string };
  student: { userId: string; displayName: string };
}

function namesOf(
  id: string,
  names: Map<string, string>
): { userId: string; displayName: string } {
  return { userId: id, displayName: names.get(id) ?? "—" };
}

async function userNamesOf(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rows = await db.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((r) => [r.id, r.name]));
}

function toPaymentClient(
  row: {
    id: string;
    status: string;
    serviceType: string;
    amount: number;
    currency: string;
    description: string;
    externalLink: string;
    studentConfirmedAt: Date | null;
    studentDeclinedAt: Date | null;
    createdAt: Date;
    coachId: string;
    studentId: string;
  },
  names: Map<string, string>
): PaymentRequestClient {
  return {
    id: row.id,
    status: row.status,
    serviceType: row.serviceType,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    externalLink: row.externalLink,
    studentConfirmedAt: row.studentConfirmedAt?.toISOString() ?? null,
    studentDeclinedAt: row.studentDeclinedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    coach: namesOf(row.coachId, names),
    student: namesOf(row.studentId, names),
  };
}

/** ساخت درخواست پرداخت — فقط مربی مالک ارتباط ACTIVE، نوع ارائهشده خودش */
export async function createPaymentRequest(
  coachId: string,
  role: string,
  input: unknown
): Promise<PaymentRequestClient> {
  if (role !== "COACH") {
    throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  }
  const parsed = createPaymentRequestSchema.parse(input);
  assertSafeExternalLink(parsed.externalLink);

  const conn = await db.coachStudentConnection.findUnique({
    where: { id: parsed.connectionId },
    select: { id: true, coachId: true, studentId: true, status: true },
  });
  if (!conn || conn.coachId !== coachId) {
    throw new CoachingError(404, "CONNECTION_NOT_FOUND");
  }
  if (conn.status !== "ACTIVE") {
    throw new CoachingError(409, "CONNECTION_NOT_ACTIVE");
  }
  // نوع خدمات باید واقعاً از انواع ارائهشده خود مربی باشد — نه حدس
  const profile = await db.coachProfile.findUnique({
    where: { userId: coachId },
    select: { cooperationTypesJson: true },
  });
  const offered: string[] = JSON.parse(profile?.cooperationTypesJson ?? "[]");
  if (!offered.includes(parsed.serviceType)) {
    throw new CoachingError(422, "SERVICE_TYPE_NOT_OFFERED");
  }

  const row = await db.paymentRequest.create({
    data: {
      coachId,
      studentId: conn.studentId,
      connectionId: conn.id,
      serviceType: parsed.serviceType,
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
      externalLink: parsed.externalLink,
      status: PAYMENT_STATUSES.PENDING,
    },
  });

  await emitNotification({
    userId: conn.studentId,
    type: NOTIFICATION_TYPES.PAYMENT_REQUEST,
    dedupeKey: `pay-req:${row.id}`,
    payload: { paymentId: row.id, coachId, amount: row.amount, currency: row.currency },
  });

  const names = await userNamesOf([coachId, conn.studentId]);
  return toPaymentClient(row, names);
}

/** فهرست درخواست‌های پرداخت مربی — فقط مالک */
export async function listCoachPayments(coachId: string): Promise<PaymentRequestClient[]> {
  const rows = await db.paymentRequest.findMany({
    where: { coachId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const names = await userNamesOf(rows.flatMap((r) => [r.coachId, r.studentId]));
  return rows.map((r) => toPaymentClient(r, names));
}

/** فهرست درخواست‌های پرداخت دانشجو — فقط مالک */
export async function listStudentPayments(studentId: string): Promise<PaymentRequestClient[]> {
  const rows = await db.paymentRequest.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const names = await userNamesOf(rows.flatMap((r) => [r.coachId, r.studentId]));
  return rows.map((r) => toPaymentClient(r, names));
}

/**
 * تصمیم دانشجو: تأیید یا رد — فقط دانشجوی همان درخواست و فقط در PENDING.
 * تأیید = ثبت پایدار studentConfirmedAt و تغییر وضعیت (نه چک‌باکس ظاهری).
 */
export async function decidePaymentByStudent(
  studentId: string,
  paymentId: string,
  decision: "confirm" | "decline"
): Promise<PaymentRequestClient> {
  const row = await db.paymentRequest.findUnique({ where: { id: paymentId } });
  if (!row || row.studentId !== studentId) {
    throw new CoachingError(404, "PAYMENT_NOT_FOUND");
  }
  if (row.status !== PAYMENT_STATUSES.PENDING) {
    throw new CoachingError(409, "PAYMENT_ALREADY_DECIDED");
  }
  const now = new Date();
  const updated = await db.paymentRequest.update({
    where: { id: paymentId },
    data:
      decision === "confirm"
        ? { status: PAYMENT_STATUSES.CONFIRMED, studentConfirmedAt: now }
        : { status: PAYMENT_STATUSES.DECLINED, studentDeclinedAt: now },
  });
  await emitNotification({
    userId: row.coachId,
    type: NOTIFICATION_TYPES.PAYMENT_STATUS,
    dedupeKey: `pay-status:${row.id}:${updated.status}`,
    payload: { paymentId: row.id, status: updated.status, byStudent: true },
  });
  const names = await userNamesOf([row.coachId, row.studentId]);
  return toPaymentClient(updated, names);
}

/** لغو توسط مربی — فقط مالک؛ تاریخچه حفظ میشود (رکورد CANCELLED میماند) */
export async function cancelPaymentByCoach(
  coachId: string,
  paymentId: string
): Promise<PaymentRequestClient> {
  const row = await db.paymentRequest.findUnique({ where: { id: paymentId } });
  if (!row || row.coachId !== coachId) {
    throw new CoachingError(404, "PAYMENT_NOT_FOUND");
  }
  if (row.status === PAYMENT_STATUSES.CANCELLED) {
    throw new CoachingError(409, "PAYMENT_ALREADY_DECIDED");
  }
  const updated = await db.paymentRequest.update({
    where: { id: paymentId },
    data: { status: PAYMENT_STATUSES.CANCELLED, cancelledAt: new Date() },
  });
  await emitNotification({
    userId: row.studentId,
    type: NOTIFICATION_TYPES.PAYMENT_STATUS,
    dedupeKey: `pay-status:${row.id}:${updated.status}`,
    payload: { paymentId: row.id, status: updated.status },
  });
  const names = await userNamesOf([row.coachId, row.studentId]);
  return toPaymentClient(updated, names);
}
