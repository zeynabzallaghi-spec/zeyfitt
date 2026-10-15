"use client";

/**
 * فرم تنظیمات برنامه — مرحله ۱ ساخت برنامه.
 * مقادیر اولیه از پروفایل واقعی کاربر پیش‌فرض می‌شود (بدون تغییر پروفایل)؛
 * اعتبارسنجی سمت کلاینت با همان شِمای Zod سرور انجام می‌شود.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChartNoAxesColumn,
  CalendarDays,
  Dumbbell,
  Target,
  TriangleAlert,
  Ban,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  type EquipmentId,
  type ExerciseCategoryId,
} from "@/lib/exercises/types";
import {
  planSettingsSchema,
  firstPlanSettingsError,
} from "@/lib/plan-engine/schema";
import { PROFILE_TO_LIBRARY_EQUIPMENT } from "@/lib/plan-engine/presets";
import {
  PLAN_GOAL_LABELS,
  PLAN_EXPERIENCE_LABELS,
  focusFa,
  type PlanFocus,
  type PlanGoal,
  type PlanExperience,
  type PlanSettings,
} from "@/lib/plan-engine/types";
import { GOAL_OPTIONS, EXPERIENCE_OPTIONS, SESSION_MINUTES_OPTIONS, faDigits, normalizeDigits } from "@/lib/profile";
import type { FitnessProfileClient } from "@/lib/profile";

const WEEK_DAY_LABELS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Target;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <h4 className="text-xs font-bold">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

function Chip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
        selected
          ? "border-primary/50 bg-primary/15 text-primary"
          : "border-border/60 bg-secondary/30 text-foreground/80 hover:border-primary/30",
        disabled && "cursor-not-allowed opacity-40"
      )}
    >
      {children}
    </button>
  );
}

export interface PlanSettingsFormProps {
  profile: FitnessProfileClient | null;
  submitting: boolean;
  /** خطای برگشتی از سرور (اعتبارسنجی/امکان‌پذیری) */
  serverError: string | null;
  onSubmit: (settings: PlanSettings) => void;
  onCancel: () => void;
}

