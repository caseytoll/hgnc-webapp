# Smoke Test Coverage Analysis

**Last Updated:** v826 (2025-12-07)

## Overview

The HGNC WebApp now has **two-tier smoke testing** after deployment:

1. **Basic Smoke Test** (`runtime-check.js`) - Critical checks that block deployment on failure
2. **Extended Smoke Test** (`extended-smoke-test.js`) - Comprehensive checks (non-blocking)

---

## Tier 1: Basic Smoke Test (`runtime-check.js`)

### Execution
- **When:** Auto-runs during deployment via `./scripts/efficient-deploy.sh`
- **Duration:** ~30 seconds
- **Blocks deployment:** ✅ YES (exit code non-zero stops deployment)
- **What it tests:** Core rendering and critical functionality

### Coverage

| Category | Tests | Status |
|----------|-------|--------|
| **Insight Cards** | All 4 cards render (Team Performance, Offensive Leaders, Defensive Wall, Player Analysis) | ✅ |
| **Team Performance** | View renders after click, has populated data | ✅ |
| **Player Analysis** | Asset loading verification, data presence check | ✅ |
| **Ladder View** | Renders as HTML table with RK header | ✅ |
| **Owner Mode** | Team edit UI visibility, modal behavior | ✅ |
| **Asset Loading** | Image validation (no bare base64), CDN URL verification | ✅ |
| **HTML Structure** | Critical elements present (insights containers, buttons) | ✅ |
| **Global Functions** | `toggleTeamEditMode()` callable without errors | ✅ |

### Key Validations

```javascript
// What's verified
✅ All 4 insight card titles rendered
✅ Team Performance view visible and contains data
✅ Ladder view has proper table structure
✅ Player Analysis computed background has valid URL
✅ Icon assets load from CDN (no base64 issues)
✅ Edit modal appears and contains team name
✅ Owner UI functions callable in frames
```

---

## Tier 2: Extended Smoke Test (`extended-smoke-test.js`)

