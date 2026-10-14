"use client";

import { useSyncExternalStore, useState } from "react";
import { Loader2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { faDigits, normalizeDigits } from "@/lib/profile";
import { jalaliFullLabel } from "@/lib/weight";

/** مقدار فقط-کلاینت برای تاریخ شمسی — سازگار با هیدراتیشن */
function subscribeNoop(_onChange: () => void) {
  return () => {};
}

/** تاریخ امروز به فرمت YYYY-MM-DD (مبنای UTC — هماهنگ با اعتبارسنجی سرور) */
function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** برچسب شمسی تاریخ انتخابی — فقط سمت کلاینت محاسبه می‌شود */
function useJalaliLabel(isoDate: string): string {
  const value = useSyncExternalStore(
    subscribeNoop,
    () => {
      try {
        return jalaliFullLabel(`${isoDate}T00:00:00.000Z`);
      } catch {
        return "";
      }
    },
    () => ""
  );
  return value;
}

interface WeightEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (weightKg: string, recordedAt: string) => Promise<{ ok: boolean; message?: string }>;
}

/**
 * دیالوگ ثبت اندازه‌گیری وزن — وزن با پذیرش ارقام فارسی و تاریخ ثبت با
 * نمایش شمسی زنده. تاریخ آینده سمت سرور رد می‌شود و پیام فارسی برمی‌گردد.
 *
 * فرم داخلی فقط هنگام باز بودن دیالوگ mount می‌شود؛ بنابراین در هر باز شدن
 * با وضعیت تمیز و بدون effect اضافه شروع می‌شود.
 */
export function WeightEntryDialog({ open, onOpenChange, onSubmit }: WeightEntryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-sm">
        <WeightEntryForm
          onSubmit={onSubmit}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface WeightEntryFormProps {
  onSubmit: (weightKg: string, recordedAt: string) => Promise<{ ok: boolean; message?: string }>;
  onClose: () => void;
}

/** فرم ثبت — state آن با هر بار mount تازه است */
function WeightEntryForm({ onSubmit, onClose }: WeightEntryFormProps) {
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(todayIsoDate);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const jalaliLabel = useJalaliLabel(date);
  const maxDate = todayIsoDate();

  const handleSubmit = async () => {
    if (submitting) return;
    setFieldError(null);
    const cleaned = normalizeDigits(weight).trim();
    if (cleaned === "") {
      setFieldError("وزن را وارد کنید");
      return;
    }
    const parsed = Number(cleaned.replace(/[٫,]/g, "."));
    if (Number.isNaN(parsed)) {
      setFieldError("وزن باید عدد معتبر باشد");
      return;
    }
    if (parsed < 25 || parsed > 300) {
      setFieldError("وزن باید بین ۲۵ تا ۳۰۰ کیلوگرم باشد");
      return;
    }
    setSubmitting(true);
    const result = await onSubmit(cleaned, date);
    setSubmitting(false);
    if (result.ok) {
      onClose();
    } else {
      setFieldError(result.message ?? "ثبت انجام نشد؛ دوباره تلاش کنید.");
    }
  };

  return (
    <>
      <DialogHeader className="text-start">
        <DialogTitle className="flex items-center gap-2 text-base">
          <Scale className="size-4 text-primary" aria-hidden="true" />
          ثبت اندازه‌گیری وزن
        </DialogTitle>
        <DialogDescription>
          وزن امروز یا یک تاریخ گذشته را ثبت کنید؛ روند نمودار فقط با اندازه‌گیری‌های
          تاریخ‌دار شما ساخته می‌شود.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="weight-entry-value">وزن (کیلوگرم)</Label>
          <Input
            id="weight-entry-value"
            inputMode="decimal"
            placeholder="مثلاً ۷۵٫۵"
            value={weight}
            onChange={(event) => {
              setWeight(event.target.value);
              setFieldError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="weight-entry-date">تاریخ ثبت</Label>
          <Input
            id="weight-entry-date"
            dir="ltr"
            type="date"
            value={date}
            max={maxDate}
            min="2024-01-01"
            onChange={(event) => {
              setDate(event.target.value || todayIsoDate());
              setFieldError(null);
            }}
            className="text-left"
          />
          {jalaliLabel && (
            <p className="text-[11px] text-muted-foreground">
              معادل شمسی: {jalaliLabel}
            </p>
          )}
        </div>

        {fieldError && (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium leading-6 text-destructive"
          >
            {fieldError}
          </p>
        )}
      </div>

      <DialogFooter className="flex-row-reverse gap-2">
        <Button
          onClick={() => void handleSubmit()}
          disabled={submitting}
          className="font-bold text-primary-foreground glow-lime-sm"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Scale className="size-4" aria-hidden="true" />
          )}
          {submitting ? "در حال ثبت…" : "ثبت روی سرور"}
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={submitting}
          className="font-semibold"
        >
          انصراف
        </Button>
      </DialogFooter>
      <p className="pb-1 text-center text-[10px] leading-5 text-muted-foreground/70">
        حداکثر {faDigits(500)} اندازه‌گیری برای هر حساب نگهداری می‌شود.
      </p>
    </>
  );
}
