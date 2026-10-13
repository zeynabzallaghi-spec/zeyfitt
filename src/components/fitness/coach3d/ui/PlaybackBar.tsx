"use client";

/**
 * نوار کنترل پخش مربی سه‌بعدی — شروع/توقف، بازنشانی، سرعت، نماهای دوربین
 * و کلید نمایش عضلات هدف. همه کنترل‌ها واقعی و متصل به store هستند.
 */

import {
  Gauge,
  Pause,
  Play,
  RotateCcw,
  Video,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useCoach3DStore } from "@/store/coach3d-store";
import type { CameraView } from "@/lib/fitness3d/types";
import { cn } from "@/lib/utils";

const VIEW_BUTTONS: { id: Exclude<CameraView, "free">; label: string }[] = [
  { id: "front", label: "روبه‌رو" },
  { id: "side", label: "پهلو" },
  { id: "back", label: "پشت" },
];

export function PlaybackBar() {
  const playing = useCoach3DStore((s) => s.playing);
  const togglePlay = useCoach3DStore((s) => s.togglePlay);
  const resetCycle = useCoach3DStore((s) => s.resetCycle);
  const speed = useCoach3DStore((s) => s.speed);
  const setSpeed = useCoach3DStore((s) => s.setSpeed);
  const view = useCoach3DStore((s) => s.view);
  const setView = useCoach3DStore((s) => s.setView);
  const showMuscles = useCoach3DStore((s) => s.showMuscles);
  const toggleMuscles = useCoach3DStore((s) => s.toggleMuscles);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border/50 bg-card p-3 sm:p-3.5">
      {/* پخش و بازنشانی */}
      <div className="flex items-center gap-2">
        <Button
          onClick={togglePlay}
          className={cn(
            "min-w-28 font-bold",
            !playing && "glow-lime-sm"
          )}
          aria-pressed={playing}
        >
          {playing ? (
            <>
              <Pause className="size-4" aria-hidden="true" />
              توقف
            </>
          ) : (
            <>
              <Play className="size-4" aria-hidden="true" />
              شروع حرکت
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={resetCycle}
          className="font-semibold hover:border-primary/40 hover:text-primary"
          aria-label="بازگشت به وضعیت اولیه حرکت"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          بازنشانی
        </Button>
      </div>

      <span className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden="true" />

      {/* سرعت انیمیشن */}
      <div className="flex min-w-52 flex-1 items-center gap-2.5 sm:flex-none">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Gauge className="size-4" aria-hidden="true" />
          سرعت
        </span>
        <Slider
          value={[speed]}
          min={0.5}
          max={2}
          step={0.25}
          onValueChange={([v]) => setSpeed(v)}
          className="max-w-36"
          aria-label="سرعت انیمیشن"
        />
        <span className="w-10 shrink-0 text-xs font-bold text-foreground/90">
          {speed.toLocaleString("fa-IR")}×
        </span>
      </div>

      <span className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden="true" />

      {/* نماهای دوربین */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Video className="size-4" aria-hidden="true" />
          نما:
        </span>
        {VIEW_BUTTONS.map((v) => (
          <Button
            key={v.id}
            size="sm"
            variant={view === v.id ? "default" : "outline"}
            onClick={() => setView(v.id)}
            className={cn(
              "h-8 px-3 text-xs font-semibold",
              view !== v.id && "hover:border-primary/40 hover:text-primary"
            )}
            aria-pressed={view === v.id}
          >
            {v.label}
          </Button>
        ))}
        {view === "free" && (
          <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
            چرخش آزاد
          </span>
        )}
      </div>

      <span className="hidden h-6 w-px bg-border/60 sm:block" aria-hidden="true" />

      {/* نمایش عضلات هدف */}
      <div className="flex items-center gap-2">
        <Switch
          id="show-muscles"
          checked={showMuscles}
          onCheckedChange={toggleMuscles}
          aria-label="نمایش عضلات هدف روی مدل"
        />
        <Label
          htmlFor="show-muscles"
          className="cursor-pointer text-xs font-medium text-muted-foreground"
        >
          <span className="flex items-center gap-1.5">
            {showMuscles ? (
              <Eye className="size-3.5 text-primary" aria-hidden="true" />
            ) : (
              <EyeOff className="size-3.5" aria-hidden="true" />
            )}
            عضلات هدف
          </span>
        </Label>
      </div>
    </div>
  );
}
