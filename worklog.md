# Worklog — AI Fitness Coach

---
Task ID: 0
Agent: Super Z (main agent)
Task: مرحله صفر — بررسی محیط، راه‌اندازی پروژه، ساخت پوسته پایه (نوار کناری + سربرگ + داشبورد اولیه)، اجرای سایت در Preview

Work Log:
- بارگذاری مهارت fullstack-dev و اجرای init script (`curl https://z-cdn.chatglm.cn/fullstack/init-fullstack.sh | bash`)
- بررسی محیط: Next.js 16.1.3 (App Router, Turbopack) + TypeScript 5 + Tailwind CSS 4 + shadcn/ui کامل + Prisma (SQLite) + z-ai-web-dev-sdk؛ سرور dev خودکار روی پورت 3000 اجرا می‌شود
- فایل‌های موجود بررسی شد: layout.tsx، page.tsx، globals.css، schema.prisma، مجموعه کامل کامپوننت‌های ui
- globals.css بازنویسی شد: تم تیره ذغالی (oklch 0.135) با رنگ تأکیدی سبز نئونی لیمویی (oklch 0.89 0.22 128)، افکت‌های glow کنترل‌شده، bg-grid-fade، bg-aura-lime، اسکرول‌بار سفارشی
- layout.tsx بازنویسی شد: lang="fa" + dir="rtl" + فونت Vazirmatn از Google Fonts + کلاس dark + متادیتای محصول + viewport themeColor
- ساختار معماری: ناوبری سمت کلاینت روی مسیر واحد `/` (محدودیت محیط: فقط این مسیر قابل مشاهده است) با zustand store
- فایل‌های جدید:
  - src/lib/nav.ts — پیکربندی ۸ بخش پنل + نقشه راه ۱۳ مرحله‌ای
  - src/store/app-store.ts — استور zustand (activeView + mobileNavOpen)
  - src/components/fitness/sidebar-nav.tsx — BrandMark + SidebarNav + DevStatusCard
  - src/components/fitness/header.tsx — سربرگ با تاریخ شمسی (useSyncExternalStore بدون خطای هیدراتیشن)
  - src/components/fitness/app-shell.tsx — پوسته: نوار کناری دسکتاپ (RTL سمت راست) + Sheet موبایل + پاورقی sticky
  - src/components/fitness/views/dashboard-view.tsx — داشبورد با حالت‌های خالی صادقانه (بدون داده ساختگی)
  - src/components/fitness/views/coming-soon-view.tsx — نمای شفاف برای ۷ بخش در انتظار توسعه
  - public/icon.svg — آیکون هالتر لیمویی
- رفع خطای lint: react-hooks/set-state-in-effect در header.tsx → استفاده از useSyncExternalStore
- رفع هشدار React: انتشار prop شامل key در dashboard-view.tsx → destructure
- رفع هم‌پوشانی دکمه بستن Sheet با برند در RTL: `right-4` → `end-4` (منطقی) در ui/sheet.tsx
- مشکل بحرانی Preview: درخواست‌های cross-origin از دامنه preview-chat-*.space-z.ai به /_next/* با 403 مسدود می‌شد → افزودن allowedDevOrigins به next.config.ts (*.space-z.ai + hostname دقیق) → ری‌استارت dev server با setsid (مکانیزم .zscripts/dev.sh) → تأیید 200 برای Origin پیش‌نمایش
- تست کامل با agent-browser: دسکتاپ 1440px (ناوبری ۸ بخش، coming-soon view، دکمه بازگشت)، موبایل 390px (drawer، بسته شدن خودکار پس از ناوبری)، کنسول بدون خطا، lint پاس

Stage Summary:
- پوسته پایه محصول فعال و قابل مشاهده در Preview: تم تیره + سبز نئونی + RTL فارسی + فونت Vazirmatn
- ۸ بخش پنل با ناوبری واقعی؛ داشبورد با حالت خالی صادقانه و نقشه راه شفاف ۱۳ مرحله‌ای
- هیچ داده ساختگی یا هوش مصنوعی نمایشی استفاده نشده است
- فایل‌های کلیدی: src/app/{layout,page,globals.css}، src/components/fitness/*، src/lib/nav.ts، src/store/app-store.ts، next.config.ts
- وضعیت: مرحله صفر کامل شد — در انتظار تأیید کاربر برای آغاز مرحله ۱ (هویت بصری کامل)
