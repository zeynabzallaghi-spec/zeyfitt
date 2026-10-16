/**
 * دیکشنری ورود/ثبت‌نام — صفحه مهمان (Tab ورود + Tab ثبت‌نام + شرایط استفاده).
 * الگو دقیقاً مطابق sections/shell.ts است.
 *
 * متن‌های خطای سرور از authErrorToFa (src/lib/auth-client.ts) با رشته‌های
 * فارسی بسته‌ای برمی‌گردند و منطق تشخیص «نوع خطا» دست‌نخورده می‌ماند؛
 * نگاشت فقط نمایشی است و در serverError انجام می‌شود (نسخه فارسی همان
 * ورودی را عبور می‌دهد تا رندر فارسی مو‌به‌مو حفظ شود).
 */

import type { Locale } from "../shared";

export interface AuthStrings {
  /** عنوان سند صفحه — document.title */
  pageTitle: string;
  // معرفی محصول (ستون دسکتاپ)
  heroLine1: string;
  heroHighlight: string;
  heroSuffix: string;
  heroSub: string;
  highlights: readonly { title: string; text: string }[];
  upcomingBadge: string;
  // کارت ورود/ثبت‌نام
  cardTitle: string;
  cardSubtitle: string;
  tabLogin: string;
  tabRegister: string;
  privacyNote: string;
  // فیلد رمز عبور
  showPasswordAria: string;
  hidePasswordAria: string;
  // فرم ورود
  emailLabel: string;
  passwordLabel: string;
  invalidEmail: string;
  requiredPassword: string;
  loginSubmit: string;
  loginSubmitting: string;
  loginHint: string;
  // فرم ثبت‌نام
  nameLabel: string;
  namePlaceholder: string;
  confirmPasswordLabel: string;
  passwordHint: string;
  nameLengthError: string;
  passwordMinError: string;
  passwordCharError: string;
  confirmMismatch: string;
  termsAcceptPrefix: string;
  termsAcceptSuffix: string;
  termsRequired: string;
  registerSubmit: string;
  registerSubmitting: string;
  // خطاها
  networkError: string;
  /** نگاشت نمایشی پیام خطای سرور — ورودی همان خروجی authErrorToFa است */
  serverError: (message: string) => string;
  // شرایط استفاده و سیاست حریم خصوصی
  termsTitle: string;
  termsDescription: string;
  termsStoredTitle: string;
  termsStoredBody: string;
  termsSecurityTitle: string;
  termsSecurityBody: string;
  termsHealthPrivacyTitle: string;
  termsHealthPrivacyBody: string;
  termsDeletionTitle: string;
  termsDeletionBody: string;
  termsNatureTitle: string;
  termsNatureBody: string;
}

