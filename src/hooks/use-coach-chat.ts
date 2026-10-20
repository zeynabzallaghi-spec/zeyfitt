"use client";

/**
 * هوک پیام‌رسانی خصوصی — مرحله ۱۷.
 *
 * طراحی بازیابی پیام‌های جدید (بدون بارگذاری کامل صفحه):
 *  - زیرساخت realtime پایدار (WebSocket/SSE) در این پروژه وجود ندارد؛
 *    طبق مشخصات مرحله از polling محدود و کنترل‌شده استفاده میشود و هیچ
 *    ادعای realtime مطرح نمیشود.
 *  - polling فقط وقتی مکالمه باز است، مجاز است و تب قابل مشاهده است؛
 *    با visibilitychange مکث میکند و با بستن پنل کامل قطع میشود.
 *  - مکان‌یاب polling شناسه پایدار seq آخرین پیام است (نه ساعت کلاینت)؛
 *    پاسخ فقط پیام‌های جدیدتر را میدهد — بدون تکرار و بدون جابجایی.
 *  - ارسال خوش‌بینانه با سه وضعیت متمایز pending/sent/failed؛ در خطای
 *    شبکه پیام هرگز «ارسال‌شده» نمایش داده نمیشود و تطبیق بعدی با
 *    پاسخ واقعی سرور انجام میشود.
 *
 * همه مجوزها سمت سرور است؛ کلاینت فقط وضعیت تأییدشده API را نمایش میدهد.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { apiErrorLabel } from "@/lib/i18n/sections/server-messages";
import type {
  ChatConversationClient,
  ChatMessageClient,
  ChatMessagesPageClient,
} from "@/lib/coaching/chat-client";

/** بازه polling قابل مشاهده — محدود و منطقی (۴ ثانیه) */
const POLL_INTERVAL_MS = 4000;
/** سقف پیام در هر poll — رشد نامحدود پاسخ ممکن نیست */
const POLL_LIMIT = 50;

type Failure = { ok: false; message: string };
type Success<T> = { ok: true; data: T };
type Result<T> = Success<T> | Failure;

function netFail(): Failure {
  return {
    ok: false,
    message:
      currentUiLocale() === "en"
        ? "Could not reach the server; please check your connection."
        : "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.",
  };
}

async function failureOf(response: Response): Promise<Failure> {
  const locale = currentUiLocale();
  if (response.status === 401) {
    return {
      ok: false,
      message:
        locale === "en"
          ? "Your session has expired; please sign in again."
          : "نشست شما منقضی شده است؛ دوباره وارد شوید.",
    };
  }
  try {
    const data = (await response.json()) as { error?: string; code?: string };
    const code = data.error ?? data.code ?? "INTERNAL";
    return { ok: false, message: apiErrorLabel(code, locale) ?? netFail().message };
  } catch {
    return netFail();
  }
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return await failureOf(response);
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return netFail();
  }
}

/* ------------------------- پیام خوش‌بینانه ------------------------- */

export interface PendingChatMessage {
  tempId: string;
  content: string;
  /** pending: در پرواز — failed: خطای شبکه/سرور، قابل تلاش مجدد */
  state: "pending" | "failed";
  /** بیشترین seq دیده‌شده هنگام شروع ارسال — برای تطبیق پاسخ گمشده */
  seqAtSend: number;
}

export interface ChatPanelState {
  loading: boolean;
  error: string | null;
  conversation: ChatConversationClient | null;
  messages: ChatMessageClient[];
  hasMoreOlder: boolean;
  loadingOlder: boolean;
  /** my own user id — برای تفکیک حباب‌ها؛ منبع: نشست سرور */
  myUserId: string | null;
}

interface UseCoachChatOptions {
  /** شناسه کاربر جاری از نشست — فقط برای نمایش، تصمیم مجوزی نیست */
  myUserId: string | null;
  /** فعال بودن پنل — false یعنی پنل بسته است و هیچ درخواستی زده نمیشود */
  enabled: boolean;
}

