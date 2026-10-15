/**
 * دیکشنری دوزبانه رابط چت دستیار — سازوکار ترجمه یکپارچه به‌جای پراکندن
 * شرط‌های زبان در کامپوننت‌ها. همه متن‌های قابل مشاهده بخش دستیار در هر
 * دو زبان کامل و طبیعی‌اند؛ هیچ متن ماشینی یا ناقصی مجاز نیست.
 *
 * زبان رابط: «خودکار» و «فارسی» → رابط فارسی راست‌چین (پیش‌فرض اپ)؛
 * «English» → رابط انگلیسی چپ‌چین. جهت هر پیام جدا از جهت رابط بر اساس
 * زبان همان پیام تعیین می‌شود.
 */

import type { LangChoice } from "./types";

export type UiLang = "fa" | "en";

/** انتخاب زبان رابط از روی انتخاب کاربر — خودکار مثل فارسی رندر می‌شود */
export function uiLangOf(choice: LangChoice): UiLang {
  return choice === "en" ? "en" : "fa";
}

export interface AssistantStrings {
  dir: "rtl" | "ltr";
  langAttr: "fa" | "en";
  // سربرگ
  title: string;
  statusConnected: string;
  statusNotConfigured: string;
  statusChecking: string;
  languageLabel: string;
  langAuto: string;
  langFa: string;
  langEn: string;
  conversationsTitle: string;
  newConversation: string;
  noConversationTitle: string;
  // فهرست مکالمه
  historyLoading: string;
  historyError: string;
  historyRetry: string;
  historyEmpty: string;
  deleteConversation: string;
  deleteTitle: string;
  deleteDescription: string;
  deleteCancel: string;
  deleteConfirm: string;
  deleting: string;
  backToConversations: string;
  // چت
  emptyChatTitle: string;
  emptyChatHint: string;
  messagePlaceholder: string;
  send: string;
  responding: string;
  sendingDisabled: string;
  // پیشنهادها
  suggestions: string[];
  // خطاهای ارسال
  errorNotConfigured: string;
  errorNetwork: string;
  errorTimeout: string;
  errorRateLimit: string;
  errorProvider: string;
  errorAuth: string;
  errorValidation: string;
  errorNotFound: string;
  errorInternal: string;
  retryLast: string;
  // اتصال پیکربندی‌نشده
  notConfiguredTitle: string;
  notConfiguredBody: string;
  notConfiguredEnvTitle: string;
  notConfiguredEnvItems: string[];
  notConfiguredNote: string;
  // سایر
  transparencyNote: string;
  messagesCount: (n: number) => string;
  todayLabel: string;
  yesterdayLabel: string;
  loginRequired: string;
}

