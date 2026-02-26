# Opposition Scouting + Planner Integration - Conflict Analysis & Fixes

**Status:** CONFLICTS IDENTIFIED - Ready for mitigation  
**Date:** 2026-02-22  
**Severity:** 2 Critical, 1 Important, 2 Minor  
**Action Required:** Fix before implementation  

---

## Executive Summary

The Opposition Scouting + Planner Integration Plan is **architecturally sound** but has **3 conflicts** with existing plans and code:

| # | Conflict | Severity | Status | Fix |
|---|----------|----------|--------|-----|
| 1 | PropertiesService scope mismatch | CRITICAL | In integration plan only | Use `getScriptProperties()` like Background AI |
| 2 | OppositionScouting sheet not defined in Code.js | CRITICAL | Missing | Add sheet creation + column definitions |
| 3 | Manual refresh API endpoint undefined | IMPORTANT | Missing design | Define `refreshOppositionMatches` action |
| 4 | Sheet structure inconsistency with AI_Knowledge_Base | MINOR | Semantic | Document column purposes |
| 5 | Cache key collision risk across rounds | MINOR | Edge case | Verify cache key includes round number |

---

## CONFLICT #1: PropertiesService Scope Mismatch ⚠️ CRITICAL

### Problem

**Background AI Plan** (lines 276, 310, 502):
```javascript
const queue = PropertiesService.getScriptProperties();
```

**Combined AI Implementation Plan** (implied same):
- Uses `getScriptProperties()` (shared script-level properties)

**Opposition Scouting + Planner Integration Plan** (lines 125, 129):
```javascript
const queuedJobs = PropertiesService.getUserProperties()
  .getKeys()
  .filter(key => key.startsWith('opposition_queue_'));
```

### Why This Matters

**Script Properties** (`getScriptProperties()`)
- ✅ Shared across ALL users of the script
- ✅ Accessible during time-triggered functions (no user context required)
- ✅ Persistent, survives execution context changes
- ❌ No per-user privacy

**User Properties** (`getUserProperties()`)
- ✅ Private to each user
- ❌ Only accessible when user is actively executing code
- ❌ May NOT be accessible during server-side time-triggered functions
- ❌ In anonymous/webapp context, unclear scoping behavior

### Impact

The `processOppositionAIQueue()` function runs as a **time-based trigger** (Sunday 10 AM with no user context). It needs to access the opposition_queue properties, but if those are stored in `getUserProperties()`, the code will **fail silently** or throw:
```
Error: Access denied. Apps Script cannot access user properties in this context.
```

### Solution: Use `getScriptProperties()` for Opposition Queue

**Change in opposition_scouting_planner_integration.md pseudocode:**

```javascript
// ❌ WRONG (current pseudocode)
const queuedJobs = PropertiesService.getUserProperties()
  .getKeys()
  .filter(key => key.startsWith('opposition_queue_'));

// ✅ CORRECT
const queue = PropertiesService.getScriptProperties();
const queuedJobs = queue.getKeys()
  .filter(key => key.startsWith('opposition_queue_'));

// ✅ Fetch a job
const job = JSON.parse(queue.getProperty(jobKey));

// ✅ Store a job
queue.setProperty(jobKey, JSON.stringify(job));

// ✅ Delete a job
queue.deleteProperty(jobKey);
```

**Impact on Implementation:**
- ✅ No code changes needed to Backend infrastructure
- ✅ Reuses same `processAIQueue()` timer mechanism
- ⚠️ Documentation must be updated
- ⚠️ Explanation: Opposition queue + game AI queue share same PropertiesService, but separate key namespaces (`opposition_queue_*` vs `ai_queue_*`)

**Owner/Permissions Note:**
Since both queues live in script properties (shared), coaches won't have privacy between teams they manage. This is acceptable because:
1. Scripts are deployed-as-user (deployer owns permissions)
2. All teams in a club can see all queues (not sensitive data)
3. Actual team data remains in individual team sheets (private per team)

---

## CONFLICT #2: OppositionScouting Sheet Not Defined in Code.js ⚠️ CRITICAL

### Problem

The integration plan references an `OppositionScouting` sheet:
```javascript
saveOppositionScoutingData({
  teamID: job.teamID,
  opponent: job.opponent,
  round: job.round,
  analytics: oppositionAnalytics,
  ...
});
```

