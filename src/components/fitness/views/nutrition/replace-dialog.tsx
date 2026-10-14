"use client";

/**
 * دیالوگ جایگزینی ماده غذایی — پیشنهادها از موتور (فقط مواد سازگار با
 * تنظیمات برنامه) با اختلاف کالری/پروتئین صادقانه؛ هیچ «معادل کامل»
 * ادعا نمی‌شود. تأیید نهایی سمت سرور دوباره اعتبارسنجی می‌شود.
 */

import { useMemo, useState } from "react";
import { Loader2, Repeat2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { faDigits } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { findFood, foodGroupFa } from "@/lib/foods";
import { suggestReplacements } from "@/lib/nutrition-engine/engine";
import type { ReplacementSuggestion } from "@/lib/nutrition-engine/types";
import type { NutritionPlanClient } from "@/lib/nutrition-storage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: NutritionPlanClient;
  item: { foodId: string; faName: string; grams: number; kcal: number; protein: number };
  onConfirm: (newFoodId: string) => Promise<void>;
}

export function ReplaceItemDialog({ open, onOpenChange, plan, item, onConfirm }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const suggestions: ReplacementSuggestion[] = useMemo(() => {
    if (!open) return [];
    return suggestReplacements(
      { foodId: item.foodId, kcal: item.kcal, protein: item.protein },
      {
        allergens: plan.allergens as never,
        dietPattern: plan.dietPattern,
        dislikedFoodIds: plan.dislikedFoodIds,
        budget: plan.budget,
        prep: "any",
      }
    );
  }, [open, item.foodId, item.kcal, item.protein, plan]);

  const handleConfirm = async () => {
    if (!selected) return;
    setConfirming(true);
    try {
      await onConfirm(selected);
      onOpenChange(false);
      setSelected(null);
    } finally {
      setConfirming(false);
    }
  };

  const currentFood = findFood(item.foodId);

  return (
    <Dialog open={open} onOpenChange={(next) => !confirming && onOpenChange(next)}>
      <DialogContent dir="rtl" className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-start">جایگزینی «{item.faName}»</DialogTitle>
          <DialogDescription className="text-start leading-6">
            پیشنهادها فقط از مواد سازگار با محدودیت‌های این برنامه (آلرژی، الگوی غذایی، مواد
            نامطلوب و بودجه) انتخاب شده‌اند. مقدار پیشنهادی برای نزدیک‌شدن انرژی به مقدار فعلی
            ({faDigits(item.grams)} گرم) تنظیم شده است؛ هیچ دو ماده‌ای «معادل کامل» نیستند و
            اختلاف درشت‌مغذی‌ها را ببینید.
          </DialogDescription>
        </DialogHeader>

        {suggestions.length === 0 ? (
          <p className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-[11px] leading-5 text-amber-200">
            با محدودیت‌های این برنامه، گزینه جایگزین مناسبی یافت نشد. می‌توانید به‌جای جایگزینی،
            مقدار را تغییر دهید یا تنظیمات محدودیت را بازبینی کنید.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] text-muted-foreground">
              ماده فعلی: {item.faName}
              {currentFood ? ` (${foodGroupFa(currentFood.group)} — ${faDigits(item.kcal)} کیلوکالری)` : ""}
            </p>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.foodId}
                type="button"
                onClick={() => setSelected(suggestion.foodId)}
                aria-pressed={selected === suggestion.foodId}
                className={cn(
                  "rounded-xl border p-3 text-start transition-all",
                  selected === suggestion.foodId
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/60 bg-secondary/20 hover:border-primary/30"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold">{suggestion.faName}</p>
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    {faDigits(suggestion.grams)} گرم ≈ {faDigits(suggestion.kcal)} کیلوکالری
                  </span>
                </div>
                <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                  پروتئین {faDigits(suggestion.protein)} گرم — کربوهیدرات {faDigits(suggestion.carb)} گرم — چربی{" "}
                  {faDigits(suggestion.fat)} گرم
                  <span className={cn("ms-2 font-semibold", suggestion.kcalDiff === 0 ? "text-primary" : suggestion.kcalDiff > 0 ? "text-amber-300" : "text-sky-300")}>
                    (انرژی {suggestion.kcalDiff > 0 ? "+" : ""}{faDigits(suggestion.kcalDiff)} نسبت به فعلی)
                  </span>
                </p>
              </button>
            ))}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={confirming}>
            انصراف
          </Button>
          <Button
            onClick={() => void handleConfirm()}
            disabled={!selected || confirming}
            className="font-bold text-primary-foreground"
          >
            {confirming ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Repeat2 className="size-4" aria-hidden="true" />
            )}
            جایگزینی و محاسبه مجدد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
