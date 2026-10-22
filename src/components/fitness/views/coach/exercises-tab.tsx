"use client";

/**
 * تب «بانک حرکات شخصی» پنل مربی — مرحله ۱۹.۶.
 * ساخت/ویرایش/حذف حرکت اختصاصی با رسانه (تصویر/ویدئو)؛ کاملاً جدا از بانک
 * عمومی ۹۰۵ حرکتی. حذف، سوابق برنامه‌های ارسال‌شده را نمی‌شکند (snapshot).
 */

import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Film, Folder, Image as ImageIcon, Plus, RefreshCw, Search, SearchX, Trash2, X } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { coachesStrings } from "@/lib/i18n/sections/coaches";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { LIBRARY_MUSCLE_GROUPS } from "@/lib/exercises/types";
import { ViewIntro } from "../../shared/view-intro";
import { EmptyState } from "../../shared/empty-state";
import {
  ExerciseVideoPlayerDialog,
  type ExerciseMediaItem,
} from "../../shared/exercise-video-player";
import { useCoachExercises, useCoachExerciseFolders } from "@/hooks/use-p196";
import type { CoachExerciseClient } from "@/hooks/use-p196";
import { normalizeSearchText } from "@/lib/exercises/search";

const CATEGORIES = [
  { value: "chest", fa: "سینه", en: "Chest" },
  { value: "back", fa: "پشت و زیربغل", en: "Back" },
  { value: "shoulders", fa: "سرشانه", en: "Shoulders" },
  { value: "biceps", fa: "جلو بازو", en: "Biceps" },
  { value: "triceps", fa: "پشت بازو", en: "Triceps" },
  { value: "abs", fa: "شکم و مرکزی", en: "Abs" },
  { value: "quads", fa: "چهارسر ران", en: "Quads" },
  { value: "hamstrings", fa: "همسترینگ", en: "Hamstrings" },
  { value: "glutes", fa: "سرینی", en: "Glutes" },
  { value: "calves", fa: "ساق پا", en: "Calves" },
  { value: "fullbody", fa: "تمام بدن", en: "Full body" },
] as const;

interface ExerciseForm {
  faName: string;
  enName: string;
  category: string;
  equipment: string;
  /** کلیدهای استاندارد عضله (همان واژه‌نامه بانک) — سقف ۶ سمت سرور */
  primaryMuscles: string[];
  secondaryMuscles: string[];
  description: string;
  tips: string;
}

function emptyForm(): ExerciseForm {
  return {
    faName: "",
    enName: "",
    category: "chest",
    equipment: "",
    primaryMuscles: [],
    secondaryMuscles: [],
    description: "",
    tips: "",
  };
}

function formFromExercise(ex: CoachExerciseClient): ExerciseForm {
  return {
    faName: ex.faName,
    enName: ex.enName,
    category: ex.category,
    equipment: ex.equipment.join(", "),
    primaryMuscles: [...ex.primaryMuscles],
    secondaryMuscles: [...ex.secondaryMuscles],
    description: ex.description,
    tips: ex.tips,
  };
}

