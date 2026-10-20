/**
 * اطلاعات بانکی خصوصی کاربر — مرحله ۱۹.۶.
 *
 * قواعد امنیتی (سخت‌گیرانه و بدون استثنا):
 *  - این داده فقط برای «مالک خودش» خواندنی و نوشتنی است. هیچ API عمومی،
 *    فهرست مربیان، پنل مربی، پنل ادمین یا پاسخ غیرمجازی آن را برنمی‌گرداند
 *    (ادمین در این مرحله هیچ دسترسی به اطلاعات بانکی ندارد — سیاست صریح).
 *  - هرگز در لاگ سرور نوشته نمیشود؛ خطاها فقط با نام Exception ثبت میشوند.
 *  - ذخیره‌سازی پایدار در user.bankingInfoJson (JSON اعتبارسنجی‌شده با Zod).
 *  - شماره شبا با الگوی IR + ۲۴ رقم اعتبارسنجی میشود؛ ارقام فارسی/عربی
 *    به لاتین نرمال میشوند. هیچ اتصال بانکی یا تأیید واقعی در این مرحله
 *    وجود ندارد — فقط ذخیره امن اطلاعات پرداختی.
 */

import { z } from "zod";
import { db } from "@/lib/db";
import { normalizeDigits } from "@/lib/profile";

export const BANKING_LIMITS = {
  ACCOUNT_HOLDER_MAX: 120,
  BANK_NAME_MAX: 80,
  ACCOUNT_NUMBER_MAX: 34,
  CARD_NUMBER_DIGITS: 16,
  SHEBA_DIGITS: 24,
  NOTE_MAX: 200,
} as const;

/** نرمال‌سازی ارقام + حذف فاصله‌ها — برای فیلدهای عددی بانکی */
function digitsOnly(input: string): string {
  return normalizeDigits(input).replace(/[\s-]/g, "");
}

export const bankingInfoSchema = z
  .object({
    accountHolder: z.string().trim().max(BANKING_LIMITS.ACCOUNT_HOLDER_MAX).optional().default(""),
    bankName: z.string().trim().max(BANKING_LIMITS.BANK_NAME_MAX).optional().default(""),
    accountNumber: z.string().trim().max(BANKING_LIMITS.ACCOUNT_NUMBER_MAX).optional().default(""),
    cardNumber: z.string().trim().optional().default(""),
    sheba: z.string().trim().optional().default(""),
    note: z.string().trim().max(BANKING_LIMITS.NOTE_MAX).optional().default(""),
  })
  .superRefine((v, ctx) => {
    // شماره کارت — دقیقاً ۱۶ رقم در صورت ثبت
    if (v.cardNumber) {
      const card = digitsOnly(v.cardNumber);
      if (!/^\d{16}$/.test(card)) {
        ctx.addIssue({
          code: "custom",
          path: ["cardNumber"],
          message: "شماره کارت باید ۱۶ رقم باشد",
        });
      }
    }
    // شبا — IR + ۲۴ رقم در صورت ثبت
    if (v.sheba) {
      const sheba = v.sheba.toUpperCase().replace(/\s-/g, "");
      const digits = digitsOnly(sheba.replace(/^IR/i, ""));
      if (sheba.toUpperCase().startsWith("IR") === false || !/^\d{24}$/.test(digits)) {
        ctx.addIssue({
          code: "custom",
          path: ["sheba"],
          message: "شماره شبا باید به شکل IR و ۲۴ رقم باشد",
        });
      }
    }
    // حداقل یک فیلد معنادار — فرم کاملاً خالی یعنی «پاک کردن اطلاعات»
    if (
      !v.accountHolder &&
      !v.bankName &&
      !v.accountNumber &&
      !v.cardNumber &&
      !v.sheba &&
      !v.note
    ) {
      // خالی مجاز است = حذف اطلاعات — خطا نیست
      return;
    }
  });

export type BankingInfo = z.infer<typeof bankingInfoSchema>;

export interface BankingInfoClient {
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  cardNumber: string;
  sheba: string;
  note: string;
  updatedAt: string | null;
}

/** خواندن اطلاعات بانکی — فقط مالک؛ خروجی نرمال‌شده برای نمایش */
export async function getBankingInfo(userId: string): Promise<BankingInfoClient> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { bankingInfoJson: true, updatedAt: true },
  });
  const parsed = parseBanking(user?.bankingInfoJson ?? null);
  return {
    accountHolder: parsed?.accountHolder ?? "",
    bankName: parsed?.bankName ?? "",
    accountNumber: parsed?.accountNumber ?? "",
    cardNumber: parsed?.cardNumber ?? "",
    sheba: parsed?.sheba ?? "",
    note: parsed?.note ?? "",
    updatedAt: user?.updatedAt.toISOString() ?? null,
  };
}

function parseBanking(json: string | null): BankingInfo | null {
  if (!json) return null;
  try {
    const parsed: unknown = JSON.parse(json);
    const result = bankingInfoSchema.safeParse(parsed);
    if (result.success) return result.data;
    return null; // داده خراب/ناسازگار — خالی صادقانه
  } catch {
    return null;
  }
}

function normalizeForStorage(info: BankingInfo): BankingInfo {
  return {
    accountHolder: info.accountHolder ?? "",
    bankName: info.bankName ?? "",
    accountNumber: info.accountNumber ? digitsOnly(info.accountNumber) : "",
    cardNumber: info.cardNumber ? digitsOnly(info.cardNumber) : "",
    sheba: info.sheba
      ? `IR${digitsOnly(info.sheba.replace(/^IR/i, "")).toUpperCase()}`
      : "",
    note: info.note ?? "",
  };
}

/**
 * ذخیره اطلاعات بانکی — فقط مالک. اگر همه فیلدها خالی باشند رکورد پاک
 * میشود (خروج صادقانه کاربر از اطلاعات). خروجی بدون هیچ داده‌ای که در
 * مسیر خطا لاگ شود.
 */
export async function saveBankingInfo(
  userId: string,
  input: unknown
): Promise<BankingInfoClient> {
  const result = bankingInfoSchema.safeParse(input);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new BankingError(400, "BANKING_VALIDATION", first?.message ?? "ورودی نامعتبر است");
  }
  const normalized = normalizeForStorage(result.data);
  const isEmpty = Object.values(normalized).every((v) => v === "");
  await db.user.update({
    where: { id: userId },
    data: { bankingInfoJson: isEmpty ? null : JSON.stringify(normalized) },
  });
  return {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
}

export class BankingError extends Error {
  constructor(
    public status: number,
    public code: string,
    public messageFa: string
  ) {
    super(code);
    this.name = "BankingError";
  }
}
