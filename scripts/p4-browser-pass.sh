#!/usr/bin/env bash
# p4-browser-pass.sh — Stage 20 / P4 Section 3: real browser verification.
# Reuses P3 fixture infrastructure (p3-seed-browser-fixture.ts) with a fresh stamp.
# ONE invocation (sandbox reaps processes between commands — P3 lesson).
# All data on screen is isolated fixture data; screenshots contain fixtures only.
set -u
cd /home/z/my-project
STAMP="p4qa$(date +%s)"

echo "════ [-1] ensure server up (seed needs it) ════"
pkill -f "next" 2>/dev/null; sleep 2
setsid nohup bun run dev > /dev/null 2>&1 &
for i in $(seq 1 60); do c=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/); [ "$c" = "200" ] && { echo "SERVER READY (${i})"; break; }; sleep 1; done

echo "════ [0] seed fixtures (stamp=$STAMP) ════"
P3_SEED_STAMP="$STAMP" timeout 120 bun scripts/p3-seed-browser-fixture.ts 2>&1 | tail -2
[ -f scratch/p3-browser-fixture.json ] || { echo "SEED FAILED"; exit 1; }

CC=$(bun -e 'const f=require("/home/z/my-project/scratch/p3-browser-fixture.json"); process.stdout.write(f.coach.cookie.split("=")[1])')
AC=$(bun -e 'const f=require("/home/z/my-project/scratch/p3-browser-fixture.json"); process.stdout.write(f.admin.cookie.split("=")[1])')

echo "════ [0b] upload fixture MP4 to pending A (admin video preview) ════"
EXA=$(bun -e 'const f=require("/home/z/my-project/scratch/p3-browser-fixture.json"); process.stdout.write(f.exA)')
curl -s -o /tmp/p4-up.json -w "upload_mp4=%{http_code}\n" -X POST \
  -H "Cookie: fitcoach.session_token=$CC" \
  -F "file=@scratch/p4/sample.mp4;type=video/mp4" \
  "http://localhost:3000/api/coach/exercises/$EXA/media"

echo "════ [restart server cleanly] ════"
pkill -f "next" 2>/dev/null; sleep 2
setsid nohup bun run dev > /dev/null 2>&1 &
for i in $(seq 1 60); do c=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/); [ "$c" = "200" ] && { echo "SERVER READY (${i})"; break; }; sleep 1; done
sleep 2

click_text() {
  local txt="$1"
  agent-browser eval "(function(){var t=\"$txt\";var el=[...document.querySelectorAll('button,a')].find(function(e){return (e.textContent||'').indexOf(t)>=0 && e.offsetParent!==null;});if(el){el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));el.click();return 'CLICKED:'+t;}return 'NOTFOUND:'+t;})()" 2>&1 | tail -1
}
hscroll() {
  agent-browser eval "document.documentElement.scrollWidth + 'x' + document.documentElement.clientWidth" 2>/dev/null | tail -1
}

echo "════ [1] Coach FA 390px — publish badges + withdraw/resubmit + search ════"
agent-browser set viewport 390 844 > /dev/null 2>&1
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 3
agent-browser cookies set fitcoach.session_token "$CC" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 5
agent-browser eval "(function(){var b=document.querySelector('[aria-label=\"باز کردن منوی ناوبری\"]');if(b){b.click();return 'menu-open';}return 'menu-btn-not-found';})()" 2>&1 | tail -1
sleep 1
click_text "پنل مربی"; sleep 2
click_text "بانک حرکات شخصی"; sleep 3
agent-browser snapshot -c > scratch/p4-snap-coach1.txt 2>&1
echo "badge درانتظاربررسی=$(grep -c 'در انتظار بررسی' scratch/p4-snap-coach1.txt) منتشر=$(grep -c 'منتشر شده' scratch/p4-snap-coach1.txt) لغوارسال=$(grep -c 'لغو ارسال' scratch/p4-snap-coach1.txt) فراخوانی=$(grep -c 'فراخوانی از بانک' scratch/p4-snap-coach1.txt)"
echo "hscroll_coach1=$(hscroll)"
agent-browser screenshot download/p4-fa-coach-badges-390.png > /dev/null 2>&1 && echo "shot1 OK"

