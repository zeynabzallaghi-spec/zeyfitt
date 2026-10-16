"use client";

/**
 * کلید عمومی تغییر زبان رابط (فارسی / English) — الزام سراسری FA/EN.
 *
 * جای نمایش: سربرگ پنل + صفحه ورود + راه‌اندازی اولیه؛ در همه حالت‌ها
 * قابل دسترس است. زبان انتخابی در کوکی یک‌ساله + localStorage ذخیره
 * می‌شود و پس از refresh، ورود مجدد و جابه‌جایی بین بخش‌ها حفظ می‌ماند.
 *
 * دوزبانگی ذاتی کنترل: نام هر زبان به همان زبان نمایش داده می‌شود
 * (فارسی/English) تا کاربر در هر حالتی بتواند زبان خود را بشناسد.
 */

import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";
import { useUiLang } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { shellStrings } from "@/lib/i18n/sections/shell";
import { LOCALES, type Locale } from "@/lib/i18n/shared";

/** نام بومی هر زبان — همیشه به خود آن زبان، مستقل از زبان جاری رابط */
const NATIVE_LABEL: Record<Locale, string> = { fa: "فا", en: "EN" };

export function UiLangSwitch({ className }: { className?: string }) {
  const { locale, setLocale } = useUiLang();
  const t = useStrings(shellStrings);

  return (
    <div
      role="group"
      aria-label={t.langSwitchAria}
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-border/60 bg-secondary/40 p-0.5",
        className
      )}
    >
      <Languages
        className="mx-1 size-3.5 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      {LOCALES.map((option) => {
        const active = option === locale;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            aria-pressed={active}
            aria-label={option === "fa" ? "فارسی" : "English"}
            title={t.langSwitchTitle}
            className={cn(
              "min-w-9 rounded-md px-2 py-1 text-[11px] font-bold leading-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
              active
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
            )}
          >
            {NATIVE_LABEL[option]}
          </button>
        );
      })}
    </div>
  );
}
