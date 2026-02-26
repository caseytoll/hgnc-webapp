# Rolling Substitutions Implementation Plan

**Status**: Planning Phase  
**Date**: February 25, 2026  
**Scope**: Support unlimited position changes within quarters for NFNA U13+ and NFNL teams  
**Affected Competitions**: NFNA (U13-U19, Opens), NFNL (all grades)

---

## Problem Statement

### Current Limitation
The app uses a **static quarter lineup** model:
```javascript
Q1: {
  GS: "playerID_1",
  GA: "playerID_2",
  WA: "playerID_3",
  // ... etc (one player per position for entire quarter)
  notes: "..."
}
```

This works for junior competitions (U11, U12) where substitutions are rare and predetermined.

### Required Capability
NFNA U13+ and NFNL teams need **rolling substitutions**:

**Pre-game:**
- Coach uses existing **Lineup Planner** to set Q1-Q4 starting lineups
- This is the game plan ("Alice starts Q1 as GS, Emma starts Q2 as GS...")

**During/after game - Track deviations from plan:**
- Player A was planned to play GS full quarter, but subbed off at 5 minutes for Player B
- Player B returned to bench mid-Q2 when planned starter came back on
- **No limit** on number of changes per quarter
- Most teams have 1-2 bench players = 1-4 subs per quarter typically

**Track all changes for:**
- Coaching analysis ("Who actually played vs. plan?")
- Stats calculations ("This player was on court for X goals")
- Roster management ("Sarah started Q1 but subbed off early")
- Goal attribution ("Which goaler scored which goals when multiple GS subs?")

### Critical Timing Constraint: NFNA Games

**NFNA Competition Setup**:
- Scorers use **Netball Connect app** on iPad (official scoring system)
- **No visible scoreboard** for coaches/players on court
- Siren is **centrally managed** by the association (same siren across all courts)
- **Timing is synced** across the association, not visible to coaches
- Coaches hear: siren at start/end of quarter only, not minute-by-minute

**Implication for Rolling Subs**:
- ❌ Coaches **CANNOT** know exact times when subs occurred
- ✅ Coaches **CAN** estimate: "Early in quarter (first 2-3 mins)", "Mid-quarter", "Late"
- ✅ Coaches **CAN** see other teams' iPads if looking nearby (but shouldn't rely on it)
- ✅ Video recordings (if available) can provide exact times after-the-fact

**This fundamentally changes data entry**: Coaches enter subs by **order and estimated segment**, not exact timestamps.

### Example Game Scenario (NFNA Reality)
```
Q1 (10 minutes, no visible clock for coaches)
├─ Coach sees: "Game started, Alice at GS"
├─ ~3-5 mins in (random guess): "Carol seems to have come off, Diana in"
├─ ~6-7 mins in (coach estimates): "Alice came off, Emma came on"
└─ Siren sounds: "Quarter ends"

Coach remembers (post-game):
├─ Diana came on early (WA position)
├─ Emma came on mid-quarter (GS position)
├─ Probably one more sub I forgot

Result: Can record WHO but not exact WHEN
```

---

## Current Implementation Details

### Data Structure (Lineup)
```javascript
// From game.lineups[gameID][quarterID]
{
  Q1: {
    GS: "playerID_1",
    GA: "playerID_2", 
    WA: "playerID_3",
    C: "playerID_4",
    WD: "playerID_5",
    GD: "playerID_6",
    GK: "playerID_7",
    ourGsGoals: 5,
    ourGaGoals: 3,
    oppGsGoals: 4,
    oppGaGoals: 2,
    notes: "Played well in defence"
  },
  Q2: { ... },
  Q3: { ... },
  Q4: { ... }
}
```

### Current UI (Lineup Planner)
- Desktop-only, full-screen modal
- **Pre-game planning tool**: Sets Q1-Q4 starting lineups BEFORE game
- Players assigned to positions OR bench for each quarter
- Rolling subs = deviations tracked DURING/AFTER game
- 4-quarter grid layout
- Bench list on left (available players)
- 4 quarter cards showing **current** lineup (position → player)
- Drag & drop to assign players
- Copy/paste quarters
- Undo stack
- Quarter notes field

### Stats Calculations
- Uses `state.currentTeamData.games` lineup data
- Filters out non-normal games: `g.status === 'normal' && g.scores && isGameInPast(g)`
- Doesn't currently use lineup data for position/player stats (only for "who played" inference)

