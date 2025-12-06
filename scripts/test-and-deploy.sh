#!/bin/bash

# === HGNC WebApp Testing & Deployment Workflow ===
# Comprehensive script that validates, tests, and deploys

# Get the directory where this script is located, then go up to repo root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORKSPACE_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 HGNC WebApp Testing & Deployment Workflow${NC}"
echo "================================================"

# Check if description is provided
if [ $# -eq 0 ]; then
    echo -e "${RED}❌ Error: Please provide a deployment description${NC}"
    echo "Usage: $0 \"Description of changes\""
    exit 1
fi

DESCRIPTION="$1"

echo -e "${BLUE}Step 1: Pre-deployment validation...${NC}"
echo "----------------------------------------"

echo -e "${YELLOW}📖 REMINDER: Have you reviewed DEVELOPMENT-PRINCIPLES.md?${NC}"
echo "   Key checks:"
echo "   - Using correct deployment ID with -i flag"
echo "   - Tested changes in browser console first"
echo "   - Updated version number and CHANGELOG.md"
echo ""

# Run validation
if ./scripts/pre-deploy-check.sh; then
    echo -e "${GREEN}✅ Validation passed!${NC}"
else
    echo -e "${RED}❌ Validation failed. Aborting deployment.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Code quality checks...${NC}"
echo "-------------------------------"

# Check for console.log statements that should be removed
console_logs=$(grep -r "console\.log" "$WORKSPACE_DIR" --include="*.html" | grep -v "DEBUG\|[Rr]eporting\|validation\|checkCritical" | wc -l)
if [ $console_logs -gt 10 ]; then
    echo -e "${YELLOW}⚠️  Warning: $console_logs console.log statements found (expected: <10)${NC}"
else
    echo -e "${GREEN}✅ Console.log count looks good${NC}"
fi

# Check file sizes
index_size=$(stat -f%z "$WORKSPACE_DIR/index.html" 2>/dev/null || stat -c%s "$WORKSPACE_DIR/index.html" 2>/dev/null)
if [ $index_size -gt 2000000 ]; then
    echo -e "${YELLOW}⚠️  Warning: index.html is $index_size bytes (>2MB)${NC}"
else
    echo -e "${GREEN}✅ File sizes look good${NC}"
fi

echo ""
echo -e "${BLUE}Step 3: Deployment preparation...${NC}"
echo "-----------------------------------"

echo "📋 Deployment summary:"
echo "  Description: $DESCRIPTION"
echo "  Files to deploy: 11"
echo "  Target: Google Apps Script"

read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo -e "${BLUE}Step 4: Deploying...${NC}"
echo "----------------------"

# Deploy
if ./scripts/quick-deploy.sh "$DESCRIPTION"; then
    echo ""
    echo -e "${GREEN}🎉 Deployment successful!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "1. Test the deployed version in your browser"
    echo "2. Check browser console for any JavaScript errors"
    echo "3. Test the insights navigation buttons"
    echo "4. If issues found, use browser console commands:"
    echo "   - AppValidator.runAllChecks()"
    echo "   - AppValidator.testInsightsNavigation()"
    echo "   - AppValidator.checkDataAvailability()"
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi