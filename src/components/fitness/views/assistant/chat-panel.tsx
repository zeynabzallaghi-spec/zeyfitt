"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, Sparkles, TriangleAlert, RotateCcw, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { MessageBubble } from "./message-bubble";
import { maxMessageChars } from "@/lib/assistant/types";
import type { AssistantStrings } from "@/lib/assistant/i18n";
import type { UseAssistantChatResult } from "@/hooks/use-assistant-chat";

/**
 * پنل گفت‌وگو — پیام‌ها، حالت خالی/بارگذاری/خطا، نشانگر پاسخ‌گویی و
 * ورودی پیام (Enter ارسال، Shift+Enter خط جدید). در حالت «پیکربندی
 * نشده» به‌جای چت ظاهراً فعال، وضعیت واقعی اتصال و راهنمای تنظیم
 * نمایش داده می‌شود.
 */

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-start gap-2.5" aria-label={label} role="status">
      <span
        className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/12 text-primary"
        aria-hidden="true"
      >
        <Bot className="size-4" />
      </span>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-ss-md border border-border/60 bg-secondary/40 px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/** پیام خطای ارسال + تلاش مجدد — متن کاربر گم نمی‌شود */
function ErrorRow({
  code,
  retryAfterSec,
  strings,
  onRetry,
  onDismiss,
  retryPending,
}: {
  code: string;
  retryAfterSec?: number;
  strings: AssistantStrings;
  onRetry: () => void;
  onDismiss: () => void;
  retryPending: boolean;
}) {
  const text =
    code === "AI_NOT_CONFIGURED"
      ? strings.errorNotConfigured
      : code === "AI_TIMEOUT"
        ? strings.errorTimeout
        : code === "RATE_LIMITED" || code === "AI_RATE_LIMIT"
          ? strings.errorRateLimit
          : code === "AI_AUTH"
            ? strings.errorAuth
            : code === "VALIDATION"
              ? strings.errorValidation
              : code === "NOT_FOUND"
                ? strings.errorNotFound
                : code === "UNAUTHENTICATED"
                  ? strings.loginRequired
                  : code === "NETWORK"
                    ? strings.errorNetwork
                    : strings.errorProvider;

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/35 bg-destructive/10 px-3.5 py-2.5"
      role="alert"
    >
      <TriangleAlert className="size-4 shrink-0 text-destructive" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-[11px] leading-5 text-destructive">
        {text}
        {typeof retryAfterSec === "number" && retryAfterSec > 0 && (
          <span className="ms-1 text-muted-foreground">
            ({retryAfterSec}s)
          </span>
        )}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          disabled={retryPending}
          className="h-7 gap-1.5 rounded-lg text-[11px]"
        >
          {retryPending ? (
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          ) : (
            <RotateCcw className="size-3" aria-hidden="true" />
          )}
          {strings.retryLast}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="h-7 rounded-lg px-2 text-[11px] text-muted-foreground"
        >
          ×
        </Button>
      </div>
    </div>
  );
}

