import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import {
  toClientWeightEntry,
  weightEntryPayloadSchema,
  type WeightEntryClient,
} from "@/lib/weight";
import { zodIssueCodes } from "@/lib/api-issues";

/** سقف تعداد رکوردهای وزن هر کاربر — برای جلوگیری از سوءاستفاده */
const MAX_ENTRIES_PER_USER = 500;

/**
 * GET /api/weight — فهرست اندازه‌گیری‌های وزن کاربر جاری (از نشست)،
 * مرتب بر اساس تاریخ ثبت (نزولی). بدون نشست معتبر: 401.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const rows = await db.weightEntry.findMany({
      where: { userId: session.user.id },
      orderBy: [{ recordedAt: "desc" }, { createdAt: "desc" }],
      take: MAX_ENTRIES_PER_USER,
    });
    const entries: WeightEntryClient[] = rows.map(toClientWeightEntry);
    return NextResponse.json({ entries });
  } catch (error) {
    // بدون جزئیات دیتابیس یا stack trace در پاسخ و لاگ
    console.error("[weight:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * POST /api/weight — ثبت اندازه‌گیری وزن جدید برای کاربر جاری.
 * مالکیت فقط از نشست تعیین می‌شود؛ شناسه ارسالی از کلاینت هرگز استفاده نمی‌شود.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const parsed = weightEntryPayloadSchema.safeParse(body);
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

    const count = await db.weightEntry.count({ where: { userId: session.user.id } });
    if (count >= MAX_ENTRIES_PER_USER) {
      return NextResponse.json(
        { error: "LIMIT_REACHED", message: "تعداد اندازه‌گیری‌های ثبت‌شده به حداکثر رسیده است" },
        { status: 400 }
      );
    }

    const row = await db.weightEntry.create({
      data: {
        userId: session.user.id,
        weightKg: parsed.data.weightKg,
        recordedAt: parsed.data.recordedAt,
      },
    });

    return NextResponse.json({ entry: toClientWeightEntry(row) }, { status: 201 });
  } catch (error) {
    console.error("[weight:POST]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/**
 * DELETE /api/weight?id=… — حذف یک اندازه‌گیری.
 * شرط userId در همان کوئری تضمین می‌کند کاربر فقط رکورد خودش را حذف کند.
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id || id.length > 64) {
      return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
    }

    const existing = await db.weightEntry.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });
    if (!existing) {
      // نه یافته‌شدن برای کاربر دیگر و نه نبودن رکورد — پاسخ یکسان
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await db.weightEntry.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[weight:DELETE]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
