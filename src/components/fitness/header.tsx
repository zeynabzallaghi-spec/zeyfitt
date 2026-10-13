"use client";

import { useSyncExternalStore } from "react";
import { Menu, Box, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { getNavItem } from "@/lib/nav";

const jalaliFormatter = new Intl.DateTimeFormat("fa-IR", { dateStyle: "full" });

/** مقدار فقط-کلاینت: سمت سرور null برمی‌گردد تا هیدراتیشن همیشه سازگار بماند */
function subscribeToMinuteTick(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}
function getJalaliClientSnapshot(): string {
  return jalaliFormatter.format(new Date());
}
function getJalaliServerSnapshot(): string | null {
  return null;
}

/** تاریخ شمسی امروز — بدون ناسازگاری هیدراتیشن */
function JalaliToday() {
  const today = useSyncExternalStore(
    subscribeToMinuteTick,
    getJalaliClientSnapshot,
    getJalaliServerSnapshot
  );

  return (
    <span
      suppressHydrationWarning
      className="hidden text-xs font-medium text-muted-foreground md:block"
      aria-live="polite"
    >
      {today ?? ""}
    </span>
  );
}

/** دکمه میان‌بر به یک بخش — دسترسی کاربردی در سربرگ */
function HeaderQuickButton({
  viewId,
  label,
  icon: Icon,
}: {
  viewId: ReturnType<typeof getNavItem>["id"];
  label: string;
  icon: typeof Box;
}) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const activeView = useAppStore((s) => s.activeView);
  const active = activeView === viewId;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setActiveView(viewId)}
      aria-label={label}
      title={label}
      className={
        active
          ? "border border-primary/30 bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      }
    >
      <Icon className="size-4.5" strokeWidth={2} />
    </Button>
  );
}

export function AppHeader() {
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const activeView = useAppStore((s) => s.activeView);
  const item = getNavItem(activeView);
  const Icon = item.icon;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-8">
      {/* دکمه منو — فقط موبایل و تبلت */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="باز کردن منوی ناوبری"
      >
        <Menu className="size-5" />
      </Button>

      {/* آیکون و عنوان بخش فعال */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary sm:flex">
          <Icon className="size-4" strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-base font-bold leading-6 md:text-lg">{item.fa}</h1>
          <span
            dir="ltr"
            className="hidden truncate text-[10px] font-medium text-muted-foreground sm:block"
          >
            {item.en}
          </span>
        </div>
      </div>

      <div className="ms-auto flex items-center gap-1.5 md:gap-2">
        <JalaliToday />
        <span className="mx-1 hidden h-5 w-px bg-border/60 md:block" aria-hidden="true" />
        <HeaderQuickButton viewId="coach3d" label="مربی سه‌بعدی" icon={Box} />
        <HeaderQuickButton viewId="assistant" label="دستیار هوشمند" icon={Bot} />
      </div>
    </header>
  );
}
