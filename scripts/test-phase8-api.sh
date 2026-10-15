#!/bin/bash
# تست‌های API مرحله ۸ — ثبت تمرین واقعی: شروع/ست‌ها/پایان/تاریخچه/آمار/مالکیت/وضعیت‌ها
BASE="http://localhost:3000"
TS=$(date +%s)
A="p8-user-a-$TS@test.local"
B="p8-user-b-$TS@test.local"
JA="/tmp/p8-cookie-a.txt"
JB="/tmp/p8-cookie-b.txt"
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

echo "== 1) مهمان (بدون نشست) — همه مسیرها ۴۰۱ =="
for ep in "sessions/active" "sessions" "sessions/stats" "sessions/whatever-id"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/$ep")
  check "GET /api/$ep مهمان → 401" "401" "$code"
done
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{}' $BASE/api/sessions/whatever-id/sets)
check "POST sets مسیر ناموجود مهمان → 401" "401" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"planDayId":"x"}' $BASE/api/sessions/start)
check "POST sessions/start مهمان → 401" "401" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"action":"complete"}' $BASE/api/sessions/x/finish)
check "POST finish مهمان → 401" "401" "$code"

echo "== 2) ثبت‌نام کاربران A و B =="
code=$(curl -s -c $JA -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر الف\",\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام A → 200" "200" "$code"
code=$(curl -s -c $JB -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر ب\",\"email\":\"$B\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام B → 200" "200" "$code"

echo "== 3) جلسه فعال اولیه نیست =="
body=$(curl -s -b $JA $BASE/api/sessions/active)
check "GET active بدون جلسه → {\"session\":null}" '{"session":null}' "$body"

echo "== 4) برنامه برای کاربر A =="
code=$(curl -s -b $JA -o /tmp/p8-plan.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "$SETTINGS" $BASE/api/plans)
check "ساخت برنامه → 201" "201" "$code"
DAY1=$(python3 -c "import json;print(json.load(open('/tmp/p8-plan.json'))['plan']['days'][0]['id'])")

echo "== 5) شروع جلسه از روز برنامه =="
code=$(curl -s -b $JA -o /tmp/p8-sess1.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "{\"planDayId\":\"$DAY1\"}" $BASE/api/sessions/start)
check "شروع جلسه → 201" "201" "$code"
SID=$(python3 -c "import json;print(json.load(open('/tmp/p8-sess1.json'))['session']['id'])")
status=$(python3 -c "import json;print(json.load(open('/tmp/p8-sess1.json'))['session']['status'])")
check "وضعیت جلسه in_progress" "in_progress" "$status"
n=$(python3 -c "import json;print(len(json.load(open('/tmp/p8-sess1.json'))['session']['exercises']))")
check "حرکات روز برنامه در جلسه کپی شد (n>0)" "yes" "$([ "$n" -gt 0 ] && echo yes || echo no)"

echo "== 6) جلوگیری از جلسه فعال تکراری =="
code=$(curl -s -b $JA -o /tmp/p8-sess2.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d "{\"planDayId\":\"$DAY1\"}" $BASE/api/sessions/start)
check "شروع دوباره → 200 (نه 201)" "200" "$code"
SID2=$(python3 -c "import json;print(json.load(open('/tmp/p8-sess2.json'))['session']['id'])")
existing=$(python3 -c "import json;print(json.load(open('/tmp/p8-sess2.json'))['existing'])")
check "همان جلسه قبلی برگشت (بدون دوباره‌سازی)" "yes" "$([ "$SID" = "$SID2" ] && echo yes || echo no)"
check "پاسخ existing=true" "True" "$existing"

echo "== 7) بازیابی جلسه پس از رفرش (GET active) =="
same=$(curl -s -b $JA $BASE/api/sessions/active | python3 -c "import json,sys;s=json.load(sys.stdin)['session'];print('yes' if s and s['id']=='$SID' and s['status']=='in_progress' else 'no')")
check "جلسه فعال از سرور بازیابی شد" "yes" "$same"

echo "== 8) ثبت ست واقعی با بار خارجی (حرکت دمبل) =="
code=$(curl -s -b $JA -o /tmp/p8-add-db.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"exerciseId":"bench-press-dumbbell"}' $BASE/api/sessions/$SID/exercises)
check "افزودن پرس دمبل → 201" "201" "$code"
EXID=$(python3 -c "import json;print(json.load(open('/tmp/p8-add-db.json'))['session']['exercises'][-1]['id'])")
code=$(curl -s -b $JA -o /tmp/p8-set1.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXID\",\"setNumber\":1,\"reps\":10,\"weightKg\":40}" $BASE/api/sessions/$SID/sets)
check "ثبت ست ۱ → 201" "201" "$code"
sets1=$(python3 -c "import json;s=json.load(open('/tmp/p8-set1.json'))['session']['exercises'];print(sum(len(e['sets']) for e in s))")
check "ست در جلسه ثبت شد (1)" "1" "$sets1"
# اصلاح همان ست (شماره ۱) — بدون ست تکراری
code=$(curl -s -b $JA -o /tmp/p8-set2.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXID\",\"setNumber\":1,\"reps\":12,\"weightKg\":45}" $BASE/api/sessions/$SID/sets)
check "اصلاح ست ۱ → 201" "201" "$code"
sets2=$(python3 -c "import json;s=json.load(open('/tmp/p8-set2.json'))['session']['exercises'];e=[x for x in s if x['id']=='$EXID'][0];print(len(e['sets']))")
check "بدون ست تکراری (هنوز 1)" "1" "$sets2"
check "مقدار ست به‌روز شد (12/45)" "12 45" "$(python3 -c "
import json
s=json.load(open('/tmp/p8-set2.json'))['session']['exercises']
e=[x for x in s if x['id']=='$EXID'][0]
print(e['sets'][0]['reps'], e['sets'][0]['weightKg'])")"

echo "== 9) اعتبارسنجی سمت سرور =="
code=$(curl -s -o /tmp/p8-v1.json -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXID\",\"setNumber\":1,\"reps\":-5,\"weightKg\":40}" $BASE/api/sessions/$SID/sets)
check "تکرار منفی → 400" "400" "$code"
msg=$(python3 -c "import json;print(json.load(open('/tmp/p8-v1.json')).get('message',''))" | head -c 30)
fa_ok=$(python3 -c "print('yes' if '\u062a\u06a9\u0631\u0627\u0631' in open('/tmp/p8-v1.json').read() else 'no')")
check "پیام فارسی خطا" "yes" "$fa_ok"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXID\",\"setNumber\":0,\"reps\":10,\"weightKg\":null}" $BASE/api/sessions/$SID/sets)
check "شماره ست ۰ → 400" "400" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXID\",\"setNumber\":99,\"reps\":10,\"weightKg\":null}" $BASE/api/sessions/$SID/sets)
check "شماره ست ۹۹ → 400" "400" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXID\",\"setNumber\":2,\"reps\":10,\"weightKg\":600}" $BASE/api/sessions/$SID/sets)
check "وزنه خارج بازه (۶۰۰) → 400" "400" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"ناموجود\",\"setNumber\":2,\"reps\":10,\"weightKg\":null}" $BASE/api/sessions/$SID/sets)
check "حرکت ناموجود در جلسه → 404" "404" "$code"