const FA: AssistantStrings = {
  dir: "rtl",
  langAttr: "fa",
  title: "دستیار هوشمند",
  statusConnected: "اتصال مدل فعال است",
  statusNotConfigured: "اتصال دستیار پیکربندی نشده است",
  statusChecking: "بررسی وضعیت اتصال…",
  languageLabel: "زبان پاسخ",
  langAuto: "خودکار",
  langFa: "فارسی",
  langEn: "English",
  conversationsTitle: "مکالمه‌ها",
  newConversation: "مکالمه جدید",
  noConversationTitle: "مکالمه بدون عنوان",
  historyLoading: "در حال خواندن مکالمه‌ها…",
  historyError: "خواندن فهرست مکالمه‌ها ممکن نشد.",
  historyRetry: "تلاش مجدد",
  historyEmpty: "هنوز مکالمه‌ای ندارید. برای شروع، «مکالمه جدید» را بسازید.",
  deleteConversation: "حذف مکالمه",
  deleteTitle: "حذف مکالمه؟",
  deleteDescription: "این مکالمه و همه پیام‌های آن برای همیشه حذف می‌شود و قابل بازگشت نیست.",
  deleteCancel: "انصراف",
  deleteConfirm: "حذف کن",
  deleting: "در حال حذف…",
  backToConversations: "مکالمه‌ها",
  emptyChatTitle: "گفت‌وگو را شروع کنید",
  emptyChatHint:
    "درباره اجرای حرکات، برنامه تمرینی، تغذیه عمومی یا روند پیشرفتتان بپرسید. پاسخ‌ها بر اساس داده واقعی حساب شما شخصی‌سازی می‌شود.",
  messagePlaceholder: "پیام خود را بنویسید… (Enter برای ارسال، Shift+Enter خط جدید)",
  send: "ارسال",
  responding: "دستیار در حال پاسخ‌گویی است…",
  sendingDisabled: "منتظر پاسخ قبلی بمانید",
  suggestions: [
    "فرم صحیح اسکوات چطور است و خطاهای رایج آن کدام‌اند؟",
    "برنامه تمرینی فعال من را توضیح بده",
    "برای تأمین پروتئین روزانه چه پیشنهادی داری؟",
    "روند وزن من را تفسیر کن",
  ],
  errorNotConfigured: "اتصال دستیار هنوز پیکربندی نشده است؛ بخش‌های دیگر برنامه کار می‌کنند.",
  errorNetwork: "ارتباط با سرور برقرار نشد؛ پیام شما ذخیره شده و می‌توانید تلاش مجدد کنید.",
  errorTimeout: "پاسخ مدل بیش از حد طول کشید؛ پیام شما محفوظ است — دوباره تلاش کنید.",
  errorRateLimit: "تعداد پیام‌های شما زیاد است؛ کمی صبر کنید و دوباره بفرستید.",
  errorProvider: "دریافت پاسخ از مدل ممکن نشد؛ پیام شما محفوظ است — دوباره تلاش کنید.",
  errorAuth: "احراز هویت سرویس هوش مصنوعی ناموفق بود؛ با نگهدارنده اپ تماس بگیرید.",
  errorValidation: "پیام خالی است یا از حد مجاز طولانی‌تر است.",
  errorNotFound: "این مکالمه در دسترس نیست یا حذف شده است.",
  errorInternal: "خطای غیرمنتظره سرور؛ لطفاً دوباره تلاش کنید.",
  retryLast: "تلاش مجدد برای پاسخ",
  notConfiguredTitle: "اتصال دستیار هنوز پیکربندی نشده است",
  notConfiguredBody:
    "دستیار هوشمند برای پاسخ‌گویی واقعی به یک مدل زبانی متصل می‌شود، اما تنظیمات اتصال در این محیط ارائه نشده است. هیچ پاسخ ساختگی نمایش داده نمی‌شود؛ بخش‌های دیگر برنامه (ثبت تمرین، برنامه‌ها و تغذیه) کاملاً کار می‌کنند.",
  notConfiguredEnvTitle: "راهنمای تنظیم (سمت سرور):",
  notConfiguredEnvItems: [
    "AI_PROVIDER — ارائه‌دهنده مدل: zai (پیش‌فرض) یا openai-compatible",
    "AI_MODEL — نام مدل (اختیاری؛ پیش‌فرض ارائه‌دهنده)",
    "AI_BASE_URL و AI_API_KEY — فقط برای ارائه‌دهنده openai-compatible",
    "AI_TIMEOUT_MS، AI_RATE_PER_MINUTE، AI_RATE_PER_DAY — سقف‌های عملیاتی",
  ],
  notConfiguredNote:
    "کلید API فقط در سرور خوانده می‌شود و هرگز به مرورگر، لاگ یا کد منتشر‌شده قرار نمی‌گیرد.",
  transparencyNote:
    "دستیار یک مربی عمومی تناسب اندام است؛ پزشک، متخصص تغذیه درمانی یا فیزیوتراپیست نیست و تشخیص، درمان یا تجویز ارائه نمی‌کند. اطلاعات حساب شما فقط در همین گفت‌وگو و به حداقل لازم برای پاسخ استفاده می‌شود.",
  messagesCount: (n) => `${n.toLocaleString("fa-IR")} پیام`,
  todayLabel: "امروز",
  yesterdayLabel: "دیروز",
  loginRequired: "برای استفاده از دستیار ابتدا وارد حساب خود شوید.",
};

