import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { updateFoodLogSchema, firstFoodLogError } from "@/lib/foodlog/schema";
import { FoodLogDomainError, updateFoodLog, deleteFoodLog } from "@/lib/foodlog/storage";

/**
 * PATCH /api/food-logs/[id] — ویرایش ثبت خود کاربر (مقدار/واحد/وعده/زمان).
 * «نبودن» و «مالک دیگر» هر دو 404 یکسان و بدون افشای داده.
 * بازمحاسبه مقادیر فقط از snapshot خود رکورد انجام می‌شود.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = updateFoodLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "VALIDATION", message: firstFoodLogError(parsed.error) },
        { status: 400 }
      );
    }

    try {
      const updated = await updateFoodLog(session.user.id, id, parsed.data);
      if (!updated) {
        return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
      }
      return NextResponse.json({ log: updated });
    } catch (error) {
      if (error instanceof FoodLogDomainError) {
        return NextResponse.json({ error: error.code, message: error.code }, { status: 400 });
      }
      throw error;
    }
  } catch (error) {
    console.error("[food-logs:PATCH]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * DELETE /api/food-logs/[id] — حذف ثبت خود کاربر. پاسخ «نبودن» و «مالک
 * دیگر» یکسان است. حذف برنامه غذایی هرگز به این مسیر مربوط نیست؛ ثبت‌های
 * واقعی پس از حذف برنامه باقی می‌مانند (SetNull).
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    const deleted = await deleteFoodLog(session.user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[food-logs:DELETE]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
