"use client";

/**
 * هوک‌های مرحله ۱۹.۵ — درخواست ارتقا، مرکز پشتیبانی و پنل ادمین.
 *
 * همه مجوزها سمت سرور اعمال می‌شود؛ کلاینت فقط وضعیت تأییدشده API را
 * نمایش می‌دهد. الگوی خطا مطابق use-coaching: کد پایدار سرور با
 * server-messages ترجمه می‌شود و متن خام سرور هرگز نمایش داده نمیشود.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { apiErrorLabel } from "@/lib/i18n/sections/server-messages";

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

function failFrom(response: Response): Failure {
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
    message: apiErrorLabel("INTERNAL", locale) ?? netFail().message,
  };
}

async function failureOf(response: Response): Promise<Failure> {
  const locale = currentUiLocale();
  try {
    const data = (await response.json()) as { error?: string; code?: string };
    const code = data.error ?? data.code ?? "INTERNAL";
    return {
      ok: false,
      message: apiErrorLabel(code, locale) ?? netFail().message,
    };
  } catch {
    return netFail();
  }
}

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) return await failureOf(response);
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return netFail();
  }
}

function useApiList<T>(url: string, enabled: boolean, pick: (data: unknown) => T) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!mounted.current) return;
      if (!response.ok) {
        setError((await failureOf(response)).message);
      } else {
        const json = (await response.json()) as unknown;
        setData(pick(json));
      }
    } catch {
      if (mounted.current) setError(netFail().message);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    mounted.current = true;
    if (enabled) void refresh();
    return () => {
      mounted.current = false;
    };
  }, [enabled, refresh]);

  return { data, setData, loading, error, refresh };
}

function jsonInit(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  };
}

/* ============================ درخواست ارتقای Premium ============================ */

export interface PremiumRequestClient {
  status: string;
  message: string | null;
  decidedNote: string | null;
  decidedAt: string | null;
  createdAt: string;
}

export function usePremiumRequest(enabled: boolean) {
  const { data, loading, error, refresh } = useApiList<{
    request: PremiumRequestClient | null;
    role: string;
  }>("/api/subscription/request", enabled, (json) => json as {
    request: PremiumRequestClient | null;
    role: string;
  });
  const [busy, setBusy] = useState(false);
  const submit = useCallback(
    async (message: string): Promise<Result<PremiumRequestClient>> => {
      setBusy(true);
      const result = await jsonFetch<{ request: PremiumRequestClient }>(
        "/api/subscription/request",
        jsonInit("POST", { message: message.trim() ? message.trim() : undefined })
      );
      setBusy(false);
      if (result.ok) void refresh();
      return result.ok
        ? { ok: true, data: result.data.request }
        : result;
    },
    [refresh]
  );
  return { request: data?.request ?? null, role: data?.role ?? null, loading, error, busy, submit, refresh };
}

/* ============================ مرکز پشتیبانی (کاربر) ============================ */