---

## Approach Options

### Option 1: Event Log (RECOMMENDED)

**Data Structure**:
```javascript
Q1: {
  initialLineup: {   // Starting 7 players at 0:00
    GS: "playerID_1",
    GA: "playerID_2",
    WA: "playerID_3",
    C: "playerID_4",
    WD: "playerID_5",
    GD: "playerID_6",
    GK: "playerID_7"
  },
  substitutions: [   // Ordered list of changes
    {
      timestamp: 180,      // seconds into quarter (or minute: 3)
      position: "WA",
      playerOut: "playerID_3",
      playerIn: "playerID_8",
      reason: "injured" | "tactical" | "rest" | null
    },
    {
      timestamp: 390,
      position: "GS",
      playerOut: "playerID_1",
      playerIn: "playerID_9",
      reason: null
    },
    ...
  ],
  scores: {
    ourGsGoals: 5,
    ourGaGoals: 3,
    oppGsGoals: 4,
    oppGaGoals: 2
  },
  notes: "..."
}
```

**Pros** ✅
- **Compact** — Stores minimal data (initial lineup + only changes)
- **Complete history** — Records all substitutions in order
- **Queryable** — "Which players were on court at 5-minute mark?" easy to compute
- **Audit trail** — Know exactly when & why each change happened
- **Scalable** — Works for 2 subs or 50 subs per quarter
- **Backward compatible** — Old static lineups still parse (no subs array)
- **Stats-friendly** — Can calculate "minutes on court" accurately
- **Coaching analysis** — See patterns: "Always subs Player X after 3 mins"
- **Minimal storage** — 20-30 subs per quarter = ~2KB data

**Cons** ❌
- **Requires math to answer "current lineup"** — Must process events to know who's on court now
- **Timestamp management** — Need consistent time format (seconds vs minutes)
- **UI complexity** — Timeline view required (not just position grid)
- **Learning curve** — Coaches must understand event logging
- **Data entry burden** — More manual input (when did sub happen?)
- **Uncertainty** — If coach doesn't record exact time, timeline ambiguous
- **Migration** — Old lineups need conversion (or support both formats)

**Implementation Complexity**: ⏱️ 15-20 hours
- Data model change: 2 hours
- Apps Script updates: 3 hours
- Frontend UI (timeline view): 8-10 hours
- Stats recalculation: 3-4 hours
- Testing & edge cases: 2-3 hours

---

### Option 2: Quarterly Snapshots

**Data Structure**:
```javascript
Q1: {
  snapshots: [
    {
      time: 0,          // minute 0 (start of quarter)
      lineup: {
        GS: "playerID_1",
        GA: "playerID_2",
        // ... all 7 positions
      }
    },
    {
      time: 5,          // minute 5
      lineup: {
        WA: "playerID_8",  // Changed (others same as previous)
        // ... only list changed positions, or all?
      }
    },
    {
      time: 10,         // minute 10
      lineup: {
        GS: "playerID_9",  // Changed
        WA: "playerID_3"   // Changed back
      }
    }
  ],
  scores: { ... },
  notes: "..."
}
```

**Pros** ✅
- **Simpler mental model** — "Lineups at these moments in time"
- **Visual clarity** — Easy to see "who was on court at 5-min mark"
- **UI simpler** — Just show lineup cards at different timestamps
- **No timestamp precision** — Can record nearest minute (not exact seconds)
- **Easy stats** — Minutes on court = time between snapshots where player in lineup

**Cons** ❌
- **Data bloat** — Same position repeated multiple times (if only 1 player changed, still copy 6 others)
- **Ambiguity on timing** — If sub happens in minute 5, does it go in "time 5" or "time 6" snapshot?
- **Incomplete** — If coach forgets a change, gap exists (no substitution history)
- **Storage** — For 10+ subs per quarter: ~5-10KB (vs. 2KB with events)
- **Redundancy** — Storing same data multiple times (inefficient)
- **Manual sync issues** — Coach must remember to snapshot at key times

**Implementation Complexity**: ⏱️ 10-12 hours
- Data model: 1 hour
- Backend updates: 2 hours
- Frontend snapshot UI: 6-7 hours
- Stats: 1-2 hours

---

### Option 3: Possession-Based (Micro-Snapshots)

