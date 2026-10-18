import { NextResponse } from "next/server";
import { USER_ROLES, type CooperationType } from "@/lib/coaching/constants";
import {
  coachingErrorResponseWithSchema,
  parseWithSchema,
  readJsonBody,
  requireUser,
} from "@/lib/coaching/server";
import { createConnectionRequestSchema } from "@/lib/coaching/schemas";
import {
  createConnectionRequest,
  listStudentConnections,
} from "@/lib/coaching/connections";

/**
 * POST /api/coach-connections — ارسال درخواست ارتباط توسط دانشجو.
 * مجوزها همه سمت سرور: نقش STUDENT + اشتراک PREMIUM مؤثر + مربی واجد
 * شرط + نوع همکاری ارائهشده + ضدتکرار + ضداسپم. studentId فقط از نشست.
 */
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await readJsonBody(request);
    const input = parseWithSchema(createConnectionRequestSchema, body);
    const connection = await createConnectionRequest({
      studentId: user.id,
      studentRole: user.role,
      coachId: input.coachId,
      cooperationType: input.cooperationType as CooperationType,
      message: input.message,
    });
    return NextResponse.json({ connection }, { status: 201 });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

/**
 * GET /api/coach-connections — درخواست‌ها و ارتباط‌های خود دانشجو.
 * نقش COACH/ADMIN → 403؛ مربی فهرست خودش را از /api/coach/requests و
 * /api/coach/students می‌گیرد.
 */
export async function GET() {
  try {
    const user = await requireUser();
    if (user.role !== USER_ROLES.STUDENT) {
      return NextResponse.json({ error: "ROLE_NOT_ALLOWED" }, { status: 403 });
    }
    const connections = await listStudentConnections(user.id);
    return NextResponse.json({ connections });
  } catch (error) {
    return coachingErrorResponseWithSchema(error);
  }
}

export const dynamic = "force-dynamic";
