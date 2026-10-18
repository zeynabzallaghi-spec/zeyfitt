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
  KeyRound,
  MailCheck,
  Info,
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
import { useStrings } from "@/lib/i18n/use-strings";
import { authStrings } from "@/lib/i18n/sections/auth";
import { useDocumentTitle } from "@/lib/i18n/locale";
import { UiLangSwitch } from "@/components/fitness/ui-lang-switch";
import { BrandMark } from "../sidebar-nav";

/* ------------------------------ متن شرایط استفاده ------------------------------ */

function TermsDialog() {
  const t = useStrings(authStrings);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="text-xs font-semibold text-primary underline-offset-4 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
        >
          {t.termsTitle}
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-start">{t.termsTitle}</DialogTitle>
          <DialogDescription className="text-start">{t.termsDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-xs leading-6 text-muted-foreground">
          <section aria-label={t.termsStoredTitle}>
            <h4 className="mb-1 font-bold text-foreground">{t.termsStoredTitle}</h4>
            <p>{t.termsStoredBody}</p>
          </section>
          <section aria-label={t.termsSecurityTitle}>
            <h4 className="mb-1 font-bold text-foreground">{t.termsSecurityTitle}</h4>
            <p>{t.termsSecurityBody}</p>
          </section>
          <section aria-label={t.termsHealthPrivacyTitle}>
            <h4 className="mb-1 font-bold text-foreground">{t.termsHealthPrivacyTitle}</h4>
            <p>{t.termsHealthPrivacyBody}</p>
          </section>
          <section aria-label={t.termsDeletionTitle}>
            <h4 className="mb-1 font-bold text-foreground">{t.termsDeletionTitle}</h4>
            <p>{t.termsDeletionBody}</p>
          </section>
          <section aria-label={t.termsNatureTitle}>
            <h4 className="mb-1 font-bold text-foreground">{t.termsNatureTitle}</h4>
            <p>{t.termsNatureBody}</p>
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
  const t = useStrings(authStrings);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        dir="ltr"
        className="pe-10 text-start"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t.hidePasswordAria : t.showPasswordAria}
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

/* --------------------------- دیالوگ بازیابی رمز عبور --------------------------- */

interface ForgotResult {
  delivery: "email" | "sandbox-link";
  resetUrl?: string;
}

function ForgotPasswordDialog() {
  const t = useStrings(authStrings);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ForgotResult | null>(null);

  const resetState = () => {
    setEmail("");
    setError(null);
    setResult(null);
    setSubmitting(false);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) resetState(); // هر بار باز شدن، جریان تازه
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
      setError(t.invalidEmail);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizeEmail(email) }),
      });
      const data: { status?: boolean; delivery?: ForgotResult["delivery"]; resetUrl?: string } | null =
        await res.json().catch(() => null);
      if (res.status === 429) {
        setError(t.forgotRateLimited);
        return;
      }
      if (!res.ok || !data?.status || !data.delivery) {
        setError(t.resetGenericError);
        return;
      }
      setResult({ delivery: data.delivery, resetUrl: data.resetUrl });
    } catch {
      setError(t.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-4 hover:underline outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded"
        >
          <KeyRound className="size-3.5" aria-hidden="true" />
          {t.forgotLink}
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-start">{t.forgotDialogTitle}</DialogTitle>
          <DialogDescription className="text-start">{t.forgotDialogDescription}</DialogDescription>
        </DialogHeader>

        {!result ? (
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {error && <ErrorBanner message={error} />}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="forgot-email" className="text-xs font-semibold text-foreground/90">
                {t.emailLabel}
              </Label>
              <Input
                id="forgot-email"
                type="email"
                dir="ltr"
                className="text-start"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                aria-invalid={error !== null}
              />
            </div>
            <Button type="submit" disabled={submitting} className="h-10 font-bold text-primary-foreground glow-lime-sm">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <KeyRound className="size-4" aria-hidden="true" />
              )}
              {submitting ? t.forgotSubmitting : t.forgotSubmit}
            </Button>
          </form>
        ) : result.delivery === "sandbox-link" && result.resetUrl ? (
          <div className="flex flex-col gap-4">
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-medium leading-6 text-amber-600 dark:text-amber-400"
            >
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-bold">{t.forgotSandboxTitle}</p>
                <p className="leading-6">{t.forgotSandboxBody}</p>
              </div>
            </div>
            <a
              href={result.resetUrl}
              className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary font-bold text-sm text-primary-foreground transition-colors hover:bg-primary/90 glow-lime-sm"
            >
              <KeyRound className="size-4" aria-hidden="true" />
              {t.forgotSandboxOpen}
            </a>
          </div>
        ) : (
          <div
            role="status"
            className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs font-medium leading-6 text-foreground"
          >
            <MailCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <span>{t.forgotSentGeneric}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------------- فرم ورود --------------------------------- */

function LoginForm() {
  const router = useRouter();
  const t = useStrings(authStrings);
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
      errors.email = t.invalidEmail;
    }
    if (password.length === 0) {
      errors.password = t.requiredPassword;
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
        setError(t.serverError(authErrorToFa(authError.status ?? 0, authError.message ?? undefined)));
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch {
      setError(t.networkError);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && <ErrorBanner message={error} />}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="login-email" className="text-xs font-semibold text-foreground/90">
          {t.emailLabel}
        </Label>
        <Input
          id="login-email"
          type="email"
          dir="ltr"
          className="text-start"
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
          {t.passwordLabel}
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
        {submitting ? t.loginSubmitting : t.loginSubmit}
      </Button>

      <ForgotPasswordDialog />

      <p className="flex items-start gap-1.5 text-[10px] leading-5 text-muted-foreground/70">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        {t.loginHint}
      </p>
    </form>
  );
}

/* ------------------------------- فرم ثبت‌نام ------------------------------- */

function RegisterForm() {
  const router = useRouter();
  const t = useStrings(authStrings);
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
      errors.name = t.nameLengthError;
    }
    if (!EMAIL_PATTERN.test(normalizeEmail(email))) {
      errors.email = t.invalidEmail;
    }
    if (password.length < 8) {
      errors.password = t.passwordMinError;
    } else if (!(/[A-Za-z]/.test(password) && /[0-9]/.test(password))) {
      errors.password = t.passwordCharError;
    }
    if (confirm !== password || confirm.length === 0) {
      errors.confirm = t.confirmMismatch;
    }
    if (!accepted) {
      errors.accepted = t.termsRequired;
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
        setError(t.serverError(authErrorToFa(authError.status ?? 0, authError.message ?? undefined)));
        setSubmitting(false);
        return;
      }
      router.refresh(); // ورود خودکار پس از ثبت‌نام → مرحله راه‌اندازی پروفایل
    } catch {
      setError(t.networkError);
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
          {t.nameLabel}
        </Label>
        <Input
          id="register-name"
          type="text"
          placeholder={t.namePlaceholder}
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
          {t.emailLabel}
        </Label>
        <Input
          id="register-email"
          type="email"
          dir="ltr"
          className="text-start"
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
          {t.passwordLabel}
        </Label>
        <PasswordInput
          id="register-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          describedBy="register-password-hint"
        />
        <p id="register-password-hint" className="text-[10px] leading-5 text-muted-foreground/70">
          {t.passwordHint}
        </p>
        {fieldError.password && (
          <p id="password-error" role="alert" className="text-[11px] font-medium text-destructive">
            {fieldError.password}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-confirm" className="text-xs font-semibold text-foreground/90">
          {t.confirmPasswordLabel}
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
            {t.termsAcceptPrefix}
            <TermsDialog />
            {t.termsAcceptSuffix}
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
        {submitting ? t.registerSubmitting : t.registerSubmit}
      </Button>
    </form>
  );
}

/* --------------------------------- نمای اصلی --------------------------------- */

const HIGHLIGHTS = [
  { icon: Box, done: true },
  { icon: ShieldCheck, done: true },
  { icon: CalendarCheck2, done: false },
] as const;

export function AuthView() {
  const t = useStrings(authStrings);

  // عنوان ترجمه‌شده صفحه — الزام دسترسی‌پذیری
  useDocumentTitle(t.pageTitle);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* کلید تغییر زبان رابط — گوشه بالای صفحه، بدون برخورد با محتوای مرکزی */}
      <div className="absolute top-4 end-4 z-20">
        <UiLangSwitch />
      </div>

      {/* پس‌زمینه تزئینی هماهنگ با تم */}
      <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-aura-lime opacity-70" aria-hidden="true" />

      <div className="relative z-10 grid w-full max-w-4xl items-center gap-10 lg:grid-cols-2">
        {/* معرفی محصول — فقط دسکتاپ */}
        <div className="hidden lg:block">
          <BrandMark />
          <h1 className="mt-8 text-3xl font-extrabold leading-snug text-foreground">
            {t.heroLine1}
            <br />
            <span className="text-primary text-glow">{t.heroHighlight}</span>
            {t.heroSuffix}
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground">{t.heroSub}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {HIGHLIGHTS.map((item, index) => (
              <li key={index} className="flex items-start gap-3">
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
                    {t.highlights[index].title}
                    {!item.done && (
                      <span className="rounded-md border border-border/60 px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                        {t.upcomingBadge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 text-xs leading-6 text-muted-foreground">
                    {t.highlights[index].text}
                  </span>
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
            <h2 className="text-center text-lg font-extrabold text-foreground">{t.cardTitle}</h2>
            <p className="mt-1.5 text-center text-xs text-muted-foreground">{t.cardSubtitle}</p>

            <Tabs defaultValue="login" className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" className="font-bold">
                  {t.tabLogin}
                </TabsTrigger>
                <TabsTrigger value="register" className="font-bold">
                  {t.tabRegister}
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
              {t.privacyNote}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