export function CoachExercisesTab() {
  const t = useStrings(phase196Strings);
  const plansT = useStrings(coachPlansStrings);
  const shared = useStrings(sharedStrings);
  const coachesT = useStrings(coachesStrings);
  const locale = useLocale();
  const dir = useDir();
  const { toast } = useToast();
  const { exercises, cap, loading, create, update, remove, uploadMedia, deleteMedia, move, reload } =
    useCoachExercises(true);
  const {
    folders,
    createFolder,
    deleteFolder,
    reload: reloadFolders,
  } = useCoachExerciseFolders(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  // پوشههای دستهبندی — مرحله ۲۰ (بخش ۷)
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  // جست‌وجو و فیلتر کتابخانه شخصی — مرحله ۲۰/P1-R1.1 (سمت کلاینت؛
  // داده فهرست فقط خود مربی است — جداسازی داده سمت سرور تضمین میشود)
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [muscleFilter, setMuscleFilter] = useState<string>("all");
  // پلیر ویدئوی حرکت — مرحله ۲۰/P2 (R2.2)
  const [videoTarget, setVideoTarget] = useState<{ title: string; media: ExerciseMediaItem[] } | null>(null);

  const q = normalizeSearchText(searchQuery);
  const filteredExercises = (exercises ?? []).filter((ex) => {
    if (folderFilter !== null && ex.folderId !== folderFilter) return false;
    if (categoryFilter !== "all" && ex.category !== categoryFilter) return false;
    if (
      muscleFilter !== "all" &&
      !ex.primaryMuscles.includes(muscleFilter) &&
      !ex.secondaryMuscles.includes(muscleFilter)
    ) {
      return false;
    }
    if (q.length > 0) {
      const fa = normalizeSearchText(ex.faName);
      const en = normalizeSearchText(ex.enName);
      if (!fa.includes(q) && !en.includes(q)) return false;
    }
    return true;
  });
  const hasSearchFilters =
    searchQuery.trim().length > 0 || categoryFilter !== "all" || muscleFilter !== "all";

  const clearSearchFilters = () => {
    setSearchQuery("");
    setCategoryFilter("all");
    setMuscleFilter("all");
  };

  const doCreateFolder = async () => {
    const name = newFolderName.trim();
    if (name.length === 0 || folderBusy) return;
    setFolderBusy(true);
    const result = await createFolder(name);
    setFolderBusy(false);
    if (result.ok) {
      setNewFolderName("");
      toast({ title: locale === "fa" ? "پوشه ساخته شد" : "Folder created" });
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  const doDeleteFolder = async (folderId: string) => {
    if (folderBusy) return;
    setFolderBusy(true);
    const result = await deleteFolder(folderId);
    setFolderBusy(false);
    if (result.ok) {
      if (folderFilter === folderId) setFolderFilter(null);
      toast({
        title: locale === "fa" ? "پوشه حذف شد؛ حرکات به «بدون پوشه» برگشتند" : "Folder deleted; exercises moved to no-folder",
      });
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  const doMove = async (exerciseId: string, folderId: string | null) => {
    const result = await move(exerciseId, folderId);
    if (result.ok) {
      reloadFolders();
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (ex: CoachExerciseClient) => {
    setEditId(ex.id);
    setForm(formFromExercise(ex));
    setDialogOpen(true);
  };

  const save = async () => {
    if (saving) return;
    if (form.faName.trim().length < 2 || form.enName.trim().length < 2) {
      toast({ title: plansT.formErrorsTitle, description: t.exerciseNameFa, variant: "destructive" });
      return;
    }
    const splitList = (s: string) =>
      s.split(",").map((v) => v.trim()).filter((v) => v.length > 0).slice(0, 6);
    const payload = {
      faName: form.faName.trim(),
      enName: form.enName.trim(),
      category: form.category,
      equipment: splitList(form.equipment),
      primaryMuscles: form.primaryMuscles.slice(0, 6),
      secondaryMuscles: form.secondaryMuscles.slice(0, 6),
      description: form.description.trim(),
      tips: form.tips.trim(),
    };
    setSaving(true);
    const result = editId ? await update(editId, payload) : await create(payload);
    setSaving(false);
    if (result.ok) {
      toast({ title: t.exerciseSaved });
      setDialogOpen(false);
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    const result = await remove(deleteTarget);
    setDeleteTarget(null);
    if (result.ok) {
      toast({ title: t.exerciseDeleted });
    } else {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    }
  };

  const onUploadFile = async (exerciseId: string, file: File) => {
    // شناسه حرکت مستقیم پاس داده میشود — خواندن state اینجا race داشت و
    // بارگذاری اول همیشه بی‌صدا رد میشد (رفع باگ مرحله ۲۰، بخش ۱۱)
    const result = await uploadMedia(exerciseId, file);
    if (!result.ok) {
      toast({ title: plansT.loadError, description: result.message, variant: "destructive" });
    } else {
      toast({ title: t.exerciseSaved });
    }
  };

  const item = {
    fa: "بانک حرکات شخصی",
    en: "My Exercise Bank",
    description: t.exercisesSectionNote,
    descriptionEn: t.exercisesSectionNote,
    stage: 19,
    features: [] as string[],
    id: "coachPanel" as const,
    icon: Dumbbell,
  };

  return (
    <div>
      <ViewIntro item={item} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={openNew}>
            <Plus className="me-1 size-3.5" aria-hidden="true" />
            {t.exerciseCreate}
          </Button>
          {/* نشان سهمیه کتابخانه — مرحله ۲۰/P1-R1.3؛ مقدار سقف از سرور */}
          {typeof cap === "number" && exercises !== null && (
            <Badge
              variant="outline"
              className={
                cap - exercises.length <= 10
                  ? "border-amber-500/40 bg-amber-500/10 text-[10px] font-bold text-amber-500"
                  : "border-border/60 bg-secondary/30 text-[10px] font-bold text-muted-foreground"
              }
              aria-label={t.libraryCapBadgeAria(exercises.length, cap)}
            >
              {t.libraryCapBadge(exercises.length, cap)}
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => void reload()} aria-label={plansT.refresh}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {/* نوار جست‌وجو و فیلتر — مرحله ۲۰/P1-R1.1 (سمت کلاینت روی فهرست خود مربی) */}
      <div className="mb-4 space-y-2 rounded-xl border border-border/60 bg-card/60 p-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50"
            aria-hidden="true"
          />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.librarySearchPlaceholder}
            className="pe-9 text-xs"
            aria-label={t.librarySearchAria}
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              aria-label={t.librarySearchClear}
              className="absolute start-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setSearchQuery("")}
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-muted-foreground">{t.libraryFilterCategory}</span>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-32 text-[10px]" aria-label={t.libraryFilterCategory}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[10px]">{t.libraryFilterAll}</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value} className="text-[10px]">
                  {locale === "fa" ? c.fa : c.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-[10px] font-bold text-muted-foreground">{t.libraryFilterMuscle}</span>
          <Select value={muscleFilter} onValueChange={setMuscleFilter}>
            <SelectTrigger className="h-8 w-32 text-[10px]" aria-label={t.libraryFilterMuscle}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[10px]">{t.libraryFilterAll}</SelectItem>
              {LIBRARY_MUSCLE_GROUPS.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-[10px]">
                  {locale === "fa" ? m.fa : m.en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* نوار پوشهها — دستهبندی حرکات (مرحله ۲۰، بخش ۷) */}
      <div className="mb-4 space-y-2 rounded-xl border border-border/60 bg-card/60 p-3">
        <p className="text-[10px] font-bold text-muted-foreground">
          {locale === "fa" ? "پوشه‌های دسته‌بندی" : "Category folders"}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFolderFilter(null)}
            aria-pressed={folderFilter === null}
            className={
              folderFilter === null
                ? "rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-primary"
                : "rounded-full border border-border/50 bg-secondary/30 px-2.5 py-1 text-[10px] font-bold text-muted-foreground hover:border-primary/30"
            }
          >
            {locale === "fa" ? "همه حرکات" : "All exercises"}
          </button>
          {(folders ?? []).map((f) => (
            <span
              key={f.id}
              className={
                folderFilter === f.id
                  ? "inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-primary"
                  : "inline-flex items-center gap-1 rounded-full border border-border/50 bg-secondary/30 px-2.5 py-1 text-[10px] font-bold text-muted-foreground"
              }
            >
              <button type="button" onClick={() => setFolderFilter(folderFilter === f.id ? null : f.id)}>
                <Folder className="me-0.5 inline size-3" aria-hidden="true" />
                {f.name} ({f.exercisesCount})
              </button>
              <button
                type="button"
                aria-label={`${t.exerciseDelete} ${f.name}`}
                className="text-rose-300 hover:text-rose-200"
                onClick={() => void doDeleteFolder(f.id)}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value.slice(0, 60))}
            placeholder={locale === "fa" ? "نام پوشه جدید…" : "New folder name…"}
            className="h-8 max-w-48 text-xs"
            aria-label={locale === "fa" ? "نام پوشه جدید" : "New folder name"}
          />
          <Button size="sm" variant="outline" onClick={() => void doCreateFolder()} disabled={folderBusy || newFolderName.trim().length === 0}>
            <Plus className="me-1 size-3.5" aria-hidden="true" />
            {locale === "fa" ? "پوشه جدید" : "New folder"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
          ))}
        </div>
      ) : !exercises || exercises.length === 0 ? (
        <EmptyState icon={Dumbbell} title={t.exercisesSectionTitle} description={t.exercisesEmpty} />
      ) : filteredExercises.length === 0 ? (
        // وضعیت بدون نتیجه — صادقانه با دکمه پاک‌کردن جست‌وجو (R1.1)
        <div className="rounded-xl border border-border/50 bg-card/60 p-6 text-center">
          <SearchX className="mx-auto mb-2 size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-[11px] leading-6 text-muted-foreground">{t.libraryNoResults}</p>
          {hasSearchFilters && (
            <Button size="sm" variant="outline" className="mt-3" onClick={clearSearchFilters}>
              <X className="me-1 size-3.5" aria-hidden="true" />
              {t.librarySearchClear}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredExercises.map((ex) => (
            <Card key={ex.id} className="border-border/60 bg-card/70">
              <CardContent className="space-y-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">
                      {locale === "fa" ? ex.faName : ex.enName}
                    </p>
                    <p dir="ltr" className="truncate text-[10px] text-muted-foreground">{ex.enName}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-primary/30 bg-primary/10 text-[10px] font-bold text-primary">
                    {t.exercisePersonalBadge}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                  <span>
                    {t.exerciseCategory}: {CATEGORIES.find((c) => c.value === ex.category)?.[locale === "fa" ? "fa" : "en"] ?? ex.category}
                  </span>
                  {ex.equipment.length > 0 && <span>{ex.equipment.join("، ")}</span>}
                </div>

                {ex.description && (
                  <p className="line-clamp-2 text-[11px] leading-5 text-muted-foreground">{ex.description}</p>
                )}

                {/* رسانه‌ها */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground">{t.exerciseMedia}</p>
                  {ex.media.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground/70">{t.exerciseMediaEmpty}</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {ex.media.map((m) => (
                        <span
                          key={m.id}
                          className="group relative inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-secondary/30 px-2 py-1 text-[10px]"
                        >
                          {m.kind === "video" ? (
                            <Film className="size-3 text-primary" aria-hidden="true" />
                          ) : (
                            <ImageIcon className="size-3 text-primary" aria-hidden="true" />
                          )}
                          {m.kind === "video" ? (
                            // P2 (R2.2): ویدئو با پلیر امن پخش میشود — نه لینک خام
                            <button
                              type="button"
                              className="max-w-32 truncate font-bold text-foreground hover:text-primary"
                              onClick={() =>
                                setVideoTarget({
                                  title: locale === "fa" ? ex.faName : ex.enName,
                                  media: ex.media,
                                })
                              }
                            >
                              {m.fileName}
                            </button>
                          ) : (
                            <a
                              href={`/api/coach/exercises/media/${encodeURIComponent(m.id)}`}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="max-w-32 truncate font-bold text-foreground hover:text-primary"
                            >
                              {m.fileName}
                            </a>
                          )}
                          <button
                            type="button"
                            aria-label={`${t.exerciseDelete} ${m.fileName}`}
                            className="text-rose-300 hover:text-rose-200"
                            onClick={() => void deleteMedia(m.id)}
                          >
                            <X className="size-3" aria-hidden="true" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[9px] leading-4 text-muted-foreground/60">
                    {t.exerciseMediaImageNote} · {t.exerciseMediaVideoNote}
                  </p>
                  <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                    <Plus className="size-3" aria-hidden="true" />
                    {t.exerciseMediaUpload}
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          void onUploadFile(ex.id, f);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => openEdit(ex)}>
                    {t.exerciseEdit}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-300 hover:bg-rose-400/10"
                    onClick={() => setDeleteTarget(ex.id)}
                  >
                    <Trash2 className="me-1 size-3.5" aria-hidden="true" />
                    {t.exerciseDelete}
                  </Button>
                  {/* جابهجایی به پوشه — مرحله ۲۰ */}
                  <Select
                    value={ex.folderId ?? "none"}
                    onValueChange={(v) => void doMove(ex.id, v === "none" ? null : v)}
                  >
                    <SelectTrigger
                      className="h-8 w-36 text-[10px]"
                      aria-label={locale === "fa" ? "انتقال به پوشه" : "Move to folder"}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-[10px]">
                        {locale === "fa" ? "بدون پوشه" : "No folder"}
                      </SelectItem>
                      {(folders ?? []).map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-[10px]">
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* دیالوگ ساخت/ویرایش */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir={dir} className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{editId ? t.exerciseEdit : t.exerciseCreate}</DialogTitle>
            <DialogDescription className="text-[11px] leading-5">{t.exercisesSectionNote}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="cex-fa" className="text-[11px] font-bold text-foreground">{t.exerciseNameFa}</Label>
                <Input
                  id="cex-fa"
                  dir="rtl"
                  value={form.faName}
                  onChange={(e) => setForm((f) => ({ ...f, faName: e.target.value.slice(0, 80) }))}
                  maxLength={80}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cex-en" className="text-[11px] font-bold text-foreground">{t.exerciseNameEn}</Label>
                <Input
                  id="cex-en"
                  dir="ltr"
                  value={form.enName}
                  onChange={(e) => setForm((f) => ({ ...f, enName: e.target.value.slice(0, 80) }))}
                  maxLength={80}
                  className="text-xs"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-foreground">{t.exerciseCategory}</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="w-full text-xs" aria-label={t.exerciseCategory}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {locale === "fa" ? c.fa : c.en}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cex-eq" className="text-[11px] font-bold text-foreground">
                {t.exerciseEquipment}
                <span className="ms-1 font-normal text-muted-foreground">(،)</span>
              </Label>
              <Input
                id="cex-eq"
                dir={locale === "fa" ? "rtl" : "ltr"}
                value={form.equipment}
                onChange={(e) => setForm((f) => ({ ...f, equipment: e.target.value.slice(0, 200) }))}
                className="text-xs"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">
                  {t.exercisePrimaryMuscles}
                  <span className="ms-1 font-normal text-muted-foreground">(≤۶)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {LIBRARY_MUSCLE_GROUPS.map((m) => {
                    const active = form.primaryMuscles.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            primaryMuscles: active
                              ? f.primaryMuscles.filter((x) => x !== m.id)
                              : [...f.primaryMuscles, m.id].slice(0, 6),
                          }))
                        }
                        className={
                          active
                            ? "rounded-full border border-primary bg-primary/15 px-2.5 py-1 text-[10px] font-bold text-primary"
                            : "rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }
                      >
                        {locale === "fa" ? m.fa : m.en}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-foreground">
                  {t.exerciseSecondaryMuscles}
                  <span className="ms-1 font-normal text-muted-foreground">(≤۶)</span>
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {LIBRARY_MUSCLE_GROUPS.map((m) => {
                    const active = form.secondaryMuscles.includes(m.id);
                    const inPrimary = form.primaryMuscles.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        aria-pressed={active}
                        disabled={inPrimary}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            secondaryMuscles: active
                              ? f.secondaryMuscles.filter((x) => x !== m.id)
                              : [...f.secondaryMuscles, m.id].slice(0, 6),
                          }))
                        }
                        className={
                          active
                            ? "rounded-full border border-primary/60 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary"
                            : inPrimary
                              ? "rounded-full border border-border/40 px-2.5 py-1 text-[10px] text-muted-foreground/40"
                              : "rounded-full border border-border/70 px-2.5 py-1 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }
                      >
                        {locale === "fa" ? m.fa : m.en}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cex-desc" className="text-[11px] font-bold text-foreground">{t.exerciseDescription}</Label>
              <Textarea
                id="cex-desc"
                dir={locale === "fa" ? "rtl" : "ltr"}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value.slice(0, 2000) }))}
                rows={3}
                maxLength={2000}
                className="resize-none text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cex-tips" className="text-[11px] font-bold text-foreground">{t.exerciseTips}</Label>
              <Textarea
                id="cex-tips"
                dir={locale === "fa" ? "rtl" : "ltr"}
                value={form.tips}
                onChange={(e) => setForm((f) => ({ ...f, tips: e.target.value.slice(0, 1000) }))}
                rows={2}
                maxLength={1000}
                className="resize-none text-xs"
              />
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? plansT.saving : plansT.saveDraft}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent dir={dir}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.exerciseDelete}</AlertDialogTitle>
            <AlertDialogDescription>{t.exerciseDeleteConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{coachesT.keepIt}</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-500/90 text-white hover:bg-rose-500" onClick={() => void doDelete()}>
              {t.exerciseDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* پلیر ویدئوی حرکت — مرحله ۲۰/P2 (R2.2) */}
      <ExerciseVideoPlayerDialog
        open={videoTarget !== null}
        onOpenChange={(v) => {
          if (!v) setVideoTarget(null);
        }}
        title={videoTarget?.title ?? ""}
        source={videoTarget ? { type: "ready", media: videoTarget.media } : null}
      />
    </div>
  );
}
