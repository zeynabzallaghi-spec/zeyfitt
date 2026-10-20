/**
 * دیکشنری بخش «پنل مدیریت» — مرحله ۱۹.۵.
 * الگو مطابق سایر sectionsها: اینترفیس تایپ‌شده + دو دیکشنری کامل fa/en.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface AdminStrings {
  title: string;
  titleEn: string;
  intro: string;
  introEn: string;
  documentTitle: string;
  realBadge: string;

  // تب‌ها
  overviewTab: string;
  usersTab: string;
  coachApplicationsTab: string;
  premiumRequestsTab: string;
  ticketsTab: string;

  // نمای کلی
  overviewIntro: string;
  countUsers: string;
  countStudents: string;
  countCoaches: string;
  countAdmins: string;
  countPremiumActive: string;
  countPendingCoachApplications: string;
  countPendingPremiumRequests: string;
  countOpenTickets: string;
  countExercises: string;

  // کاربران
  usersIntro: string;
  searchPlaceholder: string;
  roleFilterAll: string;
  roleFilterStudent: string;
  roleFilterCoach: string;
  roleFilterAdmin: string;
  usersCount: (n: number) => string;
  emptyUsersTitle: string;
  emptyUsersNote: string;
  colUser: string;
  colRole: string;
  colSubscription: string;
  colJoined: string;
  colActions: string;
  roleStudent: string;
  roleCoach: string;
  roleAdmin: string;
  changeRole: string;
  changeRoleTitle: (name: string) => string;
  changeRoleNote: string;
  grantSubscription: string;
  grantTitle: (name: string) => string;
  grantNoteIntro: string;
  daysLabel: string;
  daysNoExpiry: string;
  daysPlaceholder: string;
  noteLabel: string;
  notePlaceholder: string;
  tierFree: string;
  tierPremium: string;
  subscriptionFree: string;
  subscriptionPremium: string;
  subscriptionPremiumExpired: string;
  expiresOn: (date: string) => string;
  confirmGrant: string;
  confirmRevoke: string;
  adminBadge: string;

  // درخواست مربی‌گری
  applicationsIntro: string;
  statusFilterAll: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
  emptyApplicationsTitle: string;
  emptyApplicationsNote: string;
  applicantLabel: string;
  experienceLabel: string;
  experienceYearsLabel: (n: number) => string;
  messageLabel: string;
  noMessage: string;
  certificationsLabel: string;
  noCertifications: string;
  applicationAttachmentsLabel: string;
  attachmentViewAction: string;
  attachmentNoAttachments: string;
  approveAction: string;
  rejectAction: string;
  publishCheckbox: string;
  publishCheckboxNote: string;
  decisionNoteLabel: string;
  decisionNotePlaceholder: string;
  decidedAt: (date: string) => string;

  // درخواست‌های Premium
  premiumRequestsIntro: string;
  emptyPremiumRequestsTitle: string;
  emptyPremiumRequestsNote: string;
  approveDaysLabel: string;
  approveDaysPlaceholder: string;
  approveDaysNoExpiry: string;

  // تیکت‌ها
  ticketsIntro: string;
  emptyTicketsTitle: string;
  emptyTicketsNote: string;
  ticketCategoryLabel: string;
  ticketBodyLabel: string;
  ticketReplyLabel: string;
  ticketReplyPlaceholder: string;
  adminReplyLabel: string;
  replyAction: string;
  resolveAction: string;
  closeAction: string;
  statusOpen: string;
  statusAnswered: string;
  statusResolved: string;
  statusClosed: string;
  repliedAt: (date: string) => string;

  // وضعیت‌های مشترک
  loading: string;
  retry: string;
  errorTitle: string;
  confirmTitle: string;
  confirmYes: string;
  confirmNo: string;
  submit: string;
  cancel: string;
  successGeneric: string;
}

const ADMIN_STRINGS: Record<Locale, AdminStrings> = {
  fa: {
    title: "پنل مدیریت",
    titleEn: "Admin Panel",
    intro: "مدیریت واقعی کاربران، اشتراک‌ها، درخواست‌ها و پشتیبانی — هر تغییر در گزارش اقدام ثبت می‌شود.",
    introEn: "Real management of users, subscriptions, requests, and support — every change is audit-logged.",
    documentTitle: "پنل مدیریت — AI Fitness Coach",
    realBadge: "داده واقعی حساب‌ها",

    overviewTab: "نمای کلی",
    usersTab: "کاربران",
    coachApplicationsTab: "درخواست مربی‌گری",
    premiumRequestsTab: "درخواست ارتقا",
    ticketsTab: "تیکت پشتیبانی",

    overviewIntro: "شمارش زنده از دیتابیس — بدون هیچ آمار ساختگی.",
    countUsers: "کل کاربران",
    countStudents: "دانشجو",
    countCoaches: "مربی",
    countAdmins: "ادمین",
    countPremiumActive: "اشتراک فعال Premium",
    countPendingCoachApplications: "درخواست مربی‌گری در انتظار",
    countPendingPremiumRequests: "درخواست ارتقا در انتظار",
    countOpenTickets: "تیکت باز",
    countExercises: "حرکت فعال بانک",

    usersIntro: "جست‌وجو در کاربران واقعی، تغییر نقش و اعطای اشتراک با انقضای مشخص.",
    searchPlaceholder: "جست‌وجوی نام یا ایمیل…",
    roleFilterAll: "همه نقش‌ها",
    roleFilterStudent: "دانشجو",
    roleFilterCoach: "مربی",
    roleFilterAdmin: "ادمین",
    usersCount: (n) => `${localeNumber(n, "fa")} کاربر`,
    emptyUsersTitle: "کاربری یافت نشد",
    emptyUsersNote: "عبارت جست‌وجو یا فیلتر نقش را تغییر دهید.",
    colUser: "کاربر",
    colRole: "نقش",
    colSubscription: "اشتراک",
    colJoined: "عضویت",
    colActions: "اقدام",
    roleStudent: "دانشجو",
    roleCoach: "مربی",
    roleAdmin: "ادمین",
    changeRole: "تغییر نقش",
    changeRoleTitle: (name) => `تغییر نقش ${name}`,
    changeRoleNote: "تغییر نقش فوراً اعمال می‌شود؛ نقش خودتان و آخرین ادمین قابل تغییر نیست.",
    grantSubscription: "اشتراک",
    grantTitle: (name) => `مدیریت اشتراک ${name}`,
    grantNoteIntro: "اعطای Premium دستی با منبع «manual» و یادداشت شفاف ثبت می‌شود.",
    daysLabel: "مدت (روز)",
    daysNoExpiry: "بدون انقضا",
    daysPlaceholder: "مثلاً ۳۰",
    noteLabel: "یادداشت (اختیاری)",
    notePlaceholder: "یادداشت شفاف برای این اعطا…",
    tierFree: "رایگان",
    tierPremium: "ویژه",
    subscriptionFree: "رایگان",
    subscriptionPremium: "Premium",
    subscriptionPremiumExpired: "Premium منقضی‌شده",
    expiresOn: (date) => `انقضا: ${date}`,
    confirmGrant: "ثبت",
    confirmRevoke: "لغو Premium",
    adminBadge: "شما",

    applicationsIntro: "درخواست‌های مربی‌گری کاربران — تأیید یعنی نقش مربی + پروفایل تأییدشده.",
    statusFilterAll: "همه",
    statusPending: "در انتظار",
    statusApproved: "تأییدشده",
    statusRejected: "ردشده",
    emptyApplicationsTitle: "درخواستی یافت نشد",
    emptyApplicationsNote: "با تغییر فیلتر وضعیت فهرست را دوباره ببینید.",
    applicantLabel: "متقاضی",
    experienceLabel: "سابقه",
    experienceYearsLabel: (n) => `${localeNumber(n, "fa")} سال`,
    messageLabel: "متن معرفی",
    noMessage: "متقاضی متنی ننوشته است.",
    certificationsLabel: "مدارک اعلامی",
    applicationAttachmentsLabel: "اسناد پیوستی متقاضی",
    attachmentViewAction: "مشاهده سند",
    attachmentNoAttachments: "سندی پیوست نشده است",
    noCertifications: "مدارکی ثبت نشده است.",
    approveAction: "تأیید",
    rejectAction: "رد",
    publishCheckbox: "انتشار عمومی پروفایل (در صورت کامل بودن)",
    publishCheckboxNote: "انتشار فقط با بیو ≥۲۰ کاراکتر و حداقل یک نوع همکاری اعمال می‌شود.",
    decisionNoteLabel: "یادداشت تصمیم (داخلی)",
    decisionNotePlaceholder: "دلیل رد یا یادداشت تصمیم…",
    decidedAt: (date) => `تصمیم: ${date}`,

    premiumRequestsIntro: "درخواست‌های ارتقای Free به Premium — تأیید یعنی اعطای دستی اشتراک.",
    emptyPremiumRequestsTitle: "درخواستی یافت نشد",
    emptyPremiumRequestsNote: "با تغییر فیلتر وضعیت فهرست را دوباره ببینید.",
    approveDaysLabel: "مدت اعطا (روز)",
    approveDaysPlaceholder: "مثلاً ۳۰",
    approveDaysNoExpiry: "بدون انقضا",

    ticketsIntro: "تیکت‌های پشتیبانی همه کاربران — پاسخ شفاف و پیگیری وضعیت.",
    emptyTicketsTitle: "تیکتی یافت نشد",
    emptyTicketsNote: "با تغییر فیلتر وضعیت فهرست را دوباره ببینید.",
    ticketCategoryLabel: "دسته",
    ticketBodyLabel: "شرح مشکل",
    ticketReplyLabel: "پاسخ شما",
    ticketReplyPlaceholder: "پاسخ شفاف به کاربر…",
    adminReplyLabel: "پاسخ پشتیبانی",
    replyAction: "ارسال پاسخ",
    resolveAction: "حل‌شده",
    closeAction: "بستن",
    statusOpen: "باز",
    statusAnswered: "پاسخ داده‌شده",
    statusResolved: "حل‌شده",
    statusClosed: "بسته",
    repliedAt: (date) => `پاسخ: ${date}`,

    loading: "در حال بارگذاری…",
    retry: "تلاش دوباره",
    errorTitle: "خطا در دریافت داده",
    confirmTitle: "تأیید نهایی",
    confirmYes: "بله، انجام بده",
    confirmNo: "انصراف",
    submit: "ثبت",
    cancel: "انصراف",
    successGeneric: "با موفقیت انجام شد.",
  },
  en: {
    title: "Admin Panel",
    titleEn: "Admin Panel",
    intro: "Real management of users, subscriptions, requests, and support — every change is audit-logged.",
    introEn: "Real management of users, subscriptions, requests, and support — every change is audit-logged.",
    documentTitle: "Admin Panel — AI Fitness Coach",
    realBadge: "Real account data",

    overviewTab: "Overview",
    usersTab: "Users",
    coachApplicationsTab: "Coach Applications",
    premiumRequestsTab: "Upgrade Requests",
    ticketsTab: "Support Tickets",

    overviewIntro: "Live counts straight from the database — no made-up statistics.",
    countUsers: "Total users",
    countStudents: "Students",
    countCoaches: "Coaches",
    countAdmins: "Admins",
    countPremiumActive: "Active Premium",
    countPendingCoachApplications: "Pending coach applications",
    countPendingPremiumRequests: "Pending upgrade requests",
    countOpenTickets: "Open tickets",
    countExercises: "Active exercises",

    usersIntro: "Search real users, change roles, and grant subscriptions with explicit expiry.",
    searchPlaceholder: "Search name or email…",
    roleFilterAll: "All roles",
    roleFilterStudent: "Student",
    roleFilterCoach: "Coach",
    roleFilterAdmin: "Admin",
    usersCount: (n) => `${localeNumber(n, "en")} users`,
    emptyUsersTitle: "No users found",
    emptyUsersNote: "Change the search term or role filter.",
    colUser: "User",
    colRole: "Role",
    colSubscription: "Subscription",
    colJoined: "Joined",
    colActions: "Actions",
    roleStudent: "Student",
    roleCoach: "Coach",
    roleAdmin: "Admin",
    changeRole: "Change role",
    changeRoleTitle: (name) => `Change role — ${name}`,
    changeRoleNote: "Role changes apply immediately; your own account and the last admin cannot be changed.",
    grantSubscription: "Subscription",
    grantTitle: (name) => `Manage subscription — ${name}`,
    grantNoteIntro: "Manual Premium grants are recorded with source “manual” and a transparent note.",
    daysLabel: "Duration (days)",
    daysNoExpiry: "No expiry",
    daysPlaceholder: "e.g. 30",
    noteLabel: "Note (optional)",
    notePlaceholder: "A transparent note for this grant…",
    tierFree: "Free",
    tierPremium: "Premium",
    subscriptionFree: "Free",
    subscriptionPremium: "Premium",
    subscriptionPremiumExpired: "Premium (expired)",
    expiresOn: (date) => `Expires: ${date}`,
    confirmGrant: "Save",
    confirmRevoke: "Revoke Premium",
    adminBadge: "You",

    applicationsIntro: "User coach applications — approval means the COACH role plus a verified profile.",
    statusFilterAll: "All",
    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    emptyApplicationsTitle: "No applications found",
    emptyApplicationsNote: "Change the status filter to see the list again.",
    applicantLabel: "Applicant",
    experienceLabel: "Experience",
    experienceYearsLabel: (n) => `${localeNumber(n, "en")} years`,
    messageLabel: "Intro message",
    noMessage: "The applicant did not write a message.",
    certificationsLabel: "Declared certifications",
    applicationAttachmentsLabel: "Attached documents",
    attachmentViewAction: "View document",
    attachmentNoAttachments: "No documents attached",
    noCertifications: "No certifications submitted.",
    approveAction: "Approve",
    rejectAction: "Reject",
    publishCheckbox: "Publish profile publicly (if complete)",
    publishCheckboxNote: "Publishing applies only with a bio of 20+ characters and at least one cooperation type.",
    decisionNoteLabel: "Decision note (internal)",
    decisionNotePlaceholder: "Rejection reason or decision note…",
    decidedAt: (date) => `Decided: ${date}`,

    premiumRequestsIntro: "Free → Premium upgrade requests — approval grants the subscription manually.",
    emptyPremiumRequestsTitle: "No requests found",
    emptyPremiumRequestsNote: "Change the status filter to see the list again.",
    approveDaysLabel: "Grant duration (days)",
    approveDaysPlaceholder: "e.g. 30",
    approveDaysNoExpiry: "No expiry",

    ticketsIntro: "Support tickets from all users — reply transparently and track status.",
    emptyTicketsTitle: "No tickets found",
    emptyTicketsNote: "Change the status filter to see the list again.",
    ticketCategoryLabel: "Category",
    ticketBodyLabel: "Issue description",
    ticketReplyLabel: "Your reply",
    ticketReplyPlaceholder: "A transparent reply to the user…",
    adminReplyLabel: "Support reply",
    replyAction: "Send reply",
    resolveAction: "Resolve",
    closeAction: "Close",
    statusOpen: "Open",
    statusAnswered: "Answered",
    statusResolved: "Resolved",
    statusClosed: "Closed",
    repliedAt: (date) => `Replied: ${date}`,

    loading: "Loading…",
    retry: "Retry",
    errorTitle: "Failed to load data",
    confirmTitle: "Confirm",
    confirmYes: "Yes, do it",
    confirmNo: "Cancel",
    submit: "Save",
    cancel: "Cancel",
    successGeneric: "Done successfully.",
  },
};

export function adminStringsFor(locale: Locale): AdminStrings {
  return ADMIN_STRINGS[locale];
}

export function adminStrings(locale: Locale): AdminStrings {
  return ADMIN_STRINGS[locale];
}
