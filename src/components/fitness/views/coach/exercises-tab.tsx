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
import { Dumbbell, Film, Image as ImageIcon, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { phase196Strings } from "@/lib/i18n/sections/phase196";
import { coachPlansStrings } from "@/lib/i18n/sections/coach-plans";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { coachesStrings } from "@/lib/i18n/sections/coaches";
import { useLocale, useDir } from "@/lib/i18n/locale";
import { ViewIntro } from "../../shared/view-intro";
import { EmptyState } from "../../shared/empty-state";
import { useCoachExercises } from "@/hooks/use-p196";
import type { CoachExerciseClient } from "@/hooks/use-p196";

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
  primaryMuscles: string;
  secondaryMuscles: string;
  description: string;
  tips: string;
}

function emptyForm(): ExerciseForm {
  return {
    faName: "",
    enName: "",
    category: "chest",
    equipment: "",
    primaryMuscles: "",
    secondaryMuscles: "",
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
    primaryMuscles: ex.primaryMuscles.join(", "),
    secondaryMuscles: ex.secondaryMuscles.join(", "),
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
  const { exercises, loading, create, update, remove, uploadMedia, deleteMedia, reload } =
    useCoachExercises(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ExerciseForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

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
      primaryMuscles: splitList(form.primaryMuscles),
      secondaryMuscles: splitList(form.secondaryMuscles),
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

  const onUploadFile = async (file: File) => {
    if (!uploadingFor) return;
    const result = await uploadMedia(uploadingFor, file);
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
        <Button size="sm" onClick={openNew}>
          <Plus className="me-1 size-3.5" aria-hidden="true" />
          {t.exerciseCreate}
        </Button>
        <Button variant="ghost" size="icon" className="size-8" onClick={() => void reload()} aria-label={plansT.refresh}>
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3" aria-busy="true" aria-live="polite">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border/50 bg-secondary/30" />
          ))}
        </div>
      ) : !exercises || exercises.length === 0 ? (
        <EmptyState icon={Dumbbell} title={t.exercisesSectionTitle} description={t.exercisesEmpty} />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {exercises.map((ex) => (
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
                          <a
                            href={`/api/coach/exercises/media/${encodeURIComponent(m.id)}`}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="max-w-32 truncate font-bold text-foreground hover:text-primary"
                          >
                            {m.fileName}
                          </a>
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
                          setUploadingFor(ex.id);
                          void onUploadFile(f);
                        }
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-1">
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
                <Label htmlFor="cex-pm" className="text-[11px] font-bold text-foreground">{t.exercisePrimaryMuscles}</Label>
                <Input
                  id="cex-pm"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.primaryMuscles}
                  onChange={(e) => setForm((f) => ({ ...f, primaryMuscles: e.target.value.slice(0, 200) }))}
                  className="text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cex-sm" className="text-[11px] font-bold text-foreground">{t.exerciseSecondaryMuscles}</Label>
                <Input
                  id="cex-sm"
                  dir={locale === "fa" ? "rtl" : "ltr"}
                  value={form.secondaryMuscles}
                  onChange={(e) => setForm((f) => ({ ...f, secondaryMuscles: e.target.value.slice(0, 200) }))}
                  className="text-xs"
                />
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
    </div>
  );
}
