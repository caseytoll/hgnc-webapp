# Gap Fixes: Batch 3 (Gaps 11-20) - Minor Clarifications

These 10 gaps address implementation details and operational guidance. Should be added to COMBINED_AI_IMPLEMENTATION.md, OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md, and VIBE_CODING_GUIDE.md.

## Gap 11: localStorage Caching Strategy

**Frontend cache (Coach App only, parent portal fetches fresh):**

```javascript
const CACHE_CONFIG = {
  teams: { ttl: 5 * 60 * 1000, tag: 'teams_list' },                    // 5 min
  teamData: { ttl: 10 * 60 * 1000, tag: 'team_data' },                // 10 min
  aiInsights: { ttl: 7 * 24 * 60 * 60 * 1000, tag: 'ai_insights' },  // 7 days
  oppositionScouting: { ttl: 7 * 24 * 60 * 60 * 1000, tag: 'opposition' },
  playerLibrary: { ttl: 30 * 24 * 60 * 60 * 1000, tag: 'player_lib' } // 30 days
};

function getCached(key, tag) {
  const entry = JSON.parse(localStorage.getItem(key));
  if (!entry) return null;
  
  if (Date.now() - entry.timestamp > entry.ttl) {
    localStorage.removeItem(key);  // Evict expired
    return null;
  }
  return entry.data;
}

function setCached(key, tag, data, ttl) {
  const entry = {
    data,
    timestamp: Date.now(),
    ttl,
    tag
  };
  localStorage.setItem(key, JSON.stringify(entry));
  updateCacheManifest(tag, key);  // Track for bulk cleanup
}

// Bulk eviction by tag (useful for logout)
function evictCacheTag(tag) {
  const manifest = JSON.parse(localStorage.getItem('cache_manifest') || '{}');
  (manifest[tag] || []).forEach(key => localStorage.removeItem(key));
  delete manifest[tag];
  localStorage.setItem('cache_manifest', JSON.stringify(manifest));
}

// Size management: localStorage ~5-10MB limit
function getCacheSize() {
  const total = Object.entries(localStorage).reduce((sum, [k, v]) => sum + k.length + v.length, 0);
  return (total / 1024 / 1024).toFixed(2) + 'MB';
}
```

## Gap 12: Logging Structure Format

**All metrics logged via `logMetric(name, data)` in Code.js:**

```javascript
function logMetric(name, data = {}) {
  const sheet = SpreadsheetApp.getSheetByName('Diagnostics');
  const row = [
    new Date().toISOString(),
    name,
    JSON.stringify(data),
    '*',  // Reserved for notes
    Session.getActiveUser().getEmail() || 'background-trigger'
  ];
  sheet.appendRow(row);
}

// Examples:
logMetric('ai_queue_success', { gameID: 'g1', tokensUsed: 1247, timeMs: 4200 });
logMetric('opposition_scouting_error', { teamID: 't1', error: 'Network timeout', attempts: 2 });
logMetric('budget_warning', { type: 'execution_time', actual: 4800, limit: 5000 });
```

## Gap 13: Retry Exponential Backoff Specification

**Backoff formulas (apply based on error type):**

```javascript
// Quota errors: Aggressive backoff (1, 2, 4 min)
function quotaBackoffMs(attempt) {
  return Math.pow(2, attempt) * 60 * 1000;  // 60s, 120s, 240s
}

// Network errors: Quick backoff (10, 15, 22 sec)
function networkBackoffMs(attempt) {
  return Math.pow(1.5, attempt) * 10 * 1000;  // 10s, 15s, 22.5s
}

// Opposition Scouting phase delays (separate queue)
function scoutingPhaseBackoffMs(phase, attempt) {
  // Phases spread over multiple days
  const phaseDelays = { 1: 0, 2: 24*60*60*1000, 3: 48*60*60*1000 };
  return phaseDelays[phase] + (Math.pow(1.5, attempt) * 60 * 1000);
}
```

## Gap 14: Queue Priority Levels

**Current system vs future enhancement (preview):**

