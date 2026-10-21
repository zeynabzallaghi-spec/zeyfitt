"use client";

/**
 * نمای «پنل مربی» — فقط برای کاربران با نقش COACH (نمایش سمت کلاینت
 * نقش‌محور؛ مجوز واقعی هر عملیات سمت سرور از دیتابیس بازبینی می‌شود).
 *
 * بخش‌ها: وضعیت حساب (تأیید/انتشار)، ویرایش پروفایل حرفه‌ای، درخواست‌های
 * دریافتی (پذیرش/رد با دلیل) و دانشجویان فعال. قابلیت‌های آینده
 * (چت/برنامه اختصاصی) فقط با یادداشت شفاف معرفی می‌شوند — هیچ شبیه‌سازی.
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardList,
  BadgeCheck,
  ShieldAlert,
  RefreshCw,
  Users,
  Globe,
  GlobeLock,
  Plus,
  Trash2,
  Check,
  X,
  Info,
} from "lucide-react";
import { getNavItem } from "@/lib/nav";
import { useStrings } from "@/lib/i18n/use-strings";
import { coachPanelStrings } from "@/lib/i18n/sections/coach-panel";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { coachChatStrings } from "@/lib/i18n/sections/coach-chat";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { useLocale } from "@/lib/i18n/locale";
import { localeDateTimeLabel } from "@/lib/i18n/format";
import { useSessionData } from "../session-context";
import { ViewIntro } from "../shared/view-intro";
import { EmptyState } from "../shared/empty-state";
import {
  useCoachProfile,
  useCoachRequests,
  useCoachStudents,
  acceptCoachRequest,
  rejectCoachRequest,
  saveCoachProfile,
  setCoachPublished,
} from "@/hooks/use-coaching";
import { CoachWorkoutPlansTab } from "./coach/workout-plans-tab";
import { CoachNutritionPlansTab } from "./coach/nutrition-plans-tab";
import { CoachMessagesTab } from "./coach/messages-tab";
import { CoachTariffPaymentsTab } from "./coach/tariff-payments-tab";
import { CoachExercisesTab } from "./coach/exercises-tab";
import { StudentDetailDialog } from "./coach/student-detail-dialog";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import { setChatBlock } from "@/hooks/use-p196";
import { Users as UsersIcon, Wallet, Dumbbell, MessagesSquare } from "lucide-react";
import { COACH_SPECIALIZATIONS } from "@/lib/coaching/constants";
import type { CoachRequestItemClient } from "@/lib/coaching/client";

/* --------------------------- کارت درخواست --------------------------- */

