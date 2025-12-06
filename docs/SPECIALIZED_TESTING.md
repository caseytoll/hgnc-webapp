# Specialized Testing Guide - HGNC WebApp

## Overview

Beyond basic smoke testing, the HGNC WebApp includes a comprehensive suite of specialized test scripts that validate specific functionality areas in depth. These tests catch issues that traditional smoke tests might miss.

## Test Categories

### 1. CRUD Operations Testing
**File:** `scripts/crud-test.js`

Tests the application's ability to create, read, update, and delete data:
- Adding teams with proper form submission
- Adding players to teams
- Editing team information
- Form validation during CRUD operations
- Data persistence after modifications

**Typical Issues Caught:**
- Form fields not clearing after submission
- Modal not closing after successful operation
- Data not being saved to storage
- Validation not preventing invalid submissions
- Owner-mode permissions not working correctly

**Run it:** `node ./scripts/crud-test.js`

**Expected Results:** 5 test scenarios passing, all data modifications persisting

---

### 2. Form Validation Testing
**File:** `scripts/form-validation-test.js`

Ensures form validation works correctly across all user input scenarios:
- Required field enforcement (team name, player name, jersey number)
- Field length validation (minimum/maximum character limits)
- Type and format validation (number inputs, email inputs)
- Error message display and clearing
- Submit button enable/disable state management
- Real-time validation feedback during typing

**Typical Issues Caught:**
- Required field validation not enforced
- No visual error feedback for invalid inputs
- Button enabled when form is invalid
- Field length limits not enforced
- Type validation allowing invalid data
- Error messages not clearing when fixed

**Run it:** `node ./scripts/form-validation-test.js`

**Expected Results:** 6 validation test categories passing

---

### 3. Error Recovery Testing
**File:** `scripts/error-recovery-test.js`

Validates the application handles errors gracefully:
- Missing data handling (empty lists, null values)
- Invalid input recovery (special characters, extremely long input)
- Error fallback display (placeholder text, default values)
- Network resilience (error handlers, timeout management)
- Error logging and monitoring
- Graceful degradation (core functionality still works with errors)

**Typical Issues Caught:**
- App crashes on missing data
- No error messages shown to user
- Invalid input causes unhandled exceptions
- Network errors cause infinite loading states
- Silent failures without logging
- Core features break when secondary features fail

**Run it:** `node ./scripts/error-recovery-test.js`

**Expected Results:** 6 error scenario test categories passing

---

### 4. Performance Testing
**File:** `scripts/performance-test.js`

Measures performance and identifies bottlenecks:
- Team list rendering time and DOM size
- Player list rendering and virtualization efficiency
- Scrolling performance (60 FPS capability)
- Memory usage (heap size, layout operations)
- DOM operation performance (creation, appending, querying)
- Network payload size (in-memory data)

**Typical Issues Caught:**
- Slow rendering with large datasets
- Memory leaks (heap size growing)
- Jank during scrolling (< 60 FPS)
- Inefficient DOM operations
- Large payload sizes
- No virtualization for long lists

**Run it:** `node ./scripts/performance-test.js`

**Targets:**
- Scroll performance: < 16ms (60 FPS capable)
- DOM operations: < 50ms
- Memory usage: < 80% of heap
- Team list: < 1000 teams manageable

---

### 5. Keyboard Navigation Testing
**File:** `scripts/keyboard-nav-test.js`

Ensures the application is fully keyboard accessible:
- Tab navigation through form fields
- Enter key submitting forms
- Escape key closing modals
- Arrow keys navigating lists
- Focus management and visual focus indicators
- Keyboard shortcuts

**Typical Issues Caught:**
- No tab order defined
- Can't submit forms with Enter key
- Can't close modals with Escape key
- No visual focus indicator
- Can't navigate lists with arrow keys
- Focus trapped in modal, can't escape

**Run it:** `node ./scripts/keyboard-nav-test.js`

**Accessibility Standards Met:**
- WCAG 2.1 Level A keyboard navigation
- Tab order is logical and visible
- All interactive elements reachable via keyboard

---

### 6. Mobile Responsiveness Testing
**File:** `scripts/mobile-test.js`

Tests the application on mobile devices (375px viewport):
- Viewport responsiveness (no horizontal overflow)
- Touch interaction support
- Tap target sizes (minimum 44x44px per mobile standards)
- Font size and readability (minimum 16px for mobile)
- Mobile form usability and input types
- Mobile web app features (manifest, icons, PWA)

**Typical Issues Caught:**
- Horizontal scrolling on narrow screens
- Tap targets too small (< 44px)
- Text too small to read on mobile (< 16px)
- Forms not optimized for touch
- No viewport meta tag
- Poor mobile web app features

**Run it:** `node ./scripts/mobile-test.js`

**Mobile Standards Met:**
- No horizontal overflow at 375px
- All buttons >= 44x44px
- Primary text >= 16px
- Proper tap targets for touch
- Responsive layout below 768px breakpoint

---

### 7. Search & Filter Testing
**File:** `scripts/search-filter-test.js`

Validates search and filter functionality:
- Search input detection and usability
- Real-time filtering as user types
- Case-insensitive search matching
- Multi-field search support (searching multiple data fields)
- Filter and sort controls
- Search performance with keystroke timing

**Typical Issues Caught:**
- No search input present
- Search not filtering results
- Case sensitivity issues
- Search only works on one field
- Slow search response (lag while typing)
- Results don't clear when search clears

