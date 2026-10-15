"use client";

/**
 * بخش «مصرف واقعی غذا» در صفحه تغذیه — تاریخ، جمع روز، مقایسه با برنامه
 * فعال، روند ۷ روزه و فهرست ثبت‌ها با ویرایش/حذف. همه داده‌ها از سرور
 * خوانده می‌شود؛ localStorage منبع نیست. روز بدون ثبت با روز صفر یکی
 * گرفته نمی‌شود و «ثبت نشده» هرگز به معنی نخوردن نیست.
 *
 * دوزبانگی: رابط این بخش از همان انتخاب زبان کاربر (کلید ذخیره‌شده
 * دستیار) پیروی می‌کند؛ فارسی راست‌چین و English چپ‌چین. جهت نام غذا
 * با زبان محتوای آن (dir="auto") جدا از جهت رابط است.
 */

import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  MinusCircle,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useAppStore } from "@/store/app-store";
import { useFoodLogSync } from "@/store/foodlog-store";
import {
  useFoodLogDay,
  useFoodLogSummary,
  useFoodLogMutations,
  type FoodLogFailure,
} from "@/hooks/use-food-logs";
import { tehranLocalDay } from "@/lib/foodlog/calc";
import { FOOD_LOG_MEAL_TYPES, type FoodLogEntryClient } from "@/lib/foodlog/types";
import type { NutritionPlanClient } from "@/lib/nutrition-storage";
import { foodLogStrings, mealTypeLabel, type FoodLogStrings } from "@/lib/foodlog/i18n";
import { useFoodLogUiLang } from "@/lib/foodlog/use-ui-lang";
import { FoodLogDialog, type PlanItemPrefill } from "./food-log-dialog";

/* ------------------------------ برچسب روز ------------------------------ */

/** برچسب دوزبانه روز محلی — نیمروز به‌عنوان لنگر، بی‌خطر برای مرز روز */
function dayDisplayLabel(localDay: string, lang: "fa" | "en"): string {
  const anchor = new Date(`${localDay}T12:00:00Z`);
  if (lang === "en") {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "Asia/Tehran",
    }).format(anchor);
  }
  return new Intl.DateTimeFormat("fa-IR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Tehran",
  }).format(anchor);
}