echo "── withdraw A ──"
click_text "لغو ارسال"; sleep 2
agent-browser snapshot -c > scratch/p4-snap-dialog.txt 2>&1
click_text "لغو"; sleep 2
agent-browser snapshot -c > scratch/p4-snap-coach2.txt 2>&1
echo "after_withdraw: pending=$(grep -c 'در انتظار بررسی' scratch/p4-snap-coach2.txt)ارسال‌برای‌بررسی=$(grep -c 'ارسال برای بررسی' scratch/p4-snap-coach2.txt)"
echo "hscroll_coach2=$(hscroll)"

echo "── resubmit A via UI ──"
click_text "ارسال برای بررسی"; sleep 2
click_text "ارسال"; sleep 3
agent-browser snapshot -c > scratch/p4-snap-coach3.txt 2>&1
echo "after_resubmit: pending=$(grep -c 'در انتظار بررسی' scratch/p4-snap-coach3.txt)"

echo "── search FA/EN + honest empty ──"
agent-browser eval "(function(){var el=document.querySelector('input[type=\"search\"],input[placeholder]');if(!el)return 'NO_INPUT';var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,'مرورگر A');el.dispatchEvent(new Event('input',{bubbles:true}));return 'TYPED';})()" 2>&1 | tail -1
sleep 2
agent-browser snapshot -c > scratch/p4-snap-searchfa.txt 2>&1
echo "fa_search_hits: A=$(grep -c 'مرورگر A' scratch/p4-snap-searchfa.txt) B=$(grep -c 'مرورگر B' scratch/p4-snap-searchfa.txt)"
agent-browser eval "(function(){var el=document.querySelector('input[type=\"search\"],input[placeholder]');var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,'Browser Press');el.dispatchEvent(new Event('input',{bubbles:true}));return 'TYPED';})()" 2>&1 | tail -1
sleep 2
agent-browser snapshot -c > scratch/p4-snap-searchen.txt 2>&1
echo "en_search_hits: A=$(grep -c 'Browser Press A' scratch/p4-snap-searchen.txt) B=$(grep -c 'Browser Press B' scratch/p4-snap-searchen.txt)"
agent-browser eval "(function(){var el=document.querySelector('input[type=\"search\"],input[placeholder]');var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,'zzz-no-match-p4qa');el.dispatchEvent(new Event('input',{bubbles:true}));return 'TYPED';})()" 2>&1 | tail -1
sleep 2
agent-browser snapshot -c > scratch/p4-snap-searchnone.txt 2>&1
echo "empty_state_words: $(grep -cE 'یافت نشد|نتیجه‌ای|نتیجه ای|پیدا نشد' scratch/p4-snap-searchnone.txt)"
echo "hscroll_search=$(hscroll)"

echo "════ [2] Coach EN — bilingual badges ════"
agent-browser cookies set fit-ui-lang "en" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 5
agent-browser snapshot -c > scratch/p4-snap-coachen.txt 2>&1
echo "en_badges: pending=$(grep -ci 'pending review' scratch/p4-snap-coachen.txt) published=$(grep -ci 'published' scratch/p4-snap-coachen.txt) recall=$(grep -ci 'recall' scratch/p4-snap-coachen.txt)"
echo "hscroll_coachen=$(hscroll)"
agent-browser screenshot download/p4-en-coach-badges-390.png > /dev/null 2>&1 && echo "shot2 OK"
agent-browser cookies set fit-ui-lang "fa" > /dev/null 2>&1

