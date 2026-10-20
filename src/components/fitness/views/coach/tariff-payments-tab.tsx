"use client";

/**
 * تب «تعرفه‌ها و پرداخت» پنل مربی — مرحله ۱۹.۶.
 * تعرفه خصوصی/نیمه‌خصوصی به ریال و دلار + ساخت/مدیریت درخواست‌های پرداخت
 * با لینک خارجی. داده بانکی خصوصی اینجا هرگز نمایش داده/دستکاری نمیشود.
 */

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, ExternalLink, Plus, RefreshCw, Wallet } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { phase196Strings, type Phase196Strings } from "@/lib/i18n/sections/phase196";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { ViewIntro } from "../../shared/view-intro";
import { EmptyState } from "../../shared/empty-state";
import { useCoachTariff, useCoachPayments } from "@/hooks/use-p196";
import { useCoachStudents } from "@/hooks/use-coaching";
import type { CoachTariffClient } from "@/hooks/use-p196";

function priceLabel(v: number | null, unit: string, unset: string, locale: string): string {
  if (v === null || v === undefined) return unset;
  const n = localeNumber(v, locale);
  return `${n} ${unit}`;
}

function localeNumber(n: number, locale: string): string {
  const s = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(n);
  return s;
}

function TariffRow({
  label,
  irr,
  usd,
  onIrr,
  onUsd,
  t,
}: {
  label: string;
  irr: string;
  usd: string;
  onIrr: (v: string) => void;
  onUsd: (v: string) => void;
  t: Phase196Strings;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <Label className="self-center text-[11px] font-bold text-foreground sm:col-span-1">{label}</Label>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">{t.tariffIrr}</Label>
        <Input
          type="number"
          min={0}
          dir="ltr"
          value={irr}
          onChange={(e) => onIrr(e.target.value)}
          placeholder="—"
          className="h-8 text-xs"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">{t.tariffUsd}</Label>
        <Input
          type="number"
          min={0}
          dir="ltr"
          value={usd}
          onChange={(e) => onUsd(e.target.value)}
          placeholder="—"
          className="h-8 text-xs"
        />
      </div>
    </div>
  );
}

function statusBadgeTone(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "border-primary/40 bg-primary/10 text-primary";
    case "PENDING":
      return "border-amber-400/30 bg-amber-400/10 text-amber-300";
    case "DECLINED":
      return "border-rose-400/30 bg-rose-400/10 text-rose-300";
    default:
      return "border-border/50 bg-secondary/40 text-muted-foreground";
  }
}