export function PlanSettingsForm({
  profile,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: PlanSettingsFormProps) {
  /* ------------------ مقداردهی اولیه از پروفایل واقعی ------------------ */
  const initialEquipment = useMemo<EquipmentId[]>(() => {
    const mapped = new Set<EquipmentId>();
    for (const code of profile?.equipment ?? []) {
      const ids = PROFILE_TO_LIBRARY_EQUIPMENT[code];
      if (ids) ids.forEach((id) => mapped.add(id));
    }
    // وزن بدن همیشه در دسترس است — پایه معقول فرم؛ کاربر می‌تواند تغییر دهد
    mapped.add("bodyweight");
    return [...mapped];
  }, [profile]);

  const [goal, setGoal] = useState<PlanGoal>(
    (profile?.goal as PlanGoal | undefined) ?? "muscle_gain"
  );
  const [experience, setExperience] = useState<PlanExperience>(
    (profile?.experience as PlanExperience | undefined) ?? "beginner"
  );
  const profileDays = profile?.trainingDaysPerWeek ?? 3;
  const [daysPerWeek, setDaysPerWeek] = useState<number>(
    Math.min(6, Math.max(2, profileDays))
  );
  const profileMinutes = profile?.sessionMinutes;
  const [sessionMinutes, setSessionMinutes] = useState<number>(
    profileMinutes === 30 || profileMinutes === 45 || profileMinutes === 60 || profileMinutes === 90
      ? profileMinutes
      : 60
  );
  const [equipment, setEquipment] = useState<EquipmentId[]>(initialEquipment);
  const [focus, setFocus] = useState<PlanFocus>("all");
  const [preferredDays, setPreferredDays] = useState<number[]>([]);
  const [excludedCategories, setExcludedCategories] = useState<ExerciseCategoryId[]>([]);
  const [limitationNotes, setLimitationNotes] = useState<string>(
    profile?.limitationNotes ?? ""
  );
  const [clientError, setClientError] = useState<string | null>(null);

  const hasKettlebellInProfile = (profile?.equipment ?? []).includes("kettlebell");

  /* ------------------------------ ارسال ------------------------------ */
  const handleSubmit = () => {
    setClientError(null);
    const candidate: PlanSettings = {
      goal,
      experience,
      daysPerWeek,
      sessionMinutes,
      equipment,
      focus,
      preferredDays,
      excludedCategories,
      excludedExerciseIds: [],
      limitationNotes: limitationNotes.trim() || null,
    };
    const parsed = planSettingsSchema.safeParse(candidate);
    if (!parsed.success) {
      setClientError(firstPlanSettingsError(parsed.error));
      return;
    }
    onSubmit({
      ...parsed.data,
      preferredDays: parsed.data.preferredDays.map((d) => Number(normalizeDigits(String(d)))),
    } as PlanSettings);
  };

  const togglePreferredDay = (day: number) => {
    setPreferredDays((prev) => {
      if (prev.includes(day)) return prev.filter((d) => d !== day);
      if (prev.length >= daysPerWeek) return prev; // حداکثر به تعداد روزهای تمرین
      return [...prev, day].sort((a, b) => a - b);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col gap-4"
    >
      <SectionCard icon={Target} title="هدف و سطح">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-goal" className="text-[11px] text-muted-foreground">
              هدف تمرینی
            </Label>
            <Select value={goal} onValueChange={(v) => setGoal(v as PlanGoal)}>
              <SelectTrigger id="plan-goal" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {PLAN_GOAL_LABELS[option.value as PlanGoal]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-exp" className="text-[11px] text-muted-foreground">
              سطح تجربه
            </Label>
            <Select value={experience} onValueChange={(v) => setExperience(v as PlanExperience)}>
              <SelectTrigger id="plan-exp" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {PLAN_EXPERIENCE_LABELS[option.value as PlanExperience]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground/70">
          مقادیر پیش‌فرض از پروفایل شما خوانده شده‌اند؛ می‌توانید فقط برای همین برنامه تغییرشان دهید.
        </p>
      </SectionCard>

      <SectionCard icon={CalendarDays} title="حجم هفتگی">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] text-muted-foreground">تعداد روز تمرین در هفته</Label>
            <div className="flex flex-wrap gap-1.5">
              {[2, 3, 4, 5, 6].map((n) => (
                <Chip
                  key={n}
                  selected={daysPerWeek === n}
                  onClick={() => {
                    setDaysPerWeek(n);
                    setPreferredDays((prev) => prev.slice(0, n));
                  }}
                >
                  {faDigits(n)} روز
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-[11px] text-muted-foreground">مدت هر جلسه</Label>
            <div className="flex flex-wrap gap-1.5">
              {SESSION_MINUTES_OPTIONS.map((m) => (
                <Chip key={m} selected={sessionMinutes === m} onClick={() => setSessionMinutes(m)}>
                  {faDigits(m)} دقیقه
                </Chip>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Label className="text-[11px] text-muted-foreground">
            روزهای ترجیحی (اختیاری — حداکثر {faDigits(daysPerWeek)} روز)
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_DAY_LABELS.map((label, index) => (
              <Chip
                key={label}
                selected={preferredDays.includes(index)}
                disabled={!preferredDays.includes(index) && preferredDays.length >= daysPerWeek}
                onClick={() => togglePreferredDay(index)}
              >
                {label}
              </Chip>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard icon={Dumbbell} title="تجهیزات در دسترس">
        <div className="flex flex-wrap gap-1.5">
          {EQUIPMENT_TYPES.map((eq) => (
            <Chip
              key={eq.id}
              selected={equipment.includes(eq.id)}
              onClick={() => setEquipment((prev) => toggle(prev, eq.id))}
            >
              {eq.fa}
            </Chip>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground/70">
          حرکتی فقط زمانی انتخاب می‌شود که همه تجهیزات لازمش را داشته باشید؛ اگر نیمکت در دسترس
          دارید حتماً آن را هم انتخاب کنید.
        </p>
        {hasKettlebellInProfile && (
          <p className="mt-2 text-[10px] leading-5 text-amber-300/90">
            توجه: کتل‌بل در پروفایل شما ثبت شده اما فعلاً حرکت کتل‌بلی در بانک حرکات موجود نیست و
            در برنامه لحاظ نمی‌شود.
          </p>
        )}
      </SectionCard>

      <SectionCard icon={ChartNoAxesColumn} title="تمرکز برنامه (اختیاری)">
        <div className="flex flex-wrap gap-1.5">
          {(["all", "upper", "lower"] as const).map((f) => (
            <Chip key={f} selected={focus === f} onClick={() => setFocus(f)}>
              {focusFa(f)}
            </Chip>
          ))}
          {EXERCISE_CATEGORIES.map((cat) => (
            <Chip key={cat.id} selected={focus === cat.id} onClick={() => setFocus(cat.id)}>
              {cat.fa}
            </Chip>
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={Ban} title="محدودیت‌ها (اختیاری)">
        <div className="flex flex-col gap-2">
          <Label className="text-[11px] text-muted-foreground">دسته‌هایی که نمی‌خواهید در برنامه باشند</Label>
          <div className="flex flex-wrap gap-1.5">
            {EXERCISE_CATEGORIES.map((cat) => (
              <Chip
                key={cat.id}
                selected={excludedCategories.includes(cat.id)}
                onClick={() =>
                  setExcludedCategories((prev) => {
                    const next = toggle(prev, cat.id);
                    // رد کردن حذف همه دسته‌ها — برنامه بدون دسته بی‌معناست
                    if (next.length >= EXERCISE_CATEGORIES.length) return prev;
                    return next;
                  })
                }
              >
                {cat.fa}
              </Chip>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Label htmlFor="plan-limits" className="text-[11px] text-muted-foreground">
            یادداشت احتیاطی (درد، آسیب یا نکته‌ای که مربی باید بداند)
          </Label>
          <Textarea
            id="plan-limits"
            value={limitationNotes}
            onChange={(e) => setLimitationNotes(e.target.value)}
            placeholder="مثلاً: هنگام اسکوات زانویم اذیت می‌شود"
            className="min-h-20 resize-y"
            maxLength={500}
          />
          <p className="flex items-start gap-1.5 text-[10px] leading-5 text-amber-300/90">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            این یادداشت فقط به‌عنوان ورودی احتیاطی در برنامه نمایش داده می‌شود؛ تشخیص پزشکی یا
            برنامه توان‌بخشی نیست. برای درد یا آسیب با پزشک یا فیزیوتراپیست واجد صلاحیت مشورت کنید.
          </p>
        </div>
      </SectionCard>

      {/* خطاها */}
      {(clientError ?? serverError) && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3">
          <p className="text-xs font-bold leading-6 text-rose-300">
            {clientError ?? serverError}
          </p>
        </div>
      )}

      {/* دکمه‌ها */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="font-bold text-primary-foreground glow-lime-sm"
        >
          <Wand2 className="size-4" aria-hidden="true" />
          {submitting ? "در حال ساخت پیش‌نمایش…" : "ساخت پیش‌نمایش برنامه"}
          {!submitting && <ArrowLeft className="size-4" aria-hidden="true" />}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={submitting} className="font-semibold">
          انصراف
        </Button>
      </div>
    </motion.div>
  );
}
