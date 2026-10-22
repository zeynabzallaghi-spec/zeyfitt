"use client";

/**
 * نمای «پنل مدیریت» — مرحله ۱۹.۵. فقط برای نقش ADMIN نمایش داده می‌شود
 * (فیلتر منو سمت کلاینت)؛ مجوز واقعی همه APIها سمت سرور با نقش تازه
 * دیتابیس اعمال می‌شود.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck } from "lucide-react";
import { getNavItem } from "@/lib/nav";
import { useStrings } from "@/lib/i18n/use-strings";
import { adminStrings } from "@/lib/i18n/sections/admin";
import { ViewIntro } from "../../shared/view-intro";
import { RealBadge } from "../../shared/badges";
import { OverviewTab, UsersTab } from "./users-tab";
import { ApplicationsTab, PremiumRequestsTab, TicketsTab } from "./requests-tabs";
import { BankMediaTab } from "./bank-media-tab";

export function AdminView() {
  const t = useStrings(adminStrings);
  const item = getNavItem("admin");

  return (
    <div className="flex flex-col gap-4">
      <ViewIntro
        item={item}
        badges={
          <span className="flex items-center gap-1.5">
            <RealBadge />
          </span>
        }
      />

      <Card className="border-primary/25 bg-primary/5">
        <CardContent className="flex items-center gap-3 p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
            <ShieldCheck className="size-4" aria-hidden="true" />
          </span>
          <p className="text-[11px] leading-6 text-muted-foreground">{t.intro}</p>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="gap-5">
        <TabsList className="w-full flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="overview" className="text-[11px]">{t.overviewTab}</TabsTrigger>
          <TabsTrigger value="users" className="text-[11px]">{t.usersTab}</TabsTrigger>
          <TabsTrigger value="applications" className="text-[11px]">{t.coachApplicationsTab}</TabsTrigger>
          <TabsTrigger value="premium" className="text-[11px]">{t.premiumRequestsTab}</TabsTrigger>
          <TabsTrigger value="tickets" className="text-[11px]">{t.ticketsTab}</TabsTrigger>
          <TabsTrigger value="bank-media" className="text-[11px]">{t.bankMediaTab}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <OverviewTab t={t} />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab t={t} />
        </TabsContent>
        <TabsContent value="applications">
          <ApplicationsTab t={t} />
        </TabsContent>
        <TabsContent value="premium">
          <PremiumRequestsTab t={t} />
        </TabsContent>
        <TabsContent value="tickets">
          <TicketsTab t={t} />
        </TabsContent>
        <TabsContent value="bank-media">
          <BankMediaTab t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
