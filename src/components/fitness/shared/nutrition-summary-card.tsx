"use client";

/**
 * کارت خلاصه برنامه غذایی فعال در داشبورد — فقط داده واقعی از API؛
 * در نبود برنامه، حالت خالی صادقانه با مسیر ساخت. هیچ «کالری مصرف‌شده»
 * جعلی محاسبه یا نمایش داده نمی‌شود — برنامه پیشنهادی است، نه غذای واقعی.
 */

import { ChefHat, ChevronLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { faDigits } from "@/lib/profile";
import { useAppStore } from "@/store/app-store";
import { NUTRITION_GOAL_LABELS, type NutritionGoal } from "@/lib/nutrition-engine/types";
import type { NutritionPlanSummaryClient } from "@/lib/nutrition-storage";

export function NutritionSummaryCard({
  plan,
  loading,
}: {
  plan: NutritionPlanSummaryClient | null;
  loading: boolean;
}) {
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/60 bg-card p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <ChefHat className="size-4" aria-hidden="true" />
        </span>
        <h3 className="text-sm font-bold">برنامه غذایی</h3>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground/50" aria-hidden="true" />
        </div>
      ) : plan ? (
        <div className="flex flex-1 flex-col">
          <p className="text-xs font-bold leading-6 text-foreground">{plan.title}</p>
          <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
            هدف: {NUTRITION_GOAL_LABELS[plan.goal as NutritionGoal] ?? plan.goal} — {faDigits(plan.mealsPerDay)} وعده در روز
          </p>
          <p className="mt-2 text-[11px] leading-6 text-muted-foreground">
            {plan.caution || plan.targetKcal === null
              ? "حالت احتیاط — بدون هدف کالری شخصی"
              : `هدف انرژی روزانه: ${faDigits(plan.targetKcal)} کیلوکالری (تخمینی)`}
          </p>
          <p className="mt-2 text-[10px] leading-5 text-muted-foreground/70">
            این هدف برنامهٔ پیشنهادی است؛ مقدار غذای واقعی مصرف‌شده در این مرحله ثبت نمی‌شود.
          </p>
          <div className="mt-auto pt-4">
            <Button
              size="sm"
              onClick={() => setActiveView("nutrition")}
              className="h-8 w-full bg-primary/15 text-[11px] font-bold text-primary hover:bg-primary/25"
            >
              مشاهده وعده‌ها
              <ChevronLeft className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col">
          <p className="text-[11px] leading-6 text-muted-foreground">
            برنامه غذایی فعالی ندارید. برنامه‌ساز بر اساس پروفایل و آلرژی‌های شما وعده‌ها را با
            مقدار گرم هر ماده پیشنهاد می‌دهد.
          </p>
          <div className="mt-auto pt-4">
            <Button
              size="sm"
              onClick={() => setActiveView("nutrition")}
              className="h-8 w-full font-bold text-primary-foreground glow-lime-sm"
            >
              ساخت برنامه غذایی
              <ChevronLeft className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
