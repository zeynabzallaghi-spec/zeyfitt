"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toWeightChartData } from "@/lib/weight";
import type { WeightEntryClient } from "@/lib/weight";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { useStrings } from "@/lib/i18n/use-strings";
import { localeNumber, localeFullLabel } from "@/lib/i18n/format";
import { weightStrings } from "@/lib/i18n/sections/weight";
import type { Locale, Dir } from "@/lib/i18n/shared";

interface TooltipPayloadItem {
  value?: number | string;
  payload?: { date: string; weight: number };
}

/**
 * تولتیپ سفارشی — تاریخ کامل متناسب با زبان رابط و مقدار واقعی ثبت‌شده کاربر.
 * برخلاف نمودار نمونه قبلی، هیچ برچسب داده نمونه‌ای ندارد چون داده واقعی است.
 */
function ChartTooltip({
  active,
  payload,
  locale,
  dir,
  weightText,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  locale: Locale;
  dir: Dir;
  weightText: (weight: string) => string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div
      dir={dir}
      className="rounded-xl border border-border/60 bg-popover px-3 py-2 text-xs shadow-xl"
    >
      <p className="font-bold text-foreground">{localeFullLabel(point.date, locale)}</p>
      <p className="mt-0.5 text-muted-foreground">
        {weightText(localeNumber(point.weight, locale))}
      </p>
    </div>
  );
}

/**
 * نمودار روند وزن — فقط با اندازه‌گیری‌های واقعی و تاریخ‌دار کاربر رسم
 * می‌شود. جهت محور هماهنگ با زبان رابط است: در فارسی/RTL قدیمی‌ترین نقطه
 * سمت راست و محور عمودی سمت راست (قرارداد فعلی)، در انگلیسی/LTR آینه می‌شود.
 */
export function WeightTrendChart({ entries }: { entries: WeightEntryClient[] }) {
  const t = useStrings(weightStrings);
  const locale = useLocale();
  const dir = useDir();
  const data = toWeightChartData(entries, 12, locale);
  const weights = data.map((point) => point.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const padding = Math.max((max - min) * 0.4, 1);

  return (
    <div className="h-56 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="weightDotFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.89 0.22 128)" stopOpacity={1} />
              <stop offset="100%" stopColor="oklch(0.78 0.2 145)" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
          {/* reversed در RTL: قدیمی‌ترین تاریخ سمت راست — قرارداد خوانش راست‌به‌چپ */}
          <XAxis
            dataKey="label"
            reversed={dir === "rtl"}
            tick={{ fill: "oklch(0.68 0.012 250)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            orientation={dir === "rtl" ? "right" : "left"}
            domain={[min - padding, max + padding]}
            tickFormatter={(v: number) => localeNumber(v, locale)}
            tick={{ fill: "oklch(0.68 0.012 250)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip
            content={
              <ChartTooltip
                locale={locale}
                dir={dir}
                weightText={t.chartTooltipWeight}
              />
            }
            cursor={{ stroke: "oklch(0.89 0.22 128 / 0.35)", strokeWidth: 1 }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            name={t.chartSeriesName}
            stroke="oklch(0.89 0.22 128)"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "url(#weightDotFill)", strokeWidth: 0 }}
            activeDot={{
              r: 6,
              fill: "oklch(0.89 0.22 128)",
              stroke: "oklch(0.135 0.005 250)",
              strokeWidth: 2,
            }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
