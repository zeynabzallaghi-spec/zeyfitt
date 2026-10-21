"use client";

/**
 * تب «برنامه‌های غذایی من» — سازنده برنامه غذایی اختصاصی مربی.
 * مواد فقط از بانک واقعی غذا انتخاب می‌شوند؛ مقادیر کالری/درشت‌مغذی
 * سمت سرور محاسبه می‌شوند و داده تغذیه‌ای کلاینت هرگز پذیرفته نمی‌شود.
 * پیش‌نمایش با همان رندرکننده نمای دانشجو ساخته می‌شود.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  RefreshCw,
  Search,
  ArrowUp,
  ArrowDown,
  UtensilsCrossed,
  Save,
  X,
  Info,
} from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { ViewIntro } from "../../shared/view-intro";
import { EmptyState } from "../../shared/empty-state";
import { FOOD_BANK } from "@/lib/foods";
import { foodGroupFa } from "@/lib/foods";
import { mealTitleLabel } from "@/lib/i18n/engine-content";
import { CoachNutritionContentView } from "./plan-content-view";
import { PlanStatusBadge, PlanCardActions, PlanListFilters, applyPlanFilters, type PlanTypeFilter } from "./plans-shared";
import {
  useCoachNutritionPlans,
  createCoachNutritionPlan,
  updateCoachNutritionPlan,
  getCoachNutritionPlan,
} from "@/hooks/use-coach-plans";
import type {
  BuilderDayNutritionInput,
  BuilderMealInput,
  BuilderMealItemInput,
  CoachNutritionContentClient,
  CoachPlanDetailClient,
  CoachPlanListItemClient,
} from "@/lib/coaching/plans-client";

const NUTRITION_GOALS = ["weight_loss", "muscle_gain", "maintain"] as const;
const MEAL_TYPES = ["breakfast", "snack_am", "lunch", "snack_pm", "dinner", "snack_ev"] as const;

function emptyItem(): BuilderMealItemInput {
  return {
    foodId: "",
    faName: "",
    enName: "",
    group: "",
    unit: "g",
    amount: "100",
    maxGrams: undefined,
    servingGrams: undefined,
  };
}

function emptyMeal(): BuilderMealInput {
  return { type: "breakfast", items: [emptyItem()] };
}

function emptyNutritionDay(): BuilderDayNutritionInput {
  return { meals: [emptyMeal()] };
}

interface NutritionForm {
  title: string;
  description: string;
  goal: string;
  durationDays: string;
  days: BuilderDayNutritionInput[];
}

function emptyNutritionForm(): NutritionForm {
  return {
    title: "",
    description: "",
    goal: "maintain",
    durationDays: "1",
    days: [emptyNutritionDay()],
  };
}

function formFromNutritionDetail(detail: CoachPlanDetailClient): NutritionForm {
  if (!("meals" in ((detail.content as { days?: { meals?: unknown }[] }).days?.[0] ?? {}))) {
    // محتوا تمرینی است — این نباید رخ دهد؛ فرم خالی صادقانه
    return emptyNutritionForm();
  }
  const content = detail.content as CoachNutritionContentClient;
  const days = content.days.map((d) => ({
    meals: d.meals.map((m) => ({
      type: m.type,
      items: m.items.map((it) => ({
        foodId: it.foodId,
        faName: it.faName,
        enName: it.enName,
        group: it.group,
        unit: "g" as const,
        amount: String(it.grams),
        maxGrams: undefined,
        servingGrams: undefined,
      })),
    })),
  }));
  return {
    title: detail.title,
    description: detail.description,
    goal: detail.goal,
    durationDays: String(detail.meta.durationDays ?? days.length),
    days: days.length > 0 ? days : [emptyNutritionDay()],
  };
}

/* ------------------------------ انتخاب غذا ------------------------------ */

function FoodPickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (food: { id: string; fa: string; en: string; group: string; maxGrams?: number; servingGrams: number }) => void;
}) {
  const t = useStrings(coachPlansStrings);
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q
    ? FOOD_BANK.filter((f) => f.fa.includes(q) || f.en.toLowerCase().includes(q)).slice(0, 30)
    : FOOD_BANK.slice(0, 30);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t.foodPickerTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              dir={locale === "fa" ? "rtl" : "ltr"}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.foodSearchPlaceholder}
              className="ps-8 text-xs"
            />
          </div>
          <div className="max-h-72 space-y-1.5 overflow-y-auto pe-1">
            {results.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">{t.noFoodResults}</p>
            ) : (
              results.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/20 p-2.5 text-start transition-colors hover:bg-primary/10"
                  onClick={() => {
                    onPick({
                      id: food.id,
                      fa: food.fa,
                      en: food.en,
                      group: food.group,
                      maxGrams: food.maxGrams,
                      servingGrams: food.servingGrams,
                    });
                    onOpenChange(false);
                    setQuery("");
                  }}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-foreground" dir="auto">
                      {locale === "fa" ? food.fa : food.en}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">
                      {locale === "fa" ? foodGroupFa(food.group) : food.group} · {food.servingLabel}
                    </span>
                  </span>
                  <span className="text-[10px] font-bold text-primary">{t.selectFood}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ دیالوگ سازنده ------------------------------ */

function NutritionBuilderDialog({
  open,
  onOpenChange,
  planId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  planId: string | null;
  onSaved: () => void;
}) {
  const t = useStrings(coachPlansStrings);
  const locale = useLocale();
  const { toast } = useToast();
  const [form, setForm] = useState<NutritionForm>(emptyNutritionForm);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<{ day: number; meal: number } | null>(null);

  if (open && planId && loadedFrom !== planId) {
    setLoadedFrom(planId);
    void (async () => {
      const result = await getCoachNutritionPlan(planId);
      if (result.ok) {
        setForm(formFromNutritionDetail(result.data.plan));
      } else {
        toast({ title: t.loadError, description: result.message, variant: "destructive" });
        onOpenChange(false);
      }
    })();
  }
  if (open && !planId && loadedFrom !== "new") {
    setLoadedFrom("new");
    setForm(emptyNutritionForm());
  }
  if (!open && loadedFrom !== null) {
    setLoadedFrom(null);
  }

  const dayCount = Number(form.durationDays) || 1;

  const syncDayCount = (next: number) => {
    setForm((f) => {
      const days = [...f.days];
      while (days.length < next) days.push(emptyNutritionDay());
      while (days.length > next) days.pop();
      return { ...f, durationDays: String(next), days };
    });
  };

  const patchMeal = (dayIdx: number, mealIdx: number, patch: Partial<BuilderMealInput>) => {
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) =>
        i === dayIdx
          ? { ...d, meals: d.meals.map((m, j) => (j === mealIdx ? { ...m, ...patch } : m)) }
          : d
      ),
    }));
  };
  const patchItem = (dayIdx: number, mealIdx: number, itemIdx: number, patch: Partial<BuilderMealItemInput>) => {
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) =>
        i === dayIdx
          ? {
              ...d,
              meals: d.meals.map((m, j) =>
                j === mealIdx
                  ? { ...m, items: m.items.map((it, k) => (k === itemIdx ? { ...it, ...patch } : it)) }
                  : m
              ),
            }
          : d
      ),
    }));
  };
  const moveMeal = (dayIdx: number, mealIdx: number, dir: -1 | 1) => {
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) => {
        if (i !== dayIdx) return d;
        const meals = [...d.meals];
        const target = mealIdx + dir;
        if (target < 0 || target >= meals.length) return d;
        [meals[mealIdx], meals[target]] = [meals[target], meals[mealIdx]];
        return { ...d, meals };
      }),
    }));
  };

  const save = async () => {
    if (saving) return;
    if (form.title.trim().length < 2) {
      toast({ title: t.formErrorsTitle, description: t.invalidTitle, variant: "destructive" });
      return;
    }
    const daysPayload = form.days.map((d) => ({
      meals: d.meals
        .map((m) => ({
          type: m.type,
          items: m.items
            .filter((it) => it.foodId)
            .map((it) => ({ foodId: it.foodId, unit: it.unit, amount: Number(it.amount) })),
        }))
        .filter((m) => m.items.length > 0),
    }));
    if (daysPayload.every((d) => d.meals.length === 0)) {
      toast({ title: t.formErrorsTitle, description: t.invalidItems, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      goal: form.goal,
      durationDays: dayCount,
      days: daysPayload,
    };
    const result = planId
      ? await updateCoachNutritionPlan(planId, payload)
      : await createCoachNutritionPlan(payload);
    setSaving(false);
    if (result.ok) {
      toast({ title: t.draftSavedTitle, description: t.draftSavedNote });
      onOpenChange(false);
      onSaved();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none border-0 overflow-y-auto sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {planId ? t.builderTitleEdit : t.builderTitleNew}
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-5">
            {t.serverComputeNote} {t.snapshotNote}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* اطلاعات پایه */}
          <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/20 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cnp-title" className="text-[11px] font-bold text-foreground">{t.titleLabel}</Label>
                <Input
                  id="cnp-title"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 120) }))}
                  placeholder={t.titlePlaceholder}
                  maxLength={120}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cnp-desc" className="text-[11px] font-bold text-foreground">{t.descriptionLabel}</Label>
                <Textarea
                  id="cnp-desc"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                  placeholder={t.descriptionPlaceholder}
                  rows={2}
                  maxLength={2000}
                  className="resize-none text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">{t.goalSelect}</Label>
                <Select value={form.goal} onValueChange={(v) => setForm((f) => ({ ...f, goal: v }))}>
                  <SelectTrigger className="w-full text-xs" aria-label={t.goalSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NUTRITION_GOALS.map((g) => (
                      <SelectItem key={g} value={g} className="text-xs">
                        {t.nutritionGoalLabel(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">{t.daysLabel}</Label>
                <Select
                  value={String(dayCount)}
                  onValueChange={(v) => syncDayCount(Number(v))}
                >
                  <SelectTrigger className="w-full text-xs" aria-label={t.daysLabel}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <SelectItem key={n} value={String(n)} className="text-xs">
                        {t.daysCount(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-card/60 p-2.5">
              <Info className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-[10px] leading-5 text-muted-foreground">{t.estimateNote}</p>
            </div>
          </div>

          {/* روزها */}
          {form.days.map((day, dayIdx) => (
            <div key={dayIdx} className="space-y-2.5 rounded-xl border border-border/60 bg-card/60 p-3">
              <p className="text-xs font-bold text-foreground">
                {t.dayNumber(dayIdx + 1)}
              </p>

              {day.meals.map((meal, mealIdx) => (
                <div key={mealIdx} className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                      {mealTitleLabel(meal.type, "", locale)}
                    </Badge>
                    <Select
                      value={meal.type}
                      onValueChange={(v) => patchMeal(dayIdx, mealIdx, { type: v })}
                    >
                      <SelectTrigger className="h-8 w-40 text-xs" aria-label={t.mealTypeLabel}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MEAL_TYPES.map((mt) => (
                          <SelectItem key={mt} value={mt} className="text-xs">
                            {mealTitleLabel(mt, "", locale)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => moveMeal(dayIdx, mealIdx, -1)}
                      disabled={mealIdx === 0}
                      aria-label={t.moveUp}
                    >
                      <ArrowUp className="size-3" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => moveMeal(dayIdx, mealIdx, 1)}
                      disabled={mealIdx === day.meals.length - 1}
                      aria-label={t.moveDown}
                    >
                      <ArrowDown className="size-3" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-rose-300 hover:bg-rose-400/10"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          days: f.days.map((d, i) =>
                            i === dayIdx ? { ...d, meals: d.meals.filter((_, j) => j !== mealIdx) } : d
                          ),
                        }))
                      }
                      disabled={day.meals.length === 1}
                      aria-label={t.removeItem}
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                    </Button>
                  </div>

                  {meal.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-border/30 bg-card/60 p-2">
                      <button
                        type="button"
                        className="min-w-32 flex-1 rounded-md border border-border/50 bg-secondary/20 px-2.5 py-1.5 text-start text-[11px] font-bold text-foreground hover:bg-primary/10"
                        onClick={() => setPickerTarget({ day: dayIdx, meal: mealIdx })}
                      >
                        {item.foodId ? (
                          <span dir="auto">{locale === "fa" ? item.faName : item.enName}</span>
                        ) : (
                          <span className="font-normal text-muted-foreground">{t.addItem}</span>
                        )}
                      </button>
                      <Input
                        type="number"
                        min={item.unit === "g" ? 1 : 0.25}
                        max={item.unit === "g" ? 2000 : 10}
                        step={item.unit === "g" ? 1 : 0.25}
                        dir="ltr"
                        value={item.amount}
                        onChange={(e) => patchItem(dayIdx, mealIdx, itemIdx, { amount: e.target.value })}
                        className="h-8 w-20 text-xs"
                        aria-label={t.amountLabel}
                      />
                      <Select
                        value={item.unit}
                        onValueChange={(v) => patchItem(dayIdx, mealIdx, itemIdx, { unit: v as "g" | "serving" })}
                      >
                        <SelectTrigger className="h-8 w-24 text-[10px]" aria-label={t.unitLabel}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g" className="text-[10px]">{t.unitGrams}</SelectItem>
                          <SelectItem value="serving" className="text-[10px]">{t.unitServing}</SelectItem>
                        </SelectContent>
                      </Select>
                      {item.maxGrams ? (
                        <span className="text-[9px] text-muted-foreground">{t.maxGramsNote(item.maxGrams)}</span>
                      ) : null}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-rose-300 hover:bg-rose-400/10"
                        onClick={() => patchMeal(dayIdx, mealIdx, { items: meal.items.filter((_, k) => k !== itemIdx) })}
                        disabled={meal.items.length === 1}
                        aria-label={t.removeItem}
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => patchMeal(dayIdx, mealIdx, { items: [...meal.items, emptyItem()] })}
                    disabled={meal.items.length >= 15}
                  >
                    <Plus className="me-1 size-3" aria-hidden="true" />
                    {t.addItem}
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    days: f.days.map((d, i) =>
                      i === dayIdx ? { ...d, meals: [...d.meals, emptyMeal()] } : d
                    ),
                  }))
                }
                disabled={day.meals.length >= 8}
              >
                <Plus className="me-1 size-3.5" aria-hidden="true" />
                {t.addMeal}
              </Button>
            </div>
          ))}

          <div className="flex gap-2">
            <Button className="flex-1" onClick={save} disabled={saving}>
              <Save className="me-1 size-3.5" aria-hidden="true" />
              {saving ? t.saving : t.saveDraft}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="me-1 size-3.5" aria-hidden="true" />
              {t.close}
            </Button>
          </div>
        </div>

        <FoodPickerDialog
          open={pickerTarget !== null}
          onOpenChange={(v) => !v && setPickerTarget(null)}
          onPick={(food) => {
            if (!pickerTarget) return;
            const { day: dayIdx, meal: mealIdx } = pickerTarget;
            setForm((f) => ({
              ...f,
              days: f.days.map((d, i) =>
                i === dayIdx
                  ? {
                      ...d,
                      meals: d.meals.map((m, j) =>
                        j === mealIdx
                          ? {
                              ...m,
                              items: m.items.map((it) =>
                                it.foodId
                                  ? it
                                  : {
                                      ...it,
                                      foodId: food.id,
                                      faName: food.fa,
                                      enName: food.en,
                                      group: food.group,
                                      maxGrams: food.maxGrams,
                                      servingGrams: food.servingGrams,
                                      unit: "g" as const,
                                      amount: "100",
                                    }
                              ),
                            }
                          : m
                      ),
                    }
                  : d
              ),
            }));
            setForm((f) => ({
              ...f,
              days: f.days.map((d, i) =>
                i === dayIdx
                  ? {
                      ...d,
                      meals: d.meals.map((m, j) =>
                        j === mealIdx && m.items.every((it) => it.foodId) && m.items.length < 15
                          ? { ...m, items: [...m.items, emptyItem()] }
                          : m
                      ),
                    }
                  : d
              ),
            }));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ تب اصلی ------------------------------ */

export function CoachNutritionPlansTab() {
  const t = useStrings(coachPlansStrings);
  const locale = useLocale();
  const { toast } = useToast();
  const { plans, loading, error, refresh } = useCoachNutritionPlans(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CoachPlanDetailClient | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // فیلتر فهرست بر اساس نام دانشجو و نوع خدمات — مرحله ۲۰
  const [planSearch, setPlanSearch] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState<PlanTypeFilter>("all");
  const filteredPlans = applyPlanFilters(plans ?? [], planSearch, planTypeFilter, (p) =>
    p.assignedStudent?.displayName ?? ""
  );

  const openPreview = async (plan: CoachPlanListItemClient) => {
    setPreviewLoading(true);
    const result = await getCoachNutritionPlan(plan.id);
    setPreviewLoading(false);
    if (result.ok) {
      setPreview(result.data.plan);
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <ViewIntro
        item={{
          id: "coachPanel" as const,
          fa: "برنامه‌های غذایی من",
          en: "My Nutrition Plans",
          description: t.nutritionListIntro,
          descriptionEn: t.nutritionListIntro,
          stage: 16,
          features: [],
          icon: UtensilsCrossed,
        }}
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          onClick={() => {
            setEditId(null);
            setBuilderOpen(true);
          }}
        >
          <Plus className="me-1 size-4" aria-hidden="true" />
          {t.newNutritionPlan}
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={refresh} aria-label={t.refresh}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
          ))}
          <span className="sr-only">{t.loading}</span>
        </div>
      ) : error ? (
        <EmptyState
          icon={RefreshCw}
          title={t.loadError}
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={refresh}>
              {t.retry}
            </Button>
          }
        />
      ) : !plans || plans.length === 0 ? (
        <EmptyState icon={UtensilsCrossed} title={t.emptyPlansTitle} description={t.emptyNutritionPlansNote} />
      ) : (
        <div>
          <PlanListFilters
            search={planSearch}
            onSearch={setPlanSearch}
            typeFilter={planTypeFilter}
            onTypeFilter={setPlanTypeFilter}
            byStudent
          />
          {filteredPlans.length === 0 ? (
            <EmptyState
              icon={UtensilsCrossed}
              title={t.emptyPlansTitle}
              description={locale === "fa" ? "نتیجه‌ای با این فیلترها نیست." : "No results with these filters."}
              compact
            />
          ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="border-border/60 bg-card/70">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{plan.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {t.updatedAtLabel}: {localeDateTimeLabel(plan.updatedAt, locale)}
                    </p>
                  </div>
                  <PlanStatusBadge status={plan.status} />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span>
                    {t.goalLabel}: <span className="font-bold text-foreground">{t.nutritionGoalLabel(plan.goal)}</span>
                  </span>
                  <span>
                    {t.daysLabel}: <span className="font-bold text-foreground">{plan.meta.daysCount}</span>
                  </span>
                  <span>
                    {t.mealsCountLabel}: <span className="font-bold text-foreground">{plan.meta.mealsCount ?? 0}</span>
                  </span>
                  <span>
                    {t.itemsCountLabel}: <span className="font-bold text-foreground">{plan.meta.itemsCount ?? 0}</span>
                  </span>
                  <span>
                    {t.versionLabel}:{" "}
                    <span className="font-bold text-foreground">
                      {plan.currentVersion > 0 ? plan.currentVersion : t.neverSent}
                    </span>
                  </span>
                </div>

                <div className="text-[10px] text-muted-foreground">
                  {t.studentLabel}:{" "}
                  <span className="font-bold text-foreground">
                    {plan.assignedStudent ? plan.assignedStudent.displayName : t.unassignedBadge}
                  </span>
                  {plan.lastSentAt && (
                    <span className="ms-3">
                      {t.lastSentLabel}: {localeDateTimeLabel(plan.lastSentAt, locale)}
                    </span>
                  )}
                </div>

                <PlanCardActions
                  kind="nutrition"
                  plan={plan}
                  onEdit={() => {
                    setEditId(plan.id);
                    setBuilderOpen(true);
                  }}
                  onPreview={() => void openPreview(plan)}
                  onDone={refresh}
                />
              </CardContent>
            </Card>
          ))}
        </div>
          )}
        </div>
      )}

      <NutritionBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        planId={editId}
        onSaved={refresh}
      />

      <Dialog open={preview !== null || previewLoading} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{preview?.title ?? t.previewTitle}</DialogTitle>
            <DialogDescription className="text-[11px]">{t.previewIntro}</DialogDescription>
          </DialogHeader>
          {/* خروجی PDF از مسیر چاپ مرورگر — RTL و فونت فارسی درست رندر میشود */}
          {preview && (
            <div className="flex justify-end print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                {t.actionPdf}
              </Button>
            </div>
          )}
          <div className="print-area">
          {preview && preview.kind === "nutrition" && (
            <CoachNutritionContentView content={preview.content as CoachNutritionContentClient} />
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
