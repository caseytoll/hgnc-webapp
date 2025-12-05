#!/usr/bin/env bash
# Pin CDN references to a tag or commit on jsDelivr.
# Usage: ./scripts/pin-cdn.sh @v1.0.1
set -euo pipefail
if [ $# -lt 1 ]; then
  echo "Usage: $0 <cdn-tag-or-sha>\nExample: $0 @v1.0.0" >&2
  exit 1
fi
TAG="$1"
if [[ ! "$TAG" =~ ^@ ]]; then
  TAG="@$TAG"
fi
# Files to update - simple list; update when new files include CDN refs
FILES=( Code.js js-startup.html styles.html index.html )
printf "Pinning jsDelivr CDN references to '%s' in: %s\n" "$TAG" "${FILES[*]}"
for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    echo "→ Updating $f"
    # Replace occurrences of @master with provided tag
    sed -i.bak "s/@master\//${TAG}\//g" "$f"
  else
    echo "→ Skipping missing file: $f"
  fi
done
# Cleanup backup files
rm -f *.bak

echo "Done. Remember to run tests and commit the changes."