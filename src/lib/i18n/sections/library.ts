/**
 * دیکشنری کتابخانه حرکات — جست‌وجو، فیلترها، کارت حرکت و دیالوگ جزئیات.
 *
 * الگو دقیقاً مطابق sections/shell.ts است:
 *   ۱) اینترفیس تایپ‌شده برای تمام متن‌های قابل مشاهده بخش
 *   ۲) دیکشنری فارسی — متن‌ها عیناً همان متن‌های فعلی اپ (با نیم‌فاصله)
 *   ۳) دیکشنری انگلیسی — ترجمه طبیعی و کامل
 *   ۴) Record<Locale, X> + تابع getter — کامل‌بودن هر دو زبان اجباری است.
 *
 * نقشه‌های نمایشی عضله/تجهیزات/دسته/الگو روی «شناسه‌های پایدار» ساخته می‌شوند؛
 * مقادیر فارسی عیناً از تعریف‌های داده (MUSCLE_GROUPS و EXERCISE_CATEGORIES/
 * EQUIPMENT_TYPES/MOVEMENT_PATTERNS) خوانده می‌شوند تا با بانک حرکات همیشه
 * یکسان بمانند و داده اصلی دست‌نخورده می‌ماند.
 */

import type { Locale } from "../shared";
import { localeNumber } from "../format";
import {
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  EXERCISE_TYPES,
  LIBRARY_MUSCLE_GROUPS,
  MOVEMENT_PATTERNS,
  type EquipmentId,
  type ExerciseCategoryId,
  type ExerciseTypeId,
  type LibraryMuscleId,
  type MovementPatternId,
} from "@/lib/exercises/types";

export interface LibraryStrings {
  // نشان‌های نوار معرفی
  countBadge: (count: number) => string;
  stageRoadmapLabel: string;
  // جست‌وجو و فیلترهای اصلی
  searchSectionAria: string;
  searchPlaceholder: string;
  searchAria: string;
  difficultyFilterAria: string;
  difficultyPlaceholder: string;
  allLevels: string;
  patternFilterAria: string;
  patternPlaceholder: string;
  allPatterns: string;
  categoryGroupAria: string;
  allCategoriesChip: string;
  categoryChipAria: (label: string) => string;
  // فیلترهای تکمیلی
  advancedFiltersToggleAria: string;
  advancedFiltersToggleLabel: string;
  activeCountBadge: (count: number) => string;
  muscleHeading: string;
  muscleGroupAria: string;
  muscleChipAria: (label: string) => string;
  equipmentHeading: string;
  equipmentGroupAria: string;
  equipmentChipAria: (label: string) => string;
  only3dGroupAria: string;
  only3dChipAria: string;
  only3dChipLabel: string;
  // نقشه‌های نمایشی روی شناسه‌های پایدار
  muscleLabel: (id: LibraryMuscleId) => string;
  equipmentLabel: (id: EquipmentId) => string;
  categoryLabel: (id: ExerciseCategoryId) => string;
  patternLabel: (id: MovementPatternId) => string;
  /** برچسب نوع تمرین — قدرتی/کششی/… (عین واژگان منبع) */
  exerciseTypeLabel: (id: ExerciseTypeId) => string;
  /** فهرست تجهیزات با جداکننده متناسب با زبان */
  equipmentList: (ids: EquipmentId[]) => string;
  // شمارش نتایج
  showingPrefix: string;
  showingMid: string;
  showingSuffix: string;
  filtersActiveNote: string;
  clearFiltersButton: string;
  clearAllFiltersButton: string;
  // کارت حرکت
  has3dBadge: string;
  no3dBadge: string;
  compoundLabel: string;
  isolationLabel: string;
  primaryMusclesLabel: string;
  equipmentFieldLabel: string;
  detailsButton: string;
  coach3dButton: string;
  // دیالوگ جزئیات
  aboutTitle: string;
  categorySpecLabel: string;
  patternSpecLabel: string;
  structureSpecLabel: string;
  levelSpecLabel: string;
  typeSpecLabel: string;
  secondaryMusclesLabel: string;
  secondaryEmpty: string;
  stepsTitle: string;
  breathingTitle: string;
  mistakesTitle: string;
  safetyTitle: string;
  similarTitle: string;
  similarNote: string;
  viewIn3dButton: string;
  noAnimationNote: string;
  backToLibraryButton: string;
  // مرحله ۱۸ — شفافیت زبان محتوا و منبع + بارگذاری جزئیات
  /** اطلاع‌رسانی صادقانه: محتوای آموزشی این حرکت فعلاً انگلیسی است */
  contentLanguageNotice: string;
  /** خط منبع برای رکوردهای منبع آزاد */
  sourceLine: (sourceName: string, license: string) => string;
  sourceDisplayName: string;
  sourceLicenseName: string;
  /** بارگذاری جزئیات */
  detailLoadingLabel: string;
  detailLoadError: string;
  /** بدون اطلاعات منبع در دسترس نیست (نبود بخش‌ها) */
  breathingEmpty: string;
  mistakesEmpty: string;
  safetyEmpty: string;
  // حالت خالی
  emptyTitle: string;
  emptyDescription: string;
}

