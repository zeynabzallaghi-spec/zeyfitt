import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import {
  createFoodLogSchema,
  foodLogDateParamSchema,
  firstFoodLogError,
} from "@/lib/foodlog/schema";
import { FoodLogDomainError } from "@/lib/foodlog/storage";
import {
  createFoodLog,
  listDayFoodLogs,
  dayTotalsOf,
  toClientLog,
} from "@/lib/foodlog/storage";

/**
 * GET /api/food-logs?date=YYYY-MM-DD — ثبت‌های یک روز و جمع آن روز.
 * روز با زمان رسمی ایران تعیین می‌شود؛ مهمان 401.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const url = new URL(request.url);
    const dateParam = url.searchParams.get("date") ?? "";
    const parsedDate = foodLogDateParamSchema.safeParse(dateParam);
    if (!parsedDate.success) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const rows = await listDayFoodLogs(session.user.id, parsedDate.data);
    return NextResponse.json({
      date: parsedDate.data,
      logs: rows.map(toClientLog),
      totals: dayTotalsOf(parsedDate.data, rows),
    });
  } catch (error) {
    console.error("[food-logs:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * POST /api/food-logs — ساخت ثبت مصرف واقعی با اقدام صریح کاربر.
 * مقادیر تغذیه‌ای فقط سمت سرور محاسبه می‌شوند؛ هیچ مقداری از مرورگر
 * پذیرفته نیست. تکرار همان clientRequestId همان ثبت را برمی‌گرداند.
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

    const parsed = createFoodLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstFoodLogError(parsed.error) },
        { status: 400 }
      );
    }

    try {
      const result = await createFoodLog(session.user.id, parsed.data);
      return NextResponse.json(
        { log: result.log, replayed: result.replayed },
        { status: result.replayed ? 200 : 201 }
      );
    } catch (error) {
      if (error instanceof FoodLogDomainError) {
        const status =
          error.code === "FOOD_NOT_FOUND" || error.code === "PLAN_ITEM_NOT_FOUND" ? 404 : 400;
        return NextResponse.json(
          { error: error.code, message: error.code },
          { status }
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[food-logs:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
