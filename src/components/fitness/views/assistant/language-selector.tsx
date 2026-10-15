"use client";

import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LangChoice } from "@/lib/assistant/types";
import type { AssistantStrings } from "@/lib/assistant/i18n";

/**
 * انتخابگر زبان پاسخ دستیار — «خودکار» (تشخیص از پیام)، «فارسی»،
 * «English». انتخاب پس از refresh در localStorage حفظ می‌شود و در حالت
 * انگلیسی چیدمان بخش چت چپ‌چین می‌شود.
 */
export function LanguageSelector({
  value,
  onChange,
  strings,
  disabled = false,
}: {
  value: LangChoice;
  onChange: (choice: LangChoice) => void;
  strings: AssistantStrings;
  disabled?: boolean;
}) {
  const options: { value: LangChoice; label: string }[] = [
    { value: "auto", label: strings.langAuto },
    { value: "fa", label: strings.langFa },
    { value: "en", label: strings.langEn },
  ];

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-border/50 bg-secondary/30 p-0.5"
      role="group"
      aria-label={strings.languageLabel}
    >
      <Languages className="mx-1 size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          title={option.label}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-bold transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring/60 disabled:cursor-not-allowed disabled:opacity-50",
            value === option.value
              ? "bg-primary/20 text-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