/* ---------------------- نقشه‌های نمایشی بر اساس شناسه‌های پایدار ---------------------- */

const FA_MUSCLE: Record<string, string> = Object.fromEntries(
  LIBRARY_MUSCLE_GROUPS.map((m) => [m.id, m.fa])
);
const EN_MUSCLE: Record<string, string> = Object.fromEntries(
  LIBRARY_MUSCLE_GROUPS.map((m) => [m.id, m.en])
);

const FA_CATEGORY: Record<ExerciseCategoryId, string> = Object.fromEntries(
  EXERCISE_CATEGORIES.map((c) => [c.id, c.fa])
) as Record<ExerciseCategoryId, string>;
const EN_CATEGORY: Record<ExerciseCategoryId, string> = Object.fromEntries(
  EXERCISE_CATEGORIES.map((c) => [c.id, c.en])
) as Record<ExerciseCategoryId, string>;

const FA_EQUIPMENT: Record<EquipmentId, string> = Object.fromEntries(
  EQUIPMENT_TYPES.map((e) => [e.id, e.fa])
) as Record<EquipmentId, string>;
const EN_EQUIPMENT: Record<EquipmentId, string> = Object.fromEntries(
  EQUIPMENT_TYPES.map((e) => [e.id, e.en])
) as Record<EquipmentId, string>;

const FA_PATTERN: Record<MovementPatternId, string> = Object.fromEntries(
  MOVEMENT_PATTERNS.map((p) => [p.id, p.fa])
) as Record<MovementPatternId, string>;
const EN_PATTERN: Record<MovementPatternId, string> = Object.fromEntries(
  MOVEMENT_PATTERNS.map((p) => [p.id, p.en])
) as Record<MovementPatternId, string>;

const FA_TYPE: Record<ExerciseTypeId, string> = Object.fromEntries(
  EXERCISE_TYPES.map((t) => [t.id, t.fa])
) as Record<ExerciseTypeId, string>;
const EN_TYPE: Record<ExerciseTypeId, string> = Object.fromEntries(
  EXERCISE_TYPES.map((t) => [t.id, t.en])
) as Record<ExerciseTypeId, string>;

/* ---------------------------------- فارسی ---------------------------------- */

