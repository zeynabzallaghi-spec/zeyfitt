import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  planSettingsSchema,
  firstPlanSettingsError,
  normalizedPreferredDays,
  contentLocaleOf,
} from "@/lib/plan-engine/schema";
import { generatePlan, PlanGenerationError } from "@/lib/plan-engine/engine";
import { zodIssueCodes } from "@/lib/api-issues";
import type { PlanSettings } from "@/lib/plan-engine/types";

/**
 * POST /api/plans/preview — پیش‌نمایش برنامه بدون ذخیره.
 * همان موتور سمت سرور اجرا می‌شود؛ هیچ ردیفی نوشته نمی‌شود.
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

    const parsed = planSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "VALIDATION",
          message: firstPlanSettingsError(parsed.error),
          issues: zodIssueCodes(parsed.error),
        },
        { status: 400 }
      );
    }

    const contentLocale = contentLocaleOf(parsed.data.contentLocale);
    const settings: PlanSettings = {
      ...parsed.data,
      preferredDays: normalizedPreferredDays(parsed.data.preferredDays).slice(
        0,
        parsed.data.daysPerWeek
      ),
    };

    try {
      const plan = generatePlan(settings, contentLocale);
      return NextResponse.json({ plan, settings });
    } catch (error) {
      if (error instanceof PlanGenerationError) {
        return NextResponse.json(
          { error: "PLAN_NOT_FEASIBLE", code: error.code, message: error.message },
          { status: 422 }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[plans:preview]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
