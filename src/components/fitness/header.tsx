"use client";

import { useSyncExternalStore } from "react";
import { Menu, Box, Bot, LogOut, UserRoundCog, Bell, MessageSquare, FileText, CreditCard, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppStore } from "@/store/app-store";
import { useSessionData } from "./session-context";
import { getNavItem } from "@/lib/nav";
import { useStrings } from "@/lib/i18n/use-strings";
import { shellStrings } from "@/lib/i18n/sections/shell";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import { useUiLang, useLocale } from "@/lib/i18n/locale";
import { localeTodayFull, localeDateTimeLabel } from "@/lib/i18n/format";
import { UiLangSwitch } from "./ui-lang-switch";
import { useNotifications } from "@/hooks/use-p196";

/** مقدار فقط-کلاینت: سمت سرور null برمی‌گردد تا هیدراتیشن همیشه سازگار بماند */
function subscribeToMinuteTick(onChange: () => void) {
  const id = setInterval(onChange, 60_000);
  return () => clearInterval(id);
}

/** تاریخ امروز — شمسی برای فارسی و گرگوری برای انگلیسی، بدون ناسازگاری هیدراتیشن */
function TodayDate() {
  const locale = useUiLang().locale;
  const today = useSyncExternalStore(
    subscribeToMinuteTick,
    () => localeTodayFull(locale),
    () => null
  );

  return (
    <span
      suppressHydrationWarning
      className="hidden text-xs font-medium text-muted-foreground md:block"
      aria-live="polite"
    >
      {today ?? ""}
    </span>
  );
}

/** دکمه میان‌بر به یک بخش — دسترسی کاربردی در سربرگ */
function HeaderQuickButton({
  viewId,
  label,
  icon: Icon,
}: {
  viewId: ReturnType<typeof getNavItem>["id"];
  label: string;
  icon: typeof Box;
}) {
  const setActiveView = useAppStore((s) => s.setActiveView);
  const activeView = useAppStore((s) => s.activeView);
  const active = activeView === viewId;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setActiveView(viewId)}
      aria-label={label}
      title={label}
      className={
        active
          ? "border border-primary/30 bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      }
    >
      <Icon className="size-4.5" strokeWidth={2} />
    </Button>
  );
}

/**
 * زنگ اعلان‌ها — مرکز اعلان‌های مرحله ۱۹.۶ برای همه نقش‌ها.
 * polling کنترل‌شده ۲۰ ثانیه‌ای فقط در تب فعال (همان الگوی چت)؛ بازکردن
 * اعلان آن را واقعاً خوانده‌شده میکند و در صورت امکان ناوبری میکند.
 */
