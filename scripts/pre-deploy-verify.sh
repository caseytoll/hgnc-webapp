#!/bin/bash
#
# Pre-deployment verification script
# Run this before deploying to ensure best practices
#
# Usage: ./scripts/pre-deploy-verify.sh [version]
#

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

VERSION=${1:-"unknown"}

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       PRE-DEPLOYMENT VERIFICATION ($VERSION)                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Track failures
FAILURES=0

# 1. Check deployment URL is correct
echo -e "${YELLOW}[1/7] Checking deployment command...${NC}"
echo ""
echo "The correct deployment command is:"
echo -e "${GREEN}clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d \"$VERSION - Description\"${NC}"
echo ""
read -p "Will you use this EXACT command with -i flag? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ FAIL: Wrong deployment command will create orphan deployment!${NC}"
    echo "   See: docs/DEPLOYMENT_CHECKLIST.md"
    FAILURES=$((FAILURES + 1))
else
    echo -e "${GREEN}✓ PASS${NC}"
fi
echo ""

# 2. Check if CSS was modified
echo -e "${YELLOW}[2/7] Checking for CSS changes...${NC}"
CSS_CHANGES=$(git diff HEAD~1 --name-only | grep -E 'styles\.html|\.css' || true)
if [ -n "$CSS_CHANGES" ]; then
    echo -e "${YELLOW}CSS files changed:${NC}"
    echo "$CSS_CHANGES"
    echo ""
    read -p "Did you search for CSS specificity conflicts (!important)? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}❌ FAIL: Check for conflicts!${NC}"
        echo "   Run: grep -n \"!important\" src/styles.html"
        echo "   See: docs/standards/CSS_BEST_PRACTICES.md#css-specificity--important-rules"
        FAILURES=$((FAILURES + 1))
    else
        echo ""
        read -p "Did you test ALL views affected by CSS changes? (y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${RED}❌ FAIL: Test all 20 views before deploying!${NC}"
            FAILURES=$((FAILURES + 1))
        else
            echo -e "${GREEN}✓ PASS${NC}"
        fi
    fi
else
    echo -e "${GREEN}No CSS changes detected.${NC}"
fi
echo ""

# 3. Check version number updated
echo -e "${YELLOW}[3/7] Checking version number...${NC}"
if grep -q "v$VERSION" src/includes/js-startup.html 2>/dev/null; then
    echo -e "${GREEN}✓ PASS: Version $VERSION found in js-startup.html${NC}"
else
    echo -e "${RED}❌ FAIL: Version $VERSION not found in js-startup.html${NC}"
    echo "   Update the version string in src/includes/js-startup.html"
    FAILURES=$((FAILURES + 1))
fi
echo ""

# 4. Check CHANGELOG updated
echo -e "${YELLOW}[4/7] Checking CHANGELOG.md...${NC}"
if grep -q "$VERSION" docs/CHANGELOG.md 2>/dev/null; then
    echo -e "${GREEN}✓ PASS: Version $VERSION found in CHANGELOG.md${NC}"
else
    echo -e "${YELLOW}⚠️  WARNING: Version $VERSION not in CHANGELOG.md${NC}"
    echo "   Consider adding entry to docs/CHANGELOG.md"
fi
echo ""

# 5. Check git is clean
echo -e "${YELLOW}[5/7] Checking git status...${NC}"
if [ -z "$(git status --porcelain)" ]; then
    echo -e "${GREEN}✓ PASS: No uncommitted changes${NC}"
else
    echo -e "${RED}❌ FAIL: Uncommitted changes detected!${NC}"
    echo "   Commit all changes before deploying"
    git status --short
    FAILURES=$((FAILURES + 1))
fi
echo ""

# 6. Diagnostic code check
echo -e "${YELLOW}[6/7] Checking for diagnostic code...${NC}"
DIAG_CODE=$(grep -rn "\\[DIAGNOSTIC\\]\\|\\[DEBUG\\]\\|console.log.*DIAG" src/ || true)
if [ -n "$DIAG_CODE" ]; then
    echo -e "${YELLOW}⚠️  WARNING: Diagnostic code found:${NC}"
    echo "$DIAG_CODE" | head -5
    echo ""
    read -p "Is this diagnostic code intentional? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Consider removing diagnostic code before production deploy${NC}"
    fi
else
    echo -e "${GREEN}No diagnostic code found.${NC}"
fi
echo ""

# 7. Hard refresh reminder
echo -e "${YELLOW}[7/7] Post-deployment reminder...${NC}"
echo ""
echo -e "${GREEN}After deploying, ALWAYS tell the user:${NC}"
echo "  \"Deployed as @XXXX. Please hard refresh (Cmd+Shift+R) and check console for version.\""
echo ""
read -p "Will you remember to instruct hard refresh? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ FAIL: User will see cached version!${NC}"
    FAILURES=$((FAILURES + 1))
else
    echo -e "${GREEN}✓ PASS${NC}"
fi
echo ""

# Summary
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED - Ready to deploy!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. clasp push"
    echo "  2. clasp deploy -i AKfycbw8nTMiBtx3SMw... -d \"$VERSION - Description\""
    echo "  3. Instruct user to hard refresh"
    echo "  4. Verify version number in console"
    exit 0
else
    echo -e "${RED}❌ $FAILURES CHECK(S) FAILED - Fix issues before deploying!${NC}"
    echo ""
    echo "See documentation:"
    echo "  docs/DEPLOYMENT_CHECKLIST.md"
    echo "  docs/START_HERE.md"
    exit 1
fi
