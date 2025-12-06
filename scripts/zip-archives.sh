#!/usr/bin/env bash
set -euo pipefail

# Script: zip-archives.sh
# Compress index.html.* backups into archived_html_backups/index_html_backups.zip and optionally remove originals

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_DIR="$REPO_ROOT/archived_html_backups"
ZIPFILE="$ARCHIVE_DIR/index_html_backups.zip"

mkdir -p "$ARCHIVE_DIR"
shopt -s nullglob
files=( "$REPO_ROOT"/index.html.* )
if [ ${#files[@]} -eq 0 ]; then
  echo "No index.html.* backups to archive"
  exit 0
fi

echo "Archiving ${#files[@]} files to $ZIPFILE..."
pushd "$ARCHIVE_DIR" >/dev/null
zip -j "$ZIPFILE" "${files[@]}"
popd >/dev/null

echo "Compressed files into $ZIPFILE"

if [ "${1:-}" = "--commit" ]; then
  echo "Cleaning up raw backup files and committing (git)..."
  git rm -f --quiet "${files[@]}" || true
  if git diff --quiet -- "${ZIPFILE}"; then
    echo "No changes to commit"
  else
    git add "$ZIPFILE"
    git commit -m "chore(archive): compress archived html backups into zip"
    # Do not push; leave that to operator / CI
  fi
fi

echo "Archive step completed."
