"use client";

/**
 * بخش برنامه تمرینی — برنامه‌ساز شخصی + ثبت تمرین واقعی.
 *
 * منطق نمایش (مرتب با اولویت):
 *  ۱. جلسه در حال انجام → رکوردر ثبت ست‌ها (بازیابی‌شده از سرور پس از رفرش)
 *  ۲. بدون جلسه فعال → برنامه فعال با دکمه «شروع تمرین» هر روز + تمرین آزاد
 *  ۳. مدیریت برنامه‌ها (فعال‌سازی/بایگانی/حذف) بدون تغییر
 *
 * قاعده صادقانه: بازدید از این صفحه هرگز جلسه نمی‌سازد؛ جلسه فقط با کلیک
 * صریح «شروع تمرین» ساخته می‌شود و هر ست با اقدام واقعی کاربر ثبت می‌گردد.
 */

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  ArchiveRestore,
  Archive,
  CalendarCheck2,
  ChevronRight,
  CircleAlert,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  ListPlus,
} from "lucide-react";
import { getNavItem } from "@/lib/nav";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { useSessionData } from "../../session-context";
import { useWorkoutPlans } from "@/hooks/use-workout-plans";
import { usePlanDetail } from "@/hooks/use-plan-detail";
import { useActiveSession } from "@/hooks/use-workout-sessions";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { planTitleFromFields } from "@/lib/i18n/engine-content";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import { localeNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { ViewIntro } from "../../shared/view-intro";
import { EmptyState } from "../../shared/empty-state";
import { RealBadge, StageBadge } from "../../shared/badges";
import type { GeneratedPlan, PlanSettings } from "@/lib/plan-engine/types";
import type { WorkoutPlanSummaryClient } from "@/lib/plan-storage";
import { PlanSettingsForm } from "./plan-settings-form";
import { PlanPreview } from "./plan-preview";
import { PlanDetail } from "./plan-detail";
import { ActiveSessionRecorder } from "./session/active-session";
import { StartFreeWorkoutDialog } from "./session/start-free-dialog";

type Mode = "list" | "form" | "preview";

function StatusChip({ status }: { status: "active" | "archived" }) {
  const t = useStrings(workoutStrings);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold",
        status === "active"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/50 bg-secondary/40 text-muted-foreground"
      )}
    >
      {status === "active" ? t.statusActive : t.statusArchivedPlan}
    </span>
  );
}

function PlanSummaryCard({
  plan,
  active,
  busy,
  onOpen,
  onActivate,
  onDelete,
}: {
  plan: WorkoutPlanSummaryClient;
  active: boolean;
  busy: boolean;
  onOpen: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border p-4",
        active ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-xs font-bold text-foreground">{planTitleFromFields(plan.goal, plan.daysPerWeek, plan.focus, locale) || plan.title}</p>
          <StatusChip status={plan.status} />
        </div>
        <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
          {t.planSummaryLine(
            plan.daysPerWeek,
            plan.totalExercises,
            t.planGoalLabel(plan.goal),
            t.planExperienceLabel(plan.experience)
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {active ? (
          <Button
            size="sm"
            onClick={onOpen}
            className="h-7 bg-primary/15 px-2.5 text-[10px] font-bold text-primary hover:bg-primary/25"
          >
            {t.viewPlan}
            <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onActivate}
            className="h-7 border-border/70 px-2.5 text-[10px] font-semibold hover:border-primary/40 hover:text-primary"
          >
            <ArchiveRestore className="size-3" aria-hidden="true" />
            {t.activate}
          </Button>
        )}
        {!active && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={onDelete}
            className="h-7 border-destructive/30 px-2 text-[10px] font-semibold text-rose-300 hover:bg-destructive/10"
          >
            <Trash2 className="size-3" aria-hidden="true" />
            {t.deleteAction}
          </Button>
        )}
      </div>
    </div>
  );
}

function SkeletonView() {
  return (
    <div className="flex flex-col gap-4">
      <div className="h-20 animate-pulse rounded-2xl bg-secondary/30" />
      <div className="h-28 animate-pulse rounded-2xl bg-secondary/20" />
      <div className="h-40 animate-pulse rounded-2xl bg-secondary/10" />
    </div>
  );
}

