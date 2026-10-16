"use client";

/**
 * کارت «برنامه امروز» داشبورد — خلاصه واقعی برنامه فعال:
 *  - اگر امروز جلسه تمرین باشد: عنوان جلسه، تعداد حرکت، زمان تقریبی،
 *    حرکات نخست + دکمه «شروع تمرین» (اقدام صریح کاربر = جلسه واقعی)
 *  - اگر امروز جلسه نباشد: پیام صادقانه + نزدیک‌ترین جلسه بعدی (فقط وقتی
 *    روزهای ترجیحی در برنامه ثبت شده باشد؛ هیچ روزی حدس زده نمی‌شود)
 *  - جلسه در حال انجام: دکمه «ادامه جلسه» به رکوردر
 *  - بدون برنامه فعال: مسیر ساخت برنامه
 */

import { ChevronLeft, CalendarCheck2, Clock3, ListChecks, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import type { WorkoutPlanClient } from "@/lib/plan-storage";
import { useLocale } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { localeNumber } from "@/lib/i18n/format";
import { weightStrings } from "@/lib/i18n/sections/weight";

/** اندیس روز هفته شمسی (۰=شنبه … ۶=جمعه) از تاریخ سیستم */
export function iranWeekdayIndex(date: Date = new Date()): number {
  return (date.getDay() + 1) % 7;
}

export function TodaySessionCard({
  plan,
  sessionActive = false,
  onStartDay,
}: {
  plan: WorkoutPlanClient | null;
  /** جلسه در حال انجام وجود دارد — شروع دومی ممکن نیست */
  sessionActive?: boolean;
  onStartDay?: (dayId: string) => void;
}) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const t = useStrings(weightStrings);
  const locale = useLocale();

  if (!plan) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[11px] leading-6 text-muted-foreground">
          {t.todayPlanEmptyDescription}
        </p>
        <Button
          variant="outline"
          onClick={() => setActiveView("workout")}
          className="w-fit border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
        >
          {t.buildPlanButton}
          {/* آیکن جهت‌دار «جلو» — ظاهر فعلی RTL حفظ می‌شود؛ در LTR آینه می‌شود */}
          <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    );
  }

  const today = iranWeekdayIndex();
  const todaySession =
    plan.days.find((d) => d.weekday === today) ?? null;

  if (todaySession) {
    const firstThree = todaySession.exercises.slice(0, 3).map((e) => e.faName);
    const rest = todaySession.exercises.length - firstThree.length;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary/35 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
            <CalendarCheck2 className="size-3.5" aria-hidden="true" />
            {t.todayBadge(t.weekdayLabels[today], localeNumber(todaySession.order, locale))}
          </span>
          <span className="text-[11px] font-bold text-foreground">{todaySession.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] leading-5 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ListChecks className="size-3" aria-hidden="true" />
            {t.exercisesCount(localeNumber(todaySession.exercises.length, locale))}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" aria-hidden="true" />
            {t.estMinutes(localeNumber(todaySession.estMinutes, locale))}
          </span>
        </div>
        <ul className="flex flex-col gap-1">
          {firstThree.map((name, i) => (
            <li key={i} className="flex items-center gap-2 text-[11px] leading-6 text-foreground/85">
              <span className="size-1.5 rounded-full bg-primary/60" aria-hidden="true" />
              {name}
            </li>
          ))}
          {rest > 0 && (
            <li className="text-[10px] leading-5 text-muted-foreground">
              {t.moreExercises(localeNumber(rest, locale))}
            </li>
          )}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          {sessionActive ? (
            <Button
              onClick={() => setActiveView("workout")}
              className="font-bold text-primary-foreground glow-lime-sm"
            >
              <Play className="size-4" aria-hidden="true" />
              {t.continueActiveSession}
            </Button>
          ) : (
            onStartDay && (
              <Button
                onClick={() => onStartDay(todaySession.id)}
                className="font-bold text-primary-foreground glow-lime-sm"
              >
                <Play className="size-4" aria-hidden="true" />
                {t.startTodayWorkout}
              </Button>
            )
          )}
          <Button
            variant="outline"
            onClick={() => setActiveView("workout")}
            className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
          >
            {t.viewFullPlan}
            {/* آیکن جهت‌دار «جلو» — ظاهر فعلی RTL حفظ می‌شود؛ در LTR آینه می‌شود */}
            <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
          </Button>
        </div>
        {onStartDay && !sessionActive && (
          <p className="text-[9px] leading-5 text-muted-foreground/70">
            {t.startSessionNote}
          </p>
        )}
      </div>
    );
  }

  // امروز جلسه نیست — نزدیک‌ترین جلسه بعدی فقط با روزهای ثبت‌شده
  let upcoming: { label: string; title: string } | null = null;
  if (plan.days.some((d) => d.weekday !== null)) {
    for (let offset = 1; offset <= 7; offset++) {
      const dayIndex = (today + offset) % 7;
      const found = plan.days.find((d) => d.weekday === dayIndex);
      if (found) {
        upcoming = {
          label: offset === 1 ? t.tomorrowLabel : t.weekdayLabels[dayIndex],
          title: found.title,
        };
        break;
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-6 text-muted-foreground">
        {t.noSessionToday(plan.title)}
        {upcoming
          ? t.nextSessionIs(upcoming.label, upcoming.title)
          : t.noFixedDays}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {sessionActive && (
          <Button
            onClick={() => setActiveView("workout")}
            className="font-bold text-primary-foreground glow-lime-sm"
          >
            <Play className="size-4" aria-hidden="true" />
            {t.continueActiveSession}
          </Button>
        )}
        <Button
          variant="outline"
          onClick={() => setActiveView("workout")}
          className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
        >
          {t.viewWorkoutPlan}
          {/* آیکن جهت‌دار «جلو» — ظاهر فعلی RTL حفظ می‌شود؛ در LTR آینه می‌شود */}
          <ChevronLeft className="size-4 ltr:rotate-180" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
