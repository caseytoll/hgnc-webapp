#!/bin/bash

# === HGNC WebApp Pre-Deployment Validation Script ===
# This script performs static analysis and validation checks before deployment

echo "🔍 HGNC WebApp Pre-Deployment Validation"
echo "========================================"

WORKSPACE_DIR="/Users/casey-work/HGNC WebApp/17.11.25"
ERRORS_FOUND=0

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to report errors
report_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS_FOUND++))
}

# Function to report warnings
report_warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
}

# Function to report success
report_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo "📋 Checking file structure..."

# Check if all required files exist
required_files=(
    "index.html"
    "js-navigation.html"
    "js-render.html"
    "js-core-logic.html"
    "js-helpers.html"
    "js-server-comms.html"
    "js-startup.html"
    "js-validation.html"
    "styles.html"
    "appsscript.json"
)

for file in "${required_files[@]}"; do
    if [ -f "$WORKSPACE_DIR/$file" ]; then
        report_success "$file exists"
    else
        report_error "$file missing"
    fi
done

echo ""
echo "🔍 Checking JavaScript function definitions..."

# Check for critical function definitions in js-navigation.html
if grep -q "function showView(" "$WORKSPACE_DIR/js-navigation.html"; then
    report_success "showView function defined"
else
    report_error "showView function not found"
fi

if grep -q "const renderNewInsightsDashboard" "$WORKSPACE_DIR/js-render.html"; then
    report_success "renderNewInsightsDashboard function defined"
else
    report_error "renderNewInsightsDashboard function not found"
fi

if grep -q "const renderInsightsOffensiveLeaders" "$WORKSPACE_DIR/js-render.html"; then
    report_success "renderInsightsOffensiveLeaders function defined"
else
    report_error "renderInsightsOffensiveLeaders function not found"
fi

if grep -q "const renderInsightsDefensiveWall" "$WORKSPACE_DIR/js-render.html"; then
    report_success "renderInsightsDefensiveWall function defined"
else
    report_error "renderInsightsDefensiveWall function not found"
fi

# Check for critical HTML elements in index.html
critical_elements=(
    "insights-view"
    "insights-team-performance-view"
    "insights-offensive-leaders-view"
    "insights-defensive-wall-view"
    "app-tab-nav"
)

for element in "${critical_elements[@]}"; do
    if grep -q "id=\"$element\"" "$WORKSPACE_DIR/index.html"; then
        report_success "Element #$element exists"
    else
        report_error "Element #$element not found in HTML"
    fi
done

if grep -q "include('js-validation')" "$WORKSPACE_DIR/index.html"; then
    report_success "Validation script included in index.html"
else
    report_error "Validation script not included in index.html"
fi

# Check that menu buttons have proper onclick handlers
if grep -q "onclick=\"showView('insights-team-performance-view')\"" "$WORKSPACE_DIR/index.html"; then
    report_success "Team Performance button has correct onclick"
else
    report_error "Team Performance button onclick incorrect or missing"
fi

if grep -q "onclick=\"showView('insights-offensive-leaders-view')\"" "$WORKSPACE_DIR/index.html"; then
    report_success "Offensive Leaders button has correct onclick"
else
    report_error "Offensive Leaders button onclick incorrect or missing"
fi

if grep -q "onclick=\"showView('insights-defensive-wall-view')\"" "$WORKSPACE_DIR/index.html"; then
    report_success "Defensive Wall button has correct onclick"
else
    report_error "Defensive Wall button onclick incorrect or missing"
fi

echo ""
echo "🔍 Checking render function calls in showView..."

# Check that showView has render calls for the insight views
if grep -q "renderNewInsightsDashboard()" "$WORKSPACE_DIR/js-navigation.html"; then
    report_success "renderNewInsightsDashboard called in showView"
else
    report_error "renderNewInsightsDashboard not called in showView"
fi

if grep -q "renderInsightsOffensiveLeaders()" "$WORKSPACE_DIR/js-navigation.html"; then
    report_success "renderInsightsOffensiveLeaders called in showView"
else
    report_error "renderInsightsOffensiveLeaders not called in showView"
fi

