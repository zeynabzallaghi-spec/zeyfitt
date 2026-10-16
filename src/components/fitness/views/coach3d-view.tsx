"use client";

/**
 * نمای مربی سه‌بعدی — صحنه واقعی Three.js با مدل پروسیجرال بدن، اجرای
 * حرکات، هایلایت عضلات و کنترل‌های کامل پخش.
 *
 * شفافیت: مدل فعلی procedural است (نه GLB اسکلت‌دار) و هایلایت عضلات یک
 * نمایش گرافیکی هدف تمرینی است؛ این موارد صادقانه در صفحه نیز درج شده‌اند.
 *
 * همه متن‌های قابل مشاهده از دیکشنری متمرکز src/lib/i18n/sections/coach3d.ts
 * می‌آیند (فارسی عیناً همان متن‌های قبلی)؛ زیرمؤلفه‌های صحنه و داده لایه
 * سه‌بعدی (src/lib/fitness3d) دست‌نخورده می‌مانند.
 */

import { Component, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronDown, Cpu, Dumbbell, Loader2, RefreshCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { getNavItem } from "@/lib/nav";
import { useStrings } from "@/lib/i18n/use-strings";
import { coach3DStrings } from "@/lib/i18n/sections/coach3d";
import { ViewIntro } from "../shared/view-intro";
import { StageBadge } from "../shared/badges";
import { PlaybackBar } from "../coach3d/ui/PlaybackBar";
import { ExerciseList } from "../coach3d/ui/ExerciseList";
import { MusclePanel } from "../coach3d/ui/MusclePanel";
import { SceneHud } from "../coach3d/ui/SceneHud";
import { ExerciseDetails } from "../coach3d/ui/ExerciseDetails";

/* ------------------------ بارگذاری سمت کاربر صحنه 3D ------------------------ */

function ScenePlaceholder() {
  const t = useStrings(coach3DStrings);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card" role="status" aria-live="polite">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-xs font-bold text-foreground">{t.scenePreparing}</p>
      <p className="text-[11px] text-muted-foreground">{t.scenePreparingHint}</p>
    </div>
  );
}

const CoachScene = dynamic(() => import("../coach3d/CoachScene"), {
  ssr: false,
  loading: () => <ScenePlaceholder />,
});

/* --------------------------- بررسی پشتیبانی WebGL --------------------------- */

let cachedWebGL: boolean | null = null;

function checkWebGL(): boolean {
  if (cachedWebGL !== null) return cachedWebGL;
  try {
    const canvas = document.createElement("canvas");
    cachedWebGL = !!(
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")
    );
  } catch {
    cachedWebGL = false;
  }
  return cachedWebGL;
}

/**
 * وضعیت WebGL با useSyncExternalStore — بدون setState در effect و
 * بدون اختلال در آبجکت‌سازی سرور/کلاینت (نمونه سرور همیشه «checking»). */
const subscribeNoop = () => () => {};
const getWebGLClient = (): "checking" | "ok" | "unsupported" => (checkWebGL() ? "ok" : "unsupported");
const getWebGLServer = (): "checking" | "ok" | "unsupported" => "checking";

/* ----------------------- مرز خطا برای خطاهای رندر صحنه ----------------------- */

/**
 * بدنه خطای قابل مشاهده — کامپوننت تابعی مستقل تا متن‌ها از دیکشنری
 * متمرکز خوانده شوند (کامپوننت کلاسی مرز خطا خودش قلاب ندارد).
 */
function SceneErrorFallback({ onRetry }: { onRetry: () => void }) {
  const t = useStrings(coach3DStrings);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-400/10">
        <AlertTriangle className="size-6 text-rose-300" aria-hidden="true" />
      </span>
      <p className="text-sm font-bold text-foreground">{t.sceneErrorTitle}</p>
      <p className="max-w-sm text-xs leading-6 text-muted-foreground">{t.sceneErrorBody}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <RefreshCcw className="size-3.5" aria-hidden="true" />
        {t.retryButton}
      </button>
    </div>
  );
}

