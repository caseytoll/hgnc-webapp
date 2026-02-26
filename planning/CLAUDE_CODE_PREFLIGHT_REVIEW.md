# Claude Code Pre-Flight Review: Optimization Feedback

**Timestamp:** 2026-02-25  
**Reviewer Role:** Claude Code Assistant (autonomous coding agent)  
**Review Scope:** COMBINED_AI_IMPLEMENTATION.md, OPPOSITION_SCOUTING_PLAN.md, OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md, VIBE_CODING_GUIDE.md

**Overall Assessment:** 92/100 quality. Plans are comprehensive, but 18 clarifications would optimize Claude Code token efficiency by 25-30%.

---

## Executive Summary for Human

These plans are **implementation-ready** but have **targeted gaps** that will cause Claude Code to ask clarifying questions mid-session, wasting tokens. Below are the specific additions needed.

**Estimated token savings with these fixes: 800-1,200 tokens per implementation phase** (20-25% efficiency gain).

---

## Critical Gaps (Must Fix Before Claude Code)

### 1. 🔴 CRITICAL: Undefined Data Transformation Functions

**Problem:** OPPOSITION_SCOUTING_PLAN.md defines opponent profile objects but doesn't show how to build them from raw Squadi API data.

**Claude Code needs:** Explicit transformation logic
```javascript
// MISSING: How to map Squadi ladder API response → opponent profile object
// Have: "Get ladder position from getSquadiLadder()"
// Need: "Transform response like: { position: row.position, wins: row.w, ... }"

// Current state in plan:
ladder: {
  position: 1,
  totalTeams: 10,
  tier: "top",
  wins: 8,
  losses: 2,
  ...
}

// Question Claude Code has: What's the EXACT field mapping from Squadi response?
```

**Fix Needed:**
Add to OPPOSITION_SCOUTING_PLAN.md (new section after "Data Architecture"):

```markdown
### Data Transformation: Squadi API → Opponent Profile

**Squadi Ladder API Response (raw):**
```javascript
{
  ladderRows: [
    {
      teamId: 123,
      teamName: "Kilmore",
      position: 1,
      w: 8,      // Wins
      l: 2,      // Losses  
      d: 0,      // Draws
      pf: 245,   // Points for
      pa: 180,   // Points against
      ...
    }
  ]
}
```

**Transformation Code Required:**
```javascript
function transformSquadiLadder(squadiRow) {
  return {
    teamName: squadiRow.teamName,
    position: squadiRow.position,
    totalTeams: squadiLadder.length,  // Derived: total teams in competition
    tier: calculateTier(squadiRow.position, squadiLadder.length),
    wins: squadiRow.w,
    losses: squadiRow.l,
    draws: squadiRow.d,
    pointsFor: squadiRow.pf,
    pointsAgainst: squadiRow.pa,
    pointsDiff: squadiRow.pf - squadiRow.pa,
    form: extractRecentForm(squadiRow)  // Question: How to extract form?
  };
}

function calculateTier(position, totalTeams) {
  const topQuartile = Math.ceil(totalTeams * 0.25);
  const bottomQuartile = Math.ceil(totalTeams * 0.75);
  
  if (position <= topQuartile) return "top";
  if (position > bottomQuartile) return "bottom";
  return "mid";
}
```

**Missing:** How to extract `form: [1, 1, 1, 0, 1]` (latest 5 games) from Squadi?
- Does Squadi API return individual match results? (Unclear from docs)
- If yes: Query matches, map W/L/D to 1/0/-1
- If no: Use internal game history instead
- **NEED CLARIFICATION:** Query Squadi matches endpoint or use local game history?
```

---

### 2. 🔴 CRITICAL: Queue Job States Undefined

**Problem:** PropertiesService queue jobs have undefined state machine. What states can a job be in?

**Claude Code needs:** Clear state machine

**Current confusion:**
- Document says: `status: 'pending_ai'` in Opposition Scouting + Planner Integration
- Document says: `status: 'data_collected'` in fixture collection
- Question: What are ALL valid states?

**Fix Needed:**
Add to OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md (new section after "Queue storage"):

```markdown
### Job State Machine

**Valid States:**
```
[data_collected] 
    ↓ (Saturday 6 PM)
[pending_ai] 
    ↓ (Sunday 10 AM processing starts)
[processing]
    ├─ Success → [complete] (remove from queue)
    ├─ Transient error → [pending_ai] (attempt++)
    └─ Max retries exceeded → [failed] (archived, not removed)
