# Test Coverage & Metrics Guide

## Current Coverage

The HGNC WebApp has a comprehensive integration test suite covering 7 specialized areas:

| Test | Duration | Coverage | Status |
|------|----------|----------|--------|
| CRUD Operations | ~3.2s | Core data flows | ✅ ACTIVE |
| Form Validation | ~4.1s | User input validation | ✅ ACTIVE |
| Error Recovery | ~5.0s | Error handling paths | ✅ ACTIVE |
| Performance | ~3.4s | Large datasets | ✅ ACTIVE |
| Keyboard Navigation | ~4.3s | Accessibility | ✅ ACTIVE |
| Mobile Responsiveness | ~3.4s | Mobile UI | ✅ ACTIVE |
| Search & Filter | ~3.8s | Data filtering | ✅ ACTIVE |
| **Total** | **27.3s** | **All features** | ✅ 7/7 PASS |

## Code Paths Tested

### User Interface Flows
- ✅ Tab navigation (insights, teams, games, ladder)
- ✅ Card rendering (team perf, offensive leaders, etc.)
- ✅ Modal dialogs (add team, edit player, confirm delete)
- ✅ Form submission (create, update, delete)
- ✅ Data persistence (localStorage for UI state)

### Server-Side Functions
- ✅ `doGet()` - Initial page load
- ✅ Icon asset loading (Logo, Team Performance, Offensive Leaders, Defensive Wall, Player Analysis)
- ✅ Data retrieval from spreadsheet
- ✅ Error handling and fallbacks
- ✅ Token management

### Data Operations
- ✅ Create (Teams, Players, Games)
- ✅ Read (Single and multiple records)
- ✅ Update (Edit records)
- ✅ Delete (Remove records)
- ✅ Search & Filter (By name, position, stats)
- ✅ Sort (By various columns)

### Edge Cases
- ✅ Empty spreadsheet
- ✅ Large dataset (1000+ rows)
- ✅ Missing fields
- ✅ Invalid input
- ✅ Network timeout
- ✅ Missing CDN assets
- ✅ Browser back/forward navigation

## Test Coverage Gaps

### Known Gaps
- [ ] **Concurrent operations** - Multiple users editing simultaneously
- [ ] **Complex filtering** - Chained filters (position + stats + name)
- [ ] **Export/import** - CSV export and import workflows
- [ ] **Permissions** - Owner vs. viewer access control
- [ ] **Offline mode** - Service worker caching
- [ ] **Analytics tracking** - Event logging integration
- [ ] **Print functionality** - Print stylesheet rendering
- [ ] **Dark mode** - UI in dark theme

### Priority for Adding Coverage

**High** (could catch bugs):
- [ ] Concurrent operations (test race conditions)
- [ ] Complex filtering (multiple filters together)
- [ ] Permission boundaries (owner-only features)

**Medium** (nice to have):
- [ ] Export/import workflows
- [ ] Offline mode activation
- [ ] Print stylesheet

**Low** (cosmetic):
- [ ] Dark mode rendering
- [ ] Analytics events

## Metrics to Track

### 1. Test Execution Time
Track how long the full suite takes:

```javascript
// At end of integration-test.js
const totalTime = results.totalTime;
if (totalTime > 35000) {
  console.warn(`⚠️ Tests took ${(totalTime/1000).toFixed(1)}s (expected <35s)`);
  // Could fail in CI if too slow
}
```

### 2. Failure Rate
Monitor which tests fail most:

```javascript
// integration-test.js
const failureRate = {
  'CRUD Operations': 0,
  'Form Validation': 0,
  'Error Recovery': 0,
  // etc.
};
```

### 3. Smoke Test Results
Track pass/fail by version:

```
v828: ✅ PASS (smoke + extended + integration)
v827: ✅ PASS
v826: ❌ FAIL (insights cards blank)
```

### 4. Coverage by Feature

