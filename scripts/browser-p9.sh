#!/bin/bash
# تست‌های مرورگر مرحله ۹ — چت واقعی دستیار در UI (نسخه با انتظار فعال)
set -u
BASE="http://localhost:3000"
TS=$(date +%s)
EMAIL="p9-browser-$TS@test.local"
CK="/tmp/p9-b-cookie.txt"
PASS=0; FAIL=0
check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $name"; PASS=$((PASS+1))
  else
    echo "FAIL  $name — expected=[$expected] actual=[$actual]"; FAIL=$((FAIL+1))
  fi
}
# انتظار فعال تا شرط JS برقرار شود — WAITFOR "<js>" <max_tries> <result_var>
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

echo "== 0) ثبت‌نام کاربر مرورگر و داده زمینه =="
code=$(curl -s -c $CK -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر مرورگر۹\",\"email\":\"$EMAIL\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام کاربر مرورگر → 200" "200" "$code"
# ممیزی مرحله ۱۱: در حالت production نام کوکی __Secure-fitcoach.session_token است
CKNAME=$(rg -o "(?:__Secure-)?fitcoach\.session_token" $CK | head -1)
TOKEN=$(rg "(?:__Secure-)?fitcoach\.session_token" $CK | awk '{print $NF}')
SECFLAG=$([ "${CKNAME#__Secure-}" != "$CKNAME" ] && echo "--secure" || echo "")
check "کوکی نشست استخراج شد" "yes" "$([ -n "$TOKEN" ] && echo yes || echo no)"

timeout 90 bun -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const u = await db.user.findFirst({ where: { email: { startsWith: 'p9-browser-' } }, orderBy: { createdAt: 'desc' } });
if (!u) { console.error('user not found'); process.exit(1); }
await db.fitnessProfile.create({ data: { userId: u.id, displayName: 'کاربر مرورگر۹', age: 30, gender: 'male', heightCm: 180, weightKg: 88, goal: 'muscle_gain', experience: 'beginner', trainingDaysPerWeek: 3, equipmentJson: '[]', limitationsJson: '[]', units: 'metric' } });
await db.weightEntry.createMany({ data: [
  { userId: u.id, weightKg: 89.5, recordedAt: new Date(Date.now() - 10*86400000) },
  { userId: u.id, weightKg: 88.0, recordedAt: new Date(Date.now() - 3*86400000) },
] });
console.log('seeded profile + weights for', u.id);
await db.\$disconnect();
"

echo "== 1) ورود با تزریق کوکی و باز کردن اپ =="
agent-browser set viewport 1280 900
agent-browser open $BASE >/dev/null 2>&1
# ممیزی مرحله ۱۱: پاک‌سازی کوکی‌های نشست قدیمی سوئیت‌های قبل —
# کوکی کهنه‌ای از کاربر دیگر باعث می‌شد سرور کاربر اشتباه را بشناسد
# و مکالمه/ثبتِ seed شده هرگز در UI دیده نمی‌شد (شکست قطعی تست XSS).
agent-browser cookies clear >/dev/null 2>&1 || true
agent-browser cookies set "$CKNAME" "$TOKEN" --url http://localhost:3000 $SECFLAG --sameSite Lax --httpOnly >/dev/null 2>&1
# محیط زبان خنثی — localStorage مرورگر ممکن است از اجرای قبلی زبان را نگه داشته باشد
agent-browser storage local clear >/dev/null 2>&1
agent-browser reload >/dev/null 2>&1
waitfor "fetch('/api/assistant/status').then(r=>r.status===200?'YES':'NO')" 20 AUTHCODE
check "نشست در مرورگر معتبر (status=200)" "YES" "$AUTHCODE"

echo "== 2) ورود به بخش دستیار و تعیین وضعیت اتصال =="
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('دستیار هوشمند')); if (btn) { btn.click(); return 'ok'; } return 'NAV NOT FOUND'; })()"
waitfor "document.body.innerText.includes('اتصال مدل فعال است') ? 'YES' : (document.body.innerText.includes('پیکربندی نشده') ? 'NOCONN' : 'NO')" 30 CONNECTED
check "نشانگر اتصال واقعی: «اتصال مدل فعال است»" "YES" "$CONNECTED"
sugg=$(agent-browser eval "document.body.innerText.includes('گفت‌وگو را شروع کنید')" 2>/dev/null | tr -d '"')
check "حالت خالی با راهنما نمایش داده شد" "true" "$sugg"

