# Extended Modular AI Architecture (12-15 Modules)
## High-Specificity AI Insights with Netball Domain Expertise

**Status:** Design Phase  
**Target:** 20 active teams, Saturday schedule with staggered timeslots  
**Quota Efficiency:** ~7.2% of daily limit (143 calls/day) | 92.8% headroom  
**Completion:** 24-32 weeks (phased rollout with 5-module foundation first)

---

## 1. Architecture Overview

### 1.1 Module Tiers

**Tier 1: Foundation Modules (Always Active)**
- Modules: 1-4
- Frequency: Generated on game finalization
- Cache: Permanent (unless data rebased)
- Purpose: Single source of truth for all downstream modules

**Tier 2: Behavioral Modules (User-Triggered)**
- Modules: 5-9
- Frequency: Generated when coach views specific stats tabs
- Cache: 1-7 days (depends on data velocity)
- Purpose: Deep dives into specific performance aspects

**Tier 3: Strategic Modules (On-Demand)**
- Modules: 10-12
- Frequency: Generated on request or weekly
- Cache: 2-4 weeks (strategic patterns change slowly)
- Purpose: Big-picture perspective and planning

**Tier 4: Advanced Modules (Optional, 1.5-Pro)**
- Modules: 13-15
- Frequency: Generated bi-weekly on request
- Cache: 4-8 weeks (season-long perspective)
- Purpose: Complex reasoning across multiple seasons/pathways

### 1.2 Module Count by Quota

With 20 teams and 1500 requests/day:

| Configuration | Modules | Est. Calls/Day | Quota % | Headroom | Risk Level |
|---|---|---|---|---|---|
| Current | 5 | 29 | 1.9% | 97.1% | Very Low |
| **Recommended** | **12** | **86** | **5.7%** | **94.3%** | **Low** |
| High Modularity | 15 | 107 | 7.2% | 92.8% | Low |
| Maximum | 20 | 143 | 9.5% | 90.5% | Manageable |

---

## 2. Complete 12-15 Module Specification

### **TIER 1: FOUNDATION (Modules 1-4)**

#### Module 1: Event Analyzer ✓ (Existing)
**Input:** Raw game data (scores, lineup, notes)  
**Output:** Factual analysis with netball context  
**Cache:** Permanent (unless lineup/scores change)  
**Calls/Team/Week:** ~2 (finalized 2 games/week avg)  

**Responsibilities:**
- Parse game structure (4 quarters, shooting breakdown)
- Extract shooting unit composition (GS vs GA split)
- Identify quarter-by-quarter momentum
- Flag unusual patterns (extreme quarter variance, position mismatches)
- Validate against netball rules constraints

**Netball Knowledge Used:** Rules & Regulations (1.1-1.4), Position Roles (2.1)

**Example Output:**
```json
{
  "gameID": "g1",
  "factualAnalysis": "Sarah (GS) scored 12 goals (60%), Emma (GA) 8 (40%). Team total: 20 goals.",
  "shootingDynamics": {
    "gsLeads": true,
    "split": "60-40",
    "imbalance": "moderate"
  },
  "momentumArcs": [
    { "quarter": 1, "ourScore": 5, "trend": "steady" },
    { "quarter": 2, "ourScore": 4, "trend": "slight_decline" }
  ],
  "ruleCompliance": "valid"
}
```

---

#### Module 2: Pattern Detector ✓ (Existing)
**Input:** 5+ Event Analyzer outputs (rolling window)  
**Output:** Multi-game trend analysis  
**Cache:** 1-week (regenerate when new game added)  
**Calls/Team/Week:** ~1 (user views stats)  

**Responsibilities:**
- Track shooting consistency (variance, streaks)
- Identify defense patterns (opponent scorecard)
- Monitor player rotations (who plays when)
- Detect lineup changes and their impact
- Calculate team chemistry timeline status (8-12 games for GS-GA pair)

**Netball Knowledge Used:** Position Pairings (2.1), Age Benchmarks (4.1), Tactical Patterns (3.4)

**Example Output:**
```json
{
  "trendPeriod": "last_5_games",
  "shootingConsistency": {
    "gsAverage": "11.2 goals",
    "variance": "low",
    "stability": "improving"
  },
  "chemistryTimeline": {
    "gsGaPair": {
      "gamesPlayed": 7,
      "requiredForMaturity": 12,
      "currentStage": "early_development",
      "status": "stay_consistent"
    }
  }
}
```

