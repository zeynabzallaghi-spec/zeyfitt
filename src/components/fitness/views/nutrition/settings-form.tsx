"use client";

/**
 * فرم تنظیمات برنامه غذایی — پیش‌فرض‌ها از پروفایل واقعی کاربر بدون تغییر آن.
 * اگر پروفایل سن/قد/وزن نداشته باشد، همین فرم آن‌ها را می‌گیرد و فقط برای
 * برآورد همین برنامه استفاده می‌کند (پروفایل دست‌نخورده می‌ماند).
 * برای گروه‌های نیازمند احتیاط (زیر ۱۸، بارداری) هشدار و محدودسازی انجام می‌شود.
 */

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  Loader2,
  Salad,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { FitnessProfileClient } from "@/lib/profile";
import { ALLERGY_OPTIONS, faDigits, normalizeDigits } from "@/lib/profile";
import { ALLERGEN_DEFS, FOOD_BANK, foodGroupFa, type AllergenId } from "@/lib/foods";
import {
  ACTIVITY_LEVELS,
  DIET_PATTERN_LABELS,
  NUTRITION_GOAL_LABELS,
  type DietPattern,
  type EstimateInfo,
  type NutritionGoal,
  type NutritionSettings,
} from "@/lib/nutrition-engine/types";
import { nutritionSettingsSchema } from "@/lib/nutrition-engine/schema";

interface Props {
  profile: FitnessProfileClient | null;
  submitting: boolean;
  serverError: string | null;
  onSubmit: (settings: NutritionSettings) => void;
  onCancel: () => void;
}

/** نگاشت هدف تمرینی پروفایل به پیش‌فرض هدف تغذیه‌ای */
function goalDefaultFromProfile(goal: string | null): NutritionGoal {
  if (goal === "fat_loss") return "weight_loss";
  if (goal === "muscle_gain" || goal === "strength") return "muscle_gain";
  return "maintain";
}

/** نگاشت رژیم پروفایل به الگوی قابل‌پشتیبانی موتور — با شفافیت */
function dietDefaultFromProfile(diet: string | null): { pattern: DietPattern; note: string | null } {
  if (diet === "vegan") return { pattern: "vegan", note: null };
  if (diet === "vegetarian") return { pattern: "vegetarian", note: null };
  if (diet === "keto") {
    return {
      pattern: "none",
      note: "الگوی کتوژنیک در موتور فعلی پشتیبانی نمی‌شود؛ برنامه با الگوی معمولی ساخته می‌شود.",
    };
  }
  return { pattern: "none", note: null };
}

/** نگاشت آلرژی‌های پروفایل به آلرژن‌های بانک مواد */
function allergensFromProfile(allergies: string[]): AllergenId[] {
  const valid = new Set(ALLERGEN_DEFS.map((a) => a.id));
  return allergies.filter((a): a is AllergenId => valid.has(a as AllergenId));
}

