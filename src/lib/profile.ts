import { z } from "zod";
import type { FitnessProfile as DbFitnessProfile } from "@prisma/client";

/**
 * لایه مشترک پروفایل تناسب اندام — بین فرم‌های کلاینت و اعتبارسنجی سرور مشترک است.
 * کدهای گزینه‌ها (به‌جای متن فارسی) در پایگاه داده ذخیره می‌شوند و برچسب فارسی
 * فقط در رابط کاربری نمایش داده می‌شود.
 */

/* ---------------------------------- گزینه‌ها ---------------------------------- */

export interface OptionItem<V extends string = string> {
  value: V;
  label: string;
}

export const GOAL_OPTIONS = [
  { value: "fat_loss", label: "کاهش چربی" },
  { value: "muscle_gain", label: "عضله‌سازی" },
  { value: "strength", label: "افزایش قدرت" },
  { value: "maintain", label: "حفظ وزن" },
  { value: "fitness", label: "بهبود آمادگی جسمانی" },
] as const satisfies readonly OptionItem[];

export const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "مبتدی" },
  { value: "intermediate", label: "متوسط" },
  { value: "advanced", label: "پیشرفته" },
] as const satisfies readonly OptionItem[];

export const GENDER_OPTIONS = [
  { value: "male", label: "مرد" },
  { value: "female", label: "زن" },
  { value: "undisclosed", label: "ترجیح می‌دهم اعلام نکنم" },
] as const satisfies readonly OptionItem[];

export const UNITS_OPTIONS = [
  { value: "metric", label: "متریک — کیلوگرم و سانتی‌متر" },
  { value: "imperial", label: "امپریال — پوند و فوت" },
] as const satisfies readonly OptionItem[];

export const SESSION_MINUTES_OPTIONS = [30, 45, 60, 90] as const;

export const EQUIPMENT_OPTIONS = [
  { value: "free_weights", label: "وزنه آزاد (هالتر و دمبل)" },
  { value: "machines", label: "دستگاه‌های باشگاه" },
  { value: "cables", label: "سیم‌کش" },
  { value: "resistance_band", label: "کش مقاومتی" },
  { value: "kettlebell", label: "کتل‌بل" },
  { value: "bodyweight", label: "وزن بدن" },
] as const satisfies readonly OptionItem[];

export const LIMITATION_OPTIONS = [
  { value: "knee", label: "زانو" },
  { value: "lower_back", label: "کمر" },
  { value: "shoulder", label: "شانه" },
  { value: "wrist", label: "مچ دست" },
  { value: "neck", label: "گردن" },
] as const satisfies readonly OptionItem[];

export const DIET_OPTIONS = [
  { value: "none", label: "بدون رژیم خاص" },
  { value: "weight_loss", label: "کاهش وزن" },
  { value: "bulking", label: "حجم (عضله‌سازی)" },
  { value: "keto", label: "کتوژنیک" },
  { value: "vegetarian", label: "گیاهخواری" },
  { value: "vegan", label: "وگان" },
] as const satisfies readonly OptionItem[];

export const ALLERGY_OPTIONS = [
  { value: "dairy", label: "لبنیات" },
  { value: "gluten", label: "گلوتن" },
  { value: "nuts", label: "آجیل" },
  { value: "seafood", label: "غذای دریایی" },
  { value: "egg", label: "تخم‌مرغ" },
] as const satisfies readonly OptionItem[];

export function labelOf(options: readonly OptionItem[], value: string | null | undefined): string {
  if (!value) return "—";
  return options.find((option) => option.value === value)?.label ?? "—";
}

/* ----------------------------- نرمال‌سازی ارقام ----------------------------- */

const DIGIT_MAP: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

/** تبدیل ارقام فارسی/عربی به لاتین — برای ورودی‌های عددی فرم‌ها */
export function normalizeDigits(input: string): string {
  return input.replace(/[۰-۹٠-٩]/g, (digit) => DIGIT_MAP[digit] ?? digit);
}