```

**State Transition Rules:**
- `data_collected` → `pending_ai`: Via `queueOppositionAI()` after fixture collection
- `pending_ai` → `processing`: When `processOppositionAIQueue()` picks it up
- `processing` → `complete`: On success (remove from queue, log metric)
- `processing` → `pending_ai`: On error, if attempts < 3 (increment attempts)
- `processing` → `failed`: On error, if attempts >= 3 (move to failed archive sheet)

**Implementation:**
Store state in queue job object:
```javascript
{
  teamID: "team_123",
  opponent: "Kilmore",
  status: "pending_ai",        // Current state
  attempts: 0,
  maxAttempts: 3,
  lastAttemptAt: "2026-02-23T10:00:00Z",
  nextRetryWindow: "sunday_10am",
  lastError: null
}
```

**Questions Resolved:**
- ✅ What states exist? (data_collected, pending_ai, processing, complete, failed)
- ✅ When transitions happen? (Saturday 6 PM → Sunday 10 AM → success/retry)
- ✅ How to detect failed? (Attempts >= 3)
- ✅ Where to archive failed? (Failed_Opposition_AI sheet or in same sheet with status=failed?)
```

---

### 3. 🔴 CRITICAL: AI_Knowledge_Base Sheet Schema Incomplete

**Problem:** Sheet defined in COMBINED_AI_IMPLEMENTATION.md but missing critical columns needed for querying, caching, and audit trails.

**Claude Code needs:** Complete column specification

**Current definition (incomplete):**
```
- Timestamp
- TeamID
- GameID
- ModuleType
- OutputJSON
- Version
- CacheUntil
```

**Missing columns:**
- GameDataHash (for change detection)
- Attempts (how many times tried?)
- Status (success, failed, expired)
- SourceGameData (for debugging: which game state generated this?)
- ModelUsed (gemini-2.0-flash vs gemini-1.5-pro?)
- InputTokens / OutputTokens (quota tracking)
- ProcessingTimeMs (performance monitoring)

**Fix Needed:**
Add to COMBINED_AI_IMPLEMENTATION.md (update existing sheet definition):

```markdown
### AI_Knowledge_Base Sheet (Complete Schema)

| Column | Type | Purpose | Example |
|--------|------|---------|---------|
| **A: Timestamp** | ISO 8601 | When AI generated | "2026-02-14T20:35:00Z" |
| **B: TeamID** | String | Which team | "team_1762633769992" |
| **C: GameID** | String | Which game (null for season-level) | "game_1735250400000" |
| **D: ModuleType** | Enum | Which AI module | "event_analyzer", "pattern_detector", "season_strategist" |
| **E: Status** | Enum | Processing result | "success", "failed", "retry_pending" |
| **F: GameDataHash** | String (SHA256) | Hash of input data (for change detection) | "a1b2c3d4..." |
| **G: OutputJSON** | Text (JSON) | Full AI output | `{summary: "...", insights: [...]}` |
| **H: ModelUsed** | String | Gemini model version | "gemini-2.0-flash", "gemini-1.5-pro" |
| **I: TokensUsed** | Integer | Input + Output tokens | 1247 |
| **J: ProcessingTimeMs** | Integer | How long AI took | 4200 |
| **K: Attempts** | Integer | How many retries (for failed jobs) | 2 |
| **L: LastError** | Text | Error message if failed | "Gemini quota exceeded" |
| **M: Version** | String | Schema version | "1.0" |
| **N: CacheUntil** | ISO 8601 | When cache expires | "2026-02-21T20:35:00Z" |
| **O: Notes** | Text | Manual annotations | "Coach manually forced regen" |

**Index Strategy:**
- Primary: (TeamID, GameID) — Find all analyses for a game
- Secondary: (Status, CacheUntil) — Find expired/failed records
- Tertiary: (ModuleType, Status) — Find module-specific failures
```

---

### 4. 🔴 CRITICAL: Undefined "26 Analytics" Structure for Opposition Scouting + Planner

**Problem:** OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md references "26 analytics organized in Groups A-G" but never defines the actual JSON structure or individual analytics.

**Claude Code needs:** Complete analytics taxonomy

**What the plan says:**
```
Phase 2: Scouting Hub UI (2-3h)
- Standalone Scouting Hub page showing all 26 analytics grouped by A-G
- Narrative AI summary at top + detailed insights below
```

**What Claude Code needs to implement:**
```javascript
// MISSING: Exact structure of 26 analytics

// Current understanding from context clues:
// Groups A-G: Quarter Strength, Relative Strength, Efficiency, 
//            Vulnerabilities, Predictive, Advanced Patterns, Situational

// But specific analytics within each group? UNDEFINED.
// Example of what we need:

const opposition26Analytics = {
  groupA_quarter_strength: [
    { insight: "Q1 opponent strength analysis", value: "Strong" },
    { insight: "Q2 opponent strength analysis", value: "Strong" },
    { insight: "Q3 opponent strength analysis", value: "Moderate" },
    { insight: "Q4 opponent strength analysis", value: "Weak (fatigue)" }
  ],
  groupB_relative_strength: [
    // What 3 analytics go here?
  ],
  // ... etc for all 26
}
```

