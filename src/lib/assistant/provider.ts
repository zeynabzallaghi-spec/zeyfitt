/**
 * لایه ارائه‌دهنده مدل زبانی — تنها نقطه تماس برنامه با سرویس هوش مصنوعی.
 *
 * قواعد امنیتی:
 *  - این فایل فقط از Route Handlers سمت سرور import می‌شود؛ هرگز در کد
 *    مرورگر. کلید API فقط اینجا و فقط از متغیر محیطی خوانده می‌شود.
 *  - کلید، متن پیام‌ها و پاسخ کامل مدل هرگز در لاگ عمومی یا پاسخ خطای
 *    کلاینت قرار نمی‌گیرند؛ کلاینت فقط کد امن خطا را می‌بیند.
 *  - هیچ پاسخ ساختگی یا شبیه‌سازی‌شده‌ای تولید نمی‌شود؛ شکست واقعی است یا
 *    موفقیت واقعی.
 *
 * ارائه‌دهنده‌ها (قابل پیکربندی با متغیر محیطی):
 *  - zai (پیش‌فرض): SDK نصب‌شده z-ai-web-dev-sdk — اعتبارنامه توسط محیط
 *    اجرا فراهم می‌شود و در کد نگهداری نمی‌شود.
 *  - openai-compatible: هر سرویس سازگار با REST چت (AI_BASE_URL +
 *    AI_API_KEY الزامی).
 *
 * نام مدل، timeout و سقف‌ها همگی از متغیرهای محیطی خوانده می‌شوند.
 */

import ZAI from "z-ai-web-dev-sdk";
import { AssistantError } from "./types";

export interface ProviderChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ProviderStatus {
  id: "zai" | "openai-compatible";
  configured: boolean;
  model: string | null;
}

function providerId(): "zai" | "openai-compatible" {
  return process.env.AI_PROVIDER === "openai-compatible"
    ? "openai-compatible"
    : "zai";
}

/** نام مدل — در صورت تنظیم AI_MODEL به ارائه‌دهنده ارسال می‌شود */
function configuredModel(): string | null {
  const model = process.env.AI_MODEL?.trim();
  return model ? model : null;
}

function timeoutMs(): number {
  const parsed = Number(process.env.AI_TIMEOUT_MS);
  if (Number.isInteger(parsed) && parsed >= 5000 && parsed <= 180000) return parsed;
  return 60_000;
}

/**
 * وضعیت پیکربندی اتصال — تنها فیلدهای غیرحساس را برمی‌گرداند.
 * - zai: پیکربندی‌شده (اعتبارنامه در محیط اجرا فراهم است؛ اگر در زمان
 *   درخواست واقعی مشکل احراز هویت رخ دهد، صادقانه به‌عنوان خطا گزارش
 *   می‌شود و هیچ پاسخ ساختگی‌ای جایگزین نمی‌شود).
 * - openai-compatible: فقط وقتی base URL و کلید هر دو تنظیم شده باشند.
 */
export function getProviderStatus(): ProviderStatus {
  const id = providerId();
  const model = configuredModel();
  if (id === "zai") {
    return { id, configured: true, model };
  }
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  return { id, configured: Boolean(baseUrl && apiKey), model };
}

/* ------------------------------ نگاشت خطا ------------------------------ */

/** طبقه‌بندی خطای ارائه‌دهنده به کد امن — متن خام خطا هرگز برگردانده نمی‌شود */
function classifyProviderError(error: unknown): AssistantError {
  const raw =
    error instanceof Error
      ? `${error.name} ${error.message}`.toLowerCase()
      : String(error).toLowerCase();

  if (
    raw.includes("timeout") ||
    raw.includes("timed out") ||
    raw.includes("abort") ||
    raw.includes("etimedout")
  ) {
    return new AssistantError("AI_TIMEOUT", "AI request timed out");
  }
  if (
    raw.includes("401") ||
    raw.includes("403") ||
    raw.includes("unauthorized") ||
    raw.includes("forbidden") ||
    raw.includes("invalid api key") ||
    raw.includes("authentication")
  ) {
    return new AssistantError("AI_AUTH", "AI provider authentication failed");
  }
  if (
    raw.includes("429") ||
    raw.includes("rate limit") ||
    raw.includes("quota") ||
    raw.includes("too many requests")
  ) {
    return new AssistantError("AI_RATE_LIMIT", "AI provider rate limit reached");
  }
  if (
    raw.includes("enotfound") ||
    raw.includes("econnrefused") ||
    raw.includes("econnreset") ||
    raw.includes("fetch failed") ||
    // پیام خطای اتصال در زمان اجرای Bun (ممیزی مرحله ۱۱ — بازتولید و رفع شد):
    // «Unable to connect. Is the computer able to access the url?» هیچ‌یک از
    // الگوهای بالا را ندارد و به‌اشتباه AI_PROVIDER طبقه‌بندی می‌شد.
    raw.includes("unable to connect") ||
    raw.includes("network") ||
    raw.includes("socket")
  ) {
    return new AssistantError("AI_NETWORK", "AI provider unreachable");
  }
  return new AssistantError("AI_PROVIDER", "AI provider request failed", {
    // فقط نوع خطا برای لاگ سرور — بدون متن کامل که ممکن است داده حساس داشته باشد
    detail: error instanceof Error ? error.name : "unknown",
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new AssistantError("AI_TIMEOUT", "AI request timed out")),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/* ------------------------------ فراخوانی مدل ------------------------------ */

export interface ChatCompletionResult {
  content: string;
}

/** فراخوانی واقعی مدل — بدون هیچ پاسخ ساختگی در مسیر شکست */
export async function chatComplete(
  messages: ProviderChatMessage[]
): Promise<ChatCompletionResult> {
  const provider = providerId();
  const model = configuredModel();

  if (provider === "zai") {
    try {
      const zai = await ZAI.create();
      const completion = await withTimeout(
        zai.chat.completions.create({
          messages,
          thinking: { type: "disabled" },
          ...(model ? { model } : {}),
        }),
        timeoutMs()
      );
      const content = completion.choices[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new AssistantError("AI_EMPTY_RESPONSE", "AI returned an empty response");
      }
      return { content };
    } catch (error) {
      if (error instanceof AssistantError) throw error;
      throw classifyProviderError(error);
    }
  }

  // openai-compatible — REST سازگار با چت
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new AssistantError(
      "AI_NOT_CONFIGURED",
      "AI provider is not configured (missing AI_BASE_URL / AI_API_KEY)"
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs());
  try {
    const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model ?? "gpt-4o-mini",
        messages,
        stream: false,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      const statusError = new Error(`HTTP ${response.status}`);
      throw statusError;
    }
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!content) {
      throw new AssistantError("AI_EMPTY_RESPONSE", "AI returned an empty response");
    }
    return { content };
  } catch (error) {
    if (error instanceof AssistantError) throw error;
    throw classifyProviderError(error);
  } finally {
    clearTimeout(timer);
  }
}
