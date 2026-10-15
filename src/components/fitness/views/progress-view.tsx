"use client";

import { motion } from "framer-motion";
import {
  Ruler,
  NotebookPen,
} from "lucide-react";
import { getNavItem } from "@/lib/nav";
import { ViewIntro } from "../shared/view-intro";
import { RealBadge, StageBadge } from "../shared/badges";
import { WeightLogCard } from "../shared/weight-log-card";
import { useWeightEntries } from "@/hooks/use-weight-entries";
import { SessionHistory } from "./workout/session/session-history";
import { SessionStats } from "./workout/session/session-stats";

const BODY_MEASURES = ["قفسه سینه", "کمر", "باسن", "بازو", "ران"];

export function ProgressView() {
  const item = getNavItem("progress");
  const weightData = useWeightEntries();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro item={item} badges={<RealBadge />} />

      {/* تحلیل پیشرفت تمرینی — فقط از جلسات واقعی تکمیل‌شده */}
      <section
        aria-label="تحلیل پیشرفت"
        className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <SessionStats />
      </section>

      {/* تاریخچه واقعی جلسات */}
      <section
        aria-label="تاریخچه جلسات"
        className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <SessionHistory />
      </section>

      {/* روند وزن — اتصال واقعی به API وزن کاربر جاری */}
      <section aria-label="روند وزن" className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <WeightLogCard variant="progress" data={weightData} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* اندازه‌های بدن — هنوز مدل داده ندارند؛ حالت خالی صادقانه */}
        <section
          aria-label="اندازه‌های بدن"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <Ruler className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">اندازه‌های بدن</h3>
            <StageBadge label="به‌زودی" className="ms-auto" />
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
            ثبت اندازه‌های سانتی‌متری همراه با تاریخ، در مراحل بعدی به تاریخچه وزن اضافه
            خواهد شد؛ فعلاً هیچ مقداری برای آن‌ها ذخیره نمی‌شود.
          </p>
        </section>

        {/* راهنمای ثبت اطلاعات */}
        <section
          aria-label="راهنمای ثبت اطلاعات"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <NotebookPen className="size-4 text-primary" aria-hidden="true" />
            چگونه پیشرفت من ساخته می‌شود؟
          </h3>
          <ol className="mt-5 flex flex-col gap-4">
            {[
              {
                title: "شروع جلسه واقعی",
                desc: "از بخش «برنامه تمرینی» دکمه «شروع تمرین» (روز برنامه یا تمرین آزاد) را بزنید؛ بازدید از برنامه هرگز جلسه حساب نمی‌شود.",
                ready: true,
              },
              {
                title: "ثبت ست‌های انجام‌شده",
                desc: "بعد از هر ست واقعی، تکرار و وزنه را ثبت کنید؛ ذخیره در پایگاه داده سرور است و با رفرش از بین نمی‌رود.",
                ready: true,
              },
              {
                title: "پایان صریح جلسه",
                desc: "با «تکمیل تمرین» یا «رهاکردن» جلسه بسته می‌شود؛ فقط جلسات تکمیل‌شده در آمار پیشرفت جمع می‌شوند.",
                ready: true,
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-xs font-extrabold text-primary">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">{step.title}</p>
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      فعال
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl border border-border/50 bg-secondary/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            داده‌های این بخش فقط از حساب کاربری شما خوانده می‌شوند؛ داده کاربران دیگر هرگز
            با اطلاعات شما ترکیب نمی‌شود، تاریخ‌ها با تقویم شمسی نمایش داده می‌شوند و هفته با
            تقویم رسمی ایران (شنبه تا جمعه) محاسبه می‌شود.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
