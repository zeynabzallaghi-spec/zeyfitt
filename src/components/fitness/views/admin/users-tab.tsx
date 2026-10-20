"use client";

/**
 * تب‌های «نمای کلی» و «کاربران» پنل مدیریت — مرحله ۱۹.۵.
 * همه داده‌ها از APIهای ادمین (نقش تازه از دیتابیس) می‌آیند.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Users, Search, UserRound, Crown } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { useLocale } from "@/lib/i18n/locale";
import { adminStrings } from "@/lib/i18n/sections/admin";
import { localeDayLabel, localeNumber } from "@/lib/i18n/format";
import { EmptyState } from "../../shared/empty-state";
import {
  useAdminOverview,
  useAdminUsers,
  useAdminActions,
  type AdminUserRowClient,
} from "@/hooks/use-admin";

type AdminT = ReturnType<typeof adminStrings>;

/* ------------------------------ تب نمای کلی ------------------------------ */

function OverviewTab({ t }: { t: AdminT }) {
  const locale = useLocale();
  const { data, loading, error, refresh } = useAdminOverview(true);
  const o = data?.overview;

  const cells: { label: string; value: number | undefined }[] = [
    { label: t.countUsers, value: o?.users },
    { label: t.countStudents, value: o?.students },
    { label: t.countCoaches, value: o?.coaches },
    { label: t.countAdmins, value: o?.admins },
    { label: t.countPremiumActive, value: o?.premiumActive },
    { label: t.countPendingCoachApplications, value: o?.pendingCoachApplications },
    { label: t.countPendingPremiumRequests, value: o?.pendingPremiumRequests },
    { label: t.countOpenTickets, value: o?.openTickets },
    { label: t.countExercises, value: o?.exercises },
  ];

  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center">
        <p className="text-xs font-bold leading-6 text-rose-200">{error}</p>
        <Button variant="outline" onClick={() => void refresh()} className="mt-3 font-semibold">
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {t.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-6 text-muted-foreground">{t.overviewIntro}</p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {cells.map((c) => (
          <Card key={c.label} className="border-border/60 bg-secondary/20">
            <CardContent className="flex flex-col gap-1 p-4">
              <span className="text-lg font-bold text-primary">
                {c.value === undefined ? "—" : localeNumber(c.value, locale)}
              </span>
              <span className="text-[10px] font-medium leading-4 text-muted-foreground">{c.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ تب کاربران ------------------------------ */

function RoleBadge({ role, t }: { role: string; t: AdminT }) {
  const label = role === "ADMIN" ? t.roleAdmin : role === "COACH" ? t.roleCoach : t.roleStudent;
  const tone =
    role === "ADMIN"
      ? "border-primary/40 bg-primary/10 text-primary"
      : role === "COACH"
        ? "border-sky-400/30 bg-sky-400/10 text-sky-300"
        : "border-border/60 bg-secondary/40 text-muted-foreground";
  return <Badge variant="outline" className={`text-[10px] font-bold ${tone}`}>{label}</Badge>;
}

function SubscriptionBadge({ row, t }: { row: AdminUserRowClient; t: AdminT }) {
  if (row.tier !== "PREMIUM") {
    return <span className="text-[10px] text-muted-foreground">{t.subscriptionFree}</span>;
  }
  return (
    <span className="flex flex-col gap-0.5">
      <Badge variant="outline" className="w-fit border-primary/40 bg-primary/10 text-[10px] font-bold text-primary">
        {row.premiumExpired ? t.subscriptionPremiumExpired : t.subscriptionPremium}
      </Badge>
      {row.expiresAt && (
        <span className="text-[10px] text-muted-foreground/80">
          {t.expiresOn(localeDayLabel(row.expiresAt, "fa"))}
        </span>
      )}
    </span>
  );
}

function UsersTab({ t }: { t: AdminT }) {
  const locale = useLocale();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const { data, loading, error, refresh } = useAdminUsers(q, role, true);
  const { busyId, setRole: setRoleApi, setSubscription } = useAdminActions();
  const { toast } = useToast();

  const [roleTarget, setRoleTarget] = useState<AdminUserRowClient | null>(null);
  const [roleChoice, setRoleChoice] = useState("STUDENT");
  const [subTarget, setSubTarget] = useState<AdminUserRowClient | null>(null);
  const [subDays, setSubDays] = useState("30");
  const [subNoExpiry, setSubNoExpiry] = useState(false);
  const [subNote, setSubNote] = useState("");

  const rows = data?.rows ?? [];

  async function doRoleChange() {
    if (!roleTarget) return;
    const result = await setRoleApi(roleTarget.id, roleChoice);
    if (result.ok) {
      toast({ description: t.successGeneric });
      setRoleTarget(null);
      void refresh();
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  async function doSubscription(grant: boolean) {
    if (!subTarget) return;
    let days: number | null = null;
    if (grant) {
      if (subNoExpiry) {
        days = null;
      } else {
        const parsed = Number.parseInt(subDays, 10);
        if (!Number.isInteger(parsed) || parsed < 1) {
          toast({ description: t.daysPlaceholder, variant: "destructive" });
          return;
        }
        days = parsed;
      }
    }
    const result = await setSubscription(
      subTarget.id,
      grant ? "PREMIUM" : "FREE",
      grant ? days : null,
      subNote
    );
    if (result.ok) {
      toast({ description: t.successGeneric });
      setSubTarget(null);
      setSubNote("");
      void refresh();
    } else {
      toast({ description: result.message, variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] leading-6 text-muted-foreground">{t.usersIntro}</p>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground start-3" aria-hidden="true" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="ps-9 text-xs"
            aria-label={t.searchPlaceholder}
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label={t.colRole}
          className="h-9 rounded-md border border-border/60 bg-background px-2 text-xs font-medium"
        >
          <option value="">{t.roleFilterAll}</option>
          <option value="STUDENT">{t.roleFilterStudent}</option>
          <option value="COACH">{t.roleFilterCoach}</option>
          <option value="ADMIN">{t.roleFilterAdmin}</option>
        </select>
        <Button variant="outline" size="icon" onClick={() => void refresh()} aria-label={t.retry} className="size-9 shrink-0">
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />
      ) : error ? (
        <p className="text-xs font-bold leading-6 text-rose-300">{error}</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title={t.emptyUsersTitle} description={t.emptyUsersNote} compact />
      ) : (
        <>
          <p className="text-[10px] font-bold text-muted-foreground">{t.usersCount(rows.length)}</p>
          <div className="flex flex-col gap-2">
            {rows.map((row) => (
              <Card key={row.id} className="border-border/60 bg-secondary/20">
                <CardContent className="flex flex-col gap-2.5 p-3.5 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-xs font-bold">
                      {row.name}
                      <span dir="ltr" className="truncate text-[10px] font-medium text-muted-foreground">{row.email}</span>
                      {row.role === "ADMIN" && <span className="text-[9px] font-bold text-primary">{t.adminBadge}</span>}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {t.colJoined}: {localeDayLabel(row.createdAt, locale)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={row.role} t={t} />
                    <SubscriptionBadge row={row} t={t} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] font-bold"
                      disabled={busyId === row.id}
                      onClick={() => {
                        setRoleTarget(row);
                        setRoleChoice(row.role);
                      }}
                    >
                      <UserRound className="size-3" aria-hidden="true" />
                      {t.changeRole}
                    </Button>
                    {row.role === "STUDENT" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px] font-bold"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setSubTarget(row);
                          setSubDays("30");
                          setSubNoExpiry(false);
                          setSubNote("");
                        }}
                      >
                        <Crown className="size-3" aria-hidden="true" />
                        {t.grantSubscription}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* دیالوگ تغییر نقش */}
      <Dialog open={roleTarget != null} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.changeRoleTitle(roleTarget?.name ?? "")}</DialogTitle>
            <DialogDescription className="text-[11px] leading-6">{t.changeRoleNote}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {["STUDENT", "COACH", "ADMIN"].map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs font-bold has-[[data-state=checked]]:border-primary/50">
                <input
                  type="radio"
                  name="admin-role-choice"
                  checked={roleChoice === r}
                  onChange={() => setRoleChoice(r)}
                  className="accent-[hsl(var(--primary))]"
                />
                {r === "ADMIN" ? t.roleAdmin : r === "COACH" ? t.roleCoach : t.roleStudent}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setRoleTarget(null)}>{t.cancel}</Button>
            <Button size="sm" onClick={() => void doRoleChange()}>{t.submit}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* دیالوگ اشتراک */}
      <Dialog open={subTarget != null} onOpenChange={(open) => !open && setSubTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{t.grantTitle(subTarget?.name ?? "")}</DialogTitle>
            <DialogDescription className="text-[11px] leading-6">{t.grantNoteIntro}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="admin-sub-days" className="w-24 text-[11px] font-bold">{t.daysLabel}</Label>
              <Input
                id="admin-sub-days"
                value={subDays}
                onChange={(e) => setSubDays(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={t.daysPlaceholder}
                disabled={subNoExpiry}
                inputMode="numeric"
                dir="ltr"
                className="h-9 text-xs"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-[11px] font-bold">
              <Checkbox checked={subNoExpiry} onCheckedChange={(v) => setSubNoExpiry(v === true)} />
              {t.daysNoExpiry}
            </label>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-sub-note" className="text-[11px] font-bold">{t.noteLabel}</Label>
              <Textarea
                id="admin-sub-note"
                value={subNote}
                onChange={(e) => setSubNote(e.target.value)}
                placeholder={t.notePlaceholder}
                rows={2}
                className="text-xs"
                maxLength={200}
              />
            </div>
          </div>
          <div className="flex justify-between gap-2">
            <Button variant="outline" size="sm" className="border-rose-400/40 text-rose-300 hover:text-rose-200" onClick={() => void doSubscription(false)}>
              {t.confirmRevoke}
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSubTarget(null)}>{t.cancel}</Button>
              <Button size="sm" onClick={() => void doSubscription(true)}>{t.confirmGrant}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { OverviewTab, UsersTab, RoleBadge, SubscriptionBadge };
export type { AdminT };
