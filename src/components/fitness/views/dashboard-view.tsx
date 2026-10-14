"use client";

import { motion, type Variants } from "framer-motion";
import {
  CalendarCheck2,
  ChevronLeft,
  Box,
  Dumbbell,
  UserRoundCog,
  Sparkles,
  CloudCheck,
  CircleCheck,
  Scale,
  Ruler,
  Target,
  ClipboardList,
  UserRound,
  BookOpenText,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DEV_STAGES,
  CURRENT_STAGE,
  getNavItem,
  type NavItem,
  type ViewId,
} from "@/lib/nav";
import { useAppStore } from "@/store/app-store";
import { useJourneyStore } from "@/store/journey-store";
import { useSessionData } from "../session-context";
import { faDigits, labelOf, GOAL_OPTIONS, EXPERIENCE_OPTIONS } from "@/lib/profile";
import { jalaliFullLabel, latestWeightEntry } from "@/lib/weight";
import { useWeightEntries, type UseWeightEntriesResult } from "@/hooks/use-weight-entries";
import { cn } from "@/lib/utils";
import { EmptyState } from "../shared/empty-state";
import { RealBadge, StageBadge } from "../shared/badges";
import { WeightLogCard } from "../shared/weight-log-card";

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
  icon: typeof Scale;
  /** نشان سمت چپ کارت — بر اساس منبع واقعی داده انتخاب می‌شود */
  badge: React.ReactNode;
}

function StatCard({ label, value, note, icon: Icon, badge }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 transition-colors duration-200 hover:border-primary/25">
      <div className="flex items-start justify-between gap-2">
        <span className="flex size-10 items-center justify-center rounded-xl border border-border/50 bg-secondary/50 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
          <Icon className="size-4.5" strokeWidth={2} aria-hidden="true" />
        </span>
        {badge}
      </div>
      <p className="mt-4 text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight text-foreground/90">{value}</p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground/80">{note}</p>
    </div>
  );
}

/** نشان «واقعی» برای کارت‌هایی که داده واقعی دارند */
function LiveBadge() {
  return <RealBadge />;
}

/** نشان «ثبت نشده» — داده کاربر هنوز وارد نشده (نه قابلیت ساخته‌نشده) */
function NotRecordedBadge() {
  return (
    <span className="inline-flex items-center rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      ثبت نشده
    </span>
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

/* ------------------------------ شروع مسیر تناسب اندام ------------------------------ */

interface JourneyStep {
  icon: typeof UserRound;
  title: string;
  description: string;
  done: boolean;
  target: ViewId | null;
}

function JourneyStepRow({ step, index }: { step: JourneyStep; index: number }) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const Icon = step.icon;

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border p-3 transition-colors",
        step.done
          ? "border-primary/25 bg-primary/5"
          : "border-border/50 bg-secondary/20"
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold",
          step.done
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-border/50 bg-secondary/40 text-muted-foreground"
        )}
        aria-hidden="true"
      >
        {step.done ? <CircleCheck className="size-4" /> : faDigits(index + 1)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-xs font-bold leading-6", step.done ? "text-primary" : "text-foreground")}>
          {step.title}
        </p>
        <p className="mt-0.5 text-[10px] leading-5 text-muted-foreground/80">{step.description}</p>
        {!step.done && step.target && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView(step.target as ViewId)}
            className="mt-2 h-7 border-border/70 px-2.5 text-[11px] font-semibold hover:border-primary/40 hover:text-primary"
          >
            <Icon className="size-3.5" aria-hidden="true" />
            انجام این گام
            <ChevronLeft className="size-3.5" aria-hidden="true" />
          </Button>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold",
          step.done
            ? "border border-primary/30 bg-primary/10 text-primary"
            : "border border-border/50 bg-secondary/40 text-muted-foreground"
        )}
      >
        {step.done ? "انجام شد" : "در انتظار"}
      </span>
    </li>
  );
}

