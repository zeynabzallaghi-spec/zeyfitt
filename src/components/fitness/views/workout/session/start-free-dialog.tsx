"use client";

/**
 * شروع تمرین آزاد — انتخاب حداقل یک حرکت واقعی از بانک مرحله ۵ و ارسال
 * صریح «شروع تمرین» به سرور. تمرین آزاد تجویز برنامه ندارد و UI هیچ مقدار
 * هدفی برای آن جعل نمی‌کند؛ ست‌ها همان‌طور که واقعاً انجام شد ثبت می‌شوند.
 */

import { useMemo, useState } from "react";
import { Play, Search, X } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [localError, setLocalError] = useState<string | null>(null);

  const results = useMemo(
    () => filterExercises({ ...EMPTY_FILTER, query }).slice(0, 60),
    [query]
  );

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
      setLocalError("برای شروع تمرین آزاد حداقل یک حرکت انتخاب کنید.");
      return;
    }
    const ok = await onStart(Array.from(selected));
    if (ok) {
      setSelected(new Set());
      setQuery("");
      setLocalError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[85vh] md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">شروع تمرین آزاد</DialogTitle>
          <DialogDescription className="text-start leading-6">
            حرکات را از بانک {faDigits(EXERCISE_COUNT)} حرکتی واقعی انتخاب کنید (حداقل یک
            حرکت، حداکثر {faDigits(SESSION_EXERCISES_MAX)}). جلسه فقط با کلیک شما ساخته می‌شود
            و بلافاصله در سرور ثبت می‌گردد.
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
            placeholder="جست‌وجو — فارسی یا انگلیسی"
            className="pe-9 text-xs"
            aria-label="جست‌وجوی حرکت برای تمرین آزاد"
          />
        </div>

        <ScrollArea className="h-64 rounded-xl border border-border/50">
          {results.length === 0 ? (
            <p className="p-6 text-center text-[11px] leading-6 text-muted-foreground">
              حرکتی با این جست‌وجو یافت نشد.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {results.map((ex) => {
                const isPicked = selected.has(ex.id);
                return (
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
                      onClick={() => toggle(ex.id)}
                      className={cn(
                        "h-7 shrink-0 px-2.5 text-[10px] font-bold",
                        isPicked
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/70 hover:border-primary/40 hover:text-primary"
                      )}
                      aria-label={`${isPicked ? "حذف" : "انتخاب"} ${ex.fa}`}
                    >
                      {isPicked ? (
                        <>
                          <X className="size-3" aria-hidden="true" />
                          حذف
                        </>
                      ) : (
                        <>
                          <Play className="size-3" aria-hidden="true" />
                          انتخاب
                        </>
                      )}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {localError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[10px] font-bold text-rose-300">
            {localError}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] text-muted-foreground">
            {faDigits(selected.size)} حرکت انتخاب شده
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="h-8 px-3 text-[10px] font-semibold text-muted-foreground"
            >
              انصراف
            </Button>
            <Button
              disabled={starting || selected.size === 0}
              onClick={() => void start()}
              className="h-8 bg-primary/15 px-4 text-[10px] font-bold text-primary hover:bg-primary/25"
            >
              <Play className="size-3.5" aria-hidden="true" />
              {starting ? "در حال شروع…" : "شروع تمرین آزاد"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
