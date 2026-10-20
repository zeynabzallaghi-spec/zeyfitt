"use client";

/**
 * فهرست انتخاب حرکت از بانک کامل — مرحله ۱۹.
 *
 * جایگزین فهرست ثابت ۶ حرکته: همه حرکات فعال بانک (۹۰۵) با جست‌وجوی
 * زنده (FA/EN) و بارگذاری تدریجی (۵۰ تایی). انتخاب هر حرکت صحنه را از
 * نگاشت بانک حل می‌کند (resolveScene) — حرکت بدون نگاشت معتبر اصلاً
 * در فهرست قابل انتخاب نیست و هیچ fallback پنهانی وجود ندارد.
 *
 * داده از کش ایندکس بانک (useExerciseLibraryStore) می‌آید — همان منبع
 * سروری که بقیه اپ استفاده می‌کنند؛ حالت‌های loading/error/retry واقعی.
 */

import { useMemo, useState } from "react";
import { Dumbbell, Loader2, RefreshCcw, Search } from "lucide-react";
import { DifficultyBadge } from "../../shared/badges";
import { ensureExerciseIndex, useExerciseLibraryStore } from "@/store/exercise-library-store";
import { openBankExerciseIn3d, useCoach3DStore } from "@/store/coach3d-store";
import { useLocale } from "@/lib/i18n/locale";
import { localeNumber } from "@/lib/i18n/format";
import { useStrings } from "@/lib/i18n/use-strings";
import { coach3DStrings } from "@/lib/i18n/sections/coach3d";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

const PAGE_SIZE = 50;

/** نرمال‌سازی جست‌وجو — همان قرارداد بانک (یاء/کاف/اعراب/نیم‌فاصله) */
function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\u064A\u0649]/g, "\u06CC")
    .replace(/\u0643/g, "\u06A9")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u200C/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function BankExerciseList() {
  const status = useExerciseLibraryStore((s) => s.status);
  const items = useExerciseLibraryStore((s) => s.items);
  const error = useExerciseLibraryStore((s) => s.error);
  const exerciseId = useCoach3DStore((s) => s.exerciseId);
  const setScene = useCoach3DStore((s) => s.setScene);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const t = useStrings(coach3DStrings);
  const locale = useLocale();

  useEffect(() => {
    ensureExerciseIndex();
  }, []);

  const filtered = useMemo(() => {
    const q = normalizeQuery(query);
    if (!q) return items;
    return items.filter((ex) => `${ex.fa} ${ex.en}`.toLowerCase().includes(q));
  }, [items, query]);

  const shown = filtered.slice(0, visible);

  const select = (id: string) => {
    const card = useExerciseLibraryStore.getState().getById(id);
    if (!card) return;
    openBankExerciseIn3d(card, { setScene });
  };

  return (
    <section aria-label={t.exerciseListAria} className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold">{t.exerciseListTitle}</h3>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          {status === "ready" ? t.exerciseCountBadge(items.length) : "…"}
        </span>
      </div>

      {/* جست‌وجو */}
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60 start-3" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder={t.searchPlaceholder}
          aria-label={t.searchPlaceholder}
          className="w-full rounded-xl border border-border/60 bg-secondary/30 py-2 pe-3 ps-9 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary/40"
        />
      </div>

      {/* حالت‌های واقعی بانک */}
      {status === "loading" && (
        <div className="mt-4 flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
          {t.listLoading}
        </div>
      )}
      {status === "error" && (
        <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
          <p className="text-xs text-muted-foreground">{t.listError}</p>
          <button
            type="button"
            onClick={() => void useExerciseLibraryStore.getState().load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/50 px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <RefreshCcw className="size-3.5" aria-hidden="true" />
            {t.listRetry}
          </button>
        </div>
      )}

      {status === "ready" && (
        <>
          <div className="mt-3 flex flex-col gap-2">
            {shown.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">{t.searchEmpty}</p>
            )}
            {shown.map((ex) => {
              const active = ex.id === exerciseId;
              return (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => select(ex.id)}
                  aria-pressed={active}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl border p-2.5 text-start transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.99]",
                    active
                      ? "border-primary/45 bg-primary/10 glow-lime-sm"
                      : "border-border/50 bg-secondary/30 hover:border-border hover:bg-secondary/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg border text-xs font-extrabold transition-colors",
                      active
                        ? "border-primary/40 bg-primary/15 text-primary"
                        : "border-border/50 bg-background/50 text-muted-foreground group-hover:text-foreground"
                    )}
                    aria-hidden="true"
                  >
                    <Dumbbell className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate text-[13px] font-bold", active ? "text-primary" : "text-foreground")}>
                      {t.exerciseName(ex.fa, ex.en)}
                    </span>
                    <span
                      dir={locale === "fa" ? "ltr" : "rtl"}
                      className="block truncate text-start text-[10px] font-medium text-muted-foreground/70"
                    >
                      {t.exerciseAltName(ex.fa, ex.en)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <DifficultyBadge level={ex.difficulty} />
                    <span className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground/70">
                      {ex.equipment.length > 0 && <Dumbbell className="size-3" aria-hidden="true" />}
                      {t.muscleLabel((ex.primaryMuscles[0] ?? ex.secondaryMuscles[0]) as never)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* بارگذاری تدریجی */}
          {visible < filtered.length && (
            <button
              type="button"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
              className="mt-3 w-full rounded-xl border border-border/50 bg-secondary/30 py-2 text-xs font-bold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {t.loadMore(localeNumber(filtered.length - shown.length, locale))}
            </button>
          )}
        </>
      )}
    </section>
  );
}