---

#### Module 3: Training Correlator ✓ (Existing)
**Input:** Pattern Detector data + training session notes + coach notes  
**Output:** Training impact assessment (10-15 game timeline)  
**Cache:** 2-week (training effects compound over time)  
**Calls/Team/Week:** ~1 (user views training tab)  

**Responsibilities:**
- Link coach notes to training sessions
- Assess whether defensive chemistry is improving (needs 10+ games)
- Track footwork drills → footer pivot accuracy correlation
- Monitor training attendance to player performance
- Identify gaps (training notes that don't show impact yet)

**Netball Knowledge Used:** Coaching Strategies (3.5), Development Timelines (4.4), Position Development (2.4)

**Example Output:**
```json
{
  "period": "last_3_weeks",
  "drillImpact": {
    "footworkDrills": {
      "date": "2026-02-05",
      "attendance": ["Lily", "Chloe", "Sarah"],
      "expectedImpact": "Q3/Q4 footwork consistency",
      "visibleImprovement": "partial",
      "timelineToMaturity": "2-3 weeks"
    }
  }
}
```

---

#### Module 4: Tactical Advisor ✓ (Existing)
**Input:** Pattern Detector + Tactical Patterns knowledge  
**Output:** Next-game tactical recommendations  
**Cache:** 1-week (recalc on new opponent/opponent lineup change)  
**Calls/Team/Week:** ~2 (varies by viewing)  

**Responsibilities:**
- Recommend attacking adjustments (zone vs player defense against this team)
- Suggest defensive formations
- Identify personnel-specific tactics (our lineup vs their lineup)
- Validate tactics against netball rules
- Provide tactical countermeasures

**Netball Knowledge Used:** Tactical Strategies (3.0), Position Roles (2.1), Rules & Regulations (1.0)

**Example Output:**
```json
{
  "nextOpponent": "Richmond",
  "richmondProfile": {
    "attackStrength": "high",
    "defendStrength": "moderate"
  },
  "recommendations": [
    {
      "situation": "Their attack",
      "tactic": "Zone defense in mid-court, encourage contact fouls",
      "ruleCompliant": true
    }
  ],
  "quarterStrategy": {
    "Q1": "Establish momentum with best lineups - win Q1 decisively (65% of teams winning Q1 win game)",
    "Q2": "Maintain pressure, don't let deficit develop; prevent falling more than 5 goals behind",
    "Q3": "Post-halftime critical - adjust if opposition found gaps; re-establish intensity after break",
    "Q4": "Closing strong - use best closers if ahead; go aggressive with rotations if behind"
  }
}
```

---

### **TIER 2: BEHAVIORAL MODULES (Modules 5-9)**

#### Module 5: Position Performance Analyzer ⭐ (NEW)
**Input:** Event Analyzer data (per-position goals, minutes)  
**Output:** Position-by-position stat context  
**Cache:** 1-week  
**Calls/Team/Week:** ~1.5  

**Responsibilities:**
- Analyze GS vs GA scoring patterns (who's primary shooter)
- Evaluate wing positions (WA feeding + WD defense balance)
- Assess center court dynamics (C orchestration)
- Rate defensive pressure by position (GK/GD effectiveness)
- Compare position stats to age-appropriate benchmarks

**Netball Knowledge Used:** Position Roles (2.1-2.7), Performance Metrics (6.1-6.3), Age Benchmarks (4.1)

**Key Questions Answered:**
- Is GS or GA our primary scorer? (Strategic choice)
- Which WA-C combinations work best? (Tactical pairing)
- Is our defensive pressure coming from GK or GD? (System design)
- Who's overworked and needs rotation? (Fairness + strategy)

---

#### Module 6: Chemistry Dynamics ⭐ (NEW)
**Input:** Pattern Detector + player pairing data  
**Output:** Relationship development timeline  
**Cache:** 1-week  
**Calls/Team/Week:** ~1.5  

**Responsibilities:**
- Track GS-GA shooting pair maturity (8-12 game threshold)
- Monitor WA-C court vision synergy
- Assess defensive triangle (C-GD-GK)
- Identify unsettled pairings that need more games together
- Predict when chemistry will peak

**Netball Knowledge Used:** Position Pairings (2.1), Development Timelines (4.4), Age-Group Coaching (4.0)

**Example:**
```
C-GD-GK defensive trio:
- Current configuration: Player rotations don't allow 3-together frequently
- Games together: 3 of last 6
- Chemistry maturity: 0% (need 10-15 together)
- Recommendation: "Stabilize this trio for next 4 games to build understanding"
```

---

#### Module 7: Shooting Pattern Analyst ⭐ (NEW)
**Input:** Event Analyzer (shooting data per quarter)  
**Output:** Attack system analysis  
**Cache:** 1-week  
**Calls/Team/Week:** ~1.5  

**Responsibilities:**
- Distinguish fast-break goals vs set-play goals
- Analyze circle movement patterns (cut vs lead)
- Track passing chains (how many passes before goal)
- Identify shooting frequency (when do we shoot)
- Compare GS vs GA shooting efficiency

**Netball Knowledge Used:** Tactical Strategies (3.1-3.3), Position Roles (2.1-2.2), Performance Metrics (6.0)

**Insights:**
- Are we taking low-pressure opportunities (good) or forced shots (dangerous)?
- Is circle movement dynamic (defenders confused) or predictable?
- Which GA is better at setting up GS vs scoring themselves?

---

#### Module 8: Rotation & Fatigue Detector ⭐ (NEW)
**Input:** Lineup data (who played which quarters)  
**Output:** Workload analysis + fairness assessment  
**Cache:** 2-week  
**Calls/Team/Week:** ~1  

**Responsibilities:**
- Track cumulative quarter minutes per player
- Detect Q4 drop-off patterns (tired or tactical?)
- Identify overplayed players (strategy vs welfare)
- Flag underutilized talent
- Recommend rotation adjustments for next game

**Netball Knowledge Used:** Development Pathways (4.4), Age-Group Coaching (4.2), Position Development (2.4)

**Age-Specific Context:**
- U11: Learning > winning (everyone plays Q3-Q4)
- U15: Developing depth (rotate starters)
- Adult: Performance-focused (best lineup most quarters)

---

#### Module 9: Opposition Matchup Analyzer ⭐ (NEW)
**Input:** Event Analyzer data (vs each opponent) + Ladder context  
**Output:** Matchup-specific insights  
**Cache:** Season-long (regenerate when we play them again)  
**Calls/Team/Week:** ~1  

**Responsibilities:**
- Store win/loss record vs specific opponents
- Identify "we beat them when we do X" patterns
- Track what defense works against their attack
- Note personnel who shine against specific teams
- Predict likely outcome based on historical pattern

**Netball Knowledge Used:** Tactical Strategies (3.0), Opposition Analysis (3.4), Ladder Context (5.0)

**Example:**
```
vs Richmond (3 games):
- Win Q3 vs them? Always = their fatigue angle
- Our GS scoring vs their GD? 8 per game avg
- Recommendation: Attack GD early, build lead by Q3, use fatigue

Confidence Angle (Mental Resilience Context):
- Richmond is 1st on ladder, but close games historically go to 4th quarter
- We've been competitive in Q4 (won 40% of close games)
- Mindset: "This is winnable. Focus on OUR game, execute Q1-Q2, close strong in Q4"
- Richmond's strength is Q2 scoring runs - if we stay within 2 goals Q2, momentum shifts Q3
```

---

### **TIER 3: STRATEGIC MODULES (Modules 10-12)**

#### Module 10: Strength of Schedule Tracker ⭐ (NEW)
**Input:** Ladder data + remaining fixture list  
**Output:** Championship pathway assessment  
**Cache:** 1-week (ladder updates)  
**Calls/Team/Week:** ~0.5  

**Responsibilities:**
- Calculate strength of schedule (SoS) metric
- Identify "winnable" vs "stretch" games
- Assess playoff chances based on remaining fixtures
- Rank opponents by difficulty
- Recommend priority games (which losses are acceptable)

**Netball Knowledge Used:** NFNL Context (5.0), Ladder Interpretation (5.1), Competition Dynamics (5.2)

**Output:**
```json
{
  "currentPosition": 7,
  "totalTeams": 12,
  "remainingFixtures": 8,
  "strengthOfSchedule": 65,
  "rankedOpponents": [
    { "rank": 1, "opponent": "Richmond", "difficulty": "very_hard", "likelihood": "0.2" },
    { "rank": 7, "opponent": "Coburg", "difficulty": "easy", "likelihood": "0.85" }
  ],
  "playoffAssessment": "Top 4 unlikely, top 6 possible with 6-2 finish"
}
```

---

#### Module 11: Combination Scorer ⭐ (NEW)
**Input:** Event Analyzer (position combos) + Pattern Detector  
**Output:** High-performing position combinations  
**Cache:** 2-week  
**Calls/Team/Week:** ~0.5  

**Responsibilities:**
- Track which position combinations score highest
- Identify "chemistry pairs" that work (WA-C, GS-GA specific)
- Compare combo efficiency (points per possession)
- Recommend starting combos based on data
- Track combo performance across ages (U11 vs U17)

**Netball Knowledge Used:** Position Roles (2.1-2.7), Tactical Strategies (3.3), Position Pairings (2.1)

**Example:**
```
Top Combos (last 8 games):

Attacking Combos:
1. Lily (C) + Sarah (WA): 
   - Goals For when together: 3.2/combo appearance
   - Goals Against when together: 1.8/combo appearance
   - PLUS-MINUS: +1.4 (positive = helps win quarters)
   
2. Emma (GA) + Sarah (GS): 
   - Goals For: 2.8/combo
   - Goals Against: 2.1/combo
   - PLUS-MINUS: +0.7

Defensive Combos:
3. Alex (GD) + Jordan (GK): 
   - Goals Against: 3.2/combo appearance
   - Goals For (with combo on): 2.1/combo
   - PLUS-MINUS: -1.1 (concerning - more goals against than for)
   - Recommendation: Monitor defensive pairing, may need adjustment
```

---

#### Module 12: Defensive System Analyzer ⭐ (NEW)
**Input:** Event Analyzer (opposition goals allowed) + Tactical Advisor  
**Output:** Defensive system assessment  
**Cache:** 1-week  
**Calls/Team/Week:** ~1  

**Responsibilities:**
- Identify if we use zone vs player defense
- Track which defense works against specific opponents
- Analyze defensive pressure points (when do they score most)
- Recommend defensive adjustments
- Compare defensive efficiency year-on-year

**Netball Knowledge Used:** Defensive Tactics (3.2), Position Roles - Defense (2.4-2.7), Game Management (3.5)

**System Types (Netball):**
- **Player defense:** Mark opponent with intensity
- **Zone defense:** Defend areas, not individuals
- **Hybrid:** Switch between based on opponent

---

### **TIER 4: ADVANCED MODULES (Modules 13-15, uses 1.5-Pro)**

#### Module 13: Developmental Pathway Recommender ⭐ (NEW)
**Input:** Player stats + age group + game history  
**Output:** Player progression plan  
**Cache:** 4-week  
**Calls/Team/Week:** ~0.3  
**Model:** gemini-1.5-pro (deeper reasoning)

**Responsibilities:**
- Identify position strengths for each player
- Recommend "next position" skill development
- Track progression from one position to another
- Suggest training focus for each player
- Balance development vs immediate game needs

**Netball Knowledge Used:** Position Development (2.4), Development Pathways (4.4), Age-Group Coaching (4.0)

**Example:**
```
Lily (U13, currently WA):
- Strength: Fast, excellent court vision
- Develop: GS shooting (high court intelligence = good fit)
- Timeline: "Start practicing GS shots in training Q3"
- Next step: "Consider C if footwork improves"
```

---

#### Module 14: Junior-Specific Benchmarking ⭐ (NEW)
**Input:** Team stats + age group  
**Output:** Age-appropriate performance context  
**Cache:** Season-long (benchmarks don't change mid-season)  
**Calls/Team/Week:** ~0.3  
**Model:** gemini-1.5-pro

**Responsibilities:**
- Contextualize performance by age group
- Distinguish normal U11 variance from concerning issues
- Identify early-bloomers and late-bloomers
- Calibrate expectations (U11 learning, U17 competitive)
- Recommend age-appropriate coaching adjustments

**Netball Knowledge Used:** Age-Group Coaching (4.1-4.5), Performance Metrics (6.0), Coaching Challenges (7.0)

**Example U11:**
```
Team average: 12 goals/game
Benchmark: 8-15 goals is NORMAL range
Score: Within range = focus on consistency not volume
Q4 drop: 2-3 goal decline is EXPECTED (fatigue + learning)
Variance: High variance is NORMAL for U11 (don't panic)
```

**Example U17:**
```
Team average: 42 goals/game
Benchmark: 35-55 is normal, should be CONSISTENT
Score: Hitting 45 consistently = good
Q4 drop: <2 goal decline expected (minimal fatigue impact)
Variance: Should now be low (more discipline expected)
```

---

#### Module 15: Season Strategist 🏆 (NEW, Premium)
**Input:** ALL previous modules + ladder + full season history  
**Output:** Season-long strategy plan  
**Cache:** 4-week  
**Calls/Team/Week:** ~0.3  
**Model:** gemini-1.5-pro (complex reasoning required)

**Responsibilities:**
- Synthesize all 14 modules into coherent strategy
- Identify season arc (learning phase, development phase, competitive phase)
- Recommend peaking timeline for finals
- Balance short-term results with long-term player development
- Identify championship vs development season goals
- Make trade-off recommendations (win now vs develop players)

**Netball Knowledge Used:** ALL sections (1-7 + competition context)

**Example Output:**
```json
{
  "seasonPhase": "early_development",
  "trajectory": "improving",
  "championshipOdds": 0.15,
  "developmentScore": 0.85,
  "recommendation": "Focus on building chemistry (GS-GA pair only at 6/12 games together). Winning 40-50% is target. Build depth for finals.",
  "peakingTimeline": "Weeks 14-16 (finals series)",
  "keyMilestones": [
    { "week": 6, "target": "GS-GA pair at 12 games together for chemistry peak" },
    { "week": 10, "target": "Defensive trio stabilized (C-GD-GK)" },
    { "week": 14, "target": "Rotation settled, best lineup identified" },
    { "week": 16, "target": "Confidence high for finals push" }
  ]
}
```

---

## 3. Module Dependencies & Data Flow

### Data Dependency Graph

```
Event Analyzer (Module 1)
    ↓
    ├→ Pattern Detector (Module 2)
    │    ├→ Tactical Advisor (Module 4)
    │    └→ Position Performance (Module 5)
    │         ├→ Chemistry Dynamics (Module 6)
    │         └→ Combination Scorer (Module 11)
    │
    ├→ Training Correlator (Module 3)
    │    └→ Developmental Pathway (Module 13)
    │
    ├→ Shooting Pattern Analyst (Module 7)
    │    └→ Defensive System (Module 12)
    │
    ├→ Rotation & Fatigue Detector (Module 8)
    │    └→ Junior-Specific Benchmarking (Module 14)
    │
    ├→ Opposition Matchup (Module 9)
    │    └→ Strength of Schedule (Module 10)
    │
    └→ Season Strategist (Module 15) ← depends on ALL
```

### No Circular Dependencies
✓ All data flows downward  
✓ Foundation modules never consumed by earlier modules  
✓ Safe to regenerate in any order

---

## 4. Cache Strategy

| Module | Type | TTL | Trigger Regeneration | Impact |
|--------|------|-----|---|---|
| 1 Event | Permanent | Forever | Lineup/score change | High (downstream) |
| 2 Pattern | Rolling | 1 week | New game finalized | Medium (5+ mod) |
| 3 Training | Rolling | 2 weeks | Training session added | Medium (timeline) |
| 4 Tactical | Tournament | 1 week | Opponent changes | High (next game) |
| 5 Position | Rolling | 1 week | Stats change | Low (analysis only) |
| 6 Chemistry | Tournament | 1 week | Lineup change | High (key metric) |
| 7 Shooting | Rolling | 1 week | Game change | Low (pattern only) |
| 8 Rotation | Rolling | 2 weeks | Lineup pattern changes | Medium (fairness) |
| 9 Matchup | Season | Forever | Play them again | Low (historical) |
| 10 SoS | Rolling | 1 week | Ladder updates | Medium (context) |
| 11 Combos | Rolling | 2 weeks | Game/lineup changes | Low (reference) |
| 12 Defense | Rolling | 1 week | Defense system changes | High (tactical) |
| 13 Dev Path | Rolling | 4 weeks | Player stats change significantly | Medium (long-term) |
| 14 Benchmarks | Season | Forever | Age/season changes | Low (reference) |
| 15 Season | Rolling | 4 weeks | Multiple module states change | High (strategic) |

---

## 4.1 Priority 1 Enhancements (Phase 1A - Quick Wins)

**Total Effort:** 6 hours integration  
**Impact:** +3% insight maximization (85% → 88%)  
**Timeline:** Implement before Phase 1 launch  

### Enhancement 1: Module 4 (Tactical Advisor) - Quarter-Specific Game Strategy

**What It Adds:**
Explicit quarter-by-quarter tactical guidance showing coaches what to focus on in each quarter.

**Responsibility Addition:**
- Add quarter-specific game strategy to output
- Q1-Q4 contextual recommendations based on netball game structure

**Output Enhancement:**
```json
{
  "quarterStrategy": {
    "Q1": "Establish momentum with best lineups - win Q1 decisively (65% of teams winning Q1 win game)",
    "Q2": "Maintain pressure, don't let deficit develop; prevent falling more than 5 goals behind",
    "Q3": "Post-halftime critical - adjust if opposition found gaps; re-establish intensity after break",
    "Q4": "Closing strong - use best closers if ahead; go aggressive with rotations if behind"
  }
}
```

**Netball Knowledge Source:** Section 3.3 (Game Management Tactics)  
**Implementation:** Add 4 conditional logic rules to prompt template  
**Dependencies:** None

---

### Enhancement 2: Module 9 (Opposition Matchup) - Mental Resilience Context

**What It Adds:**
Confidence-building angle when playing strong opposition, balancing tactics with mental preparation.

**Responsibility Addition:**
- Add mental resilience coaching context
- Provide confidence-building talking points
- Frame game psychology for coach pre-match talk

**Output Enhancement:**
```json
{
  "confidenceContext": {
    "opponentRating": "1st on ladder (intimidating?)",
    "historicalData": "Close games historically go to Q4; we've won 40% of competitive matches",
    "mentality": "Focus on OUR game, execute Q1-Q2, close strong in Q4",
    "vulnerabilityAngle": "Opposition's strength is Q2 scoring runs - if we stay within 2 goals Q2, momentum shifts Q3"
  }
}
```

**Netball Knowledge Source:** Section 7.5 (Adapting to Strong Opposition)  
**Implementation:** Add context layer to prompt template, reference ladder position psychology  
**Dependencies:** Ladder data available

---

### Enhancement 3: Module 11 (Combination Scorer) - Explicit Plus-Minus Metrics

**What It Adds:**
Quantified impact of position combinations using plus-minus analysis, showing whether combos help win quarters or struggle.

**Responsibility Addition:**
- Calculate plus-minus for each combo
- Track (goals for when combo on) - (goals against when combo on)
- Identify combos that help vs hurt team performance

**Output Enhancement:**
```json
{
  "topCombos": [
    {
      "combo": "Lily (C) + Sarah (WA)",
      "goalsForAvg": 3.2,
      "goalsAgainstAvg": 1.8,
      "plusMinus": "+1.4",
      "assessment": "Strong combo - helps us win quarters"
    },
    {
      "combo": "Alex (GD) + Jordan (GK)",
      "goalsForAvg": 2.1,
      "goalsAgainstAvg": 3.2,
      "plusMinus": "-1.1",
      "assessment": "Concerning - more goals against than for; monitor defensive pairing"
    }
  ]
}
```

**Netball Knowledge Source:** Section 6.1 (Plus-Minus Analysis)  
**Implementation:** Add data transformation for plus-minus calc (3-4 lines new logic)  
**Dependencies:** Clean lineup data required

---

## 5. Implementation Roadmap

### Phase 0: Foundation (Complete ✓)
- Modules 1-4 fully implemented
- All netball knowledge integrated
- Backend queue operational

### Phase 1: Behavioral Modules (Weeks 1-4)
**Timeline:** 4 weeks  
**Effort:** Modules 5-8  
**Modules Added:**
- Module 5: Position Performance Analyzer
- Module 6: Chemistry Dynamics
- Module 7: Shooting Pattern Analyst
- Module 8: Rotation & Fatigue Detector

**Deliverables:**
- Backend functions for each module
- Frontend UI tabs to trigger modules
- Cache management
- **New quota usage:** ~29 → ~72 calls/day (5.2% of limit)

### Phase 2: Strategic Modules (Weeks 5-8)
**Timeline:** 4 weeks  
**Effort:** Modules 9-12  
**Modules Added:**
- Module 9: Opposition Matchup Analyzer
- Module 10: Strength of Schedule Tracker
- Module 11: Combination Scorer
- Module 12: Defensive System Analyzer

**Deliverables:**
- Matchup-specific data storage
- Ladder integration for SoS calculation
- Historical performance database
- **New quota usage:** ~72 → ~100 calls/day (6.8% of limit)

### Phase 3: Advanced Modules (Weeks 9-12)
**Timeline:** 4 weeks  
**Effort:** Modules 13-15 (1.5-pro integration)  
**Modules Added:**
- Module 13: Developmental Pathway Recommender
- Module 14: Junior-Specific Benchmarking
- Module 15: Season Strategist

**Deliverables:**
- 1.5-pro model integration
- Multi-module synthesis pipeline
- Complex reasoning prompt templates
- **Final quota usage:** ~100 → ~143 calls/day (9.5% of limit)

### Phase 4: Optimization (Weeks 13-24)
**Timeline:** 12 weeks  
**Effort:** Tuning, A/B testing, refinement  
**Tasks:**
- Prompt tuning for each module
- Cache TTL optimization
- Frontend UX for each insight
- Parent portal integration (read-only views)
- Coach coaching on interpreting insights

---

## 6. Quota & Performance

### Daily Load Projection (20 Teams)

```
Modules 1-4:   ~29 calls/day (baseline + game finalization)
+ Modules 5-8:  +43 calls/day (behavioral, user-triggered)
+ Modules 9-12: +28 calls/day (strategic, on-demand)
+ Modules 13-15: +43 calls/day (advanced, 1.5-pro)
= Total:       ~143 calls/day (9.5% of limit, 90.5% headroom)
```

### Peak Saturday Load

```
Concurrent games at peak: 3/hour
Modules per game: 1-15 (depth varies)
Average burst: 18 games × 8 avg modules = 144 calls
Queue capacity: 15 req/min = 900/hour = NEVER BOTTLENECK
Actual peak Saturday: ~300-400 calls (well under 900/hour)
```

### Safety Margins

| Metric | Current | Recommended | Limit |
|--------|---------|---|---|
| Daily quota usage | 1.9% | 9.5% | 100% |
| Peak burst capacity | 144 calls | 400 calls | 900/hour |
| Free tier headroom | 97.1% | 90.5% | 0% |
| Rate limit headroom | Unlimited | 15 min, 2 sec between peak calls | None |

---

## 7. Model Allocation

### gemini-2.0-flash (15 req/min)

**Modules using 2.0-flash:**
- 1-12 (all behavioral, tactical, strategic)
- Total: ~100 calls/day
- Rate: Never exceeds 15/min even at peak

**Why 2.0-flash sufficient:**
- 1-3 second response time ✓
- Strong pattern recognition ✓
- Cost-effective for volume ✓
- Excellent for netball domain knowledge ✓

### gemini-1.5-pro (2 req/min)

**Modules using 1.5-pro:**
- 13, 14, 15 (developmental, benchmarking, strategic synthesis)
- Total: ~43 calls/day (distributed across week = rarely exceeds 2/min)
- Rate: Plan for 1-2 per hour during peak coaching times

**Why 1.5-pro needed:**
- Complex reasoning across multiple inputs ✓
- Needs to synthesize 14 modules into strategy ✓
- Player development planning (nuanced) ✓
- Season-long strategic thinking ✓

---

## 8. Netball Knowledge Mapping (All 15 Modules)

| Module | Primary Knowledge Sections | Secondary Sections |
|--------|---|---|
| 1 Event Analyzer | 1.0-1.4, 2.1-2.7 | 6.0-6.3 |
| 2 Pattern Detector | 2.1, 4.1, 3.4 | 6.1 |
| 3 Training Correlator | 3.5, 4.4, 2.4 | 7.0 |
| 4 Tactical Advisor | 3.0-3.3, 2.1, 1.0 | 3.4 |
| **5 Position Perf** | **2.1-2.7, 6.1-6.3, 4.1** | 3.3 |
| **6 Chemistry** | **2.1, 4.4, 4.0** | 2.4 |
| **7 Shooting Pattern** | **3.1-3.3, 2.1-2.2, 6.0** | 6.2 |
| **8 Rotation/Fatigue** | **4.4, 4.2, 2.4** | 7.1 |
| **9 Opposition Matchup** | **3.0, 3.4, 5.0** | 6.2 |
| **10 SoS Tracker** | **5.0-5.2, Competition Context** | 4.1 |
| **11 Combination Scorer** | **2.1-2.7, 3.3, Position Pairings** | 6.1 |
| **12 Defensive System** | **3.2, 2.4-2.7, 3.5** | 6.3 |
| **13 Dev Pathway** | **2.4, 4.4, 4.0** | 4.3, 7.0 |
| **14 Benchmarking** | **4.1-4.5, 6.0, 7.0** | All age sections |
| **15 Season Strategist** | **ALL** | Context synthesis |

---

## 9. Frontend Integration Points

### Coach App Tabs (New Module Triggers)

**Schedule Tab** → Module 4 (Tactical Advisor)  
- Next opponent recommendation on game detail view
- "Play like this" button opens tactical analysis

**Roster Tab** → Modules 5, 13  
- Player cards show primary position + recommended secondary
- "Development plan" button → Module 13 output

**Stats Tab** → Modules 2, 6, 7, 10, 14, 15
- Overview: Module 15 (Season Strategist summary)
- Leaders: Module 5 (Position Performance breakdown)
- Positions: Module 6 (Chemistry status per position)
- Combos: Module 11 (Top performing combos)
- New "Opponent History" tab → Module 9
- New "Schedule Outlook" tab → Module 10

**Training Tab** → Module 3, 13  
- Training correlator feedback on session effectiveness
- Development pathway recommendations

**New "Advanced" Tab** → Modules 8, 10, 12, 14
- Rotation auditor (fairness + fatigue)
- Strength of schedule visualization
- Defensive system analyzer
- Age-group benchmarking comparison

### Parent Portal (Read-Only Views)

**Schedule + Matchup Context** ✓ Already exists  
**Benchmarking for parents** (Module 14)  
- "Is 12 goals normal for U11?" → Show age benchmark
- "Should our GS have scored more?" → contextualize by age

**Development Pathways** (Module 13)  
- Show each player's "recommended next position"
- Track improvement arc

---

## 10. Success Metrics

### Quantitative

- ✅ Modules launch in 3 phases (8, 8, 4 weeks)
- ✅ No module exceeds 2 req/min rate limit
- ✅ Cache hit rate >85% (fewer regenerations)
- ✅ Quota never exceeds 10% utilization

### Qualitative

- ✅ Coaches report insights are "netball-specific not generic"
- ✅ Managers use Season Strategist for game planning
- ✅ Players use Development Pathways to guide training
- ✅ 0 instances of invalid tactical recommendations (WA defending, etc)
- ✅ Age-appropriate insights reduce "overreaction" coaching decisions

### Comparative (vs Current 5-Module Plan)

| Metric | 5 Modules | 12-15 Modules | Improvement |
|--------|-----------|---|---|
| Tactical specificity | Good | Excellent | +6 dedicated modules |
| Position insights | Basic | Deep | Chemistry + combo + footwork |
| Season perspective | Yes | YES | 1.5-pro synthesis |
| Coaching guidance | General | Precise | Opposite matchup data |
| Quota efficiency | 1.9% | 9.5% | 5x more insights, same cost tier |

---

## 11. Phase Completion Timeline

```
Today (Feb 25, 2026)
├─ Modules 1-4 Complete ✓
├─ 12-15 Module Planning Complete ✓
│
├─ Week 4 (Mar 25): Modules 5-8 (Behavioral) ✓
├─ Week 8 (Apr 22): Modules 9-12 (Strategic) ✓
├─ Week 12 (May 20): Modules 13-15 (Advanced) ✓
└─ Week 24 (Aug 19): Full optimization + launch
```

---

## 12. Next Steps

1. ✅ **Planning complete** — This document
2. 📋 **Code structure** — Create `/planning/MODULE_REFERENCE.md` with API specs for each module
3. 💾 **Backend scaffold** — Backend function templates for 15 modules
4. 🔌 **Frontend integration** — Tab structure to trigger modules
5. 🧪 **Testing framework** — Validate each module against netball rules + benchmarks
6. 🚀 **Phase 1 launch** — Modules 5-8 in production

---

**This architecture ensures:**
- ✅ Zero generic sports advice (all netball-specific)
- ✅ Age-appropriate insights (U11 ≠ U17 ≠ Adult)
- ✅ High modularity (each module has ONE job)
- ✅ Efficient caching (minimize AI calls)
- ✅ Quota-friendly (9.5% of limit = 90.5% headroom)
- ✅ No rate-limit bottlenecks (peak load: 400 calls, capacity: 900/hour)
- ✅ Scalable (grow to 50+ teams without hitting limits)
