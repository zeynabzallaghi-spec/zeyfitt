/**
 * رجیستری الگوهای حرکتی — نقطه دسترسی یکپارچه (مرحله ۱۹).
 *
 * getProfile(id) الگوی پارامتری را برمی‌گرداند؛ buildFromMapping با
 * اعتبارسنجی پارامترها چرخه کلیدفریم می‌سازد. هیچ fallback پنهانی
 * وجود ندارد: الگوی ناشناخته یا پارامتر نامعتبر خطا می‌دهد تا حرکتی
 * تصادفی به انیمیشن نامرتبط وصل نشود.
 */

import type { BuiltCycle, MovementProfile, ProfileParams, ProfileParamSpec } from "./core";
import { LOWER_BODY_PROFILES } from "./lower-body";
import { PUSH_PROFILES } from "./upper-push";
import { PULL_ARM_PROFILES } from "./upper-pull";
import { CORE_PROFILES } from "./core-body";
import { MOBILITY_CARDIO_PROFILES } from "./mobility";

export const ALL_PROFILES: MovementProfile[] = [
  ...LOWER_BODY_PROFILES,
  ...PUSH_PROFILES,
  ...PULL_ARM_PROFILES,
  ...CORE_PROFILES,
  ...MOBILITY_CARDIO_PROFILES,
];

const PROFILE_MAP = new Map<string, MovementProfile>(ALL_PROFILES.map((p) => [p.id, p]));

export function getProfile(id: string): MovementProfile | undefined {
  return PROFILE_MAP.get(id);
}

export function hasProfile(id: string): boolean {
  return PROFILE_MAP.has(id);
}

/** خطای نگاشت سه‌بعدی — با پیام شفاف برای گزارش و رابط */
export class ProfileResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileResolutionError";
  }
}

/**
 * ساخت چرخه از نگاشت ذخیره‌شده — تنها مسیر مجاز تبدیل
 * profileId+params به چرخه کلیدفریم.
 * خطا: الگوی ناشناخته، پارامتر غیرشیء، خروجی نامعتبر.
 */
export function buildFromMapping(profileId: string, params: ProfileParams | null | undefined): BuiltCycle {
  const profile = PROFILE_MAP.get(profileId);
  if (!profile) {
    throw new ProfileResolutionError(`UNKNOWN_PROFILE:${profileId}`);
  }
  let safeParams: ProfileParams = {};
  if (params !== null && params !== undefined) {
    if (typeof params !== "object" || Array.isArray(params)) {
      throw new ProfileResolutionError(`INVALID_PARAMS:${profileId}`);
    }
    // فقط کلیدهای اعلان‌شده الگو پذیرفته می‌شوند (ضد mass assignment)
    const specKeys = new Set(profile.params.map((s) => s.key));
    for (const [k, v] of Object.entries(params)) {
      if (specKeys.has(k)) safeParams[k] = v as ProfileParams[string];
    }
  }
  const built = profile.build(safeParams);
  validateBuilt(built, profileId);
  return built;
}

/** اعتبارسنجی خروجی هر الگو — همیشه قبل از رسیدن به صحنه اجرا می‌شود */
export function validateBuilt(built: BuiltCycle, profileId: string): void {
  if (!built || !Array.isArray(built.cycle) || built.cycle.length < 2) {
    throw new ProfileResolutionError(`EMPTY_CYCLE:${profileId}`);
  }
  for (const kf of built.cycle) {
    if (typeof kf.duration !== "number" || !(kf.duration > 0)) {
      throw new ProfileResolutionError(`BAD_DURATION:${profileId}:${kf.name}`);
    }
    if (typeof kf.name !== "string" || kf.name.length === 0) {
      throw new ProfileResolutionError(`BAD_PHASE_NAME:${profileId}`);
    }
  }
  if (built.counterMode !== "reps" && built.counterMode !== "hold") {
    throw new ProfileResolutionError(`BAD_COUNTER_MODE:${profileId}`);
  }
}

/** فهرست شناسه همه الگوها — برای ابزار اعتبارسنجی و گزارش */
export function allProfileIds(): string[] {
  return ALL_PROFILES.map((p) => p.id);
}

/** فهرست پارامترهای یک الگو — برای مستندسازی نگاشت */
export function profileParamsSpec(id: string): ProfileParamSpec[] {
  return PROFILE_MAP.get(id)?.params ?? [];
}

export type { BuiltCycle, MovementProfile, ProfileParams, ProfileParamSpec };
export { numParam, enumParam } from "./core";
