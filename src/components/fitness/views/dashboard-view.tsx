"use client";

import { motion, type Variants } from "framer-motion";
import {
  CalendarCheck2,
  ChevronLeft,
  Box,
  Dumbbell,
  UserRoundCog,
  Sparkles,
  CircleCheck,
  Play,
  Scale,
  Ruler,
  Target,
  UserRound,
  Compass,
} from "lucide-react";
import { toast } from "sonner";
import { useCallback } from "react";
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
import { latestWeightEntry } from "@/lib/weight";
import { useWeightEntries, type UseWeightEntriesResult } from "@/hooks/use-weight-entries";
import { useWorkoutPlans } from "@/hooks/use-workout-plans";
import { useNutritionPlans } from "@/hooks/use-nutrition-plans";
import { usePlanDetail } from "@/hooks/use-plan-detail";
import { useActiveSession, useWorkoutStats } from "@/hooks/use-workout-sessions";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { localeNumber, localeFullLabel } from "@/lib/i18n/format";
import { dashboardStrings } from "@/lib/i18n/sections/dashboard";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { RealBadge } from "../shared/badges";
import { WeightLogCard } from "../shared/weight-log-card";
import { TodaySessionCard } from "../shared/today-session-card";
import { NutritionSummaryCard } from "../shared/nutrition-summary-card";

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
  const t = useStrings(dashboardStrings);
  return (
    <span className="inline-flex items-center rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
      {t.notRecordedBadge}
    </span>
  );
}

/* ------------------------------- دسترسی سریع (ردیفی) ------------------------------- */

const QUICK_LINKS: ViewId[] = ["coach3d", "library", "workout", "nutrition"];

function QuickLinkRow({ item }: { item: NavItem }) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const locale = useLocale();
  const Icon = item.icon;
  // عنوان اصلی به زبان رابط؛ زیرعنوان زبان دیگر (فارسی: لاتین با dir=ltr، انگلیسی: فارسی)
  const mainTitle = locale === "fa" ? item.fa : item.en;
  const subTitle = locale === "fa" ? item.en : item.fa;
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
        <span className="block truncate text-[13px] font-bold text-foreground">{mainTitle}</span>
        <span dir={locale === "fa" ? "ltr" : "rtl"} className="block text-[10px] text-muted-foreground/70">
          {subTitle}
        </span>
      </span>
      {/* آیکن جهت‌دار «جلو» — ظاهر فعلی RTL حفظ می‌شود؛ در LTR آینه می‌شود */}
      <ChevronLeft
        className="size-4 shrink-0 text-muted-foreground/40 transition-all group-hover:-translate-x-0.5 group-hover:text-primary ltr:rotate-180"
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
  const t = useStrings(dashboardStrings);
  const locale = useLocale();
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
        {step.done ? <CircleCheck className="size-4" /> : localeNumber(index + 1, locale)}
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
            {t.journeyStepDoThis}
            {/* آیکن جهت‌دار «جلو» — ظاهر فعلی RTL حفظ می‌شود؛ در LTR آینه می‌شود */}
            <ChevronLeft className="size-3.5 ltr:rotate-180" aria-hidden="true" />
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
        {step.done ? t.journeyDoneBadge : t.journeyPendingBadge}
      </span>
    </li>
  );
}

