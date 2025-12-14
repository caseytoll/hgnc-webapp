#!/usr/bin/env bash
# Shared configuration for deployment scripts
# Prefer environment overrides; fall back to known defaults.

# Primary deployment ID (Apps Script deployment)
# Using v843 deployment ID - this is the modifiable deployment
: "${DEPLOYMENT_ID:=AKfycbwO67aBAg_wg4CmR4CyiRypxW7cNX3B04PY_f7FqaqtNP2TQf0_D4_y2aYy44b1z0RgUA}"

# Public execution URL (derived if not provided)
: "${APP_URL_PUBLIC:=https://script.google.com/macros/s/$DEPLOYMENT_ID/exec}"

# Allow callers to set CLASP_SCRIPT_ID via env; no default here.
# If CLASP_SCRIPT_ID is unset, efficient-deploy will read from .clasp.json backup.

export DEPLOYMENT_ID APP_URL_PUBLIC