/** ساعت نمایشی از لحظه مصرف — با زمان رسمی ایران */
function timeDisplayLabel(consumedAtIso: string): string {
  const shifted = new Date(Date.parse(consumedAtIso) + 3.5 * 60 * 60 * 1000);
  const h = String(shifted.getUTCHours()).padStart(2, "0");
  const m = String(shifted.getUTCMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function shiftLocalDay(localDay: string, days: number): string {
  const base = Date.parse(`${localDay}T12:00:00Z`) + days * 24 * 60 * 60 * 1000;
  return tehranLocalDay(base);
}

function failureMessage(failure: FoodLogFailure, s: FoodLogStrings): string {
  switch (failure.kind) {
    case "auth":
      return s.errorAuth;
    case "network":
      return s.errorNetwork;
    case "notfound":
      return s.errorNotFound;
    case "validation":
      return s.errorValidation;
    default:
      return s.errorInternal;
  }
}

/* --------------------------------- بخش اصلی --------------------------------- */

interface Props {
  /** برنامه فعال از والد — بدون خواندن مجدد */
  activePlan: NutritionPlanClient | null;
}

export function FoodLogSection({ activePlan }: Props) {
  const lang = useFoodLogUiLang();
  const s = useMemo(() => foodLogStrings(lang), [lang]);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const syncRevision = useFoodLogSync((state) => state.revision);

  const [selectedDay, setSelectedDay] = useState<string>(() => tehranLocalDay(Date.now()));
  const today = tehranLocalDay(Date.now());

  const day = useFoodLogDay(selectedDay);
  const summary = useFoodLogSummary(selectedDay);
  const { deleteLog } = useFoodLogMutations();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [prefill, setPrefill] = useState<PlanItemPrefill | null>(null);
  const [editTarget, setEditTarget] = useState<FoodLogEntryClient | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FoodLogEntryClient | null>(null);
  const [deleting, setDeleting] = useState(false);

  // همگام‌سازی با ثبت‌های ساخته‌شده در جای دیگر (مثل دکمه قلم برنامه)
  useEffect(() => {
    if (syncRevision > 0) {
      void day.refresh();
      void summary.refresh();
    }
  }, [syncRevision]);

  const openNew = (nextPrefill: PlanItemPrefill | null) => {
    setEditTarget(null);
    setPrefill(nextPrefill);
    setDialogOpen(true);
  };

  const openEdit = (entry: FoodLogEntryClient) => {
    setPrefill(null);
    setEditTarget(entry);
    setDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const result = await deleteLog(deleteTarget.id);
    setDeleting(false);
    if (result.ok) {
      toast.success(s.successDeleted);
      void day.refresh();
      void summary.refresh();
    } else {
      // حذف ناموفق هرگز رابط را به‌صورت حذف‌شده به‌روز نمی‌کند
      toast.error(failureMessage(result, s));
    }
    setDeleteTarget(null);
  };

  const totals = day.data?.totals ?? summary.data?.totals ?? null;
  const logs = day.data?.logs ?? [];
  const comparison = summary.data?.comparison ?? null;
  const trend = summary.data?.trend ?? [];

  // آیکن‌های جهت‌دار ناوبری روز — معکوس در RTL
  const PrevIcon = s.dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = s.dir === "rtl" ? ChevronLeft : ChevronRight;

  const grouped = useMemo(() => {
    const map = new Map<string, FoodLogEntryClient[]>();
    for (const type of FOOD_LOG_MEAL_TYPES) map.set(type, []);
    for (const entry of logs) {
      const bucket = map.get(entry.mealType) ?? [];
      bucket.push(entry);
      map.set(entry.mealType, bucket);
    }
    return map;
  }, [logs]);

  return (
    <section
      aria-label={s.sectionTitle}
      dir={s.dir}
      lang={s.langAttr}
      className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 md:p-5"
    >
      {/* سربرگ */}
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <Utensils className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">{s.sectionTitle}</h3>
          <p className="mt-0.5 text-[10px] leading-5 text-muted-foreground">{s.sectionIntro}</p>
        </div>
        <Button
          size="sm"
          onClick={() => openNew(null)}
          className="h-8 shrink-0 font-bold text-primary-foreground glow-lime-sm"
        >
          <Plus className="size-4" aria-hidden="true" />
          {s.addLog}
        </Button>
      </div>

      {/* ناوبری روز */}
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/20 p-2">
        <Button
          size="sm"
          variant="outline"
          aria-label={s.prevDay}
          onClick={() => setSelectedDay((current) => shiftLocalDay(current, -1))}
          className="h-8 border-border/60 px-2"
        >
          <PrevIcon className="size-4" aria-hidden="true" />
        </Button>
        <div className="min-w-0 text-center">
          <p className="truncate text-xs font-bold">
            {selectedDay === today ? s.todayLabel : dayDisplayLabel(selectedDay, lang)}
          </p>
          <p className="text-[10px] text-muted-foreground" dir="ltr">
            {selectedDay}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          aria-label={s.nextDay}
          disabled={selectedDay >= today}
          onClick={() => setSelectedDay((current) => shiftLocalDay(current, 1))}
          className="h-8 border-border/60 px-2"
        >
          <NextIcon className="size-4" aria-hidden="true" />
        </Button>
      </div>

      {/* جمع روز + مقایسه */}
      {totals && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{s.totalKcal}</p>
            <p className="mt-1 text-sm font-extrabold text-primary">
              {faDigits(totals.hasLogs ? totals.kcal : 0)}
            </p>
            {comparison?.available && comparison.targetKcal !== null && (
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {s.targetLabel}: {faDigits(comparison.targetKcal)}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{s.totalProtein}</p>
            <p className="mt-1 text-sm font-extrabold">{faDigits(totals.hasLogs ? totals.protein : 0)}</p>
            {comparison?.available && comparison.targetProtein !== null && (
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {s.targetLabel}: {faDigits(comparison.targetProtein)}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{s.totalCarb}</p>
            <p className="mt-1 text-sm font-extrabold">{faDigits(totals.hasLogs ? totals.carb : 0)}</p>
            {comparison?.available && comparison.targetCarb !== null && (
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {s.targetLabel}: {faDigits(comparison.targetCarb)}
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3 text-center">
            <p className="text-[10px] text-muted-foreground">{s.totalFat}</p>
            <p className="mt-1 text-sm font-extrabold">{faDigits(totals.hasLogs ? totals.fat : 0)}</p>
            {comparison?.available && comparison.targetFat !== null && (
              <p className="mt-0.5 text-[9px] text-muted-foreground">
                {s.targetLabel}: {faDigits(comparison.targetFat)}
              </p>
            )}
          </div>
        </div>
      )}
      {totals && (
        <p className="text-[10px] leading-5 text-muted-foreground/80">
          {s.logsCount(totals.count)} — {s.estimateNote}
        </p>
      )}

      {/* حالت‌های خواندن */}
      {day.loading && summary.loading && (
        <div className="h-20 animate-pulse rounded-xl bg-secondary/20" />
      )}

      {!day.loading && day.failure && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center">
          <CircleAlert className="size-5 text-rose-300" aria-hidden="true" />
          <p className="text-[11px] font-bold text-rose-200">{failureMessage(day.failure, s)}</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void day.refresh();
              void summary.refresh();
            }}
            className="h-7 border-border/70 px-3 text-[10px] font-semibold"
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            {lang === "en" ? "Retry" : "تلاش مجدد"}
          </Button>
        </div>
      )}

      {/* فهرست ثبت‌های روز */}
      {!day.failure && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold">{s.dayListTitle}</p>
          {totals && !totals.hasLogs && (
            <div className="rounded-xl border border-border/40 bg-secondary/10 p-4 text-center">
              <p className="text-[11px] font-bold text-foreground/90">{s.dayListEmptyTitle}</p>
              <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{s.dayListEmptyBody}</p>
            </div>
          )}
          {FOOD_LOG_MEAL_TYPES.map((type) => {
            const bucket = grouped.get(type) ?? [];
            if (bucket.length === 0) return null;
            return (
              <div key={type} className="rounded-xl border border-border/40 bg-secondary/10 p-2.5">
                <p className="px-1 text-[10px] font-bold text-muted-foreground">
                  {mealTypeLabel(type, lang)}
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {bucket.map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border border-border/40 bg-card px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p dir="auto" className="text-[11px] font-bold text-foreground/90">
                          {lang === "en" ? entry.enName : entry.faName}
                          {entry.source === "plan_item" && (
                            <span className="ms-2 rounded border border-primary/30 bg-primary/10 px-1 py-0.5 text-[9px] font-bold text-primary">
                              {s.fromPlanItem}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground" dir="auto">
                          {s.loggedAmount(faDigits(Math.round(entry.grams * 10) / 10))} —{" "}
                          {faDigits(entry.kcal)} {s.totalKcal} — {s.loggedAt(
                            timeDisplayLabel(entry.consumedAt)
                          )}
                          {entry.planItemGrams !== null &&
                            Math.round(entry.grams) !== entry.planItemGrams &&
                            ` — ${s.differsFromPlan(
                              faDigits(Math.round(entry.grams)),
                              faDigits(entry.planItemGrams)
                            )}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(entry)}
                          className="h-7 border-border/60 px-2 text-[10px] font-semibold"
                          aria-label={s.editLog}
                        >
                          <Pencil className="size-3" aria-hidden="true" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteTarget(entry)}
                          className="h-7 border-destructive/30 px-2 text-[10px] font-semibold text-rose-300 hover:bg-destructive/10"
                          aria-label={s.deleteLog}
                        >
                          <Trash2 className="size-3" aria-hidden="true" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* مقایسه با برنامه */}
      {comparison && comparison.available && (
        <div className="rounded-xl border border-border/50 bg-secondary/10 p-3">
          <p className="text-[11px] font-bold">{s.comparisonTitle}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">{s.comparisonVsTarget}</p>
          {comparison.targetKcal === null ? (
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground">{s.comparisonNoTarget}</p>
          ) : null}
          {comparison.items.length > 0 && (
            <div className="mt-2.5">
              <p className="text-[10px] font-bold text-muted-foreground">{s.planItemsTitle}</p>
              <ul className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {comparison.items.map((item) => (
                  <li
                    key={item.planItemId}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5"
                  >
                    <div className="min-w-0">
                      <p dir="auto" className="truncate text-[10px] font-bold text-foreground/90">
                        {lang === "en" ? item.enName : item.faName}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {s.planned}: {faDigits(item.plannedGrams)}
                        {s.unitGrams}
                      </p>
                    </div>
                    {item.logged ? (
                      <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold text-primary">
                        <CircleCheck className="size-3" aria-hidden="true" />
                        {s.loggedLabel}: {faDigits(item.loggedGrams)}
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1 text-[9px] font-bold text-muted-foreground">
                        <MinusCircle className="size-3" aria-hidden="true" />
                        {s.notLoggedLabel}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-5 text-muted-foreground">
                <CircleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                {s.notLoggedHint}
              </p>
            </div>
          )}
          <p className="mt-2 border-t border-border/40 pt-2 text-[10px] leading-5 text-muted-foreground/80">
            {s.adherenceDisclaimer}
          </p>
        </div>
      )}
      {comparison && !comparison.available && (
        <p className="rounded-xl border border-border/40 bg-secondary/10 p-3 text-[10px] leading-5 text-muted-foreground">
          {s.noPlanComparison}
        </p>
      )}

      {/* روند ۷ روزه — فقط ثبت‌های واقعی؛ روز بدون ثبت با صفر یکی نیست */}
      {trend.length > 0 && (
        <div className="flex items-end justify-between gap-1.5 rounded-xl border border-border/50 bg-secondary/10 p-3">
          {trend.map((point) => (
            <div key={point.localDay} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-full items-end justify-center rounded-md border text-[8px] font-bold",
                  point.hasLogs
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/40 bg-secondary/20 text-muted-foreground/50"
                )}
                title={
                  point.hasLogs
                    ? `${faDigits(point.kcal ?? 0)} ${s.totalKcal}`
                    : s.notLoggedLabel
                }
              >
                <span className="pb-0.5">
                  {point.hasLogs ? faDigits(point.kcal ?? 0) : "—"}
                </span>
              </div>
              <span className="text-[8px] text-muted-foreground" dir="ltr">
                {point.localDay.slice(5)}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] leading-5 text-muted-foreground/70">{s.safetyNote}</p>

      {/* دیالوگ ثبت/ویرایش */}
      <FoodLogDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        lang={lang}
        strings={s}
        selectedDay={selectedDay}
        activePlan={activePlan}
        prefill={prefill}
        editTarget={editTarget}
        onChanged={() => {
          void day.refresh();
          void summary.refresh();
        }}
        onAuthError={() => setActiveView("dashboard")}
      />

      {/* تأیید حذف */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent dir={s.dir} lang={s.langAttr}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">{s.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-7">
              {deleteTarget
                ? s.deleteConfirmBody(lang === "en" ? deleteTarget.enName : deleteTarget.faName)
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{s.deleteCancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {s.deleteConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
