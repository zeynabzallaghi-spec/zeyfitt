#!/bin/bash
# تست‌های API مرحله ۶ — برنامه‌ساز تمرینی: ساخت، ذخیره، ماندگاری، مالکیت، اعتبارسنجی
BASE="http://localhost:3000"
TS=$(date +%s)
A="p6-user-a-$TS@test.local"
B="p6-user-b-$TS@test.local"
JA="/tmp/p6-cookie-a.txt"
JB="/tmp/p6-cookie-b.txt"
JA2="/tmp/p6-cookie-a2.txt"
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $name"; PASS=$((PASS+1))
  else
    echo "FAIL  $name — expected=[$expected] actual=[$actual]"; FAIL=$((FAIL+1))
  fi
}

SETTINGS='{"goal":"muscle_gain","experience":"beginner","daysPerWeek":3,"sessionMinutes":60,"equipment":["bodyweight","dumbbell"],"focus":"all","preferredDays":[0,2,4],"excludedCategories":[],"excludedExerciseIds":[],"limitationNotes":null}'

echo "== 1) مهمان (بدون نشست) =="
code=$(curl -s -o /tmp/p6-out.json -w "%{http_code}" $BASE/api/plans)
check "GET /api/plans مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p6-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/plans)
check "POST /api/plans مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p6-out.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/plans/preview)
check "POST preview مهمان → 401" "401" "$code"
code=$(curl -s -o /tmp/p6-out.json -w "%{http_code}" "$BASE/api/plans/whatever-id")
check "GET /api/plans/[id] مهمان → 401" "401" "$code"

echo "== 2) ثبت‌نام کاربران A و B =="
code=$(curl -s -c $JA -o /tmp/p6-a.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر الف\",\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام A → 200" "200" "$code"
code=$(curl -s -c $JB -o /tmp/p6-b.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر ب\",\"email\":\"$B\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام B → 200" "200" "$code"

echo "== 3) فهرست خالی A =="
body=$(curl -s -b $JA $BASE/api/plans)
check "GET /api/plans A → {\"plans\":[]}" '{"plans":[]}' "$body"

echo "== 4) پیش‌نمایش بدون ذخیره =="
code=$(curl -s -b $JA -o /tmp/p6-preview.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/plans/preview)
check "POST preview → 200" "200" "$code"
days=$(python3 -c "import json;print(len(json.load(open('/tmp/p6-preview.json'))['plan']['days']))")
check "پیش‌نمایش ۳ روز دارد" "3" "$days"
count=$(curl -s -b $JA $BASE/api/plans | python3 -c "import json,sys;print(len(json.load(sys.stdin)['plans']))")
check "پیش‌نمایش چیزی ذخیره نکرد (فهرست خالی)" "0" "$count"

echo "== 5) ساخت و ذخیره برنامه =="
code=$(curl -s -b $JA -o /tmp/p6-plan1.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/plans)
check "POST /api/plans → 201" "201" "$code"
PLAN1=$(python3 -c "import json;print(json.load(open('/tmp/p6-plan1.json'))['plan']['id'])")
status=$(python3 -c "import json;print(json.load(open('/tmp/p6-plan1.json'))['plan']['status'])")
check "برنامه جدید فعال است" "active" "$status"
ids_ok=$(python3 - << PYEOF
import json
plan = json.load(open('/tmp/p6-plan1.json'))['plan']
all_ex = [e['exerciseId'] for d in plan['days'] for e in d['exercises']]
print('yes' if len(all_ex) > 0 and all(' ' not in i or '-' in i for i in all_ex) else 'no')
PYEOF
)
check "حرکات با شناسه پایدار ذخیره شدند" "yes" "$ids_ok"

echo "== 6) ماندگاری پس از بارگذاری مجدد (GET مجدد) =="
code=$(curl -s -b $JA -o /tmp/p6-get1.json -w "%{http_code}" "$BASE/api/plans/$PLAN1")
check "GET برنامه ذخیره‌شده → 200" "200" "$code"
same=$(python3 -c "
import json
a=json.load(open('/tmp/p6-plan1.json'))['plan']
b=json.load(open('/tmp/p6-get1.json'))['plan']
print('yes' if a['id']==b['id'] and len(a['days'])==len(b['days']) and a['days'][0]['exercises'][0]['exerciseId']==b['days'][0]['exercises'][0]['exerciseId'] else 'no')
")
check "جزئیات برنامه پس از GET مجدد یکسان است" "yes" "$same"

echo "== 7) ماندگاری پس از خروج و ورود مجدد =="
curl -s -b $JA -c $JA -o /dev/null -X POST -H 'Content-Type: application/json' -H "Origin: $BASE" -d '{}' $BASE/api/auth/sign-out
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA "$BASE/api/plans/$PLAN1")
check "پس از خروج → 401 (نشست ابطال شد)" "401" "$code"
code=$(curl -s -c $JA2 -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-in/email)
check "ورود مجدد A → 200" "200" "$code"
code=$(curl -s -o /tmp/p6-get2.json -w "%{http_code}" -b $JA2 "$BASE/api/plans/$PLAN1")
check "GET برنامه پس از ورود مجدد → 200" "200" "$code"
count=$(curl -s -b $JA2 $BASE/api/plans | python3 -c "import json,sys;print(len(json.load(sys.stdin)['plans']))")
check "برنامه در فهرست پس از ورود مجدد هست" "1" "$count"

echo "== 8) ایزولاسیون کاربران =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB "$BASE/api/plans/$PLAN1")
check "B برنامه A را نمی‌بیند → 404" "404" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB -X PATCH -H 'Content-Type: application/json' -d '{"status":"archived"}' "$BASE/api/plans/$PLAN1")
check "PATCH برنامه A توسط B → 404" "404" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB -X DELETE "$BASE/api/plans/$PLAN1")
check "DELETE برنامه A توسط B → 404" "404" "$code"
count=$(curl -s -b $JB $BASE/api/plans | python3 -c "import json,sys;print(len(json.load(sys.stdin)['plans']))")
check "فهرست B خالی است" "0" "$count"

