# Opposition Scouting + Lineup Planner Integration Plan

**Status:** Ready for implementation  
**Estimated Effort:** 6-8 hours (4-6 hours scouting backend/frontend + 2-3 hours planner integration)  
**Priority:** Medium (High coach value, Medium effort)  
**Dependencies:** Opposition Scouting Plan, Combined AI Background Plan (separate processing windows)

---

## Executive Summary

### The Problem

Coaches plan lineups 2-3 days before games but have no easy way to reference opposition scouting intelligence while building rosters. Opposition analysis exists (or will exist) but is disconnected from where coaches need it most—the Lineup Planner.

### The Solution

**Two integrated components:**

1. **Opposition Scouting Hub** - Standalone page showing comprehensive opponent analysis (26 insights grouped A-G)
2. **Lineup Planner Modal** - Quick-access opposition summary (curated top 5 insights) + link to full hub

**Key differentiators:**
- ✅ Automated background processing (Saturday fixture collection, Sunday AI generation)
- ✅ Coach chooses refresh speed: fast data-only OR slow full-insights
- ✅ Responsive design works mobile/tablet/desktop
- ✅ Separate processing window (Sunday 10 AM) avoids conflicts with game-day AI (every 10 min)
- ✅ Read-only data + netball-specific AI insights
- ✅ Ready for coaches by Tuesday (two days before Saturday games)

### Value Proposition

**For Coaches:**
- Know opponent profile while building lineup (contextual intelligence)
- Quick summary in planner, full report available separately
- Manual refresh for fixture delays (fallback)
- No waiting (async background processing)

**For Architecture:**
- Separate processing window (no quota conflicts with game AI)
- Clean separation of concerns (fixture collection vs. AI generation)
- Responsive design works across all devices
- Reusable patterns (can extend to other opposition-related features)

---

## 26 Opposition Analytics: Complete Taxonomy (Gap 4)

**Groups A-G (26 total):**
- **Group A:** Q1-Q4 Strength (4 analytics)
- **Group B:** Offensive/Defensive/Pace Matchups (3)
- **Group C:** Shooting/Possession/Turnover Efficiency (3)
- **Group D:** Defensive/Transition/Squad Depth Vulnerabilities (3)
- **Group E:** Season Trajectory/Momentum/Roster Changes (3)
- **Group F:** Player Combos/Formations/Set Plays/Defense/Subs (5)
- **Group G:** Home/Away and Pressure Performance (2)

**Storage format (JSON):**
```javascript
const opposition26Analytics = {
  teamID: "team_123",
  opponent: "Kilmore",
  round: 6,
  generatedAt: "2026-02-23T10:00:00Z",
  groupA: { q1_strength: {...}, q2_strength: {...}, ... },
  groupB: { offensive_matchup: {...}, defensive_pressure: {...}, pace_control: {...} },
  // ... groups C-G
  aiSummary: "Narrative summary (200-300 words)",
  topRecommendations: ["Rec1", "Rec2", "Rec3"]  // For planner modal
};
```

**UI Integration:**
- **Scouting Hub:** All 26 analytics grouped A-G
- **Planner Modal:** Top 5 recommendations only
- **Frontend Cache:** 7 days TTL

---

## Processing Timeline & Architecture

### 1. Data Collection Phase (Saturday 6 PM)

**Trigger:** Time-based trigger runs Saturday 6 PM (after games conclude ~5 PM)

```javascript
// Time-based Apps Script trigger
// Runs: Every Saturday @ 18:00 (6 PM)
// Function: collectOppositionFixtures()

function collectOppositionFixtures() {
  // Step 1: Get all teams with upcoming fixtures next week
  const upcomingFixtures = getApprovedFixtures(); // Teams scheduled for next round
  
  // Step 2: For each team, collect opponent info
  for (const fixture of upcomingFixtures) {
    const { teamID, sheetName, opponent, round, date } = fixture;
    
    // Fetch opponent's current ladder position
    const opponentLadder = getSquadiLadder(teamID); // Cache ladder data
    const opponentInfo = {
      teamID,
      sheetName,
      opponent,
      round,
      date,
      ladder: opponentLadder,
      collectedAt: new Date(),
      status: 'data_collected'
    };
    
    // Step 3: Queue for AI generation (mark as pending)
    queueOppositionAI(opponentInfo);
  }
  
  Logger.log("Opposition fixture collection complete. Queued for AI generation.");
}
```

**What happens:**
- ✅ Fixture data collected (opponent name, round, date)
- ✅ Ladder positions fetched and cached
- ✅ AI insights queued for next step
- ✅ Status set to "data_collected"
- ✅ Ready for Sunday processing

### Job State Machine (Gap 2 - Required for Implementation)

**Valid States & Transitions:**
```
[data_collected] (Saturday 6 PM)
    ↓
[pending_ai] (queued, waiting)
    ↓ (Sunday 10 AM processing)
[processing]
    ├─ Success → [complete] (remove from queue)
    ├─ Error → [pending_ai] (attempts++)
    └─ Max retries (3) → [failed] (archive)
```

