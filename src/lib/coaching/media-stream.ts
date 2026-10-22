/**
 * سرو استریم رسانه حرکات — مرحله ۲۰/P2 (R2.0).
 *
 * یک پاسخساز مشترک برای هر دو مسیر رسانه (حرکت شخصی مربی + بانک عمومی):
 *  - استریم واقعی با createReadStream از provider — هیچ خواندن کامل
 *    فایلی در حافظه انجام نمیشود (رفع ریسک OOM ویدئوی ۵۰MB).
 *  - Range بومی: bytes=start-end / bytes=start- / bytes=-suffix → 206 با
 *    Content-Range صحیح؛ بازه نامعتبر/نامیدنی → 416 با هدر Content-Range
 *    کامل (bytes سنجیده‌نشده از کل)؛ هدر Range خراب یا چند-بازه‌ای →
 *    نادیده (200 کامل — مطابق RFC 9110 بخش 14.2 مجاز است).
 *  - HEAD بدون بدنه با همان Content-Length.
 *  - مجوز همیشه «قبل از» هر خواندنی از فایل سنجیده میشود — دانستن
 *    شناسه/URL هیچ دسترسیای نمیسازد.
 *  - فایل مفقود روی storage → 404 امن (بدون افشای مسیر).
 */

import { NextResponse } from "next/server";
import { openExerciseMediaRange } from "@/lib/coaching/media-storage";

export interface MediaStreamTarget {
  mimeType: string;
  fileName: string;
  storagePath: string;
  /** اندازه واقعی فایل — بعد از stat بهروزرسانی میشود (declared DB اعتماد نمیشود) */
  realSize: number;
}

/** Content-Disposition امن — نام نمایشی بدون نویسههای خطرناک */
function safeInlineName(fileName: string): string {
  const cleaned = fileName.replace(/["\\\r\n]/g, " ").trim() || "file";
  const encoded = encodeURIComponent(cleaned);
  return `inline; filename="${encoded}"; filename*=UTF-8''${encoded}`;
}

const BASE_HEADERS = {
  "Accept-Ranges": "bytes",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const;

/**
 * پاسخ استریم برای GET/HEAD رسانه.
 * ورودی: متادیتای مجازشده + هدر Range خام + آیا HEAD است.
 * خروجی: 200 / 206 / 416 / 404 با هدرهای امن.
 */
export async function mediaStreamResponse(
  target: MediaStreamTarget,
  rangeHeader: string | null,
  isHead: boolean
): Promise<NextResponse> {
  const total = target.realSize;
  if (total <= 0) {
    // فایل خالی/خراب روی storage — پاسخ امن 404
    return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": target.mimeType,
    "Content-Disposition": safeInlineName(target.fileName),
    ...BASE_HEADERS,
  });

  // --- تحلیل Range (فقط تک-بازه) ---
  let range: { start: number; end: number } | null = null;
  let unsatisfiable = false;
  if (rangeHeader && /^bytes=/.test(rangeHeader)) {
    const spec = rangeHeader.slice("bytes=".length).trim();
    const single = /^[0-9]*-[0-9]*$/.test(spec);
    if (single) {
      const [startRaw, endRaw] = spec.split("-");
      if (startRaw === "" && endRaw === "") {
        // «bytes=-» ناقص — نادیده (200 کامل)
      } else if (startRaw === "") {
        // suffix: آخرین N بایت
        const suffix = parseInt(endRaw, 10);
        if (suffix === 0) {
          unsatisfiable = true;
        } else {
          const start = Math.max(0, total - suffix);
          range = { start, end: total - 1 };
        }
      } else {
        const start = parseInt(startRaw, 10);
        const end = endRaw === "" ? total - 1 : parseInt(endRaw, 10);
        if (start >= total) {
          unsatisfiable = true;
        } else {
          range = { start, end: Math.min(end, total - 1) };
        }
      }
    }
    // چند-بازه/خراب → range=null میماند → 200 کامل (نادیده گرفتن Range)
  }

  if (unsatisfiable) {
    return new NextResponse(null, {
      status: 416,
      headers: { "Content-Range": `bytes */${total}` },
    });
  }

  if (range) {
    if (range.start > range.end) {
      return new NextResponse(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${total}` },
      });
    }
    const stream = await openExerciseMediaRange(
      target.storagePath,
      range.start,
      range.end
    );
    if (!stream) {
      return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
    }
    const length = range.end - range.start + 1;
    headers.set("Content-Range", `bytes ${range.start}-${range.end}/${total}`);
    headers.set("Content-Length", String(length));
    return new NextResponse(isHead ? null : (stream as unknown as BodyInit), {
      status: 206,
      headers,
    });
  }

  // --- پاسخ کامل 200 — GET: جریان واقعی کل فایل؛ HEAD: فقط هدر ---
  if (isHead) {
    headers.set("Content-Length", String(total));
    return new NextResponse(null, { status: 200, headers });
  }
  const stream = await openExerciseMediaRange(target.storagePath, 0, total - 1);
  if (!stream) {
    return NextResponse.json({ error: "MEDIA_NOT_FOUND" }, { status: 404 });
  }
  headers.set("Content-Length", String(total));
  return new NextResponse(stream as unknown as BodyInit, {
    status: 200,
    headers,
  });
}
