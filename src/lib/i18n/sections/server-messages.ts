/**
 * دیکشنری متمرکز پیام‌های سمت سرور — ترجمه نمایشی کدهای پایدار.
 *
 * قاعده: API هرگز منبع متن نمایشی نیست. هر پاسخ خطا یک کد پایدار دارد
 * (`error` یا `issues[].code`) و رابط کاربری آن را با این دیکشنری به زبان
 * فعلی رابط ترجمه می‌کند. پیام خام سرور فقط برای لاگ/دیباگ است و هرگز
 * مستقیماً به کاربر نشان داده نمی‌شود.
 *
 * زنجیره امن fallback: کد دقیق → کد عمومی هم‌نوع → پیام عمومی بخش.
 * هرگز: متن خام سرور.
 */

import type { Locale } from "../shared";

export type Bi = { fa: string; en: string };

/* ----------------------------- کدهای سطح API ----------------------------- */

export const API_ERROR_LABELS: Record<string, Bi> = {
  UNAUTHENTICATED: {
    fa: "برای این کار ابتدا وارد حساب خود شوید.",
    en: "Please sign in first to do this.",
  },
  VALIDATION: {
    fa: "اطلاعات ارسالی معتبر نیست؛ مقادیر را بررسی کنید.",
    en: "The submitted information is not valid; please check the values.",
  },
  INTERNAL: {
    fa: "خطای غیرمنتظره سرور؛ لطفاً دوباره تلاش کنید.",
    en: "Unexpected server error; please try again.",
  },
  NOT_FOUND: {
    fa: "مورد مورد نظر یافت نشد.",
    en: "The requested item was not found.",
  },
  LIMIT_REACHED: {
    fa: "سقف مجاز پر شده است.",
    en: "The allowed limit has been reached.",
  },
  ITEM_NOT_FOUND: {
    fa: "روز، وعده یا ماده مورد نظر در این برنامه یافت نشد.",
    en: "The requested day, meal or item was not found in this plan.",
  },
  FOOD_NOT_FOUND: {
    fa: "ماده جایگزین در بانک مواد غذایی یافت نشد.",
    en: "The replacement food was not found in the food bank.",
  },
  PLAN_NOT_FEASIBLE: {
    fa: "با این تنظیمات برنامه معقولی ساخته نشد.",
    en: "No reasonable plan could be built with these settings.",
  },
  INCOMPATIBLE_FOOD: {
    fa: "این ماده با محدودیت‌های این برنامه (آلرژی، الگوی غذایی یا مواد نامطلوب) سازگار نیست.",
    en: "This food is not compatible with this plan's restrictions (allergies, diet pattern or disliked foods).",
  },
  INSUFFICIENT_DATA: {
    fa: "برای برآورد کالری شخصی، اطلاعات لازم کامل نیست.",
    en: "There is not enough information for a personal calorie estimate.",
  },
  RATE_LIMITED: {
    fa: "تعداد درخواست‌ها زیاد است؛ کمی بعد دوباره امتحان کنید.",
    en: "Too many requests; please try again shortly.",
  },
  SESSION_CLOSED: {
    fa: "این جلسه بسته شده است و دیگر قابل تغییر نیست.",
    en: "This session is closed and can no longer be changed.",
  },
  EXERCISE_NOT_IN_BANK: {
    fa: "برخی حرکات در بانک حرکات یافت نشد؛ تمرین آزاد فقط با حرکات واقعی کتابخانه ممکن است.",
    en: "Some exercises were not found in the exercise bank; free workouts can only use real library exercises.",
  },
  AI_NOT_CONFIGURED: {
    fa: "دستیار هوشمند هنوز پیکربندی نشده است.",
    en: "The AI assistant is not configured yet.",
  },
  AI_TIMEOUT: {
    fa: "پاسخ دستیار بیش از حد طول کشید؛ دوباره تلاش کنید.",
    en: "The assistant took too long to respond; please try again.",
  },
  AI_NETWORK: {
    fa: "اتصال به سرویس دستیار برقرار نشد.",
    en: "Could not reach the assistant service.",
  },
  AI_PROVIDER: {
    fa: "سرویس دستیار درخواست را نپذیرفت؛ بعداً تلاش کنید.",
    en: "The assistant service rejected the request; try again later.",
  },

  /* --------------------- مرحله ۱۵ — ارتباط دانشجو و مربی --------------------- */

  SUBSCRIPTION_REQUIRED: {
    fa: "ارسال درخواست ارتباط با مربی به اشتراک ویژه (PREMIUM) نیاز دارد.",
    en: "Sending a coach connection request requires a PREMIUM subscription.",
  },
  ROLE_NOT_ALLOWED: {
    fa: "این عملیات برای نقش حساب شما مجاز نیست.",
    en: "This action is not allowed for your account role.",
  },
  COACH_UNAVAILABLE: {
    fa: "این مربی در حال حاضر برای درخواست جدید در دسترس نیست.",
    en: "This coach is not available for new requests right now.",
  },
  COOPERATION_TYPE_NOT_OFFERED: {
    fa: "نوع همکاری انتخابی توسط این مربی ارائه نمی‌شود.",
    en: "The selected cooperation type is not offered by this coach.",
  },
  COACH_NO_LONGER_ELIGIBLE: {
    fa: "مربی در لحظه اجرای عملیات دیگر واجد شرایط نبود؛ وضعیت تازه را ببینید.",
    en: "The coach was no longer eligible when the action ran; check the fresh status.",
  },
  CONNECTION_ALREADY_OPEN: {
    fa: "شما یک درخواست یا ارتباط باز با این مربی دارید.",
    en: "You already have an open request or connection with this coach.",
  },
  TOO_MANY_OPEN_REQUESTS: {
    fa: "سقف درخواست‌های باز هم‌زمان شما پر است؛ ابتدا یکی را لغو کنید.",
    en: "You have reached your cap of simultaneous open requests; cancel one first.",
  },
  CONNECTION_NOT_FOUND: {
    fa: "این درخواست یا ارتباط یافت نشد یا به شما تعلق ندارد.",
    en: "This request or connection was not found, or does not belong to you.",
  },
  INVALID_TRANSITION: {
    fa: "وضعیت این درخواست در همین لحظه تغییر کرده است؛ فهرست را به‌روز کنید.",
    en: "This request's status has just changed; please refresh the list.",
  },
  PROFILE_INCOMPLETE: {
    fa: "اطلاعات عمومی پروفایل کامل نیست؛ حداقل اطلاعات لازم را تکمیل کنید.",
    en: "Your public profile is incomplete; fill in the minimum required information.",
  },
  NOT_VERIFIED: {
    fa: "حساب مربی شما هنوز تأیید نشده است.",
    en: "Your coach account is not verified yet.",
  },
  APPLICATION_ALREADY_OPEN: {
    fa: "شما یک درخواست مربی‌گری در جریان دارید.",
    en: "You already have a coach application in progress.",
  },

  /* ------------------ مرحله ۱۶ — برنامه‌های اختصاصی مربی ------------------ */

  COACH_NOT_VERIFIED: {
    fa: "ساخت و ارسال برنامه اختصاصی به تأیید مربی‌گری نیاز دارد.",
    en: "Building and sending custom plans requires coach verification.",
  },
  PLAN_NOT_FOUND: {
    fa: "این برنامه یافت نشد یا متعلق به شما نیست.",
    en: "This plan was not found, or does not belong to you.",
  },
  PLAN_ARCHIVED: {
    fa: "این برنامه بایگانی شده است و دیگر قابل ویرایش یا ارسال نیست.",
    en: "This plan is archived and can no longer be edited or sent.",
  },
  PLAN_CONTENT_EMPTY: {
    fa: "این برنامه محتوای معتبری ندارد؛ ابتدا روزها و اقلام را کامل کنید.",
    en: "This plan has no valid content; complete its days and items first.",
  },
  PLAN_ALREADY_SENT: {
    fa: "این برنامه قبلاً با همین محتوا ارسال شده است؛ برای نسخه جدید ابتدا محتوا را ویرایش کنید.",
    en: "This plan was already sent with the same content; edit the content first to send a new version.",
  },
  PLAN_STATE_CHANGED: {
    fa: "وضعیت برنامه در همین لحظه تغییر کرده است؛ فهرست را به‌روز کنید.",
    en: "The plan's state has just changed; please refresh the list.",
  },
  STUDENT_MISMATCH: {
    fa: "این برنامه قبلاً به دانشجوی دیگری اختصاص یافته و قابل ارسال به دانشجوی دیگر نیست.",
    en: "This plan is already assigned to another student and cannot be sent to a different one.",
  },
  DELIVERY_NOT_FOUND: {
    fa: "این نسخه برنامه یافت نشد یا به شما تعلق ندارد.",
    en: "This plan version was not found, or does not belong to you.",
  },
  FOOD_NOT_IN_BANK: {
    fa: "یکی از مواد غذایی در بانک مواد یافت نشد؛ فقط مواد واقعی بانک مجازند.",
    en: "One of the foods was not found in the food bank; only real bank foods are allowed.",
  },
  AMOUNT_OUT_OF_RANGE: {
    fa: "مقدار واردشده برای یکی از مواد در بازه مجاز نیست.",
    en: "One of the entered amounts is outside the allowed range.",
  },
};