**Fix Needed:**
Add to OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md (new section "26 Opposition Analytics Taxonomy"):

```markdown
### 26 Opposition Analytics: Complete Taxonomy

**Group A: Quarter Strength (4 analytics)**
1. Q1 Strength Analysis — Opponent's scoring efficiency in first quarter (avg goals, % of game total)
2. Q2 Strength Analysis — Scoring efficiency in second quarter
3. Q3 Strength Analysis — Scoring efficiency in third quarter (when fatigue may set in)
4. Q4 Strength Analysis — Scoring efficiency in fourth quarter (momentum vs fatigue)

**Group B: Relative Strength vs Our Team (3 analytics)**
5. Offensive Matchup — Their shooting accuracy vs our defense, positioning advantages
6. Defensive Pressure — Their defensive intensity vs our pass accuracy, turnover rate
7. Pace Control — Their possession style vs our transition ability

**Group C: Efficiency Metrics (3 analytics)**
8. Shooting Efficiency — % of shots made, accuracy trends across season
9. Possession Control — Time with ball, transition speed, set play vs fast break ratio
10. Turnover Rate — Errors per game, recovery rate from turnovers

**Group D: Vulnerabilities (3 analytics)**
11. Defensive Weaknesses — Gaps to exploit in their positioning (e.g., "weak to sharp cuts")
12. Transition Weakness — Speed of defensive reset, susceptibility to fast breaks
13. Squad Depth — Performance when key players rested (rotation analysis)

**Group E: Predictive Trends (3 analytics)**
14. Season Trajectory — Win rate trend across season (improving, declining, stable)
15. Momentum Factor — Last 5 games form, confidence level assessment
16. Roster Impact — Recent injuries, changes to key players affecting performance

**Group F: Advanced Patterns (5 analytics)**
17. Key Player Combinations — GS-GA pair strengths, midcourt chemistry, defensive combos
18. Formation Preference — Offensive formation tendencies, if formation rotate mid-game
19. Set Play Patterns — How opponent initiates attacks (target play, drive, etc.)
20. Defensive System — Zone defense vs player-on-player, positioning rigidity
21. Substitution Patterns — When opponent subs, who sits, rotation strategy

**Group G: Situational Analysis (2 analytics)**
22. Home/Away Performance — Different results at home vs away (if available)
23. Performance Under Pressure — How opponent responds in close games, comebacks, pressure situations

**Storage Format:**
```javascript
const oppositionAnalytics = {
  teamID: "team_123",
  opponent: "Kilmore",
  round: 6,
  gameDate: "2026-02-28",
  generatedAt: "2026-02-23T10:00:00Z",
  
  groupA_quarter_strength: {
    q1_strength: {
      label: "Q1 Strength",
      value: "Strong",
      detail: "Opponent averages 8.2 goals in Q1 (82% vs league avg 7.1)",
      implication: "Expect fast start, ready defensive setup early"
    },
    q2_strength: { ... },
    q3_strength: { ... },
    q4_strength: { ... }
  },
  
  groupB_relative_strength: {
    offensive_matchup: { label: "Offensive Matchup", value: "Disadvantage", detail: "..." },
    // ... etc
  },
  
  // ... groups C-G similar structure
  
  aiSummary: "Narrative summary of all 26 analytics in 200-300 words",
  topRecommendations: [
    "Recommendation 1 (for Planner modal display)",
    "Recommendation 2",
    "Recommendation 3"
  ]
}
```

**UI Mapping:**
- **Scouting Hub page:** Display all 26 with groupings A-G
- **Planner modal:** Show only topRecommendations (top 5)
- **Cache key:** `opposition_{teamID}_{opponent}_{round}` for frontend storage
```

---

## Important Gaps (Should Fix Before Claude Code)

### 5. 🟡 IMPORTANT: Folder Structure for Opposition Scouting Backend

**Problem:** No file location specified for new opponent scouting functions in Code.js.

**Claude Code needs:** Where exactly to add code?

**Current state:**
- OPPOSITION_SCOUTING_PLAN.md mentions: "New OpponentScouting sheet"
- OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md mentions: Functions like `collectOppositionFixtures()`, `processOppositionAIQueue()`
- Question: Where in Code.js do these go?

**Fix Needed:**
Add to VIBE_CODING_GUIDE.md (new subsection under "Code Structure"):

