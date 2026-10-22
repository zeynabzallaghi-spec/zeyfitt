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
import { Box, BookmarkPlus, Check, Loader2, Play, Plus, RotateCcw, Search, SearchX, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { workoutStrings } from "@/lib/i18n/sections/workout";
import { coach3DStrings } from "@/lib/i18n/sections/coach3d";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import {
  useExerciseLibraryStore,
  ensureExerciseIndex,
} from "@/store/exercise-library-store";
import { useCoach3DStore } from "@/store/coach3d-store";
import { resolveScene } from "@/lib/fitness3d/resolve";
import type { MuscleGroupId } from "@/lib/fitness3d/types";
import { filterCards } from "@/lib/exercises/search";
import { EXERCISE_CATEGORIES, type ExerciseCategoryId } from "@/lib/exercises/types";
import { stripPersonalPrefix, withPersonalPrefix } from "@/lib/coaching/personal-exercise-id";
import {
  ExerciseVideoPlayerDialog,
  type ExerciseMediaItem,
} from "@/components/fitness/shared/exercise-video-player";
import { MiniCoachScene } from "@/components/fitness/coach3d/MiniCoachScene";

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
  /** بانک شخصی مربی (مرحله ۱۹.۶) — فعال‌کننده سوییچ منبع */
  personalExercises = null,
  /** مرحله ۲۰/P1-R1.2 — فعال‌کننده دکمه «ذخیره در کتابخانه من» روی بانک عمومی */
  onSaveToLibrary,
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
  /** حرکات شخصی مربی — وقتی داده شود، انتخاب منبع نمایش داده میشود */
  personalExercises?: {
    id: string;
    faName: string;
    enName: string;
    category: string;
    /** R1.4 (مرحله ۲۰/P1) — عضلات واقعی حرکت شخصی برای نمایش سازگار */
    primaryMuscles?: string[];
    secondaryMuscles?: string[];
    /** P2 (R2.2) — حرکت ویدئو دارد؛ دکمه پخش امن نمایش داده میشود */
    hasVideo?: boolean;
  }[] | null;
  /**
   * مرحله ۲۰/P1 (R1.2): وقتی داده شود، حرکات بانک عمومی دکمه «ذخیره در
   * کتابخانه من» میگیرند — سرور رکورد شخصی مالک مربی میسازد؛ بازگشت true
   * یعنی ذخیره موفق (پدر toast و تازه‌سازی فهرست را انجام میدهد).
   */
  onSaveToLibrary?: (publicExerciseId: string) => Promise<boolean>;
}) {
  const t = useStrings(workoutStrings);
  const shared = useStrings(sharedStrings);
  const t3d = useStrings(coach3DStrings);
  const t196 = useStrings(phase196Strings);
  const locale = useLocale();
  const dir = useDir();
  const setScene = useCoach3DStore((s) => s.setScene);
  const togglePlay = useCoach3DStore((s) => s.togglePlay);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const previewCard = previewId ? useExerciseLibraryStore.getState().getById(previewId) : null;

  const status = useExerciseLibraryStore((s) => s.status);
  const items = useExerciseLibraryStore((s) => s.items);
  const error = useExerciseLibraryStore((s) => s.error);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategoryId | "all">("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  // منبع حرکت — بانک عمومی یا حرکات شخصی مربی (مرحله ۱۹.۶)
  const [source, setSource] = useState<"public" | "personal">("public");
  // ذخیره از بانک عمومی در کتابخانه شخصی — مرحله ۲۰/P1-R1.2
  const [savingToLibraryId, setSavingToLibraryId] = useState<string | null>(null);
  const [savedToLibraryIds, setSavedToLibraryIds] = useState<Set<string>>(new Set());
  // P2 (R2.2): پخش ویدئوی حرکت شخصی — فهرست رسانه هنگام بازشدن از API مجاز
  const [videoTarget, setVideoTarget] = useState<string | null>(null);
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
    if (source === "personal" && personalExercises !== null) {
      const q = query.trim().toLowerCase();
      return personalExercises
        .filter((ex) => (q.length === 0 ? true : ex.faName.includes(q) || ex.enName.toLowerCase().includes(q)))
        .map((ex) => ({
          // قرارداد واحد مرحله ۲۰/P0: خروجی انتخابگر در شاخه شخصی، قالب سیم
          // با پیشوند cex- است (idempotent) — همان که سرور برنامه‌ساز انتظار دارد؛
          // بدون این پیشوند درج حرکت شخصی بی‌صدا شکست میخورد
          id: withPersonalPrefix(ex.id),
          fa: ex.faName,
          en: ex.enName,
          category: ex.category as ExerciseCategoryId,
          difficulty: "intermediate" as const,
          equipment: [] as string[],
          // R1.4: عضلات واقعی حرکت شخصی — نه آرایه خالی صوری
          primaryMuscles: (ex.primaryMuscles ?? []) as string[],
          secondaryMuscles: (ex.secondaryMuscles ?? []) as string[],
          has3d: false,
          coach3dId: null,
          animation3d: null,
        }));
    }
    const filtered = filterCards(items, { query, category, muscles: [], equipment: [], difficulty: "all", pattern: "all", only3d: false });
    if (!bodyweightOnly) return filtered;
    return filtered.filter((ex) => ex.equipment.length > 0 && ex.equipment.every((e) => e === "bodyweight"));
  }, [items, query, category, bodyweightOnly, source, personalExercises]);

  const visibleResults = results.slice(0, visible);
  /** P2 (R2.2): شناسههای خام حرکات شخصی دارای ویدئو برای دکمه پخش */
  const personalVideoIds = useMemo(() => {
    const set = new Set<string>();
    for (const ex of personalExercises ?? []) {
      if (ex.hasVideo) set.add(stripPersonalPrefix(withPersonalPrefix(ex.id)));
    }
    return set;
  }, [personalExercises]);

  const pick = async (exerciseId: string) => {
    if (disabled || !onPick) return;
    const ok = await onPick(exerciseId);
    if (ok === false) return;
  };

  /** ذخیره حرکت عمومی در کتابخانه شخصی — مرحله ۲۰/P1-R1.2 (فقط مسیر عمومی) */
  const saveToLibrary = async (publicId: string) => {
    if (!onSaveToLibrary || savingToLibraryId !== null) return;
    setSavingToLibraryId(publicId);
    try {
      const ok = await onSaveToLibrary(publicId);
      if (ok) setSavedToLibraryIds((prev) => new Set(prev).add(publicId));
    } finally {
      setSavingToLibraryId(null);
    }
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

      {/* انتخاب منبع — فقط وقتی بانک شخصی داده شده (برنامه‌ساز مربی) */}
      {personalExercises !== null && (
        <div className="flex items-center gap-1.5" role="group" aria-label={shared.categoryGroupAria}>
          {(["public", "personal"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={source === s}
              onClick={() => {
                setSource(s);
                setVisible(PAGE_SIZE);
              }}
              className={`rounded-full border px-3 py-1 text-[10px] font-semibold transition-colors ${
                source === s
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.sourceLabel(s)}
            </button>
          ))}
        </div>
      )}

      {/* فیلتر دسته — فقط بانک عمومی (حرکات شخصی دسته ساده دارند) */}
      {source === "public" && (
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
      )}

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
            {source === "personal" && personalExercises !== null && personalExercises.length === 0
              ? t.personalEmptyNote
              : t.noResults}
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
                {source === "personal" && personalVideoIds.has(stripPersonalPrefix(ex.id)) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => setVideoTarget(stripPersonalPrefix(ex.id))}
                    className="h-7 shrink-0 px-2 text-[10px] font-bold text-primary hover:bg-primary/10"
                    aria-label={t196.personalVideoPlayAria(locale === "fa" ? ex.fa : ex.en)}
                  >
                    <Play className="size-3.5" aria-hidden="true" />
                    {t196.personalVideoPlay}
                  </Button>
                )}
                {ex.has3d && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreviewId(ex.id)}
                    className="h-7 shrink-0 px-2 text-[10px] font-bold text-primary hover:bg-primary/10"
                    aria-label={t3d.previewAria(locale === "fa" ? ex.fa : ex.en)}
                  >
                    <Box className="size-3.5" aria-hidden="true" />
                    {t3d.previewAction}
                  </Button>
                )}
                {onSaveToLibrary && source === "public" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={disabled || savingToLibraryId !== null}
                    onClick={() => void saveToLibrary(ex.id)}
                    className="h-7 shrink-0 px-2 text-[10px] font-bold text-primary hover:bg-primary/10"
                    aria-label={
                      savingToLibraryId === ex.id
                        ? t196.saveToLibraryBusyAria
                        : t196.saveToLibraryAria(locale === "fa" ? ex.fa : ex.en)
                    }
                  >
                    {savingToLibraryId === ex.id ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : savedToLibraryIds.has(ex.id) ? (
                      <Check className="size-3.5" aria-hidden="true" />
                    ) : (
                      <BookmarkPlus className="size-3.5" aria-hidden="true" />
                    )}
                    {savedToLibraryIds.has(ex.id) ? null : t196.saveToLibrary}
                  </Button>
                )}
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

      {/* دیالوگ پیش‌نمایش سه‌بعدی — صحنه از نگاشت بانک حل می‌شود */}
      <Dialog
        open={previewId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewId(null);
          }
        }}
      >
        <DialogContent className="max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-sm">
              {previewCard ? t3d.previewTitle(locale === "fa" ? previewCard.fa : previewCard.en) : ""}
            </DialogTitle>
          </DialogHeader>
          {previewCard && (
            <PreviewBody
              card={previewCard}
              locale={locale}
              onPlay={() => {
                // صحنه در PreviewBody روی store اعمال شده؛ اینجا فقط پخش
                togglePlay();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* P2 (R2.2): پلیر ویدئوی حرکت شخصی — سرو استریم امن همان مسیر سرور */}
      <ExerciseVideoPlayerDialog
        open={videoTarget !== null}
        onOpenChange={(v) => {
          if (!v) setVideoTarget(null);
        }}
        title={
          visibleResults.find((ex) => stripPersonalPrefix(ex.id) === videoTarget)?.[
            locale === "fa" ? "fa" : "en"
          ] ?? ""
        }
        source={
          videoTarget
            ? {
                type: "load",
                load: async (): Promise<ExerciseMediaItem[] | null> => {
                  const res = await fetch(
                    `/api/coach/exercises/${encodeURIComponent(videoTarget)}/media`
                  );
                  if (!res.ok) return null;
                  const data = (await res.json()) as { media?: ExerciseMediaItem[] };
                  return Array.isArray(data.media) ? data.media : [];
                },
              }
            : null
        }
      />
    </div>
  );
}

/**
 * بدنه پیش‌نمایش — بارگذاری صحنه روی تغییر حرکت با setter مستقیم
 * (بدون state مشتق) و پاک‌سازی خودکار R3F هنگام بستن دیالوگ.
 */
function PreviewBody({
  card,
  locale,
  onPlay,
}: {
  card: NonNullable<ReturnType<ReturnType<typeof useExerciseLibraryStore.getState>["getById"]>>;
  locale: string;
  onPlay: () => void;
}) {
  const setScene = useCoach3DStore((s) => s.setScene);
  const t3d = useStrings(coach3DStrings);
  // حل صحنه تابع خالص است — در رندر مشتق می‌شود (الگوی رسمی پروژه)؛
  // فقط اعمال آن روی store سراسری در effect انجام می‌شود
  const scene = useMemo(() => {
    try {
      return resolveScene({
        id: card.id,
        fa: card.fa,
        en: card.en,
        difficulty: card.difficulty,
        primaryMuscles: card.primaryMuscles as MuscleGroupId[],
        secondaryMuscles: card.secondaryMuscles as MuscleGroupId[],
        coach3dId: card.coach3dId,
        animation3d: card.animation3d ?? null,
      });
    } catch {
      return null;
    }
  }, [card]);

  useEffect(() => {
    if (scene) setScene(scene);
  }, [scene, setScene]);

  if (!scene) {
    return (
      <p className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-center text-[11px] leading-6 text-muted-foreground">
        {t3d.previewUnavailable}
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="relative h-72 overflow-hidden rounded-xl border border-border/50 bg-aura-lime">
        <MiniCoachScene />
      </div>
      <Button
        size="sm"
        className="h-8 w-full text-xs font-bold"
        onClick={onPlay}
      >
        <Play className="size-3.5" aria-hidden="true" />
        {t3d.playLabel}
      </Button>
      <p className="text-[10px] leading-5 text-muted-foreground">
        {locale === "fa" ? t3d.previewNoteFa : t3d.previewNoteEn}
      </p>
    </div>
  );
}
