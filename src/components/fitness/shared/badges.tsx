"use client";

import { FlaskConical, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Difficulty } from "@/lib/exercises/types";

/** نشان «واقعی» — داده‌ای که مستقیماً از پایگاه داده سرور آمده است */
export function RealBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary",
        className
      )}
    >
      <CircleCheck className="size-3" aria-hidden="true" />
      واقعی
    </span>
  );
}

/** نشان «نمونه نمایشی» — رنگ کهربایی متمایز از رنگ تأکیدی محصول */
export function DemoBadge({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300",
        className
      )}
    >
      <FlaskConical className="size-3" aria-hidden="true" />
      {children ?? "نمونه نمایشی"}
    </span>
  );
}

/** نشان مرحله توسعه — رنگ خنثی */
export function StageBadge({
  stage,
  label,
  className,
}: {
  stage?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground",
        className
      )}
    >
      {label ?? `مرحله ${stage?.toLocaleString("fa-IR")}`}
    </span>
  );
}

/** نشان سطح دشواری حرکت — کدگذاری رنگی ملایم */
export function DifficultyBadge({ level }: { level: Difficulty }) {
  const styles: Record<Difficulty, string> = {
    مبتدی: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
    متوسط: "border-amber-400/30 bg-amber-400/10 text-amber-300",
    پیشرفته: "border-rose-400/30 bg-rose-400/10 text-rose-300",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold",
        styles[level]
      )}
    >
      {level}
    </span>
  );
}
