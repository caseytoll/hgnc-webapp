# Opposition Scouting + Planner Integration - Backend API Specification

**Document Purpose:** Detailed specification for backend API endpoints and sheet structure needed for Opposition Scouting + Planner Integration plan.

**Status:** Planning Draft  
**Blocks:** Implementation Phase 1 (Backend Infrastructure)  
**Related Plans:** OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md, CONFLICT_ANALYSIS_AND_FIXES.md

---

## Sheet Definition: OppositionScouting

### Purpose
Store opposition analytics and AI-generated insights for each team and opponent matchup. Created once during deployment, appended to for each opposition analysis.

### Structure

| Column | Name | Type | Purpose |
|--------|------|------|---------|
| A | Timestamp | String (ISO 8601) | When row was created (automatic) |
| B | TeamID | String | Which team is planning (e.g., "team_1762633769992") |
| C | Opponent | String | Opponent name (e.g., "Kilmore", "Benalla") |
| D | Round | Number | Which round (e.g., 6, 12) |
| E | GameDate | String (ISO date or gsh date) | When the game is scheduled |
| F | AISummary | String (Plain text, ~500 chars) | Narrative summary of key insights |
| G | AnalyticsJSON | String (JSON object) | Full structured data (all 26 insights as JSON) |
| H | GeneratedAt | String (ISO 8601) | When AI generation completed |
| I | CacheUntil | String (ISO 8601) | Cache expiration timestamp (usually +7 days) |
| J | Status | String (enum) | Processing status: `ready`, `processing`, `failed`, `stale` |

### Row Example

```
Timestamp: 2026-02-23T10:15:00Z
TeamID: team_1762633769992
Opponent: Kilmore
Round: 7
GameDate: 2026-02-28
AISummary: "Kilmore is a mid-tier side with strong shooting accuracy (64%). Their midcourt combination of Chen-Martinez has high possession control. Recommend tight marking in Q3/Q4 when they build momentum. Our team's speed advantage should be exploited on fast breaks."
AnalyticsJSON: {"groups": {"A": {"insight1": ..., "insight2": ...}, ...}, "summary": "...", "generatedAt": "2026-02-23T10:15:00Z"}
GeneratedAt: 2026-02-23T10:15:00Z
CacheUntil: 2026-03-02T10:15:00Z
Status: ready
```

### Sheet Setup (Code.js Function)

**Function Name:** `ensureOppositionScoutingSheetExists()`

**Responsibilities:**
- Check if "OppositionScouting" sheet exists
- If not: Create sheet with headers
- Format headers (bold, background, font color)
- Set column widths for readability
- Return sheet reference

**Called:** During deployment or admin initialization (one-time)

**Pseudocode:**
```javascript
function ensureOppositionScoutingSheetExists() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName('OppositionScouting');
  
  if (sheet) {
    Logger.log('OppositionScouting sheet already exists.');
    return sheet;
  }
  
  // Create sheet
  sheet = ss.insertSheet('OppositionScouting');
  
  // Add headers
  const headers = ['Timestamp', 'TeamID', 'Opponent', 'Round', 'GameDate', 
                   'AISummary', 'AnalyticsJSON', 'GeneratedAt', 'CacheUntil', 'Status'];
  sheet.appendRow(headers);
  
  // Format headers
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
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
  
  Logger.log('Created and initialized OppositionScouting sheet.');
  return sheet;
}
```

### Maintenance

- **Archival:** No automatic cleanup. Can manually delete old rows (>1 month old) if sheet grows large
- **Indexing:** Consider adding an index on columns B+C+D (TeamID, Opponent, Round) if sheet exceeds 1000 rows
- **Retention:** Keep last 2-3 weeks of opposition data (for coach reference)

---

## API Endpoints: Get Data

These endpoints fetch fresh data when coach manually refreshes opposition information.

### 1. Action: `refreshOppositionMatches`

**Purpose:** Fetch fresh fixture data immediately (no AI generation yet). Used when coach wants latest opponent info without waiting for Sunday.

**Trigger:** Coach clicks "Refresh Opposition Data" → Selects "Fast Data Only" → Calls this action

**Input Parameters:**
- `teamID` (required): Team ID (e.g., "team_1762633769992")

