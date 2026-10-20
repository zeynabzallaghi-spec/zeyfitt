import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireCoach,
} from "@/lib/coaching/server";
import {
  deleteCoachExerciseMedia,
  readExerciseMediaForOwner,
} from "@/lib/coaching/coach-exercises";

type Params = { params: Promise<{ mediaId: string }> };

/**
 * GET /api/coach/exercises/media/[mediaId] — بایت‌های رسانه حرکت شخصی.
 * فقط مالک؛ «مالک دیگر» و «ناموجود» هر دو 404. پشتیبانی Range برای پخش
 * ویدئو (206). Content-Disposition امن؛ no-store + nosniff.
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { mediaId } = await params;
    const media = await readExerciseMediaForOwner(coach.id, mediaId);
    if (!media) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    const safeName = media.fileName.replace(/["\\\r\n]/g, " ").trim() || "file";
    const total = media.bytes.byteLength;
    const range = request.headers.get("range");
    if (range && /^bytes=(\d*)-(\d*)$/.test(range)) {
      const [, startRaw, endRaw] = /^bytes=(\d*)-(\d*)$/.exec(range)!;
      let start = startRaw ? parseInt(startRaw, 10) : 0;
      let end = endRaw ? parseInt(endRaw, 10) : total - 1;
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= total) {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${total}` },
        });
      }
      end = Math.min(end, total - 1);
      const slice = media.bytes.slice(start, end + 1);
      return new NextResponse(slice as unknown as BodyInit, {
        status: 206,
        headers: {
          "Content-Type": media.mimeType,
          "Content-Length": String(slice.byteLength),
          "Content-Range": `bytes ${start}-${end}/${total}`,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    return new NextResponse(media.bytes as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": media.mimeType,
        "Content-Length": String(total),
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeName)}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

/** DELETE — حذف رسانه حرکت شخصی (فایل دیسک هم پاک میشود) */
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const coach = await requireCoach();
    const { mediaId } = await params;
    const result = await deleteCoachExerciseMedia(coach.id, mediaId);
    if (result === null) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