echo "== 10) قاعده وزن بدن — حرکت بی‌بار وزنه نمی‌پذیرد =="
code=$(curl -s -b $JA -o /tmp/p8-add1.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"exerciseId":"pushup"}' $BASE/api/sessions/$SID/exercises)
check "افزودن شنا (بدن) → 201" "201" "$code"
PUSHID=$(python3 -c "import json;print(json.load(open('/tmp/p8-add1.json'))['session']['exercises'][-1]['id'])")
code=$(curl -s -b $JA -o /tmp/p8-bw.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$PUSHID\",\"setNumber\":1,\"reps\":20,\"weightKg\":50}" $BASE/api/sessions/$SID/sets)
check "ثبت ست شنا → 201" "201" "$code"
bw=$(python3 -c "import json;s=json.load(open('/tmp/p8-bw.json'))['session']['exercises'];e=[x for x in s if x['id']=='$PUSHID'][0];print(e['sets'][0]['weightKg'])")
check "وزنه ثبت‌شده null شد (بدون جعل بار خارجی)" "None" "$bw"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' \
  -d '{"exerciseId":"not-a-real-exercise"}' $BASE/api/sessions/$SID/exercises)
check "افزودن حرکت جعلی → 422 EXERCISE_NOT_IN_BANK" "422" "$code"

echo "== 11) وضعیت حرکت (رد/انجام) =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"skipped"}' $BASE/api/sessions/$SID/exercises/$EXID)
check "رد کردن حرکت → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"done"}' $BASE/api/sessions/$SID/exercises/$PUSHID)
check "انجام‌شده کردن شنا → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"bogus"}' $BASE/api/sessions/$SID/exercises/$PUSHID)
check "وضعیت بی‌معنی → 400" "400" "$code"

echo "== 12) ایزولاسیون کامل کاربران (A و B) =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB "$BASE/api/sessions/$SID")
check "دسترسی B به جلسه A → 404" "404" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXID\",\"setNumber\":5,\"reps\":5,\"weightKg\":null}" $BASE/api/sessions/$SID/sets)
check "ثبت ست B روی جلسه A → 404" "404" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB -X POST -H 'Content-Type: application/json' \
  -d "{\"action\":\"complete\"}" $BASE/api/sessions/$SID/finish)