echo "== 9) اعتبارسنجی ورودی‌ها =="
code=$(curl -s -b $JA2 -o /tmp/p6-e1.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"muscle_gain","experience":"beginner","daysPerWeek":1,"sessionMinutes":60,"equipment":["bodyweight"],"focus":"all","preferredDays":[],"excludedCategories":[],"excludedExerciseIds":[],"limitationNotes":null}' $BASE/api/plans)
check "۱ روز در هفته → 400" "400" "$code"
code=$(curl -s -b $JA2 -o /tmp/p6-e2.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"muscle_gain","experience":"beginner","daysPerWeek":3,"sessionMinutes":50,"equipment":["bodyweight"],"focus":"all","preferredDays":[],"excludedCategories":[],"excludedExerciseIds":[],"limitationNotes":null}' $BASE/api/plans)
check "۵۰ دقیقه → 400" "400" "$code"
code=$(curl -s -b $JA2 -o /tmp/p6-e3.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"muscle_gain","experience":"beginner","daysPerWeek":3,"sessionMinutes":60,"equipment":[],"focus":"all","preferredDays":[],"excludedCategories":[],"excludedExerciseIds":[],"limitationNotes":null}' $BASE/api/plans)
check "تجهیزات خالی → 400" "400" "$code"
code=$(curl -s -b $JA2 -o /tmp/p6-e4.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"nope","experience":"beginner","daysPerWeek":3,"sessionMinutes":60,"equipment":["bodyweight"],"focus":"all","preferredDays":[],"excludedCategories":[],"excludedExerciseIds":[],"limitationNotes":null}' $BASE/api/plans)
check "هدف نامعتبر → 400" "400" "$code"
code=$(curl -s -b $JA2 -o /tmp/p6-e5.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"muscle_gain","experience":"beginner","daysPerWeek":3,"sessionMinutes":60,"equipment":["band"],"focus":"all","preferredDays":[],"excludedCategories":["chest","back","shoulders","biceps","triceps","core","quads","hamstrings","glutes","calves"],"excludedExerciseIds":[],"limitationNotes":null}' $BASE/api/plans)
if [ "$code" = "400" ] || [ "$code" = "422" ]; then
  echo "PASS  حذف همه دسته‌ها رد می‌شود (400/422)"; PASS=$((PASS+1))