**Data Structure**:
```javascript
Q1: {
  possessions: [
    {
      possessionNum: 1,
      teamOnCourt: {
        GS: "playerID_1",
        GA: "playerID_2",
        // ... all 7
      },
      ourScore: 0,      // Our total after this possession
      oppScore: 0,
      result: "goal" | "miss" | "turnover" | "end_quarter"
    },
    {
      possessionNum: 2,
      teamOnCourt: {
        WA: "playerID_8",  // Changed
        // ... rest same as possession 1
      },
      ourScore: 1,
      oppScore: 0,
      result: "goal"
    },
    ...
  ],
  notes: "..."
}
```

**Pros** ✅
- **Natural breakpoints** — Possession ends = natural moment to snapshot
- **Score tracking** — Each possession linked to score state
- **Analytics gold** — "This 5-player combo scored X goals"
- **Granular** — More detail than minute-based snapshots
- **Objective markers** — No "was it minute 4 or 5?" ambiguity

**Cons** ❌
- **Data entry nightmare** — Coach must track possessions in real-time (unrealistic)
- **Doubles data volume** — Possession count ~200/quarter × 7 positions × 4 quarters
- **Storage bloat** — Easily 20-30KB per game
- **UI complexity** — Must show possession timeline (scrollable list of 200 items?)
- **Not realistic** — Coaches don't track possessions during game, they focus on play
- **Requires significant setup** — Each possession must be entered separately
- **Stats explosion** — Massive dataset for analytics to process

**Implementation Complexity**: ⏱️ 25-30 hours (VERY COMPLEX)
- Not practical for volunteer coaches managing in real-time

---

### Option 4: Simple Additions (Lightweight Hybrid)

**Data Structure** (Minimal Change):
```javascript
Q1: {
  GS: "playerID_1",        // Main lineup (who started)
  GA: "playerID_2",
  // ... positions
  additionalPlayers: [     // NEW: Players who also played Q1
    { playerID: "playerID_8", positions: ["WA"], notes: "Played WA" },
    { playerID: "playerID_9", positions: ["GS"], notes: "Took over GS mid-quarter" }
  ],
  notes: "..."
}
```

**Pros** ✅
- **Minimal data model change** — Just add array to existing structure
- **Backward compatible** — Old lineups still work as-is
- **Quick UI** — Just checkbox list "Who else played this quarter?"
- **Stats easy** — Can identify "all players who touched this quarter"
- **Low friction** — Enter after game (not real-time)

**Cons** ❌
- **No substitution detail** — Don't know WHEN subs happened
- **Position ambiguity** — Player might have played 2 positions, can't track
- **Can't calculate minutes** — "How long was Sarah on court?" = unknown
- **Stats insufficient** — Can't correlate "Player X was on when goals scored"
- **Not audit trail** — Doesn't prove subs actually happened, just "they played"
- **No coaching value** — Can't analyze sub patterns or timing

**Implementation Complexity**: ⏱️ 2-3 hours
- Very simple, but limited value

---

### Option 5: Hybrid: Static Base + Dynamic Subs

**Data Structure**:
```javascript
Q1: {
  startingLineup: {     // What we have now
    GS: "playerID_1",
    GA: "playerID_2",
    // ... all 7 positions
  },
  substitutions: [      // NEW: Ordered list
    {
      order: 1,
      time: { minute: 3, second: 45 },
      position: "WA",
      playerOut: "playerID_3",
      playerIn: "playerID_8"
    },
    {
      order: 2,
      time: { minute: 6, second: 20 },
      position: "GS",
      playerOut: "playerID_1",
      playerIn: "playerID_9"
    }
  ],
  scores: { ... },
  notes: "..."
}
```

**Pros** ✅
- **Clear separation** — Starting lineup still obvious, subs separate
- **Complete data** — Know initial state + all changes
- **Calculable** — Can recreate lineup at any point in quarter
- **Stats possible** — Minutes on court = time between subs
- **Backward compatible** — Stats code can work with or without subs
- **Scalable** — 50+ subs handled cleanly
- **Clean API** — `getCurrentLineup(quarterID, timeInQuarter)` function
- **Moderate UI complexity** — Can show both static view (easy) and timeline (advanced)

**Cons** ❌
- **Requires timeline UI** — Not as simple as checkbox list
- **Timestamp precision** — Minutes vs. seconds debate
- **Still manual entry** — Coach must track when subs happen
- **Migration** — Old lineups need updates
- **Testing large** — Lots of edge cases (multiple subs same position, rapid changes)

