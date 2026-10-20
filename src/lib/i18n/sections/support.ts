/**
 * دیکشنری بخش «مرکز پشتیبانی و درخواست‌ها» — مرحله ۱۹.۵.
 * شامل تیکت پشتیبانی، درخواست ارتقای Premium و درخواست مربی‌گری سمت کاربر.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface SupportStrings {
  // مرکز پشتیبانی
  supportSectionTitle: string;
  supportIntro: string;
  newTicket: string;
  newTicketTitle: string;
  categoryLabel: string;
  categoryBug: string;
  categoryAccount: string;
  categorySubscription: string;
  categoryCoach: string;
  categoryOther: string;
  subjectLabel: string;
  subjectPlaceholder: string;
  bodyLabel: string;
  bodyPlaceholder: string;
  submitTicket: string;
  myTicketsTitle: string;
  myTicketsIntro: string;
  emptyTicketsTitle: string;
  emptyTicketsNote: string;
  ticketCount: (n: number) => string;
  adminReplyLabel: string;
  closeTicket: string;
  reopenTicket: string;
  supportThanks: string;
  supportNotePrivacy: string;
  supportReadonlyClosed: string;

  // درخواست ارتقای Premium
  premiumSectionTitle: string;
  premiumFreeIntro: string;
  premiumRequestAction: string;
  premiumRequestTitle: string;
  premiumMessageLabel: string;
  premiumMessagePlaceholder: string;
  premiumRequestHint: string;
  premiumPendingNote: string;
  premiumApprovedNote: string;
  premiumRejectedNote: string;
  premiumResubmitAction: string;
  premiumDecisionNoteLabel: string;
  premiumNoPaymentNote: string;

  // درخواست مربی‌گری
  coachApplySectionTitle: string;
  coachApplyIntro: string;
  coachApplyAction: string;
  coachApplyEditAction: string;
  coachApplyPendingNote: string;
  coachApplyApprovedNote: string;
  coachApplyRejectedNote: string;
  coachApplyMessageLabel: string;
  coachApplyMessagePlaceholder: string;
  coachApplyExperienceLabel: string;
  coachApplyExperiencePlaceholder: string;
  coachApplyCertificationsLabel: string;
  coachApplyCertificationsPlaceholder: string;
  coachApplyCertificationsHint: string;
  coachApplySubmit: string;
  coachIsCoachNote: string;
  coachApplyDecisionNoteLabel: string;

  // مشترک
  loading: string;
  retry: string;
  submit: string;
  cancel: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
  charCount: (n: number, max: number) => string;
}

const SUPPORT_STRINGS: Record<Locale, SupportStrings> = {
  fa: {
    supportSectionTitle: "مرکز پشتیبانی",
    supportIntro: "مشکل یا پرسش خود را ثبت کنید و پاسخ مدیریت را همین‌جا پیگیری کنید.",
    newTicket: "ثبت تیکت جدید",
    newTicketTitle: "تیکت پشتیبانی جدید",
    categoryLabel: "دسته",
    categoryBug: "مشکل فنی",
    categoryAccount: "حساب کاربری",
    categorySubscription: "اشتراک",
    categoryCoach: "مربی‌گری",
    categoryOther: "سایر",
    subjectLabel: "خلاصه مشکل",
    subjectPlaceholder: "خلاصه‌ای کوتاه از مشکل…",
    bodyLabel: "شرح کامل",
    bodyPlaceholder: "شرح کامل مشکل، مراحلی که انجام دادید و نتیجه‌ای که دیدید…",
    submitTicket: "ارسال تیکت",
    myTicketsTitle: "تیکت‌های من",
    myTicketsIntro: "تاریخچه تیکت‌های شما — هیچ تیکتی حذف نمی‌شود.",
    emptyTicketsTitle: "تیکتی ثبت نکرده‌اید",
    emptyTicketsNote: "با دکمه «ثبت تیکت جدید» اولین درخواست خود را بفرستید.",
    ticketCount: (n) => `${localeNumber(n, "fa")} تیکت`,
    adminReplyLabel: "پاسخ پشتیبانی",
    closeTicket: "بستن تیکت",
    reopenTicket: "بازگشایی",
    supportThanks: "تیکت شما ثبت شد؛ پاسخ در همین بخش اطلاع داده می‌شود.",
    supportNotePrivacy: "در متن تیکت رمز یا اطلاعات حساس ننویسید؛ پشتیبانی هرگز رمز شما را نمی‌خواهد.",
    supportReadonlyClosed: "این تیکت بسته شده است؛ برای موضوع جدید تیکت تازه ثبت کنید.",

    premiumSectionTitle: "درخواست ارتقای اشتراک",
    premiumFreeIntro: "با اشتراک Premium می‌توانید با مربی تأییدشده ارتباط بگیرید و برنامه اختصاصی دریافت کنید.",
    premiumRequestAction: "درخواست ارتقا به Premium",
    premiumRequestTitle: "درخواست ارتقای اشتراک",
    premiumMessageLabel: "توضیح شما (اختیاری)",
    premiumMessagePlaceholder: "چرا به اشتراک ویژه نیاز دارید؟",
    premiumRequestHint: "درخواست شما برای مدیریت ثبت می‌شود؛ پس از بررسی، نتیجه همین‌جا نمایش داده می‌شود. در این مرحله پرداختی وجود ندارد.",
    premiumPendingNote: "درخواست شما ثبت شده و در انتظار بررسی مدیریت است.",
    premiumApprovedNote: "درخواست شما تأیید شد و اشتراک Premium فعال است.",
    premiumRejectedNote: "درخواست شما رد شد؛ می‌توانید با توضیح بیشتر دوباره ارسال کنید.",
    premiumResubmitAction: "ارسال دوباره درخواست",
    premiumDecisionNoteLabel: "پاسخ مدیریت",
    premiumNoPaymentNote: "فعلاً هیچ پرداختی در کار نیست؛ اعطای Premium با تصمیم مدیریت انجام می‌شود.",

    coachApplySectionTitle: "درخواست مربی‌گری",
    coachApplyIntro: "اگر مربی هستید، درخواست خود را ثبت کنید؛ پس از تأیید مدیریت، پنل مربی برای شما فعال می‌شود.",
    coachApplyAction: "ثبت درخواست مربی‌گری",
    coachApplyEditAction: "ویرایش و ارسال دوباره",
    coachApplyPendingNote: "درخواست مربی‌گری شما در انتظار بررسی مدیریت است.",
    coachApplyApprovedNote: "درخواست شما تأیید شد؛ حساب شما مربی است و پنل مربی فعال است.",
    coachApplyRejectedNote: "درخواست شما رد شد؛ می‌توانید آن را ویرایش و دوباره ارسال کنید.",
    coachApplyMessageLabel: "معرفی خود (اختیاری)",
    coachApplyMessagePlaceholder: "تجربه و رویکرد مربی‌گری خود را معرفی کنید…",
    coachApplyExperienceLabel: "سابقه (سال)",
    coachApplyExperiencePlaceholder: "مثلاً ۵",
    coachApplyCertificationsLabel: "مدارک (هر خط یک مدرک)",
    coachApplyCertificationsPlaceholder: "مثلاً:\nمدرک بین‌المللی بدنسازی\nعلوم ورزشی",
    coachApplyCertificationsHint: "مدارک صرفاً اعلامی است؛ سند در این مرحله بارگذاری نمی‌شود.",
    coachApplySubmit: "ارسال درخواست",
    coachIsCoachNote: "حساب شما مربی است؛ پنل مربی در منو فعال است.",
    coachApplyDecisionNoteLabel: "یادداشت مدیریت",

    loading: "در حال بارگذاری…",
    retry: "تلاش دوباره",
    submit: "ثبت",
    cancel: "انصراف",
    statusPending: "در انتظار",
    statusApproved: "تأییدشده",
    statusRejected: "ردشده",
    charCount: (n, max) => `${localeNumber(n, "fa")} از ${localeNumber(max, "fa")}`,
  },
  en: {
    supportSectionTitle: "Support Center",
    supportIntro: "Submit an issue or question and track the admin's reply right here.",
    newTicket: "New ticket",
    newTicketTitle: "New support ticket",
    categoryLabel: "Category",
    categoryBug: "Technical issue",
    categoryAccount: "Account",
    categorySubscription: "Subscription",
    categoryCoach: "Coaching",
    categoryOther: "Other",
    subjectLabel: "Summary",
    subjectPlaceholder: "A short summary of the issue…",
    bodyLabel: "Full description",
    bodyPlaceholder: "Describe the issue in full, the steps you took, and what you saw…",
    submitTicket: "Submit ticket",
    myTicketsTitle: "My tickets",
    myTicketsIntro: "Your ticket history — tickets are never deleted.",
    emptyTicketsTitle: "You have no tickets yet",
    emptyTicketsNote: "Use “New ticket” to send your first request.",
    ticketCount: (n) => `${localeNumber(n, "en")} tickets`,
    adminReplyLabel: "Support reply",
    closeTicket: "Close ticket",
    reopenTicket: "Reopen",
    supportThanks: "Your ticket was submitted; the reply will appear here.",
    supportNotePrivacy: "Never include passwords or sensitive data in a ticket; support will never ask for your password.",
    supportReadonlyClosed: "This ticket is closed; open a new ticket for a new topic.",

    premiumSectionTitle: "Upgrade request",
    premiumFreeIntro: "With Premium you can connect to verified coaches and receive custom plans.",
    premiumRequestAction: "Request Premium upgrade",
    premiumRequestTitle: "Upgrade request",
    premiumMessageLabel: "Your message (optional)",
    premiumMessagePlaceholder: "Why do you need Premium?",
    premiumRequestHint: "Your request goes to the admin; the outcome appears here after review. No payment is involved at this stage.",
    premiumPendingNote: "Your request is submitted and awaiting the admin's review.",
    premiumApprovedNote: "Your request was approved and Premium is active.",
    premiumRejectedNote: "Your request was rejected; you can edit and submit it again.",
    premiumResubmitAction: "Submit again",
    premiumDecisionNoteLabel: "Admin reply",
    premiumNoPaymentNote: "There is no payment at this stage; Premium is granted by admin decision.",

    coachApplySectionTitle: "Coach application",
    coachApplyIntro: "If you are a coach, submit your application; after admin approval the Coach Panel unlocks for your account.",
    coachApplyAction: "Apply as coach",
    coachApplyEditAction: "Edit and resubmit",
    coachApplyPendingNote: "Your coach application is awaiting the admin's review.",
    coachApplyApprovedNote: "Your application was approved; your account is a coach and the Coach Panel is active.",
    coachApplyRejectedNote: "Your application was rejected; you can edit and resubmit it.",
    coachApplyMessageLabel: "Self introduction (optional)",
    coachApplyMessagePlaceholder: "Introduce your coaching experience and approach…",
    coachApplyExperienceLabel: "Experience (years)",
    coachApplyExperiencePlaceholder: "e.g. 5",
    coachApplyCertificationsLabel: "Certifications (one per line)",
    coachApplyCertificationsPlaceholder: "e.g.:\nInternational bodybuilding certificate\nSports science degree",
    coachApplyCertificationsHint: "Certifications are self-declared; no documents are uploaded at this stage.",
    coachApplySubmit: "Submit application",
    coachIsCoachNote: "Your account is a coach; the Coach Panel is available in the menu.",
    coachApplyDecisionNoteLabel: "Admin note",

    loading: "Loading…",
    retry: "Retry",
    submit: "Submit",
    cancel: "Cancel",
    statusPending: "Pending",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    charCount: (n, max) => `${localeNumber(n, "en")} of ${localeNumber(max, "en")}`,
  },
};

export function supportStringsFor(locale: Locale): SupportStrings {
  return SUPPORT_STRINGS[locale];
}

export function supportStrings(locale: Locale): SupportStrings {
  return SUPPORT_STRINGS[locale];
}
