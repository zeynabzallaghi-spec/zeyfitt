"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { issueLabel, genericIssueMessage } from "@/lib/i18n/sections/server-messages";
import { currentUiLocale } from "@/lib/i18n/locale-current";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Save,
  RotateCcw,
  Info,
  UserRound,
  Target,
  Dumbbell,
  HeartPulse,
  ShieldCheck,
  LogOut,
  Trash2,
  Loader2,
  CircleCheck,
  Ruler,
  CloudUpload,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getNavItem } from "@/lib/nav";
import {
  ALLERGY_OPTIONS,
  DIET_OPTIONS,
  EQUIPMENT_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  GOAL_OPTIONS,
  LIMITATION_OPTIONS,
  SESSION_MINUTES_OPTIONS,
  UNITS_OPTIONS,
  profilePayloadSchema,
  type FitnessProfileClient,
} from "@/lib/profile";
import { useSessionData } from "../session-context";
import { ViewIntro } from "../shared/view-intro";
import { StageBadge } from "../shared/badges";
import { Field, ChipToggle, ProfileSection } from "../shared/profile-fields";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { profileStrings } from "@/lib/i18n/sections/profile";
import { sharedStrings } from "@/lib/i18n/sections/shared";

/* ------------------------------ وضعیت فرم ------------------------------ */

interface ProfileFormState {
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
  diet: string;
  allergies: string[];
  units: string;
}

function fromProfile(profile: FitnessProfileClient): ProfileFormState {
  return {
    displayName: profile.displayName,
    age: profile.age === null ? "" : String(profile.age),
    gender: profile.gender ?? "",
    heightCm: profile.heightCm === null ? "" : String(profile.heightCm),
    weightKg: profile.weightKg === null ? "" : String(profile.weightKg),
    bodyFat: profile.bodyFat === null ? "" : String(profile.bodyFat),
    goal: profile.goal ?? "",
    experience: profile.experience ?? "",
    trainingDaysPerWeek:
      profile.trainingDaysPerWeek === null ? "" : String(profile.trainingDaysPerWeek),
    sessionMinutes: profile.sessionMinutes === null ? "" : String(profile.sessionMinutes),
    equipment: profile.equipment,
    limitations: profile.limitations,
    limitationNotes: profile.limitationNotes ?? "",
    diet: profile.diet ?? "",
    allergies: profile.allergies,
    units: profile.units,
  };
}

/* تاریخ نمایشی به زبان رابط — فارسی: دقیقاً همان قالب پیش‌فرض fa-IR فعلی
   (شمسی + ارقام فارسی)، انگلیسی: قالب پیش‌فرض en-GB (گرگوری + ارقام لاتین).
   قالب‌های آماره format.ts (مانند localeFullLabel) ماه را کامل می‌نویسند و
   رفتار نمایشی فعلی این نما را تغییر می‌دهند؛ بنابراین همان قالب پیش‌فرض قبلی
   این‌جا به‌صورت دوزبانه نگه داشته شده است. */
const defaultDateFormatter = {
  fa: new Intl.DateTimeFormat("fa-IR"),
  en: new Intl.DateTimeFormat("en-GB"),
} as const;

function subscribeNoop(_onChange: () => void) {
  return () => {};
}

/** تاریخ به زبان رابط — با الگوی فقط-کلاینت تا هیدراتیشن همیشه سازگار بماند */
function LocaleDate({ iso }: { iso: string | null }) {
  const locale = useLocale();
  const value = useSyncExternalStore(
    subscribeNoop,
    () => (iso ? defaultDateFormatter[locale].format(new Date(iso)) : "—"),
    () => null
  );
  return <span suppressHydrationWarning>{value ?? "—"}</span>;
}

type ArrayFieldKey = "equipment" | "limitations" | "allergies";

