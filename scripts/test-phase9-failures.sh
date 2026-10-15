#!/bin/bash
# تست‌های شکست ارائه‌دهنده مرحله ۹ — با نمونه‌های مستقل سرور و تنظیمات متفاوت:
# 1) بدون کلید → وضعیت پیکربندی‌نشده + 503 + پیام کاربر محفوظ
# 2) سرور معلق → timeout واقعی 504 + پیام کاربر محفوظ + بدون پاسخ ساختگی
# 3) نشانی غیرقابل‌دسترس → 502 شبکه
# هر سه: هیچ پاسخ ساختگی تولید نمی‌شود و متن کاربر گم نمی‌شود.
#
# نکته: قفل dev یکتاست — سرور اصلی (۳۰۰۰) موقتاً متوقف و در پایان دوباره
# راه‌اندازی می‌شود (trap EXIT تضمین می‌کند حتی در شکست).
set -u
ROOT="/home/z/my-project"
PASS=0; FAIL=0
check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $name"; PASS=$((PASS+1))
  else
    echo "FAIL  $name — expected=[$expected] actual=[$actual]"; FAIL=$((FAIL+1))
  fi
}

cleanup() {
  pkill -f "next dev -p 31" 2>/dev/null || true
  [ -n "${HANG_PID:-}" ] && kill $HANG_PID 2>/dev/null || true
  (cd $ROOT && setsid node_modules/.bin/next dev -p 3000 > /home/z/my-project/dev.log 2>&1 &)
  echo "(main server 3000 restarted)"
}
trap cleanup EXIT

# توقف موقت سرور اصلی
pkill -f "next dev -p 3000" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 3

# سرور HTTP معلق — اتصال را می‌پذیرد و هرگز جواب نمی‌دهد (stdout جدا تا pipe نگه‌داشته نشود)
node -e "require('http').createServer(()=>{setInterval(()=>{},1000)}).listen(9401)" >/dev/null 2>&1 &
HANG_PID=$!

start_server() {
  local port=$1 ; shift
  (cd $ROOT && setsid env "$@" node_modules/.bin/next dev -p $port > /tmp/p9-fail-$port.log 2>&1 &)
  for i in $(seq 1 40); do
    sleep 2
    code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" --max-time 3 || true)
    if [ "$code" = "200" ]; then echo "server $port up"; return 0; fi
  done
  echo "server $port FAILED TO START"; return 1
}

register() {
  local port=$1 email=$2 ck=$3
  curl -s -c "$ck" -o /dev/null -X POST -H 'Content-Type: application/json' \
    -d "{\"name\":\"t\",\"email\":\"$email\",\"password\":\"test1234\"}" "http://localhost:$port/api/auth/sign-up/email"
}