### Execution
- **When:** Auto-runs after basic smoke test during deployment
- **Duration:** ~15 seconds
- **Blocks deployment:** ❌ NO (failures are logged but don't stop deployment)
- **What it tests:** Broader functionality and quality metrics

### Coverage

#### TEST 1: Navigation Between Views
```
Tests: Hash-based routing to Team List, Players, Games, Ladder
Validates: View elements exist after hash navigation
Status: Reports on accessibility of each view
```

#### TEST 2: Dark Mode Support
```
Tests: CSS variables, dark mode toggle element
Validates: --bg-primary and --text-primary variables
Status: Checks if theme support infrastructure is present
```

#### TEST 3: Data Persistence
```
Tests: Storage APIs availability
Checks:
  - localStorage (# of keys stored)
  - sessionStorage (# of keys stored)
  - IndexedDB (available: true/false)
  - Cache API (available: true/false)
Validates: Offline data capability
```

#### TEST 4: Form Elements & Validation
```
Tests: Form count, input field count, validation attributes
Checks:
  - Total forms found
  - Total input fields
  - Fields with required/pattern/min/max attributes
Status: Validates form infrastructure is present
```

#### TEST 5: Accessibility Basics
```
Tests: Web accessibility features
Checks:
  - ARIA labels count
  - ARIA describedBy count
  - Heading count (h1-h6)
  - Button count (button + [role="button"])
  - Link count
  - Images with alt text
Status: Reports accessibility metrics
```

#### TEST 6: Performance Metrics
```
Tests: Page load performance
Measures:
  - Total page load time (ms)
  - DOM ready time (ms)
  - Resource count
  - Large resources (>1000ms)
Rating: Excellent (<3s) / Good (<5s) / Needs improvement (>5s)
```

#### TEST 7: Critical Functions Available
```
Tests: 6 critical functions exist
Checks:
  - showView()
  - toggleTeamEditMode()
  - loadMasterTeamList()
  - addPlayer()
  - updatePlayer()
  - deletePlayer()
Status: Reports count of available vs missing
Note: May show as missing if in sandboxed iframe (limitations)
```

#### TEST 8: Cache Busting & Versioning
```
Tests: Version consistency for cache invalidation
Checks:
  - window.appVersion value
  - localStorage appVersion value
  - Version mismatch detection
Status: Validates cache busting mechanism
```

#### TEST 9: Error Handling
```
Tests: Error container infrastructure
Checks:
  - Error container elements exist
  - Empty state elements exist
  - appState object available
Status: Validates error handling setup
```

---

## Test Results Interpretation

### ✅ All Green (Ideal)
```
✅ Navigation: 4/4 views accessible
✅ Dark mode: CSS variables defined
✅ Persistence: 2 localStorage keys, IndexedDB available
✅ Forms: 5 input fields with validation
✅ Accessibility: 15 ARIA labels, 6 headings
✅ Performance: 2500ms page load (Excellent)
✅ Functions: 6/6 available
✅ Cache: Version consistency OK
✅ Error handling: Error containers present
```
**Meaning:** All systems operational, no deployment concerns.

### ⚠️ Mixed Signals (Expected)
```
ℹ️  CSS variables not found (may use inline styles)
⚠️  Functions missing: 6 (likely in sandboxed iframe)
ℹ️  Dark mode toggle not found
```
**Meaning:** Some features may use alternative approaches or aren't in main page scope. Not critical if core functionality works.

### ❌ Should Investigate
```
⚠️  Performance: 8000ms+ page load
⚠️  All navigation tests failed
⚠️  No data persistence APIs
```
**Meaning:** Investigate root cause; may indicate deployment issue.

---

## What's NOT Tested

The current smoke tests focus on **happy path verification**. These scenarios are NOT currently tested:

❌ **CRUD Operations** - Adding/editing/deleting players, games, or teams
❌ **Data Validation** - Form validation rules, edge cases
❌ **Error Recovery** - How app handles missing/invalid data
❌ **Large Datasets** - Performance with hundreds of players/games
❌ **Keyboard Navigation** - Full keyboard accessibility
❌ **Search & Filter** - Search functionality, filter behavior
❌ **Offline Mode** - Service worker and offline data sync
❌ **Cross-browser** - Only tests in Chrome/Chromium
❌ **Mobile Responsiveness** - Only tests desktop viewport
❌ **Concurrent Operations** - Multiple simultaneous edits

---

## How to Run Tests Manually

### Basic Smoke Test Only
```bash
node ./scripts/runtime-check.js
```

### Extended Test Only
```bash
node ./scripts/extended-smoke-test.js
```

### Both Tests (Full Deployment Simulation)
```bash
./scripts/efficient-deploy.sh "Test message" --skip-smoke=false
```

### Pre-Deployment Validation (Without Smoke Tests)
```bash
./scripts/pre-deploy-check.sh
```

---

## Performance Baseline

From v826 deployment:
- **Page Load Time:** 4,643ms
- **DOM Ready Time:** 2,420ms
- **Resources:** 4 loaded
- **Rating:** ⚠️ Good

### Performance Targets
- Excellent: < 3,000ms
- Good: < 5,000ms
- Fair: < 8,000ms
- Poor: > 8,000ms

---

## Future Improvements

### High Priority
1. **CRUD Operation Testing** - Test add/edit/delete workflows
2. **Form Validation** - Test validation rules and error messages
3. **Dark Mode Verification** - Actually test dark mode toggle
4. **Mobile Viewport** - Test responsive design at 375px width

### Medium Priority
5. **Keyboard Navigation** - Tab through forms and buttons
6. **Edge Cases** - Empty teams, special characters, max length
7. **Performance Thresholds** - Fail if page load > 6000ms
8. **Accessibility Compliance** - More detailed WCAG checks

### Lower Priority
9. **Offline Mode** - Verify IndexedDB persistence
10. **Service Worker** - Verify cache strategies
11. **Cross-browser** - Test in Firefox, Safari
12. **Concurrent Operations** - Multiple simultaneous requests

---

## Exit Codes

### Basic Smoke Test
- `0` = PASSED (deployment continues)
- `1-9` = FAILED (deployment stops)

### Extended Smoke Test
- `0` = COMPLETED (always non-blocking)

### Pre-Deploy Check
- `0` = ALL CHECKS PASSED
- `1` = BLOCKED (missing critical files/functions)

---

## Configuration

### Environment Variables

```bash
# Override production URL for testing
export APP_URL="https://your-test-instance.com/exec"

# Override Chrome executable path
export PUPPETEER_EXECUTABLE_PATH="/path/to/chrome"

# Skip smoke tests during deployment
./scripts/efficient-deploy.sh "msg" --skip-smoke

# Dry run (no deployment)
./scripts/efficient-deploy.sh "msg" --dry-run
```

---

## Integration with CI/CD

The smoke tests are designed to run:
1. **Locally** - Before manual deployment
2. **Post-Deploy** - Automated verification
3. **CI/CD** - In GitHub Actions or similar

Example GitHub Actions integration:
```yaml
- name: Run pre-deployment checks
  run: ./scripts/pre-deploy-check.sh

- name: Deploy to Apps Script
  run: ./scripts/efficient-deploy.sh "CI deploy"

- name: Extended verification
  if: success()
  run: node ./scripts/extended-smoke-test.js
```

---

## Troubleshooting

### Extended Test Shows Missing Functions
**Cause:** Functions are in sandboxed iframe, not main page
**Fix:** This is normal; basic smoke test verifies they work

### Performance Test Shows High Load Times
**Cause:** First load includes all resources; cache warm
**Fix:** Run test multiple times; second run usually faster

### Navigation Tests All Fail
**Cause:** Views may use different HTML structure
**Fix:** Check if hash-routing is correctly implemented

### Dark Mode Not Found
**Cause:** CSS variables not defined or using inline styles
**Fix:** Not critical; verify dark mode works manually

---

## Related Documentation

- [TESTING_README.md](./TESTING_README.md) - Testing workflow guide
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Daily reference with commands
- [DEVELOPMENT-PRINCIPLES.md](./DEVELOPMENT-PRINCIPLES.md) - Pre-deployment checklist

