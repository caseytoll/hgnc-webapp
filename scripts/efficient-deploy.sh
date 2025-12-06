#!/usr/bin/env bash
set -euo pipefail

# Load shared configuration (DEPLOYMENT_ID, APP_URL_PUBLIC)
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=/dev/null
source "$SCRIPT_DIR/config.sh"

# Efficient deploy script for Google Apps Script via clasp
# Only pushes changed files to Apps Script to avoid accidental deletions
# Usage: ./scripts/efficient-deploy.sh "Description of changes" [--dry-run] [--skip-smoke] [--ensure-anonymous] [--allow-dirty]

DRY_RUN=0
ENSURE_ANON=0
ALLOW_DIRTY=0
# Run smoke test by default; use --skip-smoke to disable
SMOKE_TEST=1
if [ "$#" -lt 1 ]; then
  echo "Usage: $0 \"Description of changes\" [--dry-run]"
  exit 1
fi

DESCRIPTION="$1"
if [ "${2:-}" = "--dry-run" ]; then
  DRY_RUN=1
fi
if [[ " ${*:2} " == *" --skip-smoke "* ]]; then
  SMOKE_TEST=0
fi
if [[ " ${*:2} " == *" --ensure-anonymous "* ]]; then
  ENSURE_ANON=1
fi
if [[ " ${*:2} " == *" --allow-dirty "* ]]; then
  ALLOW_DIRTY=1
fi

pushd "$(git rev-parse --show-toplevel)" >/dev/null
echo "💡 Efficient deploy: building file list to push..."

# Guard: require clean working tree unless explicitly allowed
if [ "$ALLOW_DIRTY" -ne 1 ]; then
  if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Working tree is dirty. Commit/stash or re-run with --allow-dirty." >&2
    popd >/dev/null
    exit 1
  fi
fi

# Guard: ensure node_modules exists when tests will run
if [ "$SMOKE_TEST" -eq 1 ] && [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules not found. Installing dev dependencies (npm ci)..."
  npm ci --silent
fi

# Always include core files
INCLUDE_FILES=(appsscript.json Code.js index.html styles.html)

# Collect changed files against origin/master
CHANGED=$(git diff --name-only origin/master...HEAD || true)

for f in $CHANGED; do
  # Include only files that should be pushed to Apps Script
  case "$f" in
    *.html|*.js|appsscript.json|*.json)
      # Exclude test files and scripts
      if [[ "$f" =~ ^scripts/ || "$f" =~ ^tests/ || "$f" =~ ^assets/ ]]; then
        continue
      fi
      INCLUDE_FILES+=("$f")
      ;;
    *)
      ;;
  esac
done

TMPFILE=$(mktemp)
for f in "${INCLUDE_FILES[@]}"; do
  echo "$f" >> "$TMPFILE"
done
# Preserve order and uniqueness (awk works even on macOS)
awk '!seen[$0]++' "$TMPFILE" > "${TMPFILE}.uniq"
mv "${TMPFILE}.uniq" "$TMPFILE"

echo "Files selected for push:" && cat "$TMPFILE"

if [ $DRY_RUN -eq 1 ]; then
  echo "Dry run - not pushing. Run without --dry-run to push." && popd >/dev/null && exit 0
fi

# Backup original .clasp.json if present
CLASP_FILE=.clasp.json
BACKUP_CLASP="${CLASP_FILE}.bak"
if [ -f "$CLASP_FILE" ]; then
  cp "$CLASP_FILE" "$BACKUP_CLASP"
else
  if [ -n "${CLASP_SCRIPT_ID:-}" ]; then
    echo "No .clasp.json found - creating a temporary .clasp.json using CLASP_SCRIPT_ID from environment"
    SCRIPT_ID="${CLASP_SCRIPT_ID}"
    # Create a minimal .clasp.json file with a placeholder filePushOrder (will update below)
    cat > "$CLASP_FILE" <<EOF
{
  "scriptId": "${SCRIPT_ID}",
  "rootDir": "",
  "projectId": "",
  "scriptExtensions": [".js", ".gs"],
  "htmlExtensions": [".html"],
  "jsonExtensions": [".json"],
  "filePushOrder": []
}
EOF
    cp "$CLASP_FILE" "$BACKUP_CLASP"
  else
    echo "ERROR: .clasp.json not found and CLASP_SCRIPT_ID env not provided. Please create .clasp.json or set CLASP_SCRIPT_ID." >&2
    rm -f "$TMPFILE"
    popd >/dev/null
    exit 1
  fi
fi

echo "→ Writing temporary .clasp.json with filePushOrder"
# If we backed up an existing .clasp.json, extract its scriptId; otherwise use CLASP_SCRIPT_ID
if [ -f "$BACKUP_CLASP" ]; then
  SCRIPT_ID=$(grep -oE '"scriptId":\s*"[A-Za-z0-9_\-]+"' "$BACKUP_CLASP" | head -1 | sed -E 's/.*"([^"]+)".*/\1/' )