**Job object with state:**
```javascript
const oppositionJob = {
  teamID: "team_123",
  opponent: "Kilmore",
  round: 6,
  status: "pending_ai",
  attempts: 0,
  maxAttempts: 3,
  queuedAt: "2026-02-23T18:00:00Z",
  lastAttemptAt: null,
  nextRetryWindow: "sunday_10am",
  lastError: null
};
```

**Queue storage:**
```javascript
Key: opposition_queue_{teamID}_{round}_{sheetName}
Value: {
  teamID: "team_123",
  sheetName: "data_team_123",
  opponent: "Kilmore",
  round: 6,
  gameDate: "2026-02-28",
  fixtureCollectedAt: "2026-02-21T18:00:00Z",
  ladderData: { position: 3, wins: 8, losses: 2, ... },
  status: "pending_ai",
  attempts: 0,
  nextWindow: "sunday_10am"
}
```

---

### 2. AI Generation Phase (Sunday 10 AM)

**Trigger:** Time-based trigger runs Sunday 10 AM (separate from game-day AI)

```javascript
// Time-based Apps Script trigger
// Runs: Every Sunday @ 10:00 (10 AM)
// Function: processOppositionAIQueue()

function processOppositionAIQueue() {
  // Step 1: Get all pending opposition AI jobs
  const queue = PropertiesService.getScriptProperties();
  const queuedJobs = queue.getKeys()
    .filter(key => key.startsWith('opposition_queue_'));
  
  // Step 2: Process each job sequentially
  for (const jobKey of queuedJobs) {
    try {
      const job = JSON.parse(queue.getProperty(jobKey));
      
      // Step 3: Generate 26 opposition analytics
      const oppositionAnalytics = generateOppositionAnalytics(job);
      
      // Step 4: Store in OppositionScouting sheet
      saveOppositionScoutingData({
        teamID: job.teamID,
        opponent: job.opponent,
        round: job.round,
        analytics: oppositionAnalytics,
        aiSummary: oppositionAnalytics.summary,
        generatedAt: new Date(),
        cacheUntil: addDays(new Date(), 7)
      });
      
      // Step 5: Cache in frontend cache map
      updateOppositionScoutingCache(job.teamID, job.opponent, oppositionAnalytics);
      
      // Step 6: Mark success + remove from queue
      queue.deleteProperty(jobKey);
      logMetric('opposition_ai_success');
      
    } catch (e) {
      // Retry logic
      job.attempts++;
      if (job.attempts < 3) {
        queue.setProperty(jobKey, JSON.stringify(job));
        logMetric('opposition_ai_retry', { attempt: job.attempts });
      } else {
        // Max retries exceeded
        queue.deleteProperty(jobKey);
        logMetric('opposition_ai_failed', { attempts: 3 });
      }
    }
  }
  
  Logger.log("Opposition AI queue processing complete.");
}
```

**What happens:**
- ✅ All queued opposition jobs processed
- ✅ 26 analytics generated (Groups A-G from Opposition Scouting Plan)
- ✅ AI summary created (formatted narrative)
- ✅ Data stored in OppositionScouting sheet
- ✅ Cache populated for 1 week
- ✅ Jobs removed from queue on success
- ✅ Retry logic: max 3 attempts (if failures occur)

**OppositionScouting Sheet Structure:**
```
Columns:
- A: Timestamp (when generated)
- B: TeamID (which team is planning)
- C: Opponent (opponent name)
- D: Round (which round)
- E: GameDate (when game is scheduled)
- F: AISummary (formatted narrative)
- G: AnalyticsJSON (all 26 insights as JSON)
- H: GeneratedAt (when AI ran)
- I: CacheUntil (expiration date)
- J: Status (ready | processing | failed)
```

---

### 3. Manual Refresh (Coach Action, Anytime)

Coach can manually refresh in two ways:

**Option A: Refresh Data Only (FAST - 2 seconds)**
```javascript
// API: refreshOppositionData
// Frontend call:
POST /gas-proxy?action=refreshOppositionData&teamID=team_123&opponent=Kilmore&round=6

// Backend:
function refreshOppositionData(teamID, opponent, round) {
  // Fetch latest fixture data
  const freshFixture = getFixtureForOpponent(teamID, opponent, round);
  const freshLadder = getSquadiLadder(teamID); // Fresh fetch
  
  // Return immediately to frontend
  return {
    success: true,
    opponent,
    ladder: freshLadder,
    lastRefreshed: new Date(),
    aiStatus: "queued_for_next_window"  // Will generate at next Sunday window
  };
}

// Frontend shows:
// ✓ Opposition data updated (Kilmore now: 2nd on ladder)
// 📅 Full insights updating (will regenerate by next Sunday)
```

