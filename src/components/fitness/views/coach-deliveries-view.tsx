"use client";

/**
 * نمای «برنامه‌های اختصاصی مربی» — حساب دانشجو (مرحله ۱۶).
 * فهرست برنامه‌های تمرینی/غذایی دریافتی، جزئیات با رندرکننده مشترک،
 * شروع جلسه تمرین واقعی از روز برنامه مربی و ثبت مصرف واقعی اقلام از
 * همان مسیر FoodLogEntry موجود. هیچ تصمیم مجوزی اینجا گرفته نمی‌شود؛
 * همه مجوزها سمت سرور است و پیام‌ها از کد پایدار ترجمه می‌شوند.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, FolderOpen, Info, UserRound, ShieldAlert } from "lucide-react";
import { getNavItem } from "@/lib/nav";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachDeliveriesStrings } from "@/lib/i18n/sections/coach-deliveries";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { ViewIntro } from "../shared/view-intro";
import { EmptyState } from "../shared/empty-state";
import { CoachWorkoutContentView, CoachNutritionContentView } from "./coach/plan-content-view";
import { useMyDeliveries, getDelivery } from "@/hooks/use-coach-plans";
import type {
  DeliveryDetailClient,
  DeliveryListItemClient,
  CoachNutritionContentClient,
  CoachWorkoutContentClient,
} from "@/lib/coaching/plans-client";
import { apiErrorLabel } from "@/lib/i18n/sections/server-messages";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { tehranLocalDay, defaultInstantForToday, FOOD_LOG_LIMITS } from "@/lib/foodlog/calc";

/* ------------------------------ دیالوگ جزئیات ------------------------------ */

