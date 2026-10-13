"use client";

import { motion } from "framer-motion";
import {
  Play,
  Pause,
  RotateCcw,
  Video,
  Maximize2,
  CircleCheck,
  CircleMinus,
  Gauge,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getNavItem } from "@/lib/nav";
import { ViewIntro } from "../shared/view-intro";
import { DemoBadge, StageBadge } from "../shared/badges";

const MUSCLE_GROUPS = [
  "سینه",
  "پشت",
  "سرشانه",
  "جلو بازو",
  "پشت بازو",
  "ساعد",
  "شکم و مرکزی",
  "چهارسر ران",
  "همسترینگ",
  "سرینی",
  "ساق پا",
];

/** کف صحنه سه‌بعدی با پرسپکتیو — کاملاً تزئینی و CSS محور */
function StageFloor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-[-40%] bottom-[-18%] h-[62%] opacity-70"
      style={{
        transform: "perspective(700px) rotateX(58deg)",
        backgroundImage:
          "linear-gradient(to left, oklch(0.89 0.22 128 / 0.13) 1px, transparent 1px), linear-gradient(to bottom, oklch(0.89 0.22 128 / 0.13) 1px, transparent 1px)",
        backgroundSize: "44px 44px",
        maskImage: "linear-gradient(to top, black 30%, transparent 90%)",
        WebkitMaskImage: "linear-gradient(to top, black 30%, transparent 90%)",
      }}
    />
  );
}

function HudCorner({ className }: { className: string }) {
  return <span aria-hidden="true" className={`absolute size-6 border-primary/25 ${className}`} />;
}

