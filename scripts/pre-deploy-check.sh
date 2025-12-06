#!/bin/bash

# === HGNC WebApp Pre-Deployment Validation Script ===
# This script performs static analysis and validation checks before deployment

echo "🔍 HGNC WebApp Pre-Deployment Validation"
echo "========================================"

# Get the directory where this script is located, then go up to repo root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
WORKSPACE_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"
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
    "src/includes/js-navigation.html"
    "src/includes/js-render.html"
    "src/includes/js-core-logic.html"
    "src/includes/js-helpers.html"
    "src/includes/js-server-comms.html"
    "src/includes/js-startup.html"
    "src/includes/js-validation.html"
    "src/styles.html"
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
if grep -q "function showView(" "$WORKSPACE_DIR/src/includes/js-navigation.html"; then
    report_success "showView function defined"
else
    report_error "showView function not found"
fi

    # Warn if debug smoke logger console logs exist in index.html for production
smoke_logs=$(grep -n "SMOKE:" "$WORKSPACE_DIR/index.html" || true)
if [ -n "$smoke_logs" ]; then
    report_warning "Found SMOKE debug logs in index.html. These are gated behind window.DEBUG in the repo and are ok, but consider removing them for production: \n$smoke_logs"
else
    report_success "No SMOKE debug logs found in index.html"
fi

echo ""
echo "🔍 Efficiency checks:"

# Detect any script.googleusercontent.com references in tracked files
legacy_refs=$(git grep -n "script.googleusercontent.com" || true)
if [ -n "$legacy_refs" ]; then
    report_warning "Found legacy script.googleusercontent.com references:\n$legacy_refs"
else
    report_success "No script.googleusercontent.com references found."
fi

# Check for large inline data:image URIs (warn if > 100k chars)
echo "→ Checking for large inline data:image URIs in HTML files (>100k chars)..."
LARGE_LIMIT=100000
for f in $(git ls-files '*.html' | grep -v '^archived_html_backups/' || true); do
    # Extract lines that contain data:image
    while IFS= read -r line; do
        # Get base64 length if data:image found
        # Remove everything before 'data:image' and count characters
        data=$(echo "$line" | sed -n "s/.*\(data:image[^']*\).*/\1/p")
        if [ -n "$data" ]; then
            len=$(echo "$data" | awk '{print length($0)}')
            if [ "$len" -gt $LARGE_LIMIT ]; then
                report_error "Large inline data:image found ($len chars) in $f"
            fi
        fi
    done < <(grep -n "data:image" "$f" || true)
done

report_success "Efficiency checks completed"

# Check for bare base64-encoded SVG tokens used as paths (commonly 'PHN2Zy' sequences)
echo "→ Checking for bare base64 SVG tokens without data: prefix..."
bare_svg_refs=$(git grep -n "PHN2Zy" -- '*.html' || true)
if [ -n "$bare_svg_refs" ]; then
    # Filter out cases where PHN2Zy is inside a proper data: url
    invalid_refs=$(echo "$bare_svg_refs" | grep -v "data:image" || true)
    if [ -n "$invalid_refs" ]; then
        report_error "Found bare base64 SVG tokens (e.g. PHN2Zy) that are not using a 'data:' prefix (these are interpreted as paths and will 404 or fail to decode):\n$invalid_refs"
    else
        report_success "All PHN2Zy tokens are properly prefixed with data:image"
    fi
else
    report_success "No PHN2Zy tokens found in HTML files"
fi

echo "\n→ Checking icon partials for valid content (data: or CDN or local /assets/)"
icon_files=$(git ls-files "*icon-code.html" "player-analysis-icon-code.html" || true)
for f in $icon_files; do
    if [ -f "$WORKSPACE_DIR/$f" ]; then
        content=$(cat "$WORKSPACE_DIR/$f")
        if echo "$content" | grep -q "data:image"; then
            report_success "$f: has data:image"
            continue
        fi
        if echo "$content" | grep -q "https://cdn.jsdelivr.net" || echo "$content" | grep -q "https://" || echo "$content" | grep -q "http://"; then
            report_success "$f: uses CDN/HTTP URLs"
            continue
        fi
        if echo "$content" | grep -q "'/assets/" || echo "$content" | grep -q '"/assets/' || echo "$content" | grep -q "/assets/"; then
            report_success "$f: uses local /assets/ path"
            continue
        fi
        # If it reaches here, fail validation
        report_error "$f: icon partial does not contain valid data:image, CDN URL, or local /assets/ path. Content should be one of the above to ensure cross-client rendering."
    fi
done

# Check for url\('PHN2Zy' occurrences which may indicate a missing data: prefix
url_bare_refs=$(git grep -n "url('PHN2Zy\|url(\"PHN2Zy" -- '*.html' || true)
if [ -n "$url_bare_refs" ]; then
    report_error "Found url('PHN2Zy...') patterns — this indicates a raw base64 string used as a CSS url without data: prefix. Fix by prefixing with data:image/svg+xml;base64,.\n$url_bare_refs"
else
    report_success "No bare url('PHN2Zy') patterns found"
fi

