/**
 * سرویس پیام‌رسانی خصوصی مربی و دانشجو — مرحله ۱۷.
 *
 * مرجع واحد مجوز و مالکیت (بدون سیستم موازی؛ بر بستر ارتباطهای مرحله ۱۵):
 *  - «خواندن» مکالمه و تاریخچه: هر طرف مکالمه (studentId/coachId) — همیشه،
 *    حتی پس از پایان ارتباط یا انقضای اشتراک (سیاست شفاف حفظ تاریخچه،
 *    همان سیاست برنامه‌های اختصاصی مرحله ۱۶).
 *  - «ارسال» پیام جدید: ماتریس کامل سمت سرور — نشست معتبر، نقش تازه از
 *    دیتابیس متناسب با سمت کاربر، ارتباط ACTIVE متعلق به همان جفت، سطح
 *    مؤثر PREMIUM دانشجو (سیاست مرحله ۱۵) و تأیید مربی‌گری سمت مربی.
 *  - senderId فقط از نشست سرور؛ هر مقدار کلاینتی حذف میشود (شِمای Zod).
 *  - «مالک نبودن» و «ناموجود بودن» هر دو 404 تا هیچ وجودی افشا نشود.
 *  - ترتیب پایدار پیام‌ها با شمارنده seq مکالمه (نه ساعت کلاینت).
 *  - محدودسازی نرخ ارسال شمارش دیتابیسی پیام‌های واقعی کاربر است.
 */

import { db } from "@/lib/db";
import {
  CHAT_LIMITS,
  CONNECTION_STATUSES,
  CoachingError,
  type ChatBlockReason,
} from "./constants";
import { hasActivePremium } from "./subscription";
import { emitNotification, NOTIFICATION_TYPES } from "@/lib/notifications/notifications";
import type { CoachConversation, CoachMessage, CoachStudentConnection } from "@prisma/client";

/* ------------------------------ ابزارهای پایه ------------------------------ */

function isP2002(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

/** سمت کاربر در ارتباط — تنها با تطبیق شناسه‌های ذخیره‌شده رکورد */
function sideOfUser(
  conn: { studentId: string; coachId: string },
  userId: string
): "student" | "coach" | null {
  if (conn.studentId === userId) return "student";
  if (conn.coachId === userId) return "coach";
  return null;
}

/**
 * دلیل مسدود بودن ارسال — همه داده‌ها تازه از دیتابیس؛ هیچ وضعیتی از
 * کلاینت یا نشست قدیمی پذیرفته نمیشود. null یعنی ارسال مجاز است.
 *
 * سیاست گفت‌وگوی اولیه (مرحله ۱۹.۶): ارتباط PENDING هم قابل گفت‌وگوست —
 * مربی میتواند پیش از تأیید/رد با متقاضی صحبت کند؛ شروع گفت‌وگو هرگز
 * درخواست را خودکار تأیید نمیکند و تصمیم جداگانه است.
 *
 * سیاست اشتراک (هم‌راستا با مرحله ۱۶): سطح مؤثر PREMIUM «دانشجوی همان
 * ارتباط» شرط هر پیام جدید در مکالمه است — هم سمت دانشجو و هم سمت مربی؛
 * انقضای اشتراک، ارسال جدید را در هر دو جهت با پیام شفاف می‌بندد و
 * تاریخچه دست‌نخورده فقط‌خواندنی میماند.
 *
 * مسدودسازی پیام‌رسان (مرحله ۱۹.۶): اگر مربی دانشجوی این ارتباط را مسدود
 * کرده باشد، دانشجو نمیتواند پیام جدیدی بفرستد (در گفت‌وگوی اولیه و فعال
 * یکسان)؛ پیام‌های قبلی و تاریخچه حفظ میشود و رابطه/اشتراک/برنامه‌ها
 * دست‌نخورده میمانند.
 */
export async function blockReasonForSend(
  conn: { status: string; studentId: string; coachId: string },
  user: { id: string; role: string }
): Promise<ChatBlockReason | null> {
  const side = sideOfUser(conn, user.id);
  if (side === null) return "ROLE_NOT_ALLOWED";
  if (
    conn.status !== CONNECTION_STATUSES.ACTIVE &&
    conn.status !== CONNECTION_STATUSES.PENDING
  ) {
    return "CONNECTION_CLOSED";
  }
  if (side === "student") {
    if (user.role !== "STUDENT") return "ROLE_NOT_ALLOWED";
  } else {
    // سمت مربی — نقش و تأیید مربی‌گری باید همین لحظه معتبر باشند
    if (user.role !== "COACH") return "ROLE_NOT_ALLOWED";
    const profile = await db.coachProfile.findUnique({
      where: { userId: conn.coachId },
      select: { verified: true },
    });
    if (!profile?.verified) return "COACH_NOT_VERIFIED";
  }
  // مسدودسازی — فقط دانشجوی مسدودشده سمت مربی نمیتواند بفرستد؛ مربی
  // مسدودکننده همچنان میتواند پیام بفرستد (سیاست یکطرفه بودن مسدودی)
  if (side === "student") {
    const blocked = await db.chatBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: conn.coachId, blockedId: conn.studentId } },
      select: { id: true },
    });
    if (blocked) return "CHAT_BLOCKED";
  }
  // سطح مؤثر اشتراک دانشجوی همین ارتباط — در هر دو جهت ارسال
  if (!(await hasActivePremium(conn.studentId))) return "SUBSCRIPTION_REQUIRED";
  return null;
}

