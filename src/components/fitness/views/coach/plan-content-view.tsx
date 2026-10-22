"use client";

/**
 * رندرکننده مشترک محتوای برنامه‌های اختصاصی — مرحله ۱۶.
 * همان خروجی هم در پیش‌نمایش مربی و هم در نمای دانشجو استفاده می‌شود تا
 * «پیش‌نمایش» دقیقاً همان چیزی باشد که دانشجو می‌بیند. این کامپوننت فقط
 * نمایش است و هیچ تصمیم مجوزی ندارد؛ مقادیر تغذیه‌ای همیشه برچسب تخمینی
 * می‌گیرند.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dumbbell, Timer, Info, UtensilsCrossed, Play } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { coachDeliveriesStrings } from "@/lib/i18n/sections/coach-deliveries";
import { useLocale } from "@/lib/i18n/locale";
import { localeDecimal, localeNumber } from "@/lib/i18n/format";
import { mealTitleLabel } from "@/lib/i18n/engine-content";
import type {
  CoachNutritionContentClient,
  CoachWorkoutContentClient,
} from "@/lib/coaching/plans-client";
import { ExerciseVideoPlayerDialog } from "../../shared/exercise-video-player";

/* ------------------------------ محتوای تمرینی ------------------------------ */

export function CoachWorkoutContentView({
  content,
  onStartDay,
  startBusyDay,
}: {
  content: CoachWorkoutContentClient;
  /** اگر داده شود، برای هر روز دکمه شروع تمرین نمایش داده می‌شود (نمای دانشجو) */
  onStartDay?: (dayOrder: number) => void;
  startBusyDay?: number | null;
}) {
  const t = useStrings(coachDeliveriesStrings);
  const locale = useLocale();
  // P2 (R2.2): پخش ویدئوی حرکت شخصی از جزئیات برنامه — فهرست رسانه هنگام
  // بازشدن از همان API مجاز سرور بار میشود (مجوز دانشجو سمت سرور اعمال است)
  const [videoTargetId, setVideoTargetId] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Dumbbell className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-xs font-bold text-foreground">{t.workoutDaysTitle}</h3>
      </div>
      {content.days.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.loadError}</p>
      ) : (
        content.days
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((day) => (
            <div key={day.order} className="rounded-xl border border-border/60 bg-secondary/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold text-foreground">{day.title}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Timer className="size-3" aria-hidden="true" />
                  <span>
                    {t.estMinutesLabel}: {localeNumber(day.estMinutes, locale)}
                  </span>
                </div>
              </div>

              <ul className="mt-2 space-y-1.5">
                {day.exercises
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((ex) => (
                    <li
                      key={`${day.order}-${ex.order}`}
                      className="rounded-lg border border-border/40 bg-card/60 p-2.5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                        <p className="text-xs font-bold text-foreground" dir="auto">
                          {locale === "fa" ? ex.faName : ex.enName}
                          {(ex as { source?: string }).source === "personal" && (
                            <span className="ms-1.5 inline-flex rounded border border-primary/30 bg-primary/10 px-1 align-middle text-[8px] font-bold text-primary">
                              {locale === "fa" ? "شخصی" : "Personal"}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] font-medium text-muted-foreground" dir="ltr">
                          {t.setsRepsLabel(ex.sets, ex.repsMin, ex.repsMax)}
                          {" · "}
                          {t.restLabel(ex.restSeconds)}
                        </p>
                      </div>
                      {typeof ex.suggestedWeightKg === "number" && ex.suggestedWeightKg > 0 && (
                        <p className="mt-1 text-[10px] text-primary/90">
                          {t.suggestedWeightLabel(ex.suggestedWeightKg)}
                        </p>
                      )}
                      {ex.note && (
                        <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
                          <span className="font-bold">{t.noteLabel}: </span>
                          {ex.note}
                        </p>
                      )}
                      {(ex as { hasVideo?: boolean }).hasVideo === true && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1.5 h-7 px-2 text-[10px] font-bold text-primary hover:border-primary/40"
                          onClick={() => setVideoTargetId(ex.exerciseId)}
                          aria-label={locale === "fa" ? "پخش ویدئوی حرکت" : "Play exercise video"}
                        >
                          <Play className="me-1 size-3" aria-hidden="true" />
                          {locale === "fa" ? "مشاهده ویدئو" : "Watch video"}
                        </Button>
                      )}
                    </li>
                  ))}
              </ul>

              {onStartDay && (
                <Button
                  size="sm"
                  className="mt-3"
                  disabled={startBusyDay === day.order}
                  onClick={() => onStartDay(day.order)}
                  aria-label={t.startWorkoutDay(day.order)}
                >
                  {startBusyDay === day.order ? t.startingSession : t.startWorkoutDay(day.order)}
                </Button>
              )}
            </div>
          ))
      )}

      <ExerciseVideoPlayerDialog
        open={videoTargetId !== null}
        onOpenChange={(v) => {
          if (!v) setVideoTargetId(null);
        }}
        title={
          content.days
            .flatMap((d) => d.exercises)
            .find((ex) => ex.exerciseId === videoTargetId)?.[locale === "fa" ? "faName" : "enName"] ?? ""
        }
        source={
          videoTargetId
            ? {
                type: "load",
                load: async () => {
                  const res = await fetch(
                    `/api/coach/exercises/${encodeURIComponent(videoTargetId)}/media`
                  );
                  if (!res.ok) return null;
                  const data = (await res.json()) as {
                    media?: { id: string; kind: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string }[];
                  };
                  return Array.isArray(data.media) ? data.media : [];
                },
              }
            : null
        }
      />
    </div>
  );
}

