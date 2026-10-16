"use client";

import { useState } from "react";
import {
  Loader2,
  Plus,
  RotateCcw,
  Scale,
  TrendingDown,
  TrendingUp,
  Trash2,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  latestWeightEntry,
  weightTrendSummary,
} from "@/lib/weight";
import type { UseWeightEntriesResult } from "@/hooks/use-weight-entries";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { localeNumber, localeDecimal, localeFullLabel } from "@/lib/i18n/format";
import { weightStrings } from "@/lib/i18n/sections/weight";
import { EmptyState } from "./empty-state";
import { RealBadge } from "./badges";
import { WeightTrendChart } from "./weight-trend-chart";
import { WeightEntryDialog } from "./weight-entry-dialog";

interface WeightLogCardProps {
  /** داشبورد: فشرده — پیشرفت: کامل با فهرست و حذف */
  variant: "dashboard" | "progress";
  /** داده و عملیات وزن — توسط والد فراهم می‌شود تا درخواست تکراری نشود */
  data: UseWeightEntriesResult;
}

/**
 * کارت روند وزن — تنها منبع داده آن API متصل به نشست کاربر است.
 * سه حالت صادقانه دارد: بارگذاری، خطا با تلاش مجدد، و خالی با راهنمای
 * ثبت اولین اندازه‌گیری. هیچ مقدار جعلی (صفر یا نمودار نمونه) نمایش نمی‌دهد.
 */
export function WeightLogCard({ variant, data }: WeightLogCardProps) {
  const {
    entries,
    loading,
    error,
    refresh,
    addEntry,
    removeEntry,
    removingId,
  } = data;
  const [dialogOpen, setDialogOpen] = useState(false);
  const full = variant === "progress";
  const t = useStrings(weightStrings);
  const locale = useLocale();

  const latest = latestWeightEntry(entries);
  const trend = weightTrendSummary(entries);

  return (
    <div className="h-full rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <Scale className="size-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold">{t.trendTitle}</h3>
        {entries.length > 0 && <RealBadge className="ms-auto" />}
        <div className={cn("flex items-center gap-2", entries.length > 0 && "ms-auto", entries.length === 0 && "ms-auto")}>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="font-bold text-primary-foreground glow-lime-sm"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t.addWeight}
          </Button>
          {error && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refresh()}
              className="border-border/70 font-semibold"
              aria-label={t.retryAria}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {t.retry}
            </Button>
          )}
        </div>
      </div>

      {/* حالت بارگذاری */}
      {loading && (
        <div className="flex flex-col gap-3" aria-live="polite" aria-busy="true">
          <div className="flex gap-3">
            <Skeleton className="h-16 flex-1 rounded-xl" />
            <Skeleton className="h-16 flex-1 rounded-xl" />
            <Skeleton className="hidden h-16 flex-1 rounded-xl sm:block" />
          </div>
          <Skeleton className="h-44 rounded-xl" />
          <span className="sr-only">{t.loadingSr}</span>
        </div>
      )}

      {/* حالت خطا */}
      {!loading && error && (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-8 text-center"
        >
          <p className="text-xs font-bold leading-6 text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refresh()}
            className="border-border/70 font-semibold"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {t.retry}
          </Button>
        </div>
      )}

      {/* حالت خالی واقعی — بدون داده ساختگی */}
      {!loading && !error && entries.length === 0 && (
        <EmptyState
          icon={Scale}
          title={t.emptyTitle}
          description={t.emptyDescription}
          action={
            <Button
              onClick={() => setDialogOpen(true)}
              className="font-bold text-primary-foreground glow-lime-sm"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t.addFirstWeight}
            </Button>
          }
          compact={!full}
        />
      )}

      {/* حالت داده واقعی */}
      {!loading && !error && entries.length > 0 && (
        <div className="flex flex-col gap-4">
          {/* خلاصه اندازه‌گیری‌ها */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground">{t.latestWeightLabel}</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">
                {localeNumber(latest?.weightKg ?? 0, locale)}{" "}
                <span className="text-[10px] font-medium text-muted-foreground">{t.kilogramUnit}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                {latest ? localeFullLabel(latest.recordedAt, locale) : t.emptyValue}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground">{t.entriesCountLabel}</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">
                {localeNumber(entries.length, locale)}
                <span className="ms-1 text-[10px] font-medium text-muted-foreground">{t.recordsUnit}</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">{t.storedOnServer}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground">{t.changeFromFirstLabel}</p>
              {trend ? (
                <>
                  <p
                    className={cn(
                      "mt-1 flex items-center gap-1.5 text-lg font-extrabold",
                      trend.direction === "down" && "text-primary",
                      trend.direction === "up" && "text-amber-300",
                      trend.direction === "stable" && "text-foreground"
                    )}
                  >
                    {trend.direction === "down" && (
                      <TrendingDown className="size-4" aria-hidden="true" />
                    )}
                    {trend.direction === "up" && (
                      <TrendingUp className="size-4" aria-hidden="true" />
                    )}
                    {trend.direction === "stable" && <Minus className="size-4" aria-hidden="true" />}
                    {localeDecimal(Math.abs(trend.diff), 1, locale)}{" "}
                    <span className="text-[10px] font-medium text-muted-foreground">{t.kilogramUnit}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {trend.direction === "down" && t.trendDownNote}
                    {trend.direction === "up" && t.trendUpNote}
                    {trend.direction === "stable" && t.trendStableNote}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-lg font-extrabold text-muted-foreground/60">{t.emptyValue}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">{t.trendNeedsTwoNote}</p>
                </>
              )}
            </div>
          </div>

          {/* نمودار روند — فقط داده واقعی کاربر */}
          <WeightTrendChart entries={entries} />

          {/* فهرست اندازه‌گیری‌ها — فقط در بخش پیشرفت */}
          {full && (
            <div>
              <p className="mb-2 text-[11px] font-bold text-muted-foreground">
                {t.recentMeasurements}
              </p>
              <ul className="max-h-64 divide-y divide-border/50 overflow-y-auto rounded-xl border border-border/40">
                {[...entries]
                  .sort(
                    (a, b) =>
                      new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
                  )
                  .slice(0, 30)
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <span className="text-xs font-bold text-foreground">
                        {localeNumber(entry.weightKg, locale)} {t.kilogramUnit}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {localeFullLabel(entry.recordedAt, locale)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void removeEntry(entry.id)}
                        disabled={removingId === entry.id}
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={t.deleteMeasurementAria(
                          localeFullLabel(entry.recordedAt, locale)
                        )}
                      >
                        {removingId === entry.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="size-3.5" aria-hidden="true" />
                        )}
                      </Button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <WeightEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={addEntry}
      />
    </div>
  );
}
