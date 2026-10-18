/**
 * دیکشنری «پنل مربی» — وضعیت تأیید/انتشار، ویرایش پروفایل حرفه‌ای،
 * درخواست‌های دریافتی و دانشجویان فعال. الگو مطابق سایر sectionsها.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface CoachPanelStrings {
  title: string;
  titleEn: string;
  intro: string;
  introEn: string;
  documentTitle: string;
  // وضعیت حساب مربی
  statusTitle: string;
  verifiedBadge: string;
  notVerifiedBadge: string;
  publishedBadge: string;
  unpublishedBadge: string;
  statusIntro: string;
  verificationNote: string;
  publishToggle: string;
  publishOn: string;
  publishOff: string;
  publishing: string;
  publishBlocked: string;
  applicationsNote: string;
  applyAgainHint: string;
  // ویرایش پروفایل
  profileFormTitle: string;
  profileFormIntro: string;
  displayNameLabel: string;
  headlineLabel: string;
  bioLabel: string;
  specializationsLabel: string;
  certificationsLabel: string;
  experienceYearsLabel: string;
  cooperationTypesLabel: string;
  cooperationHintSemiPrivate: string;
  cooperationHintPrivate: string;
  saveProfile: string;
  savingProfile: string;
  profileSavedTitle: string;
  profileSavedNote: string;
  addCertification: string;
  certificationPlaceholder: string;
  remove: string;
  minBioNote: string;
  // درخواست‌های دریافتی
  requestsTitle: string;
  requestsIntro: string;
  emptyRequestsTitle: string;
  emptyRequestsNote: string;
  acceptRequest: string;
  rejectRequest: string;
  accepting: string;
  rejecting: string;
  rejectReasonLabel: string;
  rejectReasonPlaceholder: string;
  rejectOptional: string;
  studentNameLabel: string;
  requestMessageLabel: string;
  requestedAtLabel: string;
  receivedRequestAria: string;
  conflictNote: string;
  // دانشجویان فعال
  studentsTitle: string;
  studentsIntro: string;
  emptyStudentsTitle: string;
  emptyStudentsNote: string;
  activeSinceLabel: string;
  studentCount: (n: number) => string;
  pendingCount: (n: number) => string;
  // سیستم‌ها
  loading: string;
  loadError: string;
  retry: string;
  networkError: string;
  // وضعیت‌های مشترک toast
  statusActive: string;
  statusRejected: string;
  // پلن‌بندی آینده — مرز شفاف
  futureNote: string;
}

const FA: CoachPanelStrings = {
  title: "پنل مربی",
  titleEn: "Coach Panel",
  intro: "مدیریت پروفایل حرفه‌ای، بررسی درخواست‌های دریافتی و دانشجویان فعال شما.",
  introEn: "Manage your professional profile, review incoming requests, and see your active students.",
  documentTitle: "پنل مربی — AI Fitness Coach",
  statusTitle: "وضعیت حساب مربی",
  verifiedBadge: "تأییدشده",
  notVerifiedBadge: "در انتظار تأیید مدیریت",
  publishedBadge: "منتشرشده در فهرست عمومی",
  unpublishedBadge: "منتشرنشده",
  statusIntro: "درخواست جدید فقط در صورت تأییدشده بودن، منتشرشده بودن و کامل بودن اطلاعات عمومی دریافت می‌شود.",
  verificationNote: "تأیید حساب توسط مدیریت و فقط سمت سرور انجام می‌شود؛ از دست رفتن تأیید یا انتشار، ارتباط‌های قبلی را حذف نمی‌کند.",
  publishToggle: "انتشار عمومی پروفایل",
  publishOn: "منتشر کن",
  publishOff: "برداشتن از انتشار",
  publishing: "در حال ثبت…",
  publishBlocked: "برای انتشار، ابتدا اطلاعات پروفایل را کامل کنید (نام، معرفی حداقل ۲۰ نویسه و حداقل یک نوع همکاری).",
  applicationsNote: "درخواست مربی‌گری شما بررسی شده و حساب شما تأیید شده است.",
  applyAgainHint: "برای بازبینی مجدد، با پشتیبانی در تماس باشید.",
  profileFormTitle: "پروفایل حرفه‌ای",
  profileFormIntro: "این اطلاعات همان چیزی است که در فهرست عمومی و صفحه مربی نمایش داده می‌شود.",
  displayNameLabel: "نام نمایشی حرفه‌ای",
  headlineLabel: "عنوان کوتاه حرفه‌ای",
  bioLabel: "معرفی حرفه‌ای",
  specializationsLabel: "تخصص‌ها",
  certificationsLabel: "مدارک",
  experienceYearsLabel: "سال سابقه",
  cooperationTypesLabel: "انواع همکاری که ارائه می‌دهید",
  cooperationHintSemiPrivate: "برنامه استانداردشده + پایش پیشرفت دانشجو",
  cooperationHintPrivate: "همکاری خصوصی؛ تمرین آنلاین زنده در مراحل آینده",
  saveProfile: "ذخیره پروفایل",
  savingProfile: "در حال ذخیره…",
  profileSavedTitle: "پروفایل ذخیره شد",
  profileSavedNote: "اگر پروفایل منتشرشده بود و اطلاعات ناقص شد، انتشار به‌صورت شفاف خاموش می‌شود.",
  addCertification: "افزودن مدرک",
  certificationPlaceholder: "نام مدرک یا گواهی",
  remove: "حذف",
  minBioNote: "حداقل ۲۰ نویسه برای انتشار عمومی لازم است",
  requestsTitle: "درخواست‌های دریافتی",
  requestsIntro: "فقط درخواست‌های دانشجویان به خود شما نمایش داده می‌شود؛ تصمیم فقط سمت سرور ثبت می‌شود.",
  emptyRequestsTitle: "درخواست در انتظار بررسی ندارید",
  emptyRequestsNote: "به‌محض ثبت درخواست جدید، اینجا با اطلاعات مجاز دانشجو نمایش داده می‌شود.",
  acceptRequest: "پذیرش",
  rejectRequest: "رد",
  accepting: "در حال پذیرش…",
  rejecting: "در حال رد…",
  rejectReasonLabel: "دلیل رد (اختیاری)",
  rejectReasonPlaceholder: "مثلاً: ظرفیت من در حال حاضر تکمیل است",
  rejectOptional: "حداکثر ۲۰۰ کاراکتر",
  studentNameLabel: "دانشجو",
  requestMessageLabel: "پیام دانشجو",
  requestedAtLabel: "تاریخ ارسال",
  receivedRequestAria: "درخواست‌های دریافتی در انتظار بررسی",
  conflictNote: "وضعیت این درخواست بین بارگذاری و کلیک شما تغییر کرده است؛ فهرست به‌روز شد.",
  studentsTitle: "دانشجویان فعال",
  studentsIntro: "ارتباط‌های پذیرفته‌شده و فعال شما؛ برنامه اختصاصی در مراحل بعدی اضافه می‌شود.",
  emptyStudentsTitle: "هنوز دانشجوی فعالی ندارید",
  emptyStudentsNote: "پس از پذیرش اولین درخواست، دانشجو اینجا ظاهر می‌شود.",
  activeSinceLabel: "فعال از",
  studentCount: (n) => `${localeNumber(n, "fa")} دانشجوی فعال`,
  pendingCount: (n) => `${localeNumber(n, "fa")} درخواست در انتظار`,
  loading: "در حال دریافت…",
  loadError: "دریافت اطلاعات ناموفق بود.",
  retry: "تلاش مجدد",
  networkError: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.",
  statusActive: "درخواست پذیرفته شد",
  statusRejected: "درخواست رد شد",
  futureNote: "چت، جلسه آنلاین و برنامه‌های اختصاصی در مراحل بعدی ارائه می‌شوند؛ این بخش فقط قابلیت‌های واقعی فعلی را نشان می‌دهد.",
};

const EN: CoachPanelStrings = {
  title: "Coach Panel",
  titleEn: "Coach Panel",
  intro: "Manage your professional profile, review incoming requests, and see your active students.",
  introEn: "مدیریت پروفایل حرفه‌ای، بررسی درخواست‌های دریافتی و دانشجویان فعال شما.",
  documentTitle: "Coach Panel — AI Fitness Coach",
  statusTitle: "Coach account status",
  verifiedBadge: "Verified",
  notVerifiedBadge: "Awaiting verification",
  publishedBadge: "Published in the public list",
  unpublishedBadge: "Not published",
  statusIntro: "New requests arrive only when your account is verified, published, and your public info is complete.",
  verificationNote: "Verification is done by the administration server-side only; losing verification or publication never deletes past connections.",
  publishToggle: "Public profile publishing",
  publishOn: "Publish",
  publishOff: "Unpublish",
  publishing: "Applying…",
  publishBlocked: "To publish, first complete your profile (name, at least 20 characters of bio, and at least one cooperation type).",
  applicationsNote: "Your coach application has been reviewed and your account is verified.",
  applyAgainHint: "Contact support for a re-review.",
  profileFormTitle: "Professional profile",
  profileFormIntro: "This information is exactly what appears in the public list and your coach page.",
  displayNameLabel: "Professional display name",
  headlineLabel: "Short professional headline",
  bioLabel: "Professional bio",
  specializationsLabel: "Specializations",
  certificationsLabel: "Certifications",
  experienceYearsLabel: "Years of experience",
  cooperationTypesLabel: "Cooperation types you offer",
  cooperationHintSemiPrivate: "Standardized plans + student progress monitoring",
  cooperationHintPrivate: "Private cooperation; live online sessions in later stages",
  saveProfile: "Save profile",
  savingProfile: "Saving…",
  profileSavedTitle: "Profile saved",
  profileSavedNote: "If the profile was published and the new info is incomplete, publishing is turned off transparently.",
  addCertification: "Add certification",
  certificationPlaceholder: "Certificate or credential name",
  remove: "Remove",
  minBioNote: "At least 20 characters are required for public publishing",
  requestsTitle: "Incoming requests",
  requestsIntro: "You only see requests addressed to you; decisions are recorded server-side only.",
  emptyRequestsTitle: "No pending requests",
  emptyRequestsNote: "As soon as a new request arrives, it appears here with the student's allowed info.",
  acceptRequest: "Accept",
  rejectRequest: "Reject",
  accepting: "Accepting…",
  rejecting: "Rejecting…",
  rejectReasonLabel: "Rejection reason (optional)",
  rejectReasonPlaceholder: "e.g. My capacity is currently full",
  rejectOptional: "Up to 200 characters",
  studentNameLabel: "Student",
  requestMessageLabel: "Student's message",
  requestedAtLabel: "Requested at",
  receivedRequestAria: "Incoming requests awaiting review",
  conflictNote: "This request's status changed between page load and your click; the list was refreshed.",
  studentsTitle: "Active students",
  studentsIntro: "Your accepted, active connections; dedicated plan delivery comes in later stages.",
  emptyStudentsTitle: "No active students yet",
  emptyStudentsNote: "After accepting your first request, the student appears here.",
  activeSinceLabel: "Active since",
  studentCount: (n) => `${n} active students`,
  pendingCount: (n) => `${n} pending requests`,
  loading: "Loading…",
  loadError: "Failed to load the information.",
  retry: "Retry",
  networkError: "Could not reach the server; check your connection.",
  statusActive: "Request accepted",
  statusRejected: "Request rejected",
  futureNote: "Chat, live sessions, and dedicated plans arrive in later stages; this section only shows real current capabilities.",
};

const STRINGS: Record<Locale, CoachPanelStrings> = { fa: FA, en: EN };

export function coachPanelStrings(locale: Locale): CoachPanelStrings {
  return STRINGS[locale];
}
