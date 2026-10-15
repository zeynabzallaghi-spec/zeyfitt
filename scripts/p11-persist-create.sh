#!/usr/bin/env bash
# ============================================================
# مرحله ۱۱ — تست پایداری داده (فاز A: ایجاد داده با حساب آزمایشی اختصاصی)
# حساب p11-persist-<ts>@test.local + پروفایل + وزن + جلسه تمرین واقعی
# (تمرین آزاد pushup + یک ست) + ثبت غذای بانکی؛ همه شناسه‌ها و شمارش
# کل جداول در فایل شواهد ذخیره می‌شود.
# اجرا: bash scripts/p11-persist-create.sh
# ============================================================
set -u
BASE="http://localhost:3000"
TS=$(date +%s)
EMAIL="p11-persist-$TS@test.local"
PASSW="test1234"
HA="/tmp/p11-auth.txt"
OUT="/tmp/p11-out.json"
EV="/home/z/my-project/scripts/p11-evidence.json"
DB="/home/z/my-project/db/custom.db"

# کوکی prod: __Secure-fitcoach.session_token | کوکی dev (HTTP محلی): fitcoach.session_token
auth_hdr() { rg -o '(__Secure-)?fitcoach\.session_token=[^;]+' "$1" | head -1; }
code_of() { curl -s -o "$OUT" -w "%{http_code}" "$@"; }
jqpy() { python3 -c "import json,sys;d=json.load(open('$OUT'));print($1)"; }

echo "== ثبت‌نام حساب آزمایشی $EMAIL =="
CODE=$(curl -s -D "$HA" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"P11 Persistence Probe\",\"email\":\"$EMAIL\",\"password\":\"$PASSW\"}" \
  $BASE/api/auth/sign-up/email)
if [ "$CODE" != "200" ]; then
  echo "signup: $CODE — تلاش برای ورود (حساب از اجرای قبلی)"
  CODE=$(curl -s -D "$HA" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSW\"}" $BASE/api/auth/sign-in/email)
fi
echo "auth status: $CODE"
[ "$CODE" = "200" ] || { echo "AUTH_FAILED"; cat "$OUT"; exit 1; }
AUTH="Cookie: $(auth_hdr $HA)"
[ -n "$(auth_hdr $HA)" ] || { echo "NO_SESSION_COOKIE"; exit 1; }
cp "$HA" /tmp/p11-auth.txt

echo "== پروفایل با مقادیر مشخص =="
CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" -X PUT -H 'Content-Type: application/json' \
  -d '{"displayName":"P11 Persistence Probe","age":31,"gender":"male","heightCm":181,"weightKg":83.5,"bodyFat":18,"goal":"muscle_gain","experience":"beginner","trainingDaysPerWeek":4,"sessionMinutes":45,"limitationNotes":null,"diet":"none"}' \
  $BASE/api/profile)
echo "profile PUT: $CODE"

echo "== ثبت وزن =="
TODAY_UTC=$(python3 -c "from datetime import datetime,timezone;print(datetime.now(timezone.utc).strftime('%Y-%m-%d'))")
CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"weightKg\":83.5,\"recordedAt\":\"$TODAY_UTC\"}" $BASE/api/weight)
echo "weight POST: $CODE"
WEIGHT_ID=$(jqpy "d['entry']['id']")
[ "$WEIGHT_ID" = "None" ] && WEIGHT_ID=$(jqpy "d['id']")

# حرکت با هالتر — تا قاعده «فقط وزن بدن» وزنه را null نکند (pushup صرفاً وزن بدن است)
echo "== شروع جلسه تمرین آزاد (bench-press-barbell) =="
CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"exercises":[{"exerciseId":"bench-press-barbell"}]}' $BASE/api/sessions/start)
echo "session start: $CODE"
SESSION_ID=$(jqpy "d['session']['id']")
SEX_ID=$(jqpy "d['session']['exercises'][0]['id']")

echo "== ثبت یک ست واقعی =="
CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$SEX_ID\",\"setNumber\":1,\"reps\":12,\"weightKg\":20}" \
  $BASE/api/sessions/$SESSION_ID/sets)
echo "set POST: $CODE"
SET_ID=$(jqpy "d['session']['exercises'][0]['sets'][0]['id']")
SET_WEIGHT=$(jqpy "d['session']['exercises'][0]['sets'][0]['weightKg']")

echo "== ثبت غذای بانکی (تخم‌مرغ ۱۲۰ گرم) =="
read -r TODAY_TEH NOON_UTC <<< "$(python3 -c "
from datetime import datetime, timedelta, timezone
now = datetime.now(timezone(timedelta(hours=3, minutes=30)))
print(now.strftime('%F'), datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ'))
")"
CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":120,\"mealType\":\"breakfast\",\"consumedAt\":\"$NOON_UTC\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p11-persist-req-$TS-1\"}" \
  $BASE/api/food-logs)
echo "foodlog POST: $CODE"
FOODLOG_ID=$(jqpy "d['log']['id']")
FOODLOG_KCAL=$(jqpy "d['log']['kcal']")

echo "== شمارش کل جداول قبل از ری‌استارت =="
COUNTS=$(python3 -c "
import sqlite3, json
con = sqlite3.connect('file:$DB?mode=ro', uri=True)
tables = [r[0] for r in con.execute(\"SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name\")]
print(json.dumps({t: con.execute(f'SELECT count(*) FROM \\\"{t}\\\"').fetchone()[0] for t in tables}))
con.close()
")
echo "$COUNTS"

python3 - "$EV" <<PYEOF
import json, sys
ev = {
  "ts": "$TS",
  "email": "$EMAIL",
  "password": "$PASSW",
  "ids": {
    "weightEntry": "$WEIGHT_ID",
    "workoutSession": "$SESSION_ID",
    "sessionExercise": "$SEX_ID",
    "workoutSetLog": "$SET_ID",
    "workoutSetWeightKg": "$SET_WEIGHT",
    "foodLogEntry": "$FOODLOG_ID",
    "foodLogKcal": "$FOODLOG_KCAL",
    "localDay": "$TODAY_TEH",
    "profileMarker": "P11 Persistence Probe"
  },
  "tableCountsBefore": json.loads('''$COUNTS''')
}
open(sys.argv[1], "w").write(json.dumps(ev, indent=2, ensure_ascii=False))
print("evidence saved:", sys.argv[1])
PYEOF

echo "== خلاصه شناسه‌ها =="
echo "weight=$WEIGHT_ID session=$SESSION_ID set=$SET_ID (weightKg=$SET_WEIGHT) foodlog=$FOODLOG_ID kcal=$FOODLOG_KCAL day=$TODAY_TEH"