echo "════ [3] Admin EN 390px — queue + video preview ════"
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 2
agent-browser cookies set fitcoach.session_token "$AC" > /dev/null 2>&1
agent-browser cookies set fit-ui-lang "en" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 5
agent-browser eval "(function(){var b=document.querySelector('[aria-label=\"Open navigation menu\"]');if(b){b.click();return 'menu-open';}return 'menu-btn-not-found';})()" 2>&1 | tail -1
sleep 1
click_text "Admin Panel"; sleep 2
click_text "Exercise reviews"; sleep 3
agent-browser snapshot -c > scratch/p4-snap-admin.txt 2>&1
echo "queue: counter_pending=$(grep -ciE 'pending' scratch/p4-snap-admin.txt | head -1) coach_name=$(grep -c 'P3 Browser Coach' scratch/p4-snap-admin.txt) exA=$(grep -c 'Browser Press A' scratch/p4-snap-admin.txt) approve_btn=$(grep -c 'Approve' scratch/p4-snap-admin.txt) reject_btn=$(grep -c 'Reject' scratch/p4-snap-admin.txt)"
echo "video_elements=$(agent-browser eval "document.querySelectorAll('video').length" 2>/dev/null | tail -1)"
echo "hscroll_admin=$(hscroll)"
agent-browser screenshot download/p4-en-admin-queue-390.png > /dev/null 2>&1 && echo "shot3 OK"

echo "════ [4] Admin EN — reject A: empty blocked, then with reason ════"
click_text "Reject"; sleep 2
agent-browser snapshot -c > scratch/p4-snap-rejectdlg.txt 2>&1
echo "dialog_open=$(grep -ciE 'reason|دلیل' scratch/p4-snap-rejectdlg.txt)"
click_text "Confirm reject"; sleep 1
agent-browser snapshot -c > scratch/p4-snap-rejectempty.txt 2>&1
echo "empty_reject_still_open=$(grep -ciE 'reason' scratch/p4-snap-rejectempty.txt)"
agent-browser eval "(function(){var ta=document.querySelector('[role=\"alertdialog\"] textarea, [role=\"dialog\"] textarea, textarea');if(!ta)return 'NO_TA';var s=Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype,'value').set;s.call(ta,'P4 QA rejection reason — رد با دلیل آزمایشی');ta.dispatchEvent(new Event('input',{bubbles:true}));return 'FILLED';})()" 2>&1 | tail -1
sleep 1
click_text "Confirm reject"; sleep 3
agent-browser snapshot -c > scratch/p4-snap-admin2.txt 2>&1
echo "after_reject: exA_in_queue=$(grep -c 'Browser Press A' scratch/p4-snap-admin2.txt) queue_empty_words=$(grep -ciE 'no exercises|empty|is empty' scratch/p4-snap-admin2.txt)"

echo "════ [5] Coach FA — rejection reason banner + resubmit ════"
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 2
agent-browser cookies set fitcoach.session_token "$CC" > /dev/null 2>&1
agent-browser cookies set fit-ui-lang "fa" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 4
agent-browser eval "(function(){var b=document.querySelector('[aria-label=\"باز کردن منوی ناوبری\"]');if(b){b.click();return 'menu-open';}return 'x';})()" > /dev/null 2>&1
sleep 1
click_text "پنل مربی" > /dev/null 2>&1; sleep 2
click_text "بانک حرکات شخصی" > /dev/null 2>&1; sleep 3
agent-browser snapshot -c > scratch/p4-snap-coach4.txt 2>&1
echo "reject_banner: reason_text=$(grep -c 'P4 QA rejection reason' scratch/p4-snap-coach4.txt) resubmit_btn=$(grep -c 'ارسال برای بررسی' scratch/p4-snap-coach4.txt)"
agent-browser screenshot download/p4-fa-coach-rejected-390.png > /dev/null 2>&1 && echo "shot4 OK"
click_text "ارسال برای بررسی" > /dev/null 2>&1; sleep 2
click_text "ارسال" > /dev/null 2>&1; sleep 3

