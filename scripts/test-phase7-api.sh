#!/bin/bash
# تست‌های API مرحله ۷ — سیستم تغذیه: برآورد، ساخت، ذخیره، ماندگاری، مالکیت،
# تغییر مقدار، جایگزینی، فهرست خرید و رگرسیون قابلیت‌های قبلی
BASE="http://localhost:3000"
TS=$(date +%s)
A="p7-user-a-$TS@test.local"
B="p7-user-b-$TS@test.local"
JA="/tmp/p7-cookie-a.txt"
JB="/tmp/p7-cookie-b.txt"
JA2="/tmp/p7-cookie-a2.txt"
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $name"; PASS=$((PASS+1))
  else
    echo "FAIL  $name — expected=[$expected] actual=[$actual]"; FAIL=$((FAIL+1))
  fi
}

SETTINGS='{"goal":"weight_loss","activityLevel":"moderate","mealsPerDay":4,"planLength":7,"dietPattern":"none","allergens":[],"dislikedFoodIds":[],"budget":"any","prep":"any","pregnancyBreastfeeding":false,"estimate":null}'
SETTINGS_DAIRY='{"goal":"maintain","activityLevel":"light","mealsPerDay":3,"planLength":1,"dietPattern":"none","allergens":["dairy"],"dislikedFoodIds":[],"budget":"any","prep":"any","pregnancyBreastfeeding":false,"estimate":null}'
SETTINGS_LOCAL_EST='{"goal":"maintain","activityLevel":"light","mealsPerDay":3,"planLength":1,"dietPattern":"none","allergens":[],"dislikedFoodIds":[],"budget":"any","prep":"any","pregnancyBreastfeeding":false,"estimate":{"age":35,"heightCm":178,"weightKg":85,"gender":"male"}}'
SETTINGS_UNDERAGE='{"goal":"weight_loss","activityLevel":"light","mealsPerDay":3,"planLength":1,"dietPattern":"none","allergens":[],"dislikedFoodIds":[],"budget":"any","prep":"any","pregnancyBreastfeeding":false,"estimate":{"age":15,"heightCm":170,"weightKg":60,"gender":"male"}}'

echo "== 1) مهمان (بدون نشست) — همه مسیرهای محافظت‌شده =="
code=$(curl -s -o /tmp/p7-out.json -w "%{http_code}" $BASE/api/nutrition)
check "GET /api/nutrition مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p7-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/nutrition)
check "POST /api/nutrition مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p7-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/nutrition/preview)
check "POST preview مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p7-out.json -w "%{http_code}" "$BASE/api/nutrition/whatever-id")
check "GET /api/nutrition/[id] مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p7-out.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' -d '{"action":"status","status":"archived"}' "$BASE/api/nutrition/whatever-id")
check "PATCH مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p7-out.json -w "%{http_code}" -X DELETE "$BASE/api/nutrition/whatever-id")
check "DELETE مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p7-out.json -w "%{http_code}" "$BASE/api/nutrition/whatever-id/shopping")
check "GET shopping مهمان → 401" "401" "$code"

