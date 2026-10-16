"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { apiErrorLabel, issueLabel, genericIssueMessage } from "@/lib/i18n/sections/server-messages";
import type { WeightEntryClient } from "@/lib/weight";

/**
 * هوک مدیریت اندازه‌گیری‌های وزن کاربر جاری — داده همیشه از API متصل به
 * نشست خوانده می‌شود و پس از هر تغییر دوباره همگام می‌گردد. هیچ داده
 * ساختگی‌ای در کار نیست؛ خروجی خالی یعنی واقعاً رکوردی ثبت نشده است.
 */

interface AddResult {
  ok: boolean;
  /** پیام فارسی خطای اعتبارسنجی یا سرور */
  message?: string;
}

export interface UseWeightEntriesResult {
  entries: WeightEntryClient[];
  loading: boolean;
  /** پیام خطای خواندن — قابل تلاش مجدد با refresh */
  error: string | null;
  refresh: () => Promise<void>;
  addEntry: (weightKg: string, recordedAt: string) => Promise<AddResult>;
  removeEntry: (id: string) => Promise<AddResult>;
  adding: boolean;
  /** شناسه رکوردی که در حال حذف است */
  removingId: string | null;
}

export function useWeightEntries(): UseWeightEntriesResult {
  const [entries, setEntries] = useState<WeightEntryClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/weight", { cache: "no-store" });
      if (!mounted.current) return;
      if (response.status === 401) {
        setError(
          currentUiLocale() === "en"
            ? "Your session has expired; please reload the page."
            : "نشست شما منقضی شده است؛ صفحه را دوباره بارگذاری کنید."
        );
        setEntries([]);
        return;
      }
      if (!response.ok) {
        setError(
          currentUiLocale() === "en"
            ? "Could not read the weight history; please try again."
            : "خواندن تاریخچه وزن ممکن نشد؛ لطفاً دوباره تلاش کنید."
        );
        return;
      }
      const data = (await response.json()) as { entries: WeightEntryClient[] };
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      if (mounted.current) {
        setError(
          currentUiLocale() === "en"
            ? "Could not reach the server; please check your connection."
            : "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید."
        );
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const addEntry = useCallback(
    async (weightKg: string, recordedAt: string): Promise<AddResult> => {
      setAdding(true);
      try {
        const response = await fetch("/api/weight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weightKg, recordedAt }),
        });
        if (response.status === 201) {
          await refresh();
          return { ok: true };
        }
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
        if (response.status === 400) {
          const data = (await response.json().catch(() => null)) as
            | { error?: string; issues?: { code: string; path: string }[] }
            | null;
          const label = data?.issues?.[0]?.code
            ? issueLabel("weight", data.issues[0].code, locale)
            : null;
          return {
            ok: false,
            message:
              label ??
              (data?.error ? apiErrorLabel(data.error, locale) : null) ??
              (locale === "en"
                ? "The submitted information is not valid."
                : "اطلاعات واردشده معتبر نیست."),
          };
        }
        return {
          ok: false,
          message:
            locale === "en"
              ? "Weight could not be recorded; please try again."
              : "ثبت وزن انجام نشد؛ لطفاً دوباره تلاش کنید.",
        };
      } catch {
        return {
          ok: false,
          message:
            currentUiLocale() === "en"
              ? "Could not reach the server; please check your connection."
              : "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.",
        };
      } finally {
        if (mounted.current) setAdding(false);
      }
    },
    [refresh]
  );

  const removeEntry = useCallback(
    async (id: string): Promise<AddResult> => {
      setRemovingId(id);
      try {
        const response = await fetch(`/api/weight?id=${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await refresh();
          return { ok: true };
        }
        if (response.status === 401) {
          return { ok: false, message: "نشست شما منقضی شده است؛ دوباره وارد شوید." };
        }
        return { ok: false, message: "حذف اندازه‌گیری انجام نشد؛ دوباره تلاش کنید." };
      } catch {
        return { ok: false, message: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید." };
      } finally {
        if (mounted.current) setRemovingId(null);
      }
    },
    [refresh]
  );

  return {
    entries,
    loading,
    error,
    refresh,
    addEntry,
    removeEntry,
    adding,
    removingId,
  };
}
