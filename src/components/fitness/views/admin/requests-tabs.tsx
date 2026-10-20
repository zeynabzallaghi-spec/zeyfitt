"use client";

/**
 * تب‌های «درخواست مربی‌گری»، «درخواست ارتقا» و «تیکت پشتیبانی» پنل
 * مدیریت — مرحله ۱۹.۵. تصمیم‌ها فقط از همین مسیر با ثبت گزارش اقدام.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, ClipboardList, Crown, LifeBuoy, Info } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocale } from "@/lib/i18n/locale";
import { adminStrings } from "@/lib/i18n/sections/admin";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { EmptyState } from "../../shared/empty-state";
import {
  useAdminCoachApplications,
  useAdminPremiumRequests,
  useAdminTickets,
  useAdminActions,
  type AdminApplicationRowClient,
  type AdminPremiumRequestRowClient,
  type AdminTicketRowClient,
} from "@/hooks/use-admin";
import type { AdminT } from "./users-tab";

function StatusChip({ status, t }: { status: string; t: AdminT }) {
  const map: Record<string, string> = {
    pending: t.statusPending,
    approved: t.statusApproved,
    rejected: t.statusRejected,
    open: t.statusOpen,
    answered: t.statusAnswered,
    resolved: t.statusResolved,
    closed: t.statusClosed,
  };
  const tone =
    status === "approved" || status === "resolved"
      ? "border-primary/40 bg-primary/10 text-primary"
      : status === "rejected" || status === "closed"
        ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
        : status === "answered"
          ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return (
    <Badge variant="outline" className={`text-[10px] font-bold ${tone}`}>
      {map[status] ?? status}
    </Badge>
  );
}

function StatusFilter({ value, onChange, t }: { value: string; onChange: (v: string) => void; t: AdminT }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t.statusFilterAll}
      className="h-9 rounded-md border border-border/60 bg-background px-2 text-xs font-medium"
    >
      <option value="pending">{t.statusPending}</option>
      <option value="">{t.statusFilterAll}</option>
      <option value="approved">{t.statusApproved}</option>
      <option value="rejected">{t.statusRejected}</option>
    </select>
  );
}

function RefreshButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="outline" size="icon" onClick={onClick} aria-label={label} className="size-9 shrink-0">
      <RefreshCw className="size-3.5" aria-hidden="true" />
    </Button>
  );
}

/* ------------------------------ تب درخواست مربی‌گری ------------------------------ */

