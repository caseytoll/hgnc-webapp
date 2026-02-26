# Modular AI Architecture - Implementation Plan

**Status:** Ready for planning  
**Estimated Effort:** 12-16 hours (redesign + migration)  
**Priority:** Medium (Future Enhancement)  
**Dependencies:** Builds on existing AI features + Background AI

---

## 1. Executive Summary

### Current State
AI features have **overlapping responsibilities**:
- Game AI Summary analyzes game + gives lineup recommendations
- Team AI Insights analyzes season + gives lineup recommendations
- Player AI Insights analyzes individual + gives position recommendations
- AI Training Focus analyzes notes + gives training recommendations

**Problems:**
- 🔄 **Redundancy:** Multiple AI calls analyzing same data from different angles
- 💸 **Inefficient:** Paying for overlapping analysis
- 😕 **Confusing:** Coach gets conflicting recommendations from different AI features
- 🗄️ **No knowledge base:** Each AI call starts from scratch, no shared context

### Proposed State
AI features become **specialized modules** with no overlap:

```
Raw Data → Event Analyzer → Pattern Detector → Correlator → Advisor → Strategist
           (What happened)  (Trends)         (Training)   (Tactics)  (Strategy)
```

Each module:
- ✅ Has a specific, non-overlapping scope
- ✅ Outputs structured data (not just text)
- ✅ References previous module outputs
- ✅ Builds incremental knowledge base
- ✅ Can be cached and reused

### Value Proposition
- **Efficiency:** No duplicate analysis, lower AI costs
- **Consistency:** Single source of truth for each insight type
- **Composability:** Modules combine to form comprehensive coaching knowledge
- **Maintainability:** Easier to update/improve individual modules
- **Extensibility:** New modules can plug into existing architecture

### Netball Domain Knowledge Integration

**Key Innovation:** Each module leverages specific sections of the netball knowledge base (docs/netball-knowledge-base.md) to provide expert-level analysis:

| Module | Knowledge Base Sections Used | Netball Expertise Applied |
|--------|------|-----|
| **Event Analyzer** | Rules & Regulations, Position Roles | Factual extraction within netball rules; position-specific stat analysis |
| **Pattern Detector** | Position Chemistry, Tactical Patterns, Age Benchmarks | Identify trends in GS-GA/GK-GD combinations; spot tactical patterns; benchmark against age-group norms |
| **Training Correlator** | Coaching Strategies, Position Development, Age-Specific Coaching | Link coach notes to actual performance changes; understand training timelines (8-12 quarters for chemistry) |
| **Tactical Advisor** | Tactical Strategies, Position Roles, Age-Specific Coaching | Recommend lineups respecting position restrictions; suggest tactics appropriate to opposition; tailor advice by age group |
| **Season Strategist** | Australian Competition Context, Performance Metrics, Development Pathways | Understand NFNL ladder system, strength of schedule, representative pathways; frame strategy within competition context |

**Architecture Benefit:** By encoding netball domain knowledge into each module, the AI never gives generic advice—every recommendation is netball-specific and rule-compliant.

---

## 2. Modular Architecture Design

### The Five AI Modules

#### Module 1: Game Event Analyzer 📊
**Scope:** Factual analysis of what happened in a single game

**Inputs:**
- Game scores (total + quarters)
- Lineup positions
- Opponent name
- Quarter notes (optional)

**Outputs (structured JSON):**
```json
{
  "gameID": "game_123",
  "facts": {
    "result": "win",
    "margin": 7,
    "quarters": {
      "Q1": { "score": { "us": 10, "them": 8 }, "momentum": "positive" },
      "Q2": { "score": { "us": 8, "them": 10 }, "momentum": "negative" },
      "Q3": { "score": { "us": 12, "them": 9 }, "momentum": "positive" },
      "Q4": { "score": { "us": 5, "them": 8 }, "momentum": "negative" }
    },
    "strongestQuarter": "Q3",
    "weakestQuarter": "Q4",
    "closingProblem": true
  },
  "playerContributions": [
    { "playerID": "p1", "name": "Sarah", "quarters": 4, "positions": ["GS", "GA"], "goals": 18, "impact": "high" },
    { "playerID": "p2", "name": "Emma", "quarters": 3, "positions": ["C", "WA"], "goals": 0, "impact": "medium" }
  ],
  "keyMoments": [
    { "quarter": "Q3", "description": "Strong defensive pressure", "source": "coach_notes" },
    { "quarter": "Q4", "description": "Fatigue visible in shooters", "source": "inference" }
  ],
  "summary": "Won by 7 goals against Diamond Creek. Strong start (Q1), dip in Q2, dominated Q3 (+3 advantage), but Q4 closing struggle (-3). Sarah led scoring with 18 goals across 4 quarters."
}
```

**Prompt Strategy:**
- Factual analysis only, no recommendations
- Focus on "what" not "why" or "how to fix"
- Extract patterns from coach notes
- Identify key moments objectively