**Returns:**
```javascript
{
  success: true,
  fixturesUpdated: 2,          // Number of upcoming games with fresh data
  matches: [
    {
      round: 7,
      opponent: "Kilmore",
      date: "2026-02-28",
      ladderFetched: true,
      position: 8,              // Ladder position (from Squadi)
      formTrend: "WLWWL"
    },
    // ... more matches
  ],
  message: "Fixture data refreshed"
}
```

**Error Response:**
```javascript
{
  error: "Team not found" | "No upcoming games" | "[error message]"
}
```

**Implementation Notes:**
- Fetches upcoming games from team data (status === 'upcoming')
- Calls `getSquadiLadderForTeam(teamID, true)` with `forceRefresh: true` to bypass cache
- Returns fresh ladder position for each opponent
- Does NOT call Gemini (fast, ~2 sec per team)
- Does NOT update OppositionScouting sheet (only returns data)

**Backend Function:** `collectOppositionFixturesImmediate(teamID)`

---

### 2. Action: `generateOppositionInsightsImmediate`

**Purpose:** Generate all 26 opposition analytics immediately (synchronous). Used for urgent refresh when time-based trigger is in the future or delayed.

**Trigger:** Coach clicks "Refresh Opposition Data" → Selects "Complete Insights" → Calls this action

**Input Parameters:**
- `teamID` (required): Team ID
- `round` (required): Which round to generate insights for (e.g., 7)

**Returns:**
```javascript
{
  success: true,
  opponent: "Kilmore",
  round: 7,
  generated: true,
  generatedTimeMs: 18500,       // How long AI took (15-30 sec)
  message: "Opposition insights generated",
  analytics: {
    // Full 26-insight structure (see Opposition Scouting Plan)
    summary: "Narrative summary...",
    groups: {
      "A": { insight1: {...}, insight2: {...}, ... },
      // ... all groups A-G
    }
  }
}
```

**Error Response:**
```javascript
{
  error: "Team not found" | "Game not found" | "[error message]",
  stack: "[stack trace if available]"
}
```

**Implementation Notes:**
- This is SLOW (15-30 sec) because it calls Gemini multiple times (~5-10 calls)
- Coach should use this only when needed urgently (not routine)
- Runs synchronously (blocks until complete, then returns)
- Fetches fresh ladder data (does NOT use cache)
- Generates all 26 insights (full power, not subset)
- **Important:** Before calling Gemini, calculate H2H history (if available) from team data
- Stores result to OppositionScouting sheet immediately (so data persists)
- Updates frontend cache with fresh data
- Logs execution time for performance monitoring

**Backend Function:** `generateOppositionInsightsImmediately(teamID, round)`

---

## API Endpoints: Queue Management

These endpoints manage the Sunday 10 AM automated processing pipeline.

### 3. Action: `queueOppositionAI`

**Purpose:** Queue an opposition for AI processing. Called internally by Saturday 6 PM trigger or manually by API.

**Trigger:** Saturday 6 PM automated trigger (`collectOppositionFixtures`) or manual admin call

**Input Parameters:**
- `teamID` (required): Team ID
- `opponent` (required): Opponent name (must match how it appears in games)
- `round` (required): Round number
- `gameDate` (required): Game date (ISO format)

**Returns:**
```javascript
{
  success: true,
  queued: true,
  queueKey: "opposition_queue_team_123_6_data_team_123",
  message: "Opposition queued for AI generation"
}
```

**Error Response:**
```javascript
{
  error: "Invalid parameters" | "[error message]"
}
```

**Implementation Notes:**
- Stores job in PropertiesService.getScriptProperties() (shared script-level)
- Key format: `opposition_queue_{teamID}_{round}_{sheetName}`
- Value is JSON object with job details
- Non-blocking (returns immediately, processing happens on next Sunday 10 AM trigger)
- Idempotent (queueing same opponent twice just updates the job)

**Backend Function:** `queueOppositionAI(jobData)`

---

### 4. Trigger: `processOppositionAIQueue`

**Purpose:** Time-based trigger that runs every Sunday at 10:00 AM. Processes all queued opposition AI jobs.

**Trigger Schedule:** Weekly, every Sunday @ 10:00 AM

**Processing Logic:**
1. Get all `opposition_queue_*` properties from PropertiesService
2. For each job:
   - Load team data (if not cached)
   - Fetch fresh ladder positions
   - Calculate H2H history
   - Generate all 26 opposition analytics
   - Save to OppositionScouting sheet
   - Cache in frontend (1 week TTL)
3. Remove job from queue on success
4. On failure: Retry up to 3 times, then log error

