"use client";

/**
 * هوک‌های برنامه‌های اختصاصی مربی — مرحله ۱۶.
 * همان الگوی use-coaching: پیام خطا فقط از کد پایدار سرور با دیکشنری
 * server-messages ترجمه می‌شود؛ متن خام سرور هرگز نمایش داده نمی‌شود و
 * هیچ تصمیم مجوزی روی کلاینت گرفته نمی‌شود.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { apiErrorLabel } from "@/lib/i18n/sections/server-messages";
import type {
  CoachPlanDetailClient,
  CoachPlanListItemClient,
  CoachPlanVersionClient,
  DeliveryDetailClient,
  DeliveryListItemClient,
} from "@/lib/coaching/plans-client";

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

/* ------------------------------ سمت مربی ------------------------------ */

export function useCoachWorkoutPlans(enabled: boolean) {
  const { data, setData, loading, error, refresh } = useApiList<CoachPlanListItemClient[]>(
    "/api/coach/workout-plans",
    enabled,
    (json) => (json as { plans: CoachPlanListItemClient[] }).plans
  );
  return { plans: data, setPlans: setData, loading, error, refresh };
}

export function useCoachNutritionPlans(enabled: boolean) {
  const { data, setData, loading, error, refresh } = useApiList<CoachPlanListItemClient[]>(
    "/api/coach/nutrition-plans",
    enabled,
    (json) => (json as { plans: CoachPlanListItemClient[] }).plans
  );
  return { plans: data, setPlans: setData, loading, error, refresh };
}

export async function createCoachWorkoutPlan(
  body: unknown
): Promise<Result<{ plan: CoachPlanDetailClient }>> {
  return jsonFetch("/api/coach/workout-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateCoachWorkoutPlan(
  id: string,
  body: unknown
): Promise<Result<{ plan: CoachPlanDetailClient }>> {
  return jsonFetch(`/api/coach/workout-plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getCoachWorkoutPlan(
  id: string
): Promise<Result<{ plan: CoachPlanDetailClient }>> {
  return jsonFetch(`/api/coach/workout-plans/${encodeURIComponent(id)}`);
}

export async function createCoachNutritionPlan(
  body: unknown
): Promise<Result<{ plan: CoachPlanDetailClient }>> {
  return jsonFetch("/api/coach/nutrition-plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function updateCoachNutritionPlan(
  id: string,
  body: unknown
): Promise<Result<{ plan: CoachPlanDetailClient }>> {
  return jsonFetch(`/api/coach/nutrition-plans/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function getCoachNutritionPlan(
  id: string
): Promise<Result<{ plan: CoachPlanDetailClient }>> {
  return jsonFetch(`/api/coach/nutrition-plans/${encodeURIComponent(id)}`);
}

export async function publishCoachPlan(
  kind: "workout" | "nutrition",
  id: string,
  connectionId: string
): Promise<Result<{ delivery: CoachPlanVersionClient }>> {
  const base = kind === "workout" ? "/api/coach/workout-plans" : "/api/coach/nutrition-plans";
  return jsonFetch(`${base}/${encodeURIComponent(id)}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId }),
  });
}

export async function archiveCoachPlan(
  kind: "workout" | "nutrition",
  id: string
): Promise<Result<{ plan: CoachPlanListItemClient }>> {
  const base = kind === "workout" ? "/api/coach/workout-plans" : "/api/coach/nutrition-plans";
  return jsonFetch(`${base}/${encodeURIComponent(id)}/archive`, { method: "POST" });
}

/* ------------------------------ سمت دانشجو ------------------------------ */

export function useMyDeliveries(enabled: boolean, kind?: "workout" | "nutrition") {
  const url = kind ? `/api/coach-plans?kind=${kind}` : "/api/coach-plans";
  const { data, loading, error, refresh } = useApiList<DeliveryListItemClient[]>(
    url,
    enabled,
    (json) => (json as { deliveries: DeliveryListItemClient[] }).deliveries
  );
  return { deliveries: data, loading, error, refresh };
}

export async function getDelivery(id: string): Promise<Result<{ delivery: DeliveryDetailClient }>> {
  return jsonFetch(`/api/coach-plans/${encodeURIComponent(id)}`);
}
