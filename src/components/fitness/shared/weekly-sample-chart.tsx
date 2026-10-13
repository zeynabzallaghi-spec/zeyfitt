"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { WEEKLY_SAMPLE_DATA } from "@/lib/sample-data";

interface TooltipPayloadItem {
  value?: number | string;
}

/** تولتیپ سفارشی هماهنگ با تم — با یادآوری «داده نمونه» */
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const minutes = Number(payload[0]?.value ?? 0);
  return (
    <div
      dir="rtl"
      className="rounded-xl border border-border/60 bg-popover px-3 py-2 text-xs shadow-xl"
    >
      <p className="font-bold text-foreground">{label}</p>
      <p className="mt-0.5 text-muted-foreground">
        فعالیت: {minutes.toLocaleString("fa-IR")} دقیقه
      </p>
      <p className="mt-1 text-[10px] font-bold text-amber-300/90">داده نمونه نمایشی</p>
    </div>
  );
}

/**
 * نمودار پیشرفت هفتگی با داده نمونه — کاملاً مشخص‌دار.
 * پس از ثبت جلسات واقعی (مرحله ۷)، جای این نمودار را داده واقعی کاربر می‌گیرد.
 */
export function WeeklySampleChart() {
  return (
    <div className="h-56 w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={WEEKLY_SAMPLE_DATA} margin={{ top: 10, right: 4, left: 4, bottom: 0 }}>
          <defs>
            <linearGradient id="weeklyLimeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.89 0.22 128)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="oklch(0.89 0.22 128)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(1 0 0 / 0.06)" vertical={false} />
          {/* reversed: روز شنبه در سمت راست (ترتیب طبیعی هفته فارسی) */}
          <XAxis
            dataKey="day"
            reversed
            tick={{ fill: "oklch(0.68 0.012 250)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            orientation="right"
            tickFormatter={(v: number) => v.toLocaleString("fa-IR")}
            tick={{ fill: "oklch(0.68 0.012 250)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "oklch(0.89 0.22 128 / 0.35)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="minutes"
            name="فعالیت"
            stroke="oklch(0.89 0.22 128)"
            strokeWidth={2.5}
            fill="url(#weeklyLimeFill)"
            dot={{ r: 3, fill: "oklch(0.89 0.22 128)", strokeWidth: 0 }}
            activeDot={{ r: 5, fill: "oklch(0.89 0.22 128)", stroke: "oklch(0.135 0.005 250)", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
