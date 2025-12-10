# TASKS TO FIX TODAY'S BUGS - Prioritized List

**Created:** December 9, 2025
**Status:** Ready for next session
**Estimated Time:** 1-2 hours total

---

## CRITICAL TASKS (MUST FIX)

### Task 1: Fix Back Button Navigation ⏱️ 5 MINUTES
**Severity:** HIGH - User cannot navigate back from lineup views
**Cause:** Using `?view=insights` query param, but app only recognizes `#insights-view` hash routing
**Status:** Identified, quick fix ready

**Steps to Fix:**
1. Open `/Users/casey-work/HGNC WebApp/hgnc-webapp/lineup.html`
2. Find 3 back buttons (lines 50, 70, 90)
3. Change each from:
   ```html
   <button onclick="window.location.href=window.APP_URL + '?view=insights'">← Back</button>
   ```
   To:
   ```html
   <button onclick="window.location.href=window.APP_URL + '#insights-view'">← Back</button>
   ```
4. Save file
5. Run:
   ```bash
   cd /Users/casey-work/HGNC\ WebApp/hgnc-webapp
   git add lineup.html
   git commit -m "v944: Fix back button to use hash routing"
   clasp push --force
   clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v944 - Back button hash routing fix"
   ```
6. Test:
   - Open app
   - Select team
   - Go to Insights
   - Click "Defensive Units"
   - Click "← Back"
   - Should return to Insights dashboard with team still selected ✓

**Success Criteria:**
- [ ] Back button click navigates to Insights view
- [ ] Team selection is preserved
- [ ] No console errors
- [ ] URL shows `#insights-view` after clicking back

---

### Task 2: Debug Empty Lineup Stats ⏱️ 30 MINUTES
**Severity:** HIGH - Core feature not working
**Symptom:** Tables render but show "No data available" with empty stats objects
**Console Shows:** `{defensiveUnitStats: {}, attackingUnitStats: {}, positionPairingStats: {}}`
**Root Cause:** Unknown - need to diagnose if data is missing or structure mismatches

**Investigation Steps:**

#### Step 2A: Check if Games Have Lineup Data (5 min)
1. Open app in browser
2. Select a team
3. Open Developer Console (F12)
4. Run:
   ```javascript
   console.log('Total games:', window.games.length);
   console.log('First game:', window.games[0]);
   console.log('Game 0 has lineup?', window.games[0].lineup);
   ```
5. **Look for:**
   - Does output show `lineup: [...]` ?
   - Or does it show `lineup: undefined` ?
   - Or does it show `lineup: []` (empty array)?

**If `lineup` doesn't exist or is empty:**
   - Games don't have lineup data yet
   - This is expected - user hasn't entered lineup info
   - Proceed to Task 3 (create sample data)

**If `lineup` exists with data:**
   - Proceed to Step 2B

#### Step 2B: Check Lineup Data Structure (5 min)
1. In console, check first quarter:
   ```javascript
   if (window.games[0] && window.games[0].lineup && window.games[0].lineup[0]) {
     console.log('Q1 data:', JSON.stringify(window.games[0].lineup[0], null, 2));
   }
   ```

