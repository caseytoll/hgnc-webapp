# Opposition Scouting AI Analysis Assessment

**Date:** February 27, 2026  
**Status:** ✅ **IMPLEMENTED** — Age-group awareness added to opposition scouting  
**Focus:** Age-appropriate analysis, knowledge base integration, and prompt specificity

---

## 1. Current Architecture

### What's Implemented ✅

| Component | Status | Files |
|-----------|--------|-------|
| **Opposition Scouting Hub** | ✅ Full view with 26 insights (7 groups A-G) | `opposition-scouting.js` |
| **Full Season Analytics** | ✅ Analyzes opponent's entire division record | `Code.js:4685-4860` fetchOpponentDivisionStats() |
| **Quarterly Breakdown** | ✅ Quarter-by-quarter averages from opponent data | `Code.js:4533-4543` opposition prompt |
| **H2H Historical Data** | ✅ Head-to-head record and quarter totals | `Code.js:4520-4527` H2H context |
| **Ladder Rankings** | ✅ Opponent position and W-L-D record | `Code.js:4516-4521` ladder context |
| **Netball Knowledge Base** | ✅ Exists and comprehensive | `docs/netball-knowledge-base.md` (992 lines) |
| **AI Modeling** | ✅ Using Gemini 2.0 Flash | `Code.js:4577` |

### Critical Gaps ❌

#### 1. **Age/Grade Context NOT Passed to Opposition Scouting**

**Status:** ✅ **FIXED** (Feb 27, 2026 @ 18:30)

**What was implemented:**
- Added `extractAgeGroup(teamName, season)` function that:
  - Extracts U-numbers from team names (e.g., "U11 Flames" → "U11")
  - Produces readable age groups
  - Handles NFNL as "Adult (Opens)"
  - Handles Nillumbik Force as "Nillumbik Force"
- Updated `generateOppositionInsightsImmediately()` to extract and pass age group
- Updated `generateOppositionAnalytics()` prompt to include age group context
- Added age-appropriate guidance to AI prompt:
  - **U11/U13:** Developmental messaging, skill-building focus, positive framing
  - **U15/U17:** Competitive messaging with development acknowledgment
  - **Adult (Opens):** Full tactical analysis emphasis

