"use client";

/**
 * رکوردر جلسه در حال انجام — قلب ثبت تمرین واقعی.
 *
 * اصول ثابت این کامپوننت:
 *  - هر ست فقط با اقدام کاربر ثبت می‌شود؛ هیچ مقدار هدفی برنامه جای مقدار
 *    واقعی را پر نمی‌کند و بازدید از صفحه هرگز ست نمی‌سازد.
 *  - ذخیره‌سازی «فقط» در پایگاه داده سرور است؛ هیچ‌گاه localStorage منبع
 *    حقیقت نیست. پس از رفرش یا بستن مرورگر، جلسه از سرور بازیابی می‌شود.
 *  - ذخیره خودکار با تأخیر کوتاه (debounce) برای جلوگیری از ارسال پیاپی؛
 *    وضعیت ذخیره همیشه صادقانه نمایش داده می‌شود («در حال ذخیره»، «ذخیره شد»،
 *    «خطا + تلاش مجدد») و تا پاسخ موفق سرور، موفقیت اعلام نمی‌شود.
 *  - ثبت هر ست روی سرور upsert بر اساس (حرکت، شماره ست) است؛ پس ارسال
 *    هم‌زمان یا تکراری رکورد تکراری نمی‌سازد و نوشتن‌ها یکدیگر را بازنویسی
 *    منطقی می‌کنند (آخرین مقدار واقعی کاربر می‌ماند).
 *  - پس از پایان یا رهاکردن، سرور جلسه را قفل می‌کند و ست‌ها دیگر قابل
 *    تغییر نیستند (409) — UI هم اجازه ویرایش نمی‌دهد.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  CircleCheck,
  CircleAlert,
  CircleOff,
  CloudUpload,
  Flame,
  Plus,
  RotateCcw,
  Timer,
  Trash2,
  TriangleAlert,
  X,
  ListPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import { useAppStore } from "@/store/app-store";
import { openBankExerciseIn3d, useCoach3DStore } from "@/store/coach3d-store";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import { localeNumber, localeFullLabel } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";
import {
  useExerciseLibraryStore,
  ensureExerciseIndex,
} from "@/store/exercise-library-store";
import type { SessionExerciseClient, WorkoutSessionClient } from "@/lib/workout-session/types";
import type { UseActiveSessionResult } from "@/hooks/use-workout-sessions";
import { computeSessionSummary } from "@/lib/workout-session/stats";
import { AddExerciseDialog } from "./add-exercise-dialog";

type SaveState = "idle" | "saving" | "saved" | "error";

/** یک ویرایش در انتظار ذخیره */
interface PendingEdit {
  sessionExerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
}

interface EditValue {
  reps: string;
  weight: string;
}

const setKey = (sessionExerciseId: string, setNumber: number) =>
  `${sessionExerciseId}:${setNumber}`;

/** تجزیه عدد با پذیرش ارقام فارسی و جداکننده اعشار فارسی */
function parseNum(raw: string): number | null {
  const cleaned = raw.trim().replace(/[٫,]/g, ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------ برچسب وضعیت ذخیره ------------------------------ */

function SaveStatusChip({
  state,
  message,
  onRetry,
}: {
  state: SaveState;
  message: string | null;
  onRetry: () => void;
}) {
  const t = useStrings(workoutStrings);
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-border/50 bg-secondary/40 px-2 py-1 text-[10px] font-bold text-muted-foreground">
        <CloudUpload className="size-3 animate-pulse" aria-hidden="true" />
        {t.saving}
      </span>
    );
  }
  if (state === "saved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
        <CircleCheck className="size-3" aria-hidden="true" />
        {t.savedToServer}
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1 text-[10px] font-bold text-rose-300">
        <CircleAlert className="size-3" aria-hidden="true" />
        <span className="max-w-40 truncate">{message ?? t.notSaved}</span>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded border border-destructive/40 px-1.5 py-0.5 hover:bg-destructive/20"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          {t.retry}
        </button>
      </span>
    );
  }
  return null;
}

/* ------------------------------ ردیف یک ست ------------------------------ */