/* ------------------------------ ساخت تنبل مکالمه ------------------------------ */

/**
 * تضمین وجود رکورد مکالمه برای ارتباط — یکتا با unique(connectionId).
 * رقابت دو گشودن همزمان با P2002 گرفته و با خواندن مجدد حل میشود.
 */
export async function ensureConversation(
  conn: Pick<CoachStudentConnection, "id" | "studentId" | "coachId">
): Promise<CoachConversation> {
  const existing = await db.coachConversation.findUnique({
    where: { connectionId: conn.id },
  });
  if (existing) return existing;
  try {
    return await db.coachConversation.create({
      data: {
        connectionId: conn.id,
        studentId: conn.studentId,
        coachId: conn.coachId,
      },
    });
  } catch (error) {
    if (isP2002(error)) {
      const row = await db.coachConversation.findUnique({
        where: { connectionId: conn.id },
      });
      if (row) return row;
    }
    throw error;
  }
}

/** بارگذاری ارتباط با بررسی طرف بودن کاربر — غیرطرف و ناموجود هر دو 404 */
async function connectionForParty(
  connectionId: string,
  userId: string
): Promise<CoachStudentConnection> {
  const conn = await db.coachStudentConnection.findUnique({
    where: { id: connectionId },
  });
  if (!conn || sideOfUser(conn, userId) === null) {
    throw new CoachingError(404, "CONVERSATION_NOT_FOUND");
  }
  return conn;
}

/* ------------------------------ نمای مکالمه ------------------------------ */

export interface ChatConversationView {
  /** null در فهرست برای ارتباط ACTIVE که هنوز گفت‌وگویی آغاز نشده */
  conversationId: string | null;
  connectionId: string;
  connectionStatus: string;
  cooperationType: string;
  /** سمت کاربر جاری در این مکالمه */
  side: "student" | "coach";
  counterpart: { userId: string; displayName: string };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  canSend: boolean;
  /** کد پایدار دلیل مسدودی ارسال — ترجمه در server-messages */
  blockReason: ChatBlockReason | null;
  openedAt: string | null;
}

