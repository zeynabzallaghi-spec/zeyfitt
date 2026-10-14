"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { useAppStore } from "@/store/app-store";
import type { SessionUser } from "@/lib/auth";
import type { FitnessProfileClient } from "@/lib/profile";

/**
 * وضعیت نشست کاربر — مقدار اولیه از سرور (page.tsx) می‌آید و پس از عملیات
 * کلاینت (ذخیره پروفایل، خروج، حذف حساب) به‌روز می‌شود. برای همگام‌سازی
 * کامل با سرور از router.refresh() استفاده می‌کنیم.
 */
interface SessionContextValue {
  user: SessionUser | null;
  profile: FitnessProfileClient | null;
  setProfile: (profile: FitnessProfileClient | null) => void;
  /** خروج از حساب — ابطال نشست سمت سرور */
  signOut: () => Promise<void>;
  /** حذف کامل حساب — true یعنی موفق */
  deleteAccount: () => Promise<boolean>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionData(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSessionData باید داخل SessionProvider استفاده شود");
  }
  return ctx;
}

interface SessionProviderProps {
  initialUser: SessionUser | null;
  initialProfile: FitnessProfileClient | null;
  children: React.ReactNode;
}

export function SessionProvider({
  initialUser,
  initialProfile,
  children,
}: SessionProviderProps) {
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [profile, setProfileState] = useState<FitnessProfileClient | null>(initialProfile);
  const router = useRouter();

  // الگوی رسمی React برای «تنظیم state هنگام تغییر props»: همگام‌سازی
  // داده تازه سرور پس از هر router.refresh() — بدون effect و بدون رندر آبشاری
  const [syncedUser, setSyncedUser] = useState(initialUser);
  const [syncedProfile, setSyncedProfile] = useState(initialProfile);
  if (syncedUser !== initialUser || syncedProfile !== initialProfile) {
    setSyncedUser(initialUser);
    setSyncedProfile(initialProfile);
    setUser(initialUser);
    setProfileState(initialProfile);
  }

  const setProfile = useCallback((next: FitnessProfileClient | null) => {
    setProfileState(next);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } catch {
      // حتی در صورت خطای شبکه، نشست محلی پاک می‌شود
    }
    // بازگشت به نمای پیش‌فرض برای شروع تمیز نشست بعدی
    useAppStore.getState().setActiveView("dashboard");
    setUser(null);
    setProfileState(null);
    router.refresh();
  }, [router]);

  const deleteAccount = useCallback(async () => {
    let ok = false;
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      ok = response.ok;
    } catch {
      ok = false;
    }
    if (ok) {
      useAppStore.getState().setActiveView("dashboard");
      setUser(null);
      setProfileState(null);
      router.refresh();
    }
    return ok;
  }, [router]);

  return (
    <SessionContext.Provider value={{ user, profile, setProfile, signOut, deleteAccount }}>
      {children}
    </SessionContext.Provider>
  );
}