echo "== 3) ارسال پیام فارسی و پاسخ واقعی مدل =="
waitfor "(() => { const ta = document.querySelector('textarea'); return ta && !ta.disabled ? 'YES' : 'NO'; })()" 30 TA_READY
ab "
(() => {
  const ta = document.querySelector('textarea');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, 'بر اساس پروفایل من، برای شروع تمرین از کجا شروع کنم؟ یک پاراگراف کوتاه فارسی بنویس.');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return 'filled';
})()"
sleep 1
ab "(() => { const btn = Array.from(document.querySelectorAll('button[aria-label=\"ارسال\"]')).pop(); if (btn) { btn.click(); return 'clicked'; } return 'NO BUTTON'; })()"
waitfor "
(() => {
  const bubbles = Array.from(document.querySelectorAll('[role=\"status\"]'));
  const fa = bubbles.filter(b => (b.textContent.match(/[\u0600-\u06FF]/g) || []).length >= 25);
  return fa.length >= 1 ? 'YES' : 'NO';
})()" 45 FAREPLY
check "پاسخ واقعی مدل در UI نمایش داده شد (≤۹۰s)" "YES" "$FAREPLY"
agent-browser screenshot /home/z/my-project/download/p9-chat-fa.png >/dev/null 2>&1

echo "== 4) انتخاب زبان پاسخ English — رابط طبق زبان سراسری می‌ماند =="
# (مرحله ۱۳) انتخاب‌گر دستیار فقط «زبان پاسخ» را کنترل می‌کند؛ متن و جهت رابط
# از کلید سراسری زبان می‌آید که در این سوئیت فارسی/rtl است.
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'English'); if (btn) { btn.click(); return 'ok'; } return 'NOT FOUND'; })()"
sleep 1
waitfor "document.querySelector('section[aria-label=\"دستیار هوشمند\"]')?.getAttribute('dir') === 'rtl' ? 'YES' : 'NO'" 10 ENDIR
check "رابط چت با زبان سراسری فارسی می‌ماند (rtl)" "YES" "$ENDIR"
entext=$(agent-browser eval "document.body.innerText.includes('مکالمه جدید')" 2>/dev/null | tr -d '"')
check "متن‌های رابط همچنان فارسی‌اند" "true" "$entext"

echo "== 5) پیام انگلیسی → پاسخ انگلیسی =="
waitfor "(() => { const ta = document.querySelector('textarea'); return ta && !ta.disabled ? 'YES' : 'NO'; })()" 20 TA_READY2
ab "
(() => {
  const ta = document.querySelector('textarea');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  setter.call(ta, 'How many rest minutes do you suggest between sets for beginners? Answer briefly in English.');
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  return 'filled';
})()"
sleep 1
ab "(() => { const btn = Array.from(document.querySelectorAll('button[aria-label=\"ارسال\"]')).pop(); if (btn) { btn.click(); return 'clicked'; } return 'NO BUTTON'; })()"
waitfor "
(() => {
  const bubbles = Array.from(document.querySelectorAll('[role=\"status\"]'));
  const en = bubbles.filter(b => {
    const t = b.textContent;
    const latin = (t.match(/[A-Za-z]/g) || []).length;
    const arabic = (t.match(/[\u0600-\u06FF]/g) || []).length;
    return latin > 40 && latin > arabic * 2;
  });
  return en.length >= 1 ? 'YES' : 'NO';
})()" 45 ENREPLY
check "پاسخ انگلیسی واقعی مدل در UI" "YES" "$ENREPLY"
agent-browser screenshot /home/z/my-project/download/p9-chat-en.png >/dev/null 2>&1

