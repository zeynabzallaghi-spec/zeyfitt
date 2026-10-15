"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Bot, MessagesSquare, PanelRightOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAssistantChat } from "@/hooks/use-assistant-chat";
import { assistantStrings } from "@/lib/assistant/i18n";
import { ViewIntro } from "../shared/view-intro";
import { getNavItem } from "@/lib/nav";
import { ConversationSidebar, DeleteConversationDialog } from "./assistant/conversation-sidebar";
import { LanguageSelector } from "./assistant/language-selector";
import { ChatPanel } from "./assistant/chat-panel";

/**
 * دستیار هوشمند واقعی — چت متصل به مدل زبانی از سمت سرور با مکالمه‌های
 * ذخیره‌شده، پاسخ فارسی/انگلیسی و حالت‌های صادقانه خطا.
 *
 * - زبان رابط: «خودکار/فارسی» → راست‌چین (پیش‌فرض اپ)، «English» → چپ‌چین.
 * - جهت هر پیام جدا از جهت رابط بر اساس زبان خود پیام تعیین می‌شود.
 * - اگر اتصال مدل پیکربندی نشده باشد، وضعیت واقعی + راهنمای تنظیم نمایش
 *   داده می‌شود و هیچ چت ظاهراً فعالی وجود ندارد.
 */
export function AssistantView() {
  const item = getNavItem("assistant");
  const chat = useAssistantChat();
  const strings = assistantStrings(chat.uiLang);

  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const configured = chat.provider?.configured === true;
  const statusLabel = chat.statusLoading
    ? strings.statusChecking
    : chat.statusError
      ? strings.errorNetwork
      : configured
        ? strings.statusConnected
        : strings.statusNotConfigured;

  const handleCreate = () => {
    void chat.createConversation();
    setMobileListOpen(false);
  };

  const handleSelect = (id: string) => {
    chat.selectConversation(id);
    setMobileListOpen(false);
  };

  const requestDelete = (id: string) => setPendingDeleteId(id);

  const confirmDelete = () => {
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    if (id) void chat.deleteConversation(id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro item={item} />

      <section
        dir={strings.dir}
        lang={strings.langAttr}
        aria-label={strings.title}
        className="flex overflow-hidden rounded-2xl border border-border/60 bg-card"
      >
        {/* ستون مکالمه‌ها — دسکتاپ */}
        <aside
          className="hidden w-64 shrink-0 flex-col border-e border-border/60 bg-secondary/20 p-3.5 lg:flex"
          aria-label={strings.conversationsTitle}
        >
          <ConversationSidebar
            conversations={chat.conversations}
            activeId={chat.activeId}
            loading={chat.conversationsLoading}
            error={chat.conversationsError}
            deletingId={chat.deletingId}
            strings={strings}
            onSelect={chat.selectConversation}
            onCreate={handleCreate}
            onDelete={requestDelete}
            onRetry={() => void chat.refreshConversations()}
          />
        </aside>

        {/* ستون اصلی چت */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* سربرگ */}
          <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-4 py-3 md:px-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary glow-lime-sm">
              <Bot className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-foreground">{strings.title}</p>
              <p
                className={cn(
                  "flex items-center gap-1.5 text-[10px]",
                  chat.statusLoading
                    ? "text-muted-foreground"
                    : configured
                      ? "text-primary"
                      : "text-amber-300"
                )}
              >
                {chat.statusLoading ? (
                  <Loader2 className="size-2.5 animate-spin" aria-hidden="true" />
                ) : (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      configured ? "bg-primary" : "bg-amber-300"
                    )}
                    aria-hidden="true"
                  />
                )}
                {statusLabel}
              </p>
            </div>

            <LanguageSelector
              value={chat.langChoice}
              onChange={chat.setLangChoice}
              strings={strings}
            />

            {/* فهرست مکالمه‌ها — موبایل */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setMobileListOpen(true)}
              aria-label={strings.conversationsTitle}
              className="size-8 shrink-0 rounded-lg lg:hidden"
            >
              <PanelRightOpen className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <ChatPanel chat={chat} strings={strings} configured={configured} />
        </div>
      </section>

      {/* یادداشت شفافیت — مرز نقش دستیار */}
      <p className="rounded-xl border border-border/50 bg-secondary/30 p-3.5 text-[11px] leading-relaxed text-muted-foreground">
        {strings.transparencyNote}
      </p>

      {/* فهرست مکالمه‌ها در موبایل */}
      <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <SheetContent side={strings.dir === "rtl" ? "right" : "left"} className="w-[290px] p-3.5">
          <SheetTitle className="sr-only">{strings.conversationsTitle}</SheetTitle>
          <div className="flex h-full min-h-0 flex-col gap-3 pt-6">
            <div className="flex items-center gap-2 border-b border-border/50 pb-2">
              <MessagesSquare className="size-4 text-primary" aria-hidden="true" />
              <p className="text-xs font-bold text-foreground">{strings.conversationsTitle}</p>
            </div>
            <ConversationSidebar
              conversations={chat.conversations}
              activeId={chat.activeId}
              loading={chat.conversationsLoading}
              error={chat.conversationsError}
              deletingId={chat.deletingId}
              strings={strings}
              onSelect={handleSelect}
              onCreate={handleCreate}
              onDelete={requestDelete}
              onRetry={() => void chat.refreshConversations()}
            />
          </div>
        </SheetContent>
      </Sheet>

      <DeleteConversationDialog
        open={pendingDeleteId !== null}
        pending={chat.deletingId !== null}
        strings={strings}
        onCancel={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
      />
    </motion.div>
  );
}
