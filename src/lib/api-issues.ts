/**
 * کدهای پایدار و ساختاریافته برای خطاهای اعتبارسنجی Zod.
 *
 * هدف: API هرگز منبع متن نمایشی نباشد. هر issue یک کد پایدار می‌گیرد و
 * رابط کاربری کد را با دیکشنری متمرکز به زبان فعلی رابط ترجمه می‌کند.
 *
 * قاعده ساخت کد:
 *  - اگر issue از refine باشد و کد سفارشی (params.ck) داشته باشد → همان کد
 *    (مثل «FUTURE_DATE») — برای قواعد دامنه‌ای که دو جهت مختلف دارند
 *  - در غیر این صورت «<path>#<kind>» — مثل «weightKg#too_small» یا
 *    «goal#invalid_value»؛ path خالی → «#<kind»
 *
 * پاسخ API همچنان `message` قبلی را دارد (سازگاری کامل با تست‌ها و
 * کلاینت‌های فعلی)؛ فقط ساختار `issues` افزوده می‌شود.
 */

import type { z } from "zod";

export interface ApiIssue {
  /** کد پایدار برای نگاشت نمایشی در UI */
  code: string;
  /** مسیر فیلد — برای هایلایت فیلد در فرم */
  path: string;
}

interface IssueLike {
  code: string;
  path: PropertyKey[];
  message: string;
  params?: unknown;
}

/** استخراج کد پایدار از یک issue زاد */
export function issueCode(issue: IssueLike): string {
  const params = issue.params as { ck?: unknown } | undefined;
  if (params && typeof params.ck === "string" && params.ck.length > 0) {
    return params.ck;
  }
  const path = issue.path.map(String).join(".");
  return `${path}#${issue.code}`;
}

/** تبدیل خطای Zod به فهرست کدهای پایدار — برای افزودن به پاسخ API */
export function zodIssueCodes(error: z.ZodError): ApiIssue[] {
  return error.issues.map((issue) => ({
    code: issueCode(issue as unknown as IssueLike),
    path: issue.path.map(String).join("."),
  }));
}
