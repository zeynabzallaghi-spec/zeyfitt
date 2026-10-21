import { NextResponse } from "next/server";
import { coachingErrorResponse, coachingErrorResponseWithSchema, readJsonBody, requireUser } from "@/lib/coaching/server";
import { findOrCreateDirectThread, listDirectThreads } from "@/lib/dm";

/**
 * GET /api/dm/threads — فهرست رشته‌های گفتگوی آزاد من (مرحله ۲۰، بخش ۲).
 * POST { userId } — یافتن‌یا‌ساختن رشته با کاربر دیگر (خود → 400).
 */
export async function GET() {
  try {
    const user = await requireUser();
    const threads = await listDirectThreads(user.id);
    return NextResponse.json({ threads });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const targetUserId =
      typeof body === "object" && body !== null && typeof (body as { userId?: unknown }).userId === "string"
        ? (body as { userId: string }).userId
        : "";
    const thread = await findOrCreateDirectThread(user.id, targetUserId);
    return NextResponse.json({ thread }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