export function NutritionSettingsForm({ profile, submitting, serverError, onSubmit, onCancel }: Props) {
  const profileHasEstimate = Boolean(profile?.age && profile?.heightCm && profile?.weightKg);

  const [goal, setGoal] = useState<NutritionGoal>(goalDefaultFromProfile(profile?.goal ?? null));
  const [activityLevel, setActivityLevel] = useState<string>("moderate");
  const [mealsPerDay, setMealsPerDay] = useState(4);
  const [planLength, setPlanLength] = useState<1 | 7>(7);
  const dietMap = useMemo(() => dietDefaultFromProfile(profile?.diet ?? null), [profile?.diet]);
  const [dietPattern, setDietPattern] = useState<DietPattern>(dietMap.pattern);
  const [allergens, setAllergens] = useState<AllergenId[]>(allergensFromProfile(profile?.allergies ?? []));
  const [dislikedFoodIds, setDislikedFoodIds] = useState<string[]>([]);
  const [budget, setBudget] = useState<"any" | "low">("any");
  const [prep, setPrep] = useState<"any" | "simple">("any");
  const [pregnancyBreastfeeding, setPregnancyBreastfeeding] = useState(false);

  // اطلاعات برآورد — اگر پروفایل کامل باشد فقط خواندنی نمایش داده می‌شود؛
  // وگرنه فرم محلی آن را می‌گیرد (بدون تغییر پروفایل)
  const [age, setAge] = useState(profile?.age ? String(profile.age) : "");
  const [heightCm, setHeightCm] = useState(profile?.heightCm ? String(profile.heightCm) : "");
  const [weightKg, setWeightKg] = useState(profile?.weightKg ? String(profile.weightKg) : "");
  const [formError, setFormError] = useState<string | null>(null);

  const isUnderage = (() => {
    const source = profileHasEstimate ? profile?.age : Number(normalizeDigits(age));
    return typeof source === "number" && source > 0 && source < 18;
  })();

  const toggleAllergen = (id: AllergenId) => {
    setAllergens((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  };

  const toggleDisliked = (id: string) => {
    setDislikedFoodIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    setFormError(null);

    let estimate: EstimateInfo | null;
    if (profileHasEstimate && profile) {
      estimate = {
        age: profile.age!,
        heightCm: profile.heightCm!,
        weightKg: profile.weightKg!,
        gender: profile.gender === "male" || profile.gender === "female" ? profile.gender : "undisclosed",
      };
    } else {
      const parsedAge = Number(normalizeDigits(age));
      const parsedHeight = Number(normalizeDigits(heightCm));
      const parsedWeight = Number(normalizeDigits(weightKg));
      if (!parsedAge || !parsedHeight || !parsedWeight) {
        setFormError("برای برآورد کالری، سن، قد و وزن لازم است — این مقادیر فقط برای همین برنامه استفاده می‌شوند و پروفایل شما تغییر نمی‌کند.");
        return;
      }
      estimate = { age: parsedAge, heightCm: parsedHeight, weightKg: parsedWeight, gender: "undisclosed" };
    }

    const candidate = {
      goal,
      activityLevel,
      mealsPerDay,
      planLength,
      dietPattern,
      allergens,
      dislikedFoodIds,
      budget,
      prep,
      pregnancyBreastfeeding,
      estimate,
    };

    const parsed = nutritionSettingsSchema.safeParse(candidate);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "اطلاعات معتبر نیست.");
      return;
    }

    onSubmit(parsed.data as NutritionSettings);
  };

  const showPregnancyField = profile?.gender ? profile.gender === "female" : true;

  return (
    <div className="flex flex-col gap-4">
      {/* بخش ۱ — اطلاعات برآورد */}
      <section aria-label="اطلاعات برآورد" className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <UserRound className="size-4 text-primary" aria-hidden="true" />
          اطلاعات برآورد انرژی
        </h3>
        {profileHasEstimate ? (
          <>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">سن</p>
                <p className="mt-1 text-sm font-bold">{faDigits(profile?.age ?? "—")} سال</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">قد</p>
                <p className="mt-1 text-sm font-bold">{faDigits(profile?.heightCm ?? "—")} سانتی‌متر</p>
              </div>
              <div className="rounded-xl border border-border/50 bg-secondary/30 p-3 text-center">
                <p className="text-[10px] text-muted-foreground">وزن</p>
                <p className="mt-1 text-sm font-bold">{faDigits(profile?.weightKg ?? "—")} کیلوگرم</p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              از پروفایل شما خوانده شد. برای اصلاح، پروفایل را ویرایش کنید — این فرم پروفایل را تغییر نمی‌دهد.
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              این اطلاعات در پروفایل شما ثبت نشده است. برای برآورد کالری همین‌جا وارد کنید؛
              فقط برای همین برنامه استفاده می‌شود و پروفایل تغییر نمی‌کند.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nutrition-age" className="text-[11px]">سن (سال)</Label>
                <Input
                  id="nutrition-age"
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="مثلاً ۳۰"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nutrition-height" className="text-[11px]">قد (سانتی‌متر)</Label>
                <Input
                  id="nutrition-height"
                  inputMode="numeric"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="مثلاً ۱۷۵"
                  className="h-9 text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nutrition-weight" className="text-[11px]">وزن (کیلوگرم)</Label>
                <Input
                  id="nutrition-weight"
                  inputMode="decimal"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="مثلاً ۷۵"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* سطح فعالیت — تنها فیلد ضروری که در پروفایل وجود ندارد */}
        <div className="mt-4 flex flex-col gap-1.5">
          <Label htmlFor="nutrition-activity" className="text-[11px]">
            سطح فعالیت روزانه (خارج از تمرین)
          </Label>
          <Select value={activityLevel} onValueChange={setActivityLevel}>
            <SelectTrigger id="nutrition-activity" className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {ACTIVITY_LEVELS.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.fa} — {level.hint}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isUnderage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
            <p className="text-[11px] leading-5 text-amber-200">
              سن کمتر از ۱۸ سال: هدف کاهش یا افزایش وزن خودکار تنظیم نمی‌شود و برنامه با هدف
              حفظ وزن ساخته خواهد شد. برای برنامه اختصاصی با متخصص تغذیه مشورت کنید.
            </p>
          </div>
        )}

        {showPregnancyField && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-secondary/20 p-3">
            <div>
              <p className="text-xs font-semibold">بارداری یا شیردهی</p>
              <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                در این حالت هدف کالری کاهشی/افزایشی خودکار تنظیم نمی‌شود.
              </p>
            </div>
            <Switch
              checked={pregnancyBreastfeeding}
              onCheckedChange={setPregnancyBreastfeeding}
              aria-label="بارداری یا شیردهی"
            />
          </div>
        )}
      </section>

      {/* بخش ۲ — هدف و ساختار برنامه */}
      <section aria-label="هدف و ساختار برنامه" className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Salad className="size-4 text-primary" aria-hidden="true" />
          هدف و ساختار برنامه
        </h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px]">هدف تغذیه‌ای</Label>
            <Select value={goal} onValueChange={(v) => setGoal(v as NutritionGoal)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {(Object.keys(NUTRITION_GOAL_LABELS) as NutritionGoal[]).map((g) => (
                  <SelectItem key={g} value={g}>
                    {NUTRITION_GOAL_LABELS[g]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px]">الگوی غذایی</Label>
            <Select value={dietPattern} onValueChange={(v) => setDietPattern(v as DietPattern)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {(Object.keys(DIET_PATTERN_LABELS) as DietPattern[]).map((d) => (
                  <SelectItem key={d} value={d}>
                    {DIET_PATTERN_LABELS[d]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dietMap.note && dietPattern === dietMap.pattern && (
              <p className="text-[10px] leading-4 text-amber-300">{dietMap.note}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px]">تعداد وعده در روز</Label>
            <Select value={String(mealsPerDay)} onValueChange={(v) => setMealsPerDay(Number(v))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {[3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {faDigits(n)} وعده
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px]">طول برنامه</Label>
            <Select value={String(planLength)} onValueChange={(v) => setPlanLength(Number(v) as 1 | 7)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="7">هفتگی — ۷ روز با تنوع</SelectItem>
                <SelectItem value="1">یک‌روزه — الگوی تکراری</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* بخش ۳ — ترجیحات و محدودیت‌ها */}
      <section aria-label="ترجیحات و محدودیت‌ها" className="rounded-2xl border border-border/60 bg-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <AlertTriangle className="size-4 text-primary" aria-hidden="true" />
          آلرژی‌ها و ترجیحات
        </h3>

        <p className="mt-3 text-[11px] text-muted-foreground">آلرژی‌ها — مواد دارای این آلرژن‌ها به‌طور کامل حذف می‌شوند:</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALLERGY_OPTIONS.map((option) => {
            const active = allergens.includes(option.value as AllergenId);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleAllergen(option.value as AllergenId)}
                aria-pressed={active}
                className={`rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition-all ${
                  active
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-primary/30"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] text-muted-foreground">
          مواد نامطلوب (اختیاری) — از {faDigits(FOOD_BANK.length)} ماده بانک:
        </p>
        <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-border/50 bg-secondary/20 p-3">
          <div className="flex flex-wrap gap-1.5">
            {FOOD_BANK.map((food) => {
              const active = dislikedFoodIds.includes(food.id);
              return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => toggleDisliked(food.id)}
                  aria-pressed={active}
                  title={foodGroupFa(food.group)}
                  className={`rounded-md border px-2 py-1 text-[10px] font-medium transition-all ${
                    active
                      ? "border-destructive/40 bg-destructive/10 text-rose-300 line-through"
                      : "border-border/50 bg-card text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  {food.fa}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px]">بودجه</Label>
            <Select value={budget} onValueChange={(v) => setBudget(v as "any" | "low")}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="any">بدون محدودیت</SelectItem>
                <SelectItem value="low">اقتصادی — مواد گران حذف شود</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="text-[11px]">آماده‌سازی غذا</Label>
            <Select value={prep} onValueChange={(v) => setPrep(v as "any" | "simple")}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="any">بدون اولویت</SelectItem>
                <SelectItem value="simple">ساده و سریع</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3 text-[11px] leading-5 text-amber-200/90">
          اگر بیماری مرتبط با تغذیه، اختلال خوردن یا نیاز درمانی دارید، این ابزار برای شما مناسب
          نیست؛ لطفاً با پزشک یا متخصص تغذیه مشورت کنید.
        </p>
      </section>

      {/* خطاها */}
      {(formError || serverError) && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3">
          <p className="text-[11px] font-semibold leading-5 text-rose-200">{formError ?? serverError}</p>
        </div>
      )}

      {/* دکمه‌ها */}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="font-bold text-primary-foreground glow-lime-sm"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Salad className="size-4" aria-hidden="true" />
          )}
          ساخت پیش‌نمایش برنامه
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setFormError(null);
            onCancel();
          }}
          disabled={submitting}
          className="border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
        >
          انصراف
        </Button>
        <span className="text-[10px] text-muted-foreground/70">
          پیش‌نمایش قبل از ذخیره نمایش داده می‌شود
        </span>
      </div>
    </div>
  );
}