/* --------------------------- کدهای خطای موتورها --------------------------- */

const MEAL_TYPE_PARAM_LABELS: Record<string, Bi> = {
  breakfast: { fa: "صبحانه", en: "Breakfast" },
  snack_am: { fa: "میان‌وعده صبح", en: "Morning snack" },
  lunch: { fa: "ناهار", en: "Lunch" },
  snack_pm: { fa: "میان‌وعده عصر", en: "Afternoon snack" },
  dinner: { fa: "شام", en: "Dinner" },
  snack_ev: { fa: "میان‌وعده شب", en: "Evening snack" },
};

const SLOT_PARAM_LABELS: Record<string, Bi> = {
  breakfast_grain: { fa: "نان یا غلات صبحانه", en: "breakfast grain" },
  protein: { fa: "منبع پروتئینی", en: "protein source" },
  carb: { fa: "منبع کربوهیدرات", en: "carb source" },
  vegetable: { fa: "سبزیجات", en: "vegetables" },
  fruit: { fa: "میوه", en: "fruit" },
  dairy_snack: { fa: "لبنیات میان‌وعده", en: "dairy snack" },
  nuts: { fa: "مغزها", en: "nuts" },
  fat: { fa: "چربی پخت", en: "cooking fat" },
  snack_pool: { fa: "میان‌وعده", en: "snack" },
};

