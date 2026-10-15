import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { foodLogDateParamSchema } from "@/lib/foodlog/schema";
import {
  listDayFoodLogs,
  dayTotalsOf,
  buildTrend,
  buildPlanComparison,
} from "@/lib/foodlog/storage";

/**
 * GET /api/food-logs/summary?date=YYYY-MM-DD — خلاصه تغذیه روزانه شامل:
 * جمع واقعی روز، مقایسه با برنامه فعال (در صورت وجود) و روند ۷ روزه.
 *
 * قواعد صادقانگی:
 *  - روز بدون ثبت hasLogs=false دارد و با روز «مصرف صفر» یکی گرفته نمی‌شود.
 *  - مقایسه فقط وقتی available=true است که برنامه فعال واقعی وجود داشته باشد.
 *  - این خلاصه گزارش داده ثبت‌شده است؛ ادعای پایبندی یا نتیجه جسمانی نیست.
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
    const localDay = parsedDate.data;
    const userId = session.user.id;

    const rows = await listDayFoodLogs(userId, localDay);
    const [totals, comparison, trend] = await Promise.all([
      Promise.resolve(dayTotalsOf(localDay, rows)),
      buildPlanComparison(userId, localDay, rows),
      buildTrend(userId, localDay, 7),
    ]);

    return NextResponse.json({ date: localDay, totals, comparison, trend });
  } catch (error) {
    console.error("[food-logs:summary]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