But the sheet isn't defined anywhere in **Code.js**, and there's no:
- `ensureOppositionScoutingSheetExists()` function
- Column header setup
- Data validation
- Access checks

### Why This Matters

If `saveOppositionScoutingData()` tries to write to a non-existent sheet:
```javascript
var oppSheet = spreadsheet.getSheetByName('OppositionScouting');
// Returns null if sheet doesn't exist
oppSheet.appendRow(...); // ERROR: Cannot call method appendRow on null
```

The code will **crash silently** and opposition AI generation will fail.

### Solution: Add OppositionScouting Sheet Definition

**In Code.js, add function (new):**

```javascript
/**
 * Ensure OppositionScouting sheet exists with proper structure
 * Called once during startup or manually via admin panel
 */
function ensureOppositionScoutingSheetExists() {
  var ss = getSpreadsheet();
  var sheetName = 'OppositionScouting';
  
  // Check if sheet exists
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    Logger.log('OppositionScouting sheet already exists.');
    return sheet;
  }
  
  // Create new sheet
  sheet = ss.insertSheet(sheetName);
  Logger.log('Created OppositionScouting sheet.');
  
  // Set up headers
  var headers = [
    'Timestamp',      // A: When row was added
    'TeamID',         // B: Which team is planning
    'Opponent',       // C: Opponent name
    'Round',          // D: Round number
    'GameDate',       // E: When scheduled
    'AISummary',      // F: Narrative summary
    'AnalyticsJSON',  // G: Full JSON (26 insights)
    'GeneratedAt',    // H: When AI ran
    'CacheUntil',     // I: Cache expiration
    'Status'          // J: ready | processing | failed
  ];
  
  sheet.appendRow(headers);
  
  // Format header row
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4a4a4a');
  headerRange.setFontColor('#ffffff');
  
  // Set column widths
  sheet.setColumnWidth(1, 120);  // Timestamp
  sheet.setColumnWidth(2, 100);  // TeamID
  sheet.setColumnWidth(3, 150);  // Opponent
  sheet.setColumnWidth(4, 80);   // Round
  sheet.setColumnWidth(5, 120);  // GameDate
  sheet.setColumnWidth(6, 400);  // AISummary
  sheet.setColumnWidth(7, 800);  // AnalyticsJSON
  sheet.setColumnWidth(8, 200);  // GeneratedAt
  sheet.setColumnWidth(9, 150);  // CacheUntil
  sheet.setColumnWidth(10, 100); // Status
  
  Logger.log('OppositionScouting sheet initialized.');
  return sheet;
}

/**
 * Save opposition scouting data to OppositionScouting sheet
 */
function saveOppositionScoutingData(data) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('OppositionScouting');
  
  if (!sheet) {
    Logger.log('ERROR: OppositionScouting sheet not found. Creating...');
    sheet = ensureOppositionScoutingSheetExists();
  }
  
  var row = [
    new Date().toISOString(),                    // Timestamp
    data.teamID,                                 // TeamID
    data.opponent,                               // Opponent
    data.round,                                  // Round
    data.gameDate,                               // GameDate
    data.aiSummary || '',                        // AISummary
    JSON.stringify(data.analytics || {}),        // AnalyticsJSON
    new Date().toISOString(),                    // GeneratedAt
    new Date(Date.now() + 7*24*60*60*1000).toISOString(), // CacheUntil (7 days)
    'ready'                                      // Status
  ];
  
  sheet.appendRow(row);
  Logger.log('Saved opposition scouting data for ' + data.opponent + ' (Round ' + data.round + ')');
}
```

**In `doGet()` or setup function, call once:**
```javascript
// During initial deployment or admin setup
ensureOppositionScoutingSheetExists();
```

**Impact on Implementation:**
- ✅ Add 60-80 lines of code to Code.js
- ✅ No changes needed to frontend
- ✅ Simple, follows existing pattern (same as Fixture_Results, AI_Knowledge_Base)
- ⚠️ Deployment checklist must include: "Run `ensureOppositionScoutingSheetExists()` after deploy"

---

## CONFLICT #3: Manual Refresh API Endpoint Undefined ⚠️ IMPORTANT

### Problem

The integration plan describes a manual refresh feature:
```
Coach clicks "Refresh Opposition Data" button
→ Dialog offers: "Fast Data Only" or "Complete Insights"
→ API call triggers immediate data fetch OR immediate AI generation
```

