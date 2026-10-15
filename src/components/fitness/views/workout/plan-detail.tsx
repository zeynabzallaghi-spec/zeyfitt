"use client";

/**
 * نمایش برنامه تمرینی ذخیره‌شده — روزها، حرکات با ست/تکرار/استراحت،
 * دکمه مربی سه‌بعدی فقط برای حرکات واقعاً پشتیبانی‌شده و مشاهده جزئیات
 * هر حرکت در کتابخانه (deep-link به همان حرکت).
 *
 * نام‌ها و مشخصات تا حد ممکن از بانک زنده خوانده می‌شود؛ اگر حرکتی در
 * نسخه جدید بانک حذف شده باشد، snapshot حداقلی ذخیره‌شده در برنامه
 * نمایش داده می‌شود و وضعیت شفاف اعلام می‌گردد.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  BookOpenText,
  CalendarDays,
  ChevronDown,
  Clock3,
  Flame,
  Repeat2,
  Timer,
  TriangleAlert,
  CircleAlert,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAppStore } from "@/store/app-store";
import { useCoach3DStore } from "@/store/coach3d-store";
import { cn } from "@/lib/utils";
import {
  categoryFa,
  equipmentFa,
  getExerciseById,
  hasCoach3dAnimation,
} from "@/lib/exercises";
import { faDigits } from "@/lib/profile";
import type { PlannedDayClient, WorkoutPlanClient } from "@/lib/plan-storage";
import type { PlannedExercise } from "@/lib/plan-engine/types";

const WEEK_DAY_LABELS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/* ------------------------------ ردیف حرکت ------------------------------ */

function ExerciseRow({ ex }: { ex: PlannedExercise & { id?: string } }) {
  const openLibraryExercise = useAppStore((s) => s.openLibraryExercise);
  const setCoachExercise = useCoach3DStore((s) => s.setExercise);
  const setActiveView = useAppStore((s) => s.setActiveView);

  // جزئیات کامل از بانک زنده؛ snapshot فقط هنگام حذف حرکت از بانک آینده
  const live = getExerciseById(ex.exerciseId);
  const has3d = live ? hasCoach3dAnimation(live) : Boolean(ex.coach3dId);

  const openIn3d = () => {
    const id = live?.coach3dId ?? ex.coach3dId;
    if (!id) return;
    setCoachExercise(id);
    setActiveView("coach3d");
  };

  return (
    <li className="rounded-xl border border-border/50 bg-secondary/20 p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-foreground">{ex.faName}</p>
            <span dir="ltr" className="text-[10px] text-muted-foreground/60">
              {ex.enName}
            </span>
            <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {categoryFa(ex.category)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-5 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Repeat2 className="size-3" aria-hidden="true" />
              {faDigits(ex.sets)} ست × {faDigits(ex.repsMin)}–{faDigits(ex.repsMax)} تکرار
            </span>
            <span className="inline-flex items-center gap-1">
              <Timer className="size-3" aria-hidden="true" />
              استراحت {faDigits(ex.restSeconds)} ثانیه
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3" aria-hidden="true" />
              ~{faDigits(ex.estimatedMinutes)} دقیقه
            </span>
          </div>
          {ex.note && (
            <p className="mt-2 border-t border-border/40 pt-2 text-[10px] leading-5 text-muted-foreground/80">
              {ex.note}
            </p>
          )}
          {live && live.mistakes.length > 0 && (
            <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-5 text-rose-300/90">
              <CircleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
              خطای رایج: {live.mistakes[0]}
            </p>
          )}
          {!live && (
            <p className="mt-1.5 text-[10px] leading-5 text-amber-300/90">
              این حرکت در نسخه فعلی بانک حرکات یافت نشد؛ اطلاعات از snapshot برنامه نمایش داده
              می‌شود.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-row items-center gap-1.5">
          {has3d && (
            <Button
              size="sm"
              variant="outline"
              onClick={openIn3d}
              className="h-7 border-primary/40 bg-primary/10 px-2.5 text-[10px] font-bold text-primary hover:bg-primary/20"
            >
              <Box className="size-3" aria-hidden="true" />
              مربی سه‌بعدی
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => openLibraryExercise(ex.exerciseId)}
            className="h-7 border-border/70 px-2.5 text-[10px] font-semibold hover:border-primary/40 hover:text-primary"
          >
            <BookOpenText className="size-3" aria-hidden="true" />
            جزئیات در کتابخانه
          </Button>
        </div>
      </div>
    </li>
  );
}

/* ------------------------------ کارت روز ------------------------------ */

function DayCard({ day }: { day: PlannedDayClient }) {
  const [open, setOpen] = useState(day.order === 1);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
        <CollapsibleTrigger className="flex w-full items-center gap-3 p-4 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-xs font-extrabold text-primary">
            {faDigits(day.order)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-foreground">{day.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              <span>{day.focusLabel}</span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" aria-hidden="true" />~{faDigits(day.estMinutes)} دقیقه
              </span>
              <span>{faDigits(day.exercises.length)} حرکت</span>
              {day.weekday !== null && (
                <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 font-bold text-foreground/80">
                  {WEEK_DAY_LABELS[day.weekday] ?? "—"}
                </span>
              )}
            </p>
          </div>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="flex flex-col gap-2 px-4 pb-4">
            {day.exercises.map((ex) => (
              <ExerciseRow key={ex.id ?? ex.exerciseId} ex={ex} />
            ))}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/* ------------------------------ نمایش کامل برنامه ------------------------------ */

export function PlanDetail({
  plan,
  variant = "full",
}: {
  plan: WorkoutPlanClient;
  /** full: با همه راهنماها | compact: برای داشبورد */
  variant?: "full" | "compact";
}) {
  const equipmentLabels = plan.equipment.map((e) => equipmentFa(e));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4"
    >
      {/* هدر برنامه */}
      <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 font-bold text-primary">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {faDigits(plan.daysPerWeek)} روز در هفته
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 font-bold text-foreground/85">
            <Flame className="size-3.5 text-primary" aria-hidden="true" />
            ~{faDigits(plan.sessionMinutes)} دقیقه هر جلسه
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1 font-bold text-foreground/85">
            {equipmentLabels.join("، ")}
          </span>
        </div>
        {plan.limitationNotes && variant === "full" && (
          <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[10px] leading-5 text-amber-300/95">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            یادداشت احتیاطی شما: {plan.limitationNotes}
          </p>
        )}
      </div>

      {/* روزهای تمرین */}
      <div className="flex flex-col gap-3">
        {plan.days.map((day) => (
          <DayCard key={day.id} day={day} />
        ))}
      </div>

      {/* راهنمای عمومی — فقط در حالت کامل */}
      {variant === "full" && plan.notes.length > 0 && (
        <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
          <h4 className="text-xs font-bold">راهنمای اجرای برنامه</h4>
          <ul className="mt-3 flex flex-col gap-2">
            {plan.notes.map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] leading-6 text-muted-foreground">
                <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
