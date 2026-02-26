# Vibe Coding Guide: AI-Assisted Development

**Purpose:** Enable efficient solo development with AI copilot by providing clear context, decision rationale, test fixtures, and async handoff patterns.

**Format:** Use this guide when:
- Starting a new feature implementation session
- Handing off mid-project to resume later
- Asking AI for help (paste relevant section + question)
- Debugging a phase that's stuck

---

## Prerequisites: Before You Code Anything

Before starting Phase 1, verify your environment is ready (5 mins):

- [ ] **clasp installed:** Run `clasp --version` in terminal (should be 2.x+)
- [ ] **Apps Script project:** `clasp login` and `clasp clone <SCRIPT_ID>` completed
- [ ] **Latest Code.js:** Run `clasp push` so Apps Script has current code
- [ ] **Gemini API key:** Set in Apps Script Properties:
  - Apps Script editor → Project Settings → Script Properties
  - Add: `GEMINI_API_KEY` = your API key from Google AI Studio
- [ ] **Test Sheet created:** Google Sheet with sample team data (from CLAUDE.md's Team Data structure)
- [ ] **Time-based triggers enabled:** Apps Script editor → Triggers → check "setupAIQueueTrigger" exists
- [ ] **Sandbox test function:** In Apps Script editor, paste `function testGemini() { console.log('OK'); }`, run it, verify no errors

If any checkbox fails, see Debugging Guide below before proceeding.

---

## Quick Start: Before Every Session

### Checklist (2 mins)

- [ ] Which feature are we implementing? (e.g., "Opposition Scouting Phase 2")
- [ ] What's the success criteria? (can you describe "done"?)
- [ ] What tests must pass? (green checkmarks in output)
- [ ] What's blocked? (any dependencies holding us up?)
- [ ] How much time today? (1 hour? 4 hours?)

### Template: Quick Context

Copy this, fill in blanks, paste to AI:

```
SESSION CONTEXT:
- Feature: [NAME]
- Phase: [NUMBER] of [TOTAL] (est: X hours)
- Success criteria: [Done when...]
- Last status: [What was completed last time]
- Blocker (if any): [What we're stuck on]
- Time available: [X hours]
```

---

## Claude Code Setup: Before First Pause/Resume

If using Claude Code (async sessions), configure these once before starting:

**Claude Code Limitations You Need to Know:**
- ❌ Can't run `clasp push` (you execute this)
- ❌ Can't run `npm run test:run` (you run tests)
- ❌ Can't verify Apps Script triggers (you check manually)
- ✅ CAN read files, modify code, write tests
- ✅ CAN simulate test scenarios with mock data
- ✅ CAN explain deployment steps (you execute them)

**Your Manual Steps:**
1. After Claude Code says "Code complete": Run `clasp push && clasp deploy -i <ID> -d "Description"`
2. Verify: Check Apps Script console → Execution logs (trigger running?)
3. Test: Run one game through queue, check AI_Knowledge_Base sheet
4. Report back: "Deployment successful. Trigger processed X jobs. Ready for Phase 2."

---

## Phase Readiness Checks - Gap 7

**Use this checklist to determine if a phase is ready to start (no external blockers):**

### Pre-Phase Validation Function

```javascript
function checkPhaseReadiness(phase) {
  const blockers = [];
  
  switch(phase) {
    case 'COMBINED_AI_PHASE_1':
      // Required: Nothing (foundation phase)
      if (!sheetExists('AI_Knowledge_Base')) blockers.push('AI_Knowledge_Base sheet missing');
      if (!getGeminiKey()) blockers.push('Gemini API key not configured');
      break;
      
    case 'COMBINED_AI_PHASE_2':
      // Required: Phase 1 complete (queue infrastructure working)
      if (!functionExists('processAIQueue')) blockers.push('Phase 1 queue not deployed');
      if (getMetricCount('ai_queue_success', '1d') < 5) blockers.push('Phase 1 not proven (need 5+ successful jobs)');
      break;
      
    case 'OPPOSITION_SCOUTING_PHASE_1':
      // Required: Phase 1 - Fixture collection tested
      if (!functionExists('collectOppositionFixtures')) blockers.push('Fixture collection not deployed');
      if (!getSquadiApiKey()) blockers.push('Squadi API key not found');
      break;
      
    case 'OPPOSITION_SCOUTING_PHASE_5':
      // Required: Phases 1-4 complete
      const prerequisitePhases = ['OPPOSITION_SCOUTING_PHASE_1', 'OPPOSITION_SCOUTING_PHASE_2', 'OPPOSITION_SCOUTING_PHASE_3', 'OPPOSITION_SCOUTING_PHASE_4'];
      prerequisitePhases.forEach(p => {
        if (getPhaseStatus(p) !== 'DEPLOYED') blockers.push(`${p} not ready`);
      });
      if (!sheetExists('AI_Knowledge_Base')) blockers.push('AI_Knowledge_Base not set up');
      break;
      
    case 'MATCH_DAY_PLAYBOOK':
      // Required: Opposition Scouting complete
      if (!functionExists('generateMatchDayPlaybook')) blockers.push('Requires Opposition Scouting Phase 5');
      if (getMetricCount('opposition_ai_success', '7d') === 0) blockers.push('No opposition scouting data available');
      break;
  }
  
  return {
    ready: blockers.length === 0,
    blockers: blockers,
    startDate: blockers.length === 0 ? 'NOW' : 'BLOCKED',
    blockingPhases: blockers
      .map(b => b.match(/Phase \d+/) ? b : null)
      .filter(Boolean)
  };
}
```

### Phase Status Tracking

Store phase status in Google Sheets "Settings" tab:

| Phase | Deployed | Started | Tested | Notes |
|-------|----------|---------|--------|-------|
| COMBINED_AI_PHASE_1 | ✓ 2026-02-15 | ✓ 2026-02-15 | ✓ 2026-02-16 | 5 jobs processed, avg 4.2s |
| COMBINED_AI_PHASE_2 | ✗ Queued | - | - | Blocked: Phase 1 < 7 days |
| OPPOSITION_SCOUTING_PHASE_1 | ✓ 2026-02-17 | ✓ 2026-02-17 | ✓ 2026-02-18 | Squadi fixture sync working |
| ... | | | | |

**Decision Logic:**
- **Start Immediately:** If no blockers in checkPhaseReadiness() AND all required sheets exist AND APIs configured
- **Delay Until:** If blocker phase not deployed, wait N days for that phase to stabilize (7 days minimum)
- **Cannot Start:** If prerequisite fundamentally changed (e.g., AI_Knowledge_Base schema changed mid-phase, need rollback)

---

## Featured Phases with Full Context

### Phase: Combined AI - Phase 1: Background Queue Infrastructure

**Estimated Duration:** 6-8 hours (can break into 2 × 3-4 hour sessions)

**Success Criteria (Phase Done When):**
- [ ] `processAIQueue()` exists and runs every 10 minutes via Apps Script time-based trigger
- [ ] `queueGameAI(data)` stores jobs in PropertiesService with correct key format
- [ ] Queue key naming: `ai_queue_{gameID}_{sheetName}` (verified in tests)
- [ ] Retry logic works: Job attempts increment, max 3 retries, then logged as failed
- [ ] Change detection: Same game finalized twice doesn't re-queue (hash-based)
- [ ] All unit tests pass (queueGameAI, processAIQueue, calculateGameDataHash, retry logic)
- [ ] Manual integration test: Finalize a game → see AI queued → processAIQueue() generates summary
- [ ] Metrics logged: `ai_queue_success`, `ai_queue_retry`, `ai_queue_failed`

**Not Done When:**
- Just pseudocode written (needs functional code)
- Tests not running or failing
- Retry logic not tested with actual failures
- Time-based trigger not set up in Apps Script
- Manual test not completed end-to-end

**Files Modified This Phase:**
- `apps-script/Code.js` — Add 4 functions: `queueGameAI()`, `processAIQueue()`, `calculateGameDataHash()`, `callGeminiGameAI()`
- `apps-script/appsscript.json` — Unchanged
- Google Sheets — Uses existing `AI_Knowledge_Base` tab, no new sheets
- Coach/Parent app code — No changes (backend-only phase)

**Code Archaeology (Claude Code: Read First):**
- [ ] Read `function logMetric()` in Code.js (~20 lines) — Use this for logging
- [ ] Read `function getTeams()` in Code.js (~40 lines) — Shows PropertiesService pattern
- [ ] Read error handling: Search for `try {` and `catch` blocks — Copy the pattern

**Code Structure (Where to Add) - Gap 5: Code.js Folder Structure:**

Code.js is organized in sequential sections (line ranges estimated):

| Section | Lines | Purpose |
|---------|-------|----------|
| Imports & Initialization | 1-50 | const APIs, onOpen, doGet, doPost |
| Team Management | 50-150 | ensureTeamsSheetStructure, loadMasterTeamList, getTeams, createTeam, etc |
| **Team Data Operations** | 150-250 | getTeamData, saveTeamData, updateTeam |
| Player Sync | 250-350 | savePlayerLibrary, backupPlayerCounts |
| **Squadi Integration** | 350-450 | fetchSquadiFixtureData, fetchSquadiLadder, computeGameDayLadder |
| **PHASE 1 (New)** | 450-600 | `calculateGameDataHash`, `queueGameAI`, `getQueuedJobs`, `callGeminiGameAI`, `processAIQueue`, `setupAIQueueTrigger` |
| **PHASE 2 (New)** | 600-750 | Opposition scouting queue operators |
| AI/ML Gen Functions | 750-900 | callGeminiGameAI, callGeminiSeasonAnalytics, callGeminiTrainingFocus |
| Diagnostics & Logging | 900-1000 | logMetric, getDiagnostics, etc |
| Utilities | 1000-1100 | fuzzyOpponentMatch, formatters, helpers |
| Error Handling | 1100-1150 | Custom error classes |

**Phase 1 Placement Rule:**
- Insert Phase 1 functions immediately AFTER Squadi Integration (line ~450)
- Keep 5 functions together in ONE section (don't split)
- Use consistent naming: all `queue*` or `calculate*` prefix
- Use existing `logMetric()` from Diagnostics section for all logging

**Batch Operations Strategy:**
- Don't split queue functions across file lines
- Keep all 4 functions together in one contiguous section
- Use consistent naming: all start with queue* or Game* prefix
- Use existing `logMetric()` for all logging (not console.log)

**Phase 1 Checkpoint (Safe Pause Point):**
- [ ] All 4 functions implemented
- [ ] All unit tests passing
- [ ] Is this deployable alone? **YES** — Queue infrastructure works independently
- [ ] Safe to pause here? **YES** — Phase 2 doesn't depend on queue processing
- [ ] Safe to resume in 3+ days? **YES** — Code is complete and tested
- [ ] Leave state: Tests passing, no syntax errors, ready for `clasp push`

**Micro-Tasks (4-6 hour chunks)**

**Task 1: Queue Job Storage & Retrieval (1.5-2 hours)**
- [ ] Implement `queueGameAI(gameData)` function in Code.js
  - Takes: gameID, sheetName, teamID, type (e.g., "game_summary")
  - Returns: `{ success: true, queueKey: "ai_queue_..." }`
  - Stores: PropertiesService.getScriptProperties() with JSON job object
  - Timestamp: Always include queuedAt timestamp
- [ ] Implement `getQueuedJobs()` helper to read all `ai_queue_*` properties
- [ ] Unit test: queueGameAI creates correct key + format
- [ ] Unit test: getQueuedJobs retrieves all jobs correctly
- [ ] Unit test: Queueing same game twice is idempotent (updates, not duplicate)

**Task 2: Change Detection via Hash (1-1.5 hours)**
- [ ] Implement `calculateGameDataHash(game)` function
  - Inputs: scores, lineup, notes ONLY (ignore timestamps, cosmetic changes)
  - Output: SHA256 hash of JSON string
  - Why: Detect if coach edited game significantly (retry if changed)
- [ ] Store hash in job: `lastKnownHash` field
- [ ] When processing, compare current hash vs stored hash
  - If different: Re-generate AI (coach made material change)
  - If same: Skip (already done, save quota)
- [ ] Unit test: Different scores = different hash
- [ ] Unit test: Just timestamp change = same hash

**Task 3: Processing Queue + Retry Logic (2-2.5 hours)**
- [ ] Implement `processAIQueue()` main function
  - Reads all `ai_queue_*` properties
  - For each job:
    - Load game data from sheets
    - Check if changed via hash (skip if same)
    - Call Gemini if needed
    - Save result to AI_Knowledge_Base sheet
    - On success: Delete from queue, log metric
    - On error: Check attempts counter
      - If <3: Increment, leave in queue, log retry
      - If >=3: Delete, log failure, notify (optional)
  - Total runtime: Should complete <10 min for 30 jobs
- [ ] Implement `callGeminiGameAI(gameData)` helper
  - Takes: formatted game data (from Opposition Scouting Plan format)
  - Returns: Parsed JSON with game summary structure
  - Error handling: Returns null on quota exceeded, network error (graceful)
- [ ] Error handling: Try-catch around Gemini call, retry on transient errors
- [ ] Metrics: Log `ai_queue_success`, `ai_queue_retry_attempt_N`, `ai_queue_failed`
- [ ] Unit test: processAIQueue with mock jobs works
- [ ] Unit test: Retry counter increments correctly
- [ ] Unit test: Max 3 retries enforced

**Task 4: Time-Based Trigger Setup (1 hour)**
- [ ] In Apps Script, create time-based trigger
  - Function: `processAIQueue`
  - Frequency: Every 10 minutes
  - Delete old triggers if they exist (don't duplicate)
- [ ] Implement `setupAIQueueTrigger()` function
  - Creates trigger if doesn't exist
  - Logs: "Time-based trigger for processAIQueue created"
- [ ] Call `setupAIQueueTrigger()` during initial deployment
- [ ] Monitor: Check Apps Script execution logs to verify runs every 10 min
- [ ] Test: Manually trigger processAIQueue() from console, see it works

**Task 5: Integration Test (1 hour)**
- [ ] End-to-end test scenario:
  1. Create a test game with scores + lineup
  2. Call `queueGameAI()` → verify job stored
  3. Manually call `processAIQueue()`
  4. Check AI_Knowledge_Base sheet → verify row added with summary
  5. Verify metrics logged (can check Diagnostics sheet)
- [ ] Repeat test with two identical game finalizations → verify hash prevents re-gen

**Test Failure Scenarios - Gap 9**

**Scenario 1: Gemini Quota Exceeded (429 Error)**
```javascript
// Mock Gemini to return 429
const mockGemini_429 = () => {
  throw new Error('429: Too many requests');
};

// Test: processAIQueue should keep job in queue with retry backoff
test('Quota exceeded triggers exponential backoff', () => {
  const job = { gameID: 'game_1', attempts: 0, queuedAt: now };
  
  // Simulate 429 error
  try {
    callGeminiGameAI(job);  // Throws 429
  } catch (e) {
    handleQuotaExceeded(job, 0);
  }
  
  // Verify: Job still in queue with nextRetryAt = now + 60 sec
  const updated = getQueueJob(job.key);
  expect(updated.attempts).toBe(1);
  expect(updated.nextRetryAt).toBeGreaterThan(now);
  expect(updated.status).toBe('retry_pending');
});

// Test: After 3 quota retries, job marked failed
test('Max retries exceeded on quota errors', () => {
  const job = { gameID: 'game_1', attempts: 2, queuedAt: now - 10*60*1000 };
  
  try {
    callGeminiGameAI(job);  // Throws 429 for 3rd time
  } catch (e) {
    handleQuotaExceeded(job, 2);
  }
  
  const updated = getQueueJob(job.key);
  expect(updated.status).toBe('failed');
  expect(updated.attempts).toBe(3);
});
```

**Scenario 2: Network Timeout**
```javascript
const mockGemini_timeout = () => {
  throw new Error('Network timeout: ETIMEDOUT');
};

test('Network timeout triggers quick retry', () => {
  const job = { gameID: 'game_2', attempts: 0 };
  
  try {
    callGeminiGameAI(job);  // Throws timeout
  } catch (e) {
    handleTransientError(job, 0, e);
  }
  
  const updated = getQueueJob(job.key);
  expect(updated.attempts).toBe(1);
  // Backoff: 10 sec (much shorter than quota backoff)
  expect(updated.nextRetryAt - Date.now()).toBeLessThan(15 * 1000);
});
```

**Scenario 3: Invalid Data (Team Archived)**
```javascript
test('Archived team fails immediately (no retry)', () => {
  const job = { gameID: 'game_3', teamID: 'archived_team', attempts: 0 };
  
  const archived = getTeam('archived_team');  // Returns archived: true
  if (archived.archived) {
    handleInvalidData(job, new Error('Team archived'));
  }
  
  const updated = getQueueJob(job.key);
  expect(updated.status).toBe('failed');
  expect(updated.attempts).toBe(0);  // No increment
  
  const metric = getMetric('ai_queue_failed');
  expect(metric.reason).toContain('archived');
});
```

**Scenario 4: Game Not Finalized (Missing Scores)**
```javascript
test('Incomplete game removed from queue', () => {
  const job = { gameID: 'game_4', attempts: 0 };
  const game = getGame('game_4');  // scores: null
  
  if (!game.scores) {
    handleInvalidData(job, new Error('Game not finalized'));
  }
  
  expect(getQueueJob(job.key).status).toBe('failed');
});
```

**Scenario 5: Hash Unchanged (No Re-queue Needed)**
```javascript
test('Unchanged game hash skips re-generation', () => {
  const game = { gameID: 'game_5', scores: {...}, lineup: {...} };
  const hash1 = calculateGameDataHash(game);
  
  // Coach changes opponent name (not in hash)
  game.opponent = 'New Name';
  const hash2 = calculateGameDataHash(game);
  
  expect(hash1).toBe(hash2);  // Same hash
  
  // Should NOT queue AI
  const queued = queueGameAI({ gameID: 'game_5', forceRefresh: false });
  expect(queued.alreadyQueued).toBe(true);
});

test('Changed scores hash triggers re-queue', () => {
  const game = { gameID: 'game_6', scores: { Q1: 15 } };
  const hash1 = calculateGameDataHash(game);
  
  // Coach updates Q1 score
  game.scores.Q1 = 18;
  const hash2 = calculateGameDataHash(game);
  
  expect(hash1).not.toBe(hash2);  // Different hash
  
  // Should queue AI
  const queued = queueGameAI({ gameID: 'game_6', forceRefresh: false });
  expect(queued.queued).toBe(true);
});
```

**Test Data Examples**

**Input: Game Data for Gemini (from Opposition Scouting Plan format)**
```javascript
{
  teamID: "team_1762633769992",
  gameID: "game_1735250400000",
  round: 6,
  opponent: "Kilmore",
  date: "2026-02-14",
  scores: {
    Q1: { us: 15, opponent: 12 },
    Q2: { us: 18, opponent: 14 },
    Q3: { us: 16, opponent: 18 },
    Q4: { us: 17, opponent: 19 },
    total: { us: 66, opponent: 63 }
  },
  lineup: {
    Q1: { GS: "Sarah", GA: "Emma", WA: "Lisa", C: "Maya", WD: "Jess", GD: "Anna", GK: "Kate" },
    // ... other quarters
  },
  notes: {
    Q1: "Started well, good ball movement",
    Q2: "Some turnovers in midcourt",
    Q3: "Kilmore caught up, defensive pressure",
    Q4: "Close finish, poor free throw rate"
  }
}
```

**PropertiesService Queue Job**
```javascript
Key: "ai_queue_game_1735250400000_data_team_1762633769992"
Value: {
  gameID: "game_1735250400000",
  sheetName: "data_team_1762633769992",
  teamID: "team_1762633769992",
  type: "game_summary",
  queuedAt: "2026-02-14T20:30:00Z",
  lastKnownHash: "a1b2c3d4e5f6...",
  attempts: 0,
  lastError: null,
  priority: 1
}
```

**Expected Success Response**
```javascript
{
  gameID: "game_1735250400000",
  teamID: "team_1762633769992",
  type: "game_summary",
  summary: "Strong start (15-12 Q1) followed by momentum swing in Q3. Kilmore's defensive intensity in final quarter nearly cost us the game. Key area: free throw execution under pressure. Team showed resilience, closed out close match.",
  insights: [
    { category: "Strengths", points: ["Early game composure", "Q1 ball movement"] },
    { category: "Improvements", points: ["Free throw conversion (shots: 8, made: 5)", "Q3 defensive pressure response"] },
    { category: "Key Players", points: ["Sarah (GS): Solid positioning, 66% accuracy", "Emma (GA): Steady presence, high touches"] }
  ],
  generatedAt: "2026-02-14T20:35:00Z",
  modelUsed: "gemini-2.0-flash",
  tokensUsed: 1247
}
```

**Metrics Logged**
```javascript
logMetric('ai_queue_success', {
  gameID: "game_1735250400000",
  teamID: "team_1762633769992",
  processingTimeMs: 4200,
  tokensUsed: 1247,
  timestamp: "2026-02-14T20:35:00Z"
});

logMetric('ai_queue_retry', {
  gameID: "game_1735250400000",
  attempt: 1,
  reason: "Network timeout",
  timestamp: "2026-02-14T20:32:00Z"
});

logMetric('ai_queue_failed', {
  gameID: "game_1735250400000",
  reason: "Max retries exceeded - Gemini quota exceeded",
  attempts: 3,
  totalTimeMs: 12400,
  timestamp: "2026-02-14T20:40:00Z"
});
```

---

### Phase: Opposition Scouting + Planner Integration - Phase 1: Backend Infrastructure

**Estimated Duration:** 2-3 hours (one focused session)

**Success Criteria (Phase Done When):**
- [ ] OppositionScouting sheet exists with correct column headers (A-J)
- [ ] `queueOppositionAI(job)` stores opposition jobs in PropertiesService
- [ ] Queue key format: `opposition_queue_{teamID}_{round}_{sheetName}` (verified)
- [ ] `collectOppositionFixtures(teamID)` fetches upcoming opponents + ladder data
- [ ] `processOppositionAIQueue()` generates all 26 analytics for queued opposition
- [ ] Retry logic: 3 attempts max, then log failure
- [ ] Saturday 6 PM trigger set up and tested
- [ ] Sunday 10 AM trigger set up and tested
- [ ] Manual test: Queue opposition → Sunday trigger processes → sheet updated

**Not Done When:**
- Missing sheet creation function
- Missing API endpoint handlers
- Frontend doesn't use new data
- Retry logic untested
- Time-based triggers not firing

**Files Modified This Phase:**
- `apps-script/Code.js` — Add 5 functions: `ensureOppositionScoutingSheetExists()`, `queueOppositionAI()`, `collectOppositionFixtures()`, `processOppositionAIQueue()`, `saveOppositionScoutingData()`
- `apps-script/appsscript.json` — Unchanged
- Google Sheets — Creates new `OppositionScouting` tab with 10 columns (A-J), schema in OPPOSITION_SCOUTING_BACKEND_SPEC.md
- Coach/Parent app code — No changes (backend-only phase)

**Code Archaeology (Claude Code: Read First):**
- [ ] Read `function ensureTeamsSheetStructure()` in Code.js (~50 lines) — Example of sheet creation pattern
- [ ] Read how to append rows: Search `appendRow` in Code.js (~5 examples) — You'll do same for OppositionScouting
- [ ] Read `function getSquadiLadder()` in Code.js (~40 lines) — Shows how to fetch external data

**Code Structure (Where to Add):**
1. Add `ensureOppositionScoutingSheetExists()` right after `ensureTeamsSheetStructure()` (same area)
2. Create new section: `// === Opposition Scouting Queue (Phase 1) ===`
3. Add remaining 4 functions in same section
4. Keep all opposition queue functions together (don't scatter)

**Phase 1 Checkpoint (Safe Pause Point):**
- [ ] All 5 functions implemented
- [ ] Saturday 6 PM trigger created and tested
- [ ] Sunday 10 AM trigger created and tested
- [ ] Is this deployable alone? **YES** — Sheet creation + queuing works independently
- [ ] Safe to pause here? **YES** — Frontend (Phase 2) works independently without this
- [ ] Safe to resume in 3+ days? **YES** — Phase 2 doesn't depend on Phase 1
- [ ] Leave state: Both triggers working, no syntax errors, ready for `clasp push`

**Micro-Tasks**

**Task 1: OppositionScouting Sheet Setup (30 mins)**
- [ ] Implement `ensureOppositionScoutingSheetExists()` in Code.js
  - Creates sheet if doesn't exist
  - Adds headers in row 1: Timestamp, TeamID, Opponent, Round, GameDate, AISummary, AnalyticsJSON, GeneratedAt, CacheUntil, Status
  - Sets column widths (A: 120, B: 100, C: 150, D: 80, E: 120, F: 400, G: 800, H: 200, I: 150, J: 100)
  - Format headers: bold, dark background, white text
- [ ] Unit test: Sheet created correctly, headers in right order
- [ ] Unit test: Running twice doesn't duplicate headers
- [ ] Manual test: Run function, verify sheet appears in Google Sheets

**Task 2: Opposition Queue Storage (45 mins)**
- [ ] Implement `queueOppositionAI(jobData)` function
  - Input: { teamID, sheetName, opponent, round, gameDate }
  - Store in: PropertiesService.getScriptProperties()
  - Key format: `opposition_queue_{teamID}_{round}_{sheetName}`
  - Value: JSON with job details + status + attempts
  - Idempotent: Queueing same opponent twice updates, doesn't duplicate
- [ ] Implement `getOppositionQueue()` helper to read all `opposition_queue_*`
- [ ] Unit test: queueOppositionAI creates correct key + format
- [ ] Unit test: getOppositionQueue retrieves all opposition jobs
- [ ] Unit test: Idempotency tested

**Task 3: Fixture Collection Trigger (45 mins)**
- [ ] Implement `collectOppositionFixtures(teamID)` function
  - Load team data
  - Find all games with status === "upcoming"
  - For each opponent:
    - Fetch fresh ladder via `getSquadiLadderForTeam(teamID, true)` (forceRefresh=true)
    - Queue for Sunday via `queueOppositionAI()`
    - Log success
  - Return: { success: true, fixturesQueued: N }
- [ ] Time-based trigger: Saturday 6 PM
  - Iterate all teams
  - Call `collectOppositionFixtures()` for each
  - Log completion
- [ ] Unit test: collectOppositionFixtures queues correct opposition
- [ ] Manual test: Saturday trigger runs, jobs appear in PropertiesService
- [ ] Edge case: Team with no upcoming games → return fixturesQueued: 0 (not error)

**Task 4: Opposition AI Processing (45 mins)**
- [ ] Implement `processOppositionAIQueue()` function
  - Get all `opposition_queue_*` properties
  - For each job:
    - Load team data + ladder + H2H history
    - Call `generateOppositionAnalytics()` (from Opposition Scouting Plan)
    - Generate all 26 insights (Groups A-G)
    - Save to OppositionScouting sheet via `saveOppositionScoutingData()`
    - Delete job from queue on success
    - On error: Retry logic (max 3 attempts)
  - Time-based trigger: Sunday 10 AM
  - Total runtime: Should complete <15 min for 20 opposition teams
- [ ] Implement `saveOppositionScoutingData()` helper
  - Appends row to OppositionScouting sheet
  - Columns: Timestamp, TeamID, Opponent, Round, GameDate, AISummary, AnalyticsJSON, GeneratedAt, CacheUntil, Status
  - Timestamp + GeneratedAt auto-populated
  - CacheUntil = GeneratedAt + 7 days
  - Status = "ready"
- [ ] Unit test: processOppositionAIQueue processes queued jobs
- [ ] Unit test: Retry counter increments on failure
- [ ] Manual test: Queue opposition Saturday, Sunday 10 AM trigger runs, sheet updated

**Test Data Examples**

**Upcoming Game for Opposition**
```javascript
{
  gameID: "game_1707043200000",
  round: 7,
  opponent: "Benalla",
  date: "2026-02-28",
  status: "upcoming",
  location: "Benalla Sports Complex"
}
```

**Opposition Queue Job (PropertiesService)**
```javascript
Key: "opposition_queue_team_123_7_data_team_123"
Value: {
  teamID: "team_123",
  sheetName: "data_team_123",
  opponent: "Benalla",
  round: 7,
  gameDate: "2026-02-28",
  status: "pending_ai",
  attempts: 0,
  queuedAt: "2026-02-22T18:00:00Z"
}
```

**Opposition Analytics Output (26 Insights, Groups A-G)**
```javascript
{
  groups: {
    "A": {
      "q1Strength": { insight: "...", rating: 7.2 },
      "q2Strength": { insight: "...", rating: 6.8 },
      "q3Strength": { insight: "...", rating: 8.1 },
      "q4Strength": { insight: "...", rating: 7.9 }
    },
    "B": {
      "relativeToOurTeam": { insight: "...", advantage: "midcourt" },
      // ... 2 more
    },
    // ... groups C-G
  },
  summary: "Benalla is a mid-tier team with strong Q3 performance. Their midcourt control edge matches our weakness. Recommend defensive focus in transitions.",
  generatedAt: "2026-02-23T10:15:00Z"
}
```

**Row Added to OppositionScouting Sheet**
```
Timestamp: 2026-02-23T10:15:00Z
TeamID: team_123
Opponent: Benalla
Round: 7
GameDate: 2026-02-28
AISummary: "Benalla is mid-tier with strong Q3..."
AnalyticsJSON: [Full 26-insight JSON above]
GeneratedAt: 2026-02-23T10:15:00Z
CacheUntil: 2026-03-02T10:15:00Z
Status: ready
```

---

## Common Patterns & Templates

### Git Commit Template (Copy & Use)

When committing work, include this template to help AI pick up next:

```bash
git commit -m "feat(phase-name): brief description

IMPLEMENTATION:
- What was implemented in this commit
- Function names added/modified
- Test files added/modified

TESTING:
- Tests passing: [List which tests]
- Manual testing: [What you tested manually]
- Coverage: [What % of phase complete]

NEXT STEPS:
- [Task to do next]
- [Task after that]

BLOCKERS:
[Any blockers? Or "None"]

ESTIMATED TIME FOR NEXT COMMIT:
[2h, 3h, etc.]

SESSION NOTES:
[Anything interesting that came up? Decisions made?]"
```

### Example Commit

```bash
git commit -m "feat(combined-ai-phase-1): implement queue job storage + retrieval

IMPLEMENTATION:
- queueGameAI(gameData) → stores jobs in PropertiesService
- getQueuedJobs() → retrieves all ai_queue_* properties
- calculateGameDataHash(game) → SHA256 hash of scores/lineup/notes
- Updated Code.js with 120 lines of implementation

TESTING:
- Tests passing: queueGameAI_creates_correct_key, queueGameAI_idempotent, getQueuedJobs_retrieves_all, calculateGameDataHash_detection
- Manual testing: Queued 3 test games, all stored correctly
- Coverage: 35% of Phase 1 complete

NEXT STEPS:
- Implement processAIQueue() main function (highest priority)
- Add retry logic with attempt counter
- Create callGeminiGameAI() helper

BLOCKERS:
None - ready to proceed

ESTIMATED TIME FOR NEXT COMMIT:
2-3 hours (processAIQueue + retry logic)

SESSION NOTES:
- Discovered getScriptProperties() is critical (not getUserProperties()) for time-triggered functions
- Tests would catch this, but learned it early
- Architecture solid from here"
```

### Asking AI for Help: Good Prompt Pattern

**Pattern 1: Pair Reading (Before Coding — Fastest)**

Do this FIRST for 10x faster implementation:

```
Before implementing queueGameAI(), let's read existing code together:

1. Show me logMetric() function in Code.js
2. Show me getTeams() function in Code.js
3. Show me PropertiesService.getScriptProperties usage (search Code.js)
4. Show me error handling (search for try/catch pattern)

Then explain: How should queueGameAI() follow these patterns?
```

This takes 2 minutes vs Claude Code reading 2000 lines guessing.

**Pattern 2: Task Implementation (After Reading)**

**BAD:** "Implement Phase 1 of Combined AI"  
**GOOD:**
```
I'm implementing Combined AI Phase 1: Background Queue Infrastructure.

CONTEXT:
- Feature: Combined AI game summaries auto-generated after finalization
- Phase: 1 of 7 (estimated 6-8 hours total)
- Success: processAIQueue() runs every 10 min, queued games get AI summaries
- Current status: Just started, code archaeology done (saw logMetric pattern)

TASK:
Implement queueGameAI(gameData) function in Code.js around lines 100-150

REQUIREMENTS:
- Stores game jobs in PropertiesService.getScriptProperties()
- Key format: ai_queue_{gameID}_{sheetName}
- Value: JSON with fields: gameID, sheetName, teamID, type, queuedAt, attempts, lastError, priority
- Idempotent: Call twice with same game = update, not duplicate
- Return: { success: true, queueKey: "ai_queue_..." }
- Use logMetric() pattern we just reviewed (not console.log)

TEST DATA:
[Paste test data from guide]

CONSTRAINTS:
- Use PropertiesService.getScriptProperties() (not getUserProperties())
- Max job size ~5KB (PropertiesService limit)
- No async calls (synchronous only)
- Follow logMetric(name, data) pattern from Code.js

GOTCHAS TO AVOID:
- Don't store full game object (too large), just IDs + hash
- Don't use JSON.stringify on circular references (will crash)
- Use getProperties() + setProperties() for atomic updates (not separate setProperty calls)

Let me know when done + provide test examples I should write.
```

---

## Decision Rationale (Why We Chose This Way)

### PropertiesService.getScriptProperties() vs getUserProperties()

**Question:** Why use script-level properties instead of user-level?

**Answer:**
- ✅ Time-based triggers have no user context → can't access getUserProperties()
- ✅ Script-level survives app closure → coaches don't lose queued jobs
- ✅ Script-level accessible to all users → single queue for all teams
- ❌ No per-user privacy (but we don't need it—queue is internal)
- ❌ Can grow large (but JSON is small, monitoring solves this)

**If you change this:** Time-triggered functions would fail. Blocker.

### Saturday 6 PM vs Other Times

**Question:** Why Saturday 6 PM for fixture collection?

**Options:**
- Saturday 2 PM: Too early (coaches still in/finishing games)
- Saturday 6 PM: ✅ Games done, coaches home, data stable
- Saturday evening: Risk fixture delays if matches overrun
- Sunday morning: Redundant (fixtures don't change Saturday evening → Sunday morning)

**If you change this:** Update coach documentation (they expect data Monday morning).

### Sunday 10 AM for AI Generation

**Question:** Why Sunday 10 AM specifically?

**Options:**
- Saturday 8 PM: Too early (coach not ready to review)
- Sunday 8 AM: Too early (coach sleeping)
- Sunday 10 AM: ✅ Coach awake, ready to review Tuesday-Friday, matches game rhythm
- Sunday evening: Too late (some coaches plan Sunday night)

**If you change this:** Coach experience changes. Document new timeline.

### Retry Logic: Max 3 Attempts

**Question:** Why 3 retries instead of 5 or unlimited?

**Calculation:**
- 1st attempt: Immediate
- 2nd attempt: +10 min (processAIQueue runs every 10 min)
- 3rd attempt: +20 min (total 20-30 min from queue time)
- After 3: Likely permanent failure (quota, bad data, API down)

**If you change this:** Update monitoring thresholds for "stuck job".

### Change Detection via Hash

**Question:** Why hash-based change detection instead of comparing objects?

**Answers:**
- ✅ Works across server restarts (hash is in job object)
- ✅ Ignores cosmetic changes (timestamp, _lastModified)
- ✅ Efficient (one hash comparison vs deep object diff)
- ❌ Could use version timestamps instead (but hash is cleaner)

**If you change this:** Make sure field selection is clear (scores + lineup + notes only).

---

## PropertiesService Gotchas: Avoid These Silent Failures

When implementing queue functions, Claude Code will hit these edge cases. Know them BEFORE coding:

### 1. **String Size Limit (11 MB per key, ~5 KB safe)**

**What breaks:**
```javascript
// DON'T: Store large game data directly
queueGameAI(hugeGameDataObject); // If > 5KB, may silently fail

// DO: Filter to essential fields only
const jobData = {
  gameID: gameData.gameID,
  sheetName: gameData.sheetName,
  hash: calculateGameDataHash(gameData), // ~32 chars
  attempts: 0,
  queuedAt: new Date().toISOString()
  // Don't store: full lineup, full game object, full notes
};
```

**Test for this:**
```javascript
// Test: Queue game with 10 players × 4 quarters (large data)
// Verify: Job stored, no "size exceeded" error
```

### 2. **JSON.stringify() Fails on Circular References**

**What breaks:**
```javascript
// DON'T: Include objects with circular refs
const gameData = { opponent: { name: "Kilmore" }, team: { ... } };
gameData.team.gameRef = gameData; // Circular!
JSON.stringify(gameData); // Throws, job never queued (silent)

// DO: Use only primitive fields or arrays
const jobData = {
  gameID: gameData.gameID,
  opponent: gameData.opponent.name, // String, not object
  teamID: gameData.teamID // String
  // No circular references
};
```

**Test for this:**
```javascript
// Test: Pass game object with circular refs
// Expected: Should not crash, should extract only safe fields
```

### 3. **Key Name Length (256 char limit)**

**What breaks:**
```javascript
// Your current key: "ai_queue_game_1735250400000_data_team_1762633769992"
// That's 52 chars (safe)

// But don't add arbitrary data to key:
const key = `ai_queue_${gameID}_${sheetName}_${teamName}_${opponentName}`; // BAD
// If any field is long, key exceeds 256 chars → fails silently

// DO: Keep key formula simple
const key = `ai_queue_${gameID}_${sheetName}`; // Always <200 chars
```

**Test for this:**
```javascript
// Test: Use teams with long names (20+ chars)
// Verify: Key still works, format consistent
```

### 4. **Atomicity: No Transactions**

**What breaks:**
```javascript
// DON'T: Multiple setProperty calls
const props = PropertiesService.getScriptProperties();
props.setProperty('key1', value1); // Write 1
props.setProperty('key2', value2); // Write 2
props.setProperty('key3', value3); // If fails, key1+2 saved but key3 lost

// DO: Bulk atomic update
const props = PropertiesService.getScriptProperties();
const all = props.getProperties(); // Read all once
all['key1'] = value1;
all['key2'] = value2;
all['key3'] = value3;
props.setProperties(all); // Single atomic write
```

**Test for this:**
```javascript
// Test: Queue 10 jobs rapidly in a loop
// Verify: All appear in PropertiesService (none lost)
```

### 5. **Read Frequency Quota (Not Size, but Calls)**

**What breaks:**
```javascript
// DON'T: Read PropertiesService 100+ times
for (let i = 0; i < 100; i++) {
  const data = PropertiesService.getScriptProperties().getProperty(key); // 100 reads!
}

// DO: Read once, cache
const props = PropertiesService.getScriptProperties();
const allProps = props.getProperties(); // 1 read
for (const key in allProps) {
  const data = allProps[key]; // Cache hit
}
```

**Test for this:**
```javascript
// Test: processAIQueue with 50 pending jobs
// Verify: Completes in <5 min (not 50 individual reads)
```

---

## Debugging Guide: When Things Go Wrong

### Problem: Opposition Queue Jobs Don't Process

**Diagnosis:**
1. Check PropertiesService has jobs: `getOppositionQueue()` returns > 0 jobs
2. Check trigger ran: Apps Script execution logs show Sunday 10 AM entries
3. Check OppositionScouting sheet: New rows added this week?
4. Check Diagnostics sheet: Any `opposition_ai_failed` entries?

**Common Causes:**
- Trigger not set up → Set up via `setupOppositionAITrigger()`
- Job format wrong → Verify key format in PropertiesService
- Gemini quota exceeded → Check quota in Google AI console
- Team data not loading → Verify teamID + sheetName are correct

### Problem: Game AI Not Generating

**Diagnosis:**
1. Check game queued: Look in PropertiesService for `ai_queue_{gameID}_*`
2. Check trigger ran: Apps Script logs show processAIQueue() every 10 min?
3. Check AI_Knowledge_Base sheet: New row added?
4. Check metrics: Search Diagnostics sheet for `ai_queue_*` metrics

**Common Causes:**
- Trigger not set up → Run `setupAIQueueTrigger()`
- Hash didn't change → Coach didn't edit game significantly
- Gemini quota → Check quota + cost tracking
- Network timeout → Check error logs, should auto-retry

### Problem: Time-Based Triggers Not Running

**Diagnosis:**
1. Go to Apps Script console
2. Check "Execution logs" (left sidebar)
3. Do you see `processAIQueue` entries every 10 min?
4. Check timestamp of last execution

**Common Causes:**
- Trigger deleted accidentally → Recreate via setup function
- Wrong function name → Verify function exists + matches trigger
- Quota/limits exceeded → Check quota, may need to wait
- Script disabled → Check project settings

**Fix:**
```javascript
// In console, run:
setupAIQueueTrigger();
setupOppositionAITrigger();
// Check execution logs after 10 min
```

---

## Monitoring & Failure Handling: Keep AI Healthy

### Performance SLOs (Service Level Objectives)

These targets define "healthy" queue performance. Monitor them to catch problems early.

**Phase 1: Combined AI Queue**

| Metric | Target | Warning Threshold | Action |
|--------|--------|-------------------|--------|
| `processAIQueue()` runtime | <5 minutes | >7 minutes | Scale back or disable features |
| Gemini API latency | <3 seconds per call | >5 seconds | Check quota, add retries |
| Queue job success rate | >95% | <90% | Investigate failed jobs |
| Queue size (pending jobs) | <100 | >150 | Check why jobs not processing |
| Time between trigger runs | ~10 minutes | >15 minutes | Check trigger setup |
| Max job retries reached | 0-5 per week | >10 per week | Investigate root cause |
| Gemini quota used per day | <500 tokens/team | >1000 tokens/team | Reduce AI features or batch calls |

**Phase 1: Opposition Scouting Queue**

| Metric | Target | Warning Threshold | Action |
|--------|--------|-------------------|--------|
| `collectOppositionFixtures()` runtime | <2 minutes total | >3 minutes | Check ladder API speed |
| `processOppositionAIQueue()` runtime | <15 minutes for 20 teams | >20 minutes | Check Gemini latency |
| Opposition job success rate | >95% | <90% | Investigate failed analytics |
| Queue size (pending opposition jobs) | <50 | >75 | Check why jobs stuck |
| Opposition generation time | <2 minutes per team | >3 minutes per team | Optimize Gemini calls |

**How to Monitor:**

1. **Weekly Spot Check (2 mins)**
   - Go to Diagnostics sheet → Filter to this week
   - Count `ai_queue_success` vs `ai_queue_failed` (want >95% success)
   - Look for any `ai_queue_failed_permanent` entries (investigate those)

2. **Monthly Deep Dive (10 mins)**
   - Create pivot table of metrics by week
   - Graph: Success rate, queue backlog, processing time
   - If trend going down → Fix before it breaks

3. **Real-Time Alert (Set Up Once)**
   - When queue job fails 3 times in a row → Send error log entry
   - When queue size exceeds 200 → Log warning (manual check)
   - When trigger skips >2 cycles → Log failure (restart needed)

### Failure Scenarios & How to Recover

**Scenario 1: Gemini Quota Exceeded (Mid-Process)**

**What it looks like:**
- `callGeminiGameAI()` returns null
- Job attempts increment but no error logged clearly
- Coach sees "AI feature unavailable" in app
- Diagnostics sheet shows `ai_queue_failed` with reason = "Quota exceeded"

**What code does (implement in Phase 1):**
```javascript
// In callGeminiGameAI():
try {
  const response = geminiAPI.call(gameData);
  return response;
} catch (error) {
  if (error.message.includes('QUOTA')) {
    logMetric('ai_quota_exceeded', {
      timestamp: new Date().toISOString(),
      jobCount: getQueuedJobs().length,
      teams: getTeams().length
    });
    return null; // Signal quota exhausted
  }
  throw error; // Re-throw other errors
}

// In processAIQueue(), when callGeminiGameAI() returns null:
if (aiResult === null) {
  logMetric('ai_queue_failed_quota', {
    gameID: job.gameID,
    teamID: job.teamID,
    timestamp: new Date().toISOString()
  });
  // Leave job in queue (don't delete)
  // Stop processing other jobs (quota exhausted)
  return { success: false, reason: "quota_exhausted", jobsProcessed: 0 };
}
```

**Coach's experience:**
- Sunday 10 AM: AI doesn't generate (invisible, just doesn't run)
- Coach checks opposition insights → Sees "Generating... please check back later"
- Coach has no stats, but game still plays normally

**What to do (Manual)**
1. Check Google AI Console → Quotas
2. If quota reset Sunday, try Monday morning
3. If at spending limit, upgrade plan or reduce AI features temporarily
4. Log it for next review (adjust squad size or feature set)

---

**Scenario 2: Job Stuck After 3 Retries (Permanent Failure)**

**What it looks like:**
- Same game appears in queue every 10 minutes (never completes)
- Diagnostics sheet shows `ai_queue_failed` with attempts=3
- Job never deleted from PropertiesService

**What code does (implement in Phase 1):**
```javascript
// In processAIQueue():
for (const job of jobs) {
  try {
    const result = callGeminiGameAI(job.gameData);
    if (result === null) { // Quota exhausted
      continue; // Skip rest of jobs
    }
    // Save success...
    deleteQueuedJob(job.key);
    logMetric('ai_queue_success', { ... });
  } catch (error) {
    job.attempts++;
    if (job.attempts >= 3) {
      logMetric('ai_queue_failed_permanent', {
        gameID: job.gameID,
        reason: error.message,
        attempts: job.attempts,
        lastError: error.stack.substring(0, 200)
      });
      deleteQueuedJob(job.key); // Clean up after 3 attempts
    } else {
      // Update job in PropertiesService with new attempt count
      updateQueuedJob(job);
      logMetric('ai_queue_retry_attempt_' + job.attempts, { ... });
    }
  }
}
```

**Coach's experience:**
- Sunday 10 AM: One game's AI doesn't generate
- Coach checks Diagnostics sheet, sees reason: "Invalid game data format"
- Coach manually fixes game data or deletes + re-adds game

**What to do (Manual)**
1. Check Diagnostics sheet → Find the failed job
2. Read "lastError" column → Shows what went wrong
3. Common fixes:
   - **Invalid format:** Reload game from sheet, re-save (normalizes)
   - **Missing data:** Add lineup/scores manually, re-queue
   - **Gemini API error:** Wait 1 hour, re-queue manually
4. Log in coaches documentation (don't use until fixed)

---

**Scenario 3: Trigger Stops Running (Silent Failure)**

**What it looks like:**
- processAIQueue() hasn't run for 30+ minutes
- No queue jobs get processed
- No error visible in Apps Script (triggers just... stop)
- Coach sees "Generating... please check back later" indefinitely

**What code does (Set up once, then monitor):**
```javascript
// In processAIQueue(), add heartbeat logging:
logMetric('ai_queue_trigger_executed', {
  timestamp: new Date().toISOString(),
  jobsProcessed: successCount,
  jobsFailed: failureCount,
  queueSize: remaining.length
});

// On trigger setup:
function setupAIQueueTrigger() {
  // Delete old triggers (preventing duplicates)
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'processAIQueue') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('processAIQueue')
    .timeBased()
    .everyMinutes(10)
    .create();
  
  logMetric('ai_queue_trigger_setup', {
    timestamp: new Date().toISOString(),
    status: "created"
  });
}
```

**Coach's experience:**
- Sunday 10 AM passes, opposition insights don't generate
- Coach waits until Monday → Still no insights
- Confusion: "Are my leagues broken?"

**What to do (Manual)**
1. Check Apps Script console → Triggers (left sidebar)
2. Do you see `processAIQueue` trigger?
3. If not → Run `setupAIQueueTrigger()` in console
4. If yes but still not running → Check "Notifications" tab for errors
5. If still stuck → Delete trigger + re-run setup

**Prevention (Automate Next Release):**
- Add "heartbeat" check: If no `ai_queue_trigger_executed` in 30 mins, recreate trigger
- Or: Email coach if no queue execution in 24 hours

---

**Scenario 4: Sheet Quota Exceeded (Rare)**

**What it looks like:**
- `saveOppositionScoutingData()` fails
- Operations sheet has 2M+ rows (Google Sheets limit)
- New insights can't be saved

**Prevention (implement in Phase 1):**
```javascript
// When appending to OppositionScouting:
function saveOppositionScoutingData(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName('OppositionScouting');
  
  // Check row count before appending
  const rowCount = sheet.getLastRow();
  if (rowCount > 100000) {
    logMetric('opposition_sheet_full', {
      currentRows: rowCount,
      timestamp: new Date().toISOString()
    });
    
    // Archive old rows (> 6 months) to OppositionScouting_Archive sheet
    archiveOldOppositionData(sheet);
    
    // Retry append
    sheet.appendRow([...]);
  } else {
    sheet.appendRow([...]);
  }
}

// Optional: Archive function
function archiveOldOppositionData(sheet) {
  // Move rows with CacheUntil < today to Archive sheet
  // Creates OppositionScouting_Archive if doesn't exist
  // Prevents main sheet from growing unbounded
}
```

**Coach's experience:**
- Opposition insights don't save (rare, would take months)
- Manually delete old rows if needed (clear OppositionScouting, re-run)

---

### Monitoring Dashboard (Setup Once)

Create a simple monitoring sheet (call it "AI_Health") with formulas:

```
=COUNTIF(Diagnostics!C:C, "ai_queue_success") → Success count this week
=COUNTIF(Diagnostics!C:C, "ai_queue_failed") → Failure count this week
=[Success count] / ([Success] + [Failure]) → Success rate %
=COUNTIF(Props!A:A, "ai_queue_*") → Current queue size
=COUNTA(OppositionScouting!A:A) - 1 → Opposition insights generated
```

Every Monday morning (5 mins):
- Glance at AI_Health sheet
- Success rate >95%? ✅ Good
- Success rate <90%? ⚠️ Investigate
- Queue size >150? ⚠️ Check why backed up

---

## Testing Checklist: Ensure Phase is Complete

### Unit Tests (Must Include)

**Combined AI Phase 1 - Failure Scenarios:**
```javascript
// Test Gemini quota exceeded
function testGeminiQuotaExceeded() {
  const mockError = new Error('QUOTA_EXCEEDED: Daily quota exceeded');
  // Mock callGeminiGameAI to throw quota error
  const result = callGeminiGameAI(testGameData);
  expect(result).toBe(null); // Should return null, not throw
}

// Test PropertiesService size limit
function testQueueJobSizeLimit() {
  const hugeGameData = { /* 10MB of data */ };
  const result = queueGameAI(hugeGameData);
  expect(result.success).toBe(false); // Should fail gracefully
  expect(result.reason).toContain('size'); // Should explain why
}

// Test retry logic
function testMaxRetriesEnforced() {
  const job = { gameID: 'test', attempts: 3, data: {} };
  processJob(job);
  // After 3 attempts, should delete and log failure
  expect(getQueuedJobs()).not.toContainKey(job.key);
  expect(Diagnostics).toHaveEntry('ai_queue_failed_permanent');
}

// Test cross-team isolation
function testCrossTeamQueuingIsolation() {
  queueGameAI({ teamID: 'team_123', gameID: 'game_1', ... });
  queueGameAI({ teamID: 'team_456', gameID: 'game_1', ... });
  // Both jobs queued with different keys (teamID in key)
  expect(getQueuedJobs().length).toBe(2);
  expect(queueKey1).not.toBe(queueKey2);
}

// Test idempotency
function testQueueGameAIIdempotent() {
  queueGameAI(gameData); // Queue once
  const key1 = lastQueueKey;
  queueGameAI(gameData); // Queue same game again
  const key2 = lastQueueKey;
  expect(key1).toBe(key2); // Should use same key (idempotent)
  expect(getQueuedJobs().length).toBe(1); // One job, not duplicate
}
```

### Before Committing Phase Work

- [ ] All unit tests passing (run test suite)
- [ ] Manual integration test done (end-to-end scenario)
- [ ] Edge cases tested (empty queue, max retries, network timeout)
- [ ] Metrics logged correctly (check Diagnostics sheet)
- [ ] Code reviewed for errors (or AI reviewed it)
- [ ] Git commit includes "Next steps" for next session
- [ ] No console errors in Apps Script logs

### Before Starting Next Phase

- [ ] Previous phase success criteria all green ✅
- [ ] Previous phase git commits have clear "Next steps"
- [ ] Previous phase tests still passing (no regressions)
- [ ] Understand what doesn't work yet (vs what works)

---

## Reference: Phase Dependency Map

```
Combined AI Phase 1 (Queue Infrastructure)
  ↓ (prerequisite for)
Combined AI Phase 2 (Event Analyzer Module)
  ↓
Combined AI Phase 3 (Pattern Detector Module)
  ↓
Opposition Scouting Phase 1 (Profile Hub)
  ↓
Opposition Scouting Phase 2 (Scouting Notes)
  ↓
Opposition Scouting + Planner Phase 1 (Backend Infrastructure) ← CAN START HERE IF NEEDED
  ↓
Opposition Scouting + Planner Phase 2 (Scouting Hub UI)
  ↓
Opposition Scouting + Planner Phase 3 (Planner Integration)
```

---

## Session Planning Template

Use this at start of each session:

```markdown
## Session: [Date, Time Available]

**Feature:** [Name, e.g., "Combined AI Phase 1"]  
**Status:** [% complete from last session]  
**Time Available:** [2h, 4h, etc.]  
**Last Commit:** [Link or message from git log]  

### What We're Doing
[1-2 sentence description]

### Success Criteria (How We Know We're Done)
- [ ] Criteria 1
- [ ] Criteria 2
- [ ] Criteria 3

### Plan
1. [Task 1] (est: X time)
2. [Task 2] (est: X time)
3. [Task 3] (est: X time)

### Potential Blockers
- [Blocker 1 and plan to handle it]
- [Blocker 2 and plan to handle it]

---

## Session Notes (Fill After)

**What Got Done:**  
[List tasks completed]

**What Didn't Get Done:**  
[List tasks deferred + why]

**Tests Passing:**  
[List test status]

**Next Session:**  
[What to work on next, time estimate]

**Blockers for Next:**  
[Any show-stoppers?]
```

---

## AI Assistance Tips

### Best Prompts for This Project

**✅ DO:**
- "Implement Task X from Phase Y. Here's the test data and success criteria..."
- "I got this error: [error]. How to debug?"
- "Why does PropertiesService.getScriptProperties() matter here?"
- "Write unit tests for function X"
- "Review my code here for bugs or edge cases"

**❌ DON'T:**
- "Implement Combined AI" (too vague)
- "Fix the opposition scouting" (doesn't say what's broken)
- "Make it work" (no success criteria)
- "Ignore the spec and do your thing" (spec is valuable)

### Sharing Context with AI

**Copy-paste template:**
```
CURRENT TASK:
[Name and success criteria]

RELEVANT SPEC:
[Paste the spec section from planning docs]

TEST DATA:
[Paste test data examples]

CODE SO FAR:
[Paste existing related code, if any]

QUESTION:
[Specific question, not "help me code"]
```

### When AI Diverges from Plan

**If AI suggests something different:**
1. Ask: "Why does this approach differ from the spec?"
2. Check spec: Is the spec wrong or AI overengineering?
3. Decide: Stick to spec (intentional) or update spec + code?
4. Document: Why you chose spec vs alternative

Remember: **The spec is the source of truth.** AI helps execute it, not change it mid-phase.

### Cross-Reference Other Docs

**When implementing Opposition Scouting:**
- Full API specs → See `OPPOSITION_SCOUTING_BACKEND_SPEC.md` (OppositionScouting sheet definition, 4 API endpoints, queue format)

**If you hit a conflict between plans:**
- See `CONFLICT_ANALYSIS_AND_FIXES.md` (5 conflicts identified, solutions documented)

**For broader context:**
- Implementation strategy → `README.md` (Roadmap, Dependencies, Master schedule)
- Architecture decisions → `CLAUDE.md` (Opposition Scouting System section, 500+ lines)

---

## Quick Reference: Key Functions by Phase

**Phase 1 (Combined AI):**
- `queueGameAI(gameData)` → Stores to PropertiesService
- `processAIQueue()` → Runs every 10 min, generates AI
- `calculateGameDataHash(game)` → Change detection
- `callGeminiGameAI(gameData)` → Calls Gemini API

**Phase 1 (Opposition Scouting + Planner):**
- `ensureOppositionScoutingSheetExists()` → Sheet setup (one-time)
- `queueOppositionAI(jobData)` → Stores to PropertiesService
- `collectOppositionFixtures(teamID)` → Saturday 6 PM trigger
- `processOppositionAIQueue()` → Sunday 10 AM trigger
- `saveOppositionScoutingData(data)` → Writes to sheet

---

## Final Tip: Stay Organized

**Each session, commit with this template:**
```
[Task completed] - [Tests passing] - [Next task] - [Time estimate]

Example:
✅ queueGameAI + tests - 3 of 4 tests passing - processAIQueue next - 2h
```

This single line tells you everything when you come back 3 days later.

---

**Good luck vibe coding! 🚀**

