import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/session";
import { profilePayloadSchema, toClientProfile, type ProfilePayload } from "@/lib/profile";

/** نگاشت خروجی اعتبارسنجی به ستون‌های پایگاه داده */
function toDbData(data: ProfilePayload) {
  return {
    displayName: data.displayName,
    age: data.age,
    gender: data.gender,
    heightCm: data.heightCm,
    weightKg: data.weightKg,
    bodyFat: data.bodyFat,
    goal: data.goal,
    experience: data.experience,
    trainingDaysPerWeek: data.trainingDaysPerWeek,
    sessionMinutes: data.sessionMinutes,
    equipmentJson: JSON.stringify(data.equipment),
    limitationsJson: JSON.stringify(data.limitations),
    limitationNotes: data.limitationNotes,
    diet: data.diet,
    allergiesJson: JSON.stringify(data.allergies),
    units: data.units,
  };
}

/** GET /api/profile — پروفایل کاربر جاری (از نشست) یا null */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }
    const row = await db.fitnessProfile.findUnique({
      where: { userId: session.user.id },
    });
    return NextResponse.json({ profile: row ? toClientProfile(row) : null });
  } catch (error) {
    // بدون جزئیات خطای دیتابیس یا stack trace برای کاربر
    console.error("[profile:GET]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}

/** PUT /api/profile — ایجاد/به‌روزرسانی پروفایل کاربر جاری */
export async function PUT(request: Request) {
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

    // اعتبارسنجی سمت سرور — مرجع نهایی (کلاینت فقط راحتی است)
    const parsed = profilePayloadSchema.safeParse(body);
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "form");
        if (!fields[key]) fields[key] = issue.message;
      }
      return NextResponse.json({ error: "VALIDATION", fields }, { status: 400 });
    }

    // هویت کاربر فقط از نشست — شناسه ارسالی از کلاینت هرگز مجاز نیست
    const userId = session.user.id;
    const dbData = toDbData(parsed.data);

    const row = await db.fitnessProfile.upsert({
      where: { userId },
      create: { userId, ...dbData },
      update: dbData,
    });

    // همگام‌سازی نام نمایشی با حساب کاربری (نمایش در سربرگ)
    await db.user.update({ where: { id: userId }, data: { name: dbData.displayName } });

    return NextResponse.json({ profile: toClientProfile(row) });
  } catch (error) {
    console.error("[profile:PUT]", error instanceof Error ? error.name : "unknown");
    return NextResponse.json({ error: "INTERNAL" }, { status: 500 });
  }
}
