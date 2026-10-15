"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { detectMessageLang } from "@/lib/assistant/language";
import type { AssistantMessageClient } from "@/lib/assistant/types";
import type { AssistantStrings } from "@/lib/assistant/i18n";

/**
 * حباب پیام چت — جهت محتوای هر پیام جدا از جهت رابط بر اساس زبان خود
 * پیام تعیین می‌شود (پیام انگلیسی داخل رابط فارسی و برعکس درست نمایش
 * داده می‌شود).
 *
 * امنیت رندر:
 *  - پاسخ مدل فقط با react-markdown (بدون rehype-raw) رندر می‌شود؛ HTML
 *    خام هرگز اجرا نمی‌شود و اسکریپت/رویداد درون‌خطی بی‌اثر می‌ماند.
 *  - متن کاربر به‌صورت متن ساده (حفظ خطوط) نمایش داده می‌شود، نه Markdown.
 */

function contentLang(text: string): { dir: "rtl" | "ltr"; lang: "fa" | "en" } | null {
  const detected = detectMessageLang(text);
  if (detected === "fa") return { dir: "rtl", lang: "fa" };
  if (detected === "en") return { dir: "ltr", lang: "en" };
  return null; // مبهم — جهت رابط به ارث می‌رسد
}

function formatTime(iso: string, lang: "fa" | "en"): string {
  try {
    return new Intl.DateTimeFormat(lang === "fa" ? "fa-IR" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/** نگاشت عناصر Markdown به کلاس‌های تم فعلی — بدون اجرای HTML خام */
const markdownComponents = {
  p: (props: React.ComponentProps<"p">) => (
    <p className="my-1.5 first:mt-0 last:mb-0 break-words" {...props} />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul className="my-1.5 list-disc space-y-1 ps-5" {...props} />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol className="my-1.5 list-decimal space-y-1 ps-5" {...props} />
  ),
  li: (props: React.ComponentProps<"li">) => <li className="leading-6 break-words" {...props} />,
  h1: (props: React.ComponentProps<"h1">) => (
    <h1 className="my-2 text-sm font-extrabold first:mt-0" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h2 className="my-2 text-sm font-extrabold first:mt-0" {...props} />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3 className="my-1.5 text-[13px] font-bold first:mt-0" {...props} />
  ),
  h4: (props: React.ComponentProps<"h4">) => (
    <h4 className="my-1.5 text-[13px] font-bold first:mt-0" {...props} />
  ),
  strong: (props: React.ComponentProps<"strong">) => <strong className="font-bold" {...props} />,
  em: (props: React.ComponentProps<"em">) => <em className="italic" {...props} />,
  a: (props: React.ComponentProps<"a">) => (
    <a
      {...props}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="font-bold text-primary underline underline-offset-4"
    />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="my-1.5 border-s-2 border-primary/40 ps-3 text-muted-foreground"
      {...props}
    />
  ),
  hr: () => <hr className="my-2 border-border/60" />,
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="rounded-md border border-border/50 bg-secondary/60 px-1 py-0.5 font-mono text-[11px]"
      {...props}
    />
  ),
  pre: (props: React.ComponentProps<"pre">) => (
    <pre
      className="my-1.5 overflow-x-auto rounded-lg border border-border/50 bg-secondary/60 p-2.5 text-[11px] leading-5"
      {...props}
    />
  ),
  table: (props: React.ComponentProps<"table">) => (
    <div className="my-1.5 overflow-x-auto">
      <table className="w-full border-collapse text-[11px]" {...props} />
    </div>
  ),
  th: (props: React.ComponentProps<"th">) => (
    <th className="border border-border/50 bg-secondary/40 px-2 py-1 font-bold" {...props} />
  ),
  td: (props: React.ComponentProps<"td">) => (
    <td className="border border-border/50 px-2 py-1" {...props} />
  ),
};

function MessageBubbleInner({
  message,
  strings,
  pendingStyle = false,
}: {
  message: AssistantMessageClient;
  strings: AssistantStrings;
  pendingStyle?: boolean;
}) {
  const isAssistant = message.role === "assistant";
  const Icon = isAssistant ? Bot : UserRound;
  const dir = contentLang(message.content);
  const time = formatTime(message.createdAt, strings.langAttr);

  return (
    <div className={cn("flex items-start gap-2.5", isAssistant ? "justify-start" : "justify-end")}>
      {isAssistant && (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/12 text-primary"
          aria-hidden="true"
        >
          <Bot className="size-4" />
        </span>
      )}
      <div className={cn("flex max-w-[85%] flex-col gap-1", isAssistant ? "items-start" : "items-end")}>
        <div
          dir={dir?.dir}
          lang={dir?.lang}
          className={cn(
            "rounded-2xl px-4 py-3 text-xs leading-6 sm:text-[13px] sm:leading-7",
            isAssistant
              ? "rounded-ss-md border border-border/60 bg-secondary/40 text-foreground/90"
              : "rounded-se-md border border-primary/25 bg-primary/12 text-foreground",
            pendingStyle && "opacity-70"
          )}
          role={isAssistant ? "status" : undefined}
        >
          {isAssistant ? (
            <div className="assistant-markdown">
              <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>
        {time && (
          <span className="px-1 text-[10px] text-muted-foreground/70" dir={dir?.dir ?? undefined}>
            {time}
          </span>
        )}
      </div>
      {!isAssistant && (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground"
          aria-hidden="true"
        >
          <UserRound className="size-4" />
        </span>
      )}
    </div>
  );
}

export const MessageBubble = memo(MessageBubbleInner);
