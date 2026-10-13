"use client";

/**
 * نمای مربی سه‌بعدی — صحنه واقعی Three.js با مدل پروسیجرال بدن، اجرای
 * حرکات، هایلایت عضلات و کنترل‌های کامل پخش.
 *
 * شفافیت: مدل فعلی procedural است (نه GLB اسکلت‌دار) و هایلایت عضلات یک
 * نمایش گرافیکی هدف تمرینی است؛ این موارد صادقانه در صفحه نیز درج شده‌اند.
 */

import { Component, useSyncExternalStore, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { AlertTriangle, ChevronDown, Cpu, Dumbbell, Loader2, RefreshCcw } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { getNavItem } from "@/lib/nav";
import { ViewIntro } from "../shared/view-intro";
import { StageBadge } from "../shared/badges";
import { PlaybackBar } from "../coach3d/ui/PlaybackBar";
import { ExerciseList } from "../coach3d/ui/ExerciseList";
import { MusclePanel } from "../coach3d/ui/MusclePanel";
import { SceneHud } from "../coach3d/ui/SceneHud";
import { ExerciseDetails } from "../coach3d/ui/ExerciseDetails";

/* ------------------------ بارگذاری سمت کاربر صحنه 3D ------------------------ */

function ScenePlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card" role="status" aria-live="polite">
      <Loader2 className="size-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-xs font-bold text-foreground">در حال آماده‌سازی صحنه سه‌بعدی…</p>
      <p className="text-[11px] text-muted-foreground">بارگذاری موتور WebGL برای اولین بار ممکن است چند لحظه طول بکشد</p>
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl border border-rose-400/30 bg-rose-400/10">
            <AlertTriangle className="size-6 text-rose-300" aria-hidden="true" />
          </span>
          <p className="text-sm font-bold text-foreground">خطا در اجرای صحنه سه‌بعدی</p>
          <p className="max-w-sm text-xs leading-6 text-muted-foreground">
            رندر WebGL با مشکل مواجه شد. صفحه را دوباره بارگذاری کنید یا مرورگر خود را
            به‌روزرسانی کنید. بقیه بخش‌های برنامه بدون مشکل کار می‌کنند.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RefreshCcw className="size-3.5" aria-hidden="true" />
            تلاش مجدد
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ---------------------------------- نمای اصلی ---------------------------------- */

export function Coach3DView() {
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
              موتور سه‌بعدی فعال
            </span>
            <StageBadge stage={2} label="مرحله ۲ از نقشه راه" />
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* ------------------------------- ستون صحنه ------------------------------- */}
        <div className="flex min-w-0 flex-col gap-4">
          <section
            aria-label="صحنه سه‌بعدی مربی"
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
                  <p className="text-sm font-bold text-foreground">مرورگر شما WebGL را پشتیبانی نمی‌کند</p>
                  <p className="max-w-sm text-xs leading-6 text-muted-foreground">
                    برای نمایش مربی سه‌بعدی، مرورگر نیاز به WebGL دارد. لطفاً از نسخه به‌روز
                    کروم، فایرفاکس یا سافاری استفاده کنید یا شتاب‌دهی سخت‌افزاری مرورگر را فعال کنید.
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
                aria-label="باز و بسته کردن پنل انتخاب حرکت و عضلات"
              >
                <span className="flex items-center gap-2">
                  <Dumbbell className="size-4" aria-hidden="true" />
                  انتخاب حرکت و عضلات
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
        aria-label="وضعیت شفاف مربی سه‌بعدی"
        className="rounded-2xl border border-border/60 bg-card p-4 md:p-5"
      >
        <h3 className="text-sm font-bold">وضعیت فنی این نسخه — شفاف</h3>
        <div className="mt-3 grid gap-3 text-xs leading-6 text-muted-foreground md:grid-cols-3">
          <p className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            مدل بدن <span className="font-bold text-foreground">پروسیجرال</span> (ساخته‌شده از
            هندسه‌های متناسب با مفاصل متصل) است؛ در مراحل بعد ممکن است با مدل GLB دارای
            اسکلت استاندارد و انیمیشن‌های حرفه‌ای جایگزین شود. ساختار داده حرکات برای همین
            جایگزینی طراحی شده است.
          </p>
          <p className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            شمارنده تکرار با <span className="font-bold text-foreground">تکمیل چرخه واقعی حرکت</span>{" "}
            افزایش می‌یابد (نه با فریم یا کلیک)؛ در لانج هر چرخه شامل دو لانج چپ و راست است.
            زوایای اجرای شنا و لانج تقریبی و برای آموزش الگوی حرکت است.
          </p>
          <p className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            هایلایت عضلات نمایش گرافیکی «عضلات هدف» است و ادعای شبیه‌سازی علمی یا اندازه‌گیری
            EMG ندارد. بانک کامل ۴۰+ حرکت در مرحله کتابخانه حرکات به همین ساختار اضافه خواهد شد.
          </p>
        </div>
      </section>
    </motion.div>
  );
}
