#!/usr/bin/env bash
set -euo pipefail

echo "❌ Deprecated: use ./scripts/efficient-deploy.sh <description> (this wrapper is disabled)." >&2
exit 1

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 \"Description of changes\""
  echo "Optional: set DEPLOYMENT_PUBLIC_URL env var or pass as second arg to run public runtime checks."
  exit 1
fi

DESCRIPTION="$1"
# Optional public deployment URL for runtime smoke tests; can be passed as second arg or via DEPLOYMENT_PUBLIC_URL
DEPLOYMENT_PUBLIC_URL=""
if [ "$#" -ge 2 ]; then
  DEPLOYMENT_PUBLIC_URL="$2"
elif [ -n "${DEPLOYMENT_PUBLIC_URL:-}" ]; then
  DEPLOYMENT_PUBLIC_URL="$DEPLOYMENT_PUBLIC_URL"
fi
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

if [ -n "${DEPLOYMENT_PUBLIC_URL:-}" ]; then
  echo "→ Running runtime-check.js against public URL: $DEPLOYMENT_PUBLIC_URL"
  APP_URL_PUBLIC="$DEPLOYMENT_PUBLIC_URL" node ./scripts/runtime-check.js || {
    echo "Runtime check failed against public URL: $DEPLOYMENT_PUBLIC_URL" >&2
    exit 3
  }
  echo "→ runtime-check.js completed successfully against public URL"
else
  echo "→ No public runtime URL provided; runtime smoke-check skipped. You can set DEPLOYMENT_PUBLIC_URL to run it."
fi

exit 0
