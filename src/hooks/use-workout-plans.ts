"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  WorkoutPlanClient,
  WorkoutPlanSummaryClient,
} from "@/lib/plan-storage";
import type { GeneratedPlan, PlanSettings } from "@/lib/plan-engine/types";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import {
  apiErrorLabel,
  engineErrorLabel,
  issueLabel,
  genericIssueMessage,
} from "@/lib/i18n/sections/server-messages";

/**
 * هوک مدیریت برنامه‌های تمرینی کاربر جاری — داده همیشه از API متصل به نشست
 * خوانده می‌شود. هیچ داده ساختگی‌ای در کار نیست؛ فهرست خالی یعنی واقعاً
 * برنامه‌ای ساخته نشده است.
 */

type Failure = { ok: false; message: string; kind?: "validation" | "infeasible" | "auth" };
type Success<T> = { ok: true; data: T };
type Result<T> = Success<T> | Failure;

export interface UseWorkoutPlansResult {
  plans: WorkoutPlanSummaryClient[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** پیش‌نمایش برنامه بدون ذخیره — خروجی فقط برای نمایش است */
  previewPlan: (settings: PlanSettings) => Promise<Result<GeneratedPlan>>;
  /** ساخت و ذخیره برنامه — برنامه جدید فعال و بقیه بایگانی می‌شوند */
  createPlan: (settings: PlanSettings) => Promise<Result<WorkoutPlanClient>>;
  /** تغییر عنوان یا وضعیت (فعال‌سازی/بایگانی) */
  updatePlan: (
    id: string,
    patch: { title?: string; status?: "active" | "archived" }
  ) => Promise<Result<WorkoutPlanClient>>;
  /** حذف برنامه */
  deletePlan: (id: string) => Promise<Result<null>>;
  creating: boolean;
  /** شناسه برنامه‌ای که در حال حذف است */
  deletingId: string | null;
}

function netFail(): Failure {
  return {
    ok: false,
    message:
      currentUiLocale() === "en"
        ? "Could not reach the server; please check your connection."
        : "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.",
  };
}

async function parseFailure(response: Response): Promise<Failure> {
  const locale = currentUiLocale();
  if (response.status === 401) {
    return { ok: false, kind: "auth", message: expiredMessage() };
  }
  try {
    const data = (await response.json()) as {
      message?: string;
      error?: string;
      code?: string;
      params?: Record<string, string>;
      issues?: { code: string; path: string }[];
    };
    if (response.status === 422 && data.error === "PLAN_NOT_FEASIBLE") {
      const label =
        engineErrorLabel(data.code, data.params, locale) ??
        (locale === "en"
          ? "No reasonable plan could be built with these settings."
          : "با این تنظیمات برنامه معقولی ساخته نشد.");
      return { ok: false, kind: "infeasible", message: label };
    }
    if (data.error === "VALIDATION") {
      const first = data.issues?.[0]?.code;
      const label = first ? issueLabel("plan", first, locale) : null;
      return {
        ok: false,
        kind: "validation",
        message:
          label ??
          apiErrorLabel("VALIDATION", locale) ??
          genericIssueMessage(locale),
      };
    }
    const label = data.error ? apiErrorLabel(data.error, locale) : null;
    return {
      ok: false,
      kind: "validation",
      message:
        label ??
        (locale === "en"
          ? "The submitted information is not valid."
          : "اطلاعات واردشده معتبر نیست."),
    };
  } catch {
    return netFail();
  }
}

function expiredMessage(): string {
  return currentUiLocale() === "en"
    ? "Your session has expired; please sign in again."
    : "نشست شما منقضی شده است؛ دوباره وارد شوید.";
}

export function useWorkoutPlans(): UseWorkoutPlansResult {
  const [plans, setPlans] = useState<WorkoutPlanSummaryClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/plans", { cache: "no-store" });
      if (!mounted.current) return;
      if (response.status === 401) {
        setError(expiredMessage());
        setPlans([]);
        return;
      }
      if (!response.ok) {
        setError(
          currentUiLocale() === "en"
            ? "Could not read the plans; please try again."
            : "خواندن برنامه‌ها ممکن نشد؛ لطفاً دوباره تلاش کنید."
        );
        return;
      }
      const data = (await response.json()) as { plans: WorkoutPlanSummaryClient[] };
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch {
      if (mounted.current) {
        setError(netFail().message);
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

  const previewPlan = useCallback(async (settings: PlanSettings): Promise<Result<GeneratedPlan>> => {
    try {
      const response = await fetch("/api/plans/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, contentLocale: currentUiLocale() }),
      });
      if (response.ok) {
        const data = (await response.json()) as { plan: GeneratedPlan };
        return { ok: true, data: data.plan };
      }
      return await parseFailure(response);
    } catch {
      return netFail();
    }
  }, []);

  const createPlan = useCallback(
    async (settings: PlanSettings): Promise<Result<WorkoutPlanClient>> => {
      setCreating(true);
      try {
        const response = await fetch("/api/plans", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...settings, contentLocale: currentUiLocale() }),
        });
        if (response.status === 201) {
          const data = (await response.json()) as { plan: WorkoutPlanClient };
          await refresh();
          return { ok: true, data: data.plan };
        }
        return await parseFailure(response);
      } catch {
        return netFail();
      } finally {
        if (mounted.current) setCreating(false);
      }
    },
    [refresh]
  );

  const updatePlan = useCallback(
    async (
      id: string,
      patch: { title?: string; status?: "active" | "archived" }
    ): Promise<Result<WorkoutPlanClient>> => {
      try {
        const response = await fetch(`/api/plans/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (response.ok) {
          const data = (await response.json()) as { plan: WorkoutPlanClient };
          await refresh();
          return { ok: true, data: data.plan };
        }
        return await parseFailure(response);
      } catch {
        return netFail();
      }
    },
    [refresh]
  );

  const deletePlan = useCallback(
    async (id: string): Promise<Result<null>> => {
      setDeletingId(id);
      try {
        const response = await fetch(`/api/plans/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await refresh();
          return { ok: true, data: null };
        }
        return await parseFailure(response);
      } catch {
        return netFail();
      } finally {
        if (mounted.current) setDeletingId(null);
      }
    },
    [refresh]
  );

  return {
    plans,
    loading,
    error,
    refresh,
    previewPlan,
    createPlan,
    updatePlan,
    deletePlan,
    creating,
    deletingId,
  };
}
