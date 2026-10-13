"use client";

import { motion } from "framer-motion";
import {
  Flame,
  Beef,
  Wheat,
  Droplets,
  Sun,
  Utensils,
  MoonStar,
  Apple,
  ChevronLeft,
  Calculator,
  CircleAlert,
  UserRoundPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNavItem } from "@/lib/nav";
import { useAppStore } from "@/store/app-store";
import { ViewIntro } from "../shared/view-intro";
import { StageBadge } from "../shared/badges";

const MACROS = [
  { label: "کالری روزانه", icon: Flame, unit: "کیلوکالری" },
  { label: "پروتئین", icon: Beef, unit: "گرم" },
  { label: "کربوهیدرات", icon: Wheat, unit: "گرم" },
  { label: "چربی", icon: Droplets, unit: "گرم" },
];

const MEALS = [
  { label: "صبحانه", icon: Sun },
  { label: "ناهار", icon: Utensils },
  { label: "شام", icon: MoonStar },
  { label: "میان‌وعده", icon: Apple },
];

export function NutritionView() {
  const item = getNavItem("nutrition");
  const profile = getNavItem("profile");
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro item={item} badges={<StageBadge stage={8} />} />

      {/* اهداف درشت‌مغذی — خالی تا تکمیل پروفایل */}
      <section aria-label="اهداف تغذیه‌ای روزانه">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MACROS.map((macro) => {
            const Icon = macro.icon;
            return (
              <div
                key={macro.label}
                className="rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:border-primary/25"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-secondary/50 text-muted-foreground">
                    <Icon className="size-4.5" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground/70">
                    {macro.unit}
                  </span>
                </div>
                <p className="mt-4 text-xs font-medium text-muted-foreground">{macro.label}</p>
                <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground/70">—</p>
                <p className="mt-2 text-[10px] leading-5 text-muted-foreground/70">
                  پس از تکمیل پروفایل محاسبه می‌شود
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* وعده‌های غذایی */}
      <section
        aria-label="برنامه وعده‌های غذایی"
        className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <h3 className="text-sm font-bold">برنامه وعده‌های غذایی</h3>
          <StageBadge stage={8} label="پر شدن در مرحله ۸" className="ms-auto" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {MEALS.map((meal) => {
            const Icon = meal.icon;
            return (
              <div
                key={meal.label}
                className="flex min-h-36 flex-col rounded-xl border border-dashed border-border/50 bg-secondary/20 p-4"
              >
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
                  <p className="text-xs font-bold text-foreground/80">{meal.label}</p>
                </div>
                <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-3 text-center">
                  <p className="text-[10px] leading-5 text-muted-foreground/60">
                    پس از محاسبه نیازهای روزانه،
                    <br />
                    پیشنهاد مواد غذایی اینجا نمایش داده می‌شود
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
          در نسخه کامل، هر وعده شامل مواد غذایی، مقدار، کالری و درشت‌مغذی‌ها خواهد بود؛ با امکان
          جایگزینی غذا، تغییر مقادیر و هشدار آلرژی‌های ثبت‌شده شما.
        </p>
      </section>

      {/* روش محاسبه + هشدار پزشکی */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="روش محاسبه" className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <Calculator className="size-4 text-primary" aria-hidden="true" />
            روش محاسبه (در نسخه کامل)
          </h3>
          <ul className="mt-4 flex flex-col gap-2.5 text-xs leading-6 text-muted-foreground">
            <li className="flex items-start gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
              <span>
                <b className="text-foreground/90">BMR:</b> فرمول شناخته‌شده Mifflin–St Jeor بر
                اساس سن، جنسیت، قد و وزن شما
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
              <span>
                <b className="text-foreground/90">TDEE:</b> ضرب BMR در ضریب سطح فعالیت روزانه
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
              <span>
                <b className="text-foreground/90">کالری هدف:</b> تنظیم TDEE بر اساس هدف تمرینی
                (کاهش چربی، عضله‌سازی و…)
              </span>
            </li>
          </ul>
        </section>

        <section aria-label="توصیه مهم" className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <CircleAlert className="size-4 text-amber-300" aria-hidden="true" />
            توصیه مهم
          </h3>
          <p className="mt-4 text-xs leading-7 text-muted-foreground">
            برنامه‌های غذایی این محصول برای اهداف عمومی تناسب اندام طراحی می‌شوند و جایگزین
            توصیه پزشک یا متخصص تغذیه نیستند. اگر شرایط پزشکی خاص، محدودیت غذایی جدی یا نیاز
            تخصصی دارید، پیش از اجرای هر برنامه با متخصص مشورت کنید.
          </p>
          <Button
            onClick={() => setActiveView(profile.id)}
            className="mt-5 font-bold text-primary-foreground glow-lime-sm"
          >
            <UserRoundPlus className="size-4" aria-hidden="true" />
            تکمیل پروفایل برای محاسبه
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
        </section>
      </div>
    </motion.div>
  );
}
