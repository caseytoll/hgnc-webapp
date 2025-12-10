#!/bin/bash
# 
# Check current deployments and critical URLs
# Purpose: List deployment status before performing operations
# Usage: ./scripts/check-deployments.sh
#
# This script helps prevent accidental deletion of production URLs
# by showing which URLs are currently active.

set -e

echo ""
echo "📋 HGNC WebApp Deployment Status"
echo "=================================="
echo ""

# List all deployments
echo "Active Deployments:"
echo "-------------------"
clasp deployments | head -10

echo ""
echo "⚠️  CRITICAL URLs (DO NOT DELETE):"
echo "-----------------------------------"

# Check for known production URLs
echo ""
echo "✅ @HEAD URL (Always Latest):"
if grep -r "AKfycbyzIhkw5F5HJm7x1W3rGSdQHZefDvB2-U9M04RzvuRh" docs/ 2>/dev/null | head -1; then
  echo "   Status: FOUND in documentation"
else
  echo "   Status: Not found (verify in DEPLOYMENT_URLS.md)"
fi

echo ""
echo "✅ Production URL (v1025+):"
if grep -r "AKfycbwO67aBAg_wg4CmR4CyiRypxW7cNX3B04PY_f7FqaqtNP2TQf0_D4_y2aYy44b1z0RgUA" docs/ 2>/dev/null | head -1; then
  echo "   Status: FOUND in documentation"
else
  echo "   Status: Not found (verify in DEPLOYMENT_URLS.md)"
fi

echo ""
echo "❌ DELETED URL (v1024 - PERMANENTLY GONE):"
if grep -r "AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug" docs/ 2>/dev/null | head -1; then
  echo "   Status: FOUND in documentation"
  echo "   ⚠️  This URL was deleted on Dec 11, 2025 - DO NOT USE"
else
  echo "   Status: Not found (correctly removed)"
fi

echo ""
echo "📚 Reference Documents:"
echo "---------------------"
echo "• docs/DEPLOYMENT_URLS.md - Registry of all URLs"
echo "• docs/DEPLOYMENT_URL_MANAGEMENT.md - Why URLs matter"
echo "• docs/DEPLOYMENT_URL_DELETION_INCIDENT_2025_12_11.md - What went wrong"
echo "• docs/DEPLOYMENT_CHECKLIST.md - How to deploy safely"

echo ""
echo "⚠️  WARNING: Never use 'clasp undeploy' on production URLs"
echo ""