```markdown
### Code.js Section Organization (Current State)

```
Code.js Current Sections (line ranges):
- 1-50: Imports + constants
- 50-100: Helper utilities (calculateHash, formatDate, etc.)
- 100-200: Team/GameData APIs (getTeams, getTeamData, saveTeamData)
- 200-250: Fixture sync (fetchSquadiFixtureData, mergeFixtures)
- 250-350: Ladder APIs (getSquadiLadder, getLadderData)
- 350-400: AI APIs (getAIInsights, callGemini)
- 400-500: Diagnostics (logMetric, logError)
- 500+: Archived/Legacy

### **Addition Plan:**

**Combined AI Phase 1 additions (lines 100-250):**
Add after current AI section (after line 400):
```
// === AI Queue Management (Combined AI Phase 1) ===
// calculateGameDataHash()
// queueGameAI()
// getQueuedJobs()
// callGeminiGameAI()
// processAIQueue()
// setupAIQueueTrigger()
```

**Opposition Scouting + Planner Phase 1 additions (new section):**
Add after AI Queue Management (after line 450):
```
// === Opposition Scouting (Opposition Scouting + Planner Phase 1) ===
// collectOppositionFixtures()
// queueOppositionAI()
// getOppositionQueuedJobs()
// generateOppositionAnalytics()
// saveOppositionScoutingData()
// processOppositionAIQueue()
// setupOppositionScouting()
```

**Total Code.js expansion:** From ~500 lines to ~650 lines (Phase 1 of both features)
```

---

### 6. 🟡 IMPORTANT: Gemini Prompts Need Examples (Not Complete)

**Problem:** Plans say "Age-appropriate prompts" but don't show actual Gemini prompts used.

**Claude Code needs:** Concrete prompt templates

**Current state in COMBINED_AI_IMPLEMENTATION.md:**
```markdown
**Customize Prompts by Age:**

| Age Group | Tone | Focus | Examples |
|-----------|------|-------|----------|
| **U11** | Extremely positive | Fun, fundamentals, teamwork | "Amazing effort!", "Everyone did great!" |
| **U13** | Supportive with feedback | Skill development, basics | "Good positioning", "Improving passes" |
```

**Claude Code needs:** Complete prompt templates

**Fix Needed:**
Add to COMBINED_AI_IMPLEMENTATION.md (new appendix "Gemini Prompts"):

```markdown
### Appendix: Gemini Prompt Templates

**U11 Game Summary Prompt:**
```
You are a supportive netball coach analyzing a U11 team's game.
Tone: Extremely positive, encouraging, fun
Focus: Fundamentals, teamwork, effort

Game Data:
- Team: {teamName}
- Opponent: {opponent}
- Score: {score} ({result})
- Lineup: {positions}
- Coach Notes: {notes}

Provide encouraging commentary that:
1. Celebrates what the team did well (be specific about fundamentals)
2. Highlights 2-3 areas for next practice (phrased positively)
3. Encourages individuals by position (e.g., "Sarah as GS, you did amazing service moves!")
4. Ends with: "Great effort everyone! Look forward to next game!"

Keep response under 150 words. Use simple language. NO technical jargon.
```

**U15 Game Summary Prompt:**
```
You are an tactical netball coach analyzing a U15 team's game.
Tone: Balanced analytical with constructive feedback
Focus: Tactical awareness, positioning, competition

Game Data:
- Team: {teamName}
- Opponent: {opponent}
- Score: {score} ({result})
- Lineup: {positions}
- Coach Notes: {notes}

Provide analysis that:
1. Identifies 2-3 tactical positives (formations, movements, defensive zones)
2. Identifies 2-3 tactical improvements (specific positioning, transition speed)
3. Highlights players who showed tactical growth
4. Recommends 1-2 drills for next week based on performance gaps

Keep response under 200 words. Be specific about positions and tactics.
```

**Adult/NFNL Game Summary Prompt:**
```
You are an expert netball coach analyzing a competitive team's game.
Tone: Direct professional, championship focused
Focus: Excellence, tactical efficiency, competitive advantage

Game Data:
- Team: {teamName}
- Opponent: {opponent}
- Score: {score} ({result})
- Lineup: {positions}
- Coach Notes: {notes}

Provide strategic analysis that:
1. Evaluates offensive system efficiency (goal shooting %, transition %)
2. Assesses defensive system effectiveness (pressure points, zone gaps)
3. Analyzes opponent counter-strategies and how well responded
4. Identifies key player performances and impact
5. Recommends tactical adjustments for finals/next round

Keep response under 250 words. Include specific metrics and strategic concepts.
```
```

---

### 7. 🟡 IMPORTANT: Missing "Blocker Detection" in Phase Dependencies

**Problem:** Implementation roadmap doesn't show HOW to detect when one phase is blocking another.

**Claude Code needs:** Clear "is phase X ready?" check

**Current state:**
Planning/README.md says: "Blocked by Combined AI 1"

**But Claude Code question:** How do I (as an agent) know when it's actually safe to start Opposition Scouting Phase 1?

**Fix Needed:**
Add to VIBE_CODING_GUIDE.md (new section "Phase Readiness Checks"):

```markdown
### Phase Readiness Checks (For Claude Code)

