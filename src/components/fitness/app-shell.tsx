"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAppStore } from "@/store/app-store";
import { getNavItem } from "@/lib/nav";
import { BrandMark, SidebarNav, DevStatusCard } from "./sidebar-nav";
import { AppHeader } from "./header";
import { DashboardView } from "./views/dashboard-view";
import { Coach3DView } from "./views/coach3d-view";
import { LibraryView } from "./views/library-view";
import { WorkoutView } from "./views/workout-view";
import { NutritionView } from "./views/nutrition-view";
import { ProgressView } from "./views/progress-view";
import { AssistantView } from "./views/assistant-view";
import { ProfileView } from "./views/profile-view";

/** محتوای کامل نوار کناری — در دسکتاپ و منوی موبایل مشترک است */
function SidebarContent() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-5">
      <BrandMark className="pe-10" />
      <div className="flex-1">
        <SidebarNav />
      </div>
      <DevStatusCard />
    </div>
  );
}

/** نگاشت بخش فعال به نمای مربوطه */
function ActiveView() {
  const activeView = useAppStore((s) => s.activeView);
  switch (activeView) {
    case "dashboard":
      return <DashboardView />;
    case "coach3d":
      return <Coach3DView />;
    case "library":
      return <LibraryView />;
    case "workout":
      return <WorkoutView />;
    case "nutrition":
      return <NutritionView />;
    case "progress":
      return <ProgressView />;
    case "assistant":
      return <AssistantView />;
    case "profile":
      return <ProfileView />;
    default:
      return <DashboardView />;
  }
}

export function AppShell() {
  const activeView = useAppStore((s) => s.activeView);
  const mobileNavOpen = useAppStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);

  return (
    <div className="flex min-h-screen w-full">
      {/* نوار کناری دسکتاپ — در RTL سمت راست قرار می‌گیرد */}
      <aside
        aria-label="نوار کناری"
        className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col border-e border-border/60 bg-sidebar lg:flex"
      >
        <SidebarContent />
      </aside>

      {/* منوی کشویی موبایل */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent
          side="right"
          className="w-80 border-border/60 bg-sidebar p-0 sm:max-w-80"
        >
          <SheetTitle className="sr-only">منوی ناوبری اصلی</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* ستون اصلی محتوا */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <ActiveView />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* پاورقی — همیشه انتهای صفحه */}
        <footer className="pb-safe mt-auto border-t border-border/60 px-4 py-4 md:px-8">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-1.5 text-center sm:flex-row sm:text-start">
            <p className="text-[11px] font-medium text-muted-foreground">
              <span dir="ltr" className="font-bold">AI Fitness Coach</span> — مربی هوشمند تناسب اندام
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              محصول در فاز توسعه است؛ هر مرحله پس از تأیید شما تکمیل می‌شود
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
