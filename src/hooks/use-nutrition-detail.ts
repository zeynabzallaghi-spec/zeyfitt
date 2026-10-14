"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { NutritionPlanClient } from "@/lib/nutrition-storage";

/**
 * خواندن جزئیات یک برنامه غذایی — با بررسی مالکیت سمت سرور؛ پاسخ 404 برای
 * برنامه ناموجود و برنامه کاربر دیگر یکسان است. (همان الگوی usePlanDetail)
 */
export interface UseNutritionDetailResult {
  plan: NutritionPlanClient | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** اعمال مستقیم نسخه به‌روزشده از پاسخ PATCH — بدون refetch */
  applyPlan: (plan: NutritionPlanClient) => void;
}

export function useNutritionDetail(id: string | null): UseNutritionDetailResult {
  const [plan, setPlan] = useState<NutritionPlanClient | null>(null);
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
      const response = await fetch(`/api/nutrition/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!mounted.current) return;
      if (response.status === 401) {
        setError("نشست شما منقضی شده است؛ صفحه را دوباره بارگذاری کنید.");
        setPlan(null);
        return;
      }
      if (!response.ok) {
        setError("خواندن برنامه ممکن نشد؛ لطفاً دوباره تلاش کنید.");
        setPlan(null);
        return;
      }
      const data = (await response.json()) as { plan: NutritionPlanClient };
      setPlan(data.plan);
    } catch {
      if (mounted.current) {
        setError("ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.");
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

  return { plan, loading, error, refresh, applyPlan: setPlan };
}
