#!/usr/bin/env bash
# ============================================================
# تست‌های API مرحله ۱۰ — ثبت مصرف واقعی غذا (اجرا روی سرور production)
# پوشش موارد الزامی §۱۱: مهمان، ایزولاسیون A/B، ثبت از برنامه با مقدار
# واقعی، ثبت مستقل، مقادیر نامعتبر، دستکاری تغذیه‌ای، محاسبه درست،
# ویرایش/حذف و جمع روز، ماندگاری، بی‌طرفی نسبت به حذف برنامه،
# روز خالی ≠ صفر، مرز نیمه‌شب، ایدمپوتنسی retry، سقف روزانه
# ============================================================
set -u
BASE="http://localhost:3000"
PASS=0; FAIL=0
TS=$(date +%s)
A="p10-user-a-$TS@test.local"
B="p10-user-b-$TS@test.local"
HA="/tmp/p10-auth-a.txt"   # سربرگ set-cookie کاربر A
HB="/tmp/p10-auth-b.txt"
OUT="/tmp/p10-out.json"

check() { # name expected actual
  if [ "$2" = "$3" ]; then
    PASS=$((PASS+1)); echo "  ✓ $1"
  else
    FAIL=$((FAIL+1)); echo "  ✗ $1 — expected: $2 | actual: $3"
  fi
}

code_of() { curl -s -o "$OUT" -w "%{http_code}" "$@"; }

# سربرگ احراز هویت از set-cookie (شبیه‌سازی دقیق مسیر HTTPS مرورگر)
auth_hdr() { rg -o '(?:__Secure-)?fitcoach\.session_token=[^;]+' "$1" | head -1; }

# لحظه UTC معادل «ساعت محلی تهران» — همان قرارداد tehranInstantFromDayTime
iso_of() { # day hh:mm
  python3 -c "
from datetime import datetime, timedelta, timezone
base = datetime.strptime('$1 $2', '%Y-%m-%d %H:%M').replace(tzinfo=timezone.utc)
print((base - timedelta(hours=3, minutes=30)).strftime('%Y-%m-%dT%H:%M:%SZ'))
"
}

read -r TODAY_TEH YDAY_UTC <<< "$(python3 -c "
from datetime import datetime, timedelta, timezone
now = datetime.now(timezone(timedelta(hours=3, minutes=30)))
print(now.strftime('%F'), (datetime.now(timezone.utc) - timedelta(days=1)).strftime('%F'))
")"
NOW_HM=$(python3 -c "
from datetime import datetime, timedelta, timezone
now = datetime.now(timezone(timedelta(hours=3, minutes=30)))
print(now.strftime('%H:%M'))
")
echo "روز تهران امروز: $TODAY_TEH"

# ============================================================
echo "== 1) مهمان — همه مسیرهای محافظت‌شده ۴۰۱ =="
check "POST food-logs مهمان → 401" "401" "$(code_of -X POST -H 'Content-Type: application/json' -d '{}' $BASE/api/food-logs)"
check "GET food-logs مهمان → 401" "401" "$(code_of "$BASE/api/food-logs?date=$TODAY_TEH")"
check "GET summary مهمان → 401" "401" "$(code_of "$BASE/api/food-logs/summary?date=$TODAY_TEH")"
check "PATCH food-logs/[id] مهمان → 401" "401" "$(code_of -X PATCH -H 'Content-Type: application/json' -d '{}' $BASE/api/food-logs/whatever-id)"
check "DELETE food-logs/[id] مهمان → 401" "401" "$(code_of -X DELETE $BASE/api/food-logs/whatever-id)"

# ============================================================
echo "== 2) ثبت‌نام کاربران A و B =="
code=$(curl -s -D "$HA" -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر الف\",\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام A → 200" "200" "$code"
AUTH_A="Cookie: $(auth_hdr $HA)"
[ -n "$(auth_hdr $HA)" ] && check "کوکی نشست A captured" "yes" "yes" || check "کوکی نشست A captured" "yes" "no"
code=$(curl -s -D "$HB" -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر ب\",\"email\":\"$B\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام B → 200" "200" "$code"
AUTH_B="Cookie: $(auth_hdr $HB)"

# ============================================================
echo "== 3) ثبت مستقل از بانک — محاسبه سمت سرور =="
NOON=$(iso_of "$TODAY_TEH" "12:00")
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":120,\"mealType\":\"breakfast\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p10-req-$TS-1\"}" \
  $BASE/api/food-logs)
check "ثبت تخم‌مرغ ۱۲۰گرم → 201" "201" "$code"
LOG1=$(python3 -c "import json;print(json.load(open('$OUT'))['log']['id'])")
check "kcal سرور = ۱۸۶ (نه ورودی مرورگر)" "186" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['kcal'])")"
check "protein = ۱۵٫۶" "15.6" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['protein'])")"
check "carb = ۱٫۳" "1.3" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['carb'])")"
check "fat = ۱۳٫۲" "13.2" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['fat'])")"
check "grams = ۱۲۰" "120" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['grams'])")"
check "localDay = امروز تهران" "$TODAY_TEH" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['localDay'])")"
check "source = bank" "bank" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['source'])")"

