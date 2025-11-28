#!/usr/bin/env bash
set -euo pipefail

# Quick deploy helper - pushes, versions, and deploys in one go
# Usage: ./scripts/quick-deploy.sh "Description of changes"

DEPLOYMENT_ID="AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 \"Description of changes\""
  exit 1
fi

DESCRIPTION="$1"
DATE=$(date +%F)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Quick Deploy: $DESCRIPTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Push files
echo "→ Pushing files to Apps Script..."
START_TIME=$(date +%s)
clasp push --force
END_TIME=$(date +%s)
PUSH_DURATION=$((END_TIME - START_TIME))
echo "  Push completed in ${PUSH_DURATION}s"

# Create version
echo "→ Creating new version..."
VERSION_START=$(date +%s)
VERSION_OUTPUT=$(clasp version "$DESCRIPTION")
VERSION_END=$(date +%s)
VERSION_DURATION=$((VERSION_END - VERSION_START))
VERSION_NUMBER=$(echo "$VERSION_OUTPUT" | grep -oE '[0-9]+' | head -1)

if [ -z "$VERSION_NUMBER" ]; then
  echo "ERROR: Could not extract version number from: $VERSION_OUTPUT" >&2
  exit 1
fi

echo "  Created version $VERSION_NUMBER (took ${VERSION_DURATION}s)"

# Deploy
echo "→ Deploying version $VERSION_NUMBER..."
DEPLOY_START=$(date +%s)
clasp deploy --versionNumber "$VERSION_NUMBER" --deploymentId "$DEPLOYMENT_ID"
DEPLOY_END=$(date +%s)
DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))
echo "  Deployed $DEPLOYMENT_ID @$VERSION_NUMBER (took ${DEPLOY_DURATION}s)"

# Update changelog
echo "→ Updating CHANGELOG.md..."
TMPFILE=$(mktemp)
{
  echo "# CHANGELOG"
  echo ""
  echo "## v$VERSION_NUMBER — $DATE"
  echo "- $DESCRIPTION"
  echo ""
  tail -n +2 CHANGELOG.md
} > "$TMPFILE"
mv "$TMPFILE" CHANGELOG.md

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployed version $VERSION_NUMBER successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Calculate and display total deployment time
END_TIME=$(date +%s)
TOTAL_DURATION=$((END_TIME - START_TIME))
echo "⏱️  Total deployment time: ${TOTAL_DURATION}s"
