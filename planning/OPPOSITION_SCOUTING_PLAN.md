# Opposition Scouting System - Implementation Plan

**Status:** Planning  
**Estimated Effort:** 12-16 hours  
**Priority:** Medium (High value for coaches)  
**Dependencies:** Ladder & Fixture integration (existing), Background AI (planned)

---

## Executive Summary

### Current State
Opposition scouting exists in **scattered, disconnected pieces**:
- Fixture data API (endpoints available but limited UI)
- Ladder/standings display (ladders shown but no opponent profiling)
- Strength of Schedule calculation (exists but shallow)
- Opponent difficulty ratings (badges only, no deep analysis)
- Division context (raw data, no coaching insights)
- Generic game results (no pattern extraction)

**Problems:**
- No centralized "opponent profile" coaches can browse
- Opponent analysis limited to ladder position only
- No pattern detection (how do opponents typically play?)
- No comparative analysis (which opponents are similar?)
- Missing team logistics (drive time, travel impact)
- No opponent strategy notes persistence

### Proposed State
Complete **Opposition Scouting Hub** with:
- **Opponent Profiles** - Comprehensive opponent data (ladder, recent results, playing style, patterns)
- **Head-to-Head History** - Results against this opponent, trend analysis
- **Strategy Notes** - Coach-editable opponent tendencies, formation, key players
- **Comparative Analysis** - Show "similar to X but plays like Y"
- **Scouting Dashboard** - Fixture view with pre-match opposition insights
- **AI Integration** - Opposition Matchup Analyzer (AI Module 9 from extended architecture)

### Value Proposition
**For Coaches:**
- Know what to expect before the game starts
- Tactical preparation (know their strengths/weaknesses)
- Track opponent evolution (how have they improved/declined?)
- Share scouting between assistant coaches
- Make informed substitution decisions (know their patterns)

**For Parents:**
- Understand upcoming opposition (contextual difficulty)
- Better appreciate team preparation level
- Follow improvement arc vs recurring opponents

---

## API Endpoints Available

### Current Opposition-Related Endpoints

| Endpoint | Purpose | Returns | Call Frequency |
|----------|---------|---------|-----------------|
| **getFixtureData** | Fetch fixture/game schedule for team | Upcoming games + recent results + opponent info | Weekly (auto-refresh) |
| **getSquadiLadder** | Fetch live ladder standings | Ladder rows with team positions, W-L-D, points | Weekly (configurable) |
| **getTeamData** | Get team data (includes games array) | Full games history for team | Per-team load |
| **divisionResults** | Division context (from fixture sync) | All teams in division with W-L-D | With fixture data |
| **getTeamInfo** | Get team info + next fixture | Logo, next opponent details, ladder | Dev tool (getTeamInfo action) |

### Derived Opposition Data (No New API Calls)

**From existing data:**
- **Opponent Difficulty:** Ladder position lookup (cached)
- **Strength of Schedule:** Average opponent position (calculated)
- **Game Results History:** Stored in games[] array
- **Head-to-Head:** Filter games[] by opponent name
- **Patterns:** Statistical analysis of past matchups
- **Division Context:** All opponent W-L records available

---

## Data Transformation: Squadi API → Opponent Profile (Gap 1)

**Important:** Netball Connect uses `api-netball.squadi.com` (sport-specific subdomain), not the generic `api.squadi.com`. All endpoints below use this netball-specific domain.

**Netball Connect API Endpoints (Discovered via Proxyman 2026-02-25):**
- Main API: `https://api-netball.squadi.com`
- Registration/Auth: `https://registration-netball.squadi.com`
- Netball Connect wrapper: `https://registration.netballconnect.com`

### Squadi Ladder API Response (Raw Format)

```javascript
const squadiResponse = {
  ladderRows: [
    {
      teamId: 123,
      teamName: "Kilmore",
      position: 1,
      w: 8,         // Wins
      l: 2,         // Losses
      d: 0,         // Draws
      pf: 245,      // Points for
      pa: 180       // Points against
    }
  ]
};
```

### Transformation Code

```javascript
function transformSquadiLadderRow(squadiRow, totalTeams) {
  return {
    position: squadiRow.position,
    totalTeams: totalTeams,
    tier: calculateTier(squadiRow.position, totalTeams),
    wins: squadiRow.w,
    losses: squadiRow.l,
    draws: squadiRow.d,
    pointsFor: squadiRow.pf,
    pointsAgainst: squadiRow.pa,
    pointsDiff: squadiRow.pf - squadiRow.pa
  };
}

function calculateTier(position, totalTeams) {
  const topQuartile = Math.ceil(totalTeams * 0.25);
  const bottomQuartile = Math.ceil(totalTeams * 0.75);
  if (position <= topQuartile) return "top";
  if (position > bottomQuartile) return "bottom";
  return "mid";
}
```

**Key Decision:** Recent form (`[1, 1, 0, 1, 1]`) extracted from local game history using `getTeamData()` games[]array, filtered by opponent, last 5 games. This is always available and reliable.

---

## Data Architecture

### Opponent Profile Object

```javascript
{
  opponentName: "Kilmore",
  slug: "kilmore",
  
  // Ladder data (from getSquadiLadder)
  ladder: {
    position: 1,
    totalTeams: 10,
    tier: "top",
    wins: 8,
    losses: 2,
    draws: 0,
    pointsFor: 245,
    pointsAgainst: 180,
    pointsDiff: 65,
    form: [1, 1, 1, 1, 0],  // 1=win, 0=loss, -1=draw (last 5)
  },
  
  // Head-to-head record
  headToHead: {
    gamesPlayed: 3,
    ourWins: 1,
    ourLosses: 2,
    ourDraws: 0,
    trend: "declining",  // winning trend, declining, etc.
    avgOurScore: 28,
    avgTheirScore: 32,
    recentGames: [
      { 
        round: 12, 
        ourScore: 25, 
        theirScore: 30, 
        result: "L", 
        year: "2026",
        quarterBreakdown: {
          Q1: { us: 5, them: 7 },  // Opposition strongest in Q1
          Q2: { us: 8, them: 9 },
          Q3: { us: 6, them: 8 },
          Q4: { us: 6, them: 6 }   // Tied in Q4 (fatigue factor)
        }
      },
      { 
        round: 8, 
        ourScore: 32, 
        theirScore: 28, 
        result: "W", 
        year: "2026",
        quarterBreakdown: {
          Q1: { us: 9, them: 6 },
          Q2: { us: 7, them: 5 },
          Q3: { us: 9, them: 9 },
          Q4: { us: 7, them: 8 }
        }
      },
      { 
        round: 4, 
        ourScore: 28, 
        theirScore: 35, 
        result: "L", 
        year: "2025",
        quarterBreakdown: {
          Q1: { us: 6, them: 10 },  // Opposition very strong in Q1
          Q2: { us: 8, them: 9 },
          Q3: { us: 7, them: 8 },
          Q4: { us: 7, them: 8 }
        }
      }
    ],
    
    // Quarter performance analytics (ENHANCED)
    quarterPerformance: {
      Q1: { avgScore: 7.67, strength: "very-strong", notes: "Consistently strong start" },
      Q2: { avgScore: 7.67, strength: "strong", notes: "Slight dip mid-game" },
      Q3: { avgScore: 8.33, strength: "very-strong", notes: "Re-energized after half time" },
      Q4: { avgScore: 7.33, strength: "moderate", notes: "Q4 fatigue evident - slowest quarter" }
    },
    
    // Trend analysis per quarter
    quarterTrends: {
      Q1: { trend: "↑ improving", pattern: "Strong starts, avg +0.3/season" },
      Q2: { trend: "stable", pattern: "Consistent mid-game output" },
      Q3: { trend: "↑ improving", pattern: "Post-half momentum typically high" },
      Q4: { trend: "↓ declining", pattern: "Clear fatigue pattern - worst quarter" }
    }
  },
  
  // Coach-editable scouting notes
  scoutingNotes: {
    playingStyle: "Zone defense, fast-break attacks",
    keyPlayers: ["Sarah (GS - great shooter)", "Emma (WA - excellent court vision)"],
    strengths: ["Shooting accuracy", "Ball movement", "First quarter starts"],
    weaknesses: ["Q4 fatigue", "Defensive positioning against deep passes"],
    tactics: "Press them in Q1, tire them out with active defense",
    formations: "Usually play Sarah-Emma combo shooting, rarely separate",
    lastUpdated: "2026-02-20T14:30:00Z",
    updatedBy: "Coach Casey"
  },
  
  // AI-generated scouting (if AI Module 9 enabled)
  aiScouting: {
    matchupProfile: { /* Opposition Matchup Analyzer output */ },
    generatedAt: "2026-02-20T10:00:00Z",
    model: "gemini-2.0-flash"
  },
  
  // Metadata
  lastOpponentUpdate: "2026-02-20T14:00:00Z",
  lastScoutingUpdate: "2026-02-20T14:30:00Z"
}
```

### Quarter Performance Analytics (ENHANCEMENT)

**Data Source:** Quarter-by-quarter scoring from all head-to-head games already in lineup data

```javascript
// Calculation (automatic, runs when loading opposition profile)
quarterPerformance = {
  Q1: {
    avgScore: calculateAvg(allH2HGames, 'Q1', 'theirScore'),  // 7.67 avg
    strength: 'very-strong',  // or strong/moderate/weak (based on >= 8 std dev threshold)
    notes: 'Consistently strong start'
  },
  Q2: { avgScore: 7.67, strength: 'strong', notes: 'Slight dip mid-game' },
  Q3: { avgScore: 8.33, strength: 'very-strong', notes: 'Re-energized after half time' },
  Q4: { avgScore: 7.33, strength: 'moderate', notes: 'Q4 fatigue evident - slowest quarter' }
}

// Trend analysis
quarterTrends = {
  Q1: { 
    trend: '↑ improving',  // or ↓ declining / stable
    pattern: 'Strong starts, avg +0.3/season'
  },
  Q2: { trend: 'stable', pattern: 'Consistent mid-game output' },
  Q3: { trend: '↑ improving', pattern: 'Post-half momentum typically high' },
  Q4: { trend: '↓ declining', pattern: 'Clear fatigue pattern - worst quarter' }
}
```

