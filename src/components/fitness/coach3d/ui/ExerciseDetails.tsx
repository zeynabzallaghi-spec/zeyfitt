"use client";

/**
 * جزئیات حرکت انتخاب‌شده — وضعیت شروع، مراحل اجرا، اشتباهات رایج،
 * تجهیزات، مفاصل درگیر و نکته مربی.
 */

import { AlertTriangle, CheckCircle2, Lightbulb, ListChecks, Wrench, XCircle } from "lucide-react";
import { getExercise } from "@/lib/fitness3d/exercises";
import { muscleFa } from "@/lib/fitness3d/muscles";
import { useCoach3DStore } from "@/store/coach3d-store";

export function ExerciseDetails() {
  const exerciseId = useCoach3DStore((s) => s.exerciseId);
  const exercise = getExercise(exerciseId);

  return (
    <section aria-label={`جزئیات حرکت ${exercise.fa}`} className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <ListChecks className="size-4 text-primary" aria-hidden="true" />
          راهنمای اجرای {exercise.fa}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {exercise.equipment.map((eq) => (
            <span key={eq} className="flex items-center gap-1 rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              <Wrench className="size-3" aria-hidden="true" />
              {eq}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        {/* وضعیت شروع + مفاصل */}
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="text-xs font-bold text-foreground/85">وضعیت شروع</h4>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{exercise.startPosition}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground/85">مفاصل و بخش‌های درگیر</h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exercise.jointsInvolved.map((j) => (
                <span key={j} className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {j}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground/85">عضلات هدف</h4>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              <span className="font-bold text-primary">
                {exercise.primaryMuscles.map(muscleFa).join("، ")}
              </span>
              {" — "}
              {exercise.secondaryMuscles.map(muscleFa).join("، ")} (کمکی)
            </p>
          </div>
        </div>

        {/* مراحل اجرا */}
        <div>
          <h4 className="text-xs font-bold text-foreground/85">مراحل اجرا</h4>
          <ol className="mt-2 flex flex-col gap-2.5">
            {exercise.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-[10px] font-extrabold text-primary">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-[11px] leading-5 text-foreground/80">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {exercise.tip}
          </p>
        </div>

        {/* اشتباهات رایج */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground/85">
            <AlertTriangle className="size-3.5 text-amber-400" aria-hidden="true" />
            اشتباهات رایج
          </h4>
          <ul className="mt-2 flex flex-col gap-2">
            {exercise.mistakes.map((mistake, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                <XCircle className="mt-1 size-3.5 shrink-0 text-rose-400/80" aria-hidden="true" />
                {mistake}
              </li>
            ))}
          </ul>
          {exercise.honestyNote && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/5 p-2.5 text-[10px] leading-5 text-amber-200/80">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              {exercise.honestyNote}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
