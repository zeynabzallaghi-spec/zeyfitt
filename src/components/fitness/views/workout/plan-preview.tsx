"use client";

/**
 * پیش‌نمایش برنامه تولیدشده — قبل از ذخیره نهایی نمایش داده می‌شود:
 * خلاصه روزها، تجهیزات موردنیاز، تعداد حرکات و زمان تقریبی هر جلسه.
 * ذخیره فقط پس از تأیید کاربر انجام می‌شود و موفقیت فقط پس از پاسخ
 * موفق سرور اعلام می‌گردد.
 */

import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Save,
  TriangleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import type { GeneratedPlan } from "@/lib/plan-engine/types";
import { RealBadge } from "@/components/fitness/shared/badges";

export function PlanPreview({
  plan,
  saving,
  saveError,
  onSave,
  onBack,
}: {
  plan: GeneratedPlan;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onBack: () => void;
}) {
  const t = useStrings(workoutStrings);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      {/* خلاصه برنامه */}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/10 to-card p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 text-primary glow-lime-sm">
              <ClipboardList className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h4 className="text-sm font-extrabold">{plan.title}</h4>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {t.previewNotSaved}
              </p>
            </div>
          </div>
          <RealBadge />
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 font-bold text-foreground/85">
            {t.goalChip(plan.goal)}
          </span>
          <span className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 font-bold text-foreground/85">
            {t.levelChip(plan.experience)}
          </span>
          <span className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 font-bold text-foreground/85">
            {t.focusChip(plan.focus)}
          </span>
          <span className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 font-bold text-foreground/85">
            {t.sessionsExercisesLine(plan.days.length, plan.totalExercises)}
          </span>
          <span className="rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 font-bold text-foreground/85">
            {t.equipmentChip(plan.equipment)}
          </span>
        </div>
      </div>

      {/* جلسات */}
      <div className="grid gap-3 md:grid-cols-2">
        {plan.days.map((day) => (
          <div key={day.order} className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-foreground">{day.title}</p>
              <span className="shrink-0 rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                {day.weekday !== null ? t.weekDayLabels[day.weekday] : t.freeDay}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3" aria-hidden="true" />
                {t.exercisesCount(day.exercises.length)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" aria-hidden="true" />
                {t.approxMinutes(day.estMinutes)}
              </span>
              <span>{day.focusLabel}</span>
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 border-t border-border/40 pt-3">
              {day.exercises.map((ex) => (
                <li key={ex.exerciseId} className="flex items-center justify-between gap-2 text-[10px] leading-5">
                  <span className="min-w-0 truncate text-foreground/85">{ex.faName}</span>
                  <span dir="ltr" className="shrink-0 font-bold text-muted-foreground">
                    {t.setsRepsCompact(ex.sets, ex.repsMin, ex.repsMax)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* راهنمای موتور */}
      {plan.notes.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4">
          <h4 className="text-xs font-bold">{t.executionGuideTitle}</h4>
          <ul className="mt-2 flex flex-col gap-1.5">
            {plan.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-[10px] leading-5 text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {saveError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="flex items-start gap-1.5 text-xs font-bold leading-6 text-rose-300">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {saveError}
          </p>
        </div>
      )}

      {/* دکمه‌ها */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={onSave}
          disabled={saving}
          className="font-bold text-primary-foreground glow-lime-sm"
        >
          {saving ? t.saving : (
            <>
              <Save className="size-4" aria-hidden="true" />
              {t.saveAndActivate}
            </>
          )}
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={saving} className="font-semibold">
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
          {t.backToSettings}
        </Button>
      </div>

      <p className={cn("flex items-center gap-1.5 text-[10px] leading-5 text-muted-foreground/70")}>
        <CheckCircle2 className="size-3.5" aria-hidden="true" />
        {t.saveActivateNote}
      </p>
    </motion.div>
  );
}