2. **Look for these properties:**
   - `positions`: Object with player names
   - `ourScore`: Number (your team's score)
   - `opponentScore`: Number (opponent's score)
   
3. **Look for these position keys:**
   - For defensive units: `GK`, `GD`, `WD`, `C`
   - For attacking units: `GS`, `GA`, `WA`, `C`

**If you see:**
   ```json
   {
     "quarter": 1,
     "positions": {
       "GK": "Alice",
       "GD": "Bob",
       "WD": "Charlie",
       "C": "Diana"
     },
     "ourScore": 15,
     "opponentScore": 12
   }
   ```
   → **Structure is CORRECT, proceed to Step 2C**

**If you see different property names:**
   - Update calculation functions in Code.js to match actual names
   - Update quarterProperty names
   - Redeploy

#### Step 2C: Add Logging to Server Function (5 min)
1. Open `Code.js`
2. Find `function getLineupStats(sheetName)` at line 1342
3. Add logging after line 1352 (after `var games = teamData.games || [];`):
   ```javascript
   // ADD THIS LOGGING:
   Logger.log('[getLineupStats] Sheet: ' + sheetName);
   Logger.log('[getLineupStats] Games count: ' + games.length);
   
   if (games.length > 0) {
     Logger.log('[getLineupStats] Game 0 has lineup: ' + (games[0].lineup ? 'YES' : 'NO'));
     if (games[0].lineup && games[0].lineup.length > 0) {
       Logger.log('[getLineupStats] First quarter positions: ' + JSON.stringify(games[0].lineup[0].positions));
     }
   }
   ```
4. Save and deploy:
   ```bash
   clasp push --force
   clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "v944 - Add lineup stats debug logging"
   ```
5. Hard refresh browser (Cmd+Shift+R)
6. Go to Insights > click "Defensive Units"
7. Check logs:
   ```bash
   clasp logs --limit 10
   ```

**Analyze Logs:**
- If `Games count: 0` → Games aren't loading, check data sheet
- If `Game 0 has lineup: NO` → Games don't have lineup property, need to add data
- If `First quarter positions: undefined` → positions property missing or misspelled
- If positions show → Structure mismatch, compare to calculation expectations

#### Step 2D: Based on Findings
- **If missing lineup data:** Proceed to Task 3
- **If structure mismatch:** Update calculations in Code.js to match
- **If positions but still empty:** Check if all 4 required positions exist (GK, GD, WD, C)

**Success Criteria:**
- [ ] Understand why stats are empty
- [ ] Either: (a) confirmed missing data, or (b) identified code issue
- [ ] Logged findings in new task if code fix needed

---

### Task 3: Add Sample Lineup Data (If Needed) ⏱️ 15 MINUTES
**Only Do This If:** Task 2 shows games don't have `lineup` property
**Purpose:** Populate test data so stats can render and be verified

**Steps:**
1. Open Google Sheets (the team's data sheet)
2. Click on the data cell (usually A1)
3. Find the `games` array in the JSON
4. Add `lineup` array to first game:

```json
{
  "id": "game_1",
  "opponent": "Eltham Lions",
  "result": "W",
  "ourScore": 52,
  "opponentScore": 48,
  "lineup": [
    {
      "quarter": 1,
      "positions": {
        "GK": "Alice",
        "GD": "Bob",
        "WD": "Charlie",
        "C": "Diana"
      },
      "ourScore": 15,
      "opponentScore": 12
    },
    {
      "quarter": 2,
      "positions": {
        "GK": "Alice",
        "GD": "Eve",
        "WD": "Charlie",
        "C": "Diana"
      },
      "ourScore": 12,
      "opponentScore": 10
    },
    {
      "quarter": 3,
      "positions": {
        "GK": "Alice",
        "GD": "Bob",
        "WD": "Frank",
        "C": "Diana"
      },
      "ourScore": 15,
      "opponentScore": 15
    },
    {
      "quarter": 4,
      "positions": {
        "GK": "Grace",
        "GD": "Bob",
        "WD": "Charlie",
        "C": "Diana"
      },
      "ourScore": 10,
      "opponentScore": 11
    }
  ]
}
```

5. Save and go back to app
6. Hard refresh browser
7. Go to Insights > click "Defensive Units"
8. Should see table with data now

**Success Criteria:**
- [ ] Sample data added to at least 2 games
- [ ] Lineup tables show data (not "No data available")
- [ ] Can see player combinations and +/- statistics

---

## SECONDARY TASKS (SHOULD FIX)

### Task 4: Test Attacking Units View ⏱️ 5 MINUTES
**Purpose:** Verify second lineup view works correctly

1. Go to Insights > Attacking Units
2. Should see similar table with GS, GA, WA, C positions
3. If table appears but is empty:
   - Same issue as Task 2, debugging already done
   - Data structure is confirmed valid
4. If table doesn't appear or errors:
   - Check browser console for errors
   - Verify view HTML exists in lineup.html

**Success Criteria:**
- [ ] View loads without errors
- [ ] If data exists, table renders with attacking unit combinations

---

### Task 5: Test Position Pairings View ⏱️ 5 MINUTES
**Purpose:** Verify third lineup view works

1. Go to Insights > Position Pairings
2. Should see grouped tables (Defensive Pairs, Attacking Pairs, Transition Pairs)
3. Same debugging as Tasks 2 and 4 if needed

**Success Criteria:**
- [ ] View loads without errors
- [ ] Tables render with player pair statistics

---

## DOCUMENTATION TASKS (LOW PRIORITY)

### Task 6: Document Game Data Schema
**Only If:** You need clear specs for adding lineup data
**Files to Create:**
- `docs/DATA_SCHEMA.md` - Expected structure of game/lineup objects
- Include examples of valid data
- Document required vs optional fields

---

### Task 7: Create Lineup Data Entry Guide
**Only If:** Multiple users need to add lineup data
**Create:**
- `docs/HOW_TO_ADD_LINEUP_DATA.md`
- Screenshots of data format
- Copy-paste template for new games

---

## VERIFICATION CHECKLIST

After completing critical tasks, verify:

- [ ] Back button works and returns to Insights
- [ ] Team selection persists after back button
- [ ] No console errors on any page
- [ ] All 3 lineup views accessible
- [ ] Defensive Units shows data (if sample data added)
- [ ] Attacking Units shows data (if sample data added)
- [ ] Position Pairings shows data (if sample data added)
- [ ] Can navigate back from each view

---

## ESTIMATED TIME BREAKDOWN

| Task | Time | Must Do? |
|------|------|----------|
| Task 1: Back Button | 5 min | YES |
| Task 2: Debug Stats | 30 min | YES |
| Task 3: Sample Data | 15 min | If needed |
| Task 4: Test Attacking | 5 min | YES |
| Task 5: Test Pairings | 5 min | YES |
| **Total Critical** | **45 min** | **YES** |
| Task 6-7: Docs | 20 min | NO |

---

## NOTES FOR NEXT SESSION

- Have `QUICK_FIX_GUIDE.md` open while working
- Use `LINEUP_ANALYTICS_BUGS_v943.md` for reference
- Check `SESSION_LEARNINGS_Dec9_2025.md` if stuck
- Remember: Always test in incognito window if cache issues occur
- Keep `clasp logs` command handy for server-side debugging

---

## COMMIT MESSAGES TO USE

```bash
# After Task 1:
git commit -m "v944: Fix back button hash routing in lineup views"

# After Task 2:
git commit -m "v944: Add debug logging to getLineupStats() function"

# After Task 3:
git commit -m "v944: Add sample lineup data to games for testing"

# Final:
git commit -m "v944: Complete lineup analytics debugging and testing"
```

---

**Ready for next session. Good luck! 🚀**