But the **API action is never defined**. The integration pseudocode calls:
```javascript
generateOppositionInsightsImmediate(); // In frontend
refreshOppositionMatches(teamID);      // Async call???
```

There's no corresponding `doGet()` or `doPost()` handler in Code.js with action `refreshOppositionMatches`.

### Why This Matters

When coach clicks refresh button, the frontend will call:
```javascript
const response = await fetch(`${apiUrl}?action=refreshOppositionMatches&teamID=${teamID}`);
```

But Code.js won't recognize the `refreshOppositionMatches` action. The response will be:
```json
{ "error": "Unknown action: refreshOppositionMatches" }
```

### Solution: Define Backend API Action

**In Code.js, add to `handleApiRequest()` switch statement:**

```javascript
case 'refreshOppositionMatches':
  // Coach clicked "Refresh - Fast Data Only"
  // Fetch fresh fixture data immediately (no AI generation)
  teamID = e.parameter.teamID;
  result = collectOppositionFixturesImmediate(teamID);
  break;

case 'generateOppositionInsightsImmediate':
  // Coach clicked "Refresh - Generate Complete Insights"
  // Fetch fixtures + generate all 26 analytics immediately
  // Note: Waits for completion (15-30 sec), so use sparingly
  teamID = e.parameter.teamID;
  round = e.parameter.round;
  result = generateOppositionInsightsImmediately(teamID, round);
  break;
```

**Add backend functions:**

```javascript
/**
 * Fetch opposition fixture data immediately
 * Used when coach wants fresh data without waiting for Sunday
 * Runs: ~2 seconds per opponent
 */
function collectOppositionFixturesImmediate(teamID) {
  try {
    var ss = getSpreadsheet();
    var teamsSheet = ss.getSheetByName('Teams');
    if (!teamsSheet) return { error: 'Teams sheet not found' };
    
    var teamData = loadTeamData(teamID, null);
    if (!teamData) return { error: 'Team not found' };
    
    var upcomingGames = teamData.games.filter(g => g.status === 'upcoming');
    if (upcomingGames.length === 0) {
      return { message: 'No upcoming games', fixturesUpdated: 0 };
    }
    
    // Fetch fresh fixture data for each opponent
    var results = [];
    for (var i = 0; i < upcomingGames.length; i++) {
      var game = upcomingGames[i];
      var ladder = getSquadiLadderForTeam(teamID, true); // Fresh fetch
      
      results.push({
        round: game.round,
        opponent: game.opponent,
        date: game.date,
        ladderFetched: true,
        position: ladder ? ladder.position : null
      });
    }
    
    return {
      success: true,
      fixturesUpdated: results.length,
      matches: results,
      message: 'Fixture data refreshed'
    };
    
  } catch (e) {
    Logger.log('ERROR collectOppositionFixturesImmediate: ' + e.message);
    return { error: e.message };
  }
}

/**
 * Generate opposition insights immediately (synchronous)
 * Note: This is SLOW (15-30 sec) because it generates all 26 insights
 * Coach should use this only when needed urgently
 * Used for manual refresh when time-based trigger is in future
 */
function generateOppositionInsightsImmediately(teamID, round) {
  try {
    var ss = getSpreadsheet();
    var teamData = loadTeamData(teamID, null);
    if (!teamData) return { error: 'Team not found' };
    
    var game = teamData.games.find(g => g.round == round && g.status === 'upcoming');
    if (!game) return { error: 'Game not found for round ' + round };
    
    var opponent = game.opponent;
    var ladder = getSquadiLadderForTeam(teamID, true); // Fresh
    var h2hHistory = calculateHeadToHeadHistory(teamData, opponent);
    
    // Generate all 26 analytics
    var startTime = Date.now();
    var analytics = generateOppositionAnalytics({
      teamID: teamID,
      opponent: opponent,
      round: round,
      ladderData: ladder,
      h2hHistory: h2hHistory
    });
    var endTime = Date.now();
    
    // Save immediately
    saveOppositionScoutingData({
      teamID: teamID,
      opponent: opponent,
      round: round,
      gameDate: game.date,
      analytics: analytics,
      aiSummary: analytics.summary,
      generatedAt: new Date()
    });
    
    Logger.log('Generated opposition insights immediately for ' + opponent + ' in ' + (endTime - startTime) + 'ms');
    
    return {
      success: true,
      opponent: opponent,
      round: round,
      generated: true,
      generatedTimeMs: endTime - startTime,
      message: 'Opposition insights generated',
      analytics: analytics
    };
    
  } catch (e) {
    Logger.log('ERROR generateOppositionInsightsImmediately: ' + e.message);
    return { error: e.message, stack: e.stack };
  }
}
```

