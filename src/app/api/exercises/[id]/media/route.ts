import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { listBankExerciseMedia } from "@/lib/exercises/bank-media";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/exercises/[id]/media — فهرست رسانههای رکورد بانک عمومی.
 * مرحله ۲۰/P2 (R2.3): هر کاربر دارای نشست (همان قواعد دید بانک عمومی)؛
 * مهمان 401؛ رکورد ناموجود/غیرفعال 404. خروجی فقط whitelist.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await params;
    if (typeof id !== "string" || id.length === 0 || id.length > 96) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    const media = await listBankExerciseMedia(id);
    return NextResponse.json({ media });
  } catch (error) {
    console.error("[exercises:GET:media]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
