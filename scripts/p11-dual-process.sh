#!/usr/bin/env bash
# ============================================================
# مرحله ۱۱ — تست دو فرایند هم‌زمان روی یک فایل SQLite
# نمونه دوم prod روی پورت 3001 با همان DATABASE_URL؛ نوشتن از 3001،
# خواندن از 3000؛ سپس پاکسازی نمونه دوم.
# اجرا: bash scripts/p11-dual-process.sh
# ============================================================
set -u
EV="/home/z/my-project/scripts/p11-evidence.json"
EMAIL=$(python3 -c "import json;print(json.load(open('$EV'))['email'])")
PASSW=$(python3 -c "import json;print(json.load(open('$EV'))['password'])")
DAY=$(python3 -c "import json;print(json.load(open('$EV'))['ids']['localDay'])")
NOWISO=$(python3 -c "from datetime import datetime,timezone;print(datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))")
PASS=0; FAIL=0
check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); echo "  ✓ $1"; else FAIL=$((FAIL+1)); echo "  ✗ $1 — expected $2 got $3"; fi; }

echo "== راه‌اندازی نمونه دوم روی 3001 =="
cd /home/z/my-project
env PORT=3001 NODE_ENV=production DATABASE_URL="file:/home/z/my-project/db/custom.db" \
  setsid bun .next/standalone/server.js > /tmp/p11-3001.log 2>&1 < /dev/null &
B1=$!
disown "$B1" 2>/dev/null || true
UP=0
for i in $(seq 1 30); do
  C=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:3001/ 2>/dev/null)
  [ "$C" = "200" ] && UP=1 && break
  sleep 1
done
check "نمونه دوم بالا آمد" "1" "$UP"
[ "$UP" = "1" ] || { echo "SECOND_INSTANCE_FAILED"; exit 1; }

echo "== ورود از هر دو نمونه =="
curl -s --max-time 15 -D /tmp/p11-dual-a.txt -o /dev/null -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSW\"}" http://localhost:3000/api/auth/sign-in/email
curl -s --max-time 15 -D /tmp/p11-dual-b.txt -o /dev/null -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSW\"}" http://localhost:3001/api/auth/sign-in/email
A="Cookie: $(rg -o '(__Secure-)?fitcoach\.session_token=[^;]+' /tmp/p11-dual-a.txt | head -1)"
B="Cookie: $(rg -o '(__Secure-)?fitcoach\.session_token=[^;]+' /tmp/p11-dual-b.txt | head -1)"
[ -n "${B#Cookie: }" ] && check "ورود از 3001 (نشست از همان DB مشترک)" "ok" "ok"

echo "== نوشتن ثبت غذای جدید از نمونه 3001 =="
TS=$(date +%s)
CODE=$(curl -s --max-time 20 -H "$B" -o /tmp/p11-dual.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"bank\",\"foodId\":\"white_rice\",\"unit\":\"g\",\"amount\":200,\"mealType\":\"lunch\",\"consumedAt\":\"$NOWISO\",\"localDay\":\"$DAY\",\"clientRequestId\":\"p11-dual-$TS\"}" \
  http://localhost:3001/api/food-logs)
check "ثبت از 3001 → 201" "201" "$CODE"
[ "$CODE" = "201" ] || { echo "WRITE_FROM_3001_FAILED:"; cat /tmp/p11-dual.json; kill "$B1" 2>/dev/null; exit 1; }
DUAL_ID=$(python3 -c "import json;print(json.load(open('/tmp/p11-dual.json'))['log']['id'])")
DUAL_KCAL=$(python3 -c "import json;print(json.load(open('/tmp/p11-dual.json'))['log']['kcal'])")
echo "  id=$DUAL_ID kcal=$DUAL_KCAL"

echo "== خواندن همان ثبت از نمونه 3000 =="
SEEN=$(curl -s --max-time 20 -H "$A" "http://localhost:3000/api/food-logs?date=$DAY" | python3 -c "
import json,sys
d=json.load(sys.stdin)
m=[l for l in d['logs'] if l['id']=='$DUAL_ID']
print(m[0]['kcal'] if m else 'MISSING')
")
check "نمونه 3000 همان ردیف را می‌بیند (kcal یکسان)" "$DUAL_KCAL" "$SEEN"

echo "== نوشتن هم‌زمان از هر دو (۱۰ درخواست موازی از هر پورت) =="
# زیرشل — تا wait فقط منتظر curlها بماند نه job سرور
(
for i in $(seq 1 10); do
  curl -s --max-time 30 -H "$A" -o /dev/null -X POST -H 'Content-Type: application/json' \
    -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"snack_pm\",\"consumedAt\":\"$NOWISO\",\"localDay\":\"$DAY\",\"clientRequestId\":\"p11-dual-a-$TS-$i\"}" \
    http://localhost:3000/api/food-logs &
  curl -s --max-time 30 -H "$B" -o /dev/null -X POST -H 'Content-Type: application/json' \
    -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"snack_pm\",\"consumedAt\":\"$NOWISO\",\"localDay\":\"$DAY\",\"clientRequestId\":\"p11-dual-b-$TS-$i\"}" \
    http://localhost:3001/api/food-logs &
done
wait
)
N=$(curl -s --max-time 20 -H "$A" "http://localhost:3000/api/food-logs?date=$DAY" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['logs']))")
echo "  ثبت‌های امروز از دید 3000: $N (انتظار: 23 = 2 پایه + 1 دوتایی + 20 موازی)"
if [ "$N" -ge 23 ]; then
  check "همهٔ ۲۰ نوشتن موازی بدون خطا ماندگار شدند" "ok" "ok"
else
  FAIL=$((FAIL+1)); echo "  ✗ نوشتن موازی — شمارش ناقص: $N"
fi

echo "== پاکسازی نمونه دوم =="
kill "$B1" 2>/dev/null; sleep 2
C0=$(curl -s --max-time 5 -o /dev/null -w "%{http_code}" http://localhost:3000/)
C1=$(curl -s --max-time 3 -o /dev/null -w "%{http_code}" http://localhost:3001/ 2>/dev/null || echo "down")
echo "  پس از پاکسازی: 3000=$C0 | 3001=$C1"
check "نمونه اصلی 3000 سالم مانده" "200" "$C0"

echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