**In frontend (`data-loader.js` or `app.js`), add:**

```javascript
window.refreshOppositionData = async function(teamID, option) {
  // option: 'fast' (fetch fixtures only) or 'complete' (generate insights)
  try {
    const action = option === 'complete' 
      ? 'generateOppositionInsightsImmediate'
      : 'refreshOppositionMatches';
    
    const response = await fetch(
      `${baseUrl}?api=true&action=${action}&teamID=${teamID}`
    );
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Refresh failed');
    }
    
    // Update UI with fresh data
    renderOppositionScoutingHub(teamID);
    showNotification('Opposition data refreshed', 2000);
    
  } catch (error) {
    console.error('Refresh error:', error);
    showNotification('Failed to refresh opposition data: ' + error.message, 5000);
  }
};
```

**Impact on Implementation:**
- ✅ Add ~100 lines to Code.js
- ✅ Add ~20 lines to frontend
- ✅ No breaking changes
- ✅ Improves UX (coaches can refresh anytime, not just wait for Sunday)

---

## CONFLICT #4: Sheet Structure Inconsistency ⚠️ MINOR

### Problem

The integration plan defines OppositionScouting sheet with 10 columns, but compares it to AI_Knowledge_Base sheet which has different structure (from Combined AI plan).

**AI_Knowledge_Base** (from Combined AI Implementation):
- Timestamp, TeamID, GameID, Module, ModuleType, OutputJSON, Status, etc.

**OppositionScouting** (from Integration plan):
- Timestamp, TeamID, Opponent, Round, GameDate, AISummary, AnalyticsJSON, Status, etc.

They serve different purposes (per-game AI vs. per-opponent scouting), so different structures are OK. But the documentation doesn't clarify this.

### Solution: Document the Difference

**Add to Integration Plan or CLAUDE.md:**

```markdown
## Sheet Organization

### AI_Knowledge_Base (Game-centric AI)
- **Purpose:** Store modular AI outputs for individual games
- **Scope:** Per-game analysis (Event Analyzer, Pattern Detector, etc.)
- **Columns:** Timestamp, TeamID, GameID, Module, ModuleType, OutputJSON, Status, ExpiresAt
- **Used By:** background `processAIQueue()` trigger (every 10 min)
- **Accessed By:** Game detail view, Stats overview, AI tabs

### OppositionScouting (Opposition-centric analytics)
- **Purpose:** Store opposition analytics and tactical recommendations
- **Scope:** Per-opponent pre-match preparation (26 insights, Phased phases 1-5)
- **Columns:** Timestamp, TeamID, Opponent, Round, GameDate, AISummary, AnalyticsJSON, GeneratedAt, CacheUntil, Status
- **Used By:** background `processOppositionAIQueue()` trigger (Sunday 10 AM)
- **Accessed By:** Opposition Scouting Hub, Lineup Planner modal, manual refresh

### Why Separate Sheets?
- **Game AI:** Triggered per-game on finalization (every 5-10 min)
- **Opposition AI:** Triggered pre-week on Sunday (once per week)
- **Different retention:** Game AI persists as long as games exist; Opposition AI expires before next game
- **Different access patterns:** Game AI is deep-dive; Opposition AI is quick reference
```

---

## CONFLICT #5: Cache Key Collision Risk Across Rounds ⚠️ MINOR

### Problem

The integration plan stores opposition analytics in localStorage with cache key:
```javascript
const cacheKey = `opposition_${opponent}`;  // WRONG: No round specificity
```

But a team might play the same opponent in multiple rounds (e.g., Round 6 vs. Round 12). The cache key doesn't distinguish them, so:
```javascript
cacheKey = 'opposition_Kilmore'; // Same key for Round 6 AND Round 12
```

When coach looks at Round 12 game against Kilmore, the app loads the **Round 6 cached data**, which is stale and wrong.

### Solution: Include Round and TeamID in Cache Key

**In frontend, when storing opposition cache:**