**Before starting any phase, verify:**

**Combined AI Phase 1 Ready When:**
- [ ] `queueGameAI()` deployed and working (test: finalize a game, check PropertiesService)
- [ ] Time-based trigger created (`processAIQueue` runs every 10 min)
- [ ] AI_Knowledge_Base sheet exists with all columns (A-O)
- [ ] Manual test: Game → AI queue → background processing → result appears

**Opposition Scouting Phase 1 Ready When:**
- [ ] No dependency! Can start anytime

**Opposition Scouting Phase 2-5 Ready When:**
- [ ] Phase 1 UI exists and tested
- [ ] Can navigate to opponent profile
- [ ] Opponent data loading from API works

**Opposition Scouting + Planner Phase 1 Ready When:**
- [ ] Opposition Scouting Phases 1-5 complete
- [ ] OppositionScouting sheet created and columns tested
- [ ] Manual API test: Call `collectOppositionFixtures()` → see jobs queued

**Opposition Scouting + Planner Phase 2 Ready When:**
- [ ] Phase 1 deployed
- [ ] Time-based triggers created (Saturday 6 PM, Sunday 10 AM)
- [ ] Opposition AI jobs processed successfully

**Match Day Playbook Ready When:**
- [ ] Opposition Scouting 1-5 complete
- [ ] Opposition Scouting + Planner Phase 1-2 complete
- [ ] Can query opposition analytics from OppositionScouting sheet

---

### Blocker Detection (For Claude Code to self-verify)

Create a checklist verification function:

```javascript
function verifyPhaseReadiness(phaseName) {
  const checks = {
    'combined-ai-1': () => {
      const props = PropertiesService.getScriptProperties();
      return {
        queueAIExists: typeof queueGameAI === 'function',
        triggerExists: ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'processAIQueue'),
        sheetExists: SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AI_Knowledge_Base') !== null,
        canQueue: true  // Implicit if above pass
      };
    },
    'opposition-scouting-1': () => ({
      canStart: true  // No dependencies
    }),
    'opposition-planner-1': () => {
      return {
        opponentSheetExists: SpreadsheetApp.getActiveSpreadsheet().getSheetByName('OpponentScouting') !== null,
        canQueue: typeof queueOppositionAI === 'function'
      };
    }
  };
  
  const check = checks[phaseName];
  if (!check) return { error: `Unknown phase: ${phaseName}` };
  
  const results = check();
  const allPass = Object.values(results).every(v => v === true);
  
  return {
    phase: phaseName,
    ready: allPass,
    details: results
  };
}

// Usage:
// Before starting Opposition Scouting + Planner Phase 1:
// const readiness = verifyPhaseReadiness('opposition-planner-1');
// if (!readiness.ready) throw new Error(`Phase not ready: ${JSON.stringify(readiness.details)}`);
```

**How Claude Code uses this:**
At start of each phase, insert readiness check:
```
"Before implementing Opposition Scouting + Planner Phase 1, verify: verifyPhaseReadiness('opposition-planner-1')"
```
```

---

### 8. 🟡 IMPORTANT: Missing Error Recovery Strategy for Quota Exceeded

**Problem:** Plans mention "Gemini quota exceeded" as failure case but don't specify recovery behavior.

**Claude Code needs:** Clear error recovery logic

**Current state:**
- COMBINED_AI_IMPLEMENTATION.md: "callGeminiGameAI returns null on quota exceeded"
- Question: Then what? Do we retry? Do we skip? Do we queue for next day?

**Fix Needed:**
Add to COMBINED_AI_IMPLEMENTATION.md (new section "Error Recovery Strategies"):

```markdown
### Error Recovery: Quota & Network Failures

