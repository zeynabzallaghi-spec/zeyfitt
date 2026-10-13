import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
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