const EN: AssistantStrings = {
  dir: "ltr",
  langAttr: "en",
  title: "AI Assistant",
  statusConnected: "Model connection active",
  statusNotConfigured: "Assistant connection not configured",
  statusChecking: "Checking connection…",
  languageLabel: "Response language",
  langAuto: "Auto",
  langFa: "فارسی",
  langEn: "English",
  conversationsTitle: "Conversations",
  newConversation: "New conversation",
  noConversationTitle: "Untitled conversation",
  historyLoading: "Loading conversations…",
  historyError: "Could not load the conversation list.",
  historyRetry: "Retry",
  historyEmpty: "No conversations yet. Create a “New conversation” to get started.",
  deleteConversation: "Delete conversation",
  deleteTitle: "Delete this conversation?",
  deleteDescription: "This conversation and all of its messages will be permanently deleted.",
  deleteCancel: "Cancel",
  deleteConfirm: "Delete",
  deleting: "Deleting…",
  backToConversations: "Conversations",
  emptyChatTitle: "Start the conversation",
  emptyChatHint:
    "Ask about exercise technique, your training plan, general nutrition, or your progress. Answers are personalized with your real account data.",
  messagePlaceholder: "Type your message… (Enter to send, Shift+Enter for a new line)",
  send: "Send",
  responding: "The assistant is typing…",
  sendingDisabled: "Please wait for the previous reply",
  suggestions: [
    "What does proper squat form look like, and what are common mistakes?",
    "Explain my active workout plan",
    "What are good ways to hit my daily protein target?",
    "Interpret my weight trend for me",
  ],
  errorNotConfigured: "The assistant connection is not configured yet; the rest of the app keeps working.",
  errorNetwork: "Could not reach the server; your message is saved and you can retry.",
  errorTimeout: "The model took too long to reply; your message is safe — try again.",
  errorRateLimit: "You are sending messages too quickly; please wait a moment and retry.",
  errorProvider: "Could not get a reply from the model; your message is safe — try again.",
  errorAuth: "AI service authentication failed; please contact the app maintainer.",
  errorValidation: "The message is empty or too long.",
  errorNotFound: "This conversation is unavailable or has been deleted.",
  errorInternal: "Unexpected server error; please try again.",
  retryLast: "Retry the reply",
  notConfiguredTitle: "Assistant connection is not configured yet",
  notConfiguredBody:
    "The assistant replies through a real language model connection, but connection settings were not provided in this environment. No fake answers are shown; other parts of the app (workout logging, plans, and nutrition) keep working normally.",
  notConfiguredEnvTitle: "Setup guide (server side):",
  notConfiguredEnvItems: [
    "AI_PROVIDER — model provider: zai (default) or openai-compatible",
    "AI_MODEL — model name (optional; provider default)",
    "AI_BASE_URL and AI_API_KEY — only for the openai-compatible provider",
    "AI_TIMEOUT_MS, AI_RATE_PER_MINUTE, AI_RATE_PER_DAY — operational limits",
  ],
  notConfiguredNote:
    "The API key is read only on the server and never placed in the browser, logs, or published code.",
  transparencyNote:
    "The assistant is a general fitness coach; it is not a doctor, dietitian, or physiotherapist and does not diagnose, treat, or prescribe. Your account data is used only in this conversation and only as much as needed.",
  messagesCount: (n) => `${n.toLocaleString("en-US")} messages`,
  todayLabel: "Today",
  yesterdayLabel: "Yesterday",
  loginRequired: "Sign in to your account to use the assistant.",
};

const STRINGS: Record<UiLang, AssistantStrings> = { fa: FA, en: EN };

export function assistantStrings(lang: UiLang): AssistantStrings {
  return STRINGS[lang];
}