export const ENGINE_ERROR_LABELS: Record<string, Bi> = {
  PLAN_INSUFFICIENT_EXERCISES: {
    fa: "با این تجهیزات و محدودیت‌ها حرکت کافی برای ساخت برنامه وجود ندارد؛ فهرست تجهیزات را کامل‌تر کنید یا برخی محدودیت‌ها را بردارید.",
    en: "There are not enough exercises with this equipment and these limitations to build a plan; broaden the equipment list or remove some limitations.",
  },
  PLAN_TOO_FEW_SESSIONS: {
    fa: "با این تنظیمات حداقل دو جلسه معقول ساخته نشد؛ تجهیزات بیشتری انتخاب کنید یا محدودیت‌ها را کاهش دهید.",
    en: "At least two reasonable sessions could not be built with these settings; choose more equipment or reduce the limitations.",
  },
  NUTRITION_INVALID_MEALS_COUNT: {
    fa: "تعداد وعده‌ها باید بین ۳ تا ۶ باشد.",
    en: "The number of meals must be between 3 and 6.",
  },
  NUTRITION_SLOT_NO_OPTION: {
    fa: "با محدودیت‌های انتخابی شما، گزینه سازگاری برای جایگاه «{slot}» در {meal} یافت نشد. محدودیت‌ها را کمتر کنید یا بانک مواد در دسترس را بازبینی کنید.",
    en: "With your selected restrictions, no compatible option was found for the \"{slot}\" slot in {meal}. Reduce the restrictions or review the available food bank.",
  },
};

/** برچسب کد سطح API — اگر کد ناشناخته باشد null (caller پیام عمومی می‌گذارد) */
export function apiErrorLabel(code: string, locale: Locale): string | null {
  return API_ERROR_LABELS[code]?.[locale] ?? null;
}

