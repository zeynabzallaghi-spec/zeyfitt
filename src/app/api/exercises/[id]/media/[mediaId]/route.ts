import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/session";
import { getBankExerciseMediaForStream } from "@/lib/exercises/bank-media";
import { exerciseMediaSize } from "@/lib/coaching/media-storage";
import { mediaStreamResponse } from "@/lib/coaching/media-stream";

type Params = { params: Promise<{ mediaId: string }> };

/**
 * GET /api/exercises/[id]/media/[mediaId] — سرو استریم رسانه رکورد بانک.
 * مرحله ۲۰/P2 (R2.3): هر کاربر دارای نشست (قاعده دید بانک عمومی)؛
 * استریم واقعی + Range/HEAD؛ فایل مفقود/رکورد غیرفعال → 404 امن.
 * دانستن شناسه بدون نشست هیچ دسترسیای نمیسازد (مهمان 401).
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { mediaId } = await params;
    const target = await getBankExerciseMediaForStream(mediaId);
    if (!target) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    const realSize = await exerciseMediaSize(target.storagePath);
    if (realSize === null) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    return await mediaStreamResponse(
      { ...target, realSize },
      request.headers.get("range"),
      false
    );
  } catch (error) {
    console.error("[exercises:GET:media:bytes]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/** HEAD — همان مجوز؛ بدون بدنه */
export async function HEAD(request: Request, { params }: Params) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return new NextResponse(null, { status: 401 });
    }
    const { mediaId } = await params;
    const target = await getBankExerciseMediaForStream(mediaId);
    if (!target) {
      return new NextResponse(null, { status: 404 });
    }
    const realSize = await exerciseMediaSize(target.storagePath);
    if (realSize === null) {
      return new NextResponse(null, { status: 404 });
    }
    return await mediaStreamResponse(
      { ...target, realSize },
      request.headers.get("range"),
      true
    );
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