**Option B: Generate Full Insights NOW (SLOW - 30 seconds, uses quota)**
```javascript
// API: generateOppositionInsightsImmediate
// Frontend call:
POST /gas-proxy?action=generateOppositionInsightsImmediate&teamID=team_123&opponent=Kilmore&round=6

// Backend:
function generateOppositionInsightsImmediate(teamID, opponent, round) {
  // Get fresh data
  const freshFixture = getFixtureForOpponent(teamID, opponent, round);
  const freshLadder = getSquadiLadder(teamID);
  
  // Generate 26 analytics immediately (same as Sunday processing)
  const oppositionAnalytics = generateOppositionAnalytics({
    teamID, opponent, round, ladderData: freshLadder, ...
  });
  
  // Store result
  saveOppositionScoutingData({
    teamID, opponent, round,
    analytics: oppositionAnalytics,
    generatedAt: new Date()
  });
  
  // Return to frontend
  return {
    success: true,
    analytics: oppositionAnalytics,
    generatedAt: new Date(),
    source: "manual_immediate"
  };
}

// Frontend shows:
// ✓ All insights ready immediately
// ⚠️ Note: "Manually generated (uses quota). Next auto-update: Sunday 10 AM"
```

**Coach sees this UI for manual refresh:**
```
┌─────────────────────────────────────────────┐
│ Refresh Opposition Data                      │
├─────────────────────────────────────────────┤
│                                              │
│ Last updated: Tuesday, 10:30 AM              │
│                                              │
│ Choose refresh speed:                        │
│                                              │
│ 🔄 FAST: Update data only                   │
│    └─ Fetch latest ladder, fixture info     │
│    └─ Takes 2 seconds                       │
│    └─ Full insights update next Sunday      │
│                                              │
│ 🔄 COMPLETE: Generate insights now          │
│    └─ Full 26-point analysis (slow)         │
│    └─ Takes ~30 seconds                     │
│    └─ Uses AI quota                         │
│    └─ Next auto-update: Sunday 10 AM        │
│                                              │
│ [Update Data Only]  [Generate Insights]     │
│                                              │
└─────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Component Structure

```
┌─ Opposition Scouting System ──────────────────────────┐
│                                                       │
│  ┌─ OPPOSITION SCOUTING HUB (Separate page) ─────┐  │
│  │                                                 │  │
│  │  Header:                                       │  │
│  │  ├─ Opponent Logo + Name                       │  │
│  │  ├─ "Round X vs Opponent" date info           │  │
│  │  ├─ [Refresh] button (manual)                 │  │
│  │  └─ Loading state management                  │  │
│  │                                                 │  │
│  │  AI Summary Card (prominent):                 │  │
│  │  ├─ Generated narrative (2-3 paragraphs)      │  │
│  │  ├─ Source indicator (auto vs manual)         │  │
│  │  └─ Last updated timestamp                    │  │
│  │                                                 │  │
│  │  26 Analytics (Grouped A-G):                  │  │
│  │  ├─ Group A: Quarter Strength (3 insights)    │  │
│  │  ├─ Group B: Relative Strength (4 insights)   │  │
│  │  ├─ Group C: Scoring Efficiency (3)           │  │
│  │  ├─ Group D: Vulnerabilities (4)              │  │
│  │  ├─ Group E: Predictive (3)                   │  │
│  │  ├─ Group F: Advanced Patterns (4)            │  │
│  │  └─ Group G: Situational (2)                  │  │
│  │                                                 │  │
│  │  Each insight shows:                          │  │
│  │  ├─ Chart/gauge (visual)                      │  │
│  │  ├─ Metric value (numeric)                    │  │
│  │  ├─ Interpretation (text)                     │  │
│  │  ├─ Tactical implication (how to use)         │  │
│  │  └─ Evidence link (where data comes from)     │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────┘   │
│                                                       │
│  ┌─ LINEUP PLANNER MODAL ────────────────────────┐  │
│  │                                                 │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │ vs Kilmore (Round 6) - Feb 28           │  │  │
│  │  │ Close [X]                               │  │  │
│  │  ├─────────────────────────────────────────┤  │  │
│  │  │                                         │  │  │
│  │  │ OPPOSITION SCOUTING SUMMARY             │  │  │
│  │  │                                         │  │  │
│  │  │ ✨ Strong attacking team (Q2 +4 avg)   │  │  │
│  │  │ 🏆 2nd on ladder, consistent form      │  │  │
│  │  │ ⚠️ Weak closing (Q4 -3 pattern)        │  │  │
│  │  │ 🎯 Vulnerable to defensive pressure   │  │  │
│  │  │ 📊 GS-GA combination most deadly       │  │  │
│  │  │                                         │  │  │
│  │  │ [View Full Report] [Refresh Data]      │  │  │
│  │  │                                         │  │  │
│  │  └─────────────────────────────────────────┘  │
│  │                                                 │  │
│  └─────────────────────────────────────────────┘   │
│                                                       │
└───────────────────────────────────────────────────────┘
```

### Responsive Design Strategy

**Mobile-first approach with breakpoints:**

```css
/* Base: mobile (<600px) */
.opposition-hub {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  padding: 1rem;
}

.analytics-group {
  /* Full width on mobile */
}