const FA: AuthStrings = {
  pageTitle: "ورود | AI Fitness Coach",
  heroLine1: "مسیر تناسب اندام شما،",
  heroHighlight: "با داده واقعی شما",
  heroSuffix: " ساخته می‌شود",
  heroSub:
    "با ساخت حساب کاربری، پروفایل بدنی خود را ثبت کنید تا در مراحل بعدی، برنامه تمرینی و غذایی اختصاصی بر اساس همین داده‌ها ساخته شود.",
  highlights: [
    { title: "مربی سه‌بعدی تعاملی", text: "اجرای حرکات با مدل بدن و نمایش عضلات درگیر" },
    { title: "حساب کاربری شخصی", text: "ذخیره امن پروفایل با هش رمز عبور و نشست قابل ابطال" },
    { title: "برنامه تمرینی و غذایی", text: "برنامه اختصاصی بر اساس پروفایل شما — در مراحل بعدی" },
  ],
  upcomingBadge: "مراحل بعدی",
  cardTitle: "ورود یا ثبت‌نام",
  cardSubtitle: "برای دسترسی به پنل مربی، حساب کاربری بسازید یا وارد شوید.",
  tabLogin: "ورود",
  tabRegister: "ثبت‌نام",
  privacyNote:
    "اطلاعات شخصی شما فقط روی سرور این محصول ذخیره می‌شود و در اختیار ثالث قرار نمی‌گیرد.",
  showPasswordAria: "نمایش رمز",
  hidePasswordAria: "پنهان‌کردن رمز",
  emailLabel: "ایمیل",
  passwordLabel: "رمز عبور",
  invalidEmail: "ایمیل معتبر وارد کنید.",
  requiredPassword: "رمز عبور را وارد کنید.",
  loginSubmit: "ورود به حساب",
  loginSubmitting: "در حال ورود…",
  loginHint:
    "تأیید ایمیل و بازیابی رمز عبور هنوز فعال نیست و در مراحل بعدی اضافه می‌شود؛ در این نسخه برای بازیابی دسترسی با پشتیبانی هماهنگ شوید.",
  nameLabel: "نام نمایشی",
  namePlaceholder: "مثلاً علی رضایی",
  confirmPasswordLabel: "تکرار رمز عبور",
  passwordHint: "حداقل ۸ کاراکتر، شامل حداقل یک حرف و یک رقم.",
  nameLengthError: "نام نمایشی باید بین ۲ تا ۶۰ کاراکتر باشد.",
  passwordMinError: "رمز عبور باید حداقل ۸ کاراکتر باشد.",
  passwordCharError: "رمز عبور باید حداقل یک حرف و یک رقم داشته باشد.",
  confirmMismatch: "تکرار رمز عبور با رمز عبور یکسان نیست.",
  termsAcceptPrefix: "",
  termsAcceptSuffix: " را خوانده‌ام و می‌پذیرم.",
  termsRequired: "برای ساخت حساب، پذیرش شرایط الزامی است.",
  registerSubmit: "ساخت حساب کاربری",
  registerSubmitting: "در حال ساخت حساب…",
  networkError: "ارتباط با سرور برقرار نشد؛ اتصال اینترنت خود را بررسی کنید.",
  serverError: (message) => message,
  termsTitle: "شرایط استفاده و سیاست حریم خصوصی",
  termsDescription: "خلاصه‌ای صادقانه از داده‌هایی که ذخیره می‌کنیم و نحوه محافظت از آن‌ها.",
  termsStoredTitle: "داده‌های ذخیره‌شده",
  termsStoredBody:
    "ایمیل، نام نمایشی و اطلاعات پروفایل تناسب اندام شما (سن، جنسیت اختیاری، قد، وزن، هدف‌ها، تجهیزات، محدودیت‌های حرکتی اعلامی و ترجیحات غذایی) روی سرور ذخیره می‌شود.",
  termsSecurityTitle: "امنیت",
  termsSecurityBody:
    "رمز عبور هرگز به‌صورت متن ساده ذخیره نمی‌شود و با الگوریتم استاندارد bcrypt هش می‌گردد. نشست شما با کوکی امن (HttpOnly) نگهداری می‌شود و از هر دستگاه می‌توانید خارج شوید.",
  termsHealthPrivacyTitle: "محرمانگی اطلاعات سلامت",
  termsHealthPrivacyBody:
    "اطلاعات بدنی و محدودیت‌های حرکتی شما محرمانه تلقی می‌شود، فقط به حساب خودتان نمایش داده می‌شود و در اختیار هیچ شخص یا خدمات ثالث قرار نمی‌گیرد.",
  termsDeletionTitle: "حذف داده‌ها",
  termsDeletionBody:
    "با حذف حساب از بخش پروفایل، تمام اطلاعات وابسته به‌صورت کامل از پایگاه داده حذف می‌شود.",
  termsNatureTitle: "ماهیت محصول",
  termsNatureBody:
    "این محصول ابزار آموزشی تناسب اندام است و جایگزین تشخیص، درمان یا مشاوره پزشکی نیست. در صورت آسیب یا بیماری با پزشک مشورت کنید.",
};

