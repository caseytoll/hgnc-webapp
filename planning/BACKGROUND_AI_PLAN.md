# Background AI Generation - Implementation Plan

**Status:** Ready for implementation  
**Estimated Effort:** 6-8 hours  
**Priority:** Medium (Quality of Life Enhancement)  
**Dependencies:** None (builds on existing AI features)

---

## 1. Executive Summary

### Current State
All AI features are **synchronous and user-initiated**:
- Coach clicks "Generate AI Summary" button
- Frontend waits for backend → Gemini API → response
- UI blocks (15-30 seconds) until complete
- If coach closes app mid-generation, work is lost
- Coach must remember to click AI buttons after finalizing games

### Proposed State
AI summaries generate **automatically in the background**:
- Coach finalizes game → AI queue job created → Navigate away immediately
- Backend processes AI queue asynchronously (every 5 minutes)
- Works even if app closed
- Next time coach opens game, AI summary already there ✨
- Fallback: Manual "Generate AI" button if background failed

### Value Proposition
- **Removes friction:** No waiting, no manual button clicks
- **Always available:** Coach never forgets to generate insights
- **Better UX:** Finalization is instant, AI appears later
- **Reliable:** Server-side processing survives app closure
- **Smart refresh:** Only regenerates when game data actually changes (no wasted quota)

### When AI Generates/Refreshes

**AI generates automatically when:**
1. ✅ **Game finalized** (first time) → Queued for background generation
2. ✅ **Notes updated** after finalization → Hash changes, auto re-queued
3. ✅ **Lineup updated** after finalization → Hash changes, auto re-queued  
4. ✅ **Scores updated** after finalization → Hash changes, auto re-queued

**AI does NOT regenerate when:**
1. ❌ **Captain changed** → Non-AI field, hash unchanged, skip
2. ❌ **Date/location changed** → Non-AI field, hash unchanged, skip
3. ❌ **Game status changed** (after AI generated) → Hash may be same, skip if unchanged
4. ❌ **AI already up-to-date** → Hash matches, no change detected, skip

**Manual override:**
- 🔄 **"Regenerate" button** → Force refresh (bypasses change detection) for when coach wants fresh analysis

**Key principle:** AI only regenerates when the data it analyzes actually changes. Non-material updates don't trigger unnecessary AI calls.

---

## 2. Architecture Design

### Option A: Time-Based Queue (Recommended) ⭐

**How it works:**
1. Frontend calls `queueGameAI` API when game finalized
2. Backend stores job in `PropertiesService` (key-value queue)
3. Apps Script **time-based trigger** runs `processAIQueue()` every 5 minutes
4. Queue processor generates AI, writes to sheet, removes job
5. Frontend displays AI summary on next game load (already generated)

**Advantages:**
- ✅ Simple implementation (no complex scheduling)
- ✅ Survives all app closures
- ✅ Apps Script handles trigger automatically
- ✅ Easy retry logic (failed jobs stay in queue)
- ✅ No race conditions (sequential processing)
- ✅ Archived team filtering (saves quota on inactive teams)

**Disadvantages:**
- ⏱️ Up to 5-minute delay (acceptable for background work)
- 📊 Queue limited by PropertiesService (9KB per property, but JSON is small)

**PropertiesService Queue Structure:**
```javascript
// Key format: ai_queue_{gameID}_{sheetName}
// Value: JSON string
{
  "gameID": "game_1735250400000",
  "sheetName": "data_team_1762633769992",
  "teamID": "team_1762633769992",
  "queuedAt": "2026-02-20T14:30:00Z",
  "type": "game_summary",
  "attempts": 0,
  "lastError": null
}
```

### Option B: Immediate Async Trigger

**How it works:**
1. Frontend calls `finalizeGameWithAI` API
2. Backend uses `ScriptApp.newTrigger()` to fork execution
3. Main thread returns immediately to frontend
4. Forked thread generates AI and writes to sheet

**Advantages:**
- ⚡ Faster (starts within seconds)
- 📦 No queue management needed

**Disadvantages:**
- ❌ Complex error handling (forked execution dies silently)
- ❌ No built-in retry mechanism
- ❌ Harder to debug (separate execution logs)
- ❌ Apps Script trigger quota limits (20 triggers/user/script)

**Recommendation:** Use **Option A (Time-Based Queue)** for reliability and simplicity.

---

## 3. Which AI Features to Auto-Generate?

### Auto-Generate (High Value)

#### ✅ Game AI Summary
**Trigger:** When game finalized (scores complete, lineup set)

**Why auto-generate:**
- Time-sensitive (most relevant immediately after game)
- Per-game context (specific opponent, lineup, scores)
- High engagement (coaches want to see this)
- Stable input (finalized games rarely change)

**Input data:**
- Game scores (total + per-quarter)
- Lineup positions
- Opponent name
- Quarter notes (if any)
- Team stats context

**Output storage:**
- Write to `games[x].aiSummary` in team data JSON
- Cache in frontend `state.currentGame.aiSummary`

#### ⚠️ Player AI Insights (Optional)
**Trigger:** If player had significant game involvement (multiple quarters played)

**Why consider:**
- Valuable for regular players
- Already per-game scoped

**Why skip (for now):**
- Less urgent than game summary
- Requires cross-game stats aggregation
- More complex input data
- Could overwhelm queue with N jobs per game

**Decision:** **Skip for Phase 1**, revisit in Phase 2

### Keep Manual (Lower Value)

#### ⏸️ Team AI Insights
**Why keep manual:**
- Requires full season context (all games)
- Less time-sensitive
- More expensive AI call (larger context)
- Coaches typically view once per week, not per game
- Triggered from Stats → Overview tab (different context)

#### ⏸️ AI Training Focus
**Why keep manual:**
- Coach-initiated when planning training sessions
- Requires recent game notes (rolling window)
- Contextual to training calendar
- Triggered from Training tab (different workflow)

---

## 4. Data Structures

### Queue Job (PropertiesService)

```javascript
// Stored as: ai_queue_{gameID}_{sheetName} = JSON.stringify(job)
{
  gameID: "game_1735250400000",           // Links to games[] array
  sheetName: "data_team_1762633769992",    // Target sheet
  teamID: "team_1762633769992",            // For logging
  queuedAt: "2026-02-20T14:30:00Z",        // Queue timestamp
  type: "game_summary",                     // Future: player_insight, etc.
  attempts: 0,                              // Retry counter
  lastError: null,                          // Error message if failed
  priority: 1                               // Future: priority queue
}
```

### Game Data (After Background AI)

```javascript
// games[] array in team data
{
  gameID: "game_1735250400000",
  round: 5,
  opponent: "Diamond Creek",
  date: "2026-02-20",
  status: "normal",
  finalized: true,  // ← Triggers AI queue
  scores: { us: 35, opponent: 28 },
  lineup: { Q1: {...}, Q2: {...}, Q3: {...}, Q4: {...} },
  lastModified: "2026-02-20T14:30:00Z",  // ← Updated when lineup/notes/scores change
  aiSummary: {
    text: "Strong defensive performance...",  // ← Written by background job
    generatedAt: "2026-02-20T14:35:12Z",
    source: "background",  // Options: background, manual
    gameDataHash: "a3f2b9...",  // ← Hash of scores+lineup+notes (detects changes)
    gameContext: {  // Snapshot of game state when generated
      round: 5,
      opponent: "Diamond Creek",
      finalScore: { us: 35, opponent: 28 },
      quarters: 4
    }
  }
}
```

### Queue Status API Response

```javascript
// New API action: getAIQueueStatus
{
  queued: [
    { gameID: "game_123", teamID: "team_456", queuedAt: "...", type: "game_summary" }
  ],
  processing: 2,  // Jobs currently running
  completed: 15,  // Total completed today
  failed: 0       // Failed jobs needing attention
}
```

---

## 5. Backend Implementation

### 5.1 Queue Management Functions

