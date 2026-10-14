#!/usr/bin/env bash
# Push all changes to GitHub (zeynabzallaghi-spec/ai-fitness-coach)
# Usage: bash scripts/push-to-github.sh "commit message"
set -e
cd /home/z/my-project

MSG="${1:-chore: save and sync changes}"
BRANCH="$(git branch --show-current)"

git add -A
if git diff --cached --quiet; then
  echo "[push] Nothing to commit — working tree clean."
else
  git commit -m "$MSG"
fi

echo "[push] Pushing branch '$BRANCH' to origin..."
if git push -u origin "$BRANCH"; then
  echo "[push] ✔ Pushed successfully to https://github.com/zeynabzallaghi-spec/ai-fitness-coach"
else
  echo "[push] ✖ Push failed — most likely the repo does not exist yet."
  echo "[push]   Create it at: https://github.com/new  (name: ai-fitness-coach, owner: zeynabzallaghi-spec)"
  echo "[push]   Then re-run:  bash scripts/push-to-github.sh"
  exit 1
fi
