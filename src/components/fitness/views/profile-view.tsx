"use client";

import { motion } from "framer-motion";
import { Save, RotateCcw, Info, UserRound, Target, Dumbbell, HeartPulse, CircleCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getNavItem } from "@/lib/nav";
import {
  useFitnessStore,
  type ProfileDraft,
} from "@/store/fitness-store";
import { ViewIntro } from "../shared/view-intro";
import { DemoBadge, StageBadge } from "../shared/badges";

const GENDER_OPTIONS = ["مرد", "زن", "ترجیح می‌دهم اعلام نکنم"];
const GOAL_OPTIONS = ["عضله‌سازی", "کاهش چربی", "افزایش قدرت", "حفظ وزن", "بهبود آمادگی جسمانی"];
const LEVEL_OPTIONS = ["مبتدی", "متوسط", "پیشرفته"];
const DAYS_OPTIONS = ["۱ روز", "۲ روز", "۳ روز", "۴ روز", "۵ روز", "۶ روز", "۷ روز"];
const SESSION_OPTIONS = ["۳۰ دقیقه", "۴۵ دقیقه", "۶۰ دقیقه", "۹۰ دقیقه"];
const EQUIPMENT_OPTIONS = ["وزنه آزاد (هالتر و دمبل)", "دستگاه‌های باشگاه", "سیم‌کش", "کش مقاومتی", "کتل‌بل", "وزن بدن"];
const LIMITATION_OPTIONS = ["زانو", "کمر", "شانه", "مچ دست", "گردن"];
const DIET_OPTIONS = ["بدون رژیم خاص", "کاهش وزن", "حجم (عضله‌سازی)", "کتوژنیک", "گیاهخواری", "وگان"];
const ALLERGY_OPTIONS = ["لبنیات", "گلوتن", "آجیل", "غذای دریایی", "تخم‌مرغ"];

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}

