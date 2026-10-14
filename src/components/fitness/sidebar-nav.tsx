"use client";

import { NAV_ITEMS } from "@/lib/nav";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Dumbbell, Sparkles } from "lucide-react";

/** لوگو و نام برند — استفاده در نوار کناری و منوی موبایل */
export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[oklch(0.78_0.2_145)] text-primary-foreground glow-lime-sm"
        aria-hidden="true"
      >
        <Dumbbell className="size-5" strokeWidth={2.4} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span dir="ltr" className="text-sm font-extrabold tracking-tight text-foreground text-start">
          AI Fitness Coach
        </span>
        <span className="text-[11px] font-medium text-muted-foreground">
          مربی هوشمند تناسب اندام
        </span>
      </span>
    </div>
  );
}

/** فهرست ناوبری اصلی — ۸ بخش پنل کاربری */
export function SidebarNav() {
  const activeView = useAppStore((s) => s.activeView);
  const setActiveView = useAppStore((s) => s.setActiveView);

  return (
    <nav aria-label="ناوبری اصلی" className="flex flex-col gap-1">
      <p className="px-3 pb-2 text-[10px] font-bold tracking-wide text-muted-foreground/60">
        بخش‌های پنل
      </p>
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveView(item.id)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex w-full items-center gap-3 rounded-xl ps-3 pe-3 py-2.5 text-start transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.99]",
              active
                ? "bg-sidebar-accent/80 text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
            )}
          >
            {/* نشانگر بخش فعال — لبه شروع (راست در RTL) */}
            <span
              className={cn(
                "absolute inset-y-2.5 start-0 w-[3px] rounded-full transition-all duration-200",
                active
                  ? "bg-primary shadow-[0_0_12px_2px_oklch(0.89_0.22_128/0.5)]"
                  : "bg-transparent"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-all duration-200",
                active
                  ? "border-primary/40 bg-primary/15 text-primary glow-lime-sm"
                  : "border-border/50 bg-secondary/40 text-muted-foreground group-hover:border-border group-hover:text-foreground"
              )}
            >
              <Icon className="size-4" strokeWidth={2.2} aria-hidden="true" />
            </span>
            <span className="flex min-w-0 flex-col items-start gap-0">
              <span className="truncate text-sm font-semibold leading-6">{item.fa}</span>
              <span dir="ltr" className="truncate text-[10px] font-medium leading-3 opacity-70">
                {item.en}
              </span>
            </span>
            {active && (
              <span
                className="ms-auto size-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_10px_2px_oklch(0.89_0.22_128/0.55)]"
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** کارت وضعیت توسعه — شفافیت درباره مرحله جاری محصول */
export function DevStatusCard() {
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
          وضعیت توسعه
        </span>
        <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          مرحله ۳ از ۱۳
        </span>
      </div>
      <Progress value={23} className="mt-3 h-1.5" aria-label="پیشرفت کل مراحل توسعه" />
      <p className="mt-2.5 text-[10px] leading-relaxed text-muted-foreground">
        حساب کاربری، ورود امن و ذخیره‌سازی دائمی پروفایل با پایگاه داده واقعی فعال است.
        مرحله بعد پس از تأیید شما آغاز می‌شود.
      </p>
    </div>
  );
}
