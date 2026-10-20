#!/bin/bash
# p18-browser-flow.sh — آزمون مرورگری مرحله ۱۸ در یک فراخوانی پیوسته
# (سرور بین فراخوانی‌ها ناپایدار است؛ همه مراحل در یک جلسه اجرا می‌شوند)
set -u
cd /home/z/my-project
AB="agent-browser"
S="p18f"
SC="p18fc"

log() { echo "[$(date +%H:%M:%S)] $*"; }
wait_ready() {
  for i in $(seq 1 12); do
    code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 5)
    [ "$code" = "200" ] && { log "server ready"; return 0; }
    sleep 4
  done
  log "FATAL: server not ready"; return 1
}
ensure_server() {
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ --max-time 4)
  if [ "$code" != "200" ]; then
    log "restarting server..."
    python3 scripts/daemon-start.py 2>&1 | tail -1
    wait_ready || return 1
  fi
}

# snapshot helpers
snap() { $AB --session "$1" snapshot -i 2>/dev/null; }
refsnap() { $AB --session "$1" snapshot 2>/dev/null; }
getref() { grep -oE "$1 \[ref=e[0-9]+\]" | head -"${2:-1}" | grep -oE 'e[0-9]+' | tail -1; }
click_first_btn() { # $1=session $2=button label regex
  ref=$(snap "$1" | grep -oE "button \"$2\" \[ref=e[0-9]+\]" | head -1 | grep -oE 'e[0-9]+')
  [ -n "$ref" ] && $AB --session "$1" click @"$ref" >/dev/null 2>&1
}

ensure_server || exit 1

# --------------------------- 教练流程 ---------------------------
log "coach: reload"
$AB --session $SC reload >/dev/null 2>&1; sleep 4
click_first_btn $SC 'پنل مربی[^"]*'; sleep 2
click_first_btn $SC 'برنامههای تمرینی من'; sleep 1.5
click_first_btn $SC 'برنامه تمرینی جدید'; sleep 2

# fill title/day
tref=$(snap $SC | grep -oE 'textbox "عنوان برنامه" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
dref=$(snap $SC | grep -oE 'textbox "عنوان روز" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
$AB --session $SC fill @$tref "برنامه UI18 — بانک کامل" >/dev/null 2>&1
$AB --session $SC fill @$dref "پوش روز اول" >/dev/null 2>&1
log "coach: open picker"
click_first_btn $SC 'افزودن حرکت'; sleep 2.5

# retry load if error panel
if refsnap $SC | grep -q "تلاش مجدد"; then
  log "picker: retrying index load"
  click_first_btn $SC 'تلاش مجدد'; sleep 4
fi

# search imported exercise and pick it
qref=$(snap $SC | grep -oE 'textbox "جستوجوی حرکت" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+')
$AB --session $SC fill @$qref "kettlebell swing" >/dev/null 2>&1; sleep 1.8
addref=$(refsnap $SC | grep -oE 'button "افزودن" \[ref=e[0-9]+\]' | head -1 | grep -oE 'e[0-9]+')
log "add ref: $addref"
$AB --session $SC click @$addref >/dev/null 2>&1; sleep 2

# close picker if still open
click_first_btn $SC 'Close'; sleep 1

# fill prescription fields (ست/تکرار/استراحت/یادداشت) — first exercise row inputs
refsnap $SC > /tmp/f-row.txt
log "--- builder rows ---"
grep -oE 'textbox "[^"]+" \[ref=e[0-9]+\]' /tmp/f-row.txt | head -12
log "coach flow done (builder state saved to /tmp/f-row.txt)"
$AB --session $SC screenshot download/p18-ui-fa-coach-builder.png >/dev/null 2>&1
