import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { ensureExerciseBank, getExerciseDetail } from "@/lib/exercises/bank";

/**
 * GET /api/exercises/[id] — جزئیات کامل یک حرکت از بانک عمومی (مرحله ۱۸).
 *
 * - دسترسی: کاربر دارای نشست؛ مهمان 401.
 * - «نبودن» پاسخ 404 — بدون افشای هیچ اطلاعاتی.
 * - پاسخ فقط فیلدهای مجاز است؛ metadata داخلی (datasetVersion، sourceRef،
 *   importBatchId، ownerUserId، …) هرگز برنمی‌گردد. خط منبع (sourceKey)
 *   برای نمایش شفاف «محتوای آموزشی از منبع آزاد» برمی‌گردد.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const { id } = await params;
    if (typeof id !== "string" || id.length === 0 || id.length > 96) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await ensureExerciseBank();
    const detail = getExerciseDetail(id);
    if (!detail) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ exercise: detail });
  } catch (error) {
    console.error("[exercises:GET:id]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
