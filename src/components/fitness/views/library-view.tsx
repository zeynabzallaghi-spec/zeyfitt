"use client";

/**
 * کتابخانه حرکات — بانک ساختاریافته ۴۸ حرکت با جست‌وجوی واقعی فارسی/انگلیسی،
 * فیلترهای ترکیبی (دسته، عضله، تجهیزات، سطح، الگو، سه‌بعدی) و دیالوگ جزئیات
 * کامل. داده‌ها از src/lib/exercises خوانده می‌شوند و هیچ داده نمونه‌ای در
 * این صفحه وجود ندارد.
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
  categoryFa,
  categoryMonogram,
  EQUIPMENT_TYPES,
  EXERCISE_COUNT,
  EXERCISE_CATEGORIES,
  findSimilarExercises,
  filterExercises,
  hasActiveFilters,
  hasCoach3dAnimation,
  MOVEMENT_PATTERNS,
  patternFa,
  equipmentFa,
  type Difficulty,
  type EquipmentId,
  type ExerciseCategoryId,
  type LibraryExercise,
  type MovementPatternId,
} from "@/lib/exercises";
import { ViewIntro } from "../shared/view-intro";
import { EmptyState } from "../shared/empty-state";
import { DifficultyBadge, StageBadge } from "../shared/badges";
import { getNavItem } from "@/lib/nav";

const DIFFICULTY_OPTIONS: Difficulty[] = ["مبتدی", "متوسط", "پیشرفته"];
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
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-muted-foreground">عضله هدف</span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="فیلتر عضله هدف">
          {MUSCLE_GROUPS.map((m) => (
            <FilterChip
              key={m.id}
              active={muscles.includes(m.id)}
              onClick={() => onToggleMuscle(m.id)}
              ariaLabel={`عضله ${m.fa}`}
            >
              {m.fa}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold text-muted-foreground">تجهیزات</span>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="فیلتر تجهیزات">
          {EQUIPMENT_TYPES.map((e) => (
            <FilterChip
              key={e.id}
              active={equipment.includes(e.id)}
              onClick={() => onToggleEquipment(e.id)}
              ariaLabel={`تجهیزات ${e.fa}`}
            >
              {e.fa}
            </FilterChip>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="فیلتر نمایش سه‌بعدی">
        <FilterChip
          active={only3d}
          onClick={onToggleOnly3d}
          ariaLabel="فقط حرکات دارای نمایش سه‌بعدی"
        >
          <span className="inline-flex items-center gap-1.5">
            <Box className="size-3.5" aria-hidden="true" />
            فقط حرکات با نمایش سه‌بعدی
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
  const linked = hasCoach3dAnimation(exercise);

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
              دارای نمایش سه‌بعدی
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              نمایش سه‌بعدی در دسترس نیست
            </span>
          )}
          <DifficultyBadge level={exercise.difficulty} />
        </div>
      </div>

      <h3 className="mt-4 text-sm font-bold text-foreground">{exercise.fa}</h3>
      <p dir="ltr" className="mt-0.5 text-start text-[10px] font-medium text-muted-foreground/70">
        {exercise.en}
      </p>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {categoryFa(exercise.category)}
        </span>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {patternFa(exercise.pattern)}
        </span>
        <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          {exercise.compound ? "ترکیبی" : "تک‌مفصلی"}
        </span>
      </div>

      <p className="mt-2.5 flex-1 text-xs leading-6 text-muted-foreground">{exercise.summary}</p>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-border/50 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground">عضلات اصلی:</span>
          {exercise.primaryMuscles.map((m) => (
            <span
              key={m}
              className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {MUSCLE_GROUPS.find((g) => g.id === m)?.fa ?? m}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          <span className="font-bold">تجهیزات:</span>{" "}
          {exercise.equipment.map(equipmentFa).join(" ، ")}
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
          جزئیات حرکت
        </Button>
        {linked && (
          <Button
            size="sm"
            className="h-8 flex-1 text-xs font-semibold text-primary-foreground"
            onClick={() => onOpen3d(exercise)}
          >
            <Box className="size-3.5" aria-hidden="true" />
            مربی سه‌بعدی
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
  const similar = useMemo(
    () => (exercise ? findSimilarExercises(exercise, 3) : []),
    [exercise]
  );

  if (!exercise) return null;
  const linked = hasCoach3dAnimation(exercise);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-xl overflow-y-auto p-5 sm:p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base">{exercise.fa}</DialogTitle>
            <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {categoryFa(exercise.category)}
            </span>
            <DifficultyBadge level={exercise.difficulty} />
          </div>
          <DialogDescription dir="ltr" className="text-start text-[11px]">
            {exercise.en}
          </DialogDescription>
        </DialogHeader>

        {/* معرفی */}
        <div>
          <h4 className="text-xs font-bold text-foreground">معرفی حرکت</h4>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{exercise.summary}</p>
        </div>

        {/* مشخصات فنی */}
        <div className="grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
            <span className="block text-[10px] font-bold text-muted-foreground">دسته</span>
            <span className="mt-0.5 block font-semibold text-foreground">{categoryFa(exercise.category)}</span>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
            <span className="block text-[10px] font-bold text-muted-foreground">الگوی حرکتی</span>
            <span className="mt-0.5 block font-semibold text-foreground">{patternFa(exercise.pattern)}</span>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
            <span className="block text-[10px] font-bold text-muted-foreground">ساختار</span>
            <span className="mt-0.5 block font-semibold text-foreground">
              {exercise.compound ? "ترکیبی" : "تک‌مفصلی"}
            </span>
          </div>
          <div className="rounded-lg border border-border/50 bg-secondary/30 p-2.5">
            <span className="block text-[10px] font-bold text-muted-foreground">سطح</span>
            <span className="mt-0.5 block font-semibold text-foreground">{exercise.difficulty}</span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2.5 py-2 text-[11px] text-muted-foreground">
          <Wrench className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-bold text-foreground">تجهیزات:</span>{" "}
            {exercise.equipment.map(equipmentFa).join(" ، ")}
          </span>
        </div>

        {/* عضلات */}
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground">عضلات اصلی:</span>
            {exercise.primaryMuscles.map((m) => (
              <span
                key={m}
                className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary"
              >
                {MUSCLE_GROUPS.find((g) => g.id === m)?.fa ?? m}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold text-muted-foreground">عضلات کمکی:</span>
            {exercise.secondaryMuscles.length > 0 ? (
              exercise.secondaryMuscles.map((m) => (
                <span
                  key={m}
                  className="rounded-md border border-border/40 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {MUSCLE_GROUPS.find((g) => g.id === m)?.fa ?? m}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-muted-foreground/70">—</span>
            )}
          </div>
        </div>

        {/* مراحل اجرا */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <ListChecks className="size-3.5 text-primary" aria-hidden="true" />
            راهنمای اجرای صحیح
          </h4>
          <ol className="mt-2.5 flex flex-col gap-2">
            {exercise.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                  {(i + 1).toLocaleString("fa-IR")}
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
            روش تنفس
          </h4>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{exercise.breathing}</p>
        </div>

        {/* اشتباهات رایج */}
        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <TriangleAlert className="size-3.5 text-rose-300" aria-hidden="true" />
            اشتباهات رایج
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {exercise.mistakes.map((mistake, i) => (
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
            نکات ایمنی و اصلاحات متداول
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {exercise.safety.map((tip, i) => (
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
              حرکات مشابه
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
                  {s.fa}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] leading-5 text-muted-foreground/70">
              پیشنهاد بر اساس هم‌دسته بودن، هم‌پوشانی عضلات و تجهیزات مشترک است؛ مناسب‌بودن برای
              شرایط فردی را با بررسی جزئیات همان حرکت بسنجید.
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
              مشاهده در مربی سه‌بعدی
            </Button>
          ) : (
            <p className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-[11px] leading-6 text-muted-foreground">
              برای این حرکت هنوز انیمیشن اختصاصی سه‌بعدی ساخته نشده است؛ آموزش آن از طریق همین
              راهنمای متنی انجام می‌شود و هیچ انیمیشن جایگزینی برای آن پخش نخواهد شد.
            </p>
          )}
          <Button
            variant="outline"
            className="h-9 w-full border-border/70 text-xs font-semibold hover:border-primary/40 hover:text-primary"
            onClick={() => onOpenChange(false)}
          >
            <RotateCcw className="size-3.5" aria-hidden="true" />
            بازگشت به کتابخانه
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- نمای اصلی ------------------------------- */

export function LibraryView() {
  const item = getNavItem("library");
  const setActiveView = useAppStore((s) => s.setActiveView);
  const setExercise = useCoach3DStore((s) => s.setExercise);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ExerciseCategoryId | "all">("all");
  const [muscles, setMuscles] = useState<MuscleGroupId[]>([]);
  const [equipment, setEquipment] = useState<EquipmentId[]>([]);
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [pattern, setPattern] = useState<MovementPatternId | "all">("all");
  const [only3d, setOnly3d] = useState(false);

  const [selected, setSelected] = useState<LibraryExercise | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const openDetails = useCallback((ex: LibraryExercise) => {
    setSelected(ex);
    setDialogOpen(true);
  }, []);

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
              {EXERCISE_COUNT.toLocaleString("fa-IR")} حرکت ساختاریافته
            </span>
            <StageBadge stage={5} label="مرحله ۵ از نقشه راه" />
          </>
        }
      />

      {/* ------------------------- جست‌وجو و فیلترها ------------------------- */}
      <section aria-label="جست‌وجو و فیلتر" className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جست‌وجوی نام حرکت (فارسی یا انگلیسی)…"
              className="ps-9"
              aria-label="جست‌وجوی حرکت بر اساس نام فارسی یا انگلیسی"
            />
          </div>
          <Select value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty | "all")}>
            <SelectTrigger className="w-full lg:w-40" aria-label="فیلتر سطح دشواری">
              <SelectValue placeholder="سطح دشواری" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه سطح‌ها</SelectItem>
              {DIFFICULTY_OPTIONS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={pattern} onValueChange={(v) => setPattern(v as MovementPatternId | "all")}>
            <SelectTrigger className="w-full lg:w-52" aria-label="فیلتر الگوی حرکتی">
              <SelectValue placeholder="الگوی حرکتی" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه الگوها</SelectItem>
              {PATTERN_OPTIONS.map((p) => (
                <SelectItem key={p} value={p}>
                  {patternFa(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* دسته‌بندی — همیشه نمایان */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="فیلتر دسته‌بندی">
          <FilterChip
            active={category === "all"}
            onClick={() => setCategory("all")}
            ariaLabel="همه دسته‌ها"
          >
            همه
          </FilterChip>
          {EXERCISE_CATEGORIES.map((cat) => (
            <FilterChip
              key={cat.id}
              active={category === cat.id}
              onClick={() => setCategory(cat.id)}
              ariaLabel={`دسته ${cat.fa}`}
            >
              {cat.fa}
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
                aria-label="باز و بسته کردن فیلترهای تکمیلی"
              >
                <span className="flex items-center gap-2">
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  فیلترهای تکمیلی (عضله، تجهیزات، سه‌بعدی)
                </span>
                {advancedActiveCount > 0 && (
                  <span className="inline-flex items-center rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                    {advancedActiveCount.toLocaleString("fa-IR")} فعال
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
          نمایش <span className="font-bold text-foreground">{filtered.length.toLocaleString("fa-IR")}</span> حرکت
          از <span className="font-bold text-foreground">{EXERCISE_COUNT.toLocaleString("fa-IR")}</span> حرکت بانک
          {hasFilters && <span> — فیلترها فعال هستند</span>}
        </p>
        {hasFilters && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 border-border/70 px-2.5 text-[11px] font-semibold hover:border-primary/40 hover:text-primary"
            onClick={resetFilters}
          >
            <RotateCcw className="size-3" aria-hidden="true" />
            پاک‌کردن فیلترها
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
            title="حرکتی یافت نشد"
            description="با ترکیب فعلی جست‌وجو و فیلترها هیچ حرکتی مطابقت ندارد. عبارت جست‌وجو را کوتاه‌تر کنید، برخی فیلترها را بردارید یا همه را بازنشانی کنید."
            action={
              <Button
                variant="outline"
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
                onClick={resetFilters}
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                پاک‌کردن همه فیلترها
              </Button>
            }
          />
        </div>
      )}

      <ExerciseDetailsDialog
        exercise={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onOpen3d={openIn3d}
        onDetails={openDetails}
      />
    </motion.div>
  );
}
