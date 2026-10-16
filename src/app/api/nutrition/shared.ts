/**
 * توابع مشترک routeهای برنامه غذایی — استخراج اطلاعات برآورد از پروفایل
 * واقعی کاربر (نشست) با جایگزین فرم تغذیه، بدون تغییر پروفایل.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { db } from "@/lib/db";
import type { EstimateInfo } from "@/lib/nutrition-engine/types";

export interface ProfileEstimateFields {
  age: number | null;
  heightCm: number | null;
  weightKg: number | null;
  gender: string | null;
}

/** خواندن فیلدهای برآورد پروفایل کاربر جاری — بدون شناسه از مرورگر */
export async function getProfileEstimateFields(): Promise<ProfileEstimateFields> {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return { age: null, heightCm: null, weightKg: null, gender: null };
  }
  const profile = await db.fitnessProfile.findUnique({
    where: { userId: session.user.id },
    select: { age: true, heightCm: true, weightKg: true, gender: true },
  });
  return profile ?? { age: null, heightCm: null, weightKg: null, gender: null };
}

/**
 * استخراج اطلاعات برآورد — اولویت با پروفایل واقعی کاربر؛ اگر پروفایل
 * فیلد لازم را نداشت، مقدار واردشده در فرم تغذیه استفاده می‌شود
 * (فقط برای همین برنامه — پروفایل کاربر تغییر نمی‌کند).
 */
export function resolveEstimate(
  profile: ProfileEstimateFields,
  payloadEstimate: EstimateInfo | null
): EstimateInfo | null {
  if (profile.age && profile.heightCm && profile.weightKg) {
    return {
      age: profile.age,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      gender:
        profile.gender === "male" || profile.gender === "female"
          ? profile.gender
          : "undisclosed",
    };
  }
  return payloadEstimate;
}

/** فهرست کمبودهای لازم برای برآورد — برچسب‌های فارسی */
export function missingEstimateLabels(
  profile: ProfileEstimateFields,
  estimate: EstimateInfo | null
): string[] {
  const missing: string[] = [];
  if (!estimate) {
    if (!profile.age) missing.push("سن");
    if (!profile.heightCm) missing.push("قد");
    if (!profile.weightKg) missing.push("وزن");
    return missing;
  }
  if (!estimate.age || estimate.age <= 0) missing.push("سن");
  if (!estimate.heightCm || estimate.heightCm <= 0) missing.push("قد");
  if (!estimate.weightKg || estimate.weightKg <= 0) missing.push("وزن");
  return missing;
}

/** کلیدهای پایدار کمبودها — UI از این‌ها ترجمه می‌سازد، نه از متن سرور */
export function missingEstimateKeys(
  profile: ProfileEstimateFields,
  estimate: EstimateInfo | null
): string[] {
  const keys: string[] = [];
  const has = (v: number | null) => Boolean(v && v > 0);
  if (!estimate) {
    if (!has(profile.age)) keys.push("age");
    if (!has(profile.heightCm)) keys.push("heightCm");
    if (!has(profile.weightKg)) keys.push("weightKg");
    return keys;
  }
  if (!has(estimate.age)) keys.push("age");
  if (!has(estimate.heightCm)) keys.push("heightCm");
  if (!has(estimate.weightKg)) keys.push("weightKg");
  return keys;
}

/** پاسخ استاندارد کمبود اطلاعات برآورد — متن به‌علاوه کلیدهای پایدار */
export function insufficientDataResponse(missing: string[]): NextResponse {
  const ESTIMATE_LABEL_TO_KEY: Record<string, string> = {
    "سن": "age",
    "قد": "heightCm",
    "وزن": "weightKg",
  };
  return NextResponse.json(
    {
      error: "INSUFFICIENT_DATA",
      message: `برای برآورد کالری شخصی، این اطلاعات لازم است: ${missing.join("، ")}.`,
      missing,
      missingKeys: missing.map((label) => ESTIMATE_LABEL_TO_KEY[label] ?? label),
    },
    { status: 422 }
  );
}
