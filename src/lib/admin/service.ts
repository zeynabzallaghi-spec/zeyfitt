/**
 * منطق سمت سرور ادمین — مرحله ۱۹.۵.
 *
 * قواعد قطعی:
 *  - هر فراخوانی نقش ADMIN را تازه از دیتابیس می‌خواند (requireAdmin).
 *  - هر تغییر نقش/اشتراک/تصمیم، یک رکورد AdminActionLog می‌نویسد.
 *  - ادمین نمی‌تواند نقش خودش را تغییر دهد (قفل‌شدن تنها ادمین ممکن نیست)
 *    و آخرین ادمین باقی‌مانده قابل تنزل نیست.
 *  - اشتراک فقط برای STUDENT معنا دارد (هم‌راستا با manage-coaching)؛
 *    اعطای PREMIUM همان معناشناسی source="manual" + یادداشت شفاف را دارد.
 *  - هیچ مسیری تاریخچه را حذف یا بازنویسی نمی‌کند.
 */

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { CoachingError } from "@/lib/coaching/constants";

/* ------------------------------ گزارش اقدام ------------------------------ */

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  meta: Record<string, unknown> = {}
): Promise<void> {
  await db.adminActionLog.create({
    data: {
      adminId,
      action,
      targetType,
      targetId,
      metaJson: JSON.stringify(meta),
    },
  });
}

/* ------------------------------ نمای کلی ------------------------------ */

export interface AdminOverview {
  users: number;
  students: number;
  coaches: number;
  admins: number;
  premiumActive: number;
  pendingCoachApplications: number;
  pendingPremiumRequests: number;
  openTickets: number;
  exercises: number;
}

export async function adminOverview(): Promise<AdminOverview> {
  const [users, students, coaches, admins, premiumActive, pendingCoachApplications, pendingPremiumRequests, openTickets, exercises] =
    await Promise.all([
      db.user.count(),
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { role: "COACH" } }),
      db.user.count({ where: { role: "ADMIN" } }),
      db.studentSubscription.count({
        where: { tier: "PREMIUM", status: "active", expiresAt: null },
      }),
      db.coachApplication.count({ where: { status: "pending" } }),
      db.premiumUpgradeRequest.count({ where: { status: "pending" } }),
      db.supportTicket.count({ where: { status: { in: ["open", "answered"] } } }),
      db.exercise.count({ where: { status: "active" } }),
    ]);
  return {
    users,
    students,
    coaches,
    admins,
    premiumActive,
    pendingCoachApplications,
    pendingPremiumRequests,
    openTickets,
    exercises,
  };
}

/* ------------------------------ کاربران ------------------------------ */

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  tier: string;
  premiumExpired: boolean;
  expiresAt: string | null;
  hasCoachProfile: boolean;
}

const USERS_PAGE_SIZE = 30;

export async function adminUsersList(
  q: string | undefined,
  role: string | undefined,
  page: number
): Promise<{ rows: AdminUserRow[]; total: number; page: number; pageSize: number }> {
  const where: Prisma.userWhereInput = {};
  if (q) {
    where.OR = [
      { email: { contains: q } },
      { name: { contains: q } },
    ];
  }
  if (role) where.role = role;
  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        subscription: {
          select: { tier: true, status: true, expiresAt: true },
        },
        coachProfile: { select: { userId: true } },
      },
      take: USERS_PAGE_SIZE,
      skip: (page - 1) * USERS_PAGE_SIZE,
    }),
  ]);
  const now = Date.now();
  return {
    total,
    page,
    pageSize: USERS_PAGE_SIZE,
    rows: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      tier: u.subscription?.tier ?? "FREE",
      premiumExpired:
        u.subscription?.expiresAt != null &&
        u.subscription.expiresAt.getTime() < now,
      expiresAt: u.subscription?.expiresAt?.toISOString() ?? null,
      hasCoachProfile: u.coachProfile != null,
    })),
  };
}

