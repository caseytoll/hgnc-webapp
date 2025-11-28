#!/usr/bin/env bash
# Remove lines that are exactly 'r' from index.html (makes an in-place edit with a backup)
set -euo pipefail
FILE="index.html"
if [ ! -f "$FILE" ]; then
  echo "File $FILE not found"
  exit 1
fi
# Create timestamped backup
TS=$(date +%Y%m%d%H%M%S)
cp "$FILE" "${FILE}.bak.$TS"
# Use sed to delete lines that are exactly 'r' (POSIX-compatible sed)
# macOS sed requires -i '' for in-place; we'll detect platform
if sed --version >/dev/null 2>&1; then
  # GNU sed
  sed -i '/^r$/d' "$FILE"
else
  # BSD/macOS sed
  sed -i '' '/^r$/d' "$FILE"
fi
echo "Removed lines equal to 'r' from $FILE (backup at ${FILE}.bak.$TS)"
exit 0