**Cache Duration:** Permanent (game facts don't change)

---

#### Module 2: Pattern Detector 📈
**Scope:** Multi-game trends and trajectories

**Inputs:**
- Last 5 games' Event Analyzer outputs
- Historical player stats
- Season timeline

**Outputs (structured JSON):**
```json
{
  "teamID": "team_123",
  "patterns": {
    "closing": {
      "trend": "consistent_weakness",
      "evidence": ["Q4 -3 in R5", "Q4 -2 in R4", "Q4 -4 in R3"],
      "severity": "high",
      "since": "Round 3"
    },
    "defense": {
      "trend": "improving",
      "evidence": ["Avg goals against: R1-3 = 42, R4-5 = 38"],
      "severity": "positive"
    }
  },
  "playerTrajectories": [
    { 
      "playerID": "p1", 
      "name": "Sarah",
      "position": "GS",
      "scoring": { "trend": "stable", "avg": 18, "consistency": "high" },
      "quarters": { "trend": "increasing", "recent": 4, "previous": 3.2 }
    },
    {
      "playerID": "p3",
      "name": "Chloe",
      "position": "GK",
      "footwork": { "trend": "persistent_issue", "evidence": ["stepping in R1", "stepping in R2"], "improvement": null }
    }
  ],
  "combinationEffectiveness": [
    { "positions": ["GS-GA"], "players": ["Sarah", "Emma"], "goals": 25, "games": 3, "effectiveness": "high" },
    { "positions": ["C-WA"], "players": ["Lily", "Zoe"], "turnovers": 8, "games": 3, "effectiveness": "low" }
  ],
  "summary": "Team shows consistent Q4 fatigue pattern over last 3 games. Defense improving (42→38 avg). Sarah stable high performer. Chloe's footwork issue persists from R1. GS-GA combo effective, but midcourt turnovers increasing."
}
```

**Prompt Strategy:**
- Look for patterns across games (not single-game analysis)
- Identify trends (improving, declining, stable, persistent)
- Quantify with evidence from Event Analyzer outputs
- No recommendations, just pattern identification

**Cache Duration:** 1 week (patterns evolve slowly)

---

#### Module 3: Training Correlator 🔗
**Scope:** Link training sessions to game performance changes

**Inputs:**
- Training sessions (last 4 weeks)
- Player attendance records
- Pattern Detector output (player trajectories)
- Game Event Analyzer outputs (recent games)

**Outputs (structured JSON):**
```json
{
  "teamID": "team_123",
  "correlations": [
    {
      "issue": "Chloe stepping (footwork)",
      "gameEvidence": ["R1 notes", "R2 notes"],
      "trainingResponse": {
        "date": "2026-02-05",
        "focus": "Footwork and landing",
        "attendees": ["Sarah", "Emma", "Lily"],
        "absentees": ["Chloe"]
      },
      "outcome": "issue_persists",
      "reason": "player_missed_training"
    },
    {
      "issue": "Q4 fatigue pattern",
      "gameEvidence": ["Q4 -3 in R5", "Q4 -2 in R4"],
      "trainingResponse": {
        "date": "2026-02-12",
        "focus": "Fitness and endurance",
        "attendees": ["all_players"]
      },
      "outcome": "too_recent_to_measure",
      "next_evaluation": "Round 6"
    }
  ],
  "attendancePatterns": [
    { "playerID": "p3", "name": "Chloe", "attendance": "60%", "missed_critical": ["Footwork session"], "impact": "high" },
    { "playerID": "p2", "name": "Emma", "attendance": "100%", "missed_critical": [], "impact": "none" }
  ],
  "effectiveness": {
    "recent_training": "2026-02-12 Fitness",
    "targeted_issues": ["Q4 fatigue"],
    "expected_improvement": "visible_by_round_6",
    "monitoring": true
  },
  "summary": "Footwork training on Feb 5 addressed Chloe's stepping issue, but she missed the session—issue persists. Fitness training on Feb 12 targets Q4 fatigue; too early to measure impact. Chloe's 60% attendance correlated with persistent technique issues."
}
```

**Prompt Strategy:**
- Focus on cause-effect relationships (training → performance)
- Correlate attendance with skill improvement/decline
- Identify training effectiveness
- Timeline analysis (when trained, when measured)
- No generic advice, only specific correlations

**Cache Duration:** 2 weeks (correlations need fresh game data)

---

#### Module 4: Tactical Advisor 🎯
**Scope:** Actionable recommendations for lineup, positions, rotations

**Inputs:**
- Pattern Detector output (trends)
- Training Correlator output (what's working)
- Current roster
- Next opponent info (if available)

**Outputs (structured JSON):**
```json
{
  "teamID": "team_123",
  "forRound": 6,
  "recommendations": {
    "lineup": [
      {
        "priority": "high",
        "recommendation": "Rotate GS/GA in Q4",
        "rationale": "Q4 fatigue pattern evident; fresh legs may maintain scoring",
        "evidence": "Pattern Detector: Q4 -3 avg last 3 games",
        "implementation": "Sub Sarah → Bench at Q3 end, Emma → GS, Sarah back Q4 midpoint"
      },
      {
        "priority": "medium",
        "recommendation": "Strengthen midcourt in Q2",
        "rationale": "Q2 momentum loss recurring",
        "evidence": "Event Analyzer: Q2 negative momentum in 4/5 recent games",
        "implementation": "Consider C-WA swap to change pace"
      }
    ],
    "positions": [
      {
        "playerID": "p3",
        "name": "Chloe",
        "current": "GK",
        "recommendation": "Keep at GK, add 1:1 footwork",
        "rationale": "Position suitable but technique needs work",
        "evidence": "Training Correlator: Missed critical footwork session",
        "urgency": "high"
      }
    ],
    "substitutions": [
      {
        "scenario": "if_leading_by_10_plus_in_Q3",
        "action": "Rest key players (Sarah, Emma)",
        "purpose": "Preserve energy for Q4"
      }
    ]
  },
  "watchList": [
    "Q4 scoring rate (target: maintain within -1 of Q3)",
    "Chloe footwork (expect improvement if catch-up session completed)",
    "Midcourt turnovers (target: <5 per game)"
  ],
  "summary": "Focus on Q4 fatigue mitigation via rotation strategy. Consider midcourt changes to address Q2 dips. Priority: Chloe catch-up session before Round 6."
}
```

**Prompt Strategy:**
- Specific, actionable recommendations only
- Reference evidence from other modules (no redundant analysis)
- Prioritize by impact
- Include implementation details
- Watch list for next game

**Cache Duration:** 1 week (tactics evolve with new games)

---

#### Module 5: Season Strategist 🏆
**Scope:** Big-picture strategy, competition positioning, long-term development

**Inputs:**
- All recent module outputs
- Season stats (W-L-D, ladder position)
- Opponent difficulty ratings
- Competition context (standings, remaining games)
- Season timeline

**Outputs (structured JSON):**
```json
{
  "teamID": "team_123",
  "season": "Season 1 2026",
  "strategy": {
    "competitivePosition": {
      "ladder": "4th of 12",
      "trend": "stable",
      "realistic_goal": "Top 4 finish",
      "path": "Need 3+ wins from next 5 games"
    },
    "strengthsToLeverage": [
      {
        "strength": "Strong GS-GA combination",
        "evidence": "Pattern Detector: 25 goals/game avg with Sarah-Emma",
        "tactical_use": "Maximize their court time in tight games",
        "sustainability": "high"
      },
      {
        "strength": "Improving defense",
        "evidence": "Pattern Detector: Goals against 42→38",
        "tactical_use": "Pressure early, capitalize on turnovers",
        "sustainability": "medium (needs continued training)"
      }
    ],
    "vulnerabilitiesToAddress": [
      {
        "vulnerability": "Q4 fatigue",
        "severity": "high",
        "timeline": "2-3 weeks (training impact)",
        "mitigation": "Tactical Advisor rotation strategy + Fitness training",
        "priority": 1
      },
      {
        "vulnerability": "Inconsistent midcourt",
        "severity": "medium",
        "timeline": "ongoing",
        "mitigation": "Tactical Advisor position experiments + combination analysis",
        "priority": 2
      }
    ],
    "developmentFocus": [
      {
        "area": "Player depth",
        "rationale": "Over-reliance on Sarah (4 quarters every game)",
        "actions": ["Develop Emma's GS confidence", "Trial Zoe at GA in low-stakes quarters"],
        "timeline": "Rest of season"
      }
    ],
    "upcomingChallenges": [
      {
        "round": 6,
        "opponent": "Eltham (2nd on ladder)",
        "difficulty": "high",
        "approach": "Defensive focus, maximize scoring windows, fresh legs in Q4"
      }
    ]
  },
  "summary": "Sitting 4th, realistic Top 4 finish achievable. Leverage strong shooting combo and improving defense. Critical: address Q4 fatigue (in progress). Upcoming tough game vs Eltham—defensive game plan. Long-term: develop player depth to reduce Sarah's load."
}
```

**Prompt Strategy:**
- Strategic "big picture" only (not individual game tactics)
- Long-term thinking (season arc, development pipeline)
- Competition context (ladder, opponents, path to goals)
- Risk assessment and mitigation
- No game-by-game detail (reference Tactical Advisor for that)

**Cache Duration:** 2 weeks (strategy evolves with ladder position)

**Model Selection:** `gemini-1.5-pro` recommended (see optimization note below)

---

### Model Selection Optimization

While all modules can use **gemini-2.0-flash** (current standard), certain modules benefit from **gemini-1.5-pro** for deeper reasoning:

| Module | Recommended Model | Rationale |
|--------|------------------|----------|
| Event Analyzer | gemini-2.0-flash | Fast factual extraction, structured data |
| Pattern Detector | gemini-2.0-flash | Pattern recognition from structured facts |
| Training Correlator | gemini-2.0-flash | Causation analysis, structured correlations |
| Tactical Advisor | gemini-2.0-flash | Tactical recommendations, structured output |
| **Season Strategist** | **gemini-1.5-pro** | Complex multi-game reasoning, strategic thinking, long-term planning |

**Why 1.5 Pro for Season Strategist:**
- ✅ **Complex reasoning:** Synthesizes 10+ games' worth of context + ladder + competition
- ✅ **Multi-step analysis:** "If X then Y, but considering Z" strategic thinking
- ✅ **2M token context:** Can include full season history if needed
- ✅ **Runs infrequently:** 2-week cache = ~2-3 calls/month, rate limits not a concern
- ✅ **Higher value output:** Season strategy is highest-impact insight for coaches

**Trade-offs:**
- ⚠️ Slower: 5-8s response time vs 2-3s (acceptable for on-demand, not background)
- ⚠️ Lower rate limit: 2 req/min (fine for single module with long cache)
- ✅ Free tier: Same cost as 2.0 Flash (no incremental cost)

**Implementation:**
```javascript
function callModuleAI(moduleName, prompt) {
  const model = moduleName === 'SeasonStrategist' 
    ? 'gemini-1.5-pro'
    : 'gemini-2.0-flash';
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  // ... rest of API call
}
```

**Optimization Result:**
- 4/5 modules use fast 2.0 Flash (Event, Pattern, Training, Tactical)
- 1/5 modules use deep-reasoning 1.5 Pro (Season only)
- Best of both worlds: Speed + quality where it matters most

---

## 2.5 Netball Domain Knowledge Per Module

**How each module leverages netball expertise from docs/netball-knowledge-base.md:**

### Event Analyzer - Rules & Position Expertise
**Knowledge Base Sections:** Official Rules, Position Roles, Performance Metrics

**Application:**
- **Rules Validation:** Extract goals, quarters, possession timing within netball constraints
- **Position Analysis:** Understand which positions can score (GS/GA only), who can play where (zone restrictions)
- **Stat Interpretation:** Goals by GS vs GA tells story of attacking structure
- **Outcome:** Clean factual analysis respecting netball rules and position-specific metrics

**Example:**
```
Raw input: GS-Sarah: 12 goals (4Q), GA-Emma: 8 goals (3Q)
Event Analyzer output: "Sarah dominated scoring (60% of total), played all quarters indicating coach confidence. Emma selective in Q1-Q3, suggesting fresh legs for crucial moments."
(Note: Correctly interprets that GA can score AND support, not just one role)
```

### Pattern Detector - Chemistry & Tactical Context
**Knowledge Base Sections:** Position Pairings, Tactical Patterns, Age-Group Benchmarks

**Application:**
- **Chemistry Timeline:** Know GS-GA needs 8-12 quarters, GK-GD needs 10-15 quarters
- **Tactical Patterns:** Recognize attacking patterns (hold-and-feed vs fast-break)
- **Benchmarking:** Compare team stats to age-appropriate benchmarks (U13: 3-5 goals/quarter is good)
- **Trend Interpretation:** Know what changes are normal vs problematic by age group
- **Outcome:** Identify real trends vs noise by understanding netball context

**Example:**
```
Pattern Detector sees: Sarah-Emma shooting pair changed 3 games running
Without knowledge: "Unstable attack, need consistency"
With knowledge: "Below the 8-game chemistry threshold, expect shooting % to improve Q4 when pair settles"
(Recognizes that frequent change prevents chemistry, and gives timeline for improvement)
```

### Training Correlator - Development Timelines & Age-Specific Coaching
**Knowledge Base Sections:** Age-Group Coaching, Coaching Strategies, Tactical Development

**Application:**
- **Training Timeline:** Understand defensive chemistry needs 10-15 games, not 3-4
- **Age-Appropriate Expectations:** U11 learning fundamentals ≠ U15 learning tactics
- **Coaching Context:** Link coach notes (e.g., "footwork drills") to position development timeline
- **Correlation Reality Check:** Know that one training session won't fix Q4 fatigue (fitness progression needed)
- **Outcome:** Realistic assessment of training impact with appropriate timelines

**Example:**
```
Coach notes: "GK and new GD did footwork drills in training"
Correlator sees: Goals against next game still 7/quarter (same as before)
Without knowledge: "Training ineffective"
With knowledge: "GK-GD pair needs 10-15 combined games to build communication and trust. Drills improving mechanics (good), but defensive system integration takes more time. Expected improvement by game 4-5 together."
(Distinguishes between player improvement and pair chemistry development)
```

### Tactical Advisor - Position Restrictions & Appropriate Tactics
**Knowledge Base Sections:** Tactical Strategies, Position Roles, Zone Restrictions

**Application:**
- **Zone Validation:** Never suggest WA defending (can't enter defending third)
- **Position-Specific Tactics:** GK pressure vs WA feeding are different problems
- **Appropriateness Filtering:** Opponent adaptation vs capability assessment (know which is which)
- **Age-Appropriate Tactics:** U11 avoiding complex set plays, U17 able to execute sophisticated rotations
- **Outcome:** Recommendations that are actually executable by this team with these restrictions

**Example:**
```
Tactical Advisor trying to suggest: "Drop WA to defense more to pressure opposition"
Knowledge check: "WA cannot enter defending third (zone restriction)"
Corrected recommendation: "Use your WD to press opposition WA more aggressively, or have C help with defensive pressure"
(Prevents impossible recommendations before they reach coach)
```

### Season Strategist - Competition Context & Development Pathways
**Knowledge Base Sections:** Australian Competition Context, Development Pathways, Performance Analysis

**Application:**
- **NFNL Ladder Understanding:** Current position context (is 4th place a realistic goal given opponent strength?)
- **Ladder Position Implications:** Top teams ≠ available opposition
- **Strength of Schedule:** Know which remaining fixtures are winnable vs stretch goals
- **Pathway Context:** U17 team focus on representative selection vs winning NFNL
- **Long-term Planning:** Season arc understanding (early-season development vs finals peaking)
- **Outcome:** Strategy recommendations grounded in competition reality, not generic advice

**Example:**
```
Season Strategist sees: U15 team is 7th on 12-team ladder
Without knowledge: "Focus on winning to make finals"
With knowledge: 
- Ladder shows 3rd place has 2 wins more, probably unachievable
- Remaining fixtures include ladder 1-2 (very difficult)
- Focus should be "consolidate 6th-8th range while developing key players"
- Finals less realistic than representative pathway, reframe season goals accordingly
(Balances winning with realistic development context)
```

---

## 3. Data Flow Architecture

### Sequential Processing

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: FACT EXTRACTION (per game)                            │
├─────────────────────────────────────────────────────────────────┤
│ Game Event Analyzer                                             │
│ • Runs: After game finalized (background)                       │
│ • Inputs: Raw game data                                         │
│ • Outputs: Structured facts JSON                                │
│ • Cost: 1 AI call per game                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: PATTERN ANALYSIS (multi-game)                         │
├─────────────────────────────────────────────────────────────────┤
│ Pattern Detector                                                │
│ • Runs: When coach opens Stats tab (on-demand)                  │
│ • Inputs: Last 5 games' Event Analyzer outputs                  │
│ • Outputs: Trends, trajectories, combinations                   │
│ • Cost: 1 AI call per stats view (cached 1 week)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: TRAINING CORRELATION (performance ↔ training)         │
├─────────────────────────────────────────────────────────────────┤
│ Training Correlator                                             │
│ • Runs: When coach opens Training tab (on-demand)               │
│ • Inputs: Pattern Detector + Training sessions                  │
│ • Outputs: Cause-effect relationships, effectiveness            │
│ • Cost: 1 AI call per training tab view (cached 2 weeks)       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 4: TACTICAL RECOMMENDATIONS (next game)                  │
├─────────────────────────────────────────────────────────────────┤
│ Tactical Advisor                                                │
│ • Runs: When coach opens Lineup Planner (on-demand)             │
│ • Inputs: Pattern Detector + Training Correlator                │
│ • Outputs: Actionable lineup/position/sub recommendations       │
│ • Cost: 1 AI call per planner view (cached 1 week)             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 5: STRATEGIC PLANNING (season-level)                     │
├─────────────────────────────────────────────────────────────────┤
│ Season Strategist                                               │
│ • Runs: When coach opens Stats → Overview (on-demand)           │
│ • Inputs: All other modules + ladder/competition context        │
│ • Outputs: Big-picture strategy, season goals, development plan │
│ • Cost: 1 AI call per overview (cached 2 weeks)                │
└─────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Bottom-up knowledge building**
   - Each layer builds on previous layer
   - No layer analyzes raw data already processed below
   - Minimal context passed forward (structured data, not full prompts)

2. **Caching hierarchy**
   - Facts cached permanently (games don't change)
   - Patterns cached 1 week (slow-moving trends)
   - Correlations cached 2 weeks (training impact visible over time)
   - Tactics cached 1 week (evolve with new games)
   - Strategy cached 2 weeks (big picture changes slowly)

3. **Cost efficiency**
   - Game Event Analyzer: Only AI that touches raw data (1× per game)
   - Other modules reference structured outputs (much smaller context)
   - 80% cost reduction vs. current approach (4 separate full-context AI calls)

4. **No redundancy**
   - Each module has exclusive domain
   - No overlapping analysis
   - Single source of truth per insight type

---

## 4. Data Structures

### Module Output Storage

**Backend (Google Sheets):**
```javascript
// New sheet tab: AI_Knowledge_Base
// Columns: TeamID, GameID, ModuleType, GeneratedAt, OutputJSON, Version

// Example rows:
{
  teamID: "team_123",
  gameID: "game_456",
  moduleType: "event_analyzer",
  generatedAt: "2026-02-20T10:30:00Z",
  outputJSON: "{...}", // Structured JSON from module
  version: "1.0"
}

{
  teamID: "team_123",
  gameID: null,  // Multi-game modules have no gameID
  moduleType: "pattern_detector",
  generatedAt: "2026-02-20T14:15:00Z",
  outputJSON: "{...}",
  version: "1.0"
}
```

**Frontend (localStorage cache):**
```javascript
// Cache key format: ai_module_{teamID}_{moduleType}_{gameID?}
localStorage.setItem('ai_module_team_123_event_analyzer_game_456', JSON.stringify({
  data: { /* module output */ },
  cachedAt: "2026-02-20T10:30:00Z",
  ttl: null  // Permanent for event analyzer
}));

localStorage.setItem('ai_module_team_123_pattern_detector', JSON.stringify({
  data: { /* module output */ },
  cachedAt: "2026-02-20T14:15:00Z",
  ttl: 604800000  // 1 week in ms
}));
```

---

## 5. Migration Strategy

### Phase 1: Add Game Event Analyzer (Keep Existing)

**Goal:** Introduce new module alongside current AI features

**Actions:**
1. Create `Game Event Analyzer` (factual analysis only)
2. Update Background AI to call Event Analyzer instead of current Game AI Summary
3. Store structured output in AI_Knowledge_Base sheet
4. Keep existing AI features unchanged (parallel operation)

**Testing:**
- Compare Event Analyzer facts vs. Game AI Summary facts
- Verify structured output format
- Check cache persistence

**Outcome:** New factual layer established, no functionality lost

---

### Phase 2: Replace Game AI Summary

**Goal:** Migrate game detail view to use Event Analyzer output

**Actions:**
1. Update game detail view to read Event Analyzer structured output
2. Format for display (expand JSON → human-readable)
3. Add fallback to current Game AI Summary (if Event Analyzer not available)
4. Deprecate old game summary generation (stop generating new ones)

**Testing:**
- Verify game detail display matches previous quality
- Test fallback for old games (no Event Analyzer output)
- Confirm background generation working

**Outcome:** Game-level AI migrated to modular approach

---

### Phase 3: Add Pattern Detector

**Goal:** Introduce trend analysis module

**Actions:**
1. Create `Pattern Detector` (multi-game trends)
2. Trigger on Stats tab open (on-demand, cached)
3. Reference Event Analyzer outputs (not raw game data)
4. Display in new "Patterns" section of Stats → Overview

**Testing:**
- Verify pattern detection quality
- Check caching (shouldn't regenerate within 1 week)
- Test with incomplete Historical data (some games missing Event Analyzer)

**Outcome:** Trend analysis layer established

---

### Phase 4: Add Training Correlator

**Goal:** Replace AI Training Focus with correlation module

**Actions:**
1. Create `Training Correlator` (training ↔ performance)
2. Trigger on Training tab open (on-demand, cached)
3. Reference Pattern Detector output (not raw game notes)
4. Display in Training tab (replace current AI Training Focus)

**Testing:**
- Compare correlation quality vs. old Training Focus
- Verify attendance correlation logic
- Test with sparse training data

**Outcome:** Training analysis migrated to modular approach

---

### Phase 5: Add Tactical Advisor

**Goal:** Provide lineup/position recommendations

**Actions:**
1. Create `Tactical Advisor` (actionable recommendations)
2. Trigger in Lineup Planner or Game detail (new "AI Suggestions" button)
3. Reference Pattern Detector + Training Correlator outputs
4. Display as suggestions panel (not replacing existing UI)

**Testing:**
- Verify recommendation quality and specificity
- Check evidence linking (references to other modules)
- Test with various team situations

**Outcome:** Tactical layer established

---

### Phase 6: Add Season Strategist

**Goal:** Replace Team AI Insights with strategic module

**Actions:**
1. Create `Season Strategist` (big-picture strategy)
2. Trigger on Stats → Overview open (replace current Team AI Insights)
3. Reference all other modules + competition context
4. Display as season strategy section

**Testing:**
- Compare strategic quality vs. old Team AI Insights
- Verify competition context integration (ladder, opponents)
- Test long-term development planning

**Outcome:** All AI features migrated to modular architecture

---

### Phase 7: Deprecate Old AI Features

**Goal:** Remove legacy AI implementations

**Actions:**
1. Remove old AI generation functions from backend
2. Clean up old AI prompt templates
3. Remove old UI components (AI summary buttons)
4. Archive old AI outputs (keep data, stop generating)

**Testing:**
- Verify no broken references
- Check that all functionality available via new modules
- Test with teams that have old AI data

**Outcome:** Clean modular architecture, legacy removed

---

## 6. Implementation Phases

### Phase 1: Game Event Analyzer (3-4 hours)

**Backend:**
- [ ] Create `generateGameEventAnalysis()` function
- [ ] Structured JSON output format
- [ ] Store in AI_Knowledge_Base sheet
- [ ] Update Background AI to call Event Analyzer

**Frontend:**
- [ ] Read Event Analyzer output in game detail
- [ ] Format structured JSON for display
- [ ] Fallback to old AI summary if missing

**Testing:**
- [ ] Compare quality vs. current Game AI Summary
- [ ] Verify caching and background generation

---

### Phase 2: Pattern Detector (3-4 hours)

**Backend:**
- [ ] Create `generatePatternAnalysis()` function
- [ ] Multi-game trend detection logic
- [ ] Reference Event Analyzer outputs (not raw data)
- [ ] Cache management (1 week TTL)

**Frontend:**
- [ ] Trigger on Stats tab open
- [ ] Display patterns in new "Patterns" section
- [ ] Cache in localStorage

**Testing:**
- [ ] Verify trend detection quality
- [ ] Check cache behavior (no unnecessary regeneration)

---

### Phase 3: Training Correlator (3-4 hours)

**Backend:**
- [ ] Create `generateTrainingCorrelation()` function
- [ ] Attendance correlation logic
- [ ] Reference Pattern Detector output
- [ ] Cache management (2 week TTL)

**Frontend:**
- [ ] Trigger on Training tab open
- [ ] Replace current AI Training Focus UI
- [ ] Display correlations and effectiveness

**Testing:**
- [ ] Compare quality vs. old Training Focus
- [ ] Verify attendance analysis

---

### Phase 4: Tactical Advisor (3-4 hours)

**Backend:**
- [ ] Create `generateTacticalRecommendations()` function
- [ ] Actionable lineup/position suggestions
- [ ] Reference Pattern + Correlator outputs
- [ ] Cache management (1 week TTL)

**Frontend:**
- [ ] Add "AI Suggestions" button in Lineup Planner
- [ ] Display recommendations with evidence
- [ ] Show watch list for next game

**Testing:**
- [ ] Verify recommendation specificity
- [ ] Check evidence linking

---

### Phase 5: Season Strategist (2-3 hours)

**Backend:**
- [ ] Create `generateSeasonStrategy()` function
- [ ] Big-picture strategic analysis
- [ ] Reference all modules + competition context
- [ ] Cache management (2 week TTL)

**Frontend:**
- [ ] Replace Team AI Insights in Stats → Overview
- [ ] Display season strategy with ladder context
- [ ] Show development focus areas

**Testing:**
- [ ] Compare quality vs. old Team Insights
- [ ] Verify competition context integration

---

### Phase 6: Cleanup & Migration (2-3 hours)

**Backend:**
- [ ] Deprecate old AI functions
- [ ] Remove old prompt templates
- [ ] Archive old AI outputs

**Frontend:**
- [ ] Remove old AI UI components
- [ ] Clean up old cache keys
- [ ] Update documentation

**Testing:**
- [ ] Verify all functionality intact
- [ ] Test with old team data

---

## 7. Cost Analysis

### Current AI Architecture (Per Team, Per Week)

Assuming:
- 2 games per week
- Coach views stats 3× per week
- Coach views training tab 1× per week
- Coach views player stats 5× per week

**AI Calls:**
- Game AI Summary: 2 games × 1 call = **2 calls**
- Team AI Insights: 3 views × 1 call = **3 calls** (no cache)
- AI Training Focus: 1 view × 1 call = **1 call** (no cache)
- Player AI Insights: 5 views × 1 call = **5 calls** (no cache)

**Total per week:** **11 AI calls**  
**Cost (Gemini free tier):** $0 (under 1500/day limit)  
**Cost (paid tier):** 11 × $0.00025 = **$0.00275/week** = **$0.14/year per team**

---

### Modular AI Architecture (Per Team, Per Week)

**AI Calls:**
- Game Event Analyzer: 2 games × 1 call = **2 calls** (background, cached forever)
- Pattern Detector: 1 call/week (cached 1 week) = **1 call**
- Training Correlator: 1 call/2 weeks (cached 2 weeks) = **0.5 calls**
- Tactical Advisor: 1 call/week (cached 1 week) = **1 call**
- Season Strategist: 1 call/2 weeks (cached 2 weeks) = **0.5 calls**

**Total per week:** **5 calls**  
**Cost (paid tier):** 5 × $0.00025 = **$0.00125/week** = **$0.065/year per team**

---

### Savings

**AI calls per week:** 11 → 5 = **55% reduction**  
**Cost per year:** $0.14 → $0.065 = **54% cost savings**  
**10 active teams:** $1.40 → $0.65 per year = **$0.75 saved**

**Benefits beyond cost:**
- ✅ Better caching = faster UI (no waiting for AI)
- ✅ Consistent insights (single source of truth)
- ✅ Incremental knowledge base (builds over season)
- ✅ Easier to maintain and improve (modular)

---

## 8. UI Integration Points

### Game Detail View
**Display:** Event Analyzer output
- Factual summary of game
- Quarter breakdown with momentum
- Player contributions
- Key moments
- Link to Tactical Advisor recommendations

---

### Stats → Overview Tab
**Display:** Season Strategist output
- Competitive position and ladder trend
- Strengths to leverage (with evidence)
- Vulnerabilities to address (prioritized)
- Development focus areas
- Upcoming challenges
- Link to Pattern Detector details

---

### Stats → Patterns Tab (NEW)
**Display:** Pattern Detector output
- Team trend cards (closing, defense, offense, etc.)
- Player trajectory cards (improving, declining, stable)
- Combination effectiveness matrix
- Evidence links to specific games

---

### Training Tab
**Display:** Training Correlator output
- Issue → Training → Outcome timeline
- Attendance patterns and impact
- Training effectiveness assessment
- Catch-up recommendations
- Link to Tactical Advisor for next steps

---

### Lineup Planner
**Display:** Tactical Advisor output
- "AI Suggestions" expandable panel
- Lineup recommendations with rationale
- Position-specific advice
- Substitution scenarios
- Watch list for this game
- Evidence links to Pattern Detector and Training Correlator

---

### Player Stats Modal
**Display:** Subset of Pattern Detector output
- This player's trajectory (factual)
- Position effectiveness
- Attendance correlation (from Training Correlator)
- Link to Tactical Advisor for recommendations

---

## 9. Prompt Engineering Strategy

### Module-Specific Prompt Constraints

#### Game Event Analyzer
```
You are a factual game analyst. Analyze ONLY what happened in this specific game.

STRICT RULES:
- NO recommendations or suggestions
- NO analysis of trends across games (only this game)
- NO opinion or speculation
- FACTS ONLY: scores, positions, observations from notes

OUTPUT FORMAT: JSON with:
- facts (result, scores, quarters with momentum)
- playerContributions (quarters played, positions, goals, impact level)
- keyMoments (from coach notes or inference)
- summary (2-3 sentence factual recap)
```

#### Pattern Detector
```
You are a pattern recognition specialist. Analyze trends across the last 5 games.

STRICT RULES:
- NO single-game details (reference Event Analyzer outputs)
- NO recommendations (only pattern identification)
- QUANTIFY trends with evidence (improving, declining, stable, persistent)
- NO speculation beyond data

INPUTS: Event Analyzer outputs for games [IDs]

OUTPUT FORMAT: JSON with:
- patterns (team-level trends with evidence)
- playerTrajectories (individual trends with evidence)
- combinationEffectiveness (position group trends)
- summary
```

#### Training Correlator
```
You are a training effectiveness analyst. Correlate training sessions with game performance.

STRICT RULES:
- NO generic training advice
- ONLY analyze cause-effect (training → performance change)
- Track attendance vs. improvement/decline
- NO recommendations (only correlations)

INPUTS: 
- Training sessions (last 4 weeks)
- Pattern Detector output
- Event Analyzer outputs (recent games)

OUTPUT FORMAT: JSON with:
- correlations (issue → training → outcome)
- attendancePatterns (who missed what, impact)
- effectiveness (recent training assessment)
- summary
```

#### Tactical Advisor
```
You are a tactical advisor for the next game. Provide SPECIFIC actionable recommendations.

STRICT RULES:
- NO redundant analysis (reference Pattern Detector, Training Correlator)
- SPECIFIC recommendations with implementation details
- Prioritize by impact
- Include watch list for next game
- MUST cite evidence from other modules

INPUTS:
- Pattern Detector output
- Training Correlator output
- Current roster
- Next opponent (if available)

OUTPUT FORMAT: JSON with:
- recommendations (lineup, positions, substitutions with rationale and evidence)
- watchList (metrics to monitor next game)
- summary
```

#### Season Strategist
```
You are a season strategist. Provide big-picture strategy for the season.

STRICT RULES:
- NO game-by-game tactics (reference Tactical Advisor)
- STRATEGIC level only (season arc, development, competition positioning)
- Include ladder/competition context
- Long-term thinking (rest of season)
- MUST cite evidence from other modules

INPUTS:
- All module outputs
- Season stats (W-L-D, ladder position)
- Competition standings
- Season timeline

OUTPUT FORMAT: JSON with:
- strategy (competitive position, strengths, vulnerabilities, development focus, upcoming challenges)
- summary
```

---

## 10. Testing Strategy

### Unit Tests (Per Module)

**Test each module in isolation:**
- ✅ Input validation (reject invalid data)
- ✅ Output format validation (matches JSON schema)
- ✅ Prompt constraint adherence (no overlap with other modules)
- ✅ Cache behavior (TTL, invalidation)

---

### Integration Tests

**Test module dependencies:**
- ✅ Pattern Detector correctly reads Event Analyzer outputs
- ✅ Training Correlator references Pattern Detector data
- ✅ Tactical Advisor combines Pattern + Correlator inputs
- ✅ Season Strategist aggregates all modules

---

### Quality Tests

**Compare modular vs. current AI:**
- ✅ Factual accuracy (Event Analyzer vs. Game Summary)
- ✅ Insight depth (Pattern Detector vs. Team Insights)
- ✅ Recommendation specificity (Tactical Advisor vs. manual)
- ✅ Strategic coherence (Season Strategist vs. Team Insights)

---

### Performance Tests

**Cache effectiveness:**
- ✅ Average cache hits (target: >80%)
- ✅ AI call reduction (target: 50%+)
- ✅ UI speed improvement (target: <500ms load time)

---

## 11. Rollout Plan

### Week 1: Phase 1 - Game Event Analyzer
- Implement Event Analyzer
- Update Background AI
- Test factual quality
- Deploy to production (parallel with old system)

### Week 2-3: Phase 2-3 - Pattern Detector + Training Correlator
- Implement Pattern Detector
- Implement Training Correlator
- Update Stats and Training tabs
- Test caching behavior
- Deploy to production

### Week 4-5: Phase 4-5 - Tactical Advisor + Season Strategist
- Implement Tactical Advisor
- Implement Season Strategist
- Update Lineup Planner and Stats Overview
- Test module interdependencies
- Deploy to production

### Week 6: Phase 6 - Cleanup
- Deprecate old AI functions
- Clean up old UI
- Performance testing
- Documentation updates

---

## 12. Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **AI call reduction** | >50% | Count AI calls before/after |
| **Cache hit rate** | >80% | Track cache hits vs. misses |
| **UI speed** | <500ms | Time from tab open to display |
| **Coach satisfaction** | Positive | Informal feedback on insights |
| **Cost savings** | 50%+ | Track Gemini API costs |
| **Insight consistency** | No conflicts | Review recommendations across modules |

---

## 13. Future Enhancements

### Post-Launch Extensions

1. **Player Development Tracker Module**
   - Track individual skill progression over time
   - Correlate training focus with skill improvement
   - Personalized development plans

2. **Opposition Analysis Module**
   - Analyze opponent patterns (from own game notes)
   - Pre-game opponent briefings
   - Counter-strategy recommendations

3. **Rotation Optimizer Module**
   - AI-generated rotation plans
   - Fatigue modeling
   - Position coverage optimization

4. **Season Simulation Module**
   - "What if" scenario modeling
   - Ladder prediction based on current trends
   - Risk-adjusted strategy recommendations

---

## 14. Documentation Updates

After implementation:
- [ ] Update CLAUDE.md with modular AI architecture
- [ ] Document JSON schemas for each module
- [ ] API endpoint documentation (5 new actions)
- [ ] Cache management guide
- [ ] Migration notes for old AI data

---

## 15. Open Questions

1. **Backward compatibility:** How to handle teams with old AI data?
   - **Recommendation:** Fallback to old AI if module outputs missing

2. **Module versioning:** How to update modules without breaking old outputs?
   - **Recommendation:** Version field in AI_Knowledge_Base sheet, backward-compatible parsing

3. **Partial module failure:** What if Pattern Detector fails but Event Analyzer worked?
   - **Recommendation:** Graceful degradation, display factual data only, show "patterns unavailable" message

4. **Manual override:** Should coach be able to regenerate individual modules?
   - **Recommendation:** Yes, add "Refresh AI" button per module with cache bust

---

## 16. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Module dependency breaks** | Low | High | Unit tests + fallback to old AI |
| **Quality regression** | Medium | Medium | A/B testing vs. current AI |
| **Cache inconsistency** | Low | Low | Version tracking + cache invalidation |
| **Coach confusion (new UI)** | Medium | Low | Gradual rollout + inline help text |
| **Migration data loss** | Very Low | High | Keep old AI data, don't delete |

**Overall risk level:** **Low** (incremental migration, keep old system during transition)

---

## 17. Conclusion

### Why This Matters

**Current AI:** 4 overlapping features, redundant analysis, inconsistent recommendations, no knowledge base

**Modular AI:** 5 specialized modules, no redundancy, consistent insights, incremental knowledge building

**Benefits:**
- ✅ **55% fewer AI calls** = faster, cheaper
- ✅ **Consistent insights** = no conflicting recommendations
- ✅ **Better caching** = instant UI updates
- ✅ **Knowledge base** = season-long context accumulation
- ✅ **Extensible** = easy to add new modules

### Recommended Next Steps

1. Review this plan and approve architecture
2. Start with Phase 1 (Game Event Analyzer) as proof-of-concept
3. Evaluate quality vs. current AI before proceeding
4. If successful, implement remaining modules over 6 weeks
5. Deprecate old AI system only after full validation

---

**Plan Status:** Ready for review and approval  
**Next Action:** User decision on proceeding  
**Estimated Total Effort:** 16-20 hours over 6 weeks  
**Rollout:** Incremental, low-risk migration