```javascript
// Phase 1: Single queue, FIFO
const queue = [
  { key: 'ai_queue_g1_...', priority: 1, queuedAt: t0 },
  { key: 'ai_queue_g2_...', priority: 1, queuedAt: t1 },
  // ... all priority = 1
];

// Future: Priority queue capability (ready for Phase 2)
// Priority 1 (urgent): Manual "Regenerate" clicks
// Priority 2 (high): Game finalized (background queue)
// Priority 3 (low): Scheduled opposition scouting

function sortByPriority(jobs) {
  return jobs.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.queuedAt - b.queuedAt;  // FIFO within same priority
  });
}
```

## Gap 15: Opposition Scouting Quota Estimation

**API Endpoints (Netball-Specific Squadi):**
- Base: `https://api-netball.squadi.com` (not generic `api.squadi.com`)
- Registration: `https://registration-netball.squadi.com`
- Netball Connect: `https://registration.netballconnect.com`

**Cost per opposition scouting cycle (26 analytics across multi-game history):**

```
Function            | Queries | Tokens/Query | Total Tokens | Approx Cost
─────────────────────────────────────────────────────────────────────
Fixture collection  | 1       | ~500        | 500         | $0.003
Opponent form (5y)  | 1       | ~2000       | 2000        | $0.012
Tactical analysis   | 3       | ~3000 each  | 9000        | $0.054
Key player tracking | 2       | ~2500 each  | 5000        | $0.030
Strength of sched   | 1       | ~1500       | 1500        | $0.009
Pred. insights      | 1       | ~2000       | 2000        | $0.012
─────────────────────────────────────────────────────────────────────
TOTAL (per opponent)| 9 calls | ~16,000     | 20,000 tokens| ~$0.12
```

Monthly budget (8 opponents × 4 games/month = 32 cycles):
- 32 × 20,000 tokens = 640,000 tokens ≈ $3.84/month
- Using Gemini 2.0 Flash pricing: $0.075/1M tokens input + $0.30/1M output

## Gap 16: Sheet Enumeration Helper

**Utility function to work with sheet columns dynamically:**

```javascript
function getColumnByName(sheetName, columnName) {
  const sheet = SpreadsheetApp.getSheetByName(sheetName);
  const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headerRow.indexOf(columnName) + 1;  // 1-indexed
}

// Usage:
const gameIDCol = getColumnByName('data_team_123', 'GameID');  // Returns column number
const row = sheet.getRange(2, gameIDCol).getValue();  // Read from that column

// For AI_Knowledge_Base:
const statusCol = getColumnByName('AI_Knowledge_Base', 'Status');  // Column E
const tokensCol = getColumnByName('AI_Knowledge_Base', 'TokensUsed');  // Column I
```

## Gap 17: Batch vs Real-Time Processing Rationale

**Why background queue (batch) vs real-time (webhook):**

| Dimension | Batch (Current) | Real-Time | Why Batch |
|-----------|───────────────|-----------|-----------│
| Latency | 5-10 min | <1 sec | Apps Script no webhooks; acceptable for AI |
| Quota efficiency | Higher (batch operations) | Lower (individual calls) | Pool errors, retry together |
| Cost | $0.12/opponent | $0.12/opponent | Same token usage, batching saves overhead |
| Reliability | 3 retries, error recovery | No retry logic | Batch allows sophisticated retry |
| Complexity | Moderate | High | No webhook infrastructure in Apps Script |
| Scalability | Handles 30+ jobs/trigger | 1 at a time | Better for multi-team deployments |

**Batch approach allows:**
- Quota pooling (share limit across jobs)
- Smart retry (exponential backoff for all)
- Rate limiting (max 30 jobs/trigger preserves budget)
- Offline resilience (queue survives script failures)

## Gap 18: Change Detection Refresh Triggers

**When to re-hash and check for AI regeneration needs:**