# ------------------- 1) بدون کلید — پیکربندی‌نشده -------------------
echo "== 1) AI_PROVIDER=openai-compatible بدون کلید =="
start_server 3100 AI_PROVIDER=openai-compatible
TS=$(date +%s)
CK1="/tmp/p9-f1.txt"
register 3100 "p9-f1-$TS@test.local" $CK1
status=$(curl -s -b $CK1 http://localhost:3100/api/assistant/status)
configured=$(echo "$status" | python3 -c "import json,sys;print(json.load(sys.stdin)['provider']['configured'])")
check "status → configured=false (صادقانه)" "False" "$configured"
code=$(curl -s -b $CK1 -o /tmp/p9-f1-resp.json -w "%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"سلام تست","language":"auto"}' http://localhost:3100/api/assistant/conversations)
# ساخت مکالمه اول
CID1=$(python3 -c "import json;print(json.load(open('/tmp/p9-f1-resp.json'))['conversation']['id'])")
code=$(curl -s -b $CK1 -o /tmp/p9-f1-msg.json -w "%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"سلام تست پیکربندی","language":"auto"}' "http://localhost:3100/api/assistant/conversations/$CID1/messages")
check "ارسال با ارائه‌دهنده پیکربندی‌نشده → 503" "503" "$code"
errcode=$(python3 -c "import json;print(json.load(open('/tmp/p9-f1-msg.json'))['error'])")
check "کد خطا AI_NOT_CONFIGURED" "AI_NOT_CONFIGURED" "$errcode"
mc=$(curl -s -b $CK1 "http://localhost:3100/api/assistant/conversations/$CID1" | python3 -c "import json,sys;c=json.load(sys.stdin)['conversation'];print(c['messageCount'], all(m['role']=='user' for m in c['messages']))")
check "پیام کاربر محفوظ ماند و پاسخ ساختگی ثبت نشد" "1 True" "$mc"

# ------------------- 2) سرور معلق — timeout واقعی -------------------
echo "== 2) AI_BASE_URL معلق + AI_TIMEOUT_MS=5000 =="
pkill -f "next dev -p 3100" 2>/dev/null || true ; sleep 3
start_server 3101 AI_PROVIDER=openai-compatible AI_BASE_URL=http://127.0.0.1:9401/v1 AI_API_KEY=dummy-key AI_TIMEOUT_MS=5000 AI_MODEL=fail-model
CK2="/tmp/p9-f2.txt"
register 3101 "p9-f2-$TS@test.local" $CK2
curl -s -b $CK2 -o /tmp/p9-f2-conv.json -X POST http://localhost:3101/api/assistant/conversations
CID2=$(python3 -c "import json;print(json.load(open('/tmp/p9-f2-conv.json'))['conversation']['id'])")
T0=$(date +%s)
code=$(curl -s -b $CK2 -o /tmp/p9-f2-msg.json -w "%{http_code}" --max-time 60 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"تست timeout","language":"auto"}' "http://localhost:3101/api/assistant/conversations/$CID2/messages")
T1=$(date +%s)
ELAPSED=$((T1-T0))
check "ارسال با سرور معلق → 504" "504" "$code"
errcode2=$(python3 -c "import json;print(json.load(open('/tmp/p9-f2-msg.json'))['error'])")
check "کد خطا AI_TIMEOUT" "AI_TIMEOUT" "$errcode2"
check "timeout واقعی حدود ۵ ثانیه (۵..۱۵)" "yes" "$([ $ELAPSED -ge 5 ] && [ $ELAPSED -le 15 ] && echo yes || echo no)"
mc2=$(curl -s -b $CK2 "http://localhost:3101/api/assistant/conversations/$CID2" | python3 -c "import json,sys;c=json.load(sys.stdin)['conversation'];print(c['messageCount'], any(m['role']=='assistant' for m in c['messages']))")
check "پیام کاربر محفوظ و بدون پاسخ ساختگی" "1 False" "$mc2"

# تلاش مجدد هم با شکست کنترل‌شده مواجه می‌شود (بدون گم‌شدن پیام)
code=$(curl -s -b $CK2 -o /tmp/p9-f2-retry.json -w "%{http_code}" --max-time 60 -X POST -H 'Content-Type: application/json' \
  -d '{"language":"auto"}' "http://localhost:3101/api/assistant/conversations/$CID2/retry")
check "retry در محیط شکست → 504 (بدون جعل)" "504" "$code"
mc2b=$(curl -s -b $CK2 "http://localhost:3101/api/assistant/conversations/$CID2" | python3 -c "import json,sys;print(json.load(sys.stdin)['conversation']['messageCount'])")
check "پس از retry شکست‌خورده، پیام کاربر هنوز یک‌بار است" "1" "$mc2b"

# ------------------- 3) نشانی غیرقابل‌دسترس -------------------
echo "== 3) AI_BASE_URL غیرقابل‌دسترس =="
pkill -f "next dev -p 3101" 2>/dev/null || true ; sleep 3
start_server 3102 AI_PROVIDER=openai-compatible AI_BASE_URL=http://127.0.0.1:9/v1 AI_API_KEY=dummy-key AI_TIMEOUT_MS=15000
CK3="/tmp/p9-f3.txt"
register 3102 "p9-f3-$TS@test.local" $CK3
curl -s -b $CK3 -o /tmp/p9-f3-conv.json -X POST http://localhost:3102/api/assistant/conversations
CID3=$(python3 -c "import json;print(json.load(open('/tmp/p9-f3-conv.json'))['conversation']['id'])")
code=$(curl -s -b $CK3 -o /tmp/p9-f3-msg.json -w "%{http_code}" --max-time 60 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"تست شبکه","language":"auto"}' "http://localhost:3102/api/assistant/conversations/$CID3/messages")
check "ارسال با نشانی غیرقابل‌دسترس → 502" "502" "$code"
errcode3=$(python3 -c "import json;print(json.load(open('/tmp/p9-f3-msg.json'))['error'])")
check "کد خطا AI_NETWORK" "AI_NETWORK" "$errcode3"

# پاک‌سازی
pkill -f "next dev -p 310" 2>/dev/null || true
kill $HANG_PID 2>/dev/null || true
echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
