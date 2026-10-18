"use client";

/**
 * صفحه تنظیم رمز عبور جدید — /reset-password?token=…
 *
 * مقصد لینک بازیابی رمز (ایمیل یا نمایش مستقیم در حالت بدون ایمیل).
 * توکن از کوئری استرینگ خوانده می‌شود و با authClient.resetPassword به
 * مسیر رسمی better-auth ارسال می‌شود؛ پس از موفقیت همهٔ نشست‌های فعال
 * کاربر باطل می‌شود (revokeSessionsOnPasswordReset در src/lib/auth.ts).
 */

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CircleCheck,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useStrings } from "@/lib/i18n/use-strings";
import { authStrings } from "@/lib/i18n/sections/auth";
import { useDocumentTitle } from "@/lib/i18n/locale";
import { UiLangSwitch } from "@/components/fitness/ui-lang-switch";
import { BrandMark } from "@/components/fitness/sidebar-nav";

/* ------------------------------- فیلد رمز عبور ------------------------------- */

function ResetPasswordField({
  id,
  value,
  onChange,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  describedBy?: string;
}) {
  const t = useStrings(authStrings);
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        dir="ltr"
        className="pe-10 text-start"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="new-password"
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

/* --------------------------------- فرم اصلی --------------------------------- */

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const t = useStrings(authStrings);

  // عنوان ترجمه‌شده صفحه — الزام دسترسی‌پذیری
  useDocumentTitle(t.resetPageTitle);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInvalid, setTokenInvalid] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting || !token) return;

    if (password.length < 8) {
      setError(t.passwordMinError);
      return;
    }
    if (!(/[A-Za-z]/.test(password) && /[0-9]/.test(password))) {
      setError(t.passwordCharError);
      return;
    }
    if (confirm !== password) {
      setError(t.confirmMismatch);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const { error: authError } = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (authError) {
        const msg = authError.message ?? "";
        if (msg === "PASSWORD_POLICY") {
          setError(t.passwordCharError);
        } else if (/token/i.test(msg)) {
          setTokenInvalid(true);
        } else {
          setError(t.resetGenericError);
        }
        setSubmitting(false);
        return;
      }
      setDone(true);
    } catch {
      setError(t.networkError);
      setSubmitting(false);
    }
  };

  const errorBanner = (message: string) => (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium leading-6 text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );

  // لینک بدون توکن، یا توکنی که سرور آن را نامعتبر اعلام کرد — پنل راهنما به‌جای فرم
  if (!token || tokenInvalid) {
    return (
      <div className="flex flex-col gap-4">
        {errorBanner(t.resetInvalidToken)}
        <Button asChild variant="secondary" className="h-10 font-bold">
          <a href="/">
            <LogIn className="size-4" aria-hidden="true" />
            {t.backToLogin}
          </a>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs font-medium leading-6 text-foreground"
        >
          <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <p className="font-bold">{t.resetSuccessTitle}</p>
            <p className="leading-6">{t.resetSuccessBody}</p>
          </div>
        </div>
        <Button asChild className="h-11 font-bold text-primary-foreground glow-lime-sm">
          <a href="/">
            <LogIn className="size-4" aria-hidden="true" />
            {t.backToLogin}
          </a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {error && errorBanner(error)}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-password" className="text-xs font-semibold text-foreground/90">
          {t.newPasswordLabel}
        </Label>
        <ResetPasswordField
          id="reset-password"
          value={password}
          onChange={setPassword}
          describedBy="reset-password-hint"
        />
        <p id="reset-password-hint" className="text-[10px] leading-5 text-muted-foreground/70">
          {t.passwordHint}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reset-confirm" className="text-xs font-semibold text-foreground/90">
          {t.confirmPasswordLabel}
        </Label>
        <ResetPasswordField id="reset-confirm" value={confirm} onChange={setConfirm} />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-1 h-11 font-bold text-primary-foreground glow-lime-sm"
      >
        {submitting ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <KeyRound className="size-4" aria-hidden="true" />
        )}
        {submitting ? t.resetSubmitting : t.resetSubmit}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="absolute top-4 end-4 z-20">
        <UiLangSwitch />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-grid-fade opacity-60" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-aura-lime opacity-70" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <div className="rounded-2xl border border-border/60 bg-card/95 p-6 shadow-2xl shadow-black/30 backdrop-blur md:p-8">
          <Suspense fallback={<div className="min-h-48" aria-hidden="true" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </motion.div>
    </div>
  );
}
