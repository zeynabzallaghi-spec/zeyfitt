import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { UI_LANG_COOKIE, dirOf, toLocale, type Locale } from "@/lib/i18n/shared";

const vazirmatn = Vazirmatn({
  variable: "--font-vazir",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AI Fitness Coach | مربی هوشمند تناسب اندام",
  description:
    "پلتفرم مربی شخصی هوشمند بدنسازی: برنامه تمرینی اختصاصی، مربی سه‌بعدی تعاملی برای آموزش حرکات، نمایش عضلات درگیر و برنامه غذایی شخصی‌سازی‌شده.",
  keywords: [
    "تناسب اندام",
    "بدنسازی",
    "مربی هوشمند",
    "AI Fitness Coach",
    "برنامه تمرینی",
    "تغذیه ورزشی",
    "مربی سه‌بعدی",
  ],
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
};

/**
 * زبان رابط از کوکی «fit-ui-lang» خوانده می‌شود تا اولین رندر سرور هم
 * lang و dir درست داشته باشد (فارسی = rtl؛ انگلیسی = ltr) — بدون فلش
 * جهت اشتباه و بدون ناسازگاری هیدراتیشن. انتخاب زبان در کلاینت توسط
 * UiLangProvider مدیریت و در همان کوکی ذخیره می‌شود.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let locale: Locale = "fa";
  try {
    const store = await cookies();
    locale = toLocale(store.get(UI_LANG_COOKIE)?.value);
  } catch {
    // در محیط‌های بدون کوکی، پیش‌فرض فارسی
  }

  return (
    <html
      lang={locale}
      dir={dirOf(locale)}
      className={`${vazirmatn.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
