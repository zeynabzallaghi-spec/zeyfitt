"use client";

/**
 * HUD روی صحنه سه‌بعدی — نام حرکت، مرحله فعلی، پیشرفت چرخه و شمارنده تکرار.
 * کل لایه pointer-events-none است تا با کنترل‌های دوربین تداخل نکند.
 * پیشرفت چرخه با rAF مستقیم روی DOM به‌روزرسانی می‌شود (بدون رندر مجدد React).
 */

import { useEffect, useRef } from "react";
import { Activity, Layers, Repeat2 } from "lucide-react";
import { DifficultyBadge } from "../../shared/badges";
import { getExercise } from "@/lib/fitness3d/exercises";
import { coachRuntime } from "@/lib/fitness3d/runtime";
import { useCoach3DStore } from "@/store/coach3d-store";

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

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4">
      {/* ردیف بالا — نام حرکت و نشان فناوری */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 backdrop-blur">
            <span className="text-[13px] font-extrabold text-foreground">{exercise.fa}</span>
            <span dir="ltr" className="text-[10px] font-medium text-muted-foreground/80">
              {exercise.en}
            </span>
            <DifficultyBadge level={exercise.difficulty} />
          </div>
        </div>
        <span className="rounded-xl border border-border/50 bg-background/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
          مدل پروسیجرال Three.js
        </span>
      </div>

      {/* ردیف پایین — مرحله، پیشرفت چرخه و تکرار */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 backdrop-blur">
          <Activity className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-[11px] font-bold text-foreground">{phase.name}</span>
          <span className="text-[10px] font-medium text-muted-foreground">
            ({(phaseIndex + 1).toLocaleString("fa-IR")} از {phaseCount.toLocaleString("fa-IR")})
          </span>
          <CycleProgressBar />
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] backdrop-blur">
            <Repeat2 className="size-3.5 text-primary" aria-hidden="true" />
            <span className="font-bold text-foreground">{reps.toLocaleString("fa-IR")}</span>
            <span className="font-medium text-muted-foreground">تکرار کامل</span>
          </span>
          <span className="hidden items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur sm:flex">
            <Layers className="size-3.5 text-primary" aria-hidden="true" />
            سرعت {speed.toLocaleString("fa-IR")}×
          </span>
        </div>
      </div>
    </div>
  );
}