const EN: AuthStrings = {
  pageTitle: "Sign in | AI Fitness Coach",
  heroLine1: "Your fitness journey,",
  heroHighlight: "with your real data",
  heroSuffix: " is built",
  heroSub:
    "Create an account and record your body profile so that, in later stages, personalized workout and nutrition plans are built from this very data.",
  highlights: [
    { title: "Interactive 3D coach", text: "Perform exercises with a body model and see the muscles involved" },
    { title: "Personal account", text: "Secure profile storage with password hashing and a revocable session" },
    { title: "Workout & nutrition plans", text: "Custom plans based on your profile — in later stages" },
  ],
  upcomingBadge: "Upcoming stages",
  cardTitle: "Sign in or create an account",
  cardSubtitle: "Create an account or sign in to access your coach dashboard.",
  tabLogin: "Sign in",
  tabRegister: "Sign up",
  privacyNote:
    "Your personal information is stored only on this product's server and is never shared with third parties.",
  showPasswordAria: "Show password",
  hidePasswordAria: "Hide password",
  emailLabel: "Email",
  passwordLabel: "Password",
  invalidEmail: "Enter a valid email address.",
  requiredPassword: "Enter your password.",
  loginSubmit: "Sign in",
  loginSubmitting: "Signing in…",
  loginHint:
    "Email verification and password recovery are not available yet and will be added in later stages; in this version, contact support to regain access.",
  nameLabel: "Display name",
  namePlaceholder: "e.g. Ali Rezaei",
  confirmPasswordLabel: "Confirm password",
  passwordHint: "At least 8 characters, including at least one letter and one digit.",
  nameLengthError: "Display name must be between 2 and 60 characters.",
  passwordMinError: "Password must be at least 8 characters.",
  passwordCharError: "Password must contain at least one letter and one digit.",
  confirmMismatch: "Password confirmation does not match the password.",
  termsAcceptPrefix: "I have read and accept the ",
  termsAcceptSuffix: ".",
  termsRequired: "You must accept the terms to create an account.",
  registerSubmit: "Create account",
  registerSubmitting: "Creating account…",
  networkError: "Could not reach the server; please check your internet connection.",
  serverError: (message) =>
    (
      {
        "تعداد تلاش‌ها زیاد است؛ لطفاً یک دقیقه بعد دوباره امتحان کنید.":
          "Too many attempts; please try again in a minute.",
        "رمز عبور باید حداقل ۸ کاراکتر و شامل حداقل یک حرف و یک رقم باشد.":
          "Password must be at least 8 characters and include at least one letter and one digit.",
        "این ایمیل قبلاً ثبت شده است. اگر حساب دارید وارد شوید.":
          "This email is already registered. If you have an account, sign in.",
        "ایمیل یا رمز عبور اشتباه است.": "Incorrect email or password.",
        "عملیات انجام نشد؛ لطفاً دوباره تلاش کنید.": "The operation failed; please try again.",
      } as Record<string, string>
    )[message] ?? "The operation failed; please try again.",
  termsTitle: "Terms of Use & Privacy Policy",
  termsDescription: "An honest summary of the data we store and how we protect it.",
  termsStoredTitle: "Stored data",
  termsStoredBody:
    "Your email, display name and fitness profile information (age, optional gender, height, weight, goals, equipment, self-reported movement limitations and dietary preferences) are stored on the server.",
  termsSecurityTitle: "Security",
  termsSecurityBody:
    "Your password is never stored as plain text; it is hashed with the standard bcrypt algorithm. Your session is kept in a secure (HttpOnly) cookie and you can sign out from any device.",
  termsHealthPrivacyTitle: "Health data confidentiality",
  termsHealthPrivacyBody:
    "Your body metrics and movement limitations are treated as confidential, shown only on your own account, and never shared with any person or third-party service.",
  termsDeletionTitle: "Data deletion",
  termsDeletionBody:
    "Deleting your account from the profile section permanently removes all related information from the database.",
  termsNatureTitle: "Nature of the product",
  termsNatureBody:
    "This product is a fitness educational tool and is not a substitute for medical diagnosis, treatment or advice. If you are injured or ill, consult a physician.",
};

const STRINGS: Record<Locale, AuthStrings> = { fa: FA, en: EN };

export function authStrings(locale: Locale): AuthStrings {
  return STRINGS[locale];
}