**Implementation Complexity**: ⏱️ 12-15 hours
- Good middle ground between Options 1 & 4

---

## Data Input Methods (Accounting for NFNA No-Scoreboard Constraint)

### The Reality: Coaches Have No Real-Time Clock

**NFNA games** (and most community netball):
- No scoreboard visible to coaches
- Siren indicates quarter start/end only
- Coach cannot know: "That sub was at 3:47"
- Coach CAN remember: "That happened early" or "That happened mid-quarter"

**Therefore**: We must support **order + memory-based entry**, not time-based.

### Option A: Order + Segment-Based Entry** ⭐ RECOMMENDED

**Data Entry** (Real-time or Post-game):
```
Add Substitution - Q1

Position: [GS ▼] *required

Player Coming Off:
Alice  ← Auto-filled (current player at GS)

Player Coming On:
┌─ Bench Players ────┐
│ Emma               │  ← Smart filtered:
│ Carol              │     Only shows players
│ Zoe                │     currently on bench
└────────────────────┘

When did this happen?
○ Early (first ~3 mins)
○ Mid (middle ~4 mins)
○ Late (last ~3 mins)
○ Don't remember (skip timing)

[Cancel] [Next]
```

**For GS/GA subs - Goal Capture Step:**
```
How many goals did Alice score?

Alice played GS until this sub

Goals scored: [−] 3 [+]  ← Pre-filled from live score
                            (real-time entry)
                            OR 0 (post-game entry)

ℹ️ Q1 currently has 3 total GS goals
   This leaves 0 goals for Emma (next GS)

[ ] Don't know yet (allocate later)

[Back] [Save Substitution]
```

**How subs are recorded**:
```javascript
substitutions: [
  { 
    order: 1, 
    segment: "early", 
    position: "WA", 
    playerOut: "carol_id", 
    playerIn: "diana_id" 
  },
  { 
    order: 2, 
    segment: "mid", 
    position: "GS", 
    playerOut: "alice_id", 
    playerIn: "emma_id",
    goalsScored: 3  // Only for GS/GA subs
  }
]
```

**Stats calculation**:
- If exact time unavailable: Assume segment corresponds to minute (early=1, mid=5, late=8)
- Result: ±2-3 minute precision, which is reasonable for netball analysis
- Coach can refine later if they remember or watch video

**Pros**:
- ✅ Works with NFNA's no-scoreboard setup
- ✅ Natural for coach memory ("happened early")
- ✅ Still captures order and rough timing
- ✅ Simple UI (radio buttons)
- ✅ Good enough for stats ("Alice ~7 mins, Sarah ~3 mins")

**Cons**:
- ❌ Not exact times
- ❌ Reduced precision (±2-3 mins)
- ❌ "Current lineup at minute 4.7" less reliable

---

### Option B: Order-Only (Simplest)

**Data Entry**:
```
Q1 Substitutions:
1. Carol → Diana (WA) [Edit] [Delete] [▲▼ Reorder]
2. Alice → Emma (GS) [Edit] [Delete] [▲▼ Reorder]
3. Diana → Carol (WA) [Edit] [Delete] [▲▼ Reorder]

[+ Add Substitution]
```

**No timing info**: Just "what happened, in what order"

**Stats calculation**:
- Assume roughly equal time between subs
- If 3 subs in Q1: ~2.5 min per period
- Alice: "played ~7 minutes" (rough estimate)
- Sarah: "played ~2.5 minutes" (rough estimate)

**Pros**:
- ✅ Easiest data entry (just order)
- ✅ Works perfectly with no-scoreboard setup
- ✅ Still captures "who played"
- ✅ Can reorder if entered wrong

**Cons**:
- ❌ No timing at all
- ❌ Stats very rough ("Alice 7±3 mins")
- ❌ Can't reconstruct "who was on at minute 5"

---

### Option C: Hybrid (Order + Optional Time for Video Later)

**Data Entry** (Immediately post-game):
```
Add Substitution - Q1

Position: [GS ▼]
Player Out: [Alice ▼]
Player In: [Sarah ▼]

When? [Early / Mid / Late / Don't know] ← Fill NOW from memory

□ I have video - can add exact time later? [Later... button]

[Save]
```

**After game (optional)**:
- Coach finds video recording
- Scrubs to sub moment
- Clicks "Refine timing"
- Updates to exact time (minute 3.7)

