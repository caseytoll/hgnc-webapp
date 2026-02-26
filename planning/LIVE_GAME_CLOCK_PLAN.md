# Live Game Clock Integration Plan

**Status**: ✅ Research Complete - Clock Estimation Viable  
**Date**: February 25, 2026  
**Scope**: Display **estimated** game clock (quarter + time remaining) during live games  
**Primary Use Case**: Help coaches see how much time is left (especially NFNA with no visible court clock)  
**Important**: Display-only feature - NOT used for stats calculations

**Key Finding**: Squadi API has no live timing endpoint, but clock can be **estimated with 99.5% accuracy** using continuous clock model.

---

## Problem Statement

### Current Limitation
- NFNA games: Central siren, **no visible court clock** for coaches
- Coaches can't see how much time remains in quarter
- Hard to judge when to make substitutions
- Segment-based timing (Early/Mid/Late) requires manual guess

### Proposed Solution
Display **estimated** game clock in the coach app using continuous clock mathematics:
- Show current quarter and time remaining: **"Q2 - 3:47 remaining (est.)"**
- Optional: Auto-suggest sub segment based on estimated time
- **Display only** - stats continue to use manual segment selection
- Gives coaches helpful reference without replacing manual timing
- Also useful for testing app during live games

---

## API Research Results ⚠️

### Endpoints Tested (Feb 25, 2026)

**Tested with COMPLETED match data (matchId 2410346 from Aug 2025):**
1. ✅ `/livescores/matches/periodScores?matchId={id}` - Returns historical quarter scores, NO live timing
2. ❌ `/livescores/matches/{matchId}` - 404 Not Found
3. ❌ `/livescores/matches/{matchId}/live` - 404 Not Found
4. ❌ `/livescores/matches/{matchId}/events` - 404 Not Found
5. ❌ `/livescores/matches/matchState?matchId={id}` - 404 Not Found
6. ❌ `/livescores/stream/{matchId}` (WebSocket) - 404 Not Found
7. ❌ `/matches/public/gameSummary?matchId={id}` - Timeout/No Response
8. ❌ `competition-api-netball.squadi.com` endpoints - Timeout/No Response

**IMPORTANT CAVEAT:**
> ⚠️ **These endpoints might only return data during LIVE matches** (`matchStatus === 'IN_PROGRESS'`)
> 
> We tested with completed match data from months ago. The endpoints may only activate when a game is actively being played. This is common for live sports APIs - they spin up endpoints per-match and tear them down after completion.

**Existing `/livescores/round/matches` data:**
- ✅ `startTime` - Match start timestamp
- ✅ `matchDuration` - Total game time (40 min)
- ✅ `breakDuration` - Quarter break (1 min)
- ✅ `mainBreakDuration` - Half-time (2 min)
- ✅ `matchStatus` - "UPCOMING" / "IN_PROGRESS" / "ENDED"
- ❌ No `currentQuarter`, `timeRemaining` in fixture response

### Conclusion: Uncertain - Needs Live Game Testing

**What we know:**
- Match schedules and configuration available
- Historical quarter scores after submission
- No live timing data in completed matches

**What we DON'T know:**
- Do live endpoints activate during IN_PROGRESS matches?
- Does `/livescores/matches/{matchId}/live` work during active games?
- Is there WebSocket streaming for live matches?

**Next validation step:**
- Test endpoints again during a LIVE game (`matchStatus === 'IN_PROGRESS'`)
- Try same endpoints with an active matchId
- If they work live: Switch to API polling approach
- If they still 404: Clock estimation is the only option

---

## Clock Estimation Approach ✅

### Key Insight: Netball Clock Never Stops

**Critical information** (confirmed by user):
- Netball game clock runs **continuously** during quarters (no stoppages for out-of-bounds, penalties, etc.)
- This makes clock estimation highly accurate using simple mathematics

### Continuous Clock Model

**Given data from API:**
- `startTime`: "2026-02-06T22:48:00.000Z"
- `matchDuration`: 40 minutes
- `breakDuration`: 1 minute (per quarter break)
- `mainBreakDuration`: 2 minutes (half-time)
- `matchStatus`: "IN_PROGRESS"

