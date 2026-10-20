"use client";

/**
 * دیالوگ انتخاب حرکت از بانک عمومی کامل مرحله ۱۸ — برای «افزودن حرکت به جلسه
 * باز» و «شروع تمرین آزاد». داده از کش کلاینت بانک کامل (API) می‌آید و
 * فقط حرکات واقعی انتخاب‌پذیرند؛ هیچ حرکت ساختگی‌ای وجود ندارد.
 */

import { useState } from "react";
import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import { ExercisePicker } from "@/components/fitness/shared/exercise-picker";
import { SESSION_EXERCISES_MAX } from "@/lib/workout-session/types";

export function AddExerciseDialog({
  open,
  onOpenChange,
  currentCount,
  onPick,
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** تعداد حرکت فعلی جلسه — برای سقف ۲۰ حرکت */
  currentCount: number;
  /** بازگشت true یعنی افزودن موفق و دیالوگ ردیف را علامت می‌زند */
  onPick: (exerciseId: string) => Promise<boolean>;
  title?: string;
  description?: string;
}) {
  const t = useStrings(workoutStrings);
  const dir = useDir();
  const [pickedId, setPickedId] = useState<string | null>(null);

  const dialogTitle = title ?? t.addFromLibrary;
  const dialogDescription = description ?? t.addExerciseDescription;

  const remaining = SESSION_EXERCISES_MAX - currentCount;

  const pick = (exerciseId: string) => {
    if (remaining <= 0) return;
    setPickedId(exerciseId);
    void onPick(exerciseId).then(() => {
      setPickedId(null);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={dir} className="max-h-[85vh] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">{dialogTitle}</DialogTitle>
          <DialogDescription className="text-start leading-6">
            {dialogDescription} {t.capacityLine(Math.max(remaining, 0), SESSION_EXERCISES_MAX)}
          </DialogDescription>
        </DialogHeader>

        <ExercisePicker onPick={pick} pickedId={pickedId} disabled={remaining <= 0} />
      </DialogContent>
    </Dialog>
  );
}