```markdown
# Feature Coverage Checklist

## Team Management
- [x] Create team
- [x] Edit team name
- [x] Delete team
- [ ] Bulk import teams
- [ ] Archive team

## Player Management
- [x] Add player
- [x] Edit player stats
- [x] Delete player
- [ ] Bulk import players
- [ ] Player photo upload
```

## Setting up Coverage Reports

### Manual Coverage Tracking

Create `docs/testing/COVERAGE_REPORT.md`:

```markdown
# Coverage Report - Updated Dec 7, 2025

## Code Metrics
- Server-side functions: 15 total, 12 tested (80%)
- Client-side screens: 8 total, 8 tested (100%)
- API endpoints: ~20, 15 tested via integration tests (75%)

## Feature Coverage
- Core operations (CRUD): 100%
- Validation: 95%
- Error handling: 90%
- Search/filtering: 85%
- UI interactions: 100%
- Mobile responsive: 95%
- Accessibility: 70%

## Test Stability
- Flaky tests: 0
- Skip rate: 0%
- Average pass rate: 100%
```

### Automated Coverage (Future)

To add automated coverage reporting:

```javascript
// scripts/coverage-reporter.js
const fs = require('fs');

function generateCoverageReport(testResults) {
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: testResults.passed.length + testResults.failed.length,
    passedTests: testResults.passed.length,
    failedTests: testResults.failed.length,
    passRate: ((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100).toFixed(2) + '%',
    avgExecutionTime: (testResults.totalTime / (testResults.passed.length + testResults.failed.length)).toFixed(2) + 'ms',
  };
  
  fs.writeFileSync(
    'docs/testing/coverage-report.json',
    JSON.stringify(report, null, 2)
  );
  
  return report;
}

module.exports = { generateCoverageReport };
```

## Coverage Goals

### Immediate (v828+)
- ✅ Smoke test (app loads)
- ✅ Extended smoke (navigation works)
- ✅ Integration suite (all 7 areas)
- ⏳ Zero test flakiness

### Short Term (next 2-3 releases)
- [ ] Add concurrent operation tests
- [ ] Add complex filtering tests
- [ ] Document all untested code paths
- [ ] Achieve 85% overall coverage

### Medium Term (v850+)
- [ ] Add permission/access control tests
- [ ] Add export/import tests
- [ ] Set up automated coverage reports
- [ ] Achieve 90% overall coverage

## Test Quality Indicators

**Good sign:**
- All 7 tests pass consistently
- Tests complete in <30 seconds
- Failed tests show clear error messages
- Pre-deploy check validates all files

**Warning sign:**
- One test fails intermittently (flaky)
- Tests take >35 seconds
- Error messages are cryptic
- Missing test prerequisites silently skip tests

## Debugging Test Failures

### Step 1: Check Error Message
```bash
npm run test:integration 2>&1 | grep -A5 "FAILED\|ERROR"
```

### Step 2: Run Individual Test
```bash
node scripts/crud-test.js
node scripts/form-validation-test.js
```

### Step 3: Check Prerequisites
```bash
# Verify deployment exists
curl https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec

# Verify Chrome is available
google-chrome --version
```

### Step 4: Run with Debug
```bash
DEBUG=true npm run test:integration
```

## Recommended Additions

### Coverage for Complex Flows
```javascript
// Test concurrent team creation
async function testConcurrentCreation() {
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(createTeam(`TEST_CONCURRENT_${i}`));
  }
  await Promise.all(promises);
  // Verify all 5 created without conflicts
}
```

### Performance Baseline
```javascript
// Track performance metrics
const metrics = {
  pageLoadTime: 0,
  crudOperationTime: 0,
  searchQueryTime: 0,
};

// Alert if degradation detected
if (pageLoadTime > 5000) {
  console.warn('⚠️ Page load degraded to ' + pageLoadTime + 'ms');
}
```

---

**Summary:** Current coverage is strong (100% pass rate, 7 test areas), but gaps exist in concurrent operations, permissions, and export workflows. Track execution time and failure rate to maintain quality.
