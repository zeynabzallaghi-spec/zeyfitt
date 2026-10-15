"use client";

import { Plus, MessageSquareText, Trash2, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { AssistantConversationSummary } from "@/lib/assistant/types";
import type { AssistantStrings } from "@/lib/assistant/i18n";

/**
 * فهرست مکالمه‌های کاربر — ساخت مکالمه جدید، بازکردن مکالمه قبلی و حذف
 * با تأیید صریح. ترتیب: آخرین فعالیت. هر مکالمه فقط مال خودِ کاربر است.
 */

function relativeDayLabel(iso: string, strings: AssistantStrings): string {
  const date = new Date(iso);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const time = date.getTime();
  try {
    if (time >= startOfToday) return strings.todayLabel;
    if (time >= startOfYesterday) return strings.yesterdayLabel;
    return new Intl.DateTimeFormat(strings.langAttr === "fa" ? "fa-IR" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  error,
  deletingId,
  strings,
  onSelect,
  onCreate,
  onDelete,
  onRetry,
}: {
  conversations: AssistantConversationSummary[];
  activeId: string | null;
  loading: boolean;
  error: string | null;
  deletingId: string | null;
  strings: AssistantStrings;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
          <MessageSquareText className="size-3.5 text-primary" aria-hidden="true" />
          {strings.conversationsTitle}
        </p>
        <Button
          type="button"
          size="sm"
          onClick={onCreate}
          className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px] font-bold text-primary-foreground"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {strings.newConversation}
        </Button>
      </div>

      {loading && (
        <p className="flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/30 p-3 text-[11px] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          {strings.historyLoading}
        </p>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-[11px] text-destructive">{strings.historyError}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="mt-2 h-7 gap-1.5 rounded-lg text-[11px]"
          >
            <RefreshCw className="size-3" aria-hidden="true" />
            {strings.historyRetry}
          </Button>
        </div>
      )}

      {!loading && !error && conversations.length === 0 && (
        <p className="rounded-xl border border-border/50 bg-secondary/30 p-3 text-[11px] leading-5 text-muted-foreground">
          {strings.historyEmpty}
        </p>
      )}

      {!loading && !error && conversations.length > 0 && (
        <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pe-1" aria-label={strings.conversationsTitle}>
          {conversations.map((conversation) => {
            const isActive = conversation.id === activeId;
            const title = conversation.title || strings.noConversationTitle;
            return (
              <li key={conversation.id} className="group relative">
                <button
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "flex w-full flex-col gap-0.5 rounded-xl border px-3 py-2.5 text-start transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isActive
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/50 bg-secondary/25 hover:border-primary/25 hover:bg-secondary/45"
                  )}
                >
                  <span
                    className={cn(
                      "line-clamp-1 pe-7 text-[12px] font-bold",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                  >
                    {title}
                  </span>
                  <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{relativeDayLabel(conversation.updatedAt, strings)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{strings.messagesCount(conversation.messageCount)}</span>
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={deletingId === conversation.id}
                  onClick={() => onDelete(conversation.id)}
                  aria-label={`${strings.deleteConversation}: ${title}`}
                  className="absolute end-1.5 top-1.5 size-7 rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                >
                  {deletingId === conversation.id ? (
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** دیالوگ تأیید حذف مکالمه — حذف بدون تأیید صریح انجام نمی‌شود */
export function DeleteConversationDialog({
  open,
  pending,
  strings,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  pending: boolean;
  strings: AssistantStrings;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => (!next ? onCancel() : undefined)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{strings.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>{strings.deleteDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={pending}>
            {strings.deleteCancel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={pending}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {pending ? strings.deleting : strings.deleteConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
