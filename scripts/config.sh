#!/usr/bin/env bash
# Shared configuration for deployment scripts
# Prefer environment overrides; fall back to known defaults.

# Primary deployment ID (Apps Script deployment)
# Latest deployment from clasp deployments: AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh @HEAD
: "${DEPLOYMENT_ID:=AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh}"

# Public execution URL (derived if not provided)
: "${APP_URL_PUBLIC:=https://script.google.com/macros/s/$DEPLOYMENT_ID/exec}"

# Allow callers to set CLASP_SCRIPT_ID via env; no default here.
# If CLASP_SCRIPT_ID is unset, efficient-deploy will read from .clasp.json backup.

export DEPLOYMENT_ID APP_URL_PUBLIC
