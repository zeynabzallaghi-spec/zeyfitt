"use client";

/**
 * دیالوگ انتخاب حرکت از بانک واقعی مرحله ۵ — هم برای «افزودن حرکت به جلسه
 * باز» و هم برای «شروع تمرین آزاد». جست‌وجو همان موتور بانک حرکات است و
 * فقط حرکات واقعی انتخاب‌پذیرند؛ هیچ حرکت ساختگی‌ای وجود ندارد.
 */

import { useMemo, useState } from "react";
import { Plus, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import {
  filterExercises,
  EMPTY_FILTER,
  EXERCISE_COUNT,
  hasCoach3dAnimation,
} from "@/lib/exercises";
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
  const locale = useLocale();
  const dir = useDir();
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);

  const dialogTitle = title ?? t.addFromLibrary;
  const dialogDescription = description ?? t.addExerciseDescription;

  const results = useMemo(
    () =>
      filterExercises({
        ...EMPTY_FILTER,
        query,
      }).slice(0, 60),
    [query]
  );

  const remaining = SESSION_EXERCISES_MAX - currentCount;

  const pick = (exerciseId: string) => {
    if (remaining <= 0) return;
    setPickedId(exerciseId);
    void onPick(exerciseId).then((ok) => {
      if (ok) setPickedId(null);
      else setPickedId(null);
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

        <div className="relative">
          <Search
            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder(EXERCISE_COUNT)}
            className="pe-9 text-xs"
            aria-label={t.searchAria}
          />
        </div>

        <ScrollArea className="h-72 rounded-xl border border-border/50">
          {results.length === 0 ? (
            <p className="p-6 text-center text-[11px] leading-6 text-muted-foreground">
              {t.noResults}
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {results.map((ex) => (
                <li key={ex.id} className="flex items-center gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-foreground">
                      {locale === "fa" ? ex.fa : ex.en}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[9px] text-muted-foreground">
                      <span dir="ltr">{ex.en}</span>
                      <span>{t.categoryName(ex.category)}</span>
                      <span>{t.difficultyName(ex.difficulty)}</span>
                      {hasCoach3dAnimation(ex) && (
                        <span className="font-bold text-primary">{t.has3d}</span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={remaining <= 0}
                    onClick={() => pick(ex.id)}
                    className={cn(
                      "h-7 shrink-0 px-2 text-[10px] font-bold",
                      pickedId === ex.id
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/70 hover:border-primary/40 hover:text-primary"
                    )}
                    aria-label={t.addToSessionAria(locale === "fa" ? ex.fa : ex.en)}
                  >
                    {pickedId === ex.id ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Plus className="size-3.5" aria-hidden="true" />
                    )}
                    {t.addAction}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
