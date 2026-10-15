/**
 * موتور تولید پاسخ دستیار — مسیر مشترک «ارسال پیام» و «تلاش مجدد».
 *
 * ترتیب اجباری:
 *  1. زبان پاسخ (انتخاب صریح کاربر مقدم بر تشخیص خودکار)
 *  2. زمینه شخصی همان کاربر (فقط‌خواندنی، حداقلی)
 *  3. تاریخچه محدود (فقط پیام‌های اخیر — تاریخچه نامحدود به مدل نمی‌رود)
 *  4. فراخوانی واقعی مدل — در شکست، AssistantError با کد امن پرتاب می‌شود
 *     و پیام کاربر (که پیش‌تر ذخیره شده) محفوظ می‌ماند.
 *  5. ذخیره پاسخ واقعی — هیچ پاسخ ساختگی در هیچ مسیری تولید نمی‌شود.
 */

import {
  AssistantError,
  historyWindow,
  type AssistantLang,
  type AssistantMessageClient,
} from "./types";
import { chatComplete } from "./provider";
import { buildSystemPrompt } from "./system-prompt";
import { buildUserContextBlock } from "./context";
import { recentOwnedMessages, appendAssistantMessage } from "./storage";
import { detectMessageLang, resolveResponseLang } from "./language";

export interface GenerateReplyInput {
  userId: string;
  conversationId: string;
  /** انتخاب زبان کاربر برای این پاسخ */
  language: "auto" | AssistantLang;
  /** متن پیام کاربر مبدأ (برای تشخیص زبان در حالت auto) */
  sourceMessageText: string;
}

export interface GenerateReplyResult {
  assistantMessage: AssistantMessageClient;
}

export async function generateReply(input: GenerateReplyInput): Promise<GenerateReplyResult> {
  const { userId, conversationId, language, sourceMessageText } = input;

  const responseLang = resolveResponseLang(language, sourceMessageText);

  const [contextBlock, history] = await Promise.all([
    buildUserContextBlock(userId),
    recentOwnedMessages(conversationId, userId, historyWindow()),
  ]);

  const systemPrompt = buildSystemPrompt({ responseLang, contextBlock });

  const modelMessages = [
    { role: "system" as const, content: systemPrompt },
    ...history.map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      content: m.content,
    })),
  ];

  const completion = await chatComplete(modelMessages);
  const detectedReply = detectMessageLang(completion.content);
  const replyLang: AssistantLang | null =
    responseLang ?? (detectedReply === "ambiguous" ? null : detectedReply);

  const assistantMessage = await appendAssistantMessage(
    conversationId,
    userId,
    completion.content,
    replyLang
  );

  return { assistantMessage };
}

/** نگاشت AssistantError به وضعیت HTTP — کد امن، بدون متن داخلی */
export function assistantErrorStatus(error: AssistantError): {
  status: number;
  code: string;
  retryAfterSec?: number;
} {
  switch (error.code) {
    case "NOT_FOUND":
      return { status: 404, code: "NOT_FOUND" };
    case "VALIDATION":
      return { status: 400, code: "VALIDATION" };
    case "LIMIT_REACHED":
      return { status: 422, code: "LIMIT_REACHED" };
    case "RATE_LIMITED":
      return {
        status: 429,
        code: "RATE_LIMITED",
        retryAfterSec: error.retryAfterSec,
      };
    case "AI_NOT_CONFIGURED":
      return { status: 503, code: "AI_NOT_CONFIGURED" };
    case "AI_AUTH":
      return { status: 502, code: "AI_AUTH" };
    case "AI_RATE_LIMIT":
      return { status: 429, code: "AI_RATE_LIMIT" };
    case "AI_TIMEOUT":
      return { status: 504, code: "AI_TIMEOUT" };
    case "AI_NETWORK":
    case "AI_EMPTY_RESPONSE":
    case "AI_PROVIDER":
      return { status: 502, code: error.code };
    default:
      return { status: 500, code: "INTERNAL" };
  }
}
