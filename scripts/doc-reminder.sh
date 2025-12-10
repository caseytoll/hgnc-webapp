#!/bin/bash
#
# Documentation reminder for new developers
# Add to your workflow: Run this before starting work on any issue
#
# Usage: ./scripts/doc-reminder.sh
#

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║            📚 DOCUMENTATION QUICK REFERENCE                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

echo -e "${GREEN}Essential reading for AI agents & developers:${NC}"
echo ""
echo "  1️⃣  docs/START_HERE.md (5 min)"
echo "      - 4 critical rules that prevent wasting hours"
echo "      - Standard diagnostic template"
echo "      - CSS specificity quick reference"
echo ""
echo "  2️⃣  docs/DEPLOYMENT_CHECKLIST.md (10 min)"
echo "      - Step-by-step deployment workflow"
echo "      - Never deploy to wrong URL again"
echo "      - Post-deployment verification"
echo ""
echo "  3️⃣  docs/LESSONS_LEARNED.md (15 min)"
echo "      - Historical patterns and mistakes"
echo "      - CSS specificity conflicts (Dec 10, 2025)"
echo "      - Deployment URL confusion (Dec 10, 2025)"
echo ""

echo -e "${YELLOW}Common mistakes if you skip these docs:${NC}"
echo "  ❌ Deploy 6 times to wrong URL (user never sees changes)"
echo "  ❌ Debug CSS for 12 versions without checking computed styles"
echo "  ❌ Add !important without checking conflicts (break all views)"
echo "  ❌ Forget hard refresh instruction (user sees cached version)"
echo ""

echo -e "${GREEN}Working on specific tasks?${NC}"
echo "  • CSS changes:   docs/standards/CSS_BEST_PRACTICES.md"
echo "  • Debugging:     docs/operations/DEBUGGING_STRATEGY.md"
echo "  • Testing:       docs/testing/TESTING_README.md"
echo "  • All docs:      docs/DOCUMENTATION_INDEX.md"
echo ""

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}30 minutes of reading = 3+ hours saved in debugging${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""
