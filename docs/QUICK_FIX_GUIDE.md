# Quick Fix Guide - Lineup Analytics Issues (v943)

## Problem 1: Back Button Doesn't Work

**Symptom:** Clicking "← Back" on defensive/attacking/position pairings view doesn't return to insights

**Quick Fix (1 minute):**
```html
<!-- File: lineup.html, lines 50, 70, 90 -->
<!-- Change FROM: -->
<button onclick="window.location.href=window.APP_URL + '?view=insights'">← Back</button>

<!-- Change TO: -->
<button onclick="window.location.href=window.APP_URL + '#insights-view'">← Back</button>
```

**Then Deploy:**
```bash
cd /Users/casey-work/HGNC\ WebApp/hgnc-webapp
git add lineup.html
git commit -m "v943: Fix back button to use hash routing"
clasp push && clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "Back button hash fix"
```

**Test:**
1. Go to any team's Insights
2. Click "Defensive Units" card
3. Click "← Back" button
4. Should return to Insights dashboard

---

## Problem 2: Lineup Stats Are Empty (No Data Showing)

**Symptom:** 
- Page loads without errors
- Tables appear but show "No defensive unit data available"
- Console shows: `{defensiveUnitStats: {}, attackingUnitStats: {}, positionPairingStats: {}}`

**Diagnosis Steps (5 minutes):**

### Step 1: Check if games have lineup data
```javascript
// In browser console while on main app:
console.log('Games:', window.games);
console.log('First game:', window.games[0]);
if (window.games[0]) {
  console.log('Has lineup?', window.games[0].lineup);
  console.log('First quarter:', window.games[0].lineup?.[0]);
}
```

**Expected Output (if working):**
```javascript
{
  lineup: [
    {
      positions: {GK: "Player1", GD: "Player2", WD: "Player3", C: "Player4"},
      ourScore: 15,
      opponentScore: 12
    },
    // ... more quarters
  ]
}
```

### Step 2: Check server calculation (if game data exists)
Add logging to Code.js:

```javascript
// File: Code.js, function getLineupStats() - line 1342
function getLineupStats(sheetName) {
  try {
    var ss = getSpreadsheet();
    var teamSheet = ss.getSheetByName(sheetName);
    if (!teamSheet) {
      throw new Error('Team data sheet not found: ' + sheetName);
    }
    var teamDataJSON = teamSheet.getRange('A1').getValue();
    var teamData = JSON.parse(teamDataJSON || '{"players":[],"games":[]}');
    var games = teamData.games || [];
    
    // ADD THIS LOGGING:
    Logger.log('[getLineupStats] Sheet: ' + sheetName);
    Logger.log('[getLineupStats] Games found: ' + games.length);
    if (games.length > 0 && games[0].lineup) {
      Logger.log('[getLineupStats] First game has lineup: ' + games[0].lineup.length + ' quarters');
      Logger.log('[getLineupStats] First quarter positions: ' + JSON.stringify(games[0].lineup[0].positions));
    }
    
    // ... rest of function
```

### Step 3: Deploy and check logs
```bash
# Deploy with logging
clasp push && clasp deploy -i AKfycbw8nTMiBtx3SMw-s9cV3UhbTMqOwBH2aHEj1tswEQ2gb1uyiE9e2Ci4eHPqcpJ_gwo0ug -d "Debug lineup stats"

# Check logs
clasp logs
```

**If logs show "Games found: 0":**
- Games don't have lineup data
- Need to add lineup entries to each game
- See "How to Add Lineup Data" below

