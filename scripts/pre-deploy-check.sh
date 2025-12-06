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

# Flags
AUTO_FIX_DOCS=false

for arg in "$@"; do
    case "$arg" in
        --fix-docs)
            AUTO_FIX_DOCS=true
            ;;
    esac
done

if [ "$AUTO_FIX_DOCS" = true ]; then
    echo "🛠️  Auto-fix enabled: documentation files will be moved into expected folders when possible"
fi

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

echo "🔍 Checking git status..."
# Warn if there are uncommitted changes
uncommitted=$(git status --porcelain 2>/dev/null | grep -v "^?" | wc -l)
if [ "$uncommitted" -gt 0 ]; then
    report_warning "Found $uncommitted uncommitted changes. Consider committing before deploying."
    git status --porcelain 2>/dev/null | grep -v "^?" | sed 's/^/  /'
else
    report_success "No uncommitted changes (working directory clean)"
fi

echo ""
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
    "Code.js"
    ".claspignore"
)

for file in "${required_files[@]}"; do
    if [ -f "$WORKSPACE_DIR/$file" ]; then
        report_success "$file exists"
    else
        report_error "$file missing"
    fi
done

echo ""
echo "🔍 Checking JavaScript include() statements..."

# Define all expected includes
expected_includes=(
    "styles"
    "js-startup"
    "js-navigation"
    "js-helpers"
    "js-server-comms"
    "js-core-logic"
    "js-render"
    "js-validation"
)

for include_name in "${expected_includes[@]}"; do
    if grep -q "<?!=.*include('$include_name')" "$WORKSPACE_DIR/index.html"; then
        report_success "include('$include_name') found in index.html"
    else
        report_error "include('$include_name') NOT found in index.html - file won't be included in template"
    fi
done

echo ""
echo "🔍 Checking Code.js server-side functions..."

# Check for critical server-side functions that provide icon data URLs
server_functions=(
    "doGet"
    "getLogoDataUrl"
    "getTeamPerformanceIconDataUrl"
    "getOffensiveLeadersIconDataUrl"
    "getDefensiveWallIconDataUrl"
    "getPlayerAnalysisIconDataUrl"
    "getSpreadsheet"
)

for func in "${server_functions[@]}"; do
    if grep -q "function $func(" "$WORKSPACE_DIR/Code.js"; then
        report_success "Code.js has function: $func()"
    else
        report_error "Code.js missing function: $func() - server-side functionality incomplete"
    fi
done

echo ""
echo "🔍 Checking HTML structure for tag balance..."

# Count opening and closing tags for critical elements
closing_view_tag=$(grep -c "</div><!-- End insights-view -->" "$WORKSPACE_DIR/index.html" || echo "0")
opening_view_tag=$(grep -c "id=\"insights-view\"" "$WORKSPACE_DIR/index.html" || echo "0")

if [ "$closing_view_tag" -eq "$opening_view_tag" ] && [ "$opening_view_tag" -gt 0 ]; then
    report_success "insights-view has proper opening and closing tags"
else
    report_error "insights-view tag mismatch: found $opening_view_tag opening tags but $closing_view_tag closing tags (should be equal)"
fi

# Check for common HTML structure issues
if grep -q "<div id=\"main-content\">" "$WORKSPACE_DIR/index.html"; then
    closing_main=$(grep -c "</div><!-- End main-content -->" "$WORKSPACE_DIR/index.html" || grep -c "id=\"main-content\"" "$WORKSPACE_DIR/index.html" || echo "0")
    if [ "$closing_main" -gt 0 ]; then
        report_success "main-content container properly structured"
    else
        report_warning "main-content opening found but closing tag unclear - verify HTML structure"
    fi
else
    report_warning "main-content container not found - verify index.html structure"
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
echo "📦 Checking dependencies and configuration..."

# Check package.json
if [ -f "$WORKSPACE_DIR/package.json" ]; then
    report_success "package.json exists"
    
    # Check if node_modules is installed
    if [ -d "$WORKSPACE_DIR/node_modules" ]; then
        report_success "node_modules directory exists (dependencies may be installed)"
    else
        report_warning "node_modules not found - dependencies may not be installed (run: npm install)"
    fi
    
    # Check for critical devDependencies used in scripts
    if grep -q "@google/clasp" "$WORKSPACE_DIR/package.json"; then
        report_success "package.json has @google/clasp"
    else
        report_warning "package.json missing @google/clasp dependency"
    fi
