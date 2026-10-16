"use client";

/**
 * تاریخچه واقعی جلسات — فهرست خلاصه‌های محاسبه‌شده از ست‌های ثبت‌شده.
 * سه وضعیت (تکمیل‌شده / رهاشده / در حال انجام) صادقانه متمایز می‌مانند و
 * هیچ جلسه‌ای با برنامه فعال اشتباه گرفته نمی‌شود. حذف فقط با تأیید صریح.
 */

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  CircleCheck,
  CircleOff,
  Clock3,
  History,
  RotateCcw,
  Timer,
  Trash2,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import { localeFullLabel } from "@/lib/i18n/format";
import type { Locale } from "@/lib/i18n/shared";
import type { SessionSummaryClient } from "@/lib/workout-session/types";
import {
  useSessionHistory,
  type HistoryStatusFilter,
} from "@/hooks/use-workout-sessions";

/** برچسب وضعیت با رنگ متمایز — رهاشده هرگز با تکمیل‌شده یکی نمایش داده نمی‌شود */
function StatusChip({ status }: { status: SessionSummaryClient["status"] }) {
  const t = useStrings(workoutStrings);
  const map = {
    completed: "border-primary/35 bg-primary/10 text-primary",
    abandoned: "border-rose-400/30 bg-rose-400/10 text-rose-300",
    in_progress: "border-amber-400/30 bg-amber-400/10 text-amber-300",
  } as const;
  const icon =
    status === "completed" ? (
      <CircleCheck className="size-3" aria-hidden="true" />
    ) : status === "abandoned" ? (
      <CircleOff className="size-3" aria-hidden="true" />
    ) : (
      <CircleAlert className="size-3" aria-hidden="true" />
    );
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold",
        map[status]
      )}
    >
      {icon}
      {t.statusLabel(status)}
    </span>
  );
}

const FILTER_IDS: HistoryStatusFilter[] = ["all", "completed", "abandoned", "in_progress"];

interface SessionDetailData {
  loading: boolean;
  error: string | null;
  exercises: {
    id: string;
    faName: string;
    enName: string;
    category: string;
    status: string;
    sets: { setNumber: number; reps: number; weightKg: number | null }[];
  }[];
}

