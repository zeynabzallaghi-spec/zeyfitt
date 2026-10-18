import bcrypt from "bcryptjs";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { sendResetPasswordEmail } from "@/lib/email";

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
    /** بازیابی رمز عبور: توکن یک‌بارمصرف با اعتبار ۱ ساعت (جدول verification) */
    resetPasswordTokenExpiresIn: 60 * 60,
    /** پس از تغییر موفق رمز، همهٔ نشست‌های فعال کاربر باطل می‌شوند */
    revokeSessionsOnPasswordReset: true,
    /** ارسال ایمیل بازیابی — با حالت بدون ایمیل در src/lib/email.ts */
    sendResetPassword: sendResetPasswordEmail,
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

  /**
   * فیلد افزوده نقش — فقط خواندنی از دید کلاینت:
   *  - input: false یعنی ثبت‌نام/ورود هیچ مقداری از کلاینت برای نقش نمی‌پذیرد
   *  - مقدار واقعی همیشه از دیتابیس بازخوانی می‌شود (هر Route Handler حساس)
   */
  user: {
    additionalFields: {
      role: { type: "string", defaultValue: "STUDENT", input: false },
    },
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100, // سقف کلی درخواست‌های auth در پنجره ۶۰ ثانیه
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 5 },
      "/reset-password": { window: 60, max: 5 },
    },
  },

  advanced: {
    cookiePrefix: "fitcoach",
  },

  /**
   * مبداهای مورد اعتماد: فقط میزبانی که اپ واقعاً از آن سرو می‌شود.
   *
   * دو منبع مستقل (بازتولید و اثبات هنگام رفع اشکال ورود/ثبت‌نام پس از
   * ممیزی مرحله ۱۱):
   * زنجیرهٔ گیت‌وی پلتفرم (Function Compute → Caddy:81) هدر Host را به
   * میزبان داخلی FC بازنویسی می‌کند (ws-be-*.fcapp.run) و زیردامنهٔ عمومی
   * واقعی را در هدر زیرساختی «Abc» می‌رساند (Abc: preview-chat-<id> ←
   * https://preview-chat-<id>.space-z.ai). پس صرفِ Host باعث 403
   * INVALID_ORIGIN برای هر ورود/ثبت‌نام مرورگری از دامنهٔ عمومی می‌شد.
   *
   * نکتهٔ امنیتی (ممیزی مرحله ۱۱، همچنان برقرار): هدر Origin خام هرگز
   * بازتابیده نمی‌شود. هدر Abc را گیت‌وی تنظیم می‌کند و مرورگر مهاجم در
   * سناریوی CSRF نمی‌تواند هدر سفارشی تزریق کند؛ مقدار آن هم به‌سختی
   * اعتبارسنجی می‌شود (فقط حروف/رقم/خط تیره) و به همان دامنهٔ خودِ اپ
   * نگاشت می‌گردد، نه دامنهٔ دلخواه مهاجم.
   */
  trustedOrigins: (request?: Request) => {
    const origins: string[] = ["http://localhost:3000"];
    try {
      const headers = request?.headers;
      const hosts: string[] = [];
      const host = headers?.get("host");
      if (host) hosts.push(host);
      const platformSub = headers?.get("abc");
      if (platformSub && /^[a-zA-Z0-9-]+$/.test(platformSub)) {
        hosts.push(`${platformSub}.space-z.ai`);
      }
      for (const h of hosts) {
        origins.push(`https://${h}`, `http://${h}`);
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
      }
      // سیاست پیچیدگی رمز عبور: حداقل ۸ کاراکتر (در پیکربندی) + حداقل یک حرف و یک رقم
      // — هم برای ثبت‌نام (password) و هم برای بازیابی رمز (newPassword)
      const newPassword =
        ctx.path === "/reset-password"
          ? (ctx.body as { newPassword?: unknown })?.newPassword
          : ctx.path === "/sign-up/email"
            ? (ctx.body as { password?: unknown })?.password
            : undefined;
      if (typeof newPassword === "string") {
        if (!(/[A-Za-z]/.test(newPassword) && /[0-9]/.test(newPassword))) {
          throw new APIError("BAD_REQUEST", { message: "PASSWORD_POLICY" });
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
  /** نقش کاربر — نمایشی؛ تصمیم مجوز همیشه سمت سرور با بازخوانی دیتابیس */
  role: string;
}
