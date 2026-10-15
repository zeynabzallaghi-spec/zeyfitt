import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  nutritionSettingsSchema,
  firstNutritionSettingsError,
} from "@/lib/nutrition-engine/schema";
import {
  computeNutritionTargets,
  generateNutritionPlan,
  NutritionPlanError,
} from "@/lib/nutrition-engine";
import type { NutritionSettings } from "@/lib/nutrition-engine/types";
import {
  getProfileEstimateFields,
  resolveEstimate,
  missingEstimateLabels,
  insufficientDataResponse,
} from "../shared";

/**
 * POST /api/nutrition/preview — ساخت پیش‌نمایش برنامه بدون ذخیره.
 * خروجی فقط برای نمایش است؛ هیچ ردیفی در پایگاه داده نوشته نمی‌شود.
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
        { error: "VALIDATION", message: firstNutritionSettingsError(parsed.error) },
        { status: 400 }
      );
    }

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
      settings.pregnancyBreastfeeding
    );
    if (targets.status === "insufficient_data") {
      return insufficientDataResponse(targets.missingLabels);
    }

    try {
      const plan = generateNutritionPlan(settings, targets.snapshot);
      return NextResponse.json({ plan });
    } catch (error) {
      if (error instanceof NutritionPlanError) {
        return NextResponse.json(
          { error: "PLAN_NOT_FEASIBLE", message: error.message },
          { status: 422 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[nutrition:preview]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
