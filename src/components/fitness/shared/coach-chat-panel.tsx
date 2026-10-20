"use client";

/**
 * پنل گفت‌وگوی خصوصی — مشترک بین دانشجو (بخش ارتباط‌ها) و مربی (تب پیام‌ها).
 *
 * صادق‌نمایی: همه وضعیت‌های مجوز از سرور میآیند (canSend/blockReason)؛
 * کلاینت هیچ تصمیم مجوزی نمی‌گیرد و هیچ موفقیتی ساختگی نشان نمیدهد.
 * محتوای پیام فقط به‌صورت متن رندر میشود (escape امن React) — هیچ
 * dangerouslySetInnerHTML در کار نیست.
 * بازیابی پیام‌های جدید با polling کنترل‌شده هوک use-coach-chat انجام
 * میشود؛ ادعای realtime وجود ندارد.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Send,
  Clock,
  AlertTriangle,
  Info,
  MessageSquare,
  ShieldAlert,
  History,
  Paperclip,
  X,
  Ban,
  ShieldOff,
  FileText,
  Download,
  UserRound,
} from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachChatStrings } from "@/lib/i18n/sections/coach-chat";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { localeDateTimeLabel, localeNumber } from "@/lib/i18n/format";
import {
  useCoachChat,
  type PendingChatMessage,
} from "@/hooks/use-coach-chat";
import { setChatBlock } from "@/hooks/use-p196";
import { useSessionData } from "../session-context";
import { CoachStudentProfileDialog } from "./coach-student-profile-dialog";
import type { ChatMessageAttachmentClient } from "@/lib/coaching/chat-client";

/* --------------------------- بنر فقط‌خواندنی --------------------------- */

function ReadOnlyBanner({ reason }: { reason: string }) {
  const t = useStrings(coachChatStrings);
  const p196 = useStrings(phase196Strings);
  const map: Record<string, { title: string; note: string; icon: typeof Info }> = {
    CONNECTION_NOT_ACTIVE: { title: t.readOnlyEnded, note: t.readOnlyEndedNote, icon: History },
    CONNECTION_CLOSED: { title: t.readOnlyEnded, note: t.readOnlyEndedNote, icon: History },
    SUBSCRIPTION_REQUIRED: { title: t.readOnlySubscription, note: t.readOnlySubscriptionNote, icon: ShieldAlert },
    COACH_NOT_VERIFIED: { title: t.readOnlyCoach, note: t.readOnlyCoachNote, icon: ShieldAlert },
    ROLE_NOT_ALLOWED: { title: t.readOnlyRole, note: t.readOnlyRoleNote, icon: ShieldAlert },
    CHAT_BLOCKED: { title: p196.chatBlockedMeBanner, note: "", icon: Ban },
  };
  const entry = map[reason] ?? { title: t.readOnlyRole, note: t.readOnlyRoleNote, icon: Info };
  const Icon = entry.icon;
  return (
    <Alert className="border-amber-400/30 bg-amber-400/10 text-amber-200">
      <Icon className="size-4" aria-hidden="true" />
      <AlertTitle className="text-xs font-bold">{entry.title}</AlertTitle>
      <AlertDescription className="text-[11px] leading-5">
        {entry.note}
      </AlertDescription>
    </Alert>
  );
}

/* --------------------------- حباب پیام --------------------------- */

function messageTone(own: boolean): string {
  return own
    ? "bg-primary/15 border-primary/40 text-foreground"
    : "bg-secondary/40 border-border/60 text-foreground";
}

function MetaRow({
  own,
  read,
  time,
  tone,
}: {
  own: boolean;
  read: boolean;
  time: string;
  tone: "ok" | "pending" | "failed";
}) {
  const t = useStrings(coachChatStrings);
  return (
    <div
      className={`mt-1 flex items-center gap-1.5 text-[10px] text-muted-foreground ${
        own ? "justify-end" : "justify-start"
      }`}
    >
      {time ? <span>{time}</span> : null}
      {own && tone === "ok" && read && (
        <span className="font-bold text-primary/90" aria-label={t.seenLabel}>
          ✓✓ {t.seenLabel}
        </span>
      )}
      {own && tone === "ok" && !read && <span aria-hidden="true">✓</span>}
      {tone === "pending" && (
        <span className="inline-flex items-center gap-1" aria-label={t.pendingLabel}>
          <Clock className="size-3 animate-pulse" aria-hidden="true" />
          {t.pendingLabel}
        </span>
      )}
      {tone === "failed" && (
        <span className="inline-flex items-center gap-1 text-rose-300" aria-label={t.failedLabel}>
          <AlertTriangle className="size-3" aria-hidden="true" />
          {t.failedLabel}
        </span>
      )}
    </div>
  );
}