else
    report_warning "package.json not found - cannot verify dependencies"
fi

# Check if appsscript.json has proper runtime version
if [ -f "$WORKSPACE_DIR/appsscript.json" ]; then
    if grep -q '"runtimeVersion".*"V8"' "$WORKSPACE_DIR/appsscript.json"; then
        report_success "appsscript.json uses V8 runtime (required for modern JS)"
    else
        report_warning "appsscript.json may not be using V8 runtime - check runtimeVersion setting"
    fi
    
    # Check webapp access level
    if grep -q '"access".*"ANYONE_ANONYMOUS"' "$WORKSPACE_DIR/appsscript.json"; then
        report_success "appsscript.json configured for anonymous access (ANYONE_ANONYMOUS)"
    else
        report_warning "appsscript.json webapp access may not be ANYONE_ANONYMOUS - exec URL might require sign-in"
    fi
else
    report_error "appsscript.json not found"
fi

echo ""
echo "📝 Checking documentation and changelog..."

# Check if CHANGELOG.md exists and has recent entries
if [ -f "$WORKSPACE_DIR/docs/CHANGELOG.md" ]; then
    report_success "CHANGELOG.md exists"
    
    # Check if there's an unreleased section or recent version
    if grep -q "## \[Unreleased\]" "$WORKSPACE_DIR/docs/CHANGELOG.md" || grep -q "## v[0-9]" "$WORKSPACE_DIR/docs/CHANGELOG.md"; then
        report_success "CHANGELOG.md has version entries"
    else
        report_error "CHANGELOG.md missing version entries"
    fi
    
    # Check if changelog has been updated recently (within last 2 hours for warning, 24 hours for critical)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        changelog_modified=$(stat -f "%m" "$WORKSPACE_DIR/docs/CHANGELOG.md")
    else
        changelog_modified=$(stat -c "%Y" "$WORKSPACE_DIR/docs/CHANGELOG.md")
    fi
    
    current_time=$(date +%s)
    changelog_diff=$((current_time - changelog_modified))
    
    if [ $changelog_diff -lt 7200 ]; then # 2 hours
        report_success "CHANGELOG.md updated very recently"
    elif [ $changelog_diff -lt 86400 ]; then # 24 hours
        report_warning "CHANGELOG.md not updated in last 2 hours - verify deployment changes are documented"
    else
        report_warning "CHANGELOG.md not updated in last 24 hours - should add recent deployment notes"
    fi
else
    report_error "CHANGELOG.md not found"
fi

echo ""
echo "🔍 Checking version consistency..."

# Get version from Code.js (should be just a number like '824')
code_version=$(grep -o "appVersion = '[0-9]*'" "$WORKSPACE_DIR/Code.js" | sed "s/appVersion = '//" | sed "s/'//")

# Get latest version from CHANGELOG (should be like 'v824')
if [ -f "$WORKSPACE_DIR/docs/CHANGELOG.md" ]; then
    changelog_version=$(grep -o "## v[0-9]*" "$WORKSPACE_DIR/docs/CHANGELOG.md" | head -1 | sed 's/## v//')
    
    if [ -z "$code_version" ]; then
        report_error "Code.js appVersion not found or has invalid format (expected: 'xxx' where xxx is a number)"
    elif [ -z "$changelog_version" ]; then
        report_error "CHANGELOG.md has no version entries (expected: ## vXXX format)"
    elif [ "$code_version" = "$changelog_version" ]; then
        report_success "Version consistency check: Code.js ($code_version) matches CHANGELOG.md (v$changelog_version)"
    else
        report_warning "Version mismatch: Code.js has appVersion='$code_version' but CHANGELOG.md has latest v$changelog_version (should match)"
    fi
else
    report_error "CHANGELOG.md not found - cannot verify version consistency"
fi

echo ""
echo "🔍 Checking .claspignore configuration..."

# Verify .claspignore exists
if [ ! -f "$WORKSPACE_DIR/.claspignore" ]; then
    report_error ".claspignore missing - clasp may push unwanted files"
