# HGNC WebApp Testing & Deployment Guide

## Overview
This guide explains the improved testing and deployment workflow that helps catch issues before they reach production.

## Available Scripts

### 1. Pre-Deployment Validation (`./scripts/pre-deploy-check.sh`)
Runs static analysis checks on your code before deployment:
- ✅ Git status checks (detects uncommitted changes)
- ✅ File structure validation
- ✅ Function definition checks
- ✅ JavaScript include verification (all 7 modules)
- ✅ Server-side function validation (7 critical functions)
- ✅ HTML structure tag balance checking
- ✅ Version consistency (Code.js vs CHANGELOG)
- ✅ .claspignore configuration validation
- ✅ package.json and dependencies verification
- ✅ Syntax checking (brace matching across all JS files)

**Usage:**
```bash
./scripts/pre-deploy-check.sh
```

### 2. Basic Smoke Test (`./scripts/runtime-check.js`)
Automated testing that runs after deployment to verify:
- ✅ All 4 insight cards render correctly
- ✅ Team Performance view renders with data
- ✅ Player Analysis asset loading
- ✅ Ladder view renders with proper structure
- ✅ Team edit UI visibility and modal behavior
- ✅ Owner-mode functionality (if enabled)
- ✅ Image/asset validation (no broken base64)
- ✅ Critical DOM elements presence

**Auto-runs during:** `./scripts/efficient-deploy.sh`

**Manual usage:**
```bash
node ./scripts/runtime-check.js
```

### 3. Extended Smoke Test (`./scripts/extended-smoke-test.js`)
Comprehensive testing covering:
- **Navigation**: Tests hash-based view routing (Team List, Players, Games, Ladder)
- **Dark Mode**: Checks CSS variables and dark mode toggle support
- **Persistence**: Validates localStorage, sessionStorage, IndexedDB availability
- **Forms**: Counts form fields and validation attributes
- **Accessibility**: ARIA labels, headings, buttons, images with alt text
- **Performance**: Measures page load time and DOM ready time
- **Critical Functions**: Verifies 6 core functions are available
- **Cache Busting**: Validates version consistency for cache invalidation
- **Error Handling**: Checks for error containers and appState object

**Auto-runs during:** `./scripts/efficient-deploy.sh` (after basic smoke test)

**Manual usage:**
```bash
node ./scripts/extended-smoke-test.js
```

**Output example:**
```
📍 TEST 1: Navigation Between Views ✅/⚠️/ℹ️
🌙 TEST 2: Dark Mode Support ✅/⚠️/ℹ️
💾 TEST 3: Data Persistence ✅/⚠️/ℹ️
📝 TEST 4: Form Elements ✅/⚠️/ℹ️
♿ TEST 5: Accessibility Basics ✅/⚠️/ℹ️
⚡ TEST 6: Performance Metrics ✅/⚠️/ℹ️
🔧 TEST 7: Critical Functions ✅/⚠️/ℹ️
🔄 TEST 8: Cache Busting ✅/⚠️/ℹ️
⚠️  TEST 9: Error Handling ✅/⚠️/ℹ️
```

### 4. Specialized Test Suite (Comprehensive Testing)

The following specialized test scripts validate specific functionality in depth:

#### 4a. CRUD Operations Testing (`./scripts/crud-test.js`)
Tests Create, Read, Update, Delete operations:
- ✅ Add Team functionality
- ✅ Add Player functionality
- ✅ Edit Team functionality
- ✅ Form validation in CRUD operations
- ✅ Data persistence after operations

**Manual usage:**
```bash
node ./scripts/crud-test.js
```

#### 4b. Form Validation Testing (`./scripts/form-validation-test.js`)
Comprehensive form validation coverage:
- ✅ Required field enforcement
- ✅ Field length validation
- ✅ Type and format validation
- ✅ Error message display
- ✅ Submit button state management
- ✅ Real-time validation feedback

**Manual usage:**
```bash
node ./scripts/form-validation-test.js
```

#### 4c. Error Recovery Testing (`./scripts/error-recovery-test.js`)
Tests error handling and graceful failure:
- ✅ Missing data handling
- ✅ Invalid input recovery
- ✅ Error fallback display
- ✅ Network resilience
- ✅ Error logging
- ✅ Graceful degradation

**Manual usage:**
```bash
node ./scripts/error-recovery-test.js
```

#### 4d. Performance Testing (`./scripts/performance-test.js`)
Measures performance with various metrics:
- ✅ Team list rendering performance
- ✅ Player list performance
- ✅ Scrolling performance (60 FPS capable?)
- ✅ Memory usage monitoring
- ✅ DOM operation performance
- ✅ Network payload size estimation

**Manual usage:**
```bash
node ./scripts/performance-test.js
```

#### 4e. Keyboard Navigation Testing (`./scripts/keyboard-nav-test.js`)
Verifies keyboard accessibility:
- ✅ Tab navigation through forms
- ✅ Enter key form submission
- ✅ Escape key modal closing
- ✅ Arrow key list navigation
- ✅ Focus management
- ✅ Keyboard shortcuts

**Manual usage:**
```bash
node ./scripts/keyboard-nav-test.js
```

#### 4f. Mobile Responsiveness Testing (`./scripts/mobile-test.js`)
Tests mobile compatibility at 375px viewport:
- ✅ Viewport and layout responsiveness
- ✅ Touch interaction support
- ✅ Tap target sizes (44x44px minimum)
- ✅ Font size and readability
- ✅ Mobile form usability
- ✅ Mobile web app features

