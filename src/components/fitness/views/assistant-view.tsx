"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, Send, UserRound, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  useFitnessStore,
  ASSISTANT_STATUS_REPLY,
  type ChatMessage,
} from "@/store/fitness-store";
import { getNavItem } from "@/lib/nav";
import { ViewIntro } from "../shared/view-intro";
import { StageBadge } from "../shared/badges";

const SAMPLE_QUESTIONS = [
  "برای عضله‌سازی چه برنامه‌ای مناسب من است؟",
  "امروز چه تمرینی دارم؟",
  "چطور پروتئین روزانه‌ام را تأمین کنم؟",
  "این حرکت را با چه حرکتی جایگزین کنم؟",
];

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAssistant = message.role === "assistant";
  const Icon = isAssistant ? Bot : UserRound;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex items-start gap-2.5", isAssistant ? "justify-start" : "justify-end")}
    >
      {isAssistant && (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/12 text-primary"
          aria-hidden="true"
        >
          <Bot className="size-4" />
        </span>
      )}
      <div
        className={cn(
          "max-w-[82%] rounded-2xl px-4 py-3 text-xs leading-6 sm:text-[13px] sm:leading-7",
          isAssistant
            ? "rounded-ss-md border border-border/60 bg-secondary/40 text-foreground/90"
            : "rounded-se-md border border-primary/25 bg-primary/12 text-foreground"
        )}
        role={isAssistant ? "status" : undefined}
      >
        {message.text}
      </div>
      {!isAssistant && (
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground"
          aria-hidden="true"
        >
          <UserRound className="size-4" />
        </span>
      )}
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5" aria-label="در حال نوشتن پاسخ">
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

export function AssistantView() {
  const item = getNavItem("assistant");
  const chat = useFitnessStore((s) => s.chat);
  const addUserMessage = useFitnessStore((s) => s.addUserMessage);
  const addAssistantMessage = useFitnessStore((s) => s.addAssistantMessage);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // اسکرول خودکار به آخرین پیام
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.length, pending]);

  // پاک‌سازی تایمر در حذف کامپوننت
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const hasUserMessages = chat.some((m) => m.role === "user");

  const sendMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text || pending) return;
    addUserMessage(text);
    setInput("");
    setPending(true);
    timerRef.current = setTimeout(() => {
      addAssistantMessage(ASSISTANT_STATUS_REPLY);
      setPending(false);
    }, 900);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro
        item={item}
        badges={
          <StageBadge stage={9} label="اتصال به مدل AI: مرحله ۹" />
        }
      />

      <section
        aria-label="گفت‌وگو با دستیار هوشمند"
        className="flex flex-col rounded-2xl border border-border/60 bg-card"
      >
        {/* سربرگ گفت‌وگو */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3.5 md:px-5">
          <span className="flex size-9 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary glow-lime-sm">
            <Bot className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground">دستیار مربی</p>
            <p className="text-[10px] text-muted-foreground">
              دسترسی کنترل‌شده به پروفایل و برنامه‌های شما (در نسخه کامل)
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-300" aria-hidden="true" />
            مدل AI متصل نیست
          </span>
        </div>

        {/* پیام‌ها */}
        <div
          ref={scrollRef}
          className="flex h-[380px] flex-col gap-4 overflow-y-auto px-4 py-5 md:px-5"
          aria-live="polite"
        >
          {chat.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {pending && <TypingIndicator />}
        </div>

        {/* پیشنهاد سؤال‌ها */}
        {!hasUserMessages && (
          <div className="flex flex-wrap gap-2 border-t border-border/60 px-4 py-3.5 md:px-5" aria-label="سؤال‌های پیشنهادی">
            {SAMPLE_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                disabled={pending}
                onClick={() => sendMessage(question)}
                className="flex items-center gap-1.5 rounded-full border border-border/50 bg-secondary/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-all duration-200 hover:border-primary/35 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              >
                <Sparkles className="size-3" aria-hidden="true" />
                {question}
              </button>
            ))}
          </div>
        )}

        {/* ورودی پیام */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          className="flex items-center gap-2 border-t border-border/60 p-3 md:p-4"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="سؤال خود را بنویسید…"
            aria-label="متن سؤال"
            className="flex-1"
            maxLength={500}
          />
          <Button
            type="submit"
            size="icon"
            disabled={pending || input.trim().length === 0}
            aria-label="ارسال پیام"
            className="shrink-0 text-primary-foreground"
          >
            <Send className="size-4" />
          </Button>
        </form>
      </section>

      {/* یادداشت شفافیت */}
      <p className="rounded-xl border border-border/50 bg-secondary/30 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
        شفافیت مهم است: در این نسخه، پاسخ دستیار صرفاً پیام وضعیت است و پاسخ واقعی هوش مصنوعی
        محسوب نمی‌شود. اتصال به مدل زبانی از سمت سرور (بدون قرارگیری کلید در مرورگر) در مرحله ۹
        انجام می‌شود و دستیار حتی در نسخه کامل، تشخیص پزشکی یا برنامه درمانی ارائه نمی‌کند. برای
        آشنایی با ساختار محتوا، می‌توانید <button type="button" onClick={() => setActiveView("library")} className="font-bold text-primary underline-offset-4 hover:underline">کتابخانه حرکات</button> را ببینید.
      </p>
    </motion.div>
  );
}