function RequestCard({
  request,
  onDone,
  onOpenChat,
}: {
  request: CoachRequestItemClient;
  onDone: () => void;
  /** گفت‌وگوی اولیه با متقاضی — پیش از تأیید یا رد (مرحله ۱۹.۶) */
  onOpenChat: (connectionId: string) => void;
}) {
  const t = useStrings(coachPanelStrings);
  const shared = useStrings(sharedStrings);
  const p196r = useStrings(phase196Strings);
  const locale = useLocale();
  const { toast } = useToast();
  const [busy, setBusy] = useState<null | "accept" | "reject">(null);
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const accept = async () => {
    setBusy("accept");
    const result = await acceptCoachRequest(request.id);
    setBusy(null);
    if (result.ok) {
      // وضعیت واقعی از پاسخ سرور — UI با onDone از سرور تازه می‌شود
      toast({ title: t.statusActive });
      onDone();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
      onDone();
    }
  };

  const reject = async () => {
    setBusy("reject");
    const result = await rejectCoachRequest(request.id, reason.trim() || null);
    setBusy(null);
    if (result.ok) {
      toast({ title: t.statusRejected });
      onDone();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
      onDone();
    }
  };

  return (
    <div className="rounded-xl border border-amber-400/25 bg-card/70 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">
            <span className="text-muted-foreground">{t.studentNameLabel}: </span>
            {request.student.displayName}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {shared.cooperationTypeLabel(request.cooperationType)}
            {" · "}
            {t.requestedAtLabel}: {localeDateTimeLabel(request.requestedAt, locale)}
          </p>
        </div>
      </div>

      {request.message && (
        <p className="mt-2 rounded-lg border border-border/50 bg-secondary/30 p-2 text-xs leading-6 text-muted-foreground">
          {t.requestMessageLabel}: {request.message}
        </p>
      )}

      {showReject && (
        <div className="mt-3 space-y-1.5">
          <Label htmlFor={`reason-${request.id}`} className="text-[11px] font-bold text-foreground">
            {t.rejectReasonLabel}
            <span className="ms-1 font-normal text-muted-foreground">{t.rejectOptional}</span>
          </Label>
          <Textarea
            id={`reason-${request.id}`}
            dir={locale === "fa" ? "rtl" : "ltr"}
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 200))}
            placeholder={t.rejectReasonPlaceholder}
            rows={2}
            maxLength={200}
            className="resize-none text-xs"
          />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          className="border-primary/40 text-primary hover:bg-primary/10"
          onClick={() => onOpenChat(request.id)}
        >
          <MessagesSquare className="me-1 size-3.5" aria-hidden="true" />
          {p196r.chatPreApprovalButton}
        </Button>
        <Button size="sm" onClick={accept} disabled={busy !== null}>
          {busy === "accept" ? t.accepting : (
            <>
              <Check className="me-1 size-3.5" aria-hidden="true" />
              {t.acceptRequest}
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="border-rose-400/30 text-rose-300 hover:bg-rose-400/10"
          onClick={() => (showReject ? reject() : setShowReject(true))}
          disabled={busy !== null}
        >
          {busy === "reject" ? t.rejecting : (
            <>
              <X className="me-1 size-3.5" aria-hidden="true" />
              {t.rejectRequest}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* --------------------------- نمای اصلی --------------------------- */

export function CoachPanelView() {
  const item = getNavItem("coachPanel");
  const t = useStrings(coachPanelStrings);
  const shared = useStrings(sharedStrings);
  const locale = useLocale();
  const { user } = useSessionData();
  const { toast } = useToast();
  const isCoach = user?.role === "COACH";

  const { profile, loading, error, refresh, setProfile } = useCoachProfile(isCoach);
  const { requests, loading: reqLoading, refresh: refreshReq } = useCoachRequests(isCoach);
  const { students, loading: stuLoading, refresh: refreshStu } = useCoachStudents(isCoach);
  const plansT = useStrings(coachPlansStrings);
  const chatT = useStrings(coachChatStrings);
  const p196 = useStrings(phase196Strings);

  // فیلتر و جست‌وجوی دانشجویان + دیالوگ اطلاعات تکمیلی — مرحله ۱۹.۶
  const [studentFilter, setStudentFilter] = useState<"all" | "PRIVATE" | "SEMI_PRIVATE">("all");
  const [studentQuery, setStudentQuery] = useState("");
  const [detailStudentId, setDetailStudentId] = useState<string | null>(null);
  /** گفت‌وگوی مستقیم از درخواست/دانشجو — کلید تب پیام‌ها را عوض میکند */
  const [chatJump, setChatJump] = useState<{ id: string; n: number } | null>(null);
  // تب فعال کنترل‌شده — پرش از درخواست/دانشجو به گفت‌وگو ممکن میشود (رفع باگ دکمه گفت‌وگو)
  const [activeTab, setActiveTab] = useState("profile");
  const openChatWithConnection = (connectionId: string) => {
    setChatJump({ id: connectionId, n: Date.now() });
    setActiveTab("messages");
  };

  // فرم پروفایل — همیشه مقدار واقعی سرور؛ بدون پیش‌فرض ساختگی
  const [displayName, setDisplayName] = useState("");
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState("");
  const [cooperationTypes, setCooperationTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  /** شناسه پروفایلی که فرم از آن پر شده — الگوی همگام‌سازی در رندر */
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);

  // الگوی رسمی React برای «تنظیم state هنگام تغییر props» — بدون effect
  if (profile && loadedFrom !== profile.userId) {
    setLoadedFrom(profile.userId);
    setDisplayName(profile.displayName);
    setHeadline(profile.headline ?? "");
    setBio(profile.bio ?? "");
    setSpecializations(profile.specializations);
    setCertifications(profile.certifications);
    setExperienceYears(
      profile.experienceYears !== null ? String(profile.experienceYears) : ""
    );
    setCooperationTypes(profile.cooperationTypes);
  }

  if (!isCoach) {
    // دفاعی — این نما از ناوبری برای غیرمربی نشان داده نمی‌شود
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t.title}
        description={t.statusIntro}
      />
    );
  }

  const refreshAll = () => {
    void refreshReq();
    void refreshStu();
    void refresh();
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    const years = experienceYears.trim();
    const result = await saveCoachProfile({
      displayName: displayName.trim(),
      headline: headline.trim(),
      bio: bio.trim(),
      specializations,
      certifications: certifications.filter((c) => c.trim().length > 0),
      experienceYears: years.length > 0 ? Number(years) : null,
      cooperationTypes: cooperationTypes.length > 0 ? cooperationTypes : [],
    });
    setSaving(false);
    if (result.ok) {
      setProfile(result.data);
      toast({ title: t.profileSavedTitle, description: t.profileSavedNote });
      refreshAll();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  const togglePublish = async (next: boolean) => {
    if (publishing) return;
    setPublishing(true);
    const result = await setCoachPublished(next);
    setPublishing(false);
    if (result.ok) {
      refreshAll();
    } else {
      toast({ title: t.loadError, description: result.message, variant: "destructive" });
    }
  };

  const toggleSpecialization = (code: string) => {
    setSpecializations((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code]
    );
  };

  const toggleCooperation = (code: string) => {
    setCooperationTypes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const canPublish = profile?.canPublish ?? false;
  const filteredStudents = (students ?? []).filter((s) => {
    if (studentFilter !== "all" && s.cooperationType !== studentFilter) return false;
    const q = studentQuery.trim();
    if (q.length === 0) return true;
    return s.student.displayName.includes(q);
  });

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-5">
        <TabsList className="w-full flex-wrap justify-start gap-1 overflow-x-auto">
          <TabsTrigger value="profile" className="text-[11px]">{plansT.existingTab}</TabsTrigger>
          <TabsTrigger value="workoutPlans" className="text-[11px]">{plansT.workoutPlansTab}</TabsTrigger>
          <TabsTrigger value="nutritionPlans" className="text-[11px]">{plansT.nutritionPlansTab}</TabsTrigger>
          <TabsTrigger value="messages" className="text-[11px]">{chatT.messagesTab}</TabsTrigger>
          <TabsTrigger value="tariffs" className="text-[11px]">{p196.tariffSectionTitle}</TabsTrigger>
          <TabsTrigger value="exercises" className="text-[11px]">{p196.exercisesSectionTitle}</TabsTrigger>
        </TabsList>

        <TabsContent value="workoutPlans">
          <CoachWorkoutPlansTab />
        </TabsContent>
        <TabsContent value="nutritionPlans">
          <CoachNutritionPlansTab />
        </TabsContent>
        <TabsContent value="messages">
          <CoachMessagesTab
            key={chatJump ? `${chatJump.id}-${chatJump.n}` : undefined}
            initialConnectionId={chatJump?.id ?? null}
          />
        </TabsContent>
        <TabsContent value="tariffs">
          <CoachTariffPaymentsTab />
        </TabsContent>
        <TabsContent value="exercises">
          <CoachExercisesTab />
        </TabsContent>

        <TabsContent value="profile">
      <ViewIntro item={item} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* وضعیت حساب مربی */}
        <Card className="border-border/60 bg-card/70 lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-primary" aria-hidden="true">
                  <BadgeCheck className="size-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">{t.statusTitle}</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{t.statusIntro}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={
                    profile?.verified
                      ? "border-primary/30 bg-primary/10 text-[10px] font-bold text-primary"
                      : "border-amber-400/30 bg-amber-400/10 text-[10px] font-bold text-amber-300"
                  }
                >
                  {profile?.verified ? t.verifiedBadge : t.notVerifiedBadge}
                </Badge>
                <Badge
                  variant="outline"
                  className={
                    profile?.published
                      ? "border-primary/30 bg-primary/10 text-[10px] font-bold text-primary"
                      : "border-border/50 bg-secondary/40 text-[10px] font-bold text-muted-foreground"
                  }
                >
                  {profile?.published ? t.publishedBadge : t.unpublishedBadge}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={refreshAll}
                  aria-label={t.retry}
                >
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>

            <Separator className="my-3 bg-border/60" />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {profile?.published ? (
                  <Globe className="size-4 text-primary" aria-hidden="true" />
                ) : (
                  <GlobeLock className="size-4 text-muted-foreground" aria-hidden="true" />
                )}
                <span className="text-xs font-bold text-foreground">{t.publishToggle}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {profile?.published ? t.publishOff : t.publishOn}
                </span>
                <Switch
                  checked={profile?.published ?? false}
                  onCheckedChange={togglePublish}
                  disabled={publishing || !profile?.verified || !canPublish}
                  aria-label={t.publishToggle}
                  aria-disabled={!canPublish}
                />
              </div>
            </div>

            {!canPublish && (
              <p className="mt-2 text-[11px] leading-5 text-amber-300/90">{t.publishBlocked}</p>
            )}
            <p className="mt-2 text-[10px] leading-5 text-muted-foreground/80">{t.verificationNote}</p>
          </CardContent>
        </Card>

        {/* فرم پروفایل حرفه‌ای */}
        <Card className="border-border/60 bg-card/70">
          <CardContent className="space-y-4 p-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">{t.profileFormTitle}</h2>
              <p className="text-[11px] text-muted-foreground">{t.profileFormIntro}</p>
            </div>

            {loading ? (
              <div className="space-y-3" aria-busy="true" aria-live="polite">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg border border-border/50 bg-secondary/30" />
                ))}
                <span className="sr-only">{t.loading}</span>
              </div>
            ) : error ? (
              <EmptyState
                icon={RefreshCw}
                title={t.loadError}
                description={error}
                action={
                  <Button variant="outline" size="sm" onClick={refresh}>
                    {t.retry}
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cp-name" className="text-[11px] font-bold text-foreground">{t.displayNameLabel}</Label>
                  <Input
                    id="cp-name"
                    dir={locale === "fa" ? "rtl" : "ltr"}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value.slice(0, 60))}
                    maxLength={60}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cp-headline" className="text-[11px] font-bold text-foreground">{t.headlineLabel}</Label>
                  <Input
                    id="cp-headline"
                    dir={locale === "fa" ? "rtl" : "ltr"}
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value.slice(0, 120))}
                    maxLength={120}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cp-bio" className="text-[11px] font-bold text-foreground">{t.bioLabel}</Label>
                  <Textarea
                    id="cp-bio"
                    dir={locale === "fa" ? "rtl" : "ltr"}
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 2000))}
                    rows={4}
                    maxLength={2000}
                    className="resize-none text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground/70">{t.minBioNote}</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-foreground">{t.specializationsLabel}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {COACH_SPECIALIZATIONS.map((code) => (
                      <Label
                        key={code}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/30 px-2.5 py-1.5 text-[11px] font-medium text-foreground has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/10"
                      >
                        <Checkbox
                          checked={specializations.includes(code)}
                          onCheckedChange={() => toggleSpecialization(code)}
                        />
                        {shared.specializationLabel(code)}
                      </Label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-foreground">{t.cooperationTypesLabel}</Label>
                  <div className="space-y-2">
                    {(["SEMI_PRIVATE", "PRIVATE"] as const).map((ct) => (
                      <Label
                        key={ct}
                        className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border/60 bg-secondary/30 p-3 has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/10"
                      >
                        <Checkbox
                          checked={cooperationTypes.includes(ct)}
                          onCheckedChange={() => toggleCooperation(ct)}
                          className="mt-0.5"
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-foreground">{shared.cooperationTypeLabel(ct)}</span>
                          <span className="block text-[11px] leading-5 text-muted-foreground">
                            {ct === "SEMI_PRIVATE" ? t.cooperationHintSemiPrivate : t.cooperationHintPrivate}
                          </span>
                        </span>
                      </Label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cp-years" className="text-[11px] font-bold text-foreground">{t.experienceYearsLabel}</Label>
                  <Input
                    id="cp-years"
                    type="number"
                    min={0}
                    max={60}
                    dir="ltr"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-foreground">{t.certificationsLabel}</Label>
                  {certifications.map((cert, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        dir={locale === "fa" ? "rtl" : "ltr"}
                        value={cert}
                        onChange={(e) => {
                          const next = [...certifications];
                          next[i] = e.target.value.slice(0, 120);
                          setCertifications(next);
                        }}
                        placeholder={t.certificationPlaceholder}
                        maxLength={120}
                        className="text-xs"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() => setCertifications(certifications.filter((_, j) => j !== i))}
                        aria-label={t.remove}
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                  {certifications.length < 10 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCertifications([...certifications, ""])}
                    >
                      <Plus className="me-1 size-3.5" aria-hidden="true" />
                      {t.addCertification}
                    </Button>
                  )}
                </div>

                <Button className="w-full" onClick={save} disabled={saving}>
                  {saving ? t.savingProfile : t.saveProfile}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* درخواست‌های دریافتی + دانشجویان فعال */}
        <div className="space-y-5">
          <Card className="border-border/60 bg-card/70">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-foreground">{t.requestsTitle}</h2>
                  <p className="text-[11px] text-muted-foreground">{t.requestsIntro}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={refreshReq} aria-label={t.retry}>
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                </Button>
              </div>

              {reqLoading ? (
                <div className="space-y-3" aria-busy="true" aria-live="polite">
                  {[0, 1].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
                  ))}
                  <span className="sr-only">{t.loading}</span>
                </div>
              ) : !requests || requests.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title={t.emptyRequestsTitle}
                  description={t.emptyRequestsNote}
                  compact
                />
              ) : (
                <div className="space-y-3" aria-label={t.receivedRequestAria}>
                  {requests.map((r) => (
                    <RequestCard
                      key={r.id}
                      request={r}
                      onDone={refreshAll}
                      onOpenChat={openChatWithConnection}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-foreground">{t.studentsTitle}</h2>
                  <p className="text-[11px] text-muted-foreground">{t.studentsIntro}</p>
                </div>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={refreshStu} aria-label={t.retry}>
                  <RefreshCw className="size-3.5" aria-hidden="true" />
                </Button>
              </div>

              {stuLoading ? (
                <div className="h-24 animate-pulse rounded-xl border border-border/50 bg-secondary/30" aria-busy="true" aria-live="polite" />
              ) : !students || students.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t.emptyStudentsTitle}
                  description={t.emptyStudentsNote}
                  compact
                />
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground/70">{t.studentCount(filteredStudents.length)}</p>
                  {/* فیلتر نوع خدمات + جست‌وجو — مرحله ۱۹.۶ */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(["all", "PRIVATE", "SEMI_PRIVATE"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={studentFilter === f}
                        onClick={() => setStudentFilter(f)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                          studentFilter === f
                            ? "border-primary/40 bg-primary/15 text-primary"
                            : "border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {f === "all" ? p196.studentFilterAll : f === "PRIVATE" ? p196.studentFilterPrivate : p196.studentFilterSemiPrivate}
                      </button>
                    ))}
                  </div>
                  <Input
                    dir={locale === "fa" ? "rtl" : "ltr"}
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value.slice(0, 60))}
                    placeholder={p196.studentsSearchPlaceholder}
                    className="h-8 text-xs"
                    aria-label={p196.studentsSearchPlaceholder}
                  />
                  {filteredStudents.length === 0 ? (
                    <p className="py-3 text-center text-[11px] text-muted-foreground">{p196.studentsEmpty}</p>
                  ) : (
                    filteredStudents.map((s) => (
                      <div key={s.connectionId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 bg-secondary/20 p-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground">{s.student.displayName}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{shared.cooperationTypeLabel(s.cooperationType)}</span>
                            <span>
                              {t.activeSinceLabel}: {localeDateTimeLabel(s.activeSince, locale)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => setDetailStudentId(s.student.userId)}
                          >
                            {p196.studentInfoButton}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/30 p-3">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-[11px] leading-5 text-muted-foreground">{t.futureNote}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </TabsContent>
      </Tabs>

      {/* اطلاعات تکمیلی دانشجو — مرحله ۱۹.۶ */}
      <StudentDetailDialog
        studentId={detailStudentId}
        open={detailStudentId !== null}
        onOpenChange={(v) => !v && setDetailStudentId(null)}
        onOpenChat={openChatWithConnection}
      />
    </div>
  );
}
