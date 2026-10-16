"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  UserRound,
  Ruler,
  Target,
  Dumbbell,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EQUIPMENT_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  LIMITATION_OPTIONS,
  SESSION_MINUTES_OPTIONS,
  EXPERIENCE_OPTIONS,
  normalizeDigits,
} from "@/lib/profile";
import type { FitnessProfileClient } from "@/lib/profile";
import { useStrings } from "@/lib/i18n/use-strings";
import { onboardingStrings, type OnboardingStrings } from "@/lib/i18n/sections/onboarding";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { useLocale, useDocumentTitle } from "@/lib/i18n/locale";
import { localeNumber } from "@/lib/i18n/format";
import { UiLangSwitch } from "@/components/fitness/ui-lang-switch";
import { useSessionData } from "../session-context";
import { Field, ChipToggle } from "../shared/profile-fields";
import { BrandMark } from "../sidebar-nav";

/* --------------------------------- وضعیت فرم --------------------------------- */

interface OnboardingForm {
  displayName: string;
  age: string;
  gender: string;
  heightCm: string;
  weightKg: string;
  bodyFat: string;
  goal: string;
  experience: string;
  trainingDaysPerWeek: string;
  sessionMinutes: string;
  equipment: string[];
  limitations: string[];
  limitationNotes: string;
}

const STEPS = [UserRound, Ruler, Target, Dumbbell] as const;

/** بازه‌های مجاز فیلدهای عددی — مطابق اعتبارسنجی سرور */
const RANGES = {
  age: [10, 90],
  heightCm: [100, 250],
  weightKg: [25, 300],
  bodyFat: [1, 70],
} as const;