fi
if [ -z "$SCRIPT_ID" ]; then
  SCRIPT_ID="${CLASP_SCRIPT_ID:-}"
fi
{
  echo "{"
  echo "  \"scriptId\": \"$SCRIPT_ID\"," 
  echo "  \"rootDir\": \"\"," 
  echo "  \"projectId\": \"\"," 
  echo "  \"scriptExtensions\": [\".js\", \".gs\"],"
  echo "  \"htmlExtensions\": [\".html\"],"
  echo "  \"jsonExtensions\": [\".json\"],"
  echo "  \"filePushOrder\": ["
  FIRST=1
  while IFS= read -r line; do
    if [ -n "${line}" ]; then
      if [ "$FIRST" -eq 1 ]; then
        printf "    \"%s\"\n" "$line"
        FIRST=0
      else
        printf "    ,\"%s\"\n" "$line"
      fi
    fi
  done < "$TMPFILE"
  echo "  ]"
  echo "}"
} > "$CLASP_FILE"
echo "  Updated .clasp.json with filePushOrder entries: $(wc -l < "$TMPFILE")"

# Run clasp push, version, and deploy
echo "→ Pushing to Apps Script (clasp)..."
START_TIME=$(date +%s)
clasp push --force
END_TIME=$(date +%s)
echo "  Push duration: $((END_TIME-START_TIME))s"

echo "→ Creating version..."
VERSION_OUTPUT=$(clasp version "$DESCRIPTION")
VERSION_NUMBER=$(echo "$VERSION_OUTPUT" | grep -oE '[0-9]+' | head -1 || true)
if [ -z "$VERSION_NUMBER" ]; then
  echo "ERROR: Could not extract version number from: $VERSION_OUTPUT" >&2
  cp "$BACKUP_CLASP" "$CLASP_FILE" && rm "$BACKUP_CLASP" && exit 1
fi
echo "  Created version: $VERSION_NUMBER"

# Update CDN_TAG to pin assets to this commit for immutability
echo "→ Pinning CDN assets to HEAD commit..."
CURRENT_COMMIT=$(git rev-parse --short HEAD)
sed -i.bak "s/var CDN_TAG = '@[^']*'/var CDN_TAG = '@$CURRENT_COMMIT'/" Code.js
if grep -q "CDN_TAG = '@$CURRENT_COMMIT'" Code.js; then
  echo "  Pinned CDN_TAG to: @$CURRENT_COMMIT"
  rm -f Code.js.bak
  # Note: This change will be in the next deploy; current version uses the old tag
else
  echo "  WARNING: Could not update CDN_TAG; restoring backup"
  mv Code.js.bak Code.js || true
fi

echo "→ Deploying version $VERSION_NUMBER..."
ACCESS_ARG=""
if [ "$ENSURE_ANON" -eq 1 ]; then
  # Test whether clasp deploy supports the --access flag
  if clasp deploy --help 2>&1 | /usr/bin/grep -q -- --access; then
    ACCESS_ARG="--access ANYONE_ANONYMOUS"
    echo "→ Ensuring deployment access is ANYONE_ANONYMOUS via clasp"
  else
    echo "→ WARNING: this version of clasp does not support --access; attempting to patch deployment access via REST API..."
    if ! node ./scripts/ensure-deploy-access.js; then
      echo "ERROR: Could not ensure anonymous access via REST API. Please update clasp or patch the deployment manually." >&2
      exit 1
    else
      echo "→ REST API patch success: deployment should be set to ANYONE_ANONYMOUS"
    fi
  fi
fi
clasp deploy --versionNumber "$VERSION_NUMBER" --deploymentId "$DEPLOYMENT_ID" $ACCESS_ARG

# Restore .clasp.json
mv "$BACKUP_CLASP" "$CLASP_FILE"
rm -f "$TMPFILE"

