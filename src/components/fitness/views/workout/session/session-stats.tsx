"use client";

/**
 * تحلیل پیشرفت واقعی — همه اعداد فقط از جلسات تکمیل‌شده ثبت‌شده در سرور.
 *
 * قواعد نمایشی ثابت (مطابق موتور آمار):
 *  - جلسه رهاشده و در حال انجام در هیچ آمار «تکمیل‌شده» جمع نمی‌شوند.
 *  - مدت فقط از زمان شروع/پایان ثبت‌شده؛ هیچ مدت تخمینی ساخته نمی‌شود.
 *  - «حجم» فقط از ست‌های دارای بار خارجی؛ وزن بدن و ست‌های بی‌بار در حجم
 *    وارد نمی‌شوند و حجم با حرکات وزن بدن مقایسه‌پذیر نیست.
 *  - رکورد فقط با حداقل دو نقطه داده تعریف می‌شود؛ با داده کمتر، صادقانه
 *    «داده کافی نیست» نمایش داده می‌شود.
 */

import { useCallback, useEffect, useState } from "react";
import { Activity, CalendarRange, RotateCcw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import { localeNumber, localeFullLabel } from "@/lib/i18n/format";
import { ExercisePicker } from "@/components/fitness/shared/exercise-picker";
import type { ExerciseProgressResult } from "@/lib/workout-session/stats";
import { useWorkoutStats } from "@/hooks/use-workout-sessions";

/** یک سطل روند هفتگی — میله با ارتفاع نسبی واقعی (بدون جعل مقیاس) */
function TrendBars({
  buckets,
}: {
  buckets: { weekStartIso: string; label: string; completedSessions: number }[];
}) {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  const max = Math.max(...buckets.map((b) => b.completedSessions), 1);
  return (
    <div className="flex items-end justify-between gap-2 pt-2">
      {buckets.map((b) => {
        const heightPx = b.completedSessions === 0 ? 4 : Math.max(8, Math.round((b.completedSessions / max) * 72));
        return (
          <div key={b.weekStartIso} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span
              className={cn(
                "w-full max-w-8 rounded-t-md",
                b.completedSessions === 0 ? "bg-secondary/50" : "bg-primary/70"
              )}
              style={{ height: `${heightPx}px` }}
              aria-hidden="true"
            />
            <span className="text-[9px] font-bold text-foreground/80">
              {localeNumber(b.completedSessions, locale)}
            </span>
            <span className="truncate text-center text-[8px] leading-3 text-muted-foreground/70" dir="rtl">
              {b.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ روند یک حرکت ------------------------------ */

function ExerciseProgressPicker() {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  const dir = useDir();
  const [selected, setSelected] = useState<string>("");
  const [progress, setProgress] = useState<ExerciseProgressResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async (exerciseId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/sessions/stats?exerciseId=${encodeURIComponent(exerciseId)}`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        setError(t.progressReadFailed);
        setProgress(null);
        return;
      }
      const data = (await response.json()) as { progress: ExerciseProgressResult };
      setProgress(data.progress);
    } catch {
      setError(t.networkFailed);
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  // ابطال انتخاب هنگام بستن
  useEffect(() => {
    if (selected === "") {
      setProgress(null);
      setError(null);
    }
  }, [selected]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* انتخاب حرکت از بانک عمومی کامل — جست‌وجو به‌جای فهرست ثابت */}
        <ExercisePicker
          onPick={(id) => {
            setSelected(id);
            void fetchProgress(id);
          }}
          pickedId={selected === "" ? null : selected}
          heightClass="h-56"
          showAddButton={false}
        />
        {selected !== "" && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected("")}
            className="h-8 px-2 text-[10px] text-muted-foreground"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            {t.clearPicker}
          </Button>
        )}
      </div>

      {loading && <div className="h-20 animate-pulse rounded-xl bg-secondary/20" />}

      {!loading && error && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-[11px] text-rose-200">
          {error}
        </p>
      )}

      {!loading && !error && selected !== "" && progress && (
        <div className="flex flex-col gap-3">
          {/* رکوردها — فقط با حداقل دو نقطه داده */}
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
              <p className="text-[10px] font-bold text-muted-foreground">{t.bestWeightLabel}</p>
              {progress.bestWeightKg !== null ? (
                <p className="mt-1 text-lg font-extrabold text-primary">
                  {localeNumber(progress.bestWeightKg, locale)}{" "}
                  <span className="text-[10px] font-bold text-muted-foreground">{t.kilograms}</span>
                </p>
              ) : (
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  {progress.rows.length === 0
                    ? t.insufficientData
                    : t.noExternalLoad}
                </p>
              )}
              {progress.bestWeightKgDate && (
                <p className="mt-1 text-[9px] text-muted-foreground/70">
                  {t.onDate(localeFullLabel(progress.bestWeightKgDate, locale))}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
              <p className="text-[10px] font-bold text-muted-foreground">{t.bestRepsLabel}</p>
              {progress.bestReps !== null ? (
                <p className="mt-1 text-lg font-extrabold text-primary">
                  {localeNumber(progress.bestReps, locale)}{" "}
                  <span className="text-[10px] font-bold text-muted-foreground">{t.repsUnit}</span>
                </p>
              ) : (
                <p className="mt-1 text-xs font-bold text-muted-foreground">{t.insufficientData}</p>
              )}
              {progress.bestRepsDate && (
                <p className="mt-1 text-[9px] text-muted-foreground/70">
                  {t.onDate(localeFullLabel(progress.bestRepsDate, locale))}
                </p>
              )}
            </div>
          </div>

          <p className="rounded-xl border border-border/50 bg-secondary/20 p-3 text-[10px] leading-6 text-muted-foreground">
            {progress.note}
          </p>

          {/* سطرهای تاریخچه حرکت */}
          {progress.rows.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {progress.rows.map((row, i) => (
                <li
                  key={`${row.sessionId}-${i}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border/50 bg-card p-3 text-[11px]"
                >
                  <span className="font-bold text-foreground">{localeFullLabel(row.startedAt, locale)}</span>
                  <span className="text-muted-foreground">{row.sessionTitle}</span>
                  <span className="ms-auto font-bold text-foreground/85">
                    {t.historyRowLine(row.setsCount, row.totalReps)}
                    {row.bestWeightKg !== null
                      ? t.bestWeightSuffix(row.bestWeightKg)
                      : t.bodyweightRowSuffix}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border/50 bg-secondary/20 px-4 py-6 text-center text-[11px] leading-6 text-muted-foreground">
              {t.emptyExerciseTrend}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function SessionStats() {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  const { stats, loading, error, refresh } = useWorkoutStats();

  return (
    <section aria-label={t.statsAria} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <TrendingUp className="size-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold">{t.statsTitle}</h3>
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

      {loading && <div className="h-40 animate-pulse rounded-2xl bg-secondary/20" />}

      {!loading && error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center">
          <p className="text-xs font-bold leading-6 text-rose-200">{error}</p>
          <Button
            variant="outline"
            onClick={() => void refresh()}
            className="mt-3 border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
          >
            {t.retry}
          </Button>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* آمار هفته جاری */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarRange className="size-4 text-primary" aria-hidden="true" />
              <h4 className="text-xs font-bold">{t.thisWeekTitle}</h4>
              <span className="ms-auto text-[9px] text-muted-foreground/60">
                {t.iranCalendarNote}
              </span>
            </div>
            {stats.thisWeek.completedSessions === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border/50 bg-secondary/20 px-4 py-6 text-center text-[11px] leading-6 text-muted-foreground">
                {t.emptyWeek}
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: t.weekCompletedLabel, value: localeNumber(stats.thisWeek.completedSessions, locale) },
                  { label: t.weekSetsLabel, value: localeNumber(stats.thisWeek.setsCompleted, locale) },
                  { label: t.weekRepsLabel, value: localeNumber(stats.thisWeek.repsTotal, locale) },
                  { label: t.weekDurationLabel, value: t.minutesUnit(stats.thisWeek.durationMinutes) },
                ].map((item) => (
                  <div key={item.label} className="rounded-xl border border-border/50 bg-secondary/20 p-3 text-center">
                    <p className="text-lg font-extrabold text-primary">{item.value}</p>
                    <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* روند ۶ هفته */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Activity className="size-4 text-primary" aria-hidden="true" />
              <h4 className="text-xs font-bold">{t.trendTitle}</h4>
              <span className="ms-auto text-[9px] text-muted-foreground/60">
                {t.trendSubtitle}
              </span>
            </div>
            <TrendBars buckets={stats.weeklyTrend} />
            <p className="mt-2 text-[9px] leading-5 text-muted-foreground/60">
              {t.zeroWeeksNote}
            </p>
          </div>

          {/* مجموع بازه داده */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
            <h4 className="text-xs font-bold">{t.totalsTitle}</h4>
            {stats.totals.completedSessions === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-border/50 bg-secondary/20 px-4 py-6 text-center text-[11px] leading-6 text-muted-foreground">
                {t.emptyTotals}
              </p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: t.totalsCompleted, value: localeNumber(stats.totals.completedSessions, locale) },
                    { label: t.totalsAbandoned, value: localeNumber(stats.totals.abandonedSessions, locale) },
                    { label: t.totalsSets, value: localeNumber(stats.totals.setsCompleted, locale) },
                    { label: t.totalsReps, value: localeNumber(stats.totals.repsTotal, locale) },
                    { label: t.totalsDuration, value: t.minutesUnit(stats.totals.durationMinutes) },
                    { label: t.totalsVolume, value: `${localeNumber(stats.totals.volumeKg, locale)} ${t.kilograms}` },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-border/50 bg-secondary/20 p-3 text-center">
                      <p className="text-sm font-extrabold text-foreground/90">{item.value}</p>
                      <p className="mt-0.5 text-[9px] font-medium text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-3 rounded-xl border border-border/50 bg-secondary/20 p-3 text-[10px] leading-6 text-muted-foreground">
                  {t.volumeExplainer}
                </p>
              </>
            )}
          </div>

          {/* روند یک حرکت */}
          <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
            <h4 className="text-xs font-bold">{t.singleExerciseTitle}</h4>
            <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
              {t.singleExerciseIntro}
            </p>
            <div className="mt-3">
              <ExerciseProgressPicker />
            </div>
          </div>
        </>
      )}
    </section>
  );
}