/** تغییر نقش — با محافظت خود-ادمین و آخرین-ادمین */
export async function adminSetRole(
  adminId: string,
  targetUserId: string,
  role: string
): Promise<{ id: string; role: string }> {
  if (targetUserId === adminId) {
    throw new CoachingError(409, "ADMIN_SELF_ROLE_FORBIDDEN");
  }
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });
  if (!target) throw new CoachingError(404, "USER_NOT_FOUND");
  if (target.role === role) {
    // بدون تغییر — بازگشت بی‌اثر (idempotent)
    return { id: target.id, role: target.role };
  }
  if (target.role === "ADMIN" && role !== "ADMIN") {
    const admins = await db.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) throw new CoachingError(409, "LAST_ADMIN_FORBIDDEN");
  }
  const updated = await db.user.update({
    where: { id: target.id },
    data: { role },
    select: { id: true, role: true },
  });
  await logAdminAction(adminId, "set-role", "user", target.id, {
    from: target.role,
    to: role,
  });
  return updated;
}

/* ------------------------------ اشتراک ------------------------------ */

function expiryFromDays(days: number | null | undefined): Date | null {
  return days != null ? new Date(Date.now() + days * 86_400_000) : null;
}

/** اعطا/لغو دستی اشتراک — همان معناشناسی manage-coaching */
export async function adminSetSubscription(
  adminId: string,
  targetUserId: string,
  tier: "FREE" | "PREMIUM",
  days: number | null | undefined,
  note: string | undefined
): Promise<{ tier: string; expiresAt: string | null }> {
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true },
  });
  if (!target) throw new CoachingError(404, "USER_NOT_FOUND");
  if (target.role !== "STUDENT") {
    throw new CoachingError(409, "SUBSCRIPTION_STUDENT_ONLY");
  }
  if (tier === "FREE") {
    const row = await db.studentSubscription.upsert({
      where: { userId: target.id },
      create: { userId: target.id, tier: "FREE", status: "active", source: "system" },
      update: { tier: "FREE", status: "active", source: "system", note: null, expiresAt: null },
    });
    await logAdminAction(adminId, "revoke-premium", "user", target.id, {});
    return { tier: row.tier, expiresAt: null };
  }
  const expiresAt = expiryFromDays(days ?? null);
  const row = await db.studentSubscription.upsert({
    where: { userId: target.id },
    create: {
      userId: target.id,
      tier: "PREMIUM",
      status: "active",
      source: "manual",
      note: note ?? null,
      startsAt: new Date(),
      expiresAt,
    },
    update: {
      tier: "PREMIUM",
      status: "active",
      source: "manual",
      note: note ?? null,
      startsAt: new Date(),
      expiresAt,
    },
  });
  await logAdminAction(adminId, "grant-premium", "user", target.id, {
    days: days ?? null,
    note: note ?? null,
  });
  return { tier: row.tier, expiresAt: row.expiresAt?.toISOString() ?? null };
}

/* ------------------------------ درخواست مربی‌گری ------------------------------ */

export interface AdminApplicationRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  message: string | null;
  experienceYears: number | null;
  certifications: string[];
  createdAt: string;
  decidedAt: string | null;
}

export async function adminCoachApplications(
  status: string | undefined
): Promise<AdminApplicationRow[]> {
  const rows = await db.coachApplication.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    status: r.status,
    message: r.message,
    experienceYears: r.experienceYears,
    certifications: safeStringArray(r.certificationsJson),
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  }));
}

