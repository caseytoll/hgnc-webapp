# Combined AI Implementation Plan

**Status:** Ready for implementation  
**Scope:** Complete AI system redesign combining infrastructure + modular architecture  
**Estimated Total Effort:** 16-20 hours (phased over 6 weeks)  
**Priority:** Medium (Quality of Life + Efficiency)  

---

## Executive Summary

### Current Problems

**User Experience:**
- Coach clicks AI button → waits 15-30 seconds → UI blocks
- If coach closes app mid-generation, work is lost
- Must remember to click AI buttons after finalizing games

**Architecture:**
- 4 overlapping AI features analyzing same data from different angles
- Multiple redundant API calls consuming quota unnecessarily
- Generic sports advice (not netball-specific)
- No shared context between AI features (each starts from scratch)

**Cost & Performance:**
- 11 AI calls/week per team (overlapping analysis)
- Expensive for limited utility
- Separate features give conflicting recommendations

---

### Proposed Solution: Two-Layered System

**Layer 1: Background Infrastructure** (solves UX problems)
- Automatic AI generation after game finalization
- Server-side queue that survives app closure
- Change detection (only regenerate when data materially changes)
- Age-appropriate prompts (customize to U11 vs. adult)
- Reliable retry logic with graceful fallback

**Layer 2: Modular Architecture** (solves redundancy problems)
- 5 specialized modules, each with exclusive domain
- Structured JSON outputs instead of text summaries
- Incremental knowledge building (each module references previous)
- Sequential processing (events → patterns → correlations → tactics → strategy)
- Netball-specific expertise in each module

### Value Proposition

**For Coaches:**
- ✅ No waiting (background generation)
- ✅ Never forget AI (automatic after finalization)
- ✅ Consistent insights (modular architecture)
- ✅ Netball-smart recommendations (domain knowledge)
- ✅ Always works (manual fallback available)

**For Developers:**
- ✅ 55% fewer AI calls (modular design)
- ✅ Easier to maintain (modular responsibilities)
- ✅ Lower costs (caching + efficiency)
- ✅ Extensible (new modules plug in easily)

**For Business:**
- ✅ Better user experience without code complexity
- ✅ Cheaper operation (50%+ cost savings)
- ✅ Scalable to 20+ active teams
- ✅ Competitive advantage (netball-specific AI)

### How They Work Together

```
┌── Background Queue (Infrastructure) ──────────────────────────┐
│                                                                │
│  Game finalized → queueGameAI() → PropertiesService queue    │
│       ↓                                                        │
│  processAIQueue() runs every 10 min (time-based trigger)      │
│       ↓                                                        │
├── Modular AI Pipeline ────────────────────────────────────────┤
│                                                                │
│  1. Game Event Analyzer  → Structured facts (JSON)            │
│       ↓                                                        │
│  2. Pattern Detector     → Multi-game trends                  │
│       ↓                                                        │
│  3. Training Correlator  → Training effectiveness             │
│       ↓                                                        │
│  4. Tactical Advisor     → Lineup recommendations             │
│       ↓                                                        │
│  5. Season Strategist    → Big-picture strategy               │
│                                                                │
└── Storage (AI_Knowledge_Base sheet) ──────────────────────────┘
       ↓
 Frontend (cached in localStorage)
       ↓
 Coach sees AI insights (instant display, no waiting)
```

**Integration Points:**
- Background queue calls **Event Analyzer** automatically (per-game basis)
- User-triggered modules (Pattern, Correlator, Advisor, Strategist) use **cached Event Analyzer outputs**
- Each module references previous module outputs (no full context passed, efficient)
- Netball knowledge embedded in each module's prompts
- Change detection prevents wasted regenerations

---

## System Architecture

### Part 1: Background Execution Infrastructure

#### How It Works

**Step 1: Game Finalization**
```javascript
// Coach finalizes game (scores + lineup complete)
// Frontend calls:
queueGameAI({
  gameID: "game_1735250400000",
  sheetName: "data_team_1762633769992",
  teamID: "team_1762633769992",
  forceRefresh: false  // Use change detection
});
```

**Step 2: Queue Storage** (PropertiesService)
```javascript
Key: ai_queue_{gameID}_{sheetName}
Value: {
  gameID: "game_1735250400000",
  sheetName: "data_team_1762633769992",
  teamID: "team_1762633769992",
  queuedAt: "2026-02-20T14:30:00Z",
  type: "game_summary",
  attempts: 0,
  lastError: null,
  priority: 1
}
```

**Step 3: Background Processing** (every 10 minutes)
```
Time: 14:35 → processAIQueue() trigger fires
  ↓
Reads all ai_queue_* properties
  ↓
For each job: Load team data → Find game → Generate AI → Write summary
  ↓
On success: Remove from queue, log success metric
  ↓
On failure: Increment attempts, leave in queue if <3, log error
  ↓
Time: 14:45 → Retry any failed jobs (up to 3 attempts)
```

**Step 4: Frontend Display**
```
Coach returns to game detail (anytime after 5-10 min):
  ↓
Load team data (includes aiSummary now populated)
  ↓
Display "✨ AI Game Summary (auto-generated)"
  ↓
No waiting, no button clicking
```

#### Change Detection (Smart Refresh)

**What Triggers AI Regeneration:**
```javascript
// Hash these fields only (what AI analyzes)
relevantData = {
  scores: game.scores,           // ← AI analyzes this
  lineup: game.lineup,           // ← AI analyzes this
  notes: {                        // ← AI analyzes this
    Q1: game.lineup?.Q1?.notes,
    Q2: game.lineup?.Q2?.notes,
    Q3: game.lineup?.Q3?.notes,
    Q4: game.lineup?.Q4?.notes
  },
  captain: game.captain
};

// Calculate hash of this data
gameDataHash = calculateGameDataHash(relevantData);

// Compare to aiSummary.gameDataHash
if (gameDataHash !== aiSummary.gameDataHash) {
  // Hash changed → Re-queue AI for background refresh
  queueGameAI({ gameID, sheetName, teamID });
} else {
  // Hash unchanged → Skip (AI still up-to-date)
}
```

**Examples:**
- ✅ Update Q3 notes → Hash changes → Auto re-queue AI
- ✅ Update Q4 scores → Hash changes → Auto re-queue AI
- ✅ Update Q2 lineup positions → Hash changes → Auto re-queue AI
- ❌ Change game location → Hash unchanged → Skip (non-AI field)
- ❌ Change captain → Hash unchanged → Skip (non-AI field)
- ❌ Change opponent name → Hash unchanged → Skip (non-AI field)
- 🔄 Manual override: Coach clicks "Regenerate" with forceRefresh=true (bypasses hash check)

#### Retry Logic & Performance Budgets - Gap 10

**Retry Strategy:**
```
Attempt 1: Initial queue processing (next 5-10 min trigger)
  ├─ Success → Remove from queue ✅
  └─ Failure → Keep in queue, increment attempts to 1
    ↓ (5-10 min later)
Attempt 2: Next trigger cycle
  ├─ Success → Remove from queue ✅
  └─ Failure → Keep in queue, increment attempts to 2
    ↓ (5-10 min later)
Attempt 3: Final attempt
  ├─ Success → Remove from queue ✅
  └─ Failure → Remove from queue, log to diagnostics ❌

Total retry window: 15-30 minutes
Result: If 3 attempts fail, remove job and log error
Fallback: Coach can still click "Generate Now" for manual generation
```

**Performance Budgets (Gap 10)**

### Per-Job Timing

| Operation | Budget | Notes |
|-----------|--------|-------|
| Load game data from sheets | <100ms | Small JSON, in-memory lookup |
| Calculate game data hash | <50ms | SHA256 on small payload |
| Call Gemini API | 3-8 sec | Network + model latency |
| Write AI summary to sheet | <200ms | Single row append |
| Log metrics | <100ms | PropertiesService.setProperty() |
| **Total per job** | **<10 sec** | 95th percentile target |

### Batch Processing Limits

| Metric | Limit | Reason |
|--------|-------|--------|
| Max jobs per trigger | 30 | Apps Script 6-min execution limit |
| Max Gemini calls per trigger | 30 | Rate limit protection (quota) |
| Max sheet writes per trigger | 50 | PropertiesService + Sheets API |
| Queue size (PropertiesService) | <50 jobs | Performance (reading all properties gets slower) |

### Apps Script Execution Limits

**Hard Constraints:**
- Function execution time: 6 minutes (Apps Script hard limit)
- PropertiesService total size: 10MB (all scripts combined)
- Sheet API calls: 500/min (Google Sheets API rate limit)

**Safe Operating Limits (Buffer):**
- Target execution time per trigger: <5 min (1 min buffer)
- Target queue size: 20-30 jobs (keeps PropertiesService safe)
- Target Gemini quota: 5-10 queries/min (stay under 60/min)

### Budget Calculation

