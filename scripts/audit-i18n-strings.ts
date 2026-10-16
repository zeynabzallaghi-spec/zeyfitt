#!/usr/bin/env bun
/**
 * ممیزی i18n — متن‌های فارسی باقی‌مانده در JSX همه کامپوننت‌ها.
 *
 * قاعده: هیچ رشته فارسیِ قابل نمایش نباید مستقیم در JSX باشد؛ همه باید از
 * دیکشنری‌های src/lib/i18n/sections بیایند. استثناهای مجاز:
 *  - کامنت‌ها (JSX comments و // و /* *\/)
 *  - مقادیر DATA فارسی که عمداً نمایش داده می‌شوند (از طریق توابع نمایش)
 *  - فایل‌های دستیار که سازوکار دوزبانه خودشان را دارند (assistant/*)
 *
 * خروجی: فهرست فایل‌هایی که رشته فارسی در JSX دارند + شماره خط.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "/home/z/my-project/src/components";

// فایل‌هایی که ممیزی نمی‌شوند (سازوکار خودشان را دارند یا کامنت‌محورند)
const SKIP = new Set<string>();

const FA_RANGE = "[\\u0600-\\u06FF\\u200c]";
// رشته فارسی داخل کوتیشن: حداقل ۲ نویسه فارسی پیوسته (تا متغیرها/کلاس‌ها خطا نگیرند)
const FA_STRING = new RegExp(
  `(["'\`])[^"'\`]*${FA_RANGE}{2,}[^"'\`]*\\1`,
  "g"
);

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, files);
    else if (/\.(tsx|ts)$/.test(entry) && !SKIP.has(relative(ROOT, full))) files.push(full);
  }
  return files;
}

let problems = 0;
for (const file of walk(ROOT)) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file);
  const lines = src.split("\n");
  lines.forEach((line, i) => {
    // حذف کامنت‌های سطری و بلوکی و JSX
    const bare = line
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\/.*$/, "");
    FA_STRING.lastIndex = 0;
    const m = FA_STRING.exec(bare);
    if (m) {
      problems++;
      console.log(`${rel}:${i + 1}: ${m[0].slice(0, 90)}`);
    }
  });
}

console.log(`\nTOTAL: ${problems} Persian string literal(s) in JSX/code`);
process.exit(problems > 0 ? 1 : 0);
