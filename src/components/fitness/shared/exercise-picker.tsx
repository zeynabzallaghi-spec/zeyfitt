"use client";

/**
 * انتخابگر حرکت از بانک عمومی کامل (مرحله ۱۸) — مشترک بین جلسه تمرینی،
 * برنامه‌ساز مربی و نمودار پیشرفت.
 *
 * داده از کش کلاینت (exercise-library-store) می‌آید که یک‌بار از API بانک
 * کامل بارگذاری می‌شود — هیچ فهرست ثابت کامپایل‌شده‌ای در کلاینت نیست.
 * جست‌وجوی دو-زبانه (نرمال‌سازی فارسی + نام انگلیسی)، فیلتر دسته اختیاری،
 * نمایش تدریجی (load-more) و حالت‌های loading/error/empty واقعی.
 */

import { useEffect, useMemo, useState } from "react";
import { Check, Play, Plus, RotateCcw, Search, SearchX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import {
  useExerciseLibraryStore,
  ensureExerciseIndex,
} from "@/store/exercise-library-store";
import { filterCards } from "@/lib/exercises/search";
import { EXERCISE_CATEGORIES, type ExerciseCategoryId } from "@/lib/exercises/types";

const PAGE_SIZE = 30;

export function ExercisePicker({
  onPick,
  pickedId = null,
  disabled = false,
  heightClass = "h-72",
  bodyweightOnly = false,
  /** چندانتخابی — با onToggle؛ برای شروع تمرین آزاد */
  selectedIds = null,
  onToggle,
  showAddButton = true,
}: {
  /** بازگشت true یعنی افزودن موفق و نشانگر پاک می‌شود */
  onPick?: (exerciseId: string) => Promise<boolean> | void;
  pickedId?: string | null;
  disabled?: boolean;
  heightClass?: string;
  /** فقط حرکات وزن بدن (کاربرد خاص — پیشفرض همه بانک) */
  bodyweightOnly?: boolean;
  /** حالت چندانتخابی: مجموعه انتخاب‌شده‌ها + تابع تغییر وضعیت */
  selectedIds?: Set<string> | null;
  onToggle?: (id: string) => void;
  /** پنهان‌کردن دکمه کنار هر ردیف (حالت انتخاب صرف) */
  showAddButton?: boolean;
}) {
  const t = useStrings(workoutStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const dir = useDir();

  const status = useExerciseLibraryStore((s) => s.status);
  const items = useExerciseLibraryStore((s) => s.items);
  const error = useExerciseLibraryStore((s) => s.error);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategoryId | "all">("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  // بازنشانی نمایش تدریجی با تغییر جست‌وجو/فیلتر — الگوی رسمی «مشتق در رندر»
  const [prevFilterKey, setPrevFilterKey] = useState("");
  const filterKey = `${query}|${category}`;
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisible(PAGE_SIZE);
  }

  // بارگذاری یک‌باره بانک — در حالت خطا تلاش مجدد با دکمه
  useEffect(() => {
    ensureExerciseIndex();
  }, []);

  const results = useMemo(() => {
    const filtered = filterCards(items, { query, category, muscles: [], equipment: [], difficulty: "all", pattern: "all", only3d: false });
    if (!bodyweightOnly) return filtered;
    return filtered.filter((ex) => ex.equipment.length > 0 && ex.equipment.every((e) => e === "bodyweight"));
  }, [items, query, category, bodyweightOnly]);

  const visibleResults = results.slice(0, visible);

  const pick = async (exerciseId: string) => {
    if (disabled || !onPick) return;
    const ok = await onPick(exerciseId);
    if (ok === false) return;
  };

  if (status === "error") {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-3 rounded-xl border border-border/50 p-6", heightClass)}>
        <SearchX className="size-5 text-muted-foreground" aria-hidden="true" />
        <p className="text-center text-[11px] leading-6 text-muted-foreground">
          {shared.libraryLoadError}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-border/70 text-[11px] font-semibold hover:border-primary/40 hover:text-primary"
          onClick={() => void useExerciseLibraryStore.getState().load()}
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {shared.retryButton}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" dir={dir}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.searchPlaceholder(items.length)}
          className="pe-9 text-xs"
          aria-label={t.searchAria}
        />
      </div>

      {/* فیلتر دسته — چیپ‌های افقی قابل اسکرول */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
        role="group"
        aria-label={shared.categoryGroupAria}
      >
        <button
          type="button"
          aria-pressed={category === "all"}
          onClick={() => setCategory("all")}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors",
            category === "all"
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground"
          )}
        >
          {t.allCategories}
        </button>
        {EXERCISE_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            aria-pressed={category === cat.id}
            onClick={() => setCategory(category === cat.id ? "all" : cat.id)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors",
              category === cat.id
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground"
            )}
          >
            {t.categoryName(cat.id)}
          </button>
        ))}
      </div>

      <div className={cn("overflow-y-auto rounded-xl border border-border/50", heightClass)}>
        {status === "loading" ? (
          <div className="flex flex-col gap-2 p-3" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-secondary/40" />
            ))}
            <span className="sr-only">{shared.loadingLabel}</span>
          </div>
        ) : visibleResults.length === 0 ? (
          <p className="p-6 text-center text-[11px] leading-6 text-muted-foreground">
            {t.noResults}
          </p>
        ) : (
          <ul className="divide-y divide-border/40">
            {visibleResults.map((ex) => (
              <li key={ex.id} className="flex items-center gap-2 p-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-bold text-foreground">
                    {locale === "fa" ? ex.fa : ex.en}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[9px] text-muted-foreground">
                    <span dir="ltr">{ex.en}</span>
                    <span>{t.categoryName(ex.category)}</span>
                    <span>{t.difficultyName(ex.difficulty)}</span>
                    {ex.has3d && <span className="font-bold text-primary">{t.has3d}</span>}
                  </p>
                </div>
                {showAddButton && (onPick || onToggle) && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => {
                      if (onToggle) onToggle(ex.id);
                      else if (onPick) void pick(ex.id);
                    }}
                    className={cn(
                      "h-7 shrink-0 px-2 text-[10px] font-bold",
                      (selectedIds ? selectedIds.has(ex.id) : pickedId === ex.id)
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/70 hover:border-primary/40 hover:text-primary"
                    )}
                    aria-label={
                      onToggle
                        ? t.pickAria(
                            selectedIds?.has(ex.id) ? t.unpickAction : t.pickAction,
                            locale === "fa" ? ex.fa : ex.en
                          )
                        : t.addToSessionAria(locale === "fa" ? ex.fa : ex.en)
                    }
                  >
                    {onToggle ? (
                      selectedIds?.has(ex.id) ? (
                        <X className="size-3.5" aria-hidden="true" />
                      ) : (
                        <Play className="size-3.5" aria-hidden="true" />
                      )
                    ) : pickedId === ex.id ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <Plus className="size-3.5" aria-hidden="true" />
                    )}
                    {onToggle
                      ? selectedIds?.has(ex.id)
                        ? t.unpickAction
                        : t.pickAction
                      : t.addAction}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* نمایش تدریجی — شمارش واقعی نتایج فیلترشده */}
      {status === "ready" && (
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <span>
            {shared.pickerShowing(
              Math.min(visible, results.length),
              results.length
            )}
          </span>
          {visible < results.length && (
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[10px] font-bold text-primary"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            >
              {shared.loadMoreButton}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