```javascript
/**
 * Add AI generation job to queue
 * Called by: frontendAfter game finalization
 */
function queueGameAI(params) {
  const { gameID, sheetName, teamID, forceRefresh } = params;
  
  // Validate inputs
  if (!gameID || !sheetName || !teamID) {
    return { success: false, error: 'Missing required parameters' };
  }
  
  // Skip archived teams (don't waste AI quota)
  const teamRow = getTeamRowByID(teamID);
  if (teamRow && teamRow.archived) {
    Logger.log(`Skipping AI queue for archived team: ${teamID}`);
    return { success: true, queued: false, message: 'Team is archived' };
  }
  
  // Check if AI refresh needed (unless forceRefresh)
  if (!forceRefresh) {
    const teamData = loadTeamData(sheetName);
    const game = teamData?.games.find(g => g.gameID === gameID);
    
    if (game?.aiSummary?.gameDataHash) {
      const currentHash = calculateGameDataHash(game);
      if (currentHash === game.aiSummary.gameDataHash) {
        Logger.log(`AI up-to-date for ${gameID}, no refresh needed`);
        return { success: true, queued: false, message: 'AI up-to-date' };
      }
    }
  }
  
  // Check if already queued
  const queue = PropertiesService.getScriptProperties();
  const queueKey = `ai_queue_${gameID}_${sheetName}`;
  
  if (queue.getProperty(queueKey)) {
    return { success: true, queued: false, message: 'Already in queue' };
  }
  
  // Create job
  const job = {
    gameID: gameID,
    sheetName: sheetName,
    teamID: teamID,
    queuedAt: new Date().toISOString(),
    type: 'game_summary',
    attempts: 0,
    lastError: null,
    priority: 1
  };
  
  // Add to queue
  queue.setProperty(queueKey, JSON.stringify(job));
  
  // Log metric
  logClientMetric('ai_queued', 1, [teamID], { gameID: gameID, type: 'game_summary' });
  
  return { success: true, queued: true, queueKey: queueKey };
}

/**
 * Process AI queue (time-based trigger)
 * Runs: Every 5 minutes via Apps Script trigger
 */
function processAIQueue() {
  const startTime = new Date().getTime();
  const queue = PropertiesService.getScriptProperties();
  const allProperties = queue.getProperties();
  
  let processed = 0;
  let failed = 0;
  
  // Filter queue jobs only
  const queueJobs = Object.entries(allProperties)
    .filter(([key, _]) => key.startsWith('ai_queue_'))
    .map(([key, value]) => ({ key, job: JSON.parse(value) }))
    .sort((a, b) => a.job.priority - b.job.priority);  // Priority queue
  
  Logger.log(`Processing ${queueJobs.length} AI queue jobs`);
  
  for (const { key, job } of queueJobs) {
    // Time budget check (Apps Script 6-minute execution limit)
    const elapsed = (new Date().getTime() - startTime) / 1000;
    if (elapsed > 300) {  // 5 minutes buffer
      Logger.log(`Time limit approaching, stopping after ${processed} jobs`);
      break;
    }
    
    try {
      // Process job based on type
      if (job.type === 'game_summary') {
        processGameSummaryJob(job);
      }
      // Future: else if (job.type === 'player_insight') { ... }
      
      // Remove from queue on success
      queue.deleteProperty(key);
      processed++;
      
      // Log success
      logClientMetric('ai_background_success', 1, [job.teamID], {
        gameID: job.gameID,
        type: job.type,
        attempts: job.attempts + 1,
        queueTime: calculateQueueTime(job.queuedAt)
      });
      
    } catch (error) {
      Logger.log(`AI queue error for ${key}: ${error}`);
      failed++;
      
      // Retry logic
      job.attempts = (job.attempts || 0) + 1;
      job.lastError = error.toString().substring(0, 200);
      
      if (job.attempts >= 3) {
        // Max retries exceeded, remove from queue
        queue.deleteProperty(key);
        logClientMetric('ai_background_failed', 1, [job.teamID], {
          gameID: job.gameID,
          error: job.lastError,
          attempts: job.attempts
        });
      } else {
        // Update job with error info
        queue.setProperty(key, JSON.stringify(job));
        logClientMetric('ai_background_retry', 1, [job.teamID], {
          gameID: job.gameID,
          attempt: job.attempts,
          error: job.lastError
        });
      }
    }
  }
  
  Logger.log(`Queue processing complete: ${processed} success, ${failed} failed`);
  return { processed, failed };
}

/**
 * Process game summary AI job
 */
function processGameSummaryJob(job) {
  const { gameID, sheetName, teamID } = job;
  
  // Skip archived teams (double-check in case team archived after queueing)
  const teamRow = getTeamRowByID(teamID);
  if (teamRow && teamRow.archived) {
    Logger.log(`Skipping AI for archived team: ${teamID}`);
    return;  // Not an error, just skip silently
  }
  
  // Load team data
  const teamData = loadTeamData(sheetName);
  if (!teamData) {
    throw new Error(`Team data not found: ${sheetName}`);
  }
  
  // Find game
  const game = teamData.games.find(g => g.gameID === gameID);
  if (!game) {
    throw new Error(`Game not found: ${gameID}`);
  }
  
  // Validate game is finalized
  if (game.status !== 'normal' || !game.scores) {
    throw new Error(`Game not finalized: ${gameID}`);
  }
  
  // Check if AI already up-to-date (avoid duplicate work)
  if (game.aiSummary && game.aiSummary.text && game.aiSummary.gameDataHash) {
    const currentHash = calculateGameDataHash(game);
    if (currentHash === game.aiSummary.gameDataHash) {
      Logger.log(`AI summary up-to-date for ${gameID}, skipping`);
      return;  // Not an error, just skip
    }
    Logger.log(`Game data changed for ${gameID}, regenerating AI`);
  }
  
  // Build game context for AI
  const gameData = buildGameAIContext(game, teamData);
  
  // Call existing AI function
  const aiResult = callGeminiForGameInsights(gameData);
  
  // Calculate hash of game data (for change detection)
  const gameDataHash = calculateGameDataHash(game);
  
  // Write AI summary to game object
  game.aiSummary = {
    text: aiResult.text,
    generatedAt: new Date().toISOString(),
    source: 'background',
    gameDataHash: gameDataHash,  // Track what data AI was based on
    gameContext: {
      round: game.round,
      opponent: game.opponent,
      finalScore: game.scores,
      quarters: Object.keys(game.lineup || {}).length
    }
  };
  
  // Save team data back to sheet
  saveTeamDataToSheet(sheetName, teamData);
  
  Logger.log(`Game AI summary generated: ${gameID}`);
}

/**
 * Build game context for AI (reuse existing logic)
 */
function buildGameAIContext(game, teamData) {
  // Extract relevant data for AI
  return {
    round: game.round,
    opponent: game.opponent,
    date: game.date,
    scores: game.scores,
    lineup: game.lineup,
    quarterBreakdown: buildQuarterBreakdown(game),
    playerContributions: calculatePlayerContributions(game, teamData.players),
    teamContext: {
      wins: teamData.games.filter(g => g.status === 'normal' && g.scores && g.scores.us > g.scores.opponent).length,
      losses: teamData.games.filter(g => g.status === 'normal' && g.scores && g.scores.us < g.scores.opponent).length
    }
  };
}

/**
 * Calculate hash of game data for change detection
 * Only includes fields that affect AI generation
 */
function calculateGameDataHash(game) {
  // Only hash fields that affect AI analysis
  const relevantData = {
    scores: game.scores,
    lineup: game.lineup,
    notes: {
      Q1: game.lineup?.Q1?.notes || '',
      Q2: game.lineup?.Q2?.notes || '',
      Q3: game.lineup?.Q3?.notes || '',
      Q4: game.lineup?.Q4?.notes || ''
    },
    captain: game.captain
  };
  
  // Simple string hash (MD5 or similar in production)
  const dataString = JSON.stringify(relevantData);
  return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, dataString)
    .map(byte => (byte + 256).toString(16).slice(-2))
    .join('')
    .substring(0, 16);  // 16-char hex hash
}

/**
 * Get AI queue status (admin/diagnostics)
 */
function getAIQueueStatus() {
  const queue = PropertiesService.getScriptProperties();
  const allProperties = queue.getProperties();
  
  const queuedJobs = Object.entries(allProperties)
    .filter(([key, _]) => key.startsWith('ai_queue_'))
    .map(([key, value]) => {
      const job = JSON.parse(value);
      return {
        gameID: job.gameID,
        teamID: job.teamID,
        queuedAt: job.queuedAt,
        type: job.type,
        attempts: job.attempts,
        lastError: job.lastError
      };
    });
  
  // Get today's metrics from diagnostics log
  const today = new Date().toISOString().split('T')[0];
  const diagnostics = loadDiagnostics(50);
  const todayMetrics = diagnostics.filter(d => d.timestamp.startsWith(today));
  
  const completed = todayMetrics.filter(d => d.name === 'ai_background_success').length;
  const failed = todayMetrics.filter(d => d.name === 'ai_background_failed').length;
  
  return {
    queued: queuedJobs,
    processing: 0,  // Can't easily track this in Apps Script
    completed: completed,
    failed: failed,
    lastProcessed: todayMetrics[0]?.timestamp || null
  };
}

/**
 * Clear AI queue (admin function)
 */
function clearAIQueue() {
  const queue = PropertiesService.getScriptProperties();
  const allProperties = queue.getProperties();
  
  let cleared = 0;
  for (const key of Object.keys(allProperties)) {
    if (key.startsWith('ai_queue_')) {
      queue.deleteProperty(key);
      cleared++;
    }
  }
  
  Logger.log(`Cleared ${cleared} jobs from AI queue`);
  return { success: true, cleared: cleared };
}
```

### 5.2 API Action Handlers

```javascript
// In handleApiRequest() switch statement

case 'queueGameAI':
  return ContentService.createTextOutput(JSON.stringify(
    queueGameAI({
      gameID: e.parameter.gameID,
      sheetName: e.parameter.sheetName,
      teamID: e.parameter.teamID
    })
  )).setMimeType(ContentService.MimeType.JSON);

case 'getAIQueueStatus':
  return ContentService.createTextOutput(JSON.stringify(
    getAIQueueStatus()
  )).setMimeType(ContentService.MimeType.JSON);

case 'clearAIQueue':
  // Admin only - could add auth check here
  return ContentService.createTextOutput(JSON.stringify(
    clearAIQueue()
  )).setMimeType(ContentService.MimeType.JSON);
```

### 5.3 Time-Based Trigger Setup

**Manual setup (one-time):**
1. Open Apps Script editor
2. Left sidebar → Triggers (clock icon)
3. Click "+ Add Trigger"
4. Settings:
   - Function: `processAIQueue`
   - Event source: `Time-driven`
   - Type: `Minutes timer`
   - Interval: `Every 5 minutes`
5. Save

**Programmatic setup (optional):**
```javascript
function setupAIQueueTrigger() {
  // Delete existing triggers for processAIQueue
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processAIQueue') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Create new trigger
  ScriptApp.newTrigger('processAIQueue')
    .timeBased()
    .everyMinutes(5)
    .create();
  
  Logger.log('AI queue trigger created');
}
```

### 5.4 Age-Appropriate Prompt Engineering

**Problem:** Generic AI insights don't account for developmental stage. U11 players need different feedback than adult seniors.

**Solution:** Extract age group from team name/data, adjust prompt tone and content accordingly.

#### Extract Age Group

```javascript
/**
 * Determine age group from team data
 * Returns: 'u11', 'u13', 'u15', 'u17' (includes U19), 'adult', or 'unknown'
 */
function determineAgeGroup(teamName, season) {
  // Extract from team name (e.g., "U11 Flames", "HG U13", "Hazel Glen 6")
  const ageMatch = teamName.match(/\b[Uu](\d{2})\b/);
  if (ageMatch) {
    const age = parseInt(ageMatch[1]);
    // U17 and U19 are combined at this level
    if (age === 19) return 'u17';
    return `u${age}`;
  }
  
  // NFNL teams (no age in name) = adult seniors
  // Check if season/competition context indicates adult
  if (season === 'NFNL' || season.includes('NFNL')) {
    return 'adult';
  }
  
  // Default to adult if unclear (safer than assuming youth)
  return 'adult';
}

/**
 * Get age-appropriate prompt context
 */
function getAgePromptContext(ageGroup) {
  const contexts = {
    u11: {
      label: 'Under 11',
      tone: 'extremely positive and encouraging',
      focus: 'fun, basic skills, teamwork, building confidence',
      vocabulary: 'simple, enthusiastic',
      avoid: 'pressure, technical jargon, critique',
      examples: 'Great teamwork!', 'Everyone tried their best!', 'Lots of energy!'
    },
    u13: {
      label: 'Under 13',
      tone: 'positive and supportive with gentle constructive feedback',
      focus: 'skill development, position understanding, team roles',
      vocabulary: 'clear, encouraging but slightly more technical',
      avoid: 'harsh criticism, adult-level strategy',
      examples: 'Good positioning in Q3', 'Passing improved throughout the game'
    },
    u15: {
      label: 'Under 15',
      tone: 'balanced positivity with constructive development focus',
      focus: 'tactical awareness, position mastery, game management',
      vocabulary: 'moderate technical language, goal-oriented',
      avoid: 'overly complex strategy, pressure',
      examples: 'Strong defensive transitions', 'Court vision improving'
    },
    u17: {
      label: 'Under 17/19',
      tone: 'professional and direct',
      focus: 'competitive excellence, advanced skills, leadership, pathway development',
      vocabulary: 'full technical netball terminology',
      avoid: 'condescension or over-simplification',
      examples: 'Tactical adjustments effective', 'Strategic discipline under pressure', 'Leadership emerging'
    },
    adult: {
      label: 'Adult',
      tone: 'professional and analytical',
      focus: 'competitive strategy, tactical execution, team cohesion',
      vocabulary: 'full technical vocabulary, tactical analysis',
      avoid: 'nothing (adult level)',
      examples: 'Defensive system breakdown in Q4', 'Rotation strategy needed'
    }
  };
  
  return contexts[ageGroup] || contexts.adult;
}
```

#### Age-Specific AI Prompts

**Model Used:** `gemini-2.0-flash` (via Google Generative Language API)

```javascript
/**
 * Generate age-appropriate AI game summary
 * Uses Gemini 2.0 Flash model for fast, context-aware generation
 */
function callGeminiForGameInsights(gameData, teamName, season) {
  const ageGroup = determineAgeGroup(teamName, season);
  const ageContext = getAgePromptContext(ageGroup);
  
  const basePrompt = buildGameAnalysisPrompt(gameData);
  
  // Add age-appropriate context
  const agePrompt = `
IMPORTANT AGE CONTEXT:
This is a ${ageContext.label} team. Adjust your analysis style:

TONE: ${ageContext.tone}
FOCUS AREAS: ${ageContext.focus}
VOCABULARY: ${ageContext.vocabulary}
AVOID: ${ageContext.avoid}

EXAMPLES OF APPROPRIATE LANGUAGE:
${ageContext.examples}

${ageGroup === 'u11' || ageGroup === 'u13' ? `
CRITICAL FOR YOUNG PLAYERS:
- Emphasize effort and improvement over outcome
- Celebrate individual contributions positively
- Frame challenges as "next steps" not "problems"
- Keep feedback concrete and actionable
- Maintain excitement about netball
` : ''}

${ageGroup === 'u17' ? `
U17/19 LEVEL FOCUS:
- Pathway development and representative pathway consideration
- Advanced tactical analysis and competitive positioning
- Leadership development and team strategy execution
- Technical refinement at high-performance level
` : ''}

${ageGroup === 'adult' ? `
ADULT LEVEL ANALYSIS:
- Direct tactical assessment appropriate
- Competitive strategy focus
- Technical execution critique acceptable
- Performance expectations clear
` : ''}

---

${basePrompt}
`;
  
  // Call Gemini with age-appropriate prompt
  return callGeminiAPI(agePrompt);
}
```

#### Example Outputs by Age Group

**U11 Game (Win 25-18):**
```
Great game team! 🌟

Everyone showed fantastic energy and teamwork today. The whole team worked 
together to support each other on court.

Highlights:
• Amazing passing in Q2 - so many successful catches!
• Everyone tried really hard in defense
• Great communication between teammates
• Lots of smiles and positive energy!

Keep it up:
• Keep practicing catching and throwing - you're all getting better!
• Remember to spread out on court so everyone has space
• High fives for trying your best in every quarter!

What a fun game! Keep enjoying netball! 🏐
```

**U13 Game (Win 35-28):**
```
Strong performance today with good improvement as the game progressed.

Positives:
• Defense improved significantly in Q3-Q4 (held opponent to 6 goals in Q4)
• GS-GA combination working well (Sarah and Emma 24 goals)
• Good court positioning in attacking third
• Team communication much better than last week

Development areas:
• Midcourt turnovers in Q2 cost momentum - focus on safe passing options
• Shooters getting crowded in circle - practice circle movement drills
• Keep working on footwork fundamentals (stepping called 3 times)

Next game: Focus on maintaining Q4 defensive pressure from the start.
```

