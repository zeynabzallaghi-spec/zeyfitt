/**
 * دیکشنری بخش «پیام‌رسانی خصوصی مربی و دانشجو» — مرحله ۱۷.
 * پنل گفت‌وگو (مشترک بین دانشجو و مربی)، فهرست مکالمه‌ها، وضعیت‌های
 * ارسال (pending/sent/failed)، خوانده‌شدن، بنرهای شفاف فقط‌خواندنی
 * پس از پایان ارتباط یا انقضای اشتراک و خطاهای شبکه.
 * دو دیکشنری کامل fa/en با اینترفیس تایپ‌شده — کلید گم‌شده در کامپایل
 * و در scripts/check-i18n.ts گرفته میشود.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";

export interface CoachChatStrings {
  // پنل گفت‌وگو
  chatTitle: string;
  back: string;
  loading: string;
  retry: string;
  loadError: string;
  refresh: string;

  // فهرست مکالمه‌ها (تب مربی + منبع ورودی‌ها)
  listTitle: string;
  listIntro: string;
  listEmptyTitle: string;
  listEmptyNote: string;
  openChat: string;
  viewChat: string;
  unreadLabel: (n: number) => string;
  noMessagesYet: string;
  lastActivityLabel: string;
  statusActive: string;
  statusEnded: string;
  chatNote: string;

  // پیام‌ها
  emptyConversationTitle: string;
  emptyConversationNote: string;
  inputLabel: string;
  inputPlaceholder: string;
  send: string;
  sending: string;
  sendFailed: string;
  resend: string;
  pendingLabel: string;
  failedLabel: string;
  seenLabel: string;
  loadOlder: string;
  loadingOlder: string;
  youLabel: string;

  // بنرهای فقط‌خواندنی — سیاست شفاف حفظ تاریخچه
  readOnlyEnded: string;
  readOnlyEndedNote: string;
  readOnlySubscription: string;
  readOnlySubscriptionNote: string;
  readOnlyCoach: string;
  readOnlyCoachNote: string;
  readOnlyRole: string;
  readOnlyRoleNote: string;
  historyKeptNote: string;

  // خطاهای قابل‌فهم
  errSessionExpired: string;
  errForbidden: string;
  errNotFound: string;
  errRateLimited: string;
  errNetwork: string;
  errValidation: string;

  // دسترس‌پذیری و متفرقه
  messagesTab: string;
  messagesIntro: string;
  ariaMessageList: string;
  charCount: (n: number) => string;
}

const fa: CoachChatStrings = {
  chatTitle: "گفت‌وگوی خصوصی",
  back: "بازگشت",
  loading: "در حال بارگذاری گفت‌وگو…",
  retry: "تلاش مجدد",
  loadError: "بارگذاری گفت‌وگو ممکن نشد.",
  refresh: "به‌روزرسانی",

  listTitle: "پیام‌ها",
  listIntro: "گفت‌وگوی خصوصی با دانشجویان ارتباط فعال و سابقه گفت‌وگو",
  listEmptyTitle: "هنوز گفت‌وگویی نیست",
  listEmptyNote:
    "وقتی ارتباط فعال داشته باشید یا گفت‌وگویی ثبت شده باشد، اینجا نمایش داده میشود.",
  openChat: "شروع گفت‌وگو",
  viewChat: "مشاهده گفت‌وگو",
  unreadLabel: (n) => `${localeNumber(n, "fa")} پیام خوانده‌نشده`,
  noMessagesYet: "هنوز پیامی ردوبدل نشده است.",
  lastActivityLabel: "آخرین فعالیت",
  statusActive: "فعال",
  statusEnded: "پایان‌یافته",
  chatNote: "گفت‌وگو",

  emptyConversationTitle: "هنوز پیامی نیست",
  emptyConversationNote:
    "اولین پیام را بنویسید؛ گفت‌وگوی شما خصوصی میماند و پس از خروج و ورود مجدد هم قابل مشاهده است.",
  inputLabel: "متن پیام",
  inputPlaceholder: "پیام خود را بنویسید…",
  send: "ارسال",
  sending: "در حال ارسال…",
  sendFailed: "ارسال پیام ممکن نشد.",
  resend: "تلاش مجدد برای ارسال",
  pendingLabel: "در حال ارسال…",
  failedLabel: "ارسال نشد",
  seenLabel: "دیده شد",
  loadOlder: "نمایش پیام‌های قدیمی‌تر",
  loadingOlder: "در حال بارگذاری…",
  youLabel: "شما",

  readOnlyEnded:
    "این ارتباط پایان یافته است؛ ارسال پیام جدید ممکن نیست.",
  readOnlyEndedNote:
    "گفت‌وگو در حالت فقط‌خواندنی است و تاریخچه پیام‌های قبلی حفظ شده است.",
  readOnlySubscription:
    "اشتراک ویژه شما فعال نیست؛ ارسال پیام جدید موقتاً مسدود است.",
  readOnlySubscriptionNote:
    "برای ادامه گفت‌وگو به اشتراک ویژه (PREMIUM) نیاز است؛ تاریخچه پیام‌های قبلی حفظ شده است.",
  readOnlyCoach:
    "وضعیت تأیید مربی‌گری معتبر نیست؛ ارسال پیام جدید مسدود است.",
  readOnlyCoachNote:
    "تاریخچه گفت‌وگو حفظ شده است؛ برای فعال شدن دوباره ارسال، وضعیت مربی‌گری باید معتبر شود.",
  readOnlyRole:
    "نقش حساب شما اجازه ارسال پیام در این گفت‌وگو را نمیدهد.",
  readOnlyRoleNote:
    "تاریخچه گفت‌وگو حفظ شده و قابل مشاهده است.",
  historyKeptNote: "تاریخچه پیام‌های قبلی بدون تغییر حفظ میشود.",

  errSessionExpired: "نشست شما منقضی شده است؛ دوباره وارد شوید.",
  errForbidden: "اجازه انجام این کار را ندارید.",
  errNotFound: "این گفت‌وگو یافت نشد یا به شما تعلق ندارد.",
  errRateLimited: "تعداد پیام‌ها زیاد است؛ کمی بعد دوباره تلاش کنید.",
  errNetwork: "ارتباط با سرور برقرار نشد؛ اتصال خود را بررسی کنید.",
  errValidation: "متن پیام معتبر نیست.",

  messagesTab: "پیام‌ها",
  messagesIntro:
    "گفت‌وگوی خصوصی متنی با دانشجویان خود — تاریخچه پیام‌ها پایدار و خصوصی میماند.",
  ariaMessageList: "فهرست پیام‌های گفت‌وگو",
  charCount: (n) => `${localeNumber(n, "fa")} کاراکتر`,
};

const en: CoachChatStrings = {
  chatTitle: "Private conversation",
  back: "Back",
  loading: "Loading conversation…",
  retry: "Retry",
  loadError: "The conversation could not be loaded.",
  refresh: "Refresh",

  listTitle: "Messages",
  listIntro: "Private chats with your active students and past conversations",
  listEmptyTitle: "No conversations yet",
  listEmptyNote:
    "When you have an active connection or a recorded conversation, it will appear here.",
  openChat: "Start conversation",
  viewChat: "View conversation",
  unreadLabel: (n) => `${localeNumber(n, "en")} unread`,
  noMessagesYet: "No messages have been exchanged yet.",
  lastActivityLabel: "Last activity",
  statusActive: "Active",
  statusEnded: "Ended",
  chatNote: "Chat",

  emptyConversationTitle: "No messages yet",
  emptyConversationNote:
    "Write the first message; your conversation stays private and remains available after signing out and back in.",
  inputLabel: "Message text",
  inputPlaceholder: "Write your message…",
  send: "Send",
  sending: "Sending…",
  sendFailed: "The message could not be sent.",
  resend: "Retry sending",
  pendingLabel: "Sending…",
  failedLabel: "Not sent",
  seenLabel: "Seen",
  loadOlder: "Load older messages",
  loadingOlder: "Loading…",
  youLabel: "You",

  readOnlyEnded:
    "This connection has ended; sending new messages is not possible.",
  readOnlyEndedNote:
    "The conversation is read-only and previous messages are preserved.",
  readOnlySubscription:
    "Your premium subscription is not active; sending new messages is temporarily blocked.",
  readOnlySubscriptionNote:
    "Continuing the conversation requires a PREMIUM subscription; previous messages are preserved.",
  readOnlyCoach:
    "Your coach verification is not valid; sending new messages is blocked.",
  readOnlyCoachNote:
    "The conversation history is preserved; sending resumes only when the coaching status is valid again.",
  readOnlyRole:
    "Your account role does not allow sending messages in this conversation.",
  readOnlyRoleNote:
    "The conversation history is preserved and remains viewable.",
  historyKeptNote: "Previous messages are preserved unchanged.",

  errSessionExpired: "Your session has expired; please sign in again.",
  errForbidden: "You do not have permission to do this.",
  errNotFound: "This conversation was not found, or does not belong to you.",
  errRateLimited: "Too many messages; please try again shortly.",
  errNetwork: "Could not reach the server; please check your connection.",
  errValidation: "The message text is not valid.",

  messagesTab: "Messages",
  messagesIntro:
    "Private text conversations with your students — history stays persistent and private.",
  ariaMessageList: "Conversation message list",
  charCount: (n) => `${localeNumber(n, "en")} characters`,
};

export function coachChatStrings(locale: Locale): CoachChatStrings {
  return locale === "en" ? en : fa;
}
