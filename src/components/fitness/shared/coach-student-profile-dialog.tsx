"use client";

/**
 * دیالوگ پروفایل دانشجو از گفت‌وگو — مرحله ۱۹.۶ (بخش ۲).
 * از همان API اطلاعات تکمیلی دانشجو (مجوز ارتباط ACTIVE سمت سرور) استفاده
 * میکند؛ هیچ صفحه موازی‌ای نساخته میشود و داده خصوصی/بانکی هرگز نمایش
 * داده نمیشود. در موبایل، بازگشت به مکالمه با بستن دیالوگ ساده است.
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { useLocale } from "@/lib/i18n/locale";
import { useCoachStudentDetail } from "@/hooks/use-p196";

export function CoachStudentProfileDialog({
  studentId,
  open,
  onOpenChange,
}: {
  studentId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const t = useStrings(phase196Strings);
  const plansT = useStrings(coachPlansStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const { detail, loading, error, reload } = useCoachStudentDetail(open ? studentId : null);

  const profile = detail?.student.profile ?? null;
  const age = profile && typeof profile.age === "number" ? profile.age : null;
  const gender = profile && typeof profile.gender === "string" ? profile.gender : null;
  const goal = profile && typeof profile.goal === "string" ? profile.goal : null;
  const experience = profile && typeof profile.experience === "string" ? profile.experience : null;
  const notes = profile && typeof profile.notes === "string" ? profile.notes : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {detail?.student.displayName ?? t.chatStudentProfileTitle}
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-5">
            {t.chatBackToConversation}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[0, 1].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-secondary/30" />
            ))}
          </div>
        ) : error || !detail ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{error ?? t.chatProfileLoadError}</p>
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              <RefreshCw className="me-1 size-3.5" aria-hidden="true" />
              {plansT.retry}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                {shared.cooperationTypeLabel(detail.connection.cooperationType)}
              </Badge>
              {detail.student.profileCompleted ? (
                <span className="text-[10px] text-muted-foreground">
                  {locale === "fa" ? "پروفایل کامل" : "Profile complete"}
                </span>
              ) : null}
            </div>

            {detail.student.profileCompleted && profile ? (
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {age !== null && (
                  <span className="text-muted-foreground">
                    {locale === "fa" ? "سن" : "Age"}:{" "}
                    <span className="font-bold text-foreground">
                      {new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(age)}
                    </span>
                  </span>
                )}
                {gender && (
                  <span className="text-muted-foreground">{shared.genderLabel(gender)}</span>
                )}
                {goal && <span className="text-muted-foreground">{shared.goalLabel(goal)}</span>}
                {experience && (
                  <span className="text-muted-foreground">{shared.experienceLabel(experience)}</span>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {locale === "fa" ? "پروفایل هنوز کامل نشده است." : "The profile is not complete yet."}
              </p>
            )}

            {notes && (
              <p className="rounded-lg border border-border/50 bg-secondary/30 p-2 text-[11px] leading-6 text-muted-foreground">
                {notes}
              </p>
            )}

            <div className="rounded-lg border border-border/50 bg-secondary/20 p-2.5 text-[10px] leading-5 text-muted-foreground">
              {t.studentDetailProgress}: {t.studentDetailSessions(detail.progress.sessionsCount)}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
