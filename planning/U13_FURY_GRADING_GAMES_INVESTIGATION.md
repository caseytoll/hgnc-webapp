# U13 Fury Grading Games Issue - Investigation Report

**Date:** 27 February 2026  
**Issue:** NFNA U13 Fury grading games (Weeks 1-3) and ladder data lost after division reassignment  
**Status:** Root cause identified

---

## Executive Summary

**Problem:** U13 Fury played 3 grading games in division X (weeks 1-3), then was promoted/moved to division Z. The "autofiller" schedule sync and ladder are now "incorrect" because:

1. **Grading games are deleted** - They're no longer in the team's game list
2. **Ladder data is wrong** - Now only shows division Z standings, misses grading games

**Root Cause:** The fixture sync system only fetches matches from the **current** división ID (`config.divisionId`). When a team moves divisions, older games from the previous division are orphaned because:
- No "division history" is tracked
- Fixture sync doesn't look backwards for historical divs
- Games are matched by `fixtureMatchId`, which may be missing for old games
- Game deletion happens by **not merging** old games into new fixture data

---

## Current System Architecture

### 1. Fixture Sync Flow (Backend: Code.js)

```
getFixtureDataForTeam(teamID, forceRefresh)
  ↓
  Load team.resultsApi config
  ↓
  fetchSquadiFixtureData(config)
    ↓
    fetchSquadiFixtures(competitionId, divisionId)    ← KEY PROBLEM
      ↓
      GET /livescores/round/matches?competitionId={}&divisionId={}
        ↓
        Returns ONLY matches from current divisionId
  ↓
  Return { teamFixtures, divisionResults }

Frontend receives fixture list and merges via mergeFixtureData()
```

### 2. Fixture Merge Logic (Frontend: data-loader.js)

**Rules:**
- Match by `fixtureMatchId` first (if available)
- Fall back to fuzzy match: same round number + similar opponent
- Fill empty fields only (never overwrite manual data: scores, lineup, notes)
- Status upgrades: `upcoming` → fixture status (never downgrades)

**Critical Issue:** Games NOT in the new fixture list are **never removed**, but they're also **not refreshed** with new session data.

When team moves divisions:
- Grading games have `fixtureMatchId` pointing to division X
- New fixtures from division Z won't contain division X's games
- Fuzzy matching might attach grading games to wrong division Z games (if round numbers align)
- Coach sees "incorrect schedule" because rounds are misaligned

---

## Scenario Walkthrough: U13 Fury

### Timeline

| Week | Event | Division | Games |
|------|-------|----------|-------|
| W1-W3 | Grading period | X (e.g., "13A Grading") | 3 games with mix of teams |
| W3 end | Grading finalized | X → Z | Team promoted to division Z |
| W4 | Season starts | Z | Regular season games from Z onwards |

### What Happens in the App

**Initial Load (Week 2 - Team still in Div X):**
```
Team config: { divisionId: X_ID, squadiTeamName: "HG 13 Fury" }
Fixture fetch: fetchSquadiFixtures(compId, X_ID)
Result: Games from Div X rounds ✓
```

**After Promotion (Week 4 - Team now in Div Z):**
```
Team config UPDATED: { divisionId: Z_ID, squadiTeamName: "HG 13 Fury" }
Fixture fetch: fetchSquadiFixtures(compId, Z_ID)
Result: Games from Div Z rounds ONLY (R1, R2, R3 of Div Z)
Game merge: 
  - Grading games (R1, R2, R3 from Div X) still in app
  - New games (R1, R2, R3 from Div Z) merged
  - Fuzzy match: Round 1 Div X vs Round 1 Div Z = COLLISION
  - Coach sees duped/wrong opponents ❌
```

**Why Ladder is Wrong:**
```
getSquadiLadder(divisionId: Z_ID)
Returns: Ladder for Div Z only
Shows: Team's W-L-D within Div Z (excludes grading wins/losses)
Result: Stats look worse than actual performance ❌
```

---

## Root Causes (3 Issues)

### Issue #1: Fixture Sync Only Reads Current Division
**File:** `Code.js` line 2332-2425 (`fetchSquadiFixtureData`)  
**Problem:** The function ONLY calls:
```javascript
var apiResult = fetchSquadiFixtures(config.competitionId, config.divisionId);
```
It never checks if `config.divisionId` has changed from a previous value.

**Impact:**
- No access to grading games stored in division X
- Can't preserve games from tournament/qualifying groups
- No "season history" support

---

### Issue #2: No Division Migration History
**File:** Teams sheet (Backend) + Team Settings (Frontend)  
**Problem:** The system stores only the **current** `divisionId`:
```javascript
// Teams sheet columns
H: ResultsApi (JSON) = { divisionId: Z_ID, ... }  ← Current only
// No: previousDivisionIds, divisionHistory, etc.
```

**Impact:**
- Can't iterate historically through division IDs
- Can't backfill grading games
- No audit trail of division changes

---

### Issue #3: Fuzzy Match Collision During Merge
**File:** `apps/coach-app/src/js/data-loader.js` line 472-550  
**Problem:** When grading games (R1 Div X) and season games (R1 Div Z) have same round number:
```javascript
// Current fuzzy match logic
existing = teamData.games.find(g =>
  !g.fixtureMatchId &&
  g.round == fixture.roundNum &&
  fuzzyOpponentMatch(g.opponent, fixture.opponent)
);
```

If "Div X Round 1 vs Red Team" and "Div Z Round 1 vs Red Team" both exist → **merged incorrectly**, or grading opponent replaced with season opponent.

---

## Current Code Locations