.analytics-item {
  /* Card stack, one per row */
}

/* Tablet (600px - 960px) */
@media (min-width: 600px) {
  .opposition-hub {
    grid-template-columns: 1fr 1fr; /* 2 columns */
  }
}

/* Desktop (960px+) */
@media (min-width: 960px) {
  .opposition-hub {
    grid-template-columns: 1fr 1fr 1fr; /* 3 columns */
    max-width: 1400px;
  }
  
  .ai-summary {
    grid-column: 1 / -1; /* Full width */
  }
}

/* Planner modal adjustments */
@media (max-width: 600px) {
  .planner-modal {
    height: 80vh; /* Full height -header on mobile */
    overflow-y: scroll;
  }
}

@media (min-width: 600px) {
  .planner-modal {
    width: 500px;
    max-height: 90vh;
    position: absolute;
    right: 20px;
    top: 20px; /* Side panel on tablet+desktop */
  }
}
```

**Specific breakpoints:**
- **Mobile (< 600px):** Full-width stacked layout. Planner modal = fullscreen overlay.
- **Tablet (600-960px):** 2-column grid. Planner modal = right-side sidebar.
- **Desktop (960px+):** 3-column grid. Planner modal = right-side wide sidebar.

---

## Data Flow & Timeline

### Weekly Schedule

```
FRIDAY (Fixture published)
├─ Games scheduled for next week
├─ Fixtures posted to fixture system
└─ Coach App sees upcoming games

SATURDAY (Games conclude)
├─ 5:00 PM: All games finish
├─ 6:00 PM: collectOppositionFixtures() trigger
│  ├─ Fetch all next-week fixtures
│  ├─ Get opponent names, ladder positions
│  ├─ Queue for AI generation
│  └─ Status: "data_collected"
└─ Data ready but AI pending

SUNDAY (AI generation)
├─ 10:00 AM: processOppositionAIQueue() trigger
│  ├─ Load all queued opposition jobs
│  ├─ Generate 26 analytics for each
│  ├─ Create AI summary narrative
│  ├─ Store in OppositionScouting sheet
│  ├─ Cache for 1 week
│  └─ Remove from queue
└─ Full scouting ready ✓

MONDAY (Before planning)
├─ AM: Coaches start planning lineups
├─ Can access Opposition Scouting Hub
├─ Full 26 insights available
└─ Can use Planner button → modal summary

TUESDAY (Planning day)
├─ 1-2 days before Saturday game
├─ Coaches refine lineups
├─ Use scouting Intel for decisions
├─ Can refresh if fixture was late
└─ All data ready

WEDNESDAY-FRIDAY (Refinement)
├─ Coach can refresh data (optional)
├─ Can generate insights immediately if needed
├─ Manual refresh available as fallback
└─ Continue planning

SATURDAY (Game day)
├─ Lineup finalized
├─ Opposition AI (from game-day AI process) generates
├─ Game occurs
└─ Cycle repeats
```

---

## Integration with Combined AI Plan

### Processing Window Separation

**Critical:** Opposition scouting must NOT conflict with game-day background AI.

**Solution: Two separate processing windows**

```
┌─ TIME-BASED TRIGGERS ──────────────────────────┐
│                                                 │
│ Every 10 Minutes (Game-Day Background AI)       │
│ ├─ processAIQueue() - Game Event Analyzer      │
│ ├─ Focus: Single-game analysis (per-game)      │
│ ├─ Impact: High quota if games frequent        │
│ └─ No opposition involved                       │
│                                                 │
│ Saturday 6 PM (Opposition Fixture Collection)  │
│ ├─ collectOppositionFixtures()                 │
│ ├─ Focus: Fetch fixture + ladder data          │
│ ├─ Impact: Low quota (just data fetch)         │
│ └─ Queue for Sunday processing                 │
│                                                 │
│ Sunday 10 AM (Opposition AI Generation)        │
│ ├─ processOppositionAIQueue()                  │
│ ├─ Focus: Generate 26 analytics per opponent   │
│ ├─ Impact: Higher quota (5 min calls per team) │
│ └─ Exclusive processing window (separate)      │
│                                                 │
└─────────────────────────────────────────────────┘

NO OVERLAP: Game AI runs 10-min intervals.
           Opposition AI runs once per week (Sunday 10 AM).
           Saturday 6 PM is low-quota data collection only.
```

**Quota Management:**
```
Per active team per week:
├─ Game AI: ~11 calls (1 per game, max 2 per week)
├─ Opposition AI: ~5 calls (1 per opposition generate)
└─ Total: ~16 calls/team/week within free tier

