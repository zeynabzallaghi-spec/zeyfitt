"use client";

import { motion } from "framer-motion";
import {
  Scale,
  LineChart,
  Ruler,
  History,
  NotebookPen,
} from "lucide-react";
import { getNavItem } from "@/lib/nav";
import { ViewIntro } from "../shared/view-intro";
import { StageBadge } from "../shared/badges";

const BODY_MEASURES = ["قفسه سینه", "کمر", "باسن", "بازو", "ران"];

export function ProgressView() {
  const item = getNavItem("progress");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro item={item} badges={<StageBadge stage={3} />} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* روند وزن */}
        <section
          aria-label="روند وزن"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <Scale className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">روند وزن</h3>
            <StageBadge stage={3} className="ms-auto" />
          </div>
          <div className="mt-4 flex h-48 flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/60 bg-secondary/20 px-6 text-center">
            <LineChart className="size-6 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-xs font-bold text-foreground/80">
              نمودار روند وزن پس از ثبت اولین وزن رسم می‌شود
            </p>
            <p className="max-w-xs text-[11px] leading-6 text-muted-foreground/70">
              ثبت وزن در تاریخ‌های مختلف از مرحله ۳ فعال می‌شود؛ نمودار فقط با داده واقعی شما
              رسم خواهد شد و داده نمایشی ندارد.
            </p>
          </div>
        </section>

        {/* اندازه‌های بدن */}
        <section
          aria-label="اندازه‌های بدن"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <Ruler className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">اندازه‌های بدن</h3>
            <StageBadge stage={3} className="ms-auto" />
          </div>
          <ul className="mt-4 divide-y divide-border/50">
            {BODY_MEASURES.map((measure) => (
              <li key={measure} className="flex items-center justify-between py-2.5">
                <span className="text-xs font-medium text-muted-foreground">{measure}</span>
                <span className="text-xs font-bold text-muted-foreground/50">—</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-5 text-muted-foreground/60">
            اندازه‌ها به سانتی‌متر و همراه با تاریخ ثبت نگهداری می‌شوند.
          </p>
        </section>

        {/* تاریخچه تمرین */}
        <section
          aria-label="تاریخچه تمرین"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <History className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">تاریخچه تمرین</h3>
            <StageBadge stage={7} className="ms-auto" />
          </div>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-secondary/20 px-6 py-10 text-center">
            <p className="text-xs font-bold text-foreground/80">هنوز جلسه‌ای ثبت نشده است</p>
            <p className="max-w-xs text-[11px] leading-6 text-muted-foreground/70">
              پس از ساخت برنامه تمرینی (مرحله ۷)، هر جلسه کامل‌شده با تاریخ، حرکات و ست‌های
              انجام‌شده در این فهرست نگهداری می‌شود.
            </p>
          </div>
        </section>

        {/* راهنمای ثبت اطلاعات */}
        <section
          aria-label="راهنمای ثبت اطلاعات"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <NotebookPen className="size-4 text-primary" aria-hidden="true" />
            چگونه اطلاعات خود را ثبت کنم؟
          </h3>
          <ol className="mt-5 flex flex-col gap-4">
            {[
              {
                title: "تکمیل پروفایل بدنی",
                desc: "قد و وزن اولیه شما در فرایند ساخت پروفایل ثبت می‌شود.",
                stage: 2,
              },
              {
                title: "ثبت دوره‌ای وزن و اندازه‌ها",
                desc: "از مرحله ۳، ثبت وزن و اندازه‌ها در تاریخ‌های مختلف فعال می‌شود.",
                stage: 3,
              },
              {
                title: "ثبت جلسات تمرین",
                desc: "با اجرای برنامه، ست‌های انجام‌شده ثبت و تاریخچه ساخته می‌شود.",
                stage: 7,
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-xs font-extrabold text-primary">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">{step.title}</p>
                    <StageBadge stage={step.stage} />
                  </div>
                  <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl border border-border/50 bg-secondary/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            نمودارهای این بخش فقط با داده واقعی شما پر می‌شوند؛ تا آن زمان وضعیت خالی با راهنما
            نمایش داده می‌شود.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
