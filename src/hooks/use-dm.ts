"use client";

/**
 * هوک‌های گفتگوی آزاد — مرحله ۲۰ (بخش ۲).
 * به‌روزرسانی زنده با polling کوتاه (۳ ثانیه برای رشته باز، ۸ ثانیه برای
 * فهرست‌ها) — روی زیرساخت فعلی (gateway HTTP) polling قابل‌اعتمادترین
 * مسیر است و پیام/اعلان تازه در چند ثانیه ظاهر میشود. توقف هنگام
 * پنهان‌بودن تب برای صرفه باتری/سرور.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { apiErrorLabel } from "@/lib/i18n/sections/server-messages";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import type { DirectMessageClient, DirectThreadClient } from "@/lib/dm";

type Failure = { ok: false; message: string };
type Success<T> = { ok: true; data: T };
type Result<T> = Success<T> | Failure;

function failFrom(response: Response): Failure {
  const locale = currentUiLocale();
  return {
    ok: false,
    message:
      apiErrorLabel("INTERNAL", locale) ??
      (locale === "en" ? "Something went wrong." : "مشکلی پیش آمد."),
  };
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return failFrom(response);
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      message:
        currentUiLocale() === "en"
          ? "Could not reach the server."
          : "ارتباط با سرور برقرار نشد.",
    };
  }
}

function useDocumentVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

/** فهرست رشته‌ها — polling زنده ۸ ثانیه */
export function useDirectThreads(enabled: boolean) {
  const [threads, setThreads] = useState<DirectThreadClient[] | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const visible = useDocumentVisible();

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await jsonFetch<{ threads: DirectThreadClient[] }>("/api/dm/threads", {
        cache: "no-store",
      });
      if (!mounted.current) return;
      if (result.ok) {
        setThreads(result.data.threads);
        setError(null);
      } else {
        setError(result.message);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mounted.current = true;
    if (enabled) void refresh();
    return () => {
      mounted.current = false;
    };
  }, [enabled, refresh]);

  useEffect(() => {
    if (!enabled || !visible) return;
    const id = setInterval(() => void refresh(), 8000);
    return () => clearInterval(id);
  }, [enabled, visible, refresh]);

  return { threads, loading, error, refresh };
}

const OPEN_THREAD_POLL_MS = 3000;

/** پیام‌های رشته باز — polling زنده ۳ ثانیه (مورد ۱۲ مشخصات) */
export function useDirectMessages(threadId: string | null) {
  const [messages, setMessages] = useState<DirectMessageClient[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);
  const visible = useDocumentVisible();

  const refresh = useCallback(async () => {
    if (!threadId) return;
    try {
      const result = await jsonFetch<{ messages: DirectMessageClient[] }>(
        `/api/dm/threads/${encodeURIComponent(threadId)}/messages`,
        { cache: "no-store" }
      );
      if (!mounted.current) return;
      if (result.ok) {
        setMessages(result.data.messages);
        setError(null);
      } else {
        setError(result.message);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    mounted.current = true;
    setMessages(null);
    if (threadId) void refresh();
    return () => {
      mounted.current = false;
    };
  }, [threadId, refresh]);

  useEffect(() => {
    if (!threadId || !visible) return;
    const id = setInterval(() => void refresh(), OPEN_THREAD_POLL_MS);
    return () => clearInterval(id);
  }, [threadId, visible, refresh]);

  const send = useCallback(
    async (body: string): Promise<Result<DirectMessageClient>> => {
      if (!threadId) return { ok: false, message: "" };
      const result = await jsonFetch<{ message: DirectMessageClient }>(
        `/api/dm/threads/${encodeURIComponent(threadId)}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        }
      );
      if (result.ok) {
        void refresh();
        return { ok: true, data: result.data.message };
      }
      return result;
    },
    [threadId, refresh]
  );

  return { messages, loading, error, send, refresh };
}

/** جست‌وجوی افراد برای شروع گفتگو */
export async function searchPeopleApi(
  q: string
): Promise<Result<{ people: { userId: string; displayName: string; role: string }[] }>> {
  return jsonFetch(`/api/dm/users?q=${encodeURIComponent(q)}`);
}

/** شروع گفتگو با کاربر دیگر — find-or-create */
export async function openThreadWith(
  userId: string
): Promise<Result<{ thread: DirectThreadClient }>> {
  return jsonFetch("/api/dm/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
}