function SetRow({
  sessionExerciseId,
  setNumber,
  reps,
  weightKg,
  weightHidden,
  editValue,
  onEditChange,
  onQueue,
  onCommitNow,
  onDelete,
  deleting,
  disabled,
}: {
  sessionExerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number | null;
  /** حرکت وزن بدن — ورودی وزنه لازم نیست و نمایش داده نمی‌شود */
  weightHidden: boolean;
  editValue: EditValue | undefined;
  onEditChange: (key: string, value: EditValue | null) => void;
  /** ذخیره خودکار با debounce — فقط با مقدار معتبر */
  onQueue: (payload: PendingEdit) => void;
  /** ثبت فوری (blur یا Enter) — با اعتبارسنجی و پیام خطا */
  onCommitNow: (
    payload: PendingEdit,
    key: string
  ) => boolean;
  onDelete: () => void;
  deleting: boolean;
  disabled: boolean;
}) {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  const key = setKey(sessionExerciseId, setNumber);
  const repsText = editValue?.reps ?? String(reps);
  const weightText = editValue?.weight ?? (weightKg === null ? "" : String(weightKg));

  const update = (part: "reps" | "weight", raw: string) => {
    const next: EditValue = { reps: repsText, weight: weightText, [part]: raw };
    onEditChange(key, next);
    // ذخیره خودکار — فقط اگر تکرار معتبر باشد؛ وزنه نامعتبر هنوز نهایی نشده
    const repsNum = parseNum(next.reps);
    if (repsNum !== null && repsNum >= 1) {
      let weight: number | null = null;
      if (!weightHidden) {
        const wRaw = next.weight.trim();
        if (wRaw !== "") {
          const w = parseNum(wRaw);
          if (w !== null && w >= 0) weight = w;
        }
      }
      onQueue({
        sessionExerciseId,
        setNumber,
        reps: Math.round(repsNum),
        weightKg: weight,
      });
    }
  };

  const commitNow = (): boolean => {
    if (disabled) return false;
    const repsNum = parseNum(repsText);
    if (repsNum === null || repsNum < 1) {
      toast.error(t.repsInvalidSet(setNumber));
      return false;
    }
    let weight: number | null = null;
    if (!weightHidden) {
      const raw = weightText.trim();
      if (raw !== "") {
        const w = parseNum(raw);
        if (w === null || w < 0 || w > 500) {
          toast.error(t.weightRangeSet(setNumber));
          return false;
        }
        weight = w;
      }
    }
    const ok = onCommitNow(
      { sessionExerciseId, setNumber, reps: Math.round(repsNum), weightKg: weight },
      key
    );
    if (ok) onEditChange(key, null);
    return ok;
  };

  const dirty =
    editValue !== undefined &&
    (editValue.reps !== String(reps) ||
      editValue.weight !== (weightKg === null ? "" : String(weightKg)));

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-border/50 bg-background/40 p-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-[10px] font-extrabold text-foreground/85">
        {localeNumber(setNumber, locale)}
      </span>
      <label className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="shrink-0 text-[10px] font-medium text-muted-foreground">{t.repsLabel}</span>
        <Input
          dir="ltr"
          inputMode="numeric"
          value={repsText}
          disabled={disabled}
          onChange={(e) => update("reps", e.target.value)}
          onBlur={commitNow}
          onKeyDown={(e) => e.key === "Enter" && commitNow()}
          className="h-8 w-full min-w-14 text-center text-xs"
          aria-label={t.setRepsAria(setNumber)}
        />
      </label>
      {!weightHidden ? (
        <label className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
            {t.kilograms}
          </span>
          <Input
            dir="ltr"
            inputMode="decimal"
            placeholder="—"
            value={weightText}
            disabled={disabled}
            onChange={(e) => update("weight", e.target.value)}
            onBlur={commitNow}
            onKeyDown={(e) => e.key === "Enter" && commitNow()}
            className="h-8 w-full min-w-14 text-center text-xs"
            aria-label={t.setWeightAria(setNumber)}
          />
        </label>
      ) : (
        <span className="min-w-14 text-[10px] leading-5 text-muted-foreground/70">{t.bodyweightLabel}</span>
      )}
      {dirty && <span className="text-[9px] font-bold text-amber-300/90">{t.unsavedMark}</span>}
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || deleting}
        onClick={onDelete}
        className="h-8 shrink-0 border-destructive/30 px-2 text-rose-300 hover:bg-destructive/10"
        aria-label={t.deleteSetAria(setNumber)}
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </Button>
    </li>
  );
}

