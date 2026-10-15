"use client";

/**
 * نمایش برنامه غذایی ذخیره‌شده — وعده‌ها به‌صورت بازشونده، مواد با مقدار
 * گرم، تغییر مقدار با پیش‌نمایش زندهٔ محاسبه (پیش از ذخیره)، جایگزینی با
 * دیالوگ، مجموع‌های به‌روزشده از پاسخ سرور، فهرست خرید و یادداشت‌ها.
 * همه تغییرها فقط پس از تأیید سرور اعمال می‌شوند.
 */

import { useState } from "react";
import {
  Calculator,
  ChevronDown,
  CircleAlert,
  Loader2,
  Pencil,
  Repeat2,
  ShoppingBasket,
  Utensils,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { faDigits, normalizeDigits } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { recomputeItemFromSnapshot } from "@/lib/nutrition-engine/engine";
import { NUTRITION_GOAL_LABELS } from "@/lib/nutrition-engine/types";
import type { NutritionMealItemClient, NutritionPlanClient } from "@/lib/nutrition-storage";
import { ReplaceItemDialog } from "./replace-dialog";
import { ShoppingListDialog } from "./shopping-dialog";
import { FoodLogDialog, type PlanItemPrefill } from "./food-log-dialog";
import { useFoodLogUiLang } from "@/lib/foodlog/use-ui-lang";
import { foodLogStrings } from "@/lib/foodlog/i18n";
import { useFoodLogSync } from "@/store/foodlog-store";
import { tehranLocalDay } from "@/lib/foodlog/calc";

interface Props {
  plan: NutritionPlanClient;
  onChanged: (plan: NutritionPlanClient) => void;
}

type PatchTarget = { dayOrder: number; mealOrder: number; itemOrder: number; item: NutritionMealItemClient };

function MacroRow({ kcal, protein, carb, fat, bold }: { kcal: number; protein: number; carb: number; fat: number; bold?: boolean }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 font-semibold text-muted-foreground", bold ? "text-[11px]" : "text-[10px]")}>
      <span className="text-primary">{faDigits(kcal)} کیلوکالری</span>
      <span>پروتئین {faDigits(protein)} گرم</span>
      <span>کربوهیدرات {faDigits(carb)} گرم</span>
      <span>چربی {faDigits(fat)} گرم</span>
    </div>
  );
}

