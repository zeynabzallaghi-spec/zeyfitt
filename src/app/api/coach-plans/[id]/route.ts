import { NextResponse } from "next/server";
import { coachingErrorResponse, requireUser } from "@/lib/coaching/server";
import { getDeliveryForUser } from "@/lib/coaching/plans";

type Params = { params: Promise<{ id: string }> };

/**
 * GET /api/coach-plans/[id] — جزئیات یک نسخه ارسال‌شده.
 * فقط دانشجوی گیرنده یا مربی مالک؛ بقیه (شامل مربی دیگر) 404 یکسان می‌گیرند.
 * وضعیت فعلی ارتباط مبنا همراه پاسخ می‌آید تا پیام پایان ارتباط شفاف باشد.
 */
export async function GET(_request: Request, { params }: Params) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const delivery = await getDeliveryForUser(id, user);
    if (!delivery) {
      return NextResponse.json({ error: "DELIVERY_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ delivery });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
