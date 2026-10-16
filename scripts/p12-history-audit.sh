#!/usr/bin/env bash
# مرحله ۱۲ — ممیزی کامل تاریخچهٔ git برای دادهٔ حساس.
# سیاست گزارش: فقط نوع الگو + مسیر فایل + شورت‌SHA چاپ میشود.
# هیچ خطِ محتوا (که ممکن است مقدار محرمانه داشته باشد) هرگز چاپ نمیشود.
set -u
cd /home/z/my-project

echo "=== A. FILES with sensitive NAMES across ALL history ==="
git rev-list --all | sort -u | while read -r c; do
  git ls-tree -r --name-only "$c" | rg -i '(^|/)\.env($|\.)|\.env\.|\.pem$|\.key$|\.db$|\.sqlite|backup|dump|credential|apikey|api_key|secret' | while read -r f; do
    echo "$c $f"
  done
done | sort -u -k2 | awk '{print $2}' | sort | uniq -c | sort -rn | while read -r n f; do
  commits=$(git rev-list --all -- "$f" | head -1 | cut -c1-7)
  total=$(git rev-list --all -- "$f" | wc -l)
  echo "FILE_HITS=$n path=$f first_commit=$commits commits_containing=$total"
done

echo
echo "=== B. CONTENT pattern scan across ALL commits (no lines printed) ==="
declare -A PATTERNS=(
  [GH_FINE_PAT]='github_pat_[A-Za-z0-9_]{20,}'
  [GH_CLASSIC]='gh[posur]_[A-Za-z0-9]{20,}'
  [AWS_AKID]='AKIA[0-9A-Z]{16}'
  [GOOGLE_API]='AIza[0-9A-Za-z_-]{35}'
  [OPENAI_SK]='sk-[A-Za-z0-9_-]{20,}'
  [SLACK_TOKEN]='xox[baprs]-[A-Za-z0-9-]{10,}'
  [PRIVATE_KEY]='-----BEGIN [A-Z ]*PRIVATE KEY'
  [AUTH_SECRET_VALUE]='BETTER_AUTH_SECRET=[A-Za-z0-9+/=_-]{16,}'
  [URL_EMBEDDED_CREDS]='[a-z][a-z0-9+]*://[^/\s:@"]+:[^@\s/"]{6,}@'
  [JWT_LIKE]='eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.'
)
for name in "${!PATTERNS[@]}"; do
  hits=0
  declare -A seen=()
  for c in $(git rev-list --all); do
    # -I باینریها را رد میکند؛ فقط مسیر فایل چاپ میشود نه محتوا
    while read -r f; do
      key="$c:$f"
      [ -n "${seen[$key]:-}" ] && continue
      seen[$key]=1
      echo "CONTENT_HIT pattern=$name commit=${c:0:7} file=$f"
      hits=$((hits+1))
    done < <(git grep -I -l -E "${PATTERNS[$name]}" "$c" -- . 2>/dev/null | sed "s|^$c:||")
  done
  [ "$hits" -eq 0 ] && echo "CONTENT_HIT pattern=$name result=NONE"
  unset seen
done

echo
echo "=== C. .env-STYLE files in history: KEY NAMES ONLY (values suppressed) ==="
git rev-list --all | sort -u | while read -r c; do
  git ls-tree -r --name-only "$c" | rg -i '(^|/)\.env($|\.)' | while read -r f; do
    keys=$(git show "$c:$f" 2>/dev/null | rg -o '^[A-Za-z_][A-Za-z0-9_]*=' | tr -d '=' | sort | tr '\n' ',' )
    [ -n "$keys" ] && echo "ENV_FILE commit=${c:0:7} path=$f keys=${keys%,}"
  done
done | sort -u

echo
echo "=== D. db/custom.db reachability ==="
echo "commits containing db/custom.db: $(git rev-list --all -- db/custom.db | wc -l)"
echo "reachable from origin/main: $(git merge-base --is-ancestor $(git rev-list --all -- db/custom.db | head -1) origin/main && echo YES)"
echo "present in HEAD: $(git ls-tree -r --name-only HEAD | rg -x 'db/custom.db' || echo NO)"
