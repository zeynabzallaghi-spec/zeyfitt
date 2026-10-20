import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  requireAdmin,
} from "@/lib/coaching/server";
import { adminUsersQuerySchema } from "@/lib/admin/schemas";
import { adminUsersList } from "@/lib/admin/service";

/**
 * GET /api/admin/users — فهرست کاربران با جست‌وجو و فیلتر نقش.
 * فقط ADMIN. خروجی whitelist: بدون hash رمز، توکن یا metadata حساس.
 */
export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const rawQuery = {
      // مقدار خالی = پارامتر ارسالنشده (رفتار فیلتر کلاینت)
      q: url.searchParams.get("q")?.trim() || undefined,
      role: url.searchParams.get("role") || undefined,
      page: url.searchParams.get("page") ?? undefined,
    };
    const query = parseWithSchema(adminUsersQuerySchema, rawQuery);
    const pageRaw = Number(rawQuery.page ?? "1");
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 && pageRaw <= 1000 ? pageRaw : 1;
    const result = await adminUsersList(query.q, query.role, page);
    return NextResponse.json(result);
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}