class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    // خطا در کنسول ثبت می‌شود؛ رابط به‌جای سفیدی، پیام شفاف نشان می‌دهد
  }

  render() {
    if (this.state.hasError) {
      return (
        <SceneErrorFallback onRetry={() => this.setState({ hasError: false })} />
      );
    }
    return this.props.children;
  }
}

/* ---------------------------------- نمای اصلی ---------------------------------- */

export function Coach3DView() {
  const t = useStrings(coach3DStrings);
  const item = getNavItem("coach3d");
  const glState = useSyncExternalStore(subscribeNoop, getWebGLClient, getWebGLServer);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro
        item={item}
        badges={
          <>
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              <Cpu className="size-3" aria-hidden="true" />
              {t.engineActiveBadge}
            </span>
            <StageBadge stage={2} label={t.stageRoadmapLabel} />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ------------------------------- ستون صحنه ------------------------------- */}
        <div className="flex min-w-0 flex-col gap-4">
          <section
            aria-label={t.sceneAria}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-card"
          >
            <div className="relative h-[440px] sm:h-[520px] lg:h-[620px]">
              {/* پس‌زمینه محسوس پشت بوم شفاف */}
              <div className="absolute inset-0 bg-aura-lime" aria-hidden="true" />
              <div className="absolute inset-0 bg-grid-fade opacity-60" aria-hidden="true" />

              {glState === "checking" && <ScenePlaceholder />}

              {glState === "unsupported" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <span className="flex size-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10">
                    <AlertTriangle className="size-6 text-amber-300" aria-hidden="true" />
                  </span>
                  <p className="text-sm font-bold text-foreground">{t.webglUnsupportedTitle}</p>
                  <p className="max-w-sm text-xs leading-6 text-muted-foreground">
                    {t.webglUnsupportedBody}
                  </p>
                </div>
              )}

              {glState === "ok" && (
                <SceneErrorBoundary>
                  <CoachScene />
                  <SceneHud />
                </SceneErrorBoundary>
              )}
            </div>
          </section>

          <PlaybackBar />
        </div>

        {/* ----------------------- ستون کناری ----------------------- */}
        {/* دسکتاپ — همیشه باز */}
        <div className="hidden min-w-0 flex-col gap-4 lg:flex">
          <ExerciseList />
          <MusclePanel />
        </div>

        {/* موبایل — پنل انتخاب حرکت قابل جمع‌شدن */}
        <div className="min-w-0 lg:hidden">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-bold hover:border-primary/40 hover:text-primary"
                aria-label={t.exercisePanelToggleAria}
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="size-4" aria-hidden="true" />
                  {t.exercisePanelToggleLabel}
                </span>
                <ChevronDown className="size-4 transition-transform duration-200 [[data-state=open]>&]:rotate-180" aria-hidden="true" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 flex flex-col gap-4 overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <ExerciseList />
              <MusclePanel />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      <ExerciseDetails />

      {/* کارت شفافیت — محدودیت‌های نسخه اول به‌صورت صادقانه */}
      <section
        aria-label={t.transparencySectionAria}
        className="rounded-2xl border border-border/60 bg-card p-4 md:p-5"
      >
        <h3 className="text-sm font-bold">{t.transparencyTitle}</h3>
        <div className="mt-3 grid gap-3 text-xs leading-6 text-muted-foreground md:grid-cols-3">
          <p className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            {t.transparencyProcedural.pre}
            <span className="font-bold text-foreground">{t.transparencyProcedural.bold}</span>
            {t.transparencyProcedural.post}
          </p>
          <p className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            {t.transparencyRepCounter.pre}
            <span className="font-bold text-foreground">{t.transparencyRepCounter.bold}</span>
            {t.transparencyRepCounter.post}
          </p>
          <p className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            {t.transparencyMuscleHighlight}
          </p>
        </div>
      </section>
    </motion.div>
  );
}