export interface ChatMessageAttachmentView {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface ChatMessageView {
  id: string;
  seq: number;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
  /** پیوستهای پیام — فقط metadata؛ بایتها از مسیر جداگانه مالکیتمحور */
  attachments: ChatMessageAttachmentView[];
}

export interface ChatMessagesPage {
  conversation: ChatConversationView;
  messages: ChatMessageView[];
  /** آیا صفحه قدیمی‌تر دیگری وجود دارد (برای دکمه بارگذاری قدیمی‌ترها) */
  hasMoreOlder: boolean;
}

function previewOf(content: string): string {
  const compact = content.replace(/\s+/g, " ").trim();
  if (compact.length <= CHAT_LIMITS.PREVIEW_MAX) return compact;
  return `${compact.slice(0, CHAT_LIMITS.PREVIEW_MAX - 1)}…`;
}

function toMessageView(row: CoachMessage & { attachments?: { id: string; fileName: string; mimeType: string; sizeBytes: number }[] }): ChatMessageView {
  return {
    id: row.id,
    seq: row.seq,
    senderId: row.senderId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    attachments: (row.attachments ?? []).map((a) => ({
      id: a.id,
      fileName: a.fileName,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
  };
}

/* ------------------------------ فهرست مکالمه‌ها ------------------------------ */

interface ListEntryInput extends ChatConversationView {
  /** مبنای مرتب‌سازی فهرست — زمان آخرین فعالیت */
  activity: number;
}

function lastActivityOf(conn: CoachStudentConnection, conv: CoachConversation | null): number {
  if (conv?.lastMessageAt) return conv.lastMessageAt.getTime();
  if (conn.status === CONNECTION_STATUSES.ACTIVE) {
    return (conn.decidedAt ?? conn.requestedAt).getTime();
  }
  return (conn.endedAt ?? conn.decidedAt ?? conn.requestedAt).getTime();
}

/**
 * فهرست مکالمه‌های کاربر جاری — هر دو سمت (دانشجو/مربی).
 *
 * ورودی‌ها: هر ارتباط ACTIVE (حتی بدون پیام — امکان آغاز گفت‌وگو) به‌علاوه
 * هر ارتباط پایانیافته که مکالمه‌ای با سابقه دارد (تاریخچه فقط‌خواندنی).
 * ارتباطهای پایانیافته بدون هیچ پیامی فهرست نمیشوند — چیزی برای نمایش
 * وجود ندارد و هیچ رکورد نمایشی ساختگی ساخته نمیشود.
 */
export async function listConversationsForUser(user: {
  id: string;
  role: string;
}): Promise<ChatConversationView[]> {
  const conns = await db.coachStudentConnection.findMany({
    where: { OR: [{ studentId: user.id }, { coachId: user.id }] },
    orderBy: { requestedAt: "desc" },
    take: CHAT_LIMITS.LIST_MAX * 2,
  });
  const convs = await db.coachConversation.findMany({
    where: { OR: [{ studentId: user.id }, { coachId: user.id }] },
  });
  const convByConnection = new Map(convs.map((c) => [c.connectionId, c]));
  // گفت‌وگوی اولیه (۱۹.۶): ارتباط PENDING هم ورودی فهرست است — حتی بدون پیام؛
  // پایانیافتهها فقط با سابقه واقعی (سیاست حفظ تاریخچه)
  const eligible = conns.filter(
    (c) =>
      c.status === CONNECTION_STATUSES.ACTIVE ||
      c.status === CONNECTION_STATUSES.PENDING ||
      convByConnection.has(c.id)
  );
  if (eligible.length === 0) return [];

  // نام نمایشی طرف مقابل — مربی از پروفایل عمومی، دانشجو از نام حساب
  const coachIds = eligible.filter((c) => c.studentId === user.id).map((c) => c.coachId);
  const studentIds = eligible.filter((c) => c.coachId === user.id).map((c) => c.studentId);
  // اشتراک دانشجوی هر ارتباط سمت مربی — سیاست مرحله ۱۶: هر پیام جدید
  // (در هر دو جهت) به سطح مؤثر PREMIUM دانشجوی همان ارتباط نیاز دارد
  const counterpartStudentIds = [
    ...new Set(
      eligible
        .filter(
          (c) =>
            c.coachId === user.id &&
            (c.status === CONNECTION_STATUSES.ACTIVE || c.status === CONNECTION_STATUSES.PENDING)
        )
        .map((c) => c.studentId)
    ),
  ];
  const [coachProfiles, studentUsers, mySubscription, myCoachProfile, counterpartSubs] =
    await Promise.all([
      coachIds.length
        ? db.coachProfile.findMany({
            where: { userId: { in: [...new Set(coachIds)] } },
            select: { userId: true, displayName: true },
          })
        : Promise.resolve(
            [] as { userId: string; displayName: string }[]
          ),
      studentIds.length
        ? db.user.findMany({
            where: { id: { in: [...new Set(studentIds)] } },
            select: { id: true, name: true },
          })
        : Promise.resolve([] as { id: string; name: string }[]),
      // ارزیابی مجوز فقط برای سمت‌های واقعی همین کاربر
      eligible.some((c) => c.studentId === user.id)
        ? hasActivePremium(user.id)
        : Promise.resolve(false),
      eligible.some((c) => c.coachId === user.id)
        ? db.coachProfile.findUnique({
            where: { userId: user.id },
            select: { verified: true },
          })
        : Promise.resolve(null),
      counterpartStudentIds.length
        ? db.studentSubscription.findMany({
            where: { userId: { in: counterpartStudentIds } },
            select: { userId: true, tier: true, status: true, expiresAt: true },
          })
        : Promise.resolve(
            [] as { userId: string; tier: string; status: string; expiresAt: Date | null }[]
          ),
    ]);
  const coachName = new Map(coachProfiles.map((c) => [c.userId, c.displayName]));
  const studentName = new Map(studentUsers.map((u) => [u.id, u.name]));

  const realIds = eligible
    .map((c) => convByConnection.get(c.id)?.id)
    .filter((v): v is string => Boolean(v));
  const [unreadGroups, lastMessages] = await Promise.all([
    realIds.length
      ? db.coachMessage.groupBy({
          by: ["conversationId"],
          where: {
            conversationId: { in: realIds },
            senderId: { not: user.id },
            readAt: null,
          },
          _count: { _all: true },
        })
      : Promise.resolve(
          [] as { conversationId: string; _count: { _all: number } }[]
        ),
    realIds.length
      ? db.coachMessage.findMany({
          where: { conversationId: { in: realIds } },
          orderBy: { seq: "desc" },
          distinct: ["conversationId"],
        })
      : Promise.resolve([] as CoachMessage[]),
  ]);
  const unreadByConv = new Map(unreadGroups.map((g) => [g.conversationId, g._count._all]));
  const previewByConv = new Map(lastMessages.map((m) => [m.conversationId, m.content]));

  const roleForStudentSide = user.role === "STUDENT";
  const coachVerified = myCoachProfile?.verified ?? false;
  // مسدودسازی‌های من به‌عنوان مربی — برای شفافیت canSend سمت دانشجو نیست؛
  // سمت دانشجو وضعیت مسدودی از blockReasonForSend در گشودن/ارسال میآید،
  // اما برای فهرست هم به‌ازای هر ارتباط PENDING/ACTIVE محاسبه میکنیم
  const myBlocks = await db.chatBlock.findMany({
    where: { blockerId: user.id },
    select: { blockedId: true },
  });
  const blockedByMe = new Set(myBlocks.map((b) => b.blockedId));
  // سطح مؤثر اشتراک دانشجویان — محاسبه قطعی انقضا در همین‌جا (بدون حافظه)
  const now = Date.now();
  const counterpartPremium = new Map(
    counterpartSubs.map((sub) => [
      sub.userId,
      sub.tier === "PREMIUM" &&
        sub.status === "active" &&
        (sub.expiresAt === null || sub.expiresAt.getTime() > now),
    ])
  );

  const entries: ListEntryInput[] = eligible.map((conn) => {
    const conv = convByConnection.get(conn.id) ?? null;
    const side = sideOfUser(conn, user.id) as "student" | "coach";
    let canSend = false;
    let blockReason: ChatBlockReason | null;
    if (
      conn.status !== CONNECTION_STATUSES.ACTIVE &&
      conn.status !== CONNECTION_STATUSES.PENDING
    ) {
      blockReason = "CONNECTION_CLOSED";
    } else if (side === "student") {
      if (!roleForStudentSide) {
        blockReason = "ROLE_NOT_ALLOWED";
      } else if (blockedByMe.has(conn.coachId)) {
        // دانشجو هرگز خودش مربی را مسدود نمیکند — دفاعی
        blockReason = "CHAT_BLOCKED";
      } else if (!mySubscription) {
        blockReason = "SUBSCRIPTION_REQUIRED";
      } else {
        canSend = true;
        blockReason = null;
      }
    } else {
      if (user.role !== "COACH") {
        blockReason = "ROLE_NOT_ALLOWED";
      } else if (!coachVerified) {
        blockReason = "COACH_NOT_VERIFIED";
      } else if (!(counterpartPremium.get(conn.studentId) ?? false)) {
        blockReason = "SUBSCRIPTION_REQUIRED";
      } else {
        // مربیِ مسدودکننده همچنان میتواند بفرستد (مسدودی یکطرفه است؛
        // مدیریت مسدودی در UI جداگانه انجام میشود)
        canSend = true;
        blockReason = null;
      }
    }
    const previewRaw = conv ? previewByConv.get(conv.id) : undefined;
    const entry: ListEntryInput = {
      conversationId: conv?.id ?? null,
      connectionId: conn.id,
      connectionStatus: conn.status,
      cooperationType: conn.cooperationType,
      side,
      counterpart: {
        userId: side === "student" ? conn.coachId : conn.studentId,
        displayName:
          side === "student"
            ? (coachName.get(conn.coachId) ?? "—")
            : (studentName.get(conn.studentId) ?? "—"),
      },
      lastMessageAt: conv?.lastMessageAt ? conv.lastMessageAt.toISOString() : null,
      lastMessagePreview: previewRaw !== undefined ? previewOf(previewRaw) : null,
      unreadCount: conv ? (unreadByConv.get(conv.id) ?? 0) : 0,
      canSend,
      blockReason,
      openedAt: conv ? conv.createdAt.toISOString() : null,
      activity: lastActivityOf(conn, conv),
    };
    return entry;
  });

  entries.sort((a, b) => b.activity - a.activity);

  return entries.slice(0, CHAT_LIMITS.LIST_MAX);
}

/* ------------------------------ گشودن گفت‌وگو ------------------------------ */

/**
 * گشودن (یا بازگشت) مکالمه یک ارتباط — نقطه ورود UI.
 * گفت‌وگوی اولیه (۱۹.۶): ارتباط PENDING هم قابل گشودن است.
 * سیاست دسترسی:
 *  - مکالمه موجود: هر طرف همیشه میتواند بازش کند (تاریخچه حفظ میشود) —
 *    حتی پس از رد/پایان ارتباط یا مسدودی؛ canSend=false و blockReason
 *    شفاف در پاسخ میآید.
 *  - مکالمه ناموجود: فقط کاربرِ دارای مجوز ارسال مکالمه میسازد؛ شروع
 *    گفت‌وگو هرگز درخواست را خودکار تأیید نمیکند.
 */
export async function openConversation(
  connectionId: string,
  user: { id: string; role: string }
): Promise<ChatConversationView> {
  const conn = await connectionForParty(connectionId, user.id);
  const existing = await db.coachConversation.findUnique({
    where: { connectionId: conn.id },
  });
  const blockReason = await blockReasonForSend(conn, user);
  if (!existing) {
    if (blockReason) {
      throw new CoachingError(403, blockReason);
    }
    const conv = await ensureConversation(conn);
    return conversationViewOf(conv, conn, user);
  }
  // مکالمه موجود — خواندن تاریخچه همیشه مجاز؛ ارسال طبق blockReason
  return conversationViewOf(existing, conn, user);
}

/** نمای کامل یک مکالمه واقعی برای یکی از دو طرف */
export async function conversationViewOf(
  conv: CoachConversation,
  conn: CoachStudentConnection,
  user: { id: string; role: string },
  unreadCount = 0
): Promise<ChatConversationView> {
  const side = sideOfUser(conn, user.id) as "student" | "coach";
  const blockReason = await blockReasonForSend(conn, user);
  let counterpartName = "—";
  if (side === "student") {
    const profile = await db.coachProfile.findUnique({
      where: { userId: conn.coachId },
      select: { displayName: true },
    });
    counterpartName = profile?.displayName ?? "—";
  } else {
    const row = await db.user.findUnique({
      where: { id: conn.studentId },
      select: { name: true },
    });
    counterpartName = row?.name ?? "—";
  }
  return {
    conversationId: conv.id,
    connectionId: conn.id,
    connectionStatus: conn.status,
    cooperationType: conn.cooperationType,
    side,
    counterpart: { userId: side === "student" ? conn.coachId : conn.studentId, displayName: counterpartName },
    lastMessageAt: conv.lastMessageAt ? conv.lastMessageAt.toISOString() : null,
    lastMessagePreview: null,
    unreadCount,
    canSend: blockReason === null,
    blockReason,
    openedAt: conv.createdAt.toISOString(),
  };
}

/* ------------------------------ پیام‌ها ------------------------------ */

/** مکالمه برای طرف — غیرطرف و ناموجود هر دو 404 (بدون افشای وجود) */
async function conversationForParty(
  conversationId: string,
  userId: string
): Promise<CoachConversation> {
  const conv = await db.coachConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conv || (conv.studentId !== userId && conv.coachId !== userId)) {
    throw new CoachingError(404, "CONVERSATION_NOT_FOUND");
  }
  return conv;
}

/**
 * ثبت خوانده‌شدن پیام‌های طرف مقابل — تنها نقطه تغییر readAt در کل سیستم.
 * «خواندن» یعنی واکشی موفق پیام‌ها توسط گیرنده از سرور؛ هیچ مسیر کلاینتی
 * برای دستکاری مستقل readAt وجود ندارد.
 */
async function markOthersMessagesRead(conversationId: string, userId: string): Promise<void> {
  await db.coachMessage.updateMany({
    where: { conversationId, senderId: { not: userId }, readAt: null },
    data: { readAt: new Date() },
  });
}

/**
 * واکشی صفحه‌بندی‌شده پیام‌ها با مکان‌یاب پایدار seq.
 *  - بدون مکان‌یاب: آخرین صفحه (جدیدترین‌ها) به ترتیب زمانی
 *  - before: صفحه قدیمی‌تر برای مرور تاریخچه
 *  - after: فقط پیام‌های جدیدتر (polling) — بدون تکرار و بدون جابجایی
 */
export async function listMessages(
  conversationId: string,
  user: { id: string; role: string },
  query: { before?: number; after?: number; limit?: number }
): Promise<ChatMessagesPage> {
  const conv = await conversationForParty(conversationId, user.id);
  const conn = await db.coachStudentConnection.findUnique({
    where: { id: conv.connectionId },
  });
  if (!conn) {
    // ارتباط حذفشده بدون مکالمه نمیماند (کاسکید) — دفاعی
    throw new CoachingError(404, "CONVERSATION_NOT_FOUND");
  }
  await markOthersMessagesRead(conv.id, user.id);
  const take = query.limit ?? CHAT_LIMITS.PAGE_DEFAULT;
  let rows: (CoachMessage & { attachments: { id: string; fileName: string; mimeType: string; sizeBytes: number }[] })[];
  const include = { attachments: { orderBy: { createdAt: "asc" as const } } } as const;
  if (query.after !== undefined) {
    rows = await db.coachMessage.findMany({
      where: { conversationId: conv.id, seq: { gt: query.after } },
      orderBy: { seq: "asc" },
      take,
      include,
    });
  } else if (query.before !== undefined) {
    rows = await db.coachMessage.findMany({
      where: { conversationId: conv.id, seq: { lt: query.before } },
      orderBy: { seq: "desc" },
      take,
      include,
    });
    rows.reverse();
  } else {
    rows = await db.coachMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { seq: "desc" },
      take,
      include,
    });
    rows.reverse();
  }
  const oldest = rows.length > 0 ? rows[0].seq : null;
  const hasMoreOlder =
    oldest !== null &&
    (await db.coachMessage.count({
      where: { conversationId: conv.id, seq: { lt: oldest } },
      take: 1,
    })) > 0;
  const view = await conversationViewOf(conv, conn, user);
  return {
    conversation: view,
    messages: rows.map(toMessageView),
    hasMoreOlder,
  };
}

/* ------------------------------ ارسال پیام ------------------------------ */

/**
 * محدودسازی نرخ ارسال — شمارش دیتابیسی پیام‌های واقعی کاربر در یک دقیقه؛
 * پس از ری‌استارت سرور هم معتبر است و هر پیام ذخیره‌شده در شمارش میآید.
 */
export async function assertSendRateAllowed(senderId: string): Promise<void> {
  const minuteAgo = new Date(Date.now() - 60_000);
  const sent = await db.coachMessage.count({
    where: { senderId, createdAt: { gte: minuteAgo } },
  });
  if (sent >= CHAT_LIMITS.SEND_RATE_PER_MINUTE) {
    throw new CoachingError(429, "RATE_LIMITED");
  }
}

/**
 * ارسال پیام — قلب مجوز مرحله ۱۷ + پیوست فایل مرحله ۱۹.۶.
 * ترتیب کامل بررسی: طرف بودن مکالمه (404) → ماتریس ارسال با داده تازه
 * دیتابیس (403) → نرخ‌سنجی (429) → تراکنش نوشتن با بازبینی مجدد وضعیت
 * ارتباط درون تراکنش (403 در تغییر همزمان) و تخصیص seq پایدار.
 * readAt ارسالی کلاینت و هر فیلد دیگر نادیده گرفته میشود.
 *
 * پیوست (۱۹.۶): فایل‌ها پیش از تراکنش روی دیسک امن نوشته شده‌اند؛ اگر
 * تراکنش شکست بخورد فایل‌ها پاک می‌شوند. رکوردهای پیوست در همان تراکنش
 * ساخته می‌شوند تا پیام و فایل همیشه هم‌خوان باشند.
 * گفت‌وگوی اولیه: ارتباط PENDING هم ارسال مجاز است (ماتریس تصمیم می‌گیرد).
 */
export async function sendMessage(
  conversationId: string,
  user: { id: string; role: string },
  content: string,
  attachments: {
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    /** مسیر امن روی دیسک — از لایه ذخیره‌سازی، هرگز از کلاینت */
    storagePath: string;
  }[] = []
): Promise<ChatMessageView> {
  const conv = await conversationForParty(conversationId, user.id);
  const conn = await db.coachStudentConnection.findUnique({
    where: { id: conv.connectionId },
  });
  if (!conn) {
    throw new CoachingError(404, "CONVERSATION_NOT_FOUND");
  }
  const blockReason = await blockReasonForSend(conn, user);
  if (blockReason) {
    throw new CoachingError(403, blockReason);
  }
  await assertSendRateAllowed(user.id);

  for (let attempt = 0; ; attempt += 1) {
    try {
      const message = await db.$transaction(async (tx) => {
        const freshConn = await tx.coachStudentConnection.findUnique({
          where: { id: conv.connectionId },
          select: { status: true },
        });
        if (
          !freshConn ||
          (freshConn.status !== CONNECTION_STATUSES.ACTIVE &&
            freshConn.status !== CONNECTION_STATUSES.PENDING)
        ) {
          throw new CoachingError(403, "CONNECTION_CLOSED");
        }
        const freshConv = await tx.coachConversation.findUnique({
          where: { id: conv.id },
        });
        if (!freshConv) {
          throw new CoachingError(404, "CONVERSATION_NOT_FOUND");
        }
        const seq = freshConv.lastSeq + 1;
        const msg = await tx.coachMessage.create({
          data: {
            conversationId: conv.id,
            senderId: user.id, // فقط از نشست سرور — هرگز از کلاینت
            content,
            seq,
          },
        });
        if (attachments.length > 0) {
          await tx.coachMessageAttachment.createMany({
            data: attachments.map((a) => ({
              messageId: msg.id,
              fileName: a.fileName,
              mimeType: a.mimeType,
              sizeBytes: a.sizeBytes,
              storagePath: a.storagePath,
            })),
          });
        }
        await tx.coachConversation.update({
          where: { id: conv.id },
          data: { lastSeq: seq, lastMessageAt: msg.createdAt },
        });
        return msg;
      });
      // اعلان پیام جدید — فقط به گیرنده؛ شکستش هرگز ارسال را نمی‌شکند
      const recipientId =
        user.id === conn.studentId ? conn.coachId : conn.studentId;
      await emitNotification({
        userId: recipientId,
        type: NOTIFICATION_TYPES.MESSAGE_NEW,
        dedupeKey: `message:${message.id}`,
        payload: { conversationId: conv.id, connectionId: conn.id, senderId: user.id },
      });
      const withAttachments = await db.coachMessage.findUnique({
        where: { id: message.id },
        include: { attachments: { orderBy: { createdAt: "asc" } } },
      });
      return toMessageView(withAttachments ?? message);
    } catch (error) {
      // رقابت نادر دو ارسال هم‌زمان روی همان seq — تلاش مجدد محدود
      if (isP2002(error) && attempt < 3) continue;
      throw error;
    }
  }
}

/* --------------- مسدودسازی پیام‌رسان — مرحله ۱۹.۶ --------------- */

/**
 * مسدود کردن دانشجو توسط مربی مالک ارتباط — بررسی طرف بودن سمت سرور.
 * تاریخچه، رابطه، اشتراک و برنامه‌ها دست‌نخورده می‌مانند؛ فقط ارسال جدید
 * دانشجو در گفت‌وگوی اولیه/فعال بسته می‌شود. مسدودی تکراری بی‌اثر است.
 */
export async function blockStudentInConversation(
  connectionId: string,
  coach: { id: string; role: string }
): Promise<{ blocked: boolean }> {
  const conn = await connectionForParty(connectionId, coach.id);
  if (conn.coachId !== coach.id || coach.role !== "COACH") {
    throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  }
  try {
    await db.chatBlock.create({
      data: { blockerId: coach.id, blockedId: conn.studentId },
    });
  } catch (error) {
    if (!isP2002(error)) throw error; // مسدودی تکراری — بی‌اثر
  }
  return { blocked: true };
}

/** رفع مسدودیت — فقط مربی مالک؛ نبود رکورد هم موفقیت صادقانه است */
export async function unblockStudentInConversation(
  connectionId: string,
  coach: { id: string; role: string }
): Promise<{ blocked: boolean }> {
  const conn = await connectionForParty(connectionId, coach.id);
  if (conn.coachId !== coach.id || coach.role !== "COACH") {
    throw new CoachingError(403, "ROLE_NOT_ALLOWED");
  }
  await db.chatBlock.deleteMany({
    where: { blockerId: coach.id, blockedId: conn.studentId },
  });
  return { blocked: false };
}

/** وضعیت مسدودی یک ارتباط برای مربی مالک — برای UI */
export async function conversationBlockState(
  connectionId: string,
  coach: { id: string; role: string }
): Promise<{ blockedByMe: boolean; canSend: boolean; blockReason: ChatBlockReason | null }> {
  const conn = await connectionForParty(connectionId, coach.id);
  const blockedByMe =
    (await db.chatBlock.findUnique({
      where: { blockerId_blockedId: { blockerId: coach.id, blockedId: conn.studentId } },
      select: { id: true },
    })) !== null;
  const blockReason = await blockReasonForSend(conn, coach);
  return { blockedByMe, canSend: blockReason === null, blockReason };
}