/** جزئیات یک جلسه — حرکات و ست‌های واقعی همان جلسه (خواندن تنبل هنگام باز شدن) */
function SessionDetail({ id }: { id: string }) {
  const t = useStrings(workoutStrings);
  // حالت اولیه: در حال بارگذاری — به‌روزرسانی فقط پس از پاسخ/خطای ناهمگام
  const [detail, setDetail] = useState<SessionDetailData>({
    loading: true,
    error: null,
    exercises: [],
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/sessions/${encodeURIComponent(id)}`, {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!response.ok) {
          setDetail({ loading: true, error: t.detailReadFailed, exercises: [] });
          return;
        }
        const data = (await response.json()) as {
          session: {
            exercises: SessionDetailData["exercises"];
          } | null;
        };
        setDetail({
          loading: false,
          error: null,
          exercises: data.session?.exercises ?? [],
        });
      } catch {
        if (!cancelled) {
          setDetail({ loading: false, error: t.networkFailed, exercises: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  if (detail.loading) {
    return <div className="h-16 animate-pulse rounded-xl bg-secondary/20" />;
  }
  if (detail.error) {
    return (
      <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-rose-200">
        {detail.error}
      </p>
    );
  }
  if (detail.exercises.length === 0) {
    return (
      <p className="text-[11px] leading-6 text-muted-foreground">
        {t.noExercisesInSession}
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {detail.exercises.map((ex) => (
        <li key={ex.id} className="rounded-xl border border-border/50 bg-secondary/20 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[11px] font-bold text-foreground">{ex.faName}</p>
            <span dir="ltr" className="text-[9px] text-muted-foreground/60">
              {ex.enName}
            </span>
            <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
              {t.categoryName(ex.category)}
            </span>
            {ex.status === "skipped" && (
              <span className="text-[9px] font-bold text-amber-300/90">{t.skippedShort}</span>
            )}
          </div>
          {ex.sets.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ex.sets.map((s) => (
                <span
                  key={s.setNumber}
                  className="rounded-md border border-border/50 bg-background/50 px-2 py-1 text-[10px] font-bold text-foreground/85"
                >
                  {t.setLine(s.setNumber, s.reps)}
                  {s.weightKg !== null ? t.setWeightSuffix(s.weightKg) : t.bodyweightSetSuffix}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              {t.noSetsLogged}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function HistoryRow({
  session,
  onDelete,
  deleting,
}: {
  session: SessionSummaryClient;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  return (
    <Collapsible>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <CollapsibleTrigger className="flex w-full flex-wrap items-center gap-2.5 p-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
            <CalendarClock className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-xs font-bold text-foreground">{session.title}</p>
              <StatusChip status={session.status} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              <span>{localeFullLabel(session.startedAt, locale)}</span>
              {session.durationMinutes !== null && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3" aria-hidden="true" />
                  {t.minutesUnit(session.durationMinutes)}
                </span>
              )}
              <span>
                {t.exercisesFraction(session.exercisesDone, session.exercisesTotal)}
              </span>
              <span>{t.setsLine(session.setsCompleted)}</span>
              <span>{t.repsLine(session.repsTotal)}</span>
              {session.volumeKg > 0 && (
                <span>{t.volumeLine(session.volumeKg)}</span>
              )}
            </p>
          </div>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180"
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-border/40 px-4 py-3">
            <SessionDetail id={session.id} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-[9px] leading-5 text-muted-foreground/60">
                {session.status === "abandoned"
                  ? t.abandonedRowNote
                  : session.status === "in_progress"
                    ? t.inProgressRowNote
                    : t.computedNote}
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={deleting}
                onClick={() => onDelete(session.id)}
                className="h-7 shrink-0 border-destructive/30 px-2.5 text-[10px] font-semibold text-rose-300 hover:bg-destructive/10"
              >
                <Trash2 className="size-3" aria-hidden="true" />
                {t.deleteAction}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function SessionHistory() {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  const dir = useDir();
  const {
    sessions,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    refresh,
    deleteSession,
    deletingId,
  } = useSessionHistory();
  const [deleteTarget, setDeleteTarget] = useState<SessionSummaryClient | null>(null);

  const filterLabel = (id: HistoryStatusFilter): string =>
    id === "all"
      ? t.filterAll
      : t.statusLabel(id as "completed" | "abandoned" | "in_progress");

  const counts = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed").length;
    return { completed };
  }, [sessions]);

  return (
    <section aria-label={t.historyTitle} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <History className="size-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold">{t.historyTitle}</h3>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
          {t.sessionCount(sessions.length)}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void refresh()}
          className="ms-auto h-7 px-2 text-[10px] font-semibold text-muted-foreground hover:text-primary"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          {t.refresh}
        </Button>
      </div>

      {/* فیلتر وضعیت */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTER_IDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setStatusFilter(id)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              statusFilter === id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 bg-secondary/20 text-muted-foreground hover:text-foreground"
            )}
          >
            {filterLabel(id)}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex flex-col gap-2">
          <div className="h-20 animate-pulse rounded-2xl bg-secondary/20" />
          <div className="h-20 animate-pulse rounded-2xl bg-secondary/10" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center">
          <p className="text-xs font-bold leading-6 text-rose-200">{error}</p>
          <Button
            variant="outline"
            onClick={() => void refresh()}
            className="mt-3 border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {t.retry}
          </Button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/20 px-6 py-10 text-center">
          <p className="text-xs font-bold text-foreground/80">
            {statusFilter === "all"
              ? t.emptyAll
              : t.emptyFiltered(filterLabel(statusFilter))}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[11px] leading-6 text-muted-foreground/70">
            {t.emptyHowTo}
          </p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <>
          <p className="text-[10px] leading-5 text-muted-foreground/70">
            {t.completedCountNote(counts.completed)}
          </p>
          <ul className="flex flex-col gap-2.5">
            {sessions.map((s) => (
              <li key={s.id}>
                <HistoryRow
                  session={s}
                  deleting={deletingId === s.id}
                  onDelete={() => setDeleteTarget(s)}
                />
              </li>
            ))}
          </ul>
        </>
      )}

      {/* تأیید حذف جلسه */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">{t.deleteSessionTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-7">
              {t.deleteSessionDescription(
                deleteTarget?.title ?? "",
                deleteTarget ? localeFullLabel(deleteTarget.startedAt, locale) : ""
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  void deleteSession(deleteTarget.id).then((r) => {
                    if (r.ok) toast.success(t.sessionDeletedToast);
                    else toast.error(r.message);
                  });
                }
                setDeleteTarget(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t.deleteSessionAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** فرمت‌کن مشترک مدت — برای کارت‌های دیگر (پیش‌فرض fa همان رفتار قبلی است) */
export function formatDuration(minutes: number | null, locale: Locale = "fa"): string {
  if (minutes === null) return "—";
  return workoutStrings(locale).minutesUnit(minutes);
}
