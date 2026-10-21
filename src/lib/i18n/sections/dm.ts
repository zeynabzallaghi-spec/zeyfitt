/**
 * رشته‌های نمای «گفتگو» — مرحله ۲۰ (بخش ۲). FA داده اصلی؛ EN ترجمه نمایشی.
 */
export interface DmStrings {
  title: string;
  signInNote: string;
  searchTitle: string;
  searchNote: string;
  searchPlaceholder: string;
  searchButton: string;
  noPeople: string;
  chatWith: string;
  threadsTitle: string;
  threadsEmptyTitle: string;
  threadsEmptyNote: string;
  noMessagesYet: string;
  openThread: string;
  unreadLabel: (n: number) => string;
  backToList: string;
  conversationTitle: string;
  emptyConversation: string;
  messagePlaceholder: string;
  send: string;
  liveNote: string;
  loadError: string;
  retry: string;
  roleCoach: string;
  roleAdmin: string;
  roleStudent: string;
}

const STRINGS: Record<"fa" | "en", DmStrings> = {
  fa: {
    title: "گفتگو",
    signInNote: "برای گفتگو ابتدا وارد حساب خود شوید.",
    searchTitle: "شروع گفتگوی جدید",
    searchNote: "نام هر کاربر را جست‌وجو کنید و با او گفتگو کنید — بدون نیاز به ارتباط مربی/دانشجو.",
    searchPlaceholder: "جست‌وجوی نام…",
    searchButton: "جست‌وجو",
    noPeople: "کسی با این نام پیدا نشد.",
    chatWith: "گفتگو",
    threadsTitle: "گفتگوهای من",
    threadsEmptyTitle: "هنوز گفتگویی ندارید",
    threadsEmptyNote: "از جست‌وجوی بالا نام یک کاربر را پیدا کنید و اولین پیام را بفرستید.",
    noMessagesYet: "پیامی نیست",
    openThread: "باز کردن",
    unreadLabel: (n) => `${new Intl.NumberFormat("fa-IR").format(n)} نخوانده`,
    backToList: "بازگشت",
    conversationTitle: "گفت‌وگو",
    emptyConversation: "اولین پیام را بفرستید.",
    messagePlaceholder: "پیام خود را بنویسید…",
    send: "ارسال",
    liveNote: "به‌روزرسانی زنده فعال است؛ پیام‌های تازه در چند ثانیه ظاهر میشوند.",
    loadError: "خطا در بارگذاری",
    retry: "تلاش مجدد",
    roleCoach: "مربی",
    roleAdmin: "مدیر",
    roleStudent: "دانشجو",
  },
  en: {
    title: "Messages",
    signInNote: "Sign in first to start chatting.",
    searchTitle: "Start a new conversation",
    searchNote: "Search any user by name and chat with them — no coach/student connection required.",
    searchPlaceholder: "Search name…",
    searchButton: "Search",
    noPeople: "No one found with that name.",
    chatWith: "Chat",
    threadsTitle: "My conversations",
    threadsEmptyTitle: "No conversations yet",
    threadsEmptyNote: "Find a user via the search above and send the first message.",
    noMessagesYet: "No messages",
    openThread: "Open",
    unreadLabel: (n) => `${new Intl.NumberFormat("en-US").format(n)} unread`,
    backToList: "Back",
    conversationTitle: "Conversation",
    emptyConversation: "Send the first message.",
    messagePlaceholder: "Write your message…",
    send: "Send",
    liveNote: "Live updates are on; new messages appear within seconds.",
    loadError: "Load error",
    retry: "Retry",
    roleCoach: "Coach",
    roleAdmin: "Admin",
    roleStudent: "Student",
  },
};

export function dmStrings(locale: "fa" | "en"): DmStrings {
  return STRINGS[locale];
}
