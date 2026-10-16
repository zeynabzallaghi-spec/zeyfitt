"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  WorkoutSessionClient,
  SessionSummaryClient,
  StartSessionInput,
  SetLogInput,
  FinishSessionInput,
  ExerciseStatus,
} from "@/lib/workout-session/types";
import type { WorkoutStats, ExerciseProgressResult } from "@/lib/workout-session/stats";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { apiErrorLabel, issueLabel, genericIssueMessage } from "@/lib/i18n/sections/server-messages";

/**
 * هوک‌های کلاینت ثبت تمرین واقعی — همه داده فقط از API متصل به نشست سرور
 * خوانده و نوشته می‌شود؛ هیچ ذخیره‌سازی محلی (localStorage) در کار نیست و
 * هیچ اقدامی بدون پاسخ واقعی سرور «موفق» اعلام نمی‌شود.
 *
 * پیام خطا هرگز متن خام سرور نیست؛ کد پایدار پاسخ با دیکشنری متمرکز به
 * زبان فعلی رابط ترجمه می‌شود.
 */

type Failure = { ok: false; message: string; code?: string };
type Success<T> = { ok: true; data: T };
type Result<T> = Success<T> | Failure;

function networkErrorMessage(): string {
  const locale = currentUiLocale();
  return locale === "en"
    ? "Could not reach the server; your data was not saved and you can try again after the connection returns."
    : "ارتباط با سرور برقرار نشد؛ داده‌های شما ذخیره نشده و پس از بازگشت اتصال می‌توانید دوباره تلاش کنید.";
}

async function parseFailure(response: Response): Promise<Failure> {
  const locale = currentUiLocale();
  if (response.status === 401) {
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message:
        locale === "en"
          ? "Your session has expired; please sign in again."
          : "نشست شما منقضی شده است؛ دوباره وارد شوید.",
    };
  }
  try {
    const data = (await response.json()) as {
      message?: string;
      error?: string;
      issues?: { code: string; path: string }[];
    };
    const code = data.error;
    if (code === "VALIDATION") {
      const first = data.issues?.[0]?.code;
      const label = first ? issueLabel("session", first, locale) : null;
      return {
        ok: false,
        code,
        message: label ?? apiErrorLabel("VALIDATION", locale) ?? genericIssueMessage(locale),
      };
    }
    const label = code ? apiErrorLabel(code, locale) : null;
    return {
      ok: false,
      code,
      message:
        label ??
        (locale === "en"
          ? "The request was not accepted; please try again."
          : "درخواست پذیرفته نشد؛ لطفاً دوباره تلاش کنید."),
    };
  } catch {
    return {
      ok: false,
      message:
        currentUiLocale() === "en"
          ? "The request was not accepted; please try again."
          : "درخواست پذیرفته نشد؛ لطفاً دوباره تلاش کنید.",
    };
  }
}

/* ------------------------------ جلسه در حال انجام ------------------------------ */

export interface UseActiveSessionResult {
  session: WorkoutSessionClient | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** شروع جلسه — اگر جلسه فعالی باشد همان برگردانده می‌شود (existing=true) */
  startSession: (
    input: StartSessionInput
  ) => Promise<Result<{ session: WorkoutSessionClient; existing: boolean }>>;
  /** ثبت/اصلاح یک ست — پاسخ سرور جایگزین کامل وضعیت جلسه می‌شود */
  upsertSet: (sessionId: string, payload: SetLogInput) => Promise<Result<WorkoutSessionClient>>;
  /** حذف یک ست اشتباه */
  deleteSet: (sessionId: string, setId: string) => Promise<Result<WorkoutSessionClient>>;
  /** وضعیت حرکت: انجام/رد/باقی‌مانده */
  setExerciseStatus: (
    sessionId: string,
    exerciseRowId: string,
    status: ExerciseStatus
  ) => Promise<Result<WorkoutSessionClient>>;
  /** افزودن حرکت واقعی بانک به جلسه باز */
  addExercise: (sessionId: string, exerciseId: string) => Promise<Result<WorkoutSessionClient>>;
  /** پایان صریح جلسه — تکمیل یا رهاکردن */
  finishSession: (
    sessionId: string,
    input: FinishSessionInput
  ) => Promise<Result<WorkoutSessionClient>>;
}

