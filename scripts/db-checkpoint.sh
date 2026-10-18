#!/bin/bash
# db-checkpoint.sh — verified snapshot of the live SQLite DB pushed to the
# private repo on the dedicated branch `data-checkpoints`.
#
# WHY: every sandbox recycle wipes db/ and backups/ (repo.tar carries
# neither). The only durable store available is the git remote. Phase 12
# deliberately untracked db/*.db from the MAIN branch to keep the working
# tree clean — this script respects that: it uses git PLUMBING
# (hash-object / mktree / commit-tree / update-ref) so the worktree and the
# index are never touched, `git status` stays clean, and the live DB is
# never accidentally committed by routine `git add`.
#
# PRIVACY NOTE (transparent): the DB contains real account emails. It is
# written ONLY to the user's own PRIVATE repo on a dedicated branch, as an
# explicit durability measure ordered by the user ("حلش کن واسه همیشه").
# The same data already exists in history (blob at commit 889a89e).
#
# Restore path (used by scripts/ensure-app.sh):
#   git cat-file blob data-checkpoints:custom.db > db/custom.db
set -euo pipefail

PROJECT="/home/z/my-project"
DB="$PROJECT/db/custom.db"
BRANCH="data-checkpoints"
BACKUPS="$PROJECT/backups"

log() { echo "[db-checkpoint] $(date -u '+%Y-%m-%dT%H:%M:%SZ') $*"; }

[ -s "$DB" ] || { log "ERROR: $DB missing/empty — nothing to checkpoint"; exit 1; }

# 1) verify BEFORE snapshotting — never checkpoint a corrupt/unhealthy DB
python3 - "$DB" <<'PY'
import sqlite3, sys
c = sqlite3.connect('file:' + sys.argv[1] + '?mode=ro', uri=True)
integ = c.execute('PRAGMA integrity_check').fetchone()[0]
fk = c.execute('PRAGMA foreign_key_check').fetchall()
users = c.execute('SELECT count(*) FROM user').fetchone()[0]
tables = {r[0] for r in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
core = {'FitnessProfile', 'WorkoutPlan', 'NutritionPlan'}
assert integ == 'ok', f'integrity={integ}'
assert not fk, f'fk violations={fk[:3]}'
assert core <= tables, f'core tables missing: {core - tables}'
print(f'OK integrity=integrity ok fk=0 users={users} schema=FULL')
PY
log "pre-check passed"

# 2) local verified backup (survives app crashes within this container life)
mkdir -p "$BACKUPS"; chmod 700 "$BACKUPS" 2>/dev/null || true
STAMP="$(date +%Y%m%d-%H%M%S)"
SNAP="$BACKUPS/custom-$STAMP.db"
python3 - "$DB" "$SNAP" <<'PY'
import sqlite3, sys
src = sqlite3.connect('file:' + sys.argv[1] + '?mode=ro', uri=True)
dst = sqlite3.connect(sys.argv[2])
src.backup(dst)
dst.close()
PY
chmod 600 "$SNAP"
log "local snapshot: $SNAP"

cd "$PROJECT"

# 3) plumbing commit on data-checkpoints (worktree/index untouched)
BLOB="$(git hash-object -w "$DB")"
PARENT="$(git rev-parse --verify "refs/heads/$BRANCH" 2>/dev/null || true)"
TREE="$(printf '100644 blob %s\tcustom.db\n' "$BLOB" | git mktree)"
if [ -n "$PARENT" ]; then
  COMMIT="$(git commit-tree "$TREE" -p "$PARENT" -m "db checkpoint $STAMP (integrity ok)")"
else
  COMMIT="$(git commit-tree "$TREE" -m "db checkpoint $STAMP (integrity ok)")"
fi
git update-ref "refs/heads/$BRANCH" "$COMMIT"
log "checkpoint commit: $COMMIT (branch $BRANCH, worktree untouched)"

# 4) push to the private remote (best-effort: local ref already protects
#    against app crashes; only the push protects against container recycle)
if git push origin "refs/heads/$BRANCH:refs/heads/$BRANCH" 2>&1; then
  log "pushed $BRANCH to origin"
else
  log "WARNING: push failed — checkpoint exists locally only"
  exit 2
fi

USERS="$(python3 - "$DB" <<'PY'
import sqlite3, sys
print(sqlite3.connect('file:' + sys.argv[1] + '?mode=ro', uri=True)
      .execute('SELECT count(*) FROM user').fetchone()[0])
PY
)"
log "done (users=$USERS, blob=$BLOB)"