echo "== 6) ماندگاری انتخاب زبان پاسخ و تاریخچه پس از refresh =="
agent-browser reload >/dev/null 2>&1
waitfor "document.body.innerText.includes('دستیار هوشمند')" 20 NAVREADY
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('دستیار هوشمند')); btn?.click(); return 'ok'; })()"
waitfor "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'English'); return btn && btn.getAttribute('aria-pressed') === 'true' ? 'YES' : 'NO'; })()" 20 PERSIST
check "انتخاب زبان پاسخ پس از refresh حفظ شد (English فعال)" "YES" "$PERSIST"
waitfor "document.querySelector('ul button') ? 'YES' : 'NO'" 20 LISTREADY
ab "(() => { document.querySelector('ul button')?.click(); return 'ok'; })()"
waitfor "document.querySelectorAll('[role=\"status\"]').length >= 1 ? 'YES' : 'NO'" 20 HIST
check "تاریخچه پیام‌ها پس از refresh با بازکردن مکالمه بازیابی شد" "YES" "$HIST"

echo "== 7) بازگشت به فارسی + مکالمه جدید =="
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'فارسی'); btn?.click(); return 'ok'; })()"
waitfor "Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('مکالمه جدید')) ? 'YES' : 'NO'" 10 FAUI
ab "(() => { const btns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('مکالمه جدید')); btns[btns.length - 1]?.click(); return 'ok'; })()"
waitfor "document.body.innerText.includes('گفت‌وگو را شروع کنید') ? 'YES' : 'NO'" 10 NEWEMPTY
check "مکالمه جدید خالی ایجاد شد" "YES" "$NEWEMPTY"

echo "== 8) XSS — Markdown ناامن اجرا نمی‌شود =="
timeout 90 bun -e "
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const u = await db.user.findFirst({ where: { email: { startsWith: 'p9-browser-' } }, orderBy: { createdAt: 'desc' } });
const conv = await db.assistantConversation.findFirst({ where: { userId: u.id, messages: { none: {} } }, orderBy: { createdAt: 'desc' } });
const payload = '<img src=x onerror=\"window.__xss=1\"> و <script>window.__xss2=1</script> و [کلیک من](javascript:alert(1)) — فقط باید متن خام دیده شود.';
await db.assistantMessage.create({ data: { conversationId: conv.id, userId: u.id, role: 'assistant', content: payload, lang: null } });
console.log('xss message seeded in', conv.id);
await db.\$disconnect();
"
agent-browser reload >/dev/null 2>&1
waitfor "document.body.innerText.includes('دستیار هوشمند')" 20 NAVREADY2
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('دستیار هوشمند')); btn?.click(); return 'ok'; })()"
waitfor "document.querySelector('ul button') ? 'YES' : 'NO'" 20 LISTREADY2
ab "(() => { document.querySelector('ul button')?.click(); return 'ok'; })()"
waitfor "Array.from(document.querySelectorAll('[role=\"status\"]')).some(b => b.textContent.includes('<img src=x')) ? 'YES' : 'NO'" 20 XSSVISIBLE
xss1=$(agent-browser eval "window.__xss === undefined" 2>/dev/null | tr -d '"')
check "onerror تزریق‌شده اجرا نشد" "true" "$xss1"
rawtext=$(agent-browser eval "Array.from(document.querySelectorAll('[role=\"status\"]')).some(b => b.textContent.includes('<img src=x'))" 2>/dev/null | tr -d '"')
check "HTML خام به‌صورت متن نمایش داده شد (نه رندر)" "true" "$rawtext"
jslink=$(agent-browser eval "
(() => {
  const a = document.querySelector('[role=\"status\"] a[href^=\"javascript\"]');
  return a ? 'DANGEROUS' : 'SAFE';
})()" 2>/dev/null | tr -d '"')
check "لینک javascript: بی‌خطر شد" "SAFE" "$jslink"

echo "== 9) حذف مکالمه با تأیید =="
ab "(() => { document.querySelectorAll('button[aria-label^=\"حذف مکالمه\"]')[0]?.click(); return 'ok'; })()"
waitfor "document.body.innerText.includes('حذف مکالمه؟') ? 'YES' : 'NO'" 10 DLG
check "دیالوگ تأیید حذف باز شد" "YES" "$DLG"
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'حذف کن'); btn?.click(); return 'ok'; })()"
waitfor "document.body.innerText.includes('هنوز مکالمه‌ای ندارید') || document.body.innerText.includes('گفت‌وگو را شروع کنید') ? 'YES' : 'NO'" 10 EMPTIED
check "پس از حذف، وضعیت خالی صادقانه" "YES" "$EMPTIED"

