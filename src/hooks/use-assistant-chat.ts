"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AssistantConversationSummary,
  AssistantConversationDetail,
  AssistantMessageClient,
  AssistantProviderStatusClient,
  LangChoice,
} from "@/lib/assistant/types";
import { detectMessageLang } from "@/lib/assistant/language";
import { uiLangOf, type UiLang } from "@/lib/assistant/i18n";

/**
 * هوک کلاینت چت دستیار — همه داده فقط از API متصل به نشست سرور خوانده و
 * نوشته می‌شود. هیچ پاسخ ساختگی‌ای تولید نمی‌شود؛ پیام کاربر خوش‌بینانه
 * نمایش داده می‌شود اما «ثبت‌شده» فقط با پاسخ واقعی سرور است و در شکست،
 * متن کاربر برای تلاش مجدد حفظ می‌شود.
 */

type Failure = { ok: false; code: string; retryAfterSec?: number };
type Success<T> = { ok: true; data: T };
type Result<T> = Success<T> | Failure;

const LANG_STORAGE_KEY = "fitcoach.assistant.lang";

/** پیام در حال انتظار یا ناموفق — هنوز «ثبت‌شده» محسوب نمی‌شود */
export interface TransientState {
  userMessage: AssistantMessageClient;
  /** true = در انتظار پاسخ سرور، false = شکست (نمایش خطا + تلاش مجدد) */
  sending: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseFailure(response: Response): Promise<Failure> {
  try {
    const data: unknown = await response.json();
    if (isRecord(data) && typeof data.error === "string") {
      const retryAfterSec =
        typeof data.retryAfterSec === "number" ? data.retryAfterSec : undefined;
      return { ok: false, code: data.error, retryAfterSec };
    }
  } catch {
    // پاسخ بدون JSON
  }
  if (response.status === 401) return { ok: false, code: "UNAUTHENTICATED" };
  return { ok: false, code: "NETWORK" };
}

function nowIso(): string {
  return new Date().toISOString();
}

function makeTempId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `temp-${crypto.randomUUID()}`
    : `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function messageLang(text: string): "fa" | "en" | null {
  const detected = detectMessageLang(text);
  return detected === "ambiguous" ? null : detected;
}

/**
 * ادغام پیام‌ها بر اساس شناسه — در برابر مسابقه بین بارگیری مکالمه و پاسخ
 * ارسال مقاوم است: هرگز پیام تکراری نمی‌سازد و ترتیب زمانی حفظ می‌شود.
 */
function mergeMessages(prev: AssistantMessageClient[], incoming: AssistantMessageClient[]): AssistantMessageClient[] {
  const map = new Map(prev.map((m) => [m.id, m]));
  for (const m of incoming) map.set(m.id, m);
  return [...map.values()].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  );
}

export interface UseAssistantChatResult {
  // زبان
  langChoice: LangChoice;
  setLangChoice: (choice: LangChoice) => void;
  uiLang: UiLang;
  // وضعیت اتصال
  provider: AssistantProviderStatusClient | null;
  statusLoading: boolean;
  statusError: string | null;
  // مکالمه‌ها
  conversations: AssistantConversationSummary[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  refreshConversations: () => Promise<void>;
  createConversation: () => Promise<Result<AssistantConversationSummary>>;
  deleteConversation: (id: string) => Promise<Result<null>>;
  deletingId: string | null;
  // مکالمه فعال
  activeId: string | null;
  selectConversation: (id: string) => void;
  closeConversation: () => void;
  conversation: AssistantConversationDetail | null;
  conversationLoading: boolean;
  conversationError: string | null;
  messages: AssistantMessageClient[];
  refreshConversation: () => Promise<void>;
  // پیام‌زودگذر (خوش‌بینانه/ناموفق)
  transient: TransientState | null;
  // ارسال و تلاش مجدد
  pending: boolean;
  sendMessage: (content: string) => Promise<Result<{ userMessage: AssistantMessageClient; assistantMessage: AssistantMessageClient }>>;
  retryLast: () => Promise<Result<{ assistantMessage: AssistantMessageClient } | { noop: true }>>;
  lastError: { code: string; retryAfterSec?: number } | null;
  clearError: () => void;
  /** تلاش مجدد ممکن است: خطای فعال یا آخرین پیام ثبت‌شده از کاربر بدون پاسخ */
  canRetry: boolean;
}

export function useAssistantChat(): UseAssistantChatResult {
  /* ------------------------------ زبان رابط ------------------------------ */
  const [langChoice, setLangChoiceState] = useState<LangChoice>("auto");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (stored === "auto" || stored === "fa" || stored === "en") {
        setLangChoiceState(stored);
      }
    } catch {
      // localStorage در دسترس نیست — پیش‌فرض خودکار
    }
  }, []);

  const setLangChoice = useCallback((choice: LangChoice) => {
    setLangChoiceState(choice);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, choice);
    } catch {
      // ذخیره ترجیح اختیاری است
    }
  }, []);

  const uiLang = uiLangOf(langChoice);

  /* ------------------------------ وضعیت اتصال ------------------------------ */
  const [provider, setProvider] = useState<AssistantProviderStatusClient | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const response = await fetch("/api/assistant/status", { cache: "no-store" });
        if (!mounted) return;
        if (response.status === 401) {
          setStatusError("UNAUTHENTICATED");
          return;
        }
        if (!response.ok) {
          setStatusError("NETWORK");
          return;
        }
        const data = (await response.json()) as { provider?: AssistantProviderStatusClient };
        if (mounted) setProvider(data.provider ?? null);
      } catch {
        if (mounted) setStatusError("NETWORK");
      } finally {
        if (mounted) setStatusLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* ------------------------------ مکالمه‌ها ------------------------------ */
  const [conversations, setConversations] = useState<AssistantConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshConversations = useCallback(async () => {
    setConversationsError(null);
    try {
      const response = await fetch("/api/assistant/conversations", { cache: "no-store" });
      if (!response.ok) {
        setConversationsError("LOAD_FAILED");
        return;
      }
      const data = (await response.json()) as { conversations?: AssistantConversationSummary[] };
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch {
      setConversationsError("NETWORK");
    } finally {
      setConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
  }, [refreshConversations]);

  /* ------------------------------ پیام‌زودگذر و خطا ------------------------------ */
  const [transient, setTransient] = useState<TransientState | null>(null);
  const [lastError, setLastError] = useState<{ code: string; retryAfterSec?: number } | null>(null);
  const [pending, setPending] = useState(false);

  /* ------------------------------ مکالمه فعال ------------------------------ */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AssistantConversationDetail | null>(null);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationError, setConversationError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessageClient[]>([]);
  const activeIdRef = useRef<string | null>(null);

  const selectConversation = useCallback((id: string) => {
    activeIdRef.current = id;
    setActiveId(id);
    setConversation(null);
    setMessages([]);
    setConversationError(null);
    setTransient(null);
    setLastError(null);
  }, []);

  const closeConversation = useCallback(() => {
    activeIdRef.current = null;
    setActiveId(null);
    setConversation(null);
    setMessages([]);
    setTransient(null);
    setLastError(null);
  }, []);

  const applyConversationDetail = useCallback((detail: AssistantConversationDetail) => {
    setConversation(detail);
    setMessages((prev) => mergeMessages(prev, detail.messages));
    // اگر پیام کاربرِ در انتظار از سرور برگشت، نسخه خوش‌بینانه حذف می‌شود
    setTransient((t) =>
      t && t.sending && detail.messages.some((m) => m.role === "user" && m.content === t.userMessage.content)
        ? null
        : t
    );
  }, []);

  const loadConversation = useCallback(
    async (id: string) => {
      setConversationLoading(true);
      setConversationError(null);
      try {
        const response = await fetch(`/api/assistant/conversations/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (response.status === 404) {
          if (activeIdRef.current === id) setConversationError("NOT_FOUND");
          return;
        }
        if (!response.ok) {
          if (activeIdRef.current === id) setConversationError("NETWORK");
          return;
        }
        const data = (await response.json()) as { conversation?: AssistantConversationDetail };
        if (data.conversation && activeIdRef.current === id) {
          applyConversationDetail(data.conversation);
        }
      } catch {
        if (activeIdRef.current === id) setConversationError("NETWORK");
      } finally {
        if (activeIdRef.current === id) setConversationLoading(false);
      }
    },
    [applyConversationDetail]
  );

  useEffect(() => {
    if (!activeId) {
      setConversationLoading(false);
      return;
    }
    void loadConversation(activeId);
  }, [activeId, loadConversation]);

  const refreshConversation = useCallback(async () => {
    const id = activeIdRef.current;
    if (!id) return;
    await loadConversation(id);
  }, [loadConversation]);

  /* ------------------------------ ساخت/حذف مکالمه ------------------------------ */

  const createConversation = useCallback(async (): Promise<Result<AssistantConversationSummary>> => {
    try {
      const response = await fetch("/api/assistant/conversations", { method: "POST" });
      if (!response.ok) return await parseFailure(response);
      const data = (await response.json()) as { conversation: AssistantConversationSummary };
      setConversations((prev) => [data.conversation, ...prev]);
      selectConversation(data.conversation.id);
      return { ok: true, data: data.conversation };
    } catch {
      return { ok: false, code: "NETWORK" };
    }
  }, [selectConversation]);

  const deleteConversation = useCallback(
    async (id: string): Promise<Result<null>> => {
      setDeletingId(id);
      try {
        const response = await fetch(`/api/assistant/conversations/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!response.ok) return await parseFailure(response);
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeIdRef.current === id) closeConversation();
        return { ok: true, data: null };
      } catch {
        return { ok: false, code: "NETWORK" };
      } finally {
        setDeletingId(null);
      }
    },
    [closeConversation]
  );

  /* ------------------------------ ارسال پیام ------------------------------ */

  const sendMessage = useCallback(
    async (rawContent: string) => {
      const content = rawContent.trim();
      if (!content || pending) return { ok: false as const, code: "EMPTY" };

      // مکالمه فعال؛ در نبود آن، ساخت خودکار مکالمه جدید
      let conversationId = activeIdRef.current;
      if (!conversationId) {
        const created = await createConversation();
        if (!created.ok) return { ok: false as const, code: created.code };
        conversationId = created.data.id;
      }
      const targetId = conversationId;
      const language = langChoice;

      const optimistic: AssistantMessageClient = {
        id: makeTempId(),
        role: "user",
        content,
        lang: messageLang(content),
        createdAt: nowIso(),
      };
      setTransient({ userMessage: optimistic, sending: true });
      setLastError(null);
      setPending(true);

      try {
        const response = await fetch(
          `/api/assistant/conversations/${encodeURIComponent(targetId)}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content, language }),
          }
        );
        if (!response.ok) {
          const failure = await parseFailure(response);
          // متن کاربر حفظ می‌شود و تلاش مجدد ممکن است
          if (activeIdRef.current === targetId) {
            setTransient({ userMessage: optimistic, sending: false });
            setLastError({ code: failure.code, retryAfterSec: failure.retryAfterSec });
          } else {
            setTransient(null);
          }
          return { ok: false as const, code: failure.code };
        }
        const data = (await response.json()) as {
          userMessage: AssistantMessageClient;
          assistantMessage: AssistantMessageClient;
        };
        if (activeIdRef.current === targetId) {
          setMessages((prev) => mergeMessages(prev, [data.userMessage, data.assistantMessage]));
          setTransient(null);
        }
        setLastError(null);
        void refreshConversations();
        return { ok: true as const, data };
      } catch {
        if (activeIdRef.current === targetId) {
          setTransient({ userMessage: optimistic, sending: false });
          setLastError({ code: "NETWORK" });
        } else {
          setTransient(null);
        }
        return { ok: false as const, code: "NETWORK" };
      } finally {
        setPending(false);
      }
    },
    [createConversation, langChoice, pending, refreshConversations]
  );

  /* ------------------------------ تلاش مجدد ------------------------------ */

  const retryLast = useCallback(
    async (): Promise<Result<{ assistantMessage: AssistantMessageClient } | { noop: true }>> => {
      const targetId = activeIdRef.current;
      if (!targetId || pending) return { ok: false as const, code: "EMPTY" };
      const language = langChoice;
      setPending(true);
      if (transient) setTransient({ ...transient, sending: true });
      setLastError(null);
      try {
        const response = await fetch(
          `/api/assistant/conversations/${encodeURIComponent(targetId)}/retry`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ language }),
          }
        );
        if (!response.ok) {
          const failure = await parseFailure(response);
          if (transient) setTransient({ ...transient, sending: false });
          setLastError({ code: failure.code, retryAfterSec: failure.retryAfterSec });
          return { ok: false as const, code: failure.code };
        }
        const data = (await response.json()) as {
          noop?: boolean;
          conversation?: AssistantConversationDetail;
          assistantMessage?: AssistantMessageClient;
        };
        if (data.noop && data.conversation && activeIdRef.current === targetId) {
          applyConversationDetail(data.conversation);
          setTransient(null);
        } else if (data.assistantMessage && activeIdRef.current === targetId) {
          setMessages((prev) => mergeMessages(prev, [data.assistantMessage as AssistantMessageClient]));
          setTransient(null);
        }
        void refreshConversations();
        return { ok: true as const, data: data.noop ? { noop: true } : { assistantMessage: data.assistantMessage! } };
      } catch {
        if (transient) setTransient({ ...transient, sending: false });
        setLastError({ code: "NETWORK" });
        return { ok: false as const, code: "NETWORK" };
      } finally {
        setPending(false);
      }
    },
    [applyConversationDetail, langChoice, pending, refreshConversations, transient]
  );

  /** آخرین پیام موثق از سرور بدون پاسخ → تلاش مجدد ممکن (مثلاً پس از رفرش) */
  const lastServerMessageIsUser =
    messages.length > 0 && messages[messages.length - 1].role === "user" && transient === null;
  const canRetry = pending
    ? false
    : Boolean(lastError) || Boolean(transient && !transient.sending) || lastServerMessageIsUser;

  const clearError = useCallback(() => setLastError(null), []);

  return {
    langChoice,
    setLangChoice,
    uiLang,
    provider,
    statusLoading,
    statusError,
    conversations,
    conversationsLoading,
    conversationsError,
    refreshConversations,
    createConversation,
    deleteConversation,
    deletingId,
    activeId,
    selectConversation,
    closeConversation,
    conversation,
    conversationLoading,
    conversationError,
    messages,
    refreshConversation,
    transient,
    pending,
    sendMessage,
    retryLast,
    lastError,
    clearError,
    canRetry,
  };
}