```javascript
// Trigger 1: Explicit game update (coach editing)
function onGameUpdate(gameID, changedFields) {
  const game = getGame(gameID);
  const newHash = calculateGameDataHash(game);
  const aiData = getAISummary(gameID);
  
  if (aiData && newHash !== aiData.gameDataHash) {
    queueGameAI({ gameID, forceRefresh: false });
  }
}

// Trigger 2: Manual "Regenerate" button (coach clicks)
function onRegenerateClick(gameID) {
  queueGameAI({ gameID, forceRefresh: true });
}

// Trigger 3: Game finalized (first time)
function onGameFinalized(gameID) {
  const firstAI = getAISummary(gameID) === null;
  if (firstAI) {
    queueGameAI({ gameID, forceRefresh: false });
  }
}

// Trigger 4: NOT fired (don't re-gen on these):
// - Opponent name change (non-AI field)
// - Captain change (non-AI field)
// - Location change (non-AI field)
// - Timestamp-only changes (cosmetic)
```

## Gap 19: Rate Limiting Between Phases

**Prevent quota exhaustion when phases overlap (Phase 1 queues + Phase 2 & 5 queries):**

```javascript
function getRateLimitBudget(phase) {
  const activePhases = getDeployedPhases();
  const totalBudget = 60 * 1000;  // 60K tokens/trigger (~$0.36)
  
  switch(phase) {
    case 'COMBINED_AI_PHASE_1':
      // Game AI queue, baseline
      return activePhases.includes('OPPOSITION_SCOUTING_PHASE_5')
        ? totalBudget * 0.5  // Share quota with opposition scouting
        : totalBudget;       // Solo phase, use full budget
        
    case 'OPPOSITION_SCOUTING_PHASE_5':
      // Opposition AI generation, competes with game AI
      return activePhases.includes('COMBINED_AI_PHASE_1')
        ? totalBudget * 0.5  // Reduced due to game AI
        : totalBudget;       // Solo phase
        
    default:
      return totalBudget;
  }
}

// In processAIQueue():
if (tokensCumulative > getRateLimitBudget(currentPhase)) {
  logMetric('rate_limit_reached', { phase: currentPhase, tokensUsed: tokensCumulative });
  break;  // Stop processing, retry on next trigger
}
```

## Gap 20: Monitoring Dashboard Specification

**Key metrics to track (display in Google Sheets "Diagnostics" or external dashboard):**

```javascript
const MONITORING_METRICS = [
  {
    name: 'ai_queue_success',
    display: 'Game Summaries Generated',
    unit: 'count/day',
    target: '>20',
    chart: 'line'
  },
  {
    name: 'ai_queue_failure',
    display: 'Failed Jobs',
    unit: 'count/day',
    alert: '>2',
    chart: 'line'
  },
  {
    name: 'avg_processing_time',
    display: 'Avg Job Duration',
    unit: 'seconds',
    target: '<8',
    chart: 'gauge'
  },
  {
    name: 'tokens_per_day',
    display: 'Daily Token Usage',
    unit: 'tokens',
    target: '<500K',
    chart: 'bar'
  },
  {
    name: 'execution_time_budget',
    display: 'Apps Script Execution %',
    unit: '%',
    alert: '>70',
    chart: 'gauge'
  },
  {
    name: 'opposition_scouting_cycles',
    display: 'Opposition Analyses',
    unit: 'count/week',
    target: '8-12',
    chart: 'bar'
  }
];

// Auto-generate dashboard from metrics
function buildMonitoringDashboard() {
  const data = aggregateMetrics(MONITORING_METRICS, 'last_7_days');
  return {
    successRate: (data.successes / (data.successes + data.failures) * 100).toFixed(1),
    avgProcessingTime: data.avgTime,
    tokensPerDay: Math.round(data.tokensCumulative / 7),
    quotaHealth: 'OK'  // Check against monthly budget
  };
}
```

---

## Implementation Notes for Claude Code

These 10 gaps are reference material (not blocking). Reference this file when:
1. Setting up logging structure in Code.js (Gap 12)
2. Implementing retry logic (Gap 13)
3. Building monitoring dashboard (Gap 20)
4. Optimizing localStorage usage in coach app (Gap 11)
5. Planning quota allocations (Gap 15)
6. Deciding between batch vs real-time triggers (Gap 17)

**Priority for implementation:** Medium (reference during Phase 1-5, no blocking logic)