/** پنل وضعیت واقعی «پیکربندی نشده» — بدون هیچ چت ظاهراً فعال */
function NotConfiguredPanel({ strings }: { strings: AssistantStrings }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
        <ShieldAlert className="size-7" aria-hidden="true" />
      </span>
      <div className="max-w-md space-y-2">
        <p className="text-sm font-extrabold text-foreground">{strings.notConfiguredTitle}</p>
        <p className="text-xs leading-6 text-muted-foreground">{strings.notConfiguredBody}</p>
      </div>
      <div className="w-full max-w-md rounded-xl border border-border/50 bg-secondary/30 p-4 text-start">
        <p className="mb-2 text-[11px] font-bold text-foreground">{strings.notConfiguredEnvTitle}</p>
        <ul className="space-y-1.5">
          {strings.notConfiguredEnvItems.map((item) => (
            <li key={item} className="flex items-start gap-2 text-[11px] leading-5 text-muted-foreground">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary/60" aria-hidden="true" />
              <span dir="ltr" className="font-mono">{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-border/50 pt-2.5 text-[10px] leading-5 text-muted-foreground/80">
          {strings.notConfiguredNote}
        </p>
      </div>
    </div>
  );
}

export function ChatPanel({
  chat,
  strings,
  configured,
}: {
  chat: UseAssistantChatResult;
  strings: AssistantStrings;
  configured: boolean;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, transient, pending, canRetry, lastError } = chat;
  const hasAnyContent = messages.length > 0 || transient !== null;

  // اسکرول خودکار به آخرین پیام
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, transient?.userMessage.id, transient?.sending, lastError]);

  const submit = () => {
    const text = input.trim();
    if (!text || pending || !configured) return;
    setInput("");
    void chat.sendMessage(text);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
    // Shift+Enter به‌صورت پیش‌فرض خط جدید می‌سازد
  };

  const maxChars = maxMessageChars();
  const nearLimit = input.length > Math.floor(maxChars * 0.85);

  return (
    <>
      {/* پیام‌ها */}
      <div
        ref={scrollRef}
        className="flex h-[420px] flex-col gap-4 overflow-y-auto px-4 py-5 md:h-[500px] md:px-5"
        aria-live="polite"
      >
        {chat.conversationLoading && (
          <p className="flex items-center justify-center gap-2 py-10 text-[11px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            {strings.historyLoading}
          </p>
        )}

        {chat.conversationError && (
          <div className="m-auto flex max-w-sm flex-col items-center gap-3 text-center">
            <TriangleAlert className="size-6 text-destructive" aria-hidden="true" />
            <p className="text-xs text-destructive">
              {chat.conversationError === "NOT_FOUND" ? strings.errorNotFound : strings.errorNetwork}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void chat.refreshConversation()}
              className="h-7 gap-1.5 rounded-lg text-[11px]"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              {strings.historyRetry}
            </Button>
          </div>
        )}

        {!chat.conversationLoading && !chat.conversationError && !hasAnyContent && configured && (
          <div className="m-auto flex max-w-md flex-col items-center gap-4 py-8 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/12 text-primary glow-lime-sm">
              <Sparkles className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-1.5">
              <p className="text-sm font-extrabold text-foreground">{strings.emptyChatTitle}</p>
              <p className="text-[11px] leading-5 text-muted-foreground">{strings.emptyChatHint}</p>
            </div>
          </div>
        )}

        {!chat.conversationLoading && !chat.conversationError && configured && (
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} strings={strings} />
            ))}

            {transient && (
              <MessageBubble
                key={transient.userMessage.id}
                message={transient.userMessage}
                strings={strings}
                pendingStyle={!transient.sending}
              />
            )}

            {pending && <TypingIndicator label={strings.responding} />}

            {canRetry && lastError && (
              <ErrorRow
                code={lastError.code}
                retryAfterSec={lastError.retryAfterSec}
                strings={strings}
                onRetry={() => void chat.retryLast()}
                onDismiss={chat.clearError}
                retryPending={pending}
              />
            )}

            {/* پیشنهاد سؤال‌ها — فقط در مکالمه خالی */}
            {messages.length === 0 && !transient && !pending && (
              <div className="flex flex-wrap justify-center gap-2 pt-1" aria-label={strings.suggestions.join("، ")}>
                {strings.suggestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void chat.sendMessage(question)}
                    className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-200 hover:border-primary/35 hover:text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                  >
                    <Sparkles className="size-3" aria-hidden="true" />
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!configured && <NotConfiguredPanel strings={strings} />}
      </div>

      {/* ورودی پیام */}
      <div className="border-t border-border/60 p-3 md:p-4">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="flex items-end gap-2"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={strings.messagePlaceholder}
              aria-label={strings.send}
              maxLength={maxChars}
              rows={1}
              disabled={!configured || pending}
              className="max-h-28 min-h-[42px] resize-none py-2.5 text-xs leading-6"
            />
            {nearLimit && (
              <p className="text-[10px] text-muted-foreground" dir="ltr">
                {input.length.toLocaleString(strings.langAttr === "fa" ? "fa-IR" : "en-US")} / {maxChars.toLocaleString(strings.langAttr === "fa" ? "fa-IR" : "en-US")}
              </p>
            )}
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!configured || pending || input.trim().length === 0}
            aria-label={strings.send}
            title={pending ? strings.sendingDisabled : strings.send}
            className="shrink-0 text-primary-foreground"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className={cn("size-4", strings.dir === "rtl" && "-scale-x-100")} aria-hidden="true" />
            )}
          </Button>
        </form>
      </div>
    </>
  );
}