export function NutritionPlanDetail({ plan, onChanged }: Props) {
  const [openDays, setOpenDays] = useState<number[]>([1]);
  const [patchTarget, setPatchTarget] = useState<PatchTarget | null>(null);
  const [gramsDraft, setGramsDraft] = useState("");
  const [replaceTarget, setReplaceTarget] = useState<PatchTarget | null>(null);
  const [shoppingOpen, setShoppingOpen] = useState(false);
  const [patching, setPatching] = useState(false);
  // ثبت مصرف واقعی از قلم برنامه — پیش‌پر با مقدار برنامه، ثبت فقط با تأیید
  const logLang = useFoodLogUiLang();
  const logStrings = foodLogStrings(logLang);
  const bumpFoodLogSync = useFoodLogSync((state) => state.bump);
  const [logPrefill, setLogPrefill] = useState<PlanItemPrefill | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  // پیش‌نمایش زنده تغییر مقدار — از snapshot خود ماده (همان منطق سرور)
  const gramsPreview = (() => {
    if (!patchTarget || !gramsDraft.trim()) return null;
    const grams = Number(normalizeDigits(gramsDraft));
    if (!Number.isInteger(grams) || grams < 10 || grams > 1500) return null;
    if (grams === patchTarget.item.grams) return null;
    return recomputeItemFromSnapshot(
      {
        grams: patchTarget.item.grams,
        kcal: patchTarget.item.kcal,
        protein: patchTarget.item.protein,
        carb: patchTarget.item.carb,
        fat: patchTarget.item.fat,
      },
      grams
    );
  })();

  const toggleDay = (order: number) => {
    setOpenDays((prev) => (prev.includes(order) ? prev.filter((d) => d !== order) : [...prev, order]));
  };

  const patchPlan = async (body: Record<string, unknown>, successMessage: string) => {
    setPatching(true);
    try {
      const response = await fetch(`/api/nutrition/${encodeURIComponent(plan.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        const data = (await response.json()) as { plan: NutritionPlanClient };
        onChanged(data.plan);
        toast.success(successMessage);
        return true;
      }
      let message = "تغییر ممکن نشد؛ دوباره تلاش کنید.";
      try {
        const data = (await response.json()) as { message?: string };
        if (data.message) message = data.message;
      } catch {
        /* پاسخ بدون بدنه */
      }
      toast.error(message);
      return false;
    } catch {
      toast.error("ارتباط با سرور برقرار نشد.");
      return false;
    } finally {
      setPatching(false);
    }
  };

  const confirmGrams = async () => {
    if (!patchTarget || !gramsPreview) return;
    const ok = await patchPlan(
      {
        action: "update_item",
        dayOrder: patchTarget.dayOrder,
        mealOrder: patchTarget.mealOrder,
        itemOrder: patchTarget.itemOrder,
        grams: gramsPreview.grams,
      },
      "مقدار به‌روزرسانی و مجموع‌ها دوباره محاسبه شد"
    );
    if (ok) {
      setPatchTarget(null);
      setGramsDraft("");
    }
  };

  const confirmReplace = async (newFoodId: string) => {
    if (!replaceTarget) return;
    await patchPlan(
      {
        action: "replace_item",
        dayOrder: replaceTarget.dayOrder,
        mealOrder: replaceTarget.mealOrder,
        itemOrder: replaceTarget.itemOrder,
        newFoodId,
      },
      "ماده جایگزین شد و مجموع‌ها دوباره محاسبه شد"
    );
  };

  const { calc } = plan;
  const dayAvg = plan.days.length > 0 ? Math.round(plan.days.reduce((s, d) => s + d.kcal, 0) / plan.days.length) : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* خلاصه برنامه ذخیره‌شده */}
      <section aria-label="خلاصه برنامه غذایی" className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold">{plan.title}</h3>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              هدف: {NUTRITION_GOAL_LABELS[plan.goal]} — {faDigits(plan.mealsPerDay)} وعده در روز —{" "}
              {plan.days.length > 1 ? `${faDigits(plan.days.length)} روز با تنوع` : "یک‌روزه"}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShoppingOpen(true)}
            className="h-8 border-border/70 px-3 text-[11px] font-semibold hover:border-primary/40 hover:text-primary"
          >
            <ShoppingBasket className="size-3.5" aria-hidden="true" />
            فهرست خرید
          </Button>
        </div>

        {!calc.caution && calc.targetKcal !== null && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground">هدف کالری روزانه</p>
                <p className="mt-1 text-sm font-extrabold">{faDigits(calc.targetKcal)}</p>
              </div>
              <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-center">
                <p className="text-[10px] text-primary">میانگین روزهای برنامه</p>
                <p className="mt-1 text-sm font-extrabold text-primary">{faDigits(dayAvg)}</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground">پروتئین هدف</p>
                <p className="mt-1 text-sm font-extrabold">{faDigits(calc.macros?.proteinG ?? "—")} گرم</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
                <p className="text-[10px] text-muted-foreground">BMR / TDEE تخمینی</p>
                <p className="mt-1 text-sm font-extrabold">
                  {faDigits(calc.bmr ?? "—")} / {faDigits(calc.tdee ?? "—")}
                </p>
              </div>
            </div>
            {calc.macros && Math.abs(dayAvg - calc.targetKcal) > calc.targetKcal * 0.05 && (
              <p className="mt-3 text-[10px] leading-5 text-amber-200/90">
                میانگین انرژی روزهای برنامه با هدف {Math.abs(dayAvg - calc.targetKcal) > 0 ? (dayAvg > calc.targetKcal ? "حدود" : "حدود") : ""}{" "}
                {faDigits(Math.abs(dayAvg - calc.targetKcal))} کیلوکالری اختلاف دارد — نتیجه واقعی اجزای برنامه است و برای تطبیق ظاهری دستکاری نشده است.
              </p>
            )}
          </>
        )}
        {calc.caution && (
          <p className="mt-3 flex items-start gap-2 text-[11px] leading-5 text-amber-200">
            <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden="true" />
            این برنامه در حالت احتیاط و بر پایه حفظ وزن ساخته شده است؛ برای تغییر هدف با متخصص مشورت کنید.
          </p>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
          <Calculator className="size-3" aria-hidden="true" />
          محاسبات با موتور قانون‌محور نسخه {plan.engineVersion} و بانک مواد نسخه {plan.foodsVersion} تولید شده است.
        </p>
      </section>

      {/* روزها و وعده‌ها */}
      <section aria-label="وعده‌های برنامه" className="flex flex-col gap-2.5">
        {plan.days.map((day) => {
          const isOpen = openDays.includes(day.order);
          return (
            <Collapsible
              key={day.id}
              open={isOpen}
              onOpenChange={() => toggleDay(day.order)}
              className="rounded-2xl border border-border/60 bg-card"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-start">
                <div>
                  <p className="text-xs font-bold">
                    {plan.days.length > 1 ? `روز ${faDigits(day.order)}` : "برنامه روز"}
                  </p>
                  <div className="mt-1">
                    <MacroRow kcal={day.kcal} protein={day.protein} carb={day.carb} fat={day.fat} />
                  </div>
                </div>
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="border-t border-border/50 px-4 pb-4 pt-3">
                <div className="flex flex-col gap-3">
                  {day.meals.map((meal) => (
                    <div key={meal.id} className="rounded-xl border border-border/40 bg-secondary/20 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-primary">{meal.title}</p>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {faDigits(meal.kcal)} کیلوکالری
                        </span>
                      </div>
                      <ul className="mt-2.5 flex flex-col gap-2">
                        {meal.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg border border-border/40 bg-card px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-foreground/90">
                                {item.faName}
                                <span className="ms-2 text-[10px] font-medium text-muted-foreground">
                                  {faDigits(item.grams)} گرم — {faDigits(item.kcal)} کیلوکالری
                                </span>
                              </p>
                              <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                                سهم متداول: {item.servingHint} — پروتئین {faDigits(item.protein)} / کربوهیدرات{" "}
                                {faDigits(item.carb)} / چربی {faDigits(item.fat)} گرم
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setLogPrefill({
                                    planItemId: item.id,
                                    planMealId: meal.id,
                                    faName: item.faName,
                                    enName: item.enName,
                                    plannedGrams: item.grams,
                                    mealType: meal.type,
                                  });
                                  setLogOpen(true);
                                }}
                                className="h-7 border-primary/40 bg-primary/10 px-2 text-[10px] font-bold text-primary hover:bg-primary/20"
                                aria-label={logLang === "en" ? "Log intake" : "ثبت مصرف"}
                              >
                                <Utensils className="size-3" aria-hidden="true" />
                                <span className="hidden sm:inline">
                                  {logLang === "en" ? "Log" : "ثبت مصرف"}
                                </span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={patching}
                                onClick={() => {
                                  setPatchTarget({ dayOrder: day.order, mealOrder: meal.order, itemOrder: item.order, item });
                                  setGramsDraft(String(item.grams));
                                }}
                                className="h-7 border-border/60 px-2 text-[10px] font-semibold hover:border-primary/40 hover:text-primary"
                              >
                                <Pencil className="size-3" aria-hidden="true" />
                                مقدار
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={patching}
                                onClick={() =>
                                  setReplaceTarget({ dayOrder: day.order, mealOrder: meal.order, itemOrder: item.order, item })
                                }
                                className="h-7 border-border/60 px-2 text-[10px] font-semibold hover:border-primary/40 hover:text-primary"
                              >
                                <Repeat2 className="size-3" aria-hidden="true" />
                                جایگزین
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-2.5 border-t border-border/40 pt-2">
                        <MacroRow kcal={meal.kcal} protein={meal.protein} carb={meal.carb} fat={meal.fat} />
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </section>

      {/* یادداشت‌های برنامه */}
      {plan.notes.length > 0 && (
        <section aria-label="یادداشت‌ها" className="rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="text-sm font-bold">یادداشت‌های مهم</h3>
          <ul className="mt-3 flex flex-col gap-2">
            {plan.notes.map((note, index) => (
              <li key={index} className="flex items-start gap-2.5 text-[11px] leading-6 text-muted-foreground">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* دیالوگ تغییر مقدار — با پیش‌نمایش زنده پیش از ذخیره */}
      {patchTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center" role="dialog" aria-modal="true" onClick={() => !patching && setPatchTarget(null)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-border/60 bg-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold">تغییر مقدار «{patchTarget.item.faName}»</h3>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              مقدار فعلی: {faDigits(patchTarget.item.grams)} گرم. مقدار جدید را وارد کنید و نتیجه
              را پیش از ذخیره ببینید.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Input
                autoFocus
                inputMode="numeric"
                value={gramsDraft}
                onChange={(e) => setGramsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && gramsPreview) void confirmGrams();
                }}
                className="h-9 flex-1 text-sm"
                aria-label="مقدار جدید به گرم"
              />
              <span className="text-xs text-muted-foreground">گرم</span>
            </div>
            {gramsDraft.trim() && !gramsPreview && (
              <p className="mt-2 text-[10px] text-rose-300">
                مقدار باید عددی بین ۱۰ تا ۱۵۰۰ گرم باشد.
              </p>
            )}
            {gramsPreview && (
              <div className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-3">
                <p className="text-[10px] font-bold text-primary">پیش‌نمایش پس از ذخیره:</p>
                <p className="mt-1 text-[11px] leading-5 text-foreground/90">
                  {faDigits(gramsPreview.grams)} گرم — {faDigits(gramsPreview.kcal)} کیلوکالری — پروتئین{" "}
                  {faDigits(gramsPreview.protein)} / کربوهیدرات {faDigits(gramsPreview.carb)} / چربی{" "}
                  {faDigits(gramsPreview.fat)} گرم
                </p>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => void confirmGrams()}
                disabled={!gramsPreview || patching}
                className="flex-1 font-bold text-primary-foreground"
              >
                {patching ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                ذخیره تغییر
              </Button>
              <Button
                variant="outline"
                onClick={() => setPatchTarget(null)}
                disabled={patching}
                className="border-border/70 font-semibold"
              >
                انصراف
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* دیالوگ جایگزینی */}
      {replaceTarget && (
        <ReplaceItemDialog
          open={replaceTarget !== null}
          onOpenChange={(open) => !open && setReplaceTarget(null)}
          plan={plan}
          item={{
            foodId: replaceTarget.item.foodId,
            faName: replaceTarget.item.faName,
            grams: replaceTarget.item.grams,
            kcal: replaceTarget.item.kcal,
            protein: replaceTarget.item.protein,
          }}
          onConfirm={confirmReplace}
        />
      )}

      {/* فهرست خرید */}
      <ShoppingListDialog open={shoppingOpen} onOpenChange={setShoppingOpen} plan={plan} />

      {/* دیالوگ ثبت مصرف واقعی از قلم برنامه — مقدار برنامه پیش‌فرض است، نه ثبت خودکار */}
      <FoodLogDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        lang={logLang}
        strings={logStrings}
        selectedDay={tehranLocalDay(Date.now())}
        activePlan={plan}
        prefill={logPrefill}
        editTarget={null}
        onChanged={() => {
          // بخش مصرف واقعی با سیگنال سبک همگام می‌شود؛ خود برنامه تغییری نمی‌کند
          bumpFoodLogSync();
        }}
        onAuthError={() => {
          toast.error(
            logLang === "en"
              ? "Your session has expired; please sign in again."
              : "نشست شما منقضی شده است؛ دوباره وارد شوید."
          );
        }}
      />
    </div>
  );
}
