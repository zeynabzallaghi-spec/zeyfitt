"use client";

/**
 * بخش‌های درخواستی پروفایل — مرحله ۱۹.۵:
 *  ۱) درخواست ارتقای اشتراک Free → Premium (فقط STUDENT)
 *  ۲) درخواست مربی‌گری (فقط STUDENT؛ مربی/ادمین یادداشت شفاف می‌بینند)
 *  ۳) مرکز پشتیبانی — تیکت‌های خود کاربر با پیگیری وضعیت و پاسخ ادمین
 *
 * همه مجوزها سمت سرور است؛ این کامپوننت‌ها فقط وضعیت تأییدشده API را
 * نمایش می‌دهند و هیچ فرضی درباره نتیجه عملیات نمی‌سازند.
 */

import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  Crown,
  ClipboardList,
  LifeBuoy,
  Plus,
  RefreshCw,
  FileText,
  Paperclip,
  Trash2,
} from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { supportStrings } from "@/lib/i18n/sections/support";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel, localeNumber } from "@/lib/i18n/format";
import { ProfileSection } from "../shared/profile-fields";
import { EmptyState } from "../shared/empty-state";
import {
  usePremiumRequest,
  useSupportTickets,
  useCoachApplication,
  type ApplicationAttachmentClient,
} from "@/hooks/use-admin";

type SupportT = ReturnType<typeof supportStrings>;

function RequestStatusChip({ status, t }: { status: string; t: SupportT }) {
  const label =
    status === "approved"
      ? t.statusApproved
      : status === "rejected"
        ? t.statusRejected
        : t.statusPending;
  const tone =
    status === "approved"
      ? "border-primary/40 bg-primary/10 text-primary"
      : status === "rejected"
        ? "border-rose-400/30 bg-rose-400/10 text-rose-300"
        : "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return (
    <Badge variant="outline" className={`text-[10px] font-bold ${tone}`}>
      {label}
    </Badge>
  );
}

/* ---------------------- درخواست ارتقای Premium ---------------------- */

