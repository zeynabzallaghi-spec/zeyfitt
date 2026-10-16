import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { toClientProfile } from "@/lib/profile";
import { AppRoot } from "@/components/fitness/app-root";
import { UI_LANG_COOKIE, toLocale } from "@/lib/i18n/shared";
import type { SessionUser } from "@/lib/auth";
import type { FitnessProfileClient } from "@/lib/profile";

// نشست و پروفایل باید همیشه تازه از سرور خوانده شوند
export const dynamic = "force-dynamic";

export default async function Home() {
  let user: SessionUser | null = null;
  let profile: FitnessProfileClient | null = null;

  // زبان رابط از همان کوکی‌ای خوانده می‌شود که layout و کلاینت می‌نویسند
  let initialLocale: ReturnType<typeof toLocale> = "fa";
  try {
    const store = await cookies();
    initialLocale = toLocale(store.get(UI_LANG_COOKIE)?.value);
  } catch {
    // بی‌خطر — پیش‌فرض فارسی
  }

  try {
    const session = await getServerSession();
    if (session?.user?.id) {
      user = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      };
      const row = await db.fitnessProfile.findUnique({
        where: { userId: session.user.id },
      });
      profile = row ? toClientProfile(row) : null;
    }
  } catch (error) {
    console.error("[page]", error instanceof Error ? error.name : "unknown");
    // حتی صفحه خطای سرور هم باید به زبان انتخابی کاربر باشد
    const fa = initialLocale === "fa";
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-card p-8 text-center">
          <h1 className="text-lg font-bold text-foreground">
            {fa ? "خطا در دسترسی به سرور" : "Server access error"}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {fa
              ? "در خواندن وضعیت حساب مشکلی پیش آمد. لطفاً چند لحظه بعد صفحه را دوباره بارگذاری کنید."
              : "Something went wrong while reading your account state. Please reload the page in a few moments."}
          </p>
        </div>
      </main>
    );
  }

  return <AppRoot initialUser={user} initialProfile={profile} initialLocale={initialLocale} />;
}