Free tier: 1500 requests/day
With 10 teams: ~1600 requests/week baseline = ~230/day
Still well under 1500/day limit ✓
```

### Sheet Organization

**Separate sheets prevent conflicts:**

```
Sheet Tabs:
├─ AI_Knowledge_Base (Game-day AI from Combined AI Plan)
│  ├─ Purpose: Per-game Event Analyzer outputs
│  ├─ Accessed by: Game detail view
│  └─ Modules: Event Analyzer, Pattern Detector, etc.
│
├─ OppositionScouting (Opposition intel - NEW)
│  ├─ Purpose: Opposition analytics for upcoming games
│  ├─ Accessed by: Scouting Hub, Planner modal
│  └─ Data: 26 grouped insights + AI summary
│
└─ Fixture_Results (Existing - not changed)
   ├─ Purpose: Historical game results
   └─ Used by: Ladder/strength calculation
```

---

## Frontend Implementation Details

### 1. Opposition Scouting Hub (Separate Page)

**Route:** `/opposition-scouting` or main nav tab "Scouting"

**Components:**

```javascript
// opposition-hub.js
window.openOppositionScoutingHub = function(teamID, gameID) {
  // Load opposition data
  const game = state.currentTeamData.games.find(g => g.id === gameID);
  const opponent = game.opponent;
  
  // Fetch scouting data (from cache or API)
  const scoutingData = getOppositionScoutingData(teamID, opponent);
  
  // Render hub
  renderOppositionHub({
    opponent,
    round: game.round,
    date: game.date,
    scoutingData,
    onRefresh: handleManualRefresh
  });
  
  // Show view
  showView('opposition-scouting');
};

function renderOppositionHub(data) {
  const html = `
    <div class="opposition-hub">
      
      <!-- Header -->
      <div class="opposition-header">
        <div class="opponent-banner">
          <img class="opponent-logo" src="${getOpponentLogo(data.opponent)}" />
          <div class="opponent-info">
            <h1>${data.opponent}</h1>
            <p>Round ${data.round} • ${formatDate(data.date)}</p>
          </div>
        </div>
        <div class="header-actions">
          <button id="refresh-opposition" class="btn-secondary">🔄 Refresh Data</button>
          <span class="last-updated">Updated: ${formatTime(data.scoutingData.generatedAt)}</span>
        </div>
      </div>
      
      <!-- AI Summary (Prominent) -->
      <div class="ai-summary-card">
        <h2>✨ Opposition Summary</h2>
        <div class="summary-text">${escapeHtml(data.scoutingData.aiSummary)}</div>
        <div class="summary-meta">
          <span class="source-badge">AI-Generated</span>
          <span class="timestamp">${formatTime(data.scoutingData.generatedAt)}</span>
        </div>
      </div>
      
      <!-- Group A: Quarter Strength -->
      <div class="analytics-group group-a">
        <h3>📊 Quarter Strength Profile</h3>
        <div class="analytics-items">
          ${renderInsight(data.scoutingData.groupA.quarterStrength)}
          ${renderInsight(data.scoutingData.groupA.quarterMomentum)}
          ${renderInsight(data.scoutingData.groupA.quarterConsistency)}
        </div>
      </div>
      
      <!-- Group B: Relative Strength -->
      <div class="analytics-group group-b">
        <h3>🏆 Relative Strength</h3>
        <div class="analytics-items">
          ${renderInsight(data.scoutingData.groupB.ladderDifferential)}
          ${renderInsight(data.scoutingData.groupB.upsetVulnerability)}
          ${renderInsight(data.scoutingData.groupB.strengthValidation)}
          ${renderInsight(data.scoutingData.groupB.strengthOfSchedule)}
        </div>
      </div>
      
      <!-- Group C: Scoring Efficiency -->
      <div class="analytics-group group-c">
        <h3>⚽ Scoring Efficiency</h3>
        <div class="analytics-items">
          ${renderInsight(data.scoutingData.groupC.scoringEfficiency)}
          ${renderInsight(data.scoutingData.groupC.seasonTrend)}
          ${renderInsight(data.scoutingData.groupC.quarterDominance)}
        </div>
      </div>
      
      <!-- Group D: Vulnerabilities -->
      <div class="analytics-group group-d">
        <h3>⚠️ Vulnerabilities</h3>
        <div class="analytics-items">
          ${renderInsight(data.scoutingData.groupD.performanceVsLadder)}
          ${renderInsight(data.scoutingData.groupD.plusMinusAnalysis)}
          ${renderInsight(data.scoutingData.groupD.opponentOpponentPerformance)}
          ${renderInsight(data.scoutingData.groupD.volatilityZones)}
        </div>
      </div>
      
      <!-- Group E: Predictive -->
      <div class="analytics-group group-e">
        <h3>🔮 Predictive Analytics</h3>
        <div class="analytics-items">
          ${renderInsight(data.scoutingData.groupE.h2hTrend)}
          ${renderInsight(data.scoutingData.groupE.quarterConvergence)}
          ${renderInsight(data.scoutingData.groupE.performancePrediction)}
        </div>
      </div>
      
      <!-- Group F: Advanced Patterns -->
      <div class="analytics-group group-f">
        <h3>🔬 Advanced Patterns</h3>
        <div class="analytics-items">
          ${renderInsight(data.scoutingData.groupF.scoringVariance)}
          ${renderInsight(data.scoutingData.groupF.quarterRatios)}
          ${renderInsight(data.scoutingData.groupF.consistencyScore)}
          ${renderInsight(data.scoutingData.groupF.seasonalProgression)}
        </div>
      </div>
      
      <!-- Group G: Situational -->
      <div class="analytics-group group-g">
        <h3>🌍 Situational Advantages</h3>
        <div class="analytics-items">
          ${renderInsight(data.scoutingData.groupG.fatigueModel)}
          ${renderInsight(data.scoutingData.groupG.winFormula)}
        </div>
      </div>
      
    </div>
  `;
  
  document.getElementById('app').innerHTML = html;
  
  // Refresh button handler
  document.getElementById('refresh-opposition').addEventListener('click', () => {
    showRefreshDialog(data.opponent);
  });
}