else
    report_success ".claspignore exists"
    
    # Check that critical files are NOT ignored
    critical_not_ignored=(
        "Code.js"
        "index.html"
        "appsscript.json"
    )
    
    for file in "${critical_not_ignored[@]}"; do
        if grep -q "^$file$" "$WORKSPACE_DIR/.claspignore"; then
            report_error ".claspignore is ignoring $file - this file MUST be pushed to Apps Script"
        else
            report_success ".claspignore does not ignore $file (correct)"
        fi
    done
    
    # Check that unnecessary files ARE ignored
    should_ignore=(
        "docs/"
        "node_modules/"
        "tests/"
        "scripts/"
        ".github/"
    )
    
    for pattern in "${should_ignore[@]}"; do
        if grep -F "$pattern" "$WORKSPACE_DIR/.claspignore" >/dev/null 2>&1; then
            report_success ".claspignore ignores $pattern (correct)"
        else
            report_warning ".claspignore does not ignore $pattern - consider adding it to keep deploy clean"
        fi
    done
fi

# Enhanced syntax checking - check all include files for unmatched braces
echo ""
echo "🔍 Checking syntax in all JavaScript includes..."

js_include_files=(
    "src/includes/js-navigation.html"
    "src/includes/js-render.html"
    "src/includes/js-core-logic.html"
    "src/includes/js-helpers.html"
    "src/includes/js-server-comms.html"
    "src/includes/js-startup.html"
    "src/includes/js-validation.html"
)

for file in "${js_include_files[@]}"; do
    if [ ! -f "$WORKSPACE_DIR/$file" ]; then
        report_error "$file not found (cannot check syntax)"
        continue
    fi
    
    # Count braces (opening and closing)
    opening_braces=$(grep -o "{" "$WORKSPACE_DIR/$file" | wc -l)
    closing_braces=$(grep -o "}" "$WORKSPACE_DIR/$file" | wc -l)
    
    if [ "$opening_braces" -eq "$closing_braces" ]; then
        report_success "$file: brace matching OK ($opening_braces pairs)"
    else
        report_error "$file: brace mismatch - found $opening_braces { but $closing_braces } (difference: $((opening_braces - closing_braces)))"
    fi
    
    # Check for console.log statements that might be debug code
    debug_logs=$(grep -n "console\.log(" "$WORKSPACE_DIR/$file" | grep -v "console\.log.*message\|console\.log.*error\|console\.log.*warning" | head -3 || true)
    if [ -n "$debug_logs" ]; then
        report_warning "$file may contain debug console.log statements (first 3): $(echo "$debug_logs" | cut -d: -f1 | paste -sd',' -)"
    fi
done

# Check for console.error/log in Code.js (server-side, should use Logger.log instead)
if grep -q "console\.log\|console\.error" "$WORKSPACE_DIR/Code.js"; then
    report_warning "Code.js contains console.log/error statements (these are ignored in server-side code; use Logger.log instead)"
fi

echo ""
echo "🎯 CDN and Asset Verification"
# Warn if any jsDelivr references still use @master - recommend to pin to a tag or commit
master_refs=$(git grep -n "cdn.jsdelivr.net/gh/caseytoll/hgnc-webapp@master" | grep -v "scripts/pre-deploy-check.sh" || true)
if [ -n "$master_refs" ]; then
    report_error "Found jsDelivr CDN references using @master; pin to a tag or commit for immutability:\n$master_refs"
else
    report_success "CDN references appear pinned (no @master references)"
fi

echo ""
echo "📁 Documentation Organization Check"

# Map documentation file names to their expected subfolders under docs/
doc_target_dir() {
    case "$1" in
        QUICK_REFERENCE.md|DEVELOPMENT-PRINCIPLES.md|CONTRIBUTING.md)
            echo "getting-started" ;;
        TESTING_README.md|SPECIALIZED_TESTING.md|SMOKE_TEST_COVERAGE.md|SMOKE_TEST_RESULTS.md|TEST_SUITE_COMPLETION.md|IMPLEMENTATION_CHECKLIST.md)
            echo "testing" ;;
        CI_DEPLOY.md|DEPLOYMENT_READY.md|DEPLOYMENT_COMPLETE.md|RELEASE_NOTES_v243.md)
            echo "deployment" ;;
        ARCHIVE_POLICY.md|CODE_CLEANUP_2025_12_07.md|DEBUGGING_STRATEGY.md|FEATURE_BUG_STATUS.md|PROJECT_STATUS_SUMMARY.md|PR_FIX_INSIGHTS.md|VISUAL_PROJECT_OVERVIEW.md)
            echo "operations" ;;
        POST_MORTEM_2025_12_06.md|REVIEW_SUMMARY.md|SESSION_SUMMARY.md|FINAL_IMPLEMENTATION_REPORT.md)
            echo "postmortems" ;;
        ICON_IMAGES_STANDARDIZATION.md)
            echo "standards" ;;
        CHANGELOG.md|DOCUMENTATION_INDEX.md)
            echo "ROOT" ;;
        *)
            echo "" ;;
    esac
}