export function CoachTariffPaymentsTab() {
  const t = useStrings(phase196Strings);
  const plansT = useStrings(coachPlansStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const dir = useDir();
  const { toast } = useToast();

  const { tariff, loading: tariffLoading, save } = useCoachTariff(true);
  const { payments, loading: payLoading, create, cancel, reload } = useCoachPayments(true);
  const { students } = useCoachStudents(true);

  const [privIrr, setPrivIrr] = useState<string | null>(null);
  const [privUsd, setPrivUsd] = useState<string | null>(null);
  const [semiIrr, setSemiIrr] = useState<string | null>(null);
  const [semiUsd, setSemiUsd] = useState<string | null>(null);
  const [hydratedFrom, setHydratedFrom] = useState<CoachTariffClient | null>(null);
  const [savingTariff, setSavingTariff] = useState(false);

  // همگام‌سازی فرم با داده سرور — الگوی مشتق در رندر (بدون effect)
  if (tariff && hydratedFrom !== tariff) {
    setHydratedFrom(tariff);
    setPrivIrr(tariff.privatePriceIrr === null ? "" : String(tariff.privatePriceIrr));
    setPrivUsd(tariff.privatePriceUsd === null ? "" : String(tariff.privatePriceUsd));
    setSemiIrr(tariff.semiPrivatePriceIrr === null ? "" : String(tariff.semiPrivatePriceIrr));
    setSemiUsd(tariff.semiPrivatePriceUsd === null ? "" : String(tariff.semiPrivatePriceUsd));
  }

  const saveTariff = async () => {
    setSavingTariff(true);
    const payload = {
      privatePriceIrr: privIrr?.trim() ? Number(privIrr) : null,
      privatePriceUsd: privUsd?.trim() ? Number(privUsd) : null,
      semiPrivatePriceIrr: semiIrr?.trim() ? Number(semiIrr) : null,
      semiPrivatePriceUsd: semiUsd?.trim() ? Number(semiUsd) : null,
    };
    const result = await save(payload);
    setSavingTariff(false);
    if (result.ok) {
      toast({ title: t.tariffSaved });
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  /* ------------------------- دیالوگ درخواست پرداخت ------------------------- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [payStudent, setPayStudent] = useState<string>("");
  const [payService, setPayService] = useState<string>("PRIVATE");
  const [payCurrency, setPayCurrency] = useState<string>("IRR");
  const [payAmount, setPayAmount] = useState("");
  const [payDesc, setPayDesc] = useState("");
  const [payLink, setPayLink] = useState("");
  const [creating, setCreating] = useState(false);

  const openDialog = () => {
    setPayStudent(students?.[0]?.student.userId ?? "");
    setPayService("PRIVATE");
    setPayCurrency("IRR");
    setPayAmount("");
    setPayDesc("");
    setPayLink("");
    setDialogOpen(true);
  };

  const submitPayment = async () => {
    if (creating) return;
    const conn = students?.find((s) => s.student.userId === payStudent);
    if (!conn) {
      toast({ title: plansT.loadError, description: t.studentsEmpty, variant: "destructive" });
      return;
    }
    const amount = Number(payAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: plansT.formErrorsTitle, description: t.paymentAmountLabel, variant: "destructive" });
      return;
    }
    if (!/^https:\/\//i.test(payLink.trim())) {
      toast({ title: plansT.formErrorsTitle, description: t.paymentLinkPlaceholder, variant: "destructive" });
      return;
    }
    setCreating(true);
    const result = await create({
      connectionId: conn.connectionId,
      serviceType: payService,
      amount: Math.round(amount),
      currency: payCurrency,
      description: payDesc.trim(),
      externalLink: payLink.trim(),
    });
    setCreating(false);
    if (result.ok) {
      toast({ title: t.paymentCreated });
      setDialogOpen(false);
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  const cancelPayment = async (id: string) => {
    const result = await cancel(id);
    if (result.ok) {
      toast({ title: t.paymentCancelled });
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  const item = {
    fa: "تعرفه‌ها و پرداخت",
    en: "Tariffs & Payments",
    description: t.tariffSectionNote,
    descriptionEn: t.tariffSectionNote,
    stage: 19,
    features: [] as string[],
    id: "coachPanel" as const,
    icon: Wallet,
  };

  const sortedPayments = useMemo(
    () => payments ?? [],
    [payments]
  );

  return (
    <div>
      <ViewIntro item={item} />

      {/* تعرفه‌ها */}
      <Card className="mb-5 border-border/60 bg-card/70">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-foreground">{t.tariffSectionTitle}</p>
          </div>
          <p className="text-[11px] leading-5 text-muted-foreground">{t.tariffSectionNote}</p>
          {tariffLoading ? (
            <div className="h-20 animate-pulse rounded-xl bg-secondary/30" aria-busy="true" />
          ) : (
            <div className="space-y-3">
              <TariffRow label={t.tariffPrivate} irr={privIrr ?? ""} usd={privUsd ?? ""} onIrr={setPrivIrr} onUsd={setPrivUsd} t={t} />
              <TariffRow label={t.tariffSemiPrivate} irr={semiIrr ?? ""} usd={semiUsd ?? ""} onIrr={setSemiIrr} onUsd={setSemiUsd} t={t} />
              <Button size="sm" onClick={saveTariff} disabled={savingTariff}>
                {savingTariff ? plansT.saving : t.tariffSave}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* درخواست‌های پرداخت */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-foreground">{t.paymentsSectionTitle}</p>
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={() => void reload()} aria-label={plansT.refresh}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </Button>
          <Button size="sm" onClick={openDialog}>
            <Plus className="me-1 size-3.5" aria-hidden="true" />
            {t.paymentCreate}
          </Button>
        </div>
      </div>

      {payLoading ? (
        <div className="h-24 animate-pulse rounded-xl bg-secondary/30" aria-busy="true" />
      ) : sortedPayments.length === 0 ? (
        <EmptyState icon={CreditCard} title={t.paymentsSectionTitle} description={t.paymentsEmpty} />
      ) : (
        <div className="space-y-3">
          {sortedPayments.map((p) => (
            <Card key={p.id} className="border-border/60 bg-card/70">
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">
                      {shared.cooperationTypeLabel(p.serviceType)}
                      {" · "}
                      {localeNumber(p.amount, locale)} {p.currency === "IRR" ? t.tariffIrr : t.tariffUsd}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {t.paymentStudentLabel}: {p.student.displayName}
                      {" · "}
                      {localeDateTimeLabel(p.createdAt, locale)}
                    </p>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold ${statusBadgeTone(p.status)}`}>
                    {p.status === "PENDING"
                      ? t.paymentStatusPending
                      : p.status === "CONFIRMED"
                        ? t.paymentStatusConfirmed
                        : p.status === "DECLINED"
                          ? t.paymentStatusDeclined
                          : t.paymentStatusCancelled}
                  </Badge>
                </div>
                {p.description && (
                  <p className="text-[11px] leading-5 text-muted-foreground">{p.description}</p>
                )}
                {p.status === "CONFIRMED" && (
                  <a
                    href={p.externalLink}
                    target="_blank"
                    rel="noreferrer noopener"
                    dir="ltr"
                    className="inline-flex max-w-full items-center gap-1 truncate text-[11px] font-bold text-primary hover:underline"
                  >
                    <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{p.externalLink}</span>
                  </a>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {p.status === "PENDING" || p.status === "CONFIRMED" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-400/30 text-rose-300 hover:bg-rose-400/10"
                      onClick={() => void cancelPayment(p.id)}
                    >
                      {t.paymentCancel}
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir={dir} className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.paymentCreate}</DialogTitle>
            <DialogDescription className="text-[11px] leading-5">{t.paymentLinkNote}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-foreground">{t.paymentStudentLabel}</Label>
              <Select value={payStudent} onValueChange={setPayStudent}>
                <SelectTrigger className="w-full text-xs" aria-label={t.paymentStudentLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(students ?? []).map((s) => (
                    <SelectItem key={s.connectionId} value={s.student.userId} className="text-xs">
                      {s.student.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">{t.paymentServiceLabel}</Label>
                <Select value={payService} onValueChange={setPayService}>
                  <SelectTrigger className="w-full text-xs" aria-label={t.paymentServiceLabel}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE" className="text-xs">{shared.cooperationTypeLabel("PRIVATE")}</SelectItem>
                    <SelectItem value="SEMI_PRIVATE" className="text-xs">{shared.cooperationTypeLabel("SEMI_PRIVATE")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">{t.paymentAmountLabel}</Label>
                <div className="flex gap-1.5">
                  <Input
                    type="number"
                    min={1}
                    dir="ltr"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="h-9 flex-1 text-xs"
                  />
                  <Select value={payCurrency} onValueChange={setPayCurrency}>
                    <SelectTrigger className="w-24 text-xs" aria-label={t.tariffIrr}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IRR" className="text-xs">{t.tariffIrr}</SelectItem>
                      <SelectItem value="USD" className="text-xs">{t.tariffUsd}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-desc" className="text-[11px] font-bold text-foreground">{t.paymentDescriptionLabel}</Label>
              <Textarea
                id="pay-desc"
                dir={locale === "fa" ? "rtl" : "ltr"}
                value={payDesc}
                onChange={(e) => setPayDesc(e.target.value.slice(0, 500))}
                rows={2}
                maxLength={500}
                className="resize-none text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pay-link" className="text-[11px] font-bold text-foreground">{t.paymentLinkLabel}</Label>
              <Input
                id="pay-link"
                dir="ltr"
                value={payLink}
                onChange={(e) => setPayLink(e.target.value.slice(0, 1000))}
                placeholder={t.paymentLinkPlaceholder}
                className="text-xs"
              />
            </div>
            <Button className="w-full" onClick={submitPayment} disabled={creating}>
              {creating ? plansT.saving : t.paymentCreate}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
