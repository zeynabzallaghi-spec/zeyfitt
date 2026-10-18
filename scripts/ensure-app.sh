#!/bin/bash
# ensure-app.sh — self-heal environment + database before server start.
#
# WHY THIS EXISTS
# Every sandbox recycle (container rebuild) runs /start.sh which:
#   1. rewrites .env down to `DATABASE_URL=...` only  -> BETTER_AUTH_SECRET lost
#   2. restores the project from repo.tar             -> db/ + backups/ absent
#   (repo.tar contains neither db/custom.db nor .env — verified 2026-10-18)
# The old dev.sh then ran `prisma db push --accept-data-loss` on the empty
# file and started a server that the sandbox killed when the boot subshell
# exited. Result: empty database + 502 preview on every recycle.
#
# WHAT THIS SCRIPT DOES (idempotent, NON-DESTRUCTIVE)
#   1. ensure DATABASE_URL + BETTER_AUTH_SECRET exist in .env
#   2. restore db/custom.db ONLY when it is verifiably destroyed:
#        - file missing/empty, or integrity_check != ok, or
#        - core domain tables (FitnessProfile/WorkoutPlan/NutritionPlan) absent
#      Restore source priority:
#        a) newest VERIFIED local backup  backups/custom-*.db
#        b) newest checkpoint branch      refs/heads/data-checkpoints (:custom.db)
#        c) newest historical git blob    git log --all -- db/custom.db
#      A schema-complete but empty DB is NEVER overwritten (user may have
#      deliberately removed their data).
#   3. `prisma db push --skip-generate` WITHOUT --accept-data-loss
#      (additive sync; prisma refuses destructive drift in non-interactive mode)
#   4. verified post-heal snapshot to backups/ (rotating, keep 5)
#
# Exit code is always 0 unless catastrophically broken: healing must never
# block the server start path.
set -uo pipefail

PROJECT="/home/z/my-project"
DB="$PROJECT/db/custom.db"
DB_DIR="$PROJECT/db"
BACKUPS="$PROJECT/backups"
PUSH_LOG="/tmp/ensure-app-dbpush.log"

log() { echo "[ensure-app] $(date -u '+%Y-%m-%dT%H:%M:%SZ') $*"; }

mkdir -p "$DB_DIR" "$BACKUPS" 2>/dev/null
chmod 700 "$BACKUPS" 2>/dev/null || true

# ---------------------------------------------------------------- 1) .env ---
if ! grep -q '^DATABASE_URL=' "$PROJECT/.env" 2>/dev/null; then
  printf 'DATABASE_URL=file:/home/z/my-project/db/custom.db\n' >> "$PROJECT/.env"
  log "DATABASE_URL missing -> appended to .env"
fi
if ! grep -q '^BETTER_AUTH_SECRET=' "$PROJECT/.env" 2>/dev/null; then
  SECRET="$(openssl rand -base64 36 2>/dev/null | tr -d '\n')"
  [ -n "$SECRET" ] || SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '\n')"
  printf 'BETTER_AUTH_SECRET=%s\n' "$SECRET" >> "$PROJECT/.env"
  log "BETTER_AUTH_SECRET missing -> regenerated (all sessions reset)"
fi
chmod 600 "$PROJECT/.env" 2>/dev/null || true

# ---------------------------------------------------------- 2) DB health ----
# ro-probe helper: prints integrity or ERR:...
db_integrity() {
  python3 - "$1" <<'PY'
import sqlite3, sys
try:
    c = sqlite3.connect('file:' + sys.argv[1] + '?mode=ro', uri=True)
    print(c.execute('PRAGMA integrity_check').fetchone()[0])
except Exception as e:
    print('ERR:' + str(e)[:80])
PY
}

db_shape() {
  python3 - "$1" <<'PY'
import sqlite3, sys
try:
    c = sqlite3.connect('file:' + sys.argv[1] + '?mode=ro', uri=True)
    tables = {r[0] for r in c.execute(
        "SELECT name FROM sqlite_master WHERE type='table'")}
    core = {'FitnessProfile', 'WorkoutPlan', 'NutritionPlan'}
    print('FULL' if core <= tables else 'SKELETON')
except Exception:
    print('ERR')
PY
}

RESTORE=0
REASON=""
if [ ! -s "$DB" ]; then
  RESTORE=1; REASON="file missing/empty"
else
  INTEG="$(db_integrity "$DB")"
  if [ "$INTEG" != "ok" ]; then
    RESTORE=1; REASON="integrity_check=$INTEG"
  else
    SHAPE="$(db_shape "$DB")"
    if [ "$SHAPE" != "FULL" ]; then
      RESTORE=1; REASON="schema=$SHAPE (core tables absent)"
    fi
  fi