export function WorkoutView() {
  const item = getNavItem("workout");
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  const dir = useDir();
  const { profile } = useSessionData();
  const setActiveView = useAppStore((s) => s.setActiveView);
  const {
    plans,
    loading,
    error,
    refresh,
    previewPlan,
    createPlan,
    updatePlan,
    deletePlan,
    creating,
    deletingId,
  } = useWorkoutPlans();

  // جلسه واقعی — بازیابی خودکار پس از رفرش یا بازگشت از مربی سه‌بعدی
  const sessionCtrl = useActiveSession();
  const activeWorkout = sessionCtrl.session;
  const hasActiveSession = activeWorkout?.status === "in_progress";

  const [mode, setMode] = useState<Mode>("list");
  const [preview, setPreview] = useState<GeneratedPlan | null>(null);
  const [settings, setSettings] = useState<PlanSettings | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlanSummaryClient | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [freeDialogOpen, setFreeDialogOpen] = useState(false);
  const [startingFree, setStartingFree] = useState(false);
  const [startingDayId, setStartingDayId] = useState<string | null>(null);

  const activePlanSummary = plans.find((p) => p.status === "active") ?? null;
  const archivedPlans = plans.filter((p) => p.status !== "active");
  // جزئیات برنامه فعال — پس از هر تغییر فهرست دوباره خوانده می‌شود
  const activeDetail = usePlanDetail(mode === "list" ? activePlanSummary?.id ?? null : null);

  /* ------------------------------ شروع جلسه واقعی ------------------------------ */

  const handleStartDay = useCallback(
    async (dayId: string) => {
      setStartingDayId(dayId);
      const result = await sessionCtrl.startSession({ planDayId: dayId });
      setStartingDayId(null);
      if (result.ok) {
        if (result.data.existing) {
          toast.info(t.anotherSessionToast);
        } else {
          toast.success(t.planSessionStartedToast);
        }
      } else {
        toast.error(result.message);
      }
    },
    [sessionCtrl, t]
  );

  const handleStartFree = useCallback(
    async (exerciseIds: string[]) => {
      setStartingFree(true);
      const result = await sessionCtrl.startSession({
        exercises: exerciseIds.map((exerciseId) => ({ exerciseId })),
      });
      setStartingFree(false);
      if (result.ok) {
        if (result.data.existing) {
          toast.info(t.anotherSessionToast);
        } else {
          toast.success(t.freeSessionStartedToast);
        }
        return true;
      }
      toast.error(result.message);
      return false;
    },
    [sessionCtrl, t]
  );

  /* ------------------------------ ساخت برنامه ------------------------------ */

  const handleFormSubmit = useCallback(
    async (candidate: PlanSettings) => {
      setFormError(null);
      setSettings(candidate);
      const result = await previewPlan(candidate);
      if (result.ok) {
        setPreview(result.data);
        setMode("preview");
      } else {
        setFormError(result.message);
      }
    },
    [previewPlan]
  );

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaveError(null);
    const result = await createPlan(settings);
    if (result.ok) {
      setPreview(null);
      setSettings(null);
      setMode("list");
      toast.success(t.planSavedToast);
    } else {
      setSaveError(result.message);
    }
  }, [createPlan, settings, t]);

  const handleActivate = useCallback(
    async (id: string) => {
      setBusyId(id);
      const result = await updatePlan(id, { status: "active" });
      setBusyId(null);
      if (result.ok) {
        toast.success(t.planActivatedToast);
      } else {
        toast.error(result.message);
      }
    },
    [updatePlan, t]
  );

  const handleArchive = useCallback(
    async (id: string) => {
      setBusyId(id);
      const result = await updatePlan(id, { status: "archived" });
      setBusyId(null);
      if (result.ok) {
        toast.success(t.planArchivedToast);
      } else {
        toast.error(result.message);
      }
    },
    [updatePlan, t]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const result = await deletePlan(deleteTarget.id);
    if (result.ok) {
      toast.success(t.planDeletedToast);
    } else {
      toast.error(result.message);
    }
    setDeleteTarget(null);
  }, [deletePlan, deleteTarget, t]);

  /* ------------------------------ حالت‌ها ------------------------------ */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro item={item} badges={<RealBadge />} />

      {sessionCtrl.loading && loading && <SkeletonView />}

      {sessionCtrl.error && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-center">
          <p className="text-xs font-bold leading-6 text-rose-200">{sessionCtrl.error}</p>
          <Button
            variant="outline"
            onClick={() => void sessionCtrl.refresh()}
            className="mt-3 border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            {t.retry}
          </Button>
        </div>
      )}

      {/* ۱) جلسه در حال انجام — رکوردر ثبت واقعی */}
      {hasActiveSession && activeWorkout && <ActiveSessionRecorder ctrl={sessionCtrl} />}

      {!sessionCtrl.loading && !sessionCtrl.error && (
        <>
          {loading && <SkeletonView />}

          {!loading && error && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
              <CircleAlert className="mx-auto size-6 text-rose-300" aria-hidden="true" />
              <p className="mt-3 text-xs font-bold leading-6 text-rose-200">{error}</p>
              <Button
                variant="outline"
                onClick={() => void refresh()}
                className="mt-4 border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {t.retry}
              </Button>
            </div>
          )}

          {!loading && !error && mode === "list" && (
            <>
              {/* شروع تمرین — همیشه در دسترس (حتی بدون برنامه) */}
              <section
                aria-label={t.startTrainingAria}
                className="rounded-2xl border border-primary/25 bg-primary/5 p-4 md:p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                    <Play className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold">{t.startTrainingTitle}</h3>
                    <p className="text-[10px] leading-5 text-muted-foreground">
                      {t.startTrainingIntro}
                    </p>
                  </div>
                  <Button
                    onClick={() => setFreeDialogOpen(true)}
                    disabled={hasActiveSession}
                    className="font-bold text-primary-foreground glow-lime-sm"
                  >
                    <ListPlus className="size-4" aria-hidden="true" />
                    {hasActiveSession ? t.busyButton : t.freeWorkoutButton}
                  </Button>
                </div>
                {hasActiveSession && (
                  <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[10px] leading-5 text-amber-300/95">
                    {t.activeSessionNote}
                  </p>
                )}
              </section>

              {activePlanSummary && activeDetail.plan && (
                <section aria-label={t.activePlanAria} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold">{t.activePlanHeading(activeDetail.plan.title)}</h3>
                    <StatusChip status="active" />
                    <div className="ms-auto flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === activeDetail.plan.id}
                        onClick={() => void handleArchive(activeDetail.plan!.id)}
                        className="h-7 border-border/70 px-2.5 text-[10px] font-semibold hover:border-amber-400/40 hover:text-amber-300"
                      >
                        <Archive className="size-3" aria-hidden="true" />
                        {t.archiveAction}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(activePlanSummary)}
                        className="h-7 border-destructive/30 px-2.5 text-[10px] font-semibold text-rose-300 hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                        {t.deleteAction}
                      </Button>
                    </div>
                  </div>
                  <PlanDetail
                    plan={activeDetail.plan}
                    onStartDay={(dayId) => void handleStartDay(dayId)}
                    startDisabled={hasActiveSession}
                    startingDayId={startingDayId}
                  />
                </section>
              )}

              {!activePlanSummary && plans.length === 0 && (
                <section className="rounded-2xl border border-border/60 bg-card p-6">
                  <EmptyState
                    icon={CalendarCheck2}
                    title={t.emptyTitle}
                    description={t.emptyDescription}
                    action={
                      <Button
                        onClick={() => setMode("form")}
                        className="font-bold text-primary-foreground glow-lime-sm"
                      >
                        <Plus className="size-4" aria-hidden="true" />
                        {t.createPlan}
                      </Button>
                    }
                  />
                </section>
              )}

              {!activePlanSummary && plans.length > 0 && (
                <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
                  <p className="text-xs leading-6 text-muted-foreground">
                    {t.noActiveNote}
                  </p>
                  <Button
                    onClick={() => setMode("form")}
                    className="mt-3 font-bold text-primary-foreground glow-lime-sm"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    {t.createPlan}
                  </Button>
                </section>
              )}

              <section>
                <Button
                  variant="outline"
                  onClick={() => setActiveView("progress")}
                  className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
                >
                  {t.historyLink}
                  <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
                </Button>
              </section>

              {archivedPlans.length > 0 && (
                <section
                  aria-label={t.previousPlansAria}
                  className="rounded-2xl border border-border/60 bg-card p-4 md:p-5"
                >
                  <div className="mb-3 flex items-center gap-2.5">
                    <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
                    <h3 className="text-xs font-bold">{t.previousPlansTitle}</h3>
                    <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                      {localeNumber(archivedPlans.length, locale)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {archivedPlans.map((plan) => (
                      <PlanSummaryCard
                        key={plan.id}
                        plan={plan}
                        active={false}
                        busy={busyId === plan.id || deletingId === plan.id}
                        onOpen={() => void 0}
                        onActivate={() => void handleActivate(plan.id)}
                        onDelete={() => setDeleteTarget(plan)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {activePlanSummary && (
                <section>
                  <Button
                    variant="outline"
                    onClick={() => setMode("form")}
                    className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
                  >
                    <ListPlus className="size-4" aria-hidden="true" />
                    {t.newPlan}
                  </Button>
                </section>
              )}
            </>
          )}

          {!loading && !error && mode === "form" && (
            <section aria-label={t.planFormAria} className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold">{t.planSettingsTitle}</h3>
                <StageBadge label={t.stepOne} className="ms-auto" />
              </div>
              <PlanSettingsForm
                profile={profile}
                submitting={false}
                serverError={formError}
                onSubmit={(s) => void handleFormSubmit(s)}
                onCancel={() => {
                  setMode("list");
                  setFormError(null);
                }}
              />
            </section>
          )}

          {!loading && !error && mode === "preview" && preview && (
            <section aria-label={t.planPreviewAria} className="flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <h3 className="text-sm font-bold">{t.planPreviewTitle}</h3>
                <StageBadge label={t.stepTwo} className="ms-auto" />
              </div>
              <PlanPreview
                plan={preview}
                saving={creating}
                saveError={saveError}
                onSave={() => void handleSave()}
                onBack={() => {
                  setMode("form");
                  setSaveError(null);
                }}
              />
            </section>
          )}
        </>
      )}

      {/* دیالوگ شروع تمرین آزاد */}
      <StartFreeWorkoutDialog
        open={freeDialogOpen}
        onOpenChange={setFreeDialogOpen}
        starting={startingFree}
        onStart={handleStartFree}
      />

      {/* دیالوگ تأیید حذف برنامه */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">{t.deletePlanTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-7">
              {t.deletePlanDescription(deleteTarget?.title ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t.deletePlanAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