export function Coach3DView() {
  const item = getNavItem("coach3d");

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
            <DemoBadge>حالت آماده‌سازی</DemoBadge>
            <StageBadge stage={4} />
          </>
        }
      />

      {/* صحنه نمایش — هنوز موتور سه‌بعدی متصل نشده است */}
      <section
        aria-label="صحنه نمایش مربی سه‌بعدی"
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-card"
      >
        <div className="relative flex aspect-[16/10] min-h-64 items-center justify-center sm:aspect-[16/8]">
          <StageFloor />
          <div className="absolute inset-0 bg-aura-lime" aria-hidden="true" />

          {/* قاب HUD دوربین */}
          <HudCorner className="start-4 top-4 border-s-2 border-t-2 rounded-ss-lg" />
          <HudCorner className="end-4 top-4 border-e-2 border-t-2 rounded-se-lg" />
          <HudCorner className="start-4 bottom-4 border-s-2 border-b-2 rounded-es-lg" />
          <HudCorner className="end-4 bottom-4 border-e-2 border-b-2 rounded-ee-lg" />

          {/* نوار وضعیت بالا */}
          <div className="absolute inset-x-4 top-5 flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-muted-foreground">
              پیش‌نمایش محیط مربی سه‌بعدی
            </span>
            <DemoBadge>موتور سه‌بعدی متصل نشده است</DemoBadge>
          </div>

          {/* هسته صحنه */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex flex-col items-center gap-4 text-center"
          >
            <span className="flex size-24 items-center justify-center rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5">
              <Box className="size-10 text-primary/70" strokeWidth={1.5} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">فضای اجرای حرکات آماده است</p>
              <p className="mt-1 max-w-sm text-xs leading-6 text-muted-foreground">
                موتور سه‌بعدی و مدل کاراکتر در مرحله ۴ اضافه می‌شود؛ این صحنه فقط طراحی نهایی
                محیط را نشان می‌دهد و مدل واقعی در آن قرار نگرفته است.
              </p>
            </div>
          </motion.div>

          {/* نوار وضعیت پایین */}
          <div className="absolute inset-x-4 bottom-5 flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/70 px-3 py-2 backdrop-blur">
            <span className="text-[10px] font-medium text-muted-foreground">
              فناوری هدف: Three.js + React Three Fiber
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-primary">
              <span className="relative flex size-1.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
              </span>
              در انتظار مرحله ۴
            </span>
          </div>
        </div>
      </section>

      {/* وضعیت فعلی + برنامه ساخت */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section
          aria-label="وضعیت فعلی"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <h3 className="text-sm font-bold">وضعیت فعلی — شفاف</h3>
          <ul className="mt-4 flex flex-col gap-3">
            <li className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
              <CircleCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
              ساختار صفحه، پوسته و کنترل‌های رابط کاربری طراحی شده است.
            </li>
            <li className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
              <CircleCheck className="mt-1 size-4 shrink-0 text-primary" aria-hidden="true" />
              معماری برای اتصال موتور سه‌بعدی و داده انیمیشن هر حرکت آماده‌سازی شده است.
            </li>
            <li className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
              <CircleMinus className="mt-1 size-4 shrink-0 text-rose-400/80" aria-hidden="true" />
              موتور سه‌بعدی، مدل کاراکتر و انیمیشن حرکات هنوز پیاده‌سازی نشده‌اند و در این نسخه
              قابل اجرا نیستند.
            </li>
          </ul>
        </section>

        <section
          aria-label="چه چیزی ساخته می‌شود"
          className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
        >
          <h3 className="text-sm font-bold">چه چیزی در این بخش ساخته می‌شود؟</h3>
          <ul className="mt-4 flex flex-col gap-2.5">
            {item.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70" aria-hidden="true" />
                {feature}
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-border/50 pt-4">
            <p className="text-[11px] font-bold text-foreground/80">گروه‌های عضلانی هدف نمایش:</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {MUSCLE_GROUPS.map((muscle) => (
                <span
                  key={muscle}
                  className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* پیش‌نمایش کنترل‌ها — همه غیرفعال و صادقانه */}
      <section
        aria-label="پیش‌نمایش کنترل‌های پخش"
        className="rounded-2xl border border-border/60 bg-card p-5 md:p-6"
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className="text-sm font-bold">پیش‌نمایش کنترل‌های پخش</h3>
          <StageBadge stage={4} label="فعال‌سازی در مرحله ۴" className="ms-auto" />
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-[auto_1fr_auto] lg:items-center">
          <div className="flex items-center gap-2" aria-disabled="true">
            <Button size="icon" disabled aria-label="پخش حرکت">
              <Play className="size-4" />
            </Button>
            <Button size="icon" variant="outline" disabled aria-label="توقف حرکت">
              <Pause className="size-4" />
            </Button>
            <Button size="icon" variant="outline" disabled aria-label="اجرای مجدد حرکت">
              <RotateCcw className="size-4" />
            </Button>
          </div>
          <div className="flex items-center gap-3" aria-disabled="true">
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Gauge className="size-4" aria-hidden="true" />
              سرعت انیمیشن
            </span>
            <Slider disabled defaultValue={[1]} min={0.25} max={2} step={0.25} className="max-w-52" aria-label="سرعت انیمیشن (غیرفعال)" />
            <span className="text-xs font-bold text-muted-foreground/60">۱×</span>
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-disabled="true">
            <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Video className="size-4" aria-hidden="true" />
              نما:
            </span>
            {["روبه‌رو", "پهلو", "پشت", "۴۵ درجه"].map((view) => (
              <Button key={view} size="sm" variant="outline" disabled className="h-8 text-xs">
                {view}
              </Button>
            ))}
            <Button size="icon" variant="outline" disabled aria-label="تمام‌صفحه">
              <Maximize2 className="size-4" />
            </Button>
          </div>
        </div>
        <p className="mt-4 rounded-xl border border-border/50 bg-secondary/30 p-3 text-[11px] leading-relaxed text-muted-foreground">
          این کنترل‌ها طراحی نهایی پنل پخش هستند و تا اتصال موتور سه‌بعدی عمداً غیرفعال‌اند؛
          هیچ کنترلی به‌صورت تقلبی عملکرد نمایشی ندارد.
        </p>
      </section>
    </motion.div>
  );
}
