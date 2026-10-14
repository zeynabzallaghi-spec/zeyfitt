"use client";

import { motion, type Variants } from "framer-motion";
import {
  CalendarCheck2,
  Timer,
  Scale,
  ClipboardList,
  ChevronLeft,
  Box,
  Dumbbell,
  UtensilsCrossed,
  UserRoundCog,
  Sparkles,
  ClipboardPen,
  CircleCheck,
  CloudCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  NAV_ITEMS,
  DEV_STAGES,
  CURRENT_STAGE,
  getNavItem,
  type NavItem,
  type ViewId,
} from "@/lib/nav";
import { useAppStore } from "@/store/app-store";
import { useSessionData } from "../session-context";
import { faDigits } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { EmptyState } from "../shared/empty-state";
import { DemoBadge, StageBadge } from "../shared/badges";
import { WeeklySampleChart } from "../shared/weekly-sample-chart";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

/* ---------------------------------- کارت آماری ---------------------------------- */

interface StatCardProps {
  label: string;
  value: string;
  note: string;
  icon: typeof Timer;
  stage: number;
  /** داده واقعی از حساب کاربر — به‌جای نشان مرحله، نشان «واقعی» می‌گیرد */
  live?: boolean;
}

function StatCard({ label, value, note, icon: Icon, stage, live = false }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-colors duration-200 hover:border-primary/25">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-secondary/50 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
          <Icon className="size-4.5" strokeWidth={2} aria-hidden="true" />
        </span>
        {live ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            <CircleCheck className="size-3" aria-hidden="true" />
            واقعی
          </span>
        ) : (
          <StageBadge stage={stage} />
        )}
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground/90">{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">{note}</p>
    </div>
  );
}

/* ------------------------------- دسترسی سریع (ردیفی) ------------------------------- */

const QUICK_LINKS: ViewId[] = ["coach3d", "library", "workout", "nutrition"];

function QuickLinkRow({ item }: { item: NavItem }) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={() => setActiveView(item.id)}
      className="group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-start transition-all duration-200 hover:border-border/60 hover:bg-secondary/40 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground transition-all group-hover:border-primary/35 group-hover:bg-primary/10 group-hover:text-primary">
        <Icon className="size-4" strokeWidth={2.1} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-foreground">{item.fa}</span>
        <span dir="ltr" className="block text-[10px] text-muted-foreground/70">
          {item.en}
        </span>
      </span>
      <ChevronLeft
        className="size-4 shrink-0 text-muted-foreground/40 transition-all group-hover:-translate-x-0.5 group-hover:text-primary"
        aria-hidden="true"
      />
    </button>
  );
}

/* --------------------------------- نقشه راه --------------------------------- */

