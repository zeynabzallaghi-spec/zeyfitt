"use client";

/**
 * کارت «برنامه امروز» داشبورد — خلاصه واقعی برنامه فعال:
 *  - اگر امروز جلسه تمرین باشد: عنوان جلسه، تعداد حرکت، زمان تقریبی و
 *    چند حرکت نخست + لینک به بخش برنامه تمرینی
 *  - اگر امروز جلسه نباشد: پیام صادقانه + نزدیک‌ترین جلسه بعدی (فقط وقتی
 *    روزهای ترجیحی در برنامه ثبت شده باشد؛ هیچ روزی حدس زده نمی‌شود)
 *  - بدون برنامه فعال: مسیر ساخت برنامه
 */

import { ChevronLeft, CalendarCheck2, Clock3, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { faDigits } from "@/lib/profile";
import type { WorkoutPlanClient } from "@/lib/plan-storage";

const WEEK_DAY_LABELS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

/** اندیس روز هفته شمسی (۰=شنبه … ۶=جمعه) از تاریخ سیستم */
export function iranWeekdayIndex(date: Date = new Date()): number {
  return (date.getDay() + 1) % 7;
}

export function TodaySessionCard({ plan }: { plan: WorkoutPlanClient | null }) {
  const setActiveView = useAppStore((s) => s.setActiveView);

  if (!plan) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[11px] leading-6 text-muted-foreground">
          با برنامه‌ساز تمرینی، برنامه‌ای واقعاً بر اساس هدف، سطح و تجهیزات شما ساخته و در
          پایگاه داده ذخیره می‌شود. تا آن زمان اینجا برنامه‌ای نمایش داده نمی‌شود.
        </p>
        <Button
          variant="outline"
          onClick={() => setActiveView("workout")}
          className="w-fit border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
        >
          ساخت برنامه شخصی
          <ChevronLeft className="size-4" aria-hidden="true" />
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
            امروز {WEEK_DAY_LABELS[today]} — جلسه {faDigits(todaySession.order)}
          </span>
          <span className="text-[11px] font-bold text-foreground">{todaySession.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] leading-5 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ListChecks className="size-3" aria-hidden="true" />
            {faDigits(todaySession.exercises.length)} حرکت
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3" aria-hidden="true" />
            ~{faDigits(todaySession.estMinutes)} دقیقه (شامل گرم‌کردن)
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
              و {faDigits(rest)} حرکت دیگر…
            </li>
          )}
        </ul>
        <Button
          variant="outline"
          onClick={() => setActiveView("workout")}
          className="w-fit border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
        >
          مشاهده برنامه کامل
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
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
          label: offset === 1 ? "فردا" : WEEK_DAY_LABELS[dayIndex],
          title: found.title,
        };
        break;
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-6 text-muted-foreground">
        امروز جلسه‌ای در برنامه «{plan.title}» نیست.
        {upcoming
          ? ` جلسه بعدی ${upcoming.label} است: ${upcoming.title}.`
          : " روزهای جلسات در این برنامه تاریخ مشخصی ندارند؛ ترتیب جلسات در صفحه برنامه تمرینی آمده است."}
      </p>
      <Button
        variant="outline"
        onClick={() => setActiveView("workout")}
        className="w-fit border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
      >
        مشاهده برنامه تمرینی
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