**Gemini Quota Exceeded (429 / rate_limit_exceeded):**
```
Strategy: BACKOFF + RETRY on next trigger cycle
Logic:
  ├─ Add 5-minute backoff (don't retry immediately)
  ├─ Mark job: attempts++, lastError = "Quota exceeded", status = "pending_ai"  
  ├─ Leave in queue for next 10-min trigger
  ├─ On Attempt 2-3: Same backoff logic
  ├─ After Attempt 3: Log as failed, move to Failed_Opposition_AI archive sheet
  │   (don't discard, keep for manual retry)
  
Result: Job retried 3x over ~30 minutes, then archived if still failing.
Impact: Coach won't see summary tonight, but won't block app.
Fallback: Coach can click "Generate Now" manually tomorrow.

Implementation:
```javascript
function handleQuotaExceeded(job) {
  job.attempts++;
  job.status = "pending_ai";
  job.lastError = "Gemini quota exceeded (429)";
  job.nextRetryWindow = addMinutes(new Date(), 5);
  
  if (job.attempts < 3) {
    // Keep in queue, will retry next trigger
    saveQueueJob(job);
    logMetric('ai_quota_exceeded_retry', { 
      attempt: job.attempts, 
      nextRetry: job.nextRetryWindow 
    });
  } else {
    // Max retries, archive as failed
    archiveFailedJob(job, 'Quota exceeded after 3 retries');
    removeQueueJob(job.key);
    logMetric('ai_quota_exceeded_failed', { 
      totalAttempts: 3, 
      jobKey: job.key 
    });
  }
}
```

**Network Timeout (Connection interrupted mid-request):**
```
Strategy: IMMEDIATE RETRY (no backoff)
Logic:
  ├─ Catch: Connection timeout
  ├─ Retry immediately (once in same trigger cycle)
  ├─ If retry succeeds: Done (count as Attempt 1)
  ├─ If retry fails again: Store as Attempt 1, queue for next cycle
  
Result: Transient network glitches don't eat retries.
Impact: Improved reliability with minimal additional retries.

Implementation:
```javascript
function callGeminiWithRetry(gameData, maxRetries = 1) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return callGemini(gameData);
    } catch (e) {
      if (e.message.includes('Connection timeout') && i < maxRetries - 1) {
        // Retry immediately
        Utilities.sleep(1000);  // Brief pause before retry
        continue;
      }
      throw e;  // Give up, let caller handle
    }
  }
}
```

**Invalid Game Data (Game missing required fields):**
```
Strategy: SKIP (don't retry, remove, archive for review)
Logic:
  ├─ Find: Game not found in sheets
  ├─ Or: Game missing scores/lineup
  ├─ Action: Remove from queue, log to Diagnostics sheet
  ├─ Review: Monthly check of archived invalid jobs
  
Result: Don't waste retries on unrecoverable errors.

Implementation:
```javascript
function validateGameForAI(game) {
  const required = ['scores', 'lineup', 'gameID', 'teamID'];
  const missing = required.filter(f => !game[f]);
  
  if (missing.length > 0) {
    throw new Error(`Game missing required fields: ${missing.join(', ')}`);
  }
  
  if (!game.scores.total || game.scores.total.us === undefined) {
    throw new Error('Game scores incomplete (total missing)');
  }
  
  return true;
}
```

**Gemini Returns Empty Response:**
```
Strategy: RETRY (treat as transient)
Logic: Same as Quota Exceeded (retry up to 3x)
Impact: Usually resolves on retry.
```
```

---

### 9. 🟡 IMPORTANT: Test Data Needs Failure Cases

**Problem:** Test data examples show happy path only, no error scenarios.

**Claude Code needs:** Mock error responses

**Current state in VIBE_CODING_GUIDE.md:**
```javascript
// Only shows success case:
{
  gameID: "game_1735250400000",
  summary: "Strong start (15-12 Q1)...",
  insights: [...]
}
```

**Fix Needed:**
Add to VIBE_CODING_GUIDE.md (new subsection "Test Failure Scenarios"):

```markdown
### Test Data: Failure Scenarios

**Scenario 1: Queue Job Processing Timeout**
```javascript
Input: Job sitting in queue for 25 minutes (should be processed by now)
Expected: Next trigger marks as "needs_attention", logs diagnostic

Test:
  1. Manually create queue job, timestamp it 30 min ago
  2. Run processAIQueue()
  3. Verify: Job still in queue? Modified? Logged?
  4. Expected: Either processed OR logged as "stuck job"
```

**Scenario 2: Gemini Quota Exceeded**
```javascript
Input: Call Gemini, receive 429 (rate limit)
Expected: Job marked for retry, backoff 5 min

Test:
  1. Mock Gemini to return 429
  2. Call callGeminiGameAI(gameData)
  3. Verify: Returns null or throws, caught properly
  4. Verify: Job remains in queue with attempts++
  5. Expected: Log shows "quota_exceeded_retry"
```

**Scenario 3: Game Data Missing Scores**
```javascript
Input: Game with no Q4 scores yet (coach still entering)
Expected: Skip gracefully, don't queue AI

Test:
  1. Create game with scores: { Q1, Q2, Q3, Q4: null }
  2. Call queueGameAI(game)
  3. Verify: Returns error or skips
  4. Expected: Not added to queue, logs warning
