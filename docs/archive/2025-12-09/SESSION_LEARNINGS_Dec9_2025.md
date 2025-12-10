# Daily Learnings Report - Session v926 to v943 (Dec 9, 2025)

**Session Goal:** Fix 3 new lineup analytics views (Defensive Units, Attacking Units, Position Pairings) that were displaying blank

**Final Status:** 🟡 PARTIAL SUCCESS
- Architecture fixed ✓
- Views accessible ✓  
- Data not populating ⚠️
- Navigation buggy ⚠️

---

## 🎓 Key Learnings

### Lesson 1: The 50KB HTML Output Limit is a HARD CONSTRAINT

**What We Learned:**
- Google Apps Script's `HtmlService.createTemplateFromFile()` has a ~50KB compiled output limit
- This limit applies AFTER all `<?!= include() ?>` directives are evaluated and merged
- File sizes BEFORE merging don't matter - only the final compiled size counts

**What We Tried (FAILED):**
1. ✗ CSS visibility fixes with `!important` flags (v926-v932)
   - Symptom: Blank views
   - Root cause: Views existed but HTML was TRUNCATED, not hidden
   - Lesson: When debugging, distinguish between "hidden via CSS" vs "doesn't exist in DOM"

2. ✗ Inline script extraction to includes (v935)
   - Reduced index.html from 88KB to 17KB ✓
   - BUT lineup.html still included all heavy JS files
   - Result: Lineup page 414KB (88KB HTML + 238KB js-render.html + 85KB js-core-logic.html...)
   - Lesson: Moving code to separate files doesn't help if you include them all

3. ✗ Multi-file approach without removing includes (v940)
   - Created separate lineup.html page
   - Still included massive js-render.html (238KB)
   - Page was truncated before containers were created
   - Lesson: Must BOTH create separate page AND remove heavy includes

**What WORKED (SOLVED):**
- ✓ Multi-page routing + minimal includes approach
- Created lineup.html WITHOUT any heavy includes
- Added lightweight inline render functions (~5KB)
- Moved calculation logic to SERVER-SIDE Code.js functions
- Result: lineup.html ~7KB HTML + 6KB styles + 5KB inline JS = 18KB total ✓

**Key Insight:**
> When you hit the 50KB limit, don't try to optimize CSS or reduce size incrementally. Instead, **move calculation logic server-side** and send minimal client-side code. This is an architecture problem, not a size problem.

---

### Lesson 2: Browser Caching Defeats Deployments

**What Happened:**
- Deployed v943 @957 with new lightweight lineup.html
- Browser still served OLD cached version
- Old version had `renderLineupDefensiveUnits()` function
- New version has `renderDefensiveUnits()` function
- Result: "Container not found" errors even though fix was deployed

**What We Learned:**
- Google Apps Script deployment creates new URL for each deployment
- But if you redeploy to SAME URL, browser cache can serve stale version
- Version number in code (`template.appVersion = '926'`) doesn't auto-refresh browser

**What We Tried (FAILED):**
1. ✗ Assumed deployment URL would auto-update browser cache
   - Result: Still serving v932 code with v943 deployment
   - Lesson: Just deploying isn't enough

**What WORKED (SOLVED):**
1. ✓ Created NEW deployment URL @959 (different ID)
   - User tested with new URL in incognito window
   - Worked perfectly
   
2. ✓ Bumped `appVersion` from '926' to '943' in Code.js
   - Used clasp to redeploy to original deployment ID
   - `clasp deploy -i <DEPLOYMENT_ID>` updates the deployment

**Key Insight:**
> For Google Apps Script webapps:
> 1. New features need new deployment IDs to guarantee fresh browser load
> 2. For updating existing deployments, bump the appVersion number AND redeploy to same ID
> 3. Users may need to hard refresh (Cmd+Shift+R) or use incognito window

---

### Lesson 3: Function Naming and Consistency Matters

**What Happened:**
- Original code had `renderLineupDefensiveUnits()` (with "Lineup" in name)
- New lightweight code renamed to `renderDefensiveUnits()` (without "Lineup")
- Old cached JS still called old function name
- Result: Confusing error about missing container

**What We Learned:**
- When refactoring, renaming functions causes cache conflicts
- Old code and new code can't coexist if names change
- Need either: (a) keep names consistent, or (b) force cache clear

**What WORKED:**
- ✓ New deployment ID forced fresh JS load
- ✓ Bumping appVersion signals to clients that JS changed