**If logs show "First quarter positions: undefined":**
- Data structure mismatch
- Position names might be different (check what's actually in JSON)
- May need to adjust calculation functions to match real structure

---

## Problem 3: How to Add Lineup Data to Games

**If games exist but don't have lineup info:**

### Option A: Manually in Spreadsheet
1. Open team's data sheet in Google Sheets
2. Edit the game's JSON object (cell A1 of team data sheet)
3. Add `lineup` array with quarters:

```json
{
  "games": [
    {
      "id": "game_1",
      "opponent": "Team A",
      "lineup": [
        {
          "quarter": 1,
          "positions": {
            "GK": "Alice",
            "GD": "Bob", 
            "WD": "Charlie",
            "C": "Diana"
          },
          "ourScore": 10,
          "opponentScore": 8
        },
        {
          "quarter": 2,
          "positions": {
            "GK": "Alice",
            "GD": "Eve",
            "WD": "Charlie", 
            "C": "Diana"
          },
          "ourScore": 5,
          "opponentScore": 3
        }
      ]
    }
  ]
}
```

### Option B: Add UI in Main App
(Not yet implemented - would need to create form in insights view)

---

## Problem 4: Attacking Units and Position Pairings Views Don't Work

**Check:**
1. Can you access the views at all? (links clickable?)
2. Do they show empty state like Defensive Units?
3. Any console errors?

**If views not showing:**
Check lineup.html exists and is being served:
```bash
# Verify file exists
cat /Users/casey-work/HGNC\ WebApp/hgnc-webapp/lineup.html | head -50

# Check it's in deployed files
clasp status
```

**If empty data like Defensive Units:**
Same issue - no lineup data in games. See "Problem 2" above.

---

## Problem 5: "Container not found" Error in Console

**Cause:** Old cached JavaScript still running
- Browser has old version of code
- New version has different function names

**Fix:**
1. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Or open in incognito/private window
3. Or clear browser cache for script.google.com

**If still persists after hard refresh:**
- Deploy new version with bumped version number
- Current appVersion: '943' (in Code.js line 67)
- Only increment if you made code changes

---

## Console Commands for Debugging

### Check current state:
```javascript
// What's in localStorage?
console.log(JSON.parse(localStorage.getItem('appState')));

// What URL are we on?
console.log(window.location.href);
console.log(window.location.hash);

// What's the current view?
console.log(document.querySelector('.view:not(.hidden)'));
```

### Check if server functions exist:
```javascript
// This should complete without error if function exists:
google.script.run.getLineupStats('data_team_1762633769992')
  .getLineupStats('data_team_1762633769992')
  .then(result => console.log('Stats:', result))
  .catch(err => console.error('Error:', err));
```

### Check lineup data:
```javascript
// If you have access to game data:
if (window.games && window.games[0]) {
  console.log('Game 0 lineup:', window.games[0].lineup);
  if (window.games[0].lineup?.[0]) {
    console.log('Q1 positions:', window.games[0].lineup[0].positions);
    console.log('Q1 score:', `${window.games[0].lineup[0].ourScore}-${window.games[0].lineup[0].opponentScore}`);
  }
}
```

---

## Cheat Sheet: View IDs

Use these IDs for routing/navigation:

```
Main App:
- #team-selector-view
- #fixture-view
- #players-view
- #insights-view
- #netball-ladder-view

Lineup Analytics (separate page):
- #insights-lineup-defensive-units-view (default)
- #insights-lineup-attacking-units-view
- #insights-lineup-position-pairings-view

Back to insights from lineup:
- window.location.href = window.APP_URL + '#insights-view'
```

---

## File Locations Quick Reference

| Problem | File | Lines |
|---------|------|-------|
| Back button | lineup.html | 50, 70, 90 |
| Server-side calc | Code.js | 1342-1453 |
| Navigation logic | src/includes/js-navigation.html | ~40-45 |
| Lineup page init | lineup.html | 110-180 |
| Render functions | lineup.html | 190-328 |

---

## Deployment Checklist

Before deploying lineup fixes:
- [ ] Tested locally in browser console
- [ ] Changes committed to git
- [ ] Ran `clasp push --force`
- [ ] Deployed with meaningful description
- [ ] Hard refreshed browser (Cmd+Shift+R)
- [ ] Tested in incognito window if still broken
- [ ] Checked console.log output for errors

---