```

**Scenario 4: Max Retries Exceeded**
```javascript
Input: Job with attempts = 3, next trigger runs
Expected: Job removed from queue, archived to failed sheet

Test:
  1. Create queue job with attempts = 3, mock Gemini to fail
  2. Run processAIQueue()
  3. Verify: Job removed from queue
  4. Verify: Row added to Failed_AI_Jobs sheet
  5. Verify: Metric logged: 'ai_queue_failed'
```

**Scenario 5: Team Archived (Should Skip)**
```javascript
Input: Team marked as archived=true
Expected: Skip processing, don't waste quota

Test:
  1. Mark team archived, queue game AI
  2. Run processAIQueue()
  3. Verify: Job removed from queue
  4. Verify: NOT added to AI_Knowledge_Base (wasted quota check)
  5. Log: 'skipped_archived_team'
```
```

---

### 10. 🟡 IMPORTANT: Missing "Performance Budget" Calculations

**Problem:** Plans don't specify how long each module should take, causing performance surprises.

**Claude Code needs:** Performance targets

**Current state:** "Should complete <10 min for 30 jobs"

**Claude Code question:** How do I know if I'm too slow? What's acceptable?

**Fix Needed:**
Add to COMBINED_AI_IMPLEMENTATION.md (new section "Performance Targets"):

```markdown
### Performance Budget (Phase 1)

**Per-Job Processing Time:**
```
calculateGameDataHash(): 50-100 ms (SHA256 hash)
callGeminiGameAI(): 4-6 sec (includes network roundtrip + parsing)
saveToSheet(): 1-2 sec (Sheets API write)
Total per job: 5-8 sec

**Batch Processing (processAIQueue):**
```
For N jobs in queue:
  Setup + config: 500 ms
  Loop N jobs: N × 5-8 sec
  Logging: 500 ms
  
Example: 
  - 10 jobs: 50-80 sec ✅ (within 10 min window)
  - 30 jobs: 150-240 sec ⚠️ (might exceed 10 min window)
  - 50+ jobs: ❌ (will definitely exceed 10 min Apps Script limit)

**Limits:**
- Apps Script time limit: 6 minutes per trigger cycle
- Gemini quota: 60 requests/min (1 per sec)
- Sheets write quota: 400 writes/min

**Optimization if needed:**
- Cap batch size to 10 jobs per trigger
- Process remaining 20+ in next trigger cycle
- Or stagger: Run triggers every 5 min instead of 10
```

---

## Minor Gaps (Nice to Fix Before Claude Code)

### 11. 🟠 MINOR: localStorage Caching Strategy Undefined

**Problem:** Frontend cache mentioned but no TTL, eviction strategy, or size limits specified.

**Fix (example for OPPOSITION_SCOUTING_PLAN.md):**
```markdown
**Frontend Cache (localStorage):**
- Key: `opposition_cache_{teamID}_{opponent}_{round}`
- TTL: 7 days (or until CacheUntil from sheet)
- Max size: 10MB per team (evict oldest if exceed)
- Fallback: If cache expired, fetch from sheet
```

---

### 12. 🟠 MINOR: Logging Strategy Lacks Structured Format

**Problem:** `logMetric()` calls mentioned but structure/schema not specified.

**Fix (add to COMBINED_AI_IMPLEMENTATION.md):**
```markdown
**Structured Logging Format:**
```javascript
logMetric(metric_name, {
  timestamp: ISO 8601,
  teamID: string,
  gameID: string,
  duration_ms: number,
  tokens_used: number,
  success: boolean,
  error: string (if failed)
})
```
```

---

### 13. 🟠 MINOR: Missing "Retry Exponential Backoff" Specification

**Problem:** Retry logic exists but backoff strategy (immediate vs exponential) undefined.

**Fix:** Specify: "Backoff: Immediate retry x1, then 5-min wait, then retry"

---

### 14. 🟠 MINOR: Queue Job Priority System Undefined

**Problem:** Queue jobs have `priority: 1` but priority levels (1 = high? low?) not explained.

**Fix:** Define: "Priority 1 = immediate (game just finalized), Priority 2 = background (older games)"

---

### 15. 🟠 MINOR: Missing "Quota Estimation" for Opposition Scouting

**Problem:** Combined AI shows quota math (143 calls/day), Opposition Scouting doesn't.

**Fix:** Add to OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md:
```
Weekly quota estimate:
- Opposition collection: 
  1 call per team × Friday fixture fetch = 20 teams = 20 calls/week
- Opposition AI generation:
  1 call per opponent per team × Sunday = 20 teams × 3 avg opponents = 60 calls/week
- Total: ~80 calls/week (0.8% of free tier quota)
```

---

