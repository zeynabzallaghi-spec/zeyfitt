#!/bin/bash
# p18-browser-final.sh — آزمون نهایی مرورگری مرحله ۱۸ با timeout سختگیرانه
set -u
cd /home/z/my-project
AB="agent-browser --timeout 20000"
SC="p18g"

log() { echo "[$(date +%H:%M:%S)] $*"; }
sref() { timeout 25 agent-browser --session "$1" snapshot -i 2>/dev/null; }
fref() { timeout 25 agent-browser --session "$1" snapshot 2>/dev/null; }
clickb() { # $1=session $2=pattern  → کلیک اولین دکمه مطابق
  r=$(sref "$1" | grep -oE "button \"$2\" \[ref=e[0-9]+\]" | head -1 | grep -oE 'e[0-9]+')
  if [ -n "$r" ]; then timeout 25 agent-browser --session "$1" click @"$r" >/dev/null 2>&1; echo "clicked $2 (@$r)"; else echo "MISS $2"; fi
}
filll() { # $1=session $2=aria-label $3=value
  r=$(sref "$1" | grep -oE "textbox \"$2\" \[ref=e[0-9]+\]" | head -1 | grep -oE 'e[0-9]+')
  [ -n "$r" ] && timeout 25 agent-browser --session "$1" fill @"$r" "$3" >/dev/null 2>&1 && echo "filled $2" || echo "MISS-FILL $2"
}

# --- سرور ---
code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 4)
if [ "$code" != "200" ]; then
  python3 scripts/daemon-start.py >/dev/null 2>&1
  for i in $(seq 1 14); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 5)
    [ "$code" = "200" ] && break; sleep 4
  done
fi
log "server: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 5)"

timeout 30 agent-browser --session $SC open http://localhost:3000 >/dev/null 2>&1
sleep 4
log "coach reload + panel"
timeout 30 agent-browser --session $SC reload >/dev/null 2>&1; sleep 4
clickb $SC 'پنل مربی[^\"]*'
sleep 2
clickb $SC 'برنامههای تمرینی من'
sleep 1.5
clickb $SC 'برنامه تمرینی جدید'
sleep 2

filll $SC 'عنوان برنامه' "برنامه UI18 — بانک کامل"
filll $SC 'عنوان روز' "پوش روز اول"
clickb $SC 'افزودن حرکت'
sleep 2.5

# اگر خطا بود → تلاش مجدد
if fref $SC | grep -q "تلاش مجدد"; then
  log "picker error-state → retry"
  clickb $SC 'تلاش مجدد'
  sleep 5
fi

q=$(sref $SC | grep -oE 'textbox "جستوجوی حرکت" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
if [ -n "$q" ]; then
  timeout 25 agent-browser --session $SC fill @"$q" "kettlebell swing" >/dev/null 2>&1
  sleep 2
  n=$(fref $SC | grep -c listitem)
  log "picker results: $n listitems"
  ar=$(fref $SC | grep -oE 'button "افزودن" \[ref=e[0-9]+\]' | head -1 | grep -oE 'e[0-9]+')
  if [ -n "$ar" ]; then
    timeout 25 agent-browser --session $SC click @"$ar" >/dev/null 2>&1
    sleep 2
    log "added kettlebell swing"
  fi
  # بستن انتخابگر
  cr=$(sref $SC | grep -oE 'button "Close" \[ref=e[0-9]+\]' | head -1 | grep -oE 'e[0-9]+')
  [ -n "$cr" ] && timeout 25 agent-browser --session $SC click @"$cr" >/dev/null 2>&1
  sleep 1.5
else
  log "MISS search box"
fi

# مقادیر تجویز + یادداشت مربی — فیلدهای ردیف حرکت
sref $SC > /tmp/p18-row.txt
log "--- interactive fields after add ---"
grep -oE '(textbox|spinbutton) "[^"]+" \[ref=e[0-9]+\]' /tmp/p18-row.txt | head -14

timeout 30 agent-browser --session $SC screenshot download/p18-ui-fa-coach-builder.png >/dev/null 2>&1
log "screenshot saved"
