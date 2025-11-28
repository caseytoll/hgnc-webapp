# HGNC WebApp Testing & Deployment Guide

## Overview
This guide explains the improved testing and deployment workflow that helps catch issues before they reach production.

## Available Scripts

### 1. Pre-Deployment Validation (`./scripts/pre-deploy-check.sh`)
Runs static analysis checks on your code before deployment:
- ✅ File structure validation
- ✅ Function definition checks
- ✅ HTML element existence
- ✅ Navigation handler validation
- ✅ Development principles compliance
- ✅ Changelog and version validation
- ✅ Basic syntax checking

**Usage:**
```bash
./scripts/pre-deploy-check.sh
```

### 2. Comprehensive Testing & Deployment (`./scripts/test-and-deploy.sh`)
Combines validation, code quality checks, and deployment in one workflow.

**Usage:**
```bash
./scripts/test-and-deploy.sh "Description of your changes"
```

### 3. Runtime Validation (Browser Console)
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
3. If validation passes: `./scripts/quick-deploy.sh "Your description"`
4. Test in browser

### For Major Changes
1. Make your code changes
2. Run: `./scripts/test-and-deploy.sh "Your description"`
3. Test thoroughly in browser using console validation commands

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