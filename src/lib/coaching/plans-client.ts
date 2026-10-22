/**
 * تایپ‌های کلاینت برنامه‌های اختصاصی مربی — مرحله ۱۶.
 * آینه‌ای از پاسخ‌های API بدون هیچ منطق مجوزی؛ هر تصمیمی سمت سرور گرفته
 * می‌شود و کلاینت فقط وضعیت تأییدشده را نمایش می‌دهد.
 */

export interface CoachPlanMetaClient {
  difficulty?: string;
  durationMinutes?: number;
  durationDays?: number;
  daysCount: number;
  exercisesCount?: number;
  mealsCount?: number;
  itemsCount?: number;
}

export interface CoachPlanExerciseContentClient {
  order: number;
  exerciseId: string;
  faName: string;
  enName: string;
  category: string;
  coach3dId: string | null;
  /** منبع حرکت — سرور از ۱۹.۶ همیشه مینویسد؛ نبودش (داده قدیمی) یعنی public */
  source: "public" | "personal";
  /**
   * R1.4 (مرحله ۲۰/P1): snapshot عضلات اصلی از محتوای ذخیره‌شده —
   * نبودش (داده قدیمی پیش از P1) یعنی حل از بانک در مسیرهای نمایش.
   */
  primaryMuscles?: string[];
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  estimatedMinutes: number;
  note: string | null;
  suggestedWeightKg: number | null;
}

export interface CoachPlanDayContentClient {
  order: number;
  title: string;
  estMinutes: number;
  exercises: CoachPlanExerciseContentClient[];
}

export interface CoachWorkoutContentClient {
  days: CoachPlanDayContentClient[];
}

export interface CoachMealItemContentClient {
  order: number;
  foodId: string;
  faName: string;
  enName: string;
  group: string;
  grams: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  servingHint: string;
}

export interface CoachMealContentClient {
  order: number;
  type: string;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  items: CoachMealItemContentClient[];
}

export interface CoachNutritionDayContentClient {
  order: number;
  kcal: number;
  protein: number;
  carb: number;
  fat: number;
  meals: CoachMealContentClient[];
}

export interface CoachNutritionContentClient {
  days: CoachNutritionDayContentClient[];
}

/* ------------------------------ سمت مربی ------------------------------ */

export interface CoachPlanListItemClient {
  id: string;
  kind: "workout" | "nutrition";
  title: string;
  description: string;
  goal: string;
  status: "draft" | "published" | "archived";
  currentVersion: number;
  meta: CoachPlanMetaClient;
  assignedStudent: { userId: string; displayName: string } | null;
  cooperationType: string | null;
  firstSentAt: string | null;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoachPlanDetailClient extends CoachPlanListItemClient {
  content: CoachWorkoutContentClient | CoachNutritionContentClient;
}

export interface CoachPlanVersionClient {
  id: string;
  version: number;
  sentAt: string;
  studentId: string;
}

/* ------------------------------ سمت دانشجو ------------------------------ */

export interface DeliveryListItemClient {
  id: string;
  planKind: "workout" | "nutrition";
  version: number;
  title: string;
  description: string;
  goal: string;
  meta: CoachPlanMetaClient;
  sentAt: string;
  coach: { userId: string; displayName: string };
  cooperationType: string | null;
}

export interface DeliveryDetailClient extends DeliveryListItemClient {
  content: CoachWorkoutContentClient | CoachNutritionContentClient;
  connectionStatus: string | null;
}

/* --------------------------- ورودی سازنده (محلی) --------------------------- */

/** ورودی حرکت در فرم مربی — نام‌ها برای نمایش انتخاب از بانک؛ سرور بازتأیید می‌کند */
export interface BuilderExerciseInput {
  /** قالب سیم: حرکت شخصی با پیشوند cex- (قرارداد واحد personal-exercise-id.ts) */
  exerciseId: string;
  /** منبع حرکت — بر اساس آن بج «شخصی» و بازسازی قالب سیم در ویرایش */
  source: "public" | "personal";
  faName: string;
  enName: string;
  category: string;
  sets: string;
  repsMin: string;
  repsMax: string;
  restSeconds: string;
  note: string;
  suggestedWeightKg: string;
}

export interface BuilderDayInput {
  title: string;
  exercises: BuilderExerciseInput[];
}

export interface BuilderMealItemInput {
  foodId: string;
  faName: string;
  enName: string;
  group: string;
  unit: "g" | "serving";
  amount: string;
  maxGrams?: number;
  servingGrams?: number;
}

export interface BuilderMealInput {
  type: string;
  items: BuilderMealItemInput[];
}

export interface BuilderDayNutritionInput {
  meals: BuilderMealInput[];
}
