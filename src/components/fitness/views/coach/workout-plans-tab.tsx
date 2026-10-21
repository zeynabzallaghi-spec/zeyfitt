"use client";

/**
 * تب «برنامه‌های تمرینی من» — سازنده و مدیریت برنامه‌های اختصاصی مربی.
 * حرکات فقط از کتابخانه واقعی انتخاب می‌شوند؛ نام‌ها سمت سرور snapshot
 * می‌شوند و داده نمایشی کلاینت هرگز معتبر نیست. پیش‌نمایش با همان
 * رندرکننده نمای دانشجو ساخته می‌شود تا هر دو دید یکسان باشند.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Plus,
  Trash2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  CalendarDays,
  Save,
  X,
} from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { ViewIntro } from "../../shared/view-intro";
import { EmptyState } from "../../shared/empty-state";
import { ExercisePicker } from "@/components/fitness/shared/exercise-picker";
import { useExerciseLibraryStore } from "@/store/exercise-library-store";
import { CoachWorkoutContentView } from "./plan-content-view";
import { PlanStatusBadge, PlanCardActions, PlanListFilters, applyPlanFilters, type PlanTypeFilter } from "./plans-shared";
import {
  useCoachWorkoutPlans,
  createCoachWorkoutPlan,
  updateCoachWorkoutPlan,
  getCoachWorkoutPlan,
} from "@/hooks/use-coach-plans";
import { useCoachExercises } from "@/hooks/use-p196";
import type {
  BuilderDayInput,
  BuilderExerciseInput,
  CoachPlanDetailClient,
  CoachPlanListItemClient,
  CoachWorkoutContentClient,
} from "@/lib/coaching/plans-client";

const GOALS = ["fat_loss", "muscle_gain", "strength", "maintain", "fitness"] as const;
const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

function emptyExercise(): BuilderExerciseInput {
  return {
    exerciseId: "",
    faName: "",
    enName: "",
    category: "",
    sets: "3",
    repsMin: "10",
    repsMax: "12",
    restSeconds: "90",
    note: "",
    suggestedWeightKg: "",
  };
}

function emptyDay(): BuilderDayInput {
  return { title: "", exercises: [emptyExercise()] };
}

interface WorkoutForm {
  title: string;
  description: string;
  goal: string;
  difficulty: string;
  durationMinutes: string;
  days: BuilderDayInput[];
}

function emptyForm(): WorkoutForm {
  return {
    title: "",
    description: "",
    goal: "fitness",
    difficulty: "beginner",
    durationMinutes: "45",
    days: [emptyDay()],
  };
}

function formFromDetail(detail: CoachPlanDetailClient): WorkoutForm {
  if (!("days" in detail.content)) {
    return emptyForm();
  }
  const content = detail.content as CoachWorkoutContentClient;
  const days = content.days.map((d) => ({
    title: d.title,
    exercises: d.exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      faName: ex.faName,
      enName: ex.enName,
      category: ex.category,
      sets: String(ex.sets),
      repsMin: String(ex.repsMin),
      repsMax: String(ex.repsMax),
      restSeconds: String(ex.restSeconds),
      note: ex.note ?? "",
      suggestedWeightKg:
        typeof ex.suggestedWeightKg === "number" && ex.suggestedWeightKg > 0
          ? String(ex.suggestedWeightKg)
          : "",
    })),
  }));
  return {
    title: detail.title,
    description: detail.description,
    goal: detail.goal,
    difficulty: detail.meta.difficulty ?? "beginner",
    durationMinutes: String(detail.meta.durationMinutes ?? 45),
    days: days.length > 0 ? days : [emptyDay()],
  };
}

/* ------------------------------ انتخاب حرکت ------------------------------ */