**Success Criteria:**
- ✅ All queued jobs processed within 15 minutes
- ✅ Data saved to OppositionScouting sheet
- ✅ Cache populated for frontend
- ✅ Metrics logged (success/retry/failure)

**Error Handling:**
- Retry logic: Max 3 attempts (if failures occur)
- Graceful degradation: If Gemini quota exceeded, fall back to manual refresh option
- Monitoring: Log all failures with job details (teamID, opponent, round)

**Backend Function:** `processOppositionAIQueue()`

---

## Data Structures

### PropertiesService Queue Job

**Key Format:** `opposition_queue_{teamID}_{round}_{sheetName}`

**Value (JSON):**
```javascript
{
  teamID: "team_1762633769992",      // Which team
  sheetName: "data_team_1762633769992", // Team's data sheet name
  opponent: "Kilmore",                // Opponent
  round: 7,                           // Which round
  gameDate: "2026-02-28",             // When scheduled
  fixtureCollectedAt: "2026-02-21T18:00:00Z", // When fixtures were collected
  ladderData: {                       // Cached ladder info
    position: 8,
    wins: 4,
    losses: 4,
    draws: 1,
    formTrend: "WLWWL"
  },
  status: "pending_ai",               // pending_ai | processing | done
  attempts: 0,                        // Retry counter
  nextWindow: "sunday_10am"
}
```

### Opposition Analytics JSON Structure

**Stored in:** OppositionScouting sheet, column G (AnalyticsJSON)

**Structure:** (From Opposition Scouting Plan, Groups A-G, total 26 insights)

```javascript
{
  groups: {
    "A": {
      // Quarter Strength Analysis (4 insights)
      "q1Strength": { ... },
      "q2Strength": { ... },
      // ... etc
    },
    "B": {
      // Relative Strength (3 insights)
      // ... 
    },
    // ... groups C through G
  },
  summary: "Narrative summary of tactical recommendations",
  generatedAt: "2026-02-23T10:15:00Z",
  version: "1.0"
}
```

---

## Frontend Cache Structure

### Cache Key Format

**Location:** `localStorage` under key `opposition_cache`

**Key Format:** `opposition_{teamID}_{opponent}_{round}`

**Example Key:** `opposition_team_123_Kilmore_7`

**Cache Entry:**
```javascript
{
  data: { /* Full opposition analytics JSON */ },
  expiresAt: 1709462400000,  // Timestamp when cache expires (usually +7 days)
  fetchedAt: 1709030400000   // When cache was populated
}
```

**Storage Format:**
```javascript
// localStorage is a flat key-value store
localStorage.opposition_cache = JSON.stringify({
  "opposition_team_123_Kilmore_7": {
    data: { ... },
    expiresAt: ...,
    fetchedAt: ...
  },
  "opposition_team_123_Benalla_8": {
    data: { ... },
    expiresAt: ...,
    fetchedAt: ...
  }
});
```

### Cache Invalidation

- **TTL:** Cache expires after 7 days (expires at CacheUntil timestamp from sheet)
- **Manual refresh:** Coach can force cache clear by clicking "Refresh Opposition Data"
- **Sheet-driven:** ExpiresAt comes from OppositionScouting sheet (CacheUntil column)
- **Stale data check:** Before displaying cache, check `new Date() < expiresAt`

---

## Deployment Checklist

### Before Going Live

- [ ] Create OppositionScouting sheet by running `ensureOppositionScoutingSheetExists()` in Apps Script console
- [ ] Verify sheet has correct column headers (A-J)
- [ ] Verify sheet columns have appropriate widths (set in function)
- [ ] Test `refreshOppositionMatches` API with a real team
- [ ] Test `generateOppositionInsightsImmediate` API with a real team (takes 15-30 sec)
- [ ] Set up time-based trigger for `processOppositionAIQueue` (Sunday 10:00 AM)
- [ ] Manually run `collectOppositionFixtures` (Saturday 6 PM) test
- [ ] Manually run `processOppositionAIQueue` (Sunday 10 AM) test
- [ ] Verify data saved correctly to OppositionScouting sheet
- [ ] Verify frontend cache persists correctly
- [ ] Check PropertiesService queue keys are properly namespaced (opposition_queue_*)

### Runtime Monitoring

- [ ] Monitor `processOppositionAIQueue` execution logs (weekly)
- [ ] Check OppositionScouting sheet for `failed` status entries
- [ ] Track how often manual `generateOppositionInsightsImmediate` is used
- [ ] Monitor Gemini API quote usage per Sunday