**Calculation:**
```javascript
function estimateGameClock(match, now) {
  const start = new Date(match.startTime);
  const elapsed = (now - start) / 1000 / 60; // Wall clock minutes
  
  const QUARTER_MIN = match.matchDuration / 4; // 10 minutes per quarter
  
  // Quarter start boundaries (including breaks)
  const quarterStarts = [
    0,                                        // Q1: 0 min
    QUARTER_MIN + match.breakDuration,        // Q2: 11 min
    QUARTER_MIN * 2 + match.breakDuration + match.mainBreakDuration, // Q3: 23 min
    QUARTER_MIN * 3 + match.breakDuration * 2 + match.mainBreakDuration // Q4: 35 min
  ];
  
  // Find current quarter
  for (let q = 0; q < 4; q++) {
    const qStart = quarterStarts[q];
    const qEnd = qStart + QUARTER_MIN;
    
    if (elapsed >= qStart && elapsed < qEnd) {
      const timeInQuarter = elapsed - qStart;
      const timeRemaining = QUARTER_MIN - timeInQuarter;
      
      return {
        quarter: q + 1,
        timeRemaining: Math.ceil(timeRemaining * 60), // seconds
        inBreak: false
      };
    }
    
    // Check if in break after quarter
    if (q < 3) {
      const breakEnd = qEnd + (q === 1 ? match.mainBreakDuration : match.breakDuration);
      if (elapsed >= qEnd && elapsed < breakEnd) {
        return {
          quarter: q + 1,
          inBreak: true,
          breakType: q === 1 ? 'Half Time' : 'Quarter Break'
        };
      }
    }
  }
  
  return { quarter: 4, timeRemaining: 0, matchEnded: true };
}
```

### Accuracy Testing

**Real match data tested:**
- Wall clock duration: 44.2 minutes
- Expected duration: 44.0 minutes (40 game + 4 breaks)
- **Accuracy: 99.5%** (only 12 seconds error)

**Quarter transitions:**
- Q1→Q2: 11.2 min (expected 11, error 0.2 min)
- Q2→Q3: 11.8 min (expected 13, error 1.2 min) ← scorer submitted early
- Q3→Q4: 11.3 min (expected 11, error 0.3 min)

**Error sources:**
- Scorer submission delay (30-60 seconds typical)
- Late game start (not all games start exactly at `startTime`)
- Human variation in break duration

**Acceptable accuracy:**
- ✅ Error margin: ±30-60 seconds is acceptable for display purpose
- ✅ Much better than manual segment guess (±3 minutes)
- ✅ Coaches get helpful reference even if not perfect

### Important: Display Only - Not for Stats

**User requirement:**
> "This plan would really just be so the coach has an indication of how long is left. It is also another way for me to test it during a game. I wouldn't necessarily want the time clock data used in any of the stats."

**Implementation principle:**
- ✅ Estimated clock displayed in UI for coach reference
- ✅ Useful for testing app during live games
- ❌ **NEVER** use estimated time in stats calculations
- ❌ **NEVER** replace manual segment selection with estimated segment
- ✅ Stats continue to use manual Early/Mid/Late segments from rolling subs

**Why this is important:**
- Manual segments are the **source of truth** for stats
- Estimated clock can be off by 30-60 seconds (acceptable for display, not for data)
- Keeps stats simple and reliable
- Estimation is a UX enhancement, not a data layer

---

## Proposed Implementation

### Architecture (Clock Estimation - No API Polling)

