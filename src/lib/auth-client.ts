import { createAuthClient } from "better-auth/react";

/**
 * کلاینت احراز هویت — بدون baseURL؛ همیشه همان‌مبدأ (relative) صدا زده می‌شود.
 * Secret یا کلید محرمانه‌ای در سمت کلاینت وجود ندارد.
 */
export const authClient = createAuthClient();

/** نگاشت خطاهای رایج better-auth به پیام فارسی غیرافشاگر */
export function authErrorToFa(status: number, message?: string): string {
  if (status === 429) {
    return "تعداد تلاش‌ها زیاد است؛ لطفاً یک دقیقه بعد دوباره امتحان کنید.";
  }
  if (message === "PASSWORD_POLICY" || status === 400) {
    if (message === "PASSWORD_POLICY") {
      return "رمز عبور باید حداقل ۸ کاراکتر و شامل حداقل یک حرف و یک رقم باشد.";
    }
  }
  if (status === 422) {
    return "این ایمیل قبلاً ثبت شده است. اگر حساب دارید وارد شوید.";
  }
  if (status === 401) {
    return "ایمیل یا رمز عبور اشتباه است.";
  }
  return "عملیات انجام نشد؛ لطفاً دوباره تلاش کنید.";
}