function renderInsight(insight) {
  return `
    <div class="insight-card">
      <div class="insight-header">
        <h4>${insight.name}</h4>
        <div class="insight-metric">${insight.value}</div>
      </div>
      <div class="insight-visual">
        ${renderChart(insight.type, insight.data)}
      </div>
      <div class="insight-interpretation">
        ${escapeHtml(insight.interpretation)}
      </div>
      <div class="insight-tactical">
        <strong>What this means:</strong> ${escapeHtml(insight.tacticalImplication)}
      </div>
      <div class="insight-evidence">
        <small>Based on: ${insight.source}</small>
      </div>
    </div>
  `;
}
```

### 2. Lineup Planner Modal (Summary View)

**Trigger:** "Scouting" button in Lineup Planner header

```javascript
// lineup-planner-scouting-modal.js
window.openPlannerScoutingModal = function(teamID, gameID) {
  const game = state.currentTeamData.games.find(g => g.id === gameID);
  const opponent = game.opponent;
  
  // Get scouting data (quick load, or "no data yet" if not available)
  const scoutingData = getOppositionScoutingData(teamID, opponent);
  
  if (!scoutingData) {
    showModal(`
      <div class="scouting-modal-placeholder">
        <p>Opposition scouting not yet available.</p>
        <p>Typically ready by Tuesday morning.</p>
        <button onclick="window.manualRefreshOppositionData('${teamID}', '${opponent}')">
          Refresh Now
        </button>
      </div>
    `);
    return;
  }
  
  // Curate top 5 insights for modal
  const topInsights = curateTopInsights(scoutingData);
  
  const modalHTML = `
    <div class="scouting-modal-content">
      <div class="modal-header">
        <h3>vs ${opponent} (Round ${game.round})</h3>
        <button class="modal-close" onclick="closeModal()">✕</button>
      </div>
      
      <div class="scouting-summary">
        
        <!-- Curated summary (top 5 insights) -->
        <div class="insights-curated">
          ${topInsights.map(insight => `
            <div class="curated-insight">
              <span class="insight-icon">${insight.icon}</span>
              <span class="insight-text">${insight.summary}</span>
            </div>
          `).join('')}
        </div>
        
        <!-- Quick ref: AI Summary -->
        <div class="ai-summary-excerpt">
          ${scoutingData.aiSummary.substring(0, 200)}...
        </div>
        
      </div>
      
      <div class="modal-actions">
        <button class="btn-primary" onclick="window.openOppositionScoutingHub('${teamID}', '${gameID}')">
          📖 View Full Report
        </button>
        <button class="btn-secondary" onclick="window.manualRefreshOppositionData('${teamID}', '${opponent}')">
          🔄 Refresh Data
        </button>
      </div>
      
    </div>
  `;
  
  showModal(modalHTML, { width: '500px', position: 'right' });
};

function curateTopInsights(scoutingData) {
  // Select 5 most tactically relevant for lineup planning:
  // 1. Quarter strength (when to expect their peak)
  // 2. Ladder position (intimidation factor)
  // 3. Main vulnerability (how to exploit)
  // 4. Strongest features (what to guard against)
  // 5. H2H trend if available (historical context)
  
  return [
    {
      icon: '📊',
      summary: `Strong ${scoutingData.groupA.quarterStrength.peakQuarter} (${scoutingData.groupA.quarterStrength.peakValue} avg)`
    },
    {
      icon: '🏆',
      summary: `${scoutingData.groupB.ladderDifferential.rank}${getOrdinal(scoutingData.groupB.ladderDifferential.rank)} on ladder`
    },
    {
      icon: '⚠️',
      summary: `Vulnerable: ${scoutingData.groupD.mainVulnerability.description}`
    },
    {
      icon: '💪',
      summary: `Strongest: ${scoutingData.groupA.quarterStrength.strength}`
    },
    {
      icon: '📈',
      summary: scoutingData.groupE.h2hTrend ? `H2H: ${scoutingData.groupE.h2hTrend.trend}` : 'First time matchup'
    }
  ];
}
```

### 3. Manual Refresh Dialog

```javascript
function showRefreshDialog(opponent) {
  const modalHTML = `
    <div class="refresh-dialog">
      <h3>Refresh Opposition Data</h3>
      
      <p>Last updated: ${formatTime(getLastUpdatedTime(opponent))}</p>
      
      <div class="refresh-options">
        
        <div class="option fast">
          <h4>⚡ FAST (2 seconds)</h4>
          <p>Update ladder position & fixture info</p>
          <p>Full insights regenerate Sunday 10 AM</p>
          <button class="btn-primary" onclick="refreshOppositionDataFast('${opponent}')">
            Update Data Only
          </button>
        </div>
        
        <div class="option complete">
          <h4>⏳ COMPLETE (30 seconds)</h4>
          <p>Generate all 26 insights immediately</p>
          <p class="warning">Uses AI quota</p>
          <button class="btn-primary" onclick="refreshOppositionDataComplete('${opponent}')">
            Generate Full Insights
          </button>
        </div>
        
      </div>
      
      <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    </div>
  `;
  
  showModal(modalHTML);
}