else
  echo "FAIL  حذف همه دسته‌ها رد می‌شود — expected=[400|422] actual=[$code]"; FAIL=$((FAIL+1))
fi
code=$(curl -s -b $JA2 -o /tmp/p6-e6.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"goal":"muscle_gain","experience":"beginner","daysPerWeek":3,"sessionMinutes":60,"equipment":["band"],"focus":"all","preferredDays":[],"excludedCategories":[],"excludedExerciseIds":[],"limitationNotes":null}' $BASE/api/plans)
check "تجهیزات ناکافی (فقط کش) → 422 با پیام فارسی" "422" "$code"
msg=$(python3 -c "import json;print(json.load(open('/tmp/p6-e6.json')).get('message','')[:60])")
echo "      پیام: $msg"

echo "== 10) فعال‌سازی/بایگانی و برنامه جدید =="
SETTINGS2='{"goal":"strength","experience":"advanced","daysPerWeek":4,"sessionMinutes":90,"equipment":["bodyweight","dumbbell","barbell","cable","machine","bench","bar"],"focus":"upper","preferredDays":[],"excludedCategories":[],"excludedExerciseIds":[],"limitationNotes":null}'
code=$(curl -s -b $JA2 -o /tmp/p6-plan2.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS2" $BASE/api/plans)
check "برنامه دوم → 201" "201" "$code"
PLAN2=$(python3 -c "import json;print(json.load(open('/tmp/p6-plan2.json'))['plan']['id'])")
s1=$(curl -s -b $JA2 "$BASE/api/plans/$PLAN1" | python3 -c "import json,sys;print(json.load(sys.stdin)['plan']['status'])")
check "برنامه اول خودکار بایگانی شد" "archived" "$s1"
code=$(curl -s -b $JA2 -o /tmp/p6-act.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' -d '{"status":"archived"}' "$BASE/api/plans/$PLAN2")
check "بایگانی دستی برنامه دوم → 200" "200" "$code"
code=$(curl -s -b $JA2 -o /tmp/p6-act2.json -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' -d '{"status":"active"}' "$BASE/api/plans/$PLAN1")
check "فعال‌سازی مجدد برنامه اول → 200" "200" "$code"
s2=$(curl -s -b $JA2 "$BASE/api/plans/$PLAN2" | python3 -c "import json,sys;print(json.load(sys.stdin)['plan']['status'])")
check "برنامه دوم بایگانی ماند" "archived" "$s2"

echo "== 11) حذف برنامه =="
code=$(curl -s -b $JA2 -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/plans/$PLAN2")
check "حذف برنامه دوم → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA2 "$BASE/api/plans/$PLAN2")
check "برنامه حذف‌شده → 404" "404" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH -H 'Content-Type: application/json' -d '{"title":""}' "$BASE/api/plans/$PLAN1")
check "PATCH بدون نشست → 401" "401" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA2 -X PATCH -H 'Content-Type: application/json' -d '{"title":"عنوان"}' "$BASE/api/plans/nonexistent-id-123")
check "PATCH برنامه ناموجود → 404" "404" "$code"

echo "== 12) رگرسیون: سرویس‌های قبلی =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA2 $BASE/api/weight)
check "GET /api/weight هنوز سالم → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA2 $BASE/api/profile)
check "GET /api/profile هنوز سالم → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/)
check "صفحه اصلی → 200" "200" "$code"

echo ""
echo "═══ نتیجه: $PASS پاس / $FAIL شکست ═══"
[ "$FAIL" = "0" ] || exit 1
