# Opposition Scouting Completion Plan - With Game Tomorrow

**Status:** Game scheduled for tomorrow (Feb 28, 2026)  
**Risk Level:** CRITICAL - must not break coach app  
**Strategy:** Phased, with heavy testing at each step

---

## 🎯 GAME DAY PRIORITY: ZERO BREAKAGE

### Current State (SAFE - VERIFIED WORKING)
✅ Opposition Scouting Hub - fully implemented & CSS in place  
✅ Planner Scout button - fully integrated  
✅ Backend fixture collection - ready (Saturday trigger not yet tested live)  
✅ 26-insight analytics generation - ready (Sunday trigger not yet tested live)  
✅ Top 5 curation API - ready  
✅ Tests passing - npm run test:run ✅  
✅ App builds - npm run build ✅

### What Could Break (RISKS TO AVOID)
⚠️ Modifying opposition-scouting.js - complex rendering logic, could break Hub UI  
⚠️ Adding coach-editable database to state - could affect state persistence  
⚠️ Changing how opposition data is queried - could affect API calls  
⚠️ Modifying lineup-planner.js Scout button - could break planner navigation  
⚠️ Any changes to core app.js - shared by all views  

---

## 📋 PHASED COMPLETION PLAN

### PHASE 0: PRE-GAME SAFETY (TODAY - DO THIS FIRST)
**Goal:** Verify nothing is broken, establish baseline

**Tasks:**
- [ ] Run full test suite: `npm run test:run`
- [ ] Build coach app: `npm run build`
- [ ] Manually test: Coach App → Schedule → Select a game → Scouting button
- [ ] Verify planner still opens without errors
- [ ] Check browser console for any JS errors
- [ ] Flash build to device and test on actual phone/tablet

**Deliverable:** Green light that app is production-safe for tomorrow

**Rollback Plan:** If anything fails, `git checkout` last clean commit and redeploy

---

