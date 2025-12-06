# Test Data Isolation & Cleanup Guide

## Overview

Integration tests should not pollute the production spreadsheet with test data. This guide explains how to manage test data safely.

## Test Data Naming Convention

All test data must be prefixed with `TEST_` so it can be easily identified and cleaned up.

```javascript
// ✅ Good - test data is identifiable
const testTeamName = 'TEST_INTEGRATION_TEAM_001_' + Date.now();
const testPlayerName = 'TEST_PLAYER_' + Date.now();

// ❌ Bad - cannot distinguish from real data
const teamName = 'Integration Team';
const playerName = 'Test Player';
```

## Using Environment Variables

Tests should use a separate test spreadsheet ID if possible:

```javascript
// For development/CI:
const SPREADSHEET_ID = process.env.TEST_SPREADSHEET_ID || PRODUCTION_SPREADSHEET_ID;

// But if sharing prod spreadsheet, ALWAYS use TEST_ prefix
const testMarker = Date.now(); // Ensures uniqueness
```

## Cleanup Pattern

Every test should clean up after itself using this pattern:

```javascript
const testData = [];

try {
  // === Setup Phase ===
  const testTeamName = `TEST_TEAM_${Date.now()}`;
  testData.push(testTeamName);
  
  // Create test data...
  await createTeam(testTeamName);
  
  // === Test Phase ===
  const team = await fetchTeam(testTeamName);
  assert(team !== null, 'Team should be created');
  
  // === Cleanup Phase ===
} finally {
  // Always run cleanup, even if test fails
  for (const name of testData) {
    await deleteTeam(name);
    console.log(`✓ Cleaned up: ${name}`);
  }
}
```

## Server-Side Cleanup Function

Add this to `Code.js` for easy cleanup:

```javascript
/**
 * Cleanup test data (call via doGet or Apps Script console)
 * Removes all rows where team/player name starts with TEST_
 */
function cleanupTestData(sheetName = 'Players') {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  let rowsDeleted = 0;
  const data = sheet.getDataRange().getValues();
  
  for (let i = data.length - 1; i >= 1; i--) { // Start from end, skip header
    if (data[i][0] && String(data[i][0]).startsWith('TEST_')) {
      sheet.deleteRow(i + 1);
      rowsDeleted++;
    }
  }
  
  Logger.log(`Cleaned up ${rowsDeleted} test rows from ${sheetName}`);
  return { success: true, rowsDeleted };
}
```

## Pre-Test Hook (Recommended)

In your integration test setup:

```javascript
// Before all tests
beforeAll(async () => {
  console.log('Running pre-test cleanup...');
  await callServerFunction('cleanupTestData', ['Players']);
  await callServerFunction('cleanupTestData', ['Games']);
});

// After all tests
afterAll(async () => {
  console.log('Running post-test cleanup...');
  await callServerFunction('cleanupTestData', ['Players']);
});
```

## Monitoring Test Data Cleanup

Add a monitoring script to detect orphaned test data:

```bash
#!/bin/bash
# scripts/check-test-data.sh - Find orphaned TEST_ entries

echo "🔍 Checking for orphaned test data..."
gid=$(cat .clasp.json | jq -r '.scriptId')

# Call cleanupTestData without actually deleting (dry-run equivalent)
# This is a manual step - check the Apps Script logs for TEST_ entries
npx clasp logs --tail
```

## Best Practices

✅ **DO:**
- Prefix all test data with `TEST_`
- Add timestamps to make names unique
- Always wrap in try/finally for cleanup
- Log what you're cleaning up
- Test cleanup function itself separately

❌ **DON'T:**
- Create unnamed or generic test data
- Assume tests will always pass (cleanup may not run)
- Reuse test data across runs without cleanup
- Leave test data for manual cleanup later
- Hardcode test data that can't be identified

## Example: CRUD Test with Isolation

```javascript
// scripts/crud-test.js
const { retryWithBackoff } = require('./test-utils');

const TEST_MARKER = `TEST_CRUD_${Date.now()}`;
const createdRecords = [];

(async () => {
  try {
    // === CREATE ===
    const createFn = async () => {
      const team = await fetch('api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: `${TEST_MARKER}_Team1`,
          location: 'Test Location'
        })
      }).then(r => r.json());
      
      createdRecords.push(team.id);
      return team;
    };
    
    const team = await retryWithBackoff(createFn, 3, 500, 'Create team');
    console.log(`✓ Created team: ${team.name}`);
    
    // === READ ===
    const team2 = await fetch(`api/teams/${team.id}`).then(r => r.json());
    console.assert(team2.name === team.name, 'Read should return same team');
    
    // === UPDATE ===
    const updated = await fetch(`api/teams/${team.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ location: 'Updated Location' })
    }).then(r => r.json());
    console.assert(updated.location === 'Updated Location', 'Update should succeed');
    
    // === DELETE ===
    await fetch(`api/teams/${team.id}`, { method: 'DELETE' });
    createdRecords.pop();
    
    console.log('✅ CRUD test passed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
    
  } finally {
    // Cleanup any remaining test records
    console.log('\n🧹 Cleanup phase...');
    for (const recordId of createdRecords) {
      try {
        await fetch(`api/teams/${recordId}`, { method: 'DELETE' });
        console.log(`✓ Deleted test record: ${recordId}`);
      } catch (e) {
        console.warn(`⚠️ Failed to delete ${recordId}: ${e.message}`);
      }
    }
  }
})();
```

## Cleanup Command

To manually clean test data:

```bash
# View cleanup function in Apps Script editor
# Or call from browser console:
google.script.run.withSuccessHandler(r => console.log(r))
  .cleanupTestData('Players');

# Or via npm script (if added):
npm run test:cleanup
```

## Monitoring & Alerts

For production stability, monitor for accumulating test data:

```javascript
// Add to Code.js
function getTestDataCount(sheetName = 'Players') {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  
  let count = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && String(data[i][0]).startsWith('TEST_')) {
      count++;
    }
  }
  
  return count;
}
```

Then in CI, warn if test data accumulates:

```bash
# Check test data count
result=$(npx clasp run getTestDataCount --params '["Players"]')
if [ "$result" -gt 10 ]; then
  echo "⚠️ WARNING: $result test records found - manual cleanup may be needed"
fi
```

---

**Summary:** Always use `TEST_` prefix, wrap in try/finally, and verify cleanup runs even on test failure.