# ============================================================
echo "== 4) ایدمپوتنسی — تکرار همان clientRequestId ثبت تکراری نمی‌سازد =="
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":120,\"mealType\":\"breakfast\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p10-req-$TS-1\"}" \
  $BASE/api/food-logs)
check "ارسال مجدد همان درخواست → 200 (نه 201)" "200" "$code"
check "همان ثبت قبلی برگشت" "$LOG1" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['id'])")"
check "پرچم replay" "True" "$(python3 -c "import json;print(json.load(open('$OUT'))['replayed'])")"
count=$(curl -s -H "$AUTH_A" "$BASE/api/food-logs?date=$TODAY_TEH" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['logs']))")
check "روز فقط یک ثبت دارد" "1" "$count"

# ============================================================
echo "== 5) مقادیر تغذیه‌ای دستکاری‌شده مرورگر نادیده گرفته می‌شوند =="
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":60,\"mealType\":\"lunch\",\"kcal\":99999,\"protein\":999,\"grams\":3,\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p10-req-$TS-2\"}" \
  $BASE/api/food-logs)
check "ثبت با فیلدهای دستکاری‌شده → 201" "201" "$code"
LOG2=$(python3 -c "import json;print(json.load(open('$OUT'))['log']['id'])")
check "kcal از محاسبه سرور = ۹۳" "93" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['kcal'])")"
check "grams سروری = ۶۰ (نه ۳)" "60" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['grams'])")"

# ============================================================
echo "== 6) سهم (unit=serving) با ضریب snapshot =="
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"serving\",\"amount\":0.5,\"mealType\":\"snack_pm\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p10-req-$TS-3\"}" \
  $BASE/api/food-logs)
check "۰٫۵ سهم تخم‌مرغ → 201" "201" "$code"
LOG3=$(python3 -c "import json;print(json.load(open('$OUT'))['log']['id'])")
check "grams = ۲۵" "25" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['grams'])")"
check "kcal = ۳۹" "39" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['kcal'])")"
check "servingGramsUsed = ۵۰" "50" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['servingGramsUsed'])")"
check "amount = ۰٫۵" "0.5" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['amount'])")"

