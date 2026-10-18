"use client";

/**
 * قطعات مشترک تب‌های «برنامه‌های من» در پنل مربی — مرحله ۱۶.
 * کارت برنامه، نشان وضعیت، دیالوگ ارسال با انتخاب دانشجوی ACTIVE و
 * فهرست نسخه‌های ارسال‌شده. هیچ تصمیم مجوزی اینجا گرفته نمی‌شود.
 */

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Send, Users, History, AlertTriangle } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { useCoachStudents } from "@/hooks/use-coaching";
import { archiveCoachPlan, publishCoachPlan } from "@/hooks/use-coach-plans";
import type {
  CoachPlanListItemClient,
  CoachPlanVersionClient,
} from "@/lib/coaching/plans-client";

/* ------------------------------ نشان وضعیت ------------------------------ */

export function PlanStatusBadge({ status }: { status: string }) {
  const t = useStrings(coachPlansStrings);
  if (status === "published") {
    return (
      <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
        {t.statusPublished}
      </Badge>
    );
  }
  if (status === "archived") {
    return (
      <Badge variant="outline" className="border-border/50 bg-secondary/40 text-[10px] font-bold text-muted-foreground">
        {t.statusArchived}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-400/30 bg-amber-400/10 text-[10px] font-bold text-amber-300">
      {t.statusDraft}
    </Badge>
  );
}

/* ------------------------------ کارت برنامه ------------------------------ */

export function PlanCardActions({
  kind,
  plan,
  onEdit,
  onPreview,
  onDone,
}: {
  kind: "workout" | "nutrition";
  plan: CoachPlanListItemClient;
  onEdit: () => void;
  onPreview: () => void;
  onDone: () => void;
}) {
  const t = useStrings(coachPlansStrings);
  const shared = useStrings(sharedStrings);
  const { toast } = useToast();
  const { students } = useCoachStudents(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [sending, setSending] = useState(false);
  const [versions, setVersions] = useState<CoachPlanVersionClient[] | null>(null);
  const locale = useLocale();

  const canSend = plan.status !== "archived" && (students?.length ?? 0) > 0;

  const send = async () => {
    if (!selectedConnection || sending) return;
    setSending(true);
    const result = await publishCoachPlan(kind, plan.id, selectedConnection);
    setSending(false);
    if (result.ok) {
      toast({ title: t.sentSuccessTitle, description: t.sentSuccessNote(result.data.delivery.version) });
      setSendOpen(false);
      setSelectedConnection("");
      onDone();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  const archive = async () => {
    const result = await archiveCoachPlan(kind, plan.id);
    setArchiveOpen(false);
    if (result.ok) {
      toast({ title: t.archivedToast });
      onDone();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={onPreview}>
          {t.actionPreview}
        </Button>
        {plan.status !== "archived" && (
          <Button size="sm" variant="outline" onClick={onEdit}>
            {t.actionEdit}
          </Button>
        )}
        {plan.status !== "archived" && (
          <Button size="sm" onClick={() => setSendOpen(true)} disabled={!canSend} aria-disabled={!canSend}>
            <Send className="me-1 size-3.5" aria-hidden="true" />
            {t.actionSend}
          </Button>
        )}
        {plan.status !== "archived" && (
          <Button
            size="sm"
            variant="outline"
            className="border-rose-400/30 text-rose-300 hover:bg-rose-400/10"
            onClick={() => setArchiveOpen(true)}
          >
            {t.actionArchive}
          </Button>
        )}
      </div>

      {plan.currentVersion > 0 && (
        <div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-[10px] text-muted-foreground"
            onClick={() => setVersions((v) => (v ? null : []))}
          >
            <History className="me-1 size-3" aria-hidden="true" />
            {t.versionsTitle} ({plan.currentVersion})
          </Button>
          {versions !== null && (
            <p className="px-2 text-[10px] leading-5 text-muted-foreground">
              {t.versionsIntro}
            </p>
          )}
        </div>
      )}

      {plan.status === "archived" && (
        <p className="text-[10px] leading-5 text-muted-foreground/80">{t.archivedNote}</p>
      )}

      {/* دیالوگ ارسال */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.sendDialogTitle}</DialogTitle>
            <DialogDescription className="text-[11px] leading-5">
              {t.sendDialogIntro}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-3">
              <p className="text-[10px] font-bold text-muted-foreground">{t.planSummaryTitle}</p>
              <p className="mt-1 text-xs font-bold text-foreground">{plan.title}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {kind === "workout"
                  ? `${plan.meta.daysCount} ${t.daysLabel} · ${plan.meta.exercisesCount ?? 0} ${t.exercisesCountLabel}`
                  : `${plan.meta.daysCount} ${t.daysLabel} · ${plan.meta.mealsCount ?? 0} ${t.mealsCountLabel}`}
              </p>
            </div>

            {(students?.length ?? 0) === 0 ? (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
                <div>
                  <p className="text-[11px] font-bold text-foreground">{t.noActiveStudents}</p>
                  <p className="mt-1 text-[10px] leading-5 text-muted-foreground">{t.noActiveStudentsNote}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">{t.sendStudentLabel}</Label>
                <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                  <SelectTrigger className="w-full text-xs" aria-label={t.selectStudent}>
                    <SelectValue placeholder={t.selectStudent} />
                  </SelectTrigger>
                  <SelectContent>
                    {(students ?? []).map((s) => (
                      <SelectItem key={s.connectionId} value={s.connectionId} className="text-xs">
                        <span className="flex items-center gap-2">
                          <Users className="size-3 text-muted-foreground" aria-hidden="true" />
                          {s.student.displayName}
                          <span className="text-[10px] text-muted-foreground">
                            · {shared.cooperationTypeLabel(s.cooperationType)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button className="w-full" onClick={send} disabled={sending || !selectedConnection}>
              {sending ? t.sending : t.sendConfirmButton}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* تأیید بایگانی */}
      <AlertDialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">{t.archiveConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-[11px] leading-5">
              {t.archiveConfirmNote}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">{t.archiveNo}</AlertDialogCancel>
            <AlertDialogAction className="text-xs" onClick={archive}>
              {t.archiveYes}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* فهرست نسخه‌ها — ساده و شفاف */}
      {versions !== null && plan.currentVersion > 0 && (
        <div className="rounded-xl border border-border/50 bg-secondary/20 p-3">
          <p className="text-[10px] font-bold text-muted-foreground">{t.versionsTitle}</p>
          <ul className="mt-1.5 space-y-1 text-[10px] text-muted-foreground">
            {Array.from({ length: plan.currentVersion }, (_, i) => plan.currentVersion - i).map((v) => (
              <li key={v}>
                {t.versionN(v)}
                {v === plan.currentVersion && plan.lastSentAt
                  ? ` · ${t.lastSentLabel}: ${localeDateTimeLabel(plan.lastSentAt, locale)}`
                  : ""}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] leading-5 text-amber-300/80">{t.editAfterSendNote}</p>
        </div>
      )}
    </div>
  );
}
