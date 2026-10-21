import {
  LayoutDashboard,
  Box,
  Dumbbell,
  CalendarCheck2,
  UtensilsCrossed,
  TrendingUp,
  Bot,
  UserRoundCog,
  Users,
  ClipboardList,
  MessagesSquare,
  FolderOpen,
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
  | "coaches"
  | "coachPlans"
  | "coachPanel"
  | "messages"
  | "admin"
  | "profile";

export interface NavItem {
  id: ViewId;
  fa: string;
  en: string;
  /** توضیح فارسی بخش — داده اصلی */
  description: string;
  /** توضیح انگلیسی بخش — ترجمه نمایشی، داده اصلی دست‌نخورده می‌ماند */
  descriptionEn: string;
  icon: LucideIcon;
  /** مرحله‌ی توسعه که در آن این بخش واقعاً پیاده‌سازی می‌شود */
  stage: number;
  /** فهرست قابلیت‌هایی که در این بخش ساخته خواهد شد */
  features: string[];
  /** نقش‌های مجاز برای دیدن این بخش — undefined یعنی همه */
  roles?: ("STUDENT" | "COACH" | "ADMIN")[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    fa: "داشبورد",
    en: "Dashboard",
    description: "مرکز مدیریت مسیر تناسب اندام شما با داده واقعی حساب کاربری",
    descriptionEn:
      "The control center of your fitness journey, powered by your real account data",
    icon: LayoutDashboard,
    stage: 0,
    features: [],
  },
  {
    id: "coach3d",
    fa: "مربی سه‌بعدی",
    en: "3D Coach",
    description: "اجرای تعاملی حرکات با مدل سه‌بعدی و نمایش عضلات درگیر",
    descriptionEn:
      "Interactive exercise walkthrough with a 3D model and engaged-muscle highlights",
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
    descriptionEn:
      "A structured exercise bank with full technical details and how-to guidance",
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
    descriptionEn:
      "A dedicated weekly plan built from your goal, level, and available equipment",
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
    descriptionEn:
      "Personal calories, macronutrients, and a custom meal schedule",
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
    descriptionEn:
      "Weight charts, body measurements, and your real workout history",
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
    description: "چت واقعی با مدل زبانی بر اساس داده‌های واقعی حساب شما",
    descriptionEn:
      "A real language-model chat grounded in your real account data",
    icon: Bot,
    stage: 8,
    features: [
      "چت واقعی با مدل زبانی از سمت سرور (کلید فقط در سرور)",
      "پاسخ فارسی و انگلیسی با تشخیص خودکار یا انتخاب دستی زبان",
      "استفاده حداقلی و فقط‌خواندنی از پروفایل، برنامه‌ها و سابقه واقعی شما",
      "ذخیره مکالمه‌ها، بازیابی پس از ورود مجدد و حذف با تأیید",
    ],
  },
  {
    id: "coaches",
    fa: "مربیان",
    en: "Coaches",
    description: "فهرست عمومی مربیان تأییدشده و مدیریت ارتباط با مربی",
    descriptionEn:
      "The public list of verified coaches and your coach connection manager",
    icon: Users,
    stage: 15,
    features: [
      "مشاهده رایگان پروفایل عمومی مربیان تأییدشده",
      "نمایش وضعیت اشتراک FREE / PREMIUM",
      "ارسال درخواست ارتباط برای کاربران اشتراک ویژه",
      "پیگیری درخواست‌ها و ارتباط فعال با مربی در بخش ارتباط‌های من",
    ],
  },
  {
    id: "coachPlans",
    fa: "برنامه‌های اختصاصی مربی",
    en: "Coach Custom Plans",
    description: "برنامه‌های تمرینی و غذایی که مربی شما اختصاصاً برای شما ساخته و ارسال کرده است",
    descriptionEn:
      "Workout and nutrition plans your coach built and sent specifically for you",
    icon: FolderOpen,
    stage: 16,
    features: [
      "مشاهده برنامه‌های تمرینی دریافتی با روزها، ست، تکرار و یادداشت مربی",
      "مشاهده برنامه‌های غذایی دریافتی با وعده‌ها و مقادیر پیشنهادی",
      "شروع جلسه تمرین واقعی از روی روز برنامه مربی",
      "ثبت مصرف واقعی اقلام برنامه غذایی از مسیر ثبت مصرف موجود",
    ],
  },
  {
    id: "coachPanel",
    fa: "پنل مربی",
    en: "Coach Panel",
    description: "مدیریت پروفایل حرفه‌ای مربی، درخواست‌های دریافتی و دانشجویان فعال",
    descriptionEn:
      "Manage the professional coach profile, incoming requests, and active students",
    icon: ClipboardList,
    stage: 15,
    roles: ["COACH"],
    features: [
      "ویرایش پروفایل حرفه‌ای و کنترل انتشار عمومی",
      "بررسی و پاسخ به درخواست‌های ارتباط دریافتی",
      "فهرست دانشجویان فعال و وضعیت هر ارتباط",
      "ساخت و ارسال برنامه‌های تمرینی و غذایی اختصاصی",
    ],
  },
  {
    id: "messages",
    fa: "گفتگو",
    en: "Messages",
    description: "گفتگوی آزاد با همه کاربران — جست‌وجوی نام و ارسال پیام با به‌روزرسانی زنده",
    descriptionEn:
      "Free messaging with all users — name search and live-updating conversations",
    icon: MessagesSquare,
    stage: 20,
    features: [
      "جست‌وجوی هر کاربر با نام و شروع گفتگو",
      "فهرست گفتگوها با شمار نخوانده",
      "به‌روزرسانی زنده پیام‌ها و اعلان‌ها",
    ],
  },
  {
    id: "admin",
    fa: "پنل مدیریت",
    en: "Admin Panel",
    description: "مدیریت کاربران، اشتراک‌ها، درخواست مربی‌گری، درخواست ارتقا و مرکز پشتیبانی",
    descriptionEn:
      "Manage users, subscriptions, coach applications, upgrade requests, and the support center",
    icon: Users,
    stage: 19,
    roles: ["ADMIN"],
    features: [
      "نمای کلی با شمارش زنده کاربران، اشتراک‌ها و تیکت‌های باز",
      "جست‌وجوی کاربران، تغییر نقش و اعطای اشتراک با انقضا و یادداشت",
      "بررسی درخواست‌های مربی‌گری و درخواست‌های ارتقای Premium",
      "پاسخ و پیگیری تیکت‌های مرکز پشتیبانی",
    ],
  },
  {
    id: "profile",
    fa: "پروفایل و تنظیمات",
    en: "Profile & Settings",
    description: "اطلاعات بدنی، اهداف، تجهیزات و ترجیحات شخصی شما",
    descriptionEn:
      "Your body metrics, goals, equipment, and personal preferences",
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

/** فهرست ناوبری مجاز برای یک نقش — فیلتر سمت کلاینت فقط نمایشی است */
export function navItemsForRole(role: string | null | undefined): NavItem[] {
  return NAV_ITEMS.filter(
    (item) => !item.roles || (role !== null && item.roles.includes(role as never))
  );
}

/** مرحله جاری توسعه — مرجع واحد برای داشبورد و کارت وضعیت */
export const CURRENT_STAGE = 8;

/** نقشه راه ۱۳ مرحله‌ای توسعه محصول — برای نمایش وضعیت شفاف در داشبورد */
export interface DevStage {
  index: number;
  /** عنوان فارسی — داده اصلی */
  title: string;
  /** عنوان انگلیسی — ترجمه نمایشی */
  titleEn: string;
}

export const DEV_STAGES: DevStage[] = [
  { index: 0, title: "بررسی محیط و راه‌اندازی پوسته پایه", titleEn: "Environment survey and base shell setup" },
  { index: 1, title: "تکمیل هویت بصری و رابط کاربری", titleEn: "Visual identity and UI polish" },
  { index: 2, title: "مربی سه‌بعدی تعاملی و نمایش عضلات", titleEn: "Interactive 3D coach and muscle mapping" },
  { index: 3, title: "ثبت‌نام، ورود و پروفایل شخصی", titleEn: "Sign-up, sign-in, and personal profile" },
  { index: 4, title: "داشبورد شخصی مبتنی بر داده واقعی", titleEn: "Real-data personal dashboard" },
  { index: 5, title: "کتابخانه حرکات ورزشی", titleEn: "Exercise library" },
  { index: 6, title: "برنامه‌ساز تمرینی شخصی", titleEn: "Personal workout plan builder" },
  { index: 7, title: "سیستم تغذیه و رژیم غذایی", titleEn: "Nutrition and diet system" },
  { index: 8, title: "دستیار هوشمند مربی", titleEn: "AI coach assistant" },
  { index: 9, title: "معماری فنی و پایگاه داده", titleEn: "Technical architecture and database" },
  { index: 10, title: "تست و کنترل کیفیت", titleEn: "Testing and quality control" },
  { index: 11, title: "بهینه‌سازی عملکرد", titleEn: "Performance optimization" },
  { index: 12, title: "آماده‌سازی برای انتشار", titleEn: "Release readiness" },
];
