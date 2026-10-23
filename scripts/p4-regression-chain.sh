#!/bin/bash
# p4-regression-chain.sh — run all P0–P3 regression suites sequentially.
# Each invocation re-ensures the server (sandbox reaps processes between
# commands). Logs per-suite result lines to /tmp/p4-regressions.log
cd /home/z/my-project
LOG=/tmp/p4-regressions.log
: > "$LOG"

run_suite() {
  local name="$1"; shift
  local tmo="$1"; shift
  echo "════ SUITE $name START $(date -u +%H:%M:%S) ════" >> "$LOG"
  bash scripts/p4-run-with-server.sh timeout "$tmo" "$@" >> "$LOG" 2>&1
  local rc=$?
  echo "════ SUITE $name END exit=$rc $(date -u +%H:%M:%S) ════" >> "$LOG"
}

run_suite p196        300 bun scripts/p196-test.ts
run_suite p196-media  240 bun scripts/p196-media-test.ts
run_suite p196-admin  240 bun scripts/p196-admin-verify.ts
run_suite p20a        300 bun scripts/p20a-library-test.ts
run_suite p23         420 bun scripts/p23-p1-test.ts
run_suite p24         600 bun scripts/p24-p2-video-test.ts
run_suite p2b-smoke   300 bun scripts/p2b-local-provider-smoke.ts
run_suite p20c        600 bun scripts/p20c-publish-test.ts
run_suite p2b-health   60 bun scripts/p2b-final-health.ts

echo "ALL_SUITES_DONE" >> "$LOG"
