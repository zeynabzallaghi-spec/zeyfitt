"use client";

/**
 * فهرست انتخاب حرکت — شش حرکت قابل اجرا در مربی سه‌بعدی.
 */

import { Dumbbell } from "lucide-react";
import { DifficultyBadge } from "../../shared/badges";
import { EXERCISES } from "@/lib/fitness3d/exercises";
import { useCoach3DStore } from "@/store/coach3d-store";
import { muscleFa } from "@/lib/fitness3d/muscles";
import { cn } from "@/lib/utils";

export function ExerciseList() {
  const exerciseId = useCoach3DStore((s) => s.exerciseId);
  const setExercise = useCoach3DStore((s) => s.setExercise);

  return (
    <section aria-label="انتخاب حرکت" className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">انتخاب حرکت</h3>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {EXERCISES.length.toLocaleString("fa-IR")} حرکت قابل اجرا
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
                {(i + 1).toLocaleString("fa-IR")}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[13px] font-bold", active ? "text-primary" : "text-foreground")}>
                  {ex.fa}
                </span>
                <span dir="ltr" className="block truncate text-[10px] font-medium text-muted-foreground/70">
                  {ex.en}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <DifficultyBadge level={ex.difficulty} />
                <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground/70">
                  {ex.props3d === "dumbbells" && <Dumbbell className="size-3" aria-hidden="true" />}
                  {muscleFa(ex.primaryMuscles[0])}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
