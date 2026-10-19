"use client";

/**
 * نمای «مربیان» — فهرست عمومی مربیان تأییدشده + مدیریت ارتباط‌های دانشجو.
 *
 * صدا‌قاعده‌های صادق‌نمایی:
 *  - هیچ وضعیتی بدون پاسخ تأییدشده API تغییر نمی‌کند (هیچ موفقیت ساختگی).
 *  - کاربر FREE: توضیح شفاف نیاز به اشتراک ویژه، بدون دکمه فریبنده.
 *  - کاربر مهمان: پیام ورود (دفاعی — در معماری فعلی مهمان به این نما نمی‌رسد).
 *  - همه متن‌ها دوزبانه از دیکشنری sections/coaches.
 */

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  ClipboardList,
  BadgeCheck,
  RefreshCw,
  LogIn,
  Crown,
  Info,
  CalendarDays,
  GraduationCap,
  MessagesSquare,
} from "lucide-react";
import { getNavItem } from "@/lib/nav";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachesStrings } from "@/lib/i18n/sections/coaches";
import { coachChatStrings } from "@/lib/i18n/sections/coach-chat";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { useSessionData } from "../session-context";
import { ViewIntro } from "../shared/view-intro";
import { EmptyState } from "../shared/empty-state";
import { PlanTierBadge } from "../shared/badges";
import {
  useMyConnections,
  usePublicCoaches,
  useSubscription,
  cancelConnectionRequest,
  endConnection,
  sendConnectionRequest,
} from "@/hooks/use-coaching";
import { useChatConversationList } from "@/hooks/use-coach-chat";
import { CoachChatPanel } from "../shared/coach-chat-panel";
import type {
  ConnectionItemClient,
  PublicCoachClient,
} from "@/lib/coaching/client";
import type { ChatConversationClient } from "@/lib/coaching/chat-client";

/* --------------------------- نشان وضعیت ارتباط --------------------------- */

function statusTone(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "border-primary/40 bg-primary/15 text-primary";
    case "PENDING":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "REJECTED":
      return "border-rose-400/30 bg-rose-400/10 text-rose-300";
    case "CANCELLED":
    case "ENDED":
      return "border-border/50 bg-secondary/40 text-muted-foreground";
    default:
      return "border-border/50 bg-secondary/40 text-muted-foreground";
  }
}