const FA: LibraryStrings = {
  countBadge: (count) => `${localeNumber(count, "fa")} حرکت ساختاریافته`,
  stageRoadmapLabel: "مرحله ۵ از نقشه راه",
  searchSectionAria: "جست‌وجو و فیلتر",
  searchPlaceholder: "جست‌وجوی نام حرکت (فارسی یا انگلیسی)…",
  searchAria: "جست‌وجوی حرکت بر اساس نام فارسی یا انگلیسی",
  difficultyFilterAria: "فیلتر سطح دشواری",
  difficultyPlaceholder: "سطح دشواری",
  allLevels: "همه سطح‌ها",
  patternFilterAria: "فیلتر الگوی حرکتی",
  patternPlaceholder: "الگوی حرکتی",
  allPatterns: "همه الگوها",
  categoryGroupAria: "فیلتر دسته‌بندی",
  allCategoriesChip: "همه",
  categoryChipAria: (label) => `دسته ${label}`,
  advancedFiltersToggleAria: "باز و بسته کردن فیلترهای تکمیلی",
  advancedFiltersToggleLabel: "فیلترهای تکمیلی (عضله، تجهیزات، سه‌بعدی)",
  activeCountBadge: (count) => `${localeNumber(count, "fa")} فعال`,
  muscleHeading: "عضله هدف",
  muscleGroupAria: "فیلتر عضله هدف",
  muscleChipAria: (label) => `عضله ${label}`,
  equipmentHeading: "تجهیزات",
  equipmentGroupAria: "فیلتر تجهیزات",
  equipmentChipAria: (label) => `تجهیزات ${label}`,
  only3dGroupAria: "فیلتر نمایش سه‌بعدی",
  only3dChipAria: "فقط حرکات دارای نمایش سه‌بعدی",
  only3dChipLabel: "فقط حرکات با نمایش سه‌بعدی",
  muscleLabel: (id) => FA_MUSCLE[id] ?? id,
  equipmentLabel: (id) => FA_EQUIPMENT[id] ?? id,
  categoryLabel: (id) => FA_CATEGORY[id] ?? id,
  patternLabel: (id) => FA_PATTERN[id] ?? id,
  exerciseTypeLabel: (id) => FA_TYPE[id] ?? id,
  equipmentList: (ids) => ids.map((id) => FA_EQUIPMENT[id] ?? id).join(" ، "),
  showingPrefix: "نمایش",
  showingMid: "حرکت از",
  showingSuffix: "حرکت بانک",
  filtersActiveNote: " — فیلترها فعال هستند",
  clearFiltersButton: "پاک‌کردن فیلترها",
  clearAllFiltersButton: "پاک‌کردن همه فیلترها",
  has3dBadge: "دارای نمایش سه‌بعدی",
  no3dBadge: "نمایش سه‌بعدی در دسترس نیست",
  compoundLabel: "ترکیبی",
  isolationLabel: "تک‌مفصلی",
  primaryMusclesLabel: "عضلات اصلی:",
  equipmentFieldLabel: "تجهیزات:",
  detailsButton: "جزئیات حرکت",
  coach3dButton: "مربی سه‌بعدی",
  aboutTitle: "معرفی حرکت",
  categorySpecLabel: "دسته",
  patternSpecLabel: "الگوی حرکتی",
  structureSpecLabel: "ساختار",
  levelSpecLabel: "سطح",
  typeSpecLabel: "نوع تمرین",
  secondaryMusclesLabel: "عضلات کمکی:",
  secondaryEmpty: "—",
  stepsTitle: "راهنمای اجرای صحیح",
  breathingTitle: "روش تنفس",
  mistakesTitle: "اشتباهات رایج",
  safetyTitle: "نکات ایمنی و اصلاحات متداول",
  similarTitle: "حرکات مشابه",
  similarNote:
    "پیشنهاد بر اساس هم‌دسته بودن، هم‌پوشانی عضلات و تجهیزات مشترک است؛ مناسب‌بودن برای شرایط فردی را با بررسی جزئیات همان حرکت بسنجید.",
  viewIn3dButton: "مشاهده در مربی سه‌بعدی",
  noAnimationNote:
    "برای این حرکت هنوز انیمیشن اختصاصی سه‌بعدی ساخته نشده است؛ آموزش آن از طریق همین راهنمای متنی انجام می‌شود و هیچ انیمیشن جایگزینی برای آن پخش نخواهد شد.",
  backToLibraryButton: "بازگشت به کتابخانه",
  contentLanguageNotice:
    "محتوای آموزشی این حرکت فعلاً به زبان انگلیسی است (برگرفته از منبع آزاد)؛ ترجمه ویرایشی آن در به‌روزرسانی‌های بعدی تکمیل می‌شود.",
  sourceLine: (sourceName, license) => `منبع داده آموزشی: ${sourceName} — مجوز ${license}`,
  sourceDisplayName: "Free Exercise DB",
  sourceLicenseName: "Unlicense (مالکیت عمومی)",
  detailLoadingLabel: "در حال بارگذاری جزئیات حرکت…",
  detailLoadError: "بارگذاری جزئیات حرکت ناموفق بود.",
  breathingEmpty: "برای این حرکت راهنمای تنفس از منبع داده ثبت نشده است.",
  mistakesEmpty: "فهرست اشتباهات رایج برای این حرکت در دسترس نیست.",
  safetyEmpty: "نکته ایمنی ثبت‌شده‌ای برای این حرکت در منبع وجود ندارد.",
  emptyTitle: "حرکتی یافت نشد",
  emptyDescription:
    "با ترکیب فعلی جست‌وجو و فیلترها هیچ حرکتی مطابقت ندارد. عبارت جست‌وجو را کوتاه‌تر کنید، برخی فیلترها را بردارید یا همه را بازنشانی کنید.",
};

/* ---------------------------------- انگلیسی ---------------------------------- */