echo "== 10) موبایل ۳۹۰px — بدون سرریز افقی (فارسی و انگلیسی) =="
agent-browser set viewport 390 844
sleep 2
overflow_fa=$(agent-browser eval "document.documentElement.scrollWidth <= 391 ? 'OK' : 'OVERFLOW:' + document.documentElement.scrollWidth" 2>/dev/null | tr -d '"')
check "۳۹۰px فارسی بدون سرریز افقی" "OK" "$overflow_fa"
ab "(() => { const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'English'); btn?.click(); return 'ok'; })()"
sleep 1
overflow_en=$(agent-browser eval "document.documentElement.scrollWidth <= 391 ? 'OK' : 'OVERFLOW:' + document.documentElement.scrollWidth" 2>/dev/null | tr -d '"')
check "۳۹۰px انگلیسی بدون سرریز افقی" "OK" "$overflow_en"
ab "(() => { const btn = document.querySelector('button[aria-label=\"Conversations\"]') || document.querySelector('button[aria-label=\"مکالمه‌ها\"]'); btn?.click(); return 'ok'; })()"
waitfor "document.body.innerText.includes('Conversations') || document.body.innerText.includes('مکالمه‌ها') ? 'YES' : 'NO'" 10 SHEET
check "فهرست مکالمه‌ها در موبایل باز شد (Sheet)" "YES" "$SHEET"
overflow_sheet=$(agent-browser eval "document.documentElement.scrollWidth <= 391 ? 'OK' : 'OVERFLOW'" 2>/dev/null | tr -d '"')
check "۳۹۰px با Sheet باز بدون سرریز" "OK" "$overflow_sheet"
agent-browser screenshot /home/z/my-project/download/p9-mobile-390.png >/dev/null 2>&1

echo "== 11) رگرسیون — بخش‌های قبلی سالم =="
agent-browser set viewport 1280 900
sleep 1
reg_ok="yes"
for view in "داشبورد" "کتابخانه حرکات" "برنامه تمرینی" "برنامه غذایی" "پیشرفت من" "پروفایل و تنظیمات"; do
  agent-browser eval "
(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim().startsWith('$view'));
  if (btn) { btn.click(); return 'ok'; }
  return 'NAV NOT FOUND: $view';
})()" >/dev/null 2>&1
  sleep 3
  haserror=$(agent-browser eval "document.body.innerText.includes('Application error') || document.body.innerText.includes('Unhandled Runtime Error')" 2>/dev/null | tr -d '"')
  if [ "$haserror" = "true" ]; then reg_ok="no($view)"; fi
done
check "شش بخش اصلی بدون خطای اجرا" "yes" "$reg_ok"

echo "== 12) کنسول مرورگر =="
console_out=$(agent-browser console 2>/dev/null | tail -20)
console_errors=$(echo "$console_out" | rg -c "\[ERROR\]" || true)
echo "      └ خطاهای کنسول: ${console_errors:-0}"
errors_out=$(agent-browser errors 2>/dev/null | tail -10)
echo "      └ صفحه‌خطاها: $(echo "$errors_out" | head -3)"

echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
# بازنشانی زبان برای اجراهای بعدی
agent-browser storage local set "fitcoach.assistant.lang" "auto" >/dev/null 2>&1 || true
