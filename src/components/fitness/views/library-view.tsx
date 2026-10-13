"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Dumbbell, Box, ListChecks, Wind, TriangleAlert, Repeat, Wrench, SearchX } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import {
  EXERCISE_CATEGORIES,
  DIFFICULTY_LEVELS,
  SAMPLE_EXERCISES,
  type SampleExercise,
} from "@/lib/sample-data";
import { ViewIntro } from "../shared/view-intro";
import { EmptyState } from "../shared/empty-state";
import { DemoBadge, DifficultyBadge, StageBadge } from "../shared/badges";
import { getNavItem } from "@/lib/nav";

function ExerciseCard({
  exercise,
  onDetails,
}: {
  exercise: SampleExercise;
  onDetails: (ex: SampleExercise) => void;
}) {
  const { toast } = useToast();
  const setActiveView = useAppStore((s) => s.setActiveView);

  const open3d = () => {
    setActiveView("coach3d");
    toast({
      title: "مربی سه‌بعدی در مرحله ۴ فعال می‌شود",
      description: `اجرای سه‌بعدی «${exercise.fa}» پس از اتصال موتور سه‌بعدی در دسترس قرار می‌گیرد. صحنه فعلی حالت آماده‌سازی است.`,
    });
  };

  return (
    <article className="group flex flex-col rounded-2xl border border-border/60 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/50 bg-secondary/40 text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
          <Dumbbell className="size-4.5" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {exercise.category}
          </span>
          <DifficultyBadge level={exercise.difficulty} />
        </div>
      </div>

      <h3 className="mt-4 text-sm font-bold text-foreground">{exercise.fa}</h3>
      <p dir="ltr" className="mt-0.5 text-[10px] font-medium text-muted-foreground/70 text-start">
        {exercise.en}
      </p>
      <p className="mt-2.5 flex-1 text-xs leading-6 text-muted-foreground">{exercise.summary}</p>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-border/50 pt-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground">اصلی:</span>
          {exercise.primary.map((m) => (
            <span
              key={m}
              className="rounded-md border border-primary/25 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
            >
              {m}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-muted-foreground">فرعی:</span>
          {exercise.secondary.map((m) => (
            <span
              key={m}
              className="rounded-md border border-border/40 bg-secondary/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              {m}
            </span>
          ))}
        </div>
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
        <Button
          size="sm"
          className="h-8 flex-1 text-xs font-semibold text-primary-foreground"
          onClick={open3d}
        >
          <Box className="size-3.5" aria-hidden="true" />
          مربی سه‌بعدی
        </Button>
      </div>
    </article>
  );
}

function ExerciseDetailsDialog({
  exercise,
  open,
  onOpenChange,
}: {
  exercise: SampleExercise | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!exercise) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto p-6">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <DialogTitle className="text-base">{exercise.fa}</DialogTitle>
            <span className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {exercise.category}
            </span>
            <DifficultyBadge level={exercise.difficulty} />
          </div>
          <DialogDescription dir="ltr" className="text-start text-[11px]">
            {exercise.en}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs leading-6 text-muted-foreground">{exercise.summary}</p>

        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/40 px-2.5 py-1.5 text-muted-foreground">
            <Wrench className="size-3.5" aria-hidden="true" />
            تجهیزات: {exercise.equipment}
          </span>
          <span className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-1.5 font-bold text-primary">
            <Repeat className="size-3.5" aria-hidden="true" />
            {exercise.sets}
          </span>
        </div>

        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <ListChecks className="size-3.5 text-primary" aria-hidden="true" />
            مراحل اجرا
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

        <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <Wind className="size-3.5 text-primary" aria-hidden="true" />
            تنفس صحیح
          </h4>
          <p className="mt-1.5 text-xs leading-6 text-muted-foreground">{exercise.breathing}</p>
        </div>

        <div className="rounded-xl border border-rose-400/20 bg-rose-400/5 p-3">
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <TriangleAlert className="size-3.5 text-rose-300" aria-hidden="true" />
            خطاهای رایج
          </h4>
          <ul className="mt-1.5 flex flex-col gap-1">
            {exercise.mistakes.map((mistake, i) => (
              <li key={i} className="text-xs leading-6 text-muted-foreground">
                — {mistake}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/70">
          این اطلاعات، نمونه نمایشی ساختار نهایی بانک حرکات است.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export function LibraryView() {
  const item = getNavItem("library");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("همه");
  const [difficulty, setDifficulty] = useState<string>("همه سطح‌ها");
  const [selected, setSelected] = useState<SampleExercise | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SAMPLE_EXERCISES.filter((ex) => {
      const matchQuery =
        q.length === 0 || ex.fa.includes(q) || ex.en.toLowerCase().includes(q);
      const matchCategory = category === "همه" || ex.category === category;
      const matchDifficulty = difficulty === "همه سطح‌ها" || ex.difficulty === difficulty;
      return matchQuery && matchCategory && matchDifficulty;
    });
  }, [query, category, difficulty]);

  const openDetails = (ex: SampleExercise) => {
    setSelected(ex);
    setDialogOpen(true);
  };

  const hasActiveFilter = query.trim() !== "" || category !== "همه" || difficulty !== "همه سطح‌ها";

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
            <DemoBadge>۶ حرکت نمونه از ۴۰+</DemoBadge>
            <StageBadge stage={6} />
          </>
        }
      />

      {/* نوار ابزار جست‌وجو و فیلتر — کاملاً فعال روی داده نمونه */}
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
              placeholder="جست‌وجوی حرکت (فارسی یا انگلیسی)…"
              className="ps-9"
              aria-label="جست‌وجوی حرکت"
            />
          </div>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-full lg:w-44" aria-label="فیلتر سطح دشواری">
              <SelectValue placeholder="سطح دشواری" />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="فیلتر دسته‌بندی">
          {EXERCISE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                category === cat
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* شمارش نتایج */}
      <p className="flex flex-wrap items-center gap-2 px-1 text-[11px] text-muted-foreground">
        نمایش <span className="font-bold text-foreground">{filtered.length.toLocaleString("fa-IR")}</span> حرکت
        از <span className="font-bold text-foreground">{SAMPLE_EXERCISES.length.toLocaleString("fa-IR")}</span> حرکت نمونه
        — نسخه کامل با بیش از ۴۰ حرکت و جزئیات علمی در مرحله ۶ ساخته می‌شود.
      </p>

      {/* شبکه حرکت‌ها */}
      {filtered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((ex) => (
            <ExerciseCard key={ex.id} exercise={ex} onDetails={openDetails} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-border/60 bg-card">
          <EmptyState
            icon={SearchX}
            title="حرکتی یافت نشد"
            description="با ترکیب فعلی جست‌وجو و فیلترها هیچ حرکتی مطابقت ندارد. عبارت جست‌وجو را کوتاه‌تر کنید یا فیلترها را بازنشانی کنید."
            action={
              <Button
                variant="outline"
                className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
                onClick={() => {
                  setQuery("");
                  setCategory("همه");
                  setDifficulty("همه سطح‌ها");
                }}
              >
                بازنشانی فیلترها
              </Button>
            }
          />
        </div>
      )}

      <ExerciseDetailsDialog
        exercise={selected}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </motion.div>
  );
}
