import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireAdmin,
} from "@/lib/coaching/server";
import { adminSubscriptionSchema } from "@/lib/admin/schemas";
import { adminSetSubscription } from "@/lib/admin/service";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/users/[id]/subscription — اعطا/لغو دستی اشتراک.
 * فقط ADMIN. فقط برای STUDENT (409 SUBSCRIPTION_STUDENT_ONLY) — همان
 * معناشناسی ابزار مدیریتی قبلی با ثبت کامل در AdminActionLog.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(adminSubscriptionSchema, body);
    if (input.tier === "PREMIUM" && input.days === undefined) {
      return NextResponse.json(
        { error: "VALIDATION", message: "days-required" },
        { status: 400 }
      );
    }
    const row = await adminSetSubscription(
      admin.id,
      id,
      input.tier,
      input.days ?? null,
      input.note
    );
    return NextResponse.json({ subscription: row });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}