**Adult Game (Win 42-38):**
```
Competitive win against a strong opponent, but execution inconsistencies 
need addressing.

Tactical Analysis:
• Defensive system effective in Q1 and Q3 (18 combined goals against)
• Q2 defensive breakdown - opposition center exploited weak-side coverage
• GS-GA combination clinical (42 goals, 85% conversion)
• Midcourt struggled under pressure - 12 turnovers, mostly forced

Concerns:
• Q4 fatigue visible - scoring rate dropped 30% (8 goals vs 12 in Q3)
• No midcourt rotation despite obvious fatigue
• Defensive intensity inconsistent across quarters

Recommendations:
• Implement Q4 rotation strategy for key players
• Strengthen weak-side defensive coverage
• Midcourt work on pressure ball-handling
• Consider formation changes when opposition identifies patterns
```

#### Implementation in processGameSummaryJob

```javascript
function processGameSummaryJob(job) {
  const { gameID, sheetName, teamID } = job;
  
  // Skip archived teams
  const teamRow = getTeamRowByID(teamID);
  if (teamRow && teamRow.archived) {
    Logger.log(`Skipping AI for archived team: ${teamID}`);
    return;
  }
  
  // Load team data
  const teamData = loadTeamData(sheetName);
  const game = teamData.games.find(g => g.gameID === gameID);
  
  // Determine age group for appropriate prompting
  const ageGroup = determineAgeGroup(teamRow.teamName, teamRow.season);
  const ageContext = getAgePromptContext(ageGroup);
  
  Logger.log(`Generating AI for ${ageContext.label} team: ${teamRow.teamName}`);
  
  // Build game context with age info
  const gameData = buildGameAIContext(game, teamData);
  
  // Call AI with age-appropriate prompt
  const aiResult = callGeminiForGameInsights(gameData, teamRow.teamName, teamRow.season);
  
  // Store age context in AI summary for reference
  game.aiSummary = {
    text: aiResult.text,
    generatedAt: new Date().toISOString(),
    source: 'background',
    gameDataHash: calculateGameDataHash(game),
    ageGroup: ageGroup,  // ← Track what age level was used
    gameContext: {
      round: game.round,
      opponent: game.opponent,
      finalScore: game.scores,
      quarters: Object.keys(game.lineup || {}).length
    }
  };
  
  saveTeamDataToSheet(sheetName, teamData);
}
```

#### Frontend Display Enhancements

```javascript
// Show age-appropriate badge (optional)
function renderAISummarySection() {
  const game = state.currentGame;
  const ageLabels = {
    u11: 'U11', u13: 'U13', u15: 'U15', u17: 'U17/19', adult: 'Adult'
  };
  const ageLabel = ageLabels[game.aiSummary.ageGroup] || '';
  
  return `
    <div class="ai-summary-section">
      <div class="ai-summary-header">
        <span>✨ AI Game Summary ${ageLabel ? `<span class="age-badge">${ageLabel}</span>` : ''}</span>
        <span class="ai-source">${game.aiSummary.source === 'background' ? 'Auto-generated' : 'Manual'}</span>
      </div>
      <div class="ai-summary-content">
        ${formatAIContent(game.aiSummary.text)}
      </div>
      <button onclick="window.regenerateAISummary()" class="btn-secondary btn-sm">
        Regenerate
      </button>
    </div>
  `;
}
```

#### Benefits

**For Coaches:**
- ✅ U11-U13: Positive, encouraging feedback that maintains player enthusiasm
- ✅ U15-U17: Balanced development focus with competitive edge
- ✅ Adult: Direct tactical analysis without sugarcoating
- ✅ Consistent: AI adapts automatically to team age level

**For Players (when coaches share insights):**
- ✅ Age-appropriate language and concepts
- ✅ Developmentally suitable feedback
- ✅ Maintains confidence at younger ages
- ✅ Challenges appropriately at older ages

#### Model Selection Note

**Current Model:** `gemini-2.0-flash`
- ✅ **Best choice for Background AI** - Fast (2-3s), high rate limits (15 req/min), structured analysis
- ✅ Optimized for pattern recognition and factual game analysis
- ✅ Free tier generous for per-game background processing

**Alternative Considered:** `gemini-1.5-pro`
- Better for complex multi-game reasoning
- Slower (5-8s) and lower rate limits (2 req/min)
- ❌ **Not suitable for background queue** - Speed matters for batch processing

**Future Optimization:**
When **Modular AI Architecture** is implemented, consider hybrid approach:
- Use 2.0 Flash for fast modules (Event Analyzer, Pattern Detector, Training Correlator, Tactical Advisor)
- Use 1.5 Pro for strategic module (Season Strategist) — deep reasoning, runs infrequently (2-week cache)
- Best of both: Speed for most tasks + depth for strategy

See: `planning/MODULAR_AI_ARCHITECTURE.md` Section "Model Selection Optimization"

---

## 5.4 Netball Knowledge Integration

**Goal:** Leverage the comprehensive netball knowledge base (docs/netball-knowledge-base.md) to enhance AI accuracy and prevent invalid recommendations.

### 5.4.1 Knowledge Base Integration Architecture

The netball knowledge base is integrated at multiple levels:

**Level 1: Constraint Validation**
```javascript
/**
 * Validate AI recommendations against netball rules
 * Prevents AI from suggesting invalid tactics or position assignments
 */
function validateNetballInsights(aiRecommendation) {
  const constraints = {
    positions: {
      GS: { scoringPosition: true, restrictions: ['attacking_third_only', 'goal_circle_only'] },
      GA: { scoringPosition: true, restrictions: ['attacking_third_only', 'goal_circle_only'] },
      WA: { scoringPosition: false, restrictions: ['cannot_enter_defending_third'] },
      C: { scoringPosition: false, restrictions: ['can_enter_all_thirds'] },
      WD: { scoringPosition: false, restrictions: ['cannot_enter_attacking_third'] },
      GD: { scoringPosition: false, restrictions: ['defending_third_only', 'goal_circle_only'] },
      GK: { scoringPosition: false, restrictions: ['defending_third_only', 'goal_circle_only'] }
    },
    
    rules: {
      footwork: 'Cannot take steps while holding ball - only pivot',
      possession: 'Must pass within 3 seconds',
      contact: 'Cannot defend closer than 0.9m with contact',
      zones: 'Each position restricted to specific court thirds'
    },
    
    chemistry: {
      shootingPair: { quartersToClick: 8, name: 'GS-GA' },
      defensivePair: { quartersToClick: 10, name: 'GK-GD' },
      centreLink: { quartersToClick: 6, name: 'C-with-WA-or-defender' }
    }
  };
  
  // Validate recommendation against constraints
  const violations = [];
  
  if (aiRecommendation.suggestedLineup) {
    // Check zone restrictions
    aiRecommendation.suggestedLineup.forEach(placement => {
      const posConstraints = constraints.positions[placement.position];
      // Validate placement...
    });
  }
  
  return {
    valid: violations.length === 0,
    violations: violations,
    sanitized: violations.length > 0 ? sanitizeRecommendation(aiRecommendation) : aiRecommendation
  };
}
```

**Level 2: Context-Aware Benchmarking**
```javascript
/**
 * Get performance benchmarks based on team age group
 * Used to contextualize AI recommendations
 */
function getNetballBenchmarks(ageGroup) {
  const benchmarks = {
    u11: {
      shooterGoalsPerQuarter: { excellent: 3, good: 2.5, average: 2, concerning: 1.5 },
      teamGoalsPerGame: { excellent: 18, good: 15, average: 12, concerning: 10 },
      goalsAgainstPerQuarter: { excellent: 2, good: 2.5, average: 3.5, concerning: 5 },
      variation: 'HIGH - normal to have 20+ goal swings game-to-game',
      expectations: 'Focus on fun and fundamentals, not consistency'
    },
    u13: {
      shooterGoalsPerQuarter: { excellent: 5, good: 4, average: 3, concerning: 2 },
      teamGoalsPerGame: { excellent: 28, good: 24, average: 20, concerning: 16 },
      goalsAgainstPerQuarter: { excellent: 3, good: 3.5, average: 4.5, concerning: 6 },
      variation: 'MODERATE - some swings normal, but 15+ goal swings = issue',
      expectations: 'Improving consistency, developing tactical awareness'
    },
    u15: {
      shooterGoalsPerQuarter: { excellent: 8, good: 6.5, average: 5, concerning: 3 },
      teamGoalsPerGame: { excellent: 40, good: 35, average: 30, concerning: 25 },
      goalsAgainstPerQuarter: { excellent: 3.5, good: 4, average: 4.5, concerning: 5.5 },
      variation: 'LOWER - 10+ goal swings = investigatable',
      expectations: 'Consistency expected, tactical play visible'
    },
    u17: {
      shooterGoalsPerQuarter: { excellent: 12, good: 10, average: 8, concerning: 5 },
      teamGoalsPerGame: { excellent: 50, good: 45, average: 40, concerning: 33 },
      goalsAgainstPerQuarter: { excellent: 3.5, good: 4, average: 4.5, concerning: 5.5 },
      variation: 'LOW - 5+ goal swings = significant (coaching issue)',
      expectations: 'Consistent elite-level play expected'
    },
    adult: {
      shooterGoalsPerQuarter: { excellent: 12, good: 10, average: 8, concerning: 5 },
      teamGoalsPerGame: { excellent: 50, good: 45, average: 40, concerning: 33 },
      goalsAgainstPerQuarter: { excellent: 3, good: 3.5, average: 4, concerning: 5 },
      variation: 'VERY LOW - any sudden change = investigation required',
      expectations: 'Professional-level consistency'
    }
  };
  
  return benchmarks[ageGroup] || benchmarks.adult;
}
```

**Level 3: Position-Specific Analysis**
```javascript
/**
 * Provide position-specific insights based on netball knowledge
 * GS analysis different from C analysis different from WA analysis
 */
function analyzePositionPerformance(playerStats, position, ageGroup) {
  const positionContexts = {
    GS: {
      primaryMetric: 'goals_scored',
      secondaryMetrics: ['quarters_played', 'consistency'],
      what_to_look_for: 'High goals = skilled finisher OR excellent feeding. Low goals despite playing time = bad feeding OR excellent opposition defense',
      chemistry: 'GS-GA pair need 8-12 quarters together. Frequent rotation prevents chemistry',
      contextFactors: ['GA_partner', 'WA_feeder', 'opposition_strength']
    },
    C: {
      primaryMetrics: ['team_goals_for_when_on_court', 'team_goals_against_when_on_court'],
      analysisType: 'DUAL IMPACT - check both attacking AND defensive',
      what_to_look_for: 'Best Centres improve BOTH ends. Centre change = biggest performance swing',
      chemistry: 'Takes 6-8 quarters with new defensive partner (GD/GK) or attacking partner',
      contextFactors: ['GD_GK_pair', 'WA_partner', 'game_pace']
    },
    WA: {
      primaryMetric: 'team_goals_when_on_court',
      secondaryMetric: 'feeding_quality_inferred',
      what_to_look_for: 'Cannot score, but impact visible in shooter output. Team scoring drops when WA changes = feeding critical',
      chemistry: 'WA-Shooter chemistry develops over 8-12 quarters. Wholesale offense change disrupts flow',
      contextFactors: ['GS_confidence', 'GA_partner', 'defensive_pressure_on_WA']
    },
    GK: {
      primaryMetric: 'goals_against_per_quarter',
      secondaryMetric: 'defensive_pair_consistency',
      what_to_look_for: 'Goals against when on court directly measures impact. GK-GD pair stability = reliability',
      chemistry: 'Requires 10-15 quarters with GD partner to build communication',
      contextFactors: ['GD_partner', 'opposition_GA', 'defensive_system']
    }
    // Similar structures for GA, WD, GD...
  };
  
  return positionContexts[position];
}
```