# ============================================================
echo "== 7) ورودی‌های نامعتبر و واحدهای غیرمجاز رد می‌شوند =="
check "amount صفر → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":0,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"
check "amount منفی → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":-5,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"
check "grams خارج سقف → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":3000,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"
check "واحد cup نامعتبر → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"cup\",\"amount\":1,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"
# شناسه غذا ناموجود، ورودی نامعتبر است و در لایه اعتبارسنجی رد می‌شود (400)؛
# قاعده ۴۰۴ یکسان برای «ثبت ناموجود/مالک دیگر» در PATCH/DELETE و plan_item تست شده است
check "foodId جعلی → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"not-a-food-$TS\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"
check "plan_item بدون planItemId → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"plan_item\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"
FUTURE=$(python3 -c "
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc) + timedelta(days=3)).strftime('%Y-%m-%dT%H:%M:%SZ'))
")
check "مصرف ۳ روز آینده → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"lunch\",\"consumedAt\":\"$FUTURE\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"
OLD=$(python3 -c "
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone.utc) - timedelta(days=100)).strftime('%Y-%m-%dT%H:%M:%SZ'))
")
check "مصرف ۱۰۰ روز قبل → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"lunch\",\"consumedAt\":\"$OLD\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"
check "روز بدشکل → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"20260130\"}" $BASE/api/food-logs)"
check "۳۰ فوریه → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"2026-02-30\"}" $BASE/api/food-logs)"
FAR_DAY=$(python3 -c "
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone(timedelta(hours=3,minutes=30))) - timedelta(days=10)).strftime('%F'))
")
check "روز ناسازگار با لحظه (۱۰ روز اختلاف) → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$FAR_DAY\"}" $BASE/api/food-logs)"
check "mealType نامعتبر → 400" "400" "$(code_of -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d "{\"source\":\"bank\",\"foodId\":\"egg\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"brunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"

# ============================================================
echo "== 8) مرز نیمه‌شب تهران — لحظه ۰۰:۰۱ تهرانِ امروز = ۲۰:۳۱Zِ دیروزِ UTC =="
# نکته (اصلاح ممیزی مرحله ۱۱): نسخه قبلی «۲۳:۵۹ دیروز» را با YDAY_UTC (دیروزِ UTC)
# می‌ساخت که بعد از ۲۰:۳۰ UTC با «دیروز تهران» یکی نیست و پیلود ناسازگار می‌شد —
# سرور چنین پیلودی را درست رد می‌کند (۴۰۰). حالا لحظهٔ درستِ مرز را می‌سازیم:
# ۰۰:۰۱ روز تهرانِ امروز، که معادلش در UTC هنوز دیروز است (تفاوت روز UTC/تهران).
MIDNIGHT=$(iso_of "$TODAY_TEH" "00:01")
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"bank\",\"foodId\":\"oats\",\"unit\":\"g\",\"amount\":40,\"mealType\":\"snack_ev\",\"consumedAt\":\"$MIDNIGHT\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p10-req-$TS-mid\"}" \
  $BASE/api/food-logs)
check "ثبت ۰۰:۰۱ تهران امروز (۲۰:۳۱Z دیروز UTC) → 201" "201" "$code"
check "در روز تهران امروز ثبت شد (نه روز UTC)" "$TODAY_TEH" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['localDay'])")"
check "kcal جو دوسر ۴۰گرم = ۱۵۶" "156" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['kcal'])")"

# ============================================================
echo "== 9) جمع روز از ثبت‌های واقعی =="
body=$(curl -s -H "$AUTH_A" "$BASE/api/food-logs?date=$TODAY_TEH")
TOTAL_KCAL=$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['totals']['kcal'])")
N_LOGS=$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['totals']['count'])")
check "تعداد ثبت = ۴" "4" "$N_LOGS"
check "جمع kcal = ۱۸۶+۹۳+۳۹+۱۵۶ = ۴۷۴" "474" "$TOTAL_KCAL"
check "hasLogs = true" "True" "$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['totals']['hasLogs'])")"

# ============================================================
echo "== 10) ویرایش — جمع روز دوباره محاسبه می‌شود =="
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"unit\":\"g\",\"amount\":60}" $BASE/api/food-logs/$LOG1)
check "PATCH ۱۲۰→۶۰ گرم → 200" "200" "$code"
check "kcal جدید = ۹۳" "93" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['kcal'])")"
TOTAL2=$(curl -s -H "$AUTH_A" "$BASE/api/food-logs?date=$TODAY_TEH" | python3 -c "import json,sys;print(json.load(sys.stdin)['totals']['kcal'])")
check "جمع روز به‌روز شد (۴۷۴−۹۳=۳۸۱)" "381" "$TOTAL2"
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"unit\":\"g\",\"amount\":100}" $BASE/api/food-logs/$LOG3)
check "تغییر واحد سهم→گرم → 200" "200" "$code"
check "grams = ۱۰۰" "100" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['grams'])")"
check "servingGramsUsed پاک شد" "None" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['servingGramsUsed'])")"
# بازمحاسبه از snapshot خود رکورد: ۳۹×(۱۰۰/۲۵)=۱۵۶ — تاریخچه مستقل از بانک زنده
check "kcal از snapshot خود رکورد = ۱۵۶" "156" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['kcal'])")"
check "PATCH با زمان بدون روز → 400 (قاعده جفت)" "400" "$(code_of -H "$AUTH_A" -X PATCH -H 'Content-Type: application/json' -d "{\"consumedAt\":\"$NOON\"}" $BASE/api/food-logs/$LOG1)"
check "PATCH ثبت ناموجود → 404" "404" "$(code_of -H "$AUTH_A" -X PATCH -H 'Content-Type: application/json' -d "{\"unit\":\"g\",\"amount\":10}" $BASE/api/food-logs/not-a-real-id)"

