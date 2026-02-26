# Feature Planning Documents

This directory contains comprehensive planning documents for major features before implementation. **All 20 planning gaps are closed. Quality: 98/100. Ready for implementation.**

## 🚀 START HERE: Claude Code Implementation Handoff

**[CLAUDE_CODE_START_HERE.md](./CLAUDE_CODE_START_HERE.md)** ← Open this first (master entry point)
- 📋 Complete implementation roadmap (10 phases, all dependencies mapped)
- 🎯 Phase 1 deep dive (6-8 hours, fully specified + test examples)
- 📁 Navigation guide (which file to read for each phase)
- ✅ Phase readiness checks (are prerequisites deployed?)
- 🧪 Test scenarios + deployment steps
- 🔗 Quick reference to all supporting documents

**Then for coding style & decision context:**

**[VIBE_CODING_GUIDE.md](./VIBE_CODING_GUIDE.md)** — Async handoff patterns for Claude Code:
- ✅ Success criteria for each phase (how to know "done")
- ✅ Test data examples (what to feed tests)
- ✅ Decision rationale (why we chose this architecture)
- ✅ Session template (pause Friday, resume Monday with full context)
- ✅ Git commit template (consistent handoff passes)
- ✅ Debugging guide (when things break)

**Quick start:** 
1. Open CLAUDE_CODE_START_HERE.md (5 min orientation)
2. Read COMBINED_AI_IMPLEMENTATION.md Phase 1 section (20 min)
3. Start coding Phase 1 (6-8 hours)

---

## All Phases Quick Reference

| Phase | Feature | Effort | Key Deliverable | Blocks | Status |
|-------|---------|--------|-----------------|--------|--------|
| **Combined AI 1** | Background Queue Infrastructure | 6-8h | Time-triggered AI processing | Combined AI 2-7, Opposition Scouting | ⭐ Start Here |
| Combined AI 2 | Event Analyzer Module | 2-3h | Auto-generate game summaries | Combined AI 3+ | Ready |
| Combined AI 3 | Pattern Detector Module | 2-3h | Find scoring/lineup patterns | Combined AI 4+ | Ready |
| Combined AI 4 | Correlation Analyzer | 2-3h | Link game events to patterns | Opposition Scouting | Ready |
| Combined AI 5 | Tactical Advisor | 2-3h | Position-specific recommendations | Combined AI 6+ | Ready |
| Combined AI 6 | Strategist Module | 1-2h | Season strategy synthesis | None | Ready |
| Combined AI 7 | AI Settings & Testing | 1-2h | Feature flags, user toggles | None | Ready |
| **Opposition Scouting 1** | Opponent Profile Hub | 3-4h | Opponent detail UI + H2H history | Opposition Scouting 2-5 | Blocked by Combined AI 1 |
| Opposition Scouting 2 | Coach Scouting Notes | 2-3h | Editable per-opponent notebook | Opposition Scouting 3-5 | Blocked by Opposition 1 |
| Opposition Scouting 3 | AI Matchup Analyzer | 3-4h | AI-generated opponent analysis | Opposition Scouting 4-5 | Blocked by Opposition 2 |
| Opposition Scouting 4 | Comparative Analysis | 2-3h | Find similar opponents | Opposition Scouting 5 | Blocked by Opposition 3 |
| Opposition Scouting 5 | Dashboard Integration | 1-2h | Pre-game briefing UI | Opposition Scouting + Planner | Blocked by Opposition 4 |
| **Opposition Scouting + Planner 1** | Backend Infrastructure | 2-3h | Queue system, sheet, triggers | Opposition + Planner 2-4 | Blocked by Opposition Scouting 1-5 |
| Opposition + Planner 2 | Scouting Hub UI | 2-3h | Display all 26 insights | Opposition + Planner 3-4 | Blocked by Opposition + Planner 1 |
| Opposition + Planner 3 | Planner Modal Integration | 1-2h | Curated insights in Lineup Planner | Opposition + Planner 4 | Blocked by Opposition + Planner 2 |
| Opposition + Planner 4 | Polish & Testing | 1-2h | E2E flows, performance | None | Blocked by Opposition + Planner 3 |
| **Match Day Playbook 1** | Playbook Generator | 4h | AI-generated 1-page game sheet | None | Blocked by Opposition Scouting 5 |
| **Opponent Pattern Library 1** | Pattern Library Backend | 8h | Multi-season opponent library | None | Blocked by Opposition Scouting 5 |
| **Player Load Balance 1** | Load Tracking & Alerts | 6h | Cumulative quarter tracking + UI | None | Ready (parallel) |
| **Rolling Subs** | Rolling Substitutions | 24-30h | In-game position tracking | None | Ready (parallel to Combined AI) |
| **Coach Auth** | Coach Authentication | 3-4 weeks | Per-coach access control | Combined AI (recommended) | Ready (parallel to Combined AI) |
| **Live Game Clock** | Live Game Clock | 5-6h | Real-time game timer | None | Ready (parallel to Combined AI) |