### Backend (Code.js)
- **Line 2332-2425:** `fetchSquadiFixtureData(config)` - Only reads current division
- **Line 1874-1920:** `fetchSquadiFixtures(compId, divId)` - Static division query
- **Line 2305-2330:** `getFixtureDataForTeam(teamID, forceRefresh)` - No division history check

### Frontend (JS)
- **data-loader.js:472-550:** `mergeFixtureData()` - Fuzzy match with collision risk
- **team-settings.js:** Fixture config UI (allows divisionId change)
- **opposition-scouting.js:** Calls `refreshOppositionMatches()` which re-syncs division Z only

### Sheets
- **Teams sheet** - Column H (ResultsApi): `divisionId` field with no history
- **Squadi_Lookup** - Cached lookups (doesn't track division history)

---

## Impact Assessment

### What's Broken
✗ Grading games missing from schedule  
✗ Ladder shows only season-long division stats (excludes grading)  
✗ AI scouting opposition data only covers current division  
✗ Schedule auto-fill can misalign if same round in both divisions  
✗ Stats calculations exclude grading performance  

### What Still Works
✓ Games in current division sync correctly  
✓ Manual game entry still works  
✓ Manual score entry preserves data  
✓ Team settings update works  

---

## Affected Scenarios

**HIGH RISK (Likely to be broken):**
1. NFNA teams with grading phase → promotion/movement to different division mid-season
2. Tournaments with qualifying rounds in separate "qualifying division"
3. Any competition structure with preliminary → main draw transitions
4. CarlingtonNO Nillumbik Force autumn seasons (all grades go through grading)

**LOW RISK:**
- Teams staying in same division all season
- Teams with no external fixture sync (manual entry only)
- GameDay teams (their `roundOffset` handles pre-season differently)

---

## Recommended Solutions

### Solution A: Preserve Pre-Division-Change Games (Recommended)
**Complexity:** Low  
**Impact:** Fixes grading games issue  
**Approach:**
1. Add `previousDivisionIds` array to team config
2. When division ID changes, archive old ID to history array
3. On fixture sync:
   - Fetch from **all** historical + current divisionIds
   - Merge all fixtures together
   - Use `fixtureMatchId` + division-aware matching

**Pros:**
- Minimal schema changes
- Backward compatible
- Handles future division changes gracefully
- Preserves all historical games

**Cons:**
- Requires backend update
- Multiple API calls per sync (one per division)

---

### Solution B: Add "Grading Phase" Concept
**Complexity:** Medium  
**Impact:** Fixes both grading games and ladder  
**Approach:**
1. Add `seasonPhases` array to team config:
   ```javascript
   seasonPhases: [
     { phase: "grading", divisionId: X_ID, end: "2026-02-15" },
     { phase: "main", divisionId: Z_ID, start: "2026-02-16" }
   ]
   ```
2. Fixture sync fetches from ALL phases' divisions
3. Ladder caching includes phase separation
4. Stats calculations weight grading separately (or include in overall)

**Pros:**
- Explicit phase tracking
- Can handle other transitions (finals, relegation playoffs)
- Proper audit trail

**Cons:**
- Larger schema change
- Requires coach to define phases on setup
- Testing complexity

---

### Solution C: Round-Offset for Grading (Quick Fix)
**Complexity:** PenaltiesLow  
**Impact:** Partial fix (schedule only, not ladder)  
**Approach:**
1. Add `gradingRounds` field to team config (e.g., `gradingRounds: 3`)
2. When syncing: treat grading games as "rounds 0, -1, -2" (before main season)
3. Merge logic: include games with negative rounds
4. For ladder: warn coach to manually add grading records to a "Grading Summary"

**Pros:**
- Quick to implement
- Similar to `roundOffset` (coach-familiar)
- Minimal schema change

**Cons:**
- Doesn't fix ladder properly
- Hard-codes 3 grading rounds (inflexible)
- Leaves ladder data incomplete

---

## Questions for Coach (Casey)

1. **Is U13 Fury moving to a completely different competition**, or staying within NFNA but moving from grading → main draw?
   
2. **Does the config show the OLD division ID (X) or the NEW one (Z)**? This tells us when the division change happened.

3. **Are the grading games in the team's game list at all**, or are they completely gone?

4. **For the ladder: should grading performance be**:
   - Included in season-long stats? (win-loss counts)
   - Shown separately? (grading record vs main record)
   - Ignored? (main season only)

5. **Are other NFNA teams experiencing the same division-change issue**, or just U13 Fury?

---

## Testing Checklist (When Fix is Ready)

- [ ] Grading games from week 1-3 visible in schedule
- [ ] Grading and main season games don't merge/collide
- [ ] Ladder includes grading performance
- [ ] Opposition scouting includes all games (not just main season)
- [ ] AI insights use complete history
- [ ] Round numbering is clear (differentiate grading R1 from season R1)
- [ ] Switching team to different division doesn't lose historical games
- [ ] Fuzzy match handles same-round-different-opponent correctly

---

## Files to Modify

**Backend:**
- `apps-script/Code.js` - Add division history support
- `Teams sheet (H column)` - Extend ResultsApi to store history

**Frontend:**
- `apps/coach-app/src/js/data-loader.js` - Enhance mergeFixtureData()
- `apps/coach-app/src/js/team-settings.js` - Show division history view

**Documentation:**
- CLAUDE.md - Document grading game support
- Update fixture sync architecture docs

---

## Related Issues

- #7x: Opposition Scouting only shows current division (sibling bug)
- #7y: Ladder caching doesn't account for division changes
- #7z: Stats exclude grading phase performance