# ============================================================
echo "== 11) ایزولاسیون A/B — نبود و مالک دیگر هر دو ۴۰۴ =="
check "B نمی‌تواند ثبت A را ویرایش کند → 404" "404" "$(code_of -H "$AUTH_B" -X PATCH -H 'Content-Type: application/json' -d "{\"unit\":\"g\",\"amount\":1}" $BASE/api/food-logs/$LOG1)"
check "B نمی‌تواند ثبت A را حذف کند → 404" "404" "$(code_of -H "$AUTH_B" -X DELETE $BASE/api/food-logs/$LOG1)"
count_b=$(curl -s -H "$AUTH_B" "$BASE/api/food-logs?date=$TODAY_TEH" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['logs']))")
check "فهرست روز B خالی است (داده A دیده نمی‌شود)" "0" "$count_b"
sum_b=$(curl -s -H "$AUTH_B" "$BASE/api/food-logs/summary?date=$TODAY_TEH" | python3 -c "import json,sys;print(json.load(sys.stdin)['totals']['count'])")
check "خلاصه B بدون داده A" "0" "$sum_b"

# ============================================================
echo "== 12) برنامه غذایی + ثبت از قلم برنامه با مقدار واقعی متفاوت =="
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"maintain","activityLevel":"light","mealsPerDay":3,"planLength":1,"dietPattern":"none","allergens":[],"dislikedFoodIds":[],"budget":"any","prep":"any","pregnancyBreastfeeding":false,"estimate":{"age":35,"heightCm":178,"weightKg":85,"gender":"male"}}' \
  $BASE/api/nutrition)
check "ساخت برنامه برای A → 201" "201" "$code"
PLAN_ID=$(python3 -c "import json;print(json.load(open('$OUT'))['plan']['id'])")
ITEM_ID=$(python3 -c "import json;print(json.load(open('$OUT'))['plan']['days'][0]['meals'][0]['items'][0]['id'])")
ITEM_GRAMS=$(python3 -c "import json;print(json.load(open('$OUT'))['plan']['days'][0]['meals'][0]['items'][0]['grams'])")
ITEM_KCAL=$(python3 -c "import json;print(json.load(open('$OUT'))['plan']['days'][0]['meals'][0]['items'][0]['kcal'])")
HALF_GRAMS=$(python3 -c "print($ITEM_GRAMS/2)")
HALF_KCAL=$(python3 -c "import math;print(math.floor($ITEM_KCAL*$ITEM_GRAMS/2/$ITEM_GRAMS/100*100+0.5))")
echo "  (قلم: $ITEM_ID — پیشنهاد ${ITEM_GRAMS}گرم / ${ITEM_KCAL}kcal — ثبت واقعی نصف)"
code=$(curl -s -H "$AUTH_A" -o "$OUT" -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"plan_item\",\"planItemId\":\"$ITEM_ID\",\"unit\":\"g\",\"amount\":$HALF_GRAMS,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p10-req-$TS-plan\"}" \
  $BASE/api/food-logs)
check "ثبت نصف مقدار برنامه → 201" "201" "$code"
LOG4=$(python3 -c "import json;print(json.load(open('$OUT'))['log']['id'])")
check "grams واقعی = نصف برنامه (مستقل از پیشنهاد)" "yes" "$(python3 -c "import json;print('yes' if float(json.load(open('$OUT'))['log']['grams']) == float('$HALF_GRAMS') else 'no')")"
check "planItemGrams = مقدار پیشنهادی برنامه" "$ITEM_GRAMS" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['planItemGrams'])")"
check "planId ثبت شد" "$PLAN_ID" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['planId'])")"
check "source = plan_item" "plan_item" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['source'])")"
check "kcal از snapshot قلم با مقدار واقعی" "$HALF_KCAL" "$(python3 -c "import json;print(json.load(open('$OUT'))['log']['kcal'])")"

