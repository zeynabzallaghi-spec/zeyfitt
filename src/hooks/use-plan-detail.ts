"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import type { WorkoutPlanClient } from "@/lib/plan-storage";

/**
 * خواندن جزئیات یک برنامه — با بررسی مالکیت سمت سرور؛ پاسخ 404 برای
 * برنامه ناموجود و برنامه کاربر دیگر یکسان است.
 */
export interface UsePlanDetailResult {
  plan: WorkoutPlanClient | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlanDetail(id: string | null): UsePlanDetailResult {
  const [plan, setPlan] = useState<WorkoutPlanClient | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    if (!id) {
      setPlan(null);
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const response = await fetch(`/api/plans/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (!mounted.current) return;
      if (response.status === 401) {
        setError(
          currentUiLocale() === "en"
            ? "Your session has expired; please reload the page."
            : "نشست شما منقضی شده است؛ صفحه را دوباره بارگذاری کنید."
        );
        setPlan(null);
        return;
      }
      if (!response.ok) {
        setError(
          currentUiLocale() === "en"
            ? "Could not read the plan; please try again."
            : "خواندن برنامه ممکن نشد؛ لطفاً دوباره تلاش کنید."
        );
        setPlan(null);
        return;
      }
      const data = (await response.json()) as { plan: WorkoutPlanClient };
      setPlan(data.plan);
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
  }, [id]);

  useEffect(() => {
    mounted.current = true;
    setLoading(Boolean(id));
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh, id]);

  return { plan, loading, error, refresh };
}
