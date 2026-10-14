"use client";

import { motion } from "framer-motion";
import {
  Ruler,
  History,
  NotebookPen,
} from "lucide-react";
import { getNavItem } from "@/lib/nav";
import { ViewIntro } from "../shared/view-intro";
import { StageBadge } from "../shared/badges";
import { WeightLogCard } from "../shared/weight-log-card";
import { useWeightEntries } from "@/hooks/use-weight-entries";

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
      <ViewIntro item={item} badges={<StageBadge stage={4} />} />

      {/* روند وزن — اتصال واقعی به API وزن کاربر جاری */}
      <section aria-label="روند وزن">
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

        {/* تاریخچه تمرین — پس از فعال شدن برنامه‌ساز */}
        <section
          aria-label="تاریخچه تمرین"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <History className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">تاریخچه تمرین</h3>
            <StageBadge stage={6} className="ms-auto" />
          </div>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-secondary/20 px-6 py-10 text-center">
            <p className="text-xs font-bold text-foreground/80">هنوز جلسه‌ای ثبت نشده است</p>
            <p className="max-w-xs text-[11px] leading-6 text-muted-foreground/70">
              پس از ساخت برنامه تمرینی، هر جلسه کامل‌شده با تاریخ، حرکات و ست‌های
              انجام‌شده در این فهرست نگهداری می‌شود.
            </p>
          </div>
        </section>

        {/* راهنمای ثبت اطلاعات */}
        <section
          aria-label="راهنمای ثبت اطلاعات"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 lg:col-span-2"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <NotebookPen className="size-4 text-primary" aria-hidden="true" />
            چگونه اطلاعات خود را ثبت کنم؟
          </h3>
          <ol className="mt-5 flex flex-col gap-4">
            {[
              {
                title: "ثبت وزن در تاریخ‌های مختلف",
                desc: "همین حالا از کارت «روند وزن» بالای همین صفحه یا داشبورد قابل ثبت است؛ نمودار و تغییرات فقط با داده واقعی شما رسم می‌شود.",
                ready: true,
              },
              {
                title: "تکمیل پروفایل بدنی",
                desc: "قد، وزن اولیه و مشخصات بدنی در بخش پروفایل روی سرور ذخیره می‌شود.",
                ready: true,
              },
              {
                title: "ثبت جلسات تمرین",
                desc: "با فعال شدن برنامه‌ساز تمرینی (مرحله ۶)، ست‌های انجام‌شده ثبت و تاریخچه ساخته می‌شود.",
                ready: false,
              },
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-xs font-extrabold text-primary">
                  {(i + 1).toLocaleString("fa-IR")}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">{step.title}</p>
                    {step.ready ? (
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                        فعال
                      </span>
                    ) : (
                      <StageBadge stage={6} />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl border border-border/50 bg-secondary/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            داده‌های این بخش فقط از حساب کاربری شما خوانده می‌شوند؛ داده کاربران دیگر هرگز
            با اطلاعات شما ترکیب نمی‌شود و تاریخ‌ها با تقویم شمسی نمایش داده می‌شوند.
          </p>
        </section>
      </div>
    </motion.div>
  );
}
