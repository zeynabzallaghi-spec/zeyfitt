"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
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

const jalaliDateFormatter = new Intl.DateTimeFormat("fa-IR");

function subscribeNoop(_onChange: () => void) {
  return () => {};
}

function formatJalali(iso: string): string {
  return jalaliDateFormatter.format(new Date(iso));
}

/** تاریخ شمسی — با الگوی فقط-کلاینت تا هیدراتیشن همیشه سازگار بماند */
function JalaliDate({ iso }: { iso: string | null }) {
  const value = useSyncExternalStore(
    subscribeNoop,
    () => (iso ? formatJalali(iso) : "—"),
    () => null
  );
  return <span suppressHydrationWarning>{value ?? "—"}</span>;
}

type ArrayFieldKey = "equipment" | "limitations" | "allergies";

export function ProfileView() {
  const item = getNavItem("profile");
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
          در حال بارگذاری پروفایل از سرور…
        </div>
      </div>
    );
  }

  if (form === null) {
    return (
      <div className="flex flex-col gap-4">
        <ViewIntro item={item} badges={<StageBadge stage={3} />} />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/60 bg-card p-10 text-center">
          <p className="text-sm font-medium text-muted-foreground">
            هنوز پروفایلی ثبت نشده است. برای ثبت اطلاعات بدنی، راه‌اندازی را آغاز کنید.
          </p>
          <Button
            onClick={() => router.refresh()}
            variant="outline"
            className="border-border/70 font-semibold"
          >
            به‌روزرسانی وضعیت
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
        setFormError(first?.message ?? "اطلاعات واردشده معتبر نیست.");
        toast({
          title: "اعتبارسنجی ناموفق",
          description: first?.message ?? "فیلدهای مشخص‌شده را بررسی کنید.",
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
          title: "پروفایل ذخیره شد",
          description: "اطلاعات شما روی سرور و در پایگاه داده ثبت شد.",
        });
        router.refresh();
        return;
      }

      if (response.status === 401) {
        toast({ title: "نشست منقضی شده", description: "لطفاً دوباره وارد حساب خود شوید." });
        router.refresh();
        return;
      }

      if (response.status === 400) {
        const data = (await response.json()) as { fields?: Record<string, string> };
        const first = data.fields ? Object.values(data.fields)[0] : undefined;
        setFormError(first ?? "اطلاعات واردشده معتبر نیست.");
        toast({
          title: "اعتبارسنجی سرور ناموفق",
          description: first ?? "فیلدها را بررسی و دوباره تلاش کنید.",
        });
        return;
      }

      toast({
        title: "ذخیره انجام نشد",
        description: "خطای غیرمنتظره در سرور رخ داد؛ لطفاً دوباره تلاش کنید.",
      });
    } catch {
      toast({
        title: "ارتباط برقرار نشد",
        description: "اتصال اینترنت خود را بررسی و دوباره تلاش کنید.",
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
      title: "فرم بازنشانی شد",
      description: "مقادیر به آخرین نسخه ذخیره‌شده روی سرور بازگشت.",
    });
  };

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setDeleting(true);
    const ok = await deleteAccount();
    setDeleting(false);
    if (!ok) {
      toast({
        title: "حذف حساب انجام نشد",
        description: "خطای غیرمنتظره رخ داد؛ لطفاً دوباره تلاش کنید.",
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
            این فرم به <span className="font-bold text-foreground">پایگاه داده سرور</span> متصل
            است؛ تغییرات پس از ذخیره دائمی می‌شود و پس از بستن مرورگر باقی می‌ماند. رمز عبور
            حساب شما به‌صورت هش bcrypt نگهداری می‌شود و اطلاعات سلامت شما محرمانه تلقی می‌شود.
          </p>
          {profile?.complete && (
            <p className="mt-1.5 flex items-center gap-1.5 font-bold text-primary">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              پروفایل کامل است — آخرین به‌روزرسانی: <JalaliDate iso={profile.updatedAt} />
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
        <ProfileSection icon={UserRound} title="اطلاعات پایه">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="displayName" label="نام نمایشی">
              <Input id="displayName" placeholder="مثلاً علی" {...text("displayName")} />
            </Field>
            <Field id="age" label="سن" hint="سال">
              <Input id="age" inputMode="numeric" placeholder="مثلاً ۲۷" {...text("age")} />
            </Field>
            <Field id="gender" label="جنسیت" hint="اختیاری">
              <Select {...select("gender")}>
                <SelectTrigger id="gender" className="w-full" aria-label="انتخاب جنسیت">
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
            <Field id="units" label="واحد اندازه‌گیری">
              <Select {...select("units")}>
                <SelectTrigger id="units" className="w-full" aria-label="انتخاب واحد اندازه‌گیری">
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {UNITS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="height" label="قد" hint="سانتی‌متر">
              <Input id="height" inputMode="numeric" placeholder="مثلاً ۱۷۸" {...text("heightCm")} />
            </Field>
            <Field id="weight" label="وزن" hint="کیلوگرم">
              <Input id="weight" inputMode="decimal" placeholder="مثلاً ۷۵٫۵" {...text("weightKg")} />
            </Field>
            <Field id="bodyFat" label="درصد چربی بدن" hint="در صورت اطلاع">
              <Input id="bodyFat" inputMode="decimal" placeholder="مثلاً ۱۸" {...text("bodyFat")} />
            </Field>
          </div>
        </ProfileSection>

        {/* هدف و سطح */}
        <ProfileSection icon={Target} title="هدف و سطح تمرینی">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="goal" label="هدف تمرینی">
              <Select {...select("goal")}>
                <SelectTrigger id="goal" className="w-full" aria-label="انتخاب هدف تمرینی">
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
            <Field id="level" label="سطح تجربه">
              <Select {...select("experience")}>
                <SelectTrigger id="level" className="w-full" aria-label="انتخاب سطح تجربه">
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
            <Field id="daysPerWeek" label="روزهای تمرین در هفته">
              <Select {...select("trainingDaysPerWeek")}>
                <SelectTrigger id="daysPerWeek" className="w-full" aria-label="انتخاب روزهای تمرین">
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
            <Field id="sessionMinutes" label="مدت هر جلسه" hint="اختیاری">
              <Select {...select("sessionMinutes")}>
                <SelectTrigger id="sessionMinutes" className="w-full" aria-label="انتخاب مدت جلسه">
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
        </ProfileSection>

        {/* تجهیزات */}
        <ProfileSection icon={Dumbbell} title="تجهیزات در دسترس">
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
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground/70">
            برنامه‌ساز فقط حرکاتی را پیشنهاد می‌دهد که با تجهیزات شما قابل اجرا باشند.
          </p>
        </ProfileSection>

        {/* محدودیت‌ها */}
        <ProfileSection icon={HeartPulse} title="محدودیت‌های حرکتی و آسیب‌ها">
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
            <Field id="limitationNotes" label="توضیح بیشتر" hint="اختیاری">
              <Textarea
                id="limitationNotes"
                rows={3}
                placeholder="مثلاً: هنگام اسکات عمیق، درد خفیف زانوی راست..."
                {...text("limitationNotes")}
              />
            </Field>
          </div>
          <p className="mt-3 text-[10px] leading-5 text-muted-foreground/70">
            این بخش محرمانه است، جایگزین تشخیص پزشکی نیست؛ در صورت آسیب جدی با پزشک مشورت کنید.
          </p>
        </ProfileSection>
      </div>

      {/* ترجیحات غذایی */}
      <ProfileSection icon={HeartPulse} title="ترجیحات غذایی">
        <div className="grid gap-5 lg:grid-cols-2">
          <Field id="diet" label="رژیم غذایی انتخابی" hint="اختیاری">
            <Select {...select("diet")}>
              <SelectTrigger id="diet" className="w-full" aria-label="انتخاب رژیم غذایی">
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {DIET_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-foreground/90">
              آلرژی‌های غذایی
              <span className="ms-1.5 font-normal text-muted-foreground/70">(اختیاری)</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((option) => (
                <ChipToggle
                  key={option.value}
                  active={form.allergies.includes(option.value)}
                  onClick={() => toggleArrayField("allergies", option.value)}
                >
                  {option.label}
                </ChipToggle>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[10px] leading-5 text-muted-foreground/70">
          در مرحله برنامه غذایی، مواد غذایی دارای آلرژی برای شما هشدار می‌گیرند.
        </p>
      </ProfileSection>

      {/* حساب کاربری و امنیت */}
      <ProfileSection icon={ShieldCheck} title="حساب کاربری و امنیت">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="account-email" label="ایمیل حساب" hint="غیرقابل ویرایش در این نسخه">
            <Input
              id="account-email"
              dir="ltr"
              className="text-left"
              value={user?.email ?? ""}
              readOnly
              disabled
              aria-readonly="true"
            />
          </Field>
          <Field id="member-since" label="عضویت از" hint="تاریخ شمسی">
            <div className="flex h-9 items-center rounded-md border border-border/50 bg-secondary/30 px-3 text-sm text-muted-foreground">
              <JalaliDate iso={profile?.createdAt ?? null} />
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
            خروج از حساب
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
                حذف کامل حساب
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader className="text-start">
                <AlertDialogTitle>حذف کامل حساب کاربری؟</AlertDialogTitle>
                <AlertDialogDescription>
                  با تأیید، حساب شما به‌همراه پروفایل تناسب اندام و همه اطلاعات وابسته به‌صورت
                  کامل از پایگاه داده حذف می‌شود و این عملیات قابل بازگشت نیست. برای ادامه،
                  دکمه تأیید را بزنید.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogAction
                  onClick={() => void handleDeleteAccount()}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  بله، حسابم را حذف کن
                </AlertDialogAction>
                <AlertDialogCancel className="font-semibold">انصراف</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-5 text-muted-foreground/70">
          <Ruler className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          رمز عبور شما با bcrypt هش می‌شود، نشست با کوکی امن HttpOnly نگهداری می‌شود و با خروج
          یا حذف حساب، نشست‌ها ابطال می‌شوند.
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
          {saving ? "در حال ذخیره…" : "ذخیره روی سرور"}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={saving}
          className="border-border/70 font-semibold hover:border-destructive/50 hover:text-destructive"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          بازگرداندن به نسخه ذخیره‌شده
        </Button>
        <p className="ms-auto hidden items-center gap-1.5 text-[10px] text-muted-foreground/70 sm:flex">
          <Save className="size-3.5" aria-hidden="true" />
          ذخیره‌سازی دائمی در پایگاه داده سرور
        </p>
      </div>
    </motion.div>
  );
}
