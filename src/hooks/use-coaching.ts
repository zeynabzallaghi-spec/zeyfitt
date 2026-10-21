"use client";

/**
 * هوک مرکزی مرحله ۱۵ — اشتراک، فهرست مربیان، ارتباط‌های دانشجو و
 * عملیات پنل مربی. همه مجوزها سمت سرور است؛ کلاینت فقط وضعیت تأییدشده
 * API را نمایش می‌دهد و هیچ فرضی روی نتیجه عملیات نمی‌سازد.
 *
 * الگوی خطا مطابق سایر هوک‌ها: پیام‌ها از کد پایدار سرور با دیکشنری
 * server-messages به زبان رابط ترجمه می‌شوند؛ متن خام سرور هرگز
 * نمایش داده نمی‌شود. الگوی setState نیز مطابق هوک‌های موجود: هیچ
 * setState همگام در بدنه effect (فقط پس از await).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { apiErrorLabel } from "@/lib/i18n/sections/server-messages";
import type {
  ApplicationClient,
  CoachProfileClient,
  CoachRequestItemClient,
  CoachStudentItemClient,
  ConnectionItemClient,
  PublicCoachClient,
  SubscriptionClient,
} from "@/lib/coaching/client";

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

/** ترجمه کد خطا به زبان رابط — fallback عمومی بخش */
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
    const data = (await response.json()) as {
      error?: string;
      code?: string;
    };
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

/** لودر عمومی داده‌های GET — الگوی یکسان با سایر هوک‌های پروژه */
function useApiList<T>(
  url: string,
  enabled: boolean,
  pick: (data: unknown) => T
) {
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
    // pick یک selector پایدار است (درون رندر ساخته می‌شود اما فقط خوانش است)
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

/* ------------------------------- اشتراک ------------------------------- */

export function useSubscription(enabled: boolean) {
  const { data, loading, error, refresh } = useApiList<SubscriptionClient>(
    "/api/subscription",
    enabled,
    (json) => (json as { subscription: SubscriptionClient }).subscription
  );
  return { subscription: data, loading, error, refresh };
}

/* ------------------------------- مربیان ------------------------------- */

export function usePublicCoaches() {
  const { data, loading, error, refresh } = useApiList<PublicCoachClient[]>(
    "/api/coaches",
    true,
    (json) => (json as { coaches: PublicCoachClient[] }).coaches
  );
  return { coaches: data, loading, error, refresh };
}

/* --------------------------- ارتباط‌های دانشجو --------------------------- */

export function useMyConnections(enabled: boolean) {
  const { data, loading, error, refresh } = useApiList<ConnectionItemClient[]>(
    "/api/coach-connections",
    enabled,
    (json) => (json as { connections: ConnectionItemClient[] }).connections
  );
  return { connections: data, loading, error, refresh };
}

/** POST /api/coach-connections — ارسال درخواست ارتباط (دانشجو) */
export async function sendConnectionRequest(input: {
  coachId: string;
  cooperationType: string;
  message: string | null;
}): Promise<Result<ConnectionItemClient>> {
  return jsonFetch("/api/coach-connections", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

/** POST /api/coach-connections/[id]/cancel — لغو درخواست در انتظار */
export async function cancelConnectionRequest(id: string): Promise<Result<ConnectionItemClient>> {
  return jsonFetch(`/api/coach-connections/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
  });
}

/** POST /api/coach-connections/[id]/end — پایان ارتباط فعال (هر دو طرف) */
export async function endConnection(id: string): Promise<Result<ConnectionItemClient>> {
  return jsonFetch(`/api/coach-connections/${encodeURIComponent(id)}/end`, {
    method: "POST",
  });
}

/* ------------------------------ پنل مربی ------------------------------ */

export function useCoachRequests(enabled: boolean) {
  const { data, setData, loading, error, refresh } = useApiList<
    CoachRequestItemClient[]
  >(
    "/api/coach/requests",
    enabled,
    (json) => (json as { requests: CoachRequestItemClient[] }).requests
  );
  return { requests: data, setRequests: setData, loading, error, refresh };
}

export function useCoachStudents(enabled: boolean) {
  const { data, loading, error, refresh } = useApiList<CoachStudentItemClient[]>(
    "/api/coach/students",
    enabled,
    (json) => (json as { students: CoachStudentItemClient[] }).students
  );
  return { students: data, loading, error, refresh };
}

export function useCoachProfile(enabled: boolean) {
  const { data, setData, loading, error, refresh } =
    useApiList<CoachProfileClient>(
      "/api/coach/profile",
      enabled,
      (json) => (json as { profile: CoachProfileClient }).profile
    );
  return { profile: data, loading, error, refresh, setProfile: setData };
}

/** PUT /api/coach/profile — ذخیره پروفایل حرفه‌ای */
export async function saveCoachProfile(input: {
  displayName: string;
  headline: string;
  bio: string;
  specializations: string[];
  certifications: string[];
  experienceYears: number | null;
  cooperationTypes: string[];
}): Promise<Result<CoachProfileClient>> {
  // پاسخ سرور پاکه است: { profile: {...} } — باز کردن پاکه اینجا انجام
  // میشود تا قرارداد تایپ خروجی (Result<CoachProfileClient>) صادقانه بماند؛
  // پیشتر بدنه خام برگشت داده میشد و setProfile در ویو state را با شکل
  // اشتباه پر میکرد و رندر چیپهای تخصص روی undefined کرش میکرد.
  const result = await jsonFetch<{ profile: CoachProfileClient }>(
    "/api/coach/profile",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  return result.ok ? { ok: true, data: result.data.profile } : result;
}

/** POST /api/coach/profile/publish — تغییر انتشار عمومی */
export async function setCoachPublished(
  published: boolean
): Promise<Result<{ profile: { published: boolean; verified: boolean; canPublish: boolean } }>> {
  return jsonFetch("/api/coach/profile/publish", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ published }),
  });
}

/** POST /api/coach/requests/[id]/accept */
export async function acceptCoachRequest(
  id: string
): Promise<Result<CoachRequestItemClient>> {
  return jsonFetch(
    `/api/coach/requests/${encodeURIComponent(id)}/accept`,
    { method: "POST" }
  );
}

/** POST /api/coach/requests/[id]/reject */
export async function rejectCoachRequest(
  id: string,
  reason: string | null
): Promise<Result<CoachRequestItemClient>> {
  return jsonFetch(
    `/api/coach/requests/${encodeURIComponent(id)}/reject`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  );
}

/** GET /api/coach/apply — وضعیت درخواست مربی‌گری */
export function useCoachApplication(enabled: boolean) {
  const { data, loading, error, refresh } = useApiList<{
    application: ApplicationClient | null;
    role: string;
  }>(
    "/api/coach/apply",
    enabled,
    (json) =>
      json as { application: ApplicationClient | null; role: string }
  );
  return {
    application: data?.application ?? null,
    role: data?.role ?? null,
    loading,
    error,
    refresh,
  };
}
