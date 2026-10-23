#!/bin/bash
# p4-run-with-server.sh — ensure dev server is up, then run one command.
# Server gets reaped between sandbox commands; this wrapper makes each
# regression invocation self-contained. Does NOT touch data; just starts
# `bun run dev` (same as established setsid pattern) when not reachable.
set -u
cd /home/z/my-project

probe() {
  curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 --max-time 3 2>/dev/null
}

if [ "$(probe)" = "000" ]; then
  setsid bash -c 'bun run dev >> /tmp/dev-server.log 2>&1' < /dev/null &
  for i in $(seq 1 90); do
    [ "$(probe)" != "000" ] && break
    sleep 2
  done
fi

code="$(probe)"
if [ "$code" = "000" ]; then
  echo "SERVER_FAILED_TO_START"
  exit 97
fi
echo "[server ready: $code] $*"
"$@"
