"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  CircleDashed,
  Target,
  Gauge,
  UserRoundPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNavItem } from "@/lib/nav";
import { useAppStore } from "@/store/app-store";
import { ViewIntro } from "../shared/view-intro";
import { StageBadge } from "../shared/badges";

const WEEK_DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function StatusChip({
  icon: Icon,
  label,
  value,
  warning = false,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-secondary/30 px-3.5 py-2.5">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="text-[11px] font-medium text-muted-foreground">{label}:</span>
      <span
        className={
          warning
            ? "text-xs font-bold text-amber-300"
            : "text-xs font-bold text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}

export function WorkoutView() {
  const item = getNavItem("workout");
  const profile = getNavItem("profile");
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro item={item} badges={<StageBadge stage={7} />} />

      {/* نوار وضعیت برنامه */}
      <section aria-label="وضعیت برنامه" className="flex flex-wrap gap-2.5">
        <StatusChip icon={Target} label="وضعیت برنامه" value="بدون برنامه" warning />
        <StatusChip icon={Target} label="هدف تمرینی" value="ثبت نشده" />
        <StatusChip icon={Gauge} label="سطح تجربه" value="ثبت نشده" />
      </section>

      {/* شبکه هفتگی — همه روزها خالی و مشخص */}
      <section
        aria-label="برنامه هفتگی"
        className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
            <CalendarDays className="size-4" aria-hidden="true" />
          </span>
          <h3 className="text-sm font-bold">برنامه هفتگی</h3>
          <StageBadge stage={7} label="پر شدن در مرحله ۷" className="ms-auto" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
          {WEEK_DAYS.map((day) => (
            <div
              key={day}
              className="flex min-w-0 flex-col rounded-xl border border-dashed border-border/50 bg-secondary/20 p-3.5"
            >
              <p className="truncate text-xs font-bold text-foreground/80">{day}</p>
              <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-center">
                <CircleDashed className="size-4 text-muted-foreground/40" aria-hidden="true" />
                <p className="text-[10px] leading-5 text-muted-foreground/70">بدون برنامه</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          در نسخه کامل، هر روز شامل حرکات با ست، تکرار، زمان استراحت، گروه عضلانی هدف و لینک
          مستقیم به نمایش سه‌بعدی حرکت خواهد بود. برای کاربران دارای محدودیت یا آسیب، حرکات
          مرتبط با احتیاط فیلتر می‌شوند.
        </p>
      </section>

      {/* راهنمای شروع */}
      <section
        aria-label="راهنمای شروع"
        className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <h3 className="text-sm font-bold">چگونه برنامه خود را دریافت کنم؟</h3>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3">
          {[
            {
              title: "تکمیل پروفایل بدنی",
              desc: "هدف، سطح، تجهیزات و محدودیت‌های خود را ثبت کنید.",
              stage: 2,
            },
            {
              title: "دریافت برنامه هفتگی",
              desc: "برنامه‌ساز بر پایه قوانین مشخص، برنامه متناسب می‌سازد.",
              stage: 7,
            },
            {
              title: "اجرای تمرین‌ها",
              desc: "ست‌ها را ثبت کنید و با مربی سه‌بعدی فرم صحیح را بیاموزید.",
              stage: 4,
            },
          ].map((step, i) => (
            <li key={i} className="rounded-xl border border-border/50 bg-secondary/20 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-7 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-xs font-extrabold text-primary">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                <StageBadge stage={step.stage} />
              </div>
              <p className="mt-3 text-xs font-bold text-foreground">{step.title}</p>
              <p className="mt-1.5 text-[11px] leading-6 text-muted-foreground">{step.desc}</p>
            </li>
          ))}
        </ol>
        <Button
          onClick={() => setActiveView(profile.id)}
          className="mt-5 font-bold text-primary-foreground glow-lime-sm"
        >
          <UserRoundPlus className="size-4" aria-hidden="true" />
          تکمیل پروفایل و شروع
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
      </section>
    </motion.div>
  );
}