/* ------------------------------ محتوای غذایی ------------------------------ */

export function CoachNutritionContentView({
  content,
  onLogItem,
  logBusyId,
}: {
  content: CoachNutritionContentClient;
  /** اگر داده شود، برای هر قلم دکمه ثبت مصرف نمایش داده می‌شود (نمای دانشجو) */
  onLogItem?: (args: { foodId: string; unit: "g" | "serving"; amount: number; mealType: string; itemId: string }) => void;
  logBusyId?: string | null;
}) {
  const t = useStrings(coachDeliveriesStrings);
  const tp = useStrings(coachPlansStrings);
  const locale = useLocale();

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
        <p className="text-[11px] leading-5 text-amber-200/90">{t.nutritionEstimateNote}</p>
      </div>
      <div className="flex items-center gap-2">
        <UtensilsCrossed className="size-4 text-primary" aria-hidden="true" />
        <h3 className="text-xs font-bold text-foreground">{t.nutritionDaysTitle}</h3>
      </div>
      {content.days.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.loadError}</p>
      ) : (
        content.days
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((day) => (
            <div key={day.order} className="rounded-xl border border-border/60 bg-secondary/20 p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-bold text-foreground">{t.dayN(day.order)}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground" dir="ltr">
                  <span className="font-bold">
                    {t.kcalLabel}: {localeNumber(day.kcal, locale)}
                  </span>
                  <span>
                    P {localeDecimal(day.protein, 1, locale)} · C {localeDecimal(day.carb, 1, locale)} · F{" "}
                    {localeDecimal(day.fat, 1, locale)}
                  </span>
                </div>
              </div>

              <div className="mt-2 space-y-2">
                {day.meals
                  .slice()
                  .sort((a, b) => a.order - b.order)
                  .map((meal) => (
                    <div key={meal.order} className="rounded-lg border border-border/40 bg-card/60 p-2.5">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="text-[11px] font-bold text-foreground">
                          {mealTitleLabel(meal.type, "", locale)}
                        </p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">
                          {localeNumber(meal.kcal, locale)} {locale === "fa" ? "کیلوکالری" : "kcal"}
                        </p>
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {meal.items
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((item) => (
                            <li
                              key={item.order}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/30 bg-secondary/20 px-2 py-1.5"
                            >
                              <div className="min-w-0">
                                <p className="text-[11px] font-medium text-foreground" dir="auto">
                                  {locale === "fa" ? item.faName : item.enName}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {t.plannedAmountLabel}: {t.gramsLabel(item.grams)}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground" dir="ltr">
                                  {localeNumber(item.kcal, locale)}{" "}
                                  {locale === "fa" ? "کیلوکالری" : "kcal"}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="border-amber-400/30 bg-amber-400/10 px-1.5 py-0 text-[9px] font-bold text-amber-300"
                                >
                                  {t.estimateBadge}
                                </Badge>
                                {onLogItem && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-[10px]"
                                    disabled={logBusyId === `${meal.order}-${item.order}`}
                                    onClick={() =>
                                      onLogItem({
                                        foodId: item.foodId,
                                        unit: "g",
                                        amount: item.grams,
                                        mealType: meal.type,
                                        itemId: `${meal.order}-${item.order}`,
                                      })
                                    }
                                  >
                                    {logBusyId === `${meal.order}-${item.order}` ? t.loggingFood : t.logThisItem}
                                  </Button>
                                )}
                              </div>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          ))
      )}
      <p className="text-[10px] leading-5 text-muted-foreground/70">{tp.snapshotNote}</p>
    </div>
  );
}
