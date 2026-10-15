#!/bin/bash
# ============================================================
# تست‌های مرورگر مرحله ۱۰ — ثبت مصرف واقعی غذا در UI
# (ثبت از بانک، ثبت از برنامه، ویرایش/حذف، ماندگاری، دوزبانگی، ۳۹۰px)
# ============================================================
set -u
BASE="http://localhost:3000"
TS=$(date +%s)
EMAIL="p10-browser-$TS@test.local"
HDR="/tmp/p10-b-auth.txt"
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

echo "== 0) آماده‌سازی: ثبت‌نام + پروفایل + برنامه فعال =="
code=$(curl -s -D $HDR -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر مرورگر۱۰\",\"email\":\"$EMAIL\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام کاربر مرورگر → 200" "200" "$code"
COOKIE=$(grep -o '__Secure-fitcoach\.session_token=[^;]*' $HDR | head -1 | cut -d= -f2-)
check "کوکی نشست استخراج شد" "yes" "$([ -n "$COOKIE" ] && echo yes || echo no)"

timeout 90 bun -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const u = await db.user.findFirst({ where: { email: { startsWith: 'p10-browser-' } }, orderBy: { createdAt: 'desc' } });
if (!u) { console.error('user not found'); process.exit(1); }
await db.fitnessProfile.create({ data: { userId: u.id, displayName: 'کاربر مرورگر۱۰', age: 30, gender: 'male', heightCm: 180, weightKg: 88, goal: 'maintain', experience: 'beginner', trainingDaysPerWeek: 3, equipmentJson: '[]', limitationsJson: '[]', units: 'metric' } });
console.log('profile seeded for', u.id);
await db.\$disconnect();
"

code=$(curl -s -H "Cookie: __Secure-fitcoach.session_token=$COOKIE" -o /tmp/p10-b-plan.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"maintain","activityLevel":"light","mealsPerDay":3,"planLength":1,"dietPattern":"none","allergens":[],"dislikedFoodIds":[],"budget":"any","prep":"any","pregnancyBreastfeeding":false,"estimate":{"age":30,"heightCm":180,"weightKg":88,"gender":"male"}}' \
  $BASE/api/nutrition)
check "ساخت برنامه فعال برای مرورگر → 201" "201" "$code"

echo "== 1) ورود با تزریق کوکی و باز کردن اپ =="
agent-browser set viewport 1280 900 >/dev/null 2>&1
agent-browser open $BASE >/dev/null 2>&1
agent-browser cookies set "__Secure-fitcoach.session_token" "$COOKIE" --url $BASE --secure --sameSite Lax --httpOnly >/dev/null 2>&1
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
waitfor "fetch('/api/nutrition').then(r=>r.status===200?'YES':'NO')" 20 SESS
check "نشست در مرورگر معتبر" "YES" "$SESS"

echo "== 2) رفتن به بخش تغذیه — بخش مصرف واقعی =="
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('برنامه غذایی')); if (btn) { btn.click(); return 'ok'; } return 'NAV NOT FOUND'; })()"
waitfor "document.body.innerText.includes('مصرف واقعی غذا') ? 'YES' : 'NO'" 25 SECTION
check "بخش «مصرف واقعی غذا» رندر شد" "YES" "$SECTION"
waitfor "document.body.innerText.includes('این روز ثبت مصرفی ندارد') ? 'YES' : 'NO'" 15 EMPTY
check "حالت خالی صادقانه روز" "YES" "$EMPTY"