move_doc_file() {
    local src_file="$1"
    local filename="$2"
    local target_dir="$3"
    mkdir -p "$WORKSPACE_DIR/docs/$target_dir"
    mv "$src_file" "$WORKSPACE_DIR/docs/$target_dir/$filename"
    report_success "Moved $filename -> docs/$target_dir/ (auto-fix)"
}

# Check that documentation files are in docs/ folder, not root
root_doc_files=$(ls -1 "$WORKSPACE_DIR"/*.md 2>/dev/null | grep -vE "^.*README\.md$" || true)
if [ -n "$root_doc_files" ]; then
    echo "$root_doc_files" | while read -r docfile; do
        [ -z "$docfile" ] && continue
        filename=$(basename "$docfile")
        target_dir=$(doc_target_dir "$filename")
        if [ "$AUTO_FIX_DOCS" = true ] && [ -n "$target_dir" ] && [ "$target_dir" != "ROOT" ]; then
            move_doc_file "$docfile" "$filename" "$target_dir"
        else
            report_error "Found documentation file in root: $filename (should be under docs/)"
        fi
    done
else
    report_success "All documentation files properly organized in docs/ folder"
fi

echo ""
echo "📑 Documentation Index Consistency"
# Ensure only allowed markdown files live at docs/ root
allowed_root_docs=("CHANGELOG.md" "DOCUMENTATION_INDEX.md")
root_docs=$(find "$WORKSPACE_DIR/docs" -maxdepth 1 -type f -name "*.md" -printf "%f\n" 2>/dev/null)
for doc in $root_docs; do
    if [[ ! " ${allowed_root_docs[*]} " =~ " $doc " ]]; then
        target_dir=$(doc_target_dir "$doc")
        if [ "$AUTO_FIX_DOCS" = true ] && [ -n "$target_dir" ] && [ "$target_dir" != "ROOT" ]; then
            move_doc_file "$WORKSPACE_DIR/docs/$doc" "$doc" "$target_dir"
        else
            report_error "Unexpected doc at docs/ root: $doc (move into a category subfolder)"
        fi
    fi
done

# Required documentation subfolders that should exist
required_doc_dirs=("getting-started" "testing" "deployment" "operations" "postmortems" "standards")
for dir in "${required_doc_dirs[@]}"; do
    if [ -d "$WORKSPACE_DIR/docs/$dir" ]; then
        report_success "docs/$dir present"
    else
        report_error "Missing docs/$dir directory (create or adjust DOCUMENTATION_INDEX.md layout)"
    fi
done

# Verify DOCUMENTATION_INDEX.md references the doc subfolders (helps keep index aligned)
index_file="$WORKSPACE_DIR/docs/DOCUMENTATION_INDEX.md"
if [ -f "$index_file" ]; then
    missing_refs=()
    for dir in "${required_doc_dirs[@]}"; do
        if ! grep -q "${dir}/" "$index_file"; then
            missing_refs+=("$dir/")
        fi
    done
    if [ ${#missing_refs[@]} -gt 0 ]; then
        report_warning "DOCUMENTATION_INDEX.md missing references to: ${missing_refs[*]} (update folder layout section)"
    else
        report_success "DOCUMENTATION_INDEX.md references all expected doc subfolders"
    fi
else
    report_error "docs/DOCUMENTATION_INDEX.md not found"
fi

echo ""
echo "📊 Final Validation Summary"
echo "============================"

echo ""
echo "📊 Final Validation Summary"
echo "============================"

if [ $ERRORS_FOUND -eq 0 ]; then
    echo -e "${GREEN}🎉 All critical checks passed! Ready for deployment.${NC}"
    echo ""
    echo "✅ Next steps:"
    echo "  1. Review all warnings above (if any)"
    echo "  2. Commit any changes: git add -A && git commit -m 'v{X} - description'"
    echo "  3. Deploy: ./scripts/efficient-deploy.sh \"Description of changes\""
    echo ""
    exit 0
else
    echo -e "${RED}🚫 $ERRORS_FOUND critical issues found. Please fix before deploying.${NC}"
    echo ""
    echo "❌ Issues to fix:"
    echo "  • Review all ERROR messages above"
    echo "  • Fix each issue and re-run this script"
    echo "  • Do not deploy until all errors are resolved"
    echo ""
    exit 1
fi