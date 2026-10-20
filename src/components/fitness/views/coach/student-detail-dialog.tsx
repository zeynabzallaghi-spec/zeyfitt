"use client";

/**
 * دیالوگ «اطلاعات تکمیلی دانشجو» — مرحله ۱۹.۶ (بخش ۹).
 * پروفایل مجاز + برنامه‌های اختصاص‌یافته + سابقه واقعی تمرین + یادداشت
 * خصوصی مربی + لینک گفت‌وگو. همه داده‌ها فقط برای مربی مالک ارتباط ACTIVE.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { CalendarDays, MessagesSquare, RefreshCw } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { coachPanelStrings } from "@/lib/i18n/sections/coach-panel";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { useCoachStudentDetail } from "@/hooks/use-p196";

export function StudentDetailDialog({
  studentId,
  open,
  onOpenChange,
  onOpenChat,
}: {
  studentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenChat?: (connectionId: string) => void;
}) {
  const t = useStrings(phase196Strings);
  const plansT = useStrings(coachPlansStrings);
  const panelT = useStrings(coachPanelStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const { toast } = useToast();
  const { detail, loading, error, saveNote, reload } = useCoachStudentDetail(open ? studentId : null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // الگوی رسمی «مشتق در رندر»: بستن دیالوگ پیش‌نویس را پاک میکند
  if (!open && noteDraft !== null) {
    setNoteDraft(null);
  }

  const noteValue = noteDraft ?? detail?.note?.content ?? "";

  const doSaveNote = async () => {
    setSavingNote(true);
    const result = await saveNote(noteValue.trim());
    setSavingNote(false);
    if (result.ok) {
      toast({ title: t.studentDetailNoteSaved });
      setNoteDraft(null);
    } else {
      toast({ title: panelT.loadError, description: result.message, variant: "destructive" });
    }
  };

  const profile = detail?.student.profile ?? null;
  const age = profile && typeof profile.age === "number" ? profile.age : null;
  const gender = profile && typeof profile.gender === "string" ? profile.gender : null;
  const goal = profile && typeof profile.goal === "string" ? profile.goal : null;
  const experience = profile && typeof profile.experience === "string" ? profile.experience : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {detail?.student.displayName ?? t.studentDetailTitle}
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-5">
            {t.studentDetailNotePrivacy}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-secondary/30" />
            ))}
          </div>
        ) : error || !detail ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{error ?? panelT.loadError}</p>
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              <RefreshCw className="me-1 size-3.5" aria-hidden="true" />
              {plansT.retry}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* نوع خدمات + وضعیت */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                {shared.cooperationTypeLabel(detail.connection.cooperationType)}
              </Badge>
              <span className="text-muted-foreground">
                {t.studentDetailServiceType}: {shared.cooperationTypeLabel(detail.connection.cooperationType)}
              </span>
              {detail.connection.startedAt && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <CalendarDays className="size-3" aria-hidden="true" />
                  {localeDateTimeLabel(detail.connection.startedAt, locale)}
                </span>
              )}
            </div>

            {/* پروفایل مجاز */}
            <section className="space-y-1.5">
              <p className="text-xs font-bold text-foreground">{t.studentDetailProfile}</p>
              {detail.student.profileCompleted && profile ? (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {age !== null && (
                    <span className="text-muted-foreground">
                      {locale === "fa" ? "سن" : "Age"}: <span className="font-bold text-foreground">{localeNumber(age, locale)}</span>
                    </span>
                  )}
                  {gender && (
                    <span className="text-muted-foreground">
                      {shared.genderLabel(gender)}
                    </span>
                  )}
                  {goal && (
                    <span className="text-muted-foreground">
                      {shared.goalLabel(goal)}
                    </span>
                  )}
                  {experience && (
                    <span className="text-muted-foreground">
                      {shared.experienceLabel(experience)}
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground">{locale === "fa" ? "پروفایل هنوز کامل نشده است." : "The profile is not complete yet."}</p>
              )}
            </section>

            {/* سابقه پیشرفت واقعی */}
            <section className="space-y-1.5">
              <p className="text-xs font-bold text-foreground">{t.studentDetailProgress}</p>
              <p className="text-[11px] text-muted-foreground">
                {t.studentDetailSessions(detail.progress.sessionsCount)}
                {detail.progress.lastSessionAt && (
                  <>
                    {" · "}
                    {t.studentDetailLastSession}: {localeDateTimeLabel(detail.progress.lastSessionAt, locale)}
                  </>
                )}
              </p>
            </section>

            {/* برنامه‌های اختصاص‌یافته */}
            <section className="space-y-1.5">
              <p className="text-xs font-bold text-foreground">{t.studentDetailPlans}</p>
              {detail.plans.workout.length === 0 && detail.plans.nutrition.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">{t.studentDetailNoPlans}</p>
              ) : (
                <ul className="space-y-1">
                  {detail.plans.workout.map((p) => (
                    <li key={p.id} className="truncate text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground">{p.title}</span>
                      {" · "}
                      {locale === "fa" ? "تمرینی" : "Workout"}
                      {" · "}
                      v{localeNumber(p.version, locale)}
                      {" · "}
                      {localeDateTimeLabel(p.sentAt, locale)}
                    </li>
                  ))}
                  {detail.plans.nutrition.map((p) => (
                    <li key={p.id} className="truncate text-[11px] text-muted-foreground">
                      <span className="font-bold text-foreground">{p.title}</span>
                      {" · "}
                      {locale === "fa" ? "غذایی" : "Nutrition"}
                      {" · "}
                      v{localeNumber(p.version, locale)}
                      {" · "}
                      {localeDateTimeLabel(p.sentAt, locale)}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* یادداشت خصوصی */}
            <section className="space-y-1.5">
              <Label htmlFor="coach-note" className="text-xs font-bold text-foreground">
                {t.studentDetailNote}
              </Label>
              <Textarea
                id="coach-note"
                dir={locale === "fa" ? "rtl" : "ltr"}
                value={noteValue}
                onChange={(e) => setNoteDraft(e.target.value.slice(0, 4000))}
                placeholder={t.studentDetailNotePlaceholder}
                rows={4}
                maxLength={4000}
                className="resize-none text-xs"
              />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] text-muted-foreground/70">{t.studentDetailNotePrivacy}</p>
                <Button size="sm" onClick={() => void doSaveNote()} disabled={savingNote}>
                  {savingNote ? plansT.saving : t.studentDetailNoteSave}
                </Button>
              </div>
              {detail.note?.updatedAt && (
                <p className="text-[9px] text-muted-foreground/60">
                  {plansT.updatedAtLabel}: {localeDateTimeLabel(detail.note.updatedAt, locale)}
                </p>
              )}
            </section>

            {/* گفت‌وگو */}
            {onOpenChat && (
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => {
                  onOpenChange(false);
                  onOpenChat(detail.connection.id);
                }}
              >
                <MessagesSquare className="size-3.5" aria-hidden="true" />
                {t.studentDetailChat}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function localeNumber(n: number, locale: string): string {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(n);
}
