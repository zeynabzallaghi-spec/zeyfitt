import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "@/lib/session";
import { getWorkoutStats, getExerciseProgress } from "@/lib/session-storage";

/**
 * GET /api/sessions/stats — آمار پیشرفت واقعی کاربر از جلسات ثبت‌شده.
 *  - بدون پارامتر: آمار هفته جاری، مجموع‌ها، روند ۶ هفته و آخرین جلسه
 *  - با exerciseId: روند همان حرکت فقط از جلسات تکمیل‌شده (رکورد فقط با
 *    حداقل دو نقطه داده قابل‌مقایسه تعریف می‌شود)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const exerciseId = new URL(request.url).searchParams.get("exerciseId");
    if (exerciseId !== null) {
      const idCheck = z.string().trim().min(1).max(64).safeParse(exerciseId);
      if (!idCheck.success) {
        return NextResponse.json({ error: "VALIDATION" }, { status: 400 });
      }
      const progress = await getExerciseProgress(session.user.id, idCheck.data);
      return NextResponse.json({ progress });
    }

    const stats = await getWorkoutStats(session.user.id);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error("[sessions:stats]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
