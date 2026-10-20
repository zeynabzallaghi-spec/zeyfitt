/**
 * ترمیم خودکار بانک حرکات — مرحله ۱۹.۵.
 *
 * مشکل واقعی: جدول Exercise در سندباکس گاهی خالی می‌شود (کاربران باقی
 * می‌مانند اما رکوردهای بانک از بین می‌روند) و کتابخانه برای کاربر خالی
 * نمایش داده می‌شود. این ماژول در همان حالت، import رسمی idempotent
 * مرحله ۱۸ (رکوردها) و مرحله ۱۹ (نگاشت سه‌بعدی) را خودکار اجرا می‌کند.
 *
 * قواعد:
 *  - هیچ داده ساختگی ساخته نمی‌شود — فقط همان import رسمی و تکرارپذیر
 *    که گزارش کامل می‌دهد (ExerciseImportBatch).
 *  - یک‌بار در طول عمر فرایند: اجرای هم‌زمان چندگانه با Promise singleton.
 *  - با EXERCISE_BANK_SELF_HEAL=0 غیرفعال می‌شود (برای تست‌های هدفمند).
 *  - اگر فایل اسکریپت‌ها یا runtime در دسترس نبود، خطا صادقانه لاگ
 *    می‌شود و بانک همان حالت واقعی (خالی) را نشان می‌دهد — هیچ جعلی.
 */

import fs from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const P18_SCRIPT = path.join(process.cwd(), "scripts/p18-import-exercises.ts");
const P19_SCRIPT = path.join(process.cwd(), "scripts/p19-import-mapping.ts");

let healPromise: Promise<boolean> | null = null;

function runScript(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const bin = process.env.EXERCISE_BANK_SELF_HEAL_BIN || "bun";
    const child = spawn(bin, [script], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, EXERCISE_BANK_SELF_HEAL: "0" },
    });
    let out = "";
    const cap = (d: Buffer) => {
      out += d.toString();
      if (out.length > 8000) out = out.slice(-8000);
    };
    child.stdout.on("data", cap);
    child.stderr.on("data", cap);
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`self-heal import failed (code=${code}): ${out.slice(-500)}`));
    });
  });
}

/**
 * ترمیم بانک در صورت خالی‌بودن — true یعنی import اجرا و موفق شد.
 * هرگز نمی‌پرد (خطاها لاگ و false برمی‌گردد) تا مسیر اصلی درخواست نشکند.
 */
export async function maybeSelfHealExerciseBank(): Promise<boolean> {
  if (process.env.EXERCISE_BANK_SELF_HEAL === "0") return false;
  if (!healPromise) {
    healPromise = (async () => {
      if (!fs.existsSync(P18_SCRIPT) || !fs.existsSync(P19_SCRIPT)) {
        console.warn("[exercise-bank] self-heal skipped — import scripts not found on disk");
        return false;
      }
      console.warn("[exercise-bank] DB empty — running idempotent self-heal import (p18+p19)");
      try {
        await runScript(P18_SCRIPT);
        await runScript(P19_SCRIPT);
        console.warn("[exercise-bank] self-heal import finished successfully");
        return true;
      } catch (err) {
        console.error("[exercise-bank] self-heal import failed:", err);
        return false;
      }
    })().finally(() => {
      // فرصت دوباره در فراخوانی بعدی در صورت شکست — بدون هیچ قفل ماندگار
      healPromise = null;
    }) as Promise<boolean>;
  }
  return healPromise;
}