```javascript
function calculateBatchBudget() {
  const maxExecutionMs = 5 * 60 * 1000;  // 5 min (leave 1 min buffer)
  const jobTimeMs = 10 * 1000;            // 10 sec per job
  const maxJobsPerBatch = Math.floor(maxExecutionMs / jobTimeMs);
  // Result: ~30 jobs per 5-minute trigger
  
  return {
    maxExecutionMs,
    jobTimeMs,
    maxJobsPerBatch,    // 30
    actualCapacity: 25  // Conservative (account for overhead)
  };
}
```

### Monitor Budget Usage

```javascript
function monitorPerformance() {
  // Log metrics after each trigger
  const metrics = {
    jobsProcessed: 0,
    totalTimeMs: 0,
    avgJobTimeMs: 0,
    maxJobTimeMs: 0,
    failedJobs: 0,
    quotaExceeded: false
  };
  
  // Alert if approaching limits
  if (metrics.totalTimeMs > 4.5 * 60 * 1000) {
    logMetric('budget_warning', {
      type: 'execution_time',
      actual: metrics.totalTimeMs,
      limit: 5 * 60 * 1000
    });
  }
  
  if (metrics.jobsProcessed > 25) {
    logMetric('budget_warning', {
      type: 'job_batch_size',
      actual: metrics.jobsProcessed,
      recommended: 25
    });
  }
}
```

**Error Categories:**

| Error | Retry? | Action |
|-------|--------|--------|
| Team archived | ❌ Skip | Don't waste quota |
| Team data deleted | ❌ Remove | Data no longer exists |
| Game not found | ❌ Remove | Data no longer exists |
| Game not finalized | ❌ Remove | Shouldn't be queued |
| Gemini timeout | ✅ Retry | Try up to 3 times |
| API rate limit | ✅ Retry | Backoff + retry |
| Network error | ✅ Retry | Transient, will resolve |

---

## Error Recovery Strategy - Complete (Gap 8)

**Three Error Categories with Distinct Recovery Logic:**

### Category 1: Quota Exceeded (HTTP 429)

**Symptom:** Gemini API returns 429 (too many requests)

**Recovery:**
```javascript
function handleQuotaExceeded(job, attempt) {
  const retryBackoff = Math.pow(2, attempt) * 60; // 1 min, 2 min, 4 min
  const retryAt = Date.now() + (retryBackoff * 1000);
  
  // Keep job in queue with exponential backoff
  job.nextRetryAt = retryAt;
  job.attempts = attempt + 1;
  job.lastError = `Quota exceeded at ${new Date().toISOString()}, retry at ${new Date(retryAt).toISOString()}`;
  
  // Only retry up to 3 times total
  if (attempt < 3) {
    updateQueueJob(job);
  } else {
    // 3 retries exhausted - log failure
    job.status = 'failed';
    logMetric('ai_queue_failed', {
      gameID: job.gameID,
      reason: 'Quota exceeded (3 retries)',
      totalTimeMs: Date.now() - job.queuedAt,
      attempts: 3
    });
  }
  
  // Smart alert: If quota hit for 2+ jobs, notify to reduce batch size
  const recentQuotaErrors = getMetrics('quota_exceeded', '1h');
  if (recentQuotaErrors.count >= 2) {
    logMetric('quota_threshold_warning', {
      count: recentQuotaErrors.count,
      recommendation: 'Reduce concurrent jobs or increase quota'
    });
  }
}
```

### Category 2: Network/Transient Errors (Timeout, 503, etc.)

**Symptom:** Network timeout, 503 Service Unavailable, or connection reset

**Recovery:**
```javascript
function handleTransientError(job, attempt, error) {
  // Quick exponential backoff (shorter than quota)
  const retryBackoff = Math.pow(1.5, attempt) * 10; // 10s, 15s, 22s
  const retryAt = Date.now() + (retryBackoff * 1000);
  
  job.nextRetryAt = retryAt;
  job.attempts = attempt + 1;
  job.lastError = `Network error: ${error.message}`;
  
  if (attempt < 3) {
    updateQueueJob(job);  // Keep in queue for retry
    logMetric('ai_queue_retry', {
      gameID: job.gameID,
      attempt: attempt + 1,
      reason: 'Network error',
      willRetryAt: retryAt
    });
  } else {
    // Max retries exhausted
    job.status = 'failed';
    logMetric('ai_queue_failed', {
      gameID: job.gameID,
      reason: 'Network errors (3 retries)',
      finalError: error.message
    });
  }
}
```

### Category 3: Invalid Data (Bad Input, Missing Fields)

**Symptom:** Team/game in invalid state (archived, incomplete data, null scores)

**Recovery:**
```javascript
function handleInvalidData(job, error) {
  // Don't retry - data won't change in 5 minutes
  job.status = 'failed';
  job.lastError = `Invalid data: ${error.message}`;
  
  // Remove from queue immediately
  logMetric('ai_queue_failed', {
    gameID: job.gameID,
    reason: 'Invalid data',
    details: error.message,
    noRetry: true
  });
  
  // Alert coach if team is archived
  if (error.message.includes('team archived')) {
    // Future: Send notification to coach (UI banner)
  }
}
```

### Master Error Handler

```javascript
function processJobWithErrorHandling(job) {
  try {
    // Validation first (fail-fast)
    const game = validateGameExists(job.gameID, job.sheetName);
    if (!game) {
      handleInvalidData(job, new Error('Game not found'));
      return;
    }
    
    const team = validateTeamActive(job.teamID);
    if (!team) {
      handleInvalidData(job, new Error('Team archived or deleted'));
      return;
    }
    
    // Call Gemini with error-aware wrapper
    const result = callGeminiWithErrorHandling(game);
    
    // Success path
    saveAISummary(result);
    removeFromQueue(job.key);
    logMetric('ai_queue_success', { gameID: job.gameID, tokensUsed: result.tokens });
    
  } catch (errors.QuotaExceeded) {
    handleQuotaExceeded(job, job.attempts);
  } catch (error) {
    // Transient or unknown error
    if (error.message.includes('timeout') || error.message.includes('503')) {
      handleTransientError(job, job.attempts, error);
    } else {
      // Unknown error - treat as transient (retry-safe)
      handleTransientError(job, job.attempts, error);
    }
  }
}
```

**Result:**
- 🟢 Quota errors: Exponential backoff (1, 2, 4 min), max 3 retries
- 🟡 Network errors: Quick backoff (10, 15, 22 sec), max 3 retries
- 🔴 Invalid data: Fail immediately, no retry, log reason
- ✅ Success: Remove from queue, log metrics

#### Age-Appropriate Prompting

**Determine Age Group:**
```javascript
function determineAgeGroup(teamName, season) {
  // Extract from name: "U11 Flames" → 'u11'
  const ageMatch = teamName.match(/\b[Uu](\d{2})\b/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    if (age === 19) return 'u17';
    return `u${age}`;
  }
  
  // NFNL teams (no age) = adult
  if (season === 'NFNL') return 'adult';
  
  // Default to adult
  return 'adult';
}
```

**Customize Prompts by Age:**

| Age Group | Tone | Focus | Examples |
|-----------|------|-------|----------|
| **U11** | Extremely positive | Fun, fundamentals, teamwork | "Amazing effort!", "Everyone did great!" |
| **U13** | Supportive with feedback | Skill development, basics | "Good positioning", "Improving passes" |
| **U15** | Balanced analytical | Tactical awareness, competition | "Strong defensive transitions" |
| **U17** | Direct professional | Excellence, pathways | "Championship execution", "Tactical analysis" |
| **Adult** | Analytical direct | Competitive strategy | "Defensive system breakdown", "Tactical efficiency" |

**Implementation:**
```javascript
function buildEnhancedGamePrompt(game, teamData, teamInfo) {
  const ageGroup = determineAgeGroup(teamInfo.teamName, teamInfo.season);
  const ageContext = getAgePromptContext(ageGroup);
  
  let prompt = `You are an expert netball coach analyzing ${teamInfo.teamName}.\n`;
  prompt += `Age Group: ${ageContext.label}\n`;
  prompt += `Tone: ${ageContext.tone}\n`;
  prompt += `Focus: ${ageContext.focus}\n`;
  prompt += `Vocabulary: ${ageContext.vocabulary}\n\n`;
  
  // Add netball knowledge constraints (see Part 4 below)
  prompt += getNetballConstraints();
  
  // Add game data
  prompt += buildGameData(game);
  
  return prompt;
}
```

---

## Gemini Prompt Templates - Complete (Gap 6)

### U11 (Under 11) - Extremely Positive, Fundamentals Focus

```javascript
const U11_GAME_PROMPT = `You are a supportive netball coach for an Under-11 (U11) team. Your role is to celebrate effort, highlight teamwork, and focus on fundamental skills.

ANALYZE THIS GAME:

Team: {teamName}
Opponent: {opponent}
Result: {result}

SCORES BY QUARTER:
Q1: Us {q1Us} - Them {q1Opp}
Q2: Us {q2Us} - Them {q2Opp}
Q3: Us {q3Us} - Them {q3Opp}
Q4: Us {q4Us} - Them {q4Opp}