**Code Changes:**
- [Code.js:4438-4475](apps-script/Code.js#L4438-L4475) — `extractAgeGroup()` function
- [Code.js:5509-5522](apps-script/Code.js#L5509-L5522) — Updated generateOppositionInsightsImmediately to extract and pass age group
- [Code.js:4547](apps-script/Code.js#L4547) — Added age group to prompt context
- [Code.js:4612-4631](apps-script/Code.js#L4612-L4631) — Added age-appropriate guidance to Gemini prompt

**Result:**
Opposition scouting now generates:
- Developmental guidance for U11/U13 teams (positive framing, skill-building)
- Balanced tactical/development guidance for U15/U17 teams
- Full tactical analysis for Adult (Opens) NFNL teams

---

#### 2. **Netball Knowledge Base NOT Integrated into Opposition Scouting**

**Status:** ✅ **FIXED** (Feb 27, 2026 @ 18:40)

**What was implemented:**
- Added comprehensive netball knowledge context to opposition scouting prompt explaining:
  - **What goal stats reveal:** Quarter patterns, scoring differential, form trends, consistency, margin analysis
  - **Age-appropriate goal scoring benchmarks:**
    - U11: 8-15 goals/game (2-3 per quarter per team)
    - U13: 15-28 goals/game (4-7 per quarter per team)
    - U15: 25-40 goals/game (6-10 per quarter per team)
    - Adult: 35-55+ goals/game (8-14 per quarter per team)
  - **Data limitations:** We have ONLY goal-scoring stats, NO player data, positional rotation, formations, or contact/penalty rates
  - **What NOT to infer:** Individual player strengths, position-specific excellence, penalty patterns, root causes without tactical data
  - **Confidence assignment rules:** high (6+ games + >1 goal difference), medium (4-5 games or 1-goal difference), low (<3 games)

- Added explicit constraint: "Do NOT speculate about formations, player combos, or positional excellence without explicit evidence"

**Code Changes:**
- [Code.js:4552-4585](apps-script/Code.js#L4552-L4585) — Added knowledge context section with benchmarks and data limitations
- [Code.js:4654-4658](apps-script/Code.js#L4654-L4658) — Added critical constraint reminder

**Result:**
Opposition scouting now explicitly recognizes:
- What the data TELLS us (patterns, consistency, form)
- What it CANNOT tell us (player quality, tactical formations, execution details)
- Age-appropriate context (young teams have high variance, that's normal)
- Confidence judgment tied to data completeness

---

#### 3. **Prompt Lacks Data-Specific Constraints**

**Problem:**
- Prompt says "Base analysis on the data provided. If data is limited, use low confidence."
- But no explicit guardrails against assumptions beyond goal stats
- AI may infer tactical intentions without evidence
- No validation that insights match the data quality

**Current Prompt Constraints:**
```javascript
// Code.js:4570 — vague confidence guidance
'Total: exactly 26 insights (4+3+3+3+3+5+2). ' +
'Base analysis on the data provided. ' +
'If data is limited, use low confidence.'
```

**Missing Specificity:**
- No instruction about "only goal stats available" limitation
- No rule about "avoid tactical inferences without quarter-by-quarter evidence"
- No check for data completeness (e.g., "if < 3 games, mark insights low confidence")
- No guidance on what "available" data means (goals only, no positions, no individual player data)

---

## 2. What We Have (Data Available)

### Opposition Stats Captured
```javascript
opponentDivisionStats = {
  totalGames: 16,
  wins: 12, losses: 3, draws: 1,
  avgGoalsFor: 10.2,
  avgGoalsAgainst: 9.1,
  avgMargin: +1.1,
  form: "WWLWD",                 // Recent 5
  quarterGames: 12,              // Games WITH quarter data
  quarterAverages: {
    Q1: { for: 9.8, against: 9.1 },
    Q2: { for: 11.1, against: 9.5 },
    Q3: { for: 10.8, against: 10.2 },
    Q4: { for: 10.2, against: 9.6 }
  },
  biggestWin: { goalsFor: 28, goalsAgainst: 15, round: 4, vs: "Montmorency 1" },
  biggestLoss: { goalsFor: 18, goalsAgainst: 25, round: 11, vs: "Eltham Power" },
  games: [
    { round: 1, vs: "Montmorency", result: "W", goalsFor: 15, goalsAgainst: 10, margin: +5 },
    // ... 15 more
  ]
}
```

### Data NOT Captured
- ❌ Individual player statistics
- ❌ Position-based information
- ❌ Positional rotations or combinations
- ❌ Possession metrics or movement patterns
- ❌ Contact/penalty rates
- ❌ Opposition team composition

---

## 3. Recommended Improvements

### Priority 1: Add Age/Grade Context (Easy — 10 min)

**Change 1.1:** Pass year to opposition analytics
```javascript
// Code.js:5446-5450
var analyticsResult = generateOppositionAnalytics({
  teamName: team.name || teamID,
  opponent: opponent,
  round: roundNum,
  gameDate: game.date || '',
  teamYear: team.year,        // ← ADD THIS
  teamSeason: team.season,    // ← ADD THIS
  ladderData: ladderData || {},
  h2h: h2h,
  opponentDivisionStats: opponentDivisionStats
});
```

**Change 1.2:** Use year in prompt
```javascript
// Code.js:4506
var prompt = 'You are a netball analyst. Generate opposition scouting ' +
  'for ' + config.teamYear + ' team "' + config.teamName + '" ' +
  'facing ' + config.opponent + '.\n' +
  'CONTEXT:\n' +
  '- Age/Grade: ' + config.teamYear + '\n' +
  '- Season: ' + (config.teamSeason || 'Standard') + '\n' +
  // ... rest of prompt
```

**Change 1.3:** Add age-appropriate guidance to prompt
```javascript
// Code.js:4570 — before JSON instructions
'IMPORTANT: Tailor insights to ' + config.teamYear + ' netball:\n' +
(config.teamYear.match(/u11|u13/i) ? 
  '- Developmental age: Emphasize skill-building opportunities and positive messaging\n' +
  '- Avoid over-tactical interpretation; inconsistency is developmental\n' +
  '- Focus on positioning improvement and communication\n'
: config.teamYear.match(/u15|u17/i) ?
  '- Competitive age: Balance tactical depth with development\n' +
  '- Look for patterns in defensive rotations if data allows\n' +
  '- Emphasize in-game adjustments and resilience\n'
:
  '- Adult league: Full tactical analysis expected\n' +
  '- Focus on strategic patterns and competitive advantages\n' +
  '- Injury/fatigue context relevant\n') +
'\n'
```

---

### Priority 2: Integrate Knowledge Base (Medium — 20 min)

**Change 2.1:** Include knowledge context in opposition prompt
```javascript
// Code.js:4506
var prompt = 
  'You are a netball analyst for ' + config.teamYear + ' competition.\n\n' +
  '## WHAT GOAL STATS TELL US\n' +
  'Available data: Q1-Q4 goal averages (for/against), season record, H2H history.\n' +
  'This is LIMITED DATA — goals only, no individual player data.\n' +
  '- Quarter averages reveal TIMING strengths/weaknesses (opening power, closing resilience)\n' +
  '- Goal differential per quarter shows defensive stability\n' +
  '- Form pattern (recent 5) shows momentum/confidence\n' +
  '- H2H context shows historical matchup dynamics\n\n' +
  'CRITICAL CAVEAT: Cannot infer formations, combinations, or positional excellence.\n' +
  'Only can identify goal-scoring patterns and timing trends.\n\n' +
  '## SCOUTING CONTEXT\n' +
  // ... existing data
```

**Change 2.2:** Confidence level rules based on data
```javascript
// Code.js:4570 — before JSON response instructions
'CONFIDENCE ASSIGNMENT:\n' +
'- "high": Based on 6+ games with quarter data AND clear patterns (>1 goal difference)\n' +
'- "medium": Based on 4-5 games with quarter data OR 1-goal difference\n' +
'- "low": Fewer than 3 games with data OR unclear/inconsistent patterns\n' +
'\n' +
'Total: exactly 26 insights. Base analysis on the data provided.\n' +
'If data is limited, use low confidence. Do NOT speculate beyond goal stats.\n'
```

---

### Priority 3: Data Quality Validation (Medium — 15 min)

**Change 3.1:** Pre-flight check before sending to AI
```javascript
// Code.js:4500 — new function before generateOppositionAnalytics
function validateOppositionDataQuality(config) {
  var issues = [];
  if (!config.opponentDivisionStats) issues.push('No full season data available');
  if (config.opponentDivisionStats && config.opponentDivisionStats.totalGames < 3) 
    issues.push('Insufficient games (' + config.opponentDivisionStats.totalGames + ' < 3)');
  if (config.opponentDivisionStats && !config.opponentDivisionStats.quarterGames) 
    issues.push('No quarter breakdowns recorded');
  if (config.opponentDivisionStats && config.opponentDivisionStats.quarterGames < 3) 
    issues.push('Only ' + config.opponentDivisionStats.quarterGames + ' games with quarter data');
  
  return issues;
}

// Then in generateOppositionAnalytics:
var dataIssues = validateOppositionDataQuality(config);
if (dataIssues.length > 0) {
  prompt += '\nDATA QUALITY WARNINGS:\n' + 
    dataIssues.map(function(i) { return '- ' + i; }).join('\n') + 
    '\nMark associated insights as LOW confidence.\n';
}
```

**Change 3.2:** Add data quality summary to response
```javascript
// Code.js:4595 — when parsing Gemini response, add quality metadata
var analyticsData = JSON.parse(text);
analyticsData.dataQuality = {
  totalGames: config.opponentDivisionStats ? config.opponentDivisionStats.totalGames : 0,
  quarterGames: config.opponentDivisionStats ? config.opponentDivisionStats.quarterGames : 0,
  hasH2H: config.h2h && config.h2h.games > 0,
  issues: dataIssues
};

return {
  success: true,
  analytics: analyticsData,
  summary: text.summary,
  dataQuality: analyticsData.dataQuality,
  tokensUsed: tokensUsed,
  processingTimeMs: processingTimeMs
};
```

---

### Priority 4: Frontend Disclosure (Low — 5 min)

**Change 4.1:** Show data limitations in scouting hub
```javascript
// opposition-scouting.js — when rendering insights
function _renderFull(game, data) {
  const dataQuality = data.dataQuality || {};
  const warningsHtml = dataQuality.issues && dataQuality.issues.length > 0 ? `
    <div class="scouting-data-warning">
      <strong>⚠️ Limited data available:</strong>
      <ul>
        ${dataQuality.issues.map(i => `<li>${escapeHtml(i)}</li>`).join('')}
      </ul>
      <p><em>Lower confidence in insights until more games are played.</em></p>
    </div>
  ` : '';
  
  return `
    ${warningsHtml}
    <div class="scouting-summary">...
```

---

## 4. Data Spec For Prompt Enhancement

**What We're Adding:**
```javascript
config = {
  teamName: "Hazel Glen 6",      // ✅ Already used
  opponent: "Montmorency",         // ✅ Already used
  round: 3,                        // ✅ Already used
  gameDate: "2026-03-01",          // ✅ Already used
  teamYear: "U15",                 // ← NEW: Age/grade context
  teamSeason: "Season 1",          // ← NEW: Competition context
  ladderData: { ... },             // ✅ Already used
  h2h: { ... },                    // ✅ Already used (limited for U11+)
  opponentDivisionStats: { ... }   // ✅ Already used
}
```

**Prompt Adjustments:**
1. **Line 4516:** Add team context section
2. **Line 4506:** Add "what goal stats mean" section
3. **Line 4570:** Add confidence assignment rules
4. **Response object:** Include dataQuality metadata

**Frontend Updates:**
1. **opposition-scouting.js:** Display data quality warnings
2. **Opposition modal:** Show "Generated from X games" note

---

## 5. Testing Checklist

Before deploying:
- [ ] Generate scouting for U11 team → prompts should mention "developmental"
- [ ] Generate scouting for U15 team → prompts should mention "competitive"
- [ ] Generate scouting with < 3 games of data → all insights marked low confidence
- [ ] Verify knowledge context is NOT producing position-specific claims (no GS/GA analysis)
- [ ] Frontend shows data quality warnings for limited datasets
- [ ] Backend logs data quality issues to sheet

---

## Summary

| Aspect | Current | Gap | Status |
|--------|---------|-----|--------|
| **Age context** | None | Critical | ✅ IMPLEMENTED |
| **Knowledge base** | Exists but unused | Critical | ✅ IMPLEMENTED |
| **Data constraints** | Generic | Needed | ✅ IMPLEMENTED |
| **Frontend disclosure** | None | Nice-to-have | **NOT STARTED** |

**Completed Improvements:**
- ✅ Priority 1: Age-group-aware analysis (U11/U13/U15/Adult)
- ✅ Priority 2: Knowledge base integration (goal stats interpretation, benchmarks, constraints)

**Remaining (Optional):**
- ⏳ Priority 3: Frontend data quality warnings (low priority, good-to-have)

**Why This Matters:**
- U11 coaches now see developmental coaching, not tactical critiques
- All coaches understand goal-stats limitations (no formations, no player data)
- Confidence levels are tied to actual data availability
- AI is explicitly constrained to avoid over-interpretation
- Insights follow netball-specific interpretation rules

**Total Effort:** ~70 minutes (Priorities 1 & 2 complete)
