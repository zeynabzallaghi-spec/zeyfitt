"use client";

/**
 * فهرست انتخاب حرکت — شش حرکت قابل اجرا در مربی سه‌بعدی.
 *
 * همه متن‌های قابل مشاهده از دیکشنری متمرکز src/lib/i18n/sections/coach3d.ts
 * می‌آیند؛ نام حرکت به زبان رابط و سطر دوم به زبان مقابل نمایش داده می‌شود
 * (داده لایه سه‌بعدی دست‌نخورده می‌ماند).
 */

import { Dumbbell } from "lucide-react";
import { DifficultyBadge } from "../../shared/badges";
import { EXERCISES } from "@/lib/fitness3d/exercises";
import { useCoach3DStore } from "@/store/coach3d-store";
import { useLocale } from "@/lib/i18n/locale";
import { localeNumber } from "@/lib/i18n/format";
import { useStrings } from "@/lib/i18n/use-strings";
import { coach3DStrings } from "@/lib/i18n/sections/coach3d";
import { cn } from "@/lib/utils";

export function ExerciseList() {
  const exerciseId = useCoach3DStore((s) => s.exerciseId);
  const setExercise = useCoach3DStore((s) => s.setExercise);
  const t = useStrings(coach3DStrings);
  const locale = useLocale();

  return (
    <section aria-label={t.exerciseListAria} className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{t.exerciseListTitle}</h3>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {t.exerciseCountBadge(EXERCISES.length)}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {EXERCISES.map((ex, i) => {
          const active = ex.id === exerciseId;
          return (
            <button
              key={ex.id}
              type="button"
              onClick={() => setExercise(ex.id)}
              aria-pressed={active}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl border p-2.5 text-start transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.99]",
                active
                  ? "border-primary/45 bg-primary/10 glow-lime-sm"
                  : "border-border/50 bg-secondary/30 hover:border-border hover:bg-secondary/50"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold transition-colors",
                  active
                    ? "border-primary/40 bg-primary/15 text-primary"
                    : "border-border/50 bg-background/50 text-muted-foreground group-hover:text-foreground"
                )}
                aria-hidden="true"
              >
                {localeNumber(i + 1, locale)}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[13px] font-bold", active ? "text-primary" : "text-foreground")}>
                  {t.exerciseName(ex.fa, ex.en)}
                </span>
                <span
                  dir={locale === "fa" ? "ltr" : "rtl"}
                  className="block truncate text-start text-[10px] font-medium text-muted-foreground/70"
                >
                  {t.exerciseAltName(ex.fa, ex.en)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <DifficultyBadge level={ex.difficulty} />
                <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground/70">
                  {ex.props3d === "dumbbells" && <Dumbbell className="size-3" aria-hidden="true" />}
                  {t.muscleLabel(ex.primaryMuscles[0])}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
