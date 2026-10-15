import bcrypt from "bcryptjs";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";

/**
 * پیکربندی احراز هویت با کتابخانه better-auth:
 * - پایگاه داده: Prisma (SQLite) — جدول‌های user/account/session/verification
 * - رمز عبور: هش bcrypt با cost ۱۲ (هرگز متن ساده ذخیره نمی‌شود)
 * - نشست: دیتابیسی و قابل ابطال (اعتبار ۷ روز، تازه‌سازی روزانه)
 * - محدودسازی نرخ: فعال — ورود/ثبت‌نام حداکثر ۵ درخواست در دقیقه
 * - کوکی: HttpOnly + SameSite=Lax؛ Secure به‌صورت خودکار روی HTTPS
 * - Secret فقط از متغیر محیطی BETTER_AUTH_SECRET خوانده می‌شود.
 */
export const auth = betterAuth({
  appName: "AI Fitness Coach",
  database: prismaAdapter(db, { provider: "sqlite" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    password: {
      hash: async (password: string) => bcrypt.hash(password, 12),
      verify: async ({ password, hash }: { password: string; hash: string }) =>
        bcrypt.compare(password, hash),
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // ۷ روز — ماندگاری نشست پس از بستن مرورگر
    updateAge: 60 * 60 * 24, // تازه‌سازی اعتبار نشست هر ۲۴ ساعت
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100, // سقف کلی درخواست‌های auth در پنجره ۶۰ ثانیه
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },

  advanced: {
    cookiePrefix: "fitcoach",
  },

  /**
   * مبداهای مورد اعتماد: فقط همان میزبانی که اپ از آن سرو می‌شود (same-origin).
   * به‌صورت پویا از هدر Host خوانده می‌شود تا دامنه پیش‌نمایش بدون تنظیم
   * دستوری پذیرفته شود. نکته امنیتی (ممیزی مرحله ۱۱): هدر Origin خام هرگز
   * به فهرست اضافه نمی‌شود — انعکاس Originِ برگشتی از سمت کلاینت، بررسی CSRF
   * کتابخانه را بی‌اثر می‌کرد (مثلاً login-CSRF از دامنه مهاجم). مرورگر واقعی
   * همیشه Origin همان Host را می‌فرستد و از مسیر Host تأیید می‌شود.
   */
  trustedOrigins: (request?: Request) => {
    const origins: string[] = ["http://localhost:3000"];
    try {
      const host = request?.headers.get("host");
      if (host) {
        origins.push(`https://${host}`, `http://${host}`);
      }
    } catch {
      // هدرها در دسترس نبودند — فقط پیش‌فرض‌ها اعمال می‌شوند
    }
    return origins;
  },

  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // نرمال‌سازی استاندارد ایمیل (حذف فاصله و یکسان‌سازی حروف کوچک)
      if (ctx.path === "/sign-up/email" || ctx.path === "/sign-in/email") {
        const body = ctx.body as { email?: unknown; password?: unknown };
        if (typeof body?.email === "string") {
          body.email = body.email.trim().toLowerCase();
        }
        // سیاست پیچیدگی رمز عبور: حداقل ۸ کاراکتر (در پیکربندی) + حداقل یک حرف و یک رقم
        if (ctx.path === "/sign-up/email" && typeof body?.password === "string") {
          const pw = body.password;
          if (!(/[A-Za-z]/.test(pw) && /[0-9]/.test(pw))) {
            throw new APIError("BAD_REQUEST", { message: "PASSWORD_POLICY" });
          }
        }
      }
    }),
  },
});

/** تایپ کاربر نشست — فقط فیلدهای غیرحساس سمت کلاینت */
export interface SessionUser {
  id: string;
  name: string;
  email: string;
}