# ثبت قلم برنامه دیگر برای کاربر B — قلم برنامه A نباید برای B پذیرفته شود
check "planItem متعلق به A برای B → 404" "404" "$(code_of -H "$AUTH_B" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"plan_item\",\"planItemId\":\"$ITEM_ID\",\"unit\":\"g\",\"amount\":50,\"mealType\":\"lunch\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\"}" $BASE/api/food-logs)"

# ============================================================
echo "== 13) خلاصه روز + مقایسه با برنامه + روند =="
body=$(curl -s -H "$AUTH_A" "$BASE/api/food-logs/summary?date=$TODAY_TEH")
check "comparison available = true" "True" "$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['comparison']['available'])")"
check "planId مقایسه درست است" "$PLAN_ID" "$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['comparison']['planId'])")"
TARGET=$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['comparison']['targetKcal'])")
[ "$TARGET" != "None" ] && check "targetKcal از snapshot برنامه خوانده شد" "yes" "yes" || check "targetKcal از snapshot برنامه خوانده شد" "yes" "no"
ITEM_STATUS=$(echo "$body" | python3 -c "
import json,sys
d = json.load(sys.stdin)
item = next((i for i in d['comparison']['items'] if i['planItemId']=='$ITEM_ID'), None)
print('logged' if item and item['logged'] else 'missing')
")
check "قلم ثبت‌شده logged=true" "logged" "$ITEM_STATUS"
LOGGED_GRAMS=$(echo "$body" | python3 -c "
import json,sys
d = json.load(sys.stdin)
item = next((i for i in d['comparison']['items'] if i['planItemId']=='$ITEM_ID'), None)
print(item['loggedGrams'] if item else 'none')
")
check "loggedGrams = نصف برنامه" "yes" "$(python3 -c "
print('yes' if float('$LOGGED_GRAMS') == float('$HALF_GRAMS') else 'no')
")"
NOT_LOGGED=$(echo "$body" | python3 -c "
import json,sys
d = json.load(sys.stdin)
others = [i for i in d['comparison']['items'] if i['planItemId']!='$ITEM_ID']
print('yes' if others and all(not i['logged'] for i in others) else 'no')
")
check "اقلام بدون ثبت logged=false" "yes" "$NOT_LOGGED"
TREND_N=$(echo "$body" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['trend']))")
check "روند ۷ نقطه دارد" "7" "$TREND_N"
TREND_EMPTY_OK=$(echo "$body" | python3 -c "
import json,sys
d = json.load(sys.stdin)
empties = [p for p in d['trend'] if not p['hasLogs']]
print('yes' if empties and all(p['kcal'] is None for p in empties) else 'no')
")
check "روزهای بدون ثبت در روند: hasLogs=false و kcal=null" "yes" "$TREND_EMPTY_OK"
TREND_TODAY=$(echo "$body" | python3 -c "
import json,sys
d = json.load(sys.stdin)
p = next(p for p in d['trend'] if p['localDay']=='$TODAY_TEH')
print(p['hasLogs'])
")
check "امروز در روند hasLogs=true" "True" "$TREND_TODAY"

# روز بدون ثبت — با روز صفر یکی نیست
EMPTY_DAY=$(python3 -c "
from datetime import datetime, timedelta, timezone
print((datetime.now(timezone(timedelta(hours=3,minutes=30))) - timedelta(days=2)).strftime('%F'))
")
body=$(curl -s -H "$AUTH_A" "$BASE/api/food-logs?date=$EMPTY_DAY")
check "روز خالی: count=۰" "0" "$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['totals']['count'])")"
check "روز خالی: hasLogs=false" "False" "$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['totals']['hasLogs'])")"

# ============================================================
echo "== 14) حذف برنامه — تاریخچه مصرف دست‌نخورده می‌ماند =="
code=$(curl -s -H "$AUTH_A" -o /dev/null -w "%{http_code}" -X DELETE $BASE/api/nutrition/$PLAN_ID)
check "حذف برنامه → 200" "200" "$code"
body=$(curl -s -H "$AUTH_A" "$BASE/api/food-logs?date=$TODAY_TEH")
N_AFTER=$(echo "$body" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['logs']))")
check "همه ثبت‌ها بعد از حذف برنامه باقی‌اند (۵)" "5" "$N_AFTER"
LOG4_PLAN=$(echo "$body" | python3 -c "
import json,sys
d = json.load(sys.stdin)
log = next(l for l in d['logs'] if l['id']=='$LOG4')
print(log['planId'])
")
check "planId ثبت برنامه‌ای → null شد (SetNull)" "None" "$LOG4_PLAN"
check "faName از snapshot باقی است" "yes" "$(echo "$body" | python3 -c "
import json,sys
d = json.load(sys.stdin)
log = next(l for l in d['logs'] if l['id']=='$LOG4')
print('yes' if log['faName'] and log['kcal'] == $HALF_KCAL else 'no')
")"
body=$(curl -s -H "$AUTH_A" "$BASE/api/food-logs/summary?date=$TODAY_TEH")
check "comparison بعد از حذف برنامه available=false" "False" "$(echo "$body" | python3 -c "import json,sys;print(json.load(sys.stdin)['comparison']['available'])")"

# ============================================================
echo "== 15) حذف ثبت — جمع به‌روز می‌شود؛ حذف مجدد ۴۰۴ =="
check "DELETE ثبت → 200" "200" "$(code_of -H "$AUTH_A" -X DELETE $BASE/api/food-logs/$LOG2)"
check "DELETE دوباره همان → 404" "404" "$(code_of -H "$AUTH_A" -X DELETE $BASE/api/food-logs/$LOG2)"
TOTAL3=$(curl -s -H "$AUTH_A" "$BASE/api/food-logs?date=$TODAY_TEH" | python3 -c "import json,sys;print(json.load(sys.stdin)['totals']['kcal'])")
# ۹۳ (LOG1 ویرایش‌شده) + ۱۵۶ (LOG3 از snapshot خودش) + ۱۵۶ (جو دوسر) + نصف قلم برنامه
check "جمع بعد از حذف درست است" "yes" "$(python3 -c "
expected = 93 + 156 + 156 + $HALF_KCAL
print('yes' if expected == $TOTAL3 else f'no (expected {expected}, actual $TOTAL3)')
")"

# ============================================================
echo "== 16) ماندگاری پس از ورود مجدد =="
code=$(curl -s -D /tmp/p10-auth-a2.txt -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-in/email)
check "ورود مجدد A → 200" "200" "$code"
AUTH_A2="Cookie: $(auth_hdr /tmp/p10-auth-a2.txt)"
count=$(curl -s -H "$AUTH_A2" "$BASE/api/food-logs?date=$TODAY_TEH" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['logs']))")
check "پس از ورود مجدد همان ثبت‌ها از پایگاه داده" "4" "$count"

# ============================================================
echo "== 17) سقف روزانه ۶۰ ثبت — برای کاربر B =="
ok=0
for i in $(seq 1 60); do
  c=$(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH_B" -X POST -H 'Content-Type: application/json' \
    -d "{\"source\":\"bank\",\"foodId\":\"oats\",\"unit\":\"g\",\"amount\":10,\"mealType\":\"snack_am\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p10-b-$TS-$i\"}" \
    $BASE/api/food-logs)
  [ "$c" = "201" ] && ok=$((ok+1))
done
check "۶۰ ثبت اول همه → 201" "60" "$ok"
check "ثبت ۶۱ام → 400 DAILY_LIMIT_REACHED" "400" "$(code_of -H "$AUTH_B" -X POST -H 'Content-Type: application/json' \
  -d "{\"source\":\"bank\",\"foodId\":\"oats\",\"unit\":\"g\",\"amount\":10,\"mealType\":\"snack_am\",\"consumedAt\":\"$NOON\",\"localDay\":\"$TODAY_TEH\",\"clientRequestId\":\"p10-b-$TS-61\"}" $BASE/api/food-logs)"
check "کد خطای سقف در پاسخ" "DAILY_LIMIT_REACHED" "$(python3 -c "import json;print(json.load(open('$OUT'))['error'])")"

# ============================================================
echo "== 18) پاسخ خطا JSON است — بدون stack trace =="
body=$(curl -s -H "$AUTH_A" -X POST -H 'Content-Type: application/json' -d '{"source":"bank"}' $BASE/api/food-logs)
check "بدنه خطا JSON با error" "yes" "$(echo "$body" | python3 -c "import json,sys;d=json.load(sys.stdin);print('yes' if 'error' in d and 'at ' not in str(d) else 'no')")"

# ============================================================
echo ""
echo "نتیجه: $PASS موفق / $FAIL شکست"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