function JourneyCard() {
  const { user, profile } = useSessionData();
  const visited = useJourneyStore((s) => s.visited);

  if (!user) return null;

  const goalSet = Boolean(profile?.goal);
  const steps: JourneyStep[] = [
    {
      icon: UserRound,
      title: "تکمیل پروفایل بدنی",
      description: "قد، وزن، سن و مشخصات اصلی در پایگاه داده سرور",
      done: Boolean(profile?.complete),
      target: "profile",
    },
    {
      icon: Target,
      title: "تعیین هدف تناسب اندام",
      description: "هدف ثبت‌شده مبنای برنامه‌ها و پیشنهادها خواهد بود",
      done: goalSet,
      target: "profile",
    },
    {
      icon: Box,
      title: "آشنایی با کتابخانه حرکات و مربی سه‌بعدی",
      description: "بازدید واقعی هر دو بخش روی همین دستگاه ثبت می‌شود",
      done: Boolean(visited.library && visited.coach3d),
      target: !visited.coach3d ? "coach3d" : "library",
    },
    {
      icon: CalendarCheck2,
      title: "رفتن به بخش برنامه تمرینی",
      description: "برنامه‌ساز در مرحله ۶ فعال می‌شود؛ بازدید شما ثبت می‌ماند",
      done: Boolean(visited.workout),
      target: "workout",
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const percent = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="h-full rounded-2xl bg-gradient-to-b from-primary/40 via-primary/15 to-primary/5 p-px">
      <div className="flex h-full flex-col rounded-2xl bg-card p-5 md:p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 text-primary glow-lime-sm">
            <Compass className="size-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h3 className="text-sm font-bold">شروع مسیر تناسب اندام</h3>
            <p className="text-[11px] text-muted-foreground">
              وضعیت گام‌ها فقط بر اساس اطلاعات واقعی شماست
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] font-bold">
          <span className="text-foreground">
            {faDigits(doneCount)} از {faDigits(steps.length)} گام کامل شد
          </span>
          <span className="text-primary">{faDigits(percent)}٪</span>
        </div>
        <Progress value={percent} className="mt-1.5 h-1.5" aria-label="پیشرفت مسیر شروع" />

        <ol className="mt-4 flex flex-col gap-2.5">
          {steps.map((step, index) => (
            <JourneyStepRow key={step.title} step={step} index={index} />
          ))}
        </ol>

        {doneCount === steps.length ? (
          <p className="mt-auto flex items-start gap-1.5 pt-4 text-[10px] leading-5 text-primary">
            <CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            همه گام‌های آغازین کامل شد — منتظر برنامه‌ساز تمرینی در مرحله ۶ باشید.
          </p>
        ) : (
          <p className="mt-auto pt-4 text-[10px] leading-5 text-muted-foreground/70">
            گام‌های ۱ و ۲ از پایگاه داده سرور خوانده می‌شوند؛ گام‌های ۳ و ۴ بر اساس بازدید
            واقعی شما روی همین دستگاه ثبت می‌شوند.
          </p>
        )}
      </div>
    </div>
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
          <Sparkles className="size-4" aria-hidden="true" />
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
  const profileNavItem = getNavItem("profile");
  const { user, profile: fitnessProfile } = useSessionData();

  // داده وزن یک‌بار در داشبورد خوانده می‌شود و به کارت روند وزن پاس داده می‌شود
  const weightData: UseWeightEntriesResult = useWeightEntries();
  const latestWeight = latestWeightEntry(weightData.entries);

  const displayName = fitnessProfile?.displayName ?? user?.name ?? "";
  const goalLabel = fitnessProfile?.goal ? labelOf(GOAL_OPTIONS, fitnessProfile.goal) : null;
  const experienceLabel = fitnessProfile?.experience
    ? labelOf(EXPERIENCE_OPTIONS, fitnessProfile.experience)
    : null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col gap-6">
      {/* بخش خوشامدگویی شخصی — از حساب واقعی کاربر */}
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
              مرکز مسیر تناسب اندام شما
            </span>
            <h2 id="welcome-heading" className="mt-4 text-2xl font-extrabold leading-snug md:text-3xl">
              سلام <span className="text-primary text-glow">{displayName || "ورزشکار"}؛</span>
              {" "}خوش برگشتی
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              این داشبورد به حساب واقعی شما متصل است؛ همه اطلاعات از پایگاه داده سرور خوانده
              می‌شود و پس از هر تغییر در پروفایل، بلافاصله به‌روز می‌شود.
            </p>

            {/* مشخصات واقعی پروفایل — فقط مقادیر ثبت‌شده نمایش داده می‌شوند */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-[11px] font-bold text-foreground/90">
                <Target className="size-3.5 text-primary" aria-hidden="true" />
                هدف:
                {goalLabel ? (
                  <span className="text-primary">{goalLabel}</span>
                ) : (
                  <span className="font-medium text-muted-foreground">ثبت نشده</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-[11px] font-bold text-foreground/90">
                <Dumbbell className="size-3.5 text-primary" aria-hidden="true" />
                سطح تجربه:
                {experienceLabel ? (
                  <span className="text-primary">{experienceLabel}</span>
                ) : (
                  <span className="font-medium text-muted-foreground">ثبت نشده</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-[11px] font-bold text-foreground/90">
                <CircleCheck className="size-3.5 text-primary" aria-hidden="true" />
                تکمیل پروفایل:
                <span className="text-primary">
                  {faDigits(fitnessProfile?.completionPercent ?? 0)}٪
                </span>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setActiveView(profileNavItem.id)}
                className="font-bold text-primary-foreground glow-lime-sm"
              >
                <UserRoundCog className="size-4" aria-hidden="true" />
                {fitnessProfile?.complete ? "ویرایش پروفایل" : "تکمیل پروفایل"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveView("coach3d")}
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
              >
                آشنایی با مربی سه‌بعدی
              </Button>
            </div>
          </div>
          {/* عنصر تزئینی — با هویت «داده واقعی» */}
          <div className="hidden shrink-0 md:block" aria-hidden="true">
            <div className="relative flex size-36 items-center justify-center rounded-3xl border border-primary/20 bg-primary/5">
              <div className="absolute inset-3 rounded-2xl border border-dashed border-primary/15" />
              <Dumbbell className="size-14 text-primary/70" strokeWidth={1.4} />
              <span className="absolute -bottom-3 rounded-full border border-primary/30 bg-background px-3 py-1 text-[10px] font-bold text-primary">
                متصل به پایگاه داده سرور
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* کارت‌های آماری — فقط داده واقعی؛ برای داده ثبت‌نشده مقدار جعلی نمایش داده نمی‌شود */}
      <motion.section variants={fadeUp} aria-label="خلاصه آمار شما">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* وزن فعلی — وزن اعلامی پروفایل کاربر (ویرایش پروفایل بلافاصله منعکس می‌شود)؛
              روند تغییرات فقط از اندازه‌گیری‌های تاریخ‌دار در کارت «روند وزن» */}
          <StatCard
            label="وزن فعلی"
            value={
              fitnessProfile?.weightKg
                ? `${faDigits(fitnessProfile.weightKg)} کیلوگرم`
                : latestWeight
                  ? `${faDigits(latestWeight.weightKg)} کیلوگرم`
                  : "—"
            }
            note={
              fitnessProfile?.weightKg
                ? latestWeight
                  ? `وزن پروفایل شما؛ آخرین اندازه‌گیری ثبت‌شده: ${faDigits(latestWeight.weightKg)} در ${jalaliFullLabel(latestWeight.recordedAt)}`
                  : "وزن ثبت‌شده در پروفایل شما؛ برای روند تغییرات، وزن دوره‌ای ثبت کنید"
                : latestWeight
                  ? `آخرین اندازه‌گیری: ${jalaliFullLabel(latestWeight.recordedAt)}`
                  : "وزن شما هنوز ثبت نشده است؛ از پروفایل یا کارت روند وزن ثبت کنید"
            }
            icon={Scale}
            badge={fitnessProfile?.weightKg || latestWeight ? <LiveBadge /> : <NotRecordedBadge />}
          />
          {/* قد */}
          <StatCard
            label="قد"
            value={fitnessProfile?.heightCm ? `${faDigits(fitnessProfile.heightCm)} سانتی‌متر` : "—"}
            note={
              fitnessProfile?.heightCm
                ? "قد ثبت‌شده در پروفایل شما"
                : "قد شما هنوز در پروفایل ثبت نشده است"
            }
            icon={Ruler}
            badge={fitnessProfile?.heightCm ? <LiveBadge /> : <NotRecordedBadge />}
          />
          {/* هدف فعلی */}
          <StatCard
            label="هدف تمرینی"
            value={goalLabel ?? "—"}
            note={
              goalLabel
                ? "هدف انتخابی شما مبنای برنامه‌های مراحل بعد خواهد بود"
                : "هدف تمرینی هنوز انتخاب نشده؛ از پروفایل قابل تنظیم است"
            }
            icon={Target}
            badge={goalLabel ? <LiveBadge /> : <NotRecordedBadge />}
          />
          {/* جلسات ثبت‌شده — بدون تاریخچه واقعی هیچ عددی نمایش داده نمی‌شود */}
          <StatCard
            label="جلسات تمرینی ثبت‌شده"
            value="—"
            note="با فعال شدن برنامه‌ساز تمرینی، تعداد جلسات واقعی شما اینجا شمرده می‌شود"
            icon={CalendarCheck2}
            badge={<StageBadge stage={6} />}
          />
        </div>
      </motion.section>

      {/* شبکه اصلی */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* برنامه امروز — فقط برنامه واقعی؛ در نبود آن حالت خالی صادقانه */}
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
            <StageBadge stage={6} className="ms-auto" />
          </div>
          <EmptyState
            icon={ClipboardList}
            title="هنوز برنامه تمرینی در پایگاه داده ندارید"
            description="برنامه‌ساز تمرینی در مرحله ۶ فعال می‌شود؛ آن‌گاه برنامه‌ای که واقعاً بر اساس هدف، سطح و تجهیزات شما ساخته شود، اینجا نمایش داده خواهد شد. فعلاً هیچ برنامه‌ای بدون داده واقعی ساخته نمی‌شود."
            action={
              <Button
                variant="outline"
                onClick={() => setActiveView("workout")}
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
              >
                رفتن به بخش برنامه تمرینی
                <ChevronLeft className="size-4" aria-hidden="true" />
              </Button>
            }
          />
        </motion.section>

        {/* شروع مسیر تناسب اندام — ۴ گام با وضعیت واقعی */}
        <motion.section variants={fadeUp} aria-label="شروع مسیر تناسب اندام" className="lg:col-span-1">
          <JourneyCard />
        </motion.section>

        {/* روند وزن — فقط از اندازه‌گیری‌های واقعی کاربر */}
        <motion.section variants={fadeUp} aria-label="روند وزن شما" className="lg:col-span-2">
          <WeightLogCard variant="dashboard" data={weightData} />
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
