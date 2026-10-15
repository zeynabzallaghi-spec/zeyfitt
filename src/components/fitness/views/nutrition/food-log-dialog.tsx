"use client";

/**
 * دیالوگ ثبت/ویرایش مصرف واقعی غذا — دو مسیر ثبت («از برنامه» و «از بانک
 * غذا») و حالت ویرایش. مقدار پیشنهادی برنامه هرگز خودکار ثبت نمی‌شود؛
 * کاربر مقدار واقعی را وارد یا صریحاً تأیید می‌کند.
 *
 * پیش‌نمایش مقادیر فقط نمایشی است و از همان ماژول‌های مشترک بانک/برنامه
 * محاسبه می‌شود؛ مرجع نهایی همیشه محاسبه سمت سرور است. هیچ مقدار
 * تغذیه‌ای از این دیالوگ به سرور فرستاده نمی‌شود.
 *
 * دوزبانگی: همه متن‌ها از دیکشنری foodLogStrings با زبان همان بخش می‌آید؛
 * جهت کل دیالوگ با زبان رابط و جهت نام غذا با زبان محتوای آن تنظیم می‌شود.
 */

import { useState } from "react";
import { Loader2, Search, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { faDigits, normalizeDigits } from "@/lib/profile";
import { FOOD_BANK, FOOD_GROUPS, findFood, macrosForGrams, type FoodGroupId, type FoodItem } from "@/lib/foods";
import { recomputeItemFromSnapshot } from "@/lib/nutrition-engine/engine";
import type { NutritionPlanClient } from "@/lib/nutrition-storage";
import {
  FOOD_LOG_LIMITS,
  tehranInstantFromDayTime,
  tehranTimeLabel,
} from "@/lib/foodlog/calc";
import type { FoodLogEntryClient } from "@/lib/foodlog/types";
import { FOOD_LOG_MEAL_TYPES } from "@/lib/foodlog/types";
import { mealTypeLabel, type FoodLogStrings } from "@/lib/foodlog/i18n";
import {
  useFoodLogMutations,
  type FoodLogFailure,
} from "@/hooks/use-food-logs";
import { useFoodLogSync } from "@/store/foodlog-store";

export interface PlanItemPrefill {
  planItemId: string;
  planMealId: string;
  faName: string;
  enName: string;
  plannedGrams: number;
  mealType: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang: string;
  strings: FoodLogStrings;
  /** روز انتخابی بخش مصرف (YYYY-MM-DD) */
  selectedDay: string;
  /** برنامه فعال برای تب «از برنامه» — null یعنی تب غیرفعال */
  activePlan: NutritionPlanClient | null;
  /** پیش‌پر کردن از دکمه قلم برنامه */
  prefill: PlanItemPrefill | null;
  /** حالت ویرایش */
  editTarget: FoodLogEntryClient | null;
  /** پس از موفقیت (ثبت/ویرایش) — برای به‌روزرسانی والد */
  onChanged: () => void;
  onAuthError: () => void;
}

/** نگاشت شکست ساختاریافته به پیام دوزبانه — بدون شرط زبان پراکنده */
function failureToMessage(failure: FoodLogFailure, s: FoodLogStrings): string {
  switch (failure.kind) {
    case "auth":
      return s.errorAuth;
    case "network":
      return s.errorNetwork;
    case "validation":
      return s.errorValidation;
    case "notfound":
      return failure.code === "PLAN_ITEM_NOT_FOUND" ? s.errorPlanItemNotFound : s.errorNotFound;
    case "domain":
      switch (failure.code) {
        case "FOOD_NOT_FOUND":
          return s.errorFoodNotFound;
        case "PLAN_ITEM_NOT_FOUND":
          return s.errorPlanItemNotFound;
        case "SERVINGS_OUT_OF_RANGE":
          return s.errorServingsRange(
            String(FOOD_LOG_LIMITS.minServings),
            String(FOOD_LOG_LIMITS.maxServings)
          );
        case "SERVING_UNIT_UNSUPPORTED":
          return s.errorServingUnsupported;
        case "DAY_INSTANT_MISMATCH":
          return s.errorDayMismatch;
        case "DAILY_LIMIT_REACHED":
          return s.errorDailyLimit(String(FOOD_LOG_LIMITS.maxLogsPerDay));
        default:
          return s.errorGramsRange(
            String(FOOD_LOG_LIMITS.minGrams),
            String(FOOD_LOG_LIMITS.maxGrams)
          );
      }
    default:
      return s.errorInternal;
  }
}

export function FoodLogDialog({
  open,
  onOpenChange,
  lang,
  strings: s,
  selectedDay,
  activePlan,
  prefill,
  editTarget,
  onChanged,
  onAuthError,
}: Props) {
  const { createLog, updateLog, busy } = useFoodLogMutations();
  const bumpSync = useFoodLogSync((state) => state.bump);

  const isEdit = editTarget !== null;
  const hasPlan = activePlan !== null && activePlan.days.length > 0;
  const [tab, setTab] = useState<"plan" | "bank">("bank");

  /* ------------------------------ انتخاب از بانک ------------------------------ */
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<FoodGroupId | "all">("all");
  const [bankFoodId, setBankFoodId] = useState<string | null>(null);

  /* ------------------------------ انتخاب از برنامه ------------------------------ */
  const [planItemId, setPlanItemId] = useState<string | null>(null);

  /* ------------------------------ مقادیر مشترک ------------------------------ */
  const [unit, setUnit] = useState<"g" | "serving">("g");
  const [amountDraft, setAmountDraft] = useState("");
  const [mealType, setMealType] = useState<string>("breakfast");
  const [timeDraft, setTimeDraft] = useState<string>("12:00");

  // مقادیر پیش‌فرض هر بار باز شدن دیالوگ — از prefill یا edit
  const [initializedFor, setInitializedFor] = useState<string | null>(null);
  const openKey = isEdit
    ? `edit:${editTarget.id}`
    : prefill
      ? `prefill:${prefill.planItemId}`
      : `new:${tab}`;
  if (open && initializedFor !== openKey) {
    setInitializedFor(openKey);
    if (isEdit) {
      setUnit(editTarget.unit);
      setAmountDraft(String(editTarget.amount));
      setMealType(editTarget.mealType);
      setTimeDraft(tehranTimeLabel(Date.parse(editTarget.consumedAt)));
      setBankFoodId(editTarget.source === "bank" ? editTarget.foodId : null);
      setPlanItemId(editTarget.planItemId);
      setTab(editTarget.source === "plan_item" && hasPlan ? "plan" : "bank");
    } else if (prefill) {
      setTab("plan");
      setPlanItemId(prefill.planItemId);
      setUnit("g");
      setAmountDraft(String(prefill.plannedGrams));
      setMealType(prefill.mealType);
      setTimeDraft(tehranTimeLabel(Date.now()));
      setBankFoodId(null);
    } else {
      setUnit("g");
      setAmountDraft("");
      setMealType(tab === "plan" ? "breakfast" : "breakfast");
      setTimeDraft(tehranTimeLabel(Date.now()));
      setBankFoodId(null);
      setPlanItemId(null);
    }
  }
  if (!open && initializedFor !== null) {
    setInitializedFor(null);
    setSearch("");
    setGroup("all");
  }

  /* ------------------------------ محاسبات نمایشی ------------------------------ */

  const selectedBankFood = bankFoodId ? findFood(bankFoodId) : null;
  const selectedPlanItem = (() => {
    if (!activePlan || !planItemId) return null;
    for (const day of activePlan.days) {
      for (const meal of day.meals) {
        const item = meal.items.find((i) => i.id === planItemId);
        if (item) return { item, meal };
      }
    }
    return null;
  })();

  const servingGrams: number | null =
    selectedBankFood?.servingGrams ??
    (selectedPlanItem ? findFood(selectedPlanItem.item.foodId)?.servingGrams ?? null : null) ??
    editTarget?.servingGramsUsed ??
    null;

  const amountNumber = (() => {
    const cleaned = normalizeDigits(amountDraft).trim();
    if (cleaned === "") return null;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  })();

  const gramsPreview = (() => {
    if (amountNumber === null) return null;
    if (unit === "g") {
      return amountNumber >= FOOD_LOG_LIMITS.minGrams && amountNumber <= FOOD_LOG_LIMITS.maxGrams
        ? amountNumber
        : null;
    }
    if (servingGrams === null) return null;
    const grams = Math.round(amountNumber * servingGrams * 10) / 10;
    return grams >= FOOD_LOG_LIMITS.minGrams && grams <= FOOD_LOG_LIMITS.maxGrams ? grams : null;
  })();

  const nutritionPreview = (() => {
    if (gramsPreview === null) return null;
    if (selectedBankFood) {
      return macrosForGrams(selectedBankFood, gramsPreview);
    }
    if (selectedPlanItem) {
      return recomputeItemFromSnapshot(
        {
          grams: selectedPlanItem.item.grams,
          kcal: selectedPlanItem.item.kcal,
          protein: selectedPlanItem.item.protein,
          carb: selectedPlanItem.item.carb,
          fat: selectedPlanItem.item.fat,
        },
        gramsPreview
      );
    }
    if (isEdit && editTarget) {
      return recomputeItemFromSnapshot(
        {
          grams: editTarget.grams,
          kcal: editTarget.kcal,
          protein: editTarget.protein,
          carb: editTarget.carb,
          fat: editTarget.fat,
        },
        gramsPreview
      );
    }
    return null;
  })();

  /* -------------------------------- ارسال -------------------------------- */

  const canSubmit =
    !busy &&
    gramsPreview !== null &&
    (isEdit ||
      (tab === "bank" && selectedBankFood !== null) ||
      (tab === "plan" && selectedPlanItem !== null));

  const submit = async () => {
    if (!canSubmit || gramsPreview === null) return;
    const instantMs = tehranInstantFromDayTime(selectedDay, timeDraft);
    if (!Number.isFinite(instantMs)) {
      toast.error(s.errorValidation);
      return;
    }
    const consumedAt = new Date(instantMs).toISOString();

    if (isEdit && editTarget) {
      const result = await updateLog(editTarget.id, {
        unit,
        amount: amountNumber ?? undefined,
        mealType,
        consumedAt,
        localDay: selectedDay,
      });
      if (result.ok) {
        toast.success(s.successUpdated);
        bumpSync();
        onChanged();
        onOpenChange(false);
      } else {
        toast.error(failureToMessage(result, s));
        if (result.kind === "auth") onAuthError();
      }
      return;
    }

    if (tab === "bank" && selectedBankFood) {
      const result = await createLog({
        source: "bank",
        foodId: selectedBankFood.id,
        unit,
        amount: amountNumber ?? 0,
        mealType,
        consumedAt,
        localDay: selectedDay,
        clientRequestId: crypto.randomUUID(),
      });
      if (result.ok) {
        toast.success(s.successLogged);
        bumpSync();
        onChanged();
        onOpenChange(false);
      } else {
        toast.error(failureToMessage(result, s));
        if (result.kind === "auth") onAuthError();
      }
      return;
    }

    if (tab === "plan" && selectedPlanItem) {
      const result = await createLog({
        source: "plan_item",
        planItemId: selectedPlanItem.item.id,
        unit,
        amount: amountNumber ?? 0,
        mealType,
        consumedAt,
        localDay: selectedDay,
        clientRequestId: crypto.randomUUID(),
      });
      if (result.ok) {
        toast.success(s.successLogged);
        bumpSync();
        onChanged();
        onOpenChange(false);
      } else {
        toast.error(failureToMessage(result, s));
        if (result.kind === "auth") onAuthError();
      }
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      dir={s.dir}
      lang={s.langAttr}
      onClick={() => !busy && onOpenChange(false)}
    >
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
            <Utensils className="size-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-bold">{isEdit ? s.editDialogTitle : s.logDialogTitle}</h3>
        </div>

        {!isEdit && (
          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl border border-border/50 bg-secondary/20 p-1">
            {hasPlan && (
              <button
                type="button"
                onClick={() => setTab("plan")}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors",
                  tab === "plan" ? "bg-primary/15 text-primary" : "text-muted-foreground"
                )}
              >
                {s.addFromPlan}
              </button>
            )}
            <button
              type="button"
              onClick={() => setTab("bank")}
              className={cn(
                "rounded-lg px-2 py-1.5 text-[11px] font-bold transition-colors",
                tab === "bank" || !hasPlan ? "bg-primary/15 text-primary" : "text-muted-foreground"
              )}
            >
              {s.addFromBank}
            </button>
          </div>
        )}

        {/* انتخاب غذا — بانک */}
        {!isEdit && (tab === "bank" || !hasPlan) && (
          <div className="mt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground start-3" aria-hidden="true" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={s.searchPlaceholder}
                className="h-9 ps-8 text-xs"
                aria-label={s.searchPlaceholder}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setGroup("all")}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                  group === "all"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/50 text-muted-foreground"
                )}
              >
                {s.groupAll}
              </button>
              {FOOD_GROUPS.map((groupDef) => (
                <button
                  key={groupDef.id}
                  type="button"
                  onClick={() => setGroup(groupDef.id)}
                  lang={lang === "en" ? "en" : "fa"}
                  className={cn(
                    "rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                    group === groupDef.id
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground"
                  )}
                >
                  {lang === "en" ? groupDef.en : groupDef.fa}
                </button>
              ))}
            </div>
            <BankFoodList
              search={search}
              group={group}
              selectedId={bankFoodId}
              onSelect={(id) => {
                setBankFoodId(id);
                const food = findFood(id);
                if (food && amountDraft.trim() === "") {
                  setUnit("g");
                  setAmountDraft(String(food.servingGrams));
                }
              }}
              lang={lang}
              emptyText={s.searchNoResults}
            />
          </div>
        )}

        {/* انتخاب غذا — برنامه */}
        {!isEdit && tab === "plan" && hasPlan && activePlan && (
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-border/50 bg-secondary/10 p-2">
            {activePlan.days[0].meals.map((meal) => (
              <div key={meal.id}>
                <p className="px-1 text-[10px] font-bold text-muted-foreground">{meal.title}</p>
                <div className="mt-1 flex flex-col gap-1">
                  {meal.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPlanItemId(item.id);
                        setUnit("g");
                        setAmountDraft(String(item.grams));
                        setMealType(meal.type);
                      }}
                      dir="auto"
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-start text-[11px] font-semibold transition-colors",
                        planItemId === item.id
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/40 text-foreground/90 hover:border-primary/30"
                      )}
                    >
                      <span className="truncate">{item.faName}</span>
                      <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
                        {faDigits(item.grams)} {s.unitGrams}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* مقدار و واحد و وعده و زمان */}
        <div className="mt-4 flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-bold">{s.amountLabel}</p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Input
                inputMode="decimal"
                dir="ltr"
                value={amountDraft}
                onChange={(event) => setAmountDraft(event.target.value)}
                className="h-9 w-24 flex-none text-center text-sm"
                aria-label={s.amountLabel}
              />
              <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg border border-border/50 bg-secondary/20 p-1">
                <button
                  type="button"
                  onClick={() => setUnit("g")}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-bold",
                    unit === "g" ? "bg-primary/15 text-primary" : "text-muted-foreground"
                  )}
                >
                  {s.unitGrams}
                </button>
                <button
                  type="button"
                  onClick={() => setUnit("serving")}
                  disabled={servingGrams === null}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-bold disabled:opacity-40",
                    unit === "serving" ? "bg-primary/15 text-primary" : "text-muted-foreground"
                  )}
                >
                  {s.unitServing}
                </button>
              </div>
            </div>
            {unit === "serving" && servingGrams !== null && (
              <p className="mt-1 text-[10px] text-muted-foreground">
                {s.servingSizeInfo(faDigits(servingGrams))}
              </p>
            )}
            {amountDraft.trim() !== "" && gramsPreview === null && (
              <p className="mt-1 text-[10px] text-rose-300">
                {unit === "serving"
                  ? s.errorServingsRange(
                      faDigits(FOOD_LOG_LIMITS.minServings),
                      faDigits(FOOD_LOG_LIMITS.maxServings)
                    )
                  : s.errorGramsRange(faDigits(FOOD_LOG_LIMITS.minGrams), faDigits(FOOD_LOG_LIMITS.maxGrams))}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] font-bold">{s.mealTypeLabel}</p>
              <select
                value={mealType}
                onChange={(event) => setMealType(event.target.value)}
                className="mt-1.5 h-9 w-full rounded-md border border-border/60 bg-card px-2 text-xs"
                aria-label={s.mealTypeLabel}
              >
                {FOOD_LOG_MEAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {mealTypeLabel(type, lang === "en" ? "en" : "fa")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-[11px] font-bold">{s.timeLabel}</p>
              <Input
                type="time"
                dir="ltr"
                value={timeDraft}
                onChange={(event) => setTimeDraft(event.target.value)}
                className="mt-1.5 h-9 text-xs"
                aria-label={s.timeLabel}
              />
            </div>
          </div>

          {prefill && !isEdit && tab === "plan" && planItemId === prefill.planItemId && (
            <p className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-2 text-[10px] leading-5 text-amber-200">
              {s.realAmountNotice}
            </p>
          )}

          {nutritionPreview !== null && gramsPreview !== null && (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-2.5">
              <p className="text-[10px] font-bold text-primary">{s.previewTotals}</p>
              <p className="mt-1 text-[11px] leading-5 text-foreground/90" dir="auto">
                {faDigits(gramsPreview)} {s.unitGrams} — {faDigits(nutritionPreview.kcal)}{" "}
                {s.totalKcal} — {s.totalProtein} {faDigits(nutritionPreview.protein)} /{" "}
                {s.totalCarb} {faDigits(nutritionPreview.carb)} / {s.totalFat}{" "}
                {faDigits(nutritionPreview.fat)}
              </p>
            </div>
          )}

          <p className="text-[10px] leading-5 text-muted-foreground/70">{s.estimateNote}</p>

          <div className="flex gap-2">
            <Button
              onClick={() => void submit()}
              disabled={!canSubmit}
              className="flex-1 font-bold text-primary-foreground"
            >
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {isEdit ? s.save : busy ? s.logging : s.confirmLog}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
              className="border-border/70 font-semibold"
            >
              {s.cancel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** فهرست نتایج جست‌وجوی بانک — جست‌وجو در نام فارسی و انگلیسی */
function BankFoodList({
  search,
  group,
  selectedId,
  onSelect,
  lang,
  emptyText,
}: {
  search: string;
  group: FoodGroupId | "all";
  selectedId: string | null;
  onSelect: (id: string) => void;
  lang: string;
  emptyText: string;
}) {
  // بانک کوچک است (~۴۰ ماده) — فیلتر و جست‌وجوی ساده کافی و تکرارپذیر است
  const query = normalizeDigits(search).trim().toLowerCase();
  const results = FOOD_BANK.filter((food: FoodItem) => {
    if (group !== "all" && food.group !== group) return false;
    if (query === "") return true;
    return (
      food.fa.includes(normalizeDigits(search).trim()) ||
      food.en.toLowerCase().includes(query)
    );
  });

  if (results.length === 0) {
    return <p className="mt-2 rounded-lg border border-border/40 bg-secondary/10 p-3 text-[11px] leading-5 text-muted-foreground">{emptyText}</p>;
  }

  return (
    <div className="mt-2 max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border/50 bg-secondary/10 p-1.5">
      {results.map((food) => (
        <button
          key={food.id}
          type="button"
          onClick={() => onSelect(food.id)}
          dir="auto"
          className={cn(
            "flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-start text-[11px] font-semibold transition-colors",
            selectedId === food.id
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-transparent text-foreground/90 hover:border-primary/30"
          )}
        >
          <span className="truncate">{lang === "en" ? food.en : food.fa}</span>
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground" dir="ltr">
            {food.servingGrams}g
          </span>
        </button>
      ))}
    </div>
  );
}