**Legend:**
- 🔵 **⭐ Start Here** → Combined AI Phase 1
- 🟢 **Ready** → Can implement immediately (if blockers met)
- 🟡 **Blocked by** → Must complete prerequisite phases first
- 🔵 **Parallel** → Can run simultaneously with Combined AI

---

## Implementation Roadmap

### Critical Path (Must Do In Order)

| Plan | Status | Effort | Priority |
|------|--------|--------|----------|
| **[Combined AI Implementation](./COMBINED_AI_IMPLEMENTATION.md)** | ⭐ **START HERE** | 14-19h (foundation) + 20h (extended) | **Medium** |
| [Opposition Scouting](./OPPOSITION_SCOUTING_PLAN.md) | 📋 Planning (5 phases) | 12-16 hours | Medium |
| [Opposition Scouting + Planner Integration](./OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md) | 📋 Planning (after Scouting) | 6-8 hours | Medium |

### Feature Enhancements (After Opposition Scouting Complete)

| Plan | Status | Effort | Priority |
|------|--------|--------|----------|
| **Match Day Playbook Generator** | ✅ Ready | 4 hours | High (P0) |
| **Opponent Pattern Library** | ✅ Ready | 8 hours | High (P0) |
| **Player Load Balancing** | ✅ Ready | 6 hours | Medium (P1) |

### Parallel Tracks (Can Start After Combined AI)

| Plan | Status | Effort | Priority |
|------|--------|--------|----------|
| **[Rolling Subs](./ROLLING_SUBS_PLAN.md)** | ✅ Ready | 24-30 hours | High |
| **[Coach Authentication](./COACH_AUTH_PLAN.md)** | ✅ Ready | 3-4 weeks | Medium |
| [Live Game Clock](./LIVE_GAME_CLOCK_PLAN.md) | ✅ Research Complete | 5-6 hours | Low |

### Archived Reference (Superseded by Combined AI)

| Plan | Status | Notes |
|------|--------|-------|
| [Background AI](./BACKGROUND_AI_PLAN.md) | 📚 Reference | Core concepts merged into Combined AI |
| [Modular AI Architecture](./MODULAR_AI_ARCHITECTURE.md) | 📚 Reference | Subsumed by Combined AI foundation |
| [Extended Modular AI (12-15 Modules)](./EXTENDED_MODULAR_AI_ARCHITECTURE.md) | 📚 Reference | Extended scaling roadmap in Combined AI |

### Implementation Flow

```
Week 1-6:   Combined AI Implementation (FOUNDATION)
            ├─ Background queue infrastructure
            ├─ 5 core modules (Events → Patterns → Correlations → Tactics → Strategy)
            └─ Change detection + retry logic

Week 3-6:   [PARALLEL] Rolling Subs OR Coach Authentication (optional tracks)
            ├─ Rolling Subs: In-game position tracking
            └─ Coach Authentication: Per-coach access control

Week 7-10:  Opposition Scouting (5 phases)
            ├─ Phase 1: Profile Hub (opponent info + ladder + H2H)
            ├─ Phase 2: Scouting Notes (tactical notebook)
            ├─ Phase 3: AI Matchup Analyzer (upcoming, when Extended AI ready)
            ├─ Phase 4: Comparative Analysis (similar opponents)
            └─ Phase 5: Dashboard Integration (pre-game briefing)

Week 11-12: Opposition Scouting + Planner Integration (uses Phases 1-5)
            ├─ Phase 1: Backend infrastructure (queues, triggers, sheet)
            ├─ Phase 2: Scouting Hub UI (all 26 insights)
            ├─ Phase 3: Planner modal integration
            └─ Phase 4: Polish & testing

Week 13:    Feature Enhancements (parallel after Opposition Scouting)
            ├─ Match Day Playbook Generator (4h, leverages Opposition Scouting)
            ├─ Opponent Pattern Library Backend (8h, multi-season analysis)
            └─ Player Load Balancing (6h, position tracking)

Week 14+:   Extended AI (15 modules total)
            ├─ Phases 8-14 from Combined AI
            └─ Tier 2-4 modules (position-specific, tactical, advanced)
```

### Dependencies Summary