export function useActiveSession(): UseActiveSessionResult {
  const [session, setSession] = useState<WorkoutSessionClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/sessions/active", { cache: "no-store" });
      if (!mounted.current) return;
      if (!response.ok) {
        setError(
          currentUiLocale() === "en"
            ? "Could not read the session status; please try again."
            : "خواندن وضعیت جلسه ممکن نشد؛ لطفاً دوباره تلاش کنید."
        );
        return;
      }
      const data = (await response.json()) as { session: WorkoutSessionClient | null };
      setSession(data.session ?? null);
    } catch {
      if (mounted.current) setError(networkErrorMessage());
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

  const startSession = useCallback(
    async (input: StartSessionInput) => {
      try {
        const response = await fetch("/api/sessions/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (response.ok || response.status === 201) {
          const data = (await response.json()) as {
            session: WorkoutSessionClient;
            existing: boolean;
          };
          if (mounted.current) setSession(data.session);
          return { ok: true as const, data };
        }
        return await parseFailure(response);
      } catch {
        return { ok: false as const, message: networkErrorMessage() };
      }
    },
    []
  );

  const upsertSet = useCallback(async (sessionId: string, payload: SetLogInput) => {
    try {
      const response = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}/sets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const data = (await response.json()) as { session: WorkoutSessionClient };
        if (mounted.current) setSession(data.session);
        return { ok: true as const, data: data.session };
      }
      return await parseFailure(response);
    } catch {
      return { ok: false as const, message: networkErrorMessage() };
    }
  }, []);

  const deleteSet = useCallback(async (sessionId: string, setId: string) => {
    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/sets/${encodeURIComponent(setId)}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        const data = (await response.json()) as { session: WorkoutSessionClient };
        if (mounted.current) setSession(data.session);
        return { ok: true as const, data: data.session };
      }
      return await parseFailure(response);
    } catch {
      return { ok: false as const, message: networkErrorMessage() };
    }
  }, []);

  const setExerciseStatus = useCallback(
    async (sessionId: string, exerciseRowId: string, status: ExerciseStatus) => {
      try {
        const response = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/exercises/${encodeURIComponent(exerciseRowId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        if (response.ok) {
          const data = (await response.json()) as { session: WorkoutSessionClient };
          if (mounted.current) setSession(data.session);
          return { ok: true as const, data: data.session };
        }
        return await parseFailure(response);
      } catch {
        return { ok: false as const, message: networkErrorMessage() };
      }
    },
    []
  );

  const addExercise = useCallback(async (sessionId: string, exerciseId: string) => {
    try {
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/exercises`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exerciseId }),
        }
      );
      if (response.ok) {
        const data = (await response.json()) as { session: WorkoutSessionClient };
        if (mounted.current) setSession(data.session);
        return { ok: true as const, data: data.session };
      }
      return await parseFailure(response);
    } catch {
      return { ok: false as const, message: networkErrorMessage() };
    }
  }, []);

  const finishSession = useCallback(
    async (sessionId: string, input: FinishSessionInput) => {
      try {
        const response = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/finish`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          }
        );
        if (response.ok) {
          const data = (await response.json()) as { session: WorkoutSessionClient };
          if (mounted.current) setSession(data.session);
          return { ok: true as const, data: data.session };
        }
        return await parseFailure(response);
      } catch {
        return { ok: false as const, message: networkErrorMessage() };
      }
    },
    []
  );

  return {
    session,
    loading,
    error,
    refresh,
    startSession,
    upsertSet,
    deleteSet,
    setExerciseStatus,
    addExercise,
    finishSession,
  };
}

/* ------------------------------ تاریخچه جلسات ------------------------------ */

export type HistoryStatusFilter = "all" | "completed" | "abandoned" | "in_progress";

export interface UseSessionHistoryResult {
  sessions: SessionSummaryClient[];
  loading: boolean;
  error: string | null;
  statusFilter: HistoryStatusFilter;
  setStatusFilter: (status: HistoryStatusFilter) => void;
  refresh: () => Promise<void>;
  /** حذف جلسه از تاریخچه — فقط با تأیید صریح در UI فراخوانی می‌شود */
  deleteSession: (id: string) => Promise<Result<null>>;
  deletingId: string | null;
}

export function useSessionHistory(): UseSessionHistoryResult {
  const [sessions, setSessions] = useState<SessionSummaryClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/sessions?limit=100", { cache: "no-store" });
      if (!mounted.current) return;
      if (!response.ok) {
        setError(
          currentUiLocale() === "en"
            ? "Could not read the history; please try again."
            : "خواندن تاریخچه ممکن نشد؛ لطفاً دوباره تلاش کنید."
        );
        return;
      }
      const data = (await response.json()) as { sessions: SessionSummaryClient[] };
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
    } catch {
      if (mounted.current) setError(networkErrorMessage());
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

  const deleteSession = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await refresh();
          return { ok: true as const, data: null };
        }
        return await parseFailure(response);
      } catch {
        return { ok: false as const, message: networkErrorMessage() };
      } finally {
        if (mounted.current) setDeletingId(null);
      }
    },
    [refresh]
  );

  const filtered =
    statusFilter === "all"
      ? sessions
      : sessions.filter((s) => s.status === statusFilter);

  return {
    sessions: filtered,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    refresh,
    deleteSession,
    deletingId,
  };
}

/* ------------------------------ آمار پیشرفت ------------------------------ */

export interface UseWorkoutStatsResult {
  stats: WorkoutStats | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** روند یک حرکت مشخص — فقط جلسات تکمیل‌شده */
  fetchExerciseProgress: (
    exerciseId: string
  ) => Promise<Result<ExerciseProgressResult>>;
}

export function useWorkoutStats(): UseWorkoutStatsResult {
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch("/api/sessions/stats", { cache: "no-store" });
      if (!mounted.current) return;
      if (!response.ok) {
        setError(
          currentUiLocale() === "en"
            ? "Could not read the stats; please try again."
            : "خواندن آمار ممکن نشد؛ لطفاً دوباره تلاش کنید."
        );
        return;
      }
      const data = (await response.json()) as { stats: WorkoutStats };
      setStats(data.stats);
    } catch {
      if (mounted.current) setError(networkErrorMessage());
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

  const fetchExerciseProgress = useCallback(
    async (exerciseId: string) => {
      try {
        const response = await fetch(
          `/api/sessions/stats?exerciseId=${encodeURIComponent(exerciseId)}`,
          { cache: "no-store" }
        );
        if (response.ok) {
          const data = (await response.json()) as { progress: ExerciseProgressResult };
          return { ok: true as const, data: data.progress };
        }
        return await parseFailure(response);
      } catch {
        return { ok: false as const, message: networkErrorMessage() };
      }
    },
    []
  );

  return { stats, loading, error, refresh, fetchExerciseProgress };
}