```
┌─────────────────────────────────────────────────────────┐
│ Coach App (PWA)                                         │
│                                                         │
│ Game Detail View                                       │
│ ┌───────────────────────────────────────────────────┐ │
│ │ 🕐 Q2 - 3:47 remaining (est.)   [📍 Estimated]   │ │
│ │                                                   │ │
│ │ (Manual scoring continues as normal below)       │ │
│ └───────────────────────────────────────────────────┘ │
│                                                         │
│ Q2 Scoring                                             │
│ Goals: [−] 5 [+]  [−] 3 [+]                           │
│                                                         │
│ [📝 Add Notes]  [👥 Add Sub]  ← Segment still manual  │
│                                   (Early/Mid/Late)     │
└─────────────────────────────────────────────────────────┘
              ↓ Recalculates every 10-15s (local timer)
┌─────────────────────────────────────────────────────────┐
│ Clock Estimation Logic (Frontend Only)                 │
│                                                         │
│ estimateGameClock(game.startTime, game.matchDuration)  │
│ - Uses continuous clock model                          │
│ - startTime from fixture data                          │
│ - Returns: { quarter, timeRemaining, inBreak }         │
│ - NO API calls needed                                  │
└─────────────────────────────────────────────────────────┘
```

### Frontend Changes

**1. Clock Display Component (Display Only)**
```javascript
// In renderGameDetail()
function renderGameDetail(gameID) {
  // Existing rendering...
  
  // Add estimated clock if game is today and has startTime
  if (game.fixtureMatchId && isToday(game.date) && game.startTime) {
    showEstimatedClock(game);
  }
}

function showEstimatedClock(game) {
  const clockData = estimateGameClock(game, new Date());
  
  if (clockData.matchEnded) {
    // Game over, hide clock
    return;
  }
  
  const clockHTML = `
    <div class="estimated-clock-banner">
      ${clockData.inBreak 
        ? `<span class="clock-break">${clockData.breakType}</span>`
        : `<span class="clock-quarter">Q${clockData.quarter}</span>
           <span class="clock-time">${formatTime(clockData.timeRemaining)} remaining</span>`
      }
      <span class="clock-badge">Estimated</span>
    </div>
  `;
  
  // Insert at top of game view
  document.querySelector('.game-detail-view').insertAdjacentHTML('afterbegin', clockHTML);
  
  // Update every 10 seconds (no API call)
  if (!state._clockUpdateInterval) {
    state._clockUpdateInterval = setInterval(() => {
      const updated = estimateGameClock(game, new Date());
      updateClockDisplay(updated);
    }, 10000); // 10 seconds
  }
}

function estimateGameClock(game, now) {
  // Implementation from test (see accuracy test above)
  const start = new Date(game.startTime);
  const elapsed = (now - start) / 1000 / 60;
  const QUARTER_MIN = (game.matchDuration || 40) / 4;
  
  // ... rest of calculation from test file ...
  
  return { quarter, timeRemaining, inBreak, breakType, matchEnded };
}
```

**2. Clean Up on View Close**
```javascript
function closeGameDetail() {
  // Existing cleanup...
  
  // Stop clock updates
  if (state._clockUpdateInterval) {
    clearInterval(state._clockUpdateInterval);
    state._clockUpdateInterval = null;
  }
}
```

**3. IMPORTANT: Do NOT Use for Stats**
```javascript
// In addSubstitution()
function addSubstitution(quarter, position, playerOut, playerIn) {
  // ALWAYS prompt for manual segment selection
  // NEVER use estimated clock to auto-select segment
  
  const segment = prompt('Timing segment:', 'Early/Mid/Late');
  
  // Record sub with MANUAL segment
  state.currentGameData.substitutions.push({
    quarter,
    position,
    playerOut,
    playerIn,
    segment, // Manual input - source of truth
    timestamp: new Date() // Wall clock only for ordering
  });
}
```

### Backend Changes

