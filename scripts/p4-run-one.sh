#!/bin/bash
# p4-run-one.sh <suite-name> <timeout-sec> <command...>
# Launches command detached, then POLLS TO COMPLETION WITHIN THIS COMMAND
# (sandbox kills background processes when the launching command exits —
# established lesson from P3: whole pass must live in one invocation).
set -u
cd /home/z/my-project
NAME="$1"; shift
TMO="$1"; shift
LOG="/tmp/p4-suite-${NAME}.log"
MARK="/tmp/p4-suite-${NAME}.exit"

bash scripts/p4-run-with-server.sh setsid nohup timeout "$TMO" "$@" > "$LOG" 2>&1 < /dev/null &
LAUNCHER=$!

# poll until exit marker written or launcher gone
for i in $(seq 1 580); do
  if ! kill -0 "$LAUNCHER" 2>/dev/null; then break; fi
  sleep 1
done
wait "$LAUNCHER" 2>/dev/null
RC=$?
echo "=== SUITE $NAME launcher_exit=$RC ==="
tail -20 "$LOG"
exit 0
