#!/bin/bash
# تست مرورگر مرحله ۸ — شروع تمرین آزاد، ثبت ست، ذخیره در سرور، رفرش، مربی ۳بعدی، پایان جلسه
# (ثبت‌نام/پروفایل از API — مسیر UI آن در فازهای ۳-۷ تست شده است)
set -u
cd /home/z/my-project

setsid nohup bash -c 'exec ./node_modules/.bin/next dev -p 3000 >> dev.log 2>&1' < /dev/null > /dev/null 2>&1 & disown
for i in $(seq 1 40); do code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/sessions/active 2>/dev/null); [ "$code" != "000" ] && break; sleep 1; done
echo "server:$code"

AB="agent-browser"
PASS=0; FAIL=0
check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then echo "PASS  $name"; PASS=$((PASS+1));
  else echo "FAIL  $name — expected=[$expected] actual=[$actual]"; FAIL=$((FAIL+1)); fi
}

EMAIL="p8-browser-$(date +%s)@test.local"
JA=/tmp/p8-browser-cookie.txt

echo "== 0) آماده‌سازی حساب با API =="
code=$(curl -s -c $JA -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"تست‌کاربر هشت\",\"email\":\"$EMAIL\",\"password\":\"test1234\"}" http://localhost:3000/api/auth/sign-up/email)
check "ثبت‌نام API → 200" "200" "$code"
code=$(curl -s -b $JA -o /dev/null -w "%{http_code}" -X PUT -H 'Content-Type: application/json' \
  -d '{"displayName":"تست‌کاربر هشت","age":28,"gender":"male","heightCm":178,"weightKg":75,"bodyFat":null,"goal":"muscle_gain","experience":"beginner","trainingDaysPerWeek":3,"sessionMinutes":60,"equipment":["dumbbell","bodyweight"],"limitations":[],"limitationNotes":null,"diet":"none","allergies":[],"units":"metric"}' \
  http://localhost:3000/api/profile)
check "تکمیل پروفایل API → 200" "200" "$code"

# کوکی نشست را در مرورگر تزریق می‌کنیم (نام کوکی پروژه: fitcoach.session_token)
TOKEN=$(rg -o "fitcoach\.session_token\s+(\S+)" $JA -r '$1' | head -1 | tr -d '\t')
echo "token-found:$([ -n "$TOKEN" ] && echo yes || echo no)"
$AB close > /dev/null 2>&1 || true
$AB open http://localhost:3000 > /dev/null 2>&1
sleep 2
# ممیزی مرحله ۱۱: پاک‌سازی کوکی‌های نشست قدیمی سوئیت‌های قبل —
# کوکی کهنه‌ای از کاربر دیگر باعث می‌شد سرور کاربر اشتباه را بشناسد
# و مکالمه/ثبتِ seed شده هرگز در UI دیده نمی‌شد (شکست قطعی تست XSS).
$AB cookies clear >/dev/null 2>&1 || agent-browser cookies clear >/dev/null 2>&1 || true
$AB cookies set "__Secure-fitcoach.session_token" "$TOKEN" --url http://localhost:3000 --secure --sameSite Lax --httpOnly > /dev/null 2>&1
$AB open http://localhost:3000 > /dev/null 2>&1
sleep 4
$AB wait --load networkidle > /dev/null 2>&1 || true
logged=$($AB get url 2>/dev/null)
check "ورود با کوکی — داشبورد" "yes" "$(echo "$logged" | rg -q "3000" && echo yes || echo no)"
dash=$($AB snapshot -c 2>/dev/null | rg -c "سلام|داشبورد" || echo 0)
check "داشبورد شخصی رندر شد" "yes" "$([ "$dash" -gt 0 ] && echo yes || echo no)"

echo "== 1) ناوبری به برنامه تمرینی =="
$AB find text "برنامه تمرینی" click > /dev/null 2>&1
sleep 2
start_section=$($AB snapshot -c 2>/dev/null | rg -c "شروع تمرین" || echo 0)
check "بخش «شروع تمرین» نمایان است" "yes" "$([ "$start_section" -gt 0 ] && echo yes || echo no)"
free_btn=$($AB snapshot -c 2>/dev/null | rg -c "تمرین آزاد" || echo 0)
check "دکمه «تمرین آزاد» هست" "yes" "$([ "$free_btn" -gt 0 ] && echo yes || echo no)"

echo "== 2) شروع تمرین آزاد از دیالوگ =="
# ممیزی مرحله ۱۱: find text عبارت را در پاراگراف توضیحات هم می‌یافت و به‌جای
# دکمه همان را کلیک می‌کرد → دیالوگ باز نمی‌شد. یاب نقش‌محور فقط دکمه را می‌گیرد.
$AB find role button click --name "تمرین آزاد" > /dev/null 2>&1
sleep 1.5
$AB snapshot -i -c 2>/dev/null > /tmp/p8-dialog.txt
search_ref=$(rg -o 'textbox "جست[^"]*" \[ref=(\w+)\]' -r '$1' /tmp/p8-dialog.txt | head -1)
if [ -n "$search_ref" ]; then $AB fill @$search_ref "پرس" > /dev/null 2>&1; sleep 1; fi
$AB snapshot -i -c 2>/dev/null > /tmp/p8-dialog2.txt
pick_ref=$(rg -o 'button "انتخاب پرس سینه هالتر[^"]*" \[ref=(\w+)\]' -r '$1' /tmp/p8-dialog2.txt | head -1)
[ -z "$pick_ref" ] && pick_ref=$(rg -o 'button "انتخاب [^"]*" \[ref=(\w+)\]' -r '$1' /tmp/p8-dialog2.txt | head -1)
$AB click @$pick_ref > /dev/null 2>&1
sleep 1.5
# حرکت دوم — شنا (وزن بدن، دارای مربی سه‌بعدی)
$AB snapshot -i -c 2>/dev/null > /tmp/p8-dialog3.txt
search_ref2=$(rg -o 'textbox "جست[^"]*" \[ref=(\w+)\]' -r '$1' /tmp/p8-dialog3.txt | head -1)
if [ -n "$search_ref2" ]; then $AB fill @$search_ref2 "شنا" > /dev/null 2>&1; sleep 1; fi
$AB snapshot -i -c 2>/dev/null > /tmp/p8-dialog4.txt
pick_ref2=$(rg -o 'button "انتخاب شنا[^"]*" \[ref=(\w+)\]' -r '$1' /tmp/p8-dialog4.txt | head -1)
[ -z "$pick_ref2" ] && pick_ref2=$(rg -o 'button "انتخاب [^"]*" \[ref=(\w+)\]' -r '$1' /tmp/p8-dialog4.txt | head -1)
$AB click @$pick_ref2 > /dev/null 2>&1
sleep 1
$AB snapshot -i -c 2>/dev/null > /tmp/p8-dialog5.txt
start_ref=$(rg -o 'button "شروع تمرین آزاد" \[ref=(\w+)\]' -r '$1' /tmp/p8-dialog5.txt | head -1)
$AB click @$start_ref > /dev/null 2>&1
sleep 3
recorder=$($AB snapshot -c 2>/dev/null | rg -c "جلسه در حال انجام" || echo 0)
check "رکوردر جلسه باز شد" "yes" "$([ "$recorder" -gt 0 ] && echo yes || echo no)"
echo "PASS_COUNT_1=$PASS FAIL_COUNT_1=$FAIL"
