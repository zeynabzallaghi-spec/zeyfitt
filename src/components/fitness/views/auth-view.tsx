"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  LogIn,
  UserRoundPlus,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Box,
  CalendarCheck2,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { authClient, authErrorToFa } from "@/lib/auth-client";
import { EMAIL_PATTERN, normalizeEmail } from "@/lib/profile";
import { BrandMark } from "../sidebar-nav";

/* ------------------------------ متن شرایط استفاده ------------------------------ */

function TermsDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs font-semibold text-primary underline-offset-4 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
        >
          شرایط استفاده و سیاست حریم خصوصی
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">شرایط استفاده و سیاست حریم خصوصی</DialogTitle>
          <DialogDescription className="text-start">
            خلاصه‌ای صادقانه از داده‌هایی که ذخیره می‌کنیم و نحوه محافظت از آن‌ها.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-xs leading-6 text-muted-foreground">
          <section aria-label="داده‌های ذخیره‌شده">
            <h4 className="mb-1 font-bold text-foreground">داده‌های ذخیره‌شده</h4>
            <p>
              ایمیل، نام نمایشی و اطلاعات پروفایل تناسب اندام شما (سن، جنسیت اختیاری، قد، وزن،
              هدف‌ها، تجهیزات، محدودیت‌های حرکتی اعلامی و ترجیحات غذایی) روی سرور ذخیره می‌شود.
            </p>
          </section>
          <section aria-label="امنیت">
            <h4 className="mb-1 font-bold text-foreground">امنیت</h4>
            <p>
              رمز عبور هرگز به‌صورت متن ساده ذخیره نمی‌شود و با الگوریتم استاندارد bcrypt هش
              می‌گردد. نشست شما با کوکی امن (HttpOnly) نگهداری می‌شود و از هر دستگاه می‌توانید
              خارج شوید.
            </p>
          </section>
          <section aria-label="محرمانگی اطلاعات سلامت">
            <h4 className="mb-1 font-bold text-foreground">محرمانگی اطلاعات سلامت</h4>
            <p>
              اطلاعات بدنی و محدودیت‌های حرکتی شما محرمانه تلقی می‌شود، فقط به حساب خودتان
              نمایش داده می‌شود و در اختیار هیچ شخص یا خدمات ثالث قرار نمی‌گیرد.
            </p>
          </section>
          <section aria-label="حذف داده‌ها">
            <h4 className="mb-1 font-bold text-foreground">حذف داده‌ها</h4>
            <p>
              با حذف حساب از بخش پروفایل، تمام اطلاعات وابسته به‌صورت کامل از پایگاه داده حذف
              می‌شود.
            </p>
          </section>
          <section aria-label="ماهیت محصول">
            <h4 className="mb-1 font-bold text-foreground">ماهیت محصول</h4>
            <p>
              این محصول ابزار آموزشی تناسب اندام است و جایگزین تشخیص، درمان یا مشاوره پزشکی
              نیست. در صورت آسیب یا بیماری با پزشک مشورت کنید.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- فیلد رمز عبور --------------------------------- */

function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  describedBy?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        dir="ltr"
        className="pe-10 text-left"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "پنهان‌کردن رمز" : "نمایش رمز"}
        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
      >
        {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
      </button>
    </div>
  );
}

/* --------------------------------- بنر خطا --------------------------------- */

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium leading-6 text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