echo "════ [6] Public bank FA (logged out) — B visible, pending A hidden ════"
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 3
agent-browser eval "(function(){var els=[...document.querySelectorAll('button,a,div[role=\"button\"]')];var el=els.find(function(e){return (e.textContent||'').indexOf('کتابخانه تمرین')>=0|| (e.textContent||'').indexOf('بانک حرکات')>=0;});if(el){el.click();return 'NAV:'+el.textContent.slice(0,20);}return 'NOTFOUND';})()" 2>&1 | tail -1
sleep 3
agent-browser eval "(function(){var el=document.querySelector('input[type=\"search\"],input[placeholder]');if(!el)return 'NO_INPUT';var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,'مرورگر');el.dispatchEvent(new Event('input',{bubbles:true}));return 'TYPED';})()" 2>&1 | tail -1
sleep 2
agent-browser snapshot -c > scratch/p4-snap-public1.txt 2>&1
echo "public_pending_phase: B=$(grep -c 'مرورگر B' scratch/p4-snap-public1.txt) A_hidden=$(grep -c 'مرورگر A' scratch/p4-snap-public1.txt) coach_badge=$(grep -c 'مربی' scratch/p4-snap-public1.txt)"
echo "leak_check: owner_email=$(grep -cE 'p3-browser-coach|test\.invalid' scratch/p4-snap-public1.txt) storage_path=$(grep -cE 'storagePath|data/uploads|coach-exercises/' scratch/p4-snap-public1.txt)"
echo "hscroll_public=$(hscroll)"
agent-browser screenshot download/p4-fa-public-bank-390.png > /dev/null 2>&1 && echo "shot5 OK"

echo "════ [7] Admin EN — approve A ════"
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 2
agent-browser cookies set fitcoach.session_token "$AC" > /dev/null 2>&1
agent-browser cookies set fit-ui-lang "en" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 4
agent-browser eval "(function(){var b=document.querySelector('[aria-label=\"Open navigation menu\"]');if(b){b.click();return 'menu-open';}return 'x';})()" > /dev/null 2>&1
sleep 1
click_text "Admin Panel" > /dev/null 2>&1; sleep 2
click_text "Exercise reviews" > /dev/null 2>&1; sleep 3
click_text "Approve"; sleep 2
click_text "Confirm"; sleep 4
agent-browser snapshot -c > scratch/p4-snap-admin3.txt 2>&1
echo "after_approve: exA_in_queue=$(grep -c 'Browser Press A' scratch/p4-snap-admin3.txt)"

echo "════ [8] Public bank FA — A now visible ════"
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 3
agent-browser eval "(function(){var els=[...document.querySelectorAll('button,a,div[role=\"button\"]')];var el=els.find(function(e){return (e.textContent||'').indexOf('کتابخانه تمرین')>=0||(e.textContent||'').indexOf('بانک حرکات')>=0;});if(el){el.click();return 'NAV';}return 'NOTFOUND';})()" > /dev/null 2>&1
sleep 3
agent-browser eval "(function(){var el=document.querySelector('input[type=\"search\"],input[placeholder]');if(!el)return 'NO_INPUT';var s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;s.call(el,'مرورگر A');el.dispatchEvent(new Event('input',{bubbles:true}));return 'TYPED';})()" 2>&1 | tail -1
sleep 2
agent-browser snapshot -c > scratch/p4-snap-public2.txt 2>&1
echo "public_after_approve: A=$(grep -c 'مرورگر A' scratch/p4-snap-public2.txt) coach_badge=$(grep -c 'مربی' scratch/p4-snap-public2.txt) leak=$(grep -cE 'p3-browser-coach|test\.invalid|storagePath|data/uploads' scratch/p4-snap-public2.txt)"
echo "hscroll_public2=$(hscroll)"
agent-browser screenshot download/p4-fa-public-published-390.png > /dev/null 2>&1 && echo "shot6 OK"

echo "════ [9] cleanup fixtures ════"
timeout 120 bun scripts/p3-seed-browser-fixture.ts --cleanup 2>&1 | tail -2
echo "PASS_DONE"
