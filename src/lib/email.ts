/**
 * سرویس ایمیل سمت سرور — ارسال لینک بازیابی رمز عبور.
 *
 * دو حالت تحویل (الگوی صداقت محصول):
 *  1. SMTP پیکربندی‌شده: ایمیل واقعی با nodemailer ارسال می‌شود.
 *  2. بدون SMTP (حالت ابری/تست): لینک بازیابی در پاسخ API به کاربر همان
 *     درخواست‌کننده نمایش داده می‌شود با برچسب شفاف «حالت بدون ایمیل».
 *
 * پیکربندی SMTP از دو منبع خوانده می‌شود (به‌ترتیب اولویت):
 *   - متغیرهای محیطی: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   - git config محلی: fitness.smtp.host/port/user/pass/from
 *     (.git/config در بازیافت سندباکس دوام می‌آورد و هرگز commit نمی‌شود؛
 *     مقادیر با `git config fitness.smtp.host …` تنظیم می‌شوند)
 *
 * توکن بازیابی همیشه در حافظهٔ موقت همین ماژول هم ثبت می‌شود تا لایهٔ API
 * بتواند در حالت بدون ایمیل، لینک را به درخواست‌کنندهٔ همان ایمیل بدهد.
 * حافظه محدود است (حداکثر ۱۰۰ رکورد، TTL یک‌ساعته هم‌تراز اعتبار توکن) و
 * هیچ توکنی در آن فراتر از انقضای رسمی‌اش معتبر نمی‌ماند.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

interface SandboxResetRecord {
  token: string;
  expiresAt: number;
  /** آیا ایمیل واقعاً ارسال شد؟ true → لینک دیگر در پاسخ API افشا نمی‌شود */
  delivered: boolean;
}

/** کلید: ایمیل نرمال‌شده — همیشه یک رکورد آخر برای هر ایمیل */
const sandboxResetLinks = new Map<string, SandboxResetRecord>();
const SANDBOX_LINK_TTL_MS = 60 * 60 * 1000; // هم‌تراز resetPasswordTokenExpiresIn
const SANDBOX_LINK_MAX = 100;

function pruneSandboxLinks(now: number): void {
  for (const [key, rec] of sandboxResetLinks) {
    if (rec.expiresAt <= now) sandboxResetLinks.delete(key);
  }
  while (sandboxResetLinks.size > SANDBOX_LINK_MAX) {
    const oldest = sandboxResetLinks.keys().next().value;
    if (oldest === undefined) break;
    sandboxResetLinks.delete(oldest);
  }
}

/** خواندن یک کلید git config در ریشه پروژه — خطا = null (بی‌سر و صدا) */
async function readGitConfig(key: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["config", "--get", key],
      { cwd: "/home/z/my-project", timeout: 3000 },
    );
    const value = stdout.trim();
    return value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

let smtpCache: { value: SmtpConfig | null; at: number } | null = null;
const SMTP_CACHE_MS = 5 * 60 * 1000;

/** پیکربندی SMTP — محیط اول، سپس git config؛ کش ۵ دقیقه‌ای */
export async function getSmtpConfig(): Promise<SmtpConfig | null> {
  const now = Date.now();
  if (smtpCache && now - smtpCache.at < SMTP_CACHE_MS) return smtpCache.value;

  let config: SmtpConfig | null = null;
  const env = process.env;
  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    const port = Number.parseInt(env.SMTP_PORT ?? "587", 10);
    config = {
      host: env.SMTP_HOST,
      port: Number.isFinite(port) ? port : 587,
      secure: port === 465,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.SMTP_FROM ?? env.SMTP_USER,
    };
  } else {
    const [host, port, user, pass, from] = await Promise.all([
      readGitConfig("fitness.smtp.host"),
      readGitConfig("fitness.smtp.port"),
      readGitConfig("fitness.smtp.user"),
      readGitConfig("fitness.smtp.pass"),
      readGitConfig("fitness.smtp.from"),
    ]);
    if (host && user && pass) {
      const portNum = Number.parseInt(port ?? "587", 10);
      config = {
        host,
        port: Number.isFinite(portNum) ? portNum : 587,
        secure: portNum === 465,
        user,
        pass,
        from: from ?? user,
      };
    }
  }

  smtpCache = { value: config, at: now };
  return config;
}