/** برچسب کد پایدار جلسه — کدهای دامنه جلسه در API_ERROR_LABELS مشترک‌اند */
export function sessionErrorLabel(code: string | undefined, locale: Locale): string | null {
  if (!code) return null;
  return apiErrorLabel(code, locale);
}

/** خطای موتور با پارامترها به متن محلی — اگر کد/پارامتر ناشناخته باشد null */
export function engineErrorLabel(
  code: string | undefined,
  params: Record<string, string> | undefined,
  locale: Locale
): string | null {
  if (!code) return null;
  const entry = ENGINE_ERROR_LABELS[code];
  if (!entry) return null;
  let text = entry[locale];
  if (code === "NUTRITION_SLOT_NO_OPTION" && params) {
    const slot = SLOT_PARAM_LABELS[params.slot]?.[locale] ?? params.slot ?? "";
    const meal = MEAL_TYPE_PARAM_LABELS[params.mealType]?.[locale] ?? params.mealType ?? "";
    text = text.replace("{slot}", slot).replace("{meal}", meal);
  }
  return text;
}

/* ------------------------- کدهای issues اعتبارسنجی ------------------------- */

/** برچسب کدهای مشترک بین شِماها — ابتدا این‌ها، سپس شِماآگاه */
const COMMON_ISSUE_LABELS: Record<string, Bi> = {
  "#invalid_type": { fa: "این فیلد را درست وارد کنید.", en: "Please enter this field correctly." },
  "#invalid_value": { fa: "مقدار انتخاب‌شده مجاز نیست.", en: "The selected value is not allowed." },
  "#invalid_date": { fa: "تاریخ واردشده معتبر نیست.", en: "The entered date is not valid." },
  "#too_small": { fa: "مقدار این فیلد کمتر از حد مجاز است.", en: "This field's value is below the allowed range." },
  "#too_big": { fa: "مقدار این فیلد بیشتر از حد مجاز است.", en: "This field's value is above the allowed range." },
  "#custom": { fa: "مقدار این فیلد مجاز نیست.", en: "This field's value is not allowed." },
  "#unrecognized_keys": { fa: "فیلدهای ناشناخته ارسال شده است.", en: "Unknown fields were submitted." },
};