window.refreshOppositionDataFast = async function(opponent) {
  showLoadingState('Updating opposition data...');
  
  try {
    const result = await callAPI('refreshOppositionData', {
      teamID: state.currentTeam.teamID,
      opponent,
      round: state.currentGame.round
    });
    
    if (result.success) {
      showNotification('✓ Opposition data updated');
      // Refresh display
      location.reload(); // Or re-render hub
    }
  } catch (e) {
    showNotification('✗ Refresh failed: ' + e.message);
  }
};

window.refreshOppositionDataComplete = async function(opponent) {
  showLoadingState('Generating insights (30 sec)...');
  
  try {
    const result = await callAPI('generateOppositionInsightsImmediate', {
      teamID: state.currentTeam.teamID,
      opponent,
      round: state.currentGame.round
    });
    
    if (result.success) {
      showNotification('✓ All insights ready');
      // Refresh display with new data
      location.reload();
    }
  } catch (e) {
    showNotification('✗ Generation failed: ' + e.message);
  }
};
```

### 4. Status Indicators

**Show coaches intelligence freshness:**

```javascript
function renderOppositionStatus(opponent, scoutingData) {
  const age = Date.now() - new Date(scoutingData.generatedAt).getTime();
  const ageHours = Math.floor(age / 3600000);
  
  let statusHTML = '';
  if (ageHours < 24) {
    statusHTML = `<span class="status-fresh">✓ Fresh data (${ageHours}h old)</span>`;
  } else if (ageHours < 7 * 24) {
    statusHTML = `<span class="status-ok">⚠️ Data ${Math.floor(ageHours/24)}d old (will refresh Sunday)</span>`;
  } else {
    statusHTML = `<span class="status-stale">⚠️ Data is stale - click Refresh</span>`;
  }
  
  return statusHTML;
}
```

---

## Implementation Phases

### Phase 1: Backend Infrastructure (2-3 hours)

**Objectives:**
- Time-based triggers (Saturday 6 PM, Sunday 10 AM)
- Queue management (opposition_queue_ properties)
- Manual refresh APIs
- OppositionScouting sheet setup

**Tasks:**
- [ ] Create `collectOppositionFixtures()` function
- [ ] Create `processOppositionAIQueue()` function
- [ ] Create `refreshOppositionData()` API endpoint
- [ ] Create `generateOppositionInsightsImmediate()` API endpoint
- [ ] Set up OppositionScouting sheet tabs
- [ ] Implement retry logic (max 3 attempts)
- [ ] Add diagnostic logging/metrics

**Deliverable:** Automated fixture collection + AI generation working

---

### Phase 2: Opposition Scouting Hub (2-3 hours)

**Objectives:**
- Create standalone scouting page
- Display all 26 analytics grouped A-G
- Responsive design (mobile/tablet/desktop)
- Manual refresh button integrated

**Tasks:**
- [ ] Create `opposition-hub.js` module
- [ ] Design and implement hub layout (groups A-G)
- [ ] Implement each insight card (chart + interpretation + tactical use)
- [ ] Add responsive CSS (mobile-first + breakpoints)
- [ ] Integrate manual refresh dialog
- [ ] Add loading states + error handling
- [ ] Cache data in localStorage (1 week)

**Deliverable:** Full scouting hub accessible from nav

---

### Phase 3: Lineup Planner Integration (1-2 hours)

**Objectives:**
- Add Scouting button to Lineup Planner
- Show summary modal (top 5 insights)
- Link to full hub
- "Not available yet" fallback messaging

**Tasks:**
- [ ] Add Scouting button to planner header
- [ ] Create `lineup-planner-scouting-modal.js`
- [ ] Implement curated insights selection
- [ ] Show placeholder when data not ready
- [ ] Add "View Full Report" link to hub
- [ ] Add responsive modal styling (mobile overlay, desktop sidebar)

**Deliverable:** Coaches can access scouting from planner

---

### Phase 4: Polish & Testing (1-2 hours)

**Objectives:**
- End-to-end testing
- Performance optimization
- Documentation updates
- Coach communication

**Tasks:**
- [ ] Test complete flow (Sat collection → Sun AI gen → display Monday)
- [ ] Test manual refresh (both fast and complete options)
- [ ] Test responsive design (mobile/tablet/desktop)
- [ ] Test error scenarios (missing fixtures, API failures)
- [ ] Optimize performance (caching, lazy loading)
- [ ] Update CLAUDE.md
- [ ] Create release notes

**Deliverable:** Production-ready opposition scouting system

---

## Success Criteria

### Technical
- ✅ Saturday 6 PM trigger collects all fixtures
- ✅ Sunday 10 AM trigger generates all opposition analytics
- ✅ No conflicts with game-day AI (separate windows)
- ✅ Manual refresh works (both fast and complete)
- ✅ OppositionScouting sheet stores data correctly
- ✅ 1-week cache working properly
- ✅ Responsive design works (tested on mobile/tablet/desktop)
- ✅ >95% success rate for background processing

### User Experience
- ✅ Coaches see full scouting by Tuesday
- ✅ Scouting button in Planner is discoverable
- ✅ Modal summary is useful (top 5 insights)
- ✅ Full hub shows all 26 insights clearly
- ✅ Manual refresh provides fallback
- ✅ Clear status indicators (data freshness)
- ✅ No waiting for AI (background generation)

### Business
- ✅ Separate processing window (no quota conflicts)
- ✅ Coaches find scouting valuable (usage metrics)
- ✅ Reduces manual opposition prep time
- ✅ Extensible for future opposition-related features

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Fixture not published by Sat 6 PM** | Manual refresh available with immediate generation |
| **AI generation fails** | Retry logic (max 3 attempts), fallback: coach can refresh |
| **Stale opposition data** | Manual refresh button, clear age indicators |
| **Mobile UX confusion** | Clear modal layout, explicit button labels |
| **Quota conflicts with game AI** | Separate time windows (Sunday 10 AM vs. every 10 min) |
| **Heavy lift on Sunday** | Only generate for teams with upcoming games, batch processing |
| **Cache invalidation** | 1-week TTL, manual refresh bypass cache |

---

## Timeline

### Development: 6-8 hours
- Phase 1 (Backend): 2-3 hours
- Phase 2 (Hub): 2-3 hours
- Phase 3 (Planner): 1-2 hours
- Phase 4 (Polish): 1-2 hours

### Testing & Rollout: 2-3 weeks
- Week 1: Dev testing + Saturday/Sunday trial
- Week 2: Soft launch with 2-3 coaches
- Week 3: Full rollout + monitoring

### Total Calendar: 3-4 weeks (dev + testing/rollout)

---

## How Coaches Will Experience This

### Scenario: Coach planning lineup Wednesday for Saturday game

**Friday:** Game on Saturday announced. Coach sees "Kilmore" in upcoming fixtures.

**Saturday 5 PM:** Game ends.

**Saturday 6 PM:** System collects fixture data automatically. "Kilmore" logged as opponent.

**Sunday 10 AM:** AI generates opposition scouting (26 insights).

**Monday Morning:** Coach opens app, navigates to Lineup Planner for upcoming game.

**Monday 2 PM:** Coach clicks "Scouting" button in planner header.

**Modal appears:**
```
vs Kilmore (Round 6)
✨ Opposition Summary