const EN: LibraryStrings = {
  countBadge: (count) => `${count} structured exercises`,
  stageRoadmapLabel: "Stage 5 of the roadmap",
  searchSectionAria: "Search and filters",
  searchPlaceholder: "Search exercise name (Persian or English)…",
  searchAria: "Search exercises by Persian or English name",
  difficultyFilterAria: "Difficulty filter",
  difficultyPlaceholder: "Difficulty",
  allLevels: "All levels",
  patternFilterAria: "Movement pattern filter",
  patternPlaceholder: "Movement pattern",
  allPatterns: "All patterns",
  categoryGroupAria: "Category filter",
  allCategoriesChip: "All",
  categoryChipAria: (label) => `${label} category`,
  advancedFiltersToggleAria: "Toggle advanced filters",
  advancedFiltersToggleLabel: "Advanced filters (muscle, equipment, 3D)",
  activeCountBadge: (count) => `${count} active`,
  muscleHeading: "Target muscle",
  muscleGroupAria: "Target muscle filter",
  muscleChipAria: (label) => `${label} muscle`,
  equipmentHeading: "Equipment",
  equipmentGroupAria: "Equipment filter",
  equipmentChipAria: (label) => `${label} equipment`,
  only3dGroupAria: "3D view filter",
  only3dChipAria: "Only exercises with a 3D view",
  only3dChipLabel: "Only exercises with 3D view",
  muscleLabel: (id) => EN_MUSCLE[id] ?? id,
  equipmentLabel: (id) => EN_EQUIPMENT[id] ?? id,
  categoryLabel: (id) => EN_CATEGORY[id] ?? id,
  patternLabel: (id) => EN_PATTERN[id] ?? id,
  exerciseTypeLabel: (id) => EN_TYPE[id] ?? id,
  equipmentList: (ids) => ids.map((id) => EN_EQUIPMENT[id] ?? id).join(", "),
  showingPrefix: "Showing",
  showingMid: "of",
  showingSuffix: "bank exercises",
  filtersActiveNote: " — filters are active",
  clearFiltersButton: "Clear filters",
  clearAllFiltersButton: "Clear all filters",
  has3dBadge: "3D view available",
  no3dBadge: "No 3D view available",
  compoundLabel: "Compound",
  isolationLabel: "Isolation",
  primaryMusclesLabel: "Primary muscles:",
  equipmentFieldLabel: "Equipment:",
  detailsButton: "Exercise details",
  coach3dButton: "3D Coach",
  aboutTitle: "About this exercise",
  categorySpecLabel: "Category",
  patternSpecLabel: "Movement pattern",
  structureSpecLabel: "Structure",
  levelSpecLabel: "Level",
  typeSpecLabel: "Exercise type",
  secondaryMusclesLabel: "Secondary muscles:",
  secondaryEmpty: "—",
  stepsTitle: "Correct form guide",
  breathingTitle: "Breathing",
  mistakesTitle: "Common mistakes",
  safetyTitle: "Safety notes and common fixes",
  similarTitle: "Similar exercises",
  similarNote:
    "Suggestions are based on shared category, muscle overlap, and common equipment; check each exercise's details to judge suitability for your own condition.",
  viewIn3dButton: "View in 3D Coach",
  noAnimationNote:
    "No dedicated 3D animation has been built for this exercise yet; it is taught through this written guide and no substitute animation will be played.",
  backToLibraryButton: "Back to library",
  contentLanguageNotice:
    "The instructional content for this exercise is currently in English (sourced from the open dataset); its editorial translation will be completed in future updates.",
  sourceLine: (sourceName, license) => `Instructional data source: ${sourceName} — license: ${license}`,
  sourceDisplayName: "Free Exercise DB",
  sourceLicenseName: "Unlicense (public domain)",
  detailLoadingLabel: "Loading exercise details…",
  detailLoadError: "Loading exercise details failed.",
  breathingEmpty: "No breathing guidance was recorded for this exercise in the source data.",
  mistakesEmpty: "No common-mistakes list is available for this exercise.",
  safetyEmpty: "No safety notes were recorded for this exercise in the source data.",
  emptyTitle: "No exercises found",
  emptyDescription:
    "No exercise matches the current combination of search and filters. Try a shorter search term, remove some filters, or reset them all.",
};

const STRINGS: Record<Locale, LibraryStrings> = { fa: FA, en: EN };

export function libraryStrings(locale: Locale): LibraryStrings {
  return STRINGS[locale];
}