function ConnectionStatusBadge({ status }: { status: string }) {
  const t = useStrings(coachesStrings);
  const label =
    status === "PENDING"
      ? t.statusPending
      : status === "ACTIVE"
        ? t.statusActive
        : status === "REJECTED"
          ? t.statusRejected
          : status === "CANCELLED"
            ? t.statusCancelled
            : t.statusEnded;
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${statusTone(status)}`}>
      {label}
    </span>
  );
}

/* --------------------------- کارت مربی --------------------------- */

function CoachCard({
  coach,
  onView,
}: {
  coach: PublicCoachClient;
  onView: (coach: PublicCoachClient) => void;
}) {
  const t = useStrings(coachesStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  return (
    <Card className="border-border/60 bg-card/70 transition-colors hover:border-primary/30">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary" aria-hidden="true">
              <GraduationCap className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-foreground">{coach.displayName}</p>
              {coach.headline && (
                <p className="truncate text-[11px] text-muted-foreground">{coach.headline}</p>
              )}
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
            <BadgeCheck className="me-1 size-3" aria-hidden="true" />
            {t.verifiedBadge}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {coach.cooperationTypes.map((type) => (
            <span key={type} className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {shared.cooperationTypeLabel(type)}
            </span>
          ))}
          {coach.experienceYears !== null && (
            <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t.yearsExperience(coach.experienceYears)}
            </span>
          )}
        </div>

        {coach.specializations.length > 0 && (
          <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold text-muted-foreground/70">{t.specializationsLabel}</p>
            <p className="line-clamp-2 text-xs leading-6 text-muted-foreground">
              {coach.specializations.map((s) => shared.specializationLabel(s)).join(" · ")}
            </p>
          </div>
        )}

        <div className="mt-auto pt-1">
          <Button variant="outline" size="sm" className="w-full" onClick={() => onView(coach)}>
            {t.viewProfile}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* --------------------------- دیالوگ درخواست --------------------------- */

function RequestDialog({
  coach,
  premium,
  onClose,
  onSent,
}: {
  coach: PublicCoachClient | null;
  premium: boolean | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const t = useStrings(coachesStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const { user } = useSessionData();
  const { toast } = useToast();
  const [type, setType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sentForCoach, setSentForCoach] = useState<string | null>(null);

  // نوع پیش‌فرض: اولین نوع ارائهشده مربی
  const defaultType = coach?.cooperationTypes[0] ?? "";
  const selectedType = type || defaultType;

  const isPremium = premium === true;
  const isGuest = user === null;

  async function submit() {
    if (!coach || sending) return;
    setSending(true);
    const result = await sendConnectionRequest({
      coachId: coach.userId,
      cooperationType: selectedType,
      message: message.trim() || null,
    });
    setSending(false);
    if (result.ok) {
      // وضعیت واقعی از پاسخ سرور — هیچ فرضی روی نتیجه نمی‌شود
      setSentForCoach(coach.userId);
      toast({
        title: t.requestSentTitle,
        description: t.requestSentNote,
      });
      onSent();
      // دیالوگ باز می‌ماند و پنل موفقیت نشان می‌دهد؛ کاربر می‌بندد
    } else {
      toast({
        title: t.loadError,
        description: result.message,
        variant: "destructive",
      });
    }
  }

  if (!coach) return null;
  const justSent = sentForCoach === coach.userId;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          setType("");
          setMessage("");
          setSentForCoach(null);
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">{coach.displayName}</DialogTitle>
          {coach.headline && (
            <DialogDescription className="text-start">{coach.headline}</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {coach.bio && (
            <p className="whitespace-pre-line text-xs leading-6 text-muted-foreground">{coach.bio}</p>
          )}

          {coach.specializations.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold text-foreground">{t.specializationsLabel}</p>
              <div className="flex flex-wrap gap-1.5">
                {coach.specializations.map((s) => (
                  <span key={s} className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {shared.specializationLabel(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {coach.certifications.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-bold text-foreground">{t.certificationsLabel}</p>
              <ul className="space-y-1">
                {coach.certifications.map((c, i) => (
                  <li key={i} className="text-xs leading-6 text-muted-foreground">• {c}</li>
                ))}
              </ul>
            </div>
          )}

          <Separator className="bg-border/60" />

          {isGuest && (
            <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
              <LogIn className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-xs leading-6 text-muted-foreground">{t.guestPrompt}</p>
            </div>
          )}

          {!isGuest && !isPremium && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
              <Crown className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
              <p className="text-xs leading-6 text-amber-200/90">{t.freeUpsell}</p>
            </div>
          )}

          {!isGuest && isPremium && !justSent && (
            <>
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-foreground">{t.cooperationTypeChoose}</p>
                <RadioGroup
                  value={selectedType}
                  onValueChange={setType}
                  className="gap-2"
                  aria-label={t.cooperationTypeChoose}
                >
                  {coach.cooperationTypes.map((ct) => (
                    <Label
                      key={ct}
                      htmlFor={`ct-${ct}`}
                      className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/60 bg-secondary/30 p-3 has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/10"
                    >
                      <RadioGroupItem id={`ct-${ct}`} value={ct} className="mt-0.5" />
                      <span className="min-w-0">
                        <span className="block text-xs font-bold text-foreground">
                          {shared.cooperationTypeLabel(ct)}
                        </span>
                        <span className="block text-[11px] leading-5 text-muted-foreground">
                          {shared.cooperationTypeHint(ct)}
                        </span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="request-message" className="text-[11px] font-bold text-foreground">
                  {t.messageLabel}
                  <span className="ms-1 font-normal text-muted-foreground">{t.messageOptional}</span>
                </Label>
                <Textarea
                  id="request-message"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 500))}
                  placeholder={t.messagePlaceholder}
                  rows={3}
                  maxLength={500}
                  className="resize-none text-xs"
                />
                <p className="text-[10px] text-muted-foreground/70">
                  {message.length} / 500
                </p>
              </div>

              <p className="text-[11px] leading-5 text-muted-foreground">{t.requestConnectionHint}</p>

              <Button className="w-full" onClick={submit} disabled={sending}>
                {sending ? t.sending : t.sendMessageRequest}
              </Button>
            </>
          )}

          {justSent && (
            <div className="flex items-start gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-foreground">{t.requestSentTitle}</p>
                <p className="mt-1 text-[11px] leading-6 text-muted-foreground">{t.requestSentNote}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- ردیف ارتباط --------------------------- */

function ConnectionRow({
  connection,
  onAction,
  busyId,
  chatEntry,
  onOpenChat,
}: {
  connection: ConnectionItemClient;
  onAction: () => void;
  busyId: string | null;
  /** ورودی مکالمه همین ارتباط از API چت — null یعنی مکالمه‌ای نیست */
  chatEntry: ChatConversationClient | null;
  onOpenChat: (connectionId: string) => void;
}) {
  const t = useStrings(coachesStrings);
  const chatT = useStrings(coachChatStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<null | "cancel" | "end">(null);
  const busy = busyId === connection.id;

  const cancel = async () => {
    setConfirm(null);
    const result = await cancelConnectionRequest(connection.id);
    if (result.ok) {
      toast({ title: t.statusCancelled });
      onAction();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
      onAction();
    }
  };

  const end = async () => {
    setConfirm(null);
    const result = await endConnection(connection.id);
    if (result.ok) {
      toast({ title: t.statusEnded });
      onAction();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
      onAction();
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{connection.coach.displayName}</p>
          {connection.coach.headline && (
            <p className="truncate text-[11px] text-muted-foreground">{connection.coach.headline}</p>
          )}
        </div>
        <ConnectionStatusBadge status={connection.status} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>{shared.cooperationTypeLabel(connection.cooperationType)}</span>
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="size-3" aria-hidden="true" />
          {t.requestedAt}: {localeDateTimeLabel(connection.requestedAt, locale)}
        </span>
        {connection.decidedAt && (
          <span>
            {t.decidedAt}: {localeDateTimeLabel(connection.decidedAt, locale)}
          </span>
        )}
        {connection.endedAt && (
          <span>
            {t.endedAt}: {localeDateTimeLabel(connection.endedAt, locale)}
            {" · "}
            {connection.endedBy === "coach" ? t.endedByCoach : t.endedByStudent}
          </span>
        )}
      </div>

      {connection.message && (
        <p className="mt-2 rounded-lg border border-border/50 bg-secondary/30 p-2 text-xs leading-6 text-muted-foreground">
          {t.requestMessageLabel}: {connection.message}
        </p>
      )}
      {connection.rejectionReason && (
        <p className="mt-2 rounded-lg border border-rose-400/20 bg-rose-400/10 p-2 text-xs leading-6 text-rose-200/90">
          {t.rejectionReasonLabel}: {connection.rejectionReason}
        </p>
      )}

      {connection.status === "PENDING" && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setConfirm("cancel")}
          >
            {busy ? t.cancelling : t.cancelRequest}
          </Button>
        </div>
      )}

      {connection.status === "ACTIVE" && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
            onClick={() => onOpenChat(connection.id)}
          >
            <MessagesSquare className="size-3.5" aria-hidden="true" />
            {chatT.openChat}
            {chatEntry !== null && chatEntry.unreadCount > 0 && (
              <span className="rounded-full bg-primary/20 px-1.5 text-[10px] font-bold">
                {chatEntry.unreadCount}
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-rose-400/30 text-rose-300 hover:bg-rose-400/10"
            disabled={busy}
            onClick={() => setConfirm("end")}
          >
            {busy ? t.ending : t.endConnection}
          </Button>
        </div>
      )}

      {/* تاریخچه گفت‌وگوی ارتباط پایان‌یافته — فقط وقتی مکالمه واقعی وجود دارد */}
      {connection.status !== "ACTIVE" &&
        connection.status !== "PENDING" &&
        chatEntry?.conversationId && (
          <div className="mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => onOpenChat(connection.id)}
            >
              <MessagesSquare className="size-3.5" aria-hidden="true" />
              {chatT.viewChat}
            </Button>
          </div>
        )}

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "cancel" ? t.cancelConfirmTitle : t.endConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "cancel" ? t.cancelConfirmNote : t.endConfirmNote}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.keepIt}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirm === "cancel" ? cancel : end}
              className={
                confirm === "end"
                  ? "bg-rose-500/90 text-white hover:bg-rose-500"
                  : undefined
              }
            >
              {confirm === "cancel" ? t.cancelYes : t.endYes}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* --------------------------- نمای اصلی --------------------------- */

export function CoachesView() {
  const item = getNavItem("coaches");
  const t = useStrings(coachesStrings);
  const dir = useDir();
  const { user } = useSessionData();
  const { subscription, loading: subLoading, refresh: refreshSub } = useSubscription(user !== null);
  const { coaches, loading, error, refresh } = usePublicCoaches();
  const {
    connections,
    loading: connLoading,
    error: connError,
    refresh: refreshConn,
  } = useMyConnections(user !== null);
  const [selected, setSelected] = useState<PublicCoachClient | null>(null);
  // گفت‌وگوی باز — connectionId ارتباط انتخاب‌شده؛ null یعنی نمای فهرست
  const [chatConnectionId, setChatConnectionId] = useState<string | null>(null);
  // فهرست مکالمه‌ها از API چت — برای نشان خوانده‌نشده و دکمه تاریخچه
  const {
    conversations: chatConversations,
    refresh: refreshChatList,
  } = useChatConversationList(user !== null);
  const chatEntryOf = (connectionId: string): ChatConversationClient | null =>
    chatConversations?.find((c) => c.connectionId === connectionId) ?? null;

  const pending = useMemo(
    () => connections?.filter((c) => c.status === "PENDING") ?? [],
    [connections]
  );
  const active = useMemo(
    () => connections?.filter((c) => c.status === "ACTIVE") ?? [],
    [connections]
  );
  const history = useMemo(
    () =>
      connections?.filter(
        (c) => c.status === "REJECTED" || c.status === "CANCELLED" || c.status === "ENDED"
      ) ?? [],
    [connections]
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const refreshAll = async () => {
    setBusyId(null);
    await Promise.all([refreshConn(), refreshSub(), refreshChatList()]);
  };

  // بستن گفت‌وگو — بازگشت به فهرست + تازه‌سازی نشان خوانده‌نشده
  const closeChat = async () => {
    setChatConnectionId(null);
    await refreshChatList();
  };

  return (
    <div>
      <ViewIntro item={item} />

      {/* پنل گفت‌وگو — جایگزین کامل تب‌ها تا بازگشت صریح کاربر */}
      {chatConnectionId ? (
        <CoachChatPanel
          key={chatConnectionId}
          connectionId={chatConnectionId}
          myUserId={user?.id ?? null}
          onBack={closeChat}
        />
      ) : (
      <>
      {/* وضعیت اشتراک — مقدار همیشه از سرور */}
      <Card className="mb-6 border-border/60 bg-card/70">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground">{t.subscriptionTitle}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {subLoading
                ? t.loading
                : subscription?.expired
                  ? t.expiredPlanNote
                  : subscription?.premium
                    ? t.premiumPlanNote
                    : t.freePlanNote}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {subLoading ? (
              <span className="inline-flex h-5 w-14 animate-pulse rounded-md bg-secondary/60" aria-hidden="true" />
            ) : (
              <PlanTierBadge tier={subscription?.tier ?? "FREE"} expired={subscription?.expired ?? false} />
            )}
            <Button variant="ghost" size="icon" className="size-8" onClick={refreshSub} aria-label={t.refresh}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="browse" dir={dir}>
        <TabsList className="mb-4 grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="browse">{t.browseTab}</TabsTrigger>
          <TabsTrigger value="mine">{t.myConnectionsTab}</TabsTrigger>
        </TabsList>

        {/* ---------- فهرست مربیان ---------- */}
        <TabsContent value="browse">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground">{t.coachesListTitle}</h2>
              <p className="text-[11px] text-muted-foreground">{t.coachesListIntro}</p>
            </div>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={refresh} aria-label={t.refresh}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-live="polite">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-44 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
              ))}
              <span className="sr-only">{t.loadingCoaches}</span>
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
          ) : !coaches || coaches.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t.emptyCoachesTitle}
              description={t.emptyCoachesNote}
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {coaches.map((coach) => (
                <CoachCard key={coach.userId} coach={coach} onView={setSelected} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---------- ارتباط‌های من ---------- */}
        <TabsContent value="mine">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground">{t.myConnectionsTitle}</h2>
              <p className="text-[11px] text-muted-foreground">{t.myConnectionsIntro}</p>
            </div>
            <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={refreshAll} aria-label={t.refresh}>
              <RefreshCw className="size-3.5" aria-hidden="true" />
            </Button>
          </div>

          {connLoading ? (
            <div className="space-y-3" aria-busy="true" aria-live="polite">
              {[0, 1].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
              ))}
              <span className="sr-only">{t.loadingConnections}</span>
            </div>
          ) : connError ? (
            <EmptyState
              icon={RefreshCw}
              title={t.loadError}
              description={connError}
              action={
                <Button variant="outline" size="sm" onClick={refreshAll}>
                  {t.retry}
                </Button>
              }
            />
          ) : !connections || connections.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={t.emptyConnectionsTitle}
              description={t.emptyConnectionsNote}
            />
          ) : (
            <div className="space-y-5">
              {/* مربی فعال */}
              <section aria-label={t.activeSection}>
                <h3 className="mb-2 text-xs font-bold text-foreground">{t.currentCoachTitle}</h3>
                {active.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border/60 p-3 text-[11px] text-muted-foreground">
                    {t.noCurrentCoach}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {active.map((c) => (
                      <ConnectionRow
                        key={c.id}
                        connection={c}
                        onAction={refreshAll}
                        busyId={busyId}
                        chatEntry={chatEntryOf(c.id)}
                        onOpenChat={setChatConnectionId}
                      />
                    ))}
                  </div>
                )}
              </section>

              {pending.length > 0 && (
                <section aria-label={t.pendingSection}>
                  <h3 className="mb-2 text-xs font-bold text-foreground">{t.pendingSection}</h3>
                  <div className="space-y-3">
                    {pending.map((c) => (
                      <ConnectionRow
                        key={c.id}
                        connection={c}
                        onAction={refreshAll}
                        busyId={busyId}
                        chatEntry={null}
                        onOpenChat={setChatConnectionId}
                      />
                    ))}
                  </div>
                </section>
              )}

              {history.length > 0 && (
                <section aria-label={t.historyAria}>
                  <h3 className="mb-2 text-xs font-bold text-foreground">{t.historySection}</h3>
                  <div className="space-y-3">
                    {history.map((c) => (
                      <ConnectionRow
                        key={c.id}
                        connection={c}
                        onAction={refreshAll}
                        busyId={busyId}
                        chatEntry={chatEntryOf(c.id)}
                        onOpenChat={setChatConnectionId}
                      />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <RequestDialog
        coach={selected}
        premium={subscription === null ? null : subscription.premium}
        onClose={() => setSelected(null)}
        onSent={refreshAll}
      />
      </>
      )}
    </div>
  );
}
