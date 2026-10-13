"use client";

import { useSyncExternalStore } from "react";
import { Menu } from "lucide-react";
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

export function AppHeader() {
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const activeView = useAppStore((s) => s.activeView);
  const item = getNavItem(activeView);

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-8">
      {/* دکمه منو — فقط موبایل و تبلت */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="باز کردن منوی ناوبری"
        aria-expanded={undefined}
      >
        <Menu className="size-5" />
      </Button>

      {/* عنوان بخش فعال */}
      <div className="flex min-w-0 flex-col">
        <h1 className="truncate text-base font-bold leading-6 md:text-lg">{item.fa}</h1>
        <span dir="ltr" className="hidden text-[10px] font-medium text-muted-foreground sm:block">
          {item.en}
        </span>
      </div>

      <div className="ms-auto flex items-center gap-4">
        <JalaliToday />
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[10px] font-bold text-primary sm:text-xs"
          title="این محصول در فاز توسعه است و مرحله‌به‌مرحله تکمیل می‌شود"
        >
          <span className="relative flex size-1.5" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
          </span>
          فاز پیش‌نمایش توسعه
        </span>
      </div>
    </header>
  );
}