**Strength Classification:**
- `very-strong`: >= avg + 0.75 std dev
- `strong`: between avg ± 0.5 std dev
- `moderate`: between avg ± 0.25 std dev
- `weak`: <= avg - 0.75 std dev

**Tactical Use Cases:**
1. **Lineup decisions:** If opposition strongest in Q1, bring fresh/experienced defenders for Q1 start
2. **Rotation planning:** If opposition fatigues in Q4, design rotations to have strong finishers on court
3. **Substitution timing:** When opposition weakest (often Q4), deploy players needing court time
4. **Game flow prediction:** Know what to expect in each quarter, set realistic partial-game targets

---

### Scouting Storage

**Option 1: OpponentScouting Sheet Tab (Recommended)**
- Columns: OpponentName, TeamID, PlayingStyle, KeyPlayers, Strengths, Weaknesses, Tactics, Formations, QuarterPerformance (JSON), LastUpdated, UpdatedBy
- One row per unique opponent per team
- Survives team deletions (historical record)
- Accessible in Google Sheets for offline reference

**Option 2: Team Data JSON**
- Store `scoutingNotes` and `quarterPerformance` as objects in teamData
- Pros: Always synced with team data, easier to manage
- Cons: Lost if team deleted, adds to team data size

**Recommendation:** Option 1 (OpponentScouting sheet) for durability + Option 2 for quick access

---

## Opposition Analytics Framework

### Data Sources Available
- **Quarterly Scoring:** Each game's Q1-Q4 opponent scores (from `game.lineup[Q].oppGsGoals + oppGaGoals`)
- **Our Scoring:** Q1-Q4 our scores for reference (from `game.lineup[Q].ourGsGoals + ourGaGoals`)
- **Ladder Position:** Opponent's current and historical ladder rank
- **H2H History:** All games vs this opponent with quarter breakdown
- **Season Context:** All opponent's games (not just H2H) for pattern analysis

### Calculated Analytics (26 Insights)

#### Group A: Quarter-Level Insights (3 insights)

**A1: Quarter Strength Profile**
- *Calculation:* For each quarter, avg opponent score across all available games
- *Formula:* Q1_Avg = SUM(all_games.Q1_opponent_score) / COUNT(games)
- *Output:* 
  ```javascript
  {
    Q1: { avg: 7.67, strength: "very-strong", variance: 0.45, samples: 12 },
    Q2: { avg: 7.20, strength: "strong", variance: 0.62, samples: 12 },
    Q3: { avg: 8.33, strength: "very-strong", variance: 0.38, samples: 12 },
    Q4: { avg: 7.33, strength: "moderate", variance: 0.71, samples: 12 }
  }
  ```
- *Strength thresholds (league-wide averages):* 
  - very-strong: >= baseline_avg + 0.75*std_dev
  - strong: >= baseline_avg + 0.25*std_dev
  - moderate: between baseline_avg ± 0.25*std_dev
  - weak: <= baseline_avg - 0.75*std_dev
- *Display:* Quarter Performance Card with color-coded strength badges
- *Tactical use:* Identify which quarters opponent dominates/struggles

**A2: Quarter Momentum Patterns**
- *Calculation:* Delta between consecutive quarters, trend direction
- *Formula:* Q1→Q2_momentum = Q2_avg - Q1_avg; Q2→Q3_momentum = Q3_avg - Q2_avg; etc.
- *Output:*
  ```javascript
  {
    Q1_to_Q2: { delta: -0.47, direction: "↓ fade", interpretation: "Lose momentum early" },
    Q2_to_Q3: { delta: +1.13, direction: "↑ spike", interpretation: "Half-time boost" },
    Q3_to_Q4: { delta: -1.00, direction: "↓ crash", interpretation: "Clear fatigue Q4" }
  }
  ```
- *Display:* Momentum flow diagram (arrows showing direction/magnitude)
- *Tactical use:* When to expect scoring surges vs collapses

**A3: Quarter Consistency (Predictability)**
- *Calculation:* Std dev of each quarter's scores across all games
- *Formula:* Q1_consistency = STDEV(all_games.Q1_scores)
- *Output:*
  ```javascript
  {
    Q1: { stdev: 0.45, consistency: "highly consistent", interpretation: "Know what to expect" },
    Q2: { stdev: 0.62, consistency: "consistent", interpretation: null },
    Q3: { stdev: 0.38, consistency: "very consistent", interpretation: null },
    Q4: { stdev: 0.89, consistency: "unpredictable", interpretation: "Could go either way" }
  }
  ```
- *Thresholds:* stdev <= 0.45 = highly consistent; 0.45-0.75 = consistent; >= 0.75 = unpredictable
- *Display:* Consistency gauge (needle position on scale)
- *Tactical use:* Adjust defensive flexibility based on opponent's predictability

---

#### Group B: Relative Strength Analysis (4 insights)