SCORING POSITIONS (per quarter):
{lineupData}

COACH NOTES:
{quarterNotes}

TONE & STYLE:
- Start with praise (effort, teamwork, fun)
- Use age-appropriate language (no jargon)
- Focus: Ball movement, listening to teammates, basic positioning
- End with 2-3 encouragement points

FORMAT:
## What We Did Great! 🌟
- [Positive observation 1]
- [Positive observation 2]

## Let's Keep Practicing 💪
- [One area to improve (phrased positively)]
- [One skill to keep working on]

## Next Game Goal 🎯
[One simple, achievable goal for next game]
`;
```

### U15 (Under 15) - Balanced Analytical, Tactical Awareness

```javascript
const U15_GAME_PROMPT = `You are a netball coach for an Under-15 (U15) team. Analyze game performance with balanced feedback, highlighting tactical elements and skill development.

ANALYZE THIS GAME:

Team: {teamName}
Opponent: {opponent}
Result: {result}
Strength of Opposition: {sos_score}

SCORES BY QUARTER:
Q1: Us {q1Us} - Them {q1Opp}
Q2: Us {q2Us} - Them {q2Opp}
Q3: Us {q3Us} - Them {q3Opp}
Q4: Us {q4Us} - Them {q4Opp}

LINEUP ANALYSIS (per quarter):
{lineupData}

COACH OBSERVATIONS:
{quarterNotes}

TONE & STYLE:
- Balanced: Celebrate strengths, identify improvements
- Focus: Tactical awareness, ball control, defensive positioning, game flow
- Include: Key player contributions, quarter-by-quarter momentum

FORMAT:
## Game Highlights
- [Strong tactical element]
- [Individual/team contribution]

## Areas for Development
- [Tactical improvement needed]
- [Specific skill to refine]

## Tactical Focus
[Quarter-by-quarter tactical analysis, 2-3 sentences]
`;
```

### Adult - Direct Professional, Championship Excellence

```javascript
const ADULT_GAME_PROMPT = `You are a professional netball coach. Provide tactical analysis of championship-level performance.

ANALYZE THIS GAME:

