"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck2,
  Flame,
  Activity,
  Scale,
  ChevronLeft,
  ClipboardList,
  CircleCheck,
  CircleDashed,
  LoaderCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS, DEV_STAGES, getNavItem, type NavItem, type ViewId } from "@/lib/nav";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

/** کارت‌های وضعیت خلاصه — بدون داده ساختگی؛ فقط وضعیت واقعی فعلی محصول */
const SUMMARY_CARDS: {
  key: string;
  label: string;
  value: string;
  note: string;
  icon: typeof Flame;
  stage: number;
}[] = [
  {
    key: "today-workout",
    label: "تمرین امروز",
    value: "—",
    note: "پس از تکمیل پروفایل و ساخت برنامه تمرینی نمایش داده می‌شود",
    icon: CalendarCheck2,
    stage: 7,
  },
  {
    key: "daily-calories",
    label: "کالری امروز",
    value: "—",
    note: "با محاسبه BMR و TDEE از اطلاعات بدنی شما به دست می‌آید",
    icon: Flame,
    stage: 8,
  },
  {
    key: "sessions",
    label: "جلسات انجام‌شده",
    value: "۰",
    note: "هنوز جلسه‌ای ثبت نشده است؛ اولین جلسه پس از ساخت برنامه ثبت می‌شود",
    icon: Activity,
    stage: 7,
  },
  {
    key: "weight",
    label: "وزن فعلی",
    value: "ثبت نشده",
    note: "وزن شما در فرایند تکمیل پروفایل ثبت خواهد شد",
    icon: Scale,
    stage: 2,
  },
];

function EmptySummaryCard({
  label,
  value,
  note,
  icon: Icon,
  stage,
}: (typeof SUMMARY_CARDS)[number]) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-colors duration-200 hover:border-primary/25">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-secondary/50 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
          <Icon className="size-4.5" strokeWidth={2} aria-hidden="true" />
        </span>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          مرحله {stage.toLocaleString("fa-IR")}
        </span>
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground/90">{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">{note}</p>
    </div>
  );
}

function QuickAccessCard({ item }: { item: NavItem }) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => setActiveView(item.id)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card p-5 text-start transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-[0_8px_32px_-12px_oklch(0.89_0.22_128/0.25)] outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl border border-border/50 bg-secondary/50 text-muted-foreground transition-all duration-200 group-hover:border-primary/40 group-hover:bg-primary/15 group-hover:text-primary">
          <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
        </span>
        <ChevronLeft
          className="size-4 text-muted-foreground/40 transition-all duration-200 group-hover:-translate-x-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <p className="mt-4 text-sm font-bold text-foreground">{item.fa}</p>
      <p dir="ltr" className="mt-0.5 text-[10px] font-medium text-muted-foreground/70 text-start">
        {item.en}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{item.description}</p>
    </button>
  );
}

function StageRow({ index, title, current }: { index: number; title: string; current: boolean }) {
  return (
    <li className="flex items-center gap-3 py-1.5">
      {current ? (
        <LoaderCircle className="size-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
      ) : (
        <CircleDashed className="size-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
      )}
      <span
        className={cn(
          "text-xs leading-6",
          current ? "font-bold text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="me-2 inline-block min-w-6 text-[10px] font-bold text-primary/80">
          {index.toLocaleString("fa-IR")}
        </span>
        {title}
      </span>
      {current && (
        <span className="ms-auto shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          در حال انجام
        </span>
      )}
    </li>
  );
}

function RoadmapCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
          <ClipboardList className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h3 className="text-sm font-bold">نقشه راه توسعه محصول</h3>
          <p className="text-[11px] text-muted-foreground">
            مسیر شفاف ساخت محصول — پس از تأیید شما در پایان هر مرحله، مرحله بعد آغاز می‌شود
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
        {DEV_STAGES.map((stage) => (
          <StageRow
            key={stage.index}
            index={stage.index}
            title={stage.title}
            current={stage.index === 0}
          />
        ))}
      </ul>
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/50 bg-secondary/30 p-3">
        <Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          این نسخه، پوسته پایه محصول است و هیچ داده یا هوش مصنوعی نمایشی ندارد؛ همه بخش‌ها با
          اطلاعات واقعی شما و در مراحل بعدی ساخته خواهند شد. این کارت در نسخه نهایی حذف می‌شود.
        </p>
      </div>
    </div>
  );
}

export function DashboardView() {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const coach3d = getNavItem("coach3d");
  const profile = getNavItem("profile");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* خوشامدگویی */}
      <motion.section
        variants={fadeUp}
        aria-labelledby="welcome-heading"
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card bg-aura-lime"
      >
        <div className="absolute inset-0 bg-grid-fade" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
              مربی شخصی هوشمند بدنسازی
            </span>
            <h2 id="welcome-heading" className="mt-4 text-2xl font-extrabold leading-snug md:text-3xl">
              به <span className="text-primary text-glow">AI Fitness Coach</span> خوش آمدید
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              این پلتفرم مانند یک مربی شخصی واقعی عمل می‌کند: پروفایل بدنی خود را تکمیل می‌کنید،
              برنامه تمرینی اختصاصی می‌گیرید، حرکات را با مربی سه‌بعدی و نمایش عضلات درگیر یاد می‌گیرید
              و برنامه غذایی متناسب با هدف‌تان دریافت می‌کنید. برای شروع، ابتدا حساب کاربری بسازید.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setActiveView(profile.id)}
                className="font-bold text-primary-foreground glow-lime-sm"
              >
                شروع با ساخت پروفایل
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveView(coach3d.id)}
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
              >
                آشنایی با مربی سه‌بعدی
              </Button>
            </div>
          </div>
          {/* نشان تزئینی */}
          <div className="hidden shrink-0 md:block" aria-hidden="true">
            <div className="relative flex size-36 items-center justify-center rounded-3xl border border-primary/20 bg-primary/5">
              <div className="absolute inset-3 rounded-2xl border border-dashed border-primary/15" />
              <ClipboardList className="size-14 text-primary/70" strokeWidth={1.4} />
              <span className="absolute -bottom-3 rounded-full border border-primary/30 bg-background px-3 py-1 text-[10px] font-bold text-primary">
                نسخه پایه • مرحله ۰
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* خلاصه وضعیت */}
      <motion.section variants={fadeUp} aria-label="خلاصه وضعیت شما">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_CARDS.map(({ key, ...card }) => (
            <EmptySummaryCard key={key} {...card} />
          ))}
        </div>
      </motion.section>

      {/* دسترسی سریع به بخش‌ها */}
      <motion.section variants={fadeUp} aria-label="دسترسی سریع به بخش‌ها">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold">بخش‌های پنل</h3>
          <span className="text-[11px] text-muted-foreground">۸ بخش اصلی محصول</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {NAV_ITEMS.map((item) => (
            <QuickAccessCard key={item.id} item={item} />
          ))}
        </div>
      </motion.section>

      {/* نقشه راه */}
      <motion.section variants={fadeUp} aria-label="نقشه راه توسعه">
        <RoadmapCard />
      </motion.section>
    </motion.div>
  );
}
