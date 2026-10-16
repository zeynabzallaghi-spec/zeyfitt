#!/usr/bin/env bash
# ============================================================
# مرحله ۱۱ — تست پایداری داده (فاز B: تأیید پس از ری‌استارت کنترل‌شده)
# ورود دوباره (نشست قدیمی با چرخش secret نامعتبر می‌شود) + خواندن همهٔ
# رکوردها از API + خواندن مستقیم دیتابیس + مقایسه شمارش جداول.
# اجرا: bash scripts/p11-persist-verify.sh
# ============================================================
set -u
BASE="http://localhost:3000"
EV="/home/z/my-project/scripts/p11-evidence.json"
DB="/home/z/my-project/db/custom.db"
HA="/tmp/p11-auth-verify.txt"
OUT="/tmp/p11-vout.json"
RESULT="/home/z/my-project/scripts/p11-verify-result.json"
PASS=0; FAIL=0

check() { # name expected actual
  if [ "$2" = "$3" ]; then
    PASS=$((PASS+1)); echo "  ✓ $1"
  else
    FAIL=$((FAIL+1)); echo "  ✗ $1 — expected: $2 | actual: $3"
  fi
}
code_of() { curl -s -o "$OUT" -w "%{http_code}" "$@"; }
jqpy() { python3 -c "import json;d=json.load(open('$OUT'));print($1)"; }

EMAIL=$(python3 -c "import json;print(json.load(open('$EV'))['email'])")
PASSW=$(python3 -c "import json;print(json.load(open('$EV'))['password'])")
WEIGHT_ID=$(python3 -c "import json;print(json.load(open('$EV'))['ids']['weightEntry'])")
SESSION_ID=$(python3 -c "import json;print(json.load(open('$EV'))['ids']['workoutSession'])")
SEX_ID=$(python3 -c "import json;print(json.load(open('$EV'))['ids']['sessionExercise'])")
SET_ID=$(python3 -c "import json;print(json.load(open('$EV'))['ids']['workoutSetLog'])")
FOODLOG_ID=$(python3 -c "import json;print(json.load(open('$EV'))['ids']['foodLogEntry'])")
FOOD_KCAL=$(python3 -c "import json;print(json.load(open('$EV'))['ids']['foodLogKcal'])")
DAY=$(python3 -c "import json;print(json.load(open('$EV'))['ids']['localDay'])")

echo "== ۰) نشست قدیمی (پیش از ری‌استارت) — باید با چرخش secret ابطال شده باشد =="
OLD_AUTH="Cookie: $(rg -o '(__Secure-)?fitcoach\.session_token=[^;]+' /tmp/p11-auth.txt 2>/dev/null | head -1)"
if [ -n "$(rg -o '(__Secure-)?fitcoach\.session_token=[^;]+' /tmp/p11-auth.txt 2>/dev/null | head -1)" ]; then
  OLDCODE=$(curl -s -H "$OLD_AUTH" -o "$OUT" -w "%{http_code}" $BASE/api/profile)
  echo "  old-cookie /api/profile → $OLDCODE (401 = ابطال نشست قدیمی با چرخش secret)"
else
  OLDCODE="(کوکی قدیمی در دسترس نیست — /tmp پاک شده)"
  echo "  $OLDCODE"
fi

echo "== ۱) ورود مجدد با همان حساب =="
CODE=$(curl -s -D "$HA" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSW\"}" $BASE/api/auth/sign-in/email)
check "ورود مجدد → 200" "200" "$CODE"
AUTH="Cookie: $(rg -o '__Secure-fitcoach\.session_token=[^;]+' "$HA" | head -1)"

echo "== ۲) خواندن داده‌ها از API =="
CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" $BASE/api/profile)
check "GET profile → 200" "200" "$CODE"
check "نام نشانگر پروفایل حفظ شده" "P11 Persistence Probe" "$(jqpy "d['profile']['displayName']" 2>/dev/null || jqpy "d['displayName']" 2>/dev/null)"
check "قد ۱۸۱ حفظ شده" "181" "$(jqpy "d['profile']['heightCm']" 2>/dev/null || jqpy "d['heightCm']" 2>/dev/null)"

CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" $BASE/api/weight)
check "GET weight → 200" "200" "$CODE"
check "رکورد وزن با همان id" "True" "$(jqpy "any(e['id']=='$WEIGHT_ID' for e in d['entries'])" 2>/dev/null || jqpy "any(e['id']=='$WEIGHT_ID' for e in d)" 2>/dev/null)"

CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" $BASE/api/sessions/$SESSION_ID)
check "GET session → 200" "200" "$CODE"
check "جلسه همان id با یک حرکت" "True" "$(jqpy "d['session']['id']=='$SESSION_ID' and len(d['session']['exercises'])==1" 2>/dev/null || jqpy "d['id']=='$SESSION_ID'" 2>/dev/null)"

CODE=$(curl -s -H "$AUTH" -o "$OUT" -w "%{http_code}" "$BASE/api/food-logs?date=$DAY")
check "GET food-logs روز → 200" "200" "$CODE"
check "ثبت غذا با همان id" "True" "$(jqpy "any(l['id']=='$FOODLOG_ID' for l in d['logs'])")"
check "kcal تغییری نکرده" "$FOOD_KCAL" "$(jqpy "[l['kcal'] for l in d['logs'] if l['id']=='$FOODLOG_ID'][0]")"

echo "== ۳) خواندن مستقیم دیتابیس + مقایسه شمارش‌ها =="
COMPARE=$(python3 - "$EV" "$DB" <<PYEOF
import sqlite3, json, sys
ev = json.load(open(sys.argv[1]))
con = sqlite3.connect(f"file:{sys.argv[2]}?mode=ro", uri=True)
before = ev["tableCountsBefore"]
domain_skip = {"session", "account", "verification"}  # جداول نشست — ورود مجدد قانوناً ردیف اضافه می‌کند
drift = {}
for t, c in before.items():
    now = con.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
    if t in domain_skip:
        if now < c: drift[t] = (c, now)
    elif now != c:
        drift[t] = (c, now)
ids = ev["ids"]
rowchecks = {
  "weightEntry": con.execute("SELECT count(*) FROM weightEntry WHERE id=?", (ids["weightEntry"],)).fetchone()[0],
  "WorkoutSession": con.execute("SELECT count(*) FROM WorkoutSession WHERE id=?", (ids["workoutSession"],)).fetchone()[0],
  "WorkoutSessionExercise": con.execute("SELECT count(*) FROM WorkoutSessionExercise WHERE id=?", (ids["sessionExercise"],)).fetchone()[0],
  "WorkoutSetLog": con.execute("SELECT count(*) FROM WorkoutSetLog WHERE id=?", (ids["workoutSetLog"],)).fetchone()[0],
  "FoodLogEntry": con.execute("SELECT count(*) FROM FoodLogEntry WHERE id=?", (ids["foodLogEntry"],)).fetchone()[0],
}
print(json.dumps({"drift": drift, "rows": rowchecks}))
con.close()
PYEOF
)
echo "$COMPARE"
echo "$COMPARE" > "$RESULT"

for t in weightEntry WorkoutSession WorkoutSessionExercise WorkoutSetLog FoodLogEntry; do
  check "ردیف $t در DB با همان id موجود" "1" "$(python3 -c "import json;print(json.load(open('$RESULT'))['rows']['$t'])")"
done
check "هیچ جدول دامنه‌ای ردیف از دست نداده" "0" "$(python3 -c "import json;print(len(json.load(open('$RESULT'))['drift']))")"

echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