/** شِماآگاه: کد → متن، برای قواعد اختصاصی هر خانواده شِما */
const SCHEMA_ISSUE_LABELS: Record<string, Record<string, Bi>> = {
  weight: {
    "weightKg#invalid_type": { fa: "وزن را وارد کنید", en: "Please enter your weight." },
    "weightKg#too_small": { fa: "وزن باید حداقل ۲۵ کیلوگرم باشد", en: "Weight must be at least 25 kg." },
    "weightKg#too_big": { fa: "وزن باید حداکثر ۳۰۰ کیلوگرم باشد", en: "Weight must be at most 300 kg." },
    "recordedAt#invalid_date": { fa: "تاریخ ثبت معتبر نیست", en: "The recorded date is not valid." },
    FUTURE_DATE: { fa: "تاریخ ثبت نمی‌تواند در آینده باشد", en: "The recorded date cannot be in the future." },
    TOO_OLD_DATE: { fa: "تاریخ ثبت نمی‌تواند قدیمی‌تر از دو سال باشد", en: "The recorded date cannot be older than two years." },
  },
  profile: {
    "displayName#invalid_type": { fa: "نام نمایشی را وارد کنید", en: "Please enter a display name." },
    "displayName#too_small": { fa: "نام نمایشی باید حداقل ۲ کاراکتر باشد", en: "Display name must be at least 2 characters." },
    "displayName#too_big": { fa: "نام نمایشی حداکثر ۶۰ کاراکتر است", en: "Display name is at most 60 characters." },
    "age#invalid_type": { fa: "سن را وارد کنید", en: "Please enter your age." },
    "age#too_small": { fa: "سن باید حداقل ۱۰ باشد", en: "Age must be at least 10." },
    "age#too_big": { fa: "سن باید حداکثر ۹۰ باشد", en: "Age must be at most 90." },
    "heightCm#invalid_type": { fa: "قد (سانتی‌متر) را وارد کنید", en: "Please enter your height (cm)." },
    "heightCm#too_small": { fa: "قد باید حداقل ۱۰۰ سانتی‌متر باشد", en: "Height must be at least 100 cm." },
    "heightCm#too_big": { fa: "قد باید حداکثر ۲۵۰ سانتی‌متر باشد", en: "Height must be at most 250 cm." },
    "weightKg#invalid_type": { fa: "وزن (کیلوگرم) را وارد کنید", en: "Please enter your weight (kg)." },
    "weightKg#too_small": { fa: "وزن باید حداقل ۲۵ کیلوگرم باشد", en: "Weight must be at least 25 kg." },
    "weightKg#too_big": { fa: "وزن باید حداکثر ۳۰۰ کیلوگرم باشد", en: "Weight must be at most 300 kg." },
    "bodyFat#invalid_type": { fa: "درصد چربی بدن باید عدد معتبر باشد", en: "Body fat percentage must be a valid number." },
    "bodyFat#too_small": { fa: "درصد چربی بدن باید حداقل ۱ باشد", en: "Body fat percentage must be at least 1." },
    "bodyFat#too_big": { fa: "درصد چربی بدن باید حداکثر ۷۰ باشد", en: "Body fat percentage must be at most 70." },
    "goal#invalid_value": { fa: "هدف تمرینی را انتخاب کنید", en: "Please choose a training goal." },
    "experience#invalid_value": { fa: "سطح تجربه را انتخاب کنید", en: "Please choose your experience level." },
    "trainingDaysPerWeek#invalid_type": { fa: "روزهای تمرین در هفته را وارد کنید", en: "Please enter training days per week." },
    "trainingDaysPerWeek#too_small": { fa: "روزهای تمرین باید حداقل ۱ باشد", en: "Training days must be at least 1." },
    "trainingDaysPerWeek#too_big": { fa: "روزهای تمرین باید حداکثر ۷ باشد", en: "Training days must be at most 7." },
    "sessionMinutes#invalid_type": { fa: "مدت هر جلسه باید عدد معتبر باشد", en: "Session length must be a valid number." },
    "sessionMinutes#too_small": { fa: "مدت هر جلسه باید حداقل ۱۵ دقیقه باشد", en: "Session length must be at least 15 minutes." },
    "sessionMinutes#too_big": { fa: "مدت هر جلسه باید حداکثر ۱۸۰ دقیقه باشد", en: "Session length must be at most 180 minutes." },
    "equipment#too_big": { fa: "فهرست تجهیزات بسیار طولانی است", en: "The equipment list is too long." },
    "limitations#too_big": { fa: "فهرست محدودیت‌ها بسیار طولانی است", en: "The limitations list is too long." },
    "allergies#too_big": { fa: "فهرست آلرژی‌ها بسیار طولانی است", en: "The allergies list is too long." },
    "limitationNotes#too_big": { fa: "توضیحات حداکثر ۵۰۰ کاراکتر است", en: "Notes are limited to 500 characters." },
    "units#invalid_value": { fa: "واحد اندازه‌گیری معتبر نیست", en: "The measurement unit is not valid." },
  },
  plan: {
    "contentLocale#invalid_value": { fa: "زبان محتوا معتبر نیست", en: "The content language is not valid." },
    "goal#invalid_value": { fa: "هدف تمرینی را انتخاب کنید", en: "Please choose a training goal." },
    "experience#invalid_value": { fa: "سطح تجربه را انتخاب کنید", en: "Please choose your experience level." },
    "focus#invalid_value": { fa: "تمرکز برنامه معتبر نیست", en: "The plan focus is not valid." },
    "daysPerWeek#invalid_type": { fa: "تعداد روزهای تمرین را وارد کنید", en: "Please enter the number of training days." },
    DAYS_RANGE: { fa: "تعداد روزهای تمرین باید بین ۲ تا ۶ روز باشد", en: "Training days must be between 2 and 6." },
    "sessionMinutes#invalid_type": { fa: "مدت جلسه را وارد کنید", en: "Please enter the session length." },
    SESSION_MINUTES_VALUE: { fa: "مدت جلسه باید یکی از مقادیر ۳۰، ۴۵، ۶۰ یا ۹۰ دقیقه باشد", en: "Session length must be 30, 45, 60 or 90 minutes." },
    "equipment#too_small": { fa: "حداقل یک نوع تجهیزات در دسترس را انتخاب کنید", en: "Select at least one available equipment type." },
    "equipment#too_big": { fa: "فهرست تجهیزات نامعتبر است", en: "The equipment list is not valid." },
    "equipment#invalid_value": { fa: "نوع تجهیزات انتخابی مجاز نیست", en: "A selected equipment type is not allowed." },
    PREFERRED_DAY_RANGE: { fa: "روز هفته نامعتبر است", en: "The weekday is not valid." },
    "preferredDays#too_big": { fa: "حداکثر ۶ روز ترجیحی قابل انتخاب است", en: "At most 6 preferred days can be selected." },
    DUPLICATE_PREFERRED_DAYS: { fa: "روزهای ترجیحی تکراری هستند", en: "Preferred days contain duplicates." },
    "excludedCategories#too_big": { fa: "نمی‌توان همه دسته‌های حرکتی را حذف کرد", en: "You cannot exclude every exercise category." },
    "excludedCategories#invalid_value": { fa: "دسته انتخابی مجاز نیست", en: "A selected category is not allowed." },
    "excludedExerciseIds#too_big": { fa: "فهرست حرکات حذف‌شده بسیار طولانی است", en: "The excluded-exercises list is too long." },
    "limitationNotes#too_big": { fa: "توضیحات حداکثر ۵۰۰ کاراکتر است", en: "Notes are limited to 500 characters." },
  },
  planTitle: {
    "#invalid_type": { fa: "عنوان برنامه را وارد کنید", en: "Please enter the plan title." },
    "#too_small": { fa: "عنوان برنامه باید حداقل ۲ کاراکتر باشد", en: "Plan title must be at least 2 characters." },
    "#too_big": { fa: "عنوان برنامه حداکثر ۸۰ کاراکتر است", en: "Plan title is at most 80 characters." },
  },
  nutrition: {
    "contentLocale#invalid_value": { fa: "زبان محتوا معتبر نیست", en: "The content language is not valid." },
    "goal#invalid_value": { fa: "هدف تغذیه‌ای را انتخاب کنید", en: "Please choose a nutrition goal." },
    "activityLevel#invalid_value": { fa: "سطح فعالیت روزانه را انتخاب کنید", en: "Please choose your daily activity level." },
    "dietPattern#invalid_value": { fa: "الگوی غذایی را انتخاب کنید", en: "Please choose a diet pattern." },
    "mealsPerDay#invalid_type": { fa: "تعداد وعده‌ها را وارد کنید", en: "Please enter the number of meals." },
    MEALS_COUNT_RANGE: { fa: "تعداد وعده‌ها باید بین ۳ تا ۶ باشد", en: "Meals per day must be between 3 and 6." },
    "planLength#invalid_type": { fa: "طول برنامه را وارد کنید", en: "Please enter the plan length." },
    PLAN_LENGTH_VALUE: { fa: "طول برنامه باید ۱ روز یا ۷ روز باشد", en: "Plan length must be 1 day or 7 days." },
    "allergens#too_big": { fa: "فهرست آلرژی‌ها نامعتبر است", en: "The allergies list is not valid." },
    "allergens#invalid_value": { fa: "آلرژن انتخابی مجاز نیست", en: "A selected allergen is not allowed." },
    "dislikedFoodIds#too_big": { fa: "نمی‌توان همه مواد غذایی را حذف کرد", en: "You cannot exclude every food in the bank." },
    "dislikedFoodIds#invalid_value": { fa: "ماده انتخابی در بانک وجود ندارد", en: "A selected food is not in the bank." },
    "budget#invalid_value": { fa: "بودجه انتخابی مجاز نیست", en: "The selected budget is not allowed." },
    "prep#invalid_value": { fa: "سطح آماده‌سازی انتخابی مجاز نیست", en: "The selected preparation level is not allowed." },
    "pregnancyBreastfeeding#invalid_type": { fa: "وضعیت بارداری/شیردهی معتبر نیست", en: "The pregnancy/breastfeeding flag is not valid." },
    "estimate.age#invalid_type": { fa: "سن را وارد کنید", en: "Please enter the age." },
    ESTIMATE_AGE_RANGE: { fa: "سن باید بین ۱۰ تا ۹۰ باشد", en: "Age must be between 10 and 90." },
    "estimate.heightCm#invalid_type": { fa: "قد را وارد کنید", en: "Please enter the height." },
    ESTIMATE_HEIGHT_RANGE: { fa: "قد باید بین ۱۰۰ تا ۲۵۰ سانتی‌متر باشد", en: "Height must be between 100 and 250 cm." },
    "estimate.weightKg#invalid_type": { fa: "وزن را وارد کنید", en: "Please enter the weight." },
    ESTIMATE_WEIGHT_RANGE: { fa: "وزن باید بین ۲۵ تا ۳۰۰ کیلوگرم باشد", en: "Weight must be between 25 and 300 kg." },
    "estimate.gender#invalid_value": { fa: "جنسیت معتبر نیست", en: "The gender value is not valid." },
  },
  nutritionTitle: {
    "#invalid_type": { fa: "عنوان برنامه را وارد کنید", en: "Please enter the plan title." },
    "#too_small": { fa: "عنوان برنامه باید حداقل ۲ کاراکتر باشد", en: "Plan title must be at least 2 characters." },
    "#too_big": { fa: "عنوان برنامه حداکثر ۸۰ کاراکتر است", en: "Plan title is at most 80 characters." },
  },
  nutritionOps: {
    DAY_ORDER_RANGE: { fa: "روز نامعتبر است", en: "The day is not valid." },
    MEAL_ORDER_RANGE: { fa: "وعده نامعتبر است", en: "The meal is not valid." },
    ITEM_ORDER_RANGE: { fa: "ماده نامعتبر است", en: "The item is not valid." },
    GRAMS_RANGE: { fa: "مقدار باید بین ۱۰ تا ۱۵۰۰ گرم باشد", en: "The amount must be between 10 and 1500 grams." },
    "newFoodId#invalid_value": { fa: "ماده جایگزین در بانک مواد غذایی یافت نشد", en: "The replacement food was not found in the food bank." },
    "status#invalid_value": { fa: "وضعیت برنامه معتبر نیست", en: "The plan status is not valid." },
  },
  session: {
    "exerciseId#invalid_type": { fa: "شناسه حرکت معتبر نیست", en: "The exercise identifier is not valid." },
    "exerciseId#too_small": { fa: "شناسه حرکت خالی است", en: "The exercise identifier is empty." },
    "exerciseId#too_big": { fa: "شناسه حرکت نامعتبر است", en: "The exercise identifier is not valid." },
    "exercises#too_small": { fa: "برای تمرین آزاد حداقل یک حرکت از کتابخانه انتخاب کنید", en: "Select at least one library exercise for a free workout." },
    "exercises#too_big": { fa: "حداکثر ۱۲ حرکت در یک جلسه مجاز است", en: "At most 12 exercises are allowed in a session." },
    "planDayId#too_small": { fa: "شناسه روز برنامه معتبر نیست", en: "The plan day identifier is not valid." },
    "planDayId#too_big": { fa: "شناسه روز برنامه معتبر نیست", en: "The plan day identifier is not valid." },
    "#custom": { fa: "جلسه باید یا از روز برنامه شروع شود یا فهرست حرکات تمرین آزاد داشته باشد", en: "A session must start either from a plan day or with a free-workout exercise list." },
    "sessionExerciseId#invalid_type": { fa: "شناسه حرکت جلسه معتبر نیست", en: "The session exercise identifier is not valid." },
    "sessionExerciseId#too_small": { fa: "شناسه حرکت جلسه معتبر نیست", en: "The session exercise identifier is not valid." },
    "sessionExerciseId#too_big": { fa: "شناسه حرکت جلسه معتبر نیست", en: "The session exercise identifier is not valid." },
    SET_NUMBER_RANGE: { fa: "شماره ست خارج از محدوده مجاز است", en: "The set number is outside the allowed range." },
    REPS_RANGE: { fa: "تعداد تکرار خارج از محدوده مجاز است", en: "The rep count is outside the allowed range." },
    WEIGHT_RANGE: { fa: "وزنه خارج از محدوده مجاز است", en: "The weight is outside the allowed range." },
    "note#too_big": { fa: "یادداشت ست حداکثر ۲۰۰ کاراکتر است", en: "Set notes are limited to 200 characters." },
    "status#invalid_value": { fa: "وضعیت حرکت معتبر نیست", en: "The exercise status is not valid." },
    "action#invalid_value": { fa: "نوع پایان جلسه معتبر نیست", en: "The finish action is not valid." },
    "notes#too_big": { fa: "یادداشت جلسه بیش از حد مجاز طولانی است", en: "Session notes are too long." },
  },
  foodlog: {
    "unit#invalid_value": { fa: "واحد مقدار معتبر نیست", en: "The amount unit is not valid." },
    "mealType#invalid_value": { fa: "نوع وعده معتبر نیست", en: "The meal type is not valid." },
    "localDay#invalid_type": { fa: "روز را انتخاب کنید", en: "Please choose a day." },
    "localDay#custom": { fa: "روز معتبر نیست", en: "The day is not valid." },
    "consumedAt#custom": { fa: "زمان مصرف نامعتبر است", en: "The consumption time is not valid." },
    "clientRequestId#too_small": { fa: "کلید درخواست کوتاه است", en: "The request key is too short." },
    "clientRequestId#too_big": { fa: "کلید درخواست بیش از حد طولانی است", en: "The request key is too long." },
  },
  assistant: {
    "content#invalid_type": { fa: "متن پیام نامعتبر است", en: "The message text is not valid." },
    "content#too_small": { fa: "متن پیام خالی است", en: "The message text is empty." },
    "content#too_big": { fa: "متن پیام بیش از حد مجاز طولانی است", en: "The message text is too long." },
    "language#invalid_value": { fa: "زبان پاسخ معتبر نیست", en: "The response language is not valid." },
    "uiLocale#invalid_value": { fa: "زبان رابط معتبر نیست", en: "The interface language is not valid." },
  },
};