**Key Insight:**
> When doing major refactoring, either:
> 1. Keep function names identical for backward compatibility, OR
> 2. Deploy to new URL to force cache invalidation
> 
> Don't mix both approaches - client gets confused about which version is loaded.

---

### Lesson 4: Understand Your Data Structure BEFORE Building Features

**What Happened:**
- Built 3 calculation functions for lineup stats (defensive units, attacking units, position pairings)
- Functions look correct syntactically
- Server returns empty objects `{}`
- Presumed user's game data doesn't have lineup data structured correctly

**Root Cause:**
- Didn't verify actual game data structure before writing calculations
- Made assumptions about:
  - `game.lineup` property exists
  - `quarter.positions` has `{GK, GD, WD, C}` objects
  - `quarter.ourScore` and `quarter.opponentScore` exist

**What We SHOULD Have Done:**
1. ✓ Extract sample game JSON from spreadsheet
2. ✓ Log structure: `console.log(JSON.stringify(games[0], null, 2))`
3. ✓ Verify all expected properties exist
4. ✓ Add validation to calculation functions with helpful error messages

**Key Insight:**
> Never assume data structure. Always:
> 1. Look at actual data first (export, log, inspect)
> 2. Write validation layer
> 3. Then write calculations
> 4. Add logging at each step to debug

---

### Lesson 5: Back Button Navigation is Complex in SPAs

**What Happened:**
- Created back button to return from lineup.html to index.html
- Used simple `window.location.href=window.APP_URL`
- Doesn't work - user stays on lineup page or goes to blank state
- Fixed to `window.location.href=window.APP_URL + '?view=insights'`
- Still doesn't work

**Root Cause:**
- Mismatch between routing systems:
  - lineup.html uses: `?page=lineup#insights-lineup-defensive-units-view` (query param for page, hash for view)
  - index.html uses: `#insights-view` (hash for routing)
  - Back button sends: `?view=insights` (unrecognized parameter)

**What We Tried:**
1. ✗ Query parameters `?view=insights`
   - index.html doesn't parse URL query params
   - Uses hash-based routing only
   
2. ⚠️ Incomplete: Hash-based approach suggested but not deployed

**What SHOULD Work:**
```javascript
// Use hash routing to match index.html
window.location.href = window.APP_URL + '#insights-view'

// OR handle query params in index.html doGet()
if (e.parameter.view === 'insights') {
  // Return to insights dashboard
}
```

**Key Insight:**
> Single-page app navigation is tricky when:
> 1. You have multiple HTML pages (index.html + lineup.html)
> 2. Each has its own routing mechanism
> 3. Need to preserve state when navigating between pages
> 
> Solution: Pick ONE routing approach (hash OR query params) and use consistently

---

### Lesson 6: Logging and Debugging Practices

**What Worked WELL:**
- ✓ Added `console.log()` statements at every step in lineup.html
- ✓ Included context: `[Lineup Page]`, `[renderDefensiveUnits]`, etc.
- ✓ Logged state at key checkpoints (DOMContentLoaded, received response, etc.)
- ✓ This made it EASY to diagnose cache issue

**What Was Missing:**
- ✗ No logging in `getLineupStats()` server function
- ✗ Didn't log game structure or calculation steps
- ✗ Couldn't diagnose why stats are empty
- Lesson: Add logging to server-side functions too

**Key Insight:**
> Good logging format: `[FunctionName] Action: value1, value2`
> 
> This makes parsing console output 100x easier than generic "Loading..." logs

---

### Lesson 7: Documentation Gaps Led to Rework

**What Happened:**
- No clear documentation of:
  - Game data structure requirements
  - How to add lineup data
  - Expected format of lineup objects
  
**Result:**
- Built features without knowing if data exists
- User reports "games have data" but empty stats
- Can't tell if it's code bug or data structure mismatch

**What We Should Have:**
- ✓ Data schema documentation
- ✓ Example of valid lineup object
- ✓ Test data generator script
- ✓ Validation functions that give helpful error messages

---

## 📊 Session Statistics

| Metric | Value |
|--------|-------|
| Total Deployments | 17 (v926→v943) |
| Days of Work | 1 |
| Major Architecture Changes | 3 (CSS fixes → multi-page → server-side calc) |
| Failed Approaches | 3 |
| Root Causes Identified | 5 |
| Critical Issues Unresolved | 2 |
| Lessons Learned | 7 |