if [ "$SMOKE_TEST" -eq 1 ]; then
  echo "→ Running smoke test against production exec URL"
  # Default APP_URL_PUBLIC, allow override via environment
  export APP_URL_PUBLIC="${APP_URL_PUBLIC:-https://script.google.com/macros/s/$DEPLOYMENT_ID/exec}"
  # If we have GCP_SA_KEY available, ensure deploy access (optional), else rely on REST API or OIDC workflows
  npm ci --silent || true
  if [ -n "${CLASP_SCRIPT_ID:-}" ] || [ -n "$DEPLOYMENT_ID" ]; then
    echo "→ Ensuring deploy access via script (best-effort)"
    node ./scripts/ensure-deploy-access.js || echo "ensure-deploy-access: returned non-zero (warning)"
  fi
  npm ci --silent || true
  node ./scripts/runtime-check.js; SM_OK=$?
  if [ "$SM_OK" -ne 0 ]; then
    echo "⚠️ Smoke test failed (exit $SM_OK)"
    exit $SM_OK
  fi
  echo "✅ Smoke test passed against: $APP_URL_PUBLIC"
  
  # Run extended smoke test for comprehensive coverage
  echo ""
  echo "→ Running extended smoke test (navigation, performance, accessibility, etc.)"
  node ./scripts/extended-smoke-test.js; ESM_OK=$?
  if [ "$ESM_OK" -eq 0 ]; then
    echo "✅ Extended smoke test passed"
  else
    echo "⚠️ Extended smoke test failed (non-critical)"
  fi

  # Run specialized integration test suite (CRUD, validation, errors, performance, a11y, mobile, search)
  echo ""
  echo "→ Running comprehensive integration test suite..."
  if node ./scripts/integration-test.js; then
    echo "✅ All integration tests passed"
  else
    echo "⚠️ Some integration tests failed (review before production)"
  fi
fi

echo "✅ Efficient deployment complete: version $VERSION_NUMBER"
popd >/dev/null

exit 0
#!/usr/bin/env bash
set -euo pipefail

# Efficient Deploy Script - Temporarily moves large directories to speed up clasp push
# Follows development principles: uses stable deployment ID, assumes version/changelog updated
# Usage: ./scripts/efficient-deploy.sh "v620 - description"

DEPLOYMENT_ID="AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug"

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 \"v{X} - Description of changes\""
  echo "Make sure to update Code.js appVersion and CHANGELOG.md first!"
  exit 1
fi

DESCRIPTION="$1"
# Support a dry-run mode: pass a second arg '--dry-run' or set DRY_RUN=1
DRY_RUN=0
if [ "$#" -ge 2 ]; then
  if [ "$2" = "--dry-run" ] || [ "$2" = "--dry" ]; then
    DRY_RUN=1
  fi
fi
if [ "${DRY_RUN}" = "1" ]; then
  echo "→ DRY RUN enabled: clasp push/deploy will be skipped."
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Efficient Deploy: $DESCRIPTION"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Run pre-deployment checks
echo "→ Running pre-deployment validation..."
if ! ./scripts/pre-deploy-check.sh; then
  echo "❌ Pre-deployment checks failed. Aborting."
  exit 1
fi
echo "  Validation passed."

# Temporarily move large directories to speed up push
echo "→ Temporarily moving node_modules, src, and tests to speed up push..."
TEMP_DIR="../temp_deploy_$(date +%s)"
mkdir -p "$TEMP_DIR"
if [ -d "node_modules" ]; then
  mv node_modules "$TEMP_DIR/"
fi
if [ -d "src" ]; then
  mv src "$TEMP_DIR/"
fi
if [ -d "tests" ]; then
  mv tests "$TEMP_DIR/"
fi

# Push files
if [ "${DRY_RUN}" = "1" ]; then
  echo "→ DRY RUN: would push files to Apps Script (excluding large dirs)..."
  PUSH_DURATION=0
else
  echo "→ Pushing files to Apps Script (excluding large dirs)..."
  START_TIME=$(date +%s)
  clasp push
  END_TIME=$(date +%s)
  PUSH_DURATION=$((END_TIME - START_TIME))
  echo "  Push completed in ${PUSH_DURATION}s"
fi

# Deploy
if [ "${DRY_RUN}" = "1" ]; then
  echo "→ DRY RUN: would deploy to production (skipping clasp): description: $DESCRIPTION"
  DEPLOY_DURATION=0
else
  echo "→ Deploying to production..."
  DEPLOY_START=$(date +%s)
  clasp deploy -i "$DEPLOYMENT_ID" -d "$DESCRIPTION"
  DEPLOY_END=$(date +%s)
  DEPLOY_DURATION=$((DEPLOY_END - DEPLOY_START))
  echo "  Deploy completed in ${DEPLOY_DURATION}s"
fi

# Move directories back
echo "→ Restoring directories..."
if [ -d "$TEMP_DIR/node_modules" ]; then
  mv "$TEMP_DIR/node_modules" .
fi
if [ -d "$TEMP_DIR/src" ]; then
  mv "$TEMP_DIR/src" .
fi
if [ -d "$TEMP_DIR/tests" ]; then
  mv "$TEMP_DIR/tests" .
fi
rmdir "$TEMP_DIR" 2>/dev/null || true

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deployment successful!"
echo "   Description: $DESCRIPTION"
echo "   Deployment ID: $DEPLOYMENT_ID"
echo "   Push time: ${PUSH_DURATION}s"
echo "   Deploy time: ${DEPLOY_DURATION}s"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"