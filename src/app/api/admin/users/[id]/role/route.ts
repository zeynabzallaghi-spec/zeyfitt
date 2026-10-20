import { NextResponse } from "next/server";
import {
  coachingErrorResponse,
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireAdmin,
} from "@/lib/coaching/server";
import { adminRoleSchema } from "@/lib/admin/schemas";
import { adminSetRole } from "@/lib/admin/service";

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/users/[id]/role — تغییر نقش کاربر.
 * فقط ADMIN (از دیتابیس تازه). ادمین نمی‌تواند نقش خودش را عوض کند
 * (409 ADMIN_SELF_ROLE_FORBIDDEN) و آخرین ادمین قابل تنزل نیست
 * (409 LAST_ADMIN_FORBIDDEN). هر تغییر در AdminActionLog ثبت می‌شود.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await readJsonBody(request);
    const input = parseWithSchema(adminRoleSchema, body);
    const updated = await adminSetRole(admin.id, id, input.role);
    return NextResponse.json({ user: updated });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}
