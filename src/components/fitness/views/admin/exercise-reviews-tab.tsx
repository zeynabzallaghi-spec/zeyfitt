"use client";

/**
 * تب «بازبینی حرکات» پنل ادمین — مرحله ۲۰/P3 (محور ۳ سند طرح).
 *
 * صف ارسال‌های حرکات اختصاصی مربیان: پیش‌نمایش کامل محتوا (نام‌ها، دسته،
 * سطح، عضلات، تجهیزات، توضیح، نکات) + رسانههای پیوست (پیش‌نمایش استریم
 * فقط برای رکورد در انتظار) + تأیید/رد با پیام بازخورد (رد بدون دلیل سمت
 * سرور 422 میشود — تصمیم D8). ادمین محتوا را ویرایش نمیکند.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Film, ImageIcon, Loader2, Play, RefreshCw } from "lucide-react";
import type { AdminStrings } from "@/lib/i18n/sections/admin";
import { useLocale } from "@/lib/i18n/locale";
import { useExerciseReviews, type ExerciseReviewQueueItem } from "@/hooks/use-p196";
import { ExerciseVideoPlayerDialog, type ExerciseMediaItem } from "../../shared/exercise-video-player";
import { EmptyState } from "../../shared/empty-state";

const DIFFICULTY_LABELS: Record<string, { fa: string; en: string }> = {
  beginner: { fa: "مبتدی", en: "Beginner" },
  intermediate: { fa: "متوسط", en: "Intermediate" },
  advanced: { fa: "پیشرفته", en: "Advanced" },
};

function formatDateTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === "fa" ? "fa-IR" : "en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function ExerciseReviewsTab({ t }: { t: AdminStrings }) {
  const locale = useLocale();
  const { toast } = useToast();
  const { items, loading, acting, decide, reload } = useExerciseReviews(true);
  const [rejectTarget, setRejectTarget] = useState<ExerciseReviewQueueItem | null>(null);
  const [feedback, setFeedback] = useState("");
  const [approveTarget, setApproveTarget] = useState<ExerciseReviewQueueItem | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  const doApprove = async () => {
    if (!approveTarget || acting !== null) return;
    const result = await decide(approveTarget.id, "approve");
    setApproveTarget(null);
    if (result.ok) {
      toast({ title: t.exerciseReviewDecidedToast });
    } else {
      toast({ title: t.exerciseReviewError, description: result.message, variant: "destructive" });
    }
  };

  const doReject = async () => {
    if (!rejectTarget || acting !== null) return;
    if (feedback.trim().length === 0) return; // سرور هم 422 میدهد (D8)
    const result = await decide(rejectTarget.id, "reject", feedback.trim());
    setRejectTarget(null);
    setFeedback("");
    if (result.ok) {
      toast({ title: t.exerciseReviewDecidedToast });
    } else {
      toast({ title: t.exerciseReviewError, description: result.message, variant: "destructive" });
    }
  };

  const mediaUrlFor = (item: ExerciseReviewQueueItem, mediaId: string) =>
    `/api/admin/exercise-reviews/${encodeURIComponent(item.id)}/media/${encodeURIComponent(mediaId)}`;

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-6 text-muted-foreground">{t.exerciseReviewsIntro}</p>

      <div className="flex flex-wrap items-center justify-between gap-2">
        {items !== null && (
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
            {t.exerciseReviewsQueueCount(items.length)}
          </Badge>
        )}
        <Button variant="ghost" size="icon" className="size-8" onClick={() => void reload()} aria-label={t.exerciseReviewRefresh}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
          ))}
        </div>
      ) : items === null || items.length === 0 ? (
        <EmptyState icon={Dumbbell} title={t.exerciseReviewsTab} description={t.exerciseReviewsEmpty} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {items.map((item) => (
            <Card key={item.id} className="border-amber-500/30 bg-card/70">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground" dir="auto">
                      {locale === "fa" ? item.faName : item.enName}
                    </p>
                    <p dir="ltr" className="truncate text-[10px] text-muted-foreground">{item.enName}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-amber-500/40 bg-amber-500/10 text-[10px] font-bold text-amber-500">
                    {locale === "fa" ? "در انتظار بررسی" : "Pending review"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  <span>
                    {t.exerciseReviewCoachLabel}: <span className="font-bold text-foreground">{item.coach.displayName}</span>
                  </span>
                  <span>
                    {t.exerciseReviewSubmittedAtLabel}: {formatDateTime(item.submittedAt, locale)}
                  </span>
                  <span>
                    {t.exerciseReviewDifficultyLabel}: {DIFFICULTY_LABELS[item.difficulty]?.[locale === "fa" ? "fa" : "en"] ?? item.difficulty}
                  </span>
                  <span dir="auto">{item.category}</span>
                </div>

                {item.description && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground">
                      {locale === "fa" ? "توضیح" : "Description"}
                    </p>
                    <p className="mt-0.5 line-clamp-4 whitespace-pre-line text-[11px] leading-5 text-foreground/90">{item.description}</p>
                  </div>
                )}
                {item.tips && (
                  <div>
                    <p className="text-[10px] font-bold text-muted-foreground">
                      {locale === "fa" ? "نکات" : "Tips"}
                    </p>
                    <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-[11px] leading-5 text-muted-foreground">{item.tips}</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {item.primaryMuscles.map((m) => (
                    <span key={`p-${m}`} className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary">
                      {m}
                    </span>
                  ))}
                  {item.secondaryMuscles.map((m) => (
                    <span key={`s-${m}`} className="rounded-full border border-border/50 bg-secondary/30 px-2 py-0.5 text-[9px] text-muted-foreground">
                      {m}
                    </span>
                  ))}
                  {item.equipment.map((e) => (
                    <span key={`e-${e}`} className="rounded-full border border-border/50 bg-secondary/30 px-2 py-0.5 text-[9px] text-muted-foreground">
                      {e}
                    </span>
                  ))}
                </div>

                {/* رسانههای پیوست — پیش‌نمایش فقط برای رکورد در انتظار */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground">{t.exerciseReviewMediaLabel}</p>
                  {item.media.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/70">{t.exerciseReviewMediaNone}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {item.media.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2 py-1 text-[10px]"
                        >
                          {m.kind === "video" ? (
                            <Film className="size-3 text-primary" aria-hidden="true" />
                          ) : (
                            <ImageIcon className="size-3 text-primary" aria-hidden="true" />
                          )}
                          {m.kind === "video" ? (
                            <button
                              type="button"
                              className="max-w-32 truncate font-bold text-foreground hover:text-primary"
                              onClick={() => setVideoOpen(true)}
                            >
                              <Play className="me-0.5 inline size-3" aria-hidden="true" />
                              {m.fileName}
                            </button>
                          ) : (
                            <a
                              href={mediaUrlFor(item, m.id)}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="max-w-32 truncate font-bold text-foreground hover:text-primary"
                            >
                              {m.fileName}
                            </a>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[9px] leading-4 text-muted-foreground/60">{t.exerciseReviewNoEditNote}</p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                    variant="outline"
                    disabled={acting !== null}
                    onClick={() => setApproveTarget(item)}
                  >
                    {acting === item.id ? <Loader2 className="me-1 size-3.5 animate-spin" aria-hidden="true" /> : null}
                    {t.exerciseReviewApprove}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                    disabled={acting !== null}
                    onClick={() => {
                      setFeedback("");
                      setRejectTarget(item);
                    }}
                  >
                    {t.exerciseReviewReject}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* تأیید انتشار */}
      <AlertDialog open={approveTarget !== null} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent dir={locale === "fa" ? "rtl" : "ltr"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.exerciseReviewApproveConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{t.exerciseReviewApproveConfirmDesc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{locale === "fa" ? "انصراف" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-500/90 text-white hover:bg-emerald-500"
              onClick={() => void doApprove()}
              disabled={acting !== null}
            >
              {t.exerciseReviewApprove}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* رد با دلیل الزامی (D8) */}
      <Dialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setFeedback("");
          }
        }}
      >
        <DialogContent dir={locale === "fa" ? "rtl" : "ltr"} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.exerciseReviewRejectConfirmTitle}</DialogTitle>
            <DialogDescription className="text-[11px] leading-5">
              {rejectTarget ? (locale === "fa" ? rejectTarget.faName : rejectTarget.enName) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ex-review-feedback" className="text-[11px] font-bold text-foreground">
              {t.exerciseReviewFeedbackLabel}
            </Label>
            <Textarea
              id="ex-review-feedback"
              dir={locale === "fa" ? "rtl" : "ltr"}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value.slice(0, 1000))}
              rows={3}
              maxLength={1000}
              placeholder={t.exerciseReviewFeedbackPlaceholder}
              className="resize-none text-xs"
            />
            <p className="text-[9px] leading-4 text-muted-foreground/70">{t.exerciseReviewFeedbackRequiredNote}</p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setRejectTarget(null)}>
                {locale === "fa" ? "انصراف" : "Cancel"}
              </Button>
              <Button
                size="sm"
                className="bg-rose-500/90 text-white hover:bg-rose-500"
                disabled={feedback.trim().length === 0 || acting !== null}
                onClick={() => void doReject()}
              >
                {acting === rejectTarget?.id ? <Loader2 className="me-1 size-3.5 animate-spin" aria-hidden="true" /> : null}
                {t.exerciseReviewReject}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* پلیر پیش‌نمایش رسانه — استریم مخصوص بازبینی (فقط رکورد در انتظار) */}
      {rejectTarget === null && approveTarget === null && items !== null && items.length > 0 && (
        <ExerciseVideoPlayerDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          title=""
          source={{ type: "ready", media: items.flatMap((i) => i.media) as ExerciseMediaItem[] }}
          mediaUrlFor={(m) => {
            const owner = items.find((i) => i.media.some((x) => x.id === m.id));
            return owner ? mediaUrlFor(owner, m.id) : "#";
          }}
        />
      )}
    </div>
  );
}