check "پایان دادن B به جلسه A → 404" "404" "$code"
# B جلسه آزاد خودش را می‌سازد
code=$(curl -s -b $JB -o /tmp/p8-sessB.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"exercises":[{"exerciseId":"squat-bodyweight"},{"exerciseId":"plank"}]}' $BASE/api/sessions/start)
check "شروع تمرین آزاد B → 201" "201" "$code"
SIDB=$(python3 -c "import json;print(json.load(open('/tmp/p8-sessB.json'))['session']['id'])")
same=$(python3 -c "import json;print('yes' if json.load(open('/tmp/p8-sessB.json'))['session']['id'] != '$SID' else 'no')")
check "جلسه B جدا از جلسه A است" "yes" "$same"

echo "== 13) تمرین آزاد با حرکت جعلی رد می‌شود (بدون جلسه فعال) =="
# B در حال حاضر جلسه فعال دارد → جلوگیری از تکرار اولویت دارد و همان جلسه برمی‌گردد
# این تست در بخش ۲۰ پس از بسته شدن جلسات هر دو کاربر اجرا می‌شود
# B در حال حاضر جلسه فعال دارد → شروع دومی همان برمی‌گردد
code=$(curl -s -o /tmp/p8-dupB.json -w "%{http_code}" -b $JB -X POST -H 'Content-Type: application/json' \
  -d '{"exercises":[{"exerciseId":"plank"}]}' $BASE/api/sessions/start)
check "شروع دومی B → 200 (همان جلسه)" "200" "$code"
SIDB2=$(python3 -c "import json;print(json.load(open('/tmp/p8-dupB.json'))['session']['id'])")
check "جلسه دوم ساخته نشد" "yes" "$([ "$SIDB" = "$SIDB2" ] && echo yes || echo no)"

echo "== 14) پایان جلسه A — تکمیل صریح =="
code=$(curl -s -b $JA -o /tmp/p8-fin.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"action":"complete","notes":"تست پایان"}' $BASE/api/sessions/$SID/finish)
check "پایان جلسه → 200" "200" "$code"
st=$(python3 -c "import json;print(json.load(open('/tmp/p8-fin.json'))['session']['status'])")
end=$(python3 -c "import json;print(json.load(open('/tmp/p8-fin.json'))['session']['endedAt'] is not None)")
check "وضعیت completed" "completed" "$st"
check "زمان پایان ثبت شد" "True" "$end"
# پس از پایان، هیچ نوشتنی مجاز نیست
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXID\",\"setNumber\":9,\"reps\":9,\"weightKg\":null}" $BASE/api/sessions/$SID/sets)
check "ثبت ست پس از پایان → 409 SESSION_CLOSED" "409" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X PATCH -H 'Content-Type: application/json' \
  -d '{"status":"pending"}' $BASE/api/sessions/$SID/exercises/$EXID)
check "تغییر وضعیت پس از پایان → 409" "409" "$code"
body=$(curl -s -b $JA $BASE/api/sessions/active)
check "جلسه فعال دیگر وجود ندارد" '{"session":null}' "$body"

echo "== 15) جلسه ناتمام و رهاکردن (B) =="
EXB=$(python3 -c "import json;print(json.load(open('/tmp/p8-sessB.json'))['session']['exercises'][0]['id'])")
curl -s -o /dev/null -b $JB -X POST -H 'Content-Type: application/json' \
  -d "{\"sessionExerciseId\":\"$EXB\",\"setNumber\":1,\"reps\":15,\"weightKg\":null}" $BASE/api/sessions/$SIDB/sets
code=$(curl -s -b $JB -o /tmp/p8-abandon.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"action":"abandon"}' $BASE/api/sessions/$SIDB/finish)
check "رهاکردن جلسه → 200" "200" "$code"
st=$(python3 -c "import json;print(json.load(open('/tmp/p8-abandon.json'))['session']['status'])")
check "وضعیت abandoned (نه completed)" "abandoned" "$st"

