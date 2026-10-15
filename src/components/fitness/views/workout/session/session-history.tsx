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
import { faDigits } from "@/lib/profile";
import { jalaliFullLabel } from "@/lib/weight";
import { categoryFa } from "@/lib/exercises";
import type { SessionSummaryClient } from "@/lib/workout-session/types";
import { SESSION_STATUS_LABELS } from "@/lib/workout-session/types";
import {
  useSessionHistory,
  type HistoryStatusFilter,
} from "@/hooks/use-workout-sessions";

/** برچسب وضعیت با رنگ متمایز — رهاشده هرگز با تکمیل‌شده یکی نمایش داده نمی‌شود */
function StatusChip({ status }: { status: SessionSummaryClient["status"] }) {
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
      {SESSION_STATUS_LABELS[status]}
    </span>
  );
}

const FILTERS: { id: HistoryStatusFilter; label: string }[] = [
  { id: "all", label: "همه" },
  { id: "completed", label: "تکمیل‌شده" },
  { id: "abandoned", label: "رهاشده" },
  { id: "in_progress", label: "در حال انجام" },
];

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
          setDetail({ loading: true, error: "خواندن جزئیات ممکن نشد", exercises: [] });
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
          setDetail({ loading: false, error: "ارتباط با سرور برقرار نشد", exercises: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        این جلسه حرکت ثبت‌شده‌ای ندارد.
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
              {categoryFa(ex.category as never)}
            </span>
            {ex.status === "skipped" && (
              <span className="text-[9px] font-bold text-amber-300/90">رد شده</span>
            )}
          </div>
          {ex.sets.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ex.sets.map((s) => (
                <span
                  key={s.setNumber}
                  className="rounded-md border border-border/50 bg-background/50 px-2 py-1 text-[10px] font-bold text-foreground/85"
                >
                  ست {faDigits(s.setNumber)}: {faDigits(s.reps)} تکرار
                  {s.weightKg !== null ? ` × ${faDigits(s.weightKg)} کیلوگرم` : " (وزن بدن)"}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              بدون ست ثبت‌شده
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
              <span>{jalaliFullLabel(session.startedAt)}</span>
              {session.durationMinutes !== null && (
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="size-3" aria-hidden="true" />
                  {faDigits(session.durationMinutes)} دقیقه
                </span>
              )}
              <span>
                {faDigits(session.exercisesDone)}/{faDigits(session.exercisesTotal)} حرکت
              </span>
              <span>{faDigits(session.setsCompleted)} ست</span>
              <span>{faDigits(session.repsTotal)} تکرار</span>
              {session.volumeKg > 0 && (
                <span>حجم: {faDigits(session.volumeKg)} کیلوگرم</span>
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
                  ? "این جلسه رهاشده شده و در آمار «جلسات تکمیل‌شده» شمرده نمی‌شود."
                  : session.status === "in_progress"
                    ? "این جلسه هنوز در حال انجام است و در آمار تکمیل‌شده‌ها شمرده نمی‌شود."
                    : "مقادیر فقط از ست‌های واقعاً ثبت‌شده محاسبه شده‌اند."}
              </p>
              <Button
                size="sm"
                variant="outline"
                disabled={deleting}
                onClick={() => onDelete(session.id)}
                className="h-7 shrink-0 border-destructive/30 px-2.5 text-[10px] font-semibold text-rose-300 hover:bg-destructive/10"
              >
                <Trash2 className="size-3" aria-hidden="true" />
                حذف
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function SessionHistory() {
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

  const counts = useMemo(() => {
    const completed = sessions.filter((s) => s.status === "completed").length;
    return { completed };
  }, [sessions]);

  return (
    <section aria-label="تاریخچه جلسات تمرین" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <History className="size-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold">تاریخچه جلسات تمرین</h3>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
          {faDigits(sessions.length)} جلسه
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void refresh()}
          className="ms-auto h-7 px-2 text-[10px] font-semibold text-muted-foreground hover:text-primary"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          به‌روزرسانی
        </Button>
      </div>

      {/* فیلتر وضعیت */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              statusFilter === f.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/50 bg-secondary/20 text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
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
            تلاش مجدد
          </Button>
        </div>
      )}

      {!loading && !error && sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 bg-secondary/20 px-6 py-10 text-center">
          <p className="text-xs font-bold text-foreground/80">
            {statusFilter === "all"
              ? "هنوز جلسه‌ای ثبت نشده است"
              : `جلسه‌ای با وضعیت «${FILTERS.find((f) => f.id === statusFilter)?.label}» ندارید`}
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[11px] leading-6 text-muted-foreground/70">
            جلسه فقط با اقدام واقعی شما ساخته می‌شود: از بخش «برنامه تمرینی» دکمه «شروع تمرین»
            را بزنید، ست‌ها را ثبت کنید و جلسه را پایان بدهید. بازدید از برنامه هرگز جلسه حساب
            نمی‌شود.
          </p>
        </div>
      )}

      {!loading && !error && sessions.length > 0 && (
        <>
          <p className="text-[10px] leading-5 text-muted-foreground/70">
            {faDigits(counts.completed)} جلسه تکمیل‌شده در این فهرست؛ رهاشده و در حال انجام جدا
            شمرده می‌شوند.
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
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">حذف جلسه از تاریخچه</AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-7">
              جلسه «{deleteTarget?.title}» در تاریخ {deleteTarget ? jalaliFullLabel(deleteTarget.startedAt) : ""}{" "}
              برای همیشه حذف می‌شود و در آمار پیشرفت هم دیگر شمرده نمی‌شود. این اقدام قابل
              بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  void deleteSession(deleteTarget.id).then((r) => {
                    if (r.ok) toast.success("جلسه حذف شد");
                    else toast.error(r.message);
                  });
                }
                setDeleteTarget(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              حذف جلسه
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

/** فرمت‌کن مشترک مدت — برای کارت‌های دیگر */
export function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  return `${faDigits(minutes)} دقیقه`;
}
