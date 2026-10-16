"use client";

/**
 * پنل عضلات — نمایش عضلات اصلی/کمکی حرکت فعلی + انتخاب دستی هر یک از
 * ۱۲ گروه عضلانی برای برجسته‌سازی روی مدل.
 *
 * رنگ‌ها روی مدل:
 * - سبز نئونی روشن: عضله اصلی حرکت
 * - سبز ملایم: عضله کمکی
 * - فیروزه‌ای: انتخاب دستی کاربر از فهرست گروه‌ها
 *
 * همه متن‌های قابل مشاهده از دیکشنری متمرکز src/lib/i18n/sections/coach3d.ts
 * می‌آیند؛ برچسب عضلات با نقشه نمایشی دیکشنری به زبان رابط ترجمه می‌شود
 * (داده لایه سه‌بعدی دست‌نخورده می‌ماند).
 */

import { Info } from "lucide-react";
import { MUSCLE_GROUPS } from "@/lib/fitness3d/muscles";
import { getExercise } from "@/lib/fitness3d/exercises";
import { useCoach3DStore } from "@/store/coach3d-store";
import type { MuscleGroupId } from "@/lib/fitness3d/types";
import { useStrings } from "@/lib/i18n/use-strings";
import { coach3DStrings } from "@/lib/i18n/sections/coach3d";
import { cn } from "@/lib/utils";

export function MusclePanel() {
  const exerciseId = useCoach3DStore((s) => s.exerciseId);
  const focusedMuscle = useCoach3DStore((s) => s.focusedMuscle);
  const toggleFocus = useCoach3DStore((s) => s.toggleFocus);
  const exercise = getExercise(exerciseId);
  const t = useStrings(coach3DStrings);

  return (
    <section aria-label={t.musclePanelAria} className="rounded-2xl border border-border/60 bg-card p-4">
      <h3 className="text-sm font-bold">{t.musclePanelTitle}</h3>

      {/* عضلات حرکت فعلی */}
      <div className="mt-3 flex flex-col gap-2">
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">{t.primaryGroupLabel}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {exercise.primaryMuscles.map((m) => (
              <MuscleChip key={m} muscle={m} tone="primary" focused={focusedMuscle === m} onToggle={toggleFocus} />
            ))}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-bold text-muted-foreground">{t.secondaryGroupLabel}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {exercise.secondaryMuscles.map((m) => (
              <MuscleChip key={m} muscle={m} tone="secondary" focused={focusedMuscle === m} onToggle={toggleFocus} />
            ))}
          </div>
        </div>
      </div>

      {/* فهرست کامل گروه‌ها برای برجسته‌سازی دستی */}
      <div className="mt-4 border-t border-border/50 pt-3.5">
        <p className="text-[11px] font-bold text-foreground/85">
          {t.manualHighlightTitle}
        </p>
        <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
          {t.manualHighlightHint}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {MUSCLE_GROUPS.map((g) => (
            <MuscleChip
              key={g.id}
              muscle={g.id}
              tone="picker"
              focused={focusedMuscle === g.id}
              onToggle={toggleFocus}
            />
          ))}
        </div>
      </div>

      {/* راهنمای رنگ‌ها */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/50 pt-3 text-[10px] font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#a3e635] shadow-[0_0_8px_1px_oklch(0.89_0.22_128/0.6)]" aria-hidden="true" />
          {t.primaryGroupLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#4d7c0f]/80" aria-hidden="true" />
          {t.secondaryGroupLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[#22d3ee]" aria-hidden="true" />
          {t.manualPickLabel}
        </span>
      </div>

      <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-border/50 bg-secondary/30 p-2.5 text-[10px] leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden="true" />
        {t.muscleDisclaimer}
      </p>
    </section>
  );
}

function MuscleChip({
  muscle,
  tone,
  focused,
  onToggle,
}: {
  muscle: MuscleGroupId;
  tone: "primary" | "secondary" | "picker";
  focused: boolean;
  onToggle: (m: MuscleGroupId) => void;
}) {
  const t = useStrings(coach3DStrings);

  return (
    <button
      type="button"
      onClick={() => onToggle(muscle)}
      aria-pressed={focused}
      className={cn(
        "rounded-md border px-2 py-0.5 text-[10px] font-bold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-95",
        tone === "primary" &&
          (focused
            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
            : "border-primary/40 bg-primary/15 text-primary hover:bg-primary/25"),
        tone === "secondary" &&
          (focused
            ? "border-cyan-400/50 bg-cyan-400/15 text-cyan-300"
            : "border-[#4d7c0f]/40 bg-[#4d7c0f]/15 text-[#a3cf6b] hover:bg-[#4d7c0f]/25"),
        tone === "picker" &&
          (focused
            ? "border-cyan-400/60 bg-cyan-400/15 text-cyan-300 glow-lime-sm"
            : "border-border/50 bg-secondary/40 text-muted-foreground hover:border-cyan-400/40 hover:text-foreground")
      )}
    >
      {t.muscleLabel(muscle)}
    </button>
  );
}
