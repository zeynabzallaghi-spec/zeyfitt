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
import { faDigits } from "@/lib/profile";
import {
  jalaliFullLabel,
  latestWeightEntry,
  weightTrendSummary,
} from "@/lib/weight";
import { useWeightEntries, type UseWeightEntriesResult } from "@/hooks/use-weight-entries";
import { cn } from "@/lib/utils";
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

  const latest = latestWeightEntry(entries);
  const trend = weightTrendSummary(entries);

  return (
    <div className="h-full rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <Scale className="size-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold">روند وزن شما</h3>
        {entries.length > 0 && <RealBadge className="ms-auto" />}
        <div className={cn("flex items-center gap-2", entries.length > 0 && "ms-auto", entries.length === 0 && "ms-auto")}>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="font-bold text-primary-foreground glow-lime-sm"
          >
            <Plus className="size-4" aria-hidden="true" />
            ثبت وزن
          </Button>
          {error && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refresh()}
              className="border-border/70 font-semibold"
              aria-label="تلاش مجدد برای خواندن تاریخچه وزن"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              تلاش مجدد
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
          <span className="sr-only">در حال خواندن تاریخچه وزن از سرور…</span>
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
            تلاش مجدد
          </Button>
        </div>
      )}

      {/* حالت خالی واقعی — بدون داده ساختگی */}
      {!loading && !error && entries.length === 0 && (
        <EmptyState
          icon={Scale}
          title="هنوز اندازه‌گیری وزنی ثبت نکرده‌اید"
          description="اولین وزن خود را ثبت کنید؛ نمودار روند، تغییر وزن و خلاصه اندازه‌گیری‌ها فقط با داده واقعی و تاریخ‌دار شما رسم می‌شود."
          action={
            <Button
              onClick={() => setDialogOpen(true)}
              className="font-bold text-primary-foreground glow-lime-sm"
            >
              <Plus className="size-4" aria-hidden="true" />
              ثبت اولین وزن
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
              <p className="text-[10px] font-bold text-muted-foreground">آخرین وزن ثبت‌شده</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">
                {faDigits(latest?.weightKg ?? 0)}{" "}
                <span className="text-[10px] font-medium text-muted-foreground">کیلوگرم</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                {latest ? jalaliFullLabel(latest.recordedAt) : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground">تعداد اندازه‌گیری</p>
              <p className="mt-1 text-lg font-extrabold text-foreground">
                {faDigits(entries.length)}
                <span className="ms-1 text-[10px] font-medium text-muted-foreground">رکورد</span>
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">ذخیره‌شده روی سرور</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3.5">
              <p className="text-[10px] font-bold text-muted-foreground">تغییر از اولین ثبت</p>
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
                    {faDigits(Math.abs(trend.diff))}{" "}
                    <span className="text-[10px] font-medium text-muted-foreground">کیلوگرم</span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    {trend.direction === "down" && "کاهش وزن نسبت به اولین اندازه‌گیری"}
                    {trend.direction === "up" && "افزایش وزن نسبت به اولین اندازه‌گیری"}
                    {trend.direction === "stable" && "تغییر معناداری ندارد"}
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-1 text-lg font-extrabold text-muted-foreground/60">—</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                    با ثبت حداقل دو اندازه‌گیری محاسبه می‌شود
                  </p>
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
                اندازه‌گیری‌های اخیر
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
                        {faDigits(entry.weightKg)} کیلوگرم
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {jalaliFullLabel(entry.recordedAt)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void removeEntry(entry.id)}
                        disabled={removingId === entry.id}
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`حذف اندازه‌گیری ${jalaliFullLabel(entry.recordedAt)}`}
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