---

## ✅ What Worked Well This Session

1. **Systematic Debugging**
   - Started with small reproductions
   - Tested in console before deploying
   - Used incognito window to avoid cache

2. **Git Commits**
   - Clear commit messages
   - Frequent, small commits
   - Easy to track progress and revert if needed

3. **Multi-page Architecture**
   - Successfully split into separate pages
   - Avoided 50KB limit with minimal includes
   - Improved load time for main app

4. **Server-Side Calculation**
   - Moved heavy logic to Code.js
   - Client-side just renders JSON
   - Scales better for larger datasets

---

## ❌ What Didn't Work

1. **CSS-Only Fixes to Blank Views**
   - Root cause was HTML truncation, not CSS
   - Wasted 7 deployments trying visibility hacks
   - Lesson: Understand root cause before fixing

2. **Assuming Browser Cache Would Update**
   - Old cached JS lingered after deployment
   - Function name mismatch caused confusion
   - Lesson: New features need new deployment IDs

3. **Building Without Understanding Data**
   - Wrote calculations without seeing actual data
   - Can't debug empty results without understanding structure
   - Lesson: Always inspect data first

4. **URL Routing Mismatch**
   - Back button uses query params, app uses hash
   - Navigation broken between pages
   - Lesson: Choose one routing approach and stick with it

---

## 🔮 Predictions for Next Session

**High Confidence Issues (90%+ certain):**
1. Back button will need hash-based fix: `#insights-view`
2. Empty stats are due to missing/misformatted lineup data in games
3. Will need to add logging to `getLineupStats()` to diagnose structure

**Medium Confidence (60-70%):**
1. May need to create UI/workflow for entering lineup data
2. May need to validate data structure in calculation functions
3. May need to adjust position names (GK, GD, WD, C) to match actual data

---

## 📚 Documentation Updates Needed

1. **Data Schema Documentation**
   - Create `docs/DATA_SCHEMA.md`
   - Document expected structure of game objects
   - Include examples of valid lineup data

2. **Lineup Analytics Setup Guide**
   - Create `docs/LINEUP_ANALYTICS_SETUP.md`
   - Steps to add lineup data to games
   - Screenshots of expected format

3. **Routing Architecture Guide**
   - Create `docs/ROUTING_ARCHITECTURE.md`
   - Explain multi-page setup
   - Clarify hash vs query parameter routing

4. **Known Bugs List (This Document)**
   - Created: `docs/LINEUP_ANALYTICS_BUGS_v943.md`
   - Updates the development workflow

---

## 🎯 Recommendations for Next Session

### Immediate (First 30 minutes):
1. [ ] Fix back button: Change to `#insights-view` hash routing
2. [ ] Deploy and test navigation
3. [ ] Verify state persists when returning

### Investigation (Next 30 minutes):
1. [ ] Export game data JSON from spreadsheet
2. [ ] Check if `game.lineup` property exists
3. [ ] Add logging to `getLineupStats()` function
4. [ ] Deploy and check server logs

### Data Work (If needed):
1. [ ] Create sample lineup data if it doesn't exist
2. [ ] Document data structure for future users
3. [ ] Add validation to catch data structure errors

### Testing (Last):
1. [ ] Test all 3 lineup views
2. [ ] Verify back button works
3. [ ] Check performance on slow connection
4. [ ] Test on mobile device

---

## 💡 Clever Solutions Used

### Multi-Page Routing Without Server Overhead
```javascript
// In Code.js doGet()
var page = (e && e.parameter && e.parameter.page) || 'index';
var templateFile = page === 'lineup' ? 'lineup' : 'index';
```
Clean, minimal, avoids repeating template setup code.

### Lightweight Inline Render Functions
Instead of including 238KB js-render.html, wrote 5KB inline:
```javascript
function renderDefensiveUnits(stats) {
  // Build HTML string directly
  // Much simpler than generic renderer
}
```

### Server-Side Pre-calculation
Move heavy lifting to server (Code.js) instead of client:
- Calculations run once on server
- Client just renders JSON
- Avoids sending calculation code to browser

---

## 📖 References for Next Time

- **GAS 50KB Limit:** https://developers.google.com/apps-script/guides/html/limits
- **HtmlService Include Performance:** Check official GAS docs
- **Browser Cache & Deployments:** GAS creates unique URLs per deployment
- **SPA Routing Patterns:** Research hash vs query param routing trade-offs

---