echo "== 16) تاریخچه واقعی =="
code=$(curl -s -b $JA -o /tmp/p8-hist.json -w "%{http_code}" "$BASE/api/sessions")
check "GET تاریخچه → 200" "200" "$code"
cnt=$(python3 -c "import json;print(len(json.load(open('/tmp/p8-hist.json'))['sessions']))")
check "تاریخچه A یک جلسه دارد" "1" "$cnt"
st=$(python3 -c "import json;print(json.load(open('/tmp/p8-hist.json'))['sessions'][0]['status'])")
check "وضعیت در تاریخچه completed" "completed" "$st"
sets=$(python3 -c "import json;s=json.load(open('/tmp/p8-hist.json'))['sessions'][0];print(s['setsCompleted'])")
check "ست‌های محاسبه‌شده از ست‌های واقعی (>=2)" "yes" "$([ "$sets" -ge 2 ] && echo yes || echo no)"
vol=$(python3 -c "import json;print(json.load(open('/tmp/p8-hist.json'))['sessions'][0]['volumeKg'])")
check "حجم = 12×45 فقط از ست بارخوردار (540)" "540" "$vol"
# فیلتر وضعیت
cnt=$(curl -s -b $JA "$BASE/api/sessions?status=completed" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['sessions']))")
check "فیلتر completed → 1" "1" "$cnt"
cnt=$(curl -s -b $JA "$BASE/api/sessions?status=abandoned" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['sessions']))")
check "فیلتر abandoned برای A → 0" "0" "$cnt"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA "$BASE/api/sessions?limit=abc")
check "پارامتر نامعتبر limit → 400" "400" "$code"

echo "== 17) آمار پیشرفت =="
code=$(curl -s -b $JA -o /tmp/p8-stats.json -w "%{http_code}" "$BASE/api/sessions/stats")
check "GET آمار → 200" "200" "$code"
cw=$(python3 -c "import json;print(json.load(open('/tmp/p8-stats.json'))['stats']['thisWeek']['completedSessions'])")
check "جلسات تکمیل‌شده این هفته = ۱" "1" "$cw"
ab=$(python3 -c "import json;print(json.load(open('/tmp/p8-stats.json'))['stats']['totals']['abandonedSessions'])")
check "رهاشده در آمار جدا = ۰ برای A" "0" "$ab"
last=$(python3 -c "import json;print(json.load(open('/tmp/p8-stats.json'))['stats']['lastCompletedSession'] is not None)")
check "آخرین جلسه تکمیل‌شده ثبت شده" "True" "$last"
# روند حرکت — شنا فقط در جلسه completed جلسه A ثبت شد
prog=$(curl -s -b $JA "$BASE/api/sessions/stats?exerciseId=pushup")
rows=$(echo "$prog" | python3 -c "import json,sys;print(len(json.load(sys.stdin)['progress']['rows']))")
check "روند شنا: حداقل ۱ سطر از جلسه تکمیل‌شده" "yes" "$([ "$rows" -ge 1 ] && echo yes || echo no)"
best=$(echo "$prog" | python3 -c "import json,sys;print(json.load(sys.stdin)['progress']['rows'][0]['totalReps'])")
check "مجموع تکرارهای شنا در سطر صحیح" "20" "$best"

echo "== 18) حذف برنامه تاریخچه جلسه را حذف نمی‌کند =="
PLANID=$(python3 -c "import json;print(json.load(open('/tmp/p8-plan.json'))['plan']['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X DELETE $BASE/api/plans/$PLANID)
check "حذف برنامه → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA $BASE/api/sessions/$SID)
check "جلسه پس از حذف برنامه هنوز هست → 200" "200" "$code"

echo "== 19) حذف جلسه =="
# A یک تمرین آزاد می‌سازد و حذف می‌کند
code=$(curl -s -b $JA -o /tmp/p8-free.json -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d '{"exercises":[{"exerciseId":"plank"}]}' $BASE/api/sessions/start)
check "تمرین آزاد A → 201" "201" "$code"
SID3=$(python3 -c "import json;print(json.load(open('/tmp/p8-free.json'))['session']['id'])")
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X DELETE $BASE/api/sessions/$SID3)
check "حذف جلسه → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA $BASE/api/sessions/$SID3)
check "جلسه حذف‌شده دیگر نیست → 404" "404" "$code"

echo "== 20) روز برنامه کاربر دیگر و حرکت جعلی شروع نمی‌شود =="
# A و B هر دو جلسه بسته دارند → اعتبارسنجی تمرین آزاد و مالکیت روز برنامه
# B سعی می‌کند از روز برنامه A شروع کند (برنامه حذف شد → 404)
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB -X POST -H 'Content-Type: application/json' \
  -d "{\"planDayId\":\"$DAY1\"}" $BASE/api/sessions/start)
check "شروع از روز برنامه غیرمجاز → 404" "404" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' \
  -d '{"exercises":[{"exerciseId":"fake_move"}]}' $BASE/api/sessions/start)
check "تمرین آزاد با حرکت ناموجود → 422" "422" "$code"

echo "========================================"
echo "نتیجه: $PASS پاس / $FAIL شکست"
if [ "$FAIL" -gt 0 ]; then exit 1; fi
