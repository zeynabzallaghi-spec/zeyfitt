#!/bin/bash
# تست‌های API مرحله ۴ — داشبورد و داده واقعی
BASE="http://localhost:3000"
TS=$(date +%s)
A="p4-user-a-$TS@test.local"
B="p4-user-b-$TS@test.local"
JA="/tmp/p4-cookie-a.txt"
JB="/tmp/p4-cookie-b.txt"
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $name"; PASS=$((PASS+1))
  else
    echo "FAIL  $name — expected=$expected actual=$actual"; FAIL=$((FAIL+1))
  fi
}

echo "== 1) مهمان (بدون نشست) =="
code=$(curl -s -o /tmp/p4-out.json -w "%{http_code}" $BASE/api/weight)
check "GET /api/weight مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p4-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"weightKg":80}' $BASE/api/weight)
check "POST /api/weight مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p4-out.json -w "%{http_code}" -X DELETE "$BASE/api/weight?id=test123" )
check "DELETE /api/weight مهمان → 401" "401" "$code"

echo "== 2) ثبت‌نام کاربر A =="
code=$(curl -s -c $JA -o /tmp/p4-a.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر الف\",\"email\":\"$A\",\"password\":\"test1234\"}" \
  $BASE/api/auth/sign-up/email)
check "ثبت‌نام A → 200" "200" "$code"

echo "== 3) تاریخچه خالی A =="
body=$(curl -s -b $JA $BASE/api/weight)
check "GET وزن A خالی → {\"entries\":[]}" '{"entries":[]}' "$body"

echo "== 4) ثبت وزن معتبر (ارقام فارسی) =="
code=$(curl -s -b $JA -o /tmp/p4-w1.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"weightKg":"۷۸٫۵"}' $BASE/api/weight)
check "POST وزن ۷۸٫۵ → 201" "201" "$code"
id1=$(python3 -c "import json;print(json.load(open('/tmp/p4-w1.json'))['entry']['id'])")

echo "== 5) اعتبارسنجی =="
code=$(curl -s -b $JA -o /tmp/p4-err1.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"weightKg":5}' $BASE/api/weight)
check "وزن ۵ (زیر حد) → 400" "400" "$code"
msg=$(python3 -c "import json;print(json.load(open('/tmp/p4-err1.json')).get('message',''))")
echo "      پیام: $msg"
code=$(curl -s -b $JA -o /tmp/p4-err2.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"weightKg":80,"recordedAt":"2099-01-01"}' $BASE/api/weight)
check "تاریخ آینده → 400" "400" "$code"
msg=$(python3 -c "import json;print(json.load(open('/tmp/p4-err2.json')).get('message',''))")
echo "      پیام: $msg"
code=$(curl -s -b $JA -o /tmp/p4-err3.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"weightKg":"abc"}' $BASE/api/weight)
check "ورودی غیرعددی → 400" "400" "$code"

echo "== 6) ثبت دو اندازه‌گیری دیگر برای A =="
curl -s -b $JA -o /tmp/p4-w2.json -X POST -H 'Content-Type: application/json' \
  -d '{"weightKg":77.2,"recordedAt":"2026-10-08"}' $BASE/api/weight > /dev/null
curl -s -b $JA -o /tmp/p4-w3.json -X POST -H 'Content-Type: application/json' \
  -d '{"weightKg":76.0,"recordedAt":"2026-10-12"}' $BASE/api/weight > /dev/null
count=$(curl -s -b $JA $BASE/api/weight | python3 -c "import json,sys;print(len(json.load(sys.stdin)['entries']))")
check "GET وزن A → ۳ رکورد" "3" "$count"

echo "== 7) ایزولاسیون کاربر B =="
code=$(curl -s -c $JB -o /tmp/p4-b.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر ب\",\"email\":\"$B\",\"password\":\"test1234\"}" \
  $BASE/api/auth/sign-up/email)
check "ثبت‌نام B → 200" "200" "$code"
countB=$(curl -s -b $JB $BASE/api/weight | python3 -c "import json,sys;print(len(json.load(sys.stdin)['entries']))")
check "GET وزن B → ۰ رکورد (داده A دیده نمی‌شود)" "0" "$countB"
# B وزن خودش را ثبت می‌کند
curl -s -b $JB -o /dev/null -X POST -H 'Content-Type: application/json' \
  -d '{"weightKg":95.5}' $BASE/api/weight
wB=$(curl -s -b $JB $BASE/api/weight | python3 -c "import json,sys;e=json.load(sys.stdin)['entries'];print(len(e),e[0]['weightKg'] if e else '')")
echo "      وزن‌های B: $wB"
countA=$(curl -s -b $JA $BASE/api/weight | python3 -c "import json,sys;print(len(json.load(sys.stdin)['entries']))")
check "GET وزن A همچنان → ۳ رکورد" "3" "$countA"

echo "== 8) حذف رکورد کاربر دیگر =="
code=$(curl -s -b $JB -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/weight?id=$id1")
check "DELETE رکورد A توسط B → 404" "404" "$code"
code=$(curl -s -b $JA -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/weight?id=$id1")
check "DELETE رکورد خود A → 200" "200" "$code"
countA=$(curl -s -b $JA $BASE/api/weight | python3 -c "import json,sys;print(len(json.load(sys.stdin)['entries']))")
check "GET وزن A پس از حذف → ۲ رکورد" "2" "$countA"

echo "== 9) ابطال نشست (خروج A) =="
curl -s -b $JA -c $JA -o /dev/null -X POST -H 'Content-Type: application/json' -H "Origin: $BASE" -d '{}' $BASE/api/auth/sign-out
code=$(curl -s -b $JA -o /dev/null -w "%{http_code}" $BASE/api/weight)
check "GET وزن A پس از خروج → 401" "401" "$code"

echo "== 10) ماندگاری پس از ثبت مجدد =="
code=$(curl -s -c $JA -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-in/email)
check "ورود مجدد A → 200" "200" "$code"
countA=$(curl -s -b $JA $BASE/api/weight | python3 -c "import json,sys;print(len(json.load(sys.stdin)['entries']))")
check "GET وزن A پس از ورود مجدد → ۲ رکورد (ماندگار)" "2" "$countA"

echo ""
echo "===== نتیجه: $PASS پاس، $FAIL شکست ====="
