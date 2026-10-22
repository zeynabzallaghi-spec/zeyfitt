import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  requireAdmin,
} from "@/lib/coaching/server";
import { addBankExerciseMedia } from "@/lib/exercises/bank-media";
import { CoachingError } from "@/lib/coaching/constants";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/exercises/[id]/media — آپلود رسانه رکورد بانک عمومی.
 * مرحله ۲۰/P2 (R2.3): فقط ادمین، فقط رکورد origin=core فعال. multipart
 * با فیلد file؛ امضای بایت + سقف حجم/تعداد سمت سرور. ویدئوی مشارکت
 * مربی عمداً اینجا نیست (P3 — گردش کار انتشار).
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      throw new CoachingError(400, "VALIDATION");
    }
    const form = await request.formData().catch(() => {
      throw new CoachingError(400, "VALIDATION");
    });
    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new CoachingError(400, "VALIDATION");
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const media = await addBankExerciseMedia(admin.role, id, {
      name: file.name,
      declaredType: file.type,
      bytes,
    });
    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