/**
 * ترجمه یک issue — ترتیب: شِماآگاه دقیق → مشترک (شِما/فیلد بی‌طرف) → null
 * (caller پیام عمومی خودش را می‌گذارد؛ متن خام سرور هرگز برگردانده نمی‌شود).
 */
export function issueLabel(schema: string, code: string, locale: Locale): string | null {
  const specific = SCHEMA_ISSUE_LABELS[schema]?.[code];
  if (specific) return specific[locale];
  const common = COMMON_ISSUE_LABELS[code];
  if (common) return common[locale];
  // کد فیلد#نوع شناخته‌شده اما شِمای ناشناخته — همان برچسب مشترک نوع
  const kind = code.includes("#") ? `#${code.split("#")[1]}` : null;
  if (kind && COMMON_ISSUE_LABELS[kind]) return COMMON_ISSUE_LABELS[kind][locale];
  return null;
}

/** پیام عمومی برای مواقعی که هیچ کد شناخته‌شده‌ای نیست */
export function genericIssueMessage(locale: Locale): string {
  return locale === "en"
    ? "Some values need to be corrected; please review the form."
    : "برخی مقادیر نیاز به اصلاح دارند؛ فرم را بررسی کنید.";
}

/* -------------------------- کمبود اطلاعات برآورد -------------------------- */

const ESTIMATE_MISSING_LABELS: Record<string, Bi> = {
  age: { fa: "سن", en: "age" },
  heightCm: { fa: "قد", en: "height" },
  weightKg: { fa: "وزن", en: "weight" },
};

export function insufficientDataMessage(missingKeys: string[], locale: Locale): string | null {
  if (missingKeys.length === 0) return null;
  const known = missingKeys.filter((k) => ESTIMATE_MISSING_LABELS[k]);
  if (known.length === 0) return null;
  const list = known.map((k) => ESTIMATE_MISSING_LABELS[k][locale]);
  const joined = list.join(locale === "fa" ? "، " : ", ");
  return locale === "en"
    ? `A personal calorie estimate needs this information: ${joined}.`
    : `برای برآورد کالری شخصی، این اطلاعات لازم است: ${joined}.`;
}
