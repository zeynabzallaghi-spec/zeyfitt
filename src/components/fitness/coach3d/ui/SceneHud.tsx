"use client";

/**
 * HUD روی صحنه سه‌بعدی — نام حرکت، مرحله فعلی، پیشرفت چرخه و شمارنده تکرار.
 * کل لایه pointer-events-none است تا با کنترل‌های دوربین تداخل نکند.
 * پیشرفت چرخه با rAF مستقیم روی DOM به‌روزرسانی می‌شود (بدون رندر مجدد React).
 *
 * همه متن‌های قابل مشاهده از دیکشنری متمرکز src/lib/i18n/sections/coach3d.ts
 * می‌آیند؛ نام حرکت به زبان رابط و سطر دوم به زبان مقابل نمایش داده می‌شود و
 * نام مراحل چرخه (داده فارسی) با نقشه نمایشی دیکشنری ترجمه می‌شود.
 */

import { useEffect, useRef } from "react";
import { Activity, Layers, Repeat2 } from "lucide-react";
import { DifficultyBadge } from "../../shared/badges";
import { getExercise } from "@/lib/fitness3d/exercises";
import { coachRuntime } from "@/lib/fitness3d/runtime";
import { useCoach3DStore } from "@/store/coach3d-store";
import { useLocale } from "@/lib/i18n/locale";
import { localeNumber } from "@/lib/i18n/format";
import { useStrings } from "@/lib/i18n/use-strings";
import { coach3DStrings } from "@/lib/i18n/sections/coach3d";

/** نوار پیشرفت چرخه — به‌روزرسانی مستقیم DOM برای نرمی کامل */
function CycleProgressBar() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (barRef.current) {
        barRef.current.style.width = `${(coachRuntime.cycleT * 100).toFixed(2)}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      className="h-1 w-24 overflow-hidden rounded-full bg-secondary/80 sm:w-32"
      role="presentation"
      aria-hidden="true"
    >
      <div ref={barRef} className="h-full w-0 rounded-full bg-primary" />
    </div>
  );
}

export function SceneHud() {
  const exerciseId = useCoach3DStore((s) => s.exerciseId);
  const reps = useCoach3DStore((s) => s.reps);
  const phaseIndex = useCoach3DStore((s) => s.phaseIndex);
  const speed = useCoach3DStore((s) => s.speed);
  const exercise = getExercise(exerciseId);
  const phaseCount = exercise.cycle.length;
  const phase = exercise.cycle[Math.min(phaseIndex, phaseCount - 1)];
  const t = useStrings(coach3DStrings);
  const locale = useLocale();

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* ردیف بالا — نام حرکت و نشان فناوری */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 backdrop-blur">
            <span className="text-[13px] font-extrabold text-foreground">{t.exerciseName(exercise.fa, exercise.en)}</span>
            <span
              dir={locale === "fa" ? "ltr" : "rtl"}
              className="text-start text-[10px] font-medium text-muted-foreground/80"
            >
              {t.exerciseAltName(exercise.fa, exercise.en)}
            </span>
            <DifficultyBadge level={exercise.difficulty} />
          </div>
        </div>
        <span className="rounded-xl border border-border/50 bg-background/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
          {t.hudTechBadge}
        </span>
      </div>

      {/* ردیف پایین — مرحله، پیشرفت چرخه و تکرار */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 backdrop-blur">
          <Activity className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-[11px] font-bold text-foreground">{t.phaseLabel(phase.name)}</span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {t.phaseOf(phaseIndex + 1, phaseCount)}
          </span>
          <CycleProgressBar />
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] backdrop-blur">
            <Repeat2 className="size-3.5 text-primary" aria-hidden="true" />
            <span className="font-bold text-foreground">{localeNumber(reps, locale)}</span>
            <span className="font-medium text-muted-foreground">{t.repsUnit}</span>
          </span>
          <span className="hidden items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur sm:flex">
            <Layers className="size-3.5 text-primary" aria-hidden="true" />
            {t.hudSpeedBadge(speed)}
          </span>
        </div>
      </div>
    </div>
  );
}
