# Opponent Difficulty Rating — Implementation Plan

## Overview

Add opponent difficulty context by cross-referencing game opponents against cached ladder data. **Zero new API calls** — all data already exists in localStorage from ladder/fixture sync.

**~190 lines across 3 files. Coach-app only (parent portal has no ladder data).**

---

## Changes

### 1. Utility Functions (`app.js`, after `fuzzyOpponentMatch()` ~line 1126)

**`getOpponentDifficulty(opponentName)`** — Reads ladder from localStorage (`ladder.cache.{teamID}`), fuzzy-matches opponent name to ladder row, returns `{ position, totalTeams, tier, label }` or `null`.

- Tiers: `top` (top 25%), `mid` (middle 50%), `bottom` (bottom 25%)
- Label: ordinal position e.g. "1st", "5th", "10th"
- Uses existing `fuzzyOpponentMatch()` for name matching
- Returns `null` gracefully when no ladder data, opponent not found, or cache corrupt

**`ordinalSuffix(n)`** — Returns "st", "nd", "rd", "th".

**`calculateStrengthOfSchedule()`** — Averages opponent ladder positions across completed games. Returns `{ rating (1-100), label, opponents[] }` or `null`.

- Formula: `(totalTeams - avgPosition) / (totalTeams - 1) * 100`
- Labels: >= 70 "Tough", >= 40 "Average", < 40 "Easy"
- In a 10-team ladder: opponents averaging 3rd = 78 (Tough), averaging 7th = 33 (Easy)

### 2. Game List Badges (`renderSchedule()` ~line 1850)

Small colored pill badge after opponent name showing their ladder position:

```
R5  vs Kilmore 1st     25 - 18 ✓
R6  vs Eltham  8th     30 - 12
```

- Red = top of ladder (hard), amber = mid, green = bottom (easier)
- Only shown when ladder data exists and opponent found
- Title attribute shows "5th of 10" on hover
- Skipped for bye games

### 3. Strength of Schedule Card (`renderStatsOverview()` ~line 2073)

New metric card in the stats-metrics-grid (after Form, Best Quarter, Avg Scored, Avg Conceded):

```
Schedule
  72/100
  Tough
```

- Clickable — opens modal with per-opponent breakdown (W/L badge + opponent name + rank badge)
- Hidden entirely when no ladder data available
- `showSoSDetail()` window handler for the modal

### 4. AI Insights Enhancement

**Frontend (`fetchAIInsights()` ~line 2235):** Add `opponentRank` ("3/10") per game result in payload, plus `strengthOfSchedule` summary object. Both `null`-safe — omitted when no ladder data.

**Backend (`Code.js`, `getAIInsightsWithAnalytics()`):** Include rank in game results prompt line:
```
R5 vs Kilmore [opp ranked 1/10]: 25-18 (W, +7)
```
Plus "STRENGTH OF SCHEDULE" section so Gemini can contextualise wins/losses.

### 5. CSS (`styles.css`)

```css
.opp-rank          /* pill badge: inline-block, 0.65rem, border-radius: 8px */
.opp-rank-top      /* red: --error-light bg, --error text */
.opp-rank-mid      /* amber: --warning-light bg */
.opp-rank-bottom   /* green: --success-light bg */
.sos-max           /* "/100" suffix styling */
/* + dark theme overrides for all three tiers */
```

---

## Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| No ladder data (no fixture config) | No badges, no SoS card, AI payload unchanged |
| Opponent not in ladder | That game gets no badge, excluded from SoS (modal shows "X of Y matched") |
| Stale ladder cache | Still used — positions don't change often |
| Bye/abandoned games | Excluded from badges and SoS calculation |

---

## Files Modified

| File | What | ~Lines |
|------|------|--------|
| `apps/coach-app/src/js/app.js` | Utility functions, renderSchedule badge, renderStatsOverview card, showSoSDetail modal, fetchAIInsights payload | ~140 |
| `apps/coach-app/src/css/styles.css` | `.opp-rank` badge styles + dark theme, `.sos-max` | ~40 |
| `apps-script/Code.js` | Opponent rank in AI prompt, SoS prompt section | ~12 |

---

## Implementation Order

1. Add utility functions (`getOpponentDifficulty`, `ordinalSuffix`, `calculateStrengthOfSchedule`)
2. Add CSS for `.opp-rank` badges and `.sos-max`
3. Modify `renderSchedule()` — difficulty badges on game items
4. Modify `renderStatsOverview()` — SoS metric card
5. Add `showSoSDetail()` — modal breakdown
6. Modify `fetchAIInsights()` — opponent context in payload
7. Modify `getAIInsightsWithAnalytics()` in Code.js — opponent rank in prompt
8. Test with team that has ladder data + team without (verify fallback)
