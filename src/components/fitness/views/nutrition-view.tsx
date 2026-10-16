"use client";

/**
 * بخش برنامه غذایی — سیستم تغذیه شخصی متصل به پایگاه داده.
 *
 * حالت‌ها:
 *  - بارگذاری → اسکلت شفاف
 *  - خطا → پیام + تلاش مجدد
 *  - بدون برنامه → EmptyState صادقانه + دکمه ساخت برنامه
 *  - فرم ساخت برنامه → تنظیمات با پیش‌فرض پروفایل
 *  - پیش‌نمایش → تأیید و ذخیره (موفقیت فقط پس از پاسخ سرور)
 *  - برنامه فعال → نمایش کامل با ویرایش مقدار/جایگزینی + مدیریت برنامه‌ها
 */

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  ChevronRight,
  CircleAlert,
  ListPlus,
  Plus,
  RotateCcw,
  Salad,
  Trash2,
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
import { useSessionData } from "../session-context";
import { useNutritionPlans } from "@/hooks/use-nutrition-plans";
import { useNutritionDetail } from "@/hooks/use-nutrition-detail";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { nutritionTitleFromFields } from "@/lib/i18n/engine-content";
import { useStrings } from "@/lib/i18n/use-strings";
import { nutritionStrings } from "@/lib/i18n/sections/nutrition";
import { localeNumber } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import { ViewIntro } from "../shared/view-intro";
import { EmptyState } from "../shared/empty-state";
import { RealBadge } from "../shared/badges";
import {
  type GeneratedNutritionPlan,
  type NutritionSettings,
} from "@/lib/nutrition-engine/types";
import type { NutritionPlanSummaryClient } from "@/lib/nutrition-storage";
import { NutritionSettingsForm } from "./nutrition/settings-form";
import { NutritionPlanPreview } from "./nutrition/plan-preview";
import { NutritionPlanDetail } from "./nutrition/plan-detail";
import { FoodLogSection } from "./nutrition/food-log-section";

type Mode = "list" | "form" | "preview";

function StatusChip({ status }: { status: "active" | "archived" }) {
  const t = useStrings(nutritionStrings);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold",
        status === "active"
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/50 bg-secondary/40 text-muted-foreground"
      )}
    >
      {status === "active" ? t.statusActive : t.statusArchived}
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
  plan: NutritionPlanSummaryClient;
  active: boolean;
  busy: boolean;
  onOpen: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const t = useStrings(nutritionStrings);
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
          <p className="truncate text-xs font-bold text-foreground">{nutritionTitleFromFields(plan.planLength, plan.goal, locale) || plan.title}</p>
          <StatusChip status={plan.status} />
        </div>
        <p className="mt-1 text-[10px] leading-5 text-muted-foreground">
          {t.goalLabel(plan.goal)} — {t.mealsPerDayUnit(localeNumber(plan.mealsPerDay, locale))} —{" "}
          {plan.planLength > 1 ? t.daysShort(localeNumber(plan.planLength, locale)) : t.oneDayPlan} —{" "}
          {plan.targetKcal !== null ? t.targetKcalLabel(localeNumber(plan.targetKcal, locale)) : t.cautionMode}
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
            {t.delete}
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

export function NutritionView() {
  const item = getNavItem("nutrition");
  const { profile } = useSessionData();
  const setActiveView = useAppStore((s) => s.setActiveView);
  const t = useStrings(nutritionStrings);
  const locale = useLocale();
  const dir = useDir();
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
  } = useNutritionPlans();

  const [mode, setMode] = useState<Mode>("list");
  const [preview, setPreview] = useState<GeneratedNutritionPlan | null>(null);
  const [settings, setSettings] = useState<NutritionSettings | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NutritionPlanSummaryClient | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const activePlanSummary = plans.find((p) => p.status === "active") ?? null;
  const archivedPlans = plans.filter((p) => p.status !== "active");
  const activeDetail = useNutritionDetail(mode === "list" ? activePlanSummary?.id ?? null : null);
  /* ------------------------------ ساخت برنامه ------------------------------ */

  const handleFormSubmit = useCallback(
    async (candidate: NutritionSettings) => {
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
      toast.success(t.savedToast);
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
        toast.success(t.activatedToast);
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
        toast.success(t.archivedToast);
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
      toast.success(t.deletedToast);
    } else {
      toast.error(result.message);
    }
    setDeleteTarget(null);
  }, [deletePlan, deleteTarget, t]);

  /* --------------------------------- حالت‌ها --------------------------------- */

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
            {t.retry}
          </Button>
        </div>
      )}

      {!loading && !error && mode === "list" && (
        <>
          {/* ثبت مصرف واقعی غذا — مستقل از برنامه، با مقایسه در صورت وجود برنامه فعال */}
          <FoodLogSection
            activePlan={
              activePlanSummary && activeDetail.plan ? activeDetail.plan : null
            }
          />

          {activePlanSummary && activeDetail.plan && (
            <section aria-label={t.activePlanSectionAria} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-bold">{t.activePlanHeading}</h3>
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
                    {t.archive}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(activePlanSummary)}
                    className="h-7 border-destructive/30 px-2.5 text-[10px] font-semibold text-rose-300 hover:bg-destructive/10"
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                    {t.delete}
                  </Button>
                </div>
              </div>
              <NutritionPlanDetail
                plan={activeDetail.plan}
                onChanged={(updated) => {
                  // نسخه به‌روزشده از پاسخ سرور PATCH — بدون بارگذاری مجدد
                  activeDetail.applyPlan(updated);
                }}
              />
            </section>
          )}

          {!activePlanSummary && plans.length === 0 && (
            <section className="rounded-2xl border border-border/60 bg-card p-6">
              <EmptyState
                icon={Salad}
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
                {t.noActivePlanNote}
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

          {archivedPlans.length > 0 && (
            <section aria-label={t.previousPlansAria} className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
              <div className="mb-3 flex items-center gap-2.5">
                <Archive className="size-4 text-muted-foreground" aria-hidden="true" />
                <h3 className="text-xs font-bold">{t.previousPlansHeading}</h3>
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
                {t.createNewPlan}
              </Button>
            </section>
          )}

          {/* پیوند به پروفایل برای اصلاح اطلاعات پایه */}
          {!activePlanSummary && (
            <p className="text-center text-[10px] leading-5 text-muted-foreground/70">
              {t.profileNoteBefore}
              <button
                type="button"
                onClick={() => setActiveView("profile")}
                className="font-semibold text-primary underline-offset-2 hover:underline"
              >
                {t.profileLink}
              </button>
              {t.profileNoteAfter}
            </p>
          )}
        </>
      )}

      {!loading && !error && mode === "form" && (
        <section aria-label={t.settingsFormAria} className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold">{t.settingsHeading}</h3>
          </div>
          <NutritionSettingsForm
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
        <section aria-label={t.previewSectionAria} className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-bold">{t.previewHeading}</h3>
          </div>
          <NutritionPlanPreview
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
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">{t.deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-7">
              {t.deleteDialogDescription(deleteTarget?.title ?? "")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDeleteConfirm()}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t.deletePlanConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