/** تبدیل رقم لاتین به فارسی — برای پیام‌ها */
export function faDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => {
    const found = Object.entries(DIGIT_MAP).find(([, latin]) => latin === d);
    return found ? found[0] : d;
  });
}

/** نرمال‌سازی ایمیل: حذف فاصله‌ها و حروف کوچک — در کلاینت و سرور یکسان */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------- پیش‌پردازش اعداد برای Zod ------------------------- */

function toNumberOrKeep(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const cleaned = normalizeDigits(value).trim().replace(/[٫,]/g, ".");
    if (cleaned === "") return null;
    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? value : parsed;
  }
  return value;
}

function requiredNumber(min: number, max: number, label: string) {
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : toNumberOrKeep(v)),
    z
      .number({ message: `${label} را وارد کنید` })
      .min(min, `${label} باید حداقل ${faDigits(min)} باشد`)
      .max(max, `${label} باید حداکثر ${faDigits(max)} باشد`)
  );
}

function optionalNumber(min: number, max: number, label: string) {
  return z.preprocess(
    toNumberOrKeep,
    z
      .number({ message: `${label} باید عدد معتبر باشد` })
      .min(min, `${label} باید حداقل ${faDigits(min)} باشد`)
      .max(max, `${label} باید حداکثر ${faDigits(max)} باشد`)
      .nullable()
  );
}

/* ------------------------------- شِمای پروفایل ------------------------------- */

/**
 * شِمای کامل پروفایل — هم در کلاینت (پیام‌های فارسی پیش از ارسال) و هم در
 * سرور (مرجع نهایی اعتبارسنجی) استفاده می‌شود. userId هرگز بخشی از این
 * شِما نیست؛ سرور آن را از نشست می‌خواند.
 */
export const profilePayloadSchema = z.object({
  displayName: z
    .string({ message: "نام نمایشی را وارد کنید" })
    .trim()
    .min(2, "نام نمایشی باید حداقل ۲ کاراکتر باشد")
    .max(60, "نام نمایشی حداکثر ۶۰ کاراکتر است"),
  age: requiredNumber(10, 90, "سن"),
  gender: z.enum(["male", "female", "undisclosed"]).nullable(),
  heightCm: requiredNumber(100, 250, "قد (سانتی‌متر)"),
  weightKg: requiredNumber(25, 300, "وزن (کیلوگرم)"),
  bodyFat: optionalNumber(1, 70, "درصد چربی بدن"),
  goal: z.enum(["fat_loss", "muscle_gain", "strength", "maintain", "fitness"], {
    message: "هدف تمرینی را انتخاب کنید",
  }),
  experience: z.enum(["beginner", "intermediate", "advanced"], {
    message: "سطح تجربه را انتخاب کنید",
  }),
  trainingDaysPerWeek: requiredNumber(1, 7, "روزهای تمرین در هفته"),
  sessionMinutes: optionalNumber(15, 180, "مدت هر جلسه"),
  equipment: z.array(z.string()).max(20, "فهرست تجهیزات بسیار طولانی است").default([]),
  limitations: z.array(z.string()).max(20, "فهرست محدودیت‌ها بسیار طولانی است").default([]),
  limitationNotes: z
    .string()
    .trim()
    .max(500, "توضیحات حداکثر ۵۰۰ کاراکتر است")
    .nullable(),
  diet: z
    .enum(["none", "weight_loss", "bulking", "keto", "vegetarian", "vegan"])
    .nullable(),
  allergies: z.array(z.string()).max(20, "فهرست آلرژی‌ها بسیار طولانی است").default([]),
  units: z.enum(["metric", "imperial"]).default("metric"),
});

export type ProfilePayload = z.output<typeof profilePayloadSchema>;
export type ProfilePayloadInput = z.input<typeof profilePayloadSchema>;

/* ------------------------------ تایپ سمت کلاینت ------------------------------ */

