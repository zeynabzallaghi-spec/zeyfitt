import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/session";
import { zodIssueCodes } from "@/lib/api-issues";
import {
  ensureExerciseBank,
  searchExerciseBank,
  allExercises,
  exerciseBankCount,
} from "@/lib/exercises/bank";
import type { LibraryExerciseCard } from "@/lib/exercises/types";

/**
 * GET /api/exercises — بانک عمومی حرکات (مرحله ۱۸).
 *
 * دو حالت:
 *  - scope=index (پیشفرض): کل بانک فعال با فیلدهای «کارت» — برای کش
 *    درون‌کلاینت؛ فیلدهای محتوایی سنگین (مراحل/ایمنی/…) هرگز در این حالت
 *    برنمی‌گردند و metadata منبع/داخلی در هیچ حالتی برنمی‌گردد.
 *  - scope=search: جست‌وجو/فیلتر سمت سرور با صفحه‌بندی — q، category،
 *    muscles، equipment، difficulty، pattern، type، only3d، page، pageSize.
 *
 * دسترسی: هر کاربر دارای نشست (کتابخانه عمومی پروژه)؛ مهمان 401.
 */

const querySchema = z.object({
  scope: z.enum(["index", "search"]).default("index"),
  q: z.string().trim().max(80).default(""),
  category: z.string().trim().max(24).default("all"),
  muscles: z.string().trim().max(200).default(""),
  equipment: z.string().trim().max(200).default(""),
  difficulty: z.string().trim().max(24).default("all"),
  pattern: z.string().trim().max(24).default("all"),
  type: z.string().trim().max(32).default("all"),
  only3d: z.enum(["0", "1"]).default("0"),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

function csvList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 20);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "INVALID_QUERY", issues: zodIssueCodes(parsed.error) },
        { status: 422 }
      );
    }
    const params = parsed.data;

    // بانک کامل از دیتابیس (کش درون‌حافظه) — تنها منبع داده پاسخ
    await ensureExerciseBank();

    if (params.scope === "index") {
      return NextResponse.json({
        total: exerciseBankCount(),
        items: allExercises(),
      });
    }

    // scope=search — پارامترهای آزاد به واژگان بانک محدود می‌شوند
    const result = searchExerciseBank(
      {
        query: params.q,
        category: params.category as LibraryExerciseCard["category"] | "all",
        muscles: csvList(params.muscles) as LibraryExerciseCard["primaryMuscles"],
        equipment: csvList(params.equipment) as LibraryExerciseCard["equipment"],
        difficulty: params.difficulty as "all" | "مبتدی" | "متوسط" | "پیشرفته",
        pattern: params.pattern as LibraryExerciseCard["pattern"] | "all",
        type: params.type as LibraryExerciseCard["exerciseType"] | "all",
        only3d: params.only3d === "1",
      },
      params.page,
      params.pageSize
    );

    return NextResponse.json({
      total: result.total,
      page: params.page,
      pageSize: params.pageSize,
      items: result.items,
    });
  } catch (error) {
    console.error("[exercises:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