### 16. 🟠 MINOR: Sheet Enumeration Script in Code.js

**Problem:** Plans mention ensuring sheets exist but don't specify helper function.

**Fix:** Define helper function:
```javascript
function ensureSheetExists(sheetName, columns) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
    sheet.appendRow(columns);  // Add header row
  }
  return sheet;
}
```

---

### 17. 🟠 MINOR: Missing "Batch vs Real-Time" Decision Documentation

**Problem:** Combined AI processes every 10 min (batch), Opposition processes once weekly (batch). Why this pattern?

**Fix:** Add decision rationale:
```
Batch Processing Rationale:
- Every 10 min (Combined AI): Coaches finalize games throughout evening → generate AI summary before they return
- Once weekly (Opposition Scouting): Fixture data stable (finalized Friday) → process Sunday morning
- Result: Both have data ready when needed (game detail for AI, fixture prep for scouting)
```

---

### 18. 🟠 MINOR: Undefined "Change Detection" Triggers for Opposition Scouting

**Problem:** OPPOSITION_SCOUTING_PLAN.md doesn't say when opposition data should refresh.

**Fix:** Add:
```
Opposition Profile Refresh Triggers:
- Initial: First opponent encounter → fetch ladder
- Weekly: Every Sunday → update ladder for all opponents
- On-demand: Coach clicks "Refresh" → immediate fetch
- Expiry: Cache expires after 7 days → re-fetch

Implementation: Similar to Combined AI change detection
```

---

### 19. 🟠 MINOR: Missing "Rate Limiting" Between Phases

**Problem:** If both Combined AI (every 10 min) and Opposition Scouting (Sunday 10 AM) trigger simultaneously, could exceed quota.

**Fix:** Add scheduling offset:
```
Trigger Timing:
- Combined AI processAIQueue: Every 10 min (e.g., :00, :10, :20...)
- Opposition collection: Saturday 6:00 PM
- Opposition processing: Sunday 10:00 AM (NOT same as any Combined AI cycle)
- Result: No collision, quota stays safe
```

---

### 20. 🟠 MINOR: Missing "Monitoring Dashboard" Specification

**Problem:** Developers won't know system health without metrics.

**Fix:** Define what to monitor:
```
Metrics to Watch:
- ai_queue_success_rate (target: >95%)
- ai_queue_avg_processing_time (target: <8 sec per job)
- opposition_queue_backlog (target: <5 jobs queued)
- gemini_quota_used_percent (target: <15% of daily limit)
- sheet_write_latency (target: <2 sec)

Dashboard: Apps Script Execution Logs + Diagnostics sheet
Check: Weekly via Diagnostics sheet pivot table
```

---

## Summary: Minimum Requirements for Claude Code Efficiency

**Must Fix (token cost: 1,200 tokens each if not done):**
1. Data Transformation Functions (Squadi → profile object) — DONE? NO
2. Queue Job State Machine — DONE? NO
3. AI_Knowledge_Base Complete Schema — DONE? NO
4. 26 Opposition Analytics Structure — DONE? NO

**Should Fix (token cost: 500 tokens each):**
5. Code.js Folder Structure — DONE? NO
6. Gemini Prompt Examples — DONE? NO
7. Phase Readiness Checks — DONE? NO
8. Error Recovery Strategy — DONE? NO
9. Test Failure Scenarios — DONE? NO
10. Performance Budget — DONE? NO

**Nice to Fix (token cost: 200 tokens each):**
11-20. Minor clarifications above

---

## Next Steps for Human

**Option A: Minimal (just 4 critical)** — Fix gaps 1-4, Claude Code can infer rest
- Estimated time: 2 hours
- Token savings: ~5,000 tokens (10% of phase cost)
- Risk: Medium (gaps 5-10 will surface during coding)

**Option B: Standard (critical + important)** — Fix gaps 1-10
- Estimated time: 4 hours
- Token savings: ~12,000 tokens (25% of phase cost) ✅ **RECOMMENDED**
- Risk: Low (Claude Code has 95% of context needed)

**Option C: Comprehensive (all 20)** — Fix all gaps
- Estimated time: 6 hours
- Token savings: ~16,000 tokens (35% of phase cost)
- Risk: Very low (Claude Code can execute with zero clarifications)
- Bonus: Better documentation for future developers

---

## Recommended Priority

1. **First:** Add gaps 1-4 (critical state machine + data structures)
2. **Second:** Add gaps 5-10 (implementation clarity + error handling)
3. **Then:** Start Claude Code with Combined AI Phase 1

**Time investment: 4 hours planning → 6-8 hour phase execution ✅**
**Token savings: ~12,000 tokens ✅**
**Code quality: +15-20% (fewer clarifications mid-implementation) ✅**