export interface FitnessProfileClient {
  id: string;
  userId: string;
  displayName: string;
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bodyFat: number | null;
  goal: string | null;
  experience: string | null;
  trainingDaysPerWeek: number | null;
  sessionMinutes: number | null;
  equipment: string[];
  limitations: string[];
  limitationNotes: string | null;
  diet: string | null;
  allergies: string[];
  units: "metric" | "imperial";
  createdAt: string;
  updatedAt: string;
  complete: boolean;
  completionPercent: number;
}

/* --------------------------- تبدیل ردیف دیتابیس --------------------------- */

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string").slice(0, 30);
    }
    return [];
  } catch {
    return [];
  }
}

export function toClientProfile(row: DbFitnessProfile): FitnessProfileClient {
  const client: FitnessProfileClient = {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    age: row.age ?? null,
    gender: row.gender ?? null,
    heightCm: row.heightCm ?? null,
    weightKg: row.weightKg ?? null,
    bodyFat: row.bodyFat ?? null,
    goal: row.goal ?? null,
    experience: row.experience ?? null,
    trainingDaysPerWeek: row.trainingDaysPerWeek ?? null,
    sessionMinutes: row.sessionMinutes ?? null,
    equipment: parseJsonArray(row.equipmentJson),
    limitations: parseJsonArray(row.limitationsJson),
    limitationNotes: row.limitationNotes ?? null,
    diet: row.diet ?? null,
    allergies: parseJsonArray(row.allergiesJson),
    units: row.units === "imperial" ? "imperial" : "metric",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    complete: false,
    completionPercent: 0,
  };
  const status = computeProfileStatus(client);
  client.complete = status.complete;
  client.completionPercent = status.percent;
  return client;
}

/* ------------------------------ وضعیت تکمیل ------------------------------ */

const REQUIRED_CHECKS = [
  "displayName",
  "age",
  "heightCm",
  "weightKg",
  "goal",
  "experience",
  "trainingDaysPerWeek",
] as const;

export interface ProfileStatus {
  complete: boolean;
  percent: number;
  missingLabels: string[];
}

/** محاسبه وضعیت تکمیل پروفایل — بر اساس فیلدهای الزامی */
export function computeProfileStatus(
  profile: Pick<
    FitnessProfileClient,
    "displayName" | "age" | "heightCm" | "weightKg" | "goal" | "experience" | "trainingDaysPerWeek"
  > | null
): ProfileStatus {
  if (!profile) {
    return { complete: false, percent: 0, missingLabels: REQUIRED_CHECKS.map(faFieldLabel) };
  }
  const missingLabels: string[] = [];
  if (!profile.displayName || profile.displayName.trim().length < 2) missingLabels.push(faFieldLabel("displayName"));
  if (profile.age === null) missingLabels.push(faFieldLabel("age"));
  if (profile.heightCm === null) missingLabels.push(faFieldLabel("heightCm"));
  if (profile.weightKg === null) missingLabels.push(faFieldLabel("weightKg"));
  if (!profile.goal) missingLabels.push(faFieldLabel("goal"));
  if (!profile.experience) missingLabels.push(faFieldLabel("experience"));
  if (profile.trainingDaysPerWeek === null) missingLabels.push(faFieldLabel("trainingDaysPerWeek"));

  const total = REQUIRED_CHECKS.length;
  const filled = total - missingLabels.length;
  return {
    complete: missingLabels.length === 0,
    percent: Math.round((filled / total) * 100),
    missingLabels,
  };
}

function faFieldLabel(field: (typeof REQUIRED_CHECKS)[number]): string {
  switch (field) {
    case "displayName":
      return "نام نمایشی";
    case "age":
      return "سن";
    case "heightCm":
      return "قد";
    case "weightKg":
      return "وزن";
    case "goal":
      return "هدف تمرینی";
    case "experience":
      return "سطح تجربه";
    case "trainingDaysPerWeek":
      return "روزهای تمرین در هفته";
  }
}
