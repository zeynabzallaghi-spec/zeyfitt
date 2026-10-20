"use client";

/**
 * هوک‌های مرحله ۱۹.۶ — اعلان‌ها، تعرفه/پرداخت، اطلاعات بانکی، حرکات شخصی،
 * اطلاعات تکمیلی دانشجو و مسدودسازی پیام‌رسان.
 * همان الگوی هوک‌های موجود: پیام خطا فقط از کد پایدار سرور با دیکشنری
 * server-messages؛ هیچ تصمیم مجوزی روی کلاینت.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { apiErrorLabel } from "@/lib/i18n/sections/server-messages";

type Failure = { ok: false; message: string };
type Success<T> = { ok: true; data: T };
type Result<T> = Success<T> | Failure;

function failOf(response: Response): Failure {
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
  return {
    ok: false,
    message: apiErrorLabel("INTERNAL", locale) ?? "خطا",
  };
}

async function failureOf(response: Response): Promise<Failure> {
  const locale = currentUiLocale();
  try {
    const data = (await response.json()) as { error?: string; message?: string };
    const code = data.error ?? "INTERNAL";
    return {
      ok: false,
      message: apiErrorLabel(code, locale) ?? data.message ?? apiErrorLabel("INTERNAL", locale) ?? "خطا",
    };
  } catch {
    return failOf(response);
  }
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return await failureOf(response);
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      message:
        currentUiLocale() === "en"
          ? "Could not reach the server; please check your connection."
          : "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.",
    };
  }
}

/* ------------------------------ اعلان‌ها ------------------------------ */

export interface NotificationItemClient {
  id: string;
  type: string;
  payload: Record<string, string | number | boolean | null>;
  readAt: string | null;
  createdAt: string;
}

export function useNotifications(enabled: boolean, pollMs = 20000) {
  const [items, setItems] = useState<NotificationItemClient[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!mounted.current) return;
      if (!response.ok) {
        setError((await failureOf(response)).message);
      } else {
        const data = (await response.json()) as {
          items: NotificationItemClient[];
          unreadCount: number;
        };
        setItems(data.items);
        setUnread(data.unreadCount);
        setError(null);
      }
    } catch {
      if (mounted.current) setError(null); // شبکه ناپایدار — بی‌سروصدا
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    mounted.current = true;
    if (enabled) {
      void refresh();
      const timer = setInterval(() => {
        if (document.visibilityState === "visible") void refresh();
      }, pollMs);
      return () => {
        mounted.current = false;
        clearInterval(timer);
      };
    }
    return () => {
      mounted.current = false;
    };
  }, [enabled, refresh, pollMs]);

  const markRead = useCallback(
    async (id: string) => {
      const result = await jsonFetch<{ ok: boolean }>(`/api/notifications/${encodeURIComponent(id)}/read`, {
        method: "POST",
      });
      if (result.ok) void refresh();
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    const result = await jsonFetch<{ ok: boolean }>("/api/notifications/read-all", {
      method: "POST",
    });
    if (result.ok) void refresh();
  }, [refresh]);

  return { items, unread, loading, error, refresh, markRead, markAllRead };
}

/* ------------------------------ اطلاعات بانکی ------------------------------ */

export interface BankingInfoClient {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  cardNumber: string;
  sheba: string;
  note: string;
  updatedAt: string | null;
}

export function useBanking(enabled: boolean) {
  const [banking, setBanking] = useState<BankingInfoClient | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await jsonFetch<{ banking: BankingInfoClient }>("/api/profile/banking");
      if (!mountedRef.current) return;
      if (result.ok) setBanking(result.data.banking);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) void load();
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, load]);

  const save = useCallback(
    async (payload: Partial<BankingInfoClient>): Promise<Result<{ banking: BankingInfoClient }>> => {
      setSaving(true);
      const result = await jsonFetch<{ banking: BankingInfoClient }>("/api/profile/banking", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaving(false);
      if (result.ok) setBanking(result.data.banking);
      return result;
    },
    []
  );

  return { banking, loading, saving, save, reload: load };
}