fi

if [ "$RESTORE" -eq 1 ]; then
  log "DB requires restore: $REASON"
  if [ -s "$DB" ]; then
    SNAP="$BACKUPS/pre-restore-$(date +%Y%m%d-%H%M%S).db"
    cp "$DB" "$SNAP" 2>/dev/null && chmod 600 "$SNAP" 2>/dev/null || true
    log "preserved pre-restore state: $SNAP"
  fi

  SRC=""
  # (a) newest verified local backup
  for CAND in $(ls -1t "$BACKUPS"/custom-*.db 2>/dev/null); do
    if [ "$(db_integrity "$CAND")" = "ok" ] && [ "$(db_shape "$CAND")" = "FULL" ]; then
      SRC="$CAND"
      log "restore source: local backup $CAND"
      break
    fi
  done
  # (b) data-checkpoints branch (plumbing-written, never touches worktree)
  if [ -z "$SRC" ] && git -C "$PROJECT" rev-parse --verify \
      refs/heads/data-checkpoints >/dev/null 2>&1; then
    REF="$(git -C "$PROJECT" rev-parse refs/heads/data-checkpoints)"
    if git -C "$PROJECT" cat-file blob "$REF:custom.db" > "$DB.restore-tmp" 2>/dev/null; then
      if [ "$(db_integrity "$DB.restore-tmp")" = "ok" ] && [ "$(db_shape "$DB.restore-tmp")" = "FULL" ]; then
        SRC="checkpoint-branch:$REF"
        mv "$DB.restore-tmp" "$DB"
        log "restore source: data-checkpoints branch @ $REF"
      else
        rm -f "$DB.restore-tmp"
      fi
    fi
  fi
  # (c) newest historical blob of db/custom.db
  if [ -z "$SRC" ]; then
    NEWEST="$(git -C "$PROJECT" log --all --format=%H -- db/custom.db 2>/dev/null | head -1)"
    if [ -n "$NEWEST" ] && git -C "$PROJECT" cat-file blob "$NEWEST:db/custom.db" > "$DB.restore-tmp" 2>/dev/null; then
      if [ "$(db_integrity "$DB.restore-tmp")" = "ok" ] && [ "$(db_shape "$DB.restore-tmp")" = "FULL" ]; then
        SRC="git-blob:$NEWEST"
        mv "$DB.restore-tmp" "$DB"
        log "restore source: git blob @ commit $NEWEST"
      else
        rm -f "$DB.restore-tmp"
      fi
    fi
  fi
  rm -f "$DB.restore-tmp"

  if [ -n "$SRC" ]; then
    chmod 600 "$DB" 2>/dev/null || true
    log "restore completed from $SRC"
  else
    log "WARNING: no verified restore source available — continuing with empty DB"
  fi
else
  log "DB healthy (integrity ok, schema FULL) — no restore needed"
fi

# ------------------------------------------- 3) additive schema sync --------
cd "$PROJECT" || exit 0
if npx --no-install prisma db push --skip-generate > "$PUSH_LOG" 2>&1; then
  log "prisma db push: schema in sync (additive, no data loss flag)"
else
  log "WARNING: prisma db push failed — see $PUSH_LOG (continuing; never destructive)"
fi

# ------------------------------------------------- 4) verified snapshot -----
if [ -s "$DB" ] && [ "$(db_integrity "$DB")" = "ok" ]; then
  SNAP="$BACKUPS/custom-$(date +%Y%m%d-%H%M%S).db"
  if python3 - "$DB" "$SNAP" <<'PY'
import sqlite3, sys
src = sqlite3.connect('file:' + sys.argv[1] + '?mode=ro', uri=True)
dst = sqlite3.connect(sys.argv[2])
src.backup(dst)
dst.close()
PY
  then
    chmod 600 "$SNAP" 2>/dev/null || true
    log "verified snapshot: $SNAP"
    # rotate: keep newest 5 custom-*.db
    KEEP=5
    for OLD in $(ls -1t "$BACKUPS"/custom-*.db 2>/dev/null | tail -n +$((KEEP + 1))); do
      rm -f "$OLD" && log "rotated old snapshot: $OLD"
    done
  else
    log "WARNING: snapshot failed (non-fatal)"
  fi
fi

USERS="$(python3 - "$DB" <<'PY'
import sqlite3, sys
try:
    c = sqlite3.connect('file:' + sys.argv[1] + '?mode=ro', uri=True)
    print(c.execute('SELECT count(*) FROM user').fetchone()[0])
except Exception:
    print('?')
PY
)"
log "done (users=$USERS)"
exit 0