function AttachmentChips({ attachments }: { attachments: ChatMessageAttachmentClient[] }) {
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {attachments.map((a) => (
        <a
          key={a.id}
          href={`/api/coach-chat/attachments/${encodeURIComponent(a.id)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex max-w-56 items-center gap-1 rounded-lg border border-border/50 bg-background/50 px-2 py-1 text-[10px] font-bold text-foreground hover:border-primary/40 hover:text-primary"
        >
          {a.mimeType.startsWith("image/") ? (
            <FileText className="size-3 shrink-0" aria-hidden="true" />
          ) : (
            <FileText className="size-3 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{a.fileName}</span>
          <span className="shrink-0 text-muted-foreground">
            {localeNumber(Math.round(a.sizeBytes / 1024), "fa")}KB
          </span>
          <Download className="size-3 shrink-0" aria-hidden="true" />
        </a>
      ))}
    </div>
  );
}

function MessageBubble({
  own,
  content,
  time,
  read,
  attachments = [],
}: {
  own: boolean;
  content: string;
  time: string;
  read: boolean;
  attachments?: ChatMessageAttachmentClient[];
}) {
  return (
    <div className={`flex w-full ${own ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl border px-3 py-2 ${messageTone(own)}`}>
        {content.length > 0 && (
          <p className="whitespace-pre-wrap break-words text-xs leading-6">{content}</p>
        )}
        {attachments.length > 0 && <AttachmentChips attachments={attachments} />}
        <MetaRow own={own} read={read} time={time} tone="ok" />
      </div>
    </div>
  );
}

function PendingBubble({
  pending,
  onRetry,
}: {
  pending: PendingChatMessage;
  onRetry: (tempId: string) => void;
}) {
  const t = useStrings(coachChatStrings);
  const failed = pending.state === "failed";
  return (
    <div className="flex w-full justify-end">
      <div
        className={`max-w-[85%] rounded-2xl border px-3 py-2 ${
          failed
            ? "border-rose-400/40 bg-rose-400/10 text-foreground"
            : "border-border/50 bg-secondary/30 text-muted-foreground"
        }`}
      >
        <p className="whitespace-pre-wrap break-words text-xs leading-6">{pending.content}</p>
        <MetaRow own read={false} time="" tone={failed ? "failed" : "pending"} />
        {failed && (
          <div className="mt-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[10px]"
              onClick={() => onRetry(pending.tempId)}
            >
              {t.resend}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* --------------------------- پنل اصلی --------------------------- */

export function CoachChatPanel({
  connectionId,
  myUserId,
  onBack,
}: {
  connectionId: string;
  /** شناسه کاربر جاری از نشست سرور — فقط برای نمایش حباب خود کاربر */
  myUserId: string | null;
  onBack: () => void;
}) {
  const t = useStrings(coachChatStrings);
  const p196 = useStrings(phase196Strings);
  const locale = useLocale();
  const dir = useDir();
  const { user } = useSessionData();
  const chat = useCoachChat(connectionId, { myUserId, enabled: true });
  const [draft, setDraft] = useState("");
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [blockBusy, setBlockBusy] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isCoachSide = chat.conversation?.side === "coach";
  const isPending = chat.conversation?.connectionStatus === "PENDING";

  const doBlock = async (action: "block" | "unblock") => {
    setBlockBusy(true);
    const result = await setChatBlock(connectionId, action);
    setBlockBusy(false);
    if (result.ok) {
      setBlockedByMe(result.data.blockedByMe);
      void chat.refresh();
    }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setPickedFiles((prev) => [...prev, ...Array.from(files)].slice(0, 3));
  };

  const TOTAL_MAX = 20 * 1024 * 1024;
  const pickedTotal = pickedFiles.reduce((s, f) => s + f.size, 0);

  const BackIcon = dir === "rtl" ? ArrowRight : ArrowLeft;

  // اسکرول به پایین هنگام پیام جدید — فقط اگر کاربر پایین است
  useEffect(() => {
    const el = listRef.current;
    if (!el || !stickToBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.messages.length, chat.pendings.length]);

  const onScroll = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const submit = useCallback(async () => {
    const text = draft.trim();
    const files = pickedFiles;
    if ((!text && files.length === 0) || !chat.canSend || chat.sending) return;
    stickToBottomRef.current = true;
    setDraft("");
    setPickedFiles([]);
    await chat.sendMessage(text, files);
    // خطای ارسال روی خود پیام (failed) نمایش داده میشود؛ پیش‌نویس برنمی‌گردد
    // تا کاربر با دکمه تلاش مجدد یا پیام جدید ادامه دهد.
  }, [draft, pickedFiles, chat]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter") return;
      // Enter ارسال، Shift+Enter خط جدید؛ ترکیب‌های IME (isComposing) ارسال نمیکنند
      if (event.shiftKey || event.nativeEvent.isComposing) return;
      event.preventDefault();
      void submit();
    },
    [submit]
  );

  const statusBadge = useMemo(() => {
    const status = chat.conversation?.connectionStatus;
    if (status === "ACTIVE") {
      return (
        <Badge className="border-primary/40 bg-primary/15 text-primary" variant="outline">
          {t.statusActive}
        </Badge>
      );
    }
    if (status === "PENDING") {
      return (
        <Badge className="border-amber-400/30 bg-amber-400/10 text-amber-300" variant="outline">
          {p196.chatPreApprovalLabel}
        </Badge>
      );
    }
    return (
      <Badge className="border-border/50 bg-secondary/40 text-muted-foreground" variant="outline">
        {t.statusEnded}
      </Badge>
    );
  }, [chat.conversation?.connectionStatus, t, p196]);

  /* ---------- حالت‌های بارگذاری/خطا ---------- */

  if (chat.loading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-live="polite">
        <div className="h-12 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
        <div className="h-40 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
        <span className="sr-only">{t.loading}</span>
      </div>
    );
  }

  if (chat.error && !chat.conversation) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <BackIcon className="size-4" aria-hidden="true" />
          {t.back}
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="size-4" aria-hidden="true" />
          <AlertTitle className="text-xs font-bold">{t.loadError}</AlertTitle>
          <AlertDescription className="text-[11px] leading-5">{chat.error}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={chat.refresh}>
          {t.retry}
        </Button>
      </div>
    );
  }

  const counterpartName = chat.conversation?.counterpart.displayName ?? "—";
  const messages = chat.messages;
  const pendings = chat.pendings;

  return (
    <div className="flex flex-col gap-3">
      {/* سربرگ — نام دانشجو از چت قابل کلیک است (مرحله ۱۹.۶) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={onBack}
            aria-label={t.back}
          >
            <BackIcon className="size-4" aria-hidden="true" />
          </Button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {t.chatTitle} ·{" "}
              {isCoachSide ? (
                <button
                  type="button"
                  className="inline-flex max-w-40 items-center gap-1 truncate rounded text-primary hover:underline"
                  onClick={() => setProfileOpen(true)}
                  aria-label={`${p196.chatViewProfile}: ${counterpartName}`}
                  title={p196.chatViewProfile}
                >
                  <UserRound className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{counterpartName}</span>
                </button>
              ) : (
                <span className="truncate">{counterpartName}</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {chat.conversation?.lastMessageAt
                ? `${t.lastActivityLabel}: ${localeDateTimeLabel(chat.conversation.lastMessageAt, locale)}`
                : t.noMessagesYet}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {statusBadge}
          {isCoachSide && (
            <Button
              variant="ghost"
              size="icon"
              className={`size-8 ${blockedByMe ? "text-rose-300" : ""}`}
              onClick={() => void doBlock(blockedByMe ? "unblock" : "block")}
              disabled={blockBusy}
              aria-label={blockedByMe ? p196.chatUnblockAction : p196.chatBlockAction}
              title={blockedByMe ? p196.chatUnblockAction : p196.chatBlockAction}
            >
              {blockedByMe ? <ShieldOff className="size-4" aria-hidden="true" /> : <Ban className="size-4" aria-hidden="true" />}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={chat.refresh}
            aria-label={t.refresh}
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* بنر فقط‌خواندنی — وضعیت از سرور */}
      {chat.blockReason && <ReadOnlyBanner reason={chat.blockReason} />}
      {blockedByMe && isCoachSide && (
        <Alert className="border-rose-400/30 bg-rose-400/10 text-rose-200">
          <Ban className="size-4" aria-hidden="true" />
          <AlertTitle className="text-xs font-bold">{p196.chatBlockedBanner}</AlertTitle>
          <AlertDescription className="text-[11px] leading-5" />
        </Alert>
      )}

      {/* فهرست پیام‌ها */}
      <div
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="polite"
        aria-label={t.ariaMessageList}
        className="flex h-[46vh] min-h-[260px] flex-col gap-2 overflow-y-auto rounded-xl border border-border/50 bg-background/40 p-3"
      >
        {chat.hasMoreOlder && (
          <div className="flex justify-center pb-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px]"
              onClick={chat.loadOlder}
              disabled={chat.loadingOlder}
            >
              {chat.loadingOlder ? t.loadingOlder : t.loadOlder}
            </Button>
          </div>
        )}

        {messages.length === 0 && pendings.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <MessageSquare className="size-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="text-xs font-bold text-foreground">{t.emptyConversationTitle}</p>
            <p className="max-w-[280px] text-[11px] leading-5 text-muted-foreground">
              {t.emptyConversationNote}
            </p>
          </div>
        ) : (
          <>
            {messages.map((m) => {
              const own = chat.myUserId !== null && m.senderId === chat.myUserId;
              return (
                <MessageBubble
                  key={m.id}
                  own={own}
                  content={m.content}
                  time={localeDateTimeLabel(m.createdAt, locale)}
                  read={m.readAt !== null}
                  attachments={m.attachments ?? []}
                />
              );
            })}
            {pendings.map((p) => (
              <PendingBubble key={p.tempId} pending={p} onRetry={chat.retryMessage} />
            ))}
          </>
        )}
      </div>

      {/* خطای سراسری (مثلاً 429 یا شبکه) — همراه وضعیت خود پیام‌ها */}
      {chat.error && chat.conversation && (
        <p className="text-[11px] text-rose-300" role="alert">
          {chat.error}
        </p>
      )}

      {/* ورودی پیام — فقط با مجوز واقعی سرور فعال میشود؛ پیوست تا ۲۰MB */}
      <div className="space-y-1.5">
        {pickedFiles.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {pickedFiles.map((f, i) => (
              <span
                key={`${f.name}-${i}`}
                className="inline-flex max-w-52 items-center gap-1 rounded-lg border border-border/50 bg-secondary/30 px-2 py-1 text-[10px]"
              >
                <Paperclip className="size-3 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate font-bold text-foreground">{f.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {localeNumber(Math.round(f.size / 1024), locale)}KB
                </span>
                <button
                  type="button"
                  aria-label={`${t.back}: ${f.name}`}
                  className="text-rose-300 hover:text-rose-200"
                  onClick={() => setPickedFiles((prev) => prev.filter((_, j) => j !== i))}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {pickedTotal > TOTAL_MAX && (
              <span className="text-[10px] font-bold text-rose-300">{p196.chatBlockedMeBanner ? "" : ""}⚠ 20MB</span>
            )}
          </div>
        )}
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={chat.canSend ? t.inputPlaceholder : t.readOnlyEnded}
          disabled={!chat.canSend}
          maxLength={2000}
          rows={2}
          aria-label={t.inputLabel}
          className="min-h-[52px] resize-none text-xs"
        />
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            {chat.canSend && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label={p196.exerciseMediaUpload}
                  title={p196.exerciseMediaUpload}
                >
                  <Paperclip className="size-4" aria-hidden="true" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,text/plain,.docx,.xlsx"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                />
              </>
            )}
            <span className="text-[10px] text-muted-foreground" aria-live="off">
              {localeNumber(draft.length, locale)}
            </span>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={submit}
            disabled={!chat.canSend || chat.sending || (draft.trim().length === 0 && pickedFiles.length === 0)}
          >
            <Send className="size-3.5" aria-hidden="true" />
            {chat.sending ? t.sending : t.send}
          </Button>
        </div>
      </div>

      {/* پروفایل دانشجو از گفت‌وگو — فقط سمت مربی و با مجوز سرور */}
      {isCoachSide && (
        <CoachStudentProfileDialog
          studentId={chat.conversation?.counterpart.userId ?? null}
          open={profileOpen}
          onOpenChange={setProfileOpen}
        />
      )}
    </div>
  );
}