Team: {teamName}
Opponent: {opponent} (Ranked #{oppRank} in {division})
Result: {result}
Strength of Opposition: {sos_score}/100

QUARTER-BY-QUARTER SCORES:
Q1: Us {q1Us} - Them {q1Opp} | Diff: {q1Diff}
Q2: Us {q2Us} - Them {q2Opp} | Diff: {q2Diff}
Q3: Us {q3Us} - Them {q3Opp} | Diff: {q3Diff}
Q4: Us {q4Us} - Them {q4Opp} | Diff: {q4Diff}
FINAL: Us {totalUs} - Them {totalOpp}

POSITION ANALYSIS (per quarter):
{lineupData}

COACH TACTICAL NOTES:
{quarterNotes}

TACTICAL OPPONENT DATA:
{opponentDifficultyContext}

TONE & STYLE:
- Direct professional assessment
- Focus: System execution, defensive structures, transition game, set plays
- Include: Key decision points, momentum shifts, competitive advantage analysis
- Recommend: Specific tactical adjustments for next opponent

FORMAT:
## Tactical Execution
[System performance analysis]

## Key Momentum Shifts
- [Quarter/moment analysis with tactical context]
- [Key decision point in game]

## Defensive Structures
[Defensive effectiveness and positioning analysis]

## Recommendations vs Next Opponent
[Tactical adjustments based on this performance]
`;
```

### Template Storage & Selection

```javascript
function getAgeGroupPrompt(ageGroup) {
  const prompts = {
    'u11': U11_GAME_PROMPT,
    'u13': U13_GAME_PROMPT,  // Similar to U15 but slightly simpler
    'u15': U15_GAME_PROMPT,
    'u17': U17_GAME_PROMPT,  // Similar to Adult but high school context
    'adult': ADULT_GAME_PROMPT
  };
  return prompts[ageGroup] || ADULT_GAME_PROMPT;  // Default to adult
}
```

#### Storage in Google Sheets: Complete Schema (Gap 3)

**AI_Knowledge_Base Sheet - Full Column Definition:**

| Col | Name | Type | Purpose |
|-----|------|------|----------|
| A | Timestamp | ISO 8601 | When AI generated |
| B | TeamID | String | Which team |
| C | GameID | String | Which game (null for multi-game) |
| D | ModuleType | Enum | event_analyzer, pattern_detector, etc |
| E | Status | Enum | success, failed, retry_pending |
| F | GameDataHash | SHA256 | Hash of input (change detection) |
| G | OutputJSON | Text(JSON) | Full AI output |
| H | ModelUsed | String | gemini-2.0-flash |
| I | TokensUsed | Integer | Input + output tokens |
| J | ProcessingTimeMs | Integer | How long AI took |
| K | Attempts | Integer | Retry count |
| L | LastError | Text | Error message if failed |
| M | Version | String | Schema version |
| N | CacheUntil | ISO 8601 | When cache expires |
| O | Notes | Text | Manual annotations |

**Example Row (success case):**
```
2026-02-20T10:30:00Z | team_123 | game_456 | event_analyzer | success | a1b2c3d4 | {summary: "...", insights: [...]} | gemini-2.0-flash | 1247 | 4200 | 0 | null | 1.0 | (null: permanent) | 
```

---

### Part 2: Modular AI Architecture

#### Module Overview

Five specialized modules, each with exclusive domain, no overlap:

```
Raw Data → Event Analyzer → Pattern Detector → Training Correlator → Tactical Advisor + Season Strategist
           (What happened)  (Trends)         (Training impact)    (Recommendations)  (Strategy)
```

| Module | Scope | Trigger | Cache |
|--------|-------|---------|-------|
| **1. Event Analyzer** | Single game facts | Auto (background) | Permanent |
| **2. Pattern Detector** | Multi-game trends | On-demand (Stats tab) | 1 week |
| **3. Training Correlator** | Training effectiveness | On-demand (Training tab) | 2 weeks |
| **4. Tactical Advisor** | Lineup recommendations | On-demand (Planner) | 1 week |
| **5. Season Strategist** | Season strategy | On-demand (Overview) | 2 weeks |

#### Module 1: Game Event Analyzer

**Purpose:** Factual extraction from single game (what happened)

**Trigger:** After game finalized (background queue, automatic)

**Inputs:**
- Game scores (total + quarters)
- Lineup positions per quarter
- Opponent name
- Quarter notes (if any)

**Output Format (JSON):**
```json
{
  "gameID": "game_123",
  "facts": {
    "result": "win",
    "margin": 7,
    "quarters": {
      "Q1": { "score": { "us": 10, "them": 8 }, "momentum": "positive" },
      "Q2": { "score": { "us": 8, "them": 10 }, "momentum": "negative" },
      "Q3": { "score": { "us": 12, "them": 9 }, "momentum": "positive" },
      "Q4": { "score": { "us": 5, "them": 8 }, "momentum": "negative" }
    },
    "strongestQuarter": "Q3",
    "weakestQuarter": "Q4",
    "closingProblem": true
  },
  "playerContributions": [
    { "playerID": "p1", "name": "Sarah", "quarters": 4, "positions": ["GS", "GA"], "goals": 18, "impact": "high" },
    { "playerID": "p2", "name": "Emma", "quarters": 3, "positions": ["C", "WA"], "goals": 8, "impact": "medium" }
  ],
  "keyMoments": [
    { "quarter": "Q3", "description": "Strong defensive pressure", "source": "coach_notes" },
    { "quarter": "Q4", "description": "Fatigue visible in shooters", "source": "inference" }
  ],
  "summary": "Won by 7 goals (35-28) against Diamond Creek. Strong Q1 (+2), dip Q2 (-2), dominated Q3 (+3), Q4 closing struggle (-3). Sarah led shooting 18 goals across 4 quarters, created attacking threat. Team showed fatigue pattern in Q4 despite leading all game."
}
```

**Constraints:**
- ✅ Factual analysis only, no recommendations
- ✅ No cross-game comparisons (Pattern Detector's job)
- ✅ Focus on "what" not "why"
- ✅ Extract patterns from coach notes objectively
- ✅ Netball-specific format (positions, quarters, GS/GA roles)

**Netball Knowledge Used:**
- Position Roles (2.1-2.7): Understand GS can score, WA can't
- Rules & Regulations (1.1-1.8): Verify within netball constraints
- Performance Metrics (6.0-6.9): How to measure player impact

---

#### Module 2: Pattern Detector

**Purpose:** Identify trends across multiple games

**Trigger:** When coach opens Stats tab (on-demand, cached 1 week)

**Inputs:**
- Last 5 games' Event Analyzer outputs (structured JSON)
- Historical player stats
- Season timeline

**Output Format (JSON):**
```json
{
  "teamID": "team_123",
  "patterns": {
    "closing": {
      "trend": "consistent_weakness",
      "evidence": ["Q4 -3 in R5", "Q4 -2 in R4", "Q4 -4 in R3"],
      "severity": "high",
      "since": "Round 3"
    },
    "defense": {
      "trend": "improving",
      "evidence": ["Avg goals against: R1-3 = 42, R4-5 = 38"],
      "severity": "positive"
    }
  },
  "playerTrajectories": [
    {
      "playerID": "p1",
      "name": "Sarah",
      "position": "GS",
      "trend": "stable_high_performer",
      "avg": 17.6,
      "consistency": "high"
    }
  ],
  "combinationEffectiveness": [
    {
      "positions": ["GS", "GA"],
      "players": ["Sarah", "Emma"],
      "combinedGoals": 25,
      "gamesPlayed": 3,
      "effectiveness": "high"
    }
  ],
  "summary": "Team shows consistent Q4 fatigue pattern (last 3 games). Defense improving (42→38 avg). Sarah stable high performer. GS-GA combo (Sarah-Emma) very effective. Recommend focus: address Q4 fatigue, maintain shooting combo."
}
```

**Constraints:**
- ✅ Multi-game analysis only (not single game)
- ✅ No recommendations (Pattern Detector identifies, Tactical Advisor recommends)
- ✅ Quantify with evidence from Event Analyzer outputs
- ✅ Identify trends (improving, declining, stable, persistent)
- ✅ Netball-specific patterns (chemistry timelines, position pairings)

**Netball Knowledge Used:**
- Position Chemistry (3.1-3.8): GS-GA need 8-12 quarters, GK-GD need 10-15
- Tactical Patterns (3.9-3.15): Recognize attacking strategies
- Age Benchmarks (4.0-4.6): U13 vs U17 expectations

**Cache Duration:** 1 week (patterns evolve slowly)

---

#### Module 3: Training Correlator

**Purpose:** Link training sessions to game performance changes

**Trigger:** When coach opens Training tab (on-demand, cached 2 weeks)

**Inputs:**
- Training sessions (last 4 weeks with attendance)
- Player stats
- Pattern Detector output (trajectories)
- Event Analyzer outputs (recent games)

**Output Format (JSON):**
```json
{
  "teamID": "team_123",
  "correlations": [
    {
      "issue": "Chloe stepping (footwork)",
      "gameEvidence": ["R1 notes: stepping", "R2 notes: still stepping"],
      "trainingResponse": {
        "date": "2026-02-05",
        "focus": "Footwork and landing",
        "attendees": ["Sarah", "Emma", "Lily"],
        "absentees": ["Chloe"]
      },
      "outcome": "issue_persists",
      "reason": "player_missed_training"
    }
  ],
  "attendancePatterns": [
    {
      "playerID": "p3",
      "name": "Chloe",
      "attendance": "60%",
      "missed_critical": ["Footwork session"],
      "impact": "high"
    }
  ],
  "effectiveness": {
    "recent_training": "2026-02-12 Fitness",
    "targeted_issues": ["Q4 fatigue"],
    "expected_improvement": "visible_by_round_6",
    "monitoring": true
  },
  "summary": "Footwork training missed by Chloe—issue persists. Fitness training (Feb 12) addresses Q4 fatigue; too early to measure impact. Next game (R6) will show effectiveness."
}
```

**Constraints:**
- ✅ Cause-effect only (training → performance)
- ✅ No generic training advice
- ✅ Correlate attendance with improvement/decline
- ✅ No future predictions, only observations
- ✅ Netball-specific timelines (chemistry development)

**Netball Knowledge Used:**
- Coaching Strategies (5.0-5.6): Effective training methods
- Position Development (4.7-4.12): Timeline expectations
- Age-Specific Coaching (4.0-4.6): Adjust expectations by age

**Cache Duration:** 2 weeks (need fresh game data to measure training impact)

---

#### Module 4: Tactical Advisor

**Purpose:** Actionable recommendations for lineup, positions, rotations

**Trigger:** When coach opens Lineup Planner (on-demand, cached 1 week)

**Inputs:**
- Pattern Detector output (trends)
- Training Correlator output (what's working)
- Current roster
- Next opponent (if available)

**Output Format (JSON):**
```json
{
  "teamID": "team_123",
  "forRound": 6,
  "recommendations": {
    "lineup": [
      {
        "priority": "high",
        "recommendation": "Rotate GS/GA in Q4",
        "rationale": "Q4 fatigue pattern evident; fresh legs may maintain scoring",
        "evidence": "Pattern Detector: Q4 -3 avg last 3 games",
        "implementation": "Sub Sarah → Bench at Q3 end, Emma → GS, Sarah back Q4 midpoint"
      }
    ],
    "positions": [
      {
        "playerID": "p3",
        "name": "Chloe",
        "current": "GK",
        "recommendation": "Keep at GK, add 1:1 footwork",
        "rationale": "Position suitable but technique needs work",
        "evidence": "Training Correlator: Missed critical footwork session",
        "urgency": "high"
      }
    ]
  },
  "watchList": [
    "Q4 scoring rate (target: maintain within -1 of Q3)",
    "Chloe footwork (expect improvement if catch-up session completed)",
    "Midcourt turnovers (target: <5 per game)"
  ],
  "summary": "Focus Q4 fatigue mitigation via rotation. Priority: Chloe catch-up. Monitor scoring consistency and turnovers."
}
```

**Enhancements (Priority 1):**

Added `quarterStrategy` section to output:
```json
{
  "quarterStrategy": {
    "Q1": "Establish momentum with best lineups - win Q1 decisively (65% of teams winning Q1 win game)",
    "Q2": "Maintain pressure, don't let deficit develop; prevent falling >5 goals behind",
    "Q3": "Post-halftime critical - adjust if opposition found gaps; re-establish intensity",
    "Q4": "Closing strong - use best closers if ahead; go aggressive with rotations if behind"
  }
}
```

**Constraints:**
- ✅ Specific, actionable recommendations only
- ✅ Reference evidence from other modules
- ✅ Prioritize by impact
- ✅ Include implementation details
- ✅ Include watch list for next game
- ✅ Netball-aware (position restrictions, chemistry timelines)

**Netball Knowledge Used:**
- Tactical Strategies (3.9-3.15): Game management by quarter
- Position Roles (2.1-2.7): Who can do what
- Age-Specific Coaching (4.0-4.6): Tailor advice by age

**Cache Duration:** 1 week (tactics evolve with new games)

---

#### Module 5: Season Strategist

**Purpose:** Big-picture strategy, competition positioning, development planning

**Trigger:** When coach opens Stats → Overview (on-demand, cached 2 weeks)

**Inputs:**
- All other module outputs
- Season stats (W-L-D, ladder position)
- Opponent difficulty ratings
- Competition standings

**Output Format (JSON):**
```json
{
  "teamID": "team_123",
  "season": "Season 1 2026",
  "strategy": {
    "competitivePosition": {
      "ladder": "4th of 12",
      "trend": "stable",
      "realistic_goal": "Top 4 finish",
      "path": "Need 3+ wins from next 5 games"
    },
    "strengthsToLeverage": [
      {
        "strength": "Strong GS-GA combination",
        "evidence": "Pattern Detector: 25 goals/game avg with Sarah-Emma",
        "tactical_use": "Maximize their court time in tight games"
      }
    ],
    "vulnerabilitiesToAddress": [
      {
        "vulnerability": "Q4 fatigue",
        "severity": "high",
        "timeline": "2-3 weeks (training impact)",
        "mitigation": "Tactical Advisor rotation strategy + Fitness training"
      }
    ]
  },
  "summary": "Sitting 4th, realistic Top 4 finish. Leverage strong shooting combo. Critical: address Q4 fatigue. Develop player depth."
}
```

**Enhancements (Priority 1):**

Added mental resilience context:
```json
{
  "confidenceContext": {
    "opponentRating": "2nd on ladder (intimidating?)",
    "historicalData": "Close games go to Q4; we've won 40% competitive matches",
    "mentality": "Focus on OUR game, execute Q1-Q2, close strong Q4",
    "vulnerabilityAngle": "Opposition strength is Q2 scoring runs - stay within 2 goals Q2, momentum shifts Q3"
  }
}
```

**Constraints:**
- ✅ Strategic level only (not game-by-game tactics)
- ✅ Long-term thinking (season arc, development)
- ✅ Competition context (ladder, strength of schedule)
- ✅ Multi-module synthesis (no redundant analysis)
- ✅ Netball-specific strategy (NFNL context, age pathways)

**Netball Knowledge Used:**
- Competition Context (6.0-6.8): NFNL ladder, ladder implications
- Development Pathways (7.1-7.9): Rep pathways, long-term planning
- Performance Analysis (6.9-6.15): Strength of schedule

**Model Selection:** `gemini-1.5-pro` (for complex reasoning, 2-week cache makes rate limits acceptable)

**Cache Duration:** 2 weeks (strategy evolves with ladder position)

---

## Implementation Roadmap

### Phase 1: Background Queue Infrastructure (2-3 hours)

**Objectives:**
1. Create PropertiesService queue for AI jobs
2. Set up time-based trigger (10-minute interval)
3. Implement retry logic (max 3 attempts)
4. Add diagnostic logging

**Backend:**
- [ ] `queueGameAI(params)` - Add jobs to queue
- [ ] `processAIQueue()` - Process jobs every 10 min
- [ ] `calculateGameDataHash()` - Change detection via MD5
- [ ] `getAIQueueStatus()` - Admin monitoring API
- [ ] Retry logic with 3-attempt max
- [ ] Archived team filtering
- [ ] Age-appropriate prompt engineering

**Frontend:**
- [ ] Call `queueGameAI()` after game finalization
- [ ] Calculate hash before queueing (detect changes)
- [ ] Handle offline→online transitions
- [ ] Show AI status badges (pending vs ready)

**Deployment:**
- [ ] Deploy to dev environment
- [ ] Test with 10+ games
- [ ] Monitor queue processing in logs
- [ ] Fix any issues before prod

**Deliverable:** Automatic AI generation working, games finalize instantly

---

### Phase 2: Game Event Analyzer Module (2-3 hours)

**Objectives:**
1. Create factual game analysis module
2. Implement structured JSON output
3. Store in AI_Knowledge_Base sheet
4. Update Background AI to use new module

**Backend:**
- [ ] `generateGameEventAnalysis()` - Factual game facts
- [ ] Structured JSON schema validation
- [ ] Store in AI_Knowledge_Base sheet (new tab)
- [ ] Schema versioning for future compatibility
- [ ] Update processGameSummaryJob() to call Event Analyzer

**Frontend:**
- [ ] Read Event Analyzer output in game detail
- [ ] Format JSON for display (expand structured data)
- [ ] Show source (background auto-generated vs manual)
- [ ] Fallback to old AI if missing

**Testing:**
- [ ] Compare quality vs current Game AI Summary
- [ ] Verify structured JSON format
- [ ] Test with various game scenarios

**Deliverable:** Game facts extracted to structured modules

---

### Phase 3: Pattern Detector Module (2-3 hours)

**Objectives:**
1. Create multi-game trend analysis
2. Reference Event Analyzer outputs (not raw data)
3. On-demand trigger from Stats tab
4. 1-week caching

**Backend:**
- [ ] `generatePatternAnalysis()` - Detect trends
- [ ] Reference Event Analyzer outputs sequentially
- [ ] Structured JSON output schema
- [ ] Cache management (1 week TTL)
- [ ] Store in AI_Knowledge_Base sheet

**Frontend:**
- [ ] Trigger when Stats tab opens
- [ ] Display patterns in new "Patterns" section
- [ ] Cache in localStorage
- [ ] Skip regeneration if cache valid

**Testing:**
- [ ] Verify trend detection quality
- [ ] Check cache effectiveness (minimal regeneration)
- [ ] Test with incomplete data (some EventAnalyzer missing)

**Deliverable:** Multi-game trends available on-demand

---

### Phase 4: Training Correlator Module (2-3 hours)

**Objectives:**
1. Create training effectiveness analysis
2. Correlate training attendance with performance
3. Track training timelines
4. 2-week caching

**Backend:**
- [ ] `generateTrainingCorrelation()` - Correlations
- [ ] Reference Pattern Detector output
- [ ] Attendance correlation logic
- [ ] Structured JSON output schema
- [ ] Cache management (2 week TTL)

**Frontend:**
- [ ] Trigger when Training tab opens
- [ ] Replace current AI Training Focus UI
- [ ] Display correlations and catch-up recommendations
- [ ] Cache in localStorage

**Testing:**
- [ ] Compare quality vs old Training Focus
- [ ] Verify attendance analysis accuracy
- [ ] Test with sparse training data

**Deliverable:** Training effectiveness measured

---

### Phase 5: Tactical Advisor Module (2-3 hours)

**Objectives:**
1. Create actionable lineup recommendations
2. Reference Pattern Detector + Training Correlator
3. Include quarter-strategy guidance (Priority 1 enhancement)
4. 1-week caching

**Backend:**
- [ ] `generateTacticalRecommendations()` - Recommendations
- [ ] Reference Pattern + Correlator outputs
- [ ] Quarter-strategy section (Q1-Q4 specific guidance)
- [ ] Structured JSON output schema
- [ ] Cache management (1 week TTL)

**Frontend:**
- [ ] Add "AI Suggestions" panel to Lineup Planner
- [ ] Display recommendations with evidence
- [ ] Show watch list for next game
- [ ] Cache in localStorage

**Testing:**
- [ ] Verify recommendation specificity
- [ ] Check evidence linking to other modules
- [ ] Test quarter-strategy output format

**Deliverable:** Tactical recommendations available in planner

---

### Phase 6: Season Strategist Module (1-2 hours)

**Objectives:**
1. Create season-level strategic analysis
2. Aggregate all module outputs
3. Include competition context + mental resilience (Priority 1 enhancements)
4. 2-week caching, use gemini-1.5-pro

**Backend:**
- [ ] `generateSeasonStrategy()` - Season strategy
- [ ] Reference all other modules
- [ ] Include ladder/competition context
- [ ] Mental resilience context for opposition
- [ ] Use gemini-1.5-pro model
- [ ] Structured JSON + narrative output
- [ ] Cache management (2 week TTL)

**Frontend:**
- [ ] Replace Team AI Insights in Stats → Overview
- [ ] Display season strategy with ladder context
- [ ] Show development focus areas
- [ ] Cache in localStorage

**Testing:**
- [ ] Compare quality vs old Team Insights
- [ ] Verify competition context integration
- [ ] Test 1.5-pro model performance

**Deliverable:** Season strategy replaces generic team insights

---

### Phase 7: Cleanup & Finalization (1-2 hours)

**Objectives:**
1. Deprecate old AI functions
2. Update documentation
3. Performance optimization
4. User communication

**Backend:**
- [ ] Remove old AI generation code
- [ ] Delete old AI prompt templates
- [ ] Archive old AI outputs (don't delete)
- [ ] Code cleanup and comments

**Frontend:**
- [ ] Remove old AI UI components
- [ ] Clean up old cache keys
- [ ] Update API references

**Documentation:**
- [ ] Update CLAUDE.md with new architecture
- [ ] Document JSON schemas for each module
- [ ] Cache management guide
- [ ] Troubleshooting guide

**User Communication:**
- [ ] Create release note
- [ ] Announce feature improvements
- [ ] Document new UI changes

**Deliverable:** Clean production system

---

## Complete Data Flow Example

**Scenario:** Coach finalizes game R5 on Saturday at 2:30 PM

### Timeline

**14:30 - Game Finalized**
```
Coach clicks "Finalize"
Frontend:
  - Calls queueGameAI({ gameID, sheetName, teamID })
  - Calculates game hash → stores as baseline
  - Shows "Game saved" toast

Backend:
  - Receives queueGameAI call
  - Checks: Team archived? No
  - Checks: AI exists with same hash? No
  - Adds to queue → PropertiesService
  - Returns { success: true, queued: true }

Frontend:
  - Game detail closes
  - Returns to schedule
  - Shows "⏳ AI" badge (pending)
```

### 14:35-14:40 (Time-Based Trigger Fires)

```
Apps Script time-based trigger runs processAIQueue()

Background Process:
  1. Loads all ai_queue_* properties
  2. Finds game_R5 job
  3. Loads team data for team_123
  4. Finds game in games[] array
  5. Calls Event Analyzer:
     - Input: scores, lineup, notes
     - Output: Structured facts JSON
     - Stores in AI_Knowledge_Base sheet
  6. Updates games[5].aiSummary:
     - text: (formatted narrative)
     - generatedAt: 14:37:42Z
     - source: "background"
     - gameDataHash: "a3f2b9c1d4e7f0..."
     - gameContext: {round: 5, opponent: "vs Diamond Creek", finalScore: {us: 35, opponent: 28}}
  7. Saves team data back to sheet
  8. Removes job from queue
  9. Logs metric: ai_background_success
```

### 14:50-15:00 (Coach Reviews Results)

```
Coach clicks on Schedule → opens game detail

Frontend:
  - Loads team data (fresh load includes aiSummary)
  - Displays "✨ AI Game Summary" section
  - Shows structured facts formatted nicely
  - Includes watch list for next game

Coach sees:
  ✨ AI Game Summary (auto-generated)
  
  Game Facts:
  - Won by 7 goals vs Diamond Creek (35-28)
  - Strong Q1 start, Q2 dip, dominated Q3
  - Q4 closing weakness (concerning pattern)
  
  Key Players:
  - Sarah (GS): 18 goals across 4 quarters
  - Emma (GA): 8 goals, 3 quarters
  
  Watch List:
  - Q4 fatigue (continues pattern from R3-R4)
  - Sarah & Emma chemistry (8-12 quarter development)
  - Midcourt turnovers (target: <5 per game)

Coach clicks "Regenerate" (optional)
  → Shows "Force refresh AI? ...prompt... Yes / No"
  → Queues with forceRefresh=true
  → Next trigger cycle regenerates fresh analysis
```

### 15:05 (Coach Opens Stats Tab)

```
Frontend detects Stats tab open
  ↓
Checks localStorage: ai_module_team_123_pattern_detector
  ├─ Not found OR cache expired (older than 1 week)
  ├─ Calls generatePatternAnalysis API
  └─ Backend:
     1. Loads last 5 Event Analyzer outputs
     2. Analyzes trends across games
     3. Returns:
        - Closing weakness trend (R3-R5, confirmed)
        - Defense improving trend (avg goals down)
        - Player trajectories (Sarah stable, others varying)
        - Combo effectiveness (Sarah-Emma 25 goals effective)
     4. Stores in AI_Knowledge_Base sheet (pattern_detector row)
  ├─ Frontend caches result (1 week)
  └─ Displays "Patterns" section in Stats

Coach sees:
  Latest patterns identified
  - Q4 fatigue: Consistent last 3 rounds (severity: HIGH)
  - Defense: Improving (avg 42 → 38) (severity: POSITIVE)
  - Sarah: Stable high performer 17-18 goals/game
  - Sarah-Emma combo: 25 combined goals very effective
```

### 15:15 (Coach Opens Lineup Planner)

```
Frontend detects Planner open
  ↓
Checks localStorage: ai_module_team_123_tactical_advisor
  ├─ Not found OR cache expired (older than 1 week)
  ├─ Calls generateTacticalRecommendations API
  └─ Backend:
     1. Loads Pattern Detector output (trends)
     2. Loads Training Correlator output (what's working)
     3. Generates recommendations:
        - Rotate shooters Q4 (address fatigue)
        - Maintain Sarah-Emma pairing (chemistry solid)
        - Watch midcourt turnovers
     4. Adds quarterStrategy:
        - Q1: Win decisively (establish momentum)
        - Q2: Maintain pressure (prevent deficit >5)
        - Q3: Post-halftime adjustment
        - Q4: Fresh legs in closers
     5. Stores in AI_Knowledge_Base
  ├─ Frontend caches result (1 week)
  └─ Displays "AI Suggestions" panel in Planner

Coach sees:
  AI Suggestions for R6:
  
  LINEUP RECOMMENDATIONS:
  • Priority: HIGH - Rotate GS/GA in Q4
    Why: Q4 fatigue pattern (avg -3 last 3 games)
    How: Sarah all Q1-Q3, sub Emma Q4 (fresh legs)
    
  QUARTER STRATEGY:
  • Q1: Establish momentum with best lineups (65% teams winning Q1 win game)
  • Q2: Maintain +2 differential, prevent -5 build
  • Q3: Post-halftime critical - adjust if opp adapts
  • Q4: Use closers (fresh Sarah or Emma) if ahead/behind
    
  WATCH LIST:
  • Q4 scoring vs Q3 (target: within -1)
  • Rotation effectiveness
  • Midcourt turnover rate
```

### 15:30 (Coach Updates Notes)

```
Coach adds Q3 note: "Strong defensive pressure, forced 8 turnovers"

Frontend:
  - Calculates new game hash (includes notes)
  - Compares to aiSummary.gameDataHash
  - Hash CHANGED (notes added) → Call queueGameAI({ forceRefresh: false })

Backend:
  - Adds job to queue
  - Next trigger cycle (15:40-15:45):
    1. Regenerates Event Analyzer with new notes
    2. Updates aiSummary with new analysis
    3. Removes job from queue

Coach benefits:
  - Notes automatically incorporated into AI analysis
  - No manual button clicking
  - Fresh analysis includes new context
  - Happens transparently in background
```

---

## Deployment & Monitoring

### Deployment Phases

#### Phase 1A: Dev Testing (Week 1)
- Deploy to dev Apps Script environment
- Test with 10-15 real games
- Monitor processAIQueue() in logs
- Verify JSON schema correctness
- Test retry logic with forced failures
- Confirm change detection working

#### Phase 1B: Soft Launch (Week 2)
- Deploy to production
- Enable for 2-3 test coaches only
- Monitor diagnostics for 1 week
- Gather feedback on quality
- Fix any issues discovered

#### Phase 2: Full Rollout (Week 3+)
- Enable for all teams
- Announce in release notes
- Monitor success rates (target: >95%)
- Collect coach feedback
- Iterate on prompt engineering

### Monitoring & Diagnostics

**Key Metrics:**

| Metric | Target | Where to Check |
|--------|--------|----------------|
| Background success rate | >95% | Diagnostics sheet (ai_background_success count) |
| Manual fallback usage | <10% | Diagnostics sheet (ai_manual_generated count) |
| Avg queue time | <10 min | Success metrics (queueTime field) |
| Current queue length | <20 jobs | getAIQueueStatus() API |
| Failed jobs | <5/day | Diagnostics sheet (ai_background_failed count) |

**Admin Dashboard:**

```javascript
// Dev panel shows:
AI Queue Status
├─ Queued: 2 jobs (pending processing)
├─ Processed today: 18 success, 1 failed
├─ Avg queue time: 7m 23s
└─ Details:
   ├─ game_456: queued 3m ago
   └─ game_457: queued 1m ago
```

**Logs Location:**
- Apps Script: Execution logs (processAIQueue results)
- Frontend: Console logs (queueGameAI API calls)
- Backend: Diagnostics sheet (ai_* metrics)

---

## Success Criteria

### Technical Success
- ✅ All 5 modules implement and tested in isolation
- ✅ Module dependencies working correctly (each references previous)
- ✅ JSON schemas valid for all outputs
- ✅ Cache TTLs working as specified
- ✅ Change detection preventing unnecessary regenerations
- ✅ Retry logic working (max 3 attempts)
- ✅ Age-appropriate prompts generating different outputs by age group

### User Experience Success
- ✅ Game finalization instant (no waiting for AI)
- ✅ AI appears automatically within 10 minutes
- ✅ Coaches never need to click AI button
- ✅ Manual fallback works if background fails
- ✅ Clear status indicators (pending vs ready)
- ✅ No regression in insight quality

### Business Success
- ✅ 55% reduction in AI calls (11 → 5 per week per team)
- ✅ <10% usage of manual fallback
- ✅ >95% background success rate
- ✅ Coach satisfaction positive
- ✅ Scalable to 20+ active teams without quota issues

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Apps Script quota exceeded** | Low | High | Conditional trigger, rate limiting, archived team filtering |
| **Module dependency breaks** | Low | High | Unit tests, schema validation, backward compatibility |
| **Quality regression** | Medium | Medium | A/B testing vs old AI, coach feedback collection |
| **Cache inconsistency** | Low | Low | Version tracking, cache invalidation strategy |
| **Coach confusion** | Medium | Low | Gradual rollout, inline help text, release notes |
| **Archived teams wasting quota** | Medium | Low | Explicit archived check, skip silently |
| **Job gets stuck in queue** | Low | Low | Max retries (3), automatic removal after failures |

**Rollback Plan:**
- If production issues: Set `config.backgroundAI = false`
- This disables queueGameAI calls
- Manual AI still works (fallback always available)
- No data loss, no users blocked

---

## Cost Analysis

### Before (Current)
- 11 AI calls/week per team
- Multiple modules analyzing same data
- No caching
- Generic advice (no netball specificity)

**Annual cost (10 active teams):**
- Free tier covered fully
- Paid tier: ~$1.40/year

### After (Combined System)
- 5 AI calls/week per team (55% reduction)
- Modular design (no redundancy)
- Smart caching (1-2 week TTLs)
- Netball-optimized advice

**Annual cost (10 active teams):**
- Free tier covered fully
- Paid tier: ~$0.65/year
- **Savings: 54% cost reduction**

**Per team annual savings:** $0.075
**Per 10 teams annual savings:** $0.75

*Note: Free tier (1500 req/day) easily accommodates usage. Even with 20 teams (10 req/day baseline) + growth, still well under quota.*

---

## Timeline & Effort

### Total Estimated Effort
- Phase 1 (Background Queue): 2-3 hours
- Phase 2 (Event Analyzer): 2-3 hours
- Phase 3 (Pattern Detector): 2-3 hours
- Phase 4 (Training Correlator): 2-3 hours
- Phase 5 (Tactical Advisor): 2-3 hours
- Phase 6 (Season Strategist): 1-2 hours
- Phase 7 (Cleanup): 1-2 hours

**Total: 14-19 hours development**

### Calendar Timeline
- Week 1: Phases 1-2 (Dev testing + soft launch prep)
- Week 2: Phases 3-4 (More modules)
- Week 3: Phases 5-6 (Completion)
- Week 4-6: Testing, monitoring, iteration

**Total calendar: 6 weeks** (mostly testing/monitoring, not continuous development)

---

## How Coaches Will Benefit

### Day 1: Automatic Game AI
```
Coach finalizes Saturday game → Hours passes → Returns to app
→ Sees "✨ AI Game Summary" auto-generated (no clicks needed)
→ No waiting, instant insight display
→ Smooth, delightful experience
```

### Day 2: Stats Overview
```
Coach opens Stats tab in week
→ Sees new "Patterns" section with multi-game trends
→ Understands Q4 fatigue pattern emerging (3-game trend)
→ Connected to Event Analyzer facts per game
→ Actionable context for next game planning
```

### Day 3: Training Tab
```
Coach reviews training impact
→ Sees correlation: "Footwork training on Feb 5"
→ vs Chloe's footwork issue that persists (she missed training)
→ vs Emma improved stepping (she attended)
→ Understanding why training did/didn't work
```

### Day 4: Lineup Planner
```
Coach opens Planner for next game
→ Sees "AI Suggestions" panel
→ Specific recommendations: "Rotate shooters in Q4"
→ Why: "Q4 fatigue last 3 games"
→ How: Quarter-by-quarter strategy
→ Evidence: Linked to Pattern Detector data
→ Actionable, specific, trustworthy
```

### Day 5: Stats Overview - Season Strategy
```
Coach reviews season positioning
→ Sees Team AI Insights replaced with "Season Strategy"
→ Clear competitive goal: Top 4 finish
→ Realistic path: Need 3+ wins from 5 remaining
→ Strengths: GS-GA combo (28 goals avg)
→ Risk: Q4 fatigue affecting clutch games
→ Development: Build bench depth
→ Strategic direction for rest of season
```

---

## Phase 8-14: Extended Modular AI Architecture (Scaling to 20 Teams)

**When to Start:** After Phase 7 is complete and validated in production (Weeks 8-12)

**Goal:** Extend from 5-module foundation to 15-module comprehensive system for advanced coaching intelligence

### The 4-Tier Architecture

**Tier 1: Foundation (Modules 1-4) - Always Active**
- Already implemented in Phases 1-5
- Per-game AI background generation
- Permanent cache (events never change)
- High quality, fast processing

**Tier 2: Behavioral (Modules 5-9) - User-Triggered Deep Dives**
- Position Performance Analyzer (detailed position stats)
- Chemistry Dynamics (pair maturity timelines)
- Shooting Pattern Analyst (attack system analysis)
- Rotation & Fatigue Detector (workload audits)
- Opposition Matchup Analyzer (historical patterns) **← Enhanced with mental resilience context**
- Trigger: User clicks "Analyze..." in tab
- Cache: 1-7 days (patterns evolve with new games)

**Tier 3: Strategic (Modules 10-12) - Advanced Tactical Planning**
- Strength of Schedule Tracker (playoff context, winnable games)
- Combination Scorer (position pair effectiveness) **← Enhanced with plus-minus metrics**
- Defensive System Analyzer (zone vs player defense effectiveness)
- Trigger: On-demand strategic planning
- Cache: 2-4 weeks (big picture changes slowly)

**Tier 4: Advanced (Modules 13-15) - Complex Reasoning (Uses gemini-1.5-pro)**
- Development Pathway Recommender (multi-season player progression)
- Junior Benchmarking (age-group context, appropriate expectations)
- Season Strategist (synthesis of all modules) **← Enhanced with mental resilience angle**
- Trigger: Bi-weekly deep strategic review
- Cache: 4-8 weeks (long-term planning)

### Extended Module Specifications

#### Module 5: Position Performance Analyzer
**Purpose:** Detailed analysis of how each position is performing

**Inputs:**
- Pattern Detector output (player trajectories)
- Position-specific stats (goals, assists, positions played)
- Game context (opponent strength, game result)

**Output:** Per-position performance report
```json
{
  "positions": [
    {
      "position": "GS",
      "impact": "high",
      "goals_avg": 17.2,
      "consistency": "high",
      "best_matchup": "weak_defense",
      "worst_matchup": "strong_GK",
      "recommendation": "Prioritize on court in close games"
    }
  ]
}
```

#### Module 6: Chemistry Dynamics
**Purpose:** Track pair maturity and partnership development

**Timeline Tracking:**
- GS-GA: 8-12 quarters to click (needs time together)
- GK-GD: 10-15 quarters (defensive communication critical)
- C-with-partner: 6-8 quarters (midcourt rhythm)

**Output:**
```json
{
  "partnerships": [
    {
      "pair": ["Sarah (GS)", "Emma (GA)"],
      "quarters_together": 12,
      "maturity": "developed",
      "effectiveness": "26 combined goals",
      "chemistry_level": "high"
    }
  ]
}
```

#### Module 7: Shooting Pattern Analyst
**Purpose:** Analyze attacking strategy (fast-break vs set-play)

**Output:**
```json
{
  "attacking_style": "balanced",
  "fast_break_success": 0.68,
  "set_play_success": 0.72,
  "strongest_quarter": "Q3",
  "recommendations": "Use fast-break in transition, set plays when opponent set"
}
```

#### Module 8: Rotation & Fatigue Detector
**Purpose:** Audit workload distribution and identify fatigue patterns

**Output:**
```json
{
  "fairness_score": 0.78,
  "high_load_players": ["Sarah", "Emma"],
  "fatigue_indicators": "Q4 drop-off with same players",
  "recommendations": "Rotate key players Q4, develop bench strength"
}
```

#### Module 9: Opposition Matchup Analyzer
**Purpose:** Learn what works against specific opponents

**Enhancements:**
- Added "Confidence Angle (Mental Resilience Context)"
- Shows successful quarter-by-quarter strategies vs specific opponent
- Provides pre-game mental framework and vulnerability angles

**Output:**
```json
{
  "opponent": "Richmond (1st on ladder)",
  "historical_record": "1W-1L",
  "confidence_context": {
    "opponent_strength": "Dominant on ladder but close games go to Q4",
    "our_pattern": "Won 40% of competitive matches",
    "mentality_frame": "Focus on OUR game, Q1-Q2 execution, close strong Q4",
    "vulnerability": "Opposition strong in Q2 - if we stay within 2 goals Q2, momentum shifts Q3"
  },
  "quarter_strategies": {
    "Q1": "Set tempo, execute our system",
    "Q2": "Defensive pressure, limit their 2nd quarter runs",
    "Q3": "Momentum swing opportunity after half",
    "Q4": "Close-game execution (our strength)"
  }
}
```

#### Module 10: Strength of Schedule Tracker
**Purpose:** Playoff probability, winnable vs stretch games

**Output:**
```json
{
  "remaining_opponents": [
    {"rank": 1, "difficulty": "impossible", "winnable": false},
    {"rank": 8, "difficulty": "competitive", "winnable": true},
    {"rank": 12, "difficulty": "likely_win", "winnable": true}
  ],
  "playoff_probability": 0.78,
  "path_to_goals": "Need 2 more wins from 5 remaining for top 4"
}
```

#### Module 11: Combination Scorer
**Purpose:** Track effectiveness of position pair combinations

**Enhancements:**
- Added explicit plus-minus metrics
- Shows (goals for when combo on) - (goals against when combo on)
- Identifies positive vs negative combos

**Output:**
```json
{
  "top_combos": [
    {
      "combo": "Sarah (GS) + Emma (GA)",
      "goals_for_avg": 8.2,
      "goals_against_avg": 3.1,
      "plus_minus": "+5.1",
      "assessment": "Excellent combo - helps us win quarters"
    },
    {
      "combo": "Alex (GD) + Jordan (GK)",
      "goals_for_avg": 4.5,
      "goals_against_avg": 6.2,
      "plus_minus": "-1.7",
      "assessment": "Concerning - more goals against. Monitor or adjust."
    }
  ]
}
```

#### Module 12: Defensive System Analyzer
**Purpose:** Zone vs player defense effectiveness

**Output:**
```json
{
  "system": "player_defense_with_zone_Q4",
  "effectiveness": 0.82,
  "strengths": ["Intercepts high", "Fast transitions"],
  "weaknesses": ["Perimeter shooting vulnerable"],
  "recommendation": "Tighten perimeter for next game"
}
```

#### Module 13: Development Pathway Recommender (1.5-pro)
**Purpose:** Multi-season player progression planning

**Output:**
```json
{
  "player": "Emma (GA)",
  "current_level": "developing_talent",
  "pathway": {
    "6_months": "GS-GA versatility (2-3 games at each)",
    "1_year": "Primary GS with occasional GA",
    "2_years": "Lead shooter and game leader"
  },
  "next_milestone": "Success in high-pressure game (playoff)"
}
```

#### Module 14: Junior Benchmarking (1.5-pro)
**Purpose:** Age-group context and appropriate expectations

**Output:**
```json
{
  "age_group": "U15",
  "team_current": "4th on 12-team ladder",
  "benchmark": {
    "excellent": "Top 2 (6+ wins by this round)",
    "good": "3rd-4th (at target)",
    "average": "5th-8th",
    "learning": "9th-12th"
  },
  "assessment": "On track for strong season; realistic development continues"
}
```

#### Module 15: Season Strategist (1.5-pro, already started in Phase 6)
**Purpose:** Synthesis of all modules into championship strategy

Already implemented in Phase 6 with enhancements.

### Extended Rate Limit Analysis

**Model Distribution:**
- Modules 1-4: gemini-2.0-flash (7 req/week per team = 1 per day average)
- Modules 5-8: gemini-2.0-flash (optional, on-demand, user-triggered)
- Modules 9-12: gemini-2.0-flash (strategic, on-demand)
- Module 13-15: gemini-1.5-pro (advanced, bi-weekly)

**Quota Calculation (20 Active Teams):**

Foundation (always active):
- 20 teams × 2 games/week × 1 Module 1 call = 40 calls/week (foundation)

Modules 2-4 (cached, occasional refresh):
- Estimate 30 calls/week (multi-game modules refreshed 1-2× per team per week)

Modules 5-12 (user-triggered, optional):
- Conservative estimate: 20 calls/week (coaches don't use all every day)

Modules 13-15 (advanced, bi-weekly):
- Estimate: 5 calls/week (bi-weekly = ~2-3 per week across 20 teams)

**Total: ~95 calls/week for 20 teams (2.0-flash + 1.5-pro combined)**

**vs. Gemini Quota:**
- gemini-2.0-flash: 15 req/min = 10,800 req/day = 75,600 req/week ✅ (95 << 75,600)
- gemini-1.5-pro: 2 req/min = 2,880 req/day = 20,160 req/week ✅ (5 << 20,160)

**Result:** Massive headroom even with all 15 modules active

---

### Phased Rollout: Foundation → Extended

**Foundation (Phases 1-7, Weeks 1-6):**
- Modules 1-4: Always running
- 5 calls/week per team
- Production-stable and tested

**Phase 8: Add Tier 2, Module 5 (Weeks 8-9)**
- Position Performance Analyzer
- On-demand from Stats tab
- 1-week cache

**Phase 9: Add Tier 2, Modules 6-8 (Weeks 10-11)**
- Chemistry Dynamics
- Shooting Pattern Analyst
- Rotation & Fatigue Detector
- User-triggered, 1-7 day caches

**Phase 10: Add Tier 2, Module 9 (Week 12)**
- Opposition Matchup Analyzer (with enhancements)
- Mental resilience context integration
- 1-week cache

**Phase 11: Add Tier 3, Modules 10-12 (Weeks 13-15)**
- Strength of Schedule Tracker
- Combination Scorer (with plus-minus)
- Defensive System Analyzer
- On-demand strategic planning, 2-4 week caches

**Phase 12: Add Tier 4, Modules 13-14 (Weeks 16-18)**
- Development Pathway Recommender (1.5-pro)
- Junior Benchmarking (1.5-pro)
- Complex reasoning, longer caches

**Phase 13: Optimize & Integrate (Weeks 19-20)**
- All 15 modules active
- Performance tuning
- Coach feedback integration
- UI enhancements for module navigation

**Phase 14: Monitor & Iterate (Ongoing)**
- Collect metrics on module usage
- Refine underperforming modules
- Add new modules as needed

**Total Calendar:** 20 weeks from foundation completion (Weeks 26-45)
**Annual Timeline:** Foundation complete (6 weeks), Extended complete (20 weeks) = 26 weeks cumulative

---

### Netball Knowledge Integration Across 15 Modules

**Knowledge Base Coverage:**

| KB Section | Modules Using It | Coverage |
|------------|------------------|----------|
| Rules & Regulations (1.0-1.8) | 1, 4, 9 | 95% |
| Position Roles (2.1-2.7) | 1, 2, 4, 5, 6, 7, 8, 9, 11, 12 | 98% |
| Tactical Strategies (3.9-3.15) | 2, 4, 7, 9, 10, 12 | 95% |
| Age-Group Coaching (4.0-4.6) | 3, 4, 5, 14 | 92% |
| Competition Context (6.0-6.8) | 10, 14, 15 | 90% |
| Performance Metrics (6.9-6.15) | 1, 2, 5, 11, 15 | 88% |
| Coaching Challenges (7.0-7.7) | All modules | 100% |

**Key Validation Points:**

- ✅ No module suggests invalid plays (zone restrictions enforced)
- ✅ Chemistry timelines understood (won't judge pairs prematurly)
- ✅ Age-appropriate expectations (U11 vs adult context)
- ✅ Netball-specific terminology throughout
- ✅ Position responsibilities respected in recommendations

---

### Risk Assessment: Scaling from 5 → 15 Modules

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Recommendation conflicts** | Low | Medium | Each module exclusive domain, no overlap |
| **Rate limit issues** | Very Low | High | Headroom analysis shows 95 << 75,600 quota |
| **Coach cognitive overload** | Medium | Low | Module triggers user-controlled, not automatic |
| **Quality degradation** | Low | Low | Each module validated independently |
| **1.5-pro slowness** | Low | Low | Used only for bi-weekly modules, users don't wait |
| **Cache invalidation bugs** | Low | Medium | Version tracking, backward compatibility |

---

### Extended Success Metrics

**Foundation Phase Success (Weeks 1-6):**
- ✅ >95% background success rate
- ✅ <10% manual fallback usage
- ✅ Average queue time <10 min

**After Phase 12 (All 15 Modules, Week 18):**
- ✅ Module-specific usage rates (which modules do coaches use most?)
- ✅ Quality scores per module (rate from 1-5 stars)
- ✅ Insights actionability (coaches implement recommendations?)
- ✅ Rate limit utilization (how close to quota for 20 teams?)
- ✅ Cost per insight ($/useful recommendation)

---

### User Experience: Foundation vs Extended

**With Foundation (Week 7):**
```
Coach opens game → Sees Event facts + Patterns + Season strategy
Coaches gets: What happened, trends, competitive position
```

**With Extended (Week 20):**
```
Coach opens game → Sees Event facts + Patterns + Tactical recommendations
Coach opens Stats tab → Can analyze: Position performance, chemistry, defense, combos
Coach opens Training → Sees training correlations + fatigue analysis
Coach opens Lineup Planner → Gets: Opposition matchups, mental framework, rotation suggestions
Coach reviews season → Sees: Development pathways, age benchmarks, full strategic plan

Coaches get: Comprehensive netball intelligence across all decision levels
```

---

### How Extended Complements Foundation

**Foundation (Modules 1-5):** Core AI, always running, high ROI
- Fast, reliable, background processing
- Per-game facts + patterns
- Sufficient for most coaches

**Extended (Modules 6-15):** Advanced coaching intelligence
- User-triggered deep dives
- Complex reasoning (1.5-pro)
- Specialist insights per situation
- Valuable for coaches who want detailed analysis

**Hybrid Approach:**
- Coaches who want quick insights: Use foundation only
- Coaches who want deep analysis: Trigger extended modules as needed
- No "bloat" for casual users, full power available for serious coaches

---

## Conclusion

**Background Queue + Modular Architecture = **Perfect Fit**

**Queue handles the "HOW":**
- How to run AI without blocking coaches
- How to survive app closures
- How to detect meaningful changes
- How to retry when things fail
- How to customize by age group

**Modules handle the "WHAT":**
- What AI analysis to run
- What insights are needed
- What avoids redundancy
- What builds knowledge incrementally
- What embeds netball expertise

**Together, they create:**
- 🚀 Fast, responsive UX (background + caching)
- 💪 Intelligent insights (modular + netball-specific)
- 💰 Efficient operation (55% cost savings)
- 📈 Scalable design (easy to add new modules)
- ✅ Always working (with fallbacks)

### Next Steps

**Immediate (Foundation):**
1. **Review & Approve** foundation plan (Phases 1-7)
2. **Start Phase 1** (Background Queue infrastructure, 2-3 hrs)
3. **Soft launch** with test coaches (Week 2)
4. **Gather feedback** on AI quality (Weeks 3-6)
5. **Complete Phases 2-7** with validation

**Future Scaling (Extended):**
6. **Wait for foundation validation** (after Week 6 launch)
7. **Plan Phase 8+** (Extended modules, 20-week rollout)
8. **Roll out Tier 2** (Modules 5-9, behavioral deep dives)
9. **Roll out Tier 3** (Modules 10-12, strategic planning)
10. **Roll out Tier 4** (Modules 13-15, advanced reasoning)
11. **Celebrate** comprehensive netball coaching AI! 🎉

---

**Document Status:** Complete integrated plan (foundation + extended scaling)  
**Last Updated:** February 25, 2026  
**Supercedes:** BACKGROUND_AI_PLAN.md, MODULAR_AI_ARCHITECTURE.md, EXTENDED_MODULAR_AI_ARCHITECTURE.md  
**References:** docs/netball-knowledge-base.md

**Scope:**
- ✅ Foundation: 5 modules, 6-week implementation
- ✅ Extended: 15 modules, 20-week scaling roadmap
- ✅ Rate limit analysis: Headroom for 20+ teams
- ✅ Phased rollout: Low-risk incremental adoption
- ✅ Netball knowledge: Integrated across all modules
- ✅ Priority 1 enhancements: Implemented in foundation (Modules 4, 9, 11)
