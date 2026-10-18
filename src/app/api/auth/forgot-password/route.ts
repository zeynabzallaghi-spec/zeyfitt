import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getSandboxResetRecord } from "@/lib/email";
import { EMAIL_PATTERN, normalizeEmail } from "@/lib/profile";

/**
 * واسط بازیابی رمز عبور — POST /api/auth/forgot-password
 *
 * دو وظیفه دارد:
 *  1. فراخوانی مسیر رسمی better-auth (/request-password-reset) با همان
 *     درخواست مرورگر تا محدودسازی نرخ، بررسی مبدأ و تولید توکن یک‌بارمصرف
 *     (اعتبار ۱ ساعت در جدول verification) همان‌طور که هست اجرا شود.
 *  2. حالت بدون ایمیل (بدون پیکربندی SMTP): لینک بازیابی در پاسخ همین
 *     درخواست به کاربر برمی‌گردد تا جریان بازیابی در محیط ابری قابل استفاده
 *     باشد. اگر SMTP پیکربندی شده باشد (یا ایمیل ثبت‌نشده باشد) هیچ توکنی
 *     افشا نمی‌شود و پاسخ عمومی است (بدون افشای وجود یا عدم وجود حساب).
 *
 * پاسخ‌ها:
 *   200 { status: true, delivery: "email" }         — ایمیل ارسال شد یا پاسخ عمومی
 *   200 { status: true, delivery: "sandbox-link",
 *         resetUrl: "/reset-password?token=…" }    — فقط حالت بدون ایمیل
 *   400 { message: "INVALID_EMAIL" } | 429 RATE_LIMITED | 500 INTERNAL
 */
export const runtime = "nodejs";

const bodySchema = z.object({ email: z.string().min(3).max(254) });

export async function POST(request: NextRequest) {
  try {
    const raw: unknown = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    const email = parsed.success ? normalizeEmail(parsed.data.email) : "";
    if (!parsed.success || !EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ status: false, message: "INVALID_EMAIL" }, { status: 400 });
    }

    await auth.api.requestPasswordReset({ body: { email }, request });

    // در حالت بدون ایمیل، callback ارسال، توکن را در حافظه ثبت کرده است؛
    // delivered=false یعنی SMTP در کار نبود (یا ارسال ناموفق بود) → لینک را برگردان
    const record = getSandboxResetRecord(email);
    if (record && !record.delivered) {
      return NextResponse.json({
        status: true,
        delivery: "sandbox-link",
        resetUrl: `/reset-password?token=${record.token}`,
      });
    }
    return NextResponse.json({ status: true, delivery: "email" });
  } catch (error) {
    const status = (error as { status?: number })?.status;
    if (status === 429) {
      return NextResponse.json({ status: false, message: "RATE_LIMITED" }, { status: 429 });
    }
    // فقط نام استثنا — بدون جزئیات داخلی (الگوی امنیتی پروژه)
    console.error("[forgot-password] Exception:", (error as Error)?.name ?? "Error");
    return NextResponse.json({ status: false, message: "INTERNAL" }, { status: 500 });
  }
}