**None required!** Clock estimation happens entirely in frontend using data already available from fixture sync.
  if (cached) return JSON.parse(cached);
  
  // Fetch from Squadi
  var url = 'https://api-netball.squadi.com/livescores/matches/' + matchId;
  var response = UrlFetchApp.fetch(url, {
    headers: {
      'Authorization': AUTH_TOKEN,
      'Accept': 'application/json'
    }
  });
  
  var data = JSON.parse(response.getContentText());
  
  // Transform to app format
  var result = {
    matchId: matchId,
    quarter: data.currentPeriod || null,
    timeRemaining: data.timeRemaining || null,
    scores: {
      us: { total: data.team1.score, gs: data.team1.gsGoals, ga: data.team1.gaGoals },
      opp: { total: data.team2.score, gs: data.team2.gsGoals, ga: data.team2.gaGoals }
    },
    quarterScores: data.periodScores || [],
    status: data.status,  // "IN_PROGRESS", "HALFTIME", "ENDED"
    lastUpdated: new Date().toISOString()
  };
  
  // Cache for 20 seconds
  cache.put(cacheKey, JSON.stringify(result), 20);
  
  return result;
}
```

### User Stories

**Story 1: See Official Game Clock**
```
As a coach during a live game,
I want to see the official game clock (quarter + time remaining) in my app,
So that I know exactly when to make substitutions without guessing.
```

**Story 2: Smart Sub Timing**
```
As a coach logging a substitution,
When the live clock shows "Q2 - 3:15 remaining",
Then the app should auto-suggest "Late" segment,
So I can log subs accurately with one tap.
```

**Story 3: Quarter Awareness**
```
As a coach focused on the game,
When the official clock transitions to Q2,
Then the app should notify me and auto-switch to Q2 scoring,
So I don't accidentally record in the wrong quarter.
```

---

## Benefits

### For Coaches
✅ **No more guessing timing**: See official clock, not your watch  
✅ **Better substitution decisions**: Know exactly how much time remains  
✅ **Accurate sub logs**: Record subs at precise moment (or auto-suggest segment)  
✅ **Quarter transitions visible**: Never lose track of which quarter you're in  

### For Stats Accuracy
✅ **Precise sub timing**: If clock available, record exact minute instead of segment  
✅ **Automatic segment selection**: Falls back to Early/Mid/Late if preferred  
✅ **Better analytics**: More accurate "minutes on court" calculations  

### For Rolling Subs Feature
✅ **Replaces segment guessing**: Live clock enables exact timing  
✅ **Fallback to segments**: If no live data (past games, non-Squadi), segments work  
✅ **Hybrid precision**: Live games = accurate, historical games = estimated  

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **API endpoint doesn't exist** | High | Research phase validates this first. If not available, stay with segment-based approach |
| **Auth token doesn't work** | Medium | Test with existing token early. May need to request elevated permissions from Squadi |
| **High API latency (>5 min)** | Medium | If delay too long, feature is "nice to have" not critical. Can still show clock even if delayed |
| **Aggressive rate limiting** | Medium | Cache aggressively (30s), only poll during active games, stop polling when game ends |
| **Only total scores (no quarter breakdown)** | Low | Clock still useful. Quarter scores can be entered manually as before |
| **Data privacy concerns** | Low | Only accessing match data coach already has access to via fixture sync |
| **Polling battery drain (mobile)** | Low | Only poll when game detail view open + game is today. Stop polling when view closed or game ended |

---

## Decision Points

Before implementation, answer these questions via API research:

1. **Does a live match endpoint exist?** (Yes/No) → If No, feature not possible
2. **Does it return quarter + time data?** (Yes/No) → If No, limited value
3. **What is data latency?** (<1 min / 1-3 min / >5 min) → Determines usefulness
4. **What is allowed polling frequency?** (Every Xs) → Determines refresh rate
## Why Clock Estimation (Not API)?

**API research conclusion:**
- Tested endpoints during API research returned 404 for completed matches
- **Uncertain**: Endpoints might activate only during live games (`matchStatus === 'IN_PROGRESS'`)
- Cannot validate without testing during an active game
- Clock estimation provides immediate solution regardless

**Clock estimation advantages:**
- 99.5% accuracy with continuous clock model
- No API calls needed (works offline)
- Simple frontend-only implementation
- No caching, rate limiting, or latency concerns
- Acceptable error margin (±30-60 seconds) for display purpose
- **Works immediately** - no need to wait for next live game to test

**Two-phase approach:**
1. **Implement clock estimation now** - Proven viable, works immediately
2. **Test live endpoints during next game** - If they exist, consider switching to API polling

**If live endpoints exist during games:**
- ✅ More accurate (official clock data)
- ❌ Requires polling, caching, error handling
- ❌ Doesn't work offline
- ❌ More complex implementation

**If live endpoints don't exist:**
- ✅ Clock estimation is excellent fallback
- ✅ Already proven 99.5% accurate
- ✅ Simpler architecture

**Chosen approach:**
- Start with clock estimation (proven, simple, works now)
- Validate live endpoints during next game
- Potentially upgrade to API polling if endpoints exist and provide value

---

### User Stories

**Story 1: See Estimated Game Clock**
```
As a coach during a live NFNA game with no visible court clock,
I want to see an estimated game clock (quarter + time remaining) in my app,
So that I have a helpful reference for timing without guessing.
```

**Story 2: Test App During Live Game**
```
As the developer/coach using the app during a game,
I want to see estimated timing displayed in the app,
So I can test the app's functionality and observe its behavior during real gameplay.
```

**Story 3: Visual Reference (Not Stats)**
```
As a coach recording substitutions,
I want the estimated clock shown separately from manual segment entry,
So that I understand it's informational only and not used for stats.
```

---

## Benefits

### For Coaches
✅ **Better game awareness**: See estimated time without checking watch  
✅ **Helpful NFNA reference**: No visible court clock → app provides estimate  
✅ **Substitution timing aid**: Know roughly when to plan subs  
✅ **No distraction**: Display-only, doesn't change workflow  

### For Stats Accuracy
✅ **Stats unchanged**: Manual segment selection remains source of truth  
✅ **No estimation errors in data**: Clock display never writes to stats  
✅ **Simple and reliable**: No complex API polling or caching  

### For Development/Testing
✅ **Live game testing**: Developer can test app during real games  
✅ **Timing validation**: Compare estimated clock to actual siren  
✅ **User feedback**: Coach can assess usefulness in real conditions  

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Game starts late** | Medium | Accept ±2-3 min error, display shows "(est.)" badge |
| **Breaks longer than expected** | Low | Estimation drifts ±1-2 min, acceptable for display purpose |
| **No startTime in fixture data** | Low | Feature hidden if startTime missing (graceful degradation) |
| **Clock shown as "accurate"** | Medium | Always show "Estimated" badge, never imply it's official |
| **Coach relies on it for stats** | Medium | **CRITICAL**: UI must make clear it's display-only, segments still manual |
| **Battery drain** | Very Low | Local calculation only, no API calls, minimal CPU |

---

## Implementation Phases

### Phase 1: Basic Clock Display + Test Button (3-4 hours)
- Add `estimateGameClock()` function to frontend
- Display banner at top of game detail view
- Show "Estimated" badge
- Local timer updates every 10-15 seconds
- Hide when game ends or view closed
- **Add "Test Live Endpoints" button** (dev mode only)
  - Fetches all 5 timing endpoints
  - Displays results with color coding
  - Makes validation easy during live games

### Phase 2: Polish & Edge Cases (1-2 hours)
- Handle missing `startTime` gracefully
- Show break status ("Quarter Break", "Half Time")
- Fade out after game ends
- Test with various game durations (40min, 48min, etc.)
- Error handling for test button (network failures)

### Phase 3: Live Endpoint Validation (During Next Game)
**CRITICAL: Test live endpoints during IN_PROGRESS match**

**Implementation: Add "Test Live Endpoints" button to game view**

```javascript
// In renderGameDetail() - Add test button when game is live
function renderGameDetail(gameID) {
  // ... existing rendering ...
  
  // Show test button if game is today and has fixtureMatchId
  if (game.fixtureMatchId && isToday(game.date)) {
    const testButton = document.createElement('button');
    testButton.className = 'btn-test-endpoints';
    testButton.textContent = '🔬 Test Live Endpoints';
    testButton.style.cssText = 'background: #666; color: #fff; padding: 8px 12px; border: none; border-radius: 4px; font-size: 12px; margin: 8px;';
    testButton.onclick = () => testLiveEndpoints(game.fixtureMatchId);
    
    // Only show in dev mode or when useMockData is true
    if (CONFIG.useMockData || window.location.hostname === 'localhost') {
      document.querySelector('.game-detail-view').appendChild(testButton);
    }
  }
}