📊 Strong Q2 scoring (+4 avg)
🏆 2nd on ladder
⚠️ Vulnerable: Weak Q4 closing
💪 Strength: GS-GA combo (28 goals avg)
📈 H2H: We won last time (28-22)

[📖 View Full Report] [🔄 Refresh Data]
```

**Coach clicks "View Full Report"** → Opens full Scouting Hub in new view:
- AI Summary paragraph (contextual understanding)
- Group A: Quarter strength (visuals)
- Group B: Relative strength (ladder context)
- Group C-G: All 26 insights with charts

**Coach decides:** Based on Q4 closing weakness, plans to:
1. Rotate shooters Q4 (keep fresh legs)
2. Defensive pressure strategy Q2 (target their peak)
3. Fast-paced first quarter (establish momentum early)

**Uses scouting intel directly in lineup planning.**

---

## Documentation Updates Required

When implemented, update:
- [ ] CLAUDE.md: Add Opposition Scouting section
- [ ] CLAUDE.md: Add Scouting + Planner integration details
- [ ] CLAUDE.md: Update timeline with Saturday/Sunday processing
- [ ] README.md: Add opposition scouting to active features
- [ ] Release notes: Announce feature + explain timeline

---

## Conclusion

This plan separates opposition scouting from game-day AI processing, provides coaches with rich tactical intelligence exactly when they need it (during lineup planning), and maintains clean architecture with zero quota conflicts. The dual-refresh option (fast data only, or complete insights) gives coaches flexibility while keeping the system reliable.

**Key wins:**
✅ Automated background processing (no waiting)  
✅ Ready for coaches by Tuesday  
✅ Responsive across all devices  
✅ Integrated into Planner workflow  
✅ Manual refresh fallback for edge cases  
✅ No conflicts with game-day AI  