if grep -q "renderInsightsDefensiveWall()" "$WORKSPACE_DIR/js-navigation.html"; then
    report_success "renderInsightsDefensiveWall called in showView"
else
    report_error "renderInsightsDefensiveWall not called in showView"
fi

echo ""
echo "🔍 Checking development principles compliance..."

# Check if DEVELOPMENT-PRINCIPLES.md exists and has been read recently
if [ -f "$WORKSPACE_DIR/docs/DEVELOPMENT-PRINCIPLES.md" ]; then
    report_success "DEVELOPMENT-PRINCIPLES.md exists"
    
    # Check if it was modified in the last 24 hours (indicating recent review)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        last_modified=$(stat -f "%m" "$WORKSPACE_DIR/docs/DEVELOPMENT-PRINCIPLES.md")
    else
        # Linux
        last_modified=$(stat -c "%Y" "$WORKSPACE_DIR/docs/DEVELOPMENT-PRINCIPLES.md")
    fi
    current_time=$(date +%s)
    time_diff=$((current_time - last_modified))
    
    if [ $time_diff -lt 86400 ]; then # 24 hours in seconds
        report_success "DEVELOPMENT-PRINCIPLES.md reviewed recently"
    else
        report_warning "DEVELOPMENT-PRINCIPLES.md not reviewed in last 24 hours"
    fi
else
    report_error "DEVELOPMENT-PRINCIPLES.md not found"
fi

echo ""
echo "🔍 Checking changelog and version..."

# Check if CHANGELOG.md exists and has recent entries
if [ -f "$WORKSPACE_DIR/CHANGELOG.md" ]; then
    report_success "CHANGELOG.md exists"
    
    # Check if there's an unreleased section or recent version
    if grep -q "## \[Unreleased\]" "$WORKSPACE_DIR/CHANGELOG.md" || grep -q "## v[0-9]" "$WORKSPACE_DIR/CHANGELOG.md"; then
        report_success "CHANGELOG.md has version entries"
    else
        report_error "CHANGELOG.md missing version entries"
    fi
    
    # Get the latest version from changelog
    latest_changelog_version=$(grep -o "## v[0-9]*" "$WORKSPACE_DIR/CHANGELOG.md" | head -1 | sed 's/## v//')
    
    # Get version from Code.js
    code_version=$(grep -o "appVersion = '[0-9]*\.[0-9]*'" "$WORKSPACE_DIR/Code.js" | sed "s/appVersion = '//" | sed "s/'//")
    
    # Check if changelog has been updated recently (within last hour)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        changelog_modified=$(stat -f "%m" "$WORKSPACE_DIR/CHANGELOG.md")
    else
        # Linux
        changelog_modified=$(stat -c "%Y" "$WORKSPACE_DIR/CHANGELOG.md")
    fi
    
    changelog_diff=$((current_time - changelog_modified))
    if [ $changelog_diff -lt 3600 ]; then # 1 hour in seconds
        report_success "CHANGELOG.md updated recently"
    else
        report_warning "CHANGELOG.md not updated in last hour - please add deployment notes"
    fi
else
    report_error "CHANGELOG.md not found"
fi

# Basic syntax check - look for common syntax issues
if grep -n "console\.log(" "$WORKSPACE_DIR/js-navigation.html" | grep -v ");" | head -3 | grep -q "console"; then
    report_warning "Possible unclosed console.log statements found"
fi

# Check for unmatched braces (very basic check)
nav_js=$(cat "$WORKSPACE_DIR/js-navigation.html" | grep -v "^[[:space:]]*//" | grep -o "[{}]" | wc -l)
if [ $((nav_js % 2)) -ne 0 ]; then
    report_warning "Possible unmatched braces in js-navigation.html"
else
    report_success "Brace matching looks good in js-navigation.html"
fi

echo ""
echo "📊 Validation Summary"
echo "===================="

if [ $ERRORS_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed! Ready for deployment.${NC}"
    echo ""
    echo "To deploy, run:"
    echo "  ./scripts/quick-deploy.sh \"Description of changes\""
    exit 0
else
    echo -e "${RED}🚫 $ERRORS_FOUND critical issues found. Please fix before deploying.${NC}"
    exit 1
fi