export function PremiumRequestSection() {
  const t = useStrings(supportStrings);
  const { request, role, loading, error, busy, submit, refresh } = usePremiumRequest(true);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  if (role && role !== "STUDENT") return null;

  async function doSubmit() {
    const result = await submit(message);
    if (result.ok) {
      toast({ description: t.supportThanks });
      setOpen(false);
      setMessage("");
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  return (
    <ProfileSection icon={Crown} title={t.premiumSectionTitle}>
      {loading ? (
        <div className="h-10 animate-pulse rounded-lg border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />
      ) : error ? (
        <p className="text-xs leading-6 text-destructive">{error}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {request ? (
            <div className="flex flex-wrap items-center gap-2">
              <RequestStatusChip status={request.status} t={t} />
              <p className="min-w-0 flex-1 text-[11px] leading-5 text-muted-foreground">
                {request.status === "approved"
                  ? t.premiumApprovedNote
                  : request.status === "rejected"
                    ? t.premiumRejectedNote
                    : t.premiumPendingNote}
              </p>
            </div>
          ) : (
            <p className="text-[11px] leading-6 text-muted-foreground">{t.premiumFreeIntro}</p>
          )}
          {request?.decidedNote && (
            <p className="rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-[11px] leading-6">
              <span className="font-bold">{t.premiumDecisionNoteLabel}:</span> {request.decidedNote}
            </p>
          )}
          {(!request || request.status === "rejected") && (
            <Button
              variant="outline"
              className="w-fit font-bold"
              disabled={busy}
              onClick={() => {
                setMessage(request?.message ?? "");
                setOpen(true);
              }}
            >
              <Crown className="size-4" aria-hidden="true" />
              {request?.status === "rejected" ? t.premiumResubmitAction : t.premiumRequestAction}
            </Button>
          )}
          <p className="text-[10px] leading-5 text-muted-foreground/70">{t.premiumNoPaymentNote}</p>
          <Button variant="outline" size="icon" onClick={() => void refresh()} aria-label={t.retry} className="size-9 self-start">
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.premiumRequestTitle}</DialogTitle>
            <DialogDescription className="text-[11px] leading-6">{t.premiumRequestHint}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="premium-request-message" className="text-[11px] font-bold">{t.premiumMessageLabel}</Label>
            <Textarea
              id="premium-request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.premiumMessagePlaceholder}
              rows={3}
              maxLength={500}
              className="text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button size="sm" disabled={busy} onClick={() => void doSubmit()}>{t.submit}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProfileSection>
  );
}

/* ---------------------- درخواست مربی‌گری ---------------------- */

const ATTACH_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const ATTACH_MAX = 5;

function formatBytes(n: number, locale: "fa" | "en"): string {
  if (n >= 1024 * 1024) {
    return `${localeNumber(Math.round((n / (1024 * 1024)) * 10) / 10, locale)} MB`;
  }
  if (n >= 1024) return `${localeNumber(Math.round(n / 1024), locale)} KB`;
  return `${localeNumber(n, locale)} B`;
}

/** ردیف نمایشی یک سند پیوستی — لینک مشاهده همان مسیر API مالکیت‌محور است */
function AttachmentRow({
  att,
  locale,
  viewLabel,
  removeLabel,
  onRemove,
  removing,
}: {
  att: ApplicationAttachmentClient;
  locale: "fa" | "en";
  viewLabel: string;
  removeLabel: string;
  onRemove?: (id: string) => void;
  removing?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5">
      <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="min-w-0 flex-1 truncate text-[11px] font-bold">{att.title}</p>
      <span dir="ltr" className="truncate text-[10px] text-muted-foreground">
        {att.fileName} · {formatBytes(att.sizeBytes, locale)}
      </span>
      <a
        href={`/api/coach/apply/attachments/${encodeURIComponent(att.id)}`}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-[10px] font-bold text-primary underline-offset-2 hover:underline"
      >
        {viewLabel}
      </a>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon"
          aria-label={removeLabel}
          disabled={removing}
          onClick={() => onRemove(att.id)}
          className="size-7 shrink-0 text-muted-foreground hover:text-rose-300"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

/** افزودن سند به فهرست موقت/زنده — عنوان + فایل + دکمه افزودن */
function AttachmentComposer({
  t,
  onAdd,
  disabled,
}: {
  t: SupportT;
  onAdd: (input: { title: string; file: File }) => void;
  disabled?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-secondary/20 p-2.5">
      <Label htmlFor="coach-apply-att-title" className="text-[11px] font-bold">
        {t.attachmentTitleLabel}
      </Label>
      <Input
        id="coach-apply-att-title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.attachmentTitlePlaceholder}
        maxLength={80}
        className="h-9 text-xs"
      />
      <Label htmlFor="coach-apply-att-file" className="text-[11px] font-bold">
        {t.attachmentChooseFile}
      </Label>
      <Input
        id="coach-apply-att-file"
        type="file"
        accept={ATTACH_ACCEPT}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="h-9 text-xs file:me-2 file:h-7 file:rounded-md file:border-0 file:bg-secondary file:px-2 file:text-[10px] file:font-bold"
      />
      <Button
        variant="outline"
        size="sm"
        className="w-fit font-bold"
        disabled={disabled || title.trim().length === 0 || !file}
        onClick={() => {
          if (!file) return;
          onAdd({ title: title.trim(), file });
          setTitle("");
          setFile(null);
        }}
      >
        <Paperclip className="size-3.5" aria-hidden="true" />
        {t.attachmentAddAction}
      </Button>
    </div>
  );
}

export function CoachApplicationSection() {
  const t = useStrings(supportStrings);
  const locale = useLocale();
  const {
    application,
    role,
    loading,
    error,
    busy,
    submit,
    uploadAttachment,
    deleteAttachment,
    refresh,
  } = useCoachApplication(true);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  // attachmentsOnly: درخواست در جریان است — فقط افزودن/حذف سند (بدون فرم)
  const [attachmentsOnly, setAttachmentsOnly] = useState(false);
  const [message, setMessage] = useState("");
  const [years, setYears] = useState("");
  const [certs, setCerts] = useState("");
  // اسناد انتخاب‌شده که هنوز ارسال نشده‌اند — پس از ثبت فرم بارگذاری میشوند
  const [staging, setStaging] = useState<{ title: string; file: File }[]>([]);

  if (role === "COACH" || role === "ADMIN") {
    return (
      <ProfileSection icon={ClipboardList} title={t.coachApplySectionTitle}>
        <p className="text-[11px] leading-6 text-muted-foreground">{t.coachIsCoachNote}</p>
      </ProfileSection>
    );
  }

  const serverAttachments = application?.attachments ?? [];
  const canEdit = !application || application.status === "rejected";
  const canAttach = !application || application.status === "pending" || application.status === "rejected";

  async function doSubmit() {
    const certificationList = certs
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 10);
    const parsedYears = years.trim() === "" ? null : Number.parseInt(years, 10);
    const result = await submit({
      message: message.trim() ? message.trim() : undefined,
      experienceYears:
        parsedYears != null && Number.isInteger(parsedYears) && parsedYears >= 0
          ? parsedYears
          : undefined,
      certifications: certificationList.length > 0 ? certificationList : undefined,
    });
    if (!result.ok) {
      toast({ description: result.message, variant: "destructive" });
      return;
    }
    // فرم ثبت شد — حالا اسناد منتخب را دونه‌دونه بارگذاری میکنیم
    const queue = [...staging];
    setStaging([]);
    for (const item of queue) {
      const up = await uploadAttachment(item);
      if (!up.ok) {
        // شکست بارگذاری — بقیه در فهرست میماند تا کاربر دوباره تلاش کند
        setStaging(queue.slice(queue.indexOf(item)));
        toast({ description: up.message, variant: "destructive" });
        void refresh();
        return;
      }
    }
    toast({ description: staging.length > 0 ? t.attachmentAddedNote : t.supportThanks });
    setOpen(false);
    void refresh();
  }

  async function doUploadLive(input: { title: string; file: File }) {
    const up = await uploadAttachment(input);
    if (up.ok) {
      toast({ description: t.attachmentAddedNote });
    } else {
      toast({ description: up.message, variant: "destructive" });
    }
  }

  async function doRemove(id: string) {
    const del = await deleteAttachment(id);
    if (!del.ok) {
      toast({ description: del.message, variant: "destructive" });
    }
  }

  function openDialog(onlyAttachments: boolean) {
    setAttachmentsOnly(onlyAttachments);
    setMessage("");
    setYears("");
    setCerts("");
    setStaging([]);
    setOpen(true);
  }

  return (
    <ProfileSection icon={ClipboardList} title={t.coachApplySectionTitle}>
      {loading ? (
        <div className="h-10 animate-pulse rounded-lg border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />
      ) : error ? (
        <p className="text-xs leading-6 text-destructive">{error}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[11px] leading-6 text-muted-foreground">{t.coachApplyIntro}</p>
          {application && (
            <div className="flex flex-wrap items-center gap-2">
              <RequestStatusChip status={application.status} t={t} />
              <p className="min-w-0 flex-1 text-[11px] leading-5 text-muted-foreground">
                {application.status === "approved"
                  ? t.coachApplyApprovedNote
                  : application.status === "rejected"
                    ? t.coachApplyRejectedNote
                    : t.coachApplyPendingNote}
              </p>
            </div>
          )}

          {/* فهرست اسناد پیوستی فعلی — نمایش برای همه وضعیت‌ها */}
          {canAttach && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="min-w-0 flex-1 text-[10px] font-bold text-muted-foreground">
                  {t.coachApplyAttachmentsLabel} · {t.attachmentCount(serverAttachments.length)}
                </p>
                {application?.status === "pending" && serverAttachments.length < ATTACH_MAX && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] font-bold"
                    disabled={busy}
                    onClick={() => openDialog(true)}
                  >
                    <Paperclip className="size-3" aria-hidden="true" />
                    {t.attachmentPendingAddAction}
                  </Button>
                )}
              </div>
              {serverAttachments.length === 0 ? (
                <p className="text-[10px] leading-5 text-muted-foreground/70">{t.attachmentEmptyNote}</p>
              ) : (
                serverAttachments.map((att) => (
                  <AttachmentRow
                    key={att.id}
                    att={att}
                    locale={locale}
                    viewLabel={t.attachmentViewAction}
                    removeLabel={t.attachmentRemoveAction}
                    onRemove={
                      application && application.status !== "approved"
                        ? (id) => void doRemove(id)
                        : undefined
                    }
                    removing={busy}
                  />
                ))
              )}
              <p className="text-[10px] leading-5 text-muted-foreground/70">{t.coachApplyAttachmentHint}</p>
            </div>
          )}

          {canEdit && (
            <Button
              variant="outline"
              className="w-fit font-bold"
              disabled={busy}
              onClick={() => openDialog(false)}
            >
              <ClipboardList className="size-4" aria-hidden="true" />
              {application ? t.coachApplyEditAction : t.coachApplyAction}
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={() => void refresh()} aria-label={t.retry} className="size-9 self-start">
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {attachmentsOnly ? t.attachmentPendingAddAction : t.coachApplyAction}
            </DialogTitle>
            <DialogDescription className="text-[11px] leading-6">
              {attachmentsOnly ? t.coachApplyAttachmentHint : t.coachApplyIntro}
            </DialogDescription>
          </DialogHeader>

          {attachmentsOnly ? (
            <div className="flex flex-col gap-3">
              {serverAttachments.length < ATTACH_MAX ? (
                <AttachmentComposer t={t} onAdd={(input) => void doUploadLive(input)} disabled={busy} />
              ) : (
                <p className="text-[10px] leading-5 text-amber-300">{t.attachmentCount(serverAttachments.length)}</p>
              )}
              {serverAttachments.map((att) => (
                <AttachmentRow
                  key={att.id}
                  att={att}
                  locale={locale}
                  viewLabel={t.attachmentViewAction}
                  removeLabel={t.attachmentRemoveAction}
                  onRemove={(id) => void doRemove(id)}
                  removing={busy}
                />
              ))}
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t.cancel}</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="coach-apply-message" className="text-[11px] font-bold">{t.coachApplyMessageLabel}</Label>
                <Textarea
                  id="coach-apply-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.coachApplyMessagePlaceholder}
                  rows={3}
                  maxLength={1000}
                  className="text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="coach-apply-years" className="text-[11px] font-bold">{t.coachApplyExperienceLabel}</Label>
                <Input
                  id="coach-apply-years"
                  value={years}
                  onChange={(e) => setYears(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={t.coachApplyExperiencePlaceholder}
                  inputMode="numeric"
                  dir="ltr"
                  className="h-9 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="coach-apply-certs" className="text-[11px] font-bold">{t.coachApplyCertificationsLabel}</Label>
                <Textarea
                  id="coach-apply-certs"
                  value={certs}
                  onChange={(e) => setCerts(e.target.value)}
                  placeholder={t.coachApplyCertificationsPlaceholder}
                  rows={3}
                  className="text-xs"
                />
                <p className="text-[10px] leading-5 text-muted-foreground/70">{t.coachApplyCertificationsHint}</p>
              </div>

              {/* اسناد منتخب — ابتدا همراه فرم ثبت میشوند، سپس بارگذاری */}
              {serverAttachments.length + staging.length < ATTACH_MAX && (
                <AttachmentComposer
                  t={t}
                  onAdd={(input) => setStaging((prev) => [...prev, input])}
                />
              )}
              {staging.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground">
                    {t.coachApplyAttachmentsLabel} · {t.attachmentCount(staging.length)}
                  </p>
                  {staging.map((item, i) => (
                    <div key={`${item.file.name}-${i}`} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border/50 bg-background/40 px-2.5 py-1.5">
                      <FileText className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <p className="min-w-0 flex-1 truncate text-[11px] font-bold">{item.title}</p>
                      <span dir="ltr" className="truncate text-[10px] text-muted-foreground">
                        {item.file.name} · {formatBytes(item.file.size, locale)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t.attachmentRemoveAction}
                        onClick={() => setStaging((prev) => prev.filter((_, j) => j !== i))}
                        className="size-7 shrink-0 text-muted-foreground hover:text-rose-300"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {serverAttachments.length > 0 && (
                <p className="text-[10px] leading-5 text-muted-foreground/70">
                  {t.attachmentCount(serverAttachments.length)} — {t.coachApplyAttachmentsLabel}
                </p>
              )}
            </div>
          )}

          {!attachmentsOnly && (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t.cancel}</Button>
              <Button size="sm" disabled={busy} onClick={() => void doSubmit()}>{t.coachApplySubmit}</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </ProfileSection>
  );
}

/* ---------------------- مرکز پشتیبانی ---------------------- */

const TICKET_CATEGORY_KEYS = ["bug", "account", "subscription", "coach", "other"] as const;

function TicketCategoryLabel({ category, t }: { category: string; t: SupportT }) {
  const map: Record<string, string> = {
    bug: t.categoryBug,
    account: t.categoryAccount,
    subscription: t.categorySubscription,
    coach: t.categoryCoach,
    other: t.categoryOther,
  };
  return (
    <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground">
      {map[category] ?? category}
    </Badge>
  );
}

function TicketStatusChip({ status, t }: { status: string; t: SupportT }) {
  // برچسب وضعیت تیکت — باز: در انتظار، پاسخ‌داده‌شده: پاسخ پشتیبانی، حل‌شده/بسته
  const label =
    status === "open"
      ? t.statusPending
      : status === "answered"
        ? t.adminReplyLabel
        : status === "resolved"
          ? t.statusApproved
          : t.statusRejected;
  const tone =
    status === "resolved"
      ? "border-primary/40 bg-primary/10 text-primary"
      : status === "closed"
        ? "border-border/60 bg-secondary/40 text-muted-foreground"
        : status === "answered"
          ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300";
  return (
    <Badge variant="outline" className={`text-[10px] font-bold ${tone}`}>
      {label}
    </Badge>
  );
}

export function SupportCenterSection() {
  const t = useStrings(supportStrings);
  const locale = useLocale();
  const { tickets, loading, error, busyId, create, act, refresh } = useSupportTickets(true);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("bug");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const categoryLabels: Record<string, string> = {
    bug: t.categoryBug,
    account: t.categoryAccount,
    subscription: t.categorySubscription,
    coach: t.categoryCoach,
    other: t.categoryOther,
  };

  async function doCreate() {
    const result = await create({ category, subject: subject.trim(), body: body.trim() });
    if (result.ok) {
      toast({ description: t.supportThanks });
      setOpen(false);
      setSubject("");
      setBody("");
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  async function doAct(id: string, action: "close" | "reopen") {
    const result = await act(id, action);
    if (!result.ok) {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  return (
    <ProfileSection icon={LifeBuoy} title={t.supportSectionTitle}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <p className="min-w-0 flex-1 text-[11px] leading-6 text-muted-foreground">{t.supportIntro}</p>
          <Button className="font-bold glow-lime-sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            {t.newTicket}
          </Button>
          <Button variant="outline" size="icon" onClick={() => void refresh()} aria-label={t.retry} className="size-9">
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
        <p className="text-[10px] leading-5 text-muted-foreground/70">{t.supportNotePrivacy}</p>

        {loading ? (
          <div className="h-24 animate-pulse rounded-lg border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />
        ) : error ? (
          <p className="text-xs leading-6 text-destructive">{error}</p>
        ) : tickets.length === 0 ? (
          <EmptyState icon={LifeBuoy} title={t.emptyTicketsTitle} description={t.emptyTicketsNote} compact />
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[10px] font-bold text-muted-foreground">{t.ticketCount(tickets.length)}</p>
            {tickets.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-xs font-bold">{ticket.subject}</p>
                  <TicketCategoryLabel category={ticket.category} t={t} />
                  <TicketStatusChip status={ticket.status} t={t} />
                </div>
                <p className="mt-1.5 text-[11px] leading-6">{ticket.body}</p>
                {ticket.reply && (
                  <p className="mt-2 rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-[11px] leading-6">
                    <span className="font-bold">{t.adminReplyLabel}:</span> {ticket.reply}
                    {ticket.repliedAt && (
                      <span className="ms-1 text-[10px] text-muted-foreground/70">
                        ({localeDateTimeLabel(ticket.repliedAt, locale)})
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/70">
                    {localeDateTimeLabel(ticket.createdAt, locale)}
                  </span>
                  <span className="flex-1" />
                  {ticket.status === "answered" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] font-bold"
                      disabled={busyId === ticket.id}
                      onClick={() => void doAct(ticket.id, "reopen")}
                    >
                      {t.reopenTicket}
                    </Button>
                  )}
                  {(ticket.status === "open" || ticket.status === "answered") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] font-bold"
                      disabled={busyId === ticket.id}
                      onClick={() => void doAct(ticket.id, "close")}
                    >
                      {t.closeTicket}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.newTicketTitle}</DialogTitle>
            <DialogDescription className="text-[11px] leading-6">{t.supportNotePrivacy}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-category" className="text-[11px] font-bold">{t.categoryLabel}</Label>
              <select
                id="ticket-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-md border border-border/60 bg-background px-2 text-xs font-medium"
              >
                {TICKET_CATEGORY_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {categoryLabels[key]}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-subject" className="text-[11px] font-bold">{t.subjectLabel}</Label>
              <Input
                id="ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t.subjectPlaceholder}
                maxLength={80}
                className="text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ticket-body" className="text-[11px] font-bold">{t.bodyLabel}</Label>
              <Textarea
                id="ticket-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t.bodyPlaceholder}
                rows={4}
                maxLength={2000}
                className="text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button size="sm" disabled={subject.trim().length < 3 || body.trim().length < 10} onClick={() => void doCreate()}>
              {t.submitTicket}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ProfileSection>
  );
}
