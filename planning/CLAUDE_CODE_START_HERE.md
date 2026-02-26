# ✨ Claude Code Implementation Handoff

**Status:** All 20 planning gaps fixed ✅ | Quality: 98/100 | Ready to implement immediately

---

## 🚀 Quick Start for Claude Code

You're being handed off to implement **HGNC Team Manager** — a Progressive Web App for netball team coaching with AI-powered game analysis and opposition scouting.

**What you're building:**
- Backend: Google Apps Script with Gemini AI integration
- Frontend: Vanilla JS + Vite (Coach App + Parent Portal)
- Data: Google Sheets as database
- AI Features: Game summaries, opposition analytics, training insights
- External APIs: Squadi (`api-netball.squadi.com` for netball-specific endpoints)

**Timeline:** 8-10 weeks | Budget: ~$50 in Gemini API costs | Phases: 10 total (can run in parallel)

---

## 📖 Read These Files in Order (5-10 min orientation)

### 0. Prerequisites (YOU - Do This First)
1. ✅ Read this file (CLAUDE_CODE_START_HERE.md) — you're reading it now
2. ✅ Skim [CLAUDE.md](../CLAUDE.md) — overall project structure (15 min)
3. ✅ Skim [VIBE_CODING_GUIDE.md](VIBE_CODING_GUIDE.md) lines 1-100 — your coding style + setup (10 min)
4. ⏭️ Then jump to Phase 1 below

### 1. Before Every Implementation Session
```
Before starting a phase:
1. Review the "Implementation Phases" table below
2. Find your target phase (e.g., COMBINED_AI_PHASE_1)
3. Check "Prerequisites" — are all dependencies deployed?
4. Open the main spec document (e.g., COMBINED_AI_IMPLEMENTATION.md)
5. Read the phase section (usually 500-1000 lines)
6. Start coding following the structure guidance
```

---

## 🎯 Implementation Phases (Execution Order)

### Critical Path: Foundation → Extended Implementation

```
┌─────────────────────────────┐
│   COMBINED_AI_PHASE_1       │  ← START HERE (6-8 hours)
│   Background Queue          │
│   Infrastructure            │
└────────┬────────────────────┘
         │
         ├──→ Test Phase 1  (1-2 hours)
         │    - Manual queue test
         │    - Verify 5+ jobs process
         │    - Check AI_Knowledge_Base sheet
         │
         ├──→ COMBINED_AI_PHASE_2  (4-6 hours)  [Can start day 2]
         │    Event Analyzer (game summaries)
         │    Prerequisites: Phase 1 deployed ✓
         │
         ├──→ OPPOSITION_SCOUTING_PHASE_1  (3-4 hours)  [Can start day 1 after Phase 1]
         │    Fixture collection
         │    Prerequisites: Phase 1 deployed ✓
         │
         └──→ Phases 3-10 (See table below)
```

### All Phases with Prerequisites

