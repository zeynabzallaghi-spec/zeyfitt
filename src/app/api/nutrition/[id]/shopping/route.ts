import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { parseShoppingDaysParam } from "@/lib/nutrition-engine/schema";
import { findOwnedNutritionPlan, buildShoppingList } from "@/lib/nutrition-storage";

/**
 * GET /api/nutrition/[id]/shopping?days=1,3,5 — فهرست خرید تجمیعی از
 * روزهای انتخابی برنامه (بدون پارامتر یا «all» = همه روزها).
 * تجمیع فقط برای هم‌شناسه‌ها با واحد سازگار انجام می‌شود (همه گرم‌اند).
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await params;
    const plan = await findOwnedNutritionPlan(id, session.user.id);
    if (!plan) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseShoppingDaysParam(searchParams.get("days"), plan.planLength);
    if (!days) {
      return NextResponse.json(
        { error: "VALIDATION", message: "روزهای انتخابی نامعتبر است." },
        { status: 400 }
      );
    }

    const items = buildShoppingList(plan, days);
    return NextResponse.json({ items, days });
  } catch (error) {
    console.error("[nutrition:shopping]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