function JourneyCard({ hasActivePlan }: { hasActivePlan: boolean }) {
  const { user, profile } = useSessionData();
  const visited = useJourneyStore((s) => s.visited);
  const t = useStrings(dashboardStrings);
  const locale = useLocale();

  if (!user) return null;

  const goalSet = Boolean(profile?.goal);
  const steps: JourneyStep[] = [
    {
      icon: UserRound,
      title: t.journeyStepProfileTitle,
      description: t.journeyStepProfileDesc,
      done: Boolean(profile?.complete),
      target: "profile",
    },
    {
      icon: Target,
      title: t.journeyStepGoalTitle,
      description: t.journeyStepGoalDesc,
      done: goalSet,
      target: "profile",
    },
    {
      icon: Box,
      title: t.journeyStepLibraryTitle,
      description: t.journeyStepLibraryDesc,
      done: Boolean(visited.library && visited.coach3d),
      target: !visited.coach3d ? "coach3d" : "library",
    },
    {
      icon: CalendarCheck2,
      title: t.journeyStepPlanTitle,
      description: t.journeyStepPlanDesc,
      done: Boolean(visited.workout) || hasActivePlan,
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
            <h3 className="text-sm font-bold">{t.journeyTitle}</h3>
            <p className="text-[11px] text-muted-foreground">{t.journeySubtitle}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px] font-bold">
          <span className="text-foreground">
            {t.journeyProgress(localeNumber(doneCount, locale), localeNumber(steps.length, locale))}
          </span>
          <span className="text-primary">{t.percentLabel(localeNumber(percent, locale))}</span>
        </div>
        <Progress value={percent} className="mt-1.5 h-1.5" aria-label={t.journeyProgressAria} />

        <ol className="mt-4 flex flex-col gap-2.5">
          {steps.map((step, index) => (
            <JourneyStepRow key={step.title} step={step} index={index} />
          ))}
        </ol>

        {doneCount === steps.length ? (
          <p className="mt-auto flex items-start gap-1.5 pt-4 text-[10px] leading-5 text-primary">
            <CircleCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {t.journeyAllDone}
          </p>
        ) : (
          <p className="mt-auto pt-4 text-[10px] leading-5 text-muted-foreground/70">
            {t.journeySourceNote}
          </p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- نقشه راه --------------------------------- */

function StageRow({ index, title, current }: { index: number; title: string; current: boolean }) {
  const t = useStrings(dashboardStrings);
  const locale = useLocale();
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
          {localeNumber(index, locale)}
        </span>
        {title}
      </span>
      {current && (
        <span className="ms-auto shrink-0 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {t.roadmapCurrentBadge}
        </span>
      )}
    </li>
  );
}

function RoadmapCard() {
  const t = useStrings(dashboardStrings);
  const locale = useLocale();
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h3 className="text-sm font-bold">{t.roadmapTitle}</h3>
          <p className="text-[11px] text-muted-foreground">{t.roadmapSubtitle}</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
        {DEV_STAGES.map((stage) => (
          <StageRow
            key={stage.index}
            index={stage.index}
            title={locale === "fa" ? stage.title : stage.titleEn}
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
  const t = useStrings(dashboardStrings);
  const sh = useStrings(sharedStrings);
  const locale = useLocale();

  // داده وزن یک‌بار در داشبورد خوانده می‌شود و به کارت روند وزن پاس داده می‌شود
  const weightData: UseWeightEntriesResult = useWeightEntries();
  const latestWeight = latestWeightEntry(weightData.entries);

  // برنامه فعال کاربر — برای «برنامه امروز» و گام ۴ مسیر شروع
  const { plans, loading: plansLoading } = useWorkoutPlans();
  const activePlanSummary = plans.find((p) => p.status === "active") ?? null;
  const activePlan = usePlanDetail(activePlanSummary?.id ?? null).plan;

  // برنامه غذایی فعال — خلاصه برای کارت تغذیه داشبورد
  const { plans: nutritionPlans, loading: nutritionLoading } = useNutritionPlans();
  const activeNutritionPlan = nutritionPlans.find((p) => p.status === "active") ?? null;

  // جلسه واقعی در حال انجام — بنر ادامه جلسه + قفل شروع دومی
  const sessionCtrl = useActiveSession();
  const activeWorkout = sessionCtrl.session;
  const hasActiveSession = activeWorkout?.status === "in_progress";

  // آمار واقعی جلسات تکمیل‌شده — شمار هفته جاری فقط از جلسات بسته‌شده
  const { stats: workoutStats, loading: statsLoading } = useWorkoutStats();

  const startDayFromDashboard = useCallback(
    async (dayId: string) => {
      const result = await sessionCtrl.startSession({ planDayId: dayId });
      if (result.ok) {
        if (result.data.existing) {
          toast.info(t.toastSessionExists);
        } else {
          toast.success(t.toastSessionStarted);
        }
      } else {
        toast.error(result.message);
      }
    },
    [sessionCtrl, t]
  );

  const displayName = fitnessProfile?.displayName ?? user?.name ?? "";
  // برچسب نمایشی هدف/سطح — نقشه نمایشی دوزبانه روی value پایدار پروفایل
  const goalLabel = fitnessProfile?.goal ? sh.goalLabel(fitnessProfile.goal) : null;
  const experienceLabel = fitnessProfile?.experience
    ? sh.experienceLabel(fitnessProfile.experience)
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
              {t.welcomeBadge}
            </span>
            <h2 id="welcome-heading" className="mt-4 text-2xl font-extrabold leading-snug md:text-3xl">
              {t.welcomeGreetingPrefix}{" "}
              <span className="text-primary text-glow">
                {displayName || t.defaultAthlete}
                {t.welcomeGreetingSuffix}
              </span>{" "}
              {t.welcomeBack}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{t.welcomeConnected}</p>

            {/* مشخصات واقعی پروفایل — فقط مقادیر ثبت‌شده نمایش داده می‌شوند */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-[11px] font-bold text-foreground/90">
                <Target className="size-3.5 text-primary" aria-hidden="true" />
                {t.goalChipLabel}
                {goalLabel ? (
                  <span className="text-primary">{goalLabel}</span>
                ) : (
                  <span className="font-medium text-muted-foreground">{t.notRecordedBadge}</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-[11px] font-bold text-foreground/90">
                <Dumbbell className="size-3.5 text-primary" aria-hidden="true" />
                {t.experienceChipLabel}
                {experienceLabel ? (
                  <span className="text-primary">{experienceLabel}</span>
                ) : (
                  <span className="font-medium text-muted-foreground">{t.notRecordedBadge}</span>
                )}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-[11px] font-bold text-foreground/90">
                <CircleCheck className="size-3.5 text-primary" aria-hidden="true" />
                {t.completionChipLabel}
                <span className="text-primary">
                  {t.percentLabel(localeNumber(fitnessProfile?.completionPercent ?? 0, locale))}
                </span>
              </span>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setActiveView(profileNavItem.id)}
                className="font-bold text-primary-foreground glow-lime-sm"
              >
                <UserRoundCog className="size-4" aria-hidden="true" />
                {fitnessProfile?.complete ? t.editProfile : t.completeProfile}
              </Button>
              <Button
                variant="outline"
                onClick={() => setActiveView("coach3d")}
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
              >
                {t.tryCoach3d}
              </Button>
            </div>
          </div>
          {/* عنصر تزئینی — با هویت «داده واقعی» */}
          <div className="hidden shrink-0 md:block" aria-hidden="true">
            <div className="relative flex size-36 items-center justify-center rounded-3xl border border-primary/20 bg-primary/5">
              <div className="absolute inset-3 rounded-2xl border border-dashed border-primary/15" />
              <Dumbbell className="size-14 text-primary/70" strokeWidth={1.4} />
              <span className="absolute -bottom-3 rounded-full border border-primary/30 bg-background px-3 py-1 text-[10px] font-bold text-primary">
                {t.connectedToServerDb}
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* کارت‌های آماری — فقط داده واقعی؛ برای داده ثبت‌نشده مقدار جعلی نمایش داده نمی‌شود */}
      <motion.section variants={fadeUp} aria-label={t.statsAria}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* وزن فعلی — وزن اعلامی پروفایل کاربر (ویرایش پروفایل بلافاصله منعکس می‌شود)؛
              روند تغییرات فقط از اندازه‌گیری‌های تاریخ‌دار در کارت «روند وزن» */}
          <StatCard
            label={t.statWeightLabel}
            value={
              fitnessProfile?.weightKg
                ? `${localeNumber(fitnessProfile.weightKg, locale)} ${t.kilogramUnit}`
                : latestWeight
                  ? `${localeNumber(latestWeight.weightKg, locale)} ${t.kilogramUnit}`
                  : t.emptyValue
            }
            note={
              fitnessProfile?.weightKg
                ? latestWeight
                  ? t.statWeightNoteProfileWithLatest(
                      localeNumber(latestWeight.weightKg, locale),
                      localeFullLabel(latestWeight.recordedAt, locale)
                    )
                  : t.statWeightNoteProfileOnly
                : latestWeight
                  ? t.statWeightNoteLatest(localeFullLabel(latestWeight.recordedAt, locale))
                  : t.statWeightNoteEmpty
            }
            icon={Scale}
            badge={fitnessProfile?.weightKg || latestWeight ? <LiveBadge /> : <NotRecordedBadge />}
          />
          {/* قد */}
          <StatCard
            label={t.statHeightLabel}
            value={fitnessProfile?.heightCm ? `${localeNumber(fitnessProfile.heightCm, locale)} ${t.centimeterUnit}` : t.emptyValue}
            note={
              fitnessProfile?.heightCm
                ? t.statHeightNoteSet
                : t.statHeightNoteEmpty
            }
            icon={Ruler}
            badge={fitnessProfile?.heightCm ? <LiveBadge /> : <NotRecordedBadge />}
          />
          {/* هدف فعلی */}
          <StatCard
            label={t.statGoalLabel}
            value={goalLabel ?? t.emptyValue}
            note={
              goalLabel
                ? t.statGoalNoteSet
                : t.statGoalNoteEmpty
            }
            icon={Target}
            badge={goalLabel ? <LiveBadge /> : <NotRecordedBadge />}
          />
          {/* جلسات تکمیل‌شده این هفته — فقط جلسات واقعی پایان‌یافته؛ بدون جلسه صفر صادقانه */}
          <StatCard
            label={t.statSessionsLabel}
            value={statsLoading ? t.statsLoadingValue : localeNumber(workoutStats?.thisWeek.completedSessions ?? 0, locale)}
            note={
              statsLoading
                ? t.statSessionsNoteLoading
                : (workoutStats?.thisWeek.completedSessions ?? 0) === 0
                  ? t.statSessionsNoteZero
                  : t.statSessionsNoteSummary(
                      localeNumber(workoutStats!.thisWeek.setsCompleted, locale),
                      localeNumber(workoutStats!.thisWeek.repsTotal, locale)
                    )
            }
            icon={CalendarCheck2}
            badge={<LiveBadge />}
          />
        </div>
      </motion.section>

      {/* شبکه اصلی */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* بنر جلسه در حال انجام — دسترسی سریع به رکوردر */}
        {hasActiveSession && activeWorkout && (
          <motion.section
            variants={fadeUp}
            aria-label={t.activeSessionAria}
            className="rounded-2xl border border-primary/30 bg-primary/5 p-5 md:p-6 lg:col-span-3"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold">{t.activeSessionTitle(activeWorkout.title)}</h3>
                <p className="mt-0.5 text-[10px] leading-5 text-muted-foreground">
                  {t.activeSessionNote}
                </p>
              </div>
              <Button
                onClick={() => setActiveView("workout")}
                className="font-bold text-primary-foreground glow-lime-sm"
              >
                <Play className="size-4" aria-hidden="true" />
                {t.continueSession}
              </Button>
            </div>
          </motion.section>
        )}

        {/* برنامه امروز — فقط برنامه واقعی ذخیره‌شده کاربر */}
        <motion.section
          variants={fadeUp}
          aria-label={t.todayPlanAria}
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 lg:col-span-2"
        >
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
              <CalendarCheck2 className="size-4" aria-hidden="true" />
            </span>
            <h3 className="text-sm font-bold">{t.todayPlanTitle}</h3>
            {activePlan && <RealBadge className="ms-auto" />}
          </div>
          {plansLoading ? (
            <div className="h-32 animate-pulse rounded-xl bg-secondary/20" />
          ) : (
            <TodaySessionCard
              plan={activePlan}
              sessionActive={hasActiveSession}
              onStartDay={(dayId) => void startDayFromDashboard(dayId)}
            />
          )}
        </motion.section>

        {/* شروع مسیر تناسب اندام — ۴ گام با وضعیت واقعی */}
        <motion.section variants={fadeUp} aria-label={t.journeyAria} className="lg:col-span-1">
          <JourneyCard hasActivePlan={Boolean(activePlan)} />
        </motion.section>

        {/* روند وزن — فقط از اندازه‌گیری‌های واقعی کاربر */}
        <motion.section variants={fadeUp} aria-label={t.weightTrendAria} className="lg:col-span-2">
          <WeightLogCard variant="dashboard" data={weightData} />
        </motion.section>

        {/* برنامه غذایی فعال — خلاصه واقعی؛ بدون کالری مصرف‌شده جعلی */}
        <motion.section variants={fadeUp} aria-label={t.nutritionAria} className="lg:col-span-1">
          <NutritionSummaryCard plan={activeNutritionPlan} loading={nutritionLoading} />
        </motion.section>

        {/* دسترسی سریع */}
        <motion.section
          variants={fadeUp}
          aria-label={t.quickAccessAria}
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6 lg:col-span-1"
        >
          <h3 className="mb-3 text-sm font-bold">{t.quickAccessTitle}</h3>
          <div className="flex flex-col gap-1">
            {QUICK_LINKS.map((id) => {
              const item = getNavItem(id);
              return <QuickLinkRow key={id} item={item} />;
            })}
          </div>
          <p className="mt-3 border-t border-border/50 pt-3 text-[10px] leading-5 text-muted-foreground/70">
            {t.quickAccessNote}
          </p>
        </motion.section>
      </div>

      {/* نقشه راه توسعه */}
      <motion.section variants={fadeUp} aria-label={t.roadmapAria}>
        <RoadmapCard />
      </motion.section>
    </motion.div>
  );
}