# Detect any inline SVG placeholders for player-analysis icon
if grep -q "data:image/svg+xml" player-analysis-icon-code.html 2>/dev/null; then
    report_warning "player-analysis-icon-code.html contains inline SVG. Consider using CDN/WebP asset fallback instead of inline SVG placeholders."
fi

if grep -q "const renderNewInsightsDashboard" "$WORKSPACE_DIR/src/includes/js-render.html"; then
    report_success "renderNewInsightsDashboard function defined"
else
    report_error "renderNewInsightsDashboard function not found"
fi

if grep -q "const renderInsightsOffensiveLeaders" "$WORKSPACE_DIR/src/includes/js-render.html"; then
    report_success "renderInsightsOffensiveLeaders function defined"
else
    report_error "renderInsightsOffensiveLeaders function not found"
fi

if grep -q "const renderInsightsDefensiveWall" "$WORKSPACE_DIR/src/includes/js-render.html"; then
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
if grep -q "renderNewInsightsDashboard()" "$WORKSPACE_DIR/src/includes/js-navigation.html"; then
    report_success "renderNewInsightsDashboard called in showView"
else
    report_error "renderNewInsightsDashboard not called in showView"
fi

if grep -q "renderInsightsOffensiveLeaders()" "$WORKSPACE_DIR/src/includes/js-navigation.html"; then
    report_success "renderInsightsOffensiveLeaders called in showView"
else
    report_error "renderInsightsOffensiveLeaders not called in showView"
fi

if grep -q "renderInsightsDefensiveWall()" "$WORKSPACE_DIR/src/includes/js-navigation.html"; then
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
if [ -f "$WORKSPACE_DIR/docs/CHANGELOG.md" ]; then
    report_success "CHANGELOG.md exists"
    
    # Check if there's an unreleased section or recent version
    if grep -q "## \[Unreleased\]" "$WORKSPACE_DIR/docs/CHANGELOG.md" || grep -q "## v[0-9]" "$WORKSPACE_DIR/docs/CHANGELOG.md"; then
        report_success "CHANGELOG.md has version entries"
    else
        report_error "CHANGELOG.md missing version entries"
    fi
    
    # Get the latest version from changelog
    latest_changelog_version=$(grep -o "## v[0-9]*" "$WORKSPACE_DIR/docs/CHANGELOG.md" | head -1 | sed 's/## v//')
    
    # Get version from Code.js
    code_version=$(grep -o "appVersion = '[0-9]*'" "$WORKSPACE_DIR/Code.js" | sed "s/appVersion = '//" | sed "s/'//")
    
    # Check if changelog has been updated recently (within last hour)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        changelog_modified=$(stat -f "%m" "$WORKSPACE_DIR/docs/CHANGELOG.md")
    else
        # Linux
        changelog_modified=$(stat -c "%Y" "$WORKSPACE_DIR/docs/CHANGELOG.md")
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
if grep -n "console\.log(" "$WORKSPACE_DIR/src/includes/js-navigation.html" | grep -v ");" | head -3 | grep -q "console"; then
    report_warning "Possible unclosed console.log statements found"
fi

# Check for unmatched braces (very basic check)
nav_js=$(cat "$WORKSPACE_DIR/src/includes/js-navigation.html" | grep -v "^[[:space:]]*//" | grep -o "[{}]" | wc -l)
if [ $((nav_js % 2)) -ne 0 ]; then
    report_warning "Possible unmatched braces in js-navigation.html"
else
    report_success "Brace matching looks good in js-navigation.html"
fi

echo ""
echo "� CDN pinning check"
# Warn if any jsDelivr references still use @master - recommend to pin to a tag or commit
master_refs=$(git grep -n "cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp@master" | grep -v "scripts/pre-deploy-check.sh" || true)
if [ -n "$master_refs" ]; then
    report_error "Found jsDelivr CDN references using @master; pin to a tag or commit for immutability:\n$master_refs"
else
    report_success "CDN references appear pinned (no @master references)"
fi
echo "�📊 Validation Summary"
echo "===================="

if [ $ERRORS_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed! Ready for deployment.${NC}"
    echo ""
    if [ $ERRORS_FOUND -gt 0 ]; then
        report_error "Pre-deploy validation found errors. Check above messages and fix before deploying."
        exit 1
    fi
    echo "To deploy, run:"
    echo "  ./scripts/quick-deploy.sh \"Description of changes\""
    exit 0
else
    echo -e "${RED}🚫 $ERRORS_FOUND critical issues found. Please fix before deploying.${NC}"
    exit 1
fi

# Additional check: ensure appsscript.json 'webapp.access' is set to ANYONE_ANONYMOUS (recommended for public exec URL)
manifest_access=$(grep -o '"access":\s*"[A-Z_]*"' "$WORKSPACE_DIR/appsscript.json" | sed -E 's/.*"([A-Z_]+)".*/\1/' || true)
if [ "$manifest_access" != "ANYONE_ANONYMOUS" ]; then
    report_warning "appsscript.json webapp.access is set to '$manifest_access' (expected: ANYONE_ANONYMOUS). This can cause the exec URL to require Google sign-in after push/deploy. To make it anonymous set webapp.access to ANYONE_ANONYMOUS in appsscript.json or pass --access ANYONE_ANONYMOUS to deployment."
fi