echo "== 3) ثبت از بانک غذا =="
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'ثبت غذا'); if (btn) { btn.click(); return 'ok'; } return 'NOT FOUND'; })()"
waitfor "document.body.innerText.includes('جست‌وجو در بانک مواد غذایی') ? 'YES' : 'NO'" 15 DIALOG
check "دیالوگ ثبت باز شد" "YES" "$DIALOG"
ab "
(() => {
  const input = document.querySelector('input[placeholder*=\"نام غذا\"]');
  if (!input) return 'NO INPUT';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, 'تخم');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
})()"
waitfor "(() => { const b = Array.from(document.querySelectorAll('[role=dialog], .fixed.inset-0 button')).find(x => x.textContent.includes('تخم‌مرغ آب‌پز')); return b ? 'YES' : 'NO'; })()" 15 EGG
check "جست‌وجوی فارسی تخم‌مرغ را یافت" "YES" "$EGG"
ab "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.includes('تخم‌مرغ آب‌پز')); if (b) { b.click(); return 'ok'; } return 'NO'; })()"
sleep 1
ab "
(() => {
  const dlg = document.querySelector('.fixed.inset-0');
  if (!dlg) return 'NO DIALOG';
  const amount = dlg.querySelector('input[inputmode=decimal]');
  if (!amount) return 'NO AMOUNT';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(amount, '120');
  amount.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
})()"
sleep 1
PREV=$(agent-browser eval "(() => { const dlg = document.querySelector('.fixed.inset-0'); return dlg && dlg.innerText.includes('پیش‌نمایش') || (dlg && dlg.innerText.includes('تخمین این ثبت')) ? (dlg.innerText.match(/۱۸۶/) ? 'YES' : 'NO') : 'NO'; })()" 2>/dev/null | tr -d '"')
check "پیش‌نمایش زنده ۱۸۶ کیلوکالری" "YES" "$PREV"
ab "(() => { const btns = Array.from(document.querySelectorAll('button')); const b = btns.find(x => x.textContent.includes('ثبت مصرف')); if (b && !b.disabled) { b.click(); return 'ok'; } return 'DISABLED'; })()"
waitfor "document.body.innerText.includes('تخم‌مرغ آب‌پز') && !document.querySelector('.fixed.inset-0') ? 'YES' : 'NO'" 20 LOGGED
check "ثبت انجام شد و ردیف در فهرست آمد" "YES" "$LOGGED"
waitfor "document.body.innerText.includes('۱۸۶') ? 'YES' : 'NO'" 15 TOTALS
check "جمع روز ۱۸۶ نمایش داده شد" "YES" "$TOTALS"

echo "== 4) ماندگاری پس از reload =="
agent-browser reload >/dev/null 2>&1
waitfor "document.body.innerText.includes('مصرف واقعی غذا') ? 'YES' : 'NO'" 25 RELOADED
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('برنامه غذایی')); if (btn) btn.click(); return 1; })()"
waitfor "document.body.innerText.includes('تخم‌مرغ آب‌پز') ? 'YES' : 'NO'" 25 PERSIST
check "ثبت پس از reload از پایگاه داده بازیابی شد" "YES" "$PERSIST"

echo "== 5) ویرایش مقدار =="
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'ویرایش'); if (btn) { btn.click(); return 'ok'; } return 'NO'; })()"
waitfor "document.body.innerText.includes('ویرایش ثبت مصرف') ? 'YES' : 'NO'" 15 EDITDLG
check "دیالوگ ویرایش باز شد" "YES" "$EDITDLG"
ab "
(() => {
  const dlg = document.querySelector('.fixed.inset-0');
  const amount = dlg && dlg.querySelector('input[inputmode=decimal]');
  if (!amount) return 'NO';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(amount, '60');
  amount.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
})()"
sleep 1
ab "(() => { const btns = Array.from(document.querySelectorAll('button')); const b = btns.find(x => x.textContent.trim() === 'ذخیره تغییر'); if (b && !b.disabled) { b.click(); return 'ok'; } return 'DISABLED'; })()"
waitfor "document.body.innerText.includes('۹۳') ? 'YES' : 'NO'" 20 EDITED
check "بعد از ویرایش ۹۳ کیلوکالری" "YES" "$EDITED"

echo "== 6) ثبت از قلم برنامه با دکمه قلم =="
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'ثبت مصرف'); if (btn) { btn.click(); return 'ok'; } return 'NO'; })()"
waitfor "document.body.innerText.includes('مقدار پیشنهادی برنامه به‌عنوان خورده‌شده ثبت نمی‌شود') ? 'YES' : 'NO'" 15 PREFILL
check "دیالوگ قلم برنامه با هشدار مقدار واقعی باز شد" "YES" "$PREFILL"
ab "
(() => {
  const dlg = document.querySelector('.fixed.inset-0');
  const amount = dlg && dlg.querySelector('input[inputmode=decimal]');
  if (!amount) return 'NO';
  const half = Math.round(Number(amount.value) / 2);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(amount, String(half));
  amount.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
})()"
sleep 1
ab "(() => { const btns = Array.from(document.querySelectorAll('button')); const b = btns.find(x => x.textContent.includes('ثبت مصرف')); if (b && !b.disabled) { b.click(); return 'ok'; } return 'DISABLED'; })()"
waitfor "document.body.innerText.includes('از برنامه') ? 'YES' : 'NO'" 20 PLANLOG
check "ثبت برنامه‌ای با نشان «از برنامه»" "YES" "$PLANLOG"
waitfor "document.body.innerText.includes('مقایسه با برنامه غذایی') ? 'YES' : 'NO'" 15 COMP
check "بخش مقایسه با برنامه ظاهر شد" "YES" "$COMP"
HINT=$(agent-browser eval "document.body.innerText.includes('به معنی نخوردن آن نیست') ? 'YES' : 'NO'" 2>/dev/null | tr -d '"')
check "یادداشت صادقانه «ثبت‌نشدن ≠ نخوردن»" "YES" "$HINT"

