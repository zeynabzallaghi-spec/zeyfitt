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
import { useLocale } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { progressStrings } from "@/lib/i18n/sections/progress";
import { localeNumber } from "@/lib/i18n/format";

/**
 * اندازه‌های بدن — فقط رابطی: هیچ‌جا ذخیره یا به API فرستاده نمی‌شوند
 * (مدل داده هنوز ندارد). مقدار فارسی کلید نمایشی می‌ماند و برچسب نمایشی
 * با measureLabel دیکشنری بخش به زبان رابط ترجمه می‌شود.
 */
const BODY_MEASURES = ["قفسه سینه", "کمر", "باسن", "بازو", "ران"];

export function ProgressView() {
  const item = getNavItem("progress");
  const locale = useLocale();
  const t = useStrings(progressStrings);
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
        aria-label={t.sectionStatsAria}
        className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <SessionStats />
      </section>

      {/* تاریخچه واقعی جلسات */}
      <section
        aria-label={t.sectionHistoryAria}
        className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <SessionHistory />
      </section>

      {/* روند وزن — اتصال واقعی به API وزن کاربر جاری */}
      <section aria-label={t.sectionWeightAria} className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
        <WeightLogCard variant="progress" data={weightData} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* اندازه‌های بدن — هنوز مدل داده ندارند؛ حالت خالی صادقانه */}
        <section
          aria-label={t.sectionMeasuresAria}
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <Ruler className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">{t.measuresTitle}</h3>
            <StageBadge label={t.comingSoonBadge} className="ms-auto" />
          </div>
          <ul className="mt-4 divide-y divide-border/50">
            {BODY_MEASURES.map((measure) => (
              <li key={measure} className="flex items-center justify-between py-2.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.measureLabel(measure)}
                </span>
                <span className="text-xs font-bold text-muted-foreground/50">—</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-5 text-muted-foreground/60">
            {t.measuresNote}
          </p>
        </section>

        {/* راهنمای ثبت اطلاعات */}
        <section
          aria-label={t.sectionGuideAria}
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <NotebookPen className="size-4 text-primary" aria-hidden="true" />
            {t.guideTitle}
          </h3>
          <ol className="mt-5 flex flex-col gap-4">
            {t.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary/35 bg-primary/10 text-xs font-extrabold text-primary">
                  {localeNumber(i + 1, locale)}
                </span>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">{step.title}</p>
                    <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      {t.stepActiveBadge}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{step.desc}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-xl border border-border/50 bg-secondary/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            {t.privacyNote}
          </p>
        </section>
      </div>
    </motion.div>
  );
}
