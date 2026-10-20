"use client";

/**
 * تب «پیام‌ها» در پنل مربی — مرحله ۱۷.
 *
 * فهرست مکالمه‌های مجاز مربی (ارتباط فعال + تاریخچه‌دارها) با انتخاب
 * دانشجوی مرتبط، نمایش زمان آخرین فعالیت، شمار پیام خوانده‌نشده و
 * پیش‌نمایش آخرین پیام. انتخاب مکالمه، پنل گفت‌وگوی مشترک را باز
 * میکند؛ بازگشت، فهرست را از سرور تازه میکند.
 * فهرست محدودیت تعداد مناسب دارد (سقف سرور) و به‌روزرسانی آن دستی است؛
 * polling فقط داخل مکالمه باز انجام میشود.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, MessagesSquare, History } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachChatStrings } from "@/lib/i18n/sections/coach-chat";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { useSessionData } from "../../session-context";
import { EmptyState } from "../../shared/empty-state";
import { CoachChatPanel } from "../../shared/coach-chat-panel";
import { useChatConversationList } from "@/hooks/use-coach-chat";
import type { ChatConversationClient } from "@/lib/coaching/chat-client";

function ConversationRow({
  entry,
  onOpen,
}: {
  entry: ChatConversationClient;
  onOpen: (connectionId: string) => void;
}) {
  const t = useStrings(coachChatStrings);
  const locale = useLocale();
  const active = entry.connectionStatus === "ACTIVE";
  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{entry.counterpart.displayName}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {entry.lastMessageAt
              ? `${t.lastActivityLabel}: ${localeDateTimeLabel(entry.lastMessageAt, locale)}`
              : t.noMessagesYet}
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            active
              ? "border-primary/40 bg-primary/15 text-[10px] font-bold text-primary"
              : "border-border/50 bg-secondary/40 text-[10px] font-bold text-muted-foreground"
          }
        >
          {active ? t.statusActive : t.statusEnded}
        </Badge>
      </div>

      {entry.lastMessagePreview && (
        <p className="mt-2 truncate rounded-lg border border-border/50 bg-secondary/30 p-2 text-[11px] leading-5 text-muted-foreground">
          {entry.lastMessagePreview}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
          onClick={() => onOpen(entry.connectionId)}
        >
          <MessagesSquare className="size-3.5" aria-hidden="true" />
          {entry.conversationId ? t.viewChat : t.openChat}
        </Button>
        {entry.unreadCount > 0 && (
          <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {t.unreadLabel(entry.unreadCount)}
          </span>
        )}
      </div>
    </div>
  );
}

export function CoachMessagesTab() {
  const t = useStrings(coachChatStrings);
  const { user } = useSessionData();
  const { conversations, loading, error, refresh } = useChatConversationList(user !== null);
  const [selected, setSelected] = useState<string | null>(null);

  if (selected) {
    return (
      <CoachChatPanel
        key={selected}
        connectionId={selected}
        myUserId={user?.id ?? null}
        onBack={async () => {
          setSelected(null);
          await refresh();
        }}
      />
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-foreground">{t.listTitle}</h2>
          <p className="text-[11px] leading-5 text-muted-foreground">{t.listIntro}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={refresh}
          aria-label={t.refresh}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
          ))}
          <span className="sr-only">{t.loading}</span>
        </div>
      ) : error ? (
        <EmptyState
          icon={RefreshCw}
          title={t.loadError}
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={refresh}>
              {t.retry}
            </Button>
          }
        />
      ) : !conversations || conversations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title={t.listEmptyTitle}
          description={t.listEmptyNote}
        />
      ) : (
        <div className="space-y-3">
          {conversations.map((entry) => (
            <ConversationRow key={entry.connectionId} entry={entry} onOpen={setSelected} />
          ))}
          <p className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground">
            <History className="size-3" aria-hidden="true" />
            {t.historyKeptNote}
          </p>
        </div>
      )}
    </div>
  );
}
