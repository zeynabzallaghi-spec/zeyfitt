"use client";

/**
 * پیش‌نمایش برنامه غذایی قبل از ذخیره — خلاصه هدف و تنظیمات، برآورد انرژی
 * با فرمول مستند، وعده‌ها و مواد، مجموع روزانه و اختلاف صادقانه با هدف.
 * ذخیره فقط پس از تأیید کاربر و موفقیت فقط پس از پاسخ سرور.
 */

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Loader2,
  Save,
  Wheat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { faDigits } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { DIET_PATTERN_LABELS, type GeneratedNutritionPlan } from "@/lib/nutrition-engine/types";
import { FOOD_COUNT } from "@/lib/foods";

interface Props {
  plan: GeneratedNutritionPlan;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onBack: () => void;
}

function MacroRow({ kcal, protein, carb, fat }: { kcal: number; protein: number; carb: number; fat: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] font-semibold text-muted-foreground">
      <span className="text-primary">{faDigits(kcal)} کیلوکالری</span>
      <span>پروتئین {faDigits(protein)} گرم</span>
      <span>کربوهیدرات {faDigits(carb)} گرم</span>
      <span>چربی {faDigits(fat)} گرم</span>
    </div>
  );
}

export function NutritionPlanPreview({ plan, saving, saveError, onSave, onBack }: Props) {
  const [openDays, setOpenDays] = useState<number[]>([1]);
  const { calc } = plan;
  const target = calc.targetKcal;

  const toggleDay = (order: number) => {
    setOpenDays((prev) => (prev.includes(order) ? prev.filter((d) => d !== order) : [...prev, order]));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* خلاصه برآورد */}
      <section aria-label="خلاصه برآورد" className="rounded-2xl border border-primary/25 bg-primary/5 p-5">
        <h3 className="text-sm font-bold">خلاصه برآورد انرژی (تخمینی)</h3>
        {calc.caution ? (
          <p className="mt-3 text-xs leading-6 text-amber-200">
            حالت احتیاط: برای شما هدف کالری کاهشی/افزایشی خودکار تنظیم نمی‌شود و برنامه بر پایه
            حفظ وزن ساخته شده است. {calc.warnings.find((w) => w.includes("متخصص")) ?? ""}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
              <p className="text-[10px] text-muted-foreground">BMR پایه</p>
              <p className="mt-1 text-sm font-extrabold">{faDigits(calc.bmr ?? "—")}</p>
              <p className="text-[9px] text-muted-foreground/70">کیلوکالری</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
              <p className="text-[10px] text-muted-foreground">TDEE روزانه</p>
              <p className="mt-1 text-sm font-extrabold">{faDigits(calc.tdee ?? "—")}</p>
              <p className="text-[9px] text-muted-foreground/70">
                ضریب فعالیت {faDigits(calc.activityFactor)}
              </p>
            </div>
            <div className="rounded-xl border border-primary/40 bg-primary/10 p-3 text-center">
              <p className="text-[10px] text-primary">هدف برنامه</p>
              <p className="mt-1 text-sm font-extrabold text-primary">{faDigits(target ?? "—")}</p>
              <p className="text-[9px] text-primary/70">کیلوکالری در روز</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-3 text-center">
              <p className="text-[10px] text-muted-foreground">پروتئین هدف</p>
              <p className="mt-1 text-sm font-extrabold">{faDigits(calc.macros?.proteinG ?? "—")}</p>
              <p className="text-[9px] text-muted-foreground/70">
                کربوهیدرات {faDigits(calc.macros?.carbG ?? "—")} / چربی {faDigits(calc.macros?.fatG ?? "—")}
              </p>
            </div>
          </div>
        )}
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
          فرمول: Mifflin–St Jeor برای سوخت‌وساز پایه × ضریب سطح فعالیت؛ همه اعداد تخمین‌اند،
          نه اندازه‌گیری دقیق نیاز بدن یا توصیه پزشکی.
          {calc.macroKcalDiff !== null && Math.abs(calc.macroKcalDiff) > 30
            ? ` جمع انرژی درشت‌مغذی‌ها با هدف حدود ${faDigits(Math.abs(calc.macroKcalDiff))} کیلوکالری اختلاف دارد (گرد کردن و محدوده‌های استاندارد).`
            : ""}
        </p>
        {calc.warnings.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5">
            {calc.warnings.map((warning, index) => (
              <li key={index} className="flex items-start gap-2 text-[10px] leading-5 text-amber-200/90">
                <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-300" aria-hidden="true" />
                {warning}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* خلاصه تنظیمات */}
      <p className="text-[11px] leading-6 text-muted-foreground">
        {plan.planLength === 7 ? "برنامه هفتگی" : "برنامه یک‌روزه"} — {faDigits(plan.mealsPerDay)} وعده در
        روز — هدف: {DIET_PATTERN_LABELS[plan.dietPattern] === "معمولی" ? "" : `الگوی ${DIET_PATTERN_LABELS[plan.dietPattern]} — `}
        موتور قانون‌محور از بانک {faDigits(FOOD_COUNT)} ماده واقعی انتخاب کرده است؛ هیچ ادعای هوش مصنوعی وجود ندارد.
      </p>

      {/* روزها */}
      <section aria-label="وعده‌های برنامه" className="flex flex-col gap-2.5">
        {plan.days.map((day) => {
          const isOpen = openDays.includes(day.order);
          return (
            <Collapsible
              key={day.order}
              open={isOpen}
              onOpenChange={() => toggleDay(day.order)}
              className="rounded-2xl border border-border/60 bg-card"
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-4 text-start">
                <div>
                  <p className="text-xs font-bold">
                    {plan.planLength === 7 ? `روز ${faDigits(day.order)}` : "برنامه روز"}
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
                    <div key={meal.order} className="rounded-xl border border-border/40 bg-secondary/20 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-primary">{meal.title}</p>
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {faDigits(meal.kcal)} کیلوکالری
                        </span>
                      </div>
                      <ul className="mt-2.5 flex flex-col gap-1.5">
                        {meal.items.map((item) => (
                          <li key={item.foodId} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[11px] leading-5">
                            <span className="font-semibold text-foreground/90">{item.faName}</span>
                            <span className="text-muted-foreground">
                              {faDigits(item.grams)} گرم — {faDigits(item.kcal)} کیلوکالری
                            </span>
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

      {/* یادداشت‌های صادقانه */}
      <section aria-label="یادداشت‌ها" className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Wheat className="size-4 text-primary" aria-hidden="true" />
          یادداشت‌های مهم
        </h3>
        <ul className="mt-3 flex flex-col gap-2">
          {plan.notes.map((note, index) => (
            <li key={index} className="flex items-start gap-2.5 text-[11px] leading-6 text-muted-foreground">
              <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
              {note}
            </li>
          ))}
        </ul>
      </section>

      {saveError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-[11px] font-semibold leading-5 text-rose-200">{saveError}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2.5">
        <Button onClick={onSave} disabled={saving} className="font-bold text-primary-foreground glow-lime-sm">
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          تأیید و ذخیره برنامه
        </Button>
        <Button
          variant="outline"
          onClick={onBack}
          disabled={saving}
          className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
        >
          بازگشت به تنظیمات
        </Button>
      </div>
    </div>
  );
}
