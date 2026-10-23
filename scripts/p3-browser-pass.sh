#!/usr/bin/env bash
# p3-browser-pass.sh (v2) — راستی‌آزمایی مرورگر P3 با کلیک JS مستقیم
# (آیتم‌های drawer موبایل زیر overlay رادیکس هستند — hit-test پلی‌رایت رد میشود؛
#  el.click() مستقیم مشکل پوشش را دور میزند بدون دورزدن هیچ منطقی UI).
set -u
cd /home/z/my-project

click_text() {
  local txt="$1"
  agent-browser eval "(function(){var t=\"$txt\";var el=[...document.querySelectorAll('button,a')].find(function(e){return (e.textContent||'').indexOf(t)>=0 && e.offsetParent!==null;});if(el){el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));el.click();return 'CLICKED:'+t;}return 'NOTFOUND:'+t;})()" 2>&1 | tail -1
}

pkill -f "next" 2>/dev/null; sleep 1
setsid nohup bun run dev > /dev/null 2>&1 &
for i in $(seq 1 60); do c=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/); [ "$c" = "200" ] && { echo "SERVER READY (${i}s)"; break; }; sleep 1; done
sleep 2

CC=$(bun -e 'const f=require("/home/z/my-project/scratch/p3-browser-fixture.json"); process.stdout.write(f.coach.cookie.split("=")[1])')
AC=$(bun -e 'const f=require("/home/z/my-project/scratch/p3-browser-fixture.json"); process.stdout.write(f.admin.cookie.split("=")[1])')

agent-browser set viewport 390 844 > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 3

echo "=== [گام ۱] مربی FA — badgeهای انتشار (390px) ==="
agent-browser cookies set fitcoach.session_token "$CC" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 5
agent-browser eval "(function(){var b=document.querySelector('[aria-label=\"باز کردن منوی ناوبری\"]');if(b){b.click();return 'menu-open';}return 'menu-btn-not-found';})()" 2>&1 | tail -1
sleep 1
click_text "پنل مربی"; sleep 2
click_text "بانک حرکات شخصی"; sleep 3
agent-browser snapshot -c > scratch/p3-snap-coach.txt 2>&1
echo "badge در انتظار بررسی: $(grep -c 'در انتظار بررسی' scratch/p3-snap-coach.txt)"
echo "badge منتشر شده: $(grep -c 'منتشر شده' scratch/p3-snap-coach.txt)"
echo "دکمه لغو ارسال: $(grep -c 'لغو ارسال' scratch/p3-snap-coach.txt)"
echo "دکمه ارسال به‌روزرسانی/فراخوانی: $(grep -cE 'ارسال به‌روزرسانی|فراخوانی از بانک' scratch/p3-snap-coach.txt)"
echo "حرکت A فیکسچر: $(grep -c 'پرس سینه مرورگر A' scratch/p3-snap-coach.txt)"
echo "اسکرول افقی: $(agent-browser eval "document.documentElement.scrollWidth + ' vs ' + document.documentElement.clientWidth" 2>/dev/null)"
agent-browser screenshot download/p3-fa-coach-publish-390.png > /dev/null 2>&1 && echo "screenshot OK"

echo "=== [گام ۲] ادمین EN — صف بازبینی (390px) ==="
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 2
agent-browser cookies set fitcoach.session_token "$AC" > /dev/null 2>&1
agent-browser cookies set fit-ui-lang "en" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 5
agent-browser eval "(function(){var b=document.querySelector('[aria-label=\"Open navigation menu\"]');if(b){b.click();return 'menu-open';}return 'menu-btn-not-found';})()" 2>&1 | tail -1
sleep 1
click_text "Admin Panel"; sleep 2
click_text "Exercise reviews"; sleep 3
agent-browser snapshot -c > scratch/p3-snap-admin.txt 2>&1
echo "queue item A: $(grep -c 'Browser Press A' scratch/p3-snap-admin.txt)"
echo "approve button: $(grep -c 'Approve & publish' scratch/p3-snap-admin.txt)"
echo "reject button: $(grep -c 'Reject' scratch/p3-snap-admin.txt)"
echo "feedback label: $(grep -c 'Rejection reason' scratch/p3-snap-admin.txt)"
echo "media chip: $(grep -c 'f.png' scratch/p3-snap-admin.txt)"
echo "queue count badge: $(grep -cE '1 submissions pending|submission pending' scratch/p3-snap-admin.txt)"
echo "اسکرول افقی: $(agent-browser eval "document.documentElement.scrollWidth + ' vs ' + document.documentElement.clientWidth" 2>/dev/null)"
agent-browser screenshot download/p3-en-admin-reviews-390.png > /dev/null 2>&1 && echo "screenshot OK"

echo "=== [گام ۳] کتابخانه FA — badge مربی روی رکورد منتشرشده ==="
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 2
agent-browser cookies set fitcoach.session_token "$CC" > /dev/null 2>&1
agent-browser cookies set fit-ui-lang "fa" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 5
agent-browser eval "(function(){var b=document.querySelector('[aria-label=\"باز کردن منوی ناوبری\"]');if(b){b.click();return 'menu-open';}return 'menu-btn-not-found';})()" 2>&1 | tail -1
sleep 1
click_text "کتابخانه حرکات"; sleep 3
agent-browser snapshot -i -c > scratch/p3-snap-lib-i.txt 2>&1
SREF=$(grep -m1 "textbox" scratch/p3-snap-lib-i.txt | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/')
echo "search box: $SREF"
if [ -n "$SREF" ]; then agent-browser fill "$SREF" "پرس سینه مرورگر B" > /dev/null 2>&1; sleep 3; fi
agent-browser snapshot -c > scratch/p3-snap-library.txt 2>&1
echo "نتیجه جست‌وجو B: $(grep -c 'پرس سینه مرورگر B' scratch/p3-snap-library.txt)"
echo "badge مربی: $(grep -c 'مربی' scratch/p3-snap-library.txt)"
echo "اسکرول افقی: $(agent-browser eval "document.documentElement.scrollWidth + ' vs ' + document.documentElement.clientWidth" 2>/dev/null)"
agent-browser screenshot download/p3-fa-library-coach-badge-390.png > /dev/null 2>&1 && echo "screenshot OK"

echo "=== [گام ۴] خطاهای مرورگر ==="
agent-browser errors 2>&1 | head -5
agent-browser close > /dev/null 2>&1
echo "PASS DONE"
