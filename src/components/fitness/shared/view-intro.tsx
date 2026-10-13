"use client";

import type { NavItem } from "@/lib/nav";

/**
 * نوار معرفی یکدست بالای هر بخش — آیکون، توضیح کوتاه و نشان‌های وضعیت.
 * عنوان بخش در سربرگ نمایش داده می‌شود؛ اینجا تکرار نمی‌شود.
 */
export function ViewIntro({
  item,
  badges,
}: {
  item: NavItem;
  badges?: React.ReactNode;
}) {
  const Icon = item.icon;
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-4 sm:flex-row sm:items-center sm:gap-4 md:p-5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
        <Icon className="size-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-xs leading-6 text-muted-foreground sm:text-[13px]">
        {item.description}
      </p>
      {badges && <div className="flex shrink-0 flex-wrap items-center gap-2">{badges}</div>}
    </div>
  );
}
