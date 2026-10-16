import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  planSettingsSchema,
  firstPlanSettingsError,
  normalizedPreferredDays,
  contentLocaleOf,
} from "@/lib/plan-engine/schema";
import { generatePlan, PlanGenerationError } from "@/lib/plan-engine/engine";
import { listUserPlans, saveGeneratedPlan } from "@/lib/plan-storage";
import { zodIssueCodes } from "@/lib/api-issues";
import type { PlanSettings } from "@/lib/plan-engine/types";

/**
 * GET /api/plans — فهرست برنامه‌های کاربر جاری (از نشست). بدون نشست: 401.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const plans = await listUserPlans(session.user.id);
    return NextResponse.json({ plans });
  } catch (error) {
    console.error("[plans:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * POST /api/plans — ساخت و ذخیره برنامه از تنظیمات معتبر.
 * موتور برنامه‌سازی سمت سرور اجرا می‌شود؛ مالکیت فقط از نشست.
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

    // زبان تولید محتوا — انتخاب صریح کلاینت (زبان رابط) با پیش‌فرض امن
    const contentLocale = contentLocaleOf(parsed.data.contentLocale);
    const settings: PlanSettings = {
      ...parsed.data,
      preferredDays: normalizedPreferredDays(parsed.data.preferredDays).slice(
        0,
        parsed.data.daysPerWeek
      ),
    };

    let plan;
    try {
      plan = generatePlan(settings, contentLocale);
    } catch (error) {
      if (error instanceof PlanGenerationError) {
        return NextResponse.json(
          { error: "PLAN_NOT_FEASIBLE", code: error.code, message: error.message },
          { status: 422 }
        );
      }
      throw error;
    }

    const saved = await saveGeneratedPlan(session.user.id, settings, plan, contentLocale);
    return NextResponse.json({ plan: saved }, { status: 201 });
  } catch (error) {
    console.error("[plans:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
