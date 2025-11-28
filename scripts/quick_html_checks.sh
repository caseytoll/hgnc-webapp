#!/usr/bin/env bash
# Quick HTML checks for this workspace
# - Finds lines containing only a single printable character (possible stray chars)
# - Finds unclosed PHP-like template tags '<?' or '<?!=' without closing '?>'

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "Running quick HTML checks in $ROOT"

# 1) Single-character lines (printable characters)
echo "\n-- Single-character lines --"
grep -nE "^[[:space:]]*[[:graph:]]{1}[[:space:]]*$" "$ROOT"/index.html || echo "(none)"

# 2) Lines with stray standalone 'r' specifically
echo "\n-- Lines with lone 'r' --"
grep -n "^[[:space:]]*r[[:space:]]*$" "$ROOT"/index.html || echo "(none)"

# 3) Unbalanced template tags (simple heuristic)
echo "\n-- Possible unclosed template tag usages --"
grep -n "<?!=\|<?php\|<?=" -n "$ROOT"/index.html || echo "(none detected)"

echo "\nChecks complete. For thorough HTML linting, consider installing 'htmlhint' or 'tidy' locally."