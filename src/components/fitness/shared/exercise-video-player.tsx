"use client";

/**
 * پلیر ویدئوی حرکت — مرحله ۲۰/P2 (R2.2).
 *
 * کامپوننت مشترک همه نقاط پخش (کتابخانه مربی، برنامه‌ساز، جزئیات برنامه
 * دانشجو، دیالوگ بانک عمومی): <video> استاندارد HTML با controls و
 * playsInline — بدون وابستگی جدید. سرو بایتها همیشه از مسیر استریم
 * احرازنشست‌دار سرور است و این کامپوننت هیچ تصمیم مجوزی ندارد؛ فهرست
 * رسانه را از والد میگیرد یا با loadMedia از API مجاز بار میکند.
 *
 * حالتهای پوشش‌شده: بارگذاری فهرست، موفقیت با ویدئو، نبود ویدئو (پیام
 * صادقانه — هیچ ادعای ساختگی)، خطا با تلاش مجدد. RTL/LTR بی‌اثر است
 * چون پلیر خودش جهت‌خنثی است؛ عنوان دیالوگ با زبان رابط.
 */

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Film, RotateCcw } from "lucide-react";
import { useStrings } from "@/lib/i18n/use-strings";
import { sharedStrings } from "@/lib/i18n/sections/shared";
import { useLocale } from "@/lib/i18n/locale";

export interface ExerciseMediaItem {
  id: string;
  kind: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export type ExerciseVideoSource =
  | { type: "ready"; media: ExerciseMediaItem[] }
  | { type: "load"; load: () => Promise<ExerciseMediaItem[] | null> };

/**
 * مسیر استریم ویدئوی شخصی مربی/دانشجو و رسانه بانک — به‌طور خودکار
 * بر اساس شناسه رسانه: هر دو نقش از همین دو مسیر استفاده میکنند و
 * مجوز سمت سرور اعمال میشود.
 */
export function personalMediaStreamUrl(mediaId: string): string {
  return `/api/coach/exercises/media/${encodeURIComponent(mediaId)}`;
}

export function bankMediaStreamUrl(
  exerciseId: string,
  mediaId: string
): string {
  return `/api/exercises/${encodeURIComponent(exerciseId)}/media/${encodeURIComponent(mediaId)}`;
}

export function ExerciseVideoPlayerDialog({
  open,
  onOpenChange,
  title,
  source,
  mediaUrlFor,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** عنوان دیالوگ — نام حرکت به زبان رابط */
  title: string;
  source: ExerciseVideoSource | null;
  /**
   * سازنده URL استریم هر رسانه — پیشفرض مسیر رسانه شخصی مربی/دانشجو؛
   * برای رسانه بانک عمومی مسیر بانک داده میشود. هر دو مسیر مجوز سمت
   * سرور دارند و این کامپوننت فقط آدرسدهی میکند.
   */
  mediaUrlFor?: (media: ExerciseMediaItem) => string;
}) {
  const t = useStrings(sharedStrings);
  const locale = useLocale();
  /**
   * الگوی رسمی پروژه: مشتق در رندر + دنباله async (نه effect با setState).
   * حالت منبع: ready → رسانه همان پراپ؛ load → یکبار بارگذاری با بازشدن
   * (کلید = خود تابع load) با تلاش مجدد واقعی از دکمه.
   */
  type LoadState =
    | { phase: "loading" }
    | { phase: "error" }
    | { phase: "done"; media: ExerciseMediaItem[] };
  const [loadState, setLoadState] = useState<LoadState>({ phase: "loading" });
  const [prevOpen, setPrevOpen] = useState(false);

  const runLoad = (load: () => Promise<ExerciseMediaItem[] | null>) => {
    setLoadState({ phase: "loading" });
    void (async () => {
      const result = await load();
      setLoadState(
        result === null ? { phase: "error" } : { phase: "done", media: result }
      );
    })();
  };

  // بارگذاری فقط روی ترنزیشن بسته→باز (open) — کلید، هویت تابع load نیست
  // (والد هر رندر یک closure تازه میسازد؛ کلیدزدن روی آن حلقه بی‌نهایت
  // رندر میسازد). تلاش مجدد با دکمه خطا مستقل انجام میشود.
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setLoadState({ phase: "loading" });
      if (source?.type === "load") runLoad(source.load);
    }
  }

  const media: ExerciseMediaItem[] | null =
    source?.type === "ready"
      ? source.media
      : loadState.phase === "done"
        ? loadState.media
        : null;
  const loading =
    source?.type === "load" ? loadState.phase === "loading" : false;
  const loadError =
    source?.type === "load" ? loadState.phase === "error" : false;

  const videos = useMemo(
    () => (media ?? []).filter((m) => m.kind === "video"),
    [media]
  );
  const urlFor: (media: ExerciseMediaItem) => string =
    mediaUrlFor ?? ((m) => personalMediaStreamUrl(m.id));
  const poster = useMemo(() => {
    const image = (media ?? []).find((m) => m.kind === "image");
    return image ? urlFor(image) : undefined;
  }, [media, urlFor]);

  const reset = () => {
    setLoadState({ phase: "loading" });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Film className="size-4 text-primary" aria-hidden="true" />
            <span dir="auto">{title}</span>
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            {locale === "fa"
              ? "پخش ویدئوی حرکت — سرو استریم امن سمت سرور"
              : "Exercise video playback — secure server-side streaming"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex flex-col gap-3 py-6" aria-busy="true">
            <div className="h-40 animate-pulse rounded-xl bg-secondary/40" />
            <span className="sr-only">{t.loadingLabel}</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-border/50 p-6">
            <p className="text-center text-[11px] leading-6 text-muted-foreground">
              {locale === "fa"
                ? "بارگذاری ویدئو ناموفق بود"
                : "Video failed to load"}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (source?.type === "load") runLoad(source.load);
              }}
            >
              <RotateCcw className="me-1 size-3.5" aria-hidden="true" />
              {t.retryButton}
            </Button>
          </div>
        )}

        {!loading && !loadError && media !== null && videos.length === 0 && (
          <p className="rounded-xl border border-border/50 bg-secondary/30 p-6 text-center text-[11px] leading-6 text-muted-foreground">
            {locale === "fa"
              ? "برای این حرکت ویدئویی ثبت نشده است"
              : "No video has been added for this exercise"}
          </p>
        )}

        {!loading && !loadError && videos.length > 0 && (
          <div className="space-y-3">
            {videos.map((v) => (
              <div key={v.id} className="space-y-1">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={poster}
                  src={urlFor(v)}
                  className="aspect-video w-full rounded-xl border border-border/50 bg-black"
                  aria-label={v.fileName}
                >
                  <track kind="captions" />
                </video>
                <p className="truncate text-[10px] text-muted-foreground" dir="auto">
                  {v.fileName} · {(v.sizeBytes / (1024 * 1024)).toFixed(1)}{" "}
                  {locale === "fa" ? "مگابایت" : "MB"}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