**Level 4: Age-Group Context Management**
```javascript
/**
 * Inject age group awareness into all AI recommendations
 * Different advice for U11 vs U17 vs Adult
 */
function buildAgeContextualPrompt(game, teamInfo, ageGroup) {
  const ageContext = {
    u11: {
      variationNormal: true,
      benchmarks: getNetballBenchmarks('u11'),
      coachingFocus: 'fun, fundamentals, participation',
      lineupStability: 'Low expected, high rotation normal',
      recommendation_tone: 'Celebrate everything, no criticism'
    },
    u13: {
      variationNormal: true,
      benchmarks: getNetballBenchmarks('u13'),
      coachingFocus: 'skill development, position knowledge, basic tactics',
      lineupStability: 'Moderate rotation expected, 3+ game chemistry expected',
      recommendation_tone: 'Positive with constructive development focus'
    },
    u15: {
      variationNormal: false,
      benchmarks: getNetballBenchmarks('u15'),
      coachingFocus: 'tactical sophistication, competitive play, combination chemistry',
      lineupStability: 'Stable combinations critical, 1+ game rotation limits development',
      recommendation_tone: 'Balanced analysis with competitive edge'
    },
    u17: {
      variationNormal: false,
      benchmarks: getNetballBenchmarks('u17'),
      coachingFocus: 'championship execution, pathway development, game analysis',
      lineupStability: 'High stability expected, changes should be strategic',
      recommendation_tone: 'Professional tactical analysis'
    },
    adult: {
      variationNormal: false,
      benchmarks: getNetballBenchmarks('adult'),
      coachingFocus: 'winning, competitive strategy, team cohesion',
      lineupStability: 'Very high stability expected',
      recommendation_tone: 'Direct competitive analysis'
    }
  };
  
  return ageContext[ageGroup];
}
```

### 5.4.2 Netball-Specific Validation Layers

