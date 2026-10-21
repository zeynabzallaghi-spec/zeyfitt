import { NextResponse } from "next/server";
import { coachingErrorResponse, requireUser } from "@/lib/coaching/server";
import { searchPeople } from "@/lib/dm";

/**
 * GET /api/dm/users?q=... — جست‌وجوی افراد برای شروع گفتگو.
 * فقط نام و نقش (بدون ایمیل/داده خصوصی)؛ خود کاربر حذف؛ حداقل ۲ حرف.
 */
export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    const people = await searchPeople(user.id, q);
    return NextResponse.json({ people });
  } catch (error) {
    return coachingErrorResponse(error);
  }
}

export const dynamic = "force-dynamic";