echo "== 2) ثبت‌نام کاربران A (با پروفایل کامل) و B (بدون پروفایل) =="
code=$(curl -s -c $JA -o /tmp/p7-a.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر الف\",\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام A → 200" "200" "$code"
code=$(curl -s -c $JB -o /tmp/p7-b.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر ب\",\"email\":\"$B\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام B → 200" "200" "$code"

# پروفایل کامل برای A — منبع اطلاعات برآورد
PROFILE_A='{"displayName":"کاربر الف","age":30,"gender":"male","heightCm":175,"weightKg":80,"bodyFat":null,"goal":"fat_loss","experience":"beginner","trainingDaysPerWeek":3,"sessionMinutes":60,"equipment":["free_weights"],"limitations":[],"limitationNotes":null,"diet":"none","allergies":[],"units":"metric"}'
code=$(curl -s -b $JA -o /tmp/p7-profile.json -w "%{http_code}" -X PUT -H 'Content-Type: application/json' -d "$PROFILE_A" $BASE/api/profile)
check "ذخیره پروفایل A → 200" "200" "$code"

echo "== 3) فهرست خالی A =="
body=$(curl -s -b $JA $BASE/api/nutrition)
check "GET /api/nutrition A → {\"plans\":[]}" '{"plans":[]}' "$body"

echo "== 4) اطلاعات ناقص کاربر B — بدون برآورد کالری =="
code=$(curl -s -b $JB -o /tmp/p7-insuff.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/nutrition/preview)
check "پیش‌نمایش B بدون اطلاعات → 422" "422" "$code"
err=$(python3 -c "import json;print(json.load(open('/tmp/p7-insuff.json')).get('error',''))")
check "کد خطا INSUFFICIENT_DATA" "INSUFFICIENT_DATA" "$err"
missing=$(python3 -c "import json;print(','.join(json.load(open('/tmp/p7-insuff.json')).get('missing',[])))")
check "کمبودها: سن/قد/وزن" "سن,قد,وزن" "$missing"

echo "== 5) اطلاعات محلی فرم (بدون پروفایل) برای B کار می‌کند =="
code=$(curl -s -b $JB -o /tmp/p7-localest.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS_LOCAL_EST" $BASE/api/nutrition/preview)
check "پیش‌نمایش با estimate فرم → 200" "200" "$code"
gender_used=$(python3 -c "import json;print(json.load(open('/tmp/p7-localest.json'))['plan']['calc']['genderUsed'])")
check "جنسیت فرم محلی (male) در snapshot ثبت شده" "male" "$gender_used"
count=$(curl -s -b $JB $BASE/api/nutrition | python3 -c "import json,sys;print(len(json.load(sys.stdin)['plans']))")
check "پیش‌نمایش B چیزی ذخیره نکرد" "0" "$count"

echo "== 6) گروه نیازمند احتیاط — نوجوان ۱۵ ساله =="
code=$(curl -s -b $JB -o /tmp/p7-underage.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS_UNDERAGE" $BASE/api/nutrition/preview)
check "پیش‌نمایش نوجوان (کاربر بدون پروفایل) → 200" "200" "$code"
caution=$(python3 -c "import json;p=json.load(open('/tmp/p7-underage.json'))['plan'];print(str(p['calc']['caution']).lower())")
check "پرچم caution نوجوان" "true" "$caution"
goal=$(python3 -c "import json;print(json.load(open('/tmp/p7-underage.json'))['plan']['goal'])")
check "هدف نوجوان روی حفظ وزن قفل شده" "maintain" "$goal"
warning=$(python3 -c "
import json
p=json.load(open('/tmp/p7-underage.json'))['plan']
print('yes' if any('۱۸ سال' in w for w in p['calc']['warnings']) else 'no')")
check "هشدار مشورت با متخصص برای نوجوان" "yes" "$warning"

echo "== 7) پیش‌نمایش کاربر A از پروفایل + رعایت پیش‌فرض‌ها =="
code=$(curl -s -b $JA -o /tmp/p7-preview.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/nutrition/preview)
check "پیش‌نمایش A → 200" "200" "$code"
target=$(python3 -c "import json;print(json.load(open('/tmp/p7-preview.json'))['plan']['calc']['targetKcal'])")
check "هدف کاهش وزن = 2210 (TDEE 2710 − 500)" "2210" "$target"
days=$(python3 -c "import json;print(len(json.load(open('/tmp/p7-preview.json'))['plan']['days']))")
check "پیش‌نمایش ۷ روز دارد" "7" "$days"
no_save=$(curl -s -b $JA $BASE/api/nutrition | python3 -c "import json,sys;print(len(json.load(sys.stdin)['plans']))")
check "پیش‌نمایش A چیزی ذخیره نکرد" "0" "$no_save"

echo "== 8) اعتبارسنجی — مقادیر نامعتبر رد می‌شوند =="
code=$(curl -s -b $JA -o /tmp/p7-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "$(echo "$SETTINGS" | python3 -c "import json,sys;s=json.load(sys.stdin);s['mealsPerDay']=2;print(json.dumps(s))")" $BASE/api/nutrition/preview)
check "وعده ۲ → 400" "400" "$code"
code=$(curl -s -b $JA -o /tmp/p7-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "$(echo "$SETTINGS" | python3 -c "import json,sys;s=json.load(sys.stdin);s['planLength']=3;print(json.dumps(s))")" $BASE/api/nutrition/preview)
check "طول برنامه ۳ روز → 400" "400" "$code"
code=$(curl -s -b $JA -o /tmp/p7-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "$(echo "$SETTINGS" | python3 -c "import json,sys;s=json.load(sys.stdin);s['goal']='get_rich';print(json.dumps(s))")" $BASE/api/nutrition/preview)
check "هدف نامعتبر → 400" "400" "$code"
code=$(curl -s -b $JA -o /tmp/p7-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "$(echo "$SETTINGS" | python3 -c "import json,sys;s=json.load(sys.stdin);s['estimate']={'age':-5,'heightCm':175,'weightKg':80,'gender':'male'};print(json.dumps(s))")" $BASE/api/nutrition/preview)
check "سن منفی → 400" "400" "$code"
code=$(curl -s -b $JA -o /tmp/p7-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "$(echo "$SETTINGS" | python3 -c "import json,sys;s=json.load(sys.stdin);s['dislikedFoodIds']=['hacker_food'];print(json.dumps(s))")" $BASE/api/nutrition/preview)
check "شناسه ماده ناشناخته → 400" "400" "$code"
code=$(curl -s -b $JA -o /tmp/p7-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d 'not-json' $BASE/api/nutrition/preview)
check "بدنه غیر JSON → 400" "400" "$code"

echo "== 9) ساخت و ذخیره برنامه A =="
code=$(curl -s -b $JA -o /tmp/p7-plan1.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/nutrition)
check "POST /api/nutrition → 201" "201" "$code"
PLAN1=$(python3 -c "import json;print(json.load(open('/tmp/p7-plan1.json'))['plan']['id'])")
status=$(python3 -c "import json;print(json.load(open('/tmp/p7-plan1.json'))['plan']['status'])")
check "برنامه جدید فعال است" "active" "$status"
kcal_ok=$(python3 - << PYEOF
import json
plan = json.load(open('/tmp/p7-plan1.json'))['plan']
day1 = plan['days'][0]
sum_items = sum(i['kcal'] for m in day1['meals'] for i in m['items'])
sum_meals = sum(m['kcal'] for m in day1['meals'])
print('yes' if day1['kcal'] == sum_items == sum_meals and all(i['grams'] > 0 for m in day1['meals'] for i in m['items']) else 'no')
PYEOF
)
check "جمع روزانه از اجزای واقعی و سازگار" "yes" "$kcal_ok"

echo "== 10) ماندگاری پس از GET مجدد =="
code=$(curl -s -b $JA -o /tmp/p7-get1.json -w "%{http_code}" "$BASE/api/nutrition/$PLAN1")
check "GET برنامه ذخیره‌شده → 200" "200" "$code"
same=$(python3 -c "
import json
a=json.load(open('/tmp/p7-plan1.json'))['plan']
b=json.load(open('/tmp/p7-get1.json'))['plan']
print('yes' if a['id']==b['id'] and len(a['days'])==len(b['days']) and a['days'][0]['meals'][0]['items'][0]['foodId']==b['days'][0]['meals'][0]['items'][0]['foodId'] else 'no')")
check "جزئیات پس از GET مجدد یکسان" "yes" "$same"

echo "== 11) ماندگاری پس از خروج و ورود مجدد =="
curl -s -b $JA -c $JA -o /dev/null -X POST -H 'Content-Type: application/json' -H "Origin: $BASE" -d '{}' $BASE/api/auth/sign-out
code=$(curl -s -b $JA -o /tmp/p7-out.json -w "%{http_code}" $BASE/api/nutrition)
check "بعد از خروج نشست باطل → 401" "401" "$code"
code=$(curl -s -c $JA2 -o /tmp/p7-a2.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-in/email)
check "ورود مجدد A → 200" "200" "$code"
code=$(curl -s -b $JA2 -o /tmp/p7-get2.json -w "%{http_code}" "$BASE/api/nutrition/$PLAN1")
check "پس از ورود مجدد برنامه موجود → 200" "200" "$code"

echo "== 12) ایزولاسیون کاربر B — دسترسی به برنامه A ممنوع =="
code=$(curl -s -b $JB -o /tmp/p7-out.json -w "%{http_code}" "$BASE/api/nutrition/$PLAN1")
check "GET برنامه A توسط B → 404" "404" "$code"
code=$(curl -s -b $JB -o /tmp/p7-out.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' -d '{"action":"status","status":"archived"}' "$BASE/api/nutrition/$PLAN1")
check "PATCH برنامه A توسط B → 404" "404" "$code"
code=$(curl -s -b $JB -o /tmp/p7-out.json -w "%{http_code}" -X DELETE "$BASE/api/nutrition/$PLAN1")
check "DELETE برنامه A توسط B → 404" "404" "$code"
code=$(curl -s -b $JB -o /tmp/p7-out.json -w "%{http_code}" "$BASE/api/nutrition/$PLAN1/shopping")
check "فهرست خرید برنامه A توسط B → 404" "404" "$code"

echo "== 13) تغییر مقدار ماده + محاسبه مجدد سازگار =="
ITEM=$(python3 - << PYEOF
import json
plan = json.load(open('/tmp/p7-get1.json'))['plan']
d = plan['days'][0]
m = d['meals'][0]
i = m['items'][0]
print(json.dumps({"dayOrder": d['order'], "mealOrder": m['order'], "itemOrder": i['order'], "grams": i['grams'], "kcal": i['kcal']}))
PYEOF
)
D=$(echo "$ITEM" | python3 -c "import json,sys;print(json.load(sys.stdin)['dayOrder'])")
M=$(echo "$ITEM" | python3 -c "import json,sys;print(json.load(sys.stdin)['mealOrder'])")
I=$(echo "$ITEM" | python3 -c "import json,sys;print(json.load(sys.stdin)['itemOrder'])")
OLDG=$(echo "$ITEM" | python3 -c "import json,sys;print(json.load(sys.stdin)['grams'])")
NEWG=$((OLDG + 50))
code=$(curl -s -b $JA2 -o /tmp/p7-patch1.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"action\":\"update_item\",\"dayOrder\":$D,\"mealOrder\":$M,\"itemOrder\":$I,\"grams\":$NEWG}" "$BASE/api/nutrition/$PLAN1")
check "PATCH update_item → 200" "200" "$code"
consistent=$(python3 - << PYEOF
import json
plan = json.load(open('/tmp/p7-patch1.json'))['plan']
d = plan['days'][0]
m = d['meals'][0]
i = m['items'][0]
sum_items = sum(x['kcal'] for x in m['items'])
print('yes' if i['grams'] == $NEWG and m['kcal'] == sum_items else 'no')
PYEOF
)
check "مقدار جدید و مجموع وعده سازگار" "yes" "$consistent"
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"action\":\"update_item\",\"dayOrder\":$D,\"mealOrder\":$M,\"itemOrder\":$I,\"grams\":-10}" "$BASE/api/nutrition/$PLAN1")
check "مقدار منفی → 400" "400" "$code"
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"action\":\"update_item\",\"dayOrder\":$D,\"mealOrder\":$M,\"itemOrder\":$I,\"grams\":99999}" "$BASE/api/nutrition/$PLAN1")
check "مقدار بیش‌ازحد → 400" "400" "$code"

echo "== 14) جایگزینی ماده + محاسبه مجدد =="
code=$(curl -s -b $JA2 -o /tmp/p7-repl.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"action\":\"replace_item\",\"dayOrder\":$D,\"mealOrder\":$M,\"itemOrder\":$I,\"newFoodId\":\"chicken_breast\"}" "$BASE/api/nutrition/$PLAN1")
check "PATCH replace_item → 200" "200" "$code"
repl_ok=$(python3 - << PYEOF
import json
plan = json.load(open('/tmp/p7-repl.json'))['plan']
d = plan['days'][0]
m = d['meals'][0]
i = [x for x in m['items'] if x['order'] == $I][0]
sum_items = sum(x['kcal'] for x in m['items'])
in_bank = i['foodId'] == 'chicken_breast'
print('yes' if in_bank and m['kcal'] == sum_items and i['grams'] > 0 else 'no')
PYEOF
)
check "جایگزین از بانک و مجموع سازگار" "yes" "$repl_ok"

echo "== 15) رعایت آلرژی در مسیر جایگزینی =="
code=$(curl -s -b $JA2 -o /tmp/p7-dairy.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS_DAIRY" $BASE/api/nutrition)
check "ساخت برنامه با آلرژی لبنی → 201" "201" "$code"
DAIRY_PLAN=$(python3 -c "import json;print(json.load(open('/tmp/p7-dairy.json'))['plan']['id'])")
no_dairy=$(python3 -c "
import json
p=json.load(open('/tmp/p7-dairy.json'))['plan']
items=[i for d in p['days'] for m in d['meals'] for i in m['items']]
print('yes' if len(items)>0 else 'no')")
check "برنامه آلرژی‌دار مواد دارد" "yes" "$no_dairy"
# تلاش برای جایگزینی با پنیر (لبنی) باید رد شود
code=$(curl -s -b $JA2 -o /tmp/p7-incompat.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d "{\"action\":\"replace_item\",\"dayOrder\":1,\"mealOrder\":1,\"itemOrder\":1,\"newFoodId\":\"white_cheese\"}" "$BASE/api/nutrition/$DAIRY_PLAN")
check "جایگزینی با ماده ناسازگار → 422" "422" "$code"
err=$(python3 -c "import json;print(json.load(open('/tmp/p7-incompat.json')).get('error',''))")
check "کد خطا INCOMPATIBLE_FOOD" "INCOMPATIBLE_FOOD" "$err"

echo "== 16) فهرست خرید — تجمیع درست =="
# پس از تغییرهای بخش‌های ۱۳ و ۱۴، برنامه دوباره خوانده می‌شود تا مقایسه منصفانه باشد
curl -s -b $JA2 -o /tmp/p7-get1.json "$BASE/api/nutrition/$PLAN1"
code=$(curl -s -b $JA2 -o /tmp/p7-shop.json -w "%{http_code}" "$BASE/api/nutrition/$PLAN1/shopping")
check "GET shopping همه روزها → 200" "200" "$code"
agg_ok=$(python3 - << PYEOF
import json
from urllib.request import urlopen
plan = json.load(open('/tmp/p7-get1.json'))['plan']
shop = json.load(open('/tmp/p7-shop.json'))
manual = {}
for d in plan['days']:
    for m in d['meals']:
        for i in m['items']:
            manual[i['foodId']] = manual.get(i['foodId'], 0) + i['grams']
server = {i['foodId']: i['totalGrams'] for i in shop['items']}
print('yes' if manual == server and len(shop['items']) > 0 and all(i['totalGrams'] > 0 for i in shop['items']) else 'no')
PYEOF
)
check "تجمیع سرور با جمع دستی همه روزها برابر" "yes" "$agg_ok"
code=$(curl -s -b $JA2 -o /tmp/p7-shop1.json -w "%{http_code}" "$BASE/api/nutrition/$PLAN1/shopping?days=1")
check "GET shopping روز ۱ → 200" "200" "$code"
one_day=$(python3 - << PYEOF
import json
plan = json.load(open('/tmp/p7-get1.json'))['plan']
shop = json.load(open('/tmp/p7-shop1.json'))
manual = {}
for m in plan['days'][0]['meals']:
    for i in m['items']:
        manual[i['foodId']] = manual.get(i['foodId'], 0) + i['grams']
server = {i['foodId']: i['totalGrams'] for i in shop['items']}
print('yes' if manual == server else 'no')
PYEOF
)
check "فهرست روز انتخابی فقط همان روز است" "yes" "$one_day"
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" "$BASE/api/nutrition/$PLAN1/shopping?days=abc")
check "پارامتر روز نامعتبر → 400" "400" "$code"

echo "== 17) فعال‌سازی/بایگانی — حداکثر یک برنامه فعال =="
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d '{"action":"status","status":"archived"}' "$BASE/api/nutrition/$PLAN1")
check "بایگانی برنامه ۱ → 200" "200" "$code"
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' \
  -d '{"action":"status","status":"active"}' "$BASE/api/nutrition/$DAIRY_PLAN")
check "فعال‌سازی برنامه ۲ → 200" "200" "$code"
active_count=$(curl -s -b $JA2 $BASE/api/nutrition | python3 -c "import json,sys;print(sum(1 for p in json.load(sys.stdin)['plans'] if p['status']=='active'))")
check "فقط یک برنامه فعال" "1" "$active_count"

echo "== 18) حذف برنامه =="
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" -X DELETE "$BASE/api/nutrition/$DAIRY_PLAN")
check "DELETE برنامه ۲ → 200" "200" "$code"
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" "$BASE/api/nutrition/$DAIRY_PLAN")
check "برنامه حذف‌شده → 404" "404" "$code"

echo "== 19) رگرسیون قابلیت‌های قبلی =="
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" $BASE/api/weight)
check "GET /api/weight → 200" "200" "$code"
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" $BASE/api/profile)
check "GET /api/profile → 200" "200" "$code"
code=$(curl -s -b $JA2 -o /tmp/p7-out.json -w "%{http_code}" $BASE/api/plans)
check "GET /api/plans (تمرینی) → 200" "200" "$code"

echo ""
echo "========================================"
echo "نتیجه: $PASS پاس / $FAIL شکست"
if [ "$FAIL" -gt 0 ]; then
  echo "برخی تست‌ها شکست خوردند — بالا را ببینید"
  exit 1
fi
