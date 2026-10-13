"use client";

import { motion } from "framer-motion";
import { ChevronRight, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { NavItem } from "@/lib/nav";
import { useAppStore } from "@/store/app-store";

/**
 * نمای بخش‌هایی که هنوز به مرحله پیاده‌سازی آن‌ها نرسیده‌ایم.
 * به‌جای داده ساختگی، وضعیت واقعی و برنامه ساخت هر بخش را شفاف نشان می‌دهد.
 */
export function ComingSoonView({ item }: { item: NavItem }) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto flex max-w-2xl flex-col items-center py-8 text-center"
    >
      {/* نشان بصری بخش */}
      <div className="relative flex size-28 items-center justify-center">
        <div className="absolute inset-0 rounded-3xl border border-dashed border-primary/20" aria-hidden="true" />
        <div className="absolute inset-2 rounded-2xl border border-border/60 bg-card" aria-hidden="true" />
        <Icon className="relative size-10 text-primary/80" strokeWidth={1.6} aria-hidden="true" />
      </div>

      <h2 className="mt-6 text-2xl font-extrabold">{item.fa}</h2>
      <p dir="ltr" className="mt-1 text-xs font-medium text-muted-foreground">
        {item.en}
      </p>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary">
        <Hammer className="size-3.5" aria-hidden="true" />
        در مرحله {item.stage.toLocaleString("fa-IR")} توسعه پیاده‌سازی می‌شود
      </div>

      <p className="mt-5 text-sm leading-7 text-muted-foreground">{item.description}</p>

      {/* چه چیزی در این بخش ساخته می‌شود؟ */}
      <div className="mt-8 w-full rounded-2xl border border-border/60 bg-card p-6 text-start">
        <h3 className="text-sm font-bold">در این بخش چه چیزی ساخته می‌شود؟</h3>
        <ul className="mt-4 flex flex-col gap-3">
          {item.features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground">
              <span
                className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-5 border-t border-border/50 pt-4 text-[11px] leading-relaxed text-muted-foreground/80">
          طبق اصل شفافیت این محصول، تا زمان پیاده‌سازی این بخش هیچ داده ساختگی یا نمونه نمایشی
          نشان داده نمی‌شود. پس از تأیید مرحله جاری توسط شما، مراحل بعدی به‌ترتیب ساخته خواهند شد.
        </p>
      </div>

      <Button
        variant="outline"
        onClick={() => setActiveView("dashboard")}
        className="mt-8 border-border/70 font-semibold hover:border-primary/40 hover:text-primary"
      >
        <ChevronRight className="size-4" aria-hidden="true" />
        بازگشت به داشبورد
      </Button>
    </motion.div>
  );
}