function ApplicationsTab({ t }: { t: AdminT }) {
  const locale = useLocale();
  const [status, setStatus] = useState("pending");
  const { data, loading, error, refresh } = useAdminCoachApplications(status, true);
  const { busyId, decideApplication } = useAdminActions();
  const { toast } = useToast();

  const [target, setTarget] = useState<AdminApplicationRowClient | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [note, setNote] = useState("");
  const [publish, setPublish] = useState(false);

  const rows = data?.applications ?? [];

  async function doDecide() {
    if (!target) return;
    const result = await decideApplication(target.id, decision, {
      note: note.trim() ? note.trim() : undefined,
      publish: decision === "approved" ? publish : undefined,
    });
    if (result.ok) {
      toast({ description: t.successGeneric });
      setTarget(null);
      setNote("");
      setPublish(false);
      void refresh();
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-6 text-muted-foreground">{t.applicationsIntro}</p>
      <div className="flex items-center gap-2">
        <StatusFilter value={status} onChange={setStatus} t={t} />
        <RefreshButton onClick={() => void refresh()} label={t.retry} />
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />
      ) : error ? (
        <p className="text-xs font-bold leading-6 text-rose-300">{error}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t.emptyApplicationsTitle} description={t.emptyApplicationsNote} compact />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id} className="border-border/60 bg-secondary/20">
              <CardContent className="flex flex-col gap-2 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-bold">
                    {row.userName}
                    <span dir="ltr" className="ms-1.5 text-[10px] font-medium text-muted-foreground">{row.userEmail}</span>
                  </p>
                  <StatusChip status={row.status} t={t} />
                  {row.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="h-7 text-[10px] font-bold"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setTarget(row);
                          setDecision("approved");
                          setNote("");
                          setPublish(false);
                        }}
                      >
                        <Info className="size-3" aria-hidden="true" />
                        {t.approveAction}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-rose-400/40 text-[10px] font-bold text-rose-300 hover:text-rose-200"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setTarget(row);
                          setDecision("rejected");
                          setNote("");
                          setPublish(false);
                        }}
                      >
                        {t.rejectAction}
                      </Button>
                    </>
                  )}
                </div>
                <p className="text-[10px] leading-5 text-muted-foreground">
                  {t.experienceLabel}: {row.experienceYears != null ? t.experienceYearsLabel(row.experienceYears) : "—"}
                  {" · "}
                  {t.certificationsLabel}: {row.certifications.length > 0 ? row.certifications.join("، ") : t.noCertifications}
                </p>
                <p className="rounded-lg border border-border/50 bg-background/40 p-2.5 text-[11px] leading-6">
                  {row.message ?? t.noMessage}
                </p>
                {row.decidedAt && (
                  <p className="text-[10px] text-muted-foreground/70">{t.decidedAt(localeDateTimeLabel(row.decidedAt, locale))}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* دیالوگ تصمیم */}
      <Dialog open={target != null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {decision === "approved" ? t.approveAction : t.rejectAction} — {target?.userName}
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-6">
              {decision === "approved" ? t.publishCheckboxNote : t.applicationsIntro}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {decision === "approved" && (
              <label className="flex cursor-pointer items-start gap-2 text-[11px] font-bold leading-5">
                <Checkbox checked={publish} onCheckedChange={(v) => setPublish(v === true)} className="mt-0.5" />
                {t.publishCheckbox}
              </label>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-decision-note" className="text-[11px] font-bold">{t.decisionNoteLabel}</Label>
              <Textarea
                id="admin-decision-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.decisionNotePlaceholder}
                rows={2}
                className="text-xs"
                maxLength={300}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>{t.cancel}</Button>
            <Button size="sm" onClick={() => void doDecide()}>{t.submit}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ تب درخواست ارتقا ------------------------------ */

function PremiumRequestsTab({ t }: { t: AdminT }) {
  const locale = useLocale();
  const [status, setStatus] = useState("pending");
  const { data, loading, error, refresh } = useAdminPremiumRequests(status, true);
  const { busyId, decidePremiumRequest } = useAdminActions();
  const { toast } = useToast();

  const [target, setTarget] = useState<AdminPremiumRequestRowClient | null>(null);
  const [decision, setDecision] = useState<"approved" | "rejected">("approved");
  const [days, setDays] = useState("30");
  const [noExpiry, setNoExpiry] = useState(false);
  const [note, setNote] = useState("");

  const rows = data?.requests ?? [];

  async function doDecide() {
    if (!target) return;
    let d: number | null = null;
    if (decision === "approved") {
      if (noExpiry) {
        d = null;
      } else {
        const parsed = Number.parseInt(days, 10);
        if (!Number.isInteger(parsed) || parsed < 1) {
          toast({ description: t.approveDaysPlaceholder, variant: "destructive" });
          return;
        }
        d = parsed;
      }
    }
    const result = await decidePremiumRequest(target.id, decision, {
      note: note.trim() ? note.trim() : undefined,
      days: decision === "approved" ? d : undefined,
    });
    if (result.ok) {
      toast({ description: t.successGeneric });
      setTarget(null);
      setNote("");
      void refresh();
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-6 text-muted-foreground">{t.premiumRequestsIntro}</p>
      <div className="flex items-center gap-2">
        <StatusFilter value={status} onChange={setStatus} t={t} />
        <RefreshButton onClick={() => void refresh()} label={t.retry} />
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />
      ) : error ? (
        <p className="text-xs font-bold leading-6 text-rose-300">{error}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Crown} title={t.emptyPremiumRequestsTitle} description={t.emptyPremiumRequestsNote} compact />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id} className="border-border/60 bg-secondary/20">
              <CardContent className="flex flex-col gap-2 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-bold">
                    {row.userName}
                    <span dir="ltr" className="ms-1.5 text-[10px] font-medium text-muted-foreground">{row.userEmail}</span>
                  </p>
                  <StatusChip status={row.status} t={t} />
                  {row.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        className="h-7 text-[10px] font-bold"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setTarget(row);
                          setDecision("approved");
                          setDays("30");
                          setNoExpiry(false);
                          setNote("");
                        }}
                      >
                        {t.approveAction}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 border-rose-400/40 text-[10px] font-bold text-rose-300 hover:text-rose-200"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setTarget(row);
                          setDecision("rejected");
                          setNote("");
                        }}
                      >
                        {t.rejectAction}
                      </Button>
                    </>
                  )}
                </div>
                {row.message && (
                  <p className="rounded-lg border border-border/50 bg-background/40 p-2.5 text-[11px] leading-6">{row.message}</p>
                )}
                {row.decidedNote && (
                  <p className="text-[10px] leading-5 text-muted-foreground">{t.decisionNoteLabel}: {row.decidedNote}</p>
                )}
                {row.decidedAt && (
                  <p className="text-[10px] text-muted-foreground/70">{t.decidedAt(localeDateTimeLabel(row.decidedAt, locale))}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* دیالوگ تصمیم */}
      <Dialog open={target != null} onOpenChange={(open) => !open && setTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {decision === "approved" ? t.approveAction : t.rejectAction} — {target?.userName}
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-6">{t.grantNoteIntro}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {decision === "approved" ? (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="admin-pr-days" className="w-28 text-[11px] font-bold">{t.approveDaysLabel}</Label>
                  <Input
                    id="admin-pr-days"
                    value={days}
                    onChange={(e) => setDays(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder={t.approveDaysPlaceholder}
                    disabled={noExpiry}
                    inputMode="numeric"
                    dir="ltr"
                    className="h-9 text-xs"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold">
                  <Checkbox checked={noExpiry} onCheckedChange={(v) => setNoExpiry(v === true)} />
                  {t.approveDaysNoExpiry}
                </label>
              </>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-pr-note" className="text-[11px] font-bold">{t.decisionNoteLabel}</Label>
              <Textarea
                id="admin-pr-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t.decisionNotePlaceholder}
                rows={2}
                className="text-xs"
                maxLength={300}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setTarget(null)}>{t.cancel}</Button>
            <Button size="sm" onClick={() => void doDecide()}>{t.submit}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------ تب تیکت‌ها ------------------------------ */

function TicketsTab({ t }: { t: AdminT }) {
  const locale = useLocale();
  const [status, setStatus] = useState("open");
  const { data, loading, error, refresh } = useAdminTickets(status, true);
  const { busyId, updateTicket } = useAdminActions();
  const { toast } = useToast();
  const [replyFor, setReplyFor] = useState<AdminTicketRowClient | null>(null);
  const [reply, setReply] = useState("");

  const rows = data?.tickets ?? [];

  async function sendReply() {
    if (!replyFor || !reply.trim()) return;
    const result = await updateTicket(replyFor.id, { reply: reply.trim(), status: "answered" });
    if (result.ok) {
      toast({ description: t.successGeneric });
      setReplyFor(null);
      setReply("");
      void refresh();
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  async function setStatusFor(row: AdminTicketRowClient, next: string) {
    const result = await updateTicket(row.id, { status: next });
    if (result.ok) {
      toast({ description: t.successGeneric });
      void refresh();
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-6 text-muted-foreground">{t.ticketsIntro}</p>
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label={t.statusFilterAll}
          className="h-9 rounded-md border border-border/60 bg-background px-2 text-xs font-medium"
        >
          <option value="open">{t.statusOpen}</option>
          <option value="">{t.statusFilterAll}</option>
          <option value="answered">{t.statusAnswered}</option>
          <option value="resolved">{t.statusResolved}</option>
          <option value="closed">{t.statusClosed}</option>
        </select>
        <RefreshButton onClick={() => void refresh()} label={t.retry} />
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />
      ) : error ? (
        <p className="text-xs font-bold leading-6 text-rose-300">{error}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={LifeBuoy} title={t.emptyTicketsTitle} description={t.emptyTicketsNote} compact />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <Card key={row.id} className="border-border/60 bg-secondary/20">
              <CardContent className="flex flex-col gap-2 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-bold">
                    {row.subject}
                    <span dir="ltr" className="ms-1.5 text-[10px] font-medium text-muted-foreground">{row.userEmail}</span>
                  </p>
                  <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">{row.category}</Badge>
                  <StatusChip status={row.status} t={t} />
                </div>
                <p className="rounded-lg border border-border/50 bg-background/40 p-2.5 text-[11px] leading-6">{row.body}</p>
                {row.reply && (
                  <p className="rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-[11px] leading-6">
                    <span className="font-bold">{t.adminReplyLabel}:</span> {row.reply}
                    {row.repliedAt && (
                      <span className="ms-1 text-[10px] text-muted-foreground/70">({localeDateTimeLabel(row.repliedAt, locale)})</span>
                    )}
                  </p>
                )}
                {row.status === "open" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-fit text-[10px] font-bold"
                    disabled={busyId === row.id}
                    onClick={() => {
                      setReplyFor(row);
                      setReply("");
                    }}
                  >
                    {t.replyAction}
                  </Button>
                )}
                {row.status === "answered" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-fit text-[10px] font-bold"
                    disabled={busyId === row.id}
                    onClick={() => void setStatusFor(row, "resolved")}
                  >
                    {t.resolveAction}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* دیالوگ پاسخ */}
      <Dialog open={replyFor != null} onOpenChange={(open) => !open && setReplyFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{replyFor?.subject}</DialogTitle>
            <DialogDescription className="text-[11px] leading-6">{t.ticketReplyLabel}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t.ticketReplyPlaceholder}
            rows={4}
            className="text-xs"
            maxLength={2000}
            aria-label={t.ticketReplyLabel}
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setReplyFor(null)}>{t.cancel}</Button>
            <Button size="sm" disabled={!reply.trim()} onClick={() => void sendReply()}>{t.replyAction}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { ApplicationsTab, PremiumRequestsTab, TicketsTab, StatusChip };