**Run it:** `node ./scripts/search-filter-test.js`

**Performance Targets:**
- Search response: < 100ms (immediate feel)
- Large dataset search: < 300ms

---

## Integration Test Suite

**File:** `scripts/integration-test.js`

Orchestrates all 7 specialized tests and provides comprehensive reporting:

```bash
node ./scripts/integration-test.js
```

**Output includes:**
- Pass/fail status for each test
- Execution time for each test
- Summary statistics (passed, failed, skipped counts)
- Coverage metrics (% of tests passed)
- Test categories covered
- Overall deployment readiness

**Typical Output:**
```
✅ PASSED (7):
   • CRUD Operations (25.3s)
   • Form Validation (22.1s)
   • Error Recovery (19.8s)
   • Performance (28.5s)
   • Keyboard Navigation (18.2s)
   • Mobile Responsiveness (21.4s)
   • Search & Filter (17.6s)

❌ FAILED (0):
   (none)

📊 COVERAGE METRICS:
   Passed: 7/7 (100%)
   Failed: 0/7 (0%)
   Skipped: 0/7 (0%)

✅ ALL TESTS PASSED - Application ready for deployment!
```

---

## Deployment Integration

The specialized tests are automatically run during deployment:

```bash
./scripts/efficient-deploy.sh "v827 - Add specialized tests"
```

**Deployment Test Flow:**
1. Pre-deployment validation (static checks)
2. Deploy to production
3. Basic smoke test (critical elements)
4. Extended smoke test (navigation, dark mode, etc.)
5. **Integration test suite (7 specialized tests)** ← NEW

**Non-critical Tests:**
The integration test suite runs as non-critical (won't fail deployment), allowing visibility into test results without blocking deployment. Review test results to catch issues before they affect users.

---

## When to Run Each Test

### Daily Development
- Run `CRUD operations` after changing data operations
- Run `Form validation` after modifying forms
- Run `Search & filter` after changing search logic

### Before Committing
- Run `Error recovery` to catch unhandled exceptions
- Run `Keyboard navigation` to ensure accessibility

### Before Deployment
- Run `Performance` to catch slow downs
- Run `Mobile responsiveness` to verify mobile support
- Run `Integration test suite` for comprehensive validation

### During Debugging
- Run individual test to isolate issues
- Check test output for specific failure points
- Use `APP_URL` environment variable to test against staging

---

## Test Output Interpretation

### Status Indicators
- ✅ **Pass**: Test criteria met
- ⚠️ **Warning**: Potential issue or missing feature
- ℹ️ **Info**: Feature not found (may be intentional)

### Example Output
```
✅ TEST 1: Tab Navigation in Add Team Form
Found 8 interactive elements
  1. text - team-name (tabIndex: 0)
  2. text - team-tier (tabIndex: 0)
  ... and 6 more
✅ Tab order detected

🔑 TEST 2: Enter Key Form Submission
Form element found: ✅
Event listeners: ✅
Submit data attributes: ✅
✅ Enter key submission likely supported
```

---

## Configuring Tests

### Environment Variables
```bash
# Run tests against specific URL
export APP_URL="https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"
node ./scripts/integration-test.js

# Specify Puppeteer Chrome path
export PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
node ./scripts/crud-test.js
```

### Test Timeouts
Each specialized test has a 2-minute timeout (adjustable in integration-test.js):
```bash
{ name: 'CRUD Operations', file: 'crud-test.js', timeout: 120000 },
```

---

## Troubleshooting Test Failures

### Test runs but reports no results
- Check browser automation is working (Puppeteer/Chrome)
- Verify APP_URL environment variable
- Check network access to deployed app

### Test times out
- Increase timeout value in integration-test.js
- Check application performance
- Verify network connectivity

### Test reports wrong metrics
- Verify expected element selectors exist in HTML
- Check CSS class names match test expectations
- Review app HTML structure for changes

---

## Adding New Tests

To create a new specialized test:

1. Create new file: `scripts/[name]-test.js`
2. Use Puppeteer for browser automation
3. Launch browser, navigate to APP_URL
4. Test specific functionality
5. Output structured results with emoji status
6. Exit with code 0 (pass) or 1 (fail)
7. Add to integration-test.js TESTS array

**Template:**
```javascript
const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const APP_URL = process.env.APP_URL || 'https://...';
    const browser = await puppeteer.launch({...});
    const page = await browser.newPage();
    
    // Your tests here
    
    await browser.close();
    process.exit(0);
  } catch (e) {
    console.error('❌ Test failed:', e);
    process.exit(1);
  }
})();
```

---

## Test Coverage Summary

| Test | Coverage | Categories |
|------|----------|------------|
| CRUD | Data Operations | Create, Read, Update, Delete |
| Form Validation | Input Handling | Required, Length, Type, Errors, State |
| Error Recovery | Error Handling | Missing Data, Invalid Input, Fallbacks, Network |
| Performance | Speed & Memory | Rendering, Scrolling, Memory, DOM |
| Keyboard Nav | Accessibility | Tab, Enter, Escape, Arrow Keys, Focus |
| Mobile | Responsiveness | Layout, Touch, Tap Targets, Fonts, Features |
| Search Filter | User Functionality | Input, Real-time, Case, Fields, Controls |

**Total: 7 test suites covering 33+ specific functionality areas**

---

## Questions?

Check `docs/SMOKE_TEST_COVERAGE.md` for broader test architecture documentation.
Check individual test files for detailed test logic and assertions.