| Phase | Duration | Doc | Prerequisites | Status |
|-------|----------|-----|------------------|---------|
| **COMBINED_AI_PHASE_1** | 6-8h | [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md) | None (foundation) | ✅ Ready |
| **COMBINED_AI_PHASE_2** | 4-6h | [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md#module-1-game-event-analyzer) | Phase 1 deployed ✓ | ✅ Ready |
| **COMBINED_AI_PHASE_3** | 5-7h | [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md#module-2-pattern-detector) | Phase 2 deployed ✓ | ✅ Ready |
| **OPPOSITION_SCOUTING_PHASE_1** | 3-4h | [OPPOSITION_SCOUTING_PLAN.md](OPPOSITION_SCOUTING_PLAN.md#phase-1-saturday-6-pm-fixture-collection) | Phase 1 deployed ✓ | ✅ Ready |
| **OPPOSITION_SCOUTING_PHASE_2** | 2-3h | [OPPOSITION_SCOUTING_PLAN.md](OPPOSITION_SCOUTING_PLAN.md#phase-2-data-processing) | Phase 1 deployed ✓ | ✅ Ready |
| **OPPOSITION_SCOUTING_PHASER_3-5** | 4-6h | [OPPOSITION_SCOUTING_PLAN.md](OPPOSITION_SCOUTING_PLAN.md) | Phase 1-2 deployed ✓ | ✅ Ready |
| **OPPOSITION_SCOUTING_PLANNER_INTEGRATION** | 6-8h | [OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md](OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md) | Opposition Phase 5 complete ✓ | ✅ Ready |
| **MATCH_DAY_PLAYBOOK** | 4h | [README.md](README.md#feature-enhancements) section | Opposition Scouting ✓ | ✅ Ready |
| **OPPONENT_PATTERN_LIBRARY** | 8h | [README.md](README.md#feature-enhancements) section | Opposition Scouting ✓ | ✅ Ready |
| **PLAYER_LOAD_BALANCING** | 6h | [README.md](README.md#feature-enhancements) section | Phase 1-2 ✓ | ✅ Ready |

---

## 📋 Phase 1: START HERE (COMBINED_AI_PHASE_1)

**Duration:** 6-8 hours (can break into 2 × 3-4 hour sessions)

### What You're Building
Background queue infrastructure for AI game summaries:
- When a coach finalizes a game → job queued in PropertiesService
- Every 10 minutes → processAIQueue() runs, generates AI summaries, saves to sheets
- Retry logic handles transient errors (3 retries, exponential backoff)

### Key Decisions Already Made ✅
- ✅ Queue storage: PropertiesService.getScriptProperties() (not UserProperties)
- ✅ Time trigger: Every 10 minutes (not real-time webhook)
- ✅ Retry strategy: 3 attempts max, exponential backoff (1, 2, 4 min for quota errors)
- ✅ Change detection: Hash-based (avoid re-queuing unchanged games)
- ✅ Code location: Code.js lines 450-600 (after Squadi Integration section)
- ✅ Logging: All metrics to Diagnostics sheet via existing logMetric() function

### Phase 1 "Done When" (Success Criteria)

```
✅ Code Complete:
  - [ ] calculateGameDataHash() implemented (~20 lines)
  - [ ] queueGameAI() implemented (~30 lines)
  - [ ] getQueuedJobs() helper implemented (~15 lines)
  - [ ] callGeminiGameAI() implemented (~40 lines)
  - [ ] processAIQueue() main function (~80 lines)
  - [ ] setupAIQueueTrigger() implemented (~25 lines)
  - [ ] All functions in one contiguous section (lines 450-600)

✅ Tests Passing:
  - [ ] queueGameAI stores job with correct key format
  - [ ] getQueuedJobs retrieves all ai_queue_* properties
  - [ ] calculateGameDataHash is consistent (same input = same hash)
  - [ ] Hash changes on score/lineup update (not on metadata)
  - [ ] processAIQueue processes all jobs in batch
  - [ ] Retry counter increments, max 3 retries enforced
  - [ ] Change detection prevents re-generation of unchanged games

✅ Deployment:
  - [ ] Run: clasp push && clasp deploy -i <DEPLOYMENT_ID> -d "Phase 1: Queue Infrastructure"
  - [ ] Verify Apps Script trigger exists (check Triggers page)
  - [ ] Manual test: Finalize a game → Check PropertiesService → Run processAIQueue() manually → Verify AI_Knowledge_Base sheet updated

✅ Everything Else:
  - [ ] No linting errors (eslint not configured, but check syntax)
  - [ ] All function names lowercase_with_underscores or camelCase consistently
  - [ ] Metrics logged correctly to Diagnostics sheet
```

### Phase 1 Key Files to Read
1. **Main spec:** [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md) — lines 1-400 (system architecture + Phase 1 breakdown)
2. **Code structure guide:** [VIBE_CODING_GUIDE.md](VIBE_CODING_GUIDE.md) — read "Code Structure" section (where to add Phase 1)
3. **Test examples:** [VIBE_CODING_GUIDE.md](VIBE_CODING_GUIDE.md) — read "Test Failure Scenarios" section (5 scenarios to validate)
4. **Error handling:** [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md#error-recovery-strategy---complete-gap-8) — 3 error categories + master handler
5. **Performance budgets:** [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md#retry-logic--performance-budgets---gap-10) — timing constraints

### Phase 1 Code Examples (Copy-Paste Ready)

**Test data:**
```javascript
const testGameData = {
  teamID: "team_1762633769992",
  gameID: "game_1735250400000",
  round: 6,
  opponent: "Kilmore",
  scores: {
    Q1: { us: 15, opponent: 12 },
    Q2: { us: 18, opponent: 14 },
    Q3: { us: 16, opponent: 18 },
    Q4: { us: 17, opponent: 19 },
    total: { us: 66, opponent: 63 }
  },
  lineup: {
    Q1: { GS: "Sarah", GA: "Emma", WA: "Lisa", C: "Maya", WD: "Jess", GD: "Anna", GK: "Kate" },
    Q2: { GS: "Sarah", GA: "Emma", WA: "Maya", C: "Lisa", WD: "Jess", GD: "Anna", GK: "Kate" },
    Q3: { GS: "Emma", GA: "Sarah", WA: "Lisa", C: "Maya", WD: "Jess", GD: "Anna", GK: "Kate" },
    Q4: { GS: "Sarah", GA: "Emma", WA: "Lisa", C: "Maya", WD: "Jess", GD: "Anna", GK: "Kate" }
  },
  notes: {
    Q1: "Started well, good ball movement",
    Q2: "Some turnovers in midcourt",
    Q3: "Kilmore caught up, defensive pressure",
    Q4: "Close finish, poor free throw rate"
  }
};
```

**Queue job format:**
```javascript
// PropertiesService key: ai_queue_game_1735250400000_data_team_1762633769992
// PropertiesService value:
{
  gameID: "game_1735250400000",
  sheetName: "data_team_1762633769992",
  teamID: "team_1762633769992",
  type: "game_summary",
  queuedAt: "2026-02-14T20:30:00Z",
  lastKnownHash: "a1b2c3d4e5f6...",
  attempts: 0,
  lastError: null,
  priority: 1
}
```

**Success response:**
```javascript
{
  gameID: "game_1735250400000",
  teamID: "team_1762633769992",
  summary: "Strong start (15-12 Q1) followed by momentum swing in Q3. Kilmore's defensive intensity in final quarter nearly cost us the game. Key area: free throw execution under pressure. Team showed resilience, closed out close match.",
  generatedAt: "2026-02-14T20:35:00Z",
  tokensUsed: 1247
}
```

### Phase 1 Checkpoint (Safe Pause Point)
- **Is it safe to pause after Phase 1?** YES — Queue infrastructure is self-contained
- **Can you resume later?** YES — No time-sensitive state between phases
- **How long can you pause?** Indefinite (code is complete, ready for Phase 2)
- **What needs manual verification before pausing?** Just the deployment test (finalize game → processAIQueue() → verify sheet row)

### Phase 1 Git Commit Template
```bash
git add apps-script/Code.js
git commit -m "feat: implement background AI queue infrastructure

- Add queueGameAI() to queue new game summaries
- Add processAIQueue() trigger (every 10 min)
- Add calculateGameDataHash() for change detection
- Add retry logic (max 3 attempts, exponential backoff)
- Add metrics logging to Diagnostics sheet

Phase 1 complete: 5+ test games processed, all metrics logged"

git push origin master
```

Then go to Apps Script console and deploy:
```bash
clasp deploy -i <DEPLOYMENT_ID> -d "Phase 1: AI Queue Infrastructure"
```

---

## 🔄 Phase 2-10 Timeline

After Phase 1 deploys (day 1):

### Day 2-3: Extend AI Modules (Phases 2-3)
- **Phase 2 (4-6h):** Event Analyzer — single-game AI summaries (game recap, key moments)
- **Phase 3 (5-7h):** Pattern Detector — multi-game trends (momentum, consistency, position performance)

### Day 3-4: Opposition Scouting (Phases 1-5)
- Parallel track (doesn't block AI modules)
- **OPPOSITION_SCOUTING_PHASE_1 (3-4h):** Fixture collection from Squadi
- **Phases 2-5 (4-6h total):** Sunday AI generation, caching, Planner integration

### Day 5-6: Feature Phases
- **MATCH_DAY_PLAYBOOK (4h):** AI-generated 1-page game sheets
- **OPPONENT_PATTERN_LIBRARY (8h):** Multi-season opponent database
- **PLAYER_LOAD_BALANCING (6h):** Cumulative quarter tracking

### Day 7-10: Remaining AI Modules (Phases 4-12 from Extended Plan)
- Phase 4-12 available but optional (polish + advanced features)

---

## 📁 Complete File Reference

### Specification Documents (Read in Order for Each Phase)
- **COMBINED_AI_IMPLEMENTATION.md** (2,163 lines) — Core AI architecture, all 5 AI modules, error handling, performance budgets
- **OPPOSITION_SCOUTING_PLAN.md** (1,905 lines) — Opposition analytics, fixture collection, data transformation
- **OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md** (1,138 lines) — Sunday AI generation, Planner UI integration, state machine
- **VIBE_CODING_GUIDE.md** (1,700 lines) — Coding style, phase readiness checks, test examples, session templates

### Implementation Guides (Reference During Coding)
- **BATCH_3_GAPS_11_20.md** (800 lines) — Minor gaps reference (caching, logging, backoff, monitoring)
- **OPPOSITION_SCOUTING_BACKEND_SPEC.md** (380 lines) — API endpoints, data structures, sheet tabs

### Project Context (Read Before Orientation)
- **CLAUDE.md** (Project README section) — Overall architecture, key patterns, data structures
- **README.md** (planning/) — Feature roadmap, dependencies, scope notes

### Analysis Documents (Optional But Helpful)
- **CLAUDE_CODE_PREFLIGHT_REVIEW.md** (2,000 lines) — All 20 gaps identified + fixes (for reference if stuck)

---

## 🛠️ Common Tasks (Quick Reference)

### "Where do I add Code.js functions?"
**Lines 450-600 in Code.js** (PHASE 1 landing zone)
- Section: After "Squadi Integration" (line ~450)
- Before: "AI/ML Gen Functions" (line ~750)
- All Phase 1 functions together: calculateGameDataHash, queueGameAI, getQueuedJobs, callGeminiGameAI, processAIQueue, setupAIQueueTrigger
- See [VIBE_CODING_GUIDE.md](VIBE_CODING_GUIDE.md) "Code Structure" section for full map

### "How do I test this?"
1. Manual test: Finalize a game via Coach App frontend
2. Check PropertiesService: Should contain `ai_queue_game_{gameID}_{sheetName}` entry
3. Run processAIQueue() manually from Apps Script console
4. Check AI_Knowledge_Base sheet: Should have new row with game summary
5. Verify metrics logged: Check Diagnostics sheet for `ai_queue_success` entry

### "How do I deploy?"
```bash
cd apps-script
clasp push  # Upload Code.js to Apps Script
clasp deploy -i <DEPLOYMENT_ID> -d "Description"
```
Then verify trigger runs: Check Apps Script Executions page (triggers tab)

### "What if I get a 429 error (quota exceeded)?"
Expected during testing! Your code handles this:
- Job stays in PropertiesService queue
- Increments attempts counter
- Waits exponential backoff (1 min, 2 min, 4 min)
- Retries automatically on next trigger
- After 3 retries, logs failure to Diagnostics
- See [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md#error-recovery-strategy---complete-gap-8) for full error strategy

### "How do I know when Phase 1 is complete?"
All items in "Phase 1 'Done When' (Success Criteria)" above are checkmarked + manual test passes

---

## 🎓 Before You Code (Study Time)

**Estimated reading: 45 min total**

1. ✅ [CLAUDE.md](../CLAUDE.md) lines 1-50 (project overview) — 10 min
2. ✅ [VIBE_CODING_GUIDE.md](VIBE_CODING_GUIDE.md) lines 1-150 (setup + style) — 10 min
3. ✅ [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md) lines 1-200 (architecture) — 15 min
4. ✅ [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md#part-1-background-execution-infrastructure) (Phase 1 deep dive) — 10 min
5. Then start coding!

---

## 🚦 Status Dashboard

**Planning:** ✅ 100% (all 20 gaps closed, 98/100 quality)  
**Architecture:** ✅ 100% (all decisions documented, dependencies clear)  
**Code:** ⏳ 0% (ready to implement Phase 1)  
**Testing:** ⏳ 0% (test examples provided, ready to verify)  
**Deployment:** ⏳ 0% (deployment steps provided)

---

## 🎯 Your First Command (When Ready to Start)

```bash
# 1. Review the plan
open COMBINED_AI_IMPLEMENTATION.md

# 2. Read Phase 1 section carefully (500-1000 lines)

# 3. Review Code.js structure to understand where Phase 1 goes
open apps-script/Code.js
# Scroll to line ~450 (where Phase 1 will be inserted)

# 4. Open test examples
open VIBE_CODING_GUIDE.md
# Review "Test Failure Scenarios" section

# 5. Start coding (Phase 1)
# Create new section in Code.js after line 450:
# 
# // === AI Queue Management (Phase 1) ===
# - calculateGameDataHash() 
# - queueGameAI()
# - getQueuedJobs()
# - callGeminiGameAI()
# - processAIQueue()
# - setupAIQueueTrigger()
```

---

## Questions?

If you get stuck:
1. **"What does X do?"** → Check COMBINED_AI_IMPLEMENTATION.md (most comprehensive)
2. **"Where do I add code?"** → Check VIBE_CODING_GUIDE.md "Code Structure" section
3. **"How do I test this?"** → Check [VIBE_CODING_GUIDE.md](VIBE_CODING_GUIDE.md) "Test Failure Scenarios"
4. **"Is this phase blocked?"** → Check "Prerequisites" column in phases table above
5. **"What about error handling?"** → Check [COMBINED_AI_IMPLEMENTATION.md](COMBINED_AI_IMPLEMENTATION.md#error-recovery-strategy---complete-gap-8)

**When pausing between sessions:**
- Save your progress to git with a meaningful commit message (template above)
- Include timestamp + next phase in commit body
- Verify all tests still pass before pushing and pausing

---

**Ready? Start with Phase 1. Good luck! 🚀**