function StageRow({ index, title, current }: { index: number; title: string; current: boolean }) {
  return (
    <li className="flex items-center gap-3 py-1">
      {current ? (
        <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
        </span>
      ) : (
        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden="true" />
      )}
      <span
        className={cn(
          "text-xs leading-6",
          current ? "font-bold text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="me-2 inline-block min-w-5 text-[10px] font-bold text-primary/70">
          {index.toLocaleString("fa-IR")}
        </span>
        {title}
      </span>
      {current && (
        <span className="ms-auto shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          جاری
        </span>
      )}
    </li>
  );
}

function RoadmapCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <ClipboardPen className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h3 className="text-sm font-bold">نقشه راه توسعه محصول</h3>
          <p className="text-[11px] text-muted-foreground">
            هر مرحله پس از تأیید شما آغاز می‌شود؛ این کارت در نسخه نهایی حذف خواهد شد
          </p>
        </div>
      </div>
      <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
        {DEV_STAGES.map((stage) => (
          <StageRow
            key={stage.index}
            index={stage.index}
            title={stage.title}
            current={stage.index === CURRENT_STAGE}
          />
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------- داشبورد ---------------------------------- */

export function DashboardView() {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const profile = getNavItem("profile");
  const coach3d = getNavItem("coach3d");
  const { user, profile: fitnessProfile } = useSessionData();
  const displayName = fitnessProfile?.displayName ?? user?.name ?? "";

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* بخش خوشامدگویی */}
      <motion.section
        variants={fadeUp}
        aria-labelledby="welcome-heading"
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card bg-aura-lime"
      >
        <div className="absolute inset-0 bg-grid-fade" aria-hidden="true" />
        <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
              <Sparkles className="size-3" aria-hidden="true" />
              مربی شخصی هوشمند بدنسازی
            </span>
            <h2 id="welcome-heading" className="mt-4 text-2xl font-extrabold leading-snug md:text-3xl">
              سلام <span className="text-primary text-glow">{displayName || "ورزشکار"}؛</span>
              {" "}خوش برگشتی
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              پروفایل بدنی شما روی سرور ذخیره شده است. در مراحل بعدی، برنامه تمرینی و غذایی
              اختصاصی بر اساس همین داده‌ها ساخته می‌شود، حرکات با مربی سه‌بعدی آموزش داده می‌شود
              و پیشرفت شما در طول مسیر دنبال خواهد شد.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setActiveView(profile.id)}
                className="font-bold text-primary-foreground glow-lime-sm"
              >
                <UserRoundCog className="size-4" aria-hidden="true" />
                مشاهده و ویرایش پروفایل
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
          {/* نشان تزئینی هدایت‌شده */}
          <div className="hidden shrink-0 md:block" aria-hidden="true">
            <div className="relative flex size-36 items-center justify-center rounded-3xl border border-primary/20 bg-primary/5">
              <div className="absolute inset-3 rounded-2xl border border-dashed border-primary/15" />
              <Dumbbell className="size-14 text-primary/70" strokeWidth={1.4} />
              <span className="absolute -bottom-3 rounded-full border border-primary/30 bg-background px-3 py-1 text-[10px] font-bold text-primary">
                نسخه پایه • مرحله ۱
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* کارت‌های آماری — همه با وضعیت واقعی خالی، بدون داده جعلی */}
      <motion.section variants={fadeUp} aria-label="خلاصه آمار شما">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="تمرین این هفته"
            value="۰ جلسه"
            note="پس از ساخت برنامه تمرینی، جلسات انجام‌شده اینجا شمرده می‌شود"
            icon={CalendarCheck2}
            stage={7}
          />
          <StatCard
            label="زمان فعالیت"
            value="۰ دقیقه"
            note="مجموع زمان تمرین ثبت‌شده شما در هفته جاری"
            icon={Timer}
            stage={7}
          />
          <StatCard
            label="پیشرفت وزن"
            value={
              fitnessProfile?.weightKg
                ? `${faDigits(fitnessProfile.weightKg)} کیلوگرم`
                : "—"
            }
            note={
              fitnessProfile?.weightKg
                ? "وزن ثبت‌شده در پروفایل شما؛ روند تغییرات پس از ثبت وزن‌های دوره‌ای فعال می‌شود"
                : "با ثبت اولین وزن، روند تغییرات فعال می‌شود"
            }
            icon={Scale}
            stage={4}
            live={Boolean(fitnessProfile?.weightKg)}
          />
          <StatCard
            label="وضعیت برنامه"
            value="بدون برنامه"
            note="هنوز برنامه تمرینی ساخته نشده است"
            icon={ClipboardList}
            stage={7}
          />
        </div>
      </motion.section>

      {/* شبکه اصلی */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* برنامه امروز */}
        <motion.section
          variants={fadeUp}
          aria-label="برنامه امروز"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 lg:col-span-2"
        >
          <div className="mb-2 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <CalendarCheck2 className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">برنامه امروز</h3>
            <StageBadge stage={7} className="ms-auto" />
          </div>
          <EmptyState
            icon={ClipboardList}
            title="هنوز برنامه‌ای برای امروز ندارید"
            description="پس از تکمیل پروفایل بدنی، برنامه‌ساز تمرینی برنامه‌ای متناسب با هدف، سطح و تجهیزات شما می‌سازد و تمرین روزانه با ست و تکرار اینجا نمایش داده می‌شود."
            action={
              <Button
                variant="outline"
                onClick={() => setActiveView(profile.id)}
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
              >
                تکمیل پروفایل بدنی
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
            }
          />
        </motion.section>

        {/* کارت وضعیت مسیر — بر اساس داده واقعی حساب */}
        <motion.section variants={fadeUp} aria-label="وضعیت مسیر شما" className="lg:col-span-1">
          <div className="h-full rounded-2xl bg-gradient-to-b from-primary/40 via-primary/15 to-primary/5 p-px">
            <div className="flex h-full flex-col rounded-2xl bg-card p-5 md:p-6">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 text-primary glow-lime-sm">
                  <Sparkles className="size-4" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-bold">وضعیت مسیر شما</h3>
              </div>
              <div className="mt-5 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-foreground">تکمیل پروفایل</span>
                  <span className="text-primary">
                    {faDigits(fitnessProfile?.completionPercent ?? 0)}٪
                  </span>
                </div>
                <Progress
                  value={fitnessProfile?.completionPercent ?? 0}
                  className="h-1.5"
                  aria-label="درصد تکمیل پروفایل"
                />
              </div>
              <ol className="mt-5 flex flex-col gap-4">
                <li className="flex items-start gap-3">
                  <CircleCheck className="mt-0.5 size-6 shrink-0 text-primary" aria-hidden="true" />
                  <span className="flex-1 text-xs leading-6 text-foreground/90">
                    ساخت حساب کاربری و ورود امن
                    <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                      نشست قابل ابطال با کوکی امن
                    </span>
                  </span>
                  <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    انجام شد
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-extrabold",
                      fitnessProfile?.complete
                        ? "border-primary/35 bg-primary/10 text-primary"
                        : "border-border/50 bg-secondary/40 text-muted-foreground"
                    )}
                    aria-hidden="true"
                  >
                    {faDigits(2)}
                  </span>
                  <span className="flex-1 text-xs leading-6 text-foreground/90">
                    تکمیل و به‌روزرسانی پروفایل بدنی
                  </span>
                  {fitnessProfile?.complete && (
                    <span className="shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                      کامل
                    </span>
                  )}
                </li>
                {[
                  { text: "دریافت برنامه تمرینی و غذایی اختصاصی", stage: 7 },
                  { text: "ثبت جلسات و پیگیری پیشرفت واقعی", stage: 4 },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary/40 text-[11px] font-extrabold text-muted-foreground">
                      {faDigits(i + 3)}
                    </span>
                    <span className="flex-1 text-xs leading-6 text-foreground/90">{step.text}</span>
                    <StageBadge stage={step.stage} />
                  </li>
                ))}
              </ol>
              <Button
                onClick={() => setActiveView(profile.id)}
                className="mt-6 w-full font-bold text-primary-foreground glow-lime-sm"
              >
                <CloudCheck className="size-4" aria-hidden="true" />
                ویرایش پروفایل روی سرور
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
              <p className="mt-3 text-center text-[10px] leading-5 text-muted-foreground/70">
                اطلاعات شما به‌صورت دائمی در پایگاه داده سرور ذخیره می‌شود
              </p>
            </div>
          </div>
        </motion.section>

        {/* پیشرفت هفتگی — نمودار نمونه مشخص‌دار */}
        <motion.section
          variants={fadeUp}
          aria-label="پیشرفت هفتگی"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 lg:col-span-2"
        >
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <Timer className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">پیشرفت هفتگی</h3>
            <DemoBadge className="ms-auto" />
          </div>
          <WeeklySampleChart />
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-border/50 bg-secondary/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
            <DemoBadge className="shrink-0" />
            نمودار بالا فقط ساختار نهایی را نمایش می‌دهد و با داده نمونه رسم شده است. پس از ثبت
            جلسات تمرینی در مراحل بعد، نمودار واقعی پیشرفت شما جای آن را می‌گیرد.
          </p>
        </motion.section>

        {/* دسترسی سریع */}
        <motion.section
          variants={fadeUp}
          aria-label="دسترسی سریع"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 lg:col-span-1"
        >
          <h3 className="mb-3 text-sm font-bold">دسترسی سریع</h3>
          <div className="flex flex-col gap-1">
            {QUICK_LINKS.map((id) => {
              const item = getNavItem(id);
              return <QuickLinkRow key={id} item={item} />;
            })}
          </div>
          <p className="mt-3 border-t border-border/50 pt-3 text-[10px] leading-5 text-muted-foreground/70">
            دسترسی به همه هشت بخش از طریق نوار کناری در دسترس است.
          </p>
        </motion.section>
      </div>

      {/* نقشه راه توسعه */}
      <motion.section variants={fadeUp} aria-label="نقشه راه توسعه">
        <RoadmapCard />
      </motion.section>
    </motion.div>
  );
}
