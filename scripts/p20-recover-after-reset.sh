#!/usr/bin/env bash
# p20-recover-after-reset.sh — ترمیم تک‌فرمانی پس از بازنشانی سندباکس (idempotent)
# استفاده: bash scripts/p20-recover-after-reset.sh
#
# پس از هر reset سندباکس (تاکنون ۳ بار: ۰۶:۱۸ دیروز، ۱۱:۵۱ و ۲۱:۲۳ امروز) کافی است
# این یک فرمان اجرا شود: نقش ادمین + بانک ۹۰۵ حرکتی + نگاشت سه‌بعدی + وریفای + بکاپ.
# همه مراحل idempotent هستند — اجرای مکرر هیچ رکورد تکراری نمی‌سازد.
set -uo pipefail
cd "$(dirname "$0")/.."

echo "== 1/5 بازگردانی نقش ادمین (mahziar.parvizi@gmail.com) =="
bun scripts/p195-admin-bootstrap.ts --email mahziar.parvizi@gmail.com --confirm

echo ""
echo "== 2/5 بازسازی بانک حرکات (p18 — ۹۰۵ حرکت) =="
bun scripts/p18-import-exercises.ts | tail -2

echo ""
echo "== 3/5 بازسازی نگاشت سه‌بعدی (p19) =="
bun scripts/p19-import-mapping.ts | tail -2

echo ""
echo "== 4/5 تأیید انتها-به-انتها (۵ چک) =="
bun scripts/p196-admin-verify.ts

echo ""
echo "== 5/5 بکاپ پس از ترمیم =="
bun scripts/p20-db-backup.ts post-repair

echo ""
echo "== تمام — وضعیت نهایی =="
bun scripts/p20-db-inspect.ts | tail -3
