"use client";

/**
 * کتابخانه عمومی حرکات — مرحله ۱۸: بانک دیتابیس ~۹۰۰ حرکتی.
 *
 * معماری نمایش:
 *  - فهرست/جست‌وجو/فیلتر روی «کارت‌های» کش کلاینت (exercise-library-store)
 *    که یک‌بار از API بانک کامل بارگذاری می‌شود — بدون هیچ فهرست ثابت
 *    کامپایل‌شده و با نمایش تدریجی (load-more) برای روان‌بودن موبایل.
 *  - جزئیات کامل هر حرکت به‌صورت on-demand از /api/exercises/[id] خوانده
 *    می‌شود (loading/error/retry واقعی) و شامل خط شفاف منبع/مجوز و
 *    اطلاع‌رسانی صادقانه زبان محتواست.
 *  - دکمه سه‌بعدی فقط برای حرکاتی نشان داده می‌شود که سرور انیمیشن واقعی
 *    تأیید کرده است (has3d) — snapshot هرگز مجوز نمایش نیست.
 *  - متن‌های قابل مشاهده از دیکشنری متمرکز src/lib/i18n/sections/library.ts
 *    می‌آیند؛ محتوای حرکت با exerciseName/exerciseContent به زبان رابط
 *    نمایش داده می‌شود.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Box,
  Dumbbell,
  ListChecks,
  Repeat2,
  RotateCcw,
  Search,
  SearchX,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
  Wind,
  Wrench,
  Film,
} from "lucide-react";
import {
  ExerciseVideoPlayerDialog,
  bankMediaStreamUrl,
  type ExerciseMediaItem,
} from "../shared/exercise-video-player";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAppStore } from "@/store/app-store";
import { openBankExerciseIn3d, useCoach3DStore } from "@/store/coach3d-store";
import {
  useExerciseLibraryStore,
  ensureExerciseIndex,
} from "@/store/exercise-library-store";
import { cn } from "@/lib/utils";
import type { MuscleGroupId } from "@/lib/fitness3d/types";
import {
  categoryMonogram,
  DIFFICULTY_ORDER,
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  LIBRARY_MUSCLE_GROUPS,
  MOVEMENT_PATTERNS,
  type Difficulty,
  type EquipmentId,
  type ExerciseCategoryId,
  type LibraryExerciseCard,
  type LibraryExerciseDetail,
  type LibraryMuscleId,
  type MovementPatternId,
} from "@/lib/exercises/types";
import { filterCards, hasActiveCardFilters } from "@/lib/exercises/search";
import { exerciseName } from "@/lib/exercises/i18n";
import { useLocale } from "@/lib/i18n/locale";
import { localeNumber } from "@/lib/i18n/format";
import { useStrings } from "@/lib/i18n/use-strings";
import { libraryStrings } from "@/lib/i18n/sections/library";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { ViewIntro } from "../shared/view-intro";
import { EmptyState } from "../shared/empty-state";
import { DifficultyBadge, StageBadge } from "../shared/badges";
import { getNavItem } from "@/lib/nav";

const PATTERN_OPTIONS: MovementPatternId[] = MOVEMENT_PATTERNS.map((p) => p.id);
/** تعداد کارت در هر گام نمایش تدریجی */
const PAGE_STEP = 24;

/* ------------------------------ چیپ فیلتر ------------------------------ */