export interface SupportTicketClient {
  id: string;
  category: string;
  subject: string;
  body: string;
  status: string;
  reply: string | null;
  repliedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

export function useSupportTickets(enabled: boolean) {
  const { data, setData, loading, error, refresh } = useApiList<{ tickets: SupportTicketClient[] }>(
    "/api/support/tickets",
    enabled,
    (json) => json as { tickets: SupportTicketClient[] }
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const create = useCallback(
    async (input: { category: string; subject: string; body: string }): Promise<Result<SupportTicketClient>> => {
      const result = await jsonFetch<{ ticket: SupportTicketClient }>(
        "/api/support/tickets",
        jsonInit("POST", input)
      );
      if (result.ok) void refresh();
      return result.ok ? { ok: true, data: result.data.ticket } : result;
    },
    [refresh]
  );

  const act = useCallback(
    async (id: string, action: "close" | "reopen"): Promise<Result<{ id: string; status: string }>> => {
      setBusyId(id);
      const result = await jsonFetch<{ ticket: { id: string; status: string } }>(
        `/api/support/tickets/${encodeURIComponent(id)}/action`,
        jsonInit("POST", { action })
      );
      setBusyId(null);
      if (result.ok) {
        void refresh();
        return { ok: true, data: result.data.ticket };
      }
      return result;
    },
    [refresh]
  );

  return {
    tickets: data?.tickets ?? [],
    setData,
    loading,
    error,
    refresh,
    busyId,
    create,
    act,
  };
}

/* ============================ پنل ادمین ============================ */

export interface AdminOverviewClient {
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

export function useAdminOverview(enabled: boolean) {
  return useApiList<{ overview: AdminOverviewClient }>(
    "/api/admin/overview",
    enabled,
    (json) => json as { overview: AdminOverviewClient }
  );
}

export interface AdminUserRowClient {
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

export function useAdminUsers(q: string, role: string, enabled: boolean) {
  // پارامترهای خالی ارسال نمیشوند — مقدار خالی با فیلتر معادل «بدون فیلتر» است
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (role) params.set("role", role);
  const url = `/api/admin/users?${params.toString()}`;
  return useApiList<{ rows: AdminUserRowClient[]; total: number }>(
    url,
    enabled,
    (json) => json as { rows: AdminUserRowClient[]; total: number }
  );
}

export interface AdminApplicationRowClient {
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

export function useAdminCoachApplications(status: string, enabled: boolean) {
  return useApiList<{ applications: AdminApplicationRowClient[] }>(
    `/api/admin/coach-applications?status=${encodeURIComponent(status)}`,
    enabled,
    (json) => json as { applications: AdminApplicationRowClient[] }
  );
}

export interface AdminPremiumRequestRowClient {
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

export function useAdminPremiumRequests(status: string, enabled: boolean) {
  return useApiList<{ requests: AdminPremiumRequestRowClient[] }>(
    `/api/admin/premium-requests?status=${encodeURIComponent(status)}`,
    enabled,
    (json) => json as { requests: AdminPremiumRequestRowClient[] }
  );
}

export interface AdminTicketRowClient {
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

export function useAdminTickets(status: string, enabled: boolean) {
  return useApiList<{ tickets: AdminTicketRowClient[] }>(
    `/api/admin/tickets?status=${encodeURIComponent(status)}`,
    enabled,
    (json) => json as { tickets: AdminTicketRowClient[] }
  );
}

/* ------------------------------ عملیات ادمین ------------------------------ */

export function useAdminActions() {
  const [busyId, setBusyId] = useState<string | null>(null);

  const setRole = useCallback(
    async (userId: string, role: string): Promise<Result<{ id: string; role: string }>> => {
      setBusyId(userId);
      const result = await jsonFetch<{ user: { id: string; role: string } }>(
        `/api/admin/users/${encodeURIComponent(userId)}/role`,
        jsonInit("POST", { role })
      );
      setBusyId(null);
      return result.ok ? { ok: true, data: result.data.user } : result;
    },
    []
  );

  const setSubscription = useCallback(
    async (
      userId: string,
      tier: "FREE" | "PREMIUM",
      days: number | null,
      note: string
    ): Promise<Result<{ tier: string; expiresAt: string | null }>> => {
      setBusyId(userId);
      const result = await jsonFetch<{ subscription: { tier: string; expiresAt: string | null } }>(
        `/api/admin/users/${encodeURIComponent(userId)}/subscription`,
        jsonInit("POST", { tier, days, note: note.trim() ? note.trim() : undefined })
      );
      setBusyId(null);
      return result.ok ? { ok: true, data: result.data.subscription } : result;
    },
    []
  );

  const decideApplication = useCallback(
    async (
      applicationId: string,
      decision: "approved" | "rejected",
      opts: { note?: string; publish?: boolean } = {}
    ): Promise<Result<{ status: string }>> => {
      setBusyId(applicationId);
      const result = await jsonFetch<{ application: { status: string } }>(
        `/api/admin/coach-applications/${encodeURIComponent(applicationId)}/decide`,
        jsonInit("POST", { decision, ...opts })
      );
      setBusyId(null);
      return result.ok ? { ok: true, data: result.data.application } : result;
    },
    []
  );

  const decidePremiumRequest = useCallback(
    async (
      requestId: string,
      decision: "approved" | "rejected",
      opts: { note?: string; days?: number | null } = {}
    ): Promise<Result<{ status: string }>> => {
      setBusyId(requestId);
      const result = await jsonFetch<{ request: { status: string } }>(
        `/api/admin/premium-requests/${encodeURIComponent(requestId)}/decide`,
        jsonInit("POST", { decision, ...opts })
      );
      setBusyId(null);
      return result.ok ? { ok: true, data: result.data.request } : result;
    },
    []
  );

  const updateTicket = useCallback(
    async (
      ticketId: string,
      input: { reply?: string; status?: string }
    ): Promise<Result<AdminTicketRowClient>> => {
      setBusyId(ticketId);
      const result = await jsonFetch<{ ticket: AdminTicketRowClient }>(
        `/api/admin/tickets/${encodeURIComponent(ticketId)}`,
        jsonInit("POST", input)
      );
      setBusyId(null);
      return result.ok ? { ok: true, data: result.data.ticket } : result;
    },
    []
  );

  return { busyId, setRole, setSubscription, decideApplication, decidePremiumRequest, updateTicket };
}

/* ============================ درخواست مربی‌گری (کاربر) ============================ */

export interface CoachApplicationClient {
  status: string;
  decidedAt: string | null;
  createdAt: string;
}

/**
 * GET وضعیت درخواست مربی‌گری خود کاربر + POST ثبت/ارسال مجدد.
 * (GET /api/coach/apply از مرحله ۱۵ موجود است؛ POST همان مسیر رسمی.)
 */
export function useCoachApplication(enabled: boolean) {
  const { data, loading, error, refresh } = useApiList<{
    application: CoachApplicationClient | null;
    role: string;
  }>("/api/coach/apply", enabled, (json) => json as {
    application: CoachApplicationClient | null;
    role: string;
  });
  const [busy, setBusy] = useState(false);

  const submit = useCallback(
    async (input: {
      message?: string;
      experienceYears?: number;
      certifications?: string[];
    }): Promise<Result<CoachApplicationClient>> => {
      setBusy(true);
      const result = await jsonFetch<{ application: CoachApplicationClient }>(
        "/api/coach/apply",
        jsonInit("POST", input)
      );
      setBusy(false);
      if (result.ok) void refresh();
      return result.ok ? { ok: true, data: result.data.application } : result;
    },
    [refresh]
  );

  return {
    application: data?.application ?? null,
    role: data?.role ?? null,
    loading,
    error,
    busy,
    submit,
    refresh,
  };
}