---

## Integration with Other Systems

### Interaction with Background AI Plan

**Queue Separation:**
- Game AI queue: `ai_queue_{gameID}_{sheetName}` in PropertiesService
- Opposition queue: `opposition_queue_{teamID}_{round}_{sheetName}` in **same** PropertiesService
- No collision risk (different key namespaces)

**Processing Timing:**
- Game AI: Every 5-10 minutes (continuous)
- Opposition: Sunday 10 AM (isolated window, no overlap)

**Data Storage:**
- Game AI: AI_Knowledge_Base sheet
- Opposition: OppositionScouting sheet (separate)

### Interaction with Opposition Scouting Plan

**Phases 1-3:** Original opposition scouting features (tactical notebook, manual display)  
**Phases 4-5:** Integration with Lineup Planner (uses this spec's API endpoints)

**Data Flow:**
1. Opposition Scouting Plan defines 26 analytics structure
2. This spec defines how to store/retrieve that data
3. Integration plan wires up frontend UI (hub + planner modal)

---

## Testing Strategy

### Unit Tests (Per Function)

**Test 1: `ensureOppositionScoutingSheetExists()`**
- [ ] Creates sheet if doesn't exist
- [ ] Returns existing sheet if already created
- [ ] Headers are in correct order
- [ ] Formatting applied correctly

**Test 2: `collectOppositionFixturesImmediate(teamID)`**
- [ ] Returns empty array if no upcoming games
- [ ] Returns all upcoming games with fresh ladder data
- [ ] Does not call Gemini (fast, <2 sec)
- [ ] Handles team not found gracefully

**Test 3: `generateOppositionInsightsImmediately(teamID, round)`**
- [ ] Generates all 26 insights
- [ ] Saves to OppositionScouting sheet
- [ ] Returns JSON with analytics structure
- [ ] Takes 15-30 seconds (log execution time)
- [ ] Handles game not found gracefully

**Test 4: `queueOppositionAI(jobData)`**
- [ ] Stores job in PropertiesService with correct key format
- [ ] Idempotent (queue same job twice = single entry)
- [ ] Job contains all required fields

**Test 5: `processOppositionAIQueue()`**
- [ ] Processes all queued jobs
- [ ] Removes successful jobs from queue
- [ ] Retries failed jobs (max 3 attempts)
- [ ] Logs execution time and results

### Integration Tests

- [ ] Saturday 6 PM trigger: `collectOppositionFixtures()` queues jobs correctly
- [ ] Sunday 10 AM trigger: `processOppositionAIQueue()` generates insights for all queued jobs
- [ ] Frontend can retrieve data from OppositionScouting sheet
- [ ] Frontend cache updates correctly after Sunday processing
- [ ] Manual refresh endpoints work correctly

### Load Tests

- [ ] Processing 50 opposition jobs in Sunday 10 AM window (<15 minutes total)
- [ ] PropertiesService handles 100+ concurrent queue keys
- [ ] OppositionScouting sheet handles 500+ rows without slowdown

---

## Migration & Rollback

### Rollback Plan

If something goes wrong post-deployment:

1. **Can't process opposition queue:** Delete all `opposition_queue_*` properties, disable triggers, clear OppositionScouting sheet
2. **Stale data in sheet:** Clear OppositionScouting sheet, re-run `collectOppositionFixtures()` + `processOppositionAIQueue()`
3. **Frontend cache corrupted:** Clear localStorage `opposition_cache`, let user refresh manually

### No Data Loss

- Opposition scouting data is optional (fallback to manual refresh works anytime)
- No team data is stored in OppositionScouting sheet (only analysis results)
- Can safely delete OppositionScouting sheet and recreate it

---

## Future Extensions

### Phase 2 Enhancements (Post-Integration)

- **Extend caching TTL:** Support coach preference for cache duration (3-7 days)
- **Archive old matches:** Auto-delete opposition data >30 days old
- **Diff tracking:** Store opposition changes over time (when key stats change)
- **Predictive modeling:** Use historical opposition data to predict outcomes

### Phase 3 Advanced

- **Opponent clustering:** Group similar opponents, compare tactics across group
- **Season-long trends:** Track how opponent's strength changes through season
- **Head-to-head deep dive:** Detailed analysis of H2H history (per-quarter stats)

