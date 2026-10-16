"use client";

/**
 * کارت خلاصه برنامه غذایی فعال در داشبورد — فقط داده واقعی از API؛
 * در نبود برنامه، حالت خالی صادقانه با مسیر ساخت.
 *
 * از مرحله ثبت مصرف واقعی: کارت شامل «مصرف واقعی امروز» (انرژی/پروتئین/
 * تعداد ثبت از پایگاه داده) است؛ روز بدون ثبت با مصرف صفر یکی گرفته
 * نمی‌شود و هیچ عددی ساختگی نمایش داده نمی‌شود. بخش مصرف واقعی دوزبانه
 * است (همان انتخاب زبان کاربر) و بقیه کارت طبق طراحی قبلی فارسی می‌ماند.
 */

import { ChefHat, ChevronLeft, ChevronRight, Loader2, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import type { NutritionPlanSummaryClient } from "@/lib/nutrition-storage";
import { useFoodLogSummary } from "@/hooks/use-food-logs";
import { tehranLocalDay } from "@/lib/foodlog/calc";
import { foodLogStrings } from "@/lib/foodlog/i18n";
import { useFoodLogUiLang } from "@/lib/foodlog/use-ui-lang";
import { nutritionStrings } from "@/lib/i18n/sections/nutrition";
import { localeNumber } from "@/lib/i18n/format";

export function NutritionSummaryCard({
  plan,
  loading,
}: {
  plan: NutritionPlanSummaryClient | null;
  loading: boolean;
}) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  // زبان رابط کارت — از کلید سراسری FA/EN (یک منبع واحد برای کل اپ)
  const logLang = useFoodLogUiLang();
  const ls = foodLogStrings(logLang);
  const ns = nutritionStrings(logLang);
  const today = tehranLocalDay(Date.now());
  const { data: logSummary, loading: logLoading } = useFoodLogSummary(today);
  const todayTotals = logSummary?.totals ?? null;
  // آیکن جهت‌دار — در RTL به سمت چپ (جلو) و در LTR به سمت راست
  const GoIcon = ls.dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <ChefHat className="size-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold">{ls.planCardTitle}</h3>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground/50" aria-hidden="true" />
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          {plan ? (
            <div>
              <p className="text-xs font-bold leading-6 text-foreground">{plan.title}</p>
              <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
                {ls.planGoalLine(
                  ns.goalLabel(plan.goal as string) ?? plan.goal,
                  localeNumber(plan.mealsPerDay, logLang)
                )}
              </p>
              <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
                {plan.caution || plan.targetKcal === null
                  ? ls.planCaution
                  : ls.planTargetEnergy(localeNumber(plan.targetKcal, logLang))}
              </p>
              <p className="mt-2 text-[10px] leading-5 text-muted-foreground/70">
                {ls.planTransparencyNote}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-[11px] leading-6 text-muted-foreground">
                {ls.planEmptyBody}
              </p>
              <div className="mt-3">
                <Button
                  size="sm"
                  onClick={() => setActiveView("nutrition")}
                  className="h-8 w-full font-bold text-primary-foreground glow-lime-sm"
                >
                  {ls.planCreateCta}
                  <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden="true" />
                </Button>
              </div>
            </div>
          )}

          {/* مصرف واقعی امروز — دوزبانه، فقط از ثبت‌های واقعی */}
          <div
            dir={ls.dir}
            lang={ls.langAttr}
            className="mt-4 rounded-xl border border-border/50 bg-secondary/20 p-3"
          >
            <div className="flex items-center gap-2">
              <Utensils className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-[11px] font-bold">{ls.dashboardTodayTitle}</p>
            </div>
            {logLoading ? (
              <Loader2 className="mt-3 size-4 animate-spin text-muted-foreground/50" aria-hidden="true" />
            ) : todayTotals && todayTotals.hasLogs ? (
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg border border-primary/30 bg-primary/5 py-1.5">
                  <p className="text-[9px] text-muted-foreground">{ls.dashboardEnergy}</p>
                  <p className="text-[11px] font-extrabold text-primary">
                    {localeNumber(todayTotals.kcal, logLang)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card py-1.5">
                  <p className="text-[9px] text-muted-foreground">{ls.dashboardProtein}</p>
                  <p className="text-[11px] font-extrabold">{localeNumber(todayTotals.protein, logLang)}</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card py-1.5">
                  <p className="text-[9px] text-muted-foreground">{ls.dashboardEntries}</p>
                  <p className="text-[11px] font-extrabold">{localeNumber(todayTotals.count, logLang)}</p>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground">
                {ls.dashboardNoLogs} — {ls.dashboardNoLogsHint}
              </p>
            )}
            <Button
              size="sm"
              onClick={() => setActiveView("nutrition")}
              className="mt-3 h-8 w-full bg-primary/15 text-[11px] font-bold text-primary hover:bg-primary/25"
            >
              {ls.dashboardGoToLog}
              <GoIcon className="size-3.5" aria-hidden="true" />
            </Button>
          </div>

          {plan && (
            <div className="mt-auto pt-4">
              <Button
                size="sm"
                onClick={() => setActiveView("nutrition")}
                className="h-8 w-full bg-primary/15 text-[11px] font-bold text-primary hover:bg-primary/25"
              >
                {ls.planViewMeals}
                <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
