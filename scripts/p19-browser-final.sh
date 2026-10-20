#!/bin/bash
# p19-browser-final.sh — دور دوم بازبینی بصری نمونه‌ای (الگوهای متنوع)
# هر الگو: جست‌وجو → انتخاب → پخش → اسکرین‌شات
cd /home/z/my-project
SHOT() {
  agent-browser eval "window.scrollTo(0,0)" >/dev/null 2>&1 || true
  sleep 1
  agent-browser screenshot "/home/z/my-project/download/p19-visual-$1.png" >/dev/null 2>&1
  echo "shot: $1"
}
PICK() {
  agent-browser find role searchbox fill "$1" >/dev/null 2>&1
  sleep 1
  BTN=$(agent-browser snapshot -i 2>/dev/null | grep -F "$2" | head -1 | grep -oE 'ref=e[0-9]+' | head -1)
  if [ -n "$BTN" ]; then
    agent-browser scrollintoview "$BTN" >/dev/null 2>&1 || true
    agent-browser click "$BTN" >/dev/null 2>&1
    sleep 2
    agent-browser find role button click --name "شروع حرکت" >/dev/null 2>&1 || true
    sleep 3
    SHOT "$3"
    echo "ok: $3 ($1)"
  else
    echo "MISS: $2"
  fi
}
# ورود به نمای مربی سه‌بعدی
agent-browser find role button click --name "مربی سهبعدی" >/dev/null 2>&1 || true
sleep 6
agent-browser eval "window.scrollTo(0, 520)" >/dev/null 2>&1
REF=$(agent-browser snapshot -i 2>/dev/null | grep -oE 'button "باز و بسته کردن پنل[^"]*" \[ref=e[0-9]+\]' | grep -oE 'e[0-9]+' | head -1)
if [ -n "$REF" ]; then agent-browser click "@$REF" >/dev/null 2>&1; fi
sleep 2
PICK "deadlift" "ددلیفت هالتر" "hinge-deadlift"
PICK "bench press" "پرس سینه هالتر" "press-bench"
PICK "seated cable row" "رووینگ نشسته سیم‌کش" "pull-seated-row"
PICK "lunge" "لانج وزن بدن" "single-leg-lunge"
PICK "seated hamstring" "کشش همسترینگ نشسته" "flexibility-stretch"
PICK "jumping jacks" "پروانه" "cardio-jacks"
PICK "kettlebell swing" "تاب کتل‌بل روسی" "power-swing"
echo "=== visual pass done ==="
