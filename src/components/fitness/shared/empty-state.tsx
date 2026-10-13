"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** دکمه عملی اختیاری */
  action?: React.ReactNode;
  className?: string;
  /** سایز فشرده برای کارت‌های کوچک */
  compact?: boolean;
}

/**
 * حالت خالی یکپارچه و راهنما‌کننده — به‌جای داده ساختگی، وضعیت واقعی
 * و مسیر پیشرفت کاربر را توضیح می‌دهد.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2.5 rounded-xl px-6 text-center",
        compact ? "py-6" : "py-10",
        className
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl border border-dashed border-border/70 bg-secondary/30 text-muted-foreground",
          compact ? "size-11" : "size-14"
        )}
      >
        <Icon
          className={compact ? "size-5" : "size-6"}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </span>
      <p className="text-sm font-bold text-foreground">{title}</p>
      <p className="max-w-md text-xs leading-6 text-muted-foreground">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
