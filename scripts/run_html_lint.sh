#!/usr/bin/env bash
# Run an HTML linter (htmlhint) or tidy if available against index.html
set -euo pipefail
FILE="index.html"
if [ ! -f "$FILE" ]; then
  echo "File $FILE not found"
  exit 1
fi
# Prefer tidy if available (tidy-html5), otherwise htmlhint
if command -v tidy >/dev/null 2>&1; then
  echo "Found tidy — running: tidy -e -q $FILE"
  tidy -e -q "$FILE" || true
  exit 0
fi
if command -v htmlhint >/dev/null 2>&1; then
  echo "Found htmlhint — running: htmlhint $FILE"
  htmlhint "$FILE" || true
  exit 0
fi
# Fallback: run a couple of heuristics (script already exists for some checks)
echo "No tidy or htmlhint found. Install one of:
  brew install tidy-html5
  npm install -g htmlhint
"
# Basic heuristics: unmatched <? ?> tags and stray short lines
echo "\nHeuristic checks:"
# Look for lines that only contain a single non-whitespace character (common stray char)
nl -ba "$FILE" | sed -n '1,2000p' | awk '{print $1":"substr($0,index($0,$2))}' | grep -E '^\s*[0-9]+:\s*r$' || true
# Look for unknown template constructs (<? ) without closing ?> on the same or a following line
grep -n "<?\|?>" -n "$FILE" || true
exit 0
