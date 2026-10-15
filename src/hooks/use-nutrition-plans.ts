"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  NutritionPlanClient,
  NutritionPlanSummaryClient,
} from "@/lib/nutrition-storage";
import type {
  GeneratedNutritionPlan,
  NutritionSettings,
} from "@/lib/nutrition-engine/types";

/**
 * هوک مدیریت برنامه‌های غذایی کاربر جاری — داده همیشه از API متصل به نشست
 * خوانده می‌شود. هیچ داده ساختگی‌ای در کار نیست؛ فهرست خالی یعنی واقعاً
 * برنامه‌ای ساخته نشده است. (همان الگوی useWorkoutPlans)
 */

type Failure = { ok: false; message: string; kind?: "validation" | "infeasible" | "auth" | "insufficient" };
type Success<T> = { ok: true; data: T };
type Result<T> = Success<T> | Failure;

export interface UseNutritionPlansResult {
  plans: NutritionPlanSummaryClient[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** پیش‌نمایش برنامه بدون ذخیره — خروجی فقط برای نمایش است */
  previewPlan: (settings: NutritionSettings) => Promise<Result<GeneratedNutritionPlan>>;
  /** ساخت و ذخیره برنامه — برنامه جدید فعال و بقیه بایگانی می‌شوند */
  createPlan: (settings: NutritionSettings) => Promise<Result<NutritionPlanClient>>;
  /** تغییر عنوان یا وضعیت (فعال‌سازی/بایگانی) */
  updatePlan: (
    id: string,
    patch: { title?: string; status?: "active" | "archived" }
  ) => Promise<Result<NutritionPlanClient>>;
  /** حذف برنامه */
  deletePlan: (id: string) => Promise<Result<null>>;
  creating: boolean;
  /** شناسه برنامه‌ای که در حال حذف است */
  deletingId: string | null;
}

export async function parseNutritionFailure(response: Response): Promise<Failure> {
  if (response.status === 401) {
    return { ok: false, kind: "auth", message: "نشست شما منقضی شده است؛ دوباره وارد شوید." };
  }
  try {
    const data = (await response.json()) as { message?: string; error?: string };
    if (response.status === 422 && data.error === "PLAN_NOT_FEASIBLE") {
      return { ok: false, kind: "infeasible", message: data.message ?? "با این محدودیت‌ها برنامه معقولی ساخته نشد." };
    }
    if (response.status === 422 && data.error === "INSUFFICIENT_DATA") {
      return { ok: false, kind: "insufficient", message: data.message ?? "اطلاعات کافی برای برآورد موجود نیست." };
    }
    return { ok: false, kind: "validation", message: data.message ?? "اطلاعات واردشده معتبر نیست." };
  } catch {
    return { ok: false, message: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید." };
  }
}

export function useNutritionPlans(): UseNutritionPlansResult {
  const [plans, setPlans] = useState<NutritionPlanSummaryClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/nutrition", { cache: "no-store" });
      if (!mounted.current) return;
      if (response.status === 401) {
        setError("نشست شما منقضی شده است؛ صفحه را دوباره بارگذاری کنید.");
        setPlans([]);
        return;
      }
      if (!response.ok) {
        setError("خواندن برنامه‌های غذایی ممکن نشد؛ لطفاً دوباره تلاش کنید.");
        return;
      }
      const data = (await response.json()) as { plans: NutritionPlanSummaryClient[] };
      setPlans(Array.isArray(data.plans) ? data.plans : []);
    } catch {
      if (mounted.current) {
        setError("ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.");
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

  const previewPlan = useCallback(
    async (settings: NutritionSettings): Promise<Result<GeneratedNutritionPlan>> => {
      try {
        const response = await fetch("/api/nutrition/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        if (response.ok) {
          const data = (await response.json()) as { plan: GeneratedNutritionPlan };
          return { ok: true, data: data.plan };
        }
        return await parseNutritionFailure(response);
      } catch {
        return { ok: false, message: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید." };
      }
    },
    []
  );

  const createPlan = useCallback(
    async (settings: NutritionSettings): Promise<Result<NutritionPlanClient>> => {
      setCreating(true);
      try {
        const response = await fetch("/api/nutrition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });
        if (response.status === 201) {
          const data = (await response.json()) as { plan: NutritionPlanClient };
          await refresh();
          return { ok: true, data: data.plan };
        }
        return await parseNutritionFailure(response);
      } catch {
        return { ok: false, message: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید." };
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
    ): Promise<Result<NutritionPlanClient>> => {
      try {
        const response = await fetch(`/api/nutrition/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (response.ok) {
          const data = (await response.json()) as { plan: NutritionPlanClient };
          await refresh();
          return { ok: true, data: data.plan };
        }
        return await parseNutritionFailure(response);
      } catch {
        return { ok: false, message: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید." };
      }
    },
    [refresh]
  );

  const deletePlan = useCallback(
    async (id: string): Promise<Result<null>> => {
      setDeletingId(id);
      try {
        const response = await fetch(`/api/nutrition/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await refresh();
          return { ok: true, data: null };
        }
        return await parseNutritionFailure(response);
      } catch {
        return { ok: false, message: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید." };
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
