import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/session";
import { planTitleSchema } from "@/lib/plan-engine/schema";
import { zodIssueCodes } from "@/lib/api-issues";
import {
  deleteOwnedPlan,
  findOwnedPlan,
  updateOwnedPlan,
} from "@/lib/plan-storage";

/**
 * مسیرهای /api/plans/[id] — همه عملیات با بررسی مالکیت سمت سرور.
 * «یافت نشد» و «مالک دیگر» پاسخ یکسان 404 می‌گیرند تا هیچ اطلاعاتی
 * درباره وجود برنامه‌های کاربران دیگر افشا نشود.
 */

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/plans/[id] — جزئیات کامل برنامه متعلق به کاربر جاری */
export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
    const plan = await findOwnedPlan(id, session.user.id);
    if (!plan) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[plan:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * PATCH /api/plans/[id] — به‌روزرسانی فیلدهای مجاز: عنوان و وضعیت.
 * فعال‌سازی (status=active) بقیه برنامه‌های فعال را بایگانی می‌کند.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = planPatchSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: "VALIDATION",
          message: first?.message ?? "اطلاعات معتبر نیست",
          issues: zodIssueCodes(parsed.error),
        },
        { status: 400 }
      );
    }

    const plan = await updateOwnedPlan(id, session.user.id, parsed.data);
    if (!plan) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("[plan:PATCH]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/** DELETE /api/plans/[id] — حذف برنامه پس از بررسی مالکیت */
export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const { id } = await context.params;
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }
    const deleted = await deleteOwnedPlan(id, session.user.id);
    if (!deleted) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[plan:DELETE]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/* ---------------------------------- شِماها ---------------------------------- */

/** فیلدهای مجاز PATCH — هیچ فیلد دیگری (از جمله userId و goal) پذیرفته نمی‌شود */
const planPatchSchema = z
  .object({
    title: planTitleSchema.optional(),
    status: z.enum(["active", "archived"]).optional(),
  })
  .refine(
    (data) => data.title !== undefined || data.status !== undefined,
    { message: "حداقل یکی از فیلدهای عنوان یا وضعیت را ارسال کنید" }
  );
