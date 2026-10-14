"use client";

/**
 * بخش برنامه تمرینی — برنامه‌ساز شخصی متصل به پایگاه داده.
 *
 * حالت‌ها:
 *  - بارگذاری → اسکلت شفاف
 *  - خطا → پیام + تلاش مجدد
 *  - بدون برنامه → EmptyState + دکمه ساخت برنامه شخصی
 *  - برنامه فعال → هفته تمرینی + مدیریت برنامه‌ها (فعال‌سازی/بایگانی/حذف)
 *  - فرم ساخت برنامه → تنظیمات با پیش‌فرض پروفایل
 *  - پیش‌نمایش → تأیید و ذخیره (موفقیت فقط پس از پاسخ سرور)
 */

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  ArchiveRestore,
  Archive,
  CalendarCheck2,
  ChevronLeft,
  CircleAlert,
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
import { faDigits } from "@/lib/profile";
import { cn } from "@/lib/utils";
import { ViewIntro } from "../../shared/view-intro";
import { EmptyState } from "../../shared/empty-state";
import { RealBadge, StageBadge } from "../../shared/badges";
import { PLAN_EXPERIENCE_LABELS, PLAN_GOAL_LABELS } from "@/lib/plan-engine/types";
import type { GeneratedPlan, PlanSettings } from "@/lib/plan-engine/types";
import type { WorkoutPlanSummaryClient } from "@/lib/plan-storage";
import { PlanSettingsForm } from "./plan-settings-form";
import { PlanPreview } from "./plan-preview";
import { PlanDetail } from "./plan-detail";

type Mode = "list" | "form" | "preview";

function StatusChip({ status }: { status: "active" | "archived" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold",
        status === "active"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/50 bg-secondary/40 text-muted-foreground"
      )}
    >
      {status === "active" ? "فعال" : "بایگانی"}
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
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-2xl border p-4",
        active ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-xs font-bold text-foreground">{plan.title}</p>
          <StatusChip status={plan.status} />
        </div>
        <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
          {faDigits(plan.daysPerWeek)} روز — {faDigits(plan.totalExercises)} حرکت —{" "}
          {PLAN_GOAL_LABELS[plan.goal as keyof typeof PLAN_GOAL_LABELS] ?? plan.goal} —{" "}
          {PLAN_EXPERIENCE_LABELS[plan.experience as keyof typeof PLAN_EXPERIENCE_LABELS] ?? plan.experience}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
        {active ? (
          <Button
            size="sm"
            onClick={onOpen}
            className="h-7 bg-primary/15 px-2.5 text-[10px] font-bold text-primary hover:bg-primary/25"
          >
            مشاهده برنامه
            <ChevronLeft className="size-3.5" aria-hidden="true" />
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
            فعال‌سازی
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
            حذف
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
  const { profile } = useSessionData();
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

  const [mode, setMode] = useState<Mode>("list");
  const [preview, setPreview] = useState<GeneratedPlan | null>(null);
  const [settings, setSettings] = useState<PlanSettings | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkoutPlanSummaryClient | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activePlanSummary = plans.find((p) => p.status === "active") ?? null;
  const archivedPlans = plans.filter((p) => p.status !== "active");
  // جزئیات برنامه فعال — پس از هر تغییر فهرست دوباره خوانده می‌شود
  const activeDetail = usePlanDetail(mode === "list" ? activePlanSummary?.id ?? null : null);

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
      toast.success("برنامه تمرینی ذخیره و فعال شد");
    } else {
      setSaveError(result.message);
    }
  }, [createPlan, settings]);

  const handleActivate = useCallback(
    async (id: string) => {
      setBusyId(id);
      const result = await updatePlan(id, { status: "active" });
      setBusyId(null);
      if (result.ok) {
        toast.success("برنامه فعال شد؛ برنامه فعال قبلی بایگانی شد");
      } else {
        toast.error(result.message);
      }
    },
    [updatePlan]
  );

  const handleArchive = useCallback(
    async (id: string) => {
      setBusyId(id);
      const result = await updatePlan(id, { status: "archived" });
      setBusyId(null);
      if (result.ok) {
        toast.success("برنامه بایگانی شد");
      } else {
        toast.error(result.message);
      }
    },
    [updatePlan]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    const result = await deletePlan(deleteTarget.id);
    if (result.ok) {
      toast.success("برنامه حذف شد");
    } else {
      toast.error(result.message);
    }
    setDeleteTarget(null);
  }, [deletePlan, deleteTarget]);

  /* ------------------------------ حالت‌ها ------------------------------ */

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro item={item} badges={<RealBadge />} />

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
            تلاش مجدد
          </Button>
        </div>
      )}

      {!loading && !error && mode === "list" && (
        <>
          {activePlanSummary && activeDetail.plan && (
            <section aria-label="برنامه فعال" className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold">برنامه فعال: {activeDetail.plan.title}</h3>
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
                    بایگانی
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(activePlanSummary)}
                    className="h-7 border-destructive/30 px-2.5 text-[10px] font-semibold text-rose-300 hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                    حذف
                  </Button>
                </div>
              </div>
              <PlanDetail plan={activeDetail.plan} />
            </section>
          )}

          {!activePlanSummary && plans.length === 0 && (
            <section className="rounded-2xl border border-border/60 bg-card p-6">
              <EmptyState
                icon={CalendarCheck2}
                title="هنوز برنامه تمرینی نساخته‌اید"
                description="برنامه‌ساز بر اساس هدف، سطح تجربه، تجهیزات و روزهای شما — و از بانک ۴۸ حرکتی واقعی — برنامه هفتگی ساختاریافته می‌سازد. تنظیمات را پر کنید، پیش‌نمایش را ببینید و ذخیره کنید."
                action={
                  <Button
                    onClick={() => setMode("form")}
                    className="font-bold text-primary-foreground glow-lime-sm"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    ساخت برنامه شخصی
                  </Button>
                }
              />
            </section>
          )}

          {!activePlanSummary && plans.length > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
              <p className="text-xs leading-6 text-muted-foreground">
                برنامه فعالی ندارید؛ یکی از برنامه‌های بایگانی را فعال کنید یا برنامه جدیدی بسازید.
              </p>
              <Button
                onClick={() => setMode("form")}
                className="mt-3 font-bold text-primary-foreground glow-lime-sm"
              >
                <Plus className="size-4" aria-hidden="true" />
                ساخت برنامه شخصی
              </Button>
            </section>
          )}

          {archivedPlans.length > 0 && (
            <section aria-label="برنامه‌های قبلی" className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-xs font-bold">برنامه‌های قبلی</h3>
                <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                  {faDigits(archivedPlans.length)}
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
                ساخت برنامه جدید
              </Button>
            </section>
          )}
        </>
      )}

      {!loading && !error && mode === "form" && (
        <section aria-label="تنظیمات برنامه جدید" className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold">تنظیمات برنامه</h3>
            <StageBadge label="گام ۱ از ۲" className="ms-auto" />
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
        <section aria-label="پیش‌نمایش برنامه" className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold">پیش‌نمایش برنامه</h3>
            <StageBadge label="گام ۲ از ۲" className="ms-auto" />
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

      {/* دیالوگ تأیید حذف */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">حذف برنامه تمرینی</AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-7">
              برنامه «{deleteTarget?.title}» برای همیشه حذف می‌شود و قابل بازگشت نیست. اگر این
              برنامه فعال است، پس از حذف برنامه فعالی باقی نمی‌ماند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              حذف برنامه
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
