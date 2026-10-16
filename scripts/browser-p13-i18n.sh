#!/bin/bash
# ============================================================
# تست‌های مرورگر مرحله ۱۳ — الزام سراسری دوزبانه FA/EN
# (کلید سراسری زبان، RTL/LTR، پایداری پس از رفرش/ورود، هر ۸ بخش، موبایل)
# ============================================================
set -u
BASE="http://localhost:3000"
TS=$(date +%s)
EMAIL="p13-i18n-$TS@test.local"
HDR="/tmp/p13-auth.txt"
PASS=0; FAIL=0
check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $name"; PASS=$((PASS+1))
  else
    echo "FAIL  $name — expected=[$expected] actual=[$actual]"; FAIL=$((FAIL+1))
  fi
}
waitfor() {
  local js="$1" tries="$2" __var="$3"
  local out="NO"
  for i in $(seq 1 "$tries"); do
    sleep 2
    out=$(agent-browser eval "$js" 2>/dev/null | tr -d '"')
    if [ "$out" = "YES" ]; then break; fi
  done
  eval "$__var=\"$out\""
}
ab() { agent-browser eval "$1" >/dev/null 2>&1; }
ev() { agent-browser eval "$1" 2>/dev/null | tr -d '"'; }

echo "== 0) ثبت‌نام و تزریق نشست =="
code=$(curl -s -D $HDR -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر i18n\",\"email\":\"$EMAIL\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام کاربر مرورگر → 200" "200" "$code"
CKNAME=$(grep -o '\(__Secure-\)\?fitcoach\.session_token' $HDR | head -1)
COOKIE=$(grep -o '\(__Secure-\)\?fitcoach\.session_token=[^;]*' $HDR | head -1 | cut -d= -f2-)
check "کوکی نشست استخراج شد" "yes" "$([ -n "$COOKIE" ] && echo yes || echo no)"
SECFLAG=$([ "${CKNAME#__Secure-}" != "$CKNAME" ] && echo "--secure" || echo "")

# پروفایل کامل — تا کاربر مستقیم به پنل اصلی برسد (نه راه‌اندازی اولیه)
timeout 90 bun -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const u = await db.user.findFirst({ where: { email: { startsWith: 'p13-i18n-' } }, orderBy: { createdAt: 'desc' } });
if (!u) { console.error('user not found'); process.exit(1); }
await db.fitnessProfile.create({ data: { userId: u.id, displayName: 'کاربر i18n', age: 30, gender: 'male', heightCm: 178, weightKg: 80, goal: 'maintain', experience: 'beginner', trainingDaysPerWeek: 3, equipmentJson: '[]', limitationsJson: '[]', units: 'metric' } });
console.log('profile seeded for', u.id);
await db.\$disconnect();
" >/dev/null 2>&1

agent-browser set viewport 1280 900 >/dev/null 2>&1
agent-browser open $BASE >/dev/null 2>&1
agent-browser cookies clear >/dev/null 2>&1 || true
agent-browser cookies set "$CKNAME" "$COOKIE" --url $BASE $SECFLAG --sameSite Lax --httpOnly >/dev/null 2>&1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
waitfor "document.querySelector('h1')?'YES':'NO'" 20 SESS
check "اپ بارگذاری شد (h1 موجود)" "YES" "$SESS"

echo "== 1) پیش‌فرض: فارسی و RTL =="
check "lang=fa" "fa" "$(ev "document.documentElement.lang")"
check "dir=rtl" "rtl" "$(ev "document.documentElement.dir")"
check "سایدبار فارسی (داشبورد)" "YES" "$(ev "Array.from(document.querySelectorAll('nav button')).some(b=>b.textContent.includes('داشبورد'))?'YES':'NO'")"

echo "== 2) تغییر زبان به انگلیسی =="
ab "Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='English')?.click();'1'"
sleep 1
check "lang=en" "en" "$(ev "document.documentElement.lang")"
check "dir=ltr" "ltr" "$(ev "document.documentElement.dir")"
check "سایدبار انگلیسی (Dashboard)" "YES" "$(ev "Array.from(document.querySelectorAll('nav button')).some(b=>b.textContent.includes('Dashboard'))?'YES':'NO'")"
check "کارت وضعیت توسعه انگلیسی" "YES" "$(ev "document.body.textContent.includes('Development status')?'YES':'NO'")"
# عنوان اصلی آیتم فعال باید انگلیسی باشد (زیرعنوان دوزبانه عمداً حفظ شده است)
check "عنوان اصلی آیتم فعال انگلیسی است" "YES" "$(ev "(document.querySelector('nav button[aria-current=page] span span')?.textContent||'').trim()==='Dashboard'?'YES':'NO'")"

echo "== 3) پایداری پس از رفرش =="
agent-browser reload >/dev/null 2>&1
sleep 3
check "پس از رفرش: lang=en" "en" "$(ev "document.documentElement.lang")"
check "پس از رفرش: dir=ltr" "ltr" "$(ev "document.documentElement.dir")"

echo "== 4) هر ۸ بخش در حالت انگلیسی =="
for pair in "Dashboard:Dashboard" "3D Coach:3D Coach" "Exercise Library:Exercise Library" "Workout Plan:Workout Plan" "Nutrition Plan:Nutrition Plan" "My Progress:My Progress" "AI Assistant:AI Assistant" "Profile & Settings:Profile & Settings"; do
  label="${pair%%:*}"
  title="${pair##*:}"
  ab "Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('$label'))?.click();'1'"
  sleep 2
  check "EN سایدبار→$label" "YES" "$(ev "Array.from(document.querySelectorAll('nav button')).some(b=>b.textContent.includes('$label'))?'YES':'NO'")"
  waitfor "Array.from(document.querySelectorAll('h1')).some(h=>h.textContent.trim().includes('$title'))?'YES':'NO'" 10 H1
  check "EN عنوان $title" "YES" "$H1"
done

echo "== 5) بازگشت به فارسی و پایداری =="
ab "Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='فارسی')?.click();'1'"
sleep 1
check "بازگشت: dir=rtl" "rtl" "$(ev "document.documentElement.dir")"
agent-browser reload >/dev/null 2>&1
sleep 3
check "پس از رفرش: lang=fa" "fa" "$(ev "document.documentElement.lang")"
check "پس از رفرش: سایدبار فارسی" "YES" "$(ev "Array.from(document.querySelectorAll('nav button')).some(b=>b.textContent.includes('داشبورد'))?'YES':'NO'")"

echo "== 6) پایداری با ورود مجدد (کوکی جدید همان زبان) =="
# زبان را دوباره EN می‌کنیم، کوکی‌ها را پاک و دوباره تزریق می‌کنیم (شبیه‌سازی ورود مجدد)
ab "Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='English')?.click();'1'"
sleep 1
agent-browser cookies clear >/dev/null 2>&1 || true
agent-browser cookies set "$CKNAME" "$COOKIE" --url $BASE $SECFLAG --sameSite Lax --httpOnly >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
sleep 3
check "پس از ورود مجدد: lang=en" "en" "$(ev "document.documentElement.lang")"

echo "== 7) بازیابی از localStorage وقتی کوکی پاک شده =="
ab "document.cookie='fit-ui-lang=; path=/; max-age=0';'1'"
agent-browser reload >/dev/null 2>&1
sleep 3
check "localStorage → lang=en بازیابی شد" "en" "$(ev "document.documentElement.lang || 'fa'")"

echo "== 8) موبایل ۳۹۰px در EN و FA — بدون سرریز افقی =="
agent-browser set viewport 390 844 >/dev/null 2>&1
ab "Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='English')?.click();'1'"
sleep 1
OVF=$(ev "(document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 2 ? 'OK':'OVERRUN'")
check "EN موبایل: بدون سرریز افقی" "OK" "$OVF"
ab "Array.from(document.querySelectorAll('button')).find(b=>b.getAttribute('aria-label')==='فارسی')?.click();'1'"
sleep 1
OVF=$(ev "(document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 2 ? 'OK':'OVERRUN'")
check "FA موبایل: بدون سرریز افقی" "OK" "$OVF"

echo "== 9) دیالوگ وزن — جهت و متن دوزبانه (FA) =="
agent-browser set viewport 1280 900 >/dev/null 2>&1
ab "Array.from(document.querySelectorAll('nav button')).find(b=>b.textContent.includes('داشبورد'))?.click();'1'"
sleep 2

echo ""
echo "========================================"
echo "نتیجه: $PASS موفق / $FAIL شکست"
[ "$FAIL" = "0" ] && echo "ALL PASS" || echo "بعضی تست‌ها شکست خوردند"