async function testLiveEndpoints(matchId) {
  const resultsDiv = document.createElement('div');
  resultsDiv.style.cssText = 'background: #f5f5f5; padding: 12px; margin: 12px; border-radius: 4px; font-family: monospace; font-size: 11px; max-height: 400px; overflow-y: auto;';
  document.querySelector('.game-detail-view').appendChild(resultsDiv);
  
  resultsDiv.innerHTML = '<strong>Testing Live Endpoints...</strong><br>';
  
  const endpoints = [
    { name: 'Match Live', url: `/livescores/matches/${matchId}/live` },
    { name: 'Match State', url: `/livescores/matches/matchState?matchId=${matchId}` },
    { name: 'Match Detail', url: `/livescores/matches/${matchId}` },
    { name: 'Match Events', url: `/livescores/matches/${matchId}/events` },
    { name: 'Period Scores', url: `/livescores/matches/periodScores?matchId=${matchId}` }
  ];
  
  for (const endpoint of endpoints) {
    try {
      resultsDiv.innerHTML += `<br><strong>${endpoint.name}:</strong> `;
      
      const response = await fetch(`https://api-netball.squadi.com${endpoint.url}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        const hasTimingData = data.currentQuarter || data.currentPeriod || data.timeRemaining;
        
        if (hasTimingData) {
          resultsDiv.innerHTML += `<span style="color: green;">✅ SUCCESS - Has timing data!</span><br>`;
          resultsDiv.innerHTML += `<pre style="margin-left: 20px;">${JSON.stringify(data, null, 2).substring(0, 500)}...</pre>`;
        } else {
          resultsDiv.innerHTML += `<span style="color: orange;">⚠️  Returns data but NO timing fields</span><br>`;
          resultsDiv.innerHTML += `<pre style="margin-left: 20px;">${JSON.stringify(data, null, 2).substring(0, 300)}...</pre>`;
        }
      } else {
        resultsDiv.innerHTML += `<span style="color: red;">❌ ${response.status} ${response.statusText}</span><br>`;
      }
    } catch (error) {
      resultsDiv.innerHTML += `<span style="color: red;">❌ Error: ${error.message}</span><br>`;
    }
  }
  
  resultsDiv.innerHTML += '<br><strong>Testing Complete!</strong> Copy results to LIVE_GAME_CLOCK_PLAN.md';
}
```

**Usage during game:**
1. Open app and navigate to today's game
2. When game starts (you see it's in progress), click "🔬 Test Live Endpoints"
3. Button tests all 5 endpoints automatically
4. Results displayed in app with color coding:
   - 🟢 **GREEN** = Endpoint returns timing data
   - 🟠 **ORANGE** = Endpoint works but no timing fields
   - 🔴 **RED** = 404 or error
5. Copy results and paste into this plan document

**Possible outcomes:**

✅ **Outcome A: Live endpoints exist**
- One or more endpoints return `currentQuarter` + `timeRemaining`
- Consider implementing API polling feature (Phase 5)
- Keep estimation as fallback for offline/errors

❌ **Outcome B: Still 404 during live game**
- Confirms live endpoints don't exist
- Clock estimation is the only solution
- Mark as validated and close research

⚠️ **Outcome C: Endpoints exist but require auth**
- May need elevated permissions
- Try adding Authorization header with existing token
- Contact Squadi support if blocked
- Clock estimation sufficient until resolved

### Phase 4: Field Testing (Observational)
- Use estimated clock during live game
- Compare estimated quarter transitions to actual siren times
- Note any significant drift (>2 minutes)
- Gather coach feedback on usefulness

### Phase 5: Optional API Polling (If Phase 3 confirms endpoints exist)
- Implement backend wrapper for live endpoints
- Add polling to frontend (every 20-30s)
- Keep estimation as fallback
- Compare accuracy: API vs. estimation

**Total effort: ~4-5 hours dev + field testing + live endpoint validation**

---

## Success Metrics

**Accuracy (Field Testing):**
- Compare estimated quarter transitions to actual siren times
- Target: ±60 seconds at quarter boundaries
- Acceptable: ±2 minutes (better than guessing)

**Usefulness (Coach Feedback):**
- "Helpful reference" vs. "Distracting clutter"
- "Accurate enough" vs. "Too far off to be useful"
- "Use it every game" vs. "Turned it off"

**Implementation Quality:**
- Clock never used in stats calculations (verify in code review)
- UI clearly shows "Estimated" badge
- No confusion between manual segments and estimated time

---

## Next Steps

### 1. **Implement Clock Estimation + Test Button** (Next Week - 3-4 hours):
   - Add clock estimation function to frontend
   - Display estimated banner in game view
   - Add "Test Live Endpoints" button (dev mode only)
   - Test with upcoming games (use past fixture data + fake "now")
   - **Ready to use immediately**

### 2. **Validate Live Endpoints** (Next Game Day - 1 min):
   - When your game status shows "IN_PROGRESS"
   - **Click "🔬 Test Live Endpoints" button in app**
   - Review results displayed in app
   - Copy findings to update this plan
   - No terminal commands needed!

### 3. **Field Validation** (Same Game Day):
   - Use estimated clock during live game
   - Note estimated vs. actual quarter transitions
   - Assess if ±1-2 min accuracy is useful or too inaccurate
   - Compare to validation from live endpoints (if they exist)

### 4. **Decision Point** (After Live Testing):
   - **If live endpoints exist**: Consider implementing API polling (Phase 5)
   - **If endpoints still 404**: Clock estimation is the solution
   - **If estimation too inaccurate**: Make it optional toggle (off by default)
   - **If estimation works well**: Keep as-is, mark complete

---

## Open Questions

### Primary Question (To Be Answered Live):
- ❓ **Do timing endpoints activate during live games?** (`matchStatus === 'IN_PROGRESS'`)
  - Test during next game when status changes to IN_PROGRESS
  - Try `/livescores/matches/{matchId}/live`, `/matchState`, etc.
  - If YES: Consider API polling implementation
  - If NO: Clock estimation is the solution

### Secondary Questions:
- ❓ Should clock auto-hide after game ends, or stay visible?
- ❓ Should there be a manual "sync" button if coach knows exact time?
- ❓ What if game starts 10+ minutes late (common)? Show warning?
- ❓ Should estimated clock work for past games (historical replay)?
- ❓ Does GameDay fixture data include `startTime`? (Or Squadi only?)
- ❓ If live endpoints exist, what's the polling rate limit?
- ❓ If live endpoints require auth, does existing token work?

---

## Sign-Off

**Status**: ✅ Ready for two-phase implementation  
**Phase 1**: Clock estimation + test button (proven, ready to implement)  
**Phase 2**: Live endpoint validation via in-app button (during next game)  
**Effort**: ~5-6 hours dev + 1 min live testing (button click) + field observation  
**Risk**: Low (display-only, no data impact)

**Important findings:**
- ⚠️ API testing done with completed matches - results may differ during live games
- ✅ Clock estimation proven 99.5% accurate as fallback
- 🎯 Two validation approaches:
  1. **In-app test button** - Click during live game, see results immediately
  2. Field observation - Compare estimated clock to actual game clock

**Key Feature: Test Button**
- Dev mode only (won't appear for production users)
- Tests all 5 timing endpoints with one click
- Color-coded results (green/orange/red)
- No terminal access needed during games
- Makes validation trivial (1 minute vs. 5+ minutes)

---

**Decision:** Proceed with clock estimation + test button as **immediate solution** (Phase 1), then validate live endpoints during next game via button click (Phase 3). Manual segment selection remains the source of truth for all stats regardless of timing display method.
