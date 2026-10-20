"use client";

/**
 * جزئیات حرکت انتخاب‌شده — وضعیت شروع، مراحل اجرا، اشتباهات رایج،
 * تجهیزات، مفاصل درگیر و نکته مربی.
 *
 * همه متن‌های قابل مشاهده از دیکشنری متمرکز src/lib/i18n/sections/coach3d.ts
 * می‌آیند؛ محتوای آموزشی و برچسب‌های داده (تجهیزات، مفاصل، عضلات) با نقشه‌های
 * نمایشی دیکشنری به زبان رابط ترجمه می‌شوند و داده لایه سه‌بعدی دست‌نخورده است.
 */

import { AlertTriangle, CheckCircle2, Lightbulb, ListChecks, Wrench, XCircle } from "lucide-react";

import { useCoach3DStore } from "@/store/coach3d-store";
import { useLocale } from "@/lib/i18n/locale";
import { localeNumber } from "@/lib/i18n/format";
import { useStrings } from "@/lib/i18n/use-strings";
import { coach3DStrings } from "@/lib/i18n/sections/coach3d";

export function ExerciseDetails() {
  const scene = useCoach3DStore((s) => s.scene);
  const exercise = scene.def;
  const t = useStrings(coach3DStrings);
  const locale = useLocale();
  const content = t.exerciseContent(exercise.id);
  const name = t.exerciseName(exercise.fa, exercise.en);
  // حرکات پارامتری (۹۰۵) محتوای آموزشی استاتیک ندارند — به‌جای بخش‌های
  // خالی، کارت اطلاعات الگو + راهنمای ارجاع به کتابخانه نمایش داده می‌شود
  const hasStaticContent =
    content.startPosition.length > 0 || content.steps.length > 0 || content.mistakes.length > 0;

  return (
    <section aria-label={t.detailsAria(name)} className="rounded-2xl border border-border/60 bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-bold">
          <ListChecks className="size-4 text-primary" aria-hidden="true" />
          {t.guideTitle(name)}
        </h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {exercise.equipment.map((eq) => (
            <span key={eq} className="flex items-center gap-1 rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              <Wrench className="size-3" aria-hidden="true" />
              {t.equipmentLabel(eq)}
            </span>
          ))}
        </div>
      </div>

      {!hasStaticContent && (
        <div className="mt-4 grid gap-3 text-xs leading-6 text-muted-foreground md:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            <p className="font-bold text-foreground/85">{t.patternInfoTitle}</p>
            <p className="mt-1.5">
              {t.counterModeLabel(scene.counterMode === "hold")}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground/70" dir="ltr">
              {scene.profileId ? `profile: ${scene.profileId}` : "legacy animation"}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-secondary/30 p-3">
            <p className="font-bold text-foreground/85">{t.contentRefTitle}</p>
            <p className="mt-1.5">{t.contentRefBody}</p>
            {(scene.honestyNote || scene.honestyNoteEn) && (
              <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/5 p-2 text-[10px] leading-5 text-amber-200/80">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                {locale === "fa" ? scene.honestyNote : scene.honestyNoteEn ?? scene.honestyNote}
              </p>
            )}
          </div>
        </div>
      )}

      {hasStaticContent && (
      <div className="mt-4 grid gap-5 lg:grid-cols-3">
        {/* وضعیت شروع + مفاصل */}
        <div className="flex flex-col gap-4">
          <div>
            <h4 className="text-xs font-bold text-foreground/85">{t.startPositionTitle}</h4>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">{content.startPosition}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground/85">{t.jointsTitle}</h4>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exercise.jointsInvolved.map((j) => (
                <span key={j} className="rounded-md border border-border/50 bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {t.jointLabel(j)}
                </span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground/85">{t.targetMusclesLabel}</h4>
            <p className="mt-2 text-xs leading-6 text-muted-foreground">
              <span className="font-bold text-primary">
                {t.muscleList(exercise.primaryMuscles)}
              </span>
              {" — "}
              {t.muscleList(exercise.secondaryMuscles)} {t.secondaryMusclesSuffix}
            </p>
          </div>
        </div>

        {/* مراحل اجرا */}
        <div>
          <h4 className="text-xs font-bold text-foreground/85">{t.stepsTitle}</h4>
          <ol className="mt-2 flex flex-col gap-2.5">
            {content.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-[10px] font-extrabold text-primary">
                  {localeNumber(i + 1, locale)}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-[11px] leading-5 text-foreground/80">
            <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {content.tip}
          </p>
        </div>

        {/* اشتباهات رایج */}
        <div>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-foreground/85">
            <AlertTriangle className="size-3.5 text-amber-400" aria-hidden="true" />
            {t.mistakesTitle}
          </h4>
          <ul className="mt-2 flex flex-col gap-2">
            {content.mistakes.map((mistake, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-6 text-muted-foreground">
                <XCircle className="mt-1 size-3.5 shrink-0 text-rose-400/80" aria-hidden="true" />
                {mistake}
              </li>
            ))}
          </ul>
          {content.honestyNote && (
            <p className="mt-3 flex items-start gap-1.5 rounded-lg border border-amber-400/25 bg-amber-400/5 p-2.5 text-[10px] leading-5 text-amber-200/80">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-amber-400" aria-hidden="true" />
              {content.honestyNote}
            </p>
          )}
        </div>
      </div>
      )}
    </section>
  );
}