/* ------------------------------ تعرفه و پرداخت ------------------------------ */

export interface CoachTariffClient {
  privatePriceIrr: number | null;
  privatePriceUsd: number | null;
  semiPrivatePriceIrr: number | null;
  semiPrivatePriceUsd: number | null;
  updatedAt: string;
}

export interface PaymentRequestClient {
  id: string;
  status: string;
  serviceType: string;
  amount: number;
  currency: string;
  description: string;
  externalLink: string;
  studentConfirmedAt: string | null;
  studentDeclinedAt: string | null;
  createdAt: string;
  coach: { userId: string; displayName: string };
  student: { userId: string; displayName: string };
}

export function useCoachTariff(enabled: boolean) {
  const [tariff, setTariff] = useState<CoachTariffClient | null>(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await jsonFetch<{ tariff: CoachTariffClient | null }>("/api/coach/tariff");
      if (!mountedRef.current) return;
      if (result.ok) setTariff(result.data.tariff);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) void load();
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, load]);

  const save = useCallback(
    async (payload: Partial<CoachTariffClient>): Promise<Result<{ tariff: CoachTariffClient }>> => {
      const result = await jsonFetch<{ tariff: CoachTariffClient }>("/api/coach/tariff", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (result.ok) setTariff(result.data.tariff);
      return result;
    },
    []
  );

  return { tariff, loading, save };
}

export function useCoachPayments(enabled: boolean) {
  const [payments, setPayments] = useState<PaymentRequestClient[] | null>(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await jsonFetch<{ payments: PaymentRequestClient[] }>("/api/coach/payments");
      if (!mountedRef.current) return;
      if (result.ok) setPayments(result.data.payments);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) void load();
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, load]);

  const create = useCallback(
    async (payload: {
      connectionId: string;
      serviceType: string;
      amount: number;
      currency: string;
      description: string;
      externalLink: string;
    }): Promise<Result<{ payment: PaymentRequestClient }>> => {
      const result = await jsonFetch<{ payment: PaymentRequestClient }>("/api/coach/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (result.ok) void load();
      return result;
    },
    [load]
  );

  const cancel = useCallback(
    async (id: string): Promise<Result<{ payment: PaymentRequestClient }>> => {
      const result = await jsonFetch<{ payment: PaymentRequestClient }>(
        `/api/coach/payments/${encodeURIComponent(id)}/cancel`,
        { method: "POST" }
      );
      if (result.ok) void load();
      return result;
    },
    [load]
  );

  return { payments, loading, create, cancel, reload: load };
}