**Pros**:
- ✅ Fast entry post-game (no pressure to remember exact time)
- ✅ Can improve precision later if video available
- ✅ Works for both casual (no video) and league games (recorded)

---

### Recommended Approach: **Option A (Segment-Based)**

Why:
- ✅ **Realistic for NFNA** (no scoreboard constraint acknowledged)
- ✅ **Easy for coaches** ("early, mid, late" is how they remember)
- ✅ **Useful stats** (±2-3 min error is acceptable)
- ✅ **Scalable** (works for casual AND if league adds scoreboards later)
- ✅ **Can upgrade** (if coach adds exact time later, system accepts it)

---

## Storage & Performance

### Data Volume Estimates

**Scenario: Busy NFNL game**
```
4 quarters × 8 subs per quarter = 32 total substitutions

Per substitution (JSON):
{
  position: "WA",              // 4 bytes
  playerOut: "playerID_123",   // 15 bytes
  playerIn: "playerID_456",    // 15 bytes
  timestamp: 180,              // 3 bytes
  reason: "injured"            // 10 bytes
}
= ~47 bytes per sub × 32 = ~1.5KB for entire game

Total per game (with scores, notes, etc.): ~3-5KB add-on
Yearly storage (100 games): ~0.5MB extra
```

**Google Sheets Impact**:
- Current: 1 game = 1 cell (cell A1 on team sheet)
- With subs: Still 1 cell (JSON object gets bigger)
- Cell size limit: ~50KB per cell (Google Sheets hard limit, but practically ~10KB recommended)
- You're safe: 3-5KB per game << 10KB limit
- **No new columns needed**: Subs just part of bigger JSON

**Apps Script Runtime**:
- Current: Parsing lineup = simple object lookup (~1ms)
- With subs: Computing "current lineup at time X" = loop through subs (~5-10ms, negligible)
- No performance regression expected

---

## Stats Calculations Impact

### Current Stats System
- `calculateTeamStats()` uses games where `status === 'normal' && scores`
- Doesn't currently use lineup data (just checks "did we play?")
- Position stats are inferred, not explicit

### With Rolling Subs (Segment-Based Timing)
Can now calculate:
- **Player minutes**: "Sarah was on court for ~23 minutes" (estimated from segments)
- **Position stats**: "Sarah scored 8 goals in ~15 minutes as GS"
- **Bench time**: "Emma sat out Q3, full Q4"
- **Substitution patterns**: "We always sub WA mid-quarter"
- **Combo analysis**: "When Sarah + Emma on court together: 85% win rate"

**Key adjustment for NFNA**: Since coaches estimate timing (segments), stats use mapped minutes:
- **Early segment** = ~1 minute (start of quarter)
- **Mid segment** = ~5 minutes (middle of quarter)  
- **Late segment** = ~8 minutes (late in quarter)
- **No segment** = 5 minutes (assumed middle if coach forgot to record)

This gives ±2-3 minute precision, which is acceptable for season analysis.

### Code Changes Needed
```javascript
// Helper: Map segment to estimated minute
function mapSegmentToMinute(segment) {
  const segmentMap = { early: 1, mid: 5, late: 8 };
  return segmentMap[segment] || 5; // Default to mid if unknown
}

// NEW: Calculate on-court time per player (with segment-based timing)
function calculatePlayerMinutes(teamData, playerID) {
  let totalMinutes = 0;
  teamData.games.forEach(game => {
    Object.values(game.lineups).forEach(quarter => {
      // Handle both old format (just positions) and new format (with subs)
      if (!quarter.substitutions) {
        // Old format: no subs data, can't calculate precise minutes
        // Assume player played full quarter if in starting lineup
        const inStarting = Object.values(quarter).includes(playerID);
        if (inStarting) totalMinutes += 10; // Full quarter
        return;
      }
      
      // Check if player in starting lineup
      const inStarting = Object.values(quarter.startingLineup || {})
        .includes(playerID);
      
      // Track on/off times (in minutes, converted from segments)
      let lastStartTime = 0;
      if (inStarting) lastStartTime = 0; // Started at beginning
      
      quarter.substitutions.forEach(sub => {
        if (sub.playerOut === playerID) {
          // Player came off at this time
          const offTime = mapSegmentToMinute(sub.segment);
          totalMinutes += (offTime - lastStartTime);
          lastStartTime = null; // Not on court
        }
        if (sub.playerIn === playerID) {
          // Player came on at this time
          lastStartTime = mapSegmentToMinute(sub.segment);
        }
      });
      
      // Add remaining time in quarter if still on court
      if (inStarting || lastStartTime !== null) {
        const endTime = 10; // Quarter is 10 minutes
        const start = lastStartTime !== null ? lastStartTime : 0;
        totalMinutes += (endTime - start);
      }
    });
  });
  return Math.round(totalMinutes); // Round to nearest minute
}

// Usage: "Sarah played 23 minutes this season"
const sarahMinutes = calculatePlayerMinutes(teamData, "playerID_sarah");
console.log(`Sarah: ${sarahMinutes} minutes (±2-3 min precision due to segments)`);
```