function FilterChip({
  active,
  onClick,
  children,
  ariaLabel,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        active
          ? "border-primary/40 bg-primary/15 text-primary"
          : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function toggleInArray<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/* --------------------------- پنل فیلترهای تکمیلی --------------------------- */

interface FilterPanelProps {
  muscles: LibraryMuscleId[];
  equipment: EquipmentId[];
  only3d: boolean;
  onToggleMuscle: (m: LibraryMuscleId) => void;
  onToggleEquipment: (e: EquipmentId) => void;
  onToggleOnly3d: () => void;
}

function FilterPanel({
  muscles,
  equipment,
  only3d,
  onToggleMuscle,
  onToggleEquipment,
  onToggleOnly3d,
}: FilterPanelProps) {
  const t = useStrings(libraryStrings);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-muted-foreground">{t.muscleHeading}</span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.muscleGroupAria}>
          {LIBRARY_MUSCLE_GROUPS.map((m) => (
            <FilterChip
              key={m.id}
              active={muscles.includes(m.id)}
              onClick={() => onToggleMuscle(m.id)}
              ariaLabel={t.muscleChipAria(m.fa)}
            >
              {t.muscleLabel(m.id)}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-muted-foreground">{t.equipmentHeading}</span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.equipmentGroupAria}>
          {EQUIPMENT_TYPES.map((e) => (
            <FilterChip
              key={e.id}
              active={equipment.includes(e.id)}
              onClick={() => onToggleEquipment(e.id)}
              ariaLabel={t.equipmentChipAria(t.equipmentLabel(e.id))}
            >
              {t.equipmentLabel(e.id)}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t.only3dGroupAria}>
        <FilterChip
          active={only3d}
          onClick={onToggleOnly3d}
          ariaLabel={t.only3dChipAria}
        >
          <span className="inline-flex items-center gap-1.5">
            <Box className="size-3.5" aria-hidden="true" />
            {t.only3dChipLabel}
          </span>
        </FilterChip>
      </div>
    </div>
  );
}

/* ------------------------------ کارت حرکت ------------------------------ */

function ExerciseCard({
  exercise,
  onDetails,
  onOpen3d,
}: {
  exercise: LibraryExerciseCard;
  onDetails: (ex: LibraryExerciseCard) => void;
  onOpen3d: (ex: LibraryExerciseCard) => void;
}) {
  const t = useStrings(libraryStrings);
  const locale = useLocale();

  return (
    <article className="group flex flex-col rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        {/* گرافیک یکپارچه دسته — جایگزین تصویر برای همه حرکات */}
        <span
          dir="ltr"
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-secondary/40 text-[11px] font-bold tracking-wider text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary"
        >
          {categoryMonogram(exercise.category)}
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {/* badge منشأ مشارکت مربی — مرحله ۲۰/P3 (فقط منشأ؛ هیچ متادیتای مالک) */}
          {exercise.origin === "coach" && (
            <span className="inline-flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
              {t.coachOriginBadge}
            </span>
          )}
          {exercise.has3d ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              <Box className="size-3" aria-hidden="true" />
              {t.has3dBadge}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t.no3dBadge}
            </span>
          )}
          <DifficultyBadge level={exercise.difficulty} />
        </div>
      </div>

      <h3 className="mt-4 text-sm font-bold text-foreground">{exerciseName(exercise, locale)}</h3>
      <p
        dir={locale === "fa" ? "ltr" : "rtl"}
        className="mt-0.5 text-start text-[10px] font-medium text-muted-foreground/70"
      >
        {exerciseName(exercise, locale === "fa" ? "en" : "fa")}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {t.categoryLabel(exercise.category)}
        </span>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {t.patternLabel(exercise.pattern)}
        </span>
        {exercise.compound === null ? (
          <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {t.exerciseTypeLabel(exercise.exerciseType)}
          </span>
        ) : (
          <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {exercise.compound ? t.compoundLabel : t.isolationLabel}
          </span>
        )}
      </div>

      <p className="mt-2.5 flex-1 text-xs leading-6 text-muted-foreground">
        {locale === "en" && exercise.summaryEn ? exercise.summaryEn : exercise.summary}
      </p>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-border/50 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground">{t.primaryMusclesLabel}</span>
          {exercise.primaryMuscles.map((m) => (
            <span
              key={m}
              className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {t.muscleLabel(m)}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          <span className="font-bold">{t.equipmentFieldLabel}</span>{" "}
          {t.equipmentList(exercise.equipment)}
        </p>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 border-border/70 text-xs font-semibold hover:border-primary/40 hover:text-primary"
          onClick={() => onDetails(exercise)}
        >
          <ListChecks className="size-3.5" aria-hidden="true" />
          {t.detailsButton}
        </Button>
        {exercise.has3d && (
          <Button
            size="sm"
            className="h-8 flex-1 text-xs font-semibold text-primary-foreground"
            onClick={() => onOpen3d(exercise)}
          >
            <Box className="size-3.5" aria-hidden="true" />
            {t.coach3dButton}
          </Button>
        )}
      </div>
    </article>
  );
}

/* ---------------------------- دیالوگ جزئیات ---------------------------- */

type DetailState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "ready"; detail: LibraryExerciseDetail };

function useExerciseDetail(id: string | null): {
  state: DetailState;
  retry: () => void;
} {
  const [state, setState] = useState<DetailState>({ kind: "idle" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/exercises/${encodeURIComponent(id)}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP_${res.status}`);
        const data = (await res.json()) as { exercise: LibraryExerciseDetail };
        if (!cancelled) setState({ kind: "ready", detail: data.exercise });
      } catch {
        if (!cancelled) setState({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { state, retry };
}

function ExerciseDetailsDialog({
  card,
  open,
  onOpenChange,
  onOpen3d,
  onDetails,
}: {
  card: LibraryExerciseCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen3d: (ex: LibraryExerciseCard) => void;
  onDetails: (ex: LibraryExerciseCard) => void;
}) {
  const t = useStrings(libraryStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const id = card?.id ?? null;
  const { state, retry } = useExerciseDetail(open ? id : null);
  // P2 (R2.3): پخش ویدئوی رکورد بانک عمومی — فهرست رسانه در پاسخ جزئیات است
  const [videoOpen, setVideoOpen] = useState(false);
  const bankMedia: ExerciseMediaItem[] =
    state.kind === "ready" ? (state.detail.media ?? []) : [];

  if (!card) return null;
  const detail = state.kind === "ready" ? state.detail : null;
  // انتخاب محتوای آموزشی به زبان رابط — انگلیسی فقط با ترجمه واقعی موجود
  const content = detail
    ? locale === "en" && detail.enContent
      ? {
          summary: detail.enContent.summary,
          steps: detail.enContent.steps,
          breathing: detail.enContent.breathing,
          mistakes: detail.enContent.mistakes,
          safety: detail.enContent.safety,
        }
      : detail
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base">{exerciseName(card, locale)}</DialogTitle>
            <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t.categoryLabel(card.category)}
            </span>
            <DifficultyBadge level={card.difficulty} />
            {card.origin === "coach" && (
              <span className="inline-flex items-center rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">
                {t.coachOriginBadge}
              </span>
            )}
          </div>
          <DialogDescription
            dir={locale === "fa" ? "ltr" : "rtl"}
            className="text-start text-[11px]"
          >
            {exerciseName(card, locale === "fa" ? "en" : "fa")}
          </DialogDescription>
        </DialogHeader>

        {/* حالت بارگذاری جزئیات */}
        {state.kind === "loading" && (
          <div className="flex flex-col gap-3 py-4" aria-busy="true">
            <div className="h-4 w-2/3 animate-pulse rounded bg-secondary/40" />
            <div className="h-20 animate-pulse rounded-xl bg-secondary/30" />
            <div className="h-24 animate-pulse rounded-xl bg-secondary/30" />
            <span className="sr-only">{t.detailLoadingLabel}</span>
          </div>
        )}

        {/* حالت خطا با تلاش مجدد واقعی */}
        {state.kind === "error" && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 p-6">
            <p className="text-center text-[11px] leading-6 text-muted-foreground">
              {t.detailLoadError}
            </p>
            <Button
              size="sm"
              variant="outline"
              className="border-border/70 text-[11px] font-semibold hover:border-primary/40 hover:text-primary"
              onClick={retry}
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {shared.retryButton}
            </Button>
          </div>
        )}

        {/* محتوای کامل — از پاسخ زنده سرور */}
        {detail && (
          <>
            {/* شفافیت منبع و زبان محتوا */}
            {detail.contentLocale === "en" && (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[11px] leading-6 text-muted-foreground">
                {t.contentLanguageNotice}
              </p>
            )}
            {detail.sourceKey === "coach" ? (
              <p className="text-[10px] leading-5 text-muted-foreground/70">{t.coachOriginSourceLine}</p>
            ) : detail.sourceKey !== "editorial" && (
              <p className="text-[10px] leading-5 text-muted-foreground/70">
                {t.sourceLine(t.sourceDisplayName, t.sourceLicenseName)}
              </p>
            )}

            {/* معرفی */}
            <div>
              <h4 className="text-xs font-bold text-foreground">{t.aboutTitle}</h4>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{content?.summary}</p>
            </div>

            {/* مشخصات فنی */}
            <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
                <span className="block text-[10px] font-bold text-muted-foreground">{t.categorySpecLabel}</span>
                <span className="mt-0.5 block font-semibold text-foreground">{t.categoryLabel(detail.category)}</span>
              </div>
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
                <span className="block text-[10px] font-bold text-muted-foreground">{t.patternSpecLabel}</span>
                <span className="mt-0.5 block font-semibold text-foreground">{t.patternLabel(detail.pattern)}</span>
              </div>
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
                <span className="block text-[10px] font-bold text-muted-foreground">{t.structureSpecLabel}</span>
                <span className="mt-0.5 block font-semibold text-foreground">
                  {detail.compound === null
                    ? t.exerciseTypeLabel(detail.exerciseType)
                    : detail.compound
                      ? t.compoundLabel
                      : t.isolationLabel}
                </span>
              </div>
              <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
                <span className="block text-[10px] font-bold text-muted-foreground">{t.levelSpecLabel}</span>
                <span className="mt-0.5 block font-semibold text-foreground">{shared.difficultyLabel(detail.difficulty)}</span>
              </div>
            </div>

            <div className="flex items-start gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-2 text-[11px] text-muted-foreground">
              <Wrench className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span>
                <span className="font-bold text-foreground">{t.equipmentFieldLabel}</span>{" "}
                {t.equipmentList(detail.equipment)}
              </span>
            </div>

            {/* P2 (R2.3): رسانه ثبتشده رکورد بانک — در نبود ویدئو هیچ ادعایی
                نمایش داده نمیشود (صادقانه) */}
            {bankMedia.some((m) => m.kind === "video") && (
              <div className="space-y-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[11px] font-bold text-primary hover:border-primary/40"
                  onClick={() => setVideoOpen(true)}
                >
                  <Film className="me-1 size-3.5" aria-hidden="true" />
                  {locale === "fa" ? "مشاهده ویدئوی حرکت" : "Watch exercise video"}
                </Button>
              </div>
            )}

            {/* عضلات */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">{t.primaryMusclesLabel}</span>
                {detail.primaryMuscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary"
                  >
                    {t.muscleLabel(m)}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">{t.secondaryMusclesLabel}</span>
                {detail.secondaryMuscles.length > 0 ? (
                  detail.secondaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="rounded-md border border-border/40 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                    >
                      {t.muscleLabel(m)}
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground/70">{t.secondaryEmpty}</span>
                )}
              </div>
            </div>

            {/* مراحل اجرا */}
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ListChecks className="size-3.5 text-primary" aria-hidden="true" />
                {t.stepsTitle}
              </h4>
              <ol className="mt-2.5 flex flex-col gap-2">
                {(content?.steps ?? []).map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
                    <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                      {localeNumber(i + 1, locale)}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            {/* تنفس — فقط اگر داده واقعی وجود دارد */}
            <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Wind className="size-3.5 text-primary" aria-hidden="true" />
                {t.breathingTitle}
              </h4>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                {content?.breathing ?? t.breathingEmpty}
              </p>
            </div>

            {/* اشتباهات رایج — فقط اگر داده واقعی وجود دارد */}
            <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <TriangleAlert className="size-3.5 text-rose-300" aria-hidden="true" />
                {t.mistakesTitle}
              </h4>
              {(content?.mistakes.length ?? 0) > 0 ? (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {(content?.mistakes ?? []).map((mistake, i) => (
                    <li key={i} className="text-xs leading-6 text-muted-foreground">
                      — {mistake}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{t.mistakesEmpty}</p>
              )}
            </div>

            {/* نکات ایمنی — فقط اگر داده واقعی وجود دارد */}
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <ShieldCheck className="size-3.5 text-amber-300" aria-hidden="true" />
                {t.safetyTitle}
              </h4>
              {(content?.safety.length ?? 0) > 0 ? (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {(content?.safety ?? []).map((tip, i) => (
                    <li key={i} className="text-xs leading-6 text-muted-foreground">
                      — {tip}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{t.safetyEmpty}</p>
              )}
            </div>

            {/* حرکات مشابه */}
            {detail.similar.length > 0 && (
              <div>
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                  <Repeat2 className="size-3.5 text-primary" aria-hidden="true" />
                  {t.similarTitle}
                </h4>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {detail.similar.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onDetails(s)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                    >
                      <Dumbbell className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      {exerciseName(s, locale)}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground/70">
                  {t.similarNote}
                </p>
              </div>
            )}

            {/* اکشن‌ها */}
            <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
              {card.has3d ? (
                <Button
                  className="h-9 w-full text-xs font-bold text-primary-foreground"
                  onClick={() => {
                    onOpen3d(card);
                    onOpenChange(false);
                  }}
                >
                  <Box className="size-4" aria-hidden="true" />
                  {t.viewIn3dButton}
                </Button>
              ) : (
                <p className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-[11px] leading-6 text-muted-foreground">
                  {t.noAnimationNote}
                </p>
              )}
              <Button
                variant="outline"
                className="h-9 w-full border-border/70 text-xs font-semibold hover:border-primary/40 hover:text-primary"
                onClick={() => onOpenChange(false)}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {t.backToLibraryButton}
              </Button>
            </div>
          </>
        )}

        {/* P2 (R2.3): پلیر ویدئوی رکورد بانک — استریم احرازنشست‌دار */}
        <ExerciseVideoPlayerDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          title={exerciseName(card, locale)}
          source={{ type: "ready", media: bankMedia }}
          mediaUrlFor={(m) => bankMediaStreamUrl(card.id, m.id)}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- نمای اصلی ------------------------------- */

export function LibraryView() {
  const t = useStrings(libraryStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const item = getNavItem("library");
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setScene = useCoach3DStore((s) => s.setScene);
  const openLibraryExercise = useAppStore((s) => s.openLibraryExercise);

  const status = useExerciseLibraryStore((s) => s.status);
  const items = useExerciseLibraryStore((s) => s.items);
  const total = useExerciseLibraryStore((s) => s.total);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategoryId | "all">("all");
  const [muscles, setMuscles] = useState<LibraryMuscleId[]>([]);
  const [equipment, setEquipment] = useState<EquipmentId[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [pattern, setPattern] = useState<MovementPatternId | "all">("all");
  const [only3d, setOnly3d] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_STEP);
  // بازنشانی نمایش تدریجی با تغییر فیلترها — الگوی رسمی «مشتق در رندر»
  const [prevFilterKey, setPrevFilterKey] = useState("");

  // دیالوگ جزئیات — هم از کلیت کارت و هم از deep-link store مرکزی
  const [selectedCard, setSelectedCard] = useState<LibraryExerciseCard | null>(null);
  const librarySelectedId = useAppStore((s) => s.librarySelectedId);
  const closeLibraryExercise = useAppStore((s) => s.closeLibraryExercise);
  const getBankExercise = useExerciseLibraryStore((s) => s.getById);

  // بارگذاری یک‌باره بانک
  useEffect(() => {
    ensureExerciseIndex();
  }, []);

  // deep-link: شناسه از store مرکزی → یافتن کارت از کش (مشتق خالص)
  const deepLinkCard = librarySelectedId ? getBankExercise(librarySelectedId) ?? null : null;
  const selected = selectedCard ?? deepLinkCard;
  const dialogOpen = selected !== null;

  const filterState = useMemo(
    () => ({ query, category, muscles, equipment, difficulty, pattern, only3d }),
    [query, category, muscles, equipment, difficulty, pattern, only3d]
  );

  const filterKey = JSON.stringify(filterState);
  if (prevFilterKey !== filterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(PAGE_STEP);
  }

  const filtered = useMemo(
    () => filterCards(items, filterState),
    [items, filterState]
  );
  const hasFilters = hasActiveCardFilters(filterState);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((v) => (v < filtered.length ? v + PAGE_STEP : v));
        }
      },
      { rootMargin: "320px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filtered.length]);

  const visibleCards = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const advancedActiveCount =
    (muscles.length > 0 ? 1 : 0) + (equipment.length > 0 ? 1 : 0) + (only3d ? 1 : 0);

  const resetFilters = useCallback(() => {
    setQuery("");
    setCategory("all");
    setMuscles([]);
    setEquipment([]);
    setDifficulty("all");
    setPattern("all");
    setOnly3d(false);
  }, []);

  const openDetails = useCallback(
    (ex: LibraryExerciseCard) => {
      setSelectedCard(ex);
      // deep-link store هم همگام می‌ماند تا «جزئیات» از بخش‌های دیگر کار کند
      openLibraryExercise(ex.id);
    },
    [openLibraryExercise]
  );

  const closeDetails = useCallback(() => {
    setSelectedCard(null);
    closeLibraryExercise();
  }, [closeLibraryExercise]);

  /** انتقال واقعی به مربی سه‌بعدی — فقط با تأیید انیمیشن واقعی از بانک (نگاشت پارامتری یا legacy) */
  const openIn3d = useCallback(
    (ex: LibraryExerciseCard) => {
      if (!ex.has3d) return;
      const ok = openBankExerciseIn3d(ex, { setScene });
      if (!ok) return;
      setActiveView("coach3d");
    },
    [setScene, setActiveView]
  );

  const onToggleMuscle = useCallback(
    (m: LibraryMuscleId) => setMuscles((prev) => toggleInArray(prev, m)),
    []
  );
  const onToggleEquipment = useCallback(
    (e: EquipmentId) => setEquipment((prev) => toggleInArray(prev, e)),
    []
  );

  const filterPanelProps: FilterPanelProps = {
    muscles,
    equipment,
    only3d,
    onToggleMuscle,
    onToggleEquipment,
    onToggleOnly3d: () => setOnly3d((v) => !v),
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex flex-col gap-4"
    >
      <ViewIntro
        item={item}
        badges={
          <>
            <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              <Dumbbell className="size-3" aria-hidden="true" />
              {t.countBadge(total)}
            </span>
            <StageBadge stage={5} label={t.stageRoadmapLabel} />
          </>
        }
      />

      {/* ------------------------- جست‌وجو و فیلترها ------------------------- */}
      <section aria-label={t.searchSectionAria} className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="ps-9"
              aria-label={t.searchAria}
            />
          </div>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty | "all")}>
            <SelectTrigger className="w-full lg:w-40" aria-label={t.difficultyFilterAria}>
              <SelectValue placeholder={t.difficultyPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allLevels}</SelectItem>
              {DIFFICULTY_ORDER.map((level) => (
                <SelectItem key={level} value={level}>
                  {shared.difficultyLabel(level)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pattern} onValueChange={(v) => setPattern(v as MovementPatternId | "all")}>
            <SelectTrigger className="w-full lg:w-52" aria-label={t.patternFilterAria}>
              <SelectValue placeholder={t.patternPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allPatterns}</SelectItem>
              {PATTERN_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {t.patternLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* دسته‌بندی — همیشه نمایان */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={t.categoryGroupAria}>
          <FilterChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            ariaLabel={t.allCategoriesChip}
          >
            {t.allCategoriesChip}
          </FilterChip>
          {EXERCISE_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.id}
              active={category === cat.id}
              onClick={() => setCategory(cat.id)}
              ariaLabel={t.categoryChipAria(t.categoryLabel(cat.id))}
            >
              {t.categoryLabel(cat.id)}
            </FilterChip>
          ))}
        </div>

        {/* فیلترهای تکمیلی — دسکتاپ همیشه باز */}
        <div className="mt-4 hidden border-t border-border/50 pt-4 lg:block">
          <FilterPanel {...filterPanelProps} />
        </div>

        {/* فیلترهای تکمیلی — موبایل داخل Collapsible */}
        <div className="mt-3 lg:hidden">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between border-border/70 font-bold hover:border-primary/40 hover:text-primary"
                aria-label={t.advancedFiltersToggleAria}
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  {t.advancedFiltersToggleLabel}
                </span>
                {advancedActiveCount > 0 && (
                  <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {t.activeCountBadge(advancedActiveCount)}
                  </span>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 overflow-hidden border-t border-border/50 pt-3 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <FilterPanel {...filterPanelProps} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </section>

      {/* --------------------------- شمارش نتایج --------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <p className="text-[11px] text-muted-foreground">
          {t.showingPrefix}{" "}
          <span className="font-bold text-foreground">{localeNumber(filtered.length, locale)}</span>{" "}
          {t.showingMid}{" "}
          <span className="font-bold text-foreground">{localeNumber(total, locale)}</span>{" "}
          {t.showingSuffix}
          {hasFilters && <span>{t.filtersActiveNote}</span>}
        </p>
        {hasFilters && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-border/70 px-2.5 text-[11px] font-semibold hover:border-primary/40 hover:text-primary"
            onClick={resetFilters}
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            {t.clearFiltersButton}
          </Button>
        )}
      </div>

      {/* ----------------------------- نتایج ----------------------------- */}
      {status === "loading" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border/40 bg-secondary/20" />
          ))}
          <span className="sr-only">{locale === "fa" ? "در حال بارگذاری…" : "Loading…"}</span>
        </div>
      ) : status === "error" ? (
        <div className="rounded-2xl border border-border/60 bg-card">
          <EmptyState
            icon={SearchX}
            title={t.emptyTitle}
            description={shared.libraryLoadError}
            action={
              <Button
                variant="outline"
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
                onClick={() => void useExerciseLibraryStore.getState().load()}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {shared.retryButton}
              </Button>
            }
          />
        </div>
      ) : visibleCards.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleCards.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onDetails={openDetails} onOpen3d={openIn3d} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card">
          <EmptyState
            icon={SearchX}
            title={t.emptyTitle}
            description={t.emptyDescription}
            action={
              <Button
                variant="outline"
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
                onClick={resetFilters}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                {t.clearAllFiltersButton}
              </Button>
            }
          />
        </div>
      )}

      {/* sentinel نمایش تدریجی + دکمه دستی (fallback بدون observer) */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-2">
          <Button
            size="sm"
            variant="outline"
            className="border-border/70 text-[11px] font-semibold hover:border-primary/40 hover:text-primary"
            onClick={() => setVisibleCount((v) => v + PAGE_STEP)}
          >
            {locale === "fa" ? "نمایش حرکات بیشتر" : "Load more exercises"}
          </Button>
        </div>
      )}

      <ExerciseDetailsDialog
        card={selected}
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDetails();
        }}
        onOpen3d={openIn3d}
        onDetails={openDetails}
      />
    </motion.div>
  );
}