/* ------------------------------ کارت حرکت جلسه ------------------------------ */

function SessionExerciseCard({
  ex,
  sessionId,
  ctrl,
  queueSave,
  commitNow,
}: {
  ex: SessionExerciseClient;
  sessionId: string;
  ctrl: UseActiveSessionResult;
  queueSave: (payload: PendingEdit) => void;
  commitNow: (payload: PendingEdit, key: string) => boolean;
}) {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  const dir = useDir();
  const [edits, setEdits] = useState<Record<string, EditValue>>({});
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftReps, setDraftReps] = useState("");
  const [draftWeight, setDraftWeight] = useState("");

  const openLibraryExercise = useAppStore((s) => s.openLibraryExercise);
  const setScene = useCoach3DStore((s) => s.setScene);
  const setActiveView = useAppStore((s) => s.setActiveView);

  // بانک زنده سرور (مرحله ۱۸) — ۳بعدی فقط با تأیید has3d بانک؛ snapshot
  // به‌تنهایی مجوز نمایش انیمیشن نمی‌دهد. قاعده وزن بدن هم از همان داده.
  useEffect(() => {
    ensureExerciseIndex();
  }, []);
  const getBankExercise = useExerciseLibraryStore((s) => s.getById);
  const bankStatus = useExerciseLibraryStore((s) => s.status);
  const live = getBankExercise(ex.exerciseId);
  const has3d = bankStatus === "ready" && Boolean(live?.has3d);
  // حرکاتی که بانک آن‌ها فقط وزن بدن است — ورودی وزنه ندارند (قاعده وزن بدن)
  const bodyweightOnly = Boolean(
    live && live.equipment.length > 0 && live.equipment.every((e) => e === "bodyweight")
  );

  const nextSetNumber =
    ex.sets.length > 0 ? Math.max(...ex.sets.map((s) => s.setNumber)) + 1 : 1;

  const commitDraft = () => {
    const repsNum = parseNum(draftReps);
    if (repsNum === null || repsNum < 1) {
      toast.error(t.newSetRepsInvalid);
      return;
    }
    let weight: number | null = null;
    if (!bodyweightOnly && draftWeight.trim() !== "") {
      const w = parseNum(draftWeight);
      if (w === null || w < 0 || w > 500) {
        toast.error(t.weightRange);
        return;
      }
      weight = w;
    }
    void ctrl
      .upsertSet(sessionId, {
        sessionExerciseId: ex.id,
        setNumber: nextSetNumber,
        reps: Math.round(repsNum),
        weightKg: weight,
      })
      .then((result) => {
        if (result.ok) {
          toast.success(t.setLoggedToast(nextSetNumber, ex.faName));
          setDraftOpen(false);
          setDraftReps("");
          setDraftWeight("");
        } else {
          toast.error(result.message);
        }
      });
  };

  return (
    <li
      className={cn(
        "rounded-2xl border p-4",
        ex.status === "done"
          ? "border-primary/30 bg-primary/5"
          : ex.status === "skipped"
            ? "border-border/40 bg-secondary/10 opacity-75"
            : "border-border/60 bg-card"
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold text-foreground">{ex.faName}</p>
            <span dir="ltr" className="text-[10px] text-muted-foreground/60">
              {ex.enName}
            </span>
            <span className="rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
              {t.categoryName(ex.category)}
            </span>
            {ex.status === "done" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                <CircleCheck className="size-3" aria-hidden="true" />
                {t.doneLabel}
              </span>
            )}
            {ex.status === "skipped" && (
              <span className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-secondary/40 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                <CircleOff className="size-3" aria-hidden="true" />
                {t.skippedLabel}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] leading-5 text-muted-foreground">
            <span>
              {t.musclesLine(
                ex.primaryMuscles.length > 0
                  ? t.joinList(ex.primaryMuscles.map((m) => t.muscleName(m)))
                  : "—"
              )}
            </span>
            {ex.targetSets !== null && (
              <span>
                {t.planTargetSets(ex.targetSets)}
                {ex.targetRepsMin !== null && ex.targetRepsMax !== null
                  ? t.planTargetReps(ex.targetRepsMin, ex.targetRepsMax)
                  : ""}
              </span>
            )}
            {ex.restSeconds !== null && (
              <span className="inline-flex items-center gap-1">
                <Timer className="size-3" aria-hidden="true" />
                {t.suggestedRest(ex.restSeconds)}
              </span>
            )}
            {bodyweightOnly && (
              <span className="inline-flex items-center gap-1">
                <Flame className="size-3" aria-hidden="true" />
                {t.bodyweightNoLoad}
              </span>
            )}
          </div>
          {ex.note && (
            <p className="mt-2 border-t border-border/40 pt-2 text-[10px] leading-5 text-muted-foreground/80">
              {ex.note}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {has3d ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // داده جلسه در سرور ماندگار است؛ بازگشت از مربی، جلسه را دوباره می‌خواند.
                // صحنه از نگاشت زنده بانک حل می‌شود (نگاشت پارامتری یا legacy ۶ حرکته)
                if (!live) return;
                const ok = openBankExerciseIn3d(live, { setScene });
                if (!ok) return;
                setActiveView("coach3d");
              }}
              className="h-7 border-primary/40 bg-primary/10 px-2.5 text-[10px] font-bold text-primary hover:bg-primary/20"
            >
              <Box className="size-3" aria-hidden="true" />
              {t.coach3d}
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md border border-border/40 bg-secondary/20 px-2 py-1.5 text-[9px] text-muted-foreground/70">
              <Box className="size-3" aria-hidden="true" />
              {t.no3d}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => openLibraryExercise(ex.exerciseId)}
            className="h-7 border-border/70 px-2.5 text-[10px] font-semibold hover:border-primary/40 hover:text-primary"
          >
            {t.guide}
          </Button>
          {ex.status !== "done" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void ctrl
                  .setExerciseStatus(sessionId, ex.id, "done")
                  .then((r) => !r.ok && toast.error(r.message))
              }
              className="h-7 border-primary/40 px-2.5 text-[10px] font-bold text-primary hover:bg-primary/15"
            >
              <CircleCheck className="size-3" aria-hidden="true" />
              {t.doneLabel}
            </Button>
          )}
          {ex.status !== "skipped" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void ctrl
                  .setExerciseStatus(sessionId, ex.id, "skipped")
                  .then((r) => !r.ok && toast.error(r.message))
              }
              className="h-7 border-border/70 px-2.5 text-[10px] font-semibold text-muted-foreground hover:border-amber-400/40 hover:text-amber-300"
            >
              <CircleOff className="size-3" aria-hidden="true" />
              {t.skipAction}
            </Button>
          )}
        </div>
      </div>

      {/* ست‌های ثبت‌شده واقعی */}
      <div className="mt-3">
        {ex.sets.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {ex.sets.map((set) => (
              <SetRow
                key={set.id}
                sessionExerciseId={ex.id}
                setNumber={set.setNumber}
                reps={set.reps}
                weightKg={set.weightKg}
                weightHidden={bodyweightOnly}
                editValue={edits[setKey(ex.id, set.setNumber)]}
                onEditChange={(key, value) =>
                  setEdits((prev) => {
                    const next = { ...prev };
                    if (value === null) delete next[key];
                    else next[key] = value;
                    return next;
                  })
                }
                onQueue={queueSave}
                onCommitNow={commitNow}
                onDelete={() => setDeletingSetId(set.id)}
                deleting={deletingSetId === set.id}
                disabled={false}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border/50 bg-secondary/20 px-3 py-2.5 text-center text-[10px] leading-5 text-muted-foreground/80">
            {t.noSetsYet}
          </p>
        )}

        {/* افزودن ست جدید */}
        {draftOpen ? (
          <div className="mt-2 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-primary/40 bg-primary/10 text-[10px] font-extrabold text-primary">
              {localeNumber(nextSetNumber, locale)}
            </span>
            <Input
              dir="ltr"
              inputMode="numeric"
              placeholder={t.repsPlaceholder}
              value={draftReps}
              autoFocus
              onChange={(e) => setDraftReps(e.target.value)}
              className="h-8 min-w-16 flex-1 text-center text-xs"
              aria-label={t.newSetRepsAria}
            />
            {!bodyweightOnly && (
              <Input
                dir="ltr"
                inputMode="decimal"
                placeholder={t.optionalWeightPlaceholder(t.kilograms)}
                value={draftWeight}
                onChange={(e) => setDraftWeight(e.target.value)}
                className="h-8 min-w-20 flex-1 text-center text-xs"
                aria-label={t.newSetWeightAria}
              />
            )}
            <Button
              size="sm"
              className="h-8 bg-primary/15 px-3 text-[10px] font-bold text-primary hover:bg-primary/25"
              onClick={commitDraft}
            >
              {t.logSet}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-[10px] text-muted-foreground"
              onClick={() => {
                setDraftOpen(false);
                setDraftReps("");
                setDraftWeight("");
              }}
            >
              <X className="size-3.5" aria-hidden="true" />
              {t.cancel}
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDraftOpen(true)}
            className="mt-2 h-8 w-full border-dashed border-border/60 text-[10px] font-bold hover:border-primary/40 hover:text-primary"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t.addSet(ex.sets.length > 0 ? localeNumber(nextSetNumber, locale) : "")}
          </Button>
        )}
      </div>

      {/* تأیید حذف ست */}
      <AlertDialog
        open={deletingSetId !== null}
        onOpenChange={(open) => !open && setDeletingSetId(null)}
      >
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">{t.deleteSetDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-7">
              {t.deleteSetDialogDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingSetId) {
                  void ctrl
                    .deleteSet(sessionId, deletingSetId)
                    .then((r) => !r.ok && toast.error(r.message));
                }
                setDeletingSetId(null);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {t.deleteSetAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

/* ------------------------------ رکوردر اصلی ------------------------------ */

const AUTO_SAVE_DELAY_MS = 800;

export function ActiveSessionRecorder({ ctrl }: { ctrl: UseActiveSessionResult }) {
  const t = useStrings(workoutStrings);
  const locale = useLocale();
  const dir = useDir();
  const session = ctrl.session;
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [finishAction, setFinishAction] = useState<"complete" | "abandon">("complete");
  const [finishNotes, setFinishNotes] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  /** صف ویرایش‌های در انتظار ذخیره + گارد درخواست هم‌زمان */
  const pendingRef = useRef<Map<string, PendingEdit>>(new Map());
  const flushingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ساعت زنده برای مدت جلسه — از زمان واقعی شروع ثبت‌شده در سرور
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  /** تخلیه صف — ورودهای ناموفق در صف می‌مانند تا با «تلاش مجدد» ارسال شوند */
  const flush = useCallback(async () => {
    if (flushingRef.current || !session) return;
    flushingRef.current = true;
    setSaveState("saving");
    try {
      let allOk = true;
      let lastMessage: string | null = null;
      while (pendingRef.current.size > 0) {
        const batch = Array.from(pendingRef.current.entries());
        for (const [key, payload] of batch) {
          const result = await ctrl.upsertSet(session.id, payload);
          if (result.ok) {
            pendingRef.current.delete(key);
          } else {
            allOk = false;
            lastMessage = result.message;
            break;
          }
        }
      }
      if (allOk) {
        setSaveState("saved");
        setSaveError(null);
      } else {
        setSaveState("error");
        setSaveError(lastMessage);
      }
    } finally {
      flushingRef.current = false;
    }
  }, [ctrl, session]);

  const scheduleSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), AUTO_SAVE_DELAY_MS);
  }, [flush]);

  const retrySave = useCallback(() => {
    if (pendingRef.current.size === 0) {
      setSaveState("idle");
      setSaveError(null);
      return;
    }
    void flush();
  }, [flush]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  /** ذخیره خودکار — ورود به صف و زمان‌بندی ارسال */
  const queueSave = useCallback(
    (payload: PendingEdit) => {
      if (!session) return;
      pendingRef.current.set(setKey(payload.sessionExerciseId, payload.setNumber), payload);
      scheduleSave();
    },
    [session, scheduleSave]
  );

  /** ثبت فوری — ورود به صف و ارسال بلافاصله؛ true یعنی معتبر و ارسال شد */
  const commitNow = useCallback(
    (payload: PendingEdit, key: string): boolean => {
      if (!session) return false;
      pendingRef.current.set(key, payload);
      void flush();
      return true;
    },
    [session, flush]
  );

  const summary = useMemo(
    () => (session ? computeSessionSummary(toSummaryInput(session)) : null),
    [session]
  );

  const elapsedMinutes = session
    ? Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 60000))
    : 0;

  if (!session) return null;

  if (session.status !== "in_progress") {
    // جلسه بسته‌شده — هیچ ویرایشی ممکن نیست؛ پیام صادقانه
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
        <CircleCheck className="mx-auto size-6 text-primary" aria-hidden="true" />
        <p className="mt-3 text-sm font-bold">{t.sessionClosedTitle(session.title)}</p>
        <p className="mt-1 text-[11px] leading-6 text-muted-foreground">
          {t.closedStatusLine(
            session.status === "completed" ? t.statusLabel("completed") : t.statusLabel("abandoned")
          )}
        </p>
      </div>
    );
  }

  const openFinish = (action: "complete" | "abandon") => {
    setFinishAction(action);
    setFinishNotes("");
    setFinishOpen(true);
  };

  const confirmFinish = async () => {
    setFinishing(true);
    const result = await ctrl.finishSession(session.id, {
      action: finishAction,
      notes: finishNotes.trim() !== "" ? finishNotes.trim() : null,
    });
    setFinishing(false);
    if (result.ok) {
      setFinishOpen(false);
      if (finishAction === "complete") {
        toast.success(t.workoutCompleteToast);
      } else {
        toast.info(t.abandonedToast);
      }
      await ctrl.refresh();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <section aria-label={t.recorderAria} className="flex flex-col gap-4">
      {/* هدر جلسه */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="relative flex size-2.5 shrink-0" aria-hidden="true">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
          </span>
          <h3 className="text-sm font-bold">{t.recorderHeading(session.title)}</h3>
          <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
            {t.statusLabel("in_progress")}
          </span>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <SaveStatusChip state={saveState} message={saveError} onRetry={retrySave} />
            <Button
              size="sm"
              onClick={() => openFinish("complete")}
              className="h-8 bg-primary/15 px-3 text-[10px] font-bold text-primary hover:bg-primary/25"
            >
              <CircleCheck className="size-3.5" aria-hidden="true" />
              {t.finishWorkout}
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] leading-5 text-muted-foreground">
          <span>{t.startedAtLine(localeFullLabel(session.startedAt, locale))}</span>
          <span className="inline-flex items-center gap-1">
            <Timer className="size-3" aria-hidden="true" />
            {t.elapsedLine(elapsedMinutes)}
          </span>
          {summary && (
            <span>
              {t.progressLine(summary.exercisesDone, summary.exercisesTotal, summary.setsCompleted)}
            </span>
          )}
        </div>
        <p className="mt-2 text-[10px] leading-5 text-muted-foreground/70">
          {t.persistedNote}
        </p>
      </div>

      {/* خطای ذخیره — بنر صادقانه */}
      {saveState === "error" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-[11px] leading-6 text-rose-200">
          <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
          {t.saveErrorBanner}
        </div>
      )}

      {/* حرکات جلسه */}
      <ul className="flex flex-col gap-3">
        {session.exercises.map((ex) => (
          <SessionExerciseCard
            key={ex.id}
            ex={ex}
            sessionId={session.id}
            ctrl={ctrl}
            queueSave={queueSave}
            commitNow={commitNow}
          />
        ))}
      </ul>

      {/* افزودن حرکت به جلسه باز */}
      <Button
        variant="outline"
        onClick={() => setAddDialogOpen(true)}
        className="border-dashed border-border/60 font-semibold hover:border-primary/40 hover:text-primary"
      >
        <ListPlus className="size-4" aria-hidden="true" />
        {t.addFromLibrary}
      </Button>

      {/* رهاکردن جلسه */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/50 bg-secondary/20 p-3">
        <p className="text-[10px] leading-5 text-muted-foreground">
          {t.abandonHint}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => openFinish("abandon")}
          className="h-8 shrink-0 border-border/70 px-3 text-[10px] font-semibold text-muted-foreground hover:border-rose-400/40 hover:text-rose-300"
        >
          <X className="size-3.5" aria-hidden="true" />
          {t.abandonAction}
        </Button>
      </div>

      {/* دیالوگ پایان جلسه با خلاصه صادقانه */}
      <AlertDialog
        open={finishOpen}
        onOpenChange={(open) => !open && !finishing && setFinishOpen(false)}
      >
        <AlertDialogContent dir={dir} className="max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-start">
              {finishAction === "complete" ? t.finishCompleteTitle : t.abandonAction}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-start leading-7">
              {finishAction === "complete" ? t.finishCompleteDesc : t.finishAbandonDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {summary && (
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-3 text-[11px] leading-6">
              <p className="font-bold text-foreground">{t.summaryTitle}</p>
              <ul className="mt-1.5 space-y-0.5 text-muted-foreground">
                <li>
                  {t.summaryExercisesLine(summary.exercisesDone, summary.exercisesTotal)}
                  {summary.exercisesSkipped > 0
                    ? t.summarySkippedSuffix(summary.exercisesSkipped)
                    : ""}
                </li>
                <li>{t.summarySetsLine(summary.setsCompleted)}</li>
                <li>{t.summaryRepsLine(summary.repsTotal)}</li>
                <li>{t.summaryDurationLine(elapsedMinutes)}</li>
                {summary.volumeKg > 0 && (
                  <li>{t.summaryVolumeLine(summary.volumeKg)}</li>
                )}
              </ul>
              {summary.exercisesDone < summary.exercisesTotal && (
                <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-5 text-amber-300/90">
                  <TriangleAlert className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                  {t.unloggedWarning(summary.exercisesTotal - summary.exercisesDone)}
                </p>
              )}
            </div>
          )}

          <Textarea
            placeholder={t.finishNotesPlaceholder}
            value={finishNotes}
            onChange={(e) => setFinishNotes(e.target.value)}
            maxLength={500}
            className="min-h-16 text-xs"
            aria-label={t.finishNotesAria}
          />

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={finishing}>{t.backToSession}</AlertDialogCancel>
            <AlertDialogAction
              disabled={finishing}
              onClick={(e) => {
                e.preventDefault();
                void confirmFinish();
              }}
              className={cn(
                finishAction === "complete"
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-destructive text-white hover:bg-destructive/90"
              )}
            >
              {finishing
                ? t.recording
                : finishAction === "complete"
                  ? t.completeAction
                  : t.abandonConfirmAction}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* افزودن حرکت از بانک */}
      <AddExerciseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        currentCount={session.exercises.length}
        onPick={(exerciseId) =>
          ctrl.addExercise(session.id, exerciseId).then((r) => {
            if (r.ok) {
              toast.success(t.exerciseAddedToast);
              return true;
            }
            toast.error(r.message);
            return false;
          })
        }
      />
    </section>
  );
}

/** تبدیل جلسه کلاینت به ورودی خالص خلاصه‌ساز آمار */
function toSummaryInput(session: WorkoutSessionClient) {
  return {
    id: session.id,
    title: session.title,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    exercises: session.exercises.map((ex) => ({
      status: ex.status,
      sets: ex.sets.map((s) => ({ reps: s.reps, weightKg: s.weightKg })),
    })),
  };
}
