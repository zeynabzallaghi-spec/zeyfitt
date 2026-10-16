"use client";

/**
 * فهرست خرید برنامه غذایی — تجمیع مواد روزهای انتخابی از snapshot ذخیره‌شده
 * (سرور محاسبه می‌کند). تیک خریداری‌شده فقط محلی است و اعلام همین شده است.
 */

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Loader2, ShoppingBasket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { nutritionStrings } from "@/lib/i18n/sections/nutrition";
import { localeNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { findFood, type FoodGroupId } from "@/lib/foods";
import type { ShoppingListItem } from "@/lib/nutrition-engine/types";
import type { NutritionPlanClient } from "@/lib/nutrition-storage";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: NutritionPlanClient;
}

export function ShoppingListDialog({ open, onOpenChange, plan }: Props) {
  const t = useStrings(nutritionStrings);
  const locale = useLocale();
  const dir = useDir();
  const [selectedDays, setSelectedDays] = useState<number[]>(plan.days.map((d) => d.order));
  const [items, setItems] = useState<ShoppingListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) {
      setItems(null);
      setChecked(new Set());
      setSelectedDays(plan.days.map((d) => d.order));
    }
  }, [open, plan.days]);

  const loadList = async (days: number[]) => {
    setLoading(true);
    setItems(null);
    try {
      const param = days.length === plan.days.length ? "all" : days.join(",");
      const response = await fetch(
        `/api/nutrition/${encodeURIComponent(plan.id)}/shopping?days=${encodeURIComponent(param)}`,
        { cache: "no-store" }
      );
      if (response.ok) {
        const data = (await response.json()) as { items: ShoppingListItem[] };
        setItems(data.items);
      } else {
        toast.error(t.loadFailedToast);
      }
    } catch {
      toast.error(t.networkToast);
    } finally {
      setLoading(false);
    }
  };

  // بارگذاری خودکار هنگام باز شدن — فقط یک‌بار برای هر باز شدن
  useEffect(() => {
    if (open) {
      void loadList(plan.days.map((d) => d.order));
    }
  }, [open]);

  const toggleDay = (order: number) => {
    setSelectedDays((prev) => (prev.includes(order) ? prev.filter((d) => d !== order) : [...prev, order]));
  };

  const toggleChecked = (foodId: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(foodId)) next.delete(foodId);
      else next.add(foodId);
      return next;
    });
  };

  // گروه‌بندی برای نمایش
  const grouped = useMemo(() => {
    if (!items) return [];
    const groups = new Map<string, ShoppingListItem[]>();
    items.forEach((item) => {
      const list = groups.get(item.group) ?? [];
      list.push(item);
      groups.set(item.group, list);
    });
    return [...groups.entries()];
  }, [items]);

  // نام ماده بر اساس زبان رابط — snapshot فقط faName دارد؛ انگلیسی از بانک با شناسه پایدار
  const itemName = (item: ShoppingListItem) =>
    locale === "fa" ? item.faName : (findFood(item.foodId)?.en ?? item.faName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-start">{t.shoppingTitle}</DialogTitle>
          <DialogDescription className="text-start leading-6">
            {t.shoppingDescription}
          </DialogDescription>
        </DialogHeader>

        {plan.days.length > 1 && (
          <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
            <p className="mb-2 text-[11px] font-semibold">{t.planDaysLabel}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {plan.days.map((day) => (
                <div key={day.order} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`shop-day-${day.order}`}
                    checked={selectedDays.includes(day.order)}
                    onCheckedChange={() => toggleDay(day.order)}
                  />
                  <Label htmlFor={`shop-day-${day.order}`} className="text-[11px]">
                    {t.dayLabel(localeNumber(day.order, locale))}
                  </Label>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={loading || selectedDays.length === 0}
              onClick={() => void loadList(selectedDays)}
              className="mt-3 h-7 border-border/70 px-2.5 text-[10px] font-semibold hover:border-primary/40 hover:text-primary"
            >
              {t.calcForDaysButton(localeNumber(selectedDays.length, locale))}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" aria-hidden="true" />
            <span className="text-xs">{t.computingLabel}</span>
          </div>
        )}

        {!loading && items && items.length === 0 && (
          <p className="rounded-xl border border-border/50 bg-secondary/20 p-4 text-center text-xs text-muted-foreground">
            {t.emptyShoppingNote}
          </p>
        )}

        {!loading && items && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {grouped.map(([group, groupItems]) => (
              <div key={group}>
                <p className="mb-1.5 text-[10px] font-bold text-primary">{t.groupLabel(groupItems[0].group as FoodGroupId)}</p>
                <div className="flex flex-col gap-1">
                  {groupItems.map((item) => {
                    const isChecked = checked.has(item.foodId);
                    return (
                      <button
                        key={item.foodId}
                        type="button"
                        onClick={() => toggleChecked(item.foodId)}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-start transition-all",
                          isChecked
                            ? "border-primary/30 bg-primary/5"
                            : "border-border/50 bg-secondary/20 hover:border-primary/25"
                        )}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        ) : (
                          <Circle className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                        )}
                        <span className={cn("flex-1 text-xs font-semibold", isChecked && "text-muted-foreground line-through")}>
                          {itemName(item)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {localeNumber(item.totalGrams, locale)} {t.gramsUnit} — {item.servingHint}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-[10px] leading-5 text-muted-foreground/80">
              {t.approxAmountsNote}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <ShoppingBasket className="size-4" aria-hidden="true" />
            {t.closeButton}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
