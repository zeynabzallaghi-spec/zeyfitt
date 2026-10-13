# Worklog — AI Fitness Coach

---
Task ID: 0
Agent: Super Z (main agent)
Task: مرحله صفر — بررسی محیط، راه‌اندازی پروژه، ساخت پوسته پایه (نوار کناری + سربرگ + داشبورد اولیه)، اجرای سایت در Preview

Work Log:
- بارگذاری مهارت fullstack-dev و اجرای init script
- بررسی محیط: Next.js 16.1.3 (App Router, Turbopack) + TypeScript 5 + Tailwind CSS 4 + shadcn/ui کامل + Prisma (SQLite)
- تم تیره ذغالی (oklch 0.135) با رنگ تأکیدی سبز نئونی لیمویی (oklch 0.89 0.22 128)
- layout.tsx: lang="fa" + dir="rtl" + فونت Vazirmatn + کلاس dark
- معماری: ناوبری سمت کلاینت روی مسیر واحد `/` با zustand store
- فایل‌های جدید: src/lib/nav.ts، src/store/app-store.ts، src/components/fitness/{app-shell,sidebar-nav,header}.tsx و views
- رفع خطای lint (useSyncExternalStore)، هشدار key spread، هم‌پوشانی دکمه بستن Sheet در RTL
- رفع 403 دامنه پیش‌نمایش با allowedDevOrigins و ری‌استارت سرور با setsid
- تست کامل agent-browser: دسکتاپ و موبایل، کنسول بدون خطا

Stage Summary:
- پوسته پایه فعال: ۸ بخش با ناوبری واقعی، داشبورد با حالت خالی صادقانه، بدون داده ساختگی

---
Task ID: 1
Agent: Super Z (main agent)
Task: مرحله اول — حرفه‌ای‌سازی رابط کاربری: ارتقای داشبورد، منوی کناری، سربرگ و طراحی هشت صفحه اختصاصی

Work Log:
- ساخت src/store/fitness-store.ts: پیام‌های گفت‌وگوی دستیار + پیش‌نویس پروفایل (فقط درون نشست، بدون ذخیره سرور)
- ساخت کامپوننت‌های مشترک:
  - shared/badges.tsx — DemoBadge (نمونه نمایشی کهربایی)، StageBadge، DifficultyBadge
  - shared/empty-state.tsx — حالت خالی یکپارچه و راهنماکننده
  - shared/view-intro.tsx — نوار معرفی یکدست بالای هر بخش
  - shared/weekly-sample-chart.tsx — نمودار recharts با داده نمونه مشخص‌دار (RTL: شنبه سمت راست، محور Y راست)
- ساخت src/lib/sample-data.ts: ۶ حرکت نمونه کامل با جزئیات + داده نمونه نمودار (همه با برچسب «نمونه نمایشی»)
- داشبورد جدید: هیرو با دو CTA، ۴ کارت آماری خالی صادقانه (تمرین/زمان/پیشرفت/وضعیت برنامه)، برنامه امروز (EmptyState)، کارت برجسته شروع مسیر (گرادیان لایم)، پیشرفت هفتگی (نمودار نمونه)، دسترسی سریع، نقشه راه
- sidebar-nav: نشانگر فعال لبه شروع با glow، برچسب گروه، active:scale feedback، کارت وضعیت به‌روز (مرحله ۱ از ۱۲)
- header: آیکون بخش فعال + دو دکمه میان‌بر (مربی سه‌بعدی، دستیار) + حذف بج شلوغ از سربرگ
- هشت صفحه اختصاصی:
  1. dashboard-view.tsx (بازطراحی کامل)
  2. coach3d-view.tsx — صحنه آماده‌سازی با کف پرسپکتیو CSS + HUD + وضعیت شفاف + کنترل‌های طراحی‌شده غیرفعال
  3. library-view.tsx — جست‌وجو/فیلتر دسته و سطح واقعاً فعال روی داده نمونه + دیالوگ جزئیات + EmptyState نتیجه خالی
  4. workout-view.tsx — نوار وضعیت + شبکه ۷ روز خالی + راهنمای شروع ۳ مرحله‌ای + CTA
  5. nutrition-view.tsx — ۴ کارت درشت‌مغذی خالی + ۴ وعده + روش محاسبه Mifflin–St Jeor + هشدار پزشکی
  6. progress-view.tsx — قاب نمودار خالی + جدول اندازه‌ها + تاریخچه خالی + راهنمای ثبت
  7. assistant-view.tsx — چت کامل: حباب‌ها، تایپینگ، پاسخ وضعیت صادقانه (نه AI جعلی)، پیشنهاد سؤال، پاک‌سازی تایمر، اسکرول خودکار
  8. profile-view.tsx — فرم تعاملی کامل (Select/Input/Textarea/Chips) + بنر شفافیت + ذخیره پیش‌نویس نشست + بازنشانی
- حذف coming-soon-view.tsx (جایگزین شده با ۸ نمای اختصاصی)
- رفع خطای TS: تایپ Variants فریمور framer-motion در dashboard-view
- تست‌ها: ESLint پاس، tsc بدون خطا در src، کنسول صفر خطا، ناوبری هر ۸ بخش دسکتاپ، جست‌وجوی «پرس» (۲ نتیجه)، دیالوگ جزئیات، چت دستیار، فرم پروفایل (fill + chip + toast)، سرریز افقی صفر در ۳۹۰/۷۶۸px

Stage Summary:
- رابط کامل و یکپارچه: هویت بصری حفظ شد (ذغالی + لیمویی + Vazirmatn + RTL) و کیفیت ارتقا یافت
- هیچ قابلیت پیاده‌نشده‌ای به‌صورت آماده معرفی نشد: موتور سه‌بعدی، برنامه‌ساز، تغذیه و AI همگی با وضعیت شفاف
- داده‌های نمونه فقط برای نمایش ساختار و همیشه با DemoBadge مشخص‌دار
- وضعیت: مرحله اول کامل شد — در انتظار تأیید کاربر برای مرحله ۲ (حساب کاربری و پروفایل)