function NotificationBell() {
  const { user } = useSessionData();
  const t = useStrings(phase196Strings);
  const shell = useStrings(shellStrings);
  const locale = useLocale();
  const dir = useUiLang().dir;
  const { items, unread, markRead, markAllRead } = useNotifications(Boolean(user));
  const setActiveView = useAppStore((s) => s.setActiveView);
  if (!user) return null;

  const labelOf = (type: string, payload: Record<string, string | number | boolean | null>): string => {
    switch (type) {
      case "MESSAGE_NEW": return t.notifMessageNew;
      case "CONNECTION_REQUEST": return t.notifConnectionRequest;
      case "CONNECTION_DECIDED":
        return payload.status === "ACTIVE" ? t.notifConnectionApproved : t.notifConnectionRejected;
      case "CONNECTION_CANCELLED": return t.notifConnectionCancelled;
      case "COACH_APPLICATION_DECIDED":
        return payload.status === "approved" ? t.notifCoachApplicationApproved : t.notifCoachApplicationRejected;
      case "PREMIUM_STATUS":
        return payload.status === "approved" ? t.notifPremiumApproved : t.notifPremiumRejected;
      case "SUPPORT_REPLY": return t.notifSupportReply;
      case "SUPPORT_TICKET_NEW": return t.notifSupportTicketNew;
      case "PLAN_DELIVERED":
        return payload.planKind === "nutrition" ? t.notifPlanDeliveredNutrition : t.notifPlanDelivered;
      case "PAYMENT_REQUEST": return t.notifPaymentRequest;
      case "PAYMENT_STATUS": {
        if (payload.status === "CONFIRMED") return t.notifPaymentConfirmed;
        if (payload.status === "DECLINED") return t.notifPaymentDeclined;
        return t.notifPaymentCancelled;
      }
      default: return t.notifUnknownType;
    }
  };

  const navigateOf = (type: string): ReturnType<typeof getNavItem>["id"] => {
    switch (type) {
      case "MESSAGE_NEW":
      case "CONNECTION_REQUEST":
      case "CONNECTION_DECIDED":
      case "CONNECTION_CANCELLED":
      case "PAYMENT_REQUEST":
      case "PAYMENT_STATUS":
        return "coaches";
      case "COACH_APPLICATION_DECIDED":
      case "PLAN_DELIVERED":
        return "coachPlans";
      case "PREMIUM_STATUS":
      case "SUPPORT_REPLY":
      case "SUPPORT_TICKET_NEW":
        return "profile";
      default:
        return "dashboard";
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${t.notificationsTitle}${unread > 0 ? ` (${t.unreadCountLabel(unread)})` : ""}`}
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          <Bell className="size-4.5" strokeWidth={2} aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-extrabold leading-4 text-primary-foreground">
              {unread > 9 ? "+۹" : String(unread).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" dir={dir} className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border/60 p-3">
          <p className="text-xs font-bold text-foreground">{t.notificationsTitle}</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[10px]" onClick={() => void markAllRead()}>
              <CheckCheck className="size-3.5" aria-hidden="true" />
              {t.markAllRead}
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto p-2" role="list">
          {!items || items.length === 0 ? (
            <p className="p-4 text-center text-[11px] leading-6 text-muted-foreground">{t.notificationsEmpty}</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                role="listitem"
                onClick={() => {
                  void markRead(n.id);
                  setActiveView(navigateOf(n.type));
                }}
                className={`flex w-full items-start gap-2.5 rounded-xl p-2.5 text-start transition-colors hover:bg-secondary/50 ${
                  n.readAt === null ? "bg-primary/5" : ""
                }`}
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground">
                  {n.type === "MESSAGE_NEW" ? (
                    <MessageSquare className="size-3.5" aria-hidden="true" />
                  ) : n.type.startsWith("PAYMENT") ? (
                    <CreditCard className="size-3.5" aria-hidden="true" />
                  ) : (
                    <FileText className="size-3.5" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className={`truncate text-[11px] ${n.readAt === null ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {labelOf(n.type, n.payload)}
                    </span>
                    {n.readAt === null && <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground/70">
                    {localeDateTimeLabel(n.createdAt, locale)}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** چیپ کاربر واردشده — نام + منوی پروفایل و خروج */
function UserChip() {
  const { user, signOut } = useSessionData();
  const setActiveView = useAppStore((s) => s.setActiveView);
  const t = useStrings(shellStrings);
  const dir = useUiLang().dir;

  if (!user) return null;
  const initial = user.name.trim().charAt(0) || "؟";

  return (
    <DropdownMenu dir={dir}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t.accountMenuAria}
          className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 py-1 ps-1 pe-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/60 hover:border-primary/40"
        >
          <span
            aria-hidden="true"
            className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[oklch(0.78_0.2_145)] text-[11px] font-extrabold text-primary-foreground"
          >
            {initial}
          </span>
          <span className="hidden max-w-28 truncate text-xs font-bold text-foreground sm:block">
            {user.name}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="truncate font-bold">{user.name}</span>
          <span dir="ltr" className="truncate text-[10px] font-normal text-muted-foreground">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setActiveView("profile")}>
          <UserRoundCog className="size-4" aria-hidden="true" />
          {t.profileAndSettings}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden="true" />
          {t.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader() {
  const setMobileNavOpen = useAppStore((s) => s.setMobileNavOpen);
  const activeView = useAppStore((s) => s.activeView);
  const t = useStrings(shellStrings);
  const { locale } = useUiLang();
  const item = getNavItem(activeView);
  const Icon = item.icon;

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl md:px-8">
      {/* دکمه منو — فقط موبایل و تبلت */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 lg:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label={t.openNavMenu}
      >
        <Menu className="size-5" />
      </Button>

      {/* آیکون و عنوان بخش فعال — عنوان به زبان رابط */}
      <div className="flex min-w-0 items-center gap-3">
        <span className="hidden size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary sm:flex">
          <Icon className="size-4" strokeWidth={2.1} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate text-base font-bold leading-6 md:text-lg">
            {locale === "fa" ? item.fa : item.en}
          </h1>
          <span
            dir={locale === "fa" ? "ltr" : "rtl"}
            className="hidden truncate text-[10px] font-medium text-muted-foreground sm:block"
          >
            {locale === "fa" ? item.en : item.fa}
          </span>
        </div>
      </div>

      <div className="ms-auto flex items-center gap-1.5 md:gap-2">
        <TodayDate />
        <span className="mx-1 hidden h-5 w-px bg-border/60 md:block" aria-hidden="true" />
        <HeaderQuickButton
          viewId="coach3d"
          label={locale === "fa" ? getNavItem("coach3d").fa : getNavItem("coach3d").en}
          icon={Box}
        />
        <HeaderQuickButton
          viewId="assistant"
          label={locale === "fa" ? getNavItem("assistant").fa : getNavItem("assistant").en}
          icon={Bot}
        />
        <span className="mx-1 hidden h-5 w-px bg-border/60 md:block" aria-hidden="true" />
        <NotificationBell />
        <UiLangSwitch />
        <span className="mx-1 hidden h-5 w-px bg-border/60 md:block" aria-hidden="true" />
        <UserChip />
      </div>
    </header>
  );
}
