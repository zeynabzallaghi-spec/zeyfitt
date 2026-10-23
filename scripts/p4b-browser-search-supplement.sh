#!/usr/bin/env bash
# p4b-browser-search-supplement.sh — P4 targeted supplement to p4-browser-pass.sh
# Covers the gaps caused by p4-browser-pass.sh script issues (NOT app bugs):
#   1. Client-side search must type into the SEARCH box (fill via snapshot -i ref,
#      the technique proven in P3) — p4 typed into the folder-name input instead.
#   2. Honest empty state on no-match.
#   3. Coach EN badges snapshot from the ACTUAL bank tab (p4 snapshotted the dashboard).
#   4. Horizontal-overflow + leak re-checks at every point.
# Fixture: p3-seed-browser-fixture.ts (A=pending w/ media, B=published) — cleaned up at end.
# ONE invocation (sandbox reaps background processes — established lesson).
set -u
cd /home/z/my-project
STAMP="p4b$(date +%s)"

echo "════ [-1] fresh server ════"
pkill -f "next" 2>/dev/null; sleep 2
setsid nohup bun run dev > /dev/null 2>&1 &
for i in $(seq 1 60); do c=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/); [ "$c" = "200" ] && { echo "SERVER READY (${i})"; break; }; sleep 1; done

echo "════ [0] seed fixtures (stamp=$STAMP) ════"
P3_SEED_STAMP="$STAMP" timeout 120 bun scripts/p3-seed-browser-fixture.ts 2>&1 | tail -2
[ -f scratch/p3-browser-fixture.json ] || { echo "SEED FAILED"; exit 1; }

CC=$(bun -e 'const f=require("/home/z/my-project/scratch/p3-browser-fixture.json"); process.stdout.write(f.coach.cookie.split("=")[1])')

click_text() {
  local txt="$1"
  agent-browser eval "(function(){var t=\"$txt\";var el=[...document.querySelectorAll('button,a')].find(function(e){return (e.textContent||'').indexOf(t)>=0 && e.offsetParent!==null;});if(el){el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));el.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));el.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));el.click();return 'CLICKED:'+t;}return 'NOTFOUND:'+t;})()" 2>&1 | tail -1
}
hscroll() {
  agent-browser eval "document.documentElement.scrollWidth + 'x' + document.documentElement.clientWidth" 2>/dev/null | tail -1
}
# fill the Nth visible textbox ref from interactive snapshot (P3 technique)
fill_search() {
  local val="$1"
  agent-browser snapshot -i -c > scratch/p4b-snap-i.txt 2>&1
  local SREF
  SREF=$(grep -m1 "textbox" scratch/p4b-snap-i.txt | grep -oE 'ref=e[0-9]+' | head -1 | sed 's/ref=/@/')
  if [ -n "$SREF" ]; then agent-browser fill "$SREF" "$val" > /dev/null 2>&1 && echo "FILLED($SREF)=$val"; else echo "NO_TEXTBOX"; fi
}

echo "════ [1] Coach FA 390px — bank tab, badges via interactive snapshot ════"
agent-browser set viewport 390 844 > /dev/null 2>&1
agent-browser cookies clear > /dev/null 2>&1
agent-browser open http://localhost:3000/ > /dev/null 2>&1; sleep 3
agent-browser cookies set fitcoach.session_token "$CC" > /dev/null 2>&1
agent-browser reload > /dev/null 2>&1; sleep 5
agent-browser eval "(function(){var b=document.querySelector('[aria-label=\"باز کردن منوی ناوبری\"]');if(b){b.click();return 'menu-open';}return 'menu-btn-not-found';})()" 2>&1 | tail -1
sleep 1
click_text "پنل مربی"; sleep 2
click_text "بانک حرکات شخصی"; sleep 3
agent-browser snapshot -c > scratch/p4b-coach-fa.txt 2>&1
echo "fa_badges: pendingA=$(grep -c 'در انتظار بررسی' scratch/p4b-coach-fa.txt) publishedB=$(grep -c 'منتشر شده' scratch/p4b-coach-fa.txt) exA=$(grep -c 'مرورگر A' scratch/p4b-coach-fa.txt) exB=$(grep -c 'مرورگر B' scratch/p4b-coach-fa.txt)"
echo "hscroll_bank_fa=$(hscroll)"

echo "── [2] client search 'مرورگر A' (fill via textbox ref) ──"
fill_search "مرورگر A"; sleep 3
agent-browser snapshot -c > scratch/p4b-search-a.txt 2>&1
echo "searchA_hits: A=$(grep -c 'مرورگر A' scratch/p4b-search-a.txt) B=$(grep -c 'مرورگر B' scratch/p4b-search-a.txt)"
echo "hscroll_searchA=$(hscroll)"
agent-browser screenshot download/p4b-fa-coach-search-a-390.png > /dev/null 2>&1 && echo "shotA OK"

echo "── [3] honest empty state ──"
fill_search "zzz-p4b-no-match"; sleep 3
agent-browser snapshot -c > scratch/p4b-search-none.txt 2>&1
echo "empty_state: none_hits=$(grep -c 'مرورگر' scratch/p4b-search-none.txt) empty_words=$(grep -cE 'یافت نشد|نتیجه‌ای|نتیجه ای|پیدا نشد|موردی' scratch/p4b-search-none.txt)"
echo "hscroll_empty=$(hscroll)"
agent-browser screenshot download/p4b-fa-coach-search-empty-390.png > /dev/null 2>&1 && echo "shotEmpty OK"

echo "── [4] clear search, switch EN, verify bilingual badges on bank tab ──"
fill_search " "; sleep 2
click_text "EN" >/dev/null 2>&1 || true
agent-browser eval "(function(){var el=[...document.querySelectorAll('button,[role=\\\"option\\\"],li')].find(function(e){return (e.textContent||'').trim()==='EN';});if(el){el.click();return 'LANG_EN';}return 'NO_EN_BTN';})()" 2>&1 | tail -1
sleep 3
agent-browser snapshot -c > scratch/p4b-coach-en.txt 2>&1
echo "en_badges: pendingA=$(grep -ci 'pending review' scratch/p4b-coach-en.txt) publishedB=$(grep -ci 'published' scratch/p4b-coach-en.txt) exA=$(grep -c 'Browser Press A' scratch/p4b-coach-en.txt)"
echo "hscroll_bank_en=$(hscroll)"
agent-browser screenshot download/p4b-en-coach-bank-390.png > /dev/null 2>&1 && echo "shotEN OK"

echo "════ [5] cleanup fixtures ════"
timeout 120 bun scripts/p3-seed-browser-fixture.ts --cleanup 2>&1 | tail -2
echo "SUPPLEMENT_DONE"
