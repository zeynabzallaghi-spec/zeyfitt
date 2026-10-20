"use client";

/**
 * شروع تمرین آزاد — انتخاب حداقل یک حرکت واقعی از بانک عمومی کامل (مرحله ۱۸)
 * و ارسال صریح «شروع تمرین» به سرور. تمرین آزاد تجویز برنامه ندارد و UI هیچ
 * مقدار هدفی برای آن جعل نمی‌کند؛ ست‌ها همان‌طور که واقعاً انجام شد ثبت می‌شوند.
 */

import { useState } from "react";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import { ExercisePicker } from "@/components/fitness/shared/exercise-picker";
import { useExerciseLibraryStore } from "@/store/exercise-library-store";
import { SESSION_EXERCISES_MAX } from "@/lib/workout-session/types";

export function StartFreeWorkoutDialog({
  open,
  onOpenChange,
  starting,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  starting: boolean;
  /** ارسال شروع جلسه — پاسخ موفق دیالوگ را می‌بندد */
  onStart: (exerciseIds: string[]) => Promise<boolean>;
}) {
  const t = useStrings(workoutStrings);
  const dir = useDir();
  const total = useExerciseLibraryStore((s) => s.total);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [localError, setLocalError] = useState<string | null>(null);

  const toggle = (id: string) => {
    setLocalError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < SESSION_EXERCISES_MAX) {
        next.add(id);
      }
      return next;
    });
  };

  const start = async () => {
    if (selected.size === 0) {
      setLocalError(t.minOneError);
      return;
    }
    const ok = await onStart(Array.from(selected));
    if (ok) {
      setSelected(new Set());
      setLocalError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-h-[85vh] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">{t.startFreeTitle}</DialogTitle>
          <DialogDescription className="text-start leading-6">
            {t.startFreeDescription(total, SESSION_EXERCISES_MAX)}
          </DialogDescription>
        </DialogHeader>

        <ExercisePicker selectedIds={selected} onToggle={toggle} heightClass="h-64" />

        {localError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[10px] font-bold text-rose-300">
            {localError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            {t.selectedCount(selected.size)}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 text-[10px] font-semibold text-muted-foreground"
            >
              {t.cancel}
            </Button>
            <Button
              disabled={starting || selected.size === 0}
              onClick={() => void start()}
              className="h-8 bg-primary/15 px-4 text-[10px] font-bold text-primary hover:bg-primary/25"
            >
              <Play className="size-3.5" aria-hidden="true" />
              {starting ? t.starting : t.startFreeTitle}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
