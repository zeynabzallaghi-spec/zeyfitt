"use client";

/**
 * هوک‌های ثبت مصرف واقعی غذا — داده همیشه از API متصل به نشست خوانده
 * می‌شود؛ هیچ داده ساختگی یا localStorage به‌عنوان منبع در کار نیست.
 *
 * خطاها به‌صورت (kind, code) برمی‌گردند — پیام نمایشی در کامپوننت با
 * دیکشنری دوزبانه ساخته می‌شود تا شرط زبان در هوک پراکنده نشود.
 * همان الگوی useNutritionPlans (الگوی Result).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  FoodLogEntryClient,
  FoodLogDayTotals,
  FoodLogPlanComparison,
  FoodLogTrendPoint,
} from "@/lib/foodlog/types";

export type FoodLogErrorKind =
  | "auth"
  | "network"
  | "validation"
  | "notfound"
  | "domain"
  | "internal";

export interface FoodLogFailure {
  ok: false;
  kind: FoodLogErrorKind;
  /** کد دامنه سرور مثل FOOD_NOT_FOUND — قابل‌ترجمه در رابط */
  code: string | null;
}

export type FoodLogResult<T> = { ok: true; data: T } | FoodLogFailure;

/** نگاشت پاسخ سرور به شکست ساختاریافته — بدون پراکندگی شرط زبان */
export async function parseFoodLogFailure(response: Response): Promise<FoodLogFailure> {
  if (response.status === 401) {
    return { ok: false, kind: "auth", code: null };
  }
  if (response.status === 404) {
    return { ok: false, kind: "notfound", code: null };
  }
  try {
    const data = (await response.json()) as { error?: string };
    if (response.status === 400) {
      return { ok: false, kind: data.error === "VALIDATION" ? "validation" : "domain", code: data.error ?? null };
    }
    return { ok: false, kind: "internal", code: data.error ?? null };
  } catch {
    return { ok: false, kind: "network", code: null };
  }
}

export interface FoodLogDayData {
  logs: FoodLogEntryClient[];
  totals: FoodLogDayTotals;
}

/** خواندن ثبت‌ها و جمع یک روز — روز null یعنی درخواست فعال نیست */
export function useFoodLogDay(day: string | null) {
  const [data, setData] = useState<FoodLogDayData | null>(null);
  const [loading, setLoading] = useState(day !== null);
  const [failure, setFailure] = useState<FoodLogFailure | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!day) return;
    setLoading(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/food-logs?date=${encodeURIComponent(day)}`);
      if (!response.ok) {
        setFailure(await parseFoodLogFailure(response));
        return;
      }
      const json = (await response.json()) as FoodLogDayData;
      if (activeRef.current) setData(json);
    } catch {
      if (activeRef.current) setFailure({ ok: false, kind: "network", code: null });
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, failure, refresh };
}

export interface FoodLogSummaryData {
  date: string;
  totals: FoodLogDayTotals;
  comparison: FoodLogPlanComparison;
  trend: FoodLogTrendPoint[];
}

/** خلاصه روز + مقایسه با برنامه + روند ۷ روزه */
export function useFoodLogSummary(day: string | null) {
  const [data, setData] = useState<FoodLogSummaryData | null>(null);
  const [loading, setLoading] = useState(day !== null);
  const [failure, setFailure] = useState<FoodLogFailure | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!day) return;
    setLoading(true);
    setFailure(null);
    try {
      const response = await fetch(`/api/food-logs/summary?date=${encodeURIComponent(day)}`);
      if (!response.ok) {
        setFailure(await parseFoodLogFailure(response));
        return;
      }
      const json = (await response.json()) as FoodLogSummaryData;
      if (activeRef.current) setData(json);
    } catch {
      if (activeRef.current) setFailure({ ok: false, kind: "network", code: null });
    } finally {
      if (activeRef.current) setLoading(false);
    }
  }, [day]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, failure, refresh };
}

export interface CreateFoodLogPayload {
  source: "bank" | "plan_item";
  foodId?: string;
  planItemId?: string;
  unit: "g" | "serving";
  amount: number;
  mealType: string;
  consumedAt: string;
  localDay: string;
  clientRequestId: string;
}

export interface UpdateFoodLogPayload {
  unit?: "g" | "serving";
  amount?: number;
  mealType?: string;
  consumedAt?: string;
  localDay?: string;
}

/** ساخت/ویرایش/حذف ثبت — هر سه با تأیید سرور؛ بدون به‌روزرسانی خوش‌بینانه */
export function useFoodLogMutations() {
  const [busy, setBusy] = useState(false);

  const createLog = useCallback(
    async (payload: CreateFoodLogPayload): Promise<FoodLogResult<{ log: FoodLogEntryClient; replayed: boolean }>> => {
      setBusy(true);
      try {
        const response = await fetch("/api/food-logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!response.ok) return await parseFoodLogFailure(response);
        const json = (await response.json()) as { log: FoodLogEntryClient; replayed: boolean };
        return { ok: true, data: json };
      } catch {
        return { ok: false, kind: "network", code: null };
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const updateLog = useCallback(
    async (id: string, patch: UpdateFoodLogPayload): Promise<FoodLogResult<FoodLogEntryClient>> => {
      setBusy(true);
      try {
        const response = await fetch(`/api/food-logs/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!response.ok) return await parseFoodLogFailure(response);
        const json = (await response.json()) as { log: FoodLogEntryClient };
        return { ok: true, data: json.log };
      } catch {
        return { ok: false, kind: "network", code: null };
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const deleteLog = useCallback(
    async (id: string): Promise<FoodLogResult<null>> => {
      setBusy(true);
      try {
        const response = await fetch(`/api/food-logs/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (!response.ok) return await parseFoodLogFailure(response);
        return { ok: true, data: null };
      } catch {
        return { ok: false, kind: "network", code: null };
      } finally {
        setBusy(false);
      }
    },
    []
  );

  return { createLog, updateLog, deleteLog, busy };
}
