"use client";

/**
 * کتابخانه حرکات — بانک ساختاریافته ۴۸ حرکت با جست‌وجوی واقعی فارسی/انگلیسی،
 * فیلترهای ترکیبی (دسته، عضله، تجهیزات، سطح، الگو، سه‌بعدی) و دیالوگ جزئیات
 * کامل. داده‌ها از src/lib/exercises خوانده می‌شوند و هیچ داده نمونه‌ای در
 * این صفحه وجود ندارد.
 *
 * همه متن‌های قابل مشاهده از دیکشنری متمرکز src/lib/i18n/sections/library.ts
 * می‌آیند (فارسی عیناً همان متن‌های قبلی) و نام/محتوای آموزشی هر حرکت با
 * exerciseName/exerciseContent به زبان رابط نمایش داده می‌شود؛ داده بانک
 * دست‌نخورده می‌ماند.
 */

import { useCallback, useMemo, useState } from "react";
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
} from "lucide-react";
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
import { useCoach3DStore } from "@/store/coach3d-store";
import { cn } from "@/lib/utils";
import { MUSCLE_GROUPS } from "@/lib/fitness3d/muscles";
import type { MuscleGroupId } from "@/lib/fitness3d/types";
import {
  categoryMonogram,
  DIFFICULTY_ORDER,
  EQUIPMENT_TYPES,
  EXERCISE_COUNT,
  EXERCISE_CATEGORIES,
  getExerciseById,
  findSimilarExercises,
  filterExercises,
  hasActiveFilters,
  hasCoach3dAnimation,
  MOVEMENT_PATTERNS,
  type Difficulty,
  type EquipmentId,
  type ExerciseCategoryId,
  type LibraryExercise,
  type MovementPatternId,
} from "@/lib/exercises";
import { exerciseName, exerciseContent } from "@/lib/exercises/i18n";
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
  muscles: MuscleGroupId[];
  equipment: EquipmentId[];
  only3d: boolean;
  onToggleMuscle: (m: MuscleGroupId) => void;
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
          {MUSCLE_GROUPS.map((m) => (
            <FilterChip
              key={m.id}
              active={muscles.includes(m.id)}
              onClick={() => onToggleMuscle(m.id)}
              ariaLabel={t.muscleChipAria(t.muscleLabel(m.id))}
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
  exercise: LibraryExercise;
  onDetails: (ex: LibraryExercise) => void;
  onOpen3d: (ex: LibraryExercise) => void;
}) {
  const t = useStrings(libraryStrings);
  const locale = useLocale();
  const linked = hasCoach3dAnimation(exercise);
  const content = exerciseContent(exercise, locale);

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
          {linked ? (
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
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {exercise.compound ? t.compoundLabel : t.isolationLabel}
        </span>
      </div>

      <p className="mt-2.5 flex-1 text-xs leading-6 text-muted-foreground">{content.summary}</p>

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
        {linked && (
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

function ExerciseDetailsDialog({
  exercise,
  open,
  onOpenChange,
  onOpen3d,
  onDetails,
}: {
  exercise: LibraryExercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpen3d: (ex: LibraryExercise) => void;
  onDetails: (ex: LibraryExercise) => void;
}) {
  const t = useStrings(libraryStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const similar = useMemo(
    () => (exercise ? findSimilarExercises(exercise, 3) : []),
    [exercise]
  );

  if (!exercise) return null;
  const linked = hasCoach3dAnimation(exercise);
  const content = exerciseContent(exercise, locale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base">{exerciseName(exercise, locale)}</DialogTitle>
            <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {t.categoryLabel(exercise.category)}
            </span>
            <DifficultyBadge level={exercise.difficulty} />
          </div>
          <DialogDescription
            dir={locale === "fa" ? "ltr" : "rtl"}
            className="text-start text-[11px]"
          >
            {exerciseName(exercise, locale === "fa" ? "en" : "fa")}
          </DialogDescription>
        </DialogHeader>

        {/* معرفی */}
        <div>
          <h4 className="text-xs font-bold text-foreground">{t.aboutTitle}</h4>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{content.summary}</p>
        </div>

        {/* مشخصات فنی */}
        <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
            <span className="block text-[10px] font-bold text-muted-foreground">{t.categorySpecLabel}</span>
            <span className="mt-0.5 block font-semibold text-foreground">{t.categoryLabel(exercise.category)}</span>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
            <span className="block text-[10px] font-bold text-muted-foreground">{t.patternSpecLabel}</span>
            <span className="mt-0.5 block font-semibold text-foreground">{t.patternLabel(exercise.pattern)}</span>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
            <span className="block text-[10px] font-bold text-muted-foreground">{t.structureSpecLabel}</span>
            <span className="mt-0.5 block font-semibold text-foreground">
              {exercise.compound ? t.compoundLabel : t.isolationLabel}
            </span>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
            <span className="block text-[10px] font-bold text-muted-foreground">{t.levelSpecLabel}</span>
            <span className="mt-0.5 block font-semibold text-foreground">{shared.difficultyLabel(exercise.difficulty)}</span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-2 text-[11px] text-muted-foreground">
          <Wrench className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-bold text-foreground">{t.equipmentFieldLabel}</span>{" "}
            {t.equipmentList(exercise.equipment)}
          </span>
        </div>

        {/* عضلات */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground">{t.primaryMusclesLabel}</span>
            {exercise.primaryMuscles.map((m) => (
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
            {exercise.secondaryMuscles.length > 0 ? (
              exercise.secondaryMuscles.map((m) => (
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
            {content.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                  {localeNumber(i + 1, locale)}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        {/* تنفس */}
        <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Wind className="size-3.5 text-primary" aria-hidden="true" />
            {t.breathingTitle}
          </h4>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{content.breathing}</p>
        </div>

        {/* اشتباهات رایج */}
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <TriangleAlert className="size-3.5 text-rose-300" aria-hidden="true" />
            {t.mistakesTitle}
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {content.mistakes.map((mistake, i) => (
              <li key={i} className="text-xs leading-6 text-muted-foreground">
                — {mistake}
              </li>
            ))}
          </ul>
        </div>

        {/* نکات ایمنی */}
        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <ShieldCheck className="size-3.5 text-amber-300" aria-hidden="true" />
            {t.safetyTitle}
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {content.safety.map((tip, i) => (
              <li key={i} className="text-xs leading-6 text-muted-foreground">
                — {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* حرکات مشابه */}
        {similar.length > 0 && (
          <div>
            <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Repeat2 className="size-3.5 text-primary" aria-hidden="true" />
              {t.similarTitle}
            </h4>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {similar.map((s) => (
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
          {linked ? (
            <Button
              className="h-9 w-full text-xs font-bold text-primary-foreground"
              onClick={() => {
                onOpen3d(exercise);
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
  const setExercise = useCoach3DStore((s) => s.setExercise);
  const openLibraryExercise = useAppStore((s) => s.openLibraryExercise);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategoryId | "all">("all");
  const [muscles, setMuscles] = useState<MuscleGroupId[]>([]);
  const [equipment, setEquipment] = useState<EquipmentId[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [pattern, setPattern] = useState<MovementPatternId | "all">("all");
  const [only3d, setOnly3d] = useState(false);

  // انتخاب دیالوگ از store مرکزی است تا از بخش‌های دیگر برنامه هم قابل
  // باز شدن باشد (deep-link)؛ بستن دیالوگ همان پاک‌کردن store است.
  const librarySelectedId = useAppStore((s) => s.librarySelectedId);
  const closeLibraryExercise = useAppStore((s) => s.closeLibraryExercise);
  const selected = librarySelectedId ? getExerciseById(librarySelectedId) ?? null : null;
  const dialogOpen = selected !== null;

  const filterState = useMemo(
    () => ({ query, category, muscles, equipment, difficulty, pattern, only3d }),
    [query, category, muscles, equipment, difficulty, pattern, only3d]
  );

  const filtered = useMemo(() => filterExercises(filterState), [filterState]);
  const hasFilters = hasActiveFilters(filterState);

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
    (ex: LibraryExercise) => {
      openLibraryExercise(ex.id);
    },
    [openLibraryExercise]
  );

  /** انتقال واقعی به مربی سه‌بعدی — فقط برای حرکات دارای انیمیشن اختصاصی */
  const openIn3d = useCallback(
    (ex: LibraryExercise) => {
      if (!hasCoach3dAnimation(ex) || !ex.coach3dId) return;
      setExercise(ex.coach3dId);
      setActiveView("coach3d");
    },
    [setExercise, setActiveView]
  );

  const onToggleMuscle = useCallback(
    (m: MuscleGroupId) => setMuscles((prev) => toggleInArray(prev, m)),
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
              {t.countBadge(EXERCISE_COUNT)}
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
          <span className="font-bold text-foreground">{localeNumber(EXERCISE_COUNT, locale)}</span>{" "}
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
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ex) => (
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

      <ExerciseDetailsDialog
        exercise={selected}
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeLibraryExercise();
        }}
        onOpen3d={openIn3d}
        onDetails={openDetails}
      />
    </motion.div>
  );
}
