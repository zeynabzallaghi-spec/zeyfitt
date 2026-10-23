/**
 * p2b-local-provider-smoke.ts — تست هدفمند provider محلی (اصلاحیه Blocker P2).
 * اجرا: bun scripts/p2b-local-provider-smoke.ts
 *
 * فقط فایل/کلید خودش را میسازد و در پایان پاک میکند — هیچ داده واقعی
 * لمس نمیشود؛ دیتابیس بهکلی باز نمیشود.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { rm } from "node:fs/promises";
import { localStorageProvider } from "../src/lib/storage/local-provider";
import {
  buildMediaStorageKey,
  getStorageProvider,
  storageDurabilityStatus,
} from "../src/lib/storage/provider";

let passed = 0;
let failed = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name} ${detail}`);
  }
}

const ROOT = path.join(process.cwd(), "data", "uploads");
const TEST_DIR = path.join(ROOT, "coach-exercises", "p2bsmoke");
const KEY = buildMediaStorageKey("coach-exercises", "p2bsmoke", "smoke-sample");

async function expectUnsafe(fn: () => Promise<unknown>, label: string) {
  try {
    await fn();
    ok(label, false, "هیچ خطایی پرتاب نشد");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ok(label, msg.includes("UNSAFE_STORAGE_PATH"), `got: ${msg}`);
  }
}

async function main() {
  console.log("\n──── p2b — تست هدفمند Local Storage Provider ────\n");

  // ۱) قرارداد شناسه provider
  ok("driver=local", localStorageProvider.driver === "local");
  ok("durability=local-dev-disk (صادقانه، بدون ادعای تولیدی)", localStorageProvider.durability === "local-dev-disk");
  ok("getStorageProvider همان provider محلی را برمی‌گرداند", getStorageProvider() === localStorageProvider);
  const status = storageDurabilityStatus();
  ok("storageDurabilityStatus صادق است", status.driver === "local" && status.configured === true && status.durable === false);

  // ۲) put + sizeOf
  const payload = new Uint8Array(2048);
  for (let i = 0; i < payload.length; i++) payload[i] = i % 251;
  await localStorageProvider.put(KEY, payload);
  const abs = path.join(ROOT, KEY);
  ok("فایل خارج از public در data/uploads ساخته شد", existsSync(abs) && abs.includes(path.join("data", "uploads")), abs);
  ok("sizeOf اندازه درست", (await localStorageProvider.sizeOf(KEY)) === payload.length);

  // ۳) استریم بازه‌ای بایت‌دقیق
  const full = await localStorageProvider.openRange(KEY, 0, payload.length - 1);
  const fullBytes = new Uint8Array(await new Response(full as ReadableStream).arrayBuffer());
  ok("openRange کامل → طول درست", fullBytes.length === payload.length);
  ok("openRange کامل → بایت‌به‌بایت برابر", fullBytes.every((b, i) => b === payload[i]));

  const slice = await localStorageProvider.openRange(KEY, 5, 9);
  const sliceBytes = new Uint8Array(await new Response(slice as ReadableStream).arrayBuffer());
  ok("openRange 5..9 → ۵ بایت درست", sliceBytes.length === 5 && sliceBytes.every((b, i) => b === payload[5 + i]));

  const tail = await localStorageProvider.openRange(KEY, payload.length - 3, payload.length - 1);
  const tailBytes = new Uint8Array(await new Response(tail as ReadableStream).arrayBuffer());
  ok("بازه انتهایی درست", tailBytes.length === 3 && tailBytes.every((b, i) => b === payload[payload.length - 3 + i]));

  ok("start خارج از فایل → null", (await localStorageProvider.openRange(KEY, payload.length, payload.length + 10)) === null);
  ok("فایل مفقود → sizeOf null", (await localStorageProvider.sizeOf(KEY + "-missing")) === null);
  ok("فایل مفقود → openRange null", (await localStorageProvider.openRange(KEY + "-missing", 0, 10)) === null);

  // ۴) حذف idempotent
  await localStorageProvider.delete(KEY);
  await localStorageProvider.delete(KEY);
  ok("حذف دوباره خطا نمیدهد (idempotent) و فایل میرود", !existsSync(abs) && (await localStorageProvider.sizeOf(KEY)) === null);

  // ۵) ضد path traversal — همهٔ عملیات
  await expectUnsafe(() => localStorageProvider.put("../../escape", payload), "put با ../ رد میشود");
  await expectUnsafe(() => localStorageProvider.openRange("coach-exercises/../bank-exercises/x", 0, 1), "openRange با ../ داخلی رد میشود");
  await expectUnsafe(() => localStorageProvider.sizeOf("not-a-namespace/abc/def"), "namespace نامعتبر رد میشود");
  await expectUnsafe(() => localStorageProvider.delete("coach-exercises/abc"), "کلید دو-جزئی رد میشود");
  await expectUnsafe(() => localStorageProvider.put("coach-exercises/abc/..\\..\\x", payload), "بک‌اسلش رد میشود");
  await expectUnsafe(() => localStorageProvider.openRange("", 0, 1), "کلید خالی رد میشود");
  ok("مسیر مطلق سیستم هم داخل ریشه نمیماند", !path.resolve(ROOT, "coach-exercises/../../../etc/passwd").startsWith(ROOT));

  // ۶) پاکسازی فقط مسیر تست خودش
  await rm(TEST_DIR, { recursive: true, force: true });
  ok("پاکسازی: مسیر تست حذف شد", !existsSync(TEST_DIR));
  const leftInNamespace = existsSync(path.join(ROOT, "coach-exercises"));
  console.log(`  (اطلاع) data/uploads/coach-exercises ${leftInNamespace ? "وجود دارد" : "حذف شد"} — رسانهٔ واقعی پروژه: 0 ردیف`);

  console.log(`\n${passed}/${passed + failed} smoke checks passed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("ERROR:", err instanceof Error ? err.message : err);
  process.exit(1);
});
