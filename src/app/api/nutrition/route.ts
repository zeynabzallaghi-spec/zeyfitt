import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  nutritionSettingsSchema,
  firstNutritionSettingsError,
  contentLocaleOf,
} from "@/lib/nutrition-engine/schema";
import {
  computeNutritionTargets,
  generateNutritionPlan,
  NutritionPlanError,
} from "@/lib/nutrition-engine";
import { zodIssueCodes } from "@/lib/api-issues";
import type { NutritionSettings } from "@/lib/nutrition-engine/types";
import {
  listUserNutritionPlans,
  saveGeneratedNutritionPlan,
} from "@/lib/nutrition-storage";
import {
  getProfileEstimateFields,
  resolveEstimate,
  missingEstimateLabels,
  insufficientDataResponse,
} from "./shared";

/**
 * GET /api/nutrition — فهرست برنامه‌های غذایی کاربر جاری (از نشست). بدون نشست: 401.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const plans = await listUserNutritionPlans(session.user.id);
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("[nutrition:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * POST /api/nutrition — ساخت و ذخیره برنامه غذایی از تنظیمات معتبر.
 * موتور سمت سرور اجرا می‌شود؛ مالکیت فقط از نشست؛ userId هرگز از کلاینت.
 * فعال‌سازی برنامه جدید، برنامه‌های فعال قبلی را بایگانی می‌کند.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = nutritionSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION",
          message: firstNutritionSettingsError(parsed.error),
          issues: zodIssueCodes(parsed.error),
        },
        { status: 400 }
      );
    }

    // زبان تولید محتوا — انتخاب صریح کلاینت (زبان رابط) با پیش‌فرض امن
    const contentLocale = contentLocaleOf(parsed.data.contentLocale);

    // اطلاعات برآورد: اولویت با پروفایل واقعی؛ در نبود آن، مقدار فرم تغذیه
    const profile = await getProfileEstimateFields();
    const estimate = resolveEstimate(profile, parsed.data.estimate);
    const missing = missingEstimateLabels(profile, estimate);
    if (!estimate || missing.length > 0) {
      return insufficientDataResponse(missing);
    }

    const settings: NutritionSettings = { ...parsed.data, estimate };

    const targets = computeNutritionTargets(
      estimate,
      settings.goal,
      settings.activityLevel,
      settings.pregnancyBreastfeeding,
      contentLocale
    );
    if (targets.status === "insufficient_data") {
      return insufficientDataResponse(targets.missingLabels);
    }

    let plan;
    try {
      plan = generateNutritionPlan(settings, targets.snapshot, contentLocale);
    } catch (error) {
      if (error instanceof NutritionPlanError) {
        return NextResponse.json(
          { error: "PLAN_NOT_FEASIBLE", code: error.code, params: error.params, message: error.message },
          { status: 422 }
        );
      }
      throw error;
    }

    const saved = await saveGeneratedNutritionPlan(session.user.id, settings, plan, contentLocale);
    return NextResponse.json({ plan: saved }, { status: 201 });
  } catch (error) {
    console.error("[nutrition:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