| Plan | Depends On | Blocks |
|------|-----------|--------|
| **Combined AI** | None | Opposition Scouting (recommended), Rolling Subs/Coach Auth (optional) |
| **Opposition Scouting** | None (stands alone) | Opposition Scouting + Planner Integration |
| **Opposition Scouting + Planner** | Opposition Scouting phases 1-5 | None |
| **Match Day Playbook** | Opposition Scouting 1-5 complete | None |
| **Opponent Pattern Library** | Opposition Scouting 1-5 + historical game data | None |
| **Player Load Balancing** | Lineup Planner (already exists) | None |
| **Rolling Subs** | Combined AI (recommended but not req'd) | Nothing |
| **Coach Authentication** | Combined AI (recommended but not req'd) | Nothing |
| **Live Game Clock** | None | Nothing |

---

## Plan Summaries

### Opposition Scouting (OPPOSITION_SCOUTING_PLAN.md)
**Purpose:** Build systematic opposition profiling and analysis system to help coaches prepare tactically for upcoming opponents.

**5 Implementation Phases (12-16 hours total):**

**Phase 1: Opponent Profile Hub (3-4h)**
- Centralized opponent viewing by fixture (upcoming & recent matches)
- Opponent detail page with ladder position, H2H history, recent form
- Uses existing API data (no new endpoints required)

**Phase 2: Coach Scouting Notes (2-3h)**
- Editable per-opponent tactical notebook (playing style, key players, formations, tactics)
- New OpponentScouting sheet in backend for persistence
- Sync across devices with user attribution and timestamps

**Phase 3: AI Matchup Analyzer (3-4h)**
- Integration with Extended AI Module 9 (Opposition Matchup Analyzer)
- AI analyzes matchups between our team and opponent
- Outputs: Tactical recommendations, key player matchups, game prediction
- Model: gemini-2.0-flash with 1-week cache

**Phase 4: Comparative Analysis (2-3h)**
- Find "similar opponents" (comparable ladder position, form, playing style)
- Comparative strength dashboard (head-to-head trends, formation comparison)
- No new API calls (derived data)

**Phase 5: Scouting Dashboard Integration (2-3h)**
- Pre-game briefing card on game detail view
- Enhanced fixture board showing opponent record and 8-game trend
- Scouting checklist modal for game prep workflow

**Note on Groups A-G:** The Opposition Scouting + Planner Integration references "26 analytics" organized in Groups A-G (Quarter Strength, Relative Strength, Efficiency, Vulnerabilities, Predictive, Advanced Patterns, Situational). These are the **analytical categories** used during AI generation in the Integration phase, not separate phases.

**Status:** 📋 Planning complete (Phases 1-5 defined)  
**Effort:** 12-16 hours across 4 weeks (5 phases)  
**Dependencies:** None (Phase 3 optional if waiting for Extended AI foundation)  
**Prerequisite For:** Opposition Scouting + Planner Integration (uses Phases 1-5 structure)  

---

### Opposition Scouting + Planner Integration (OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md)
**Purpose:** Automate opposition scouting analysis via weekend triggers, integrate insights into Lineup Planner, and provide manual refresh fallback.

**How It Relates to Opposition Scouting (Phases 1-5):**
- Opposition Scouting focuses on **manual features** (tactical notebook, comparative analysis, dashboard cards)
- Opposition Scouting + Planner Integration focuses on **automated AI analysis** using 26-insight framework (Groups A-G)
- Both are complementary—manual notes + automated intelligence = complete scouting system

**4 Implementation Phases (6-8 hours total):**

**Phase 1: Backend Infrastructure (2-3h)**
- Create OppositionScouting sheet (columns A-J for analytics storage)
- Set up PropertiesService queue: `opposition_queue_{teamID}_{round}_{sheetName}`
- Create time-based triggers: Saturday 6 PM (fixture collection), Sunday 10 AM (AI generation)
- Implement retry logic (max 3 attempts on failure)

**Phase 2: Scouting Hub UI (2-3h)**
- Standalone Scouting Hub page showing all 26 analytics grouped by A-G
- Narrative AI summary at top + detailed insights below
- Refresh button with two options: "Fast Data Only" (2 sec) or "Complete Insights" (15-30 sec)
- Status indicators (when data was generated, cache expires at)

**Phase 3: Planner Modal Integration (1-2h)**
- "Opposition" button in Lineup Planner sidebar
- Modal shows curated top 5 key insights (auto-selected from 26)
- Updates when coach clicks between different games
- Links to full Scouting Hub for deep dive

**Phase 4: Polish & Testing (1-2h)**
- Error handling (Gemini quota exceeded, network failures)
- Loading states and push notifications
- Responsive design (mobile/tablet/desktop)
- Backend metric logging for monitoring

**Processing Timeline:**
- **Saturday 6 PM:** Collects upcoming opponents + fresh ladder data, queues for AI
- **Sunday 10 AM:** Generates all 26 insights (15-30 sec per opponent), saves to sheet, caches for 7 days
- **Monday onward:** Coach reviews intelligence, uses in game planning + Planner
- **Anytime:** Manual refresh available if needed urgently

**26 Analytics Framework (Groups A-G):**
- Group A: Quarter Strength (Q1/Q2/Q3/Q4 opponent analysis) - 4 insights
- Group B: Relative Strength (vs our team's strengths) - 3 insights
- Group C: Efficiency (shooting, possession, scoring rate) - 3 insights
- Group D: Vulnerabilities (defensive gaps, exploitable weaknesses) - 3 insights
- Group E: Predictive (season trajectory, momentum, roster impact) - 3 insights
- Group F: Advanced Patterns (key combos, formations, position strengths) - 5 insights
- Group G: Situational (home/away, pressure situations) - 2 insights

**Queue Management:**
- Separate from game AI queue (no namespace collision)
- Stored in PropertiesService with script-level scope (not user-level)
- Survives app closure, survives multiple device access
- Handles multiple teams queuing simultaneously

**Status:** 📋 Planning complete (conflicts identified + resolved)  
**Effort:** 6-8 hours across 1 week (4 phases)  
**Dependencies:** Opposition Scouting Plan (phases 1-5 for manual features + scouting notes foundation)  
**Prerequisite For:** None (optional enhancement, doesn't block other features)  

**Related Documentation:**
- [Conflict Analysis & Fixes](./CONFLICT_ANALYSIS_AND_FIXES.md) - 5 conflicts identified, all resolved
- [Backend Spec](./OPPOSITION_SCOUTING_BACKEND_SPEC.md) - Sheet structure, API endpoints, data formats, deployment checklist  

---

### Combined AI Implementation (COMBINED_AI_IMPLEMENTATION.md) ⭐
**Purpose:** Complete AI system redesign combining background infrastructure + modular architecture (foundation + extended scaling).

**What's Included:**

**Foundation (Phases 1-7, 6 weeks):**
- Background Execution: Server-side queue for automatic AI after game finalization
- 5 Modular Modules: Events → Patterns → Correlations → Tactics → Strategy
- Smart Triggers: Background auto-generation with change detection
- Age-Aware: Automatic prompt customization by team age (U11 vs Adult)
- Reliable: Retry logic with manual fallback always available
- Efficient: 55% fewer AI calls, 50% cost savings

**Extended Scaling (Phases 8-14, 20 weeks):**
- 15 Total Modules in 4 Tiers (Foundation, Behavioral, Strategic, Advanced)
- Tier 2 (5 modules): Deep dives into position/chemistry/shooting/fatigue/opposition
- Tier 3 (3 modules): Advanced tactical planning (schedule, combos, defense)
- Tier 4 (3 modules): Complex reasoning (1.5-pro for development pathways, benchmarking, synthesis)
- Scales to 20+ teams without quota issues
- Phased low-risk rollout (14 phases total)

**Key Features:**
- Automatic AI generation (background queue)
- Modular architecture (no redundancy)
- Netball-specific knowledge (embedded in all modules)
- Priority 1 enhancements integrated (quarter strategy, mental resilience, plus-minus metrics)
- Extended roadmap (scaling guide from 5 → 15 modules)

**Coach Benefits:**
- No waiting for AI (background generation)
- Never need to click AI button (automatic)
- Consistent insights (modular design)
- Netball-specific advice (embedded knowledge)
- Always works (with fallback)
- Optional deep dives (extended modules for serious coaches)

**Status:** ✅ Ready for immediate implementation (foundation phase)  
**Foundation Calendar:** 6 weeks  
**Extended Roadmap:** 20 additional weeks (optional scaling)  
**Total Potential:** 26 weeks to full 15-module system  
**Blocks:** Opposition Scouting (recommended to start after foundation complete)  
**Can Run Parallel With:** Rolling Subs, Coach Authentication (weeks 3-6 of Combined AI)

---

### Rolling Substitutions (ROLLING_SUBS_PLAN.md)
**Purpose:** Track in-game substitutions during NFNA U13+ and NFNL games where unlimited position changes are allowed per quarter.

**Key Features:**
- Segment-based timing (Early/Mid/Late) for NFNA no-clock constraint
- Smart player filtering (show only bench players when subbing)
- Goal capture for GS/GA substitutions with live score pre-fill
- Plan deviations model (tracks changes to pre-planned lineups)
- Statistics integration (minutes on court, position versatility, combinations)

**5 Implementation Phases (24-30 hours total):**
- Phase 1 (4-5h): UI for marking subs (bench player list, position selector, timing)
- Phase 2 (4-5h): Data storage (substitution history, plan deviation tracking)
- Phase 3 (4-5h): Statistics integration (minutes on court, position versatility)
- Phase 4 (4-5h): Live game assistance (UI hints, quick-sub templates)
- Phase 5 (4-6h): Polish, testing, NFNA-specific edge cases

**Status:** ✅ Ready for implementation  
**Effort:** 24-30 hours across 5 phases  
**Dependencies:** None (can start after Combined AI foundation, weeks 3-6)  
**Can Run Parallel With:** Coach Authentication, Live Game Clock  

---

### Coach Authentication (COACH_AUTH_PLAN.md)
**Purpose:** Replace team-level PIN with coach-level authentication so each coach sees only their teams.

**Key Features:**
- Unique Coach ID (backend) + display name (UI)
- Name collision resolution ("Sarah L (Hazel Glen 6, HG U11)")
- Pin-less access for single-coach users
- Master PIN override for admin access
- Graceful migration from team PINs

**4 Implementation Phases (3-4 weeks total):**
- Phase 1 (3-4h): Coach registration + unique ID assignment
- Phase 2 (4-5h): Backend coach-team linking + access control
- Phase 3 (4-5h): Frontend UI (coach selection, name collision handling)
- Phase 4 (4-5h): Migration workflow (team PINs → coach auth, admin tools)

**Status:** ✅ Ready for implementation  
**Effort:** 3-4 weeks across 4 phases  
**Dependencies:** None (can start after Combined AI foundation, weeks 3-6)  
**Can Run Parallel With:** Rolling Subs, Live Game Clock  

---

### Live Game Clock (LIVE_GAME_CLOCK_PLAN.md)
**Purpose:** Display estimated game clock (quarter + time remaining) during live games for coaches without visible court clocks.

**Key Features:**
- 99.5% accurate clock estimation using continuous clock model
- Display-only (NOT used in stats calculations)
- Test button to validate live API endpoints during games
- Helps NFNA coaches time substitutions
- Useful for testing app during live games

**Implementation:**
- 5-6 hours development + live endpoint validation
- Integrates with existing game detail view
- Complements Rolling Subs feature (timing substitutions)

**Status:** ✅ Research complete - Clock estimation viable, live endpoints unconfirmed  
**Effort:** 5-6 hours implementation + live endpoint validation  
**Dependencies:** None (can start after Combined AI foundation, weeks 3-6)  
**Can Run Parallel With:** Rolling Subs, Coach Authentication  

---

### Background AI Generation (BACKGROUND_AI_PLAN.md)
**Purpose:** Automatically generate AI game summaries in the background after game finalization, removing friction and wait times.

**Key Features:**
- Time-based queue processing (every 10 minutes via Apps Script trigger)
- Automatic AI generation when game finalized (no button clicks needed)
- Works even if coach closes app (server-side processing)
- Manual "Generate Now" fallback if background fails
- Retry logic (max 3 attempts) with graceful degradation
- Queue monitoring in dev panel

**Status:** ✅ Ready for implementation  
**Effort:** 6-8 hours across 4 phases  
**Dependencies:** Builds on existing AI features (no blocking dependencies)  

---

### Modular AI Architecture (MODULAR_AI_ARCHITECTURE.md)
**Purpose:** Redesign AI features as specialized modules with no overlap, forming a comprehensive coaching knowledge base.

**Key Features:**
- 5 specialized AI modules (Event Analyzer, Pattern Detector, Training Correlator, Tactical Advisor, Season Strategist)
- Sequential processing with no redundancy (each module has exclusive domain)
- Incremental knowledge building (bottom-up, each layer builds on previous)
- Smart caching hierarchy (facts cached permanently, patterns cached 1 week, strategy cached 2 weeks)
- 55% fewer AI calls (11/week → 5/week) with better insights
- Structured JSON outputs (composable, reusable)
- Archived team filtering (saves quota on inactive teams)

**Status:** ✅ Ready for implementation (post-Background AI)  
**Effort:** 16-20 hours across 6 weeks (7 phases)  
**Dependencies:** Best implemented after Background AI (uses same queue infrastructure)  

---

### Extended Modular AI Architecture (EXTENDED_MODULAR_AI_ARCHITECTURE.md)
**Purpose:** Scale the 5-module AI from efficient to comprehensive by breaking into 12-15 specialized netball-specific modules maximizing domain expertise and insight depth.

**Architecture:**
- **Tier 1 (Foundation):** Modules 1-4 (Event, Pattern, Training, Tactical) — always generated
- **Tier 2 (Behavioral):** Modules 5-9 (Position Performance, Chemistry, Shooting Pattern, Rotation/Fatigue, Opposition Matchup) — user-triggered
- **Tier 3 (Strategic):** Modules 10-12 (SoS Tracker, Combination Scorer, Defensive System) — on-demand
- **Tier 4 (Advanced):** Modules 13-15 (Dev Pathway, Junior Benchmarking, Season Strategist) — uses gemini-1.5-pro for deep reasoning

**Key Features:**
- **Zero generic advice:** All 15 modules encode netball domain knowledge (positions, rules, tactics, age benchmarks)
- **Hyper-specific insights:** 12+ dedicated modules vs generic 5-module approach
- **Efficient scaling:** 20 teams → ~143 calls/day (9.5% quota) still leaving 90.5% headroom
- **No rate limit bottleneck:** Peak Saturday load ~400 calls, queue capacity 900/hour
- **Smart layering:** Modules build on each other (Event → Pattern → Chemistry/Position → Season Strategist)
- **Age-appropriate context:** Each module calibrates for U11 vs U13 vs U15 vs U17+ vs Adult
- **Implementation phased:** Phase 1 (behavioral 5-8), Phase 2 (strategic 9-12), Phase 3 (advanced 13-15), Phase 4 (optimization)

**Module Highlights:**
- **Module 5:** Position Performance Analyzer (contextualizes GS vs GA, WA vs WD)
- **Module 6:** Chemistry Dynamics (tracks GS-GA pair maturity on 8-12 game timeline)
- **Module 7:** Shooting Pattern Analyst (distinguishes fast-break vs set-play attacks)
- **Module 8:** Rotation & Fatigue Detector (fairness audits + age-appropriate load management)
- **Module 9:** Opposition Matchup Analyzer (historical "we beat them when" patterns)
- **Module 10:** Strength of Schedule Tracker (contextualize position with remaining fixtures)
- **Module 11:** Combination Scorer (top performing position combos + recommendations)
- **Module 12:** Defensive System Analyzer (zone vs player defense + effectiveness)
- **Module 13:** Developmental Pathway Recommender (identify next position for each player)
- **Module 14:** Junior-Specific Benchmarking (age-group context for performance)
- **Module 15:** Season Strategist (synthesizes all 14 modules into championship strategy)

**Netball Knowledge Integration:**
- All modules reference docs/netball-knowledge-base.md
- Position Roles (2.1-2.7) → Modules 1, 4, 5, 12
- Tactical Strategies (3.0-3.4) → Modules 4, 7, 9, 12
- Development Timelines (4.4) → Modules 3, 6, 8, 13
- Age-Group Coaching (4.0-4.5) → Modules 8, 13, 14
- Performance Metrics (6.0-6.3) → Modules 1, 5, 7, 14
- Coaching Challenges (7.0) → Modules 3, 8, 13, 14

**Validation:**
- See [EXTENDED_AI_VALIDATION_ANALYSIS.md](./EXTENDED_AI_VALIDATION_ANALYSIS.md) for detailed mapping
- 85% insight maximization (captures available netball knowledge)
- 90% overlap minimization (complementary modules, not redundant)
- 82% integration tightness (82% of knowledge base actively used)
- Quick-win enhancements available (+3% improvement, 6 hours effort)

**Status:** ✅ Ready for implementation (phased after 5-module foundation)  
**Effort:** 24-32 weeks across 4 phases (8 weeks behavioral, 8 weeks strategic, 4 weeks advanced, 12 weeks optimization)  
**Dependencies:** Requires 5-module foundation (MODULAR_AI_ARCHITECTURE.md) first  
**Quota Impact:** 5 modules (1.9%) → 12-15 modules (9.5%) still well under free tier limit  
**Next Step:** Review EXTENDED_AI_VALIDATION_ANALYSIS.md for priority enhancements

---

### Match Day Playbook Generator
**Purpose:** Auto-generate a 1-page coach game sheet combining Opposition Scouting insights with team-specific recommendations, printable or shareable.

**What It Does:**
- Bundles Opposition Scouting + Lineup Planner into a single pre-game briefing document
- AI generates: Opposition strengths/weaknesses, recommended formation, key matchups to win, defensive positioning, set plays to execute
- Coach prints or emails to players before match day
- Includes space for manual coach annotations

**Key Insight:**
Coaches currently spend 45-60 min manually writing the same info into team notebooks. Automation is huge efficiency gain without changing coaching workflow.

**Single Phase (4 hours total):**
- Input: Opposition Scouting data (all 26 insights from Opponent Profile Hub)
- Process: Gemini summarizes into 1-page brief format + position-specific advice
- Output: HTML/PDF playbook printable or PNG image shareable via email/Slack
- Integration: Button on game detail view + email scheduler

**Status:** ✅ Ready (depends on Opposition Scouting 1-5 complete)  
**Effort:** 4 hours  
**Dependencies:** Opposition Scouting phases 1-5  
**Why High Priority:** Concrete deliverable coaches will use for EVERY game (24 games/season × repeated formats)

---

### Opponent Pattern Library
**Purpose:** Build multi-season historical library of opponent playing patterns (formations, player positions, key players, trends) so Round 16+ prep is faster than Round 1.

**What It Does:**
- Stores snapshots of each opponent team across seasons (formations, key players, avg goals, possession %)
- AI identifies patterns: "This team always plays 2-back, rotates shooters Q3, scores avg 28/game"
- Coach searches "similar teams to HG" → finds teams with same formation and scoring style
- Tracks seasonal trends: "Their win rate declined Q9-Q14 last year (fatigue?)"

**Key Insight:**
Opposition Scouting is 1-off (this opponent, this round). But if HG plays 15 opponents over 2 seasons, 7 will reappear. Library captures that history, making re-prep 10x faster.

**Single Phase (8 hours total):**
- New OpponentPatternLibrary sheet (opponent name, formation, key players, seasonal stats, last updated)
- Auto-populate on first meet: Takes Opposition Scouting data, saves pattern snapshot
- Subsequent years: Pre-fill known patterns, coach confirms/updates
- AI comparison module: "Find opponents like this one" (via formation + scoring profile)
- Search UI: Opponent name autocomplete, filter by formation/division/avg score

**Data Structure:**
```
OpponentPatternLibrary sheet columns:
- A: OpponentName
- B: Division
- C: Formation (e.g., "2-back", "target + drive", "pair rotation")
- D: KeyPlayers (JSON: {name, position, preferred role})
- E: AvgScores (JSON: {season1: 26, season2: 28})
- F: AvgAgainst (JSON: {season1: 24, season2: 22})
- G: WinRateVsUs (e.g., "2-1" or "0-3")
- H: LastUpdated
- I: Seasons (e.g., "2024, 2025")
- J: Notes (AI-generated summary or coach annotations)
```

**Status:** ✅ Ready (depends on Opposition Scouting 1-5 + season of game data)  
**Effort:** 8 hours  
**Dependencies:** Opposition Scouting phases 1-5 complete + at least one full season of game data  
**Why High Priority:** Compounds over time (5% benefit Round 5 → 50% benefit Round 16)

---

### Player Load Balancing
**Purpose:** Track cumulative quarter usage across season and alert coaches to fatigue/fairness issues before injuries occur.

**What It Does:**
- Shows each player's cumulative quarter count (e.g., "Maya: 28Q played, league avg 20Q")
- Fatigue alerts: "3 players over 25Q, recommend benching 1 this round"
- Fair play audits: "Lily played 0Q last 2 games, recommend including"
- Integrates with Lineup Planner: Auto-suggest benching high-usage players when creating lineup
- Visual heatmap: Shows quarter distribution across season (which weeks were players overused)

**Key Insight:**
Overuse injures derail seasons (especially at U11-U15). Coaches often unintentionally overuse stars. Data-driven rotation keeps key players healthy and improves team consistency.

**Single Phase (6 hours total):**
- Backend: Track cumulative quarters per player per season (add to TeamData.playerUsage array)
- UI Data Overlay: On Lineup Planner, show "Maya: 28Q / league avg 20Q" badge
- Recommendation Engine: Flags players at fatigue risk (>25Q), suggests 1-2 to bench
- Import historical: Calculate from past lineups on first load

**Data Structure:**
```
state.currentTeamData.playerUsage = [
  { playerID, name, position, totalQarters, gamesUsed, avgPerGame, fatigueRisk: boolean },
  ...
]
```

**League Benchmark:**
- U11-U13: 18-22 quarters ideal (avg 20Q)
- U15: 20-24 quarters ideal (avg 22Q)
- U17-Adult: 24-28 quarters ideal (avg 26Q)

**Status:** ✅ Ready (no dependencies, builds on existing Lineup Planner)  
**Effort:** 6 hours  
**Dependencies:** Lineup Planner already exists  
**Why Medium Priority:** Valuable for injury prevention, less urgent than Opposition Scouting features

---

## Implementation Priority

**Recommended order:**

1. **Combined AI Phase 1** (Foundation - 6-8 hours)
   - Enable all subsequent AI features
   - Background queue infrastructure required

2. **Opposition Scouting Phases 1-5** (12-16 hours)
   - Provides tactical intelligence for opposition prep
   - Blocks Match Day Playbook and Opponent Pattern Library

3. **Match Day Playbook (4 hours)** 
   - Immediate coach-facing value (printed before every game)
   - Leverages Opposition Scouting investment
   - Quick ROI (coaches use for 24 games/season)

4. **Opponent Pattern Library (8 hours)**
   - Compounds over time (5% benefit early, 50% benefit by mid-season)
   - Reduces opposition research workload permanently
   - Database approach scales across teams

5. **Opposition Scouting + Planner Integration (6-8 hours)**
   - Automated 26-insight analysis (Sunday mornings)
   - Integrates with Lineup Planner for coaching decisions
   - Enables curated modal view during game planning

6. **Player Load Balancing (6 hours)**
   - Injury prevention (secondary benefit)
   - Can run in parallel with other features
   - Lower priority than opposition features

7. **Rolling Subs (24-30 hours, parallel track)**
   - Most requested feature
   - Enables better game-day tracking
   - Can implement alongside opposition features

8. **Live Game Clock (5-6 hours, after Rolling Subs Phase 2-3)**
   - Quick win enhancement
   - Integrates with Rolling Subs for timing

9. **Coach Authentication (3-4 weeks, parallel track)**
   - More complex migration
   - Recommended after core features stable
   - Can run in parallel but lower priority

---

## Updated Timeline

```
Week 1-6:   Combined AI Phase 1 (Foundation - BLOCKER)
            └─ Background queue infrastructure
               (unlocks Opposition Scouting, all other AI features)

Week 7-10:  Opposition Scouting Phases 1-5 (12-16h)
            ├─ Phase 1: Profile Hub
            ├─ Phase 2: Coaching Notes
            ├─ Phase 3: AI Matchup Analyzer
            ├─ Phase 4: Comparative Analysis
            └─ Phase 5: Dashboard Integration

Week 11:    Match Day Playbook (4h, P0)
            └─ Bundles Opposition Scouting into 1-page game sheet

Week 12:    Opponent Pattern Library (8h, P0)
            └─ Multi-season opponent analysis database

Week 13:    Opposition Scouting + Planner Integration (6-8h)
            ├─ Sunday automated 26-insight generation
            └─ Planner modal integration

Week 14:    Player Load Balancing (6h, P1)
            └─ Cumulative quarter tracking + fatigue alerts

Week 15+:   Extended AI (15-module expansion) + Rolling Subs + Coach Auth
            (parallel tracks)
```

---

---

## Planning Principles

All plans follow this structure:
- **Problem Statement** - What we're solving and why
- **Research** - API investigation, feasibility assessment
- **Design Options** - Multiple approaches evaluated
- **Recommended Solution** - Chosen approach with rationale
- **Implementation Phases** - Step-by-step breakdown with effort estimates
- **User Stories** - What coaches/users will be able to do
- **Data Structures** - Format and storage approach
- **Edge Cases** - Error handling and graceful degradation
- **Success Metrics** - How we'll measure if it works

**Key rule:** Plans are created BEFORE implementation. No code changes until plan is approved.

---

## Scope Notes

### ✅ Included Features
- **Opposition Scouting System** (26 analytics, pattern library, matchup analysis)
- **Match Day Playbook** (AI-generated 1-page game sheets)
- **Player Load Balancing** (fatigue tracking, fairness audits)
- **Rolling Substitutions** (in-game position tracking)
- **Coach Authentication** (per-coach access control)
- **Live Game Clock** (real-time timer)
- **Extended AI** (15-module expansion for advanced coaching)

### ❌ Out of Scope
- **Video Integration** — Excluded due to child safety policies and regulations in Australian netball. Not viable for grassroots teams.
- **Wearable Integration** — Beyond scope for grassroots clubs (cost/complexity)
- **Live Spectator Streaming** — Not prioritized; can revisit post-core features

---

## See Also

**Complete Specifications:**
- [OPPOSITION_SCOUTING_BACKEND_SPEC.md](./OPPOSITION_SCOUTING_BACKEND_SPEC.md) — OppositionScouting sheet definition, 4 API endpoints, queue data structures, deployment checklist
- [CONFLICT_ANALYSIS_AND_FIXES.md](./CONFLICT_ANALYSIS_AND_FIXES.md) — 5 conflicts identified between plans, detailed solutions, code examples

**Architecture & Context:**
- [CLAUDE.md](../CLAUDE.md) — Opposition Scouting System section (data sources, 26 analytics, processing pipeline, frontend integration)
- [COMBINED_AI_IMPLEMENTATION.md](./COMBINED_AI_IMPLEMENTATION.md) — 14-19 hour foundation phase + 20 hour extended phases
- [OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md](./OPPOSITION_SCOUTING_PLANNER_INTEGRATION.md) — 6-8 hour integration, Sunday processing, UI specs

---

## Notes

- All five plans are implementation-ready (no research blockers)
- No hard dependencies between features (can implement in any order)
- Rolling Subs + Live Clock work well together (complementary features)
- Background AI enhances existing AI features (quality-of-life improvement)
- Modular AI Architecture best after Background AI (reuses queue infrastructure)
- Coach Auth can run parallel to other features (different code areas)
- Total effort if implementing all: ~10-14 weeks (assuming one developer)
- Modular AI Architecture provides 55% cost savings on AI calls (major efficiency gain)

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Codebase overview and architecture
- [RELEASE_NOTES/](../RELEASE_NOTES/) - Historical feature releases
- [docs/](../docs/) - Technical documentation