**B1: Ladder Position Differential**
- *Calculation:* Difference between our ladder rank and theirs
- *Formula:* ladder_differential = our_position - their_position (negative = we're weaker)
- *Output:*
  ```javascript
  {
    our_position: 4,
    their_position: 1,
    differential: -3,
    strength_context: "Ranked 3 places higher",
    expected_margin: -4.2,  // Based on league-wide position→score correlation
    expected_range: [-8, -1],  // 95% confidence interval
    confidence: "high"
  }
  ```
- *Calculation of expected_margin:* Analyze all season games - for each position gap, calculate avg score differential
- *Display:* Matchup difficulty badge with confidence level
- *Tactical use:* Expectation-setting ("We're underdogs but not overmatched")

**B2: Upset/Upset Resistance Indicator**
- *Calculation:* Track opponent's results against lower-ranked teams; identify weakness patterns
- *Formula:* 
  ```
  upset_frequency = games_lost_to_lower_ranked / total_games_vs_lower_ranked
  weakness_by_type = GROUP BY opponent_type WHERE we_lost_or_drew
  ```
- *Output:*
  ```javascript
  {
    upset_frequency: 0.15,  // Lost to 15% of lower-ranked teams
    recent_upsets: [
      { opponent: "Mooroolbark", their_rank: 8, our_rank_then: 1, result: "L", date: "2026-02-01" },
      { opponent: "Whittlesea", their_rank: 9, our_rank_then: 1, result: "D", date: "2026-01-15" }
    ],
    vulnerability_pattern: "Defensive-heavy teams trouble them",
    evidence: [
      "Lost to Mooroolbark (plays defensive) 2-of-2",
      "Drew vs Whittlesea (plays defensive) 1-of-1",
      "Beat offensive teams 4-of-4"
    ]
  }
  ```
- *Display:* "Known vulnerabilities" card showing upset patterns
- *Tactical use:* "If we play defensive style, history shows we have 40% better odds"

**B3: Strength Ranking Validation**
- *Calculation:* Compare ladder rank to actual performance (avg scoring)
- *Formula:*
  ```
  expected_score_for_rank = league_avg_by_rank[their_rank]
  actual_score = AVERAGE(all_games.their_score)
  overperformance = actual_score - expected_score_for_rank
  ```
- *Output:*
  ```javascript
  {
    ladder_rank: 3,
    expected_avg_score_for_rank_3: 28.5,  // Historical average for rank 3
    actual_avg_score: 26.1,
    overperformance: -2.4,
    interpretation: "Underperforming their ranking",
    confidence: "medium",
    implication: "Less intimidating than ranking suggests"
  }
  ```
- *Display:* "Ranking validation" indicator (overperforming/underperforming/aligned)
- *Tactical use:* Psychological: "Don't be intimidated - they're not as strong as their rank"

**B4: Strength of Opponent's Recent Schedule**
- *Calculation:* Average ladder position of their last N opponents
- *Formula:*
  ```
  recent_opponents = last_8_games
  avg_opponent_rank = AVERAGE(recent_opponents.opponent_rank)
  SoS_score = (total_ranked_teams - avg_opponent_rank) / (total_ranked_teams - 1) * 100
  ```
- *Output:*
  ```javascript
  {
    recent_games: 8,
    avg_opponent_rank_they_faced: 5.3,
    strength_of_schedule_score: 48,  // 1-100 scale
    interpretation: "Average - haven't faced elite competition recently",
    implication: "Less tested against top-tier defense like ours",
    latest_opponents: ["Mooroolbark (8)", "Whittlesea (9)", "Croydon (5)", ...]
  }
  ```
- *Display:* SoS card showing recent opponents
- *Tactical use:* "Limited exposure to defensses like ours - we might be a new challenge"

---

#### Group C: Scoring Efficiency & Pattern Detection (3 insights)

**C1: Scoring Efficiency by Quarter**
- *Calculation:* Where does opponent sit relative to their peak Q efficiency?
- *Formula:*
  ```
  Q1_efficiency = Q1_avg / MAX(Q1_avg, Q2_avg, Q3_avg, Q4_avg)  // Ratio of peak
  Q1_range = [MIN(all_Q1_scores), MAX(all_Q1_scores)]
  Q1_mid_point = (range.min + range.max) / 2
  Q1_operating_zone = CURRENT_Q1_AVG relative to range
  ```
- *Output:*
  ```javascript
  {
    Q1: {
      avg: 7.67,
      range: { min: 6.1, max: 9.2, midpoint: 7.65 },
      operating_zone: "mid-range",  // or "upper-range", "lower-range"
      efficiency_vs_peak: 0.92,  // 92% of their peak quarter efficiency
      interpretation: "Strong but not peak efficiency - room to disrupt"
    },
    Q4: {
      avg: 7.33,
      range: { min: 5.2, max: 8.8, midpoint: 7.0 },
      operating_zone: "mid-range",
      efficiency_vs_peak: 0.88,
      interpretation: "Fatigued, operating low end of range"
    }
  }
  ```
- *Display:* Efficiency gauge per quarter showing mid-range position
- *Tactical use:* "Q1 they're in mid-range; if we disrupt, they can't spike higher"

**C2: Season Trend Analysis**
- *Calculation:* Quarter scores divided into early/mid/late season, identify fatigue progression
- *Formula:*
  ```
  season_phases = [games_1-3_early, games_4-6_mid, games_7-9_late]
  phase_Q_averages = AVERAGE(phase_games.Q_score) for each quarter and phase
  fatigue_rate = (phase_3_avg - phase_1_avg) / num_phases  // Slope
  projected_end_season = phase_3_avg + (remaining_games / games_played * fatigue_rate)
  ```
- *Output:*
  ```javascript
  {
    phase: "early",
    games: 3,
    Q1_avg: 8.2,
    Q2_avg: 7.8,
    Q3_avg: 8.4,
    Q4_avg: 7.8
  },
  {
    phase: "mid",
    games: 3,
    Q1_avg: 8.0,
    Q2_avg: 7.5,
    Q3_avg: 8.1,
    Q4_avg: 7.4
  },
  {
    phase: "late",
    games: 3,
    Q1_avg: 7.6,
    Q2_avg: 7.2,
    Q3_avg: 7.8,
    Q4_avg: 6.4,
    fatigue_rate: -0.3_per_phase
  },
  projected_end_season_Q4: 6.1
  ```
- *Display:* Phase comparison cards showing progression
- *Tactical use:* "Late season: their Q4 will be exhausted (6.1 projected) - we'll dominate finishes"

**C3: Quarter Dominance Profile (% of Total)**
- *Calculation:* What % of opponent's game total comes from each quarter?
- *Formula:*
  ```
  avg_game_total = SUM(Q1_avg + Q2_avg + Q3_avg + Q4_avg)
  Q1_percentage = Q1_avg / avg_game_total * 100  // Repeat for all quarters
  ```
- *Output:*
  ```javascript
  {
    avg_game_total: 30.5,
    Q1_percentage: 25.1,  // "25% of their scoring comes Q1"
    Q2_percentage: 23.6,
    Q3_percentage: 27.3,
    Q4_percentage: 24.0,
    dominance_order: ["Q3 (27%)", "Q1 (25%)", "Q2 (24%)", "Q4 (24%)"],
    heavy_focus_quarters: ["Q3"],
    balanced_quarters: ["Q2", "Q4"]
  }
  ```
- *Display:* Pie chart showing quarter contribution distribution
- *Tactical use:* "Q3 is 27% of their offense - defend it extra hard to reduce total scoring"

---

#### Group D: Opponent Vulnerability Mapping (4 insights)

**D1: Performance vs Ladder Tiers**
- *Calculation:* Segment opponent's games by opponent tier (top-5, mid-tier, lower-tier), compare scoring
- *Formula:*
  ```
  tier_1_games = games WHERE opponent_rank IN [1,2,3,4,5]
  tier_2_games = games WHERE opponent_rank IN [6,7,8,9,10]
  tier_X_opponent_avg_q = AVERAGE(tier_X_games.Q_score) for each quarter
  ```
- *Output:*
  ```javascript
  {
    vs_top_5: {
      sample_size: 8,
      Q1_avg: 6.8,
      Q2_avg: 6.2,
      Q3_avg: 7.4,
      Q4_avg: 6.1,
      game_total_avg: 26.5,
      interpretation: "Compress scoring, defense tight"
    },
    vs_mid_tier_6_10: {
      sample_size: 10,
      Q1_avg: 8.1,
      Q2_avg: 7.9,
      Q3_avg: 8.8,
      Q4_avg: 7.6,
      game_total_avg: 32.4,
      interpretation: "Relax, more explosive offense"
    },
    tier_differential: {
      Q1_compression: -1.3,
      overall_avg_drop_vs_top_teams: -5.9,
      implication: "Clear performance cliff between tier"
    }
  }
  ```
- *Display:* Side-by-side tier comparison (top-5 vs 6-10)
- *Tactical use:* "We're ranked 5. History shows they score 5.9 fewer pts/game against our tier"

**D2: Plus/Minus Analysis (Relative Strength Variance)**
- *Calculation:* For each opponent game, calculate their score delta vs their season average in that quarter
- *Formula:*
  ```
  game_opponent_rank = opponent_rank in that game
  Q_season_avg = opponent's average for that quarter
  Q_game_score = their actual score in that specific game
  variance = Q_game_score - Q_season_avg
  correlation_to_opponent_rank = CORR(opponent_rank, variance)  // Do they play down to weaker teams?
  ```
- *Output:*
  ```javascript
  {
    analysis: "Do they play down/up to opponent?",
    pattern_found: true,
    correlation: 0.68,  // Strong correlation - they do play to opponent level
    interpretation: "They perform DOWN against weaker teams (complacent)",
    evidence: [
      {
        opponent_name: "Mooroolbark (rank 9)",
        expected_Q1: 7.67,
        actual_Q1: 8.2,
        variance: +0.53,
        note: "Playing below their peak, let weaker team stay close"
      },
      {
        opponent_name: "Croydon (rank 1)",
        expected_Q1: 7.67,
        actual_Q1: 6.9,
        variance: -0.77,
        note: "Playing tight defense, no room for error"
      }
    ],
    tactical_implication: "Expect them to come in overconfident; exploit Q1 sloppiness"
  }
  ```
- *Display:* Correlation matrix showing play-to-opponent pattern
- *Tactical use:* "They play down to lower-ranked teams - expect sloppy Q1"

**D3: Opponent's Opponent Performance**
- *Calculation:* What's the average strength of opponents they've faced recently?
- *Formula:*
  ```
  recent_opponents_list = last_8_games opponent_ranks
  avg_opponent_rank = AVERAGE(recent_opponents_list)
  our_rank = current team's rank
  comparison = our_rank vs avg_opponent_rank_they_faced
  difficulty_adjustment = "Haven't faced teams like us" if comparison > 1.5
  ```
- *Output:*
  ```javascript
  {
    recent_games: 8,
    opponent_ranks_they_faced: [2, 5, 3, 7, 4, 6, 5, 3],
    average_opponent_rank: 4.4,
    our_rank: 5,
    comparison: "We're slightly lower ranked than their recent average",
    recent_matchups: [
      "Croydon (1st) - tough, compressed scoring",
      "Mooroolbark (7th) - relaxed, higher scoring"
    ],
    exposure_to_our_style: "limited - haven't faced 5-ranked teams in last 4 games",
    implication: "Our playing style might be unfamiliar to them"
  }
  ```
- *Display:* Recent opponents list with difficulty breakdown
- *Tactical use:* "We're a step up from who they've been facing - novelty advantage"

**D4: Volatility Zones (Quarter Risk Assessment)**
- *Calculation:* Identify which quarters are most explosive/unpredictable
- *Formula:*
  ```
  coefficient_of_variation = Q_stdev / Q_avg  // Volatility metric
  volatility_rank = RANK(coefficient_of_variation, all_quarters)
  ```
- *Output:*
  ```javascript
  {
    Q1: { avg: 7.67, stdev: 0.45, cv: 0.059, volatility_rank: 2, label: "low volatility" },
    Q2: { avg: 7.20, stdev: 0.89, cv: 0.124, volatility_rank: 4, label: "high volatility" },
    Q3: { avg: 8.33, stdev: 0.38, cv: 0.046, volatility_rank: 1, label: "very stable (predictable)" },
    Q4: { avg: 7.33, stdev: 1.02, cv: 0.139, volatility_rank: 3, label: "high volatility - risk zone" },
    stability_order: ["Q3 (most stable)", "Q1", "Q4", "Q2 (most volatile)"],
    high_risk_quarters: ["Q2", "Q4"],
    implication: "Q2 is chaos - they could explode or collapse. Q3 is locked in, predictable defense"
  }
  ```
- *Display:* Quarter risk gauge (stable ← → volatile)
- *Tactical use:* "Q2 unpredictable - defend flexible adaptations. Q3 locked defense pattern"

---

#### Group E: Head-to-Head & Predictive Analytics (3 insights)

**E1: H2H Trend Extrapolation**
- *Calculation:* Linear regression on H2H results
- *Formula:*
  ```
  h2h_games = all games vs this opponent, sorted by date
  score_deltas = [delta_game1, delta_game2, delta_game3, ...]  // Their score - our score
  trend_line = LINEAR_REGRESSION(game_number, score_deltas)
  projected_next_delta = trend_line(next_game_number)
  confidence = R_squared of regression (how linear is the trend)
  ```
- *Output:*
  ```javascript
  {
    h2h_record: "1-2 (1 win, 2 losses)",
    game_history: [
      { date: "2025-11-20", their_score: 35, our_score: 28, delta: +7 },
      { date: "2026-01-15", their_score: 30, our_score: 25, delta: +5 },
      { date: "2026-02-01", their_score: 28, our_score: 32, delta: -4 }
    ],
    trend_analysis: {
      trend_line_slope: -5.5,  // Negative = getting closer
      interpretation: "Getting progressively closer to us",
      projection_next_game: "We win by 1-2 pts",
      confidence: "high"  // R-squared 0.87
    },
    psychological_note: "Trajectory favors us - they know trend is against them"
  }
  ```
- *Display:* Trend line graph with projection
- *Tactical use:* "Momentum is on our side - they're aware we're catching up"

**E2: Quarter Performance Convergence**
- *Calculation:* H2H quarter performance vs current season quarter performance
- *Formula:*
  ```
  h2h_Q_avg = AVERAGE(h2h_games.Q_score)  // What they score in H2H Q1
  season_Q_avg = AVERAGE(season_games.Q_score)  // What they score vs all teams
  convergence_gap = ABS(h2h_Q_avg - season_Q_avg)
  convergence_direction = "narrowing" if gap < prior_season_gap
  ```
- *Output:*
  ```javascript
  {
    Q1: {
      h2h_avg: 8.2,
      season_avg: 7.67,
      historical_h2h_premium: +0.53,
      current_season_h2h_premium: 0,  // They're no longer stronger in H2H Q1
      interpretation: "This season they're less intimidating in Q1 than before",
      implication: "We CAN match their Q1 intensity now"
    },
    Q4: {
      h2h_avg: 7.0,
      season_avg: 7.33,
      historical_h2h_advantage: -0.33,  // We historically do well Q4 in H2H
      current_season_advantage: still_holds,
      interpretation: "Q4 is still our H2H strength zone"
    }
  }
  ```
- *Display:* H2H vs season breakdown per quarter
- *Tactical use:* "Q1 balance this season - we can neutralize their traditional strength"

**E3: Cumulative Performance Prediction (Season Arc)**
- *Calculation:* Extrapolate both teams' trajectories; predict relative position at fixture date
- *Formula:*
  ```
  our_form_trend = TREND(our_recent_scores, num_games)  // Upward, downward, stable
  their_form_trend = TREND(their_recent_scores, num_games)
  our_projected_form_at_fixture = our_current_avg + (form_trend * games_until_fixture)
  their_projected_form_at_fixture = their_current_avg + (their_trend * games_until_fixture)
  convergence_date = WHEN(our_projected = their_projected)  // When do trajectories cross?
  ```
- *Output:*
  ```javascript
  {
    today: {
      our_form_rating: 28.2,
      their_form_rating: 30.1,
      gap: -1.9
    },
    our_trend: {
      direction: "↑ improving",
      slope_per_game: +0.27,
      recent_4_games: [28.0, 28.5, 28.8, 29.2],
      interpretation: "Momentum is with us"
    },
    their_trend: {
      direction: "→ stable",
      slope_per_game: -0.05,
      recent_4_games: [30.5, 30.2, 30.0, 29.8],
      interpretation: "Slow decline"
    },
    fixture_date_prediction: {
      weeks_away: 2,
      our_projected_form: 28.8,
      their_projected_form: 29.9,
      projected_gap: -1.1,
      note: "Gap narrows from 1.9 to 1.1 - even more even matchup"
    },
    convergence_point: {
      projected_date: "2026-04-15",  // When form ratings equal
      interpretation: "By late season, we'd be evenly matched"
    }
  }
  ```
- *Display:* Dual trajectory graph showing both teams' form arc
- *Tactical use:* "Delayed fixture helps us - we're improving, they're stable"

---

#### Group F: Advanced Scouting Patterns (4 insights)

**F1: Scoring Variance Under Pressure**
- *Calculation:* When opponent is trailing (cumulative disadvantage), does their Q3-Q4 accelerate?
- *Formula:*
  ```
  games_opponent_trailed = games WHERE cumulative_score_at_HT < their_HT_score
  games_opponent_led = games WHERE cumulative_score_at_HT >= their_HT_score
  Q3_avg_when_trailing = AVERAGE(Q3_scores | games_opponent_trailed)
  Q3_avg_when_leading = AVERAGE(Q3_scores | games_opponent_led)
  pressure_response = Q3_avg_when_trailing - Q3_avg_when_leading
  ```
- *Output:*
  ```javascript
  {
    sample_games: 12,
    when_trailing_at_halftime: {
      games: 5,
      Q3_avg: 8.8,
      Q4_avg: 7.9,
      total_2nd_half_avg: 16.7,
      pattern: "Aggressive comeback attempts"
    },
    when_leading_at_halftime: {
      games: 7,
      Q3_avg: 8.0,
      Q4_avg: 6.9,
      total_2nd_half_avg: 14.9,
      pattern: "Conservative, protect lead"
    },
    pressure_response: {
      Q3_spike_when_trailing: +0.8,
      interpretation: "They do spike Q3 when pressured",
      implication: "Build half-time lead - their comeback pressure won't overcome 10pt+ lead"
    },
    tactical_application: "Front-end strategy: establish 8-10 pt lead by half-time; their aggressive Q3 won't be enough"
  }
  ```
- *Display:* Pressure response card showing their response to scoring deficit
- *Tactical use:* "If we lead 10+ at half, their pressure comeback won't catch us"

**F2: Quarter Scoring Ratio (Resource Allocation Mode)**
- *Calculation:* What % of season games does opponent allocate to each quarter?
- *Formula:*
  ```
  total_all_seasons_scores = Q1_total + Q2_total + Q3_total + Q4_total
  Q1_resource_allocation % = Q1_total / total * 100  // Repeat all quarters
  ```
- *Output:*
  ```javascript
  {
    Q1_allocation: 22,   // "22% of their season scoring power goes to Q1"
    Q2_allocation: 20,
    Q3_allocation: 28,
    Q4_allocation: 30,
    allocation_pattern: "back-end heavy (58% in Q3+Q4)",
    interpretation: "They invest heavily in finishing strong",
    comparison_to_avg: "vs league avg Q3+Q4 = 50%, they allocate +8% more to finish",
    implication: "Shut down their Q3-Q4 firepower; they've invested there - if stifled, whole game collapses"
  }
  ```
- *Display:* Resource allocation pie chart showing betting strategy
- *Tactical use:* "58% of their scoring comes Q3-Q4 - stellar Q1-Q2 defense = they can't catch up"

**F3: Consistency Score (Predictability Rating)**
- *Calculation:* Overall Z-score across all quarters all games; shows how predictable opponent is
- *Formula:*
  ```
  all_quarter_scores = [all Q1s, all Q2s, all Q3s, all Q4s]
  grand_mean = AVERAGE(all_quarter_scores)
  grand_stdev = STDEV(all_quarter_scores)
  predictability_z = grand_stdev / grand_mean  // Lower = more predictable
  predictability_rating = 100 - (predictability_z * 100)  // Scale 0-100
  ```
- *Output:*
  ```javascript
  {
    grand_mean: 7.88,
    grand_stdev: 0.67,
    predictability_z: 0.085,
    predictability_rating: 92,  // Very predictable (of 100)
    interpretation: "Highly predictable team - consistent patterns",
    opposite_example: {
      team: "Mooroolbark",
      rating: 45,  // Very unpredictable
      note: "They're erratic - same defensive base doesn't work twice"
    },
    tactical_implication: "We can lock in ONE defensive pattern and rely on it all game"
  }
  ```
- *Display:* Predictability gauge (0-100 scale)
- *Tactical use:* "High predictability (92) = lock in defensive pattern. Get it right, it works all game"

**F4: Seasonal Regression/Progression Tracking**
- *Calculation:* Are they on winning streak? Losing streak? Confidence trajectory?
- *Formula:*
  ```
  recent_games = last_5_games
  win_loss_pattern = [W, L, W, W, L]  // Example
  streak_length = longest_consecutive_result
  momentum_direction = rolling_avg_score(last_3) vs rolling_avg_score(3_before_that)
  confidence_level = (W/L ratio) * momentum_direction
  ```
- *Output:*
  ```javascript
  {
    recent_record: "2-3 (2 wins, 3 losses)",
    pattern: "Loss, Loss, Loss, Win, Win",
    streak: "worst streak = 3 losses, current streak = 2 wins (building)",
    momentum: {
      last_3_games_avg: 29.2,
      prior_3_games_avg: 30.1,
      trajectory: "↓ declining momentum",
      reversal_signal: "Recent wins might be false recovery - trending down overall"
    },
    confidence_level: "low - coming off rough patch, likely tentative",
    psychological_state: "Rebuilding confidence after 3-game losing streak",
    tactically_exploitable: true,
    recommendation: "Aggressive early game; they might fold under pressure given recent losses"
  }
  ```
- *Display:* Recent form record card with win/loss patterns
- *Tactical use:* "They're 2-3 recently (loss-heavy) - psychological edge to us"

---

#### Group G: Situational Advantage Detection (2 insights)

**G1: Fatigue Accumulation Model**
- *Calculation:* How much is Q4 declining week-to-week as season progresses?
- *Formula:*
  ```
  season_divided_into_weeks = [week_1_games, week_2_games, ..., week_N_games]
  Q4_avg_per_week = AVERAGE(week_X_games.Q4_score) for each week
  fatigue_rate = (final_week_Q4 - first_week_Q4) / num_weeks  // Decline per week
  projected_Q4_at_fixture_week = current_Q4_avg + (weeks_until_fixture * fatigue_rate)
  ```
- *Output:*
  ```javascript
  {
    season_phases: {
      week_1: { Q4_avg: 7.8 },
      week_3: { Q4_avg: 7.2 },
      week_5: { Q4_avg: 6.8 },
      week_7: { Q4_avg: 6.4 },
      week_9: { Q4_avg: 5.9 }  // current
    },
    fatigue_rate: -0.48_per_week,
    interpretation: "Q4 scoring down -0.5 pts per week",
    fixture_week: 11,
    games_remaining: 5,
    projected_Q4_at_fixture: 5.5,
    comparison_to_now: "Will be even more fatigued by then",
    recommendation: "Late-season fixture? Their Q4 will be exhausted (5.5 vs current 5.9). Load offensive weapons."
  }
  ```
- *Display:* Fatigue decay graph showing Q4 degradation over season
- *Tactical use:* "Week 11 fixture: their Q4 projected 5.5 - we'll demolish finishes"

**G2: Quarter Performance Composition (Building Profile)**
- *Calculation:* Do they win games with strong Q1? Strong Q3? Or specific quarter wins?
- *Formula:*
  ```
  wins = games WHERE opponent.score > our.score
  losses = games WHERE opponent.score < our.score
  Q_avg_in_wins = AVERAGE(Q_scores | wins)
  Q_avg_in_losses = AVERAGE(Q_scores | losses)
  correlation_Q_performance_to_outcome = CORR(Q_score, game_result)
  ```
- *Output:*
  ```javascript
  {
    wins_sample: 8,
    losses_sample: 4,
    Q1_avg_in_wins: 8.4,
    Q1_avg_in_losses: 6.9,
    Q1_correlation_to_wins: 0.78,  // "Strong Q1 predicts wins"
    
    Q3_avg_in_wins: 8.8,
    Q3_avg_in_losses: 7.2,
    Q3_correlation_to_wins: 0.82,  // "Strong Q3 even stronger predictor"
    
    Q4_avg_in_wins: 7.8,
    Q4_avg_in_losses: 6.1,
    Q4_correlation_to_wins: 0.71,  // "Q4 finish matters, but less than Q3"
    
    win_formula: "Their wins built: elite Q3 (most important), strong Q1, solid Q4 finishes",
    implication: "To beat them: lock down their Q3 + Q1. Let Q4 be competitive.",
    tactical_plan: "Double-down defensive pressure Q1-Q3. Q4 can be scrappy; just stay close"
  }
  ```
- *Display:* Quarter contribution to wins/losses breakdown
- *Tactical use:* "Their wins are built on Q1 + Q3 excellence - defend those quarters extra hard"

---

### Calculation Implementation Specifications

#### Backend Functions (Apps Script - Code.js)

```javascript
// Group A: Quarter Strength
function calculateQuarterStrengthProfile(opponentGamesList, leagueAverages) {
  const quarterStats = {};
  ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
    const scores = opponentGamesList.map(g => g.lineup[q]?.oppGsGoals + g.lineup[q]?.oppGaGoals || 0);
    const avg = scores.reduce((a, b) => a + b) / scores.length;
    const variance = calculateVariance(scores, avg);
    const stdev = Math.sqrt(variance);
    quarterStats[q] = {
      avg: parseFloat(avg.toFixed(2)),
      stdev: parseFloat(stdev.toFixed(2)),
      strength: classifyStrength(avg, leagueAverages[q], stdev),
      samples: scores.length
    };
  });
  return quarterStats;
}

// Group B: Ladder Differential
function calculateLadderDifferential(ourRank, theirRank, leaguePositionCorrelation) {
  const diff = ourRank - theirRank;
  // leaguePositionCorrelation = historical data mapping rank gaps to avg score deltas
  const expectedMargin = leaguePositionCorrelation[Math.abs(diff)] || 0;
  return {
    differential: diff,
    strength_context: diff > 0 ? `Ranked ${Math.abs(diff)} places higher` : `Ranked ${Math.abs(diff)} places lower`,
    expected_margin: diff > 0 ? expectedMargin : -expectedMargin,
    confidence: 'high'
  };
}

// ... (continue for all 26 analytics functions)
```

#### Frontend Display (Coach App - opponent-analytics.js)

```javascript
// Display components for each insight
function renderQuarterStrengthCard(quarterStats) {
  const html = `
    <div class="quarter-strength-card">
      <h3>Quarter Performance</h3>
      ${['Q1', 'Q2', 'Q3', 'Q4'].map(q => `
        <div class="quarter-item">
          <div class="quarter-label">${q}</div>
          <div class="quarter-avg">${quarterStats[q].avg.toFixed(1)} pts</div>
          <div class="strength-badge ${quarterStats[q].strength}">
            ${quarterStats[q].strength}
          </div>
          <div class="consistency ${quarterStats[q].stdev > 0.7 ? 'unstable' : 'stable'}">
            Consistency: ${quarterStats[q].stdev.toFixed(2)} (${quarterStats[q].samples} games)
          </div>
        </div>
      `).join('')}
    </div>
  `;
  return html;
}

function renderTrendLineGraph(h2hResults) {
  // Use Chart.js to render linear regression
  // X = game number, Y = score differential
  // Show trend line and projected next game
}

function renderLadderDifferentialCard(differential) {
  return `
    <div class="matchup-difficulty-card">
      <h4>Ladder Context</h4>
      <p>${differential.strength_context}</p>
      <p>Expected margin: ${differential.expected_margin > 0 ? '+' : ''}${differential.expected_margin.toFixed(1)} pts</p>
      <p class="confidence">Confidence: ${differential.confidence}</p>
    </div>
  `;
}

// ... continue for all 26 display functions
```

---



### Phase 1: Opponent Profile Hub - Complete Analytics Display (5-6 hours)

**What:** Create centralized UI displaying all foundational analytics (Groups A-D, 14 insights) from opponent profile page

**Endpoints Used:**
- getFixtureData (upcoming opponents)
- getSquadiLadder (ladder positions)
- gameData.games[] (head-to-head history + quarter breakdowns)
- Division context (for tier comparisons)

**Analytics Calculated & Displayed in Phase 1:**

**Group A: Quarter Strength (3 insights, all displayed)**
1. Quarter Strength Profile (A1) - 4 cards with Q1-Q4 avg scores + strength badges
2. Quarter Momentum Patterns (A2) - Flow diagram showing momentum deltas between quarters
3. Quarter Consistency (A3) - Consistency gauge showing predictability

**Group B: Relative Strength (4 insights, all displayed)**
4. Ladder Differential (B1) - Matchup difficulty badge with confidence
5. Upset/Upset Resistance (B2) - "Known vulnerabilities" card showing upset patterns
6. Strength Ranking Validation (B3) - Overperformance/underperformance indicator
7. Strength of Opponent's Schedule (B4) - SoS card with recent opponents

**Group C: Scoring Efficiency (3 insights, all displayed)**
8. Scoring Efficiency by Quarter (C1) - Quarter efficiency gauge relative to peak
9. Season Trend Analysis (C2) - Phase comparison showing early/mid/late season patterns
10. Quarter Dominance Profile (C3) - Pie chart showing quarter contribution %

**Group D: Vulnerability Mapping (4 insights, all displayed)**
11. Performance vs Ladder Tiers (D1) - Side-by-side tier comparison (top-5 vs 6-10)
12. Plus/Minus Analysis (D2) - Correlation matrix showing play-to-opponent pattern
13. Opponent's Opponent Performance (D3) - Recent opponents list with difficulty
14. Volatility Zones (D4) - Quarter risk gauges (stable ← → volatile)

**UI Structure:**
```
Opponent Profile Page Layout:
├─ Header Section
│  ├─ Opponent name, logo, ladder position
│  ├─ Record (W-L-D)
│  └─ Quick matchup difficulty badge
│
├─ Tabs:
│  ├─ Tab 1: "Quarter Analytics" (default)
│  │  ├─ Group A: Quarter Strength & Momentum (3 insights)
│  │  ├─ Group C: Scoring Efficiency (3 insights)
│  │  └─ Tactical implications section
│  │
│  ├─ Tab 2: "Relative Strength"
│  │  ├─ Group B: Ladder & Schedule context (4 insights)
│  │  └─ Head-to-head comparison grid
│  │
│  ├─ Tab 3: "Vulnerabilities"
│  │  ├─ Group D: Vulnerability mapping (4 insights)
│  │  ├─ Weakness patterns analysis
│  │  └─ Tactical exploitation guide
│  │
│  └─ Tab 4: "Head-to-Head" (read-only until Phase 2)
│     ├─ H2H record (W-L-D)
│     ├─ Recent games table with quarter breakdown
│     └─ Scouting Notes placeholder
```

**Component Details:**

**Quarter Analytics Tab:**
```
Section 1: Quarter Strength Profile [A1]
├─ Visual: Horizontal bar chart Q1-Q4 avg scores
├─ Color coding: very-strong (red) | strong (orange) | moderate (yellow) | weak (green)
├─ Data point: Q1 7.67 pts (Very Strong - 12 games), confidence indicator
├─ Tactical note: "They start strong - prepare defensive discipline early"
├─ Repeat for Q2, Q3, Q4

Section 2: Quarter Momentum Flow [A2]
├─ Visual: Flow diagram Q1 → Q2 → Q3 → Q4 with arrows
├─ Arrow direction: ↑ improving / ↓ declining / → stable
├─ Arrow magnitude: +0.5, -0.3, etc.
├─ Interpretation: "Fast first half, fade second half" (example)
├─ Tactical: "Attack Q3 defensively; compensate for their expected Q4 decline"

Section 3: Consistency Gauge [A3]
├─ Visual: Needle gauge (like speedometer) for each quarter
├─ Scale: Unpredictable (0) ← → Highly Consistent (100)
├─ Q1: 85 (highly consistent)
├─ Q4: 42 (unpredictable)
├─ Tactical: "Q1 predictable = lock defensive pattern. Q4 chaos = flexible defense"

Section 4: Quarterly Dominance [C3]
├─ Visual: Pie chart showing % of total game score per quarter
├─ Q1: 25% | Q2: 23% | Q3: 27% | Q4: 25%
├─ Highlight: Q3 = 27% (their primary resource investment)
├─ Tactical: "Defend Q3 hardest - 27% of their scoring there"

Section 5: Efficiency Analysis [C1]
├─ Visual: Heat map showing operating zone per quarter
├─ Q1: Mid-range (7.65 of 11 max range)
├─ Q2: Upper-range (7.80 of 11 max range) - running hot
├─ Q3: Mid-range (8.05 of 11 max range)
├─ Q4: Lower-range (6.95 of 10 max range) - fatigued
├─ Tactical: "Q2 running hot - be aggressive. Q4 fatigued - press hard"
```

**Relative Strength Tab:**
```
Section 1: Ladder Context [B1]
├─ Display: Badge saying "Ranked 1st of 10"
├─ Our comparison: "We're ranked 4th" (side by side)
├─ Differential: "They're ranked 3 places higher"
├─ Expected margin: "Historical avg: opponents ranked 3 higher score +4.2 pts more"
├─ Confidence: "High confidence (based on league data)"
├─ Psychological: Either "This is a tough draw" or "We're underdogs but competitive"

Section 2: Upset Patterns [B2]
├─ Display: "Known Vulnerabilities" card
├─ Finding: "Lose to defensive teams 40% of time"
├─ Evidence: "vs Mooroolbark (defensive): 0-2"
├─ Evidence: "vs Whittlesea (defensive): 0-1-1"
├─ Tactical: "If we play defensive style, odds improve to 40%"
├─ Exploit: Emphasis on defensive approach

Section 3: Ranking Validation [B3]
├─ Display: "Ranking Reality Check"
├─ Rank position: 1st
├─ Expected scoring: 28.5 pts/game (avg for rank 1)
├─ Actual scoring: 26.1 pts/game
├─ Status: "Underperforming ranking - less intimidating than rank suggests"
├─ Psychological boost: "Don't be intimidated"

Section 4: SoS Analysis [B4]
├─ Display: Recent opponents they've faced
├─ Recent 8 games: "Avg opponent rank 5.3"
├─ Our rank: 4
├─ Implication: "They're slightly overmatched vs us on average - limited toughness exposure"
├─ Tactical: "We might be a step up from recent opponents - novelty advantage"
```

**Vulnerabilities Tab:**
```
Section 1: Tier Performance [D1]
├─ Display: Side-by-side comparison
├─ vs Top-5 teams: Q1 6.8, Q2 6.2, Q3 7.4, Q4 6.1, Total 26.5
├─ vs Teams 6-10: Q1 8.1, Q2 7.9, Q3 8.8, Q4 7.6, Total 32.4
├─ Compression: -5.9 pts total vs top-5 teams
├─ Tactical (we're rank 5): "Expected drop: -5.9 pts vs us"

Section 2: Play-to-Opponent Pattern [D2]
├─ Display: Correlation matrix
├─ Finding: "Yes, they play down to weaker opponents"
├─ Correlation: 0.68 (strong)
├─ Evidence: "vs Rank 9 team: +0.5 pts above avg"
├─ Evidence: "vs Rank 1 team: -0.8 pts below avg"
├─ Tactical: "They come in overconfident vs lower-ranked opponents - exploit Q1"

Section 3: Recent Opposition Analysis [D3]
├─ Display: List of recent opponents with ranks
├─ Recent 8: Croydon (1), Mooroolbark (7), Whittlesea (9), Eltham (5)...
├─ Average rank: 4.4
├─ Our rank: 5
├─ Finding: "Limited recent exposure to 5-ranked teams"
├─ Tactical: "Our style might be unfamiliar to them - preparation advantage"

Section 4: Volatility Assessment [D4]
├─ Display: Quarter risk gauges
├─ Q1: Low volatility (predictable, consistent starts)
├─ Q2: High volatility (unpredictable, could go either way)
├─ Q3: Very stable (reliably strong, predictable patterns)
├─ Q4: High volatility (fatigue-driven swings)
├─ Tactical: "Lock Q3 defense; stay flexible Q2. Q1 predictable = set pattern."
```

**Phase 1 Implementation Schedule:**
- Week 1: Analytics calculation functions (backend, all 14 insights)
- Week 2: Tab structure, Quarter Analytics tab (A1-A3, C1-C3)
- Week 3: Relative Strength tab (B1-B4), Vulnerabilities tab (D1-D4)
- Week 4: Polish, testing, tactical guidance text refinement

**Deliverable:** Opponent profile becomes comprehensive scouting intelligence dashboard with 14 actionable insights

---

### Phase 2: Coach Scouting Notes (2-3 hours)

**What:** Allow coaches to persist opponent scouting notes

**Features:**
1. **Scouting Notebook (Edit Mode)**
   - Playing style (text input)
   - Key players (comma-separated)
   - Strengths (bullet list)
   - Weaknesses (bullet list)
   - Tactics vs this opponent (text)
   - Typical formations (text)
   - Last update info (auto-populated: who, when)

2. **Note Persistence**
   - Save to OpponentScouting sheet (backend)
   - Store editing user (from coach PIN token)
   - Timestamp edits
   - Version history (keep last 3 versions for audit)

3. **Note Sharing**
   - View-only link for parents
   - Export to PDF for printing
   - Share via email

**Implementation:**
- Backend: `saveOpponentScouting(teamID, opponentName, scoutingData)`
- Backend: `getOpponentScouting(teamID, opponentName)`
- Frontend: Edit modal with form fields
- Frontend: Auto-save debounced to backend

**Deliverable:** Scouting notes survive app closure and sync across devices

---

### Phase 3: AI Opposition Matchup Analyzer (3-4 hours)

**What:** AI Module 9 from extended AI architecture (on-demand)

**Trigger:** Coach clicks "Analyze Matchup" on opponent profile

**AI Inputs:**
- Our recent form (last 5 games)
- Our strengths (from AI Module 2: Pattern Detector)
- Opponent's recent form (last 5 games, ladder position)
- Opponent's strengths (if scouting notes exist)
- Head-to-head history (if available)
- Ladder context (their tier vs our tier)

**AI Output (JSON):**
```json
{
  "matchupAnalysis": {
    "ourAdvantages": [
      { "area": "Shooting accuracy", "evidence": "Sarah 18+ goals last 3 games", "context": "vs Kilmore's mid-tier defense" },
      { "area": "Court vision", "evidence": "Quick breaks scoring 8+ per game", "context": "exploit their slow defensive transition" }
    ],
    "theirAdvantages": [
      { "area": "Q1 starts", "evidence": "averaging +5 in opening quarter", "context": "prepare aggressive opening defense" }
    ],
    "tacticalRecommendations": [
      { "phase": "pre-game", "action": "Practice Q1 defensive spacing - they start strong" },
      { "phase": "Q1-Q2", "action": "Control pace, limit fast breaks" },
      { "phase": "Q3-Q4", "action": "Push pace when they tire (history shows form decline)" }
    ],
    "keyMatchups": [
      { "ourPlayer": "Sarah (GS)", "theirPlayer": "Emma (GD)", "prediction": "Sarah should dominate - Emma weaker on one-on-one" },
      { "ourPlayer": "Lily (WA)", "theirPlayer": "Kate (C)", "prediction": "Even matchup - both strong court vision" }
    ],
    "prediction": "Close game likely. Key: control Q1, execute rotations Q4 when they fade. 55% us, 45% them based on form.",
    "confidence": "high"  // if head-to-head data available, high; else medium
  }
}
```

**Integration:**
- Backend: Fetch from Gemini (gemini-2.0-flash)
- Cache: 1 week (opponent strategies don't change rapidly)
- Fallback: Display "Analysis not available" if Gemini fails
- Display: Modal with formatted recommendations

**Deliverable:** AI-powered tactical preparation available pre-game

---

### Phase 3: Predictive Analytics & H2H Intelligence (3-4 hours)

**What:** Add Group E analytics (3 insights) - predictive projections for near-term matchups

**Analytics Calculated & Displayed in Phase 3:**

**Group E: Head-to-Head & Predictive Analytics (3 insights)**
15. H2H Trend Extrapolation (E1) - Linear regression showing trajectory
16. Quarter Performance Convergence (E2) - Season vs H2H comparison per quarter
17. Cumulative Performance Prediction (E3) - Form trajectory meeting point

**New UI Components:**

**H2H Prediction Tab:**
```
Section 1: Trend Line Analysis [E1]
├─ Visual: Scatter plot with linear regression
├─ X-axis: Game number (H2H chronologically)
├─ Y-axis: Score delta (their score - our score)
├─ Historical data: Points plotted for past 3 H2H games
├─ Trend line: Regression line showing direction
├─ Projection: Next game prediction with confidence band
├─ Display: "Trend: ↓ Getting closer to us. Next prediction: We win by 1-2 pts (high confidence)"
├─ Psychological: "Momentum on our side - they're falling behind"

Section 2: Quarter Performance Convergence [E2]
├─ Display: Per-quarter comparison (H2H history vs current season)
├─ Q1: "H2H avg 8.2 (historically +0.5 stronger), current season 7.67 (+0 vs us now)"
├─ Q2: "H2H avg 7.5, season avg 7.2 (trend favoring us)"
├─ Q3: "H2H avg 8.3, season avg 8.33 (no convergence)"
├─ Q4: "H2H avg 7.0, season avg 7.33 (they even stronger Q4 now)"
├─ Interpretation: "Their Q1 advantage over us is disappearing this season"

Section 3: Form Trajectory Projection [E3]
├─ Visual: Dual line chart showing both teams' form arc
├─ X-axis: weeks from now
├─ Y-axis: projected form rating (avg score)
├─ Our trend: ↑ improving +0.27/game
├─ Their trend: → stable -0.05/game (slight decline)
├─ Intersection point: "By Week X, we'd be evenly matched"
├─ Current gap: "1.9 pts"
├─ Fixture date gap: "In 2 weeks: 1.1 pt gap (narrowing)"
├─ Tactical: "Delayed fixture helps us - trajectory works in our favor"
```

**Implementation:**
- Backend: Add `calculateH2HTrendAnalysis()`, `calculateQuarterConvergence()`, `calculateFormTrajectory()`
- Frontend: New "Prediction" tab with 3 sections
- Display: 2-3 charts using Chart.js

**Updated Phase 2 + 3 Integration:**
- After scouting notes added (Phase 2), Phase 3 enriches H2H profile with predictive context
- Coaches can see: "Here's what we've done vs them historically, here's where we're headed"

**Deliverable:** Predictive tactical insights showing trend direction and convergence points

---

### Phase 4: Advanced Patterns & Situational Analytics (3-4 hours)

**What:** Add Group F & G analytics (6 insights) - pressure response, fatigue modeling, situational intelligence

**Analytics Calculated & Displayed in Phase 4:**

**Group F: Advanced Scouting Patterns (4 insights)**
18. Scoring Variance Under Pressure (F1) - Comeback response patterns
19. Quarter Scoring Ratio (F2) - Resource allocation mode
20. Consistency Score (F3) - Overall predictability rating
21. Seasonal Regression/Progression (F4) - Confidence trajectory

**Group G: Situational Advantage Detection (2 insights)**
22. Fatigue Accumulation Model (G1) - Q4 degradation by week
23. Quarter Performance Composition (G2) - Quarters that predict wins

**New UI Components:**

**Patterns & Strategy Tab:**
```
Section 1: Pressure Response [F1]
├─ Display: "How they react when trailing at half-time"
├─ When trailing: "Q3 avg 8.8 (+0.8 spike), Q4 avg 7.9 (aggressive comeback attempts)"
├─ When leading: "Q3 avg 8.0 (conservative hold), Q4 avg 6.9 (protect lead)"
├─ Tactical implications: 
│  ├─ "Build strong first half lead (8-10 pts)"
│  ├─ "Their Q3 comeback will spike, but insufficient if we're ahead"
│  └─ "Game strategy: Front-load scoring, control pace Q3"

Section 2: Resource Allocation [F2]
├─ Visual: Pie chart showing quarter resource distribution
├─ Q1: 22% | Q2: 20% | Q3: 28% | Q4: 30%
├─ Pattern: "Back-end heavy (58% in Q3-Q4)"
├─ Implication: "They invest heavily in finishes"
├─ If you shut down Q3-Q4: "They can't recover early deficit"
├─ Tactical: "Strong Q1-Q2 defense = game control. Their finish firepower neutered."

Section 3: Predictability Score [F3]
├─ Display: Scale 0-100 (lower = unpredictable)
├─ Opposition score: 92 (highly predictable, consistent patterns)
├─ Gauge position: "Very predictable" indicator
├─ Implication: "Lock in ONE defensive strategy - will work all game"
├─ Comparison:  "vs Mooroolbark (45, erratic): need defensive flexibility"

Section 4: Recent Form & Momentum [F4]
├─ Display: Recent 5-game record
├─ Record: "2-3" (losses: L-L-L-W-W)
├─ Pattern: "Bad streak (0-3), recovering (2-0)" 
├─ Momentum: "↓ Declining overall despite recent wins - false recovery"
├─ Psychological: "Low confidence, likely tentative play"
├─ Tactical: "Aggressive Q1 - they might fold under pressure given recent losses"

Section 5: Fatigue Projection [G1]
├─ Visual: Q4 degradation graph
├─ Week 1 Q4 avg: 7.8
├─ Week 5 Q4 avg: 6.8
├─ Week 9 Q4 avg: 5.9 (current)
├─ Fatigue rate: -0.48 pts/week
├─ Fixture week: 11
├─ Projected Q4 at fixture: 5.5
├─ Tactical: "Late-season fixture advantage: load offensive weapons Q4"

Section 6: Win-Building Patterns [G2]
├─ Display: "Their winning formula"
├─ Q1 in wins: 8.4 avg (78% correlation to wins)
├─ Q3 in wins: 8.8 avg (82% correlation - strongest predictor)
├─ Q4 in wins: 7.8 avg (71% correlation - less important)
├─ Implication: "Their wins built on Q1 + Q3 excellence, not Q4"
├─ Counter-strategy: "Shut down Q1 + Q3, let Q4 be competitive"
├─ Tactical plan: "Priority defense Q1 + Q3. Accept Q4 battle. If we win those quarters, game is ours"
```

**Implementation:**
- Backend: Add `calculatePressureResponse()`, `calculateResourceAllocation()`, `calculateConsistencyScore()`, `calculateFormMomentum()`, `calculateFatigueModel()`, `calculateWinFormula()`
- Frontend: New "Patterns & Strategy" tab with 6 sections
- Display: Mix of gauges, flow diagrams, bar charts, timelines

**Advanced Features:**
- **Tactical Implication Engine:** Generate "game plan recommendations" based on analysis
  - Example: "Press hard Q1-Q3 (their win formula zones). Conservative Q4 (they're weaker finishers proportionally)."
- **Weakness Exploitation Checklist:** Auto-generate tactical checklist
  - ☐ Dominate Q1 (they score strongest here - establish early defense)
  - ☐ Control Q3 (their second critical zone)
  - ☐ Manage Q4 (accept some scoring, focus on keeping close)
  - ☐ Pressure when trailing (exploit their comeback spike Q3)

**Deliverable:** Complete tactical game plan framework based on 12+ analytical insights

---

### Phase 5: Comparative Analysis & Dashboard Integration (3-4 hours)

**What:** Similar opponent matching + fixture board enhancement + pre-game workflow

**Features:**

**1. Similar Opponent Finder (Quarter Pattern Matching)**
```
Algorithm:
1. Get opposition's Q1-Q4 strength profile
2. Scan all other opponents in season
3. Match: Similar ladder tier + Similar Q1-Q4 pattern
4. Output: "Teams that play like this opponent"

Example Result:
"Kilmore (rank 1, strong Q1/Q3, weak Q4) plays similar to:"
├─ Eltham (rank 2, strong Q1/Q3, very weak Q4) - 92% match
├─ Doncaster (rank 3, moderate Q1, strong Q3, weak Q4) - 81% match
└─ Mooroolbark (rank 4, same fatigue Q4, better starts) - 78% match

Tactical Value: "Beat Eltham? Use same game plan vs Kilmore"
```

**2. Comparative Dashboard (Us vs Opposition)**
```
Display: 3-column comparison (Our team | Metric | Opposition)

Mental Comparison:
├─ Ladder Position: 4th | 1st (disadvantage: -3)
├─ Recent Record: 5-4-1 | 8-2-0 (they're stronger recent form)
├─ Avg Score: 28.2 | 30.1 (we score 1.9 less)
├─ Avg Conceded: 26.1 | 22.5 (we concede more - defense weaker)

Quarter Comparison:
├─ Q1 Avg: 7.2 | 7.67 (they +0.47 early game)
├─ Q2 Avg: 6.8 | 7.20 (they +0.40)
├─ Q3 Avg: 7.0 | 8.33 (they +1.33 - biggest gap, their strength zone)
├─ Q4 Avg: 7.2 | 7.33 (nearly equal - tight finish)

Analysis:
├─ Gap analysis: Q3 is biggest mismatch (-1.33)
├─ Tight quarters: Q1, Q2, Q4 relatively competitive
├─ Strength zones: Their Q3 dominance vs our Q4 competence
├─ Strategy implication: "Win/draw Q1-Q2 early, survive Q3 exodus, dominate Q4"

Resource Allocation:
├─ Our scoring distribution: Q1 24% | Q2 22% | Q3 23% | Q4 31% (balanced, slight finish focus)
├─ Their allocation: Q1 22% | Q2 20% | Q3 28% | Q4 30% (heavier Q3 focus than us)
├─ Comparison: They over-invest Q3 vs us - their potential weakness if Q3 shuts down

Fatigue Pattern:
├─ Our Q4 trajectory: -0.3/week (consistent fatigue)
├─ Their Q4 trajectory: -0.48/week (faster fatigue)
├─ Implication: "Both fade Q4, but they fade faster - advantage us in finals"
```

**3. Fixture Board Enhancement**
```
Old columns: Opponent | Record | Ladder | Our H2H
New columns: ^^ PLUS:
├─ Q-Strength: Shows quarter strength pattern (Q1 Strong, Q3 Very Strong, Q4 Weak)
├─ Trend: Shows form trajectory (↑ improving, ↓ declining, → stable)
├─ Fatigue: Shows Q4 fatigue level (based on fatigue model)
├─ Similarity: "Similar to: Eltham (92%)" if matched

Sorting options:
├─ By difficulty (existing)
├─ By quarter strength (new) - show team order by their Q1 strength
├─ By fatigue projection (new) - show which teams will be most tired in late fixtures
├─ By similarity (new) - cluster similar tactical opponents
```

**4. Pre-Game Briefing Card**
```
Location: Game detail view (before lineup planner)

Card contents:
┌────────────────────────────────────────┐
│ Opponent: Kilmore (Rank 1 of 10) 1-2 H2H
├────────────────────────────────────────┤
│ QUICK MATCHUP               |  STATISTICS
│ Their advantage: Q3 (8.33   |  vs Top-5: 26.5 pts
│ Our advantage: Q4 (7.2 vs  |  vs Mid-tier: 32.4 pts
│ their 7.33)                 |  SoS: 48 (average schedule)
│                             |  Predictability: 92/100 (lock defense)
├────────────────────────────────────────┤
│ QUARTER FORECAST
│ Q1: STRONG ▓▓▓ (7.67 avg) - Expect fast start | Tactical: Fresh defense Q1
│ Q2: STRONG ▓▓▌ (7.20 avg) - Slight dip  | Tactical: Maintain pressure
│ Q3: VERY STRONG ▓▓▓▓ (8.33 avg) - Peak quarter | Tactical: BUCKLE DOWN Q3
│ Q4: MODERATE ▓▓ (7.33 avg) - Fatigued  | Tactical: Dominate finishes
├────────────────────────────────────────┤
│ GAME PLAN (Auto-generated from analysis)
│ • Priority: Win Q1-Q2, survive Q3, dominate Q4
│ • Q1 Defense: Fresh, experienced starters (they explode early)
│ • Q3 Defense: Max intensity (their peak scoring)
│ • Q4 Offense: Attack aggressively (they're fatigued)
│ • Scout Notes: Zone defense effective (they compress vs top-5)
├────────────────────────────────────────┤
│ [View Full Profile] [Update Scouting] [Print Briefing]
└────────────────────────────────────────┘
```

**5. Scouting Checklist Modal**
```
Pre-Game Preparation Checklist
═════════════════════════════════

Content sections (expandable):
□ Fixture Context
  ├─ ✓ View ladder position (1st - significant)
  ├─ ✓ Check recent form (8-2-0 - strong form)
  └─ ✓ Review SoS (average schedule exposure)

□ Matchup Analysis
  ├─ ✓ Review H2H record (1-2, trending closer)
  ├─ ✓ Study quarter patterns (strong Q1/Q3, weak Q4)
  ├─ ✓ Identify vulnerabilities (loses to defensive teams)
  └─ ✓ Understand setup matchups

□ Strategic Preparation
  ├─ ✓ Review scouting notes (playing style, key players)
  ├─ ✓ Run matchup analysis (AI insights)
  ├─ ✓ Plan substitutions (by quarter strength)
  └─ ✓ Prepare game plan card

□ Game Day
  ├─ ✓ Print opponent profile
  ├─ ✓ Brief coaching staff on patterns
  ├─ ✓ Finalize Q1-Q4 defensive strategies
  └─ ✓ Set player expectations (Q1 aggressive, Q3 tight, Q4 attack)

Estimated prep time: 10-15 minutes per opponent
```

**Implementation:**
- Backend: `getSimilarOpponents(opponentProfile, allTeamProfiles)` - quarter pattern matching
- Backend: `getComparativeAnalysis(ourTeamID, opponentName)` - tier comparison + resource allocation
- Frontend: Modify `renderGameDetail()` with briefing card
- Frontend: Modify `renderFixture()` with new sorters + Q-strength column
- Frontend: New modal `showScoutingChecklist()` with expandable sections
- Frontend: Auto-generate game plan text from analysis (template + data points)

**Advanced Features:**
- **Game Plan Auto-Generation:** Create contextualized strategy text based on all analyses
  - Template: "Beat them by [tactic] Q1, [tactic] Q3, [tactic] Q4. Exploit [weakness]."
  - Example: "Fast starters, so establish Q1 discipline. Peak in Q3, lock defense. Fatigue Q4,  attack aggressively. Lose to defensive teams (we play defensive)."
- **Printable Pre-Game Brief:** PDF generation of full profile + checklist + game plan
- **Coaching Staff Notes:** Share scouting with assistant coaches via email/link

**Deliverable:** Unified scouting workflow from fixture board → pre-game briefing → game execution

---

## API Enhancements

### New Backend Endpoints

**`getOpponentScouting` (GET)**
```
Parameters: teamID, opponentName
Returns: { success, scoutingNotes: { playingStyle, keyPlayers, strengths, ... } }
```

**`saveOpponentScouting` (POST)**
```
Parameters: teamID, opponentName, scoutingData (JSON)
Auth: Optional PIN check (if team PIN-protected)
Returns: { success, lastUpdated }
```

**`getOpponentProfile` (GET)**
```
Parameters: teamID, opponentName
Returns: {
  success,
  profile: {
    opponent: { name, ladder: {...}, headToHead: {...} },
    scoutingNotes: {...},
    aiScouting: {...}
  }
}
```

**`getComparativeAnalysis` (GET)**
```
Parameters: ourTeamID, opponentName, sheetName
Returns: {
  success,
  comparison: { ourMetrics, theirMetrics, advantages, disadvantages }
}
```

**`getOppositionMatchupAnalysis` (POST)**
```
Parameters: teamID, sheetName, opponentName, matchupContext (JSON)
Model: gemini-2.0-flash
Returns: { success, matchupAnalysis: {...} }
Cache: 1 week per opponent
```

### Database Schema

**OpponentScouting Sheet (New Tab)**
```
A: TeamID
B: OpponentName (unique per team)
C: PlayingStyle
D: KeyPlayers (JSON array or comma-separated)
E: Strengths (JSON array)
F: Weaknesses (JSON array)
G: Tactics
H: Formations
I: LastUpdated (ISO timestamp)
J: UpdatedBy (Coach name or email)
K: NotesVersion (for history)
```

---

## Implementation Phases

### Timeline

| Phase | Name | Hours | Weeks | Priority |
|-------|------|-------|-------|----------|
| 1 | Opponent Profile Hub | 3-4 | 1 | Medium |
| 2 | Coach Scouting Notes | 2-3 | 1 | Medium |
| 3 | AI Matchup Analyzer | 3-4 | 1 | Medium-High |
| 4 | Comparative Analysis | 2-3 | 0.5 | Low |
| 5 | Scouting Dashboard | 2-3 | 1 | Low |
| **Total** | **Opposition Scouting** | **12-16** | **4** | **Medium** |

### Phase 1 Checklist (Opponent Profile Hub)

**Backend (Apps Script):**
- [ ] `getOpponentScouting(teamID, opponentName)` - Fetch from OpponentScouting sheet
- [ ] Merge opponent profile data (ladder + H2H + scouting)
- [ ] Calculate head-to-head trends (W-L trend, avg score diff)
- [ ] Return comprehensive opponent object

**Frontend:**
- [ ] Create new view: `opponent-profile-view`
- [ ] `renderOpponentFixture()` - Upcoming opponent list
- [ ] `renderOpponentProfile(opponentName)` - Profile detail page
- [ ] Link from game detail to opponent profile
- [ ] Opponent ladder badges (reuse existing `getOpponentDifficulty()`)
- [ ] Head-to-head card with results table

**CSS:**
- [ ] `.opponent-profile` styling
- [ ] `.head-to-head-table` styling
- [ ] `.opponent-stats-grid` responsive layout
- [ ] Color-code wins/losses in tables

**Testing:**
- [ ] Team with ladder data only
- [ ] Team without ladder data (graceful fallback)
- [ ] Opponent not in ladder
- [ ] First-time matchup (no H2H history)
- [ ] Multiple matchups (show recent 5)

---

## Success Criteria

### Technical Success
- ✅ Opponent profiles load instantly (<1s) - cached data
- ✅ No new API calls during scouting (uses existing)
- ✅ Head-to-head calculations accurate
- ✅ Notes persist across app closure
- ✅ AI analysis available on-demand (1-3s response)
- ✅ Graceful fallback when ladder data missing

### User Experience Success
- ✅ Coaches discover new opponents instantly
- ✅ Scouting notes synced across coaches
- ✅ Pre-game workflow integrated
- ✅ Head-to-head trends visible at a glance
- ✅ AI recommendations actionable
- ✅ Suitable for parent portal (opposition context in read-only)

### Business Success
- ✅ Coaches spend less time on opponent research
- ✅ Improved tactical preparation (team feedback)
- ✅ Win rate improvement (if tracked)
- ✅ Competitive advantage (systematic scouting)
- ✅ Parent engagement (opponent difficulty context)

---

## Tactical Use Cases - Quarter Performance Analytics

### Lineup Planning

**Scenario 1: Opponent Strong in Q1**
- Opposition averages 8.3 points in Q1 (vs our 7.2)
- **Tactic:** Start with experienced, defensive-minded players. Establish early defensive discipline.
- **Lineup decision:** Deploy defender known for strong starts (even if usually sub) → Q1 only
- **Expected outcome:** Neutralize their Q1 advantage, build confidence early

**Scenario 2: Opponent Fatigues in Q4**
- Opposition averages 7.3 points in Q4, declining from 8.0 in Q3 (clear fatigue)
- **Tactic:** Use aggressive pressing defense Q4 when they're tired
- **Lineup decision:** Save best attacking players for Q4 when opponent defense drops
- **Substitution timing:** Fresh legs on court in final quarter when it matters most
- **Expected outcome:** Capitalize on opponent weakness, score more in decisive quarter

**Scenario 3: Opposition Inconsistent (high variance across quarters)**
- Q1: 8.1, Q2: 6.8, Q3: 8.4, Q4: 7.1 (reactive, momentum-driven)
- **Tactic:** Control game tempo, avoid momentum swings (slow pace, strategic timeouts)
- **Lineup decision:** Deploy steadier players who maintain intensity regardless of score
- **Expected outcome:** Reduce opponent's ability to build momentum

**Scenario 4: Head-to-Head vs Overall Pattern**
- Overall ladder position: 3rd (strong)
- But quarterly breakdown shows: weak Q2 (avg 6.1) AND we're strong in Q2 (avg 7.8)
- **Tactic:** Design rotations to maximize Q2 matchup advantage before they adjust
- **Lineup decision:** Stack aggressive offensive players in Q2 starting lineups
- **Expected outcome:** Win the quarter decisively, build mental edge

### Rotation Strategy

**Scenario: Build Substitution Depth Around Quarter Patterns**
- Opposition strong Q1 & Q3, weak Q2 & Q4
- Your team has: strong starters, solid mid-game players, excellent finishers
- **Rotation design:**
  - Q1: Most experienced defenders (opposition likely to attack aggressively)
  - Q2: Offensive specialists (opposition vulnerable, chance to build lead)
  - Q3: Balanced, match their intensity (they typically re-energize)
  - Q4: Finishers with endurance (opposition tires, your team maintains)
- **Personnel:**
  - Q1 starters: Sarah (defensive-minded GS), Emily (aggressive WA)
  - Q2 bench: Rebecca (offensive-focused GA), Jasmine (creating WA)
  - Q3 subs: Laura (balanced GD), Sophie (versatile C)
  - Q4 finishers: Hannah (tireless, all-rounder GK), Mia (endurance C)

### Training Focus

- **Identify opponent's Q4 weakness:** If opposition fatigues Q4, train your team's Q4 fitness and rehearse high-pressure final-quarter plays
- **Match their Q1 intensity:** If opposition starts fast, practice defensive transitions and early-game discipline
- **Exploit pattern recognition:** Train players to recognize quarter patterns live ("They always slow in Q4 - attack now")

### AI Matchup Integration

Quarter performance data feeds into AI Module 9:
- AI includes quarter patterns in tactical recommendations
- Example AI output: "Kilmore strong in Q1 & Q3. Recommend conservative Q1 (defend), aggressive Q2 (build lead), intense Q3 (stay focused), dominant Q4 (capitalize on fatigue)"

---

## Integration with AI Architecture

### Opposition Matchup Analyzer (Module 9, Tier 2)

**From Extended Modular AI Architecture:**
- Trigger: User clicks "Analyze Matchup"
- Input: Our recent form + opponent's recent form + ladder context
- Output: Tactical recommendations + key matchups + prediction
- Cache: 1 week per opponent
- Model: gemini-2.0-flash

**How it fits:**
- Complements Phase 3 implementation
- Uses AI Module 9 from extended architecture
- Falls back to basic scouting if AI unavailable
- Enriches opponent profiles with AI insights

---

## Risk Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Stale opponent data** | Low | Low | Add "Last updated" timestamps, refresh button |
| **No ladder data** | Medium | Low | Graceful degradation, basic profile still shows H2H |
| **Scouting notes deleted** | Low | Low | Archive deleted notes, keep history |
| **AI service unavailable** | Low | Low | Fallback to manual scouting notes |
| **Coach confusion (too much info)** | Medium | Low | Progressive disclosure (expandable sections) |
| **Storage quota exceeded** | Low | Low | Limit OpponentScouting sheet to 500 rows, auto-archive old entries |

---

## Cost & Resources

### Development Effort
- 12-16 hours across 5 phases
- No new infrastructure required (uses existing APIs)
- One developer, 4-week implementation window

### Infrastructure Impact
- OpponentScouting sheet tab (adds ~500 rows max = negligible)
- AI tokens: Module 9 uses gemini-2.0-flash (existing quota)
- No additional API costs

### Maintenance
- Monitor OpponentScouting sheet growth
- Update opponent name fuzzy-matching if teams rename
- Validate H2H calculations quarterly

---

## How Coaches Will Benefit

### Pre-Game Preparation
```
Friday before game:
1. Tap upcoming opponent -> sees Kilmore profile (ladder position, recent form)
2. Clicks "Analyze Matchup" -> AI generates tactical recommendations
3. Updates scouting notes with recent observations
4. Reviews head-to-head history (we've lost last 2, trend: declining)
5. Prints opponent profile for team meeting
6. Coach has full preparation strategy in 5 minutes
```

### Season-Long Tracking
```
Coach builds scouting database:
- Diamond Creek (zone defense, tire them Q4) - 1-2 record
- Kilmore (fast-break attacks, press Q1) - 1-2 record
- Richmond (strong GS, avoid direct defense) - 2-1 record

Can reference previous scouting if team faces recurring opponents
No need to re-research the same teams season after season
```

### Collaborative Coaching
```
Multiple coaches on team:
- Head coach updates opponent scouting notes
- Assistant coaches see them automatically synced
- All coaches aligned on tactical approach
- Consistency across practice/game prep
```

---

## Next Steps

1. **Validate with coaches:** Does this scouting approach meet their needs?
2. **Prioritize phases:** Which phases add most value?
3. **Start Phase 1:** Opponent Profile Hub (quickest ROI)
4. **Gather feedback:** Test with 2-3 coaches before full rollout
5. **Decide AI integration:** Should we wait for modular AI background, or implement Phase 3 independently?

---

**Document Status:** Complete planning document ready for review  
**Last Updated:** February 25, 2026  
**Related Plans:** COMBINED_AI_IMPLEMENTATION.md (Module 9: Opposition Matchup Analyzer), Ladder & Fixture Integration, CLAUDE.md (opponent difficulty ratings)