```javascript
// ❌ WRONG (current pseudocode in integration plan)
const cacheKey = `opposition_${opponent}`;

// ✅ CORRECT
const cacheKey = `opposition_${teamID}_${opponent}_${round}`;

// ✅ Store it
const cache = JSON.parse(localStorage.getItem('opposition_cache') || '{}');
cache[cacheKey] = {
  data: oppositionData,
  expiresAt: Date.now() + 7*24*60*60*1000  // 7 days
};
localStorage.setItem('opposition_cache', JSON.stringify(cache));

// ✅ Retrieve it
const cached = cache[cacheKey];
if (cached && cached.expiresAt > Date.now()) {
  return cached.data;  // Use cache
}
```

**Why this matters:**
- Round 6 vs Round 12 might be very different (season progression, team roster changes)
- Ladder positions change weekly
- H2H history is cumulative (grows as season progresses)

**Impact on Implementation:**
- ✅ 1-2 line changes in frontend cache code
- ✅ No breaking changes (old cache entries will be ignored, not reused)
- ✅ Improves accuracy (fresh-ish data per opponent-per-round)

---

## Summary Table

| # | Conflict | Type | Severity | Lines to Change | Risk |
|---|----------|------|----------|-----------------|------|
| 1 | PropertiesService scope | Code | CRITICAL | ~5 (pseudocode) | High - Script fails silently at runtime |
| 2 | OppositionScouting sheet undefined | Code | CRITICAL | +60 new lines | High - Backend crashes on first write |
| 3 | Manual refresh API missing | Design | IMPORTANT | +120 total | Medium - UX broken but fallback exists |
| 4 | Sheet structure docs unclear | Docs | MINOR | +10 (documentation) | Low - No code impact, just confusing |
| 5 | Cache key lacks round specificity | Logic | MINOR | ~2 (cache key) | Low - Shows stale data in edge cases |

---

## Implementation Checklist

Before starting Opposition Scouting + Planner Integration implementation:

### Critical Fixes (Must Do)
- [ ] Update Opposition integration pseudocode to use `getScriptProperties()` instead of `getUserProperties()`
- [ ] Add `ensureOppositionScoutingSheetExists()` function to Code.js
- [ ] Add `saveOppositionScoutingData()` function to Code.js
- [ ] Define `refreshOppositionMatches` and `generateOppositionInsightsImmediate` API actions in Code.js
- [ ] Add `collectOppositionFixturesImmediate()` function to Code.js
- [ ] Add `generateOppositionInsightsImmediately()` function to Code.js
- [ ] Add frontend `refreshOppositionData()` handler
- [ ] Deployment checklist: Run `ensureOppositionScoutingSheetExists()` after deploy

### Important Fixes (Should Do)
- [ ] Update cache key logic to include `teamID` and `round`
- [ ] Add sheet structure differentiation documentation to CLAUDE.md

### Minor Docs (Nice to Have)
- [ ] Document why OppositionScouting sheet is separate from AI_Knowledge_Base
- [ ] Add OppositionScouting sheet schema to project docs

---

## Recommendations

### 1. Fix Pseudocode First

Before team starts implementation, update `OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md`:
- Line 125, 129: Change `getUserProperties()` → `getScriptProperties()`
- Line 137: Document that same function is used for both game AI + opposition AI queues

### 2. Create Followup Spec

Write a short spec (2-3 pages) covering:
- [ ] `ensureOppositionScoutingSheetExists()` function (from Conflict #2)
- [ ] API endpoints `refreshOppositionMatches` + `generateOppositionInsightsImmediate` (from Conflict #3)
- [ ] Cache key format (from Conflict #5)

### 3. Update CLAUDE.md

Add new section: "Opposition Scouting System"
- Data sources + APIs used
- OppositionScouting sheet structure
- Processing windows (Sat 6 PM, Sun 10 AM)
- Cache strategy
- API endpoints

### 4. Don't Block Implementation

These conflicts are **easily fixable** and don't require broad redesign:
- Conflicts 1-3 are just missing implementation details
- Conflicts 4-5 are minor documentation/logic tweaks
- **Recommended: Fix conflicts, then start implementation without further delays**

---

## Next Steps

1. **Accept these findings** → "Yes, these make sense"
2. **Fix pseudocode** → Update integration plan with PropertiesService scope fix
3. **Write missing specs** → Create 2-3 page spec for Conflicts 2-3
4. **Update docs** → Add Opposition Scouting section to CLAUDE.md
5. **Ready to implement** → Phase 1 can proceed (Backend infrastructure)

