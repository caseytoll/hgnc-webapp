#!/usr/bin/env bash
# Shared configuration for deployment scripts
# Prefer environment overrides; fall back to known defaults.

# Primary deployment ID (Apps Script deployment)
: "${DEPLOYMENT_ID:=AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug}"

# Public execution URL (derived if not provided)
: "${APP_URL_PUBLIC:=https://script.google.com/macros/s/$DEPLOYMENT_ID/exec}"

# Allow callers to set CLASP_SCRIPT_ID via env; no default here.
# If CLASP_SCRIPT_ID is unset, efficient-deploy will read from .clasp.json backup.

export DEPLOYMENT_ID APP_URL_PUBLIC