/**
 * چرخه عمر پنل گفت‌وگو برای یک connectionId:
 * resolve (فهرست → گشودن در صورت نیاز) → بارگذاری صفحه آخر → polling →
 * بارگذاری قدیمی‌ترها → ارسال با وضعیت متمایز.
 */
export function useCoachChat(
  connectionId: string | null,
  options: UseCoachChatOptions
) {
  const { myUserId, enabled } = options;
  // loading از true شروع میشود — پنل با key=connectionId remount میشود
  const [state, setState] = useState<ChatPanelState>({
    loading: true,
    error: null,
    conversation: null,
    messages: [],
    hasMoreOlder: false,
    loadingOlder: false,
    myUserId,
  });
  const [pendings, setPendings] = useState<PendingChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const conversationRef = useRef<ChatConversationClient | null>(null);
  const messagesRef = useRef<ChatMessageClient[]>([]);
  const hasMoreRef = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seqAtSendRef = useRef(0);

  const maxSeq = useCallback((): number => {
    const msgs = messagesRef.current;
    return msgs.length > 0 ? msgs[msgs.length - 1].seq : 0;
  }, []);

  /**
   * تطبیق پیام‌های failed با پیام واقعی سرور — فقط برای خطاهای شبکه که
   * ممکن است با ذخیره موفق سمت سرور هم‌زمان شده باشند (پاسخ گمشده).
   * تطبیق FIFO با محتوای برابر و seq بزرگ‌تر از لحظه شروع ارسال.
   */
  const reconcilePendings = useCallback((incoming: ChatMessageClient[]) => {
    setPendings((current) => {
      if (current.length === 0) return current;
      const mine = incoming.filter((m) => m.senderId === myUserId);
      if (mine.length === 0) return current;
      const remaining = [...current];
      for (const msg of mine) {
        const idx = remaining.findIndex(
          (p) =>
            p.state === "failed" &&
            p.content === msg.content &&
            msg.seq > p.seqAtSend
        );
        if (idx >= 0) remaining.splice(idx, 1);
      }
      return remaining.length === current.length ? current : remaining;
    });
  }, [myUserId]);

  const mergeServerMessages = useCallback((incoming: ChatMessageClient[]) => {
    if (incoming.length === 0) {
      // حتی بدون پیام جدید، تطبیق خوش‌بینانه‌های معلق لازم است
      reconcilePendings([]);
      return;
    }
    const byId = new Map(messagesRef.current.map((m) => [m.id, m]));
    for (const msg of incoming) byId.set(msg.id, msg);
    const merged = [...byId.values()].sort((a, b) => a.seq - b.seq);
    messagesRef.current = merged;
    setState((s) => ({ ...s, messages: merged }));
    reconcilePendings(incoming);
  }, [reconcilePendings]);

  /** خواندن صفحه آخر یا polling پیام‌های جدید */
  const fetchMessages = useCallback(
    async (mode: "latest" | "poll") => {
      const conv = conversationRef.current;
      if (!conv?.conversationId) return;
      if (mode === "poll") {
        const after = maxSeq();
        const result = await jsonFetch<ChatMessagesPageClient>(
          `/api/coach-chat/conversations/${conv.conversationId}/messages?after=${after}&limit=${POLL_LIMIT}`
        );
        if (result.ok) {
          mergeServerMessages(result.data.messages);
          conversationRef.current = result.data.conversation;
          setState((s) => ({ ...s, conversation: result.data.conversation }));
        }
        // خطای poll بی‌صدا نادیده گرفته میشود؛ poll بعدی دوباره تلاش میکند.
        // خطای 401/403 پایدار با نمایش وضعیت فقط‌خواندنی از سرور میآید.
        return;
      }
      const result = await jsonFetch<ChatMessagesPageClient>(
        `/api/coach-chat/conversations/${conv.conversationId}/messages?limit=30`
      );
      if (result.ok) {
        messagesRef.current = result.data.messages;
        hasMoreRef.current = result.data.hasMoreOlder;
        conversationRef.current = result.data.conversation;
        setState((s) => ({
          ...s,
          error: null,
          conversation: result.data.conversation,
          messages: result.data.messages,
          hasMoreOlder: result.data.hasMoreOlder,
        }));
      } else {
        setState((s) => ({ ...s, error: result.message }));
      }
    },
    [maxSeq, mergeServerMessages]
  );

  /** فهرست مکالمه‌ها → یافتن ارتباط → گشودن در صورت نیاز */
  const resolveConversation = useCallback(async (): Promise<boolean> => {
    if (!connectionId) return false;
    const list = await jsonFetch<{ conversations: ChatConversationClient[] }>(
      "/api/coach-chat/conversations"
    );
    if (!list.ok) {
      setState((s) => ({ ...s, error: list.message }));
      return false;
    }
    const entry = list.data.conversations.find((c) => c.connectionId === connectionId);
    if (entry?.conversationId) {
      conversationRef.current = entry;
      setState((s) => ({ ...s, conversation: entry, error: null }));
      return true;
    }
    // ارتباط ACTIVE بدون مکالمه — گشودن (ساخت سمت سرور با ماتریس مجوز)
    const opened = await jsonFetch<{ conversation: ChatConversationClient }>(
      `/api/coach-chat/connections/${connectionId}/open`,
      { method: "POST" }
    );
    if (!opened.ok) {
      setState((s) => ({ ...s, error: opened.message }));
      return false;
    }
    conversationRef.current = opened.data.conversation;
    setState((s) => ({ ...s, conversation: opened.data.conversation, error: null }));
    return true;
  }, [connectionId]);

  const loadOlder = useCallback(async () => {
    const conv = conversationRef.current;
    const msgs = messagesRef.current;
    if (!conv?.conversationId || msgs.length === 0 || !hasMoreRef.current) return;
    setState((s) => ({ ...s, loadingOlder: true }));
    const before = msgs[0].seq;
    const result = await jsonFetch<ChatMessagesPageClient>(
      `/api/coach-chat/conversations/${conv.conversationId}/messages?before=${before}&limit=30`
    );
    if (result.ok) {
      const byId = new Map<number, ChatMessageClient>();
      for (const m of [...result.data.messages, ...messagesRef.current]) {
        byId.set(m.seq, m);
      }
      const merged = [...byId.values()].sort((a, b) => a.seq - b.seq);
      messagesRef.current = merged;
      hasMoreRef.current = result.data.hasMoreOlder;
      setState((s) => ({
        ...s,
        messages: merged,
        hasMoreOlder: result.data.hasMoreOlder,
        loadingOlder: false,
      }));
    } else {
      setState((s) => ({ ...s, loadingOlder: false, error: result.message }));
    }
  }, []);

  /** ارسال پیام — خوش‌بینانه با وضعیت متمایز؛ پاسخ واقعی سرور مرجع است */
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const conv = conversationRef.current;
      if (!conv?.conversationId || !conv.canSend) return false;
      const trimmed = content.trim();
      if (!trimmed) return false;
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const seqAtSend = maxSeq();
      seqAtSendRef.current = seqAtSend;
      setPendings((p) => [...p, { tempId, content: trimmed, state: "pending", seqAtSend }]);
      setSending(true);
      const result = await jsonFetch<{ message: ChatMessageClient }>(
        `/api/coach-chat/conversations/${conv.conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        }
      );
      setSending(false);
      if (result.ok) {
        // جایگزینی خوش‌بینانه با رکورد واقعی سرور (وضعیت sent)
        setPendings((p) => p.filter((x) => x.tempId !== tempId));
        mergeServerMessages([result.data.message]);
        return true;
      }
      // خطا: پیام «ارسال‌شده» نمایش داده نمیشود — failed با تلاش مجدد
      setPendings((p) =>
        p.map((x) => (x.tempId === tempId ? { ...x, state: "failed" as const } : x))
      );
      return false;
    },
    [maxSeq, mergeServerMessages]
  );

  /** تلاش مجدد پیام failed — همان مسیر ارسال واقعی سرور */
  const retryMessage = useCallback(
    async (tempId: string): Promise<boolean> => {
      const target = pendings.find((p) => p.tempId === tempId);
      if (!target) return false;
      const conv = conversationRef.current;
      if (!conv?.conversationId || !conv.canSend) return false;
      setPendings((p) =>
        p.map((x) => (x.tempId === tempId ? { ...x, state: "pending" as const } : x))
      );
      setSending(true);
      const result = await jsonFetch<{ message: ChatMessageClient }>(
        `/api/coach-chat/conversations/${conv.conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: target.content }),
        }
      );
      setSending(false);
      if (result.ok) {
        setPendings((p) => p.filter((x) => x.tempId !== tempId));
        mergeServerMessages([result.data.message]);
        return true;
      }
      setPendings((p) =>
        p.map((x) => (x.tempId === tempId ? { ...x, state: "failed" as const } : x))
      );
      return false;
    },
    [pendings, mergeServerMessages]
  );

  /**
   * بارگذاری کامل پنل برای connectionId جاری — resolve مکالمه + صفحه اول.
   * همه تغییرات وضعیت فقط پس از await (الگوی هوک‌های پروژه)؛ پاک‌سازی
   * بین تغییر مکالمه با remount کلیدی پنل (key=connectionId) تضمین میشود.
   */
  const load = useCallback(async () => {
    if (!connectionId) return;
    const ok = await resolveConversation();
    if (!ok) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    await fetchMessages("latest");
    setState((s) => ({ ...s, loading: false }));
  }, [connectionId, resolveConversation, fetchMessages]);

  // چرخه عمر: بارگذاری هنگام باز شدن پنل یا تغییر ارتباط.
  // همه setStateهای مسیر load بعد از await اجرا میشوند (بدون رندر آبشاری
  // همگام)؛ قانون react-hooks/set-state-in-effect این الگوی واکشی داده را
  // بیش از حد سخت‌گیرانه می‌گیرد — با توضیح محدود غیرفعال شده است.
  useEffect(() => {
    if (!enabled || !connectionId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [enabled, connectionId, load]);

  // polling — فقط مکالمه باز + مجاز ارسال + تب قابل مشاهده
  useEffect(() => {
    if (!enabled || !connectionId) return;
    const conv = conversationRef.current;
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible" && conversationRef.current?.canSend) {
        await fetchMessages("poll");
      }
      if (!stopped) pollTimer.current = setTimeout(tick, POLL_INTERVAL_MS);
    };
    pollTimer.current = setTimeout(tick, POLL_INTERVAL_MS);

    const onVisibility = () => {
      // مکث/ادامه polling با تغییر وضعیت تب — بدون درخواست اضافه
    };
    void onVisibility;
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      if (pollTimer.current) clearTimeout(pollTimer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, connectionId, state.conversation?.canSend]);

  const active = enabled && connectionId !== null;
  const canSend = state.conversation?.canSend ?? false;
  const blockReason = state.conversation?.blockReason ?? null;

  // پنل بسته: وضعیت خنثی — بدون setState همگام در effect
  const neutral: ChatPanelState = {
    loading: false,
    error: null,
    conversation: null,
    messages: [],
    hasMoreOlder: false,
    loadingOlder: false,
    myUserId,
  };

  return {
    ...(active ? state : neutral),
    pendings: active ? pendings : [],
    sending: active ? sending : false,
    canSend: active ? canSend : false,
    blockReason: active ? blockReason : null,
    sendMessage,
    retryMessage,
    loadOlder,
    refresh: load,
  };
}

/** فهرست مکالمه‌ها برای تب مربی — بدون polling (به‌روزرسانی دستی) */
export function useChatConversationList(enabled: boolean) {
  const [conversations, setConversations] = useState<ChatConversationClient[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    const result = await jsonFetch<{ conversations: ChatConversationClient[] }>(
      "/api/coach-chat/conversations"
    );
    if (result.ok) {
      setConversations(result.data.conversations);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    // setStateهای refresh همه پس از await هستند — توضیح بالا
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [enabled, refresh]);

  // وقتی پنل غیرفعال است، وضعیت خنثی نمایش داده میشود (بدون setState در بدنه effect)
  return {
    conversations: enabled ? conversations : null,
    loading: enabled ? loading : false,
    error: enabled ? error : null,
    refresh,
  };
}
