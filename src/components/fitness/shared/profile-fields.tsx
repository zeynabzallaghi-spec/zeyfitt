"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { UserRound } from "lucide-react";

/** قالب مشترک فیلد فرم — در پروفایل و onboarding */
export interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}

export function Field({ id, label, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-semibold text-foreground/90">
        {label}
        {hint && <span className="ms-1.5 font-normal text-muted-foreground/70">({hint})</span>}
      </Label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[11px] font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** دکمه چندانتخابی چیپی — انتخاب تجهیزات/محدودیت‌ها/آلرژی‌ها */
export function ChipToggle({
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

/** بخش‌بندی کارتی فرم — هماهنگ با کارت‌های داشبورد */
export function ProfileSection({
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
