"use client";

/**
 * بخش «اطلاعات بانکی» پروفایل — مرحله ۱۹.۶ (بخش ۵).
 * اطلاعات پرداختی خصوصی کاربر/مربی: ذخیره پایدار، اعتبارسنجی سمت سرور
 * (کارت ۱۶ رقمی، شبا IR+۲۴)، هرگز در هیچ API دیگری افشا نمیشود و در لاگ
 * هم نوشته نمیشود. اتصال بانک/تأیید واقعی پرداخت در این مرحله نیست.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Landmark, ShieldCheck } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useBanking } from "@/hooks/use-p196";
import type { BankingInfoClient } from "@/hooks/use-p196";

export function BankingInfoSection() {
  const t = useStrings(phase196Strings);
  const plansT = useStrings(coachPlansStrings);
  const locale = useLocale();
  const dir = useDir();
  const { toast } = useToast();
  const { banking, loading, saving, save } = useBanking(true);

  const [form, setForm] = useState<BankingInfoClient | null>(null);

  // همگام‌سازی فرم با داده سرور — الگوی مشتق در رندر
  if (banking && (form === null || form.updatedAt !== banking.updatedAt)) {
    setForm(banking);
  }

  const patch = (p: Partial<BankingInfoClient>) =>
    setForm((f) => (f ? { ...f, ...p } : f));

  const doSave = async () => {
    if (!form) return;
    const card = form.cardNumber.replace(/\D/g, "");
    if (card.length > 0 && card.length !== 16) {
      toast({ title: plansT.formErrorsTitle, description: t.bankingInvalidCard, variant: "destructive" });
      return;
    }
    const sheba = form.sheba.toUpperCase().replace(/\s-/g, "");
    if (sheba.length > 0 && !/^IR\d{24}$/.test(sheba)) {
      toast({ title: plansT.formErrorsTitle, description: t.bankingInvalidSheba, variant: "destructive" });
      return;
    }
    const result = await save({
      accountHolder: form.accountHolder,
      bankName: form.bankName,
      accountNumber: form.accountNumber,
      cardNumber: form.cardNumber,
      sheba: form.sheba,
      note: form.note,
    });
    if (result.ok) {
      toast({ title: t.bankingSaved, description: t.bankingSavedNote });
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border-border/60 bg-card/70">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary" aria-hidden="true">
            <Landmark className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">{t.bankingSectionTitle}</h2>
            <p className="text-[11px] leading-5 text-muted-foreground">{t.bankingSectionNote}</p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-xl border border-primary/25 bg-primary/5 p-2.5">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="text-[11px] leading-5 text-muted-foreground">{t.bankingPrivacyNote}</p>
        </div>

        {loading || form === null ? (
          <div className="h-32 animate-pulse rounded-xl bg-secondary/30" aria-busy="true" />
        ) : (
          <div dir={dir} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bank-holder" className="text-[11px] font-bold text-foreground">{t.accountHolderLabel}</Label>
                <Input
                  id="bank-holder"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.accountHolder}
                  onChange={(e) => patch({ accountHolder: e.target.value.slice(0, 120) })}
                  maxLength={120}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-name" className="text-[11px] font-bold text-foreground">{t.bankNameLabel}</Label>
                <Input
                  id="bank-name"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.bankName}
                  onChange={(e) => patch({ bankName: e.target.value.slice(0, 80) })}
                  maxLength={80}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-acc" className="text-[11px] font-bold text-foreground">{t.accountNumberLabel}</Label>
                <Input
                  id="bank-acc"
                  dir="ltr"
                  value={form.accountNumber}
                  onChange={(e) => patch({ accountNumber: e.target.value.slice(0, 34) })}
                  maxLength={34}
                  inputMode="numeric"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-card" className="text-[11px] font-bold text-foreground">{t.cardNumberLabel}</Label>
                <Input
                  id="bank-card"
                  dir="ltr"
                  value={form.cardNumber}
                  onChange={(e) => patch({ cardNumber: e.target.value.slice(0, 19) })}
                  maxLength={19}
                  inputMode="numeric"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bank-sheba" className="text-[11px] font-bold text-foreground">{t.shebaLabel}</Label>
                <Input
                  id="bank-sheba"
                  dir="ltr"
                  value={form.sheba}
                  onChange={(e) => patch({ sheba: e.target.value.slice(0, 27) })}
                  maxLength={27}
                  placeholder="IR"
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="bank-note" className="text-[11px] font-bold text-foreground">{t.bankingNoteLabel}</Label>
                <Textarea
                  id="bank-note"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.note}
                  onChange={(e) => patch({ note: e.target.value.slice(0, 200) })}
                  rows={2}
                  maxLength={200}
                  className="resize-none text-xs"
                />
              </div>
            </div>
            <Button size="sm" onClick={() => void doSave()} disabled={saving}>
              {saving ? plansT.saving : t.bankingSave}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