/** آیا ارسال واقعی ایمیل پیکربندی شده؟ (برای متن رابط کاربری) */
export async function isEmailDeliveryConfigured(): Promise<boolean> {
  return (await getSmtpConfig()) !== null;
}

const BRAND = "AI Fitness Coach";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resetEmailHtml(url: string): string {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="fa" dir="rtl">
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:Tahoma,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <h1 style="font-size:18px;color:#18181b;margin:0 0 16px;">${BRAND}</h1>
    <p style="font-size:14px;line-height:2;color:#3f3f46;margin:0 0 16px;">
      برای بازیابی رمز عبور خود روی دکمهٔ زیر بگیرید:
    </p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${safeUrl}" style="display:inline-block;background:#a3e635;color:#18181b;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;">
        تنظیم رمز عبور جدید
      </a>
    </p>
    <p style="font-size:12px;line-height:2;color:#71717a;margin:0 0 8px;">
      این لینک یک ساعت اعتبار دارد و فقط یک‌بار قابل استفاده است. اگر شما درخواست نداده‌اید، این ایمیل را نادیده بگیرید — رمز فعلی شما تغییری نمی‌کند.
    </p>
    <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;" />
    <p style="font-size:12px;line-height:2;color:#71717a;margin:0;" dir="ltr">
      Password reset link (valid 1 hour, single use):<br />
      <a href="${safeUrl}" style="color:#65a30d;word-break:break-all;">${safeUrl}</a>
    </p>
  </div>
</body>
</html>`;
}

export interface SendResetPasswordInput {
  user: { id: string; email: string; name: string };
  url: string;
  token: string;
}

/**
 * Callback بهتر-ات برای emailAndPassword.sendResetPassword.
 * همیشه توکن را در حافظهٔ موقت ثبت می‌کند (برای حالت بدون ایمیل) و در صورت
 * پیکربندی SMTP، ایمیل واقعی می‌فرستد. خطای ارسال، مسیر بازیابی را نمی‌بندد:
 * در آن حالت لینک در پاسخ API همان درخواست نمایش داده می‌شود.
 */
export async function sendResetPasswordEmail(input: SendResetPasswordInput): Promise<void> {
  const email = input.user.email.trim().toLowerCase();
  const now = Date.now();
  pruneSandboxLinks(now);

  const smtp = await getSmtpConfig();
  let delivered = false;

  if (smtp) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        auth: { user: smtp.user, pass: smtp.pass },
      });
      await transporter.sendMail({
        from: `"${BRAND}" <${smtp.from}>`,
        to: input.user.email,
        subject: `بازیابی رمز عبور — ${BRAND}`,
        text: `برای بازیابی رمز عبور، تا یک ساعت آینده به این نشانی بروید:\n${input.url}\n\nاگر شما این درخواست را نداده‌اید، این ایمیل را نادیده بگیرید.`,
        html: resetEmailHtml(input.url),
      });
      delivered = true;
    } catch (error) {
      // فقط نام استثنا — بدون stack و داده حساس (الگوی امنیتی پروژه)
      console.error("[email] SMTP send failed:", (error as Error)?.name ?? "Error");
    }
  }

  sandboxResetLinks.set(email, {
    token: input.token,
    expiresAt: now + SANDBOX_LINK_TTL_MS,
    delivered,
  });
}

/**
 * خواندن توکن بازیابی ثبت‌شده برای یک ایمیل (بدون حذف — تا انقضا می‌ماند).
 * فقط برای لایهٔ API داخلی؛ delivered=true یعنی ایمیل رفته و نباید افشا شود.
 */
export function getSandboxResetRecord(
  email: string,
): { token: string; delivered: boolean } | null {
  const key = email.trim().toLowerCase();
  const rec = sandboxResetLinks.get(key);
  if (!rec) return null;
  if (rec.expiresAt <= Date.now()) {
    sandboxResetLinks.delete(key);
    return null;
  }
  return { token: rec.token, delivered: rec.delivered };
}