export function ProfileView() {
  const item = getNavItem("profile");
  const locale = useLocale();
  const dir = useDir();
  const t = useStrings(profileStrings);
  const s = useStrings(sharedStrings);
  const { toast } = useToast();
  const router = useRouter();
  const { user, profile, setProfile, signOut, deleteAccount } = useSessionData();

  const [form, setForm] = useState<ProfileFormState | null>(() =>
    profile ? fromProfile(profile) : null
  );
  const [loading, setLoading] = useState(profile === null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* بازیابی تازه از سرور هنگام ورود به بخش — مرجع حقیقت: پایگاه داده */
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/profile");
        if (cancelled) return;
        if (response.ok) {
          const data = (await response.json()) as { profile: FitnessProfileClient | null };
          setProfile(data.profile);
          setForm((prev) => prev ?? (data.profile ? fromProfile(data.profile) : null));
        } else if (response.status === 401) {
          router.refresh();
        }
      } catch {
        // خطای شبکه — داده SSR همچنان معتبر است
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, setProfile]);

  if (loading && form === null) {
    return (
      <div className="flex flex-col gap-4">
        <ViewIntro
          item={item}
          badges={<StageBadge stage={3} />}
        />
        <div className="flex items-center justify-center gap-3 rounded-2xl border border-border/60 bg-card p-10 text-sm font-medium text-muted-foreground">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
          {t.loadingProfile}
        </div>
      </div>
    );
  }

  if (form === null) {
    return (
      <div className="flex flex-col gap-4">
        <ViewIntro item={item} badges={<StageBadge stage={3} />} />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">{t.emptyNoProfile}</p>
          <Button
            onClick={() => router.refresh()}
            variant="outline"
            className="border-border/70 font-semibold"
          >
            {t.refreshStatus}
          </Button>
        </div>
      </div>
    );
  }

  const setField = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const toggleArrayField = (key: ArrayFieldKey, value: string) => {
    setForm((prev) => {
      if (!prev) return prev;
      const list = prev[key];
      return {
        ...prev,
        [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value],
      };
    });
  };

  const text = (key: keyof ProfileFormState) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(key, e.target.value as never),
  });

  const select = (key: keyof ProfileFormState) => ({
    value: (form[key] as string) || "",
    onValueChange: (v: string) => setField(key, v as never),
  });

  const handleSave = async () => {
    if (saving || !form) return;
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        displayName: form.displayName,
        age: form.age,
        gender: form.gender === "" ? null : form.gender,
        heightCm: form.heightCm,
        weightKg: form.weightKg,
        bodyFat: form.bodyFat.trim() === "" ? null : form.bodyFat,
        goal: form.goal,
        experience: form.experience,
        trainingDaysPerWeek: form.trainingDaysPerWeek,
        sessionMinutes: form.sessionMinutes.trim() === "" ? null : form.sessionMinutes,
        equipment: form.equipment,
        limitations: form.limitations,
        limitationNotes: form.limitationNotes.trim() === "" ? null : form.limitationNotes.trim(),
        diet: form.diet === "" ? null : form.diet,
        allergies: form.allergies,
        units: form.units,
      };

      // اعتبارسنجی سمت کلاینت با همان شِمای سرور — پیام‌های فارسی
      const parsed = profilePayloadSchema.safeParse(payload);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        setFormError(first?.message ?? t.invalidInfoFallback);
        toast({
          title: t.clientValidationTitle,
          description: first?.message ?? t.clientValidationDescFallback,
        });
        return;
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = (await response.json()) as { profile: FitnessProfileClient };
        setProfile(data.profile);
        setForm(fromProfile(data.profile));
        toast({
          title: t.savedTitle,
          description: t.savedDesc,
        });
        router.refresh();
        return;
      }

      if (response.status === 401) {
        toast({ title: t.sessionExpiredTitle, description: t.sessionExpiredDesc });
        router.refresh();
        return;
      }

      if (response.status === 400) {
        // ترجمه نمایشی از کد پایدار فیلد — پیام خام سرور هرگز نمایش داده نمی‌شود
        const locale = currentUiLocale();
        const data = (await response.json()) as {
          fields?: Record<string, string>;
          fieldCodes?: Record<string, string>;
        };
        const firstCode = data.fieldCodes
          ? Object.values(data.fieldCodes)[0]
          : undefined;
        const label = firstCode ? issueLabel("profile", firstCode, locale) : null;
        setFormError(label ?? t.invalidInfoFallback);
        toast({
          title: t.serverValidationTitle,
          description: label ?? t.serverValidationDescFallback,
        });
        return;
      }

      toast({
        title: t.saveFailedTitle,
        description: t.saveFailedDesc,
      });
    } catch {
      toast({
        title: t.networkErrorTitle,
        description: t.networkErrorDesc,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!profile) return;
    setForm(fromProfile(profile));
    setFormError(null);
    toast({
      title: t.resetTitle,
      description: t.resetDesc,
    });
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    const ok = await deleteAccount();
    setDeleting(false);
    if (!ok) {
      toast({
        title: t.deleteFailedTitle,
        description: t.deleteFailedDesc,
      });
    }
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
        badges={<StageBadge stage={3} />}
      />

      {/* بنر شفافیت — وضعیت ذخیره‌سازی واقعی */}
      <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        <div className="text-xs leading-6 text-muted-foreground">
          <p>
            {t.bannerPrefix}
            <span className="font-bold text-foreground">{t.bannerServerDb}</span>
            {t.bannerSuffix}
          </p>
          {profile?.complete && (
            <p className="mt-1.5 flex items-center gap-1.5 font-bold text-primary">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              {t.profileCompletePrefix}
              <LocaleDate iso={profile.updatedAt} />
            </p>
          )}
        </div>
      </div>

      {formError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs font-medium leading-6 text-destructive"
        >
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* اطلاعات پایه */}
        <ProfileSection icon={UserRound} title={t.sectionBasic}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="displayName" label={t.labelDisplayName}>
              <Input id="displayName" placeholder={t.placeholderDisplayName} {...text("displayName")} />
            </Field>
            <Field id="age" label={t.labelAge} hint={t.hintYear}>
              <Input id="age" inputMode="numeric" placeholder={t.placeholderAge} {...text("age")} />
            </Field>
            <Field id="gender" label={t.labelGender} hint={t.hintOptional}>
              <Select {...select("gender")}>
                <SelectTrigger id="gender" className="w-full" aria-label={t.ariaGender}>
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
            <Field id="units" label={t.labelUnits}>
              <Select {...select("units")}>
                <SelectTrigger id="units" className="w-full" aria-label={t.ariaUnits}>
                  <SelectValue placeholder={t.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {s.unitsLabel(option.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="height" label={t.labelHeight} hint={t.hintCm}>
              <Input id="height" inputMode="numeric" placeholder={t.placeholderHeight} {...text("heightCm")} />
            </Field>
            <Field id="weight" label={t.labelWeight} hint={t.hintKg}>
              <Input id="weight" inputMode="decimal" placeholder={t.placeholderWeight} {...text("weightKg")} />
            </Field>
            <Field id="bodyFat" label={t.labelBodyFat} hint={t.hintIfKnown}>
              <Input id="bodyFat" inputMode="decimal" placeholder={t.placeholderBodyFat} {...text("bodyFat")} />
            </Field>
          </div>
        </ProfileSection>

        {/* هدف و سطح */}
        <ProfileSection icon={Target} title={t.sectionGoal}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="goal" label={t.labelGoal}>
              <Select {...select("goal")}>
                <SelectTrigger id="goal" className="w-full" aria-label={t.ariaGoal}>
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
            <Field id="level" label={t.labelExperience}>
              <Select {...select("experience")}>
                <SelectTrigger id="level" className="w-full" aria-label={t.ariaExperience}>
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
            <Field id="daysPerWeek" label={t.labelDaysPerWeek}>
              <Select {...select("trainingDaysPerWeek")}>
                <SelectTrigger id="daysPerWeek" className="w-full" aria-label={t.ariaDays}>
                  <SelectValue placeholder={t.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <SelectItem key={day} value={String(day)}>
                      {t.daysPerWeekItem(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="sessionMinutes" label={t.labelSessionMinutes} hint={t.hintOptional}>
              <Select {...select("sessionMinutes")}>
                <SelectTrigger id="sessionMinutes" className="w-full" aria-label={t.ariaSessionMinutes}>
                  <SelectValue placeholder={t.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_MINUTES_OPTIONS.map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {t.minutesItem(minutes)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </ProfileSection>

        {/* تجهیزات */}
        <ProfileSection icon={Dumbbell} title={t.sectionEquipment}>
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
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground/70">
            {t.equipmentNote}
          </p>
        </ProfileSection>

        {/* محدودیت‌ها */}
        <ProfileSection icon={HeartPulse} title={t.sectionLimitations}>
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
            <Field id="limitationNotes" label={t.labelLimitationNotes} hint={t.hintOptional}>
              <Textarea
                id="limitationNotes"
                rows={3}
                placeholder={t.placeholderLimitationNotes}
                {...text("limitationNotes")}
              />
            </Field>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground/70">
            {t.limitationsNote}
          </p>
        </ProfileSection>
      </div>

      {/* ترجیحات غذایی */}
      <ProfileSection icon={HeartPulse} title={t.sectionDiet}>
        <div className="grid gap-5 lg:grid-cols-2">
          <Field id="diet" label={t.labelDiet} hint={t.hintOptional}>
            <Select {...select("diet")}>
              <SelectTrigger id="diet" className="w-full" aria-label={t.ariaDiet}>
                <SelectValue placeholder={t.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {DIET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {s.dietLabel(option.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-foreground/90">
              {t.labelAllergies}
              <span className="ms-1.5 font-normal text-muted-foreground/70">{t.allergyHint}</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((option) => (
                <ChipToggle
                  key={option.value}
                  active={form.allergies.includes(option.value)}
                  onClick={() => toggleArrayField("allergies", option.value)}
                >
                  {s.allergyLabel(option.value)}
                </ChipToggle>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[10px] leading-5 text-muted-foreground/70">
          {t.dietNote}
        </p>
      </ProfileSection>

      {/* حساب کاربری و امنیت */}
      <ProfileSection icon={ShieldCheck} title={t.sectionAccount}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="account-email" label={t.labelEmail} hint={t.hintEmailLocked}>
            <Input
              id="account-email"
              dir="ltr"
              className="text-start"
              value={user?.email ?? ""}
              readOnly
              disabled
              aria-readonly="true"
            />
          </Field>
          <Field id="member-since" label={t.labelMemberSince} hint={t.hintCalendar}>
            <div className="flex h-9 items-center rounded-md border border-border/50 bg-secondary/30 px-3 text-sm text-muted-foreground">
              <LocaleDate iso={profile?.createdAt ?? null} />
            </div>
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={() => void signOut()}
            className="border-border/70 font-semibold"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t.buttonSignOut}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                disabled={deleting}
                className="border-destructive/40 font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                {deleting ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="size-4" aria-hidden="true" />
                )}
                {t.buttonDeleteAccount}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir={dir}>
              <AlertDialogHeader className="text-start">
                <AlertDialogTitle>{t.deleteDialogTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.deleteDialogDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogAction
                  onClick={() => void handleDeleteAccount()}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {t.deleteConfirm}
                </AlertDialogAction>
                <AlertDialogCancel className="font-semibold">{t.deleteCancel}</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-5 text-muted-foreground/70">
          <Ruler className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t.securityNote}
        </p>
      </ProfileSection>

      {/* دکمه‌های عملیات */}
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-background/85 p-3 backdrop-blur-xl">
        <Button
          onClick={() => void handleSave()}
          disabled={saving}
          className="font-bold text-primary-foreground glow-lime-sm"
        >
          {saving ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CloudUpload className="size-4" aria-hidden="true" />
          )}
          {saving ? t.saveSaving : t.saveIdle}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
          className="border-border/70 font-semibold hover:border-destructive/50 hover:text-destructive"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {t.buttonReset}
        </Button>
        <p className="ms-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground/70 sm:flex">
          <Save className="size-3.5" aria-hidden="true" />
          {t.footerStorageNote}
        </p>
      </div>
    </motion.div>
  );
}