function DeliveryDetailDialog({
  deliveryId,
  onOpenChange,
}: {
  deliveryId: string | null;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useStrings(coachDeliveriesStrings);
  const locale = useLocale();
  const { toast } = useToast();
  const [detail, setDetail] = useState<DeliveryDetailClient | null>(null);
  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [startBusyDay, setStartBusyDay] = useState<number | null>(null);
  const [logBusyId, setLogBusyId] = useState<string | null>(null);

  if (deliveryId && loadedId !== deliveryId) {
    setLoadedId(deliveryId);
    setDetail(null);
    void (async () => {
      const result = await getDelivery(deliveryId);
      if (result.ok) {
        setDetail(result.data.delivery);
      } else {
        toast({ title: t.loadError, description: result.message, variant: "destructive" });
        onOpenChange(false);
      }
    })();
  }
  if (!deliveryId && loadedId !== null) {
    setLoadedId(null);
    setDetail(null);
    setStartBusyDay(null);
    setLogBusyId(null);
  }

  /** شروع جلسه از روز برنامه مربی — همان مسیر رسمی /api/sessions/start */
  const startDay = async (dayOrder: number) => {
    if (!detail || startBusyDay !== null) return;
    setStartBusyDay(dayOrder);
    try {
      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachDeliveryId: detail.id,
          coachDayOrder: dayOrder,
          contentLocale: locale,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { existing?: boolean };
        toast({
          title: data.existing ? t.sessionResumedTitle : t.sessionStartedTitle,
          description: detail.title,
        });
        onOpenChange(false);
      } else {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        const message =
          apiErrorLabel(body.error ?? "INTERNAL", locale) ??
          (currentUiLocale() === "en" ? t.sessionStartFailed : t.sessionStartFailed);
        // پیام شفاف «جلسه فعال دیگر» برای حالت تعارض
        toast({
          title: response.status === 409 ? t.sessionActiveOther : t.sessionStartFailed,
          description: message,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: t.sessionStartFailed, variant: "destructive" });
    } finally {
      setStartBusyDay(null);
    }
  };

  /** ثبت مصرف واقعی قلم برنامه — از همان مسیر رسمی /api/food-logs (source=bank) */
  const logItem = async (args: {
    foodId: string;
    unit: "g" | "serving";
    amount: number;
    mealType: string;
    itemId: string;
  }) => {
    if (logBusyId) return;
    setLogBusyId(args.itemId);
    try {
      const instant = new Date(defaultInstantForToday(Date.now())).toISOString();
      const localDay = tehranLocalDay(Date.now());
      const response = await fetch("/api/food-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "bank",
          foodId: args.foodId,
          unit: args.unit,
          amount: args.amount,
          mealType: args.mealType,
          consumedAt: instant,
          localDay,
          clientRequestId: `cp${Date.now()}${Math.random().toString(36).slice(2, 10)}`,
        }),
      });
      if (response.ok) {
        toast({ title: t.foodLoggedTitle, description: t.foodLoggedNote });
      } else {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        const code = body.error ?? "INTERNAL";
        toast({
          title: response.status === 429 ? t.dailyLimitNote : t.foodLogFailed,
          description: apiErrorLabel(code, locale) ?? undefined,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: t.foodLogFailed, variant: "destructive" });
    } finally {
      setLogBusyId(null);
    }
  };

  const connectionEnded = detail !== null && detail.connectionStatus !== null && detail.connectionStatus !== "ACTIVE";

  return (
    <Dialog open={deliveryId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">{detail?.title ?? t.loading}</DialogTitle>
          <DialogDescription className="text-[11px]">
            {detail && (
              <span className="flex flex-wrap gap-x-3 gap-y-0.5">
                <span>
                  {t.coachLabel}: <span className="font-bold">{detail.coach.displayName}</span>
                </span>
                <span>
                  {t.sentAtLabel}: {localeDateTimeLabel(detail.sentAt, locale)}
                </span>
                <span>{t.versionLabel(detail.version)}</span>
                {detail.planKind === "workout"
                  ? ` · ${t.workoutGoalOf(detail.goal)}`
                  : ` · ${t.nutritionGoalOf(detail.goal)}`}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <div className="space-y-4">
            {/* منبع برنامه — تفکیک صادقانه از برنامه خودکار */}
            <div className="rounded-xl border border-primary/25 bg-primary/5 p-3">
              <p className="text-[11px] font-bold text-primary">{t.sourceCoachPlan}</p>
              <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{t.sourceCoachPlanNote}</p>
            </div>

            {connectionEnded && (
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  {t.connectionEndedBanner}
                </p>
                <p className="mt-1 text-[10px] leading-5 text-amber-200/80">{t.connectionEndedNote}</p>
              </div>
            )}

            {detail.description && (
              <p className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-[11px] leading-6 text-muted-foreground" dir="auto">
                {detail.description}
              </p>
            )}

            {"days" in detail.content &&
              (detail.planKind === "workout" ? (
                <CoachWorkoutContentView
                  content={detail.content as CoachWorkoutContentClient}
                  onStartDay={(d) => void startDay(d)}
                  startBusyDay={startBusyDay}
                />
              ) : (
                <CoachNutritionContentView
                  content={detail.content as CoachNutritionContentClient}
                  onLogItem={(args) => void logItem(args)}
                  logBusyId={logBusyId}
                />
              ))}

            <p className="text-[10px] leading-5 text-muted-foreground/70">{t.historyKeptNote}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ کارت برنامه ------------------------------ */

function DeliveryCard({
  delivery,
  onOpen,
}: {
  delivery: DeliveryListItemClient;
  onOpen: () => void;
}) {
  const t = useStrings(coachDeliveriesStrings);
  const locale = useLocale();
  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="space-y-2.5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground">{delivery.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserRound className="size-3" aria-hidden="true" />
                {t.coachLabel}: <span className="font-bold text-foreground">{delivery.coach.displayName}</span>
              </span>
              <span>
                {t.sentAtLabel}: {localeDateTimeLabel(delivery.sentAt, locale)}
              </span>
            </p>
          </div>
          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/10 text-[10px] font-bold text-primary"
          >
            {t.versionLabel(delivery.version)}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
          <span>
            {t.goalLabel}:{" "}
            <span className="font-bold text-foreground">
              {delivery.planKind === "workout" ? t.workoutGoalOf(delivery.goal) : t.nutritionGoalOf(delivery.goal)}
            </span>
          </span>
          <span>{t.daysCount(delivery.meta.daysCount)}</span>
          {delivery.planKind === "workout" && typeof delivery.meta.exercisesCount === "number" && (
            <span>{t.exercisesCount(delivery.meta.exercisesCount)}</span>
          )}
          {delivery.planKind === "nutrition" && typeof delivery.meta.mealsCount === "number" && (
            <span>{t.mealsCount(delivery.meta.mealsCount)}</span>
          )}
        </div>

        <Button size="sm" variant="outline" onClick={onOpen}>
          {t.viewDetails}
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------ نمای اصلی ------------------------------ */

export function CoachPlansView() {
  const item = getNavItem("coachPlans");
  const t = useStrings(coachDeliveriesStrings);
  const locale = useLocale();

  return (
    <div>
      <ViewIntro item={item} />

      <Tabs defaultValue="workout" className="gap-5">
        <TabsList className="w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="workout" className="text-[11px]">{t.workoutTab}</TabsTrigger>
          <TabsTrigger value="nutrition" className="text-[11px]">{t.nutritionTab}</TabsTrigger>
        </TabsList>

        <TabsContent value="workout">
          <DeliveriesList kind="workout" emptyNote={t.emptyWorkoutNote} />
        </TabsContent>
        <TabsContent value="nutrition">
          <DeliveriesList kind="nutrition" emptyNote={t.emptyNutritionNote} />
        </TabsContent>
      </Tabs>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="text-[11px] leading-5 text-muted-foreground">{t.emptyNote}</p>
      </div>
    </div>
  );
}

function DeliveriesList({
  kind,
  emptyNote,
}: {
  kind: "workout" | "nutrition";
  emptyNote: string;
}) {
  const t = useStrings(coachDeliveriesStrings);
  const { deliveries, loading, error, refresh } = useMyDeliveries(true, kind);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="ghost" size="icon" className="size-8" onClick={refresh} aria-label={t.refresh}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
          ))}
          <span className="sr-only">{t.loading}</span>
        </div>
      ) : error ? (
        <EmptyState
          icon={RefreshCw}
          title={t.loadError}
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={refresh}>
              {t.retry}
            </Button>
          }
        />
      ) : !deliveries || deliveries.length === 0 ? (
        <EmptyState icon={FolderOpen} title={t.emptyTitle} description={emptyNote} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {deliveries.map((d) => (
            <DeliveryCard key={d.id} delivery={d} onOpen={() => setOpenId(d.id)} />
          ))}
        </div>
      )}

      <DeliveryDetailDialog deliveryId={openId} onOpenChange={(v) => !v && setOpenId(null)} />
    </div>
  );
}
