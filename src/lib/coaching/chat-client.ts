/**
 * تایپ‌های کلاینت پیام‌رسانی خصوصی — مرحله ۱۷.
 * آینه‌ای از پاسخ‌های API بدون هیچ منطق مجوزی؛ همه تصمیم‌های مجوزی سمت
 * سرور گرفته میشود و کلاینت فقط نتیجه تأییدشده (canSend/blockReason) را
 * نمایش میدهد.
 */

export interface ChatConversationClient {
  /** null برای ارتباط ACTIVE که هنوز گفت‌وگویی آغاز نشده */
  conversationId: string | null;
  connectionId: string;
  connectionStatus: string;
  cooperationType: string;
  side: "student" | "coach";
  counterpart: { userId: string; displayName: string };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  unreadCount: number;
  canSend: boolean;
  blockReason: string | null;
  openedAt: string | null;
}

export interface ChatMessageClient {
  id: string;
  seq: number;
  senderId: string;
  content: string;
  createdAt: string;
  readAt: string | null;
}

export interface ChatMessagesPageClient {
  conversation: ChatConversationClient;
  messages: ChatMessageClient[];
  hasMoreOlder: boolean;
}
