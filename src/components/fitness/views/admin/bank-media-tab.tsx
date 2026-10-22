"use client";

/**
 * تب «رسانه بانک حرکات» پنل ادمین — مرحله ۲۰/P2 (R2.3).
 *
 * جست‌وجو در بانک عمومی (scope=search — همان API نشست‌دار کتابخانه)،
 * انتخاب رکورد و مدیریت رسانههای آن: فهرست whitelist، آپلود تصویر/ویدئو
 * (اعتبارسنجی واقعی سمت سرور)، پخش امن با پلیر مشترک و حذف.
 * ویدئوی مشارکت مربی (origin=coach) عمداً اینجا نیست — با گردش کار
 * انتشار P3 میآید؛ این تب هیچ مجوز انتشار جدیدی نمیسازد.
 */

import { useCallback, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Film, ImageIcon, Loader2, Play, Search, Trash2 } from "lucide-react";
import type { AdminStrings } from "@/lib/i18n/sections/admin";
import { useLocale } from "@/lib/i18n/locale";
import { ExerciseVideoPlayerDialog } from "../../shared/exercise-video-player";

interface BankCard {
  id: string;
  fa: string;
  en: string;
  category: string;
}

interface BankMediaItem {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export function BankMediaTab({ t }: { t: AdminStrings }) {
  const locale = useLocale();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BankCard[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<BankCard | null>(null);
  const [media, setMedia] = useState<BankMediaItem[] | null>(null);
  const [busyUpload, setBusyUpload] = useState<"image" | "video" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async () => {
    const q = query.trim();
    if (q.length === 0) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/exercises?scope=search&q=${encodeURIComponent(q)}&pageSize=12`
      );
      if (res.ok) {
        const data = (await res.json()) as {
          items?: { id: string; fa: string; en: string; category: string }[];
        };
        setResults(Array.isArray(data.items) ? data.items.slice(0, 12) : []);
      } else {
        setResults([]);
      }
    } finally {
      setSearching(false);
    }
  }, [query]);

  const openExercise = useCallback(async (card: BankCard) => {
    setSelected(card);
    setMedia(null);
    const res = await fetch(`/api/exercises/${encodeURIComponent(card.id)}/media`);
    if (res.ok) {
      const data = (await res.json()) as { media?: BankMediaItem[] };
      setMedia(Array.isArray(data.media) ? data.media : []);
    } else {
      setMedia([]);
    }
  }, []);

  const upload = useCallback(
    async (kind: "image" | "video", file: File) => {
      if (!selected || busyUpload !== null) return;
      setBusyUpload(kind);
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(
          `/api/admin/exercises/${encodeURIComponent(selected.id)}/media`,
          { method: "POST", body: form }
        );
        if (res.ok) {
          toast({ title: t.bankMediaUploaded });
          await openExercise(selected);
        } else {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          toast({
            title: t.bankMediaError,
            description: body.error ?? `HTTP ${res.status}`,
            variant: "destructive",
          });
        }
      } finally {
        setBusyUpload(null);
      }
    },
    [selected, busyUpload, t, toast, openExercise]
  );

  const remove = useCallback(
    async (mediaId: string) => {
      if (!selected || deletingId !== null) return;
      setDeletingId(mediaId);
      try {
        const res = await fetch(
          `/api/admin/exercises/${encodeURIComponent(selected.id)}/media/${encodeURIComponent(mediaId)}`,
          { method: "DELETE" }
        );
        if (res.ok) {
          toast({ title: t.bankMediaDeleted });
          await openExercise(selected);
        } else {
          toast({ title: t.bankMediaError, variant: "destructive" });
        }
      } finally {
        setDeletingId(null);
      }
    },
    [selected, deletingId, t, toast, openExercise]
  );

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-6 text-muted-foreground">{t.bankMediaIntro}</p>

      {/* جست‌وجوی بانک */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute end-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/50"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
            placeholder={t.bankMediaSearchPlaceholder}
            className="pe-9 text-xs"
            aria-label={t.bankMediaSearchPlaceholder}
          />
        </div>
        <Button
          size="sm"
          disabled={searching || query.trim().length === 0}
          onClick={() => void search()}
          className="text-[11px] font-bold"
        >
          {searching ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          {locale === "fa" ? "جست‌وجو" : "Search"}
        </Button>
      </div>

      {results !== null && results.length === 0 && (
        <p className="rounded-xl border border-border/50 bg-secondary/30 p-4 text-center text-[11px] text-muted-foreground">
          {t.bankMediaSearchEmpty}
        </p>
      )}

      {results !== null && results.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => void openExercise(r)}
              className={`rounded-xl border p-2.5 text-start transition-colors ${
                selected?.id === r.id
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/50 bg-card/60 hover:border-primary/30"
              }`}
            >
              <p className="truncate text-[11px] font-bold text-foreground" dir="auto">
                {locale === "fa" ? r.fa : r.en}
              </p>
              <p dir="ltr" className="truncate text-[9px] text-muted-foreground">{r.en}</p>
            </button>
          ))}
        </div>
      )}

      {results !== null && results.length > 0 && !selected && (
        <p className="text-[10px] text-muted-foreground">{t.bankMediaPickHint}</p>
      )}

      {/* مدیریت رسانه رکورد انتخاب‌شده */}
      {selected && (
        <Card className="border-border/60 bg-card/70">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-foreground" dir="auto">
                  {locale === "fa" ? selected.fa : selected.en}
                </p>
                <p dir="ltr" className="truncate text-[10px] text-muted-foreground">{selected.en}</p>
              </div>
              <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[9px] font-bold text-primary">
                origin: core
              </Badge>
            </div>

            <p className="text-[10px] leading-5 text-muted-foreground/80">{t.bankMediaOriginNote}</p>

            <div>
              <p className="text-[10px] font-bold text-muted-foreground">{t.bankMediaCurrent}</p>
              {media === null ? (
                <div className="mt-2 flex items-center gap-2" aria-busy="true">
                  <Loader2 className="size-3.5 animate-spin text-muted-foreground" aria-hidden="true" />
                </div>
              ) : media.length === 0 ? (
                <p className="mt-1 text-[10px] text-muted-foreground/70">{t.bankMediaNone}</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {media.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center gap-2 rounded-lg border border-border/40 bg-secondary/20 px-2 py-1.5"
                    >
                      {m.kind === "video" ? (
                        <Film className="size-3 text-primary" aria-hidden="true" />
                      ) : (
                        <ImageIcon className="size-3 text-primary" aria-hidden="true" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[10px] text-foreground" dir="auto">
                        {m.fileName}
                        <span className="ms-1 text-muted-foreground" dir="ltr">
                          ({(m.sizeBytes / (1024 * 1024)).toFixed(1)} MB)
                        </span>
                      </span>
                      {m.kind === "video" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-[10px] font-bold text-primary"
                          onClick={() => setVideoOpen(true)}
                        >
                          <Play className="me-0.5 size-3" aria-hidden="true" />
                          {t.bankMediaPlay}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={deletingId === m.id}
                        className="h-6 px-2 text-[10px] font-bold text-rose-300 hover:bg-rose-400/10"
                        onClick={() => void remove(m.id)}
                        aria-label={`${t.bankMediaDelete} ${m.fileName}`}
                      >
                        {deletingId === m.id ? (
                          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="size-3" aria-hidden="true" />
                        )}
                        {t.bankMediaDelete}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* آپلود — ورودی فایل؛ اعتبارسنجی واقعی سمت سرور است */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyUpload !== null}
                className="h-7 px-2 text-[10px] font-bold"
                onClick={() => imageInputRef.current?.click()}
              >
                {busyUpload === "image" ? (
                  <Loader2 className="me-1 size-3 animate-spin" aria-hidden="true" />
                ) : (
                  <ImageIcon className="me-1 size-3" aria-hidden="true" />
                )}
                {t.bankMediaUploadImage}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyUpload !== null}
                className="h-7 px-2 text-[10px] font-bold"
                onClick={() => videoInputRef.current?.click()}
              >
                {busyUpload === "video" ? (
                  <Loader2 className="me-1 size-3 animate-spin" aria-hidden="true" />
                ) : (
                  <Film className="me-1 size-3" aria-hidden="true" />
                )}
                {t.bankMediaUploadVideo}
              </Button>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload("image", f);
                e.currentTarget.value = "";
              }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload("video", f);
                e.currentTarget.value = "";
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* پلیر امن — همان مسیر استریم احرازنشست‌دار بانک */}
      {selected && (
        <ExerciseVideoPlayerDialog
          open={videoOpen}
          onOpenChange={setVideoOpen}
          title={locale === "fa" ? selected.fa : selected.en}
          source={{ type: "ready", media: media ?? [] }}
          mediaUrlFor={(m) =>
            `/api/exercises/${encodeURIComponent(selected.id)}/media/${encodeURIComponent(m.id)}`
          }
        />
      )}
    </div>
  );
}