**Manual usage:**
```bash
node ./scripts/mobile-test.js
```

#### 4g. Search & Filter Testing (`./scripts/search-filter-test.js`)
Validates search and filter functionality:
- ✅ Search input detection
- ✅ Real-time filtering
- ✅ Case-insensitive search
- ✅ Multi-field search support
- ✅ Filter controls
- ✅ Search performance

**Manual usage:**
```bash
node ./scripts/search-filter-test.js
```

### 5. Integration Test Suite (`./scripts/integration-test.js`)
Runs all 7 specialized tests in sequence and provides comprehensive summary:
- Orchestrates CRUD, form validation, error recovery, performance, keyboard, mobile, and search tests
- Provides pass/fail/skip tracking
- Generates coverage metrics
- Returns appropriate exit codes for CI/CD integration

**Manual usage:**
```bash
node ./scripts/integration-test.js
```

**Output summary:**
```
✅ PASSED (7):
   • CRUD Operations (25.3s)
   • Form Validation (22.1s)
   • Error Recovery (19.8s)
   • Performance (28.5s)
   • Keyboard Navigation (18.2s)
   • Mobile Responsiveness (21.4s)
   • Search & Filter (17.6s)

📊 COVERAGE METRICS:
   Passed: 7/7 (100%)
   Failed: 0/7 (0%)
   Skipped: 0/7 (0%)
```

### 6. Comprehensive Testing & Deployment (`./scripts/efficient-deploy.sh`)
Canonical deploy pipeline. Runs pre-push, versions, deploys, then executes runtime smoke, extended smoke, and full integration suite. Supports `--skip-smoke` and `--dry-run`.

**Usage:**
```bash
./scripts/efficient-deploy.sh "Description of your changes"
```

### 5. Runtime Validation (Browser Console)
When testing in the browser, use these console commands:

```javascript
// Run all validation checks
AppValidator.runAllChecks()

// Check if critical DOM elements exist
AppValidator.checkCriticalElements()

// Check if required functions are defined
AppValidator.checkCriticalFunctions()

// Test insights navigation structure
AppValidator.testInsightsNavigation()

// Check data availability
AppValidator.checkDataAvailability()
```

## Workflow Recommendations

### For Small Changes
1. Make your code changes
2. Run: `./scripts/pre-deploy-check.sh`
3. If validation passes: `./scripts/efficient-deploy.sh "Your description"`
4. Test in browser

### For Major Changes
1. Make your code changes
2. Run: `./scripts/pre-deploy-check.sh`
3. Deploy via: `./scripts/efficient-deploy.sh "Your description"`
4. Test thoroughly in browser using console validation commands

### During Browser Testing
1. Open browser developer tools (F12)
2. Check console for automatic validation messages on page load
3. Test the specific functionality you changed
4. Use `AppValidator.runAllChecks()` to verify everything is working
5. If issues found, use specific validation functions to debug

## What Gets Checked

### Pre-Deployment Validation
- **File Structure**: All required HTML/JS files present
- **Functions**: Critical functions are defined
- **HTML Elements**: Key DOM elements exist
- **Navigation**: Button onclick handlers are correct
- **Render Calls**: Views call their render functions
- **Development Principles**: Checks if DEVELOPMENT-PRINCIPLES.md has been reviewed recently
- **Changelog**: Verifies CHANGELOG.md is updated and version numbers match Code.js
- **Basic Syntax**: Brace matching and common syntax issues

### Runtime Validation
- **DOM Elements**: Critical elements exist at runtime
- **Functions**: Required functions available globally
- **Navigation**: View structures are correct
- **Data**: Required data objects are available

## Removed Legacy Scripts
- `scripts/quick-deploy.sh` (removed) → use `scripts/efficient-deploy.sh`
- `scripts/test-and-deploy.sh` (removed) → use `scripts/efficient-deploy.sh`
- `scripts/deploy_and_test.sh` (removed) → use `scripts/efficient-deploy.sh`
- `scripts/release.sh` (removed) → manage releases via `CHANGELOG.md` + git tags and deploy with `efficient-deploy.sh`

## Common Issues Caught

### ❌ Missing Function Definitions
```
ERROR: renderNewInsightsDashboard function not found
```
**Fix**: Check that the function is defined in the correct file.

### ❌ Missing HTML Elements
```
ERROR: Element #insights-team-performance-view not found
```
**Fix**: Add the missing element to `index.html`.

### ❌ Incorrect onclick Handlers
```
ERROR: Team Performance button onclick incorrect or missing
```
**Fix**: Update the onclick attribute in the menu card.

### ❌ Render Functions Not Called
```
ERROR: renderNewInsightsDashboard not called in showView
```
**Fix**: Add the render call to the appropriate case in `showView()`.

## Tips for Better Testing

1. **Always run validation before deploying**
2. **Check browser console on page load** for automatic validation
3. **Use specific validation functions** when debugging issues
4. **Test navigation flows** after making changes
5. **Verify data loading** works correctly

## Troubleshooting

### Validation Passes But App Still Broken
- Check browser console for runtime errors
- Use `AppValidator.checkDataAvailability()` to verify data loaded
- Test specific functions manually in console

### Validation Fails But Code Looks Correct
- Check file paths in the validation script
- Verify grep patterns match your code style
- Check for typos in function/element names

### Need More Detailed Logging
Add temporary console.log statements in your render functions:
```javascript
console.log('Rendering view:', viewId, 'with data:', data);
```