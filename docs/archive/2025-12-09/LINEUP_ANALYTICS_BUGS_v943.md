# Lineup Analytics Views - Known Issues & Tasks (v943)

**Status:** Work in progress - back button and data population issues identified
**Created:** 2025-12-09
**Session:** v926-v943 refactoring to fix 3 new lineup analytics views (Defensive Units, Attacking Units, Position Pairings)

---

## 🔴 Critical Issues (BLOCKING)

### 1. Back Button Not Working
**Status:** Partially fixed - Navigation occurs but state handling incomplete
**Severity:** HIGH - User cannot navigate back from lineup views
**Evidence:** User reports clicking back button doesn't return to Insights
**Current Code:** `lineup.html` back button uses `window.location.href=window.APP_URL + '?view=insights'`

**Root Cause Analysis:**
- Back button navigates to main app URL with `?view=insights` parameter
- Main app's `showView()` function likely doesn't recognize this parameter format
- The lineup page uses `?page=lineup#viewId` format, but index.html uses hash-based routing
- Potential mismatch between URL parameter handling in index.html vs lineup.html

**Required Fix:**
- Review `src/includes/js-navigation.html` to understand current view routing
- Verify how `showView()` parses hash vs URL parameters
- Either: (a) use hash routing `#insights-view` or (b) modify index.html to handle `?view=` parameter
- Test that state persists when returning from lineup page

**Next Steps:**
```javascript
// Option A: Change back button to use hash routing
onclick="window.location.href=window.APP_URL + '#insights-view'"

// Option B: Add parameter parsing to index.html's navigation
if (e.parameter.view === 'insights') { /* route to insights */ }
```

---

### 2. Empty Lineup Stats (No Data Rendering)
**Status:** Confirmed - Server returns empty objects
**Severity:** HIGH - Core feature not working
**Evidence:** Console shows `{defensiveUnitStats: {}, attackingUnitStats: {}, positionPairingStats: {}}`
**User Reports:** "Games have data but stats aren't populating"

**Root Cause Analysis:**
- `getLineupStats(sheetName)` in Code.js is being called correctly
- Function successfully reads team data from spreadsheet
- Calculations return empty objects `{}` despite user claiming games have data
- **Key Question:** Does the game data structure actually include `lineup` objects?

**Potential Issues:**
1. Games are stored WITHOUT `lineup` property - lineup data structure not created
2. `lineup` property exists but is empty array `[]` - needs data entry
3. `positions` object structure doesn't match calculation expectations (GK, GD, WD, C positions)
4. Quarter-level data structure mismatch (checking `quarter.positions`, `quarter.ourScore`, `quarter.opponentScore`)

**Required Investigation:**
1. Export one game's JSON from spreadsheet
2. Verify structure: `game.lineup[0].positions` contains `{GK: "player", GD: "player", WD: "player", C: "player"}`
3. Check if quarter structure includes `ourScore` and `opponentScore`
4. Verify all 4 required positions exist for defensive units, attacking units

**Required Fix (if lineup data doesn't exist):**
- Create UI/workflow to add lineup data to games
- Document expected data structure for lineups
- Add validation to guide users to correct data entry format

**Code Changes Needed:**
```javascript
// In getLineupStats - add logging to debug
Logger.log('Games count: ' + games.length);
if (games.length > 0) {
  Logger.log('First game structure: ' + JSON.stringify(games[0], null, 2).substring(0, 500));
}
```

---

### 3. Back Button - Incomplete Navigation Fix
**Status:** Attempted fix deployed but not fully working
**Severity:** HIGH
**Code Location:** `lineup.html` lines 50, 70, 90

**Current Implementation Issue:**
```html
<!-- Current (not working) -->
<button onclick="window.location.href=window.APP_URL + '?view=insights'">← Back</button>
```

**Why It's Not Working:**
- `window.APP_URL` points to `https://script.google.com/.../exec` (base URL only)
- Adding `?view=insights` creates URL like: `/exec?view=insights`
- Index.html's navigation system doesn't parse `?view=` parameter
- Index.html uses hash-based routing: `#viewId`
- Navigation likely fails silently or goes to default view

**Correct Implementation Options:**

```html
<!-- Option A: Use hash routing (RECOMMENDED) -->
<button onclick="window.location.href=window.APP_URL + '#insights-view'">← Back</button>

<!-- Option B: Use data attribute + onClick handler -->
<button data-target="insights-view" class="back-button">← Back</button>
<script>
  document.querySelector('.back-button').addEventListener('click', function() {
    window.location.hash = 'insights-view';
  });
</script>
```

---

## 🟡 Medium Priority Issues

### 4. Cache Busting Version Number
**Status:** Fixed in v943
**Severity:** MEDIUM (was blocking, now resolved)
**Solution:** Updated `appVersion` from '926' to '943' in Code.js line 67
**Why Needed:** Browser was serving old cached JS with old `renderLineupDefensiveUnits` function name

**Deployment Lesson:** Always bump version number when major architectural changes occur

---

### 5. HTML Truncation from 50KB Limit
**Status:** Resolved with multi-page approach
**Severity:** Was CRITICAL, now SOLVED
**Solution:** Created separate `lineup.html` page instead of including heavy JS files

**What Worked:**
- Multi-page routing: `doGet(e)` checks `e.parameter.page` parameter
- Lightweight HTML: lineup.html is ~7KB base + 6KB styles
- Server-side calculation: Pre-calculate stats in Code.js, return JSON
- Minimal JS: Inline render functions (~5KB) instead of including 238KB js-render.html

**Architecture Change:**
```
BEFORE (Failed): index.html tries to include all JS → 88KB + 238KB render → truncated
AFTER (Works):  index.html (17KB) + lineup.html (7KB) → under 50KB limit ✓
```

---

## 🟢 Completed Fixes

### 6. Icon CDN URL Issues
**Status:** Fixed in v936-v938
**Severity:** MEDIUM
**Issues Fixed:**
- Commit SHA mismatch in CDN URLs
- Template variables `<?!= %>` not evaluated in included files
- Fixed by converting icon code to data URLs

---

### 7. ScriptApp Client-Side Error
**Status:** Fixed in v941
**Severity:** MEDIUM
**Issue:** Lineup page called `ScriptApp.getService().getUrl()` on client side
**Solution:** Pass `APP_URL` via server data JSON instead

---

### 8. Navigation State Management
**Status:** Working in v942
**Severity:** MEDIUM
**Solution:** Store team state in localStorage before navigating to lineup page
**Code:** `src/includes/js-navigation.html` `navigateToLineupPage()` function

---

## 📋 Testing Checklist

### Before Next Session - MUST TEST:
- [ ] Back button actually returns to Insights view
- [ ] Back button preserves team selection (doesn't reset)
- [ ] Can see team data in Insights after returning from lineup page
- [ ] All 3 lineup views are accessible (Defensive, Attacking, Pairings)
- [ ] Test with and without lineup data in games
- [ ] Performance: Check page load time for lineup.html
- [ ] Console: Verify no errors logged

### Data Testing Needed:
- [ ] Verify game data structure includes `lineup` property
- [ ] Check if `lineup` array has quarter-level data with `positions` object
- [ ] Confirm all 4 positions exist per quarter: GK, GD, WD, C (defensive) or GS, GA, WA, C (attacking)
- [ ] Verify quarter objects have `ourScore` and `opponentScore` properties

---

## 📊 Debug Commands for Next Session

```javascript
// Check if getLineupStats function exists and works
google.script.run.getLineupStats('data_team_1762633769992');

// Inspect actual game data structure in console
console.log(JSON.stringify(window.games[0], null, 2));

// Check localStorage state
console.log(JSON.parse(localStorage.getItem('appState')));

// Verify view routing
console.log('Current view:', window.location.hash);
console.log('APP_URL:', window.APP_URL);
```

---

## 🔧 Code Locations

| File | Lines | Purpose |
|------|-------|---------|
| `lineup.html` | 1-328 | Standalone page for lineup analytics |
| `Code.js` | 1342-1453 | Server-side: getLineupStats(), calculate*Stats() |
| `src/includes/js-navigation.html` | - | navigateToLineupPage() function |
| `index.html` | Line 28 | doGet(e) routing logic |

---

## 📝 Deployment History Today

| Version | Commit | Description | Status |
|---------|--------|-------------|--------|
| v942 | f466025 | Loading indicator + state validation | ✓ Working |
| v943 @957 | 9bc8c62 | Server-side lineup stats + lightweight lineup.html | ⚠️ Partial |
| v943 @958 | 9485750 | Update appVersion cache buster | ✓ Deployed |
| v943 @960 | Redeploy | Move to original deployment ID | ✓ Deployed |
| v943 @961 | 0717298 | Fix back button (incomplete) | ⚠️ Not working |

---

## 🎯 Next Session Priority

1. **FIX BACK BUTTON** - Change from `?view=insights` to `#insights-view` 
2. **DEBUG EMPTY STATS** - Add logging to getLineupStats() to understand data structure
3. **ADD LINEUP DATA** - Either populate test data or document how users add lineup data
4. **TEST ALL VIEWS** - Verify Attacking and Position Pairings views work too
5. **VERIFY STATE** - Ensure team selection persists after returning from lineup page

---