### PHASE 1: H2H History UI (POST-GAME, LOW RISK)
**Timeline:** After game tomorrow (Feb 28)  
**Effort:** 2-3 hours  
**Risk Level:** LOW (adds new UI section, doesn't modify existing)

**What to Add:**
- New section in opposition-scouting.js `_renderFull()`: "Head-to-Head History"
- Display past games vs opponent (from game history)
- Show W-L-D record and recent form

**To Implement:**
```javascript
// In opposition-scouting.js, add new function:
function _renderH2HHistory(game, data) {
  // Extract games where opponent matches
  // Calculate W-L-D
  // Show last 5 games with scores
  // Return HTML
}

// Call in _renderFull() after aiSummary, before groups
```

**Testing Before Merge:**
- [ ] Test with real game data
- [ ] Verify opponent name matching (handle typos)
- [ ] Check responsive layout on mobile
- [ ] Run full test suite
- [ ] Build and verify no errors

**Rollback:** This is additive-only, safe to revert

---

### PHASE 2: Strategy Notes (WEEKEND, MEDIUM RISK)
**Timeline:** Saturday evening (Feb 29) after fixture collection  
**Effort:** 4-5 hours  
**Risk Level:** MEDIUM (adds state + persistence, but isolated)

**Design Decision:**
- Store in game data, NOT new database
- Coaches can edit per-game notes about opponent
- Read/write via existing saveTeamData pattern
- Local storage + auto-sync to sheet

**Data Structure:**
```javascript
// In game object:
game.oppositionNotes = {
  coachNotes: "This team is weak in Q4, vulnerable to...",
  tacticalFocus: ["Defensive pressure", "Fast transitions"],
  keyPlayers: ["Player A (key dangerous)", "Player B (supports)"],
  lastUpdated: "2026-02-28T15:30:00Z"
}
```

**To Implement:**
1. Add notes section to opposition-scouting.js rendering (read-only initially)
2. Add edit button → open modal with text + tactics fields
3. Save via existing game update path
4. Verify state persistence across views

**Testing Before Merge:**
- [ ] Create test game with notes
- [ ] Close and reopen app → verify notes persist
- [ ] Edit notes → verify save
- [ ] Check localStorage doesn't grow excessively
- [ ] Run test suite
- [ ] Manual E2E: enter notes → close → reopen → update

**Rollback:** Data structure is isolated to game object, safe to revert

---

### PHASE 3: Live Trigger Verification (NEXT SATURDAY, VERIFICATION ONLY)
**Timeline:** Saturday, March 1, 2026 @ 6 PM  
**Effort:** 30 min monitoring + troubleshooting  
**Risk Level:** CRITICAL (live backend, no code changes)

**What to Verify (NOT implement, just test):**
- [ ] Saturday 6 PM: collectOppositionFixtures() fires and completes
- [ ] Check Apps Script logs for queue status
- [ ] Verify opposition_queue_* properties created in PropertiesService
- [ ] No quota exceeded errors
- [ ] Retry logic working if failures occur

**If Issue Found:**
- Error logs: Check Apps Script console for exact error
- API quota: Verify not hitting limits
- Sheet access: Verify OppositionScouting sheet exists and is writable
- Rollback: No code changes, issue would be configuration

**Documentation:**
- [ ] Log execution time
- [ ] Log job counts
- [ ] Screenshot of queue status
- [ ] Record any errors for future debugging

---

### PHASE 4: Comparative Analysis (AFTER NEXT GAME, LOW PRIORITY)
**Timeline:** Early March 2026  
**Effort:** 6-8 hours (research + implementation)  
**Risk Level:** LOW (new feature, isolated)

**Scope NOT FOR THIS RELEASE:**
- Too complex for current timeline
- Requires opponent clustering algorithm
- Would need external similarity API or manual coaching mapping
- Schedule for March after other improvements

---

## 🛡️ SAFETY CHECKLIST (BEFORE EACH CHANGE)

```markdown
Before committing any changes:

- [ ] Full test suite passes: npm run test:run
- [ ] App builds without warnings: npm run build
- [ ] No console errors when running locally
- [ ] Manual testing on target device
- [ ] Git diff reviewed for unintended changes
- [ ] Rollback plan documented
- [ ] No breaking changes to existing APIs

Before deploying to production:

- [ ] All above checks passed
- [ ] Changes tested on actual device for 5+ min
- [ ] Coaches ready to roll back if needed
- [ ] Apps Script deployment (if needed) tested
- [ ] No changes to core app.js
```

---

## 📅 TIMELINE

```
TODAY (Feb 27)
├─ PHASE 0: Safety checks ✓ CRITICAL
└─ Green light for game tomorrow

TOMORROW (Feb 28)
├─ Game day - NO CODE CHANGES
└─ Monitor for any issues

FRIDAY (Feb 28) - Evening
├─ Post-game: PHASE 1 (H2H History) optional
└─ If everything perfect, can add

SATURDAY (Mar 1) - 6 PM
├─ PHASE 3: Monitor collectOppositionFixtures() trigger
└─ First live test of automation

SUNDAY (Mar 2) - 10 AM
├─ Monitor processOppositionAIQueue() trigger
└─ Second live test of automation

FOLLOWING WEEK
├─ PHASE 2: Strategy Notes (if time permits)
└─ PHASE 4: Plan for Comparative Analysis
```

---

## 🚨 QUICK ROLLBACK PROCEDURE

**If anything breaks before/during game:**

```bash
# Quick rollback to last stable version
git log --oneline | head -5  # Find last good commit
git checkout <commit-hash>
npm run build
# Redeploy to production

# If Apps Script is the issue:
cd apps-script
git checkout HEAD -- Code.js
clasp push
clasp deploy -i <DEPLOYMENT_ID> -d "Rollback to stable"
```

---

## ❓ DECISION MATRIX

**Should I implement X before the game?**

| Feature | Now? | Reason |
|---------|------|--------|
| H2H History UI | ❌ NO | Non-critical, can wait |
| Strategy Notes | ❌ NO | Adds state complexity |
| Comparative Analysis | ❌ NO | Too complex for now |
| Bug fixes (if found) | ✅ YES | Only if blocking |
| CSS tweaks | ⚠️ MAYBE | Only if visual bug |
| Code documentation | ✅ YES | Safe, no runtime impact |

**Rule:** If it's not 100% necessary for the game, defer it to after.

---

## 📝 NOTES FOR FUTURE SESSIONS

**For implementing Phase 2 (Strategy Notes):**
- Will need edit modal similar to player-library.js editor
- Validate inputs: max 500 chars for notes, max 5 tactical focuses
- Consider adding timestamp + last editor (for multi-coach scenarios)
- Test with multiple concurrent users

**For implementing Phase 4 (Comparative Analysis):**
- Research similar-opponent clustering algorithm
- Could use: statistical distance (goal differential, W-L pattern, etc.)
- Or: manual mapping (coach defines "Kilmore plays like X")
- Separate feature document recommended before implementing

**Trigger Testing Notes:**
- Apps Script trigger execution is asynchronous
- Expect 5-15 minute delay between queue time and execution
- Logs available in Apps Script dashboard
- Test on low-stakes round first (not playoff)

---

## ✅ DEFINITION OF SUCCESS

**Game Tomorrow:** App doesn't crash, coaches can use it normally  
**After Game:** Clean git history, no temporary commits  
**Next Week:** All phases 1-3 complete, app enhanced without degradation  
**March 2 (Sunday):** Confirm both Saturday + Sunday triggers worked correctly

