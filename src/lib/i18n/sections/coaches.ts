/**
 * دیکشنری بخش «مربیان» — فهرست عمومی، جزئیات مربی، درخواست ارتباط و
 * «ارتباط‌های من» دانشجو. الگو دقیقاً مطابق سایر sectionsها: اینترفیس
 * تایپ‌شده + دو دیکشنری کامل fa/en — کلید گم‌شده از کامپایل رد می‌شود.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface CoachesStrings {
  title: string;
  titleEn: string;
  intro: string;
  introEn: string;
  documentTitle: string;
  // تب‌ها
  browseTab: string;
  myConnectionsTab: string;
  // وضعیت اشتراک در سربرگ بخش
  subscriptionTitle: string;
  freePlanNote: string;
  premiumPlanNote: string;
  expiredPlanNote: string;
  // فهرست مربیان
  coachesListTitle: string;
  coachesListIntro: string;
  coachCount: (n: number) => string;
  emptyCoachesTitle: string;
  emptyCoachesNote: string;
  viewProfile: string;
  yearsExperience: (n: number) => string;
  specializationsLabel: string;
  cooperationLabel: string;
  certificationsLabel: string;
  verifiedBadge: string;
  // دیالوگ جزئیات
  requestConnection: string;
  requestConnectionHint: string;
  cooperationTypeChoose: string;
  messageLabel: string;
  messagePlaceholder: string;
  messageOptional: string;
  sendMessageRequest: string;
  sending: string;
  // پیام‌های وضعیت دسترسی
  guestPrompt: string;
  guestSignIn: string;
  freeUpsell: string;
  premiumActiveNote: string;
  requestSentTitle: string;
  requestSentNote: string;
  // ارتباط‌های من
  myConnectionsTitle: string;
  myConnectionsIntro: string;
  currentCoachTitle: string;
  noCurrentCoach: string;
  pendingSection: string;
  historySection: string;
  activeSection: string;
  emptyConnectionsTitle: string;
  emptyConnectionsNote: string;
  cancelRequest: string;
  cancelConfirmTitle: string;
  cancelConfirmNote: string;
  cancelYes: string;
  keepIt: string;
  cancelling: string;
  endConnection: string;
  endConfirmTitle: string;
  endConfirmNote: string;
  endYes: string;
  ending: string;
  requestMessageLabel: string;
  rejectionReasonLabel: string;
  requestedAt: string;
  decidedAt: string;
  endedAt: string;
  endedByStudent: string;
  endedByCoach: string;
  // وضعیت‌ها
  statusPending: string;
  statusActive: string;
  statusRejected: string;
  statusCancelled: string;
  statusEnded: string;
  // سیستم‌ها
  loading: string;
  loadingCoaches: string;
  loadingConnections: string;
  loadError: string;
  retry: string;
  networkError: string;
  refresh: string;
  closeDialog: string;
  requestAria: string;
  historyAria: string;
}

const FA: CoachesStrings = {
  title: "مربیان",
  titleEn: "Coaches",
  intro: "مربیان تأییدشده و منتشرشده؛ مشاهده رایگان است و درخواست ارتباط به اشتراک ویژه نیاز دارد.",
  introEn: "Verified and published coaches; browsing is free and connection requests need a Premium subscription.",
  documentTitle: "مربیان — AI Fitness Coach",
  browseTab: "فهرست مربیان",
  myConnectionsTab: "ارتباط‌های من",
  subscriptionTitle: "وضعیت اشتراک شما",
  freePlanNote: "شما روی پلن رایگان هستید؛ می‌توانید مربیان را ببینید، اما برای ارسال درخواست ارتباط به اشتراک ویژه نیاز دارید.",
  premiumPlanNote: "اشتراک ویژه شما فعال است؛ می‌توانید برای ارتباط با مربیان درخواست بفرستید.",
  expiredPlanNote: "اشتراک ویژه شما منقضی شده است؛ برای درخواست جدید باید اشتراک فعال باشد.",
  coachesListTitle: "مربیان منتشرشده",
  coachesListIntro: "اطلاعات عمومی و حرفه‌ای هر مربی دقیقاً همان چیزی است که خودش منتشر کرده است.",
  coachCount: (n) => `${localeNumber(n, "fa")} مربی`,
  emptyCoachesTitle: "هنوز مربی منتشرشده‌ای نیست",
  emptyCoachesNote: "به‌محض انتشار اولین پروفایل حرفه‌ای مربی، اینجا نمایش داده می‌شود.",
  viewProfile: "مشاهده پروفایل",
  yearsExperience: (n) => `${localeNumber(n, "fa")} سال سابقه`,
  specializationsLabel: "تخصص‌ها",
  cooperationLabel: "نوع همکاری",
  certificationsLabel: "مدارک منتشرشده",
  verifiedBadge: "تأییدشده",
  requestConnection: "درخواست ارتباط",
  requestConnectionHint: "درخواست شما برای مربی ارسال می‌شود و پس از بررسی او، وضعیتش در «ارتباط‌های من» دیده می‌شود.",
  cooperationTypeChoose: "نوع همکاری را انتخاب کنید",
  messageLabel: "پیام معرفی و هدف شما",
  messagePlaceholder: "مثلاً: هدف من کاهش وزن با ۳ جلسه تمرین در هفته است…",
  messageOptional: "اختیاری — حداکثر ۵۰۰ کاراکتر",
  sendMessageRequest: "ارسال درخواست",
  sending: "در حال ارسال…",
  guestPrompt: "برای ارسال درخواست ارتباط ابتدا وارد حساب خود شوید.",
  guestSignIn: "ورود / ثبت‌نام",
  freeUpsell: "ارسال درخواست ارتباط بخشی از اشتراک ویژه است. پلن رایگان شما شامل مشاهده مربیان، دستیار هوشمند و برنامه‌ساز است.",
  premiumActiveNote: "اشتراک فعال شما امکان ارسال درخواست را فراهم می‌کند.",
  requestSentTitle: "درخواست شما ثبت شد",
  requestSentNote: "وضعیت درخواست در تب «ارتباط‌های من» دیده می‌شود؛ تصمیم فقط پس از بررسی مربی اعمال می‌شود.",
  myConnectionsTitle: "ارتباط‌های من با مربیان",
  myConnectionsIntro: "فقط درخواست‌ها و ارتباط‌های خودتان را می‌بینید؛ هیچ وضعیتی بدون تأیید واقعی سرور تغییر نمی‌کند.",
  currentCoachTitle: "مربی فعال من",
  noCurrentCoach: "فعلاً ارتباط فعالی با مربی ندارید.",
  pendingSection: "در انتظار بررسی",
  historySection: "تاریخچه درخواست‌ها",
  activeSection: "ارتباط فعال",
  emptyConnectionsTitle: "هنوز درخواستی ثبت نکرده‌اید",
  emptyConnectionsNote: "از تب «فهرست مربیان» می‌توانید اولین درخواست ارتباط خود را بفرستید.",
  cancelRequest: "لغو درخواست",
  cancelConfirmTitle: "لغو این درخواست در انتظار؟",
  cancelConfirmNote: "این اقدام فقط درخواست شما را لغو می‌کند و قابل بازگشت نیست؛ برای درخواست مجدد باید فرم تازه پر شود.",
  cancelYes: "بله، لغو کن",
  keepIt: "نه، می‌ماند",
  cancelling: "در حال لغو…",
  endConnection: "پایان ارتباط",
  endConfirmTitle: "پایان دادن به این ارتباط فعال؟",
  endConfirmNote: "ارتباط خاتمه می‌یابد و تاریخچه آن با وضعیت «خاتمه‌یافته» باقی می‌ماند؛ برنامه‌های اختصاصی مربی از مراحل بعدی است.",
  endYes: "بله، پایان بده",
  ending: "در حال پایان…",
  requestMessageLabel: "پیام شما در درخواست",
  rejectionReasonLabel: "دلیل رد مربی",
  requestedAt: "تاریخ ارسال",
  decidedAt: "تاریخ تصمیم",
  endedAt: "تاریخ پایان",
  endedByStudent: "پایان توسط شما",
  endedByCoach: "پایان توسط مربی",
  statusPending: "در انتظار بررسی",
  statusActive: "فعال",
  statusRejected: "ردشده",
  statusCancelled: "لغوشده",
  statusEnded: "خاتمه‌یافته",
  loading: "در حال دریافت…",
  loadingCoaches: "در حال دریافت فهرست مربیان…",
  loadingConnections: "در حال دریافت ارتباط‌های شما…",
  loadError: "دریافت اطلاعات ناموفق بود.",
  retry: "تلاش مجدد",
  networkError: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.",
  refresh: "به‌روزرسانی",
  closeDialog: "بستن",
  requestAria: "ارسال درخواست ارتباط با مربی",
  historyAria: "تاریخچه درخواست‌ها و ارتباط‌های من",
};

const EN: CoachesStrings = {
  title: "Coaches",
  titleEn: "Coaches",
  intro: "Verified and published coaches; browsing is free and connection requests need a Premium subscription.",
  introEn: "مربیان تأییدشده و منتشرشده؛ مشاهده رایگان است و درخواست ارتباط به اشتراک ویژه نیاز دارد.",
  documentTitle: "Coaches — AI Fitness Coach",
  browseTab: "Browse coaches",
  myConnectionsTab: "My connections",
  subscriptionTitle: "Your subscription",
  freePlanNote: "You are on the Free plan; you can browse coaches, but sending a connection request requires Premium.",
  premiumPlanNote: "Your Premium subscription is active; you can send coach connection requests.",
  expiredPlanNote: "Your Premium subscription has expired; an active subscription is required for new requests.",
  coachesListTitle: "Published coaches",
  coachesListIntro: "Each coach's public and professional info is exactly what they have published.",
  coachCount: (n) => `${n} coaches`,
  emptyCoachesTitle: "No published coaches yet",
  emptyCoachesNote: "As soon as the first professional coach profile is published, it appears here.",
  viewProfile: "View profile",
  yearsExperience: (n) => `${n} years of experience`,
  specializationsLabel: "Specializations",
  cooperationLabel: "Cooperation type",
  certificationsLabel: "Published certifications",
  verifiedBadge: "Verified",
  requestConnection: "Request connection",
  requestConnectionHint: "Your request is sent to the coach; its status appears in “My connections” after their review.",
  cooperationTypeChoose: "Choose a cooperation type",
  messageLabel: "Your intro and goal message",
  messagePlaceholder: "e.g. My goal is weight loss with 3 training sessions per week…",
  messageOptional: "Optional — up to 500 characters",
  sendMessageRequest: "Send request",
  sending: "Sending…",
  guestPrompt: "Please sign in first to send a connection request.",
  guestSignIn: "Sign in / Sign up",
  freeUpsell: "Sending connection requests is part of the Premium subscription. Your Free plan includes browsing coaches, the AI assistant, and the plan builders.",
  premiumActiveNote: "Your active subscription lets you send connection requests.",
  requestSentTitle: "Request submitted",
  requestSentNote: "You can follow its status in the “My connections” tab; the decision is applied only after the coach reviews it.",
  myConnectionsTitle: "My coach connections",
  myConnectionsIntro: "You only see your own requests and connections; no status changes without real server confirmation.",
  currentCoachTitle: "My current coach",
  noCurrentCoach: "You do not have an active coach connection yet.",
  pendingSection: "Awaiting review",
  historySection: "Request history",
  activeSection: "Active connection",
  emptyConnectionsTitle: "No requests yet",
  emptyConnectionsNote: "From the “Browse coaches” tab you can send your first connection request.",
  cancelRequest: "Cancel request",
  cancelConfirmTitle: "Cancel this pending request?",
  cancelConfirmNote: "This only cancels your request and cannot be undone; a new request requires filling the form again.",
  cancelYes: "Yes, cancel it",
  keepIt: "No, keep it",
  cancelling: "Cancelling…",
  endConnection: "End connection",
  endConfirmTitle: "End this active connection?",
  endConfirmNote: "The connection ends and its history remains with the “Ended” status; dedicated coach plans belong to later stages.",
  endYes: "Yes, end it",
  ending: "Ending…",
  requestMessageLabel: "Your message in the request",
  rejectionReasonLabel: "Coach's rejection reason",
  requestedAt: "Requested at",
  decidedAt: "Decided at",
  endedAt: "Ended at",
  endedByStudent: "Ended by you",
  endedByCoach: "Ended by the coach",
  statusPending: "Pending",
  statusActive: "Active",
  statusRejected: "Rejected",
  statusCancelled: "Cancelled",
  statusEnded: "Ended",
  loading: "Loading…",
  loadingCoaches: "Loading the coach list…",
  loadingConnections: "Loading your connections…",
  loadError: "Failed to load the information.",
  retry: "Retry",
  networkError: "Could not reach the server; check your connection.",
  refresh: "Refresh",
  closeDialog: "Close",
  requestAria: "Send a coach connection request",
  historyAria: "My request and connection history",
};

const STRINGS: Record<Locale, CoachesStrings> = { fa: FA, en: EN };

export function coachesStrings(locale: Locale): CoachesStrings {
  return STRINGS[locale];
}