/* --------------------------------- فرم ورود --------------------------------- */

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ email?: string; password?: string }>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return; // جلوگیری از ارسال چندباره

    const errors: typeof fieldError = {};
    if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
      errors.email = "ایمیل معتبر وارد کنید.";
    }
    if (password.length === 0) {
      errors.password = "رمز عبور را وارد کنید.";
    }
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: authError } = await authClient.signIn.email({
        email: normalizeEmail(email),
        password,
      });
      if (authError) {
        setError(authErrorToFa(authError.status ?? 0, authError.message ?? undefined));
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ اتصال اینترنت خود را بررسی کنید.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email" className="text-xs font-semibold text-foreground/90">
          ایمیل
        </Label>
        <Input
          id="login-email"
          type="email"
          dir="ltr"
          className="text-left"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          aria-invalid={Boolean(fieldError.email)}
          aria-describedby={fieldError.email ? "login-email-error" : undefined}
        />
        {fieldError.email && (
          <p id="login-email-error" role="alert" className="text-[11px] font-medium text-destructive">
            {fieldError.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-password" className="text-xs font-semibold text-foreground/90">
          رمز عبور
        </Label>
        <PasswordInput
          id="login-password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          describedBy={fieldError.password ? "login-password-error" : undefined}
        />
        {fieldError.password && (
          <p id="login-password-error" role="alert" className="text-[11px] font-medium text-destructive">
            {fieldError.password}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-1 h-11 font-bold text-primary-foreground glow-lime-sm"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="size-4" aria-hidden="true" />
        )}
        {submitting ? "در حال ورود…" : "ورود به حساب"}
      </Button>

      <p className="flex items-start gap-1.5 text-[10px] leading-5 text-muted-foreground/70">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        تأیید ایمیل و بازیابی رمز عبور هنوز فعال نیست و در مراحل بعدی اضافه می‌شود؛ در این
        نسخه برای بازیابی دسترسی با پشتیبانی هماهنگ شوید.
      </p>
    </form>
  );
}

/* ------------------------------- فرم ثبت‌نام ------------------------------- */

function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return; // جلوگیری از ارسال چندباره

    const errors: Record<string, string> = {};
    if (name.trim().length < 2 || name.trim().length > 60) {
      errors.name = "نام نمایشی باید بین ۲ تا ۶۰ کاراکتر باشد.";
    }
    if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
      errors.email = "ایمیل معتبر وارد کنید.";
    }
    if (password.length < 8) {
      errors.password = "رمز عبور باید حداقل ۸ کاراکتر باشد.";
    } else if (!(/[A-Za-z]/.test(password) && /[0-9]/.test(password))) {
      errors.password = "رمز عبور باید حداقل یک حرف و یک رقم داشته باشد.";
    }
    if (confirm !== password || confirm.length === 0) {
      errors.confirm = "تکرار رمز عبور با رمز عبور یکسان نیست.";
    }
    if (!accepted) {
      errors.accepted = "برای ساخت حساب، پذیرش شرایط الزامی است.";
    }
    setFieldError(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    setError(null);
    try {
      const { error: authError } = await authClient.signUp.email({
        email: normalizeEmail(email),
        password,
        name: name.trim(),
      });
      if (authError) {
        setError(authErrorToFa(authError.status ?? 0, authError.message ?? undefined));
        setSubmitting(false);
        return;
      }
      router.refresh(); // ورود خودکار پس از ثبت‌نام → مرحله راه‌اندازی پروفایل
    } catch {
      setError("ارتباط با سرور برقرار نشد؛ اتصال اینترنت خود را بررسی کنید.");
      setSubmitting(false);
    }
  };

  const fieldProps = (key: string) => ({
    "aria-invalid": Boolean(fieldError[key]),
    "aria-describedby": fieldError[key] ? `${key}-error` : undefined,
  });

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-name" className="text-xs font-semibold text-foreground/90">
          نام نمایشی
        </Label>
        <Input
          id="register-name"
          type="text"
          placeholder="مثلاً علی رضایی"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          {...fieldProps("name")}
        />
        {fieldError.name && (
          <p id="name-error" role="alert" className="text-[11px] font-medium text-destructive">
            {fieldError.name}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email" className="text-xs font-semibold text-foreground/90">
          ایمیل
        </Label>
        <Input
          id="register-email"
          type="email"
          dir="ltr"
          className="text-left"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          {...fieldProps("email")}
        />
        {fieldError.email && (
          <p id="email-error" role="alert" className="text-[11px] font-medium text-destructive">
            {fieldError.email}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password" className="text-xs font-semibold text-foreground/90">
          رمز عبور
        </Label>
        <PasswordInput
          id="register-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          describedBy="register-password-hint"
        />
        <p id="register-password-hint" className="text-[10px] leading-5 text-muted-foreground/70">
          حداقل ۸ کاراکتر، شامل حداقل یک حرف و یک رقم.
        </p>
        {fieldError.password && (
          <p id="password-error" role="alert" className="text-[11px] font-medium text-destructive">
            {fieldError.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-confirm" className="text-xs font-semibold text-foreground/90">
          تکرار رمز عبور
        </Label>
        <PasswordInput
          id="register-confirm"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />
        {fieldError.confirm && (
          <p id="confirm-error" role="alert" className="text-[11px] font-medium text-destructive">
            {fieldError.confirm}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="register-terms"
          className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-border/50 bg-secondary/20 p-3 text-xs leading-6 text-muted-foreground outline-none focus-within:ring-2 focus-within:ring-ring/60"
        >
          <Checkbox
            id="register-terms"
            checked={accepted}
            onCheckedChange={(checked) => setAccepted(checked === true)}
            className="mt-1"
          />
          <span>
            <TermsDialog /> را خوانده‌ام و می‌پذیرم.
          </span>
        </label>
        {fieldError.accepted && (
          <p id="accepted-error" role="alert" className="text-[11px] font-medium text-destructive">
            {fieldError.accepted}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-1 h-11 font-bold text-primary-foreground glow-lime-sm"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserRoundPlus className="size-4" aria-hidden="true" />
        )}
        {submitting ? "در حال ساخت حساب…" : "ساخت حساب کاربری"}
      </Button>
    </form>
  );
}

/* --------------------------------- نمای اصلی --------------------------------- */

const HIGHLIGHTS = [
  {
    icon: Box,
    title: "مربی سه‌بعدی تعاملی",
    text: "اجرای حرکات با مدل بدن و نمایش عضلات درگیر",
    done: true,
  },
  {
    icon: ShieldCheck,
    title: "حساب کاربری شخصی",
    text: "ذخیره امن پروفایل با هش رمز عبور و نشست قابل ابطال",
    done: true,
  },
  {
    icon: CalendarCheck2,
    title: "برنامه تمرینی و غذایی",
    text: "برنامه اختصاصی بر اساس پروفایل شما — در مراحل بعدی",
    done: false,
  },
];

export function AuthView() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* پس‌زمینه تزئینی هماهنگ با تم */}
      <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-aura-lime opacity-70" aria-hidden="true" />

      <div className="relative z-10 grid w-full max-w-4xl items-center gap-10 lg:grid-cols-2">
        {/* معرفی محصول — فقط دسکتاپ */}
        <div className="hidden lg:block">
          <BrandMark />
          <h1 className="mt-8 text-3xl font-extrabold leading-snug text-foreground">
            مسیر تناسب اندام شما،
            <br />
            <span className="text-primary text-glow">با داده واقعی شما</span> ساخته می‌شود
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">
            با ساخت حساب کاربری، پروفایل بدنی خود را ثبت کنید تا در مراحل بعدی، برنامه تمرینی
            و غذایی اختصاصی بر اساس همین داده‌ها ساخته شود.
          </p>
          <ul className="mt-8 flex flex-col gap-4">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span
                  className={
                    item.done
                      ? "flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/35 bg-primary/15 text-primary"
                      : "flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground"
                  }
                >
                  <item.icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col">
                  <span className="flex items-center gap-2 text-[13px] font-bold text-foreground">
                    {item.title}
                    {!item.done && (
                      <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                        مراحل بعدی
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 text-xs leading-6 text-muted-foreground">{item.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* کارت ورود/ثبت‌نام */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="w-full"
        >
          <div className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
            <div className="mb-6 flex justify-center lg:hidden">
              <BrandMark />
            </div>
            <h2 className="text-center text-lg font-extrabold text-foreground">
              ورود یا ثبت‌نام
            </h2>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">
              برای دسترسی به پنل مربی، حساب کاربری بسازید یا وارد شوید.
            </p>

            <Tabs defaultValue="login" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="font-bold">
                  ورود
                </TabsTrigger>
                <TabsTrigger value="register" className="font-bold">
                  ثبت‌نام
                </TabsTrigger>
              </TabsList>
              <TabsContent value="login" className="mt-6">
                <LoginForm />
              </TabsContent>
              <TabsContent value="register" className="mt-6">
                <RegisterForm />
              </TabsContent>
            </Tabs>

            <p className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/50 pt-4 text-center text-[10px] leading-5 text-muted-foreground/70">
              <FileText className="size-3.5 shrink-0" aria-hidden="true" />
              اطلاعات شخصی شما فقط روی سرور این محصول ذخیره می‌شود و در اختیار ثالث قرار نمی‌گیرد.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
