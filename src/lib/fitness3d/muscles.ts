/**
 * تعریف ۱۲ گروه عضلانی پشتیبانی‌شده — منبع واحد حقیقت برای نام‌ها و شناسه‌ها.
 * هر گروه روی مدل به یک یا دو مش (سمت چپ و راست) نگاشت می‌شود.
 */

import type { MuscleGroupId } from "./types";

export interface MuscleGroupDef {
  id: MuscleGroupId;
  fa: string;
  en: string;
}

export const MUSCLE_GROUPS: MuscleGroupDef[] = [
  { id: "chest", fa: "سینه", en: "Chest" },
  { id: "shoulders", fa: "سرشانه", en: "Shoulders" },
  { id: "biceps", fa: "جلو بازو", en: "Biceps" },
  { id: "triceps", fa: "پشت بازو", en: "Triceps" },
  { id: "forearms", fa: "ساعد", en: "Forearms" },
  { id: "abs", fa: "شکم", en: "Abs" },
  { id: "back", fa: "زیربغل و پشت", en: "Back" },
  { id: "traps", fa: "ذوزنقه‌ای (کول)", en: "Traps" },
  { id: "glutes", fa: "سرینی", en: "Glutes" },
  { id: "quads", fa: "چهارسر ران", en: "Quadriceps" },
  { id: "hamstrings", fa: "همسترینگ", en: "Hamstrings" },
  { id: "calves", fa: "ساق پا", en: "Calves" },
];

const MUSCLE_MAP = new Map(MUSCLE_GROUPS.map((m) => [m.id, m]));

export function muscleFa(id: MuscleGroupId): string {
  return MUSCLE_MAP.get(id)?.fa ?? id;
}

export function muscleEn(id: MuscleGroupId): string {
  return MUSCLE_MAP.get(id)?.en ?? id;
}