function Field({ id, label, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-foreground/90">
        {label}
        {hint && <span className="ms-1.5 font-normal text-muted-foreground/70">({hint})</span>}
      </Label>
      {children}
    </div>
  );
}

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 active:scale-[0.97]",
        active
          ? "border-primary/45 bg-primary/15 text-primary"
          : "border-border/50 bg-secondary/30 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function ProfileSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <h3 className="flex items-center gap-2.5 text-sm font-bold">
        <span className="flex size-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ProfileView() {
  const item = getNavItem("profile");
  const { toast } = useToast();
  const draft = useFitnessStore((s) => s.profileDraft);
  const setProfileField = useFitnessStore((s) => s.setProfileField);
  const toggleProfileArrayField = useFitnessStore((s) => s.toggleProfileArrayField);
  const saveProfileDraft = useFitnessStore((s) => s.saveProfileDraft);
  const resetProfileDraft = useFitnessStore((s) => s.resetProfileDraft);

  const handleSave = () => {
    saveProfileDraft();
    toast({
      title: "پیش‌نویس در همین نشست نگه داشته شد",
      description:
        "در این مرحله اطلاعات روی سرور ذخیره نمی‌شود. ذخیره‌سازی دائمی و امن (با هش رمز عبور در سمت سرور) پس از ساخت حساب کاربری در مرحله ۲ فعال خواهد شد.",
    });
  };

  const handleReset = () => {
    resetProfileDraft();
    toast({ title: "فرم بازنشانی شد", description: "همه مقادیر پیش‌نویس پاک شدند." });
  };

  const text = (key: keyof ProfileDraft) => ({
    value: draft[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setProfileField(key, e.target.value as never),
  });

  const select = (key: keyof ProfileDraft) => ({
    value: (draft[key] as string) || undefined,
    onValueChange: (v: string) => setProfileField(key, v as never),
  });

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
            <DemoBadge>پیش‌نمایش تعاملی فرم</DemoBadge>
            <StageBadge stage={2} />
          </>
        }
      />

      {/* بنر شفافیت */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
        <Info className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
        <div className="text-xs leading-6 text-muted-foreground">
          <p>
            این فرم کاملاً تعاملی است اما در این مرحله به سرور متصل نیست؛ تغییرات فقط تا پایان
            نشست مرورگر شما نگه داشته می‌شود. ساخت حساب کاربری، ورود امن و ذخیره‌سازی دائمی در
            مرحله ۲ پیاده‌سازی می‌شود.
          </p>
          {draft.saved && (
            <p className="mt-1.5 flex items-center gap-1.5 font-bold text-primary">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              پیش‌نویس فعلی در این نشست فعال است
            </p>
          )}
        </div>
      </div>

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
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="bodyFat" label="درصد چربی بدن" hint="در صورت اطلاع">
              <Input id="bodyFat" inputMode="decimal" placeholder="مثلاً ۱۸" {...text("bodyFat")} />
            </Field>
            <Field id="height" label="قد" hint="سانتی‌متر">
              <Input id="height" inputMode="numeric" placeholder="مثلاً ۱۷۸" {...text("height")} />
            </Field>
            <Field id="weight" label="وزن" hint="کیلوگرم">
              <Input id="weight" inputMode="decimal" placeholder="مثلاً ۷۵٫۵" {...text("weight")} />
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
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="level" label="سطح تجربه">
              <Select {...select("level")}>
                <SelectTrigger id="level" className="w-full" aria-label="انتخاب سطح تجربه">
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="daysPerWeek" label="روزهای تمرین در هفته">
              <Select {...select("daysPerWeek")}>
                <SelectTrigger id="daysPerWeek" className="w-full" aria-label="انتخاب روزهای تمرین">
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="sessionMinutes" label="مدت هر جلسه">
              <Select {...select("sessionMinutes")}>
                <SelectTrigger id="sessionMinutes" className="w-full" aria-label="انتخاب مدت جلسه">
                  <SelectValue placeholder="انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
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
                key={option}
                active={draft.equipment.includes(option)}
                onClick={() => toggleProfileArrayField("equipment", option)}
              >
                {option}
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
                key={option}
                active={draft.limitations.includes(option)}
                onClick={() => toggleProfileArrayField("limitations", option)}
              >
                {option}
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
            این بخش جایگزین تشخیص پزشکی نیست؛ در صورت آسیب جدی با پزشک مشورت کنید.
          </p>
        </ProfileSection>
      </div>

      {/* ترجیحات غذایی */}
      <ProfileSection icon={HeartPulse} title="ترجیحات غذایی">
        <div className="grid gap-5 lg:grid-cols-2">
          <Field id="diet" label="رژیم غذایی انتخابی">
            <Select {...select("diet")}>
              <SelectTrigger id="diet" className="w-full" aria-label="انتخاب رژیم غذایی">
                <SelectValue placeholder="انتخاب کنید" />
              </SelectTrigger>
              <SelectContent>
                {DIET_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="flex flex-col gap-2">
            <Label className="text-xs font-semibold text-foreground/90">آلرژی‌های غذایی</Label>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_OPTIONS.map((option) => (
                <ChipToggle
                  key={option}
                  active={draft.allergies.includes(option)}
                  onClick={() => toggleProfileArrayField("allergies", option)}
                >
                  {option}
                </ChipToggle>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 text-[10px] leading-5 text-muted-foreground/70">
          برنامه غذایی از مواد غذایی دارای آلرژی برای شما هشدار نمایش می‌دهد.
        </p>
      </ProfileSection>

      {/* دکمه‌های عملیات */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleSave} className="font-bold text-primary-foreground glow-lime-sm">
          <Save className="size-4" aria-hidden="true" />
          ذخیره پیش‌نویس در نشست
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          className="border-border/70 font-semibold hover:border-destructive/50 hover:text-destructive"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          بازنشانی فرم
        </Button>
      </div>
    </motion.div>
  );
}
