#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PATTERNS=(
  'service_role'
  'sbp_'
  'eyJ.*role.*service_role'
  'postgres://'
)

FAILED=0
SELF="./scripts/check-secrets.sh"

while IFS= read -r -d '' file; do
  case "$file" in
    */node_modules/*|*/dist/*|*/.git/*|*/package-lock.json) continue ;;
  esac
  if [ "$file" = "$SELF" ] || [ "$file" = "./scripts/check-secrets.sh" ]; then
    continue
  fi
  for pattern in "${PATTERNS[@]}"; do
    if grep -qE "$pattern" "$file" 2>/dev/null; then
      echo "SECRET CHECK FAILED: pattern '$pattern' found in $file"
      FAILED=1
    fi
  done
done < <(find . -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.json' -o -name '*.env*' -o -name '*.md' -o -name '*.sh' \) -print0)

if [ "$FAILED" -eq 1 ]; then
  echo "Secret check failed."
  exit 1
fi

echo "Secret check passed."
