#!/usr/bin/env bash
set -euo pipefail

# Release helper for Apps Script project
# Usage: ./scripts/release.sh v245 "Short release title" [DEPLOYMENT_ID]
# If DEPLOYMENT_ID is omitted, DEFAULT_DEPLOYMENT_ID in the script will be used.

DEFAULT_DEPLOYMENT_ID="AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug"

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 <version-tag> \"Short title\" [deploymentId]"
  exit 1
fi

VERSION_TAG="$1"
RELEASE_TITLE="$2"
DEPLOYMENT_ID="${3:-$DEFAULT_DEPLOYMENT_ID}"
DATE=$(date +%F)

echo "Preparing release $VERSION_TAG — $RELEASE_TITLE"

# Ensure CHANGELOG.md exists
if [ ! -f CHANGELOG.md ]; then
  echo "ERROR: CHANGELOG.md not found in current directory." >&2
  exit 1
fi

# Extract Unreleased block
UNRELEASED_BLOCK=$(awk 'BEGIN{in=0} /^## \[Unreleased\]/{in=1; next} /^## / && in==1{in=0} in==1{print}' CHANGELOG.md || true)

if [ -z "${UNRELEASED_BLOCK// }" ]; then
  echo "No content found under '## [Unreleased]' in CHANGELOG.md. Edit the changelog and add notes first." >&2
  exit 1
fi

echo "Found Unreleased entries; creating release section $VERSION_TAG"

# Build new changelog content: produce a new file and replace CHANGELOG.md atomically
TMPFILE=$(mktemp)
{
  echo "# CHANGELOG"
  echo
  echo "## [Unreleased]"
  echo
  # New release header
  echo "## $VERSION_TAG — $DATE"
  # Print unreleased block lines (already formatted bullets or plain lines)
  echo "$UNRELEASED_BLOCK"
  echo
  # Append the rest of the changelog excluding the Unreleased block
  awk 'BEGIN{in=0} /^## \[Unreleased\]/{in=1; next} in==1 && /^## /{in=2} in!=1{print} in==2{print; in=2}' CHANGELOG.md | sed '1,3d' || true
} > "$TMPFILE"

mv "$TMPFILE" CHANGELOG.md

echo "CHANGELOG.md updated locally."

echo "Pushing workspace files to Apps Script (clasp push)"
clasp push --force

echo "Creating Apps Script project version"
VER_OUT=$(clasp version "$VERSION_TAG — $RELEASE_TITLE" 2>&1)
echo "$VER_OUT"
VERSION_NUMBER=$(echo "$VER_OUT" | sed -nE 's/.*version ([0-9]+).*/\1/p' || true)

if [ -z "$VERSION_NUMBER" ]; then
  echo "Failed to parse created version number; aborting." >&2
  exit 1
fi

echo "Created version number: $VERSION_NUMBER"

echo "Updating deployment $DEPLOYMENT_ID to version $VERSION_NUMBER (preserve URL)"
clasp deploy --deploymentId "$DEPLOYMENT_ID" --versionNumber "$VERSION_NUMBER" --description "Point webapp deployment to $VERSION_TAG"

echo "Release $VERSION_TAG complete. Deployment updated to version $VERSION_NUMBER (deploymentId: $DEPLOYMENT_ID)"
echo "If you want the deployment to be anonymous (no sign-in required), run:"
echo "  clasp deploy --deploymentId $DEPLOYMENT_ID --versionNumber $VERSION_NUMBER --description 'Point webapp deployment to $VERSION_TAG' --access ANYONE_ANONYMOUS"

echo "Note: This script no longer performs git commits or tags. CHANGELOG.md was updated locally; if you want a local git commit or tag, run those commands manually."

exit 0
