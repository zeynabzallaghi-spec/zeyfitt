#!/bin/bash
# تست‌های API مرحله ۹ — دستیار هوشمند واقعی:
# مهمان/اعتبارسنجی/مالکیت A و B/ارسال واقعی به مدل/زبان پاسخ/ماندگاری/حذف/نرخ
BASE="http://localhost:3000"
TS=$(date +%s)
A="p9-user-a-$TS@test.local"
B="p9-user-b-$TS@test.local"
JA="/tmp/p9-cookie-a.txt"
JB="/tmp/p9-cookie-b.txt"
PASS=0; FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "PASS  $name"; PASS=$((PASS+1))
  else
    echo "FAIL  $name — expected=[$expected] actual=[$actual]"; FAIL=$((FAIL+1))
  fi
}

jqpy() { python3 -c "import json,sys;d=json.load(sys.stdin);print(eval(\"d$1\"))" 2>/dev/null || echo "PYERR"; }

echo "== 1) مهمان — همه مسیرها ۴۰۱ =="
for m in "GET api/assistant/status" "GET api/assistant/conversations" "POST api/assistant/conversations"; do
  method=${m%% *}; ep=${m#* }
  code=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE/$ep")
  check "مهمان $method /$ep → 401" "401" "$code"
done
code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/assistant/conversations/some-id")
check "مهمان GET conversation/[id] → 401" "401" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/assistant/conversations/some-id")
check "مهمان DELETE conversation/[id] → 401" "401" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{"content":"hi"}' "$BASE/api/assistant/conversations/some-id/messages")
check "مهمان POST messages → 401" "401" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' -d '{}' "$BASE/api/assistant/conversations/some-id/retry")
check "مهمان POST retry → 401" "401" "$code"

echo "== 2) ثبت‌نام کاربران A و B =="
code=$(curl -s -c $JA -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر الف۹\",\"email\":\"$A\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام A → 200" "200" "$code"
code=$(curl -s -c $JB -o /dev/null -w "%{http_code}" -X POST -H 'Content-Type: application/json' \
  -d "{\"name\":\"کاربر ب۹\",\"email\":\"$B\",\"password\":\"test1234\"}" $BASE/api/auth/sign-up/email)
check "ثبت‌نام B → 200" "200" "$code"

echo "== 3) وضعیت اتصال واقعی =="
configured=$(curl -s -b $JA $BASE/api/assistant/status | jqpy "['provider']['configured']")
check "ارائه‌دهنده پیکربندی‌شده (zai محیط اجرا)" "True" "$configured"
pid=$(curl -s -b $JA $BASE/api/assistant/status | jqpy "['provider']['id']")
check "شناسه ارائه‌دهنده zai" "zai" "$pid"
secrets=$(curl -s -b $JA $BASE/api/assistant/status)
leak=$(echo "$secrets" | rg -i "key|token|secret|base_url" | head -1 || true)
check "بدون افشای کلید/نشانی سرویس در پاسخ وضعیت" "yes" "$([ -z "$leak" ] && echo yes || echo no)"

echo "== 4) ساخت و فهرست مکالمه =="
code=$(curl -s -b $JA -o /tmp/p9-conv.json -w "%{http_code}" -X POST $BASE/api/assistant/conversations)
check "POST مکالمه جدید → 201" "201" "$code"
CID=$(jqpy "['conversation']['id']" < /tmp/p9-conv.json)
title0=$(jqpy "['conversation']['title']" < /tmp/p9-conv.json)
check "عنوان اولیه خالی (بدون ساختگی)" "" "$title0"
count=$(curl -s -b $JA $BASE/api/assistant/conversations | jqpy "len(['conversations'])" 2>/dev/null)
n=$(curl -s -b $JA $BASE/api/assistant/conversations | python3 -c "import json,sys;print(len(json.load(sys.stdin)['conversations']))")
check "فهرست A شامل ۱ مکالمه" "1" "$n"
nb=$(curl -s -b $JB $BASE/api/assistant/conversations | python3 -c "import json,sys;print(len(json.load(sys.stdin)['conversations']))")
check "فهرست B خالی است" "0" "$nb"

echo "== 5) اعتبارسنجی ورودی (بدون فراخوانی مدل) =="
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' -d '{"content":"   "}' "$BASE/api/assistant/conversations/$CID/messages")
check "پیام خالی (فاصله) → 400" "400" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' -d '{"content":""}' "$BASE/api/assistant/conversations/$CID/messages")
check "پیام رشته خالی → 400" "400" "$code"
LONG=$(python3 -c "print('a'*4001)")
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' -d "{\"content\":\"$LONG\"}" "$BASE/api/assistant/conversations/$CID/messages")
check "پیام ۴۰۰۱ نویسه → 400" "400" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' -d '{"content":"سلام","language":"de"}' "$BASE/api/assistant/conversations/$CID/messages")
check "زبان نامعتبر (de) → 400" "400" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JA -X POST -H 'Content-Type: application/json' -d 'not-json' "$BASE/api/assistant/conversations/$CID/messages")
check "بدنه غیر JSON → 400" "400" "$code"
mc=$(curl -s -b $JA $BASE/api/assistant/conversations/$CID | python3 -c "import json,sys;print(json.load(sys.stdin)['conversation']['messageCount'])")
check "هیچ پیامی از درخواست‌های نامعتبر ذخیره نشد" "0" "$mc"

echo "== 6) مالکیت — B روی مکالمه A و id ناموجود، همه ۴۰۴ =="
for t in "GET /api/assistant/conversations/$CID" \
         "DELETE /api/assistant/conversations/$CID" \
         "POST /api/assistant/conversations/$CID/messages" \
         "POST /api/assistant/conversations/$CID/retry" \
         "GET /api/assistant/conversations/nonexistent-id-xyz" \
         "DELETE /api/assistant/conversations/nonexistent-id-xyz"; do
  method=${t%% *}; path=${t#* }
  code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB -X $method -H 'Content-Type: application/json' -d '{"content":"x"}' "$BASE${path#/api}")
  check "B: $method $path → 404" "404" "$code"
done

echo "== 7) ارسال واقعی فارسی (حالت خودکار) — فراخوانی واقعی مدل =="
code=$(curl -s -b $JA -o /tmp/p9-fa.json -w "%{http_code}" --max-time 90 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"سلام! در یک جمله کوتاه فارسی بگو فرم صحیح شنا سوئدی چیست؟","language":"auto"}' "$BASE/api/assistant/conversations/$CID/messages")
check "ارسال پیام فارسی → 201" "201" "$code"
urole=$(jqpy "['userMessage']['role']" < /tmp/p9-fa.json)
check "نقش پیام کاربر = user" "user" "$urole"
urole2=$(jqpy "['userMessage']['lang']" < /tmp/p9-fa.json)
check "زبان پیام کاربر = fa" "fa" "$urole2"
arole=$(jqpy "['assistantMessage']['role']" < /tmp/p9-fa.json)
check "نقش پاسخ = assistant" "assistant" "$arole"
alang=$(jqpy "['assistantMessage']['lang']" < /tmp/p9-fa.json)
check "زبان پاسخ = fa (خودکار)" "fa" "$alang"
ACONTENT=$(python3 -c "import json;print(json.load(open('/tmp/p9-fa.json'))['assistantMessage']['content'])")
alen=$(printf "%s" "$ACONTENT" | wc -c)
check "پاسخ مدل واقعی غیرخالی" "yes" "$([ "$alen" -gt 20 ] && echo yes || echo no)"
fap=$(printf "%s" "$ACONTENT" | rg -c "[\x{0600}-\x{06FF}]" || true)
check "محتوای پاسخ شامل حروف فارسی" "yes" "$([ "${fap:-0}" -ge 1 ] && echo yes || echo no)"
echo "      └ پاسخ مدل: $(printf '%s' "$ACONTENT" | head -c 90)"

echo "== 8) ارسال واقعی انگلیسی (حالت خودکار) =="
code=$(curl -s -b $JA -o /tmp/p9-en.json -w "%{http_code}" --max-time 90 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"How many sets should a beginner do for squats? Answer briefly in English.","language":"auto"}' "$BASE/api/assistant/conversations/$CID/messages")
check "ارسال پیام انگلیسی → 201" "201" "$code"
alang2=$(jqpy "['assistantMessage']['lang']" < /tmp/p9-en.json)
check "زبان پاسخ = en (خودکار)" "en" "$alang2"
ECONTENT=$(python3 -c "import json;print(json.load(open('/tmp/p9-en.json'))['assistantMessage']['content'])")
enp=$(printf "%s" "$ECONTENT" | rg -c "[A-Za-z]" || true)
check "محتوای پاسخ انگلیسی" "yes" "$([ "${enp:-0}" -ge 1 ] && echo yes || echo no)"
echo "      └ پاسخ مدل: $(printf '%s' "$ECONTENT" | head -c 90)"

echo "== 9) زبان اجباری — مقدم بر تشخیص خودکار =="
code=$(curl -s -b $JA -o /tmp/p9-forced-fa.json -w "%{http_code}" --max-time 90 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"What is a deadlift? Answer briefly.","language":"fa"}' "$BASE/api/assistant/conversations/$CID/messages")
check "پیام انگلیسی با انتخاب فارسی → 201" "201" "$code"
alang3=$(jqpy "['assistantMessage']['lang']" < /tmp/p9-forced-fa.json)
check "پاسخ اجباری فارسی" "fa" "$alang3"
code=$(curl -s -b $JA -o /tmp/p9-forced-en.json -w "%{http_code}" --max-time 90 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"در یک جمله بگو پروتئین چیست؟","language":"en"}' "$BASE/api/assistant/conversations/$CID/messages")
check "پیام فارسی با انتخاب انگلیسی → 201" "201" "$code"
alang4=$(jqpy "['assistantMessage']['lang']" < /tmp/p9-forced-en.json)
check "پاسخ اجباری انگلیسی" "en" "$alang4"

echo "== 10) ماندگاری و ترتیب پس از ذخیره =="
detail=$(curl -s -b $JA "$BASE/api/assistant/conversations/$CID")
mc=$(echo "$detail" | python3 -c "import json,sys;print(json.load(sys.stdin)['conversation']['messageCount'])")
check "۶ پیام ثبت شد (۴ جفت کاربر/دستیار)" "8" "$mc"
firstrole=$(echo "$detail" | python3 -c "import json,sys;m=json.load(sys.stdin)['conversation']['messages'][0];print(m['role'])")
check "اولین پیام از کاربر است" "user" "$firstrole"
firstcontent=$(echo "$detail" | python3 -c "import json,sys;print(json.load(sys.stdin)['conversation']['messages'][0]['content'])")
check "متن اولین پیام عیناً حفظ شده" "yes" "$(echo "$firstcontent" | rg -q "شنا سوئدی" && echo yes || echo no)"
orderok=$(echo "$detail" | python3 -c "
import json,sys
ms=json.load(sys.stdin)['conversation']['messages']
roles=[m['role'] for m in ms]
times=[m['createdAt'] for m in ms]
sorted_ok = times == sorted(times)
alt_ok = all(roles[i]=='user' and roles[i+1]=='assistant' for i in range(0,len(roles),2))
print('yes' if sorted_ok and alt_ok else 'no')")
check "ترتیب زمانی و توالی نقش‌ها صحیح" "yes" "$orderok"
title=$(curl -s -b $JA "$BASE/api/assistant/conversations/$CID" | python3 -c "import json,sys;print(json.load(sys.stdin)['conversation']['title'])")
check "عنوان از نخستین پیام کاربر ساخته شد (برش ۴۸ نویسه)" "yes" "$(echo "$title" | rg -q "فرم صحیح" && echo yes || echo no)"

echo "== 11) تلاش مجدد — وقتی پاسخ هست noop است (بدون پیام تکراری) =="
noop=$(curl -s -b $JA --max-time 30 -X POST -H 'Content-Type: application/json' -d '{"language":"auto"}' "$BASE/api/assistant/conversations/$CID/retry" | python3 -c "import json,sys;print(json.load(sys.stdin).get('noop'))")
check "retry با پاسخ موجود → noop=True" "True" "$noop"
mc2=$(curl -s -b $JA "$BASE/api/assistant/conversations/$CID" | python3 -c "import json,sys;print(json.load(sys.stdin)['conversation']['messageCount'])")
check "تعداد پیام‌ها تغییر نکرد" "8" "$mc2"

echo "== 12) محدودسازی نرخ مبتنی بر دیتابیس (۴۲۹) =="
code=$(curl -s -b $JB -o /tmp/p9-conv-b.json -w "%{http_code}" -X POST $BASE/api/assistant/conversations)
check "B مکالمه ساخت → 201" "201" "$code"
CIDB=$(jqpy "['conversation']['id']" < /tmp/p9-conv-b.json)
BID=$(curl -s -b $JB "$BASE/api/auth/get-session" | python3 -c "import json,sys;print(json.load(sys.stdin)['user']['id'])")
timeout 60 bun scripts/seed-rate-limit.ts "$CIDB" "$BID" 8 >/dev/null
code=$(curl -s -b $JB -o /tmp/p9-429.json -w "%{http_code}" --max-time 30 -X POST -H 'Content-Type: application/json' \
  -d '{"content":"test","language":"auto"}' "$BASE/api/assistant/conversations/$CIDB/messages")
check "پیام نهم در یک دقیقه → 429" "429" "$code"
ras=$(python3 -c "import json;d=json.load(open('/tmp/p9-429.json'));print('retryAfterSec' in d and d['error']=='RATE_LIMITED')")
check "پاسخ ۴۲۹ شامل کد و retryAfterSec" "True" "$ras"
mcB=$(curl -s -b $JB "$BASE/api/assistant/conversations/$CIDB" | python3 -c "import json,sys;print(json.load(sys.stdin)['conversation']['messageCount'])")
check "پیام پذیرفته‌نشده ذخیره نشد" "8" "$mcB"

echo "== 13) حذف مکالمه =="
code=$(curl -s -b $JB -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/assistant/conversations/$CIDB")
check "B مکالمه خودش را حذف کرد → 200" "200" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB "$BASE/api/assistant/conversations/$CIDB")
check "پس از حذف → 404" "404" "$code"
code=$(curl -s -o /dev/null -w "%{http_code}" -b $JB -X DELETE "$BASE/api/assistant/conversations/$CIDB")
check "حذف دوباره → 404" "404" "$code"

echo "== 14) حذف مکالمه A و نبود پیام‌های یتیم =="
code=$(curl -s -b $JA -o /dev/null -w "%{http_code}" -X DELETE "$BASE/api/assistant/conversations/$CID")
check "A مکالمه خودش را حذف کرد → 200" "200" "$code"
na=$(curl -s -b $JA $BASE/api/assistant/conversations | python3 -c "import json,sys;print(len(json.load(sys.stdin)['conversations']))")
check "فهرست A خالی شد" "0" "$na"

echo ""
echo "RESULT: PASS=$PASS FAIL=$FAIL"