export function useMyPayments(enabled: boolean) {
  const [payments, setPayments] = useState<PaymentRequestClient[] | null>(null);
  const [loading, setLoading] = useState(enabled);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await jsonFetch<{ payments: PaymentRequestClient[] }>("/api/payments");
      if (!mountedRef.current) return;
      if (result.ok) setPayments(result.data.payments);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) void load();
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, load]);

  const decide = useCallback(
    async (id: string, decision: "confirm" | "decline"): Promise<Result<{ payment: PaymentRequestClient }>> => {
      const result = await jsonFetch<{ payment: PaymentRequestClient }>(
        `/api/payments/${encodeURIComponent(id)}/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ decision }),
        }
      );
      if (result.ok) void load();
      return result;
    },
    [load]
  );

  return { payments, loading, decide, reload: load };
}

/* ------------------------------ حرکات شخصی مربی ------------------------------ */

export interface CoachExerciseMediaClient {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CoachExerciseClient {
  id: string;
  faName: string;
  enName: string;
  category: string;
  equipment: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description: string;
  tips: string;
  media: CoachExerciseMediaClient[];
  createdAt: string;
  updatedAt: string;
}

export function useCoachExercises(enabled: boolean) {
  const [exercises, setExercises] = useState<CoachExerciseClient[] | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const result = await jsonFetch<{ exercises: CoachExerciseClient[] }>("/api/coach/exercises");
      if (!mountedRef.current) return;
      if (result.ok) {
        setExercises(result.data.exercises);
        setError(null);
      } else {
        setError(result.message);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [enabled]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) void load();
    return () => {
      mountedRef.current = false;
    };
  }, [enabled, load]);

  const create = useCallback(
    async (payload: unknown): Promise<Result<{ exercise: CoachExerciseClient }>> => {
      const result = await jsonFetch<{ exercise: CoachExerciseClient }>("/api/coach/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (result.ok) void load();
      return result;
    },
    [load]
  );

  const update = useCallback(
    async (id: string, payload: unknown): Promise<Result<{ exercise: CoachExerciseClient }>> => {
      const result = await jsonFetch<{ exercise: CoachExerciseClient }>(
        `/api/coach/exercises/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (result.ok) void load();
      return result;
    },
    [load]
  );

  const remove = useCallback(
    async (id: string): Promise<Result<{ ok: boolean }>> => {
      const result = await jsonFetch<{ ok: boolean }>(
        `/api/coach/exercises/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (result.ok) void load();
      return result;
    },
    [load]
  );

  const uploadMedia = useCallback(
    async (exerciseId: string, file: File): Promise<Result<{ media: CoachExerciseMediaClient }>> => {
      const form = new FormData();
      form.append("file", file);
      const result = await jsonFetch<{ media: CoachExerciseMediaClient; exercise: CoachExerciseClient }>(
        `/api/coach/exercises/${encodeURIComponent(exerciseId)}/media`,
        { method: "POST", body: form }
      );
      if (result.ok) void load();
      return result;
    },
    [load]
  );

  const deleteMedia = useCallback(
    async (mediaId: string): Promise<Result<{ ok: boolean }>> => {
      const result = await jsonFetch<{ ok: boolean }>(
        `/api/coach/exercises/media/${encodeURIComponent(mediaId)}`,
        { method: "DELETE" }
      );
      if (result.ok) void load();
      return result;
    },
    [load]
  );

  return { exercises, loading, error, create, update, remove, uploadMedia, deleteMedia, reload: load };
}

/* ------------------------------ اطلاعات تکمیلی دانشجو ------------------------------ */

export interface CoachStudentDetailClient {
  student: {
    userId: string;
    displayName: string;
    profile: Record<string, unknown> | null;
    profileCompleted: boolean;
  };
  connection: { id: string; cooperationType: string; startedAt: string | null };
  plans: {
    workout: { id: string; title: string; version: number; sentAt: string }[];
    nutrition: { id: string; title: string; version: number; sentAt: string }[];
  };
  progress: { sessionsCount: number; lastSessionAt: string | null };
  note: { content: string; createdAt: string; updatedAt: string } | null;
}

export function useCoachStudentDetail(studentId: string | null) {
  const [detail, setDetail] = useState<CoachStudentDetailClient | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const result = await jsonFetch<{ detail: CoachStudentDetailClient }>(
        `/api/coach/students/${encodeURIComponent(studentId)}`
      );
      if (!mountedRef.current) return;
      if (result.ok) {
        setDetail(result.data.detail);
        setError(null);
      } else {
        setError(result.message);
        setDetail(null);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [studentId]);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    if (studentId) void load();
    return () => {
      mountedRef.current = false;
    };
  }, [studentId, load]);

  const saveNote = useCallback(
    async (content: string): Promise<Result<{ note: CoachStudentDetailClient["note"] }>> => {
      if (!studentId) return { ok: false, message: "" };
      const result = await jsonFetch<{ note: CoachStudentDetailClient["note"] }>(
        `/api/coach/students/${encodeURIComponent(studentId)}/note`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );
      if (result.ok) void load();
      return result;
    },
    [studentId, load]
  );

  return { detail, loading, error, saveNote, reload: load };
}

/* ------------------------------ مسدودسازی پیام‌رسان ------------------------------ */

export async function setChatBlock(
  connectionId: string,
  action: "block" | "unblock"
): Promise<Result<{ blocked: boolean; blockedByMe: boolean }>> {
  return jsonFetch(`/api/coach-chat/connections/${encodeURIComponent(connectionId)}/block`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
}
