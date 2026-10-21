"use client";

/**
 * نمای «گفتگو» — مرحله ۲۰ (بخش ۲ مشخصات).
 * برای همه نقش‌ها: جست‌وجوی افراد + فهرست رشته‌ها + پنل گفت‌وگو.
 * به‌روزرسانی زنده با polling کوتاه (هوک‌ها). همه مجوزها سمت سرور.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, MessagesSquare, Search, Send, UserRound } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { dmStrings } from "@/lib/i18n/sections/dm";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { useSessionData } from "../session-context";
import { EmptyState } from "../shared/empty-state";
import {
  openThreadWith,
  searchPeopleApi,
  useDirectMessages,
  useDirectThreads,
} from "@/hooks/use-dm";

export function MessagesView() {
  const t = useStrings(dmStrings);
  const locale = useLocale();
  const { user } = useSessionData();
  const { toast } = useToast();
  const { threads, loading, error, refresh } = useDirectThreads(user !== null);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<{ userId: string; displayName: string; role: string }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const { messages, send } = useDirectMessages(openThreadId);

  const doSearch = async () => {
    const q = query.trim();
    if (q.length < 2) return;
    setSearching(true);
    const result = await searchPeopleApi(q);
    setSearching(false);
    if (result.ok) {
      setPeople(result.data.people);
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  const startWith = async (userId: string) => {
    const result = await openThreadWith(userId);
    if (result.ok) {
      setPeople(null);
      setQuery("");
      setOpenThreadId(result.data.thread.id);
      void refresh();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  const doSend = async () => {
    const body = draft.trim();
    if (body.length === 0 || sending) return;
    setSending(true);
    const result = await send(body);
    setSending(false);
    if (result.ok) {
      setDraft("");
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  if (!user) {
    return <EmptyState icon={MessagesSquare} title={t.title} description={t.signInNote} />;
  }

  if (openThreadId) {
    const thread = (threads ?? []).find((th) => th.id === openThreadId);
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setOpenThreadId(null);
              void refresh();
            }}
          >
            <ArrowRight className="me-1 size-3.5 rtl:rotate-180" aria-hidden="true" />
            {t.backToList}
          </Button>
          <p className="text-sm font-bold text-foreground">
            {thread?.counterpart.displayName ?? t.conversationTitle}
          </p>
        </div>

        <div className="min-h-64 space-y-2 rounded-xl border border-border/60 bg-card/50 p-3">
          {(messages ?? []).map((m) => {
            const mine = m.senderId === user.id;
            return (
              <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    mine
                      ? "max-w-[80%] rounded-2xl rounded-ee-sm bg-primary/15 px-3 py-2"
                      : "max-w-[80%] rounded-2xl rounded-es-sm border border-border/50 bg-secondary/40 px-3 py-2"
                  }
                >
                  <p className="whitespace-pre-wrap break-words text-xs leading-6 text-foreground" dir="auto">
                    {m.body}
                  </p>
                  <p className="mt-0.5 text-[9px] text-muted-foreground/70">
                    {localeDateTimeLabel(m.createdAt, locale)}
                  </p>
                </div>
              </div>
            );
          })}
          {messages !== null && messages.length === 0 && (
            <p className="py-8 text-center text-[11px] text-muted-foreground">{t.emptyConversation}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, 4000))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void doSend();
              }
            }}
            placeholder={t.messagePlaceholder}
            className="text-xs"
            aria-label={t.messagePlaceholder}
          />
          <Button size="icon" className="size-9 shrink-0" onClick={() => void doSend()} disabled={sending || draft.trim().length === 0} aria-label={t.send}>
            <Send className="size-4 rtl:-scale-x-100" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-[9px] text-muted-foreground/60">{t.liveNote}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* جست‌وجوی افراد */}
      <section className="space-y-2">
        <p className="text-sm font-bold text-foreground">{t.searchTitle}</p>
        <p className="text-[11px] text-muted-foreground">{t.searchNote}</p>
        <div className="flex items-center gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value.slice(0, 80))}
            onKeyDown={(e) => {
              if (e.key === "Enter") void doSearch();
            }}
            placeholder={t.searchPlaceholder}
            className="max-w-xs text-xs"
            aria-label={t.searchPlaceholder}
          />
          <Button size="sm" variant="outline" onClick={() => void doSearch()} disabled={searching || query.trim().length < 2}>
            <Search className="me-1 size-3.5" aria-hidden="true" />
            {t.searchButton}
          </Button>
        </div>
        {people !== null && (
          <div className="space-y-1.5">
            {people.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">{t.noPeople}</p>
            ) : (
              people.map((p) => (
                <div
                  key={p.userId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/70 p-3"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/50 bg-secondary/40 text-muted-foreground">
                      <UserRound className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{p.displayName}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {p.role === "COACH" ? t.roleCoach : p.role === "ADMIN" ? t.roleAdmin : t.roleStudent}
                      </p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={() => void startWith(p.userId)}>
                    <MessagesSquare className="size-3.5" aria-hidden="true" />
                    {t.chatWith}
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </section>

      {/* فهرست رشته‌ها */}
      <section className="space-y-3">
        <p className="text-sm font-bold text-foreground">{t.threadsTitle}</p>
        {loading ? (
          <div className="space-y-3" aria-busy="true" aria-live="polite">
            {[0, 1].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={MessagesSquare}
            title={t.loadError}
            description={error}
            action={
              <Button variant="outline" size="sm" onClick={() => void refresh()}>
                {t.retry}
              </Button>
            }
          />
        ) : !threads || threads.length === 0 ? (
          <EmptyState icon={MessagesSquare} title={t.threadsEmptyTitle} description={t.threadsEmptyNote} />
        ) : (
          <div className="space-y-2">
            {threads.map((th) => (
              <div
                key={th.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/70 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{th.counterpart.displayName}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {th.lastMessagePreview ?? t.noMessagesYet}
                    {th.lastMessageAt ? ` · ${localeDateTimeLabel(th.lastMessageAt, locale)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {th.unreadCount > 0 && (
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                      {t.unreadLabel(th.unreadCount)}
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10" onClick={() => setOpenThreadId(th.id)}>
                    <MessagesSquare className="size-3.5" aria-hidden="true" />
                    {t.openThread}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