function parseNumber(value: string): number | null {
  const cleaned = normalizeDigits(value).trim().replace(/[٫,]/g, ".");
  if (cleaned === "") return null;
  const parsed = Number(cleaned);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * اعتبارسنجی بازه — متن‌ها از دیکشنری می‌آیند. «wholeNumber» جایگزین
 * مقایسه متنی برچسب قبلی است و دقیقاً همان رفتار را حفظ می‌کند (فقط سن).
 */
function validateRange(
  value: string,
  [min, max]: readonly [number, number],
  label: string,
  required: boolean,
  wholeNumber: boolean,
  t: OnboardingStrings
): string | null {
  const parsed = parseNumber(value);
  if (parsed === null) {
    return required ? t.requiredMessage(label) : null;
  }
  if (!Number.isInteger(parsed) && required && wholeNumber) {
    return t.integerMessage(label);
  }
  if (parsed < min || parsed > max) {
    return t.rangeMessage(label, min, max);
  }
  return null;
}

/* ------------------------------- نمای راه‌اندازی ------------------------------- */

export function OnboardingView() {
  const { user, setProfile } = useSessionData();
  const router = useRouter();
  const t = useStrings(onboardingStrings);
  const s = useStrings(sharedStrings);
  const locale = useLocale();

  // عنوان ترجمه‌شده صفحه — الزام دسترسی‌پذیری
  useDocumentTitle(t.pageTitle);

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingForm>({
    displayName: user?.name?.trim() || "",
    age: "",
    gender: "",
    heightCm: "",
    weightKg: "",
    bodyFat: "",
    goal: "",
    experience: "",
    trainingDaysPerWeek: "",
    sessionMinutes: "",
    equipment: [],
    limitations: [],
    limitationNotes: "",
  });
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = <K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldError((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const toggleArrayField = (key: "equipment" | "limitations", value: string) => {
    setForm((prev) => {
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  const validateStep = (target: number): boolean => {
    const errors: Record<string, string> = {};
    if (target >= 0) {
      const name = form.displayName.trim();
      if (name.length < 2 || name.length > 60) {
        errors.displayName = t.nameLengthError;
      }
    }
    if (target >= 1) {
      const ageError = validateRange(form.age, RANGES.age, t.fieldLabels.age, true, true, t);
      if (ageError) errors.age = ageError;
      const heightError = validateRange(
        form.heightCm,
        RANGES.heightCm,
        t.fieldLabels.height,
        true,
        false,
        t
      );
      if (heightError) errors.heightCm = heightError;
      const weightError = validateRange(
        form.weightKg,
        RANGES.weightKg,
        t.fieldLabels.weight,
        true,
        false,
        t
      );
      if (weightError) errors.weightKg = weightError;
      const bodyFatError = validateRange(
        form.bodyFat,
        RANGES.bodyFat,
        t.fieldLabels.bodyFat,
        false,
        false,
        t
      );
      if (bodyFatError) errors.bodyFat = bodyFatError;
    }
    if (target >= 2) {
      if (!form.goal) errors.goal = t.goalRequired;
      if (!form.experience) errors.experience = t.experienceRequired;
      const daysError = validateRange(
        form.trainingDaysPerWeek,
        [1, 7],
        t.fieldLabels.days,
        true,
        false,
        t
      );
      if (daysError) errors.trainingDaysPerWeek = daysError;
    }
    setFieldError(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    void submit();
  };

  const goBack = () => {
    setFieldError({});
    if (step > 0) setStep(step - 1);
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          age: form.age,
          gender: form.gender === "" ? null : form.gender,
          heightCm: form.heightCm,
          weightKg: form.weightKg,
          bodyFat: form.bodyFat.trim() === "" ? null : form.bodyFat,
          goal: form.goal,
          experience: form.experience,
          trainingDaysPerWeek: form.trainingDaysPerWeek,
          sessionMinutes:
            form.sessionMinutes.trim() === "" ? null : Number(normalizeDigits(form.sessionMinutes)),
          equipment: form.equipment,
          limitations: form.limitations,
          limitationNotes: form.limitationNotes.trim() === "" ? null : form.limitationNotes.trim(),
          diet: null,
          allergies: [],
          units: "metric",
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { profile: FitnessProfileClient };
        setProfile(data.profile);
        router.refresh();
        return;
      }

      if (response.status === 401) {
        setSubmitError(t.sessionExpired);
        router.refresh();
        return;
      }

      if (response.status === 400) {
        const data = (await response.json()) as { fields?: Record<string, string> };
        const first = data.fields ? Object.values(data.fields)[0] : undefined;
        setSubmitError(first != null ? t.serverFieldMessage(first) : t.invalidFields);
        return;
      }

      setSubmitError(t.saveFailed);
    } catch {
      setSubmitError(t.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  const StepIcon = STEPS[step];

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* کلید تغییر زبان رابط — گوشه بالای صفحه، بدون برخورد با محتوای مرکزی */}
      <div className="absolute top-4 end-4 z-20">
        <UiLangSwitch />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-aura-lime opacity-70" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-2xl"
      >
        <div className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
          <div className="flex items-center justify-between gap-4">
            <BrandMark />
            <span className="hidden shrink-0 text-[11px] font-bold text-muted-foreground sm:block">
              {t.stepOf(step + 1, STEPS.length)}
            </span>
          </div>

          {/* نشانگر پیشرفت مراحل */}
          <div className="mt-6 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {STEPS.map((_, index) => (
                <div
                  key={t.steps[index].title}
                  className={
                    index <= step
                      ? "h-1.5 flex-1 rounded-full bg-primary"
                      : "h-1.5 flex-1 rounded-full bg-secondary"
                  }
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              {STEPS.map((_, index) => (
                <span
                  key={t.steps[index].title}
                  className={
                    index === step
                      ? "text-[10px] font-bold text-primary"
                      : index < step
                        ? "text-[10px] font-medium text-foreground/70"
                        : "text-[10px] font-medium text-muted-foreground/50"
                  }
                >
                  {t.steps[index].title}
                </span>
              ))}
            </div>
            <Progress
              value={((step + 1) / STEPS.length) * 100}
              className="h-1"
              aria-label={t.progressAria}
            />
          </div>

          <div className="mt-7 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <StepIcon className="size-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-extrabold text-foreground">{t.steps[step].title}</h2>
          </div>

          {submitError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium leading-6 text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{submitError}</span>
            </div>
          )}

          {/* گام ۱ — معرفی */}
          {step === 0 && (
            <div className="mt-5 flex flex-col gap-5">
              <p className="text-xs leading-7 text-muted-foreground">
                <span className="font-bold text-primary">{t.greeting(form.displayName)}</span>
                <br />
                {t.introBody}
              </p>
              <Field
                id="onb-displayName"
                label={t.displayNameLabel}
                hint={t.displayNameHint}
                error={fieldError.displayName}
              >
                <Input
                  id="onb-displayName"
                  value={form.displayName}
                  onChange={(event) => setField("displayName", event.target.value)}
                  placeholder={t.displayNamePlaceholder}
                  autoComplete="nickname"
                  aria-invalid={Boolean(fieldError.displayName)}
                />
              </Field>
            </div>
          )}

          {/* گام ۲ — مشخصات بدنی */}
          {step === 1 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="onb-age" label={t.ageLabel} hint={t.ageHint} error={fieldError.age}>
                <Input
                  id="onb-age"
                  inputMode="numeric"
                  value={form.age}
                  onChange={(event) => setField("age", event.target.value)}
                  placeholder={t.agePlaceholder}
                  aria-invalid={Boolean(fieldError.age)}
                />
              </Field>
              <Field id="onb-gender" label={t.genderLabel} hint={t.genderHint}>
                <Select value={form.gender || ""} onValueChange={(value) => setField("gender", value)}>
                  <SelectTrigger id="onb-gender" className="w-full" aria-label={t.genderAria}>
                    <SelectValue placeholder={t.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {s.genderLabel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="onb-height"
                label={t.heightLabel}
                hint={t.heightHint}
                error={fieldError.heightCm}
              >
                <Input
                  id="onb-height"
                  inputMode="decimal"
                  value={form.heightCm}
                  onChange={(event) => setField("heightCm", event.target.value)}
                  placeholder={t.heightPlaceholder}
                  aria-invalid={Boolean(fieldError.heightCm)}
                />
              </Field>
              <Field
                id="onb-weight"
                label={t.weightLabel}
                hint={t.weightHint}
                error={fieldError.weightKg}
              >
                <Input
                  id="onb-weight"
                  inputMode="decimal"
                  value={form.weightKg}
                  onChange={(event) => setField("weightKg", event.target.value)}
                  placeholder={t.weightPlaceholder}
                  aria-invalid={Boolean(fieldError.weightKg)}
                />
              </Field>
              <Field
                id="onb-bodyFat"
                label={t.bodyFatLabel}
                hint={t.bodyFatHint}
                error={fieldError.bodyFat}
              >
                <Input
                  id="onb-bodyFat"
                  inputMode="decimal"
                  value={form.bodyFat}
                  onChange={(event) => setField("bodyFat", event.target.value)}
                  placeholder={t.bodyFatPlaceholder}
                  aria-invalid={Boolean(fieldError.bodyFat)}
                />
              </Field>
            </div>
          )}

          {/* گام ۳ — هدف و سطح */}
          {step === 2 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="onb-goal" label={t.goalLabel} error={fieldError.goal}>
                <Select value={form.goal || ""} onValueChange={(value) => setField("goal", value)}>
                  <SelectTrigger id="onb-goal" className="w-full" aria-label={t.goalAria}>
                    <SelectValue placeholder={t.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {s.goalLabel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="onb-experience" label={t.experienceLabel} error={fieldError.experience}>
                <Select
                  value={form.experience || ""}
                  onValueChange={(value) => setField("experience", value)}
                >
                  <SelectTrigger id="onb-experience" className="w-full" aria-label={t.experienceAria}>
                    <SelectValue placeholder={t.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {s.experienceLabel(option.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="onb-days" label={t.daysLabel} error={fieldError.trainingDaysPerWeek}>
                <Select
                  value={form.trainingDaysPerWeek || ""}
                  onValueChange={(value) => setField("trainingDaysPerWeek", value)}
                >
                  <SelectTrigger id="onb-days" className="w-full" aria-label={t.daysAria}>
                    <SelectValue placeholder={t.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {localeNumber(day, locale)} {t.dayUnit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="onb-minutes" label={t.minutesLabel} hint={t.minutesHint}>
                <Select
                  value={form.sessionMinutes || ""}
                  onValueChange={(value) => setField("sessionMinutes", value)}
                >
                  <SelectTrigger id="onb-minutes" className="w-full" aria-label={t.minutesAria}>
                    <SelectValue placeholder={t.selectPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_MINUTES_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {localeNumber(minutes, locale)} {t.minuteUnit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}

          {/* گام ۴ — تجهیزات و محدودیت‌ها */}
          {step === 3 && (
            <div className="mt-5 flex flex-col gap-6">
              <div>
                <p className="mb-2.5 text-xs font-semibold text-foreground/90">
                  {t.equipmentTitle}
                  <span className="ms-1.5 font-normal text-muted-foreground/70">
                    {t.equipmentNote}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((option) => (
                    <ChipToggle
                      key={option.value}
                      active={form.equipment.includes(option.value)}
                      onClick={() => toggleArrayField("equipment", option.value)}
                    >
                      {s.equipmentLabel(option.value)}
                    </ChipToggle>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2.5 text-xs font-semibold text-foreground/90">
                  {t.limitationsTitle}
                  <span className="ms-1.5 font-normal text-muted-foreground/70">
                    {t.limitationsNote}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {LIMITATION_OPTIONS.map((option) => (
                    <ChipToggle
                      key={option.value}
                      active={form.limitations.includes(option.value)}
                      onClick={() => toggleArrayField("limitations", option.value)}
                    >
                      {s.limitationLabel(option.value)}
                    </ChipToggle>
                  ))}
                </div>
                <div className="mt-4">
                  <Field id="onb-limitationNotes" label={t.notesLabel} hint={t.notesHint}>
                    <Textarea
                      id="onb-limitationNotes"
                      rows={3}
                      value={form.limitationNotes}
                      onChange={(event) => setField("limitationNotes", event.target.value)}
                      placeholder={t.notesPlaceholder}
                    />
                  </Field>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-5 text-muted-foreground/70">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  {t.privacyNote}
                </p>
              </div>
            </div>
          )}

          {/* دکمه‌های ناوبری — آیکن‌های جهت‌دار در LTR قرینه می‌شوند */}
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-border/50 pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={step === 0 || submitting}
              className="font-semibold"
            >
              <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden="true" />
              {t.back}
            </Button>
            <Button
              type="button"
              onClick={goNext}
              disabled={submitting}
              className="min-w-36 font-bold text-primary-foreground glow-lime-sm"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="size-4" aria-hidden="true" />
              )}
              {step === STEPS.length - 1 ? t.finish : t.next}
              {step < STEPS.length - 1 && (
                <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
              )}
            </Button>
          </div>

          <p className="mt-4 text-center text-[10px] leading-5 text-muted-foreground/70">
            {t.footerNote}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