function ExercisePickerDialog({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (ex: { id: string; fa: string; en: string; category: string }) => void;
}) {
  const t = useStrings(coachPlansStrings);
  // بانک شخصی مربی — مرحله ۱۹.۶؛ سوییچ منبع در انتخابگر نمایش داده میشود
  const { exercises: personal } = useCoachExercises(open);
  const personalList = (personal ?? []).map((ex) => ({
    id: ex.id,
    faName: ex.faName,
    enName: ex.enName,
    category: ex.category,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">{t.exercisePickerTitle}</DialogTitle>
        </DialogHeader>
        {/* بانک عمومی کامل مرحله ۱۸ + بانک شخصی مرحله ۱۹.۶ — جست‌وجو دو-زبانه */}
        <ExercisePicker
          personalExercises={personalList}
          onPick={(id) => {
            if (id.startsWith("cex-")) {
              const personalId = id.slice(4);
              const found = personalList.find((p) => p.id === personalId);
              if (found) {
                onPick({ id, fa: found.faName, en: found.enName, category: found.category });
              }
            } else {
              const card = useExerciseLibraryStore.getState().getById(id);
              if (card) {
                onPick({ id: card.id, fa: card.fa, en: card.en, category: card.category });
              }
            }
            onOpenChange(false);
          }}
          heightClass="h-72"
        />
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ دیالوگ سازنده ------------------------------ */

function WorkoutBuilderDialog({
  open,
  onOpenChange,
  planId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null یعنی ساخت جدید */
  planId: string | null;
  onSaved: () => void;
}) {
  const t = useStrings(coachPlansStrings);
  const locale = useLocale();
  const { toast } = useToast();
  const [form, setForm] = useState<WorkoutForm>(emptyForm);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [loadedDetail, setLoadedDetail] = useState<CoachPlanDetailClient | null>(null);

  // پر کردن فرم هنگام ویرایش — الگوی همگام‌سازی در رندر (بدون effect)
  if (open && planId && loadedFrom !== planId) {
    setLoadedFrom(planId);
    void (async () => {
      const result = await getCoachWorkoutPlan(planId);
      if (result.ok) {
        setLoadedDetail(result.data.plan);
        setForm(formFromDetail(result.data.plan));
      } else {
        toast({ title: t.loadError, description: result.message, variant: "destructive" });
        onOpenChange(false);
      }
    })();
  }
  if (open && !planId && loadedFrom !== "new") {
    setLoadedFrom("new");
    setForm(emptyForm());
    setLoadedDetail(null);
  }
  if (!open && loadedFrom !== null) {
    setLoadedFrom(null);
    setLoadedDetail(null);
  }

  const patchDay = (idx: number, patch: Partial<BuilderDayInput>) => {
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    }));
  };
  const patchExercise = (dayIdx: number, exIdx: number, patch: Partial<BuilderExerciseInput>) => {
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) =>
        i === dayIdx
          ? { ...d, exercises: d.exercises.map((e, j) => (j === exIdx ? { ...e, ...patch } : e)) }
          : d
      ),
    }));
  };
  const moveDay = (idx: number, dir: -1 | 1) => {
    setForm((f) => {
      const days = [...f.days];
      const target = idx + dir;
      if (target < 0 || target >= days.length) return f;
      [days[idx], days[target]] = [days[target], days[idx]];
      return { ...f, days };
    });
  };
  const moveExercise = (dayIdx: number, exIdx: number, dir: -1 | 1) => {
    setForm((f) => ({
      ...f,
      days: f.days.map((d, i) => {
        if (i !== dayIdx) return d;
        const exercises = [...d.exercises];
        const target = exIdx + dir;
        if (target < 0 || target >= exercises.length) return d;
        [exercises[exIdx], exercises[target]] = [exercises[target], exercises[exIdx]];
        return { ...d, exercises };
      }),
    }));
  };

  const buildPayload = () => {
    return {
      title: form.title.trim(),
      description: form.description.trim(),
      goal: form.goal,
      difficulty: form.difficulty,
      durationMinutes: Number(form.durationMinutes),
      days: form.days.map((d) => ({
        title: d.title.trim(),
        exercises: d.exercises
          .filter((e) => e.exerciseId)
          .map((e) => ({
            exerciseId: e.exerciseId,
            sets: Number(e.sets),
            repsMin: Number(e.repsMin),
            repsMax: Number(e.repsMax),
            restSeconds: Number(e.restSeconds),
            note: e.note.trim() || null,
            suggestedWeightKg: e.suggestedWeightKg.trim() ? Number(e.suggestedWeightKg) : null,
          })),
      })),
    };
  };

  const save = async () => {
    if (saving) return;
    if (form.title.trim().length < 2) {
      toast({ title: t.formErrorsTitle, description: t.invalidTitle, variant: "destructive" });
      return;
    }
    if (form.days.length === 0 || form.days.every((d) => d.exercises.every((e) => !e.exerciseId))) {
      toast({ title: t.formErrorsTitle, description: t.invalidExercises, variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = buildPayload();
    const result = planId
      ? await updateCoachWorkoutPlan(planId, payload)
      : await createCoachWorkoutPlan(payload);
    setSaving(false);
    if (result.ok) {
      toast({ title: t.draftSavedTitle, description: t.draftSavedNote });
      onOpenChange(false);
      onSaved();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[100dvh] max-h-[100dvh] w-full max-w-none rounded-none border-0 overflow-y-auto sm:rounded-none">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {planId ? t.builderTitleEdit : t.builderTitleNew}
          </DialogTitle>
          <DialogDescription className="text-[11px] leading-5">{t.snapshotNote}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* اطلاعات پایه */}
          <div className="space-y-3 rounded-xl border border-border/60 bg-secondary/20 p-3">
            <p className="text-xs font-bold text-foreground">{t.basicInfoTitle}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cwp-title" className="text-[11px] font-bold text-foreground">{t.titleLabel}</Label>
                <Input
                  id="cwp-title"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value.slice(0, 120) }))}
                  placeholder={t.titlePlaceholder}
                  maxLength={120}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cwp-desc" className="text-[11px] font-bold text-foreground">{t.descriptionLabel}</Label>
                <Textarea
                  id="cwp-desc"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                  placeholder={t.descriptionPlaceholder}
                  rows={2}
                  maxLength={2000}
                  className="resize-none text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">{t.goalSelect}</Label>
                <Select value={form.goal} onValueChange={(v) => setForm((f) => ({ ...f, goal: v }))}>
                  <SelectTrigger className="w-full text-xs" aria-label={t.goalSelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g} value={g} className="text-xs">
                        {t.workoutGoalLabel(g)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">{t.difficultySelect}</Label>
                <Select value={form.difficulty} onValueChange={(v) => setForm((f) => ({ ...f, difficulty: v }))}>
                  <SelectTrigger className="w-full text-xs" aria-label={t.difficultySelect}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d} className="text-xs">
                        {t.difficultyOf(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cwp-duration" className="text-[11px] font-bold text-foreground">
                  {t.durationInputLabel} ({t.durationUnit})
                </Label>
                <Input
                  id="cwp-duration"
                  type="number"
                  min={10}
                  max={300}
                  dir="ltr"
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          {/* روزها */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-foreground">{t.daysSectionTitle}</p>
            {form.days.map((day, dayIdx) => (
              <div key={dayIdx} className="space-y-2.5 rounded-xl border border-border/60 bg-card/60 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                    {t.dayNumber(dayIdx + 1)}
                  </Badge>
                  <Input
                    dir={locale === "fa" ? "rtl" : "ltr"}
                    value={day.title}
                    onChange={(e) => patchDay(dayIdx, { title: e.target.value.slice(0, 80) })}
                    placeholder={t.dayTitlePlaceholder}
                    maxLength={80}
                    className="text-xs"
                    aria-label={t.dayTitleLabel}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => moveDay(dayIdx, -1)}
                    disabled={dayIdx === 0}
                    aria-label={t.moveUp}
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => moveDay(dayIdx, 1)}
                    disabled={dayIdx === form.days.length - 1}
                    aria-label={t.moveDown}
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0 text-rose-300 hover:bg-rose-400/10"
                    onClick={() =>
                      setForm((f) => ({ ...f, days: f.days.filter((_, i) => i !== dayIdx) }))
                    }
                    disabled={form.days.length === 1}
                    aria-label={t.removeDay}
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>

                {day.exercises.map((ex, exIdx) => (
                  <div key={exIdx} className="rounded-lg border border-border/40 bg-secondary/20 p-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 rounded-md border border-border/50 bg-card/60 px-2.5 py-2 text-start text-xs font-bold text-foreground hover:bg-primary/10"
                        onClick={() => setPickerDay(dayIdx)}
                      >
                        {ex.exerciseId ? (
                          <span dir="auto" className="inline-flex items-center gap-1">
                            {locale === "fa" ? ex.faName : ex.enName}
                            {ex.exerciseId.startsWith("cex-") && (
                              <span className="rounded border border-primary/30 bg-primary/10 px-1 text-[8px] font-bold text-primary">
                                {locale === "fa" ? "شخصی" : "Personal"}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="font-normal text-muted-foreground">{t.addExercise}</span>
                        )}
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => moveExercise(dayIdx, exIdx, -1)}
                        disabled={exIdx === 0}
                        aria-label={t.moveUp}
                      >
                        <ArrowUp className="size-3" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => moveExercise(dayIdx, exIdx, 1)}
                        disabled={exIdx === day.exercises.length - 1}
                        aria-label={t.moveDown}
                      >
                        <ArrowDown className="size-3" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-rose-300 hover:bg-rose-400/10"
                        onClick={() => patchDay(dayIdx, { exercises: day.exercises.filter((_, j) => j !== exIdx) })}
                        disabled={day.exercises.length === 1}
                        aria-label={t.removeExercise}
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </Button>
                    </div>

                    {ex.exerciseId && (
                      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">{t.setsLabel}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={30}
                            dir="ltr"
                            value={ex.sets}
                            onChange={(e) => patchExercise(dayIdx, exIdx, { sets: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">{t.repsMinLabel}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={500}
                            dir="ltr"
                            value={ex.repsMin}
                            onChange={(e) => patchExercise(dayIdx, exIdx, { repsMin: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">{t.repsMaxLabel}</Label>
                          <Input
                            type="number"
                            min={1}
                            max={500}
                            dir="ltr"
                            value={ex.repsMax}
                            onChange={(e) => patchExercise(dayIdx, exIdx, { repsMax: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-muted-foreground">
                            {t.restLabel} ({t.restUnit})
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={600}
                            dir="ltr"
                            value={ex.restSeconds}
                            onChange={(e) => patchExercise(dayIdx, exIdx, { restSeconds: e.target.value })}
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="space-y-1 sm:col-span-3">
                          <Label className="text-[10px] font-bold text-muted-foreground">{t.exerciseNoteLabel}</Label>
                          <Input
                            dir={locale === "fa" ? "rtl" : "ltr"}
                            value={ex.note}
                            onChange={(e) => patchExercise(dayIdx, exIdx, { note: e.target.value.slice(0, 200) })}
                            placeholder={t.exerciseNotePlaceholder}
                            maxLength={200}
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => patchDay(dayIdx, { exercises: [...day.exercises, emptyExercise()] })}
                  disabled={day.exercises.length >= 20}
                >
                  <Plus className="me-1 size-3.5" aria-hidden="true" />
                  {t.addExercise}
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setForm((f) => ({ ...f, days: [...f.days, emptyDay()] }))}
              disabled={form.days.length >= 7}
            >
              <Plus className="me-1 size-3.5" aria-hidden="true" />
              {t.addDay}
            </Button>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" onClick={save} disabled={saving}>
              <Save className="me-1 size-3.5" aria-hidden="true" />
              {saving ? t.saving : t.saveDraft}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="me-1 size-3.5" aria-hidden="true" />
              {t.close}
            </Button>
          </div>
        </div>

        <ExercisePickerDialog
          open={pickerDay !== null}
          onOpenChange={(v) => !v && setPickerDay(null)}
          onPick={(picked) => {
            if (pickerDay === null) return;
            const dayIdx = pickerDay;
            setForm((f) => ({
              ...f,
              days: f.days.map((d, i) =>
                i === dayIdx
                  ? {
                      ...d,
                      exercises: d.exercises.map((e) =>
                        e.exerciseId
                          ? e
                          : {
                              ...e,
                              exerciseId: picked.id,
                              faName: picked.fa,
                              enName: picked.en,
                              category: picked.category,
                            }
                      ),
                    }
                  : d
              ),
            }));
            // اگر همه خانه‌ها پر بودند، یک ردیف خالی برای ادامه اضافه کن
            setForm((f) => ({
              ...f,
              days: f.days.map((d, i) =>
                i === dayIdx && d.exercises.every((e) => e.exerciseId) && d.exercises.length < 20
                  ? { ...d, exercises: [...d.exercises, emptyExercise()] }
                  : d
              ),
            }));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ تب اصلی ------------------------------ */

export function CoachWorkoutPlansTab() {
  const t = useStrings(coachPlansStrings);
  const locale = useLocale();
  const { toast } = useToast();
  const { plans, loading, error, refresh } = useCoachWorkoutPlans(true);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [preview, setPreview] = useState<CoachPlanDetailClient | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // فیلتر فهرست بر اساس نام دانشجو و نوع خدمات — مرحله ۲۰
  const [planSearch, setPlanSearch] = useState("");
  const [planTypeFilter, setPlanTypeFilter] = useState<PlanTypeFilter>("all");
  const filteredPlans = applyPlanFilters(plans ?? [], planSearch, planTypeFilter, (p) =>
    p.assignedStudent?.displayName ?? ""
  );
  const item = {
    fa: "برنامه‌های تمرینی من",
    en: "My Workout Plans",
    description: t.workoutListIntro,
    descriptionEn: t.workoutListIntro,
    stage: 16,
    features: [] as string[],
    id: "coachPanel" as const,
    icon: CalendarDays,
  };

  const openPreview = async (plan: CoachPlanListItemClient) => {
    setPreviewLoading(true);
    const result = await getCoachWorkoutPlan(plan.id);
    setPreviewLoading(false);
    if (result.ok) {
      setPreview(result.data.plan);
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  return (
    <div>
      <ViewIntro item={item} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button
          onClick={() => {
            setEditId(null);
            setBuilderOpen(true);
          }}
        >
          <Plus className="me-1 size-4" aria-hidden="true" />
          {t.newWorkoutPlan}
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={refresh} aria-label={t.refresh}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
          ))}
          <span className="sr-only">{t.loading}</span>
        </div>
      ) : error ? (
        <EmptyState
          icon={RefreshCw}
          title={t.loadError}
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={refresh}>
              {t.retry}
            </Button>
          }
        />
      ) : !plans || plans.length === 0 ? (
        <EmptyState icon={CalendarDays} title={t.emptyPlansTitle} description={t.emptyWorkoutPlansNote} />
      ) : (
        <div>
          <PlanListFilters
            search={planSearch}
            onSearch={setPlanSearch}
            typeFilter={planTypeFilter}
            onTypeFilter={setPlanTypeFilter}
            byStudent
          />
          {filteredPlans.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={t.emptyPlansTitle}
              description={locale === "fa" ? "نتیجه‌ای با این فیلترها نیست." : "No results with these filters."}
              compact
            />
          ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="border-border/60 bg-card/70">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{plan.title}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {t.updatedAtLabel}: {localeDateTimeLabel(plan.updatedAt, locale)}
                    </p>
                  </div>
                  <PlanStatusBadge status={plan.status} />
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground">
                  <span>
                    {t.goalLabel}: <span className="font-bold text-foreground">{t.workoutGoalLabel(plan.goal)}</span>
                  </span>
                  <span>
                    {t.difficultyLabel}:{" "}
                    <span className="font-bold text-foreground">{t.difficultyOf(plan.meta.difficulty ?? "")}</span>
                  </span>
                  <span>
                    {t.daysLabel}: <span className="font-bold text-foreground">{plan.meta.daysCount}</span>
                  </span>
                  <span>
                    {t.exercisesCountLabel}:{" "}
                    <span className="font-bold text-foreground">{plan.meta.exercisesCount ?? 0}</span>
                  </span>
                  <span>
                    {t.versionLabel}:{" "}
                    <span className="font-bold text-foreground">
                      {plan.currentVersion > 0 ? plan.currentVersion : t.neverSent}
                    </span>
                  </span>
                </div>

                <div className="text-[10px] text-muted-foreground">
                  {t.studentLabel}:{" "}
                  <span className="font-bold text-foreground">
                    {plan.assignedStudent ? plan.assignedStudent.displayName : t.unassignedBadge}
                  </span>
                  {plan.lastSentAt && (
                    <span className="ms-3">
                      {t.lastSentLabel}: {localeDateTimeLabel(plan.lastSentAt, locale)}
                    </span>
                  )}
                </div>

                <PlanCardActions
                  kind="workout"
                  plan={plan}
                  onEdit={() => {
                    setEditId(plan.id);
                    setBuilderOpen(true);
                  }}
                  onPreview={() => void openPreview(plan)}
                  onDone={refresh}
                />
              </CardContent>
            </Card>
          ))}
          </div>
          )}
        </div>
      )}

      <WorkoutBuilderDialog
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        planId={editId}
        onSaved={refresh}
      />

      {/* پیش‌نمایش — با رندرکننده همان چیزی که دانشجو می‌بیند */}
      <Dialog open={preview !== null || previewLoading} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{preview?.title ?? t.previewTitle}</DialogTitle>
            <DialogDescription className="text-[11px]">{t.previewIntro}</DialogDescription>
          </DialogHeader>
          {/* خروجی PDF از مسیر چاپ مرورگر — RTL و فونت فارسی درست رندر میشود */}
          {preview && (
            <div className="flex justify-end print:hidden">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                {t.actionPdf}
              </Button>
            </div>
          )}
          <div className="print-area">
          {preview && preview.kind === "workout" && (
            <CoachWorkoutContentView content={preview.content as CoachWorkoutContentClient} />
          )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
