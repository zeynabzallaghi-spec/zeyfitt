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
import { faDigits } from "@/lib/profile";
import {
  categoryFa,
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
  title = "افزودن حرکت از کتابخانه",
  description = "فقط حرکات واقعی بانک حرکات قابل انتخاب هستند؛ انتخاب‌ها مستقیماً به جلسه باز شما اضافه می‌شوند.",
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
  const [query, setQuery] = useState("");
  const [pickedId, setPickedId] = useState<string | null>(null);

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
      <DialogContent dir="rtl" className="max-h-[85vh] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">{title}</DialogTitle>
          <DialogDescription className="text-start leading-6">
            {description} ظرفیت باقی‌مانده: {faDigits(Math.max(remaining, 0))} از حداکثر{" "}
            {faDigits(SESSION_EXERCISES_MAX)} حرکت جلسه.
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
            placeholder={`جست‌وجو در ${faDigits(EXERCISE_COUNT)} حرکت — فارسی یا انگلیسی`}
            className="pe-9 text-xs"
            aria-label="جست‌وجوی حرکت"
          />
        </div>

        <ScrollArea className="h-72 rounded-xl border border-border/50">
          {results.length === 0 ? (
            <p className="p-6 text-center text-[11px] leading-6 text-muted-foreground">
              حرکتی با این جست‌وجو یافت نشد.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {results.map((ex) => (
                <li key={ex.id} className="flex items-center gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-foreground">{ex.fa}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[9px] text-muted-foreground">
                      <span dir="ltr">{ex.en}</span>
                      <span>{categoryFa(ex.category)}</span>
                      <span>{ex.difficulty}</span>
                      {hasCoach3dAnimation(ex) && (
                        <span className="font-bold text-primary">سه‌بعدی دارد</span>
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
                    aria-label={`افزودن ${ex.fa} به جلسه`}
                  >
                    {pickedId === ex.id ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Plus className="size-3.5" aria-hidden="true" />
                    )}
                    افزودن
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