**Example Calculation**:
```
Q1 (10 minutes):
├─ Start: Alice (GS), Sarah (WA) on court
├─ Early (min 1): Carol subs off, Diana subs in (WA)
│  └─ Alice on 1 min, Sarah off here (played 1 min)
├─ Mid (min 5): Alice subs off, Emma subs in (GS)
│  └─ Sarah back on? No record → assume out
├─ Late (min 8): Emma subs off, Carol subs in (GS)
│  └─ Still off

Q1 Result:
- Alice: 1 minute (start to early sub)
- Sarah: 1 minute (start to early sub)
- Carol: 10 min (no sub record) or 2 min (if she came off later)
- Emma: 3 minutes (mid=5 to late=8)
```

This ±2-3 minute error is fine for season-level analysis ("Alice plays less than Sarah")
```

---

## UI/UX Redesign

### Current Lineup Planner
```
┌──────────────────────────────────────────────┐
│  Lineup Planner - Game: vs Emma (Q1-Q4)     │
├──────────────────────────────────────────────┤
│                                              │
│  Bench (click to assign)        Q1  Q2  Q3  Q4
│  ├─ Sarah                       [ ] [ ] [X] [ ]
│  ├─ Emma                        [X] [ ] [ ] [ ]
│  ├─ Carol                       [ ] [ ] [ ] [X]
│  └─ Diana                       [X] [X] [ ] [ ]
│                                              │
│  ┌─ Q1 ─────────────────────────────               │
│  │ GS: Emma                                        │
│  │ GA: Carol                                       │
│  │ WA: Sarah                                       │
│  │ C:  Diana                                       │
│  │ WD: (empty)                                     │
│  │ GD: (empty)                                     │
│  │ GK: (empty)                                     │
│  └────────────────────────────────────────        │
│                                              │
│  [Copy] [Auto-Fill] [Undo] [Redo]           │
│                                              │
└──────────────────────────────────────────────┘
```

### Proposed Enhancement: Scoring Screen with Sub Entry

**Scoring Accordion (Per Quarter)**
```
┌─────────────────────────────────────────────┐
│ Q1 Scoring                                  │
├─────────────────────────────────────────────┤
│ Goals                                       │
│ GS: [−] 4 [+]    GA: [−] 2 [+]             │
│ Opp: [−] 3 [+]    [−] 1 [+]                │
│                                             │
│ ┌────── Actions ──────┐                    │
│ │ 📝 Add Notes  👥 Add Sub  │              │
│ └──────────────────────┘                   │
│                                             │
│ Substitutions (2):                          │
│ • Early: Carol → Diana (WA)        [Edit]  │
│ • Mid: Alice (3 goals) → Emma (GS) [Edit]  │
│   └─ 1 goal remaining for Emma             │
│                                             │
│ Notes:                                      │
│ Good pressure in mid-court...              │
└─────────────────────────────────────────────┘
```

**Smart Player Filtering Logic**
```javascript
// Get available sub options for a position
function getAvailableSubOptions(quarter, position) {
  // Get current lineup (planned + any subs applied so far)
  const currentLineup = getCurrentLineup(quarter);
  
  // Player coming off = current player at that position
  const playerComingOff = currentLineup[position];
  
  // Players coming on = bench only (not on court)
  const allPlayers = state.currentTeam.players;
  const onCourtIDs = Object.values(currentLineup);
  const benchPlayers = allPlayers.filter(p => 
    !onCourtIDs.includes(p.id) && !p.fillIn
  );
  
  return {
    playerComingOff,      // Auto-filled
    availableSubPlayers: benchPlayers  // 1-3 options typically
  };
}
```

**Edit Substitution Modal**:
```
┌──────────────────────────────────────┐
│ Edit Substitution                    │
├──────────────────────────────────────┤
│ Q1 - Mid-quarter                     │
│ Position: GS                         │
│ Alice → Emma                         │
│                                      │
│ Goals scored by Alice: [−] 3 [+]    │
│                                      │
│ ℹ️ Q1 total: 6 GS goals              │
│    Emma (next GS): 3 goals remaining│
│                                      │
│ Timing: ◯ Early ◉ Mid ◯ Late       │
│                                      │
│ [Delete Sub] [Cancel] [Save]        │
└──────────────────────────────────────┘
```

### Mobile Consideration
- Mobile: "Add Sub" button in scoring accordion
- 3-step modal: Position/Players → Timing → Goals (if GS/GA)
- Player tags for quick selection (bench players only)
- Subs list shows below with tap-to-edit
- Simple sequential entry (1-2 subs typical)

---

## Migration Strategy

### For Existing Games & Lineups

**Option 1: Gradual (No Breaking Change)**
- Old lineups stay as-is (just `Q1: {GS, GA, WA, ...}`)
- New lineups use enhanced format
- Stats code handles both formats
- No one-time migration needed
- Risk: Two data formats forever

**Option 2: One-Time Migration**
- Convert all old lineups to new format
- Old `Q1.GS` becomes `Q1.startingLineup.GS`
- Add empty `substitutions: []` array
- Run script once, timestamp for reference
- Clean data model going forward
- Risk: One-off script must be perfect

**Recommended**: Option 1 (Gradual)
- Lower risk
- Coaches can start using new format immediately
- Old games still viewable with old format
- No rush to migrate everything at once

---

## Implementation Timeline

### Phase 1: Data Model (Week 1)
**Effort**: 4-5 hours
- [ ] Update `Lineup` type definition (add optional `substitutions` array)
- [ ] Update `transformTeamDataToSheet` to handle new format
- [ ] Update `transformTeamDataFromSheet` to parse new format
- [ ] Write backward-compatibility layer (code that works with old or new format)
- [ ] Test data serialization

### Phase 2: Backend APIs (Week 1-2)
**Effort**: 3-4 hours
- [ ] Add segment-to-minute mapping helper function
- [ ] Add `getLineupAtSegment(quarterID, segment)` function to reconstruct lineup at a given segment
- [ ] Update stats calculations to work with segment-mapped minutes (±2-3 min precision)
- [ ] Add validation (can't have same player in two positions at same time)
- [ ] Test segment-based calculations against manual examples

**Note**: Segment-based approach is simpler than minute-based since we don't need exact timestamp calculations

### Phase 3: Frontend UI - Scoring Screen Integration (Week 2-3)
**Effort**: 8-10 hours
- [ ] Add "👥 Add Sub" button to scoring accordion (next to "📝 Add Notes")
- [ ] Multi-step sub modal: Position/Players → Timing → Goals (GS/GA only)
- [ ] Smart filtering: Show bench players only for "Coming On" selection
- [ ] Auto-fill "Coming Off" with current player at selected position
- [ ] Goal capture step: Pre-fill with live score (real-time) or 0 (post-game)
- [ ] Goal validation: Can't exceed quarter total, show remaining
- [ ] Substitutions list display in accordion with tap-to-edit
- [ ] Edit modal: Update segment, goals, or delete sub

### Phase 4: Enhanced Stats (Week 3)
**Effort**: 4-5 hours
- [ ] `calculatePlayerMinutes()` across all games (using segment mapping)
- [ ] `calculatePlayerGoalStats()` - per-goaler goal breakdown with minutes
- [ ] Position-specific stats ("Emma: 4 goals in 12 min as GS")
- [ ] Add to player modal view
- [ ] Update leaderboards to show minutes played
- [ ] Handle both old format (static lineup) and new format (with subs)

### Phase 5: Testing & Polish (Week 4)
**Effort**: 5-6 hours
- [ ] Edge cases: Rapid subs, same position multiple times, missing start lineup
- [ ] Mobile testing: Forms, scrolling timeline
- [ ] Performance: Games with 100+ subs (stress test)
- [ ] Documentation for coaches on how to use
- [ ] Analytics events for sub entry

**Total Estimated Effort**: 24-30 hours (~1 week full-time, or 3-4 weeks part-time)

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| **Timeline precision** | Medium | Use minutes only (not seconds) initially, can add seconds later |
| **Data corruption on migration** | Medium | Back up Teams sheet before any changes, test on staging first |
| **Stats calculation errors** | Medium | Unit test substitution logic heavily, compare old vs new for existing games |
| **Coach adoption** | Medium | Simple UI, optional feature (old static lineups still work) |
| **Timestamp ambiguity** | Low | Document: "Enter time sub occurred (estimated OK)" |
| **Performance with many subs** | Low | Google Sheets cells can handle 3-5KB easily |
| **Backward compat broken** | Low | Support both old and new formats simultaneously |
| **Mobile UI too complex** | Medium | Simpler mobile-only form, timeline on desktop only |

---

## Decision Matrix: Which Option to Implement?

| Criteria | Option 1 (Events) | Option 2 (Snapshots) | Option 4 (Light) | Option 5 (Hybrid) |
|----------|---|---|---|---|
| **Completeness** | ★★★★★ | ★★★★☆ | ★★☆☆☆ | ★★★★☆ |
| **Storage Efficiency** | ★★★★★ | ★★★☆☆ | ★★★★★ | ★★★★☆ |
| **Stats Capability** | ★★★★★ | ★★★★☆ | ★★☆☆☆ | ★★★★★ |
| **Ease of Entry** | ★★★☆☆ | ★★★★☆ | ★★★★★ | ★★★★☆ |
| **UI Complexity** | ★★★★☆ | ★★★☆☆ | ★☆☆☆☆ | ★★★★☆ |
| **Implementation Time** | 15-20h | 10-12h | 2-3h | 12-15h |
| **Backward Compatible** | ★★★☆☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ |

### Recommendation: **Option 5 (Hybrid)**

**Why**:
- ✅ Best balance of completeness + feasibility
- ✅ Clear separation (starting lineup obvious, subs tracked)
- ✅ Enables accurate stats (minutes on court, position analysis)
- ✅ Reasonable implementation time (12-15 hours)
- ✅ Coaches can understand the model
- ✅ Works with or without subs (graceful degradation)
- ✅ Scales for 50+ subs if needed

**Alternative if time-constrained**: **Option 4 (Light)**
- Quick MVP (2-3 hours)
- Answer "who played?", not "when?"
- Upgrade to Option 5 later

---

## Comparison to Other Features

### How This Impacts Existing Features

**Lineup Planner**:
- Existing planner still works (just assigns starting lineup)
- New "Timeline" tab to manage subs
- No breaking changes to current interface

**Stats Tab**:
- Can now show **"Minutes on Court"** per player
- **Position-specific stats** (goals per position)
- **Player load** (how many minutes vs. bench)
- **Combo effectiveness** (Player A + Player B on court = 85% win rate)

**Game Detail**:
- New "Substitutions" section showing timeline
- Can click "Revert to start" to restore starting lineup view

**Player Stats Modal**:
- Add **"Career Minutes"** metric
- Show **"Position Breakdown"** (% as GS, WA, etc.)
- Show **"Minutes/Game Ratio"** (are they playing full quarters?)

**Roster View**:
- Add badge: "Played Q1-Q3" for quick scan
- Knee injuries? Shows who subbed in
- Can search "Who played in Q4?"

---

## Future Enhancements (Out of Scope)

- [ ] Real-time game tracking (coach updates subs during game via app)
- [ ] Video timestamps (sync linup with game video at each sub)
- [ ] Injury tracking ("Emma subbed out injured in Q2")
- [ ] Substitute rotation patterns ("Always rest Sarah at min 6")
- [ ] Bench vs. on-court stats (extra metrics)
- [ ] Heat maps (show positions per player over season)

---

## Questions for Stakeholder Review

1. **Timestamp precision**: Minute-only OK initially, add seconds later?
2. **Mandatory for all competitions**: Or only for NFNA U13+ and NFNL?
3. **Backward compat**: Should we migrate old lineups to new format, or keep both?
4. **Mobile first**: Simple add-sub form first, desktop timeline later?
5. **Real-time vs. post-game**: Coaches enter subs after game, not live?
6. **Data export**: Need subs data in exports/reports later?

---

## Sign-Off

**Status**: Ready for technical review  
**Next Step**: Choose preferred option (Hybrid recommended), then proceed to Phase 1  
**Review Date**: February 28, 2026

---

**Questions?** Contact planning team.
