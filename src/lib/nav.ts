import {
  LayoutDashboard,
  Box,
  Dumbbell,
  CalendarCheck2,
  UtensilsCrossed,
  TrendingUp,
  Bot,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";

/** شناسه‌ی بخش‌های اصلی پنل — جهت ناوبری سمت کلاینت */
export type ViewId =
  | "dashboard"
  | "coach3d"
  | "library"
  | "workout"
  | "nutrition"
  | "progress"
  | "assistant"
  | "profile";

export interface NavItem {
  id: ViewId;
  fa: string;
  en: string;
  description: string;
  icon: LucideIcon;
  /** مرحله‌ی توسعه که در آن این بخش واقعاً پیاده‌سازی می‌شود */
  stage: number;
  /** فهرست قابلیت‌هایی که در این بخش ساخته خواهد شد */
  features: string[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    fa: "داشبورد",
    en: "Dashboard",
    description: "مرکز مدیریت مسیر تناسب اندام شما با داده واقعی حساب کاربری",
    icon: LayoutDashboard,
    stage: 0,
    features: [],
  },
  {
    id: "coach3d",
    fa: "مربی سه‌بعدی",
    en: "3D Coach",
    description: "اجرای تعاملی حرکات با مدل سه‌بعدی و نمایش عضلات درگیر",
    icon: Box,
    stage: 2,
    features: [
      "نمایش کاراکتر سه‌بعدی با انیمیشن اختصاصی برای هر حرکت",
      "چرخش و زوم دوربین با نماهای روبه‌رو، پشت، پهلو و ۴۵ درجه",
      "هایلایت عضلات اصلی و فرعی درگیر در طول اجرای حرکت",
      "نمایش مراحل اجرا، تنفس صحیح، خطاهای رایج و شمارنده ست و تکرار",
    ],
  },
  {
    id: "library",
    fa: "کتابخانه حرکات",
    en: "Exercise Library",
    description: "بانک ساختاریافته حرکات با جزئیات فنی کامل و آموزش اجرا",
    icon: Dumbbell,
    stage: 5,
    features: [
      "بانک حداقل ۴۰ حرکت متداول بدنسازی با اطلاعات علمی",
      "جست‌وجو و فیلتر بر اساس عضله، تجهیزات و سطح دشواری",
      "جزئیات کامل اجرا: مراحل، تنفس، خطاهای رایج و نکات ایمنی",
      "اجرای مستقیم هر حرکت در مربی سه‌بعدی و افزودن به برنامه",
    ],
  },
  {
    id: "workout",
    fa: "برنامه تمرینی",
    en: "Workout Plan",
    description: "برنامه هفتگی اختصاصی بر اساس هدف، سطح و تجهیزات شما",
    icon: CalendarCheck2,
    stage: 6,
    features: [
      "ساخت برنامه هفتگی بر پایه قوانین مشخص متناسب با سطح شما",
      "تقسیم‌بندی عضلات با ست، تکرار و زمان استراحت هر حرکت",
      "ثبت ست‌های انجام‌شده، تکمیل تمرین و مشاهده سابقه",
      "جایگزینی حرکات با احترام به محدودیت‌ها و آسیب‌های گزارش‌شده",
    ],
  },
  {
    id: "nutrition",
    fa: "برنامه غذایی",
    en: "Nutrition Plan",
    description: "کالری، درشت‌مغذی‌ها و برنامه وعده‌های غذایی شخصی",
    icon: UtensilsCrossed,
    stage: 7,
    features: [
      "محاسبه BMI، BMR (Mifflin–St Jeor)، TDEE و کالری هدف",
      "تعیین پروتئین، کربوهیدرات و چربی روزانه بر اساس هدف",
      "برنامه وعده‌ها با امکان جایگزینی غذا و تغییر مقادیر",
      "هشدار آلرژی‌ها و رعایت ترجیحات و رژیم غذایی انتخابی",
    ],
  },
  {
    id: "progress",
    fa: "پیشرفت من",
    en: "My Progress",
    description: "نمودار وزن، اندازه‌های بدن و سابقه واقعی تمرین‌ها",
    icon: TrendingUp,
    stage: 4,
    features: [
      "ثبت وزن و اندازه‌های بدن در تاریخ‌های مختلف",
      "نمودار روند وزن و پیشرفت تمرینی بر اساس داده واقعی شما",
      "شمار جلسات انجام‌شده و تاریخچه کامل تمرین‌ها",
      "حالت خالی شفاف تا زمان ثبت اولین اطلاعات",
    ],
  },
  {
    id: "assistant",
    fa: "دستیار هوشمند",
    en: "AI Assistant",
    description: "پاسخ به سؤالات تمرینی و تغذیه‌ای بر اساس داده‌های شما",
    icon: Bot,
    stage: 8,
    features: [
      "پاسخ به سؤالات برنامه تمرینی، جایگزینی حرکت و تغذیه",
      "دسترسی کنترل‌شده به پروفایل، برنامه‌ها و بانک حرکات",
      "لایه اتصال قابل جایگزینی به سرویس AI واقعی از سمت سرور",
      "بدون ارائه تشخیص یا برنامه درمانی پزشکی",
    ],
  },
  {
    id: "profile",
    fa: "پروفایل و تنظیمات",
    en: "Profile & Settings",
    description: "اطلاعات بدنی، اهداف، تجهیزات و ترجیحات شخصی شما",
    icon: UserRoundCog,
    stage: 3,
    features: [
      "ساخت حساب کاربری، ورود و خروج امن با نشست سمت سرور",
      "فرایند راه‌اندازی چندمرحله‌ای اطلاعات بدنی و اهداف",
      "ثبت تجهیزات در دسترس، محدودیت‌های حرکتی و آلرژی‌ها",
      "ویرایش کامل اطلاعات در هر زمان",
    ],
  },
];

export function getNavItem(id: ViewId): NavItem {
  return NAV_ITEMS.find((item) => item.id === id) ?? NAV_ITEMS[0];
}

/** مرحله جاری توسعه — مرجع واحد برای داشبورد و کارت وضعیت */
export const CURRENT_STAGE = 8;

/** نقشه راه ۱۳ مرحله‌ای توسعه محصول — برای نمایش وضعیت شفاف در داشبورد */
export interface DevStage {
  index: number;
  title: string;
}

export const DEV_STAGES: DevStage[] = [
  { index: 0, title: "بررسی محیط و راه‌اندازی پوسته پایه" },
  { index: 1, title: "تکمیل هویت بصری و رابط کاربری" },
  { index: 2, title: "مربی سه‌بعدی تعاملی و نمایش عضلات" },
  { index: 3, title: "ثبت‌نام، ورود و پروفایل شخصی" },
  { index: 4, title: "داشبورد شخصی مبتنی بر داده واقعی" },
  { index: 5, title: "کتابخانه حرکات ورزشی" },
  { index: 6, title: "برنامه‌ساز تمرینی شخصی" },
  { index: 7, title: "سیستم تغذیه و رژیم غذایی" },
  { index: 8, title: "دستیار هوشمند مربی" },
  { index: 9, title: "معماری فنی و پایگاه داده" },
  { index: 10, title: "تست و کنترل کیفیت" },
  { index: 11, title: "بهینه‌سازی عملکرد" },
  { index: 12, title: "آماده‌سازی برای انتشار" },
];
