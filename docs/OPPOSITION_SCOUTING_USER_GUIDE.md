# Opposition Scouting Features - Quick Reference

**Last Updated:** February 27, 2026  
**Game Tomorrow:** February 28, 2026

---

## 🟢 AVAILABLE NOW - Ready to Use

### Scout Button in Lineup Planner
**Location:** Planner header, right side (between "Help" and "Auto-fill")  
**What it does:** Opens Opposition Scouting Hub for the current game  
**Use case:** While building lineup, quickly check opponent analysis  
**Result:** Opens full opposition scouting with all available insights

### Opposition Scouting Hub
**Location:** Full-screen view (accessed via Scout button)  
**What you see:**
- Opponent name + round info
- AI Summary (if available)
- 26 Insights grouped A-G:
  - Group A: Quarter Strength analysis (Q1-Q4)
  - Group B: Offensive/Defensive/Pace matchups
  - Group C: Shooting/Possession efficiency
  - Group D: Vulnerabilities to exploit
  - Group E: Season trajectory/momentum
  - Group F: Key player combos/formations
  - Group G: Home/Away/Pressure performance

**Buttons:**
- Back arrow (top-left) → Returns to Planner
- "Generate Insights" → Full AI analysis (takes ~30 sec, uses quota)
- "Refresh Data" → Fast fixture/ladder update (takes ~2 sec)

### Confidence Levels
Each insight shows confidence: `high` | `medium` | `low`  
Color-coded for quick scanning

---

## 🟡 PARTIAL - Will Work After Saturday

### Automatic Opposition Fixture Collection
**When:** Saturday 6 PM (after games end)  
**What it does:** Automatically collects upcoming fixtures and opponent data  
**Status:** CODE READY, not yet tested live  
**Test date:** March 1, 2026

### Automatic Opposition AI Generation
**When:** Sunday 10 AM (every week)  
**What it does:** Generates 26 insights for all teams with upcoming games  
**Status:** CODE READY, not yet tested live  
**Test date:** March 2, 2026

---

## 🔴 NOT YET AVAILABLE

### Coach Notes on Opponents
**Status:** Planned (Phase 2)  
**What it will do:** Let coaches add tactical notes per game  
**Expected:** Next week (after triggers tested)

### Head-to-Head History Display
**Status:** Planned (Phase 1)  
**What it will do:** Show past games vs opponent, W-L-D record  
**Expected:** Next week (low-complexity UI)

### Comparative Analysis
**Status:** Planned (Phase 4)  
**What it will do:** "This team plays like..." recommendations  
**Expected:** March (requires more time to implement)

---

## 💡 How to Use Scouting for Game Tomorrow

### Before You Plan Lineup
1. Go to Schedule → Select game for tomorrow
2. At bottom of game detail, click "Scouting" button
3. See what's available:
   - If scouting data exists → Use it to inform lineup decisions
   - If "No scouting data" → Click "Generate Insights" (30 sec wait) OR proceed without it

### While Planning Lineup (Planner)
1. Open Lineup Planner
2. Click "Scout" button (top-right area)
3. See opposition summary while arranging players
4. Use insights like:
   - "Weak closing (Q4)" → Plan fresh legs for final quarter
   - "Strong attacking" → Prepare defensive formation
   - "Key combo: Player A + B" → Mark who to limit

### If No Data Available
⚠️ This is normal - scouting data is generated Sunday 10 AM each week  
**Workaround:** 
- Click "Generate Insights" button (uses API quota immediately)
- Or proceed without scouting (app works fine without it)
- Or use ladder position as guide (visible in main team view)

---

## ⚙️ Technical Details (For Reference)

### Data Storage
- Scouting data stored in Apps Script sheet: `OppositionScouting`
- Session cache in browser for fast access
- 7-day auto-expiry for old insights

### What Triggers Will Do (Starting Next Week)

**Saturday 6 PM:**
```
FOR each active team:
  GET upcoming games
  GET opponent ladder position
  QUEUE for AI generation
```

**Sunday 10 AM:**
```
FOR each queued opposition:
  CALL Gemini API → generate 26 insights
  STORE result in sheet
  CACHE for 7 days
  NOTIFY coach (ready for Monday planning)
```

### APIs Available
- `getOppositionScouting` - Get archived scouting data
- `generateOppositionInsightsImmediate` - Generate on-demand
- `refreshOppositionMatches` - Update fixture/ladder info
- `getOppositionInsightsCurated` - Top 5 curated insights (for planner modal)

---

## 🎮 Keyboard Shortcuts

None yet - all features accessible via buttons

---

## 📞 Troubleshooting

### "No game selected" error
**Cause:** You tried to open scouting without selecting a game first  
**Fix:** Go to Schedule, select a game, try again

### "No scouting data yet" message
**Cause:** Data hasn't been generated yet  
**Options:**
- Click "Generate Insights" to make it now (30 sec)
- Or click "Refresh Data" (2 sec, might load existing data)
- Or check back tomorrow (auto-generation runs Sunday 10 AM)

### Missing Scout button
**Cause:** Might not be visible in your view  
**Check:** Are you in the Lineup Planner view? Button should be top-right

### Insights look incomplete
**Cause:** API returned partial data  
**Status:** Safe - will show what's available, rest show as empty

---

## 📅 Feature Rollout Timeline

```
TODAY (Feb 27)     ✅ Scout button live in planner
TOMORROW (Feb 28)  ✅ Full scouting hub available
                   ✅ Manual generation available

NEXT WEEK          🟡 Automatic triggers test live
(Mar 1-2)          🟡 H2H History UI added

MID-MARCH          🟡 Coach Notes feature added
                   🟡 Expand scouting features

Q2 2026            🔴 Comparative Analysis
                   🔴 Multi-team scouting
```

---

## ✅ You're Good to Go!

App is safe for tomorrow's game. Opposition Scouting is a bonus feature - if not needed, just ignore the Scout button. Everything else works exactly as before.

