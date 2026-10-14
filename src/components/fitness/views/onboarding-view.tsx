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

const STEPS = [
  { title: "معرفی", icon: UserRound },
  { title: "مشخصات بدنی", icon: Ruler },
  { title: "هدف و سطح", icon: Target },
  { title: "تجهیزات و محدودیت‌ها", icon: Dumbbell },
] as const;

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

function validateRange(value: string, [min, max]: readonly [number, number], label: string, required: boolean): string | null {
  const parsed = parseNumber(value);
  if (parsed === null) {
    return required ? `${label} را وارد کنید.` : null;
  }
  if (!Number.isInteger(parsed) && required && label === "سن") {
    return `${label} باید عدد صحیح باشد.`;
  }
  if (parsed < min || parsed > max) {
    return `${label} باید بین ${min.toLocaleString("fa-IR")} و ${max.toLocaleString("fa-IR")} باشد.`;
  }
  return null;
}

/* ------------------------------- نمای راه‌اندازی ------------------------------- */

export function OnboardingView() {
  const { user, setProfile } = useSessionData();
  const router = useRouter();

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
        errors.displayName = "نام نمایشی باید بین ۲ تا ۶۰ کاراکتر باشد.";
      }
    }
    if (target >= 1) {
      const ageError = validateRange(form.age, RANGES.age, "سن", true);
      if (ageError) errors.age = ageError;
      const heightError = validateRange(form.heightCm, RANGES.heightCm, "قد (سانتی‌متر)", true);
      if (heightError) errors.heightCm = heightError;
      const weightError = validateRange(form.weightKg, RANGES.weightKg, "وزن (کیلوگرم)", true);
      if (weightError) errors.weightKg = weightError;
      const bodyFatError = validateRange(form.bodyFat, RANGES.bodyFat, "درصد چربی بدن", false);
      if (bodyFatError) errors.bodyFat = bodyFatError;
    }
    if (target >= 2) {
      if (!form.goal) errors.goal = "هدف تمرینی را انتخاب کنید.";
      if (!form.experience) errors.experience = "سطح تجربه را انتخاب کنید.";
      const daysError = validateRange(form.trainingDaysPerWeek, [1, 7], "روزهای تمرین در هفته", true);
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
        setSubmitError("نشست شما منقضی شده است؛ لطفاً دوباره وارد شوید.");
        router.refresh();
        return;
      }

      if (response.status === 400) {
        const data = (await response.json()) as { fields?: Record<string, string> };
        const first = data.fields ? Object.values(data.fields)[0] : undefined;
        setSubmitError(first ?? "اطلاعات واردشده معتبر نیست؛ فیلدها را بررسی کنید.");
        return;
      }

      setSubmitError("ذخیره اطلاعات انجام نشد؛ لطفاً دوباره تلاش کنید.");
    } catch {
      setSubmitError("ارتباط با سرور برقرار نشد؛ اتصال اینترنت خود را بررسی کنید.");
    } finally {
      setSubmitting(false);
    }
  };

  const StepIcon = STEPS[step].icon;

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
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
              گام {(step + 1).toLocaleString("fa-IR")} از {STEPS.length.toLocaleString("fa-IR")}
            </span>
          </div>

          {/* نشانگر پیشرفت مراحل */}
          <div className="mt-6 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {STEPS.map((item, index) => (
                <div
                  key={item.title}
                  className={
                    index <= step
                      ? "h-1.5 flex-1 rounded-full bg-primary"
                      : "h-1.5 flex-1 rounded-full bg-secondary"
                  }
                />
              ))}
            </div>
            <div className="flex items-center justify-between gap-2">
              {STEPS.map((item, index) => (
                <span
                  key={item.title}
                  className={
                    index === step
                      ? "text-[10px] font-bold text-primary"
                      : index < step
                        ? "text-[10px] font-medium text-foreground/70"
                        : "text-[10px] font-medium text-muted-foreground/50"
                  }
                >
                  {item.title}
                </span>
              ))}
            </div>
            <Progress
              value={((step + 1) / STEPS.length) * 100}
              className="h-1"
              aria-label="پیشرفت راه‌اندازی پروفایل"
            />
          </div>

          <div className="mt-7 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <StepIcon className="size-4" aria-hidden="true" />
            </span>
            <h2 className="text-base font-extrabold text-foreground">{STEPS[step].title}</h2>
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
                <span className="font-bold text-primary">سلام {form.displayName || " 👋"}</span>
                <br />
                حساب کاربری شما ساخته شد. برای اینکه مربی بتواند در مراحل بعدی برنامه تمرینی و
                غذایی متناسب با بدن و هدف شما بسازد، چند اطلاعات پایه لازم داریم؛ همه این
                اطلاعات محرمانه است و فقط روی حساب خودتان ذخیره می‌شود.
              </p>
              <Field
                id="onb-displayName"
                label="نام نمایشی"
                hint="همین نام در داشبورد نمایش داده می‌شود"
                error={fieldError.displayName}
              >
                <Input
                  id="onb-displayName"
                  value={form.displayName}
                  onChange={(event) => setField("displayName", event.target.value)}
                  placeholder="مثلاً علی"
                  autoComplete="nickname"
                  aria-invalid={Boolean(fieldError.displayName)}
                />
              </Field>
            </div>
          )}

          {/* گام ۲ — مشخصات بدنی */}
          {step === 1 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="onb-age" label="سن" hint="سال" error={fieldError.age}>
                <Input
                  id="onb-age"
                  inputMode="numeric"
                  value={form.age}
                  onChange={(event) => setField("age", event.target.value)}
                  placeholder="مثلاً ۲۷"
                  aria-invalid={Boolean(fieldError.age)}
                />
              </Field>
              <Field id="onb-gender" label="جنسیت" hint="اختیاری — برای فرمول‌های آینده">
                <Select value={form.gender || ""} onValueChange={(value) => setField("gender", value)}>
                  <SelectTrigger id="onb-gender" className="w-full" aria-label="انتخاب جنسیت">
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="onb-height" label="قد" hint="سانتی‌متر" error={fieldError.heightCm}>
                <Input
                  id="onb-height"
                  inputMode="decimal"
                  value={form.heightCm}
                  onChange={(event) => setField("heightCm", event.target.value)}
                  placeholder="مثلاً ۱۷۸"
                  aria-invalid={Boolean(fieldError.heightCm)}
                />
              </Field>
              <Field id="onb-weight" label="وزن" hint="کیلوگرم" error={fieldError.weightKg}>
                <Input
                  id="onb-weight"
                  inputMode="decimal"
                  value={form.weightKg}
                  onChange={(event) => setField("weightKg", event.target.value)}
                  placeholder="مثلاً ۷۵٫۵"
                  aria-invalid={Boolean(fieldError.weightKg)}
                />
              </Field>
              <Field
                id="onb-bodyFat"
                label="درصد چربی بدن"
                hint="اختیاری — در صورت اطلاع"
                error={fieldError.bodyFat}
              >
                <Input
                  id="onb-bodyFat"
                  inputMode="decimal"
                  value={form.bodyFat}
                  onChange={(event) => setField("bodyFat", event.target.value)}
                  placeholder="مثلاً ۱۸"
                  aria-invalid={Boolean(fieldError.bodyFat)}
                />
              </Field>
            </div>
          )}

          {/* گام ۳ — هدف و سطح */}
          {step === 2 && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field id="onb-goal" label="هدف تمرینی" error={fieldError.goal}>
                <Select value={form.goal || ""} onValueChange={(value) => setField("goal", value)}>
                  <SelectTrigger id="onb-goal" className="w-full" aria-label="انتخاب هدف تمرینی">
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="onb-experience" label="سطح تجربه" error={fieldError.experience}>
                <Select
                  value={form.experience || ""}
                  onValueChange={(value) => setField("experience", value)}
                >
                  <SelectTrigger id="onb-experience" className="w-full" aria-label="انتخاب سطح تجربه">
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="onb-days"
                label="روزهای تمرین در هفته"
                error={fieldError.trainingDaysPerWeek}
              >
                <Select
                  value={form.trainingDaysPerWeek || ""}
                  onValueChange={(value) => setField("trainingDaysPerWeek", value)}
                >
                  <SelectTrigger id="onb-days" className="w-full" aria-label="انتخاب روزهای تمرین">
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        {day.toLocaleString("fa-IR")} روز
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="onb-minutes" label="مدت هر جلسه" hint="اختیاری">
                <Select
                  value={form.sessionMinutes || ""}
                  onValueChange={(value) => setField("sessionMinutes", value)}
                >
                  <SelectTrigger id="onb-minutes" className="w-full" aria-label="انتخاب مدت جلسه">
                    <SelectValue placeholder="انتخاب کنید" />
                  </SelectTrigger>
                  <SelectContent>
                    {SESSION_MINUTES_OPTIONS.map((minutes) => (
                      <SelectItem key={minutes} value={String(minutes)}>
                        {minutes.toLocaleString("fa-IR")} دقیقه
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
                  تجهیزات در دسترس
                  <span className="ms-1.5 font-normal text-muted-foreground/70">
                    (برنامه‌ساز فقط حرکات قابل اجرا پیشنهاد می‌دهد)
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {EQUIPMENT_OPTIONS.map((option) => (
                    <ChipToggle
                      key={option.value}
                      active={form.equipment.includes(option.value)}
                      onClick={() => toggleArrayField("equipment", option.value)}
                    >
                      {option.label}
                    </ChipToggle>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2.5 text-xs font-semibold text-foreground/90">
                  محدودیت‌های حرکتی یا آسیب‌ها
                  <span className="ms-1.5 font-normal text-muted-foreground/70">(اختیاری)</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {LIMITATION_OPTIONS.map((option) => (
                    <ChipToggle
                      key={option.value}
                      active={form.limitations.includes(option.value)}
                      onClick={() => toggleArrayField("limitations", option.value)}
                    >
                      {option.label}
                    </ChipToggle>
                  ))}
                </div>
                <div className="mt-4">
                  <Field id="onb-limitationNotes" label="توضیح بیشتر" hint="اختیاری">
                    <Textarea
                      id="onb-limitationNotes"
                      rows={3}
                      value={form.limitationNotes}
                      onChange={(event) => setField("limitationNotes", event.target.value)}
                      placeholder="مثلاً: هنگام اسکات عمیق، درد خفیف زانوی راست…"
                    />
                  </Field>
                </div>
                <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-5 text-muted-foreground/70">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  این اطلاعات محرمانه تلقی می‌شود، فقط روی حساب شما ذخیره می‌شود و جایگزین
                  تشخیص پزشکی نیست.
                </p>
              </div>
            </div>
          )}

          {/* دکمه‌های ناوبری */}
          <div className="mt-7 flex items-center justify-between gap-3 border-t border-border/50 pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={goBack}
              disabled={step === 0 || submitting}
              className="font-semibold"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
              بازگشت
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
              {step === STEPS.length - 1 ? "ثبت و پایان راه‌اندازی" : "ادامه"}
              {step < STEPS.length - 1 && <ChevronLeft className="size-4" aria-hidden="true" />}
            </Button>
          </div>

          <p className="mt-4 text-center text-[10px] leading-5 text-muted-foreground/70">
            بعداً می‌توانید همه این اطلاعات را از بخش «پروفایل و تنظیمات» ویرایش کنید.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