**Position Restriction Validation:**
- WA cannot play in defending third (validate before suggesting)
- GD/GK cannot play in attacking third (validate before suggesting)
- GS/GA can ONLY score (don't praise others for goals)
- Only GS/GA can enter goal circle (validate lineup)

**Rule-Based Constraints:**
- Footwork: Acknowledge cannot recommend specific movement patterns (can't see footwork)
- Possession time: Know 3-second rule exists (don't suggest holding ball)
- Contact: Know 0.9m defensive distance rule (don't suggest tight defense without acknowledging limitation)

**Chemistry & Development Time:**
- GS-GA: 8-12 quarters minimum before judging pair chemistry
- GK-GD: 10-15 quarters minimum
- C-with-partner: 6-8 quarters minimum
- **Recommendation:** Don't suggest breaking up pairs before these thresholds

**Age-Appropriate Expectations:**
- U11 high variation (20+ goal swings) = normal
- U13 moderate variation (15+ goal swings) = investigate
- U15+ low variation (10+ goal swings) = significant

---

## 5.5 Advanced Prompt Engineering

**Goal:** Maximize netball-specific insights by constraining AI to domain knowledge and preventing generic sports analysis.

### 5.5.1 Tactical Context Library

Expand the existing `getNetballKnowledgePreamble()` with tactical pattern recognition:

```javascript
/**
 * Adds tactical pattern recognition to help AI spot strategic insights in data
 */
function getNetballTacticalContext() {
  return `
### TACTICAL PATTERNS TO SPOT IN DATA

**ATTACKING PATTERNS:**
- **High GS dominance (70%+ of goals):** "Hold-and-feed" style - might be too predictable
- **Balanced GS-GA split (55-45%):** More varied attack, harder to defend
- **Goals spike in specific quarters:** Shows when attacking unit clicks best
- **Goals drop with certain WA/C changes:** Identifies feeding weaknesses
- **High combined GS-GA output (25+ goals):** Strong chemistry, keep pairing
- **Wildly variable scoring quarters:** Inconsistent feeding or shooter confidence issues

**DEFENSIVE PATTERNS:**
- **Goals against steady across quarters:** Consistent defensive system working
- **Goals against spike in Q2/Q3:** Focus or fitness issue (not tactics)
- **Lower goals against with specific GD-GK pair:** Defensive chemistry identified
- **Goals against drops when certain C plays:** Defensive-minded centre influencing flow
- **Goals against rises despite same defenders:** Opponent adjusted, team didn't counter
- **Goals against low in Q1, rises later:** Fatigue or opponent figured out system

**ROTATION PATTERNS:**
- **No Q4 changes = trust issues:** Coach doesn't trust bench in pressure situations
- **Heavy Q4 rotation = developmental approach:** Prioritizing fairness over winning
- **Same lineup entire game:** Either dominant or lacking depth
- **Different lineup every quarter:** Experimenting or struggling to find combinations
- **Substitutions in middle of quarters:** Injury, discipline, or tactical response

**OPPONENT ADAPTATION INDICATORS:**
- **Q1 strong, then fade:** Opposition adjusted, team didn't counter
- **Slow start, strong finish:** Team made effective halftime adjustments
- **Tight at half, blowout finish:** Fitness advantage (or disadvantage)
- **Goals spike against them in one quarter:** Found a weakness and exploited it
- **Against stronger opposition, lower scoring but tight margins:** Playing to their level

**PLAYER VERSATILITY SIGNALS:**
- **High goals + multiple positions:** Can score from GS or GA - versatile threat
- **Played all 3 defensive positions:** Defensive utility player, valuable for rotations
- **Played WA and C:** Attacking versatility, strong ball handler
- **Played WD and C:** Defensive work-rate, bidirectional player
- **Never left court (4 quarters same position):** Either star player or no depth
`;
}

/**
 * Updated game context builder includes tactical context
 */
function buildGameAIContext(game, teamData) {
  const baseContext = buildBasicGameContext(game);
  const tacticalContext = getNetballTacticalContext();
  
  return baseContext + '\n\n' + tacticalContext;
}
```

### 5.5.2 Constraint Guardrails

Add explicit DO/DON'T instructions to prevent generic advice:

```javascript
function getAnalysisConstraints() {
  return `
## ANALYSIS CONSTRAINTS

**DO:**
✓ Reference specific player names and stats from the data
✓ Link tactical observations to lineup changes visible in the data
✓ Use netball-specific terminology (GS-GA chemistry, defensive unit, feeding)
✓ Acknowledge limited data visibility (can't see turnovers, rebounds, intercepts)
✓ Frame recommendations as hypotheses to test ("This correlation suggests...")
✓ Connect quarter performance to who was on court
✓ Identify patterns across multiple quarters/games
✓ Reference coach notes when explaining statistical observations
✓ Note when data is insufficient to draw conclusions

**DON'T:**
✗ Make generic basketball or sports comments ("teamwork wins games")
✗ Recommend tracking stats you can't see (e.g., "reduce turnovers" when no turnover data)
✗ Praise positions for scoring when they can't score (WA, C, WD, GD, GK)
✗ Suggest player movements to ineligible positions (GS can't play WD, etc)
✗ Give fitness advice without evidence (no running stats, just scoring patterns)
✗ Repeat the data back - provide ANALYSIS and INSIGHT ONLY
✗ Use sports clichés ("give 110%", "leave it all on the court", "dig deep")
✗ Assume player skill levels - stick to what the data shows
✗ Make psychological assessments ("player lost confidence") unless coach notes indicate
✗ Recommend complex set plays (you can't see movement patterns)

**DATA VISIBILITY REMINDER:**
You CAN see: Positions played, goals scored, lineups per quarter, final scores, coach observations
You CAN'T see: Passes, turnovers, rebounds, intercepts, penalties, positioning quality, player movement patterns

**ANALYSIS BOUNDARIES:**
- If goals drop with lineup change, say "suggests" not "proves" (could be opponent change)
- If goals spike, identify who was on court, not "why" unless coach notes explain
- If defensive unit improves, note the correlation but acknowledge other factors exist
- Stay within your data visibility - flag when more context would help

**NETBALL-SPECIFIC REMINDERS:**
- GS and GA are the ONLY positions that can score
- WA cannot enter the defending third
- GD and GK cannot enter the attacking third
- C is the only position that can go everywhere
- Defensive pairs (GD-GK) and shooting pairs (GS-GA) need time together to build chemistry
- "Good feeding" manifests as goals (you can't see passes, so infer from shooter output)
`;
}
```

### 5.5.3 Dynamic Comparative Benchmarks

Provide game-specific context rather than generic benchmarks:

```javascript
/**
 * Build team performance context for AI
 */
function buildTeamContext(teamData, currentGame) {
  const games = teamData.games.filter(g => g.status === 'normal' && g.scores);
  const stats = calculateTeamStats(games);
  
  // Calculate current game vs season average
  const thisGameFor = currentGame.scores.us;
  const thisGameAgainst = currentGame.scores.opponent;
  const forDiff = thisGameFor - stats.avgFor;
  const againstDiff = thisGameAgainst - stats.avgAgainst;
  
  return `
## TEAM PERFORMANCE CONTEXT (Season So Far)

**Season Baseline:**
- Record: ${stats.wins}W-${stats.losses}L-${stats.draws}D (${stats.winPct}% win rate)
- Average: ${stats.avgFor.toFixed(1)} goals for, ${stats.avgAgainst.toFixed(1)} against
- Average differential: ${(stats.avgFor - stats.avgAgainst).toFixed(1)} per game
- Best quarter: ${stats.bestQuarter} (avg ${stats.bestQuarterAvg.toFixed(1)} differential)
- Weakest quarter: ${stats.weakestQuarter} (avg ${stats.weakestQuarterAvg.toFixed(1)} differential)

**This Game vs Season Average:**
- Goals FOR: ${thisGameFor} (${forDiff >= 0 ? '+' : ''}${forDiff.toFixed(1)} vs avg) - ${forDiff > 2 ? 'ABOVE average' : forDiff < -2 ? 'BELOW average' : 'typical'}
- Goals AGAINST: ${thisGameAgainst} (${againstDiff >= 0 ? '+' : ''}${againstDiff.toFixed(1)} vs avg) - ${againstDiff > 2 ? 'WORSE than average defense' : againstDiff < -2 ? 'BETTER than average defense' : 'typical'}

**Use This Context To:**
- Identify if this game was above/below team's typical performance
- Spot patterns (e.g., "Q3 weak again - now 5 games in a row")
- Recognize player outlier performances (e.g., "Sarah's 12 goals is 50% above her average")
- Note lineup combinations that deviate from norm
- Connect trends (e.g., "When Mia plays WA, team scores 3 goals more per game on average")

**Important:** Don't just compare to generic benchmarks - compare to THIS TEAM'S baseline.
`;
}
```

### 5.5.4 Chain-of-Thought Reasoning

Ask AI to follow a reasoning process (improves output quality):

```javascript
function getReasoningProcess() {
  return `
## ANALYSIS REASONING PROCESS

Use this internal process (don't show these steps in output, just use them):

**STEP 1: Identify the game story**
- Did team dominate? Battle back? Collapse? Play evenly?
- What was the turning point (if any)?
- Look at quarter-by-quarter flow

**STEP 2: Find the key statistical contributors**
- Who had scoring impact? (GS/GA with high goals)
- Who played the most influential positions? (C in both units, WA feeding, GK-GD defending)
- Who showed versatility? (Multiple positions)

**STEP 3: Spot lineup-performance correlations**
- Which combinations were on court during strong quarters?
- Which combinations were on court during weak quarters?
- Did changes between quarters correlate with performance shifts?

**STEP 4: Connect to coach observations**
- Do coach notes explain statistical patterns?
- Do coach notes highlight things not visible in stats?
- Are there contradictions between stats and coach perception?

**STEP 5: Form evidence-based recommendations**
- What worked that's repeatable? (do more of this)
- What struggled that's fixable? (adjust this)
- What's unclear and needs more testing? (experiment with this)
- What's working but risky? (strong now, but consider depth/fatigue)

**STEP 6: Write analysis**
- Lead with the story
- Support with specific player names and stats
- Reference lineup correlations
- End with actionable recommendations
- Keep age-appropriate tone throughout

This process ensures you ground insights in data while maintaining narrative flow.
`;
}
```

### 5.5.5 Few-Shot Examples

Show AI what excellent analysis looks like:

```javascript
function getFewShotExamples(ageGroup) {
  const examples = {
    adult: `
## EXAMPLES OF EXCELLENT ANALYSIS

**Example 1: Shooting Analysis**
❌ GENERIC: "Sarah had a great game scoring 12 goals. The team should keep her at GS."

✅ SPECIFIC: "Sarah (12 goals, 4 quarters at GS) recorded her highest output this season, particularly strong in Q1 (4 goals) and Q3 (5 goals). This coincided with Emma at GA creating space - their combined 18 goals (Sarah 67%, Emma 33%) shows good chemistry but developing over-reliance on Sarah. Consider developing Emma's shooting confidence to balance the load, especially given Sarah sat Q2 (injury concern per coach notes) and team scoring dropped to 3 goals that quarter with replacement."

**Example 2: Defensive Analysis**
❌ VAGUE: "The defense needs to improve."

✅ EVIDENCE-BASED: "Defensive unit of Chloe (GK), Zoe (GD), Lily (WD), plus Mia (C) conceded 22 goals across 4 quarters (avg 5.5/quarter). This is 1.3 goals per quarter above the team's season average of 4.2. The spike occurred specifically in Q2 (8 goals against) when Ava replaced Lily at WD - suggesting either Lily's pressure is critical to the system, or Ava needs more court time with this defensive unit to build communication. Q4 returned to baseline (4 goals against) with original lineup restored."

**Example 3: Centre Impact Analysis**
❌ INCOMPLETE: "Mia is a good centre."

✅ ANALYTICAL: "Mia played C for all 4 quarters, providing stability to both attacking and defensive units. When Mia was on court: attacking unit scored 28 goals (7/quarter), defensive unit conceded 18 goals (4.5/quarter). Compare this to the previous game where Grace played C: 22 goals for (5.5/quarter), 24 goals against (6/quarter). Mia's consistent presence appeared to lift both ends of the court - suggesting her court vision and ball distribution are team strengths. However, no rotation at C means no backup development if Mia is unavailable."

**Example 4: Quarter Momentum Analysis**
❌ SURFACE-LEVEL: "The team started strong but faded."

✅ DETAILED: "Team won Q1 decisively (8-4), maintained Q2 (6-4), but collapsed in Q3 (3-8) before recovering in Q4 (7-6). Q3 collapse coincided with three lineup changes: new GS-GA pair (Zoe-Ava replaced Sarah-Emma), new WA (Grace replaced Mia), and same defensive unit but now facing fatigued opponents who found rhythm. Coach notes indicate 'feeding issues in Q3' - this aligns with the wholesale attacking unit change. Recommendation: when rotating shooters, maintain at least one consistent feeder (WA or C) to preserve attacking structure."
`,
    u13: `
## EXAMPLES OF EXCELLENT ANALYSIS

**Example 1: Positive Reinforcement with Growth Path**
❌ GENERIC: "Sarah did well scoring 8 goals."

✅ DEVELOPMENTAL: "Sarah (8 goals, 4 quarters at GS) had a great game! This is progress from her 5-goal and 6-goal games earlier in the season. She was particularly confident in Q2 (3 goals) when Emma was at GA feeding her really well. To keep building Sarah's confidence, try keeping the Emma (GA) + Sarah (GS) pairing for important games, and help Sarah practice shooting when she's getting different feeders in training."

**Example 2: Constructive Feedback**
❌ CRITICAL: "The defense was terrible in Q3."

✅ SUPPORTIVE: "The defense played solidly for most of the game, with Chloe (GK) and Zoe (GD) working together really well in Q1, Q2, and Q4. Q3 was trickier - the other team scored 7 goals that quarter. Coach noted they were getting around the outside more in Q3. This is a great learning opportunity: when the other team changes their strategy, the defense needs to adjust too. Chloe and Zoe can practice this in training - maybe some drills on covering those outside movements."

**Example 3: Celebrating Versatility**
❌ BORING: "Lily played multiple positions."

✅ ENCOURAGING: "Lily was super versatile this game, playing both WA (2 quarters) and C (2 quarters)! This is really valuable because it shows she can adapt to different roles. When Lily was at WA in Q1, the team scored 6 goals - she helped get the ball to the shooters well. When she moved to C in Q3, she helped connect both the attack and defense. Being able to play different positions makes Lily a real team asset. Keep practicing both positions to become even more confident!"
`,
    u11: `
## EXAMPLES OF EXCELLENT ANALYSIS

**Example 1: Maximum Positivity**
❌ TOO TECHNICAL: "Sarah scored 6 goals at 75% efficiency in the shooting circle."

✅ FUN & POSITIVE: "Sarah scored 6 goals and had so much fun in the shooting circle! She was really focused and tried her best every time. Great energy! 🌟"

**Example 2: Team Focus**
❌ COMPARATIVE: "Sarah scored more than Emma, so she should play more."

✅ TEAM-ORIENTED: "Everyone worked together really well! Sarah and Emma both had turns scoring goals, and all the players helped get the ball down the court. Teamwork makes the dream work! 🏐"

**Example 3: Effort Over Outcome**
❌ RESULT-FOCUSED: "The team lost because they didn't score enough."

✅ EFFORT-FOCUSED: "Everyone showed amazing effort and played with great energy! There were so many good passes, lots of smiles, and everyone encouraged each other. The team is getting better every single game - keep having fun out there! 🎉"
`
  };
  
  return examples[ageGroup] || examples.adult;
}
```

### 5.5.6 Structured Output Format

Request both machine-readable JSON and human-readable narrative:

```javascript
function buildStructuredOutputRequest(ageGroup) {
  return `
## OUTPUT FORMAT REQUIREMENT

Provide your response in TWO parts:

### PART 1: STRUCTURED INSIGHTS (JSON)
\`\`\`json
{
  "gameStory": "comeback|dominant|battled|collapsed|even-contest",
  "momentum": [
    {"quarter": "Q1", "advantage": "us|them|even", "score": "8-5"},
    {"quarter": "Q2", "advantage": "us|them|even", "score": "6-7"},
    {"quarter": "Q3", "advantage": "us|them|even", "score": "9-4"},
    {"quarter": "Q4", "advantage": "us|them|even", "score": "7-6"}
  ],
  "keyPlayers": [
    {
      "name": "Sarah",
      "role": "GS",
      "impact": "high|medium|low",
      "stats": "12 goals, 4 quarters",
      "reason": "Season-high output, 67% of shooting total, consistent across quarters"
    },
    {
      "name": "Chloe",
      "role": "GK",
      "impact": "high|medium|low",
      "stats": "4 quarters defense",
      "reason": "Anchored defensive unit, held opponent to 4.5 goals/quarter"
    }
  ],
  "bestCombination": {
    "unit": "attacking|defensive",
    "players": "GS: Sarah, GA: Emma, WA: Mia, C: Lily",
    "quarters": ["Q1", "Q3"],
    "performance": "14 goals combined / 4 goals against average",
    "reason": "Highest scoring output with established chemistry"
  },
  "concerningPattern": {
    "issue": "Q3 scoring drop|defensive fade|inconsistent rotations",
    "evidence": "Scored only 3 goals in Q3 vs 7-8 in other quarters",
    "possibleCause": "Wholesale lineup change disrupted attacking flow",
    "severity": "high|medium|low"
  },
  "recommendations": [
    {
      "priority": 1,
      "category": "lineup|rotation|development|tactical",
      "action": "Maintain Sarah-Emma GS-GA pairing for competitive games",
      "rationale": "18 combined goals shows strong chemistry",
      "effort": "immediate"
    },
    {
      "priority": 2,
      "category": "lineup|rotation|development|tactical",
      "action": "Keep one constant feeder (WA or C) when rotating shooters",
      "rationale": "Q3 wholesale change caused scoring drop",
      "effort": "tactical-adjustment"
    }
  ],
  "nextGameFocus": [
    "Maintain successful attacking combinations",
    "Test defensive unit against varied opponents",
    "Develop bench depth without disrupting core chemistry"
  ]
}
\`\`\`

### PART 2: NARRATIVE SUMMARY
Write your human-readable analysis following the age-appropriate style guidelines above.

**Format:**
${ageGroup === 'u11' ? `
Keep it super positive and fun! Use simple words, celebrate everyone's effort, focus on teamwork. 2-3 short paragraphs maximum with lots of encouragement! 🌟
` : ageGroup === 'u13' ? `
**Match Summary** (2-3 sentences on game flow)
**Key Performers** (2-3 specific player highlights with stats)
**What Worked Well** (Positive observations with evidence)
**Development Focus** (Growth areas, framed constructively)
` : `
**Match Summary** (2-3 sentences on game flow and result)
**Key Performers** (3-4 specific player callouts with stats and impact)
**Quarter Analysis** (Which quarters strong/weak and why)
**Tactical Observations** (What worked, what struggled - lineup-specific)
**Recommendations** (2-3 actionable suggestions for next game)
`}

**Benefits of Dual Format:**
- Frontend can parse JSON for structured data, visualizations, trends tracking
- Coaches get human-readable narrative with context and stories
- Future AI modules can reference structured insights (for Modular AI Architecture)
- JSON enables programmatic recommendations (e.g., auto-suggest lineups based on "bestCombination")
`;
}
```

### 5.5.7 Complete Enhanced Prompt Assembly

```javascript
/**
 * Build complete AI prompt with all enhancements
 */
function buildEnhancedGamePrompt(game, teamData, teamInfo) {
  const ageGroup = determineAgeGroup(teamInfo.teamName, teamInfo.season);
  const ageContext = getAgePromptContext(ageGroup);
  const persona = getCoachingPersona(ageGroup);
  
  let prompt = '';
  
  // 1. Role and persona
  prompt += `You are an expert netball coach assistant analyzing ${teamInfo.teamName}.\n\n`;
  prompt += `## COACHING PERSONA\n`;
  prompt += `Write as: ${persona.voice}\n`;
  prompt += `Focus on: ${persona.focus}\n`;
  prompt += `Language style: ${persona.language}\n`;
  prompt += `Example tone: "${persona.examplePhrase}"\n\n`;
  
  // 2. Age-appropriate context
  prompt += `## AGE GROUP CONTEXT: ${ageContext.label}\n`;
  prompt += `Tone: ${ageContext.tone}\n`;
  prompt += `Focus areas: ${ageContext.focus}\n`;
  prompt += `Vocabulary: ${ageContext.vocabulary}\n`;
  prompt += `Avoid: ${ageContext.avoid}\n\n`;
  
  // 3. Netball knowledge base
  prompt += getNetballKnowledgePreamble() + '\n\n';
  
  // 4. Tactical patterns
  prompt += getNetballTacticalContext() + '\n\n';
  
  // 5. Analysis constraints
  prompt += getAnalysisConstraints() + '\n\n';
  
  // 6. Team performance context (if available)
  if (teamData.games.length > 1) {
    prompt += buildTeamContext(teamData, game) + '\n\n';
  }
  
  // 7. Chain-of-thought reasoning
  prompt += getReasoningProcess() + '\n\n';
  
  // 8. Few-shot examples
  prompt += getFewShotExamples(ageGroup) + '\n\n';
  
  // 9. Game data
  prompt += buildGameData(game) + '\n\n';
  
  // 10. Output format
  prompt += buildStructuredOutputRequest(ageGroup) + '\n\n';
  
  // 11. Final instruction
  prompt += `---\n`;
  prompt += `Now analyze the game data above and provide BOTH structured JSON and narrative summary.\n`;
  if (game.coachNotes && game.coachNotes.length > 0) {
    prompt += `IMPORTANT: Incorporate the coach's notes into your analysis - reference specific observations and connect them to patterns in the stats.\n`;
  }
  
  return prompt;
}
```

### 5.5.8 Testing & Quality Validation

```javascript
/**
 * Test prompt output quality
 */
function validateAIOutput(aiOutput, gameData) {
  const qualityChecks = {
    // Specificity checks
    usesPlayerNames: /\b[A-Z][a-z]+\b/.test(aiOutput),
    referencesStats: /\d+\s*(goal|quarter)/.test(aiOutput),
    
    // Netball-specific checks
    usesNetballTerms: /(GS|GA|WA|center|centre|circle|feed|shooter|defensive unit)/i.test(aiOutput),
    avoidsWrongPositionScoring: !/(WA|C|WD|GD|GK)\s+(scored|goal)/.test(aiOutput),
    
    // Constraint adherence
    avoidsGenericPhrases: !/(give 110%|leave it all|step up|dig deep)/i.test(aiOutput),
    avoidsInvisibleStats: !/(turnover|rebound|intercept|penalty)\s+rate/.test(aiOutput),
    
    // Structure checks
    hasStructuredData: /```json/.test(aiOutput),
    hasNarrative: aiOutput.length > 500,
    
    // Evidence-based
    linksToLineups: /(when|with)\s+[A-Z][a-z]+\s+(played|at|was)/i.test(aiOutput)
  };
  
  const score = Object.values(qualityChecks).filter(Boolean).length / Object.keys(qualityChecks).length;
  
  return {
    score: score,
    passed: score >= 0.7,
    checks: qualityChecks,
    feedback: score < 0.7 ? 'Output quality below threshold - review prompt engineering' : 'Quality acceptable'
  };
}

/**
 * Log prompt performance for A/B testing
 */
function logPromptVersion(gameID, promptVersion, qualityScore) {
  // Store in diagnostics or separate tracking
  const metric = {
    timestamp: new Date().toISOString(),
    gameID: gameID,
    promptVersion: promptVersion,
    qualityScore: qualityScore,
    context: 'background-ai-game-summary'
  };
  
  logClientMetric('ai_prompt_quality', qualityScore, [gameID], JSON.stringify(metric));
}

/**
 * A/B test different prompt versions
 */
const PROMPT_VERSION = 'v3.0-enhanced-tactical-context'; // Increment when changing prompts

// After AI generation:
const quality = validateAIOutput(aiResult.text, gameData);
logPromptVersion(gameID, PROMPT_VERSION, quality.score);

// Store version in output for tracking
game.aiSummary = {
  text: aiResult.text,
  structuredData: aiResult.json,
  promptVersion: PROMPT_VERSION,
  qualityScore: quality.score,
  generatedAt: new Date().toISOString()
};
```

### Implementation Priority

**Phase 1 (1-2 hours):** Essential enhancements
- ✅ Add tactical context library
- ✅ Add constraint guardrails
- ✅ Update prompt assembly to include both

**Phase 2 (1-2 hours):** Quality improvements
- ✅ Add few-shot examples
- ✅ Add chain-of-thought reasoning
- ✅ Implement quality validation

**Phase 3 (2-3 hours):** Advanced features
- ✅ Structured JSON + narrative output
- ✅ Dynamic team context benchmarks
- ✅ A/B testing framework

**Phase 4 (ongoing):** Refinement
- ✅ Collect coach feedback on AI quality
- ✅ Iterate prompt based on failure patterns
- ✅ Track quality scores over time
- ✅ Compare prompt versions

### Expected Impact

**Baseline (current):**
- Generic sports advice: ~30% of output
- Netball-specific insights: ~50% of output
- Actionable recommendations: ~20% of output

**With enhancements:**
- Generic sports advice: <5% of output (blocked by constraints)
- Netball-specific insights: ~70% of output (guided by tactical context + examples)
- Actionable recommendations: ~25% of output (chain-of-thought + structured format)

**Quality improvement estimate:** 40-50% better relevance and specificity

---

## 6. Frontend Implementation

### 6.1 Queue AI When Game Finalized

```javascript
// In app.js, when coach finalizes game

async function finalizeGame() {
  const gameID = state.currentGame.gameID;
  
  // Existing finalization logic
  state.currentGame.finalized = true;
  await saveGameChanges();
  
  // NEW: Queue background AI
  if (state.online) {
    try {
      const response = await fetch(`${API_ENDPOINT}?action=queueGameAI`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameID: gameID,
          sheetName: state.currentTeamData.sheetName,
          teamID: state.currentTeam.teamID
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('AI generation queued:', result);
        // Optional: Show toast notification
        showToast('AI summary will be generated in the background');
      }
    } catch (error) {
      console.warn('Failed to queue AI:', error);
      // Non-blocking: Don't prevent finalization if queue fails
    }
  }
  
  // Continue with UI update
  closeGameDetail();
  renderSchedule();
}
```

### 6.2 Display AI Status Badge

```javascript
// In renderSchedule(), show AI status for finalized games

function renderScheduleItem(game) {
  const hasAI = game.aiSummary && game.aiSummary.text;
  const isFinalized = game.finalized || (game.scores && game.status === 'normal');
  
  const aiBadge = isFinalized
    ? hasAI
      ? `<span class="ai-badge ai-ready" title="AI summary available">✨ AI</span>`
      : `<span class="ai-badge ai-pending" title="AI summary generating...">⏳ AI</span>`
    : '';
  
  return `
    <div class="game-item" onclick="window.selectGame('${escapeAttr(game.gameID)}')">
      <div class="game-info">
        <div class="game-round">Round ${game.round}</div>
        <div class="game-opponent">${escapeHtml(game.opponent)}</div>
        ${aiBadge}
      </div>
      <!-- Rest of game item -->
    </div>
  `;
}
```

### 6.3 Fallback Manual Generation

```javascript
// In game detail view, show manual button if background failed

function renderAISummarySection() {
  const game = state.currentGame;
  const hasAI = game.aiSummary && game.aiSummary.text;
  const isFinalized = game.finalized || (game.scores && game.status === 'normal');
  
  if (hasAI) {
    // Display existing AI summary
    return `
      <div class="ai-summary-section">
        <div class="ai-summary-header">
          <span>✨ AI Game Summary</span>
          <span class="ai-source">${game.aiSummary.source === 'background' ? 'Auto-generated' : 'Manual'}</span>
        </div>
        <div class="ai-summary-content">
          ${formatAIContent(game.aiSummary.text)}
        </div>
        <button onclick="window.regenerateAISummary()" class="btn-secondary btn-sm">
          Regenerate
        </button>
      </div>
    `;
  } else if (isFinalized) {
    // Show pending or manual option
    return `
      <div class="ai-summary-section">
        <div class="ai-pending-message">
          <span class="ai-pending-icon">⏳</span>
          <p>AI summary is being generated in the background...</p>
          <p class="ai-pending-note">Usually ready in 5-10 minutes</p>
        </div>
        <button onclick="window.generateAISummaryManual()" class="btn-secondary">
          Generate Now
        </button>
      </div>
    `;
  }
  
  return '';  // Game not finalized yet
}

// Manual generation (fallback)
async function generateAISummaryManual() {
  showLoadingIndicator('Generating AI summary...');
  
  try {
    // Call existing immediate AI endpoint
    const result = await fetchGameAIInsights(state.currentGame);
    
    state.currentGame.aiSummary = {
      text: result.text,
      generatedAt: new Date().toISOString(),
      source: 'manual',
      gameDataHash: calculateGameDataHash(state.currentGame),
      gameContext: {
        round: state.currentGame.round,
        opponent: state.currentGame.opponent,
        finalScore: state.currentGame.scores,
        quarters: Object.keys(state.currentGame.lineup || {}).length
      }
    };
    
    await saveGameChanges();
    renderGameDetail();
    
    showToast('AI summary generated');
  } catch (error) {
    console.error('Failed to generate AI:', error);
    showToast('Failed to generate AI summary', 'error');
  } finally {
    hideLoadingIndicator();
  }
}

// Regenerate AI (force refresh)
async function regenerateAISummary() {
  if (!confirm('Regenerate AI summary? This will replace the existing analysis.')) {
    return;
  }
  
  showLoadingIndicator('Regenerating AI summary...');
  
  try {
    // Queue with forceRefresh flag (bypasses change detection)
    const response = await fetch(`${API_ENDPOINT}?action=queueGameAI`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameID: state.currentGame.gameID,
        sheetName: state.currentTeamData.sheetName,
        teamID: state.currentTeam.teamID,
        forceRefresh: true  // ← Skip change detection
      })
    });
    
    const result = await response.json();
    if (result.success) {
      showToast('AI regeneration queued (ready in ~5 min)');
      // Optional: Show "generating..." badge
      delete state.currentGame.aiSummary;  // Clear old summary
      renderGameDetail();
    }
  } catch (error) {
    console.error('Failed to queue AI regeneration:', error);
    // Fallback: Generate immediately
    await generateAISummaryManual();
  } finally {
    hideLoadingIndicator();
  }
}

// Calculate game data hash (frontend version)
function calculateGameDataHash(game) {
  const relevantData = {
    scores: game.scores,
    lineup: game.lineup,
    notes: {
      Q1: game.lineup?.Q1?.notes || '',
      Q2: game.lineup?.Q2?.notes || '',
      Q3: game.lineup?.Q3?.notes || '',
      Q4: game.lineup?.Q4?.notes || ''
    },
    captain: game.captain
  };
  
  // Simple hash (crypto.subtle in production)
  const dataString = JSON.stringify(relevantData);
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    hash = ((hash << 5) - hash) + dataString.charCodeAt(i);
    hash = hash & hash;  // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 16);
}
```

### 6.4 AI Queue Status (Dev Panel)

```javascript
// In dev panel, add AI queue monitoring

async function showDevPanel() {
  let queueStatus = { queued: [], completed: 0, failed: 0 };
  
  try {
    const response = await fetch(`${API_ENDPOINT}?action=getAIQueueStatus`);
    queueStatus = await response.json();
  } catch (error) {
    console.warn('Failed to fetch queue status:', error);
  }
  
  document.getElementById('dev-panel').innerHTML = `
    <div class="dev-panel-section">
      <h4>AI Queue Status</h4>
      <div class="dev-stat">Queued: ${queueStatus.queued.length}</div>
      <div class="dev-stat">Completed today: ${queueStatus.completed}</div>
      <div class="dev-stat">Failed: ${queueStatus.failed}</div>
      ${queueStatus.queued.length > 0 ? `
        <details>
          <summary>Queue Details</summary>
          <pre>${JSON.stringify(queueStatus.queued, null, 2)}</pre>
        </details>
      ` : ''}
    </div>
  `;
}
```

---

## 7. Error Handling & Retry Logic

### Retry Strategy

**Max Attempts:** 3 per job

**Retry Schedule:**
1. **Attempt 1:** Initial queue processing (next 5-min trigger)
2. **Attempt 2:** If failed, retry on next trigger (+5 min)
3. **Attempt 3:** If failed again, retry on next trigger (+5 min)
4. **After 3 failures:** Remove from queue, log to diagnostics

**Total retry window:** Up to 15 minutes (3 attempts × 5-min interval)

### Error Categories

| Error Type | Retry? | Action |
|------------|--------|--------|
| Team archived | ❌ No | Skip silently (don't waste quota) |
| Team data not found | ❌ No | Remove from queue (data deleted) |
| Game not found | ❌ No | Remove from queue (game deleted) |
| Game not finalized | ❌ No | Remove from queue (shouldn't be queued) |
| Gemini API timeout | ✅ Yes | Retry up to 3 times |
| Gemini API rate limit | ✅ Yes | Retry with backoff |
| Apps Script quota | ✅ Yes | Retry next cycle |
| Network error | ✅ Yes | Retry up to 3 times |

### Error Logging

All errors logged to Diagnostics sheet via `logClientMetric`:

```javascript
// Success metrics
logClientMetric('ai_background_success', 1, [teamID], {
  gameID: gameID,
  queueTime: '4m 23s',
  attempts: 1
});

// Retry metrics
logClientMetric('ai_background_retry', 1, [teamID], {
  gameID: gameID,
  attempt: 2,
  error: 'Gemini API timeout after 30s'
});

// Final failure metrics
logClientMetric('ai_background_failed', 1, [teamID], {
  gameID: gameID,
  attempts: 3,
  error: 'Max retries exceeded: Network error'
});
```

### Graceful Degradation

If background AI fails (all retries exhausted):
1. Queue removes job silently
2. Frontend shows "⏳ AI pending" badge
3. Coach can click "Generate Now" for manual generation
4. Manual button calls existing immediate AI endpoint
5. User experience: Slight delay, but still accessible

**No breaking changes:** Manual AI generation always available as fallback.

---

## 8. User Experience Flows

### Flow 1: Typical Game (Success)

```
Coach: Finalize game (scores + lineup complete)
  ↓
Frontend: Call saveTeamData → Call queueGameAI → Navigate away
  ↓
Backend: Job added to queue (key: ai_queue_{gameID}_{sheet})
  ↓
[3 minutes pass - coach doing other things]
  ↓
Backend: Time trigger runs processAIQueue()
  ↓
Backend: Load team data → Find game → Call Gemini → Write AI summary → Remove job
  ↓
[1 minute later - coach returns to schedule]
  ↓
Frontend: Load team data (aiSummary now populated)
  ↓
Coach: Opens game detail → Sees "✨ AI Game Summary" (auto-generated)
```

**Total time:** 4-5 minutes (transparent to coach)

### Flow 2: Immediate View (AI Still Pending)

```
Coach: Finalize game → Close game detail → Immediately reopen game
  ↓
Frontend: AI summary not yet available (still in queue)
  ↓
UI: Shows "⏳ AI summary generating... Usually ready in 5-10 minutes"
  ↓
UI: Shows "Generate Now" button (fallback)
  ↓
Coach (optional): Click "Generate Now" → Immediate AI call → Summary appears
```

**Coach control:** Can wait (auto) or generate immediately (manual)

### Flow 3: Background Failure (Retry)

```
Backend: Process AI queue job → Gemini API timeout
  ↓
Backend: Increment attempts → Update job.lastError → Leave in queue
  ↓
[5 minutes later]
  ↓
Backend: Process same job again (attempt 2) → Success → Write summary → Remove job
  ↓
Coach: Next time opens game → Sees AI summary
```

**Coach impact:** None (transparent retry)

### Flow 4: Background Failure (Max Retries)

```
Backend: Process AI queue job → Fail 3 times → Remove from queue
  ↓
Backend: Log to diagnostics (ai_background_failed)
  ↓
Coach: Opens game detail → Sees "⏳ AI pending..."
  ↓
Coach: Waits 10+ minutes → Still pending
  ↓
Coach: Clicks "Generate Now" → Manual AI call → Summary appears
```

**Coach impact:** Minor (must click button, but always works)

### Flow 5: Coach Updates Notes After AI Generated

```
Coach: Opens finalized game (AI summary already exists)
  ↓
Coach: Adds/updates quarter notes with new observations
  ↓
Frontend: Save game data (updates lastModified timestamp)
  ↓
Frontend: Check if game data hash changed
  ↓
Frontend: Hash changed → Call queueGameAI (re-queue for background refresh)
  ↓
Backend: Calculate new hash → Differs from aiSummary.gameDataHash → Queue job
  ↓
[5-10 minutes later]
  ↓
Backend: Process queue → Regenerate AI with updated notes
  ↓
Coach: Returns to game → Sees refreshed AI summary (includes new notes)
```

**Coach impact:** None (automatic background refresh when data changes)

### Flow 6: Coach Updates Notes (No Material Change)

```
Coach: Opens finalized game (AI summary exists)
  ↓
Coach: Updates non-AI fields (e.g., captain, date)
  ↓
Frontend: Save game data
  ↓
Frontend: Check hash → Only scores/lineup/notes affect hash → Hash unchanged
  ↓
Frontend: Skip queueGameAI (no AI refresh needed)
  ↓
Coach: AI summary remains unchanged (correct behavior)
```

**Efficiency:** No wasted AI calls for non-material changes

### Flow 7: Manual Regenerate (Coach Wants Fresh Analysis)

```
Coach: Opens game with AI summary
  ↓
Coach: Clicks "Regenerate" button
  ↓
Frontend: Confirm dialog → "Regenerate AI summary?"
  ↓
Coach: Confirms
  ↓
Frontend: Call queueGameAI with forceRefresh=true (bypass change detection)
  ↓
Backend: Skip hash check → Queue job immediately
  ↓
Frontend: Clear old aiSummary → Show "generating..." state
  ↓
[5-10 minutes later]
  ↓
Backend: Regenerate AI → Write new summary
  ↓
Coach: Opens game → Sees fresh AI analysis
```

**Flexibility:** Coach can force refresh even if data unchanged

---

## 9. Testing Strategy

### 9.1 Unit Tests (Backend)

Test queue management in Apps Script:

```javascript
function testQueueGameAI() {
  // Test adding to queue
  const result = queueGameAI({
    gameID: 'test_game_123',
    sheetName: 'test_sheet',
    teamID: 'test_team'
  });
  
  console.assert(result.success === true, 'Queue should succeed');
  console.assert(result.queued === true, 'Job should be queued');
  
  // Test duplicate prevention
  const duplicate = queueGameAI({
    gameID: 'test_game_123',
    sheetName: 'test_sheet',
    teamID: 'test_team'
  });
  
  console.assert(duplicate.queued === false, 'Duplicate should not be queued');
  
  // Cleanup
  clearAIQueue();
}

function testProcessAIQueue() {
  // Setup mock queue job
  const mockJob = {
    gameID: 'game_1735250400000',
    sheetName: 'data_team_1762633769992',
    teamID: 'team_1762633769992',
    queuedAt: new Date().toISOString(),
    type: 'game_summary',
    attempts: 0
  };
  
  const queue = PropertiesService.getScriptProperties();
  queue.setProperty('ai_queue_test', JSON.stringify(mockJob));
  
  // Run processor
  const result = processAIQueue();
  
  console.assert(result.processed >= 1, 'Should process at least 1 job');
  console.assert(!queue.getProperty('ai_queue_test'), 'Job should be removed after processing');
}
```

### 9.2 Integration Tests

Test end-to-end flow:

**Test 1: Queue → Process → Display**
1. Finalize a game in dev environment
2. Verify queueGameAI API returns success
3. Check PropertiesService has queue entry
4. Manually trigger processAIQueue()
5. Verify AI summary written to game object
6. Reload frontend, verify AI displays

**Test 2: Retry Logic**
1. Add invalid game to queue (gameID doesn't exist)
2. Trigger processAIQueue()
3. Verify job attempts incremented
4. Trigger 2 more times
5. Verify job removed after 3 attempts
6. Check diagnostics log for failure metric

**Test 3: Manual Fallback**
1. Queue AI for game
2. Don't run processor (simulate delay)
3. Open game detail immediately
4. Verify "AI pending" message shows
5. Click "Generate Now"
6. Verify AI generates immediately

### 9.3 Performance Tests

**Queue scalability:**
- Add 50 games to queue
- Time processAIQueue() execution
- Verify completes within 5 minutes (Apps Script limit)
- Expected: ~10-15 seconds per AI call = 8-12 jobs per 5-min window

**PropertiesService limits:**
- Max properties: 500,000 (plenty for queue)
- Max size per property: 9KB (job JSON ~300 bytes, safe)
- Max total size: 5MB (queue metadata only, safe)

### 9.4 User Acceptance Testing

**Coach perspective:**
1. ✅ Finalization feels instant (no waiting)
2. ✅ AI appears "magically" when revisiting game
3. ✅ Clear status (pending vs ready)
4. ✅ Manual option always works
5. ✅ No loss of existing functionality

---

## 10. Implementation Phases

### Phase 1: Backend Queue Infrastructure (2-3 hours)

**Deliverables:**
- ✅ queueGameAI() function
- ✅ processAIQueue() function
- ✅ Queue job data structure
- ✅ Error handling and retry logic
- ✅ getAIQueueStatus() API
- ✅ Time-based trigger setup

**Testing:**
- Manual trigger execution via Apps Script editor
- Verify queue adds/removes jobs
- Test retry logic with mock failures

**Milestone:** Backend can queue and process AI jobs

### Phase 2: Frontend Integration (2-3 hours)

**Deliverables:**
- ✅ Call queueGameAI after game finalization
- ✅ Display AI status badges in schedule
- ✅ Show "AI pending" message in game detail
- ✅ Manual "Generate Now" fallback button
- ✅ AI source indicator (background vs manual)

**Testing:**
- Finalize game, verify queue API called
- Check badge display for pending AI
- Test manual generation fallback

**Milestone:** Full end-to-end flow working

### Phase 3: Monitoring & Diagnostics (1-2 hours)

**Deliverables:**
- ✅ Queue status in dev panel
- ✅ AI metrics in diagnostics log
- ✅ clearAIQueue() admin function
- ✅ Documentation for troubleshooting

**Testing:**
- Monitor queue via dev panel
- Review diagnostics metrics
- Test admin queue clearing

**Milestone:** Observable and debuggable system

### Phase 4: Polish & Edge Cases (1-2 hours)

**Deliverables:**
- ✅ Toast notifications for queue status
- ✅ Improved loading states
- ✅ Handle offline→online transitions
- ✅ Duplicate detection (don't re-queue if AI exists)
- ✅ Code cleanup and comments

**Testing:**
- Test with slow network
- Test offline→online scenarios
- Test re-finalizing same game

**Milestone:** Production-ready feature

---

## 11. Rollout Plan

### Development Testing (Week 1)

**Environment:** Dev Apps Script deployment + localhost frontend

**Actions:**
1. Deploy backend queue functions to dev environment
2. Set up time trigger (5-min interval)
3. Test with 5-10 real games
4. Monitor queue processing in logs
5. Verify AI summaries generate correctly

**Success criteria:**
- ✅ 100% of jobs process successfully
- ✅ No errors in Apps Script logs
- ✅ Queue clears within 10 minutes

### Production Soft Launch (Week 2)

**Environment:** Production Apps Script + production frontend

**Actions:**
1. Deploy backend to production
2. Set up production time trigger
3. Enable feature flag: `config.backgroundAI = true`
4. Announce to 2-3 test coaches
5. Monitor diagnostics for 1 week

**Success criteria:**
- ✅ No failed jobs (or <5% failure rate)
- ✅ AI summaries appear within 10 minutes
- ✅ No coach complaints about UI blocking

### Full Rollout (Week 3)

**Environment:** All users

**Actions:**
1. Enable for all teams
2. Add release note to RELEASE_NOTES/
3. Update CLAUDE.md documentation
4. Optional: Push notification to coaches

**Success criteria:**
- ✅ >95% background success rate
- ✅ Manual fallback rarely used
- ✅ No performance degradation

### Rollback Plan

If issues arise:

**Option 1: Feature Flag**
```javascript
// In config.js
config.backgroundAI = false;  // Disable queueGameAI calls
```

**Option 2: Pause Trigger**
- Delete time-based trigger in Apps Script
- Jobs stop processing (queue pauses)
- Manual AI still works

**Option 3: Clear Queue**
```javascript
// Admin function in Apps Script
clearAIQueue();  // Remove all pending jobs
```

**No data loss:** Manual AI generation always available as fallback.

---

## 12. Future Enhancements

### Phase 2 Features (Post-Launch)

#### 1. Player AI Insights (Auto-Generate)

**Trigger:** When player plays 3+ quarters in a game

**Implementation:**
- Add job type `player_insight` to queue
- processAIQueue() handles both game_summary and player_insight
- Write to `players[x].lastGameInsight` field

**Effort:** +2 hours

#### 2. Priority Queue

**Use case:** Urgent AI (e.g., game just finished) vs batch AI (older games)

**Implementation:**
- Add `priority` field to queue jobs (1-10)
- Sort jobs by priority in processAIQueue()
- High priority = coach waiting, low priority = background backfill

**Effort:** +1 hour

#### 3. Rate Limiting

**Use case:** Avoid Gemini API quota exhaustion

**Implementation:**
- Track AI calls per day in PropertiesService
- Throttle queue processing if approaching quota
- Prioritize recent games over old games

**Effort:** +2 hours

#### 4. Batch Processing

**Use case:** Process multiple teams' AI in one trigger cycle

**Implementation:**
- Current: One-at-a-time sequential processing
- Future: Parallel processing (Apps Script UrlFetchApp.fetchAll)
- 5-10× faster throughput

**Effort:** +3 hours

#### 5. Webhook Notifications

**Use case:** Notify coaches when AI ready

**Implementation:**
- Store coach email/phone in Teams sheet
- Send email/SMS when AI completes
- Optional: Push notification to PWA

**Effort:** +4 hours

---

## 13. Success Metrics

### Key Performance Indicators

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Background success rate** | >95% | `ai_background_success / (success + failed)` |
| **AI availability time** | <10 min | `queueTime` in success metrics |
| **Manual fallback usage** | <10% | `ai_manual_generated / total_games` |
| **Coach satisfaction** | Positive | Informal feedback |
| **Queue backlog** | <20 jobs | `getAIQueueStatus().queued.length` |

### Monitoring Dashboard

**Where:** Dev panel (localhost only) or admin page

**Data sources:**
- Diagnostics sheet (ai_background_* metrics)
- PropertiesService queue length
- Apps Script execution logs

**Metrics to track:**
- Jobs queued today
- Jobs completed today
- Jobs failed today
- Average queue time
- Current queue length
- Retry rate

---

## 14. Documentation Updates

### Files to Update After Implementation

1. **CLAUDE.md**
   - Add "Background AI Generation" section under AI Features
   - Document queue behavior and manual fallback
   - Update API endpoint list (queueGameAI, getAIQueueStatus)

2. **apps-script/Code.js**
   - Add JSDoc comments to queue functions
   - Document time trigger setup
   - Note PropertiesService key format

3. **apps/coach-app/src/js/app.js**
   - Comment queueGameAI call in finalize function
   - Document AI status badge logic
   - Note manual fallback behavior

4. **RELEASE_NOTES/vYYYY-MM-DD.md**
   - Announce background AI feature
   - Explain no more waiting for AI
   - Mention manual fallback option

5. **README.md** (if exists)
   - Update feature list
   - Add background AI to highlights

---

## 15. Risk Assessment

### Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Apps Script quota limits** | Low | Medium | Monitor usage, implement rate limiting |
| **Gemini API downtime** | Low | Low | Retry logic + manual fallback |
| **Queue grows too large** | Low | Medium | Time budget checks, priority queue |
| **Job gets stuck** | Low | Low | Max retries (3), then remove |
| **Data race (concurrent edits)** | Very Low | Low | Apps Script single-threaded per trigger |

### User Experience Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Coach expects instant AI** | Medium | Low | Show "⏳ generating" message |
| **Coach doesn't notice AI** | Low | Medium | Badge in schedule + notification toast |
| **Manual fallback confusing** | Low | Low | Clear "Generate Now" CTA |
| **AI never appears (silent fail)** | Low | High | Diagnostics logging + manual option |

### Business Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Increased Gemini costs** | Low | Low | Queue batching reduces redundant calls |
| **Coach dissatisfaction** | Very Low | Medium | Always provide manual option |
| **Data privacy concerns** | Very Low | High | No PII in queue (IDs only) |

**Overall risk level:** **Low** (well-mitigated)

---

## 16. Cost Analysis

### Gemini API Costs

**Current state (manual):**
- ~50% of games get AI summaries (coach must remember)
- Immediate API call when button clicked

**Future state (background):**
- ~100% of finalized games get AI summaries (automatic)
- Batched processing every 5 minutes

**Cost increase:** +100% AI calls (2× current usage)

**Mitigation:**
- Gemini API free tier: 15 requests/min, 1500 requests/day
- Expected usage: ~10-20 games/day across all teams = well under limit
- **Archived team filtering:** Skip AI generation for archived teams (saves quota on inactive teams)
- **Change detection:** Only regenerate when game data (scores/lineup/notes) actually changes (no wasted re-generations)
- **Typical case:** Most games generate AI once (at finalization), ~10% updated later (notes added)
- Cost at paid tier: $0.00025 per request = ~$0.005/day = $1.82/year

**Verdict:** Negligible cost increase, massive UX improvement

### Apps Script Quotas

**Trigger executions:**
- Current: On-demand only (coach clicks button)
- Future: Every 5 minutes = 288 triggers/day

**Apps Script limits:**
- Free tier: 90 min/day (5,400 seconds)
- Each queue run: ~30 seconds (processing 5 jobs)
- Daily usage: 288 × 30s = 8,640 seconds = **144 minutes** ⚠️

**Over quota!** Need optimization:

**Solution 1:** Reduce trigger frequency
- Change to 10-minute interval = 144 triggers/day = 72 min/day ✅

**Solution 2:** Conditional execution
- Only run if queue has jobs (check PropertiesService first)
- Exit immediately if empty = <1 second per run
- Daily usage: (50 jobs × 30s) + (238 empty × 1s) = 25 min/day ✅

**Recommended:** Solution 2 (conditional execution)

---

## 17. Alternatives Considered

### Alternative 1: Client-Side Background (Service Worker)

**How it works:**
- Service worker runs in background
- Periodically checks for finalized games without AI
- Calls AI API in background

**Pros:**
- No server-side queue needed
- Instant feedback (device-local)

**Cons:**
- ❌ Only works if device online + app installed
- ❌ Doesn't survive device restart
- ❌ Battery drain on mobile
- ❌ Complex service worker logic

**Verdict:** Not suitable for this use case

### Alternative 2: Webhooks (Apps Script → Frontend)

**How it works:**
- Backend generates AI, sends webhook to device
- Device receives push notification
- Frontend updates UI

**Pros:**
- Real-time notification to coach

**Cons:**
- ❌ Requires push notification setup (complex)
- ❌ Device might be offline
- ❌ No benefit over polling (coach opens app anyway)

**Verdict:** Overkill for this feature

### Alternative 3: Immediate Async (Option B)

**How it works:**
- Backend forks execution immediately
- No queue, just fire-and-forget

**Pros:**
- Faster (seconds vs minutes)

**Cons:**
- ❌ No retry logic
- ❌ Hard to debug
- ❌ Trigger quota concerns

**Verdict:** Less reliable than queue

**Decision:** Stick with **time-based queue** (Option A)

---

## 18. Open Questions

### For User Decision

1. **Trigger frequency:** 5 minutes (faster) or 10 minutes (quota-safe)?
   - Recommendation: 10 minutes (negligible UX difference, safer quota)

2. **Manual button placement:** Always show, or hide after AI appears?
   - Recommendation: Always show "Regenerate" (allow re-gen if unsatisfied)

3. **Notification toast:** Show "AI queued" toast after finalization?
   - Recommendation: Yes (brief, non-intrusive confirmation)

4. **Dev panel monitoring:** Include queue status for all users or admin-only?
   - Recommendation: Admin-only (too technical for regular coaches)

5. **Player AI insights:** Include in Phase 1 or defer to Phase 2?
   - Recommendation: Defer to Phase 2 (focus on game summaries first)

### For Implementation Discovery

1. **Gemini API timeout:** What's current timeout setting?
   - Need: Review existing AI functions for timeout config

2. **AI summary field:** Does `games[x].aiSummary` already exist?
   - Need: Check current data structure in sheets

3. **Finalized flag:** Is there a `game.finalized` field?
   - Need: Check if we need to add this field

---

## 19. Implementation Checklist

### Backend Tasks

- [ ] Write queueGameAI() function
- [ ] Add archived team check to queueGameAI() (skip archived teams)
- [ ] Add change detection to queueGameAI() (hash comparison)
- [ ] Write calculateGameDataHash() function (MD5 hash)
- [ ] Write processAIQueue() function
- [ ] Add archived team check to processGameSummaryJob() (double-check)
- [ ] Add hash comparison to processGameSummaryJob() (skip if unchanged)
- [ ] Write gameDataHash to aiSummary when generating
- [ ] Add retry logic with max 3 attempts
- [ ] Write getAIQueueStatus() function
- [ ] Write clearAIQueue() function
- [ ] Add API action handlers (queueGameAI with forceRefresh param, getAIQueueStatus)
- [ ] Set up time-based trigger (10-min interval)
- [ ] Add conditional execution (skip if queue empty)
- [ ] Test queue with mock data
- [ ] Test retry logic with forced failures
- [ ] Test archived team filtering (verify skips successfully)
- [ ] Test change detection (update notes, verify re-queue)
- [ ] Test no-change scenario (update non-AI fields, verify skip)
- [ ] Add diagnostics logging (success, retry, failed metrics)
- [ ] Document queue key format in code comments

### Frontend Tasks

- [ ] Call queueGameAI() after game finalization
- [ ] Add change detection before queueing (calculate hash, compare)
- [ ] Write calculateGameDataHash() function (frontend version)
- [ ] Call queueGameAI() when notes/lineup updated (if hash changed)
- [ ] Add AI status badges to schedule view
- [ ] Show "AI pending" message in game detail
- [ ] Add "Generate Now" manual fallback button
- [ ] Add "Regenerate" button to existing AI summaries (with forceRefresh)
- [ ] Write regenerateAISummary() function
- [ ] Display AI source (background vs manual)
- [ ] Optional: Show queue status in dev panel
- [ ] Optional: Toast notification when AI queued
- [ ] Test end-to-end flow (finalize → queue → display)
- [ ] Test change detection (update notes → auto re-queue)
- [ ] Test no-change scenario (update captain → no re-queue)
- [ ] Test manual regenerate (forceRefresh bypasses hash check)
- [ ] Test manual fallback button
- [ ] Test with offline→online transitions

### Documentation Tasks

- [ ] Update CLAUDE.md (AI Features section)
- [ ] Update CLAUDE.md (API endpoint list)
- [ ] Create release note (RELEASE_NOTES/vYYYY-MM-DD.md)
- [ ] Add JSDoc comments to queue functions
- [ ] Document trigger setup in apps-script README
- [ ] Update feature list in main README (if exists)

### Testing Tasks

- [ ] Unit test: queueGameAI()
- [ ] Unit test: processAIQueue()
- [ ] Unit test: Retry logic
- [ ] Integration test: End-to-end flow
- [ ] Integration test: Manual fallback
- [ ] Performance test: 50-job queue
- [ ] User test: Coach finalizes game + waits
- [ ] User test: Coach finalizes + immediately reopens
- [ ] Monitor diagnostics for 1 week (dev environment)

### Deployment Tasks

- [ ] Deploy backend to dev environment
- [ ] Test in dev for 1 week
- [ ] Deploy backend to production
- [ ] Enable feature flag
- [ ] Soft launch with 2-3 test coaches
- [ ] Monitor for 1 week
- [ ] Full rollout to all users
- [ ] Announce in release notes

---

## 20. Timeline & Effort

### Total Estimated Effort: 6-8 hours

**Breakdown:**
- Backend queue infrastructure: 2-3 hours
- Frontend integration: 2-3 hours
- Monitoring & diagnostics: 1-2 hours
- Polish & edge cases: 1-2 hours

### Recommended Schedule

**Week 1: Development**
- Day 1: Backend queue (2-3 hours)
- Day 2: Frontend integration (2-3 hours)
- Day 3: Monitoring + testing (2 hours)
- Day 4: Polish + documentation (1 hour)

**Week 2: Testing**
- Dev environment testing
- Monitor queue processing
- Fix any bugs

**Week 3: Rollout**
- Soft launch with test coaches
- Monitor diagnostics
- Full rollout if successful

**Total calendar time:** 3 weeks (mostly testing/monitoring)

---

## 21. Success Criteria

### Definition of Done

This feature is considered complete when:

1. ✅ **Backend queue functions implemented and tested**
   - queueGameAI() adds jobs to queue
   - processAIQueue() processes jobs every 10 minutes
   - Retry logic handles failures (max 3 attempts)
   - getAIQueueStatus() returns accurate queue state

2. ✅ **Frontend integration working**
   - Game finalization queues AI automatically
   - AI status badges display correctly (pending vs ready)
   - Manual "Generate Now" fallback works
   - AI source indicator shows background vs manual

3. ✅ **Monitoring and debugging tools available**
   - Queue status visible in dev panel
   - Diagnostics log captures success/retry/failure metrics
   - clearAIQueue() admin function works

4. ✅ **Testing complete**
   - End-to-end flow tested with 10+ games
   - Retry logic tested with forced failures
   - Manual fallback tested
   - Performance tested with 50-job queue

5. ✅ **Documentation updated**
   - CLAUDE.md updated with background AI section
   - Release notes written
   - Code comments added to queue functions
   - Trigger setup documented

6. ✅ **Production metrics healthy**
   - >95% background success rate
   - <10% manual fallback usage
   - Average queue time <10 minutes
   - No failed jobs in diagnostics

### User Acceptance Criteria

From coach perspective:

- ✅ Finalizing game feels instant (no waiting)
- ✅ AI summary appears automatically (no button click needed)
- ✅ Clear status when AI is pending vs ready
- ✅ Manual option works if needed
- ✅ No loss of existing functionality

---

## 22. Conclusion

### Key Takeaways

- **Background AI is feasible** using Apps Script time-based triggers
- **No breaking changes** - manual AI always available as fallback
- **Low risk** - well-tested queue pattern with retry logic
- **High value** - removes friction, improves coach experience
- **6-8 hours effort** - reasonable investment for quality-of-life improvement
- **Negligible cost** - Gemini free tier sufficient, Apps Script quota manageable

### Recommended Next Steps

1. **Get approval** on plan and timeline
2. **Implement Phase 1** (backend + frontend, 4-6 hours)
3. **Test in dev** for 1 week
4. **Soft launch** with test coaches
5. **Full rollout** after validation

### Dependencies

- None (builds on existing AI features)

### Risks

- Low (manual fallback ensures no regression)

### Go/No-Go Decision

**Recommendation:** ✅ **GO** - High value, low risk, reasonable effort

---

**Plan Status:** Ready for implementation  
**Next Action:** User approval + kickoff  
**Estimated Start:** When user decides  
**Estimated Completion:** 3 weeks (including testing)