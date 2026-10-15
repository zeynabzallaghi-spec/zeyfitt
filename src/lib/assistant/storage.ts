/**
 * لایه سمت سرورِ ذخیره‌سازی مکالمه‌های دستیار — تنها نقطه تماس Prisma با
 * مدل‌های AssistantConversation/AssistantMessage.
 *
 * قواعد امنیتی ثابت:
 *  - userId همیشه پارامتر اجباری است و از نشست سرور می‌آید.
 *  - «نبودن مکالمه» و «مالک دیگر بودن» هر دو null برمی‌گردانند و در لایه
 *    API پاسخ یکسان 404 می‌گیرند تا هیچ اطلاعاتی افشا نشود.
 *  - متن پیام‌ها در لاگ نوشته نمی‌شود.
 */

import { db } from "@/lib/db";
import type { AssistantConversation, AssistantMessage } from "@prisma/client";
import {
  AssistantError,
  CONVERSATION_TITLE_MAX,
  CONVERSATIONS_LIST_LIMIT,
  type AssistantLang,
  type AssistantConversationSummary,
  type AssistantConversationDetail,
  type AssistantMessageClient,
  type MessageRole,
} from "./types";

type ConversationRow = AssistantConversation & { messages: AssistantMessage[] };

function toClientMessage(row: AssistantMessage): AssistantMessageClient {
  return {
    id: row.id,
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    lang: row.lang === "fa" || row.lang === "en" ? row.lang : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function toSummary(row: ConversationRow): AssistantConversationSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messageCount: row.messages.length,
  };
}

function toDetail(row: ConversationRow): AssistantConversationDetail {
  return {
    ...toSummary(row),
    messages: [...row.messages]
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(toClientMessage),
  };
}

function titleFromMessage(content: string): string {
  const singleLine = content.replace(/\s+/g, " ").trim();
  if (!singleLine) return "";
  return singleLine.length <= CONVERSATION_TITLE_MAX
    ? singleLine
    : `${singleLine.slice(0, CONVERSATION_TITLE_MAX - 1)}…`;
}

/* ------------------------------ خواندن ------------------------------ */

/** فهرست مکالمه‌های کاربر — جدیدترین بر اساس آخرین فعالیت */
export async function listConversations(userId: string): Promise<AssistantConversationSummary[]> {
  const rows = await db.assistantConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: CONVERSATIONS_LIST_LIMIT,
    include: { _count: { select: { messages: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messageCount: row._count.messages,
  }));
}

/**
 * مکالمه با پیام‌هایش — فقط برای مالک؛ برای مکالمه ناموجود یا متعلق به
 * کاربر دیگر null برمی‌گردد (پاسخ API یکسان 404).
 */
export async function findOwnedConversation(
  conversationId: string,
  userId: string
): Promise<AssistantConversationDetail | null> {
  const row = await db.assistantConversation.findFirst({
    where: { id: conversationId, userId },
    include: { messages: true },
  });
  return row ? toDetail(row) : null;
}

/** پیام‌های اخیر مکالمه (صعودی) — ورودی مدل؛ مالکیت بررسی می‌شود */
export async function recentOwnedMessages(
  conversationId: string,
  userId: string,
  limit: number
): Promise<AssistantMessageClient[]> {
  const rows = await db.assistantMessage.findMany({
    where: { conversationId, conversation: { userId } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.reverse().map(toClientMessage);
}

/* ------------------------------ نوشتن ------------------------------ */

/** ساخت مکالمه جدید — عنوان خالی تا نخستین پیام واقعی کاربر */
export async function createConversation(userId: string): Promise<AssistantConversationSummary> {
  const count = await db.assistantConversation.count({ where: { userId } });
  if (count >= CONVERSATIONS_LIST_LIMIT) {
    throw new AssistantError(
      "LIMIT_REACHED",
      "Conversation limit reached — delete older conversations first"
    );
  }
  const row = await db.assistantConversation.create({
    data: { userId, title: "" },
    include: { _count: { select: { messages: true } } },
  });
  return {
    id: row.id,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    messageCount: row._count.messages,
  };
}

/**
 * افزودن پیام کاربر — پیش از فراخوانی مدل ذخیره می‌شود تا شکست ارائه‌دهنده
 * هیچ‌گاه متن کاربر را از بین نبرد. اگر مکالمه بدون عنوان باشد، عنوان از
 * همین پیام ساخته می‌شود.
 */
export async function appendUserMessage(
  conversationId: string,
  userId: string,
  content: string,
  lang: AssistantLang | null
): Promise<AssistantMessageClient> {
  const conversation = await db.assistantConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true, title: true },
  });
  if (!conversation) {
    throw new AssistantError("NOT_FOUND", "Conversation not found");
  }

  const [message] = await db.$transaction([
    db.assistantMessage.create({
      data: {
        conversationId,
        userId,
        role: "user",
        content,
        lang,
      },
    }),
    ...(conversation.title === ""
      ? [
          db.assistantConversation.update({
            where: { id: conversationId },
            data: { title: titleFromMessage(content) },
          }),
        ]
      : []),
  ]);
  return toClientMessage(message);
}

/** افزودن پاسخ دستیار — فقط پس از پاسخ واقعی مدل */
export async function appendAssistantMessage(
  conversationId: string,
  userId: string,
  content: string,
  lang: AssistantLang | null
): Promise<AssistantMessageClient> {
  const conversation = await db.assistantConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!conversation) {
    throw new AssistantError("NOT_FOUND", "Conversation not found");
  }
  const message = await db.assistantMessage.create({
    data: { conversationId, userId, role: "assistant", content, lang },
  });
  return toClientMessage(message);
}

/**
 * آخرین پیام کاربرِ بی‌پاسخ — برای «تلاش مجدد»: اگر آخرین پیام مکالمه
 * از کاربر باشد (پاسخ قبلی ذخیره نشده)، همان برمی‌گردد؛ در غیر این صورت
 * null (چیزی برای تلاش مجدد نیست).
 */
export async function lastUnansweredUserMessage(
  conversationId: string,
  userId: string
): Promise<AssistantMessageClient | null> {
  const last = await db.assistantMessage.findFirst({
    where: { conversationId, conversation: { userId } },
    orderBy: { createdAt: "desc" },
    take: 1,
  });
  if (!last || last.role !== "user") return null;
  return toClientMessage(last);
}

/** حذف مکالمه — فقط مالک؛ خروجی false یعنی ناموجود/غیرخودی (404) */
export async function deleteOwnedConversation(
  conversationId: string,
  userId: string
): Promise<boolean> {
  const existing = await db.assistantConversation.findFirst({
    where: { id: conversationId, userId },
    select: { id: true },
  });
  if (!existing) return false;
  await db.assistantConversation.delete({ where: { id: conversationId } });
  return true;
}

/** نقش امن از رشته دیتابیس */
export function asRole(value: string): MessageRole {
  return value === "assistant" ? "assistant" : "user";
}
