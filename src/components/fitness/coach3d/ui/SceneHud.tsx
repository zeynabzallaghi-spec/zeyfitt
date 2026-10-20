"use client";

/**
 * HUD روی صحنه سه‌بعدی — نام حرکت، مرحله فعلی، پیشرفت چرخه و شمارنده.
 * کل لایه pointer-events-none است تا با کنترل‌های دوربین تداخل نکند.
 * پیشرفت چرخه و زمان نگه‌داشتن با rAF مستقیم روی DOM به‌روزرسانی می‌شوند
 * (بدون رندر مجدد React).
 *
 * مرحله ۱۹: مراحل چرخه الگوها دوزبانه‌اند (name/nameEn) و حرکات
 * ایزومتریک/کششی (counterMode="hold") به‌جای شمارنده تکرار، زمان
 * نگه‌داشتن را نمایش می‌دهند.
 */

import { useEffect, useRef } from "react";
import { Activity, Layers, Repeat2, Timer } from "lucide-react";
import { DifficultyBadge } from "../../shared/badges";
import { coachRuntime } from "@/lib/fitness3d/runtime";
import { useCoach3DStore } from "@/store/coach3d-store";
import { useLocale } from "@/lib/i18n/locale";
import { localeNumber, localeDecimal } from "@/lib/i18n/format";
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

/** زمان‌سنج نگه‌داشتن — فقط برای counterMode="hold"؛ به‌روزرسانی مستقیم DOM */
function HoldTimer() {
  const timeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (timeRef.current) {
        const sec = Math.floor(coachRuntime.holdSeconds);
        const mm = Math.floor(sec / 60);
        const ss = (sec % 60).toString().padStart(2, "0");
        timeRef.current.textContent = `${mm}:${ss}`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <span className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] backdrop-blur">
      <Timer className="size-3.5 text-primary" aria-hidden="true" />
      <span ref={timeRef} className="font-bold text-foreground" dir="ltr">
        0:00
      </span>
      <span className="font-medium text-muted-foreground">
        <HoldUnit />
      </span>
    </span>
  );
}

function HoldUnit() {
  const t = useStrings(coach3DStrings);
  return <>{t.holdUnit}</>;
}

export function SceneHud() {
  const scene = useCoach3DStore((s) => s.scene);
  const reps = useCoach3DStore((s) => s.reps);
  const phaseIndex = useCoach3DStore((s) => s.phaseIndex);
  const speed = useCoach3DStore((s) => s.speed);
  const exercise = scene.def;
  const phaseCount = exercise.cycle.length;
  const phase = exercise.cycle[Math.min(phaseIndex, phaseCount - 1)];
  const t = useStrings(coach3DStrings);
  const locale = useLocale();
  const isHold = scene.counterMode === "hold";

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
          {scene.honestyNote && (
            <div className="max-w-[320px] rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] leading-5 text-amber-200/90 backdrop-blur">
              {locale === "fa" ? scene.honestyNote : scene.honestyNoteEn ?? scene.honestyNote}
            </div>
          )}
        </div>
        <span className="rounded-xl border border-border/50 bg-background/70 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur">
          {t.hudTechBadge}
        </span>
      </div>

      {/* ردیف پایین — مرحله، پیشرفت چرخه و تکرار/نگه‌داشتن */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 backdrop-blur">
          <Activity className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-[11px] font-bold text-foreground">
            {locale === "fa" ? phase.name : phase.nameEn ?? t.phaseLabel(phase.name)}
          </span>
          <span className="text-[10px] font-medium text-muted-foreground">
            {t.phaseOf(phaseIndex + 1, phaseCount)}
          </span>
          <CycleProgressBar />
        </div>

        <div className="flex items-center gap-2">
          {isHold ? (
            <HoldTimer />
          ) : (
            <span className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] backdrop-blur">
              <Repeat2 className="size-3.5 text-primary" aria-hidden="true" />
              <span className="font-bold text-foreground">{localeNumber(reps, locale)}</span>
              <span className="font-medium text-muted-foreground">{t.repsUnit}</span>
            </span>
          )}
          <span className="hidden items-center gap-1.5 rounded-xl border border-border/50 bg-background/70 px-3 py-1.5 text-[11px] font-medium text-muted-foreground backdrop-blur sm:flex">
            <Layers className="size-3.5 text-primary" aria-hidden="true" />
            {t.hudSpeedBadge(speed)}
          </span>
        </div>
      </div>
    </div>
  );
}