function safeStringArray(json: string): string[] {
  try {
    const v: unknown = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** تصمیم روی درخواست مربی‌گری — تأیید یعنی role=COACH + پروفایل verified */
export async function adminDecideCoachApplication(
  adminId: string,
  applicationId: string,
  decision: "approved" | "rejected",
  opts: { note?: string; publish?: boolean } = {}
): Promise<{ status: string; role: string | null }> {
  const app = await db.coachApplication.findUnique({
    where: { id: applicationId },
    include: { user: { select: { id: true, name: true, role: true } } },
  });
  if (!app) throw new CoachingError(404, "APPLICATION_NOT_FOUND");
  if (app.status !== "pending") {
    throw new CoachingError(409, "APPLICATION_ALREADY_DECIDED");
  }

  if (decision === "rejected") {
    const row = await db.coachApplication.update({
      where: { id: app.id },
      data: {
        status: "rejected",
        decidedAt: new Date(),
        decidedBy: adminId,
      },
      select: { status: true },
    });
    await logAdminAction(adminId, "reject-coach-application", "coach-application", app.id, {
      userId: app.userId,
      note: opts.note ?? null,
    });
    return { status: row.status, role: null };
  }

  // تأیید — تراکنش: نقش + درخواست + پروفایل اولیه verified
  const displayName = app.user.name;
  const result = await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: app.userId },
      data: { role: "COACH" },
    });
    await tx.coachApplication.update({
      where: { id: app.id },
      data: { status: "approved", decidedAt: new Date(), decidedBy: adminId },
    });
    await tx.coachProfile.upsert({
      where: { userId: app.userId },
      create: {
        userId: app.userId,
        displayName,
        verified: true,
        published: false,
      },
      update: { verified: true },
    });
    return tx.coachProfile.findUnique({
      where: { userId: app.userId },
      select: { published: true, bio: true, cooperationTypesJson: true, displayName: true },
    });
  });

  let published = result?.published ?? false;
  if (opts.publish) {
    // انتشار فقط با پروفایل کامل — همان قاعده manage-coaching
    const complete =
      (result?.displayName ?? displayName).trim().length >= 2 &&
      result?.bio != null &&
      result.bio.trim().length >= 20 &&
      (() => {
        try {
          const arr: unknown = JSON.parse(result?.cooperationTypesJson ?? "[]");
          return Array.isArray(arr) && arr.length >= 1;
        } catch {
          return false;
        }
      })();
    if (complete) {
      await db.coachProfile.update({
        where: { userId: app.userId },
        data: { published: true },
      });
      published = true;
    }
  }

  await logAdminAction(adminId, "approve-coach-application", "coach-application", app.id, {
    userId: app.userId,
    published,
    note: opts.note ?? null,
  });
  return { status: "approved", role: "COACH" };
}

/* ------------------------------ درخواست Premium ------------------------------ */

export interface AdminPremiumRequestRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: string;
  message: string | null;
  decidedNote: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export async function adminPremiumRequests(
  status: string | undefined
): Promise<AdminPremiumRequestRow[]> {
  const rows = await db.premiumUpgradeRequest.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true, role: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    status: r.status,
    message: r.message,
    decidedNote: r.decidedNote,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
  }));
}