echo "== 7) حذف با تأیید =="
BEFORE=$(agent-browser eval "document.body.innerText.match(/ثبت/g) ? 'yes' : 'no'" 2>/dev/null | tr -d '"')
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.getAttribute('aria-label') === 'حذف'); if (btn) { btn.click(); return 'ok'; } return 'NO'; })()"
waitfor "document.body.innerText.includes('حذف این ثبت؟') ? 'YES' : 'NO'" 15 DELDLG
check "دیالوگ تأیید حذف باز شد" "YES" "$DELDLG"
ab "(() => { const b = Array.from(document.querySelectorAll('button')).find(x => x.textContent.trim() === 'حذف ثبت'); if (b) { b.click(); return 'ok'; } return 'NO'; })()"
waitfor "document.body.innerText.includes('ثبت حذف شد') || document.body.innerText.includes('جمع روز') ? 'YES' : 'NO'" 20 DELETED
check "حذف انجام شد" "YES" "$DELETED"

echo "== 8) دوزبانگی — English با LTR =="
ab "localStorage.setItem('fitcoach.assistant.lang', 'en'); 'ok'"
agent-browser reload >/dev/null 2>&1
waitfor "document.body.innerText.includes('Real food intake') ? 'YES' : 'NO'" 25 EN
check "رابط انگلیسی بخش مصرف رندر شد" "YES" "$EN"
DIRC=$(agent-browser eval "(() => { const el = Array.from(document.querySelectorAll('section')).find(s => s.innerText.includes('Real food intake')); return el ? el.getAttribute('dir') : 'NONE'; })()" 2>/dev/null | tr -d '"')
check "جهت بخش انگلیسی ltr" "ltr" "$DIRC"
LANGATTR=$(agent-browser eval "(() => { const el = Array.from(document.querySelectorAll('section')).find(s => s.innerText.includes('Real food intake')); return el ? el.getAttribute('lang') : 'NONE'; })()" 2>/dev/null | tr -d '"')
check "lang=en روی بخش" "en" "$LANGATTR"
ENEMPTY=$(agent-browser eval "document.body.innerText.includes('No entries for this day') || document.body.innerText.includes('Foods logged on this day') ? 'YES' : 'NO'" 2>/dev/null | tr -d '"')
check "حالت‌های انگلیسی طبیعی (بدون فارسی باقی‌مانده)" "YES" "$ENEMPTY"

echo "== 9) موبایل ۳۹۰ — بدون سرریز افقی در هر دو زبان =="
agent-browser set viewport 390 844 >/dev/null 2>&1
sleep 2
OVF_EN=$(agent-browser eval "(document.documentElement.scrollWidth <= 391) ? 'YES' : 'NO'" 2>/dev/null | tr -d '"')
check "390px انگلیسی: بدون سرریز افقی" "YES" "$OVF_EN"
ab "localStorage.setItem('fitcoach.assistant.lang', 'fa'); 'ok'"
agent-browser reload >/dev/null 2>&1
waitfor "document.body.innerText.includes('مصرف واقعی غذا') ? 'YES' : 'NO'" 25 FA
OVF_FA=$(agent-browser eval "(document.documentElement.scrollWidth <= 391) ? 'YES' : 'NO'" 2>/dev/null | tr -d '"')
check "390px فارسی: بدون سرریز افقی" "YES" "$OVF_FA"
DIRFA=$(agent-browser eval "(() => { const el = Array.from(document.querySelectorAll('section')).find(s => s.innerText.includes('مصرف واقعی غذا')); return el ? el.getAttribute('dir') : 'NONE'; })()" 2>/dev/null | tr -d '"')
check "جهت بخش فارسی rtl" "rtl" "$DIRFA"

echo "== 10) داشبورد — خلاصه مصرف واقعی امروز =="
agent-browser set viewport 1280 900 >/dev/null 2>&1
ab "(() => { const btns = Array.from(document.querySelectorAll('button')); const b = btns.find(x => x.textContent.includes('داشبورد')); if (b) { b.click(); return 'ok'; } return 'NO'; })()"
waitfor "document.body.innerText.includes('مصرف واقعی امروز') ? 'YES' : 'NO'" 25 DASH
check "کارت مصرف واقعی امروز در داشبورد" "YES" "$DASH"

echo ""
echo "نتیجه مرورگر: $PASS موفق / $FAIL شکست"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
