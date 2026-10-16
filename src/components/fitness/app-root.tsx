"use client";

import { AnimatePresence, motion } from "framer-motion";
import { UiLangProvider } from "@/lib/i18n/locale";
import { useSessionData, SessionProvider } from "./session-context";
import type { SessionUser } from "@/lib/auth";
import type { FitnessProfileClient } from "@/lib/profile";
import type { Locale } from "@/lib/i18n/shared";
import { AuthView } from "./views/auth-view";
import { OnboardingView } from "./views/onboarding-view";
import { AppShell } from "./app-shell";

/**
 * دروازه سمت کلاینت — سه حالت:
 *  1) کاربر مهمان → صفحه ورود/ثبت‌نام
 *  2) کاربر واردشده بدون پروفایل کامل → راه‌اندازی چندمرحله‌ای
 *  3) پروفایل کامل → پنل اصلی هشت‌بخشی
 *
 * محافظت واقعی سمت سرور انجام می‌شود (page.tsx داده خصوصی را فقط برای
 * نشست معتبر می‌سازد)؛ این لایه فقط تصمیم رابط کاربری است.
 */
function Gate() {
  const { user, profile } = useSessionData();
  const gate = !user ? "auth" : !profile?.complete ? "onboarding" : "app";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={gate}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {gate === "auth" && <AuthView />}
        {gate === "onboarding" && <OnboardingView />}
        {gate === "app" && <AppShell />}
      </motion.div>
    </AnimatePresence>
  );
}

interface AppRootProps {
  initialUser: SessionUser | null;
  initialProfile: FitnessProfileClient | null;
  /** زبان رابط خوانده‌شده از کوکی در سمت سرور — برای SSR هم‌زبان با کلاینت */
  initialLocale: Locale;
}

export function AppRoot({ initialUser, initialProfile, initialLocale }: AppRootProps) {
  return (
    <UiLangProvider initialLocale={initialLocale}>
      <SessionProvider initialUser={initialUser} initialProfile={initialProfile}>
        <Gate />
      </SessionProvider>
    </UiLangProvider>
  );
}