/** تصمیم روی درخواست Premium — تأیید همان اعطای دستی اشتراک را انجام می‌دهد */
export async function adminDecidePremiumRequest(
  adminId: string,
  requestId: string,
  decision: "approved" | "rejected",
  opts: { note?: string; days?: number | null } = {}
): Promise<{ status: string; tier: string | null }> {
  const reqRow = await db.premiumUpgradeRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, role: true } } },
  });
  if (!reqRow) throw new CoachingError(404, "REQUEST_NOT_FOUND");
  if (reqRow.status !== "pending") {
    throw new CoachingError(409, "REQUEST_ALREADY_DECIDED");
  }
  if (decision === "rejected") {
    const row = await db.premiumUpgradeRequest.update({
      where: { id: reqRow.id },
      data: {
        status: "rejected",
        decidedAt: new Date(),
        decidedBy: adminId,
        decidedNote: opts.note ?? null,
      },
      select: { status: true },
    });
    await logAdminAction(adminId, "reject-premium-request", "premium-request", reqRow.id, {
      userId: reqRow.userId,
      note: opts.note ?? null,
    });
    return { status: row.status, tier: null };
  }

  // تأیید — اشتراک فقط برای STUDENT
  if (reqRow.user.role !== "STUDENT") {
    throw new CoachingError(409, "SUBSCRIPTION_STUDENT_ONLY");
  }
  const expiresAt = expiryFromDays(opts.days ?? null);
  await db.$transaction(async (tx) => {
    await tx.premiumUpgradeRequest.update({
      where: { id: reqRow.id },
      data: {
        status: "approved",
        decidedAt: new Date(),
        decidedBy: adminId,
        decidedNote: opts.note ?? null,
      },
    });
    await tx.studentSubscription.upsert({
      where: { userId: reqRow.userId },
      create: {
        userId: reqRow.userId,
        tier: "PREMIUM",
        status: "active",
        source: "manual",
        note: opts.note ?? "درخواست تأییدشده",
        startsAt: new Date(),
        expiresAt,
      },
      update: {
        tier: "PREMIUM",
        status: "active",
        source: "manual",
        note: opts.note ?? "درخواست تأییدشده",
        startsAt: new Date(),
        expiresAt,
      },
    });
  });
  await logAdminAction(adminId, "approve-premium-request", "premium-request", reqRow.id, {
    userId: reqRow.userId,
    days: opts.days ?? null,
    note: opts.note ?? null,
  });
  return { status: "approved", tier: "PREMIUM" };
}

/* ------------------------------ تیکت‌های پشتیبانی ------------------------------ */

export interface AdminTicketRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

export async function adminTickets(
  status: string | undefined
): Promise<AdminTicketRow[]> {
  const rows = await db.supportTicket.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true, email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    category: r.category,
    subject: r.subject,
    body: r.body,
    status: r.status,
    reply: r.reply,
    repliedAt: r.repliedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

const TICKET_TRANSITIONS: Record<string, string[]> = {
  open: ["answered", "resolved", "closed"],
  answered: ["resolved", "closed", "open"],
  resolved: [],
  closed: [],
};

/** پاسخ ادمین و/یا انتقال وضعیت — با اعتبارسنجی ماشین وضعیت */
export async function adminUpdateTicket(
  adminId: string,
  ticketId: string,
  input: { reply?: string; status?: string }
): Promise<AdminTicketRow> {
  const ticket = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!ticket) throw new CoachingError(404, "TICKET_NOT_FOUND");
  if (input.status && !TICKET_TRANSITIONS[ticket.status]?.includes(input.status)) {
    throw new CoachingError(409, "TICKET_INVALID_TRANSITION");
  }
  if (
    input.status === "resolved" &&
    !input.reply &&
    ticket.reply == null
  ) {
    // حل‌کردن بدون هیچ پاسخی — غیرمجاز: کاربر پاسخی دریافت نکرده است
    throw new CoachingError(409, "TICKET_RESOLVE_NEEDS_REPLY");
  }
  const row = await db.supportTicket.update({
    where: { id: ticket.id },
    data: {
      ...(input.reply !== undefined
        ? { reply: input.reply, repliedAt: new Date(), repliedBy: adminId }
        : {}),
      // پاسخ بدون تعیین وضعیت صریح — در حالت open یعنی answered (ماشین وضعیت)
      ...(input.status
        ? { status: input.status, closedAt: input.status === "closed" || input.status === "resolved" ? new Date() : null }
        : input.reply !== undefined && ticket.status === "open"
          ? { status: "answered" }
          : {}),
    },
    include: { user: { select: { name: true, email: true } } },
  });
  await logAdminAction(adminId, "update-ticket", "support-ticket", ticket.id, {
    status: input.status ?? null,
    replied: input.reply !== undefined,
  });
  return {
    id: row.id,
    userId: row.userId,
    userName: row.user.name,
    userEmail: row.user.email,
    category: row.category,
    subject: row.subject,
    body: row.body,
    status: row.status,
    reply: row.reply,
    repliedAt: row.repliedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
