#!/usr/bin/env bash
set -euo pipefail

# Deploy the current branch using efficient deploy and run a few runtime checks against the deployed URL
# Usage: ./scripts/deploy_and_test.sh "Description"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 \"Description of changes\""
  exit 1
fi

DESCRIPTION="$1"
DEPLOYMENT_ID="AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug"

echo "→ Deploying: $DESCRIPTION"
./scripts/efficient-deploy.sh "$DESCRIPTION"

APP_URL="https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec"

echo "→ Verifying deployed URL: $APP_URL"
HTTP_STATUS=$(curl -s -L -o /dev/null -w "%{http_code}" "$APP_URL")
if [ "$HTTP_STATUS" != "200" ]; then
  echo "WARNING: Deployed app returned HTTP $HTTP_STATUS after following redirects - this may indicate authentication or landing page redirects" >&2
  # We'll continue to do a content check to see if the deployed content is accessible.
fi

echo "→ Fetching page and checking for known bad asset hosts (script.googleusercontent.com)"
PAGE=$(curl -s "$APP_URL")
if echo "$PAGE" | grep -q "script.googleusercontent.com"; then
  echo "WARNING: Page references script.googleusercontent.com assets – may indicate a legacy path or missing CDN fallback" >&2
fi

echo "→ Checking for CDN or WebP player analysis asset" 
if echo "$PAGE" | grep -q "player-analysis-icon.webp"; then
  echo "✅ player-analysis-icon.webp detected in the page markup (good)."
else
  echo "⚠️  player-analysis-icon.webp not detected — page may be using svg/data-uri fallback; runtime fallback should handle it."
fi

echo "→ Simple runtime checks complete. If you want a full runtime smoke test (Puppeteer+axe), run CI or see scripts/runtime-smoke-test.js"

exit 